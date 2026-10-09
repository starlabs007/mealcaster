// Converts between MealCaster's on-device data and Google Sheets rows.
//
// A row is an object keyed by the expected column names in SCHEMA, holding the
// raw cell values (string, number or boolean). Reading a row back starts from
// the existing on-device item and only re-parses cells whose text differs from
// what that item would write, so details a cell can't hold (step timings typed
// in the app) survive a round trip through the sheet.
//
// Plain JS (no runes) so it can be tested outside Svelte.

import { departments } from '../data/departments.js';
import { DEFAULT_WEEK_START_DAY, formatWeekday, fromISO, weekStartOf } from '../dates.js';
import { TONES, normalizeAisle, normalizeCategory, normalizeTag, normalizeTags } from '../tags.js';
import { aisles } from '../data/aisles.js';
import { canonicalUnit, ingredientIdFor, recipeIdFor, tidyIngredientName } from '../ingredients.js';
import { SCHEMA_VERSION } from '../schema.js';

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
      // Continuation lines are indented so Markdown lists inside a step aren't read as new steps.
      return `${i + 1}. ${s.title}${flags ? ` (${flags})` : ''}: ${s.text.replace(/\n/g, '\n    ')}`;
    })
    .join('\n');
}

/** Tolerant reverse of formatSteps; plain numbered lines work too. */
export function parseSteps(text) {
  const steps = [];
  for (const line of str(text).split(/\r?\n/)) {
    const start = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (!start && steps.length) {
      steps.at(-1).text += `\n${line.replace(/^ {1,4}/, '')}`;
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
  for (const s of steps) s.text = s.text.trim();
  return steps;
}

/**
 * Ingredients_JSON → ingredient groups. Accepts MealCaster's own groups, or a flat list of lines.
 * A line is `{ id, qty, unit, note, prep, optional }`; `id` is an Ingredient_ID, and lines without
 * one are skipped. Units are stored in their canonical form ("cups" → "cup").
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
    const unit = canonicalUnit(i.unit ?? (typeof i.qty === 'string' ? i.qty.replace(/^[\d.,/\s]+/, '') : ''));
    const note = str(i.note);
    const prep = str(i.prep);
    return {
      id: str(i.id),
      ...(Number.isFinite(qty) && qty > 0 && { qty }),
      ...(unit && { unit }),
      ...(note && { note }),
      ...(prep && { prep }),
      ...(bool(i.optional) && { optional: true }),
    };
  };
  // Hand-edited cells can hold nulls or bare values; skip them rather than fail the sync.
  const items = (list) => list.filter((i) => i && typeof i === 'object').map(item).filter((i) => i.id);
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
    set: (r, v) => (r.tags = normalizeTags(str(v).split(','))),
  },
  Favorite_Flag: { get: (r, ctx) => ctx.favorites.has(r.id), set: (r, v, ctx) => (ctx.favorite = bool(v)) },
  Category: { get: (r) => r.badge.label, set: (r, v) => (r.badge = { label: normalizeCategory(str(v)) }) },
  Servings: {
    get: (r) => r.serves,
    set: (r, v) => (r.serves = num(v) || 2),
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
    badge: { label: '' },
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

/**
 * Whether an Ingredients_JSON cell is in the layout before schema version 2 (lines with their own
 * `text` instead of an ingredient `id`).
 */
export function isOldIngredientsJSON(value) {
  let data;
  try {
    data = JSON.parse(str(value) || '[]');
  } catch {
    return false;
  }
  if (!Array.isArray(data)) return false;
  const lines = data.flatMap((g) => (g && Array.isArray(g.items) ? g.items : [g]));
  return lines.some((i) => i && typeof i === 'object' && !i.id && (i.text || i.name || i.item));
}

/** Recipe_ID for a sheet row that has none. @param {unknown} title @param {Set<string>} taken */
export const newRecipeIdFor = (title, taken) => recipeIdFor(str(title), (id) => taken.has(id));

// ---- Ingredients ------------------------------------------------------------

/** @typedef {import('../ingredients.js').Ingredient} Ingredient */

/** @param {Ingredient} ingredient @returns {Row} */
export function ingredientToRow(ingredient) {
  return {
    Ingredient_ID: ingredient.id,
    Name: ingredient.name,
    Plural: ingredient.plural,
    Aisle: aisles.find((a) => a.tag === ingredient.aisle)?.label ?? ingredient.aisle,
    On_Hand: ingredient.onHand,
  };
}

/**
 * @param {Row} row @param {Ingredient | undefined} existing on-device version of the same Ingredient_ID
 * @param {string[]} columns the ones the sheet has
 * @returns {Ingredient}
 */
export function ingredientFromRow(row, existing, columns) {
  const id = str(row.Ingredient_ID);
  const written = existing ? ingredientToRow(existing) : null;
  const changed = (col) => columns.includes(col) && !(written && cellText(written[col]) === cellText(row[col]));
  const next = existing ? { ...existing } : { id, name: '', plural: '', aisle: 'Pantry', onHand: false };
  if (changed('Name')) next.name = tidyIngredientName(str(row.Name)) || next.name;
  if (changed('Plural')) next.plural = tidyIngredientName(str(row.Plural));
  // An aisle MealCaster doesn't know keeps the one it had.
  if (changed('Aisle')) next.aisle = parseAisle(row.Aisle) || next.aisle;
  if (changed('On_Hand')) next.onHand = bool(row.On_Hand);
  if (!next.name) next.name = id.replace(/-/g, ' ');
  return next;
}

/** Ingredient_ID for a sheet row that has a name but no id. @param {unknown} name @param {Set<string>} taken */
export const newIngredientIdFor = (name, taken) => ingredientIdFor(str(name), (id) => taken.has(id));

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

const STATUS_LABEL = { need: 'To buy', bought: 'Bought', owned: 'On hand' };

/** @returns {import('../grocery.svelte.js').LineStatus} */
export function parseStatus(v) {
  const t = str(v).toLowerCase();
  if (v === true || /^(bought|done|got|checked|true|x|✓)/.test(t)) return 'bought';
  // "In pantry" is what earlier builds wrote.
  if (/on hand|pantry|owned|have|stock/.test(t)) return 'owned';
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
 * Moves lists keyed by another weekday (the week start changed) onto the
 * day their week now starts on, merging lists that land on the same week.
 * @param {Record<string, import('../grocery.svelte.js').WeekList>} weeks
 */
export function rekeyGroceryWeeks(weeks) {
  /** @type {Record<string, import('../grocery.svelte.js').WeekList>} */
  const out = {};
  for (const [week, list] of Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b))) {
    const into = (out[weekStartOf(fromISO(week))] ??= { extras: [], status: {}, custom: [] });
    for (const key of list.extras ?? []) if (!into.extras.includes(key)) into.extras.push(key);
    Object.assign(into.status, list.status);
    for (const item of list.custom ?? []) if (!into.custom.some((c) => c.id === item.id)) into.custom.push(item);
  }
  return out;
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
    const week = isoDate(row.Week_Of) && weekStartOf(fromISO(isoDate(row.Week_Of)));
    const key = str(row.Line_Key);
    if (!week || !key) continue;
    if (isGlobalKey(key)) continue;
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

/** Global (every-week) custom items have keys like `global:<id>`. */
export const isGlobalKey = (key) => key.startsWith('global:');

/**
 * Rebuilds the every-week items from provisions rows. A global item has a row in each week it shows in; one
 * that is bought / on hand in a row's week was acquired there.
 * @param {Row[]} rows
 * @returns {import('../grocery.svelte.js').GlobalItem[]}
 */
export function globalFromRows(rows) {
  /** @type {Map<string, import('../grocery.svelte.js').GlobalItem>} */
  const items = new Map();
  for (const row of rows) {
    const week = isoDate(row.Week_Of) && weekStartOf(fromISO(isoDate(row.Week_Of)));
    const key = str(row.Line_Key);
    if (!week || !isGlobalKey(key)) continue;
    const status = parseStatus(row.Status);
    const item = items.get(key);
    if (!item) {
      items.set(key, {
        id: key,
        name: str(row.Item) || 'Item',
        note: str(row.Detail),
        dept: parseDept(row.Department),
        status,
        doneWeek: status === 'need' ? '' : week,
      });
    } else if (status !== 'need' && item.status === 'need') {
      item.status = status;
      item.doneWeek = week;
    }
  }
  return [...items.values()];
}

// ---- Settings ---------------------------------------------------------------

/** Settings row key: one row per section and name (case and spacing ignored). */
export const settingKey = (section, name) => `${str(section).toLowerCase()}|${str(name).toLowerCase().replace(/\s+/g, ' ')}`;

/** Ingredient aisle tag for a cell: an aisle's tag or label ("Meat & Seafood"), or '' if unknown. */
export function parseAisle(v) {
  const t = str(v).toLowerCase();
  if (!t) return '';
  const tag = normalizeAisle(str(v));
  return aisles.find((a) => a.tag === tag || a.tag.toLowerCase() === t || a.label.toLowerCase() === t)?.tag ?? '';
}

/** [Settings] row for "go back to the planner after choosing a meal". */
export const RETURN_TO_PLANNER = { Section: 'Preference', Name: 'Return to planner after choosing a meal' };

/** [Settings] row holding the schema version the sheet was written with. */
export const SCHEMA_VERSION_ROW = { Section: 'Schema', Name: 'Version' };

/** [Settings] row for the weekday the planner's weeks start on. */
export const WEEK_STARTS_ON = { Section: 'Preference', Name: 'Week starts on' };

/** [Settings] section for tag colours: one row per tag, Value = the colour's name ("Saffron"). */
export const TAG_COLOUR_SECTION = 'Tag Colour';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Weekday number (0 Sunday … 6 Saturday) for "Monday" / "mon" in any case, or -1. */
export const parseWeekday = (v) => {
  const t = str(v).toLowerCase();
  return t.length >= 3 ? WEEKDAYS.findIndex((d) => d.toLowerCase().startsWith(t)) : -1;
};

/**
 * The [Settings] rows for the device's settings, keyed for sync.
 * @param {{ tagColors?: Record<string, string>, returnToPlanner?: boolean, weekStartDay?: number }} settings
 * @returns {Map<string, Row>}
 */
export function settingsToRows(settings) {
  const rows = new Map();
  rows.set(settingKey(SCHEMA_VERSION_ROW.Section, SCHEMA_VERSION_ROW.Name), { ...SCHEMA_VERSION_ROW, Value: SCHEMA_VERSION });
  rows.set(settingKey(RETURN_TO_PLANNER.Section, RETURN_TO_PLANNER.Name), {
    ...RETURN_TO_PLANNER,
    Value: settings.returnToPlanner ?? true,
  });
  rows.set(settingKey(WEEK_STARTS_ON.Section, WEEK_STARTS_ON.Name), {
    ...WEEK_STARTS_ON,
    Value: WEEKDAYS[settings.weekStartDay ?? DEFAULT_WEEK_START_DAY],
  });
  for (const [tag, tone] of Object.entries(settings.tagColors ?? {})) {
    rows.set(settingKey(TAG_COLOUR_SECTION, tag), { Section: TAG_COLOUR_SECTION, Name: tag, Value: tone[0].toUpperCase() + tone.slice(1) });
  }
  return rows;
}

/**
 * Settings from [Settings] rows. Rows of a section MealCaster doesn't know, or with a value it
 * can't read, are ignored here and left alone in the sheet (bidirectional mode; backup sync removes them); a preference with no readable row
 * takes its default.
 * @param {Row[]} rows
 * The sheet's `Schema | Version` comes back as `schemaVersion` (0 when missing or unreadable) so a migration can
 * tell how old the sheet is; the device never overwrites it.
 * @returns {{ tagColors: Record<string, string>, returnToPlanner: boolean, weekStartDay: number, schemaVersion: number }}
 */
export function settingsFromRows(rows) {
  /** @type {Record<string, string>} */
  const tagColors = {};
  let returnToPlanner = true;
  let weekStartDay = DEFAULT_WEEK_START_DAY;
  let schemaVersion = 0;
  const weekKey = settingKey(WEEK_STARTS_ON.Section, WEEK_STARTS_ON.Name);
  const returnKey = settingKey(RETURN_TO_PLANNER.Section, RETURN_TO_PLANNER.Name);
  for (const row of rows) {
    const section = str(row.Section).toLowerCase();
    if (section === 'preference') {
      const value = str(row.Value).toLowerCase();
      if (settingKey(row.Section, row.Name) === returnKey && /^(true|false|yes|no|y|n|1|0|on|off)$/.test(value)) {
        returnToPlanner = /^(true|yes|y|1|on)$/.test(value);
      }
      if (settingKey(row.Section, row.Name) === weekKey && parseWeekday(row.Value) >= 0) weekStartDay = parseWeekday(row.Value);
      continue;
    }
    if (section === 'schema') {
      if (settingKey(row.Section, row.Name) === settingKey(SCHEMA_VERSION_ROW.Section, SCHEMA_VERSION_ROW.Name)) {
        const n = Number.parseInt(str(row.Value), 10);
        if (n > 0) schemaVersion = n;
      }
      continue;
    }
    if (section === TAG_COLOUR_SECTION.toLowerCase()) {
      const tag = normalizeTag(str(row.Name));
      const tone = str(row.Value).toLowerCase();
      if (tag && TONES.includes(tone) && !Object.hasOwn(tagColors, tag)) tagColors[tag] = tone;
    }
  }
  return { tagColors, returnToPlanner, weekStartDay, schemaVersion };
}
