// Converts between MealCaster's on-device data and Google Sheets rows.
//
// A row is an object keyed by the expected column names in SCHEMA, holding the
// raw cell values (string, number or boolean). Reading a row back starts from
// the existing on-device item and only re-parses cells whose text differs from
// what that item would write, so details a cell can't hold (ratings, prep tips,
// step timings typed in the app) survive a round trip through the sheet.
//
// Plain JS (no runes) so it can be tested outside Svelte.

import { departments } from '../data/departments.js';
import { formatWeekday } from '../dates.js';

/** @typedef {import('../data/recipes.js').Recipe} Recipe */
/** @typedef {Record<string, string | number | boolean>} Row */

// ---- Cell helpers -----------------------------------------------------------

/** How a cell compares: the text Sheets would show for it. */
export const cellText = (v) => (v == null ? '' : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v));

const str = (v) => cellText(v).trim();
const num = (v) => {
  const n = typeof v === 'number' ? v : Number(str(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const bool = (v) => v === true || /^(true|yes|y|1|x|✓|✔)$/i.test(str(v));
/**
 * Image link from a sheet cell: https only. A `data:` URL would be queued as a
 * photo to upload (and share publicly) from this account; `http:`, `javascript:`
 * and the like have no business in an <img>.
 */
const imageUrl = (v) => {
  const text = str(v);
  try {
    return new URL(text).protocol === 'https:' ? text : '';
  } catch {
    return '';
  }
};

/**
 * Date cell → "YYYY-MM-DD". Sheets returns real dates as serial numbers
 * (days since 1899-12-30); text dates are parsed as a fallback.
 * @returns {string} '' when it isn't a date
 */
export function isoDate(v) {
  if (typeof v === 'number' && v > 0) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000).toISOString().slice(0, 10);
  }
  const text = str(v);
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const parsed = text ? new Date(text) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

/** Whether a row has anything in it. @param {Row} row */
export const isBlankRow = (row) => Object.values(row).every((v) => str(v) === '');

// ---- Recipes ----------------------------------------------------------------

/** "1. Sear the salmon (8 min, critical): Pat the fillets dry…" per line. */
export function formatSteps(steps) {
  return steps
    .map((s, i) => {
      const flags = [s.minutes ? `${s.minutes} min` : '', s.critical ? 'critical' : ''].filter(Boolean).join(', ');
      return `${i + 1}. ${s.title}${flags ? ` (${flags})` : ''}: ${s.text}`;
    })
    .join('\n');
}

/** Tolerant reverse of formatSteps; plain numbered lines work too. */
export function parseSteps(text) {
  const steps = [];
  for (const line of str(text).split(/\r?\n/)) {
    const start = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (!start && steps.length) {
      if (line.trim()) steps.at(-1).text += `\n${line.trim()}`;
      continue;
    }
    const body = (start ? start[2] : line).trim();
    if (!body) continue;
    const split = body.indexOf(': ');
    let head = split > 0 ? body.slice(0, split) : '';
    const rest = split > 0 ? body.slice(split + 2).trim() : body;
    let minutes = 0;
    let critical = false;
    const flags = head.match(/\s*\(([^)]*)\)\s*$/);
    if (flags && /\bmin\b|\bcritical\b/i.test(flags[1])) {
      minutes = Number(flags[1].match(/(\d+)\s*min/i)?.[1] ?? 0);
      critical = /\bcritical\b/i.test(flags[1]);
      head = head.slice(0, flags.index);
    }
    steps.push({ title: head.trim() || `Step ${steps.length + 1}`, minutes, text: rest, ...(critical && { critical: true }) });
  }
  return steps;
}

/**
 * Ingredients_JSON → ingredient groups. Accepts MealCaster's own groups, or a
 * flat list of items (`{ name, qty, dept }` works too).
 * @returns {import('../data/recipes.js').IngredientGroup[] | null} null when it can't be read
 */
export function parseIngredients(value) {
  const text = str(value);
  if (!text) return [];
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(data)) return null;
  const item = (i) => {
    const qty = typeof i.qty === 'number' ? i.qty : Number.parseFloat(i.qty);
    const unit = i.unit ?? (typeof i.qty === 'string' ? i.qty.replace(/^[\d.,/\s]+/, '').trim() : '');
    return {
      ...(Number.isFinite(qty) && qty > 0 && { qty }),
      ...(unit && { unit }),
      text: str(i.text ?? i.name ?? i.item),
      tag: str(i.tag ?? i.dept ?? i.aisle) || 'Pantry',
      ...(i.staple && { staple: true }),
    };
  };
  // Hand-edited cells can hold nulls or bare values; skip them rather than fail the sync.
  const items = (list) => list.filter((i) => i && typeof i === 'object').map(item).filter((i) => i.text);
  const isGroup = (g) => g && Array.isArray(g.items);
  if (data.every(isGroup)) {
    return data.map((g) => {
      const kept = items(g.items);
      return {
        title: str(g.title) || 'Ingredients',
        category: str(g.category) || `${kept.length} ${kept.length === 1 ? 'item' : 'items'}`,
        items: kept,
      };
    });
  }
  const flat = items(data);
  return flat.length ? [{ title: 'Ingredients', category: `${flat.length} items`, items: flat }] : [];
}

