// Sample recipe pool mirroring the Google Sheets [Recipes] tab. The live list
// (samples + the user's custom recipes) is in ../recipes.svelte.js.

const IMG = 'https://lh3.googleusercontent.com/aida-public/';

/**
 * @typedef {{ qty?: number, unit?: string, text: string, tag: string, staple?: boolean }} Ingredient
 * @typedef {{ title: string, category: string, items: Ingredient[] }} IngredientGroup
 * @typedef {{ title: string, minutes: number, text: string, critical?: boolean }} Step
 * @typedef {{
 *   id: string,
 *   title: string,
 *   shortTitle: string,
 *   description: string,
 *   image?: string,
 *   hero?: string,
 *   sheetRow?: number,
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
    image:
      IMG +
      'AB6AXuC5Mw9oNxGTcNbnUVAixH0ErLg4cBO6c3mBGe3MnfobETp9MYuU7Ip-v3n5YKN1v2lLuUid77qctMNBH6wARrmls3S9qBnlAuckUFPs47B6Q-l7464smcqrXr8QG3CgOcraVfUyVSUv1jnzcWKq1mfd4beAM8mImGl_NHwhRCj151bCR49RmCBorSNP93YHJJZbCucCe5xvLtzY1CacQKlOxHj4xqrzs9pzBwxJ3eMf98th5uftEcEwBw',
    hero:
      IMG +
      'AB6AXuAvBKYVeYGf6JFmw8eAE9SekijZGeQatTSKCpBUsaGwcKukceDVD2bWngchUv8jQsI9eqtcTdoSsbnkeJSs066KS_3JNd7Bnbu-UBK5tRuAOLo98_pEnZaxRtSjiqzexDY4_YjWiHU2jWGa5oZlxjmQlsK3xA2u0q4OSjKKp6Mphjk3iNj5sWzGsO1FhZZHfXl9YHySDVzPyD_F7gXcyP8QYKSA0S7_5EPqgwweFS6-Fj7RMoJKPiwBzw',
    sheetRow: 14,
    prepMinutes: 15,
    cookMinutes: 25,
    serves: 2,
    badge: { label: 'Dinner' },
    addedAt: '2026-03-02',
    tags: ['Gluten-Free'],
    notes:
      '### Crispy skin, every time\n\nPat the salmon skin **bone-dry** with clean paper towels 15 minutes before cooking. Surface moisture turns to steam and prevents that glass-like crackle.\n\n- Keep the broth at an *active bare simmer* on the adjacent burner.\n- Press each fillet down for the first 10 seconds so the skin stays flat.\n\n**Pairing:** A chilled Sancerre or dry Oregon Pinot Gris echoes the Meyer lemon without overpowering the salmon.',
    ingredients: [
      {
        title: 'The Crispy Wild Salmon',
        category: 'Protein',
        items: [
          { qty: 2, text: 'fresh wild salmon fillets (6 oz each), skin-on & thoroughly scaled', tag: 'Fresh' },
          { qty: 1, unit: 'tbsp', text: 'high-smoke point avocado oil or clarified butter', tag: 'Pantry', staple: true },
          { text: 'Flaky Maldon sea salt & freshly cracked black peppercorns', tag: 'Spices', staple: true },
          { qty: 1, unit: 'pack', text: 'bamboo skewers or kitchen twine, for trussing & turning', tag: 'Other' },
        ],
      },
      {
        title: 'Meyer Lemon Risotto Base',
        category: 'Grains & Dairy',
        items: [
          { qty: 1, unit: 'cup', text: 'premium Arborio or Carnaroli rice', tag: 'Pantry' },
          { qty: 3.5, unit: 'cups', text: 'organic vegetable or light chicken broth', tag: 'Broth' },
          { qty: 1, text: 'French shallot, finely minced', tag: 'Produce' },
          { qty: 2, text: 'cloves garlic, microplaned', tag: 'Produce' },
          { qty: 0.5, unit: 'cup', text: 'dry crisp white wine (Pinot Grigio or Sauvignon Blanc)', tag: 'Pantry' },
          { qty: 1, text: 'organic Meyer lemon, zested and juiced', tag: 'Citrus' },
          { qty: 1 / 3, unit: 'cup', text: 'freshly grated Parmigiano-Reggiano (24-month aged)', tag: 'Dairy' },
          { qty: 2, unit: 'tbsp', text: 'unsalted European butter, cubed and chilled', tag: 'Dairy' },
          { qty: 2, unit: 'tbsp', text: 'fresh dill & flat-leaf parsley, hand-torn', tag: 'Herbs' },
        ],
      },
      {
        title: 'Charred Garden Asparagus',
        category: 'Garden Greens',
        items: [
          { qty: 1, unit: 'bunch', text: 'slender green asparagus, woody ends snapped', tag: 'Produce' },
          { qty: 1, unit: 'tbsp', text: 'extra virgin olive oil & grilled lemon halves', tag: 'Garnish', staple: true },
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
    image:
      IMG +
      'AB6AXuCq_54vcTmNQhCP1GDafEzHXlPupPvRKxznsr8Ai-mEGyAkfObBuuEdHC23pjGUyky3_XtN9CA2Sze6_h2DD7iZ2v6iFg5HXqkAe4MRgVRbY41JbJk-3Pz7Hc3LWHVeGLqz-LaGQsvT9xAW7S7mlkNaAx5lI-YDCoPv6A5UMeAtygcJ1NdD_Gf1HUxvmf1tAFQ2Ob-ivXYuDSado4x3Joc0lIEkf0XNtaJmiWtNyuiReq3F8EP4mmOubw',
    sheetRow: 7,
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
          { qty: 1, unit: 'lb', text: 'tomatillos, husked and rinsed', tag: 'Produce' },
          { qty: 1, text: 'jalapeño, stemmed', tag: 'Produce' },
          { qty: 0.5, unit: 'cup', text: 'Mexican crema', tag: 'Dairy' },
        ],
      },
      {
        title: 'The Filling',
        category: 'Produce & Pantry',
        items: [
          { qty: 3, text: 'poblano peppers', tag: 'Produce' },
          { qty: 1, unit: 'can', text: 'black beans, drained', tag: 'Pantry' },
          { qty: 1, unit: 'cup', text: 'sweet corn kernels', tag: 'Frozen' },
          { qty: 1, unit: 'tsp', text: 'ground cumin', tag: 'Spices', staple: true },
        ],
      },
      {
        title: 'Assembly & Finish',
        category: 'Dairy & Garnish',
        items: [
          { qty: 12, text: 'corn tortillas', tag: 'Bakery' },
          { qty: 2, unit: 'cups', text: 'shredded Monterey Jack', tag: 'Dairy' },
          { qty: 1, unit: 'bunch', text: 'fresh cilantro', tag: 'Herbs' },
          { qty: 1, text: 'lime, cut into wedges', tag: 'Citrus' },
          { qty: 1, unit: 'roll', text: 'aluminum foil, to cover the baking dish', tag: 'Other' },
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
    image:
      IMG +
      'AB6AXuAjnHCvCZ1KHDX2bYRtljnnj-h9H0wtBS7Z0w-PYbdgoTNtArbCCbee7qH7AL_ebLR2AlqIRnt55e2k469ljCylJqRFdedFXS7PO7GYnKpDIY2FQwLzFpH1AZ3Mrp1-EgldY_21EhcDTiGVUQmRZovxje1ieCxzY7LbESZZfZwfG6o1O6hVAAsYlhfMQWk3Ts78dqzuBTQgL4PablnZbY5xvVdu9K_9vQ1X0_dbButXpFrThrK79ahu9A',
    sheetRow: 9,
    prepMinutes: 15,
    cookMinutes: 45,
    serves: 4,
    badge: { label: 'Dinner' },
    addedAt: '2025-10-04',
    tags: ['Poultry & Meat'],
    notes:
      '### Silky sauce, no cream\n\nReserve **a full mug of starchy pasta water** before draining. Toss the rigatoni with the ragù and a splash of that water over high heat for one minute; it emulsifies the sauce so it coats every ridge.\n\n1. Drain the pasta *2 minutes early*.\n2. Finish it in the pan with the ragù and pasta water.\n3. Off the heat, stir in the pecorino.\n\n**Pairing:** A Chianti Classico or Rosso di Montalcino. Bright acidity cuts through the sausage.',
    ingredients: [
      {
        title: 'The Ragù',
        category: 'Protein',
        items: [
          { qty: 1, unit: 'lb', text: 'sweet Italian fennel sausage, casings removed', tag: 'Fresh' },
          { qty: 1, text: 'yellow onion, finely diced', tag: 'Produce' },
          { qty: 3, text: 'cloves garlic, sliced', tag: 'Produce' },
          { qty: 1, unit: 'can', text: 'San Marzano tomatoes (28 oz)', tag: 'Pantry' },
          { qty: 1, unit: 'can', text: 'cannellini beans, drained', tag: 'Pantry' },
          { qty: 0.5, unit: 'tsp', text: 'red pepper flakes', tag: 'Spices', staple: true },
        ],
      },
      {
        title: 'Pasta & Finish',
        category: 'Grains & Dairy',
        items: [
          { qty: 1, unit: 'lb', text: 'rigatoni', tag: 'Pantry' },
          { qty: 1, unit: 'cup', text: 'shaved Pecorino Romano', tag: 'Dairy' },
          { qty: 1, unit: 'bunch', text: 'fresh basil', tag: 'Herbs' },
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
    image:
      IMG +
      'AB6AXuDZrdwAMIUnNdJWP4NUDAlhB5IRvL-w432Tn5QIPJSP3cb_CvCrDrw1qH1gQU0o1yoJkUy_fmdS2FojFxmvYLfhpOSMJR7dSIV21v31grvShMRxyH8WD5cChvOMQZae09a8y7sKKwhKXUYk7_vh2EE_8MIVk46_v4RYm_LfDTOoOKhG3kGe4QEI7KHg9-argAqeIUyKQXFXKSs9oxFXNUNwEHrKdHnwOwPjkE0AqXOBxEPILT7AgbbNmQ',
    sheetRow: 11,
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
          { qty: 2, text: 'balls sourdough pizza dough (ready-made or home proofed)', tag: 'Bakery' },
          { qty: 1, unit: 'can', text: 'crushed San Marzano tomatoes', tag: 'Pantry' },
          { qty: 2, unit: 'tbsp', text: 'semolina for dusting', tag: 'Pantry', staple: true },
        ],
      },
      {
        title: 'Toppings',
        category: 'Dairy & Herbs',
        items: [
          { qty: 2, text: 'balls fresh burrata', tag: 'Dairy' },
          { qty: 1, unit: 'bunch', text: 'fresh basil', tag: 'Herbs' },
          { qty: 3, unit: 'tbsp', text: 'hot honey', tag: 'Pantry' },
          { qty: 1, unit: 'roll', text: 'parchment paper, for sliding the pizza onto the stone', tag: 'Other' },
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
    sheetRow: 15,
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
          { qty: 2, text: 'Japanese eggplants, halved lengthwise', tag: 'Produce' },
          { qty: 3, unit: 'tbsp', text: 'white miso', tag: 'Pantry' },
          { qty: 1, unit: 'tbsp', text: 'mirin', tag: 'Pantry' },
          { qty: 1, unit: 'tsp', text: 'toasted sesame oil', tag: 'Pantry', staple: true },
        ],
      },
      {
        title: 'Rice & Pickles',
        category: 'Grains & Produce',
        items: [
          { qty: 1, unit: 'cup', text: 'jasmine rice', tag: 'Pantry' },
          { qty: 2, text: 'Persian cucumbers, thinly sliced', tag: 'Produce' },
          { qty: 0.25, unit: 'cup', text: 'rice vinegar', tag: 'Pantry', staple: true },
          { qty: 2, text: 'scallions, sliced', tag: 'Produce' },
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
    sheetRow: 8,
    prepMinutes: 5,
    cookMinutes: 20,
    serves: 4,
    badge: { label: 'Dinner' },
    addedAt: '2025-12-01',
    tags: ['Quick (<30m)', 'Vegetarian'],
    notes:
      '### The tadka is everything\n\nAdd the tadka at the **very last second**. The hiss of hot spiced ghee hitting the dal is where the aroma comes from.\n\n- Heat the ghee until the cumin seeds *dance*, then add garlic and chilli.\n- Pour straight over the dal and cover for 30 seconds.\n- Leftovers thicken overnight; loosen with a splash of water.\n\n**Pairing:** A salted mango lassi or an off-dry Riesling.',
    ingredients: [
      {
        title: 'The Dal',
        category: 'Pantry',
        items: [
          { qty: 1, unit: 'cup', text: 'red lentils, rinsed', tag: 'Pantry' },
          { qty: 1, unit: 'can', text: 'full-fat coconut milk', tag: 'Pantry' },
          { qty: 1, unit: 'inch', text: 'fresh ginger, grated', tag: 'Produce' },
          { qty: 1, unit: 'tsp', text: 'ground turmeric', tag: 'Spices', staple: true },
        ],
      },
      {
        title: 'Tadka & Sides',
        category: 'Aromatics & Bakery',
        items: [
          { qty: 2, unit: 'tbsp', text: 'ghee', tag: 'Dairy' },
          { qty: 1, unit: 'tsp', text: 'cumin seeds', tag: 'Spices', staple: true },
          { qty: 4, text: 'garlic naan', tag: 'Bakery' },
          { qty: 1, unit: 'bunch', text: 'cilantro', tag: 'Herbs' },
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
    image:
      IMG +
      'AB6AXuBV2R4JTx_C0JAkbBFstUoviqtqEXHWwYVCVuA45jTL4UM-rD0CUdiaZ6mjjcdM1lJaj2BX9bc54v8lvJ5y2s5C8Igku0iScoVtEacFWxzY-aF5ZBul9Hzajx5auHGj57Trd7y_zgp1kwzdF_CGz4Zr1YEtIJHKdLrQaaFDPCgzIGhG4LyHesX-x2ec924I2piPIuLoKUpfrMkoDyZadv3MpN26BGtTr3UTZa0brwtAyZBtTsM4P9LSTw',
    sheetRow: 2,
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
          { qty: 2, text: 'salmon fillets (6 oz each), skin-on', tag: 'Fresh' },
          { qty: 1, text: 'lemon, zested and juiced', tag: 'Citrus' },
        ],
      },
      {
        title: 'Potatoes & Greens',
        category: 'Produce',
        items: [
          { qty: 0.75, unit: 'lb', text: 'baby red potatoes, halved', tag: 'Produce' },
          { qty: 1, unit: 'bunch', text: 'tenderstem asparagus or broccolini', tag: 'Produce' },
          { qty: 2, unit: 'tbsp', text: 'olive oil', tag: 'Pantry', staple: true },
        ],
      },
      {
        title: 'Caper-Dill Emulsion',
        category: 'Sauce',
        items: [
          { qty: 2, unit: 'tbsp', text: 'capers, rinsed', tag: 'Pantry' },
          { qty: 2, unit: 'tbsp', text: 'fresh dill, chopped', tag: 'Herbs' },
          { qty: 3, unit: 'tbsp', text: 'unsalted butter', tag: 'Dairy' },
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
    image:
      IMG +
      'AB6AXuCWGT4YiNDNcLfb9KUsInGBedSVgQodcezlR-_OptV7YvLzD0I7JOe3T8TMRxc6JtQAGD5wjErbLYoa1xGxYraSJsc3E3r6mmaNAR3NHd_kb8Mjeb2Cv_i_QBln6c7b6WD5s832zTDzDPUgBfnST57LJuxQsdDP-9L5-qidLwFoT8uModjBC4kG0wztg1Wpbm9yFAD3_ttPTJ5BdwBpXWQHr82ve1cYikMOsBZ6cVwbplSSoTgq2h5BEQ',
    sheetRow: 3,
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
          { qty: 1, unit: 'lb', text: 'heirloom tomatoes, chopped', tag: 'Produce' },
          { qty: 1, unit: 'can', text: 'San Marzano tomatoes', tag: 'Pantry' },
          { qty: 2, unit: 'cans', text: 'cannellini beans, drained', tag: 'Pantry' },
          { qty: 1, unit: 'bunch', text: 'Tuscan (lacinato) kale, stemmed', tag: 'Produce' },
          { qty: 4, text: 'cloves garlic', tag: 'Produce' },
          { qty: 2, text: 'sprigs fresh rosemary', tag: 'Herbs' },
        ],
      },
      {
        title: 'Garlic Toast',
        category: 'Bakery',
        items: [
          { qty: 4, text: 'thick slices country sourdough', tag: 'Bakery' },
          { qty: 3, unit: 'tbsp', text: 'extra virgin olive oil', tag: 'Pantry', staple: true },
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
    image:
      IMG +
      'AB6AXuAVQEvEyIImBiVfUTd3ZPK0lgU-Gua04l93Pul3jnzI2ixnjb_GGqvf7B11ou9sXOozOKzRv7pEp7idAk_5SBN2KhkaYvlD6YoB8yMf6dZFypcz0qxU1GGpMaTcgc3LZEQKlR-xfGYky1-f5Zc6QjJ9u0yuWyAoedG_XQw3AJs7AXCzX8iO2Z8Rv2B3oEo4jGhsP5mIyqyT5ywB8Ns4cdzW0_SLFZLMsRrFSF6Ngi3WuIaLw412jFqpNQ',
    sheetRow: 4,
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
          { qty: 8, text: 'bone-in, skin-on chicken thighs', tag: 'Fresh' },
          { qty: 2, unit: 'tbsp', text: 'Dijon mustard', tag: 'Pantry' },
          { qty: 2, text: 'lemons, one juiced and one sliced', tag: 'Citrus' },
          { qty: 1, unit: 'bunch', text: 'fresh thyme', tag: 'Herbs' },
        ],
      },
      {
        title: 'Vegetables',
        category: 'Produce',
        items: [
          { qty: 1.5, unit: 'lb', text: 'fingerling potatoes, halved', tag: 'Produce' },
          { qty: 1, unit: 'head', text: 'broccoli, cut into florets', tag: 'Produce' },
          { qty: 3, unit: 'tbsp', text: 'olive oil', tag: 'Pantry', staple: true },
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
    image:
      IMG +
      'AB6AXuC1MdaKTop1BXw-1g8ynSuYGA7EP7470LfWyfgcdyNEERnw82OJg1pWbDsv-oEdfbB1IgQ0rWlC8rPqy_2-1DeyrZjdSQkKry6YaIIm4cofvcNA_0t908N4sccUhxGYtMCU8jy-62RPt3fvrMjZZVK5k2a_RTNV1lldNBF8dGHpgzRsvVQzv3HbC1JeRmosOpVr8yLg4xMBHbeoN2eKvZ45TQwLjOUty6k5NOZIwOa1ew4p2TEEXXYygQ',
    sheetRow: 5,
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
          { qty: 1, text: 'medium butternut squash, peeled and cubed', tag: 'Produce' },
          { qty: 1, text: 'shallot, sliced', tag: 'Produce' },
          { qty: 0.5, unit: 'cup', text: 'grated aged pecorino', tag: 'Dairy' },
          { qty: 0.25, unit: 'tsp', text: 'freshly grated nutmeg', tag: 'Spices', staple: true },
        ],
      },
      {
        title: 'Pasta & Finish',
        category: 'Grains',
        items: [
          { qty: 1, unit: 'lb', text: 'rigatoni', tag: 'Pantry' },
          { qty: 12, text: 'fresh sage leaves', tag: 'Herbs' },
          { qty: 3, unit: 'tbsp', text: 'unsalted butter', tag: 'Dairy' },
          { qty: 0.5, unit: 'cup', text: 'walnuts, toasted', tag: 'Pantry' },
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
    image:
      IMG +
      'AB6AXuD87xdGZvsmB7bn3s9a0FerKSCUWlBmzD_-_q4hslI-7I6N8YYl1exycVc8nQ8Z8vaG8MTKKLoRFyJLzXeKV-aGoNLYHGMkFSfLegGcWmdS_4WUvlpNatyskLYT0Nvm8AD9-axU9pcRndCUNfuu-CWgyy6ITHe2t-TfWpKifawhmFfH-XqjM6fohzfBbAfS5mH9UnqH4ejUBUb0ikgMO_CiRho2rhZtoz6gZcb3tOFePmcni6rmb5E88A',
    sheetRow: 6,
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
          { qty: 8, unit: 'oz', text: 'buckwheat soba noodles', tag: 'Pantry' },
          { qty: 1, unit: 'cup', text: 'sugar snap peas, sliced', tag: 'Produce' },
          { qty: 4, text: 'radishes, julienned', tag: 'Produce' },
          { qty: 1, unit: 'bunch', text: 'cilantro', tag: 'Herbs' },
        ],
      },
      {
        title: 'Sesame-Ginger Dressing',
        category: 'Sauce',
        items: [
          { qty: 3, unit: 'tbsp', text: 'tamari', tag: 'Pantry' },
          { qty: 2, unit: 'tbsp', text: 'toasted sesame oil', tag: 'Pantry', staple: true },
          { qty: 1, unit: 'tbsp', text: 'fresh ginger, grated', tag: 'Produce' },
          { qty: 1, unit: 'tsp', text: 'chili crisp', tag: 'Pantry' },
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
    image:
      IMG +
      'AB6AXuDl9HZHI_vVtZ22gQDXPUEmBnTokd1K6VuXakeS7RbLJ1cVYLv70O2g11l4H5xk4XumuCtYWw1cDMEDF5uZpgjvI324A-5ZqYvw2KV2kMR09CLOeTiOTWREXDzxoRoqZ7aoiFxxZ7fZ9XmT-fPDzLAiFigarPWSTCof8-MnIWiv2owokob58CZVp-KIaJ7nb4CsZxTEm4g8FC3pt4jnx2nKJZcFZMSadhNnzGVylcJpWX6SOOnL8l8WcQ',
    sheetRow: 10,
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
          { qty: 4, unit: 'lb', text: 'bone-in beef short ribs', tag: 'Fresh' },
          { qty: 1, unit: 'bottle', text: 'Chianti or dry red wine', tag: 'Pantry' },
          { qty: 2, text: 'carrots, diced', tag: 'Produce' },
          { qty: 2, text: 'celery stalks, diced', tag: 'Produce' },
          { qty: 1, text: 'yellow onion, diced', tag: 'Produce' },
          { qty: 2, unit: 'tbsp', text: 'tomato paste', tag: 'Pantry' },
        ],
      },
      {
        title: 'Polenta & Gremolata',
        category: 'Grains & Dairy',
        items: [
          { qty: 1.5, unit: 'cups', text: 'coarse polenta', tag: 'Pantry' },
          { qty: 0.5, unit: 'cup', text: 'mascarpone', tag: 'Dairy' },
          { qty: 1, unit: 'bunch', text: 'flat-leaf parsley', tag: 'Herbs' },
          { qty: 1, text: 'lemon, zested', tag: 'Citrus' },
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
    image:
      IMG +
      'AB6AXuCKrT0UtRuQ3c0Y4Pehla-LYc-uoB4eK1cdfj9TV9qEtZV6Z4Jjz_5IFhxJ711dzvF9FPIh6qFwci7SNyM6i5rA0u-i1zKGVNv5ue303mffeyVMrdeRLYAgQBhlrHKl5_bU_w8EzXt0Jnz9cke4yDNRIoorO7LplJ791TzKIwtbT1tvP00Hj1pFmY9gCmylMfV-6SWj9eK5ElzmJHb1XlddPLcecJD9aOhh7yI3n3WCyXcxWFGa3hFZyQ',
    sheetRow: 12,
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
          { qty: 1.5, unit: 'lb', text: 'chicken tenderloins', tag: 'Fresh' },
          { qty: 2, text: 'lemons', tag: 'Citrus' },
          { qty: 4, text: 'cloves garlic, grated', tag: 'Produce' },
          { qty: 1, unit: 'tbsp', text: 'dried oregano', tag: 'Spices', staple: true },
        ],
      },
      {
        title: 'Tzatziki & Bowl',
        category: 'Dairy & Produce',
        items: [
          { qty: 1, unit: 'cup', text: 'Greek yogurt', tag: 'Dairy' },
          { qty: 1, text: 'English cucumber', tag: 'Produce' },
          { qty: 1, text: 'red onion, thinly sliced', tag: 'Produce' },
          { qty: 0.5, unit: 'cup', text: 'Kalamata olives', tag: 'Pantry' },
          { qty: 4, text: 'pita breads', tag: 'Bakery' },
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
    image:
      IMG +
      'AB6AXuAaF7pRS__Vn3GRbjdYm90zU6HDLak4-gUJx_w03PdpaeMTM6F5VLJ9_Kw-F0nzy1gCVvFzilQRbUNBSZqRAj8k4QMIiwQcIIpSDDJ03jz9pUdNPERLYKKv8zoC2G8FeaBRQuZ3vgqtyoLl0pU_xFJw41dyShzCm9p-OOPDnIbAcLPy5GQeDhsV0rwOcsXeTWffLxKQqCCa7AwAvyPvpUX0j5yj-erYuRJEQGZkegQ9usn3oyp0mpBSkA',
    sheetRow: 13,
    prepMinutes: 5,
    cookMinutes: 15,
    serves: 2,
    badge: { label: 'Lunch' },
    addedAt: '2026-08-22',
    tags: ['Vegetarian', 'Gluten-Free', 'Quick (<30m)'],
    notes:
      'Dry the chickpeas thoroughly and roast them before seasoning — spices burn, but a toss in cumin right out of the oven sticks perfectly.\n\n**Pairing:** Sparkling water with cucumber and mint, or a dry rosé.',
    ingredients: [
      {
        title: 'Bowl Base',
        category: 'Grains & Produce',
        items: [
          { qty: 1, unit: 'cup', text: 'quinoa', tag: 'Pantry' },
          { qty: 1, unit: 'can', text: 'chickpeas, drained and dried', tag: 'Pantry' },
          { qty: 1, unit: 'jar', text: 'roasted red peppers', tag: 'Pantry' },
          { qty: 2, unit: 'cups', text: 'baby arugula', tag: 'Produce' },
          { qty: 1, text: 'shallot, thinly sliced', tag: 'Produce' },
          { qty: 1, unit: 'tsp', text: 'ground cumin', tag: 'Spices', staple: true },
        ],
      },
      {
        title: 'Tahini Dressing',
        category: 'Sauce',
        items: [
          { qty: 0.25, unit: 'cup', text: 'tahini', tag: 'Pantry' },
          { qty: 1, text: 'lemon, juiced', tag: 'Citrus' },
          { qty: 0.5, unit: 'bunch', text: 'flat-leaf parsley', tag: 'Herbs' },
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
];

/** @type {Recipe[]} */
export const sampleRecipes = /* @__PURE__ */ pool.map((r) => ({ ...r, minutes: r.prepMinutes + r.cookMinutes }));

/** "25 min", "1 hr", "3.5 hrs" */
export function formatMinutes(min) {
  if (min < 60) return `${min} min`;
  const hrs = Math.round((min / 60) * 10) / 10;
  return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
}
