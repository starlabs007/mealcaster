// Seeded generator for the dev sample data: recipes, the ingredient list, a plan, favorites and grocery extras.
// The same seed and count always give the same output (ids included: device edits and deletions refer to them),
// except `addedAt`: those dates count back from today, or from SAMPLE_DATE (YYYY-MM-DD) when it's set.
// Recipe i only depends on the seed and i, so a larger count starts with the same recipes as a smaller one.
//
// Plain JS (no runes, no network), runnable under Node. It lives outside src/ so it is never bundled.

import { formatMinutes } from '../../src/lib/data/recipes.js';
import { UNITS, ingredientIdFor, slugify, tidyIngredientName } from '../../src/lib/ingredients.js';
import { aisles } from '../../src/lib/data/aisles.js';
import { normalizeTag } from '../../src/lib/tags.js';
import { random, mixSeed } from './random.js';
import { CATALOG, NEAR_DUPLICATES } from './ingredients.js';
import { CUISINES, HERBS, MAINS, VEG, cuisineByName } from './cuisines.js';
import { TEMPLATES } from './templates.js';
import { EDGE_CASES } from './edgeCases.js';
import { DESC_EXTRA, GENERAL_TIPS, NOTE_HEADINGS } from './phrases.js';

/** Bump whenever the output for a given seed and count changes (it is part of the dev data key). */
export const GENERATOR_VERSION = 3;

/**
 * The day `addedAt` dates count back from, as a UTC timestamp: `today` ("YYYY-MM-DD"), else the SAMPLE_DATE
 * environment variable, else today. An invalid date is ignored with a warning.
 * @param {string} [today]
 */
export function sampleDay(today = globalThis.process?.env?.SAMPLE_DATE) {
  if (today) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today.trim());
    const day = m && Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (day && new Date(day).toISOString().startsWith(today.trim())) return day;
    console.warn(`Sample data: ignoring SAMPLE_DATE "${today}" (expected YYYY-MM-DD); using today.`);
  }
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Share of recipes per category (Dinner the rest). */
const CATEGORY_WEIGHTS = [
  ['Dinner', 0.62],
  ['Lunch', 0.14],
  ['Breakfast', 0.1],
  ['Dessert', 0.14],
];

/** Image URL on TheMealDB that doesn't exist, so the placeholder tile stays tested. */
const missingPhoto = (n) => `https://www.themealdb.com/images/media/meals/mealcaster-missing-${n}.jpg`;

/**
 * @typedef {import('../../src/lib/data/recipes.js').Recipe} Recipe
 * @typedef {import('../../src/lib/ingredients.js').Ingredient} Ingredient
 * @typedef {import('../../src/lib/ingredients.js').RecipeLine} RecipeLine
 * @typedef {{ id: string, name: string, category: string, area: string, url: string }} Photo  from images.js
 * @typedef {{ weekOffset: number, day: number, recipeId?: string, diningOut?: boolean }} SamplePlanEntry
 *   `day`: 0–6 from the start of the week `weekOffset` weeks from the current one
 * @typedef {{
 *   every: import('../../src/lib/groceryList.js').EveryWeekItem[],
 *   weeks: { weekOffset: number, added: Record<string, string> }[],
 * }} SampleGrocery
 * @typedef {{
 *   recipes: Recipe[],
 *   ingredients: Ingredient[],
 *   plan: SamplePlanEntry[],
 *   favorites: string[],
 *   grocery: SampleGrocery,
 * }} Samples
 */

// ---- Ingredient catalog --------------------------------------------------------------------------------------------

/**
 * @typedef {Ingredient & { meat: boolean, animal: boolean, gluten: boolean, vegAlt: string }} CatalogEntry
 */

