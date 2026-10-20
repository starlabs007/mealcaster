// Hand-written sample recipes that cover the edge cases the app has to handle. The generator puts these first, so
// any count of at least EDGE_CASES.length includes all of them:
//   - no method (no steps) and no category            → pickled-onions
//   - a very long title; servings 12                   → lamb-feast
//   - accents: phở, đậu phụ, jalapeño, crème fraîche   → pho-chay, creme-fraiche-toast
//   - one ingredient group; servings 1                 → creme-fraiche-toast
//   - six ingredient groups; ten tags                  → lemongrass-chicken-feast
//   - nested Markdown lists and headings in notes      → margherita
//   - no tags at all                                   → miso-cod
//   - every unit in UNITS at least once                → all of them together
// Lines are 'name|amount|prep|note' as in cuisines.js. Built-in tags are worked out from the ingredients like any
// other sample's; `tags` here are only the custom ones.

/**
 * @typedef {{
 *   key: string,
 *   title: string,
 *   short: string,
 *   desc: string,
 *   category: string,
 *   cuisine: string,
 *   mealdb: string,
 *   serves: number,
 *   prepMinutes: number,
 *   cookMinutes: number,
 *   groups: [string, string, string[]][],
 *   steps: [string, number, string, boolean?][],
 *   notes: string,
 *   tags: string[],
 * }} EdgeCase
 */