/**
 * Per column: what a recipe writes, and how a changed cell updates a recipe.
 * `set` receives a draft copy of the recipe (or a blank one for new rows).
 * @type {Record<string, { get: (r: Recipe, ctx: { favorites: Set<string> }) => string | number | boolean, set: (r: Recipe, v: any, ctx: { favorite?: boolean }) => void }>}
 */
const RECIPE_COLUMNS = {
  Recipe_ID: { get: (r) => r.id, set: () => {} },
  Title: {
    get: (r) => r.title,
    set: (r, v) => {
      r.title = str(v) || 'Untitled recipe';
      r.shortTitle = r.title;
    },
  },
  Description: { get: (r) => r.description, set: (r, v) => (r.description = str(v)) },
  Ingredients_JSON: {
    get: (r) => JSON.stringify(r.ingredients),
    set: (r, v) => {
      const groups = parseIngredients(v);
      if (groups) r.ingredients = groups;
    },
  },
  Method_Steps: { get: (r) => formatSteps(r.steps), set: (r, v) => (r.steps = parseSteps(v)) },
  Image_URL: {
    // Photos still waiting to be uploaded to Drive aren't written.
    get: (r) => (r.image && !r.image.startsWith('data:') ? r.image : ''),
    set: (r, v) => {
      const url = imageUrl(v);
      if (url) r.image = url;
      else delete r.image;
      delete r.hero;
    },
  },
  Tags: {
    get: (r) => r.tags.join(', '),
    set: (r, v) => (r.tags = str(v).split(',').map((t) => t.trim()).filter(Boolean)),
  },
  Favorite_Flag: { get: (r, ctx) => ctx.favorites.has(r.id), set: (r, v, ctx) => (ctx.favorite = bool(v)) },
  Category: { get: (r) => r.badge.label, set: (r, v) => (r.badge = { ...r.badge, label: str(v) || 'Dinner' }) },
  Servings: {
    get: (r) => r.serves,
    set: (r, v) => {
      r.serves = num(v) || 2;
      if (r.custom) r.stat = `Serves ${r.serves}`;
    },
  },
  Prep_Minutes: { get: (r) => r.prepMinutes, set: (r, v) => (r.prepMinutes = num(v)) },
  Cook_Minutes: { get: (r) => r.cookMinutes, set: (r, v) => (r.cookMinutes = num(v)) },
  Notes: {
    get: (r) => r.notes ?? '',
    set: (r, v) => (r.notes = str(v)),
  },
};

/** @param {Recipe} recipe @param {Set<string>} favorites @returns {Row} */
export function recipeToRow(recipe, favorites) {
  const ctx = { favorites };
  return Object.fromEntries(Object.entries(RECIPE_COLUMNS).map(([col, c]) => [col, c.get(recipe, ctx)]));
}

/** Blank recipe for a row the sheet added. @param {string} id @param {string} today */
function blankRecipe(id, today) {
  return {
    id,
    title: '',
    shortTitle: '',
    description: '',
    prepMinutes: 0,
    cookMinutes: 0,
    minutes: 0,
    serves: 2,
    badge: { label: 'Dinner' },
    stat: 'Serves 2',
    rating: 0,
    ratings: 0,
    cookCount: 0,
    addedAt: today,
    tags: [],
    notes: '',
    ingredients: [],
    steps: [],
    custom: true,
  };
}

/**
 * @param {Row} row
 * @param {Recipe | undefined} existing on-device version of the same Recipe_ID
 * @param {{ columns: string[], favorites: Set<string>, today: string }} options columns = the ones the sheet has
 * @returns {{ recipe: Recipe, favorite: boolean | undefined }}
 */
export function recipeFromRow(row, existing, { columns, favorites, today }) {
  const id = str(row.Recipe_ID);
  const recipe = existing ? structuredClone(existing) : blankRecipe(id, today);
  const written = existing ? recipeToRow(existing, favorites) : null;
  /** @type {{ favorite?: boolean }} */
  const ctx = {};
  for (const col of columns) {
    const c = RECIPE_COLUMNS[col];
    if (!c || (written && cellText(written[col]) === cellText(row[col]))) continue;
    c.set(recipe, row[col], ctx);
  }
  if (!recipe.title) recipe.title = recipe.shortTitle = 'Untitled recipe';
  recipe.minutes = recipe.prepMinutes + recipe.cookMinutes;
  return { recipe, favorite: ctx.favorite };
}

/** Recipe_ID for a sheet row that has none. */
export function newRecipeIdFor(title, taken) {
  const slug = str(title).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  let id;
  do id = `custom-${slug || 'recipe'}-${Math.random().toString(36).slice(2, 6)}`;
  while (taken.has(id));
  return id;
}