/** The catalog with ids, by name. Built once; throws on a bad entry so mistakes show up in the tests. */
const catalog = (() => {
  const validAisles = new Set(aisles.map((a) => a.tag));
  /** @type {Map<string, CatalogEntry>} */
  const byName = new Map();
  const add = ([name, plural, aisle, flags, vegAlt = '']) => {
    if (tidyIngredientName(name) !== name || tidyIngredientName(plural) !== plural) throw new Error(`Untidy name: ${name}`);
    if (!validAisles.has(aisle)) throw new Error(`Unknown aisle for ${name}: ${aisle}`);
    if (byName.has(name)) throw new Error(`Duplicate ingredient: ${name}`);
    const id = ingredientIdFor(name, (taken) => [...byName.values()].some((i) => i.id === taken));
    byName.set(name, {
      id, name, plural, aisle, onHand: flags.includes('h'),
      meat: flags.includes('m'), animal: flags.includes('m') || flags.includes('a'), gluten: flags.includes('g'), vegAlt,
    });
  };
  CATALOG.forEach(add);
  for (const [of, name, plural] of NEAR_DUPLICATES) {
    const base = byName.get(of);
    if (!base) throw new Error(`Near-duplicate of unknown ingredient: ${of}`);
    const flags = [base.meat && 'm', base.animal && !base.meat && 'a', base.gluten && 'g'].filter(Boolean).join('');
    add([name, plural, base.aisle, flags]);
  }
  for (const e of byName.values()) if (e.vegAlt && !byName.has(e.vegAlt)) throw new Error(`Unknown vegetarian alternative: ${e.vegAlt}`);
  return byName;
})();

/** @param {string} name */
function entry(name) {
  const e = catalog.get(name);
  if (!e) throw new Error(`Unknown ingredient: ${name}`);
  return e;
}

// ---- Lines ---------------------------------------------------------------------------------------------------------

const UNIT_SET = new Set(UNITS.map(([u]) => u));

/** Quantities a range picks from. */
const NICE = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, ...Array.from({ length: 997 }, (_, i) => i + 4)];

/** "1 1/4" → 1.25, "1/3" → 0.333…, "250" → 250. @param {string} text */
function parseNumber(text) {
  return text
    .trim()
    .split(/\s+/)
    .reduce((sum, part) => {
      const [a, b] = part.split('/');
      const n = b ? Number(a) / Number(b) : Number(a);
      if (!Number.isFinite(n)) throw new Error(`Bad quantity: ${text}`);
      return sum + n;
    }, 0);
}

/**
 * A line spec → a recipe line (by ingredient name; ids are filled in later).
 * @param {string} spec 'name|amount|prep|note', a leading ? = optional @param {ReturnType<typeof random>} rng
 */
function parseLine(spec, rng) {
  const optional = spec.startsWith('?');
  const fields = (optional ? spec.slice(1) : spec).split('|');
  if (fields.length > 4) throw new Error(`Too many fields: ${spec}`);
  const [name, amount = '', prep = '', note = ''] = fields.map((f) => f.trim());
  const words = amount.split(/\s+/).filter(Boolean);
  const unit = words.length && UNIT_SET.has(words.at(-1)) ? words.pop() : '';
  if (words.some((w) => /[a-z]/i.test(w))) throw new Error(`Unknown unit in: ${spec}`);
  let qty;
  const text = words.join(' ');
  if (text.includes('-')) {
    const [lo, hi] = text.split('-').map(parseNumber);
    const options = NICE.filter((n) => n >= lo - 1e-9 && n <= hi + 1e-9);
    qty = rng.pick(options);
  } else if (text) qty = parseNumber(text);
  return { name, qty, unit, prep: prep === 'to taste' && qty == null ? 'to taste' : prep, note, optional };
}

// ---- Recipes -------------------------------------------------------------------------------------------------------

