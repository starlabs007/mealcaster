// Cuisines and main ingredients for the sample generator. A dish template (templates.js) names the cuisines it
// suits and the mains it takes; the cuisine fills in its flavours, aromatics, sauce, herbs, vegetables and what the
// dish is served with.
//
// Lines are written 'name|amount|prep|note' (a leading ? = optional). The amount is a quantity and a unit
// ('1 1/4 lb', '2 clove', '4'), a range picked from at random ('2-3 clove'), or empty ("to taste" lines).
// Names are catalog names (ingredients.js); `prefer` swaps in a near-duplicate spelling.

/**
 * @typedef {{ word: string, lines: string[] }} Flavor  `word` goes into titles; `lines` are its signature ingredients
 * @typedef {{
 *   name: string,
 *   area: string,
 *   prefer?: Record<string, string>,
 *   flavors: Flavor[],
 *   aromatics: string[],
 *   sauce: string[],
 *   herbs: string[],
 *   veg: string[],
 *   starch: string[],
 *   pairings: string[],
 * }} Cuisine
 *   `area`: TheMealDB's area, for matching photos; `veg` / `herbs` are names (amounts in VEG / HERBS below).
 */

/** @type {Cuisine[]} */
export const CUISINES = [
  {
    name: 'Chinese',
    area: 'Chinese',
    prefer: { 'green onion': 'scallion' },
    flavors: [
      { word: 'Ginger-Scallion', lines: ['ginger|1 piece|julienned|2-inch', 'green onion|6 stalk|cut into 2-inch lengths'] },
      { word: 'Black Bean', lines: ['fermented black beans|1-2 tbsp|rinsed and roughly chopped'] },
      { word: 'Sichuan Peppercorn', lines: ['sichuan peppercorns|1-2 tsp|toasted and ground', 'red pepper flakes|1/2 tsp'] },
      { word: 'Garlic Chili', lines: ['chili crisp|2 tbsp||plus more to serve', 'garlic|6 clove|thinly sliced'] },
      { word: 'Five-Spice', lines: ['five-spice powder|1 tsp'] },
      { word: 'Hoisin-Glazed', lines: ['hoisin sauce|3 tbsp'] },
    ],
    aromatics: ['garlic|3-4 clove|minced', 'ginger|1 tbsp|minced', 'green onion|3 stalk|whites and greens separated'],
    sauce: ['light soy sauce|2 tbsp', 'shaoxing wine|1 tbsp', 'oyster sauce|1 tbsp', 'sugar|1 tsp', 'cornstarch|1 tsp', 'toasted sesame oil|1 tsp'],
    herbs: ['cilantro', 'green onion'],
    veg: ['bok choy', 'napa cabbage', 'broccoli', 'snow peas', 'shiitake mushroom', 'red bell pepper', 'green beans', 'eggplant'],
    starch: ['jasmine rice|1 1/2 cup|rinsed', 'egg noodles|12 oz||fresh'],
    pairings: ['**Pairing:** hot jasmine tea, or an off-dry Riesling.', '**Pairing:** a crisp lager, or chrysanthemum tea.'],
  },
  {
    name: 'Vietnamese',
    area: 'Vietnamese',
    flavors: [
      { word: 'Lemongrass', lines: ['lemongrass|2 stalk|tender core finely minced'] },
      { word: 'Caramel', lines: ['fish sauce|3 tbsp', 'sugar|3 tbsp||for the caramel'] },
      { word: 'Lime & Chili', lines: ['lime|2|juiced', 'red chili|1-2|thinly sliced'] },
      { word: 'Garlic-Pepper', lines: ['garlic|6 clove|minced', 'black pepper|1 tsp|coarsely cracked'] },
      { word: 'Ginger', lines: ['ginger|2 tbsp|julienned'] },
    ],
    aromatics: ['garlic|3 clove|minced', 'shallot|2|thinly sliced', 'lemongrass|1 stalk|tender core minced'],
    sauce: ['fish sauce|2 tbsp', 'lime|1|juiced', 'sugar|1 tbsp', 'garlic|1 clove|minced', 'red chili|1|thinly sliced'],
    herbs: ['mint', 'cilantro', 'thai basil', 'rau răm', 'perilla leaf'],
    veg: ['bean sprouts', 'cucumber', 'carrot', 'daikon', 'butter lettuce', 'baby bok choy', 'green beans'],
    starch: ['jasmine rice|1 1/2 cup|rinsed', 'rice vermicelli|8 oz'],
    pairings: ['**Pairing:** iced jasmine tea, or a cold Vietnamese-style lager.', 'Finish with **cà phê sữa đá** — strong drip coffee over condensed milk and ice.'],
  },
  {
    name: 'Thai',
    area: 'Thai',
    flavors: [
      { word: 'Basil-Chili', lines: ['thai basil|1 cup|leaves picked', 'thai chili|2-4|smashed'] },
      { word: 'Red Curry', lines: ['thai red curry paste|2 tbsp'] },
      { word: 'Tamarind', lines: ['tamarind paste|2 tbsp', 'palm sugar|1 tbsp|grated'] },
      { word: 'Lemongrass-Lime', lines: ['lemongrass|2 stalk|bruised and minced', 'kaffir lime leaf|4|very finely shredded'] },
      { word: 'Peanut', lines: ['peanut butter|1/4 cup||natural, unsweetened', 'roasted peanuts|1/3 cup|chopped'] },
    ],
    aromatics: ['garlic|4 clove|pounded', 'shallot|2|sliced', 'thai chili|2|sliced'],
    sauce: ['fish sauce|1 1/2 tbsp', 'oyster sauce|1 tbsp', 'palm sugar|2 tsp|grated', 'lime|1|juiced'],
    herbs: ['thai basil', 'cilantro', 'mint'],
    veg: ['green beans', 'red bell pepper', 'baby bok choy', 'japanese eggplant', 'snow peas', 'broccolini', 'bean sprouts'],
    starch: ['jasmine rice|1 1/2 cup|rinsed', 'rice noodles|8 oz||wide'],
    pairings: ['**Pairing:** an ice-cold Singha, or an aromatic Gewürztraminer.', '**Pairing:** Thai iced tea, extra sweet.'],
  },
  {
    name: 'Japanese',
    area: 'Japanese',
    flavors: [
      { word: 'Miso', lines: ['white miso|2 tbsp'] },
      { word: 'Ginger-Soy', lines: ['ginger|2 tbsp|grated', 'soy sauce|2 tbsp'] },
      { word: 'Sesame', lines: ['sesame seeds|2 tbsp|toasted', 'toasted sesame oil|2 tsp'] },
      { word: 'Furikake', lines: ['furikake|2 tbsp'] },
    ],
    aromatics: ['ginger|1 tbsp|grated', 'garlic|2 clove|grated', 'green onion|2 stalk|thinly sliced'],
    sauce: ['soy sauce|3 tbsp', 'mirin|2 tbsp', 'sake|1 tbsp', 'sugar|1 tsp'],
    herbs: ['green onion', 'perilla leaf'],
    veg: ['shiitake mushroom', 'baby spinach', 'sugar snap peas', 'daikon', 'japanese eggplant', 'cucumber', 'broccolini', 'napa cabbage'],
    starch: ['sushi rice|1 1/2 cup|rinsed until the water runs clear', 'udon noodles|2 package||frozen'],
    pairings: ['**Pairing:** chilled junmai sake, or hot genmaicha.', '**Pairing:** a dry Japanese rice lager.'],
  },
  {
    name: 'Korean',
    area: 'Korean',
    prefer: { 'green onion': 'scallion' },
    flavors: [
      { word: 'Gochujang', lines: ['gochujang|2 tbsp'] },
      { word: 'Kimchi', lines: ['kimchi|1 cup|chopped, plus its juice'] },
      { word: 'Sesame-Garlic', lines: ['garlic|5 clove|minced', 'sesame seeds|1 tbsp|toasted'] },
      { word: 'Spicy Gochugaru', lines: ['gochugaru|1-2 tbsp'] },
      { word: 'Soy & Pear', lines: ['pear|1|grated|Asian pear if you can find one', 'soy sauce|3 tbsp'] },
    ],
    aromatics: ['garlic|4 clove|minced', 'ginger|1 tsp|grated', 'green onion|3 stalk|chopped'],
    sauce: ['soy sauce|3 tbsp', 'brown sugar|1 tbsp', 'toasted sesame oil|1 tbsp', 'rice vinegar|1 tsp', 'sesame seeds|1 tsp'],
    herbs: ['green onion', 'perilla leaf'],
    veg: ['spinach', 'bean sprouts', 'carrot', 'zucchini', 'shiitake mushroom', 'cucumber', 'napa cabbage', 'daikon'],
    starch: ['sushi rice|1 1/2 cup|rinsed|short-grain'],
    pairings: ['**Pairing:** a chilled bottle of soju, or roasted barley tea.', '**Pairing:** a light, crisp lager.'],
  },
  {
    name: 'Indian',
    area: 'Indian',
    prefer: { cilantro: 'coriander leaves', 'red chili': 'red chilli' },
    flavors: [
      { word: 'Tikka', lines: ['garam masala|2 tsp', 'kashmiri chili powder|1 tsp', 'greek yogurt|1/2 cup'] },
      { word: 'Tandoori', lines: ['plain yogurt|3/4 cup', 'kashmiri chili powder|2 tsp', 'ground cumin|1 tsp'] },
      { word: 'Coconut & Curry Leaf', lines: ['coconut milk|1 can||13.5 oz', 'curry leaf|12-15'] },
      { word: 'Cumin-Turmeric', lines: ['cumin seeds|1 tsp', 'ground turmeric|1/2 tsp'] },
      { word: 'Garam Masala', lines: ['garam masala|1 tbsp'] },
    ],
    aromatics: ['onion|1|finely chopped|large', 'garlic|4 clove|grated', 'ginger|1 tbsp|grated', 'serrano chili|1|slit lengthwise'],
    sauce: ['crushed tomatoes|1 can||14 oz', 'ground coriander|1 tsp', 'garam masala|1 tsp'],
    herbs: ['cilantro', 'mint'],
    veg: ['cauliflower', 'spinach', 'potato', 'sweet potato', 'frozen peas', 'eggplant', 'green beans'],
    starch: ['basmati rice|1 1/2 cup|rinsed and soaked 20 minutes', 'naan|4'],
    pairings: ['**Pairing:** a salted mango lassi, or a hoppy IPA to stand up to the spice.', '**Pairing:** masala chai, after.'],
  },
  {
    name: 'Mexican',
    area: 'Mexican',
    prefer: { chickpeas: 'garbanzo beans' },
    flavors: [
      { word: 'Smoky Chipotle', lines: ['chipotle in adobo|2 piece|minced|plus 1 tbsp of the sauce'] },
      { word: 'Ancho', lines: ['ancho chili powder|1 tbsp'] },
      { word: 'Lime-Cilantro', lines: ['lime|2|zested and juiced', 'cilantro|1/2 cup|chopped'] },
      { word: 'Tomatillo', lines: ['tomatillo|1 lb|husked and rinsed'] },
      { word: 'Charred Poblano', lines: ['poblano pepper|2|charred, peeled and sliced'] },
    ],
    aromatics: ['onion|1|diced|medium', 'garlic|3 clove|minced', 'jalapeño|1|seeded and minced'],
    sauce: ['lime|1|juiced', 'ground cumin|1 tsp', 'dried oregano|1 tsp||Mexican if you have it'],
    herbs: ['cilantro'],
    veg: ['red bell pepper', 'corn on the cob', 'zucchini', 'red cabbage', 'radish', 'avocado'],
    starch: ['corn tortilla|12', 'jasmine rice|1 cup'],
    pairings: ['**Pairing:** a Mexican lager with a squeeze of lime, or a cucumber–mint agua fresca.', '**Pairing:** a mezcal paloma for the grown-ups.'],
  },
  {
    name: 'Italian',
    area: 'Italian',
    flavors: [
      { word: 'Lemon-Herb', lines: ['lemon|1|zested and juiced', 'flat-leaf parsley|1/4 cup|chopped'] },
      { word: 'Garlic-Rosemary', lines: ['garlic|4 clove|smashed', 'rosemary|2 sprig'] },
      { word: 'Tomato-Basil', lines: ['cherry tomato|2 cup|halved', 'basil|1 handful|torn'] },
      { word: 'Sun-Dried Tomato', lines: ['sun-dried tomatoes|1/3 cup|chopped|oil-packed'] },
      { word: 'Brown Butter & Sage', lines: ['unsalted butter|4 tbsp', 'sage|12 leaf'] },
    ],
    aromatics: ['garlic|3 clove|thinly sliced', 'shallot|1|minced', 'red pepper flakes|1/4 tsp'],
    sauce: ['dry white wine|1/2 cup', 'lemon|1|juiced', 'unsalted butter|2 tbsp|cold'],
    herbs: ['basil', 'flat-leaf parsley', 'rosemary', 'thyme'],
    veg: ['broccolini', 'zucchini', 'cherry tomato', 'fennel bulb', 'kale', 'spinach', 'asparagus', 'cremini mushroom'],
    starch: ['ciabatta|1 piece||a crusty loaf', 'polenta|1 cup'],
    pairings: ['**Pairing:** a Chianti Classico, or a chilled Pinot Grigio.', '**Pairing:** sparkling water with a twist of lemon, and an espresso after.'],
  },
  {
    name: 'Mediterranean',
    area: 'Greek',
    prefer: { 'greek yogurt': 'greek yoghurt' },
    flavors: [
      { word: 'Za’atar', lines: ['za’atar|2 tbsp'] },
      { word: 'Lemon-Oregano', lines: ['lemon|2|zested and juiced', 'dried oregano|2 tsp'] },
      { word: 'Smoked Paprika', lines: ['smoked paprika|2 tsp'] },
      { word: 'Sumac & Onion', lines: ['sumac|1 tbsp', 'red onion|1|thinly sliced'] },
      { word: 'Tahini', lines: ['tahini|1/3 cup', 'lemon|1|juiced'] },
    ],
    aromatics: ['garlic|3 clove|grated', 'red onion|1|cut into wedges'],
    sauce: ['extra virgin olive oil|3 tbsp', 'lemon|1|juiced', 'dried oregano|1 tsp'],
    herbs: ['flat-leaf parsley', 'mint', 'dill'],
    veg: ['cucumber', 'cherry tomato', 'red bell pepper', 'zucchini', 'eggplant', 'arugula', 'cauliflower'],
    starch: ['pita bread|4', 'couscous|1 cup', 'farro|1 cup'],
    pairings: ['**Pairing:** a crisp Assyrtiko, or fresh mint lemonade.', '**Pairing:** a cold glass of rosé.'],
  },
  {
    name: 'American',
    area: 'American',
    flavors: [
      { word: 'Smoky BBQ', lines: ['smoked paprika|2 tsp', 'brown sugar|2 tbsp'] },
      { word: 'Honey-Mustard', lines: ['honey|3 tbsp', 'dijon mustard|2 tbsp'] },
      { word: 'Maple-Dijon', lines: ['maple syrup|3 tbsp', 'whole-grain mustard|2 tbsp'] },
      { word: 'Garlic-Herb', lines: ['garlic|5 clove|minced', 'thyme|6 sprig'] },
      { word: 'Buttermilk-Herb', lines: ['buttermilk|1 cup', 'dill|2 tbsp|chopped'] },
    ],
    aromatics: ['onion|1|diced', 'garlic|3 clove|minced'],
    sauce: ['apple cider vinegar|2 tbsp', 'dijon mustard|1 tbsp', 'honey|1 tbsp'],
    herbs: ['chives', 'flat-leaf parsley', 'thyme'],
    veg: ['broccoli', 'sweet potato', 'green beans', 'corn on the cob', 'kale', 'carrot', 'yukon gold potato'],
    starch: ['yukon gold potato|1 1/2 lb|halved', 'brioche bun|4', 'sourdough bread|4 slice'],
    pairings: ['**Pairing:** a jammy Zinfandel, or iced tea with plenty of lemon.', '**Pairing:** a cold pale ale.'],
  },
];

