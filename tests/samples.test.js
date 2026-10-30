// Tests for the dev sample data generator (dev/samples/generate.js).

import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSamples, GENERATOR_VERSION, sampleDay } from '../dev/samples/generate.js';
import { CATALOG, NEAR_DUPLICATES } from '../dev/samples/ingredients.js';
import { EDGE_CASES } from '../dev/samples/edgeCases.js';
import * as codec from '../src/lib/sync/codec.js';
import { SCHEMA } from '../src/lib/schema.js';
import { UNITS, foldKey } from '../src/lib/ingredients.js';
import { aisles } from '../src/lib/data/aisles.js';
import { TONES, assignTones, normalizeTag, suggestedTags } from '../src/lib/tags.js';
import { MEALS } from '../src/lib/meals.js';

/** A small fake photo list in the shape images.js returns: every category, a few areas. */
const CATEGORIES = ['Beef', 'Breakfast', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork', 'Seafood', 'Side', 'Vegan', 'Vegetarian'];
const AREAS = ['Chinese', 'Vietnamese', 'Italian', 'Mexican', 'American', ''];
const images = Array.from({ length: 120 }, (_, i) => ({
  id: String(52700 + i),
  name: `Meal ${i}`,
  category: CATEGORIES[i % CATEGORIES.length],
  area: AREAS[i % AREAS.length],
  url: `https://www.themealdb.com/images/media/meals/fake${i}.jpg`,
}));

const MISSING = /mealcaster-missing-\d\.jpg$/;

// No network: any fetch fails the test.
const realFetch = globalThis.fetch;
before(() => {
  globalThis.fetch = () => {
    throw new Error('network used');
  };
});
after(() => {
  globalThis.fetch = realFetch;
});

/** Flags (meat / animal / gluten) per ingredient name, from the catalog. */
const flagsByName = new Map(CATALOG.map(([name, , , flags]) => [name, flags]));
for (const [of, name] of NEAR_DUPLICATES) flagsByName.set(name, flagsByName.get(of));

const TODAY = '2026-10-20';
const s = generateSamples({ seed: 1, count: 60, images, today: TODAY });
const ingredientById = new Map(s.ingredients.map((i) => [i.id, i]));
const lines = (r) => r.ingredients.flatMap((g) => g.items);
const flagsOf = (r) => lines(r).map((l) => flagsByName.get(ingredientById.get(l.id).name));

describe('generateSamples', () => {
  it('gives the same output for the same seed and count, and different output for another seed', () => {
    assert.equal(typeof GENERATOR_VERSION, 'number');
    assert.deepEqual(generateSamples({ seed: 1, count: 60, images, today: TODAY }), s);
    assert.notDeepEqual(generateSamples({ seed: 2, count: 60, images }).recipes, s.recipes);
  });

  it('starts a larger count with the same recipes as a smaller one', () => {
    const small = generateSamples({ seed: 1, count: 20, images });
    assert.deepEqual(
      small.recipes.map((r) => [r.id, r.title]),
      s.recipes.slice(0, 20).map((r) => [r.id, r.title]),
    );
  });

  it('is empty for count 0', () => {
    assert.deepEqual(generateSamples({ seed: 1, count: 0, images }), {
      recipes: [], ingredients: [], plan: [], favorites: [], grocery: { every: [], weeks: [] },
    });
  });

  it('makes the requested number of recipes with unique ids', () => {
    assert.equal(s.recipes.length, 60);
    assert.equal(new Set(s.recipes.map((r) => r.id)).size, 60);
    assert.equal(new Set(s.ingredients.map((i) => i.id)).size, s.ingredients.length);
    assert.equal(generateSamples({ seed: 3, count: 400 }).recipes.length, 400);
  });

  it('takes recipe ids from the title, cut at a whole word within 40 characters', () => {
    const lamb = s.recipes.find((r) => r.title.startsWith('Slow-Roasted Garlic'));
    assert.equal(lamb.id, 'slow-roasted-garlic-rosemary-lamb');
    for (const r of s.recipes) {
      const slug = r.id.replace(/-\d+$/, '');
      assert.ok(slug.length <= 40, r.id);
      assert.ok(`${foldKey(r.title).replace(/[^a-z0-9]+/g, '-')}-`.startsWith(`${slug}-`), r.id);
    }
  });

  it('only refers to ingredients in the list, with valid aisles and units', () => {
    const validAisles = new Set(aisles.map((a) => a.tag));
    const validUnits = new Set(UNITS.map(([u]) => u));
    for (const i of s.ingredients) assert.ok(validAisles.has(i.aisle), `${i.name}: ${i.aisle}`);
    for (const r of s.recipes) {
      for (const l of lines(r)) {
        assert.ok(ingredientById.has(l.id), `${r.id}: ${l.id}`);
        if (l.unit) assert.ok(validUnits.has(l.unit), `${r.id}: ${l.unit}`);
        if (l.qty != null) assert.ok(l.qty > 0);
      }
    }
    for (const e of s.grocery.every) assert.ok(ingredientById.has(e.ingredientId));
    for (const w of s.grocery.weeks) for (const id of Object.keys(w.added)) assert.ok(ingredientById.has(id));
  });

  it('lists about 200 ingredients across every aisle, about a fifth on hand, all used apart from near-duplicates', () => {
    assert.ok(s.ingredients.length >= 170 && s.ingredients.length <= 260, `${s.ingredients.length} ingredients`);
    assert.deepEqual(new Set(s.ingredients.map((i) => i.aisle)), new Set(aisles.map((a) => a.tag)));
    const onHand = s.ingredients.filter((i) => i.onHand).length / s.ingredients.length;
    assert.ok(onHand > 0.12 && onHand < 0.3, `on hand: ${onHand}`);
    const used = new Set([
      ...s.recipes.flatMap((r) => lines(r).map((l) => l.id)),
      ...s.grocery.every.map((e) => e.ingredientId),
      ...s.grocery.weeks.flatMap((w) => Object.keys(w.added)),
    ]);
    const nearDuplicates = new Set(NEAR_DUPLICATES.flatMap(([a, b]) => [a, b]));
    for (const i of s.ingredients) assert.ok(used.has(i.id) || nearDuplicates.has(i.name), `unused: ${i.name}`);
    for (const name of nearDuplicates) assert.ok(s.ingredients.some((i) => i.name === name), `missing near-duplicate ${name}`);
  });

  it('plans four past weeks in full (one night out) and part of this week', () => {
    const ids = new Set(s.recipes.map((r) => r.id));
    for (const e of s.plan) {
      assert.ok(e.day >= 0 && e.day <= 6);
      if (!e.diningOut) assert.ok(ids.has(e.recipeId), e.recipeId);
    }
    for (const week of [-4, -3, -2, -1]) assert.equal(s.plan.filter((e) => e.weekOffset === week).length, 7);
    assert.equal(s.plan.filter((e) => e.diningOut).length, 1);
    const thisWeek = s.plan.filter((e) => e.weekOffset === 0);
    assert.ok(thisWeek.length > 0 && thisWeek.length < 7);
    assert.ok(s.plan.every((e) => e.weekOffset >= -4 && e.weekOffset <= 0));
  });

  it('favorites about a tenth of the recipes', () => {
    const ids = new Set(s.recipes.map((r) => r.id));
    assert.equal(s.favorites.length, 6);
    for (const id of s.favorites) assert.ok(ids.has(id));
  });

  it('adds every-week grocery items and one manual addition', () => {
    assert.equal(s.grocery.every.length, 2);
    for (const e of s.grocery.every) assert.deepEqual(Object.keys(e).sort(), ['doneWeek', 'ingredientId', 'note', 'status']);
    assert.deepEqual(s.grocery.weeks.map((w) => [w.weekOffset, Object.keys(w.added).length]), [[0, 1]]);
  });

  it('covers every meal, Dinner most, and mixes cuisines, Chinese and Vietnamese included', () => {
    const count = (label) => s.recipes.filter((r) => r.meals.includes(label)).length;
    assert.ok(count('Dinner') > 30);
    for (const label of ['Lunch', 'Breakfast', 'Dessert']) assert.ok(count(label) >= 3, label);
    for (const label of MEALS) assert.ok(count(label) >= 2, label);
    for (const seed of [2, 3]) {
      const other = generateSamples({ seed, count: 60 }).recipes;
      for (const label of MEALS) assert.ok(other.some((r) => r.meals.includes(label)), `seed ${seed}: ${label}`);
    }
    const tags = new Set(s.recipes.flatMap((r) => r.tags));
    assert.ok(tags.has('Chinese') && tags.has('Vietnamese'));
  });

  it('keeps recipes consistent: minutes add up, normalized tags', () => {
    for (const r of s.recipes) {
      assert.equal(r.minutes, r.prepMinutes + r.cookMinutes, r.id);
      assert.ok(r.steps.every((st) => !('critical' in st)), r.id);
      assert.deepEqual(r.tags.map(normalizeTag), r.tags, r.id);
      assert.equal(new Set(r.tags).size, r.tags.length, r.id);
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.addedAt));
    }
  });

  it('spreads addedAt over the twelve months up to today', () => {
    const dates = s.recipes.map((r) => Date.parse(r.addedAt)).sort();
    assert.ok(dates.at(-1) - dates[0] > 200 * 86_400_000);
    assert.ok(dates[0] > Date.parse(TODAY) - 365 * 86_400_000);
    assert.ok(dates.at(-1) <= Date.parse(TODAY));
  });

  it('counts addedAt back from SAMPLE_DATE, or today when it is unset or invalid', () => {
    const saved = process.env.SAMPLE_DATE;
    const warn = console.warn;
    const warnings = [];
    console.warn = (msg) => warnings.push(msg);
    try {
      const now = new Date();
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      delete process.env.SAMPLE_DATE;
      assert.equal(sampleDay(), today);
      process.env.SAMPLE_DATE = '2025-01-31';
      assert.equal(sampleDay(), Date.UTC(2025, 0, 31));
      const latest = generateSamples({ seed: 1, count: 30 }).recipes.map((r) => r.addedAt).sort().at(-1);
      assert.ok(latest <= '2025-01-31' && latest >= '2024-02-01', latest);
      // The option wins over the variable.
      assert.deepEqual(
        generateSamples({ seed: 1, count: 10, images, today: TODAY }).recipes.map((r) => r.addedAt),
        s.recipes.slice(0, 10).map((r) => r.addedAt),
      );
      for (const bad of ['2025-02-30', '31/01/2025', 'soon']) {
        process.env.SAMPLE_DATE = bad;
        assert.equal(sampleDay(), today, bad);
      }
      assert.equal(warnings.length, 3);
    } finally {
      console.warn = warn;
      if (saved === undefined) delete process.env.SAMPLE_DATE;
      else process.env.SAMPLE_DATE = saved;
    }
  });

  it('derives the built-in tags from the ingredients and times', () => {
    for (const r of s.recipes) {
      const flags = flagsOf(r);
      const has = (tag) => r.tags.includes(tag);
      assert.equal(has('Vegetarian'), flags.every((f) => !/[ma]/.test(f)), `${r.id}: Vegetarian`);
      assert.equal(has('Poultry & Meat'), flags.some((f) => f.includes('m')), `${r.id}: Poultry & Meat`);
      assert.equal(has('Gluten-Free'), flags.every((f) => !f.includes('g')), `${r.id}: Gluten-Free`);
      assert.equal(has('Quick (<30m)'), r.minutes < 30, `${r.id}: Quick`);
    }
  });

  it('uses about a dozen custom tags, enough for all five tag colours', () => {
    const custom = new Set(s.recipes.flatMap((r) => r.tags).filter((t) => !suggestedTags.includes(t)));
    assert.ok(custom.size >= 10, `${custom.size} custom tags`);
    const tones = {};
    assignTones(tones, [...suggestedTags, ...custom]);
    assert.deepEqual(new Set(Object.values(tones)), new Set(TONES));
  });

  it('includes every edge case', () => {
    assert.ok(EDGE_CASES.length <= 60);
    const r = s.recipes;
    assert.ok(r.some((x) => x.steps.length === 0 && x.meals.length === 0), 'no method, no category');
    assert.ok(r.some((x) => x.title.length > 120), 'very long title');
    assert.ok(r.some((x) => x.title.includes('Phở')), 'phở');
    for (const name of ['crème fraîche', 'jalapeño', 'đậu phụ']) {
      const id = s.ingredients.find((i) => i.name === name)?.id;
      assert.ok(id && r.some((x) => lines(x).some((l) => l.id === id)), name);
    }
    assert.ok(r.some((x) => x.ingredients.length === 1), 'one group');
    assert.ok(r.some((x) => x.ingredients.length === 6), 'six groups');
    assert.ok(r.some((x) => x.serves === 1) && r.some((x) => x.serves === 12), 'servings 1 and 12');
    assert.ok(r.some((x) => /^#{2,4} /m.test(x.notes) && /^ {2,}[-*] /m.test(x.notes)), 'headings and nested lists in notes');
    assert.ok(r.some((x) => x.tags.length === 0), 'no tags');
    assert.ok(r.some((x) => x.tags.length === 10), 'ten tags');
    assert.ok(r.some((x) => lines(x).some((l) => l.qty === 1 / 3)), 'a third');
    assert.ok(r.some((x) => lines(x).some((l) => l.qty == null)), 'a line without a quantity');
    assert.ok(r.some((x) => lines(x).some((l) => l.optional)), 'an optional line');
    assert.ok(r.some((x) => x.notes === '') && r.some((x) => x.notes !== ''), 'with and without notes');
  });

  it('uses every unit once the edge cases are in', () => {
    const edges = generateSamples({ seed: 1, count: EDGE_CASES.length });
    const used = new Set(edges.recipes.flatMap((r) => lines(r).map((l) => l.unit)));
    for (const [unit] of UNITS) assert.ok(used.has(unit), unit);
  });

  it('picks photos that match, leaves some out and breaks exactly two', () => {
    const urls = new Set(images.map((p) => p.url));
    const withPhoto = s.recipes.filter((r) => r.image);
    const missing = withPhoto.filter((r) => MISSING.test(r.image));
    assert.equal(missing.length, 2);
    for (const r of withPhoto) if (!MISSING.test(r.image)) assert.ok(urls.has(r.image), r.image);
    const without = s.recipes.length - withPhoto.length;
    assert.ok(without >= 3 && without <= 18, `${without} without a photo`);
    // A Vietnamese-tagged dinner gets a Vietnamese photo when the list has one in its category.
    const area = new Map(images.map((p) => [p.url, p.area]));
    const vietnamese = withPhoto.filter((r) => r.tags.includes('Vietnamese') && !MISSING.test(r.image));
    assert.ok(vietnamese.some((r) => area.get(r.image) === 'Vietnamese'));
  });

  it('prefers photos named like the dish when its template names them', () => {
    const named = ['Sesame Cucumber Salad', 'Green Beans', 'Boulangère Potatoes', 'Edamame', 'Hummus', 'Nuoc Cham', 'Chili Oil', 'Green Sauce', 'Salsa']
      .map((name, i) => ({ id: String(53900 + i), name, category: 'Miscellaneous', area: '', url: `https://www.themealdb.com/images/media/meals/named${i}.jpg` }));
    const withNamed = generateSamples({ seed: 1, count: 60, images: [...images, ...named], today: TODAY });
    const namedUrls = new Set(named.map((p) => p.url));
    const picked = withNamed.recipes.filter((r) => r.meals.some((m) => ['Side', 'Snack', 'Other'].includes(m)) && r.image && !MISSING.test(r.image));
    assert.ok(picked.length >= 5, `${picked.length} with photos`);
    for (const r of picked) assert.ok(namedUrls.has(r.image), `${r.id}: ${r.image}`);
    assert.ok(withNamed.recipes.filter((r) => namedUrls.has(r.image)).every((r) => picked.includes(r)), 'named photos go only to their dishes');
  });

  it('has no photos without an image list', () => {
    assert.ok(generateSamples({ seed: 1, count: 60 }).recipes.every((r) => !r.image));
  });

  it('round-trips recipes and ingredients through the sheet codec', () => {
    const favorites = new Set(s.favorites);
    for (const r of s.recipes) {
      const { recipe, favorite } = codec.recipeFromRow(codec.recipeToRow(r, favorites), undefined, {
        columns: SCHEMA.recipes,
        favorites,
        today: '2026-10-20',
      });
      for (const key of ['title', 'description', 'image', 'prepMinutes', 'cookMinutes', 'minutes', 'serves', 'meals', 'tags', 'notes', 'ingredients', 'steps']) {
        assert.deepEqual(recipe[key], r[key], `${r.id}: ${key}`);
      }
      assert.equal(favorite, favorites.has(r.id));
    }
    for (const i of s.ingredients) {
      assert.deepEqual(codec.ingredientFromRow(codec.ingredientToRow(i), undefined, SCHEMA.ingredients), i);
    }
  });
});