/** "a, b and c" @param {string[]} list */
const joinList = (list) => (list.length < 2 ? (list[0] ?? '') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`);

/** "red bell pepper" → "Red Bell Pepper" @param {string} text */
const titleCase = (text) => text.replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

/** Name used in running text: the plural when there is one. @param {string} name */
const textName = (name) => entry(name).plural || name;

/** Fills {placeholders}. @param {string} pattern @param {Record<string, string>} words */
const fill = (pattern, words) => pattern.replace(/\{(\w+)\}/g, (_, key) => words[key] ?? '');

/** Placeholders a pattern uses that have no value. @param {string} pattern @param {Record<string, string>} words */
const missing = (pattern, words) => [...pattern.matchAll(/\{(\w+)\}/g)].some(([, key]) => !words[key]);

/**
 * Picks a pattern whose placeholders all have values (or any, when none do).
 * @param {ReturnType<typeof random>} rng @param {string[]} patterns @param {Record<string, string>} words
 */
const pickPattern = (rng, patterns, words) => {
  const usable = patterns.filter((p) => !missing(p, words));
  return rng.pick(usable.length ? usable : patterns);
};

/**
 * A recipe "draft": everything but ids, tags and photo, in a form edge cases and templates both produce.
 * @typedef {{
 *   template?: string,
 *   key: string,
 *   title: string,
 *   shortTitle: string,
 *   description: string,
 *   category: string,
 *   cuisine: string,
 *   mealdb: string,
 *   serves: number,
 *   prepMinutes: number,
 *   cookMinutes: number,
 *   groups: { title: string, category: string, lines: ReturnType<typeof parseLine>[] }[],
 *   steps: { title: string, minutes: number, text: string }[],
 *   notes: string,
 *   headsUps: { text: string, daysBefore: number }[],
 *   customTags: string[],
 * }} Draft
 */

/**
 * Swaps lines for a vegetarian dish and a cuisine's preferred spellings; drops a line repeated within a group.
 * Returns the groups left and the names swapped, so the text can follow.
 * @param {Draft['groups']} groups @param {{ vegetarian: boolean, prefer?: Record<string, string> }} options
 */
function adjustLines(groups, { vegetarian, prefer = {} }) {
  /** @type {Map<string, string>} */
  const swaps = new Map();
  for (const group of groups) {
    const seen = new Set();
    group.lines = group.lines.flatMap((line) => {
      let name = line.name;
      if (vegetarian && entry(name).animal) {
        if (!entry(name).vegAlt) return [];
        name = entry(name).vegAlt;
      }
      name = prefer[name] ?? name;
      if (name !== line.name) swaps.set(line.name, name);
      if (seen.has(name)) return [];
      seen.add(name);
      return [{ ...line, name }];
    });
  }
  return { groups: groups.filter((g) => g.lines.length), swaps };
}

/** Text with swapped ingredient names replaced ("fish sauce" → "light soy sauce"). @param {string} text @param {Map<string, string>} swaps */
const swapNames = (text, swaps) => [...swaps].reduce((t, [from, to]) => t.replace(new RegExp(`\\b${from}`, 'g'), to), text);

/** @param {import('./edgeCases.js').EdgeCase} edge @param {ReturnType<typeof random>} rng @returns {Draft} */
function edgeDraft(edge, rng) {
  const groups = edge.groups.map(([title, category, lines]) => ({ title, category, lines: lines.map((l) => parseLine(l, rng)) }));
  return {
    key: edge.key,
    title: edge.title,
    shortTitle: edge.short,
    description: edge.desc,
    category: edge.category,
    cuisine: edge.cuisine,
    mealdb: edge.mealdb,
    serves: edge.serves,
    prepMinutes: edge.prepMinutes,
    cookMinutes: edge.cookMinutes,
    groups: adjustLines(groups, { vegetarian: false, prefer: cuisineByName.get(edge.cuisine)?.prefer }).groups,
    steps: edge.steps.map(([title, minutes, text]) => ({ title, minutes, text })),
    notes: edge.notes,
    headsUps: [],
    customTags: edge.tags,
  };
}

/** @param {ReturnType<typeof random>} rng */
function pickTemplate(rng) {
  let r = rng.next();
  let category = 'Dinner';
  for (const [c, w] of CATEGORY_WEIGHTS) {
    if (r < w) {
      category = c;
      break;
    }
    r -= w;
  }
  return rng.pick(TEMPLATES.filter((t) => t.category === category));
}

/**
 * A recipe draft from a random template, cuisine and main.
 * @param {ReturnType<typeof random>} rng
 * @returns {Draft}
 */
function templateDraft(rng) {
  const t = pickTemplate(rng);
  const cuisine = cuisineByName.get(rng.pick(t.cuisines));
  if (!cuisine) throw new Error(`Template ${t.id}: unknown cuisine`);
  const mainKeys = (t.mains ?? []).filter((k) => MAINS[k]?.cuts[t.style]);
  if (t.mains && !mainKeys.length) throw new Error(`Template ${t.id}: no main has the ${t.style} cut`);
  const mainKey = mainKeys.length ? rng.pick(mainKeys) : '';
  const main = mainKey ? MAINS[mainKey] : undefined;
  const flavor = rng.pick(cuisine.flavors);
  const usesFlavor = t.groups.some(([, , lines]) => lines.includes('@flavor'));

  /** Names picked for the slots, for the text. */
  const picked = { veg: [], herbs: [], aromatics: [], starch: [] };
  const inRecipe = new Set();
  const range = (spec) => {
    const [lo, hi] = spec.split('-').map(Number);
    return rng.int(lo, hi);
  };
  const expand = (token) => {
    if (!token.startsWith('@')) return [token];
    const [slot, arg = ''] = token.slice(1).split(':');
    switch (slot) {
      case 'main':
        return main ? [rng.pick(main.cuts[t.style])] : [];
      case 'flavor':
        return flavor.lines;
      case 'aromatics':
        picked.aromatics = cuisine.aromatics.map((l) => l.split('|')[0]);
        return cuisine.aromatics;
      case 'sauce':
        return cuisine.sauce;
      case 'starch': {
        const line = rng.pick(cuisine.starch);
        picked.starch = [line.split('|')[0]];
        return [line];
      }
      case 'veg': {
        const suits = t.veg ? cuisine.veg.filter((v) => t.veg.includes(v)) : cuisine.veg;
        const names = rng.sample((suits.length ? suits : t.veg).filter((v) => !inRecipe.has(v)), range(arg));
        picked.veg.push(...names);
        return names.map((n) => VEG[n]);
      }
      case 'herbs': {
        const names = rng.sample(cuisine.herbs.filter((h) => !inRecipe.has(h)), range(arg));
        picked.herbs.push(...names);
        return names.map((n) => HERBS[n]);
      }
      case 'broth':
        return [`${!main ? 'vegetable broth' : mainKey === 'beef' ? 'beef broth' : 'chicken broth'}|${arg}`];
      default:
        throw new Error(`Template ${t.id}: unknown slot ${token}`);
    }
  };

  const groups = t.groups.map(([title, category, tokens]) => {
    const lines = tokens.flatMap(expand).map((spec) => parseLine(spec, rng));
    for (const l of lines) inRecipe.add(l.name);
    return { title, category, lines };
  });
  const vegetarian = main?.kind === 'veg';
  const { groups: adjusted, swaps } = adjustLines(groups, { vegetarian, prefer: cuisine.prefer });
  const shown = (names) => names.map((n) => (vegetarian && entry(n).animal ? entry(n).vegAlt : n)).filter(Boolean).map((n) => cuisine.prefer?.[n] ?? n);

  const steps = t.steps.map(([title, spec, text]) => {
    const [mins, flags = ''] = spec.split(' ');
    const [lo, hi] = mins.split('-').map(Number);
    return { title, minutes: rng.minutes(lo, hi), text, prep: flags.includes('p') };
  });
  const prepMinutes = steps.filter((s) => s.prep).reduce((n, s) => n + s.minutes, 0);
  const cookMinutes = steps.filter((s) => !s.prep).reduce((n, s) => n + s.minutes, 0);

  const vegNames = shown(picked.veg);
  /** @type {Record<string, string>} */
  const words = {
    Main: main?.word ?? '',
    main: main?.noun ?? '',
    Veg: vegNames.length ? titleCase(vegNames[0]) : '',
    veg: vegNames.length ? joinList(vegNames.map(textName)) : '',
    Flavor: usesFlavor ? flavor.word : '',
    flavor: usesFlavor ? flavor.word.toLowerCase() : '',
    herbs: joinList(shown(picked.herbs)) || 'fresh herbs',
    aromatics: joinList(shown(picked.aromatics)) || 'aromatics',
    starch: shown(picked.starch)[0] ?? 'rice',
    cuisine: cuisine.name,
    time: formatMinutes(prepMinutes + cookMinutes),
  };
  const textWords = { ...words, veg: words.veg || 'vegetables', main: words.main || 'it' };
  const extra = rng.chance(0.6) ? ` ${fill(rng.pick(DESC_EXTRA[t.category]), words)}` : '';

  const text = (pattern) => swapNames(fill(pattern, textWords), swaps);

  return {
    template: t.id,
    key: `${t.id}|${cuisine.name}|${mainKey}|${usesFlavor ? flavor.word : ''}`,
    title: fill(pickPattern(rng, t.titles, words), words).replace(/\s+/g, ' ').trim(),
    shortTitle: fill(t.short, words).trim(),
    description: text(pickPattern(rng, t.desc, words)) + extra,
    category: t.category,
    cuisine: cuisine.name,
    mealdb: t.mealdb ?? main?.mealdb ?? 'Miscellaneous',
    serves: rng.int(...t.serves),
    prepMinutes,
    cookMinutes,
    groups: adjusted.map((g) => ({ ...g, title: fill(g.title, textWords) })),
    steps: steps.map((s) => ({ title: text(s.title), minutes: s.minutes, text: text(s.text) })),
    notes: makeNotes(rng, t.tips.map(text), cuisine.pairings),
    headsUps: (t.headsUps ?? []).map(([pattern, daysBefore]) => ({ text: text(pattern), daysBefore })),
    customTags: [
      ...(rng.chance(0.75) ? [cuisine.name] : []),
      ...(t.tags ?? []).filter(() => rng.chance(0.5)),
      ...(rng.chance(0.08) ? ['Date Night'] : []),
      ...(rng.chance(0.08) ? ['Spring'] : []),
    ],
  };
}

/**
 * Cook's Secrets in Markdown: sometimes none, sometimes one tip, sometimes a heading and a list, often a pairing.
 * @param {ReturnType<typeof random>} rng @param {string[]} tips @param {string[]} pairings
 */
function makeNotes(rng, tips, pairings) {
  if (rng.chance(0.2)) return '';
  const pool = rng.shuffle([...tips, ...rng.sample(GENERAL_TIPS, 2)]);
  const pairing = rng.chance(0.4) ? `\n\n${rng.pick(pairings)}` : '';
  const style = rng.int(0, 2);
  if (style === 0) return pool[0] + pairing;
  if (style === 1) return pool.slice(0, rng.int(2, 3)).map((t) => `- ${t}`).join('\n') + pairing;
  const [first, ...rest] = pool;
  return `### ${rng.pick(NOTE_HEADINGS)}\n\n${first}\n\n${rest.slice(0, 2).map((t) => `- ${t}`).join('\n')}${pairing}`;
}