export const cuisineByName = new Map(CUISINES.map((c) => [c.name, c]));

/** How much of each vegetable a dish takes. */
export const VEG = {
  'bok choy': 'bok choy|1 lb|halved lengthwise',
  'baby bok choy': 'baby bok choy|4 head|halved',
  'napa cabbage': 'napa cabbage|1/2 head|cut into 2-inch pieces',
  broccoli: 'broccoli|1 head|cut into florets',
  broccolini: 'broccolini|1 bunch|trimmed',
  'snow peas': 'snow peas|6 oz|strings removed',
  'sugar snap peas': 'sugar snap peas|8 oz|trimmed',
  'shiitake mushroom': 'shiitake mushroom|6 oz|stemmed and sliced',
  'cremini mushroom': 'cremini mushroom|8 oz|quartered',
  'red bell pepper': 'red bell pepper|1|sliced',
  'green beans': 'green beans|8 oz|trimmed',
  eggplant: 'eggplant|1|cut into 1-inch cubes|medium',
  'japanese eggplant': 'japanese eggplant|2|cut on the bias',
  'bean sprouts': 'bean sprouts|2 cup',
  cucumber: 'cucumber|1|cut into matchsticks',
  carrot: 'carrot|2|julienned',
  daikon: 'daikon|1 piece|julienned|4-inch',
  'butter lettuce': 'butter lettuce|1 head|leaves separated',
  spinach: 'spinach|1 bunch|washed well',
  'baby spinach': 'baby spinach|5 oz',
  zucchini: 'zucchini|2|halved and sliced|medium',
  'corn on the cob': 'corn on the cob|2|kernels cut off',
  'red cabbage': 'red cabbage|2 cup|finely shredded',
  radish: 'radish|6|thinly sliced',
  avocado: 'avocado|2|sliced|ripe',
  'cherry tomato': 'cherry tomato|1 1/2 cup|halved',
  'fennel bulb': 'fennel bulb|1|thinly sliced',
  kale: 'kale|1 bunch|stemmed and torn|lacinato',
  asparagus: 'asparagus|1 bunch|woody ends snapped',
  arugula: 'arugula|4 oz',
  cauliflower: 'cauliflower|1 head|cut into florets|small',
  potato: 'potato|2|cut into 1-inch cubes|medium',
  'sweet potato': 'sweet potato|2|cut into 1-inch cubes',
  'yukon gold potato': 'yukon gold potato|1 lb|halved',
  'frozen peas': 'frozen peas|1 cup',
};