// ---- Weekly plan ------------------------------------------------------------

/** @typedef {import('../planner.svelte.js').PlanEntry & { notes?: string }} PlanEntry */

/** @param {string} iso @param {PlanEntry} entry @returns {Row} */
export function planToRow(iso, entry) {
  return {
    Date_ISO: iso,
    Day_Of_Week: formatWeekday(iso),
    Recipe_ID_Assigned: entry.recipeId ?? '',
    Completed_Flag: Boolean(entry.completed),
    Custom_Notes: entry.notes ?? (entry.diningOut ? 'Dining out' : ''),
  };
}

/** Plan entries worth a row: a dinner, dining out, or notes. */
export const planEntryHasContent = (e) => Boolean(e && (e.recipeId || e.diningOut || e.notes || e.completed));

/**
 * @param {Row} row @param {PlanEntry | undefined} existing @param {string[]} columns
 * @returns {PlanEntry | null} null when the row plans nothing
 */
export function planFromRow(row, existing, columns) {
  const iso = isoDate(row.Date_ISO);
  const written = existing ? planToRow(iso, existing) : null;
  const same = (col) => !columns.includes(col) || (written && cellText(written[col]) === cellText(row[col]));
  const entry = existing ? { ...existing } : {};
  if (!same('Recipe_ID_Assigned')) {
    const id = str(row.Recipe_ID_Assigned);
    if (id) entry.recipeId = id;
    else delete entry.recipeId;
  }
  if (!same('Completed_Flag')) {
    if (bool(row.Completed_Flag)) entry.completed = true;
    else delete entry.completed;
  }
  if (!same('Custom_Notes') || !same('Recipe_ID_Assigned')) {
    const notes = str(row.Custom_Notes);
    const diningOut = !entry.recipeId && /^dining out\b/i.test(notes);
    if (diningOut) entry.diningOut = true;
    else delete entry.diningOut;
    if (notes && notes.toLowerCase() !== 'dining out') entry.notes = notes;
    else delete entry.notes;
  }
  return planEntryHasContent(entry) ? entry : null;
}

// ---- Provisions -------------------------------------------------------------

const STATUS_LABEL = { need: 'To buy', bought: 'Bought', owned: 'In pantry' };

/** @returns {import('../grocery.svelte.js').LineStatus} */
export function parseStatus(v) {
  const t = str(v).toLowerCase();
  if (v === true || /^(bought|done|got|checked|true|x|✓)/.test(t)) return 'bought';
  if (/pantry|owned|have|stock/.test(t)) return 'owned';
  return 'need';
}

/** @returns {import('../data/departments.js').Dept} */
export function parseDept(v) {
  const t = str(v).toLowerCase();
  const exact = departments.find((d) => [d.id, d.short.toLowerCase(), d.label.toLowerCase()].includes(t));
  if (exact) return /** @type {any} */ (exact.id);
  if (/produce|veg|fruit|herb/.test(t)) return 'produce';
  if (/meat|fish|seafood|butcher|poultry/.test(t)) return 'meat';
  if (/dairy|cheese|egg|fridge|refrigerat|frozen/.test(t)) return 'dairy';
  return 'pantry';
}

/** Ingredient-derived line keys look like `recipeId:group:item`. */
export const isIngredientKey = (key) => /^[\w-]+:\d+:\d+$/.test(key);

/** Provisions row key: one row per line per week. */
export const provisionKey = (week, lineKey) => `${week}|${lineKey}`;

/** @param {string} week @param {import('../grocery.svelte.js').GroceryLine} line @returns {Row} */
export function provisionToRow(week, line) {
  return {
    Week_Of: week,
    Item: line.name,
    Detail: line.detail,
    Department: departments.find((d) => d.id === line.dept)?.short ?? 'Pantry',
    Status: STATUS_LABEL[line.status],
    Source: line.source.label,
    Line_Key: line.key,
  };
}

/**
 * Rebuilds the per-week grocery state from provisions rows.
 * @param {Row[]} rows
 * @param {(week: string, key: string) => boolean} isPlanned whether a line comes from that week's planned dinners
 * @returns {Record<string, import('../grocery.svelte.js').WeekList>}
 */
export function groceryFromRows(rows, isPlanned) {
  /** @type {Record<string, import('../grocery.svelte.js').WeekList>} */
  const weeks = {};
  for (const row of rows) {
    const week = isoDate(row.Week_Of);
    const key = str(row.Line_Key);
    if (!week || !key) continue;
    const list = (weeks[week] ??= { extras: [], status: {}, custom: [] });
    list.status[key] = parseStatus(row.Status);
    if (isIngredientKey(key)) {
      if (!isPlanned(week, key) && !list.extras.includes(key)) list.extras.push(key);
    } else if (!list.custom.some((c) => c.id === key)) {
      list.custom.push({ id: key, name: str(row.Item) || 'Item', note: str(row.Detail), dept: parseDept(row.Department) });
    }
  }
  return weeks;
}