/** Built-in tags from what's in the recipe. @param {Draft} draft */
function builtInTags(draft) {
  const items = draft.groups.flatMap((g) => g.lines.map((l) => entry(l.name)));
  return [
    ...(draft.prepMinutes + draft.cookMinutes < 30 ? ['Quick (<30m)'] : []),
    ...(items.every((i) => !i.animal) ? ['Vegetarian'] : []),
    ...(items.some((i) => i.meat) ? ['Poultry & Meat'] : []),
    ...(items.every((i) => !i.gluten) ? ['Gluten-Free'] : []),
  ];
}

/** A recipe line with the ingredient's id, leaving out empty fields (as the sheet codec stores lines). @returns {RecipeLine} */
const toLine = ({ name, qty, unit, prep, note, optional }) => ({
  id: entry(name).id,
  ...(qty != null && { qty }),
  ...(unit && { unit }),
  ...(note && { note }),
  ...(prep && { prep }),
  ...(optional && { optional: true }),
});

/** "2026-03-04", `daysAgo` days before `day` (a UTC timestamp). @param {number} day @param {number} daysAgo */
const addedDate = (day, daysAgo) => new Date(day - daysAgo * 86_400_000).toISOString().slice(0, 10);

// ---- Photos --------------------------------------------------------------------------------------------------------