/** How much of each herb goes on as a garnish. */
export const HERBS = {
  cilantro: 'cilantro|1/2 cup|leaves and tender stems',
  'green onion': 'green onion|2 stalk|thinly sliced',
  mint: 'mint|1/4 cup|leaves torn',
  'thai basil': 'thai basil|1/2 cup|leaves picked',
  'rau răm': 'rau răm|1 handful|leaves picked',
  'perilla leaf': 'perilla leaf|6 leaf|cut into ribbons',
  basil: 'basil|1 handful|torn',
  'flat-leaf parsley': 'flat-leaf parsley|1/4 cup|chopped',
  rosemary: 'rosemary|2 sprig|leaves chopped',
  thyme: 'thyme|4 sprig',
  dill: 'dill|2 tbsp|chopped',
  chives: 'chives|2 tbsp|snipped',
};

/**
 * @typedef {{ word: string, noun: string, kind: 'meat' | 'fish' | 'veg', mealdb: string, cuts: Record<string, string[]> }} Main
 *   `cuts`: the main's line for each cooking style a template asks for; a main without the style can't be used.
 *   `mealdb`: TheMealDB category its photos come from.
 */

/** @type {Record<string, Main>} */
export const MAINS = {
  chicken: {
    word: 'Chicken', noun: 'chicken', kind: 'meat', mealdb: 'Chicken',
    cuts: {
      stirfry: ['chicken thigh|1 1/4 lb|thinly sliced|boneless, skinless'],
      grill: ['chicken thigh|1 1/2-2 lb|cut into 1 1/2-inch pieces|boneless, skinless'],
      braise: ['bone-in chicken thigh|2-3 lb|patted dry|skin-on'],
      roast: ['bone-in chicken thigh|2 lb|patted dry|skin-on', 'chicken drumstick|8|patted dry'],
      ground: ['ground chicken|1 lb'],
      soup: ['chicken breast|1 lb||boneless, skinless'],
      curry: ['chicken thigh|1 1/2 lb|cut into bite-size pieces|boneless, skinless'],
      cutlet: ['chicken breast|2|halved horizontally|boneless, skinless'],
    },
  },
  beef: {
    word: 'Beef', noun: 'beef', kind: 'meat', mealdb: 'Beef',
    cuts: {
      stirfry: ['flank steak|1 lb|sliced thinly across the grain'],
      grill: ['sirloin steak|1 1/2 lb|patted dry'],
      braise: ['beef chuck|2 1/2-3 lb|cut into 2-inch pieces', 'beef short ribs|3-4 lb||bone-in'],
      ground: ['ground beef|1 lb||85% lean'],
      soup: ['beef eye round|8 oz|sliced paper-thin|partly frozen so it slices cleanly'],
      curry: ['beef chuck|2 lb|cut into 1-inch pieces'],
    },
  },
  pork: {
    word: 'Pork', noun: 'pork', kind: 'meat', mealdb: 'Pork',
    cuts: {
      stirfry: ['pork tenderloin|1|thinly sliced'],
      grill: ['pork shoulder|1 1/2 lb|sliced 1/4 inch thick|boneless'],
      braise: ['pork shoulder|2 1/2 lb|cut into 2-inch pieces|boneless', 'pork belly|2 lb|cut into 1 1/2-inch pieces|skin-on'],
      roast: ['pork tenderloin|2|silver skin trimmed'],
      ground: ['ground pork|1 lb'],
      soup: ['pork belly|1 lb|thinly sliced'],
      cutlet: ['pork chop|4|pounded 1/2 inch thick|boneless'],
    },
  },
  lamb: {
    word: 'Lamb', noun: 'lamb', kind: 'meat', mealdb: 'Lamb',
    cuts: {
      grill: ['lamb shoulder|1 1/2 lb|cut into 1-inch cubes|boneless'],
      braise: ['lamb shoulder|2 1/2 lb|cut into 2-inch pieces|boneless'],
      ground: ['ground lamb|1 lb'],
      roast: ['lamb chop|8|patted dry'],
      curry: ['lamb shoulder|2 lb|cut into 1-inch pieces|boneless'],
    },
  },
  shrimp: {
    word: 'Shrimp', noun: 'shrimp', kind: 'fish', mealdb: 'Seafood',
    cuts: {
      stirfry: ['shrimp|1 lb|peeled and deveined|large'],
      grill: ['shrimp|1 1/4 lb|peeled and deveined, tails on|jumbo'],
      soup: ['shrimp|12 oz|peeled and deveined'],
      curry: ['shrimp|1 lb|peeled and deveined|large'],
    },
  },
  salmon: {
    word: 'Salmon', noun: 'salmon', kind: 'fish', mealdb: 'Seafood',
    cuts: {
      roast: ['salmon fillet|4||6 oz each, skin-on'],
      grill: ['salmon fillet|4|skin removed, cut into cubes|6 oz each'],
    },
  },
  cod: {
    word: 'Cod', noun: 'cod', kind: 'fish', mealdb: 'Seafood',
    cuts: {
      roast: ['cod fillet|1 1/2 lb||skinless, about 1 inch thick'],
      grill: ['cod fillet|1 lb|cut into finger-length strips'],
      soup: ['cod fillet|1 lb|cut into 2-inch chunks'],
      braise: ['cod fillet|1 1/2 lb|cut into 2-inch pieces|or catfish steaks'],
      curry: ['cod fillet|1 1/4 lb|cut into 2-inch chunks'],
    },
  },
  tofu: {
    word: 'Tofu', noun: 'tofu', kind: 'veg', mealdb: 'Vegetarian',
    cuts: {
      stirfry: ['firm tofu|14 oz|pressed and cut into cubes'],
      grill: ['firm tofu|14 oz|pressed and cut into slabs'],
      braise: ['firm tofu|14 oz|cut into 1-inch cubes'],
      soup: ['silken tofu|14 oz|cut into cubes'],
      curry: ['firm tofu|14 oz|pressed and cubed'],
      ground: ['firm tofu|14 oz|pressed and crumbled'],
      roast: ['firm tofu|14 oz|pressed and cubed'],
    },
  },
  mushroom: {
    word: 'Mushroom', noun: 'mushrooms', kind: 'veg', mealdb: 'Vegetarian',
    cuts: {
      stirfry: ['oyster mushroom|8 oz|torn into strips'],
      grill: ['cremini mushroom|1 lb|halved'],
      roast: ['cremini mushroom|1 1/2 lb|halved'],
      soup: ['shiitake mushroom|8 oz|stemmed and sliced'],
      ground: ['cremini mushroom|1 lb|finely chopped'],
      braise: ['shiitake mushroom|10 oz|stems removed'],
    },
  },
  chickpea: {
    word: 'Chickpea', noun: 'chickpeas', kind: 'veg', mealdb: 'Vegan',
    cuts: {
      roast: ['chickpeas|2 can|drained and patted dry|15 oz'],
      braise: ['chickpeas|2 can|drained|15 oz'],
      curry: ['chickpeas|2 can|drained|15 oz'],
      soup: ['chickpeas|1 can|drained|15 oz'],
    },
  },
  paneer: {
    word: 'Paneer', noun: 'paneer', kind: 'veg', mealdb: 'Vegetarian',
    cuts: {
      curry: ['paneer|14 oz|cut into cubes'],
      grill: ['paneer|14 oz|cut into 1-inch cubes'],
    },
  },
  cauliflower: {
    word: 'Cauliflower', noun: 'cauliflower', kind: 'veg', mealdb: 'Vegan',
    cuts: {
      roast: ['cauliflower|1 head|cut into florets|large'],
      curry: ['cauliflower|1 head|cut into small florets'],
      grill: ['cauliflower|1 head|cut into thick steaks|large'],
    },
  },
};