/** @type {EdgeCase[]} */
export const EDGE_CASES = [
  {
    key: 'pickled-onions',
    title: 'Quick-Pickled Red Onions',
    short: 'Pickled Red Onions',
    desc: 'Bright pink, tangy onions for tacos, bowls and sandwiches. Just pour, shake and wait.',
    category: '',
    cuisine: 'Mexican',
    mealdb: 'Side',
    serves: 8,
    prepMinutes: 10,
    cookMinutes: 0,
    groups: [
      ['Pickle', 'Pantry', [
        'red onion|2 medium|thinly sliced into rings',
        'apple cider vinegar|250 ml',
        'sugar|1 tbsp',
        'kosher salt|1 1/2 tsp',
        'red pepper flakes|1 pinch',
      ]],
    ],
    steps: [],
    notes: 'Keeps for two weeks in the fridge. Pour boiling water over the onions first for a milder, crunchier pickle.',
    tags: ['Mexican', 'Meal Prep'],
  },
  {
    key: 'lamb-feast',
    title:
      'Slow-Roasted Garlic & Rosemary Lamb Shoulder with Crispy Smashed Potatoes, Charred Spring Onions, Anchovy Salsa Verde and a Red Wine Pan Sauce for the Whole Family',
    short: 'Slow-Roasted Lamb Shoulder',
    desc: 'A centerpiece for a long Sunday lunch: lamb roasted for hours until it pulls apart, with crispy potatoes and a sharp, herby salsa verde to cut the richness.',
    category: 'Dinner',
    cuisine: 'Mediterranean',
    mealdb: 'Lamb',
    serves: 12,
    prepMinutes: 40,
    cookMinutes: 270,
    groups: [
      ['The Lamb', 'Protein', [
        'lamb shoulder|3 kg|scored in a crosshatch|bone-in',
        'garlic|2 head|cloves separated and smashed',
        'rosemary|6 sprig',
        'olive oil|1/4 cup',
        'kosher salt|2 tbsp',
        'kitchen twine|1 roll||for tying',
      ]],
      ['Potatoes & Onions', 'Produce', [
        'yukon gold potato|2 kg|boiled until tender',
        'green onion|2 bunch|trimmed',
        'olive oil|1/3 cup',
      ]],
      ['Salsa Verde', 'Sauce', [
        'flat-leaf parsley|2 bunch|finely chopped',
        'anchovy fillet|6 fillet|minced',
        'capers|1 jar|drained and chopped|small',
        'red wine vinegar|2 tbsp',
        'lemon|1|zested',
        'extra virgin olive oil|3/4 cup',
      ]],
      ['Pan Sauce', 'Sauce', [
        'dry red wine|1/2 bottle',
        'beef broth|2 cup',
        'unsalted butter|2 tbsp|cold',
      ]],
    ],
    steps: [
      ['Season the Night Before', 20, 'Rub the lamb all over with salt, poke the garlic and rosemary into the cuts, and refrigerate uncovered overnight.'],
      ['Slow Roast', 240, 'Roast at **300°F** on a bed of the remaining garlic, covered with foil for the first 3 hours, then uncovered until the meat pulls away from the bone.', true],
      ['Crisp the Potatoes', 45, 'Smash the boiled potatoes flat on an oiled tray and roast at 450°F while the lamb rests, until shattering at the edges. Char the green onions in a hot pan.'],
      ['Salsa Verde', 15, 'Stir the parsley, anchovy, capers, vinegar and lemon zest together, then loosen with olive oil. Season boldly.'],
      ['Pan Sauce & Serve', 10, 'Pour off the fat, deglaze the roasting tin with the wine and broth, reduce by half and whisk in the butter. Pull the lamb into chunks and serve with everything.'],
    ],
    notes:
      '**Timing:** start this the day before — the overnight salt is what seasons the meat all the way through.\n\nLeftover lamb makes excellent flatbreads the next day.',
    tags: ['Date Night', 'Comfort Food', 'Spring'],
  },
  {
    key: 'pho-chay',
    title: 'Phở Chay with Đậu Phụ and Shiitake',
    short: 'Phở Chay',
    desc: 'A vegetarian phở with a deep, charred-onion and star-anise broth, golden đậu phụ and a big plate of herbs, chili and lime.',
    category: 'Dinner',
    cuisine: 'Vietnamese',
    mealdb: 'Vegetarian',
    serves: 4,
    prepMinutes: 20,
    cookMinutes: 60,
    groups: [
      ['Broth', 'Broth', [
        'vegetable broth|2 l',
        'shiitake mushroom|1 bag|soaked and sliced|dried, about 1 oz',
        'onion|1 large|halved and charred',
        'ginger|1 piece|halved and charred|4-inch',
        'star anise|5',
        'cinnamon stick|1',
        'light soy sauce|3 tbsp',
        'sugar|1 tbsp',
      ]],
      ['Bowls', 'Noodles & Tofu', [
        'banh pho noodles|1 package||14 oz',
        'đậu phụ|400 g|cut into slabs and pan-fried',
      ]],
      ['The Herb Plate', 'Garnish', [
        'bean sprouts|1 bag',
        'thai basil|1 bunch',
        'lime|2|cut into wedges',
        'jalapeño|1|thinly sliced',
        '?hoisin sauce|2 tbsp',
        '?sriracha|1 dash',
      ]],
    ],
    steps: [
      ['Char', 10, 'Char the onion and ginger over a gas flame or under the broiler until blackened in spots.'],
      ['Simmer the Broth', 45, 'Toast the star anise and cinnamon in a dry pot, then add the broth, mushrooms, onion and ginger. Simmer gently for 45 minutes and season with soy sauce and sugar.', true],
      ['Fry the Đậu Phụ', 10, 'Pan-fry the tofu slabs in a little oil until golden on both sides.'],
      ['Assemble', 5, 'Soak the noodles, divide between bowls, top with tofu and mushrooms, and ladle over the boiling broth. Serve with the herb plate.'],
    ],
    notes: 'A spoon of the mushroom-soaking liquid gives the broth the savoury depth beef bones would.\n\nFinish with **cà phê sữa đá** if you have the room.',
    tags: ['Vietnamese', 'Comfort Food'],
  },
  {
    key: 'creme-fraiche-toast',
    title: 'Jammy Egg Toast with Crème Fraîche and Radish',
    short: 'Crème Fraîche Toast',
    desc: 'Breakfast for one: thick sourdough, a swoosh of crème fraîche, jammy eggs, crisp radish and chives.',
    category: 'Breakfast',
    cuisine: 'American',
    mealdb: 'Breakfast',
    serves: 1,
    prepMinutes: 5,
    cookMinutes: 7,
    groups: [
      ['Toast', 'Toast', [
        'sourdough bread|1 slice|thick-cut',
        'crème fraîche|2 tbsp',
        'egg|2',
        'radish|2 small|thinly sliced',
        'chives|1 tbsp|snipped',
        'flaky sea salt||to taste',
        'black pepper||to taste',
      ]],
    ],
    steps: [
      ['Jammy Eggs', 7, 'Lower the eggs into boiling water for exactly 6½ minutes, then into ice water.', true],
      ['Toast & Top', 3, 'Toast the bread, spread thickly with crème fraîche, and top with halved eggs, radish, chives, salt and pepper.'],
    ],
    notes: '',
    tags: ['Spring'],
  },
  {
    key: 'lemongrass-chicken-feast',
    title: 'Lemongrass Chicken Rice-Paper Wrap Party',
    short: 'Lemongrass Chicken Wraps',
    desc: 'Put everything on the table and let everyone roll their own: sizzling lemongrass chicken, herbs, pickles, noodles and nước chấm.',
    category: 'Dinner',
    cuisine: 'Vietnamese',
    mealdb: 'Chicken',
    serves: 6,
    prepMinutes: 15,
    cookMinutes: 12,
    groups: [
      ['Lemongrass Chicken', 'Protein', [
        'chicken thigh|2 lb|thinly sliced|boneless, skinless',
        'vegetable oil|2 tbsp',
      ]],
      ['Marinade', 'Marinade', [
        'lemongrass|3 stalk|tender core minced',
        'garlic|4 clove|minced',
        'shallot|2|minced',
        'fish sauce|2 tbsp',
        'sugar|1 tbsp',
      ]],
      ['Nước Chấm', 'Sauce', [
        'fish sauce|3 tbsp',
        'lime|2|juiced',
        'sugar|3 tbsp',
        'red chili|1|thinly sliced',
      ]],
      ['Quick Pickles', 'Pickles', [
        'carrot|1|julienned',
        'daikon|1 piece|julienned|4-inch',
        'rice vinegar|1/3 cup',
      ]],
      ['The Herb Plate', 'Herbs', [
        'mint|1 bunch',
        'cilantro|1 bunch',
        'perilla leaf|10 leaf',
        'rau răm|1 handful',
        'butter lettuce|1 head|leaves separated',
        'cucumber|1|cut into spears',
      ]],
      ['Wrappers & Noodles', 'Wrappers', [
        'rice paper|1 package',
        'rice vermicelli|8 oz|cooked and rinsed',
        'roasted peanuts|1/3 cup|crushed',
      ]],
    ],
    steps: [
      ['Marinate & Prep', 15, 'Mix the chicken with the marinade. Toss the carrot and daikon with the vinegar and a pinch of sugar. Stir the nước chấm with 1/2 cup water. Arrange the herbs, lettuce and cucumber on a platter.'],
      ['Sear the Chicken', 10, 'Sear the chicken in a very hot pan in two batches until **caramelized at the edges**.', true],
      ['Set the Table', 2, 'Bring out a bowl of warm water for dipping the rice paper and let everyone build their own.'],
    ],
    notes:
      '- Keep the chicken in a single layer so it sizzles instead of stewing.\n- Make the nước chấm first; it gets better as it sits.\n\n**Pairing:** iced jasmine tea, or a cold lager.',
    tags: ['Vietnamese', 'Date Night', 'Spring', 'Summer', 'Spicy', 'Meal Prep', 'Kid Friendly'],
  },
  {
    key: 'margherita',
    title: 'Margherita Pizza on a Home Oven Stone',
    short: 'Margherita Pizza',
    desc: 'A blistered, chewy crust with bright San Marzano sauce, milky mozzarella and basil — as close to Naples as a home oven gets.',
    category: 'Dinner',
    cuisine: 'Italian',
    mealdb: 'Vegetarian',
    serves: 2,
    prepMinutes: 50,
    cookMinutes: 10,
    groups: [
      ['Dough', 'Base', [
        'pizza dough|1 ball||room temperature',
        'all-purpose flour|1/4 cup||for dusting',
      ]],
      ['Toppings', 'Toppings', [
        'san marzano tomatoes|1 can|crushed by hand|14 oz',
        'fresh mozzarella|1 ball|torn and drained',
        'basil|1 handful',
        'extra virgin olive oil|2 tbsp',
        'flaky sea salt||to taste',
      ]],
    ],
    steps: [
      ['Heat the Stone', 45, 'Heat the oven to its highest setting with a pizza stone on the top rack for at least 45 minutes.'],
      ['Stretch', 5, 'Stretch the dough by hand on a floured board, leaving a puffy rim. Spread thinly with tomato and scatter with mozzarella.'],
      ['Bake', 8, 'Slide onto the stone and bake until the crust is **leopard-spotted**, then switch to the broiler for the last minute.', true],
      ['Finish', 2, 'Tear over the basil, drizzle with oil and sprinkle with flaky salt.'],
    ],
    notes:
      '### Dough\n\n1. Let it come to room temperature for **at least an hour**.\n2. Stretch, don\'t roll:\n   - press from the center out with your fingertips;\n   - drape over your knuckles and rotate;\n     - let gravity do the work.\n\n### Toppings\n\n- Less is more. Too much sauce makes a soggy middle.\n- Drain the mozzarella on paper towels for 30 minutes.\n\n#### If your oven runs cool\n\nFinish under the broiler for 60–90 seconds.',
    tags: ['Italian', 'Kid Friendly', 'Date Night'],
  },
  {
    key: 'miso-cod',
    title: 'Miso-Butter Cod with Soba and Bok Choy',
    short: 'Miso-Butter Cod',
    desc: 'Flaky cod under a glossy, savoury miso-butter glaze, with soba noodles and tender baby bok choy.',
    category: 'Dinner',
    cuisine: 'Japanese',
    mealdb: 'Seafood',
    serves: 4,
    prepMinutes: 15,
    cookMinutes: 25,
    groups: [
      ['Miso Glaze', 'Sauce', [
        'white miso|3 tbsp',
        'unsalted butter|1/2 stick|softened',
        'mirin|2 tbsp',
        'sake|1 tbsp',
        'soy sauce|1 tsp',
      ]],
      ['Fish & Noodles', 'Main', [
        'cod fillet|4||6 oz each',
        'soba noodles|8 oz',
        'baby bok choy|4 head|halved',
        'ginger|1 tbsp|julienned',
        'green onion|2 stalk|sliced',
        'sesame seeds|1 tsp|toasted',
      ]],
    ],
    steps: [
      ['Glaze the Fish', 10, 'Beat the miso, butter, mirin, sake and soy sauce together and spread over the cod.'],
      ['Broil', 12, 'Broil 6 inches from the element until the glaze is browned in spots and the fish flakes.', true],
      ['Noodles & Greens', 10, 'Cook the soba, and steam the bok choy with the ginger.'],
      ['Serve', 3, 'Serve the cod over soba and bok choy, scattered with green onion and sesame.'],
    ],
    notes: 'Spread the glaze thickly; it protects the fish as it broils.',
    tags: [],
  },
];