/**
 * Picks photos that match a recipe: the same TheMealDB category, and the same area when there are any. Prefers
 * photos not used yet. Candidates are sorted by meal id, so picks only depend on the PRNG.
 * @param {Photo[]} images
 */
function photoPicker(images) {
  const sorted = [...images].sort((a, b) => Number(a.id) - Number(b.id) || a.id.localeCompare(b.id));
  const used = new Set();
  /** @param {Draft} draft @param {ReturnType<typeof random>} rng */
  return (draft, rng) => {
    if (!sorted.length) return undefined;
    const area = cuisineByName.get(draft.cuisine)?.area;
    const inCategory = sorted.filter((p) => p.category === draft.mealdb);
    const inArea = inCategory.filter((p) => p.area === area);
    let pool = inArea.length ? inArea : inCategory.length ? inCategory : sorted;
    const fresh = pool.filter((p) => !used.has(p.id));
    if (fresh.length) pool = fresh;
    const photo = rng.pick(pool);
    used.add(photo.id);
    return photo.url;
  };
}

// ---- Plan, favorites, grocery --------------------------------------------------------------------------------------

/**
 * Four past weeks fully planned (one of the nights dining out) and the current week partly planned. A few regulars
 * come back often, for Most Cooked.
 * @param {Recipe[]} recipes @param {ReturnType<typeof random>} rng @returns {SamplePlanEntry[]}
 */
