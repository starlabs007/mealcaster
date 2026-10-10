// Sample recipe pool mirroring the Google Sheets [Recipes] tab. The live list
// (samples + the user's custom recipes) is in ../recipes.svelte.js.

/**
 * @typedef {import('../ingredients.js').RecipeLine} Ingredient a recipe line; the ingredient it points at is in the ingredients store
 * @typedef {{ title: string, category: string, items: Ingredient[] }} IngredientGroup
 * @typedef {{ title: string, minutes: number, text: string, critical?: boolean }} Step
 * @typedef {{
 *   id: string,
 *   title: string,
 *   shortTitle: string,
 *   description: string,
 *   image?: string,
 *   hero?: string,
 *   prepMinutes: number,
 *   cookMinutes: number,
 *   minutes: number,
 *   serves: number,
 *   badge: { label: string }, // category; '' = none
 *   addedAt: string,
 *   tags: string[],
 *   notes: string,
 *   ingredients: IngredientGroup[],
 *   steps: Step[],
 *   custom?: boolean,
 *   edited?: boolean,
 * }} Recipe
 */

/** @type {Omit<Recipe, 'minutes'>[]} */
const pool = [
  {
    id: 'salmon-risotto',
    title: 'Pan-Seared Crispy Salmon with Meyer Lemon Herb Risotto & Grilled Asparagus',
    shortTitle: 'Pan-Seared Crispy Salmon',
    description:
      'A restaurant-caliber weeknight centerpiece featuring golden, crackling wild salmon resting on a creamy arborio risotto brightened with fresh Meyer lemon zest and finished with blistered spring asparagus.',
    prepMinutes: 15,
    cookMinutes: 25,
    serves: 2,
    badge: { label: 'Dinner' },
    addedAt: '2026-03-02',
    tags: ['Gluten-Free', 'Date Night', 'Seafood', 'Spring'],
    notes:
      '### Crispy skin, every time\n\nPat the salmon skin **bone-dry** with clean paper towels 15 minutes before cooking. Surface moisture turns to steam and prevents that glass-like crackle.\n\n- Keep the broth at an *active bare simmer* on the adjacent burner.\n- Press each fillet down for the first 10 seconds so the skin stays flat.\n\n**Pairing:** A chilled Sancerre or dry Oregon Pinot Gris echoes the Meyer lemon without overpowering the salmon.',
    ingredients: [
      {
        title: 'The Crispy Wild Salmon',
        category: 'Protein',
        items: [
          { id: 'salmon-fillet', qty: 2, note: 'wild, 6 oz each, skin-on', prep: 'scaled' },
          { id: 'avocado-oil', qty: 1, unit: 'tbsp', note: 'or clarified butter' },
          { id: 'flaky-sea-salt', note: 'Maldon' },
          { id: 'black-pepper', prep: 'freshly cracked' },
          { id: 'kitchen-twine', note: 'or bamboo skewers', prep: 'for trussing & turning' },
        ],
      },
      {
        title: 'Meyer Lemon Risotto Base',
        category: 'Grains & Dairy',
        items: [
          { id: 'arborio-rice', qty: 1, unit: 'cup', note: 'or carnaroli' },
          { id: 'vegetable-broth', qty: 3.5, unit: 'cup', note: 'or light chicken broth' },
          { id: 'shallot', qty: 1, note: 'French', prep: 'finely minced' },
          { id: 'garlic', qty: 2, unit: 'clove', prep: 'microplaned' },
          { id: 'white-wine', qty: 0.5, unit: 'cup', note: 'dry, e.g. Pinot Grigio or Sauvignon Blanc' },
          { id: 'lemon', qty: 1, note: 'Meyer', prep: 'zested and juiced' },
          { id: 'parmigiano-reggiano', qty: 1 / 3, unit: 'cup', note: '24-month aged', prep: 'freshly grated' },
          { id: 'unsalted-butter', qty: 2, unit: 'tbsp', note: 'European', prep: 'cubed and chilled' },
          { id: 'dill', qty: 1, unit: 'tbsp', prep: 'hand-torn' },
          { id: 'parsley', qty: 1, unit: 'tbsp', note: 'flat-leaf', prep: 'hand-torn' },
        ],
      },
      {
        title: 'Charred Garden Asparagus',
        category: 'Garden Greens',
        items: [
          { id: 'asparagus', qty: 1, unit: 'bunch', note: 'slender', prep: 'woody ends snapped' },
          { id: 'olive-oil', qty: 1, unit: 'tbsp', note: 'extra virgin' },
          { id: 'lemon', qty: 1, prep: 'halved and grilled' },
        ],
      },
    ],
    steps: [
      {
        title: 'Simmer Broth & Skin Prep',
        minutes: 5,
        text: 'Bring the **broth** to a gentle simmer in a small saucepan and keep warm over low heat.\n\n- Pat salmon fillets *completely dry*.\n- Score the skin lightly in **three diagonal cuts** to prevent curling in the hot pan.',
      },
      {
        title: 'Build Risotto Base & Toast Rice (Tostatura)',
        minutes: 6,
        text: 'Melt 1 tbsp butter with 1 tbsp olive oil in a wide sauté pan over medium-low heat.\n\n1. Sweat the shallot and garlic for 3 minutes until translucent.\n2. Add the rice and toast, stirring constantly, for 2 minutes until the kernel edges turn *pearl-like*.',
      },
      {
        title: 'Simmer & Continuous Hydration',
        minutes: 18,
        text: 'Deglaze with white wine and let it reduce until absorbed. Ladle in hot broth one ladle at a time, stirring gently in figure-eights, letting each addition absorb before the next. Continue until the rice is al dente with a silky wave.',
      },
      {
        title: 'The Salmon Crisp & Asparagus Char',
        minutes: 7,
        critical: true,
        text: 'Heat a heavy skillet over high until lightly smoking and add avocado oil.\n\n1. Season the salmon and lay it **skin-side down**, pressing gently with a fish spatula for 30 seconds.\n2. Cook undisturbed for **5 minutes**, then flip for 90 seconds.\n3. Blister the asparagus in the same pan alongside the fish.\n\n> Don\'t move the fillets while the skin crisps. They release on their own.',
      },
      {
        title: 'The Mantecatura, Plating & Garnish',
        minutes: 4,
        text: 'Pull the risotto off the heat and vigorously whip in cold butter, Parmigiano, lemon zest and juice until glossy (all’onda). Spoon into warm bowls, crown with salmon and asparagus, and finish with dill and flaky salt.',
      },
    ],
  },
  {
    id: 'poblano-enchiladas',
    title: 'Charred Poblano & Black Bean Enchiladas Suizas with Cilantro Crema',
    shortTitle: 'Poblano Enchiladas',
    description:
      'Rolled corn tortillas with black beans, fire-roasted poblanos, and tangy tomatillo salsa verde, finished with lime cilantro crema.',
    prepMinutes: 20,
    cookMinutes: 30,
    serves: 4,
    badge: { label: 'Dinner' },
    addedAt: '2025-11-18',
    tags: ['Vegetarian'],
    notes:
      'Flash the tortillas in a hot dry skillet for 10 seconds per side before rolling — they turn pliable and won’t crack or go soggy under the salsa verde.\n\n**Pairing:** A crisp Mexican lager with lime, or an agua fresca of cucumber and mint.',
    ingredients: [
      {
        title: 'Salsa Verde Suiza',
        category: 'Sauce',
        items: [
          { id: 'tomatillo', qty: 1, unit: 'lb', prep: 'husked and rinsed' },
          { id: 'jalapeno', qty: 1, prep: 'stemmed' },
          { id: 'mexican-crema', qty: 0.5, unit: 'cup' },
        ],
      },
      {
        title: 'The Filling',
        category: 'Produce & Pantry',
        items: [
          { id: 'poblano-pepper', qty: 3 },
          { id: 'black-beans', qty: 1, unit: 'can', prep: 'drained' },
          { id: 'corn-kernels', qty: 1, unit: 'cup', note: 'sweet' },
          { id: 'ground-cumin', qty: 1, unit: 'tsp' },
        ],
      },
      {
        title: 'Assembly & Finish',
        category: 'Dairy & Garnish',
        items: [
          { id: 'corn-tortilla', qty: 12 },
          { id: 'monterey-jack', qty: 2, unit: 'cup', prep: 'shredded' },
          { id: 'cilantro', qty: 1, unit: 'bunch' },
          { id: 'lime', qty: 1, prep: 'cut into wedges' },
          { id: 'aluminum-foil', qty: 1, unit: 'roll', prep: 'to cover the baking dish' },
        ],
      },
    ],
    steps: [
      {
        title: 'Char the Poblanos',
        minutes: 10,
        text: 'Blacken the poblanos directly over a gas flame or under the broiler, turning often. Steam in a covered bowl for 5 minutes, then peel, seed and slice into strips.',
      },
      {
        title: 'Blend the Salsa Verde',
        minutes: 8,
        text: 'Broil the tomatillos and jalapeño until blistered. Blend with a handful of cilantro, a pinch of salt and the crema until smooth.',
      },
      {
        title: 'Fill & Roll',
        minutes: 10,
        critical: true,
        text: 'Warm the tortillas in a dry skillet. Fill each with poblano strips, beans, corn, cumin and a little cheese, roll tightly and lay seam-side down in a baking dish.',
      },
      {
        title: 'Bake & Garnish',
        minutes: 22,
        text: 'Pour the salsa verde over the enchiladas, scatter with the remaining cheese and bake at 400°F until bubbling. Finish with cilantro and lime wedges.',
      },
    ],
  },
  {
    id: 'tuscan-ragu',
    title: 'Tuscan Sausage & White Bean Ragù with Rigatoni & Shaved Pecorino',
    shortTitle: 'Tuscan Sausage Ragù',
    description:
      'A rustic, slow-simmered ragù of fennel sausage, creamy cannellini beans and San Marzano tomatoes clinging to ridged rigatoni under a snowfall of pecorino.',
    prepMinutes: 15,
    cookMinutes: 45,
    serves: 4,
    badge: { label: 'Dinner' },
    addedAt: '2025-10-04',
    tags: ['Poultry & Meat', 'Comfort Food', 'Make-Ahead', 'Italian'],
    notes:
      '### Silky sauce, no cream\n\nReserve **a full mug of starchy pasta water** before draining. Toss the rigatoni with the ragù and a splash of that water over high heat for one minute; it emulsifies the sauce so it coats every ridge.\n\n1. Drain the pasta *2 minutes early*.\n2. Finish it in the pan with the ragù and pasta water.\n3. Off the heat, stir in the pecorino.\n\n**Pairing:** A Chianti Classico or Rosso di Montalcino. Bright acidity cuts through the sausage.',
    ingredients: [
      {
        title: 'The Ragù',
        category: 'Protein',
        items: [
          { id: 'italian-sausage', qty: 1, unit: 'lb', note: 'sweet, with fennel', prep: 'casings removed' },
          { id: 'onion', qty: 1, note: 'yellow', prep: 'finely diced' },
          { id: 'garlic', qty: 3, unit: 'clove', prep: 'sliced' },
          { id: 'san-marzano-tomatoes', qty: 1, unit: 'can', note: '28 oz' },
          { id: 'cannellini-beans', qty: 1, unit: 'can', prep: 'drained' },
          { id: 'red-pepper-flakes', qty: 0.5, unit: 'tsp' },
        ],
      },
      {
        title: 'Pasta & Finish',
        category: 'Grains & Dairy',
        items: [
          { id: 'rigatoni', qty: 1, unit: 'lb' },
          { id: 'pecorino-romano', qty: 1, unit: 'cup', prep: 'shaved' },
          { id: 'basil', qty: 1, unit: 'bunch' },
        ],
      },
    ],
    steps: [
      {
        title: 'Brown the Sausage',
        minutes: 8,
        text: 'In a heavy Dutch oven, brown the sausage over medium-high heat, breaking it into rustic crumbles.\n\n> Leave the **fond** on the bottom of the pot. It becomes the flavor base of the sauce.',
      },
      {
        title: 'Build the Soffritto',
        minutes: 7,
        text: 'Add the onion, garlic and pepper flakes and cook until soft and golden, scraping up the browned bits.',
      },
      {
        title: 'Slow Simmer',
        minutes: 30,
        critical: true,
        text: 'Crush in the tomatoes **by hand**, add the beans and simmer uncovered on low for 30 minutes.\n\n- Stir occasionally.\n- It\'s ready when the ragù is *thick and glossy*.',
      },
      {
        title: 'Marry Pasta & Sauce',
        minutes: 12,
        text: 'Cook the rigatoni **2 minutes shy of al dente**.\n\n1. Toss into the ragù with a splash of pasta water over high heat.\n2. Finish with pecorino and torn basil.',
      },
    ],
  },
  {
    id: 'sourdough-pizza',
    title: 'Artisanal Neapolitan Sourdough Pizza Night with Hot Honey & Fresh Burrata',
    shortTitle: 'Sourdough Pizza Night',
    description:
      'Blistered, chewy sourdough crusts topped with bright crushed tomato, torn burrata, basil and a drizzle of chili-spiked hot honey.',
    prepMinutes: 15,
    cookMinutes: 25,
    serves: 4,
    badge: { label: '' },
    addedAt: '2025-09-12',
    tags: ['Vegetarian'],
    notes:
      'A full hour of preheating matters more than the recipe.\n\n> The stone must be saturated with heat so the base puffs and chars in **under 7 minutes**.\n\n- Oven at its highest setting, stone on the top-middle rack.\n- Add the *hot honey* and *burrata* only after baking.\n\n**Pairing:** A lightly chilled Lambrusco, or sparkling blood-orange soda for the kids.',
    ingredients: [
      {
        title: 'Dough & Sauce',
        category: 'Bakery & Pantry',
        items: [
          { id: 'pizza-dough', qty: 2, unit: 'ball', note: 'ready-made or home proofed' },
          { id: 'san-marzano-tomatoes', qty: 1, unit: 'can', note: 'crushed' },
          { id: 'semolina', qty: 2, unit: 'tbsp', prep: 'for dusting' },
        ],
      },
      {
        title: 'Toppings',
        category: 'Dairy & Herbs',
        items: [
          { id: 'burrata', qty: 2, unit: 'ball' },
          { id: 'basil', qty: 1, unit: 'bunch' },
          { id: 'hot-honey', qty: 3, unit: 'tbsp' },
          { id: 'parchment-paper', qty: 1, unit: 'roll', prep: 'for sliding the pizza onto the stone' },
        ],
      },
    ],
    steps: [
      {
        title: 'Heat the Stone',
        minutes: 5,
        critical: true,
        text: 'Place the pizza stone on the top rack and preheat the oven to its highest setting (500°F or more) for a full hour.',
      },
      {
        title: 'Stretch the Dough',
        minutes: 10,
        text: 'On a semolina-dusted counter, press the dough from the center outward, leaving a puffy rim. Stretch over your knuckles to 11 inches.',
      },
      {
        title: 'Top & Bake',
        minutes: 14,
        text: 'Spread a thin layer of crushed tomato, slide onto the stone and bake 6–7 minutes per pizza until the crust is blistered.',
      },
      {
        title: 'Finish with Burrata',
        minutes: 3,
        text: 'Tear burrata over the hot pizzas, scatter basil and drizzle with hot honey right before slicing.',
      },
    ],
  },
  {
    id: 'miso-eggplant',
    title: 'Miso-Glazed Eggplant with Sesame Jasmine Rice & Quick Pickles',
    shortTitle: 'Miso-Glazed Eggplant',
    description:
      'Silky broiled eggplant lacquered in a sweet-savory white miso glaze over sesame jasmine rice with crunchy quick-pickled cucumbers.',
    prepMinutes: 15,
    cookMinutes: 20,
    serves: 2,
    badge: { label: 'Dinner' },
    addedAt: '2026-06-20',
    tags: ['Vegetarian'],
    notes:
      'Score the eggplant flesh in a **deep crosshatch** so the miso glaze seeps in and caramelizes in every groove.\n\n- Cut about 1 cm deep, but don\'t pierce the skin.\n- Brush the glaze on *twice*: once before broiling, once at the end.\n\n**Pairing:** A cold junmai sake or roasted barley tea.',
    ingredients: [
      {
        title: 'Glazed Eggplant',
        category: 'Produce',
        items: [
          { id: 'japanese-eggplant', qty: 2, prep: 'halved lengthwise' },
          { id: 'white-miso', qty: 3, unit: 'tbsp' },
          { id: 'mirin', qty: 1, unit: 'tbsp' },
          { id: 'toasted-sesame-oil', qty: 1, unit: 'tsp' },
        ],
      },
      {
        title: 'Rice & Pickles',
        category: 'Grains & Produce',
        items: [
          { id: 'jasmine-rice', qty: 1, unit: 'cup' },
          { id: 'cucumber', qty: 2, note: 'Persian', prep: 'thinly sliced' },
          { id: 'rice-vinegar', qty: 0.25, unit: 'cup' },
          { id: 'green-onion', qty: 2, prep: 'sliced' },
        ],
      },
    ],
    steps: [
      {
        title: 'Quick Pickle',
        minutes: 5,
        text: 'Toss the cucumbers with rice vinegar, a pinch of sugar and salt. Set aside to pickle while you cook.',
      },
      {
        title: 'Steam the Rice',
        minutes: 15,
        text: 'Rinse the rice until the water runs clear, then cook with 1¼ cups water. Rest covered for 5 minutes.',
      },
      {
        title: 'Broil & Glaze',
        minutes: 15,
        critical: true,
        text: 'Score and oil the eggplant, broil cut-side up for 8 minutes, then brush thickly with miso, mirin and sesame oil and broil 4 more minutes until bubbling.',
      },
    ],
  },
  {
    id: 'lentil-dal',
    title: 'Coconut Red Lentil Dal with Blistered Garlic Naan',
    shortTitle: 'Coconut Red Lentil Dal',
    description:
      'A golden, velvety one-pot dal simmered with coconut milk and ginger, finished with a sizzling cumin-seed tadka and warm garlic naan.',
    prepMinutes: 5,
    cookMinutes: 20,
    serves: 4,
    badge: { label: 'Dinner' },
    addedAt: '2025-12-01',
    tags: ['Quick (<30m)', 'Vegetarian', 'Vegan', 'Spicy', 'Weeknight'],
    notes:
      '### The tadka is everything\n\nAdd the tadka at the **very last second**. The hiss of hot spiced ghee hitting the dal is where the aroma comes from.\n\n- Heat the ghee until the cumin seeds *dance*, then add garlic and chilli.\n- Pour straight over the dal and cover for 30 seconds.\n- Leftovers thicken overnight; loosen with a splash of water.\n\n**Pairing:** A salted mango lassi or an off-dry Riesling.',
    ingredients: [
      {
        title: 'The Dal',
        category: 'Pantry',
        items: [
          { id: 'red-lentils', qty: 1, unit: 'cup', prep: 'rinsed' },
          { id: 'coconut-milk', qty: 1, unit: 'can', note: 'full-fat' },
          { id: 'ginger', qty: 1, unit: 'piece', note: '1 inch', prep: 'grated' },
          { id: 'ground-turmeric', qty: 1, unit: 'tsp' },
        ],
      },
      {
        title: 'Tadka & Sides',
        category: 'Aromatics & Bakery',
        items: [
          { id: 'ghee', qty: 2, unit: 'tbsp' },
          { id: 'cumin-seeds', qty: 1, unit: 'tsp' },
          { id: 'naan', qty: 4, note: 'garlic' },
          { id: 'cilantro', qty: 1, unit: 'bunch' },
        ],
      },
    ],
    steps: [
      {
        title: 'Simmer the Lentils',
        minutes: 15,
        text: 'Combine lentils, coconut milk, ginger, turmeric and 2 cups water. Simmer, stirring often, until the lentils collapse into a creamy dal.',
      },
      {
        title: 'Warm the Naan',
        minutes: 4,
        text: 'Blister the naan in a hot dry skillet or directly over a gas flame until spotted and puffed.',
      },
      {
        title: 'Sizzle the Tadka',
        minutes: 2,
        critical: true,
        text: 'Heat ghee until shimmering, add cumin seeds and let them crackle for 20 seconds. Pour over the dal and finish with cilantro.',
      },
    ],
  },
  {
    id: 'lemon-herb-salmon',
    title: 'Lemon Herb Pan-Roasted Salmon',
    shortTitle: 'Lemon Herb Salmon',
    description:
      'Crisp golden-crusted fillet with tenderstem asparagus, caper-dill emulsion, and sea-salt roasted baby red potatoes.',
    prepMinutes: 10,
    cookMinutes: 15,
    serves: 2,
    badge: { label: 'Dinner' },
    addedAt: '2026-01-15',
    tags: ['Quick (<30m)', 'Gluten-Free'],
    notes:
      'Start the salmon in a cold oiled pan skin-side down and bring it up to heat together — the fat renders slowly and the skin shatters.\n\n**Pairing:** An Albariño or Vinho Verde for briny, citrus-friendly lift.',
    ingredients: [
      {
        title: 'Salmon',
        category: 'Protein',
        items: [
          { id: 'salmon-fillet', qty: 2, note: '6 oz each, skin-on' },
          { id: 'lemon', qty: 1, prep: 'zested and juiced' },
        ],
      },
      {
        title: 'Potatoes & Greens',
        category: 'Produce',
        items: [
          { id: 'potato', qty: 0.75, unit: 'lb', note: 'baby red', prep: 'halved' },
          { id: 'asparagus', qty: 1, unit: 'bunch', note: 'tenderstem, or broccolini' },
          { id: 'olive-oil', qty: 2, unit: 'tbsp' },
        ],
      },
      {
        title: 'Caper-Dill Emulsion',
        category: 'Sauce',
        items: [
          { id: 'capers', qty: 2, unit: 'tbsp', prep: 'rinsed' },
          { id: 'dill', qty: 2, unit: 'tbsp', prep: 'chopped' },
          { id: 'unsalted-butter', qty: 3, unit: 'tbsp' },
        ],
      },
    ],
    steps: [
      {
        title: 'Roast the Potatoes',
        minutes: 15,
        text: 'Toss the potatoes with olive oil and sea salt and roast at 425°F until golden and crisp at the edges.',
      },
      {
        title: 'Pan-Roast the Salmon',
        minutes: 8,
        critical: true,
        text: 'Lay the salmon skin-side down in a cold oiled pan, bring to medium-high and cook 6 minutes without moving. Flip for 1 minute, adding the asparagus alongside.',
      },
      {
        title: 'Caper-Dill Butter',
        minutes: 2,
        text: 'Off the heat, swirl butter, capers, dill and lemon juice into the pan juices until emulsified. Spoon over the salmon.',
      },
    ],
  },
  {
    id: 'tomato-bean-stew',
    title: 'Rustic Heirloom Tomato & White Bean Stew',
    shortTitle: 'Tomato & White Bean Stew',
    description:
      'Slow-simmered San Marzano tomatoes, buttery cannellini beans, wilted Tuscan kale, and fresh rosemary with garlic-rubbed toast.',
    prepMinutes: 10,
    cookMinutes: 25,
    serves: 4,
    badge: { label: 'Lunch' },
    addedAt: '2025-10-28',
    tags: ['Vegetarian'],
    notes:
      'Mash a ladleful of the beans against the side of the pot — it thickens the broth into something silky without any cream.\n\n**Pairing:** A rustic Montepulciano d’Abruzzo.',
    ingredients: [
      {
        title: 'The Stew',
        category: 'Produce & Pantry',
        items: [
          { id: 'tomato', qty: 1, unit: 'lb', note: 'heirloom', prep: 'chopped' },
          { id: 'san-marzano-tomatoes', qty: 1, unit: 'can' },
          { id: 'cannellini-beans', qty: 2, unit: 'can', prep: 'drained' },
          { id: 'kale', qty: 1, unit: 'bunch', note: 'Tuscan / lacinato', prep: 'stemmed' },
          { id: 'garlic', qty: 4, unit: 'clove' },
          { id: 'rosemary', qty: 2, unit: 'sprig' },
        ],
      },
      {
        title: 'Garlic Toast',
        category: 'Bakery',
        items: [
          { id: 'sourdough-bread', qty: 4, unit: 'slice', note: 'country loaf', prep: 'thickly sliced' },
          { id: 'olive-oil', qty: 3, unit: 'tbsp', note: 'extra virgin' },
        ],
      },
    ],
    steps: [
      {
        title: 'Sweat the Aromatics',
        minutes: 5,
        text: 'Warm olive oil with sliced garlic and rosemary over medium-low heat until fragrant and just golden.',
      },
      {
        title: 'Simmer',
        minutes: 20,
        critical: true,
        text: 'Add both tomatoes and the beans with 2 cups water. Simmer 20 minutes, mashing some beans to thicken, then wilt in the kale.',
      },
      {
        title: 'Toast & Serve',
        minutes: 5,
        text: 'Grill the sourdough, rub with a cut garlic clove and drizzle with oil. Serve alongside bowls of stew.',
      },
    ],
  },
  {
    id: 'sheet-pan-chicken',
    title: 'Sheet-Pan Lemon Thyme Chicken Thighs',
    shortTitle: 'Sheet-Pan Lemon Chicken',
    description:
      'Crispy bone-in chicken thighs roasted alongside fingerling potatoes, blistered broccoli florets, and Dijon-herb marinade.',
    prepMinutes: 10,
    cookMinutes: 30,
    serves: 4,
    badge: { label: 'Dinner' },
    addedAt: '2025-08-30',
    tags: ['Poultry & Meat'],
    notes:
      'Give everything room on the pan. Crowded vegetables steam; spaced-out ones caramelize.\n\n**Pairing:** An oaked Chardonnay or a crisp hard cider.',
    ingredients: [
      {
        title: 'Chicken & Marinade',
        category: 'Protein',
        items: [
          { id: 'chicken-thigh', qty: 8, note: 'bone-in, skin-on' },
          { id: 'dijon-mustard', qty: 2, unit: 'tbsp' },
          { id: 'lemon', qty: 2, prep: 'one juiced, one sliced' },
          { id: 'thyme', qty: 1, unit: 'bunch' },
        ],
      },
      {
        title: 'Vegetables',
        category: 'Produce',
        items: [
          { id: 'potato', qty: 1.5, unit: 'lb', note: 'fingerling', prep: 'halved' },
          { id: 'broccoli', qty: 1, unit: 'head', prep: 'cut into florets' },
          { id: 'olive-oil', qty: 3, unit: 'tbsp' },
        ],
      },
    ],
    steps: [
      {
        title: 'Prep the Pan',
        minutes: 10,
        text: 'Toss the potatoes with oil and salt on a large sheet pan. Nestle the marinated thighs skin-side up between them with lemon slices.',
      },
      {
        title: 'Roast',
        minutes: 20,
        critical: true,
        text: 'Roast at 450°F for 20 minutes until the skin begins to crisp and render.',
      },
      {
        title: 'Add the Broccoli',
        minutes: 12,
        text: 'Scatter the oiled broccoli into the gaps and roast 10–12 minutes more until blistered and the chicken reaches 175°F.',
      },
    ],
  },
  {
    id: 'squash-rigatoni',
    title: 'Creamy Butternut Squash & Sage Rigatoni',
    shortTitle: 'Butternut Squash Rigatoni',
    description:
      'Velvety roasted squash sauce, fragrant fried mountain sage, freshly cracked nutmeg, toasted walnuts, and aged sheep’s milk pecorino.',
    prepMinutes: 10,
    cookMinutes: 20,
    serves: 4,
    badge: { label: 'Dinner' },
    addedAt: '2026-09-15',
    tags: ['Vegetarian'],
    notes:
      'Fry the sage leaves in the butter first, then use that sage-perfumed brown butter to finish the sauce.\n\n**Pairing:** A Viognier or a soft, fruity Dolcetto.',
    ingredients: [
      {
        title: 'Squash Sauce',
        category: 'Produce & Dairy',
        items: [
          { id: 'butternut-squash', qty: 1, unit: 'medium', prep: 'peeled and cubed' },
          { id: 'shallot', qty: 1, prep: 'sliced' },
          { id: 'pecorino-romano', qty: 0.5, unit: 'cup', note: 'aged', prep: 'grated' },
          { id: 'nutmeg', qty: 0.25, unit: 'tsp', prep: 'freshly grated' },
        ],
      },
      {
        title: 'Pasta & Finish',
        category: 'Grains',
        items: [
          { id: 'rigatoni', qty: 1, unit: 'lb' },
          { id: 'sage', qty: 12, unit: 'leaf' },
          { id: 'unsalted-butter', qty: 3, unit: 'tbsp' },
          { id: 'walnut', qty: 0.5, unit: 'cup', prep: 'toasted' },
        ],
      },
    ],
    steps: [
      {
        title: 'Roast the Squash',
        minutes: 20,
        text: 'Roast the squash and shallot at 425°F until caramelized, then blend with pecorino, nutmeg and a ladle of pasta water.',
      },
      {
        title: 'Fry the Sage',
        minutes: 3,
        critical: true,
        text: 'Foam the butter in a wide pan and fry the sage leaves until crisp. Lift them out and keep the brown butter.',
      },
      {
        title: 'Toss & Serve',
        minutes: 10,
        text: 'Toss the cooked rigatoni with the squash sauce and brown butter. Top with fried sage and crushed walnuts.',
      },
    ],
  },
  {
    id: 'soba-noodles',
    title: '15-Minute Sesame Ginger Soba Noodles',
    shortTitle: 'Sesame Ginger Soba',
    description:
      'Buckwheat noodles in toasted sesame tamari emulsion, tossed with snap peas, julienned radishes, fresh cilantro, and chili oil.',
    prepMinutes: 7,
    cookMinutes: 8,
    serves: 2,
    badge: { label: 'Lunch' },
    addedAt: '2026-07-08',
    tags: ['Quick (<30m)', 'Vegetarian'],
    notes:
      'Rinse the soba under cold water immediately after draining, rubbing gently — it removes surface starch so the noodles stay springy.\n\n**Pairing:** Iced genmaicha or a dry Grüner Veltliner.',
    ingredients: [
      {
        title: 'Noodles & Vegetables',
        category: 'Grains & Produce',
        items: [
          { id: 'soba-noodles', qty: 8, unit: 'oz', note: 'buckwheat' },
          { id: 'sugar-snap-peas', qty: 1, unit: 'cup', prep: 'sliced' },
          { id: 'radish', qty: 4, prep: 'julienned' },
          { id: 'cilantro', qty: 1, unit: 'bunch' },
        ],
      },
      {
        title: 'Sesame-Ginger Dressing',
        category: 'Sauce',
        items: [
          { id: 'tamari', qty: 3, unit: 'tbsp' },
          { id: 'toasted-sesame-oil', qty: 2, unit: 'tbsp' },
          { id: 'ginger', qty: 1, unit: 'tbsp', prep: 'grated' },
          { id: 'chili-crisp', qty: 1, unit: 'tsp' },
        ],
      },
    ],
    steps: [
      {
        title: 'Cook & Shock the Soba',
        minutes: 5,
        critical: true,
        text: 'Boil the soba for 4 minutes, drain and rinse under cold water, rubbing to remove starch.',
      },
      {
        title: 'Whisk the Dressing',
        minutes: 3,
        text: 'Whisk tamari, sesame oil, ginger and chili crisp until emulsified.',
      },
      {
        title: 'Toss & Garnish',
        minutes: 4,
        text: 'Toss the noodles with snap peas, radishes and dressing. Pile into bowls and top with cilantro.',
      },
    ],
  },
  {
    id: 'short-ribs',
    title: 'Slow-Braised Red Wine Beef Short Ribs',
    shortTitle: 'Red Wine Short Ribs',
    description:
      'Melt-in-your-mouth bone-in beef braised with mirepoix and Chianti, served over mascarpone corn polenta with zest gremolata.',
    prepMinutes: 30,
    cookMinutes: 180,
    serves: 6,
    badge: { label: 'Dinner' },
    addedAt: '2025-11-02',
    tags: ['Poultry & Meat'],
    notes:
      '### Braise a day ahead\n\nChill overnight, lift off the solidified fat, and reheat. The sauce becomes **deeper and cleaner**.\n\n1. Brown the ribs well; don\'t rush this step.\n2. Braise until the meat is tender enough to slump from the bone.\n3. Chill in the braising liquid, skim, and gently reheat.\n\n> Tip: reduce the strained liquid by a third for a glossy glaze.\n\n**Pairing:** The same Chianti you braised with, or a Barolo for a special Sunday.',
    ingredients: [
      {
        title: 'The Braise',
        category: 'Protein',
        items: [
          { id: 'beef-short-ribs', qty: 4, unit: 'lb', note: 'bone-in' },
          { id: 'red-wine', qty: 1, unit: 'bottle', note: 'Chianti or another dry red' },
          { id: 'carrot', qty: 2, prep: 'diced' },
          { id: 'celery', qty: 2, unit: 'stalk', prep: 'diced' },
          { id: 'onion', qty: 1, note: 'yellow', prep: 'diced' },
          { id: 'tomato-paste', qty: 2, unit: 'tbsp' },
        ],
      },
      {
        title: 'Polenta & Gremolata',
        category: 'Grains & Dairy',
        items: [
          { id: 'polenta', qty: 1.5, unit: 'cup', note: 'coarse' },
          { id: 'mascarpone', qty: 0.5, unit: 'cup' },
          { id: 'parsley', qty: 1, unit: 'bunch', note: 'flat-leaf' },
          { id: 'lemon', qty: 1, prep: 'zested' },
        ],
      },
    ],
    steps: [
      {
        title: 'Sear the Ribs',
        minutes: 20,
        critical: true,
        text: 'Season generously and sear the ribs in batches in a Dutch oven until deeply browned on all sides.',
      },
      {
        title: 'Build the Braise',
        minutes: 15,
        text: 'Soften the mirepoix in the rendered fat, stir in tomato paste, then deglaze with the wine and return the ribs.',
      },
      {
        title: 'Low & Slow',
        minutes: 150,
        text: 'Cover and braise at 325°F for 2½ hours until the meat slips from the bone. Skim and reduce the sauce.',
      },
      {
        title: 'Polenta & Gremolata',
        minutes: 25,
        text: 'Whisk polenta into simmering salted water and cook until creamy, then fold in mascarpone. Chop parsley with lemon zest and scatter over the ribs.',
      },
    ],
  },
  {
    id: 'souvlaki-bowls',
    title: 'Greek Lemon Garlic Chicken Souvlaki Bowls',
    shortTitle: 'Chicken Souvlaki Bowls',
    description:
      'Oregano grilled chicken tenderloins with cooling cucumber-dill tzatziki, Kalamata olives, sumac-pickled onions, and warm pita.',
    prepMinutes: 10,
    cookMinutes: 15,
    serves: 4,
    badge: { label: 'Lunch' },
    addedAt: '2026-05-11',
    tags: ['Poultry & Meat', 'Quick (<30m)'],
    notes:
      'Salt and drain the grated cucumber for 10 minutes before folding into the yogurt — your tzatziki stays thick instead of watery.\n\n**Pairing:** A crisp Assyrtiko from Santorini.',
    ingredients: [
      {
        title: 'Souvlaki',
        category: 'Protein',
        items: [
          { id: 'chicken-tenderloin', qty: 1.5, unit: 'lb' },
          { id: 'lemon', qty: 2 },
          { id: 'garlic', qty: 4, unit: 'clove', prep: 'grated' },
          { id: 'oregano', qty: 1, unit: 'tbsp', note: 'dried' },
        ],
      },
      {
        title: 'Tzatziki & Bowl',
        category: 'Dairy & Produce',
        items: [
          { id: 'greek-yogurt', qty: 1, unit: 'cup' },
          { id: 'cucumber', qty: 1, note: 'English' },
          { id: 'onion', qty: 1, note: 'red', prep: 'thinly sliced' },
          { id: 'kalamata-olives', qty: 0.5, unit: 'cup' },
          { id: 'pita-bread', qty: 4 },
        ],
      },
    ],
    steps: [
      {
        title: 'Pickle the Onions',
        minutes: 5,
        text: 'Toss the red onion with lemon juice, a pinch of sumac and salt. Set aside.',
      },
      {
        title: 'Make the Tzatziki',
        minutes: 5,
        text: 'Grate and drain the cucumber, then fold into the yogurt with garlic, dill and lemon.',
      },
      {
        title: 'Grill the Chicken',
        minutes: 10,
        critical: true,
        text: 'Grill the marinated tenderloins over high heat for 4–5 minutes per side until charred and cooked through. Warm the pita on the grill.',
      },
    ],
  },
  {
    id: 'chickpea-bowl',
    title: 'Crispy Chickpea Mediterranean Grain Bowl',
    shortTitle: 'Crispy Chickpea Bowl',
    description:
      'Cumin-roasted chickpeas on fluffy quinoa with roasted red peppers, baby arugula, pickled shallots, and lemon-parsley tahini dressing.',
    prepMinutes: 5,
    cookMinutes: 15,
    serves: 2,
    badge: { label: 'Lunch' },
    addedAt: '2026-08-22',
    tags: ['Vegetarian', 'Gluten-Free', 'Quick (<30m)', 'Mediterranean', 'Meal Prep'],
    notes:
      'Dry the chickpeas thoroughly and roast them before seasoning — spices burn, but a toss in cumin right out of the oven sticks perfectly.\n\n**Pairing:** Sparkling water with cucumber and mint, or a dry rosé.',
    ingredients: [
      {
        title: 'Bowl Base',
        category: 'Grains & Produce',
        items: [
          { id: 'quinoa', qty: 1, unit: 'cup' },
          { id: 'chickpeas', qty: 1, unit: 'can', prep: 'drained and dried' },
          { id: 'roasted-red-peppers', qty: 1, unit: 'jar' },
          { id: 'arugula', qty: 2, unit: 'cup', note: 'baby' },
          { id: 'shallot', qty: 1, prep: 'thinly sliced' },
          { id: 'ground-cumin', qty: 1, unit: 'tsp' },
        ],
      },
      {
        title: 'Tahini Dressing',
        category: 'Sauce',
        items: [
          { id: 'tahini', qty: 0.25, unit: 'cup' },
          { id: 'lemon', qty: 1, prep: 'juiced' },
          { id: 'parsley', qty: 0.5, unit: 'bunch', note: 'flat-leaf' },
        ],
      },
    ],
    steps: [
      {
        title: 'Roast the Chickpeas',
        minutes: 15,
        critical: true,
        text: 'Roast the oiled chickpeas at 425°F until deeply golden and crunchy, shaking the pan halfway. Toss with cumin and salt.',
      },
      {
        title: 'Cook the Quinoa',
        minutes: 12,
        text: 'Simmer the rinsed quinoa in 2 cups salted water until fluffy, then rest covered for 5 minutes.',
      },
      {
        title: 'Dress & Assemble',
        minutes: 5,
        text: 'Whisk tahini, lemon juice, chopped parsley and water until pourable. Build bowls of quinoa, arugula, peppers, shallots and chickpeas, then drizzle.',
      },
    ],
  },
  {
    id: 'ny-cheesecake',
    title: 'Classic New York Cheesecake with Graham Cracker Crust',
    shortTitle: 'New York Cheesecake',
    description:
      'Dense, tall and creamy cream-cheese filling with a hint of lemon and vanilla on a buttery graham cracker crust, baked low and slow in a water bath.',
    prepMinutes: 30,
    cookMinutes: 75,
    serves: 12,
    badge: { label: 'Dessert' },
    addedAt: '2026-09-27',
    tags: ['Vegetarian'],
    notes:
      'Start a day ahead: the cheesecake needs at least **6 hours** (ideally overnight) in the fridge to set.\n\n- Let the cream cheese, eggs and sour cream come fully to room temperature — cold cream cheese makes lumps.\n- Mix on low speed so you don’t whip in air; air bubbles are what crack the top.\n- For clean slices, dip a sharp knife in hot water and wipe it between cuts.',
    ingredients: [
      {
        title: 'Graham Cracker Crust',
        category: 'Pantry & Dairy',
        items: [
          { id: 'graham-cracker-crumbs', qty: 1.75, unit: 'cup' },
          { id: 'unsalted-butter', qty: 6, unit: 'tbsp', prep: 'melted' },
          { id: 'sugar', qty: 2, unit: 'tbsp', note: 'granulated' },
        ],
      },
      {
        title: 'Cheesecake Filling',
        category: 'Dairy & Pantry',
        items: [
          { id: 'cream-cheese', qty: 32, unit: 'oz', note: 'full-fat', prep: 'at room temperature' },
          { id: 'sugar', qty: 1.25, unit: 'cup', note: 'granulated' },
          { id: 'sour-cream', qty: 1, unit: 'cup', prep: 'at room temperature' },
          { id: 'egg', qty: 4, unit: 'large', prep: 'at room temperature' },
          { id: 'vanilla-extract', qty: 2, unit: 'tsp' },
          { id: 'lemon', qty: 1, prep: 'zested' },
          { id: 'flour', qty: 2, unit: 'tbsp', note: 'all-purpose' },
        ],
      },
      {
        title: 'Water Bath',
        category: 'Equipment',
        items: [{ qty: 1, unit: 'roll', text: 'heavy-duty aluminum foil, to wrap the springform pan', tag: 'Other' }],
      },
    ],
    steps: [
      {
        title: 'Press & Bake the Crust',
        minutes: 15,
        text: 'Heat the oven to 325°F. Mix the crumbs, melted butter and sugar, press firmly into the base of a 9-inch springform pan, and bake for 10 minutes. Let it cool while you make the filling.',
      },
      {
        title: 'Mix the Filling',
        minutes: 10,
        text: 'Beat the cream cheese and sugar **on low** until smooth. Add the sour cream, vanilla, lemon zest and flour, then the eggs one at a time, mixing only until each disappears. Scrape the bowl often.',
      },
      {
        title: 'Bake in a Water Bath',
        minutes: 75,
        critical: true,
        text: 'Wrap the outside of the pan in two layers of foil, pour in the filling and set it in a roasting tin. Add hot water halfway up the sides and bake until the edges are set but the center still wobbles, 70–80 minutes.',
      },
      {
        title: 'Cool Slowly & Chill',
        minutes: 60,
        text: 'Turn off the oven, crack the door and leave the cheesecake inside for 1 hour. Run a knife around the edge, cool to room temperature, then chill at least 6 hours before unmolding.',
      },
    ],
  },
];

/** @type {Recipe[]} */
export const sampleRecipes = /* @__PURE__ */ pool.map((r) => ({ ...r, minutes: r.prepMinutes + r.cookMinutes }));

/** "25 min", "1 hr", "3.5 hrs" */
export function formatMinutes(min) {
  if (min < 60) return `${min} min`;
  const hrs = Math.round((min / 60) * 10) / 10;
  return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
}