function makePlan(recipes, rng) {
  const dinners = recipes.filter((r) => r.badge.label === 'Dinner');
  const pool = dinners.length ? dinners : recipes;
  const regulars = rng.sample(pool, Math.min(3, pool.length));
  const out = { weekOffset: rng.int(-4, -1), day: rng.int(4, 6) };
  /** @type {SamplePlanEntry[]} */
  const plan = [];
  let last = '';
  const choose = () => {
    let r;
    for (let tries = 0; tries < 5; tries++) {
      r = rng.chance(0.3) ? rng.pick(regulars) : rng.pick(pool);
      if (r.id !== last) break;
    }
    last = r.id;
    return r.id;
  };
  for (let weekOffset = -4; weekOffset <= -1; weekOffset++) {
    for (let day = 0; day < 7; day++) {
      if (weekOffset === out.weekOffset && day === out.day) plan.push({ weekOffset, day, diningOut: true });
      else plan.push({ weekOffset, day, recipeId: choose() });
    }
  }
  const thisWeekDays = rng.sample([0, 1, 2, 3, 4, 5, 6], rng.int(3, 5)).sort((a, b) => a - b);
  for (const day of thisWeekDays) plan.push({ weekOffset: 0, day, recipeId: choose() });
  return plan;
}

/** Two every-week items and one addition for this week only. @returns {SampleGrocery} */
const makeGrocery = () => ({
  every: [
    { ingredientId: entry('whole milk').id, note: '', status: 'need', doneWeek: '' },
    { ingredientId: entry('banana').id, note: 'a bunch', status: 'need', doneWeek: '' },
  ],
  weeks: [{ weekOffset: 0, added: { [entry('paper towels').id]: 'big pack' } }],
});

const GROCERY_NAMES = ['whole milk', 'banana', 'paper towels'];

// ---- Entry point ---------------------------------------------------------------------------------------------------

/**
 * @param {{ seed?: number, count?: number, images?: Photo[], today?: string }} [options]
 *   `today`: "YYYY-MM-DD" that `addedAt` dates count back from (default: SAMPLE_DATE, else today)
 * @returns {Samples}
 */
export function generateSamples({ seed = 1, count = 60, images = [], today } = {}) {
  if (!(count > 0)) return { recipes: [], ingredients: [], plan: [], favorites: [], grocery: { every: [], weeks: [] } };
  const day = sampleDay(today);
  const pickPhoto = photoPicker(images);
  /** @type {Recipe[]} */
  const recipes = [];
  const ids = new Set();
  const titles = new Set();
  const keys = new Set();
  /** @type {Map<string, number>} */
  const templateUses = new Map();

  for (let i = 0; i < count; i++) {
    const rng = random(mixSeed(seed, i));
    let draft;
    if (i < EDGE_CASES.length) draft = edgeDraft(EDGE_CASES[i], rng);
    else {
      // Retry for a dish we don't have yet, from a template used less than most; with very large counts, repeats
      // are fine.
      const cap = 1 + Math.floor((i - EDGE_CASES.length) / TEMPLATES.length);
      for (let tries = 0; tries < 40; tries++) {
        draft = templateDraft(rng);
        const fresh = !keys.has(draft.key) && (templateUses.get(draft.template) ?? 0) < cap;
        if (!titles.has(draft.title) && (tries >= 20 || fresh)) break;
      }
      templateUses.set(draft.template, (templateUses.get(draft.template) ?? 0) + 1);
    }
    keys.add(draft.key);
    titles.add(draft.title);
    const slug = slugify(draft.shortTitle) || 'recipe';
    let id = slug;
    for (let n = 2; ids.has(id); n++) id = `${slug}-${n}`;
    ids.add(id);

    const image = rng.chance(0.15) ? undefined : pickPhoto(draft, rng);
    const tags = [...builtInTags(draft), ...draft.customTags].map(normalizeTag).filter((t, j, all) => all.indexOf(t) === j);
    recipes.push({
      id,
      title: draft.title,
      shortTitle: draft.shortTitle,
      description: draft.description,
      ...(image && { image }),
      prepMinutes: draft.prepMinutes,
      cookMinutes: draft.cookMinutes,
      minutes: draft.prepMinutes + draft.cookMinutes,
      serves: draft.serves,
      badge: { label: draft.category },
      addedAt: addedDate(day, rng.int(0, 364)),
      tags,
      notes: draft.notes,
      ingredients: draft.groups.map((g) => ({ title: g.title, category: g.category, items: g.lines.map(toLine) })),
      steps: draft.steps,
      headsUps: draft.headsUps,
    });
  }

  const rng = random(mixSeed(seed, 0x5eed, count));
  // Two photos that 404, on recipes past the edge cases that have one.
  if (images.length) {
    const withPhoto = recipes.slice(EDGE_CASES.length).filter((r) => r.image);
    rng.sample(withPhoto, 2).forEach((r, n) => (r.image = missingPhoto(n + 1)));
  }
  const favorites = rng.sample(recipes, Math.max(1, Math.round(count * 0.1))).map((r) => r.id);
  const plan = makePlan(recipes, rng);

  const used = new Set([
    ...recipes.flatMap((r) => r.ingredients.flatMap((g) => g.items.map((l) => l.id))),
    ...GROCERY_NAMES.map((n) => entry(n).id),
    ...NEAR_DUPLICATES.flatMap(([a, b]) => [entry(a).id, entry(b).id]),
  ]);
  const ingredients = [...catalog.values()]
    .filter((e) => used.has(e.id))
    .map(({ id, name, plural, aisle, onHand }) => ({ id, name, plural, aisle, onHand }));

  return { recipes, ingredients, plan, favorites, grocery: makeGrocery() };
}

/** Cuisines the generator uses, for tests and docs. */
export const SAMPLE_CUISINES = CUISINES.map((c) => c.name);
