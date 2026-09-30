// Sample recipe pool mirroring the Google Sheets [Recipes] tab.
// Until the Sheets sync lands, this is the app's recipe source.

const IMG = 'https://lh3.googleusercontent.com/aida-public/';

/**
 * @typedef {'tertiary' | 'secondary'} Tone
 * @typedef {{ label: string, text: string, icon: string, tone: Tone }} PrepTip
 * @typedef {{
 *   id: string,
 *   title: string,
 *   image?: string,
 *   minutes: number,
 *   serves: number,
 *   prep: PrepTip,
 *   highlight?: string,
 *   ingredients: string[],
 * }} Recipe
 */

/** @type {Recipe[]} */
export const recipes = [
  {
    id: 'salmon-risotto',
    title: 'Pan-Seared Crispy Salmon with Meyer Lemon Herb Risotto & Grilled Asparagus',
    image:
      IMG +
      'AB6AXuC5Mw9oNxGTcNbnUVAixH0ErLg4cBO6c3mBGe3MnfobETp9MYuU7Ip-v3n5YKN1v2lLuUid77qctMNBH6wARrmls3S9qBnlAuckUFPs47B6Q-l7464smcqrXr8QG3CgOcraVfUyVSUv1jnzcWKq1mfd4beAM8mImGl_NHwhRCj151bCR49RmCBorSNP93YHJJZbCucCe5xvLtzY1CacQKlOxHj4xqrzs9pzBwxJ3eMf98th5uftEcEwBw',
    minutes: 45,
    serves: 2,
    prep: {
      label: 'Mise en place',
      text: 'Defrost salmon fillets morning of in chilled bath',
      icon: 'restaurant_menu',
      tone: 'tertiary',
    },
    ingredients: ['Salmon fillets', 'Arborio rice', 'Meyer lemons', 'Asparagus', 'Parmesan'],
  },
  {
    id: 'poblano-enchiladas',
    title: 'Charred Poblano & Black Bean Enchiladas Suizas with Cilantro Crema',
    image:
      IMG +
      'AB6AXuCq_54vcTmNQhCP1GDafEzHXlPupPvRKxznsr8Ai-mEGyAkfObBuuEdHC23pjGUyky3_XtN9CA2Sze6_h2DD7iZ2v6iFg5HXqkAe4MRgVRbY41JbJk-3Pz7Hc3LWHVeGLqz-LaGQsvT9xAW7S7mlkNaAx5lI-YDCoPv6A5UMeAtygcJ1NdD_Gf1HUxvmf1tAFQ2Ob-ivXYuDSado4x3Joc0lIEkf0XNtaJmiWtNyuiReq3F8EP4mmOubw',
    minutes: 50,
    serves: 4,
    prep: {
      label: 'Mise en place',
      text: 'Roast and blend tomatillo salsa verde the night before',
      icon: 'skillet',
      tone: 'secondary',
    },
    ingredients: ['Poblano peppers', 'Black beans', 'Tomatillos', 'Corn tortillas', 'Cilantro'],
  },
  {
    id: 'tuscan-ragu',
    title: 'Tuscan Sausage & White Bean Ragù with Rigatoni & Shaved Pecorino',
    image:
      IMG +
      'AB6AXuAjnHCvCZ1KHDX2bYRtljnnj-h9H0wtBS7Z0w-PYbdgoTNtArbCCbee7qH7AL_ebLR2AlqIRnt55e2k469ljCylJqRFdedFXS7PO7GYnKpDIY2FQwLzFpH1AZ3Mrp1-EgldY_21EhcDTiGVUQmRZovxje1ieCxzY7LbESZZfZwfG6o1O6hVAAsYlhfMQWk3Ts78dqzuBTQgL4PablnZbY5xvVdu9K_9vQ1X0_dbButXpFrThrK79ahu9A',
    minutes: 60,
    serves: 4,
    prep: {
      label: 'Mise en place / Chef tip',
      text: 'Slow simmer ragù base for depth of flavor',
      icon: 'dinner_dining',
      tone: 'tertiary',
    },
    ingredients: ['Italian sausage', 'Cannellini beans', 'Rigatoni', 'Pecorino Romano', 'San Marzano tomatoes'],
  },
  {
    id: 'sourdough-pizza',
    title: 'Artisanal Neapolitan Sourdough Pizza Night with Hot Honey & Fresh Burrata',
    image:
      IMG +
      'AB6AXuDZrdwAMIUnNdJWP4NUDAlhB5IRvL-w432Tn5QIPJSP3cb_CvCrDrw1qH1gQU0o1yoJkUy_fmdS2FojFxmvYLfhpOSMJR7dSIV21v31grvShMRxyH8WD5cChvOMQZae09a8y7sKKwhKXUYk7_vh2EE_8MIVk46_v4RYm_LfDTOoOKhG3kGe4QEI7KHg9-argAqeIUyKQXFXKSs9oxFXNUNwEHrKdHnwOwPjkE0AqXOBxEPILT7AgbbNmQ',
    minutes: 40,
    serves: 4,
    highlight: 'Pizza Night • Family Feast',
    prep: {
      label: 'Kitchen timing',
      text: 'Preheat pizza stone to 500°F at 5:30 PM sharp',
      icon: 'local_fire_department',
      tone: 'secondary',
    },
    ingredients: ['Sourdough pizza dough', 'Burrata', 'Hot honey', 'Fresh basil'],
  },
  {
    id: 'roast-chicken',
    title: 'Lemon-Thyme Roast Chicken with Crispy Smashed Potatoes',
    minutes: 75,
    serves: 4,
    prep: {
      label: 'Mise en place',
      text: 'Dry-brine the chicken uncovered in the fridge overnight',
      icon: 'restaurant_menu',
      tone: 'tertiary',
    },
    ingredients: ['Whole chicken', 'Baby potatoes', 'Lemons', 'Fresh thyme'],
  },
  {
    id: 'miso-eggplant',
    title: 'Miso-Glazed Eggplant with Sesame Jasmine Rice & Quick Pickles',
    minutes: 35,
    serves: 2,
    prep: {
      label: 'Mise en place',
      text: 'Quick-pickle the cucumbers at lunch so they are bright by dinner',
      icon: 'eco',
      tone: 'tertiary',
    },
    ingredients: ['Japanese eggplant', 'White miso', 'Jasmine rice', 'Cucumbers'],
  },
  {
    id: 'lentil-dal',
    title: 'Coconut Red Lentil Dal with Blistered Garlic Naan',
    minutes: 30,
    serves: 4,
    prep: {
      label: 'Chef tip',
      text: 'Bloom whole spices in ghee just before serving for the tadka',
      icon: 'soup_kitchen',
      tone: 'secondary',
    },
    ingredients: ['Red lentils', 'Coconut milk', 'Naan', 'Fresh ginger'],
  },
  {
    id: 'short-ribs',
    title: 'Red Wine Braised Short Ribs over Creamy Parmesan Polenta',
    minutes: 180,
    serves: 6,
    highlight: 'Slow Sunday • Braise',
    prep: {
      label: 'Kitchen timing',
      text: 'Sear ribs and start the braise by 2:30 PM',
      icon: 'local_fire_department',
      tone: 'secondary',
    },
    ingredients: ['Bone-in short ribs', 'Dry red wine', 'Polenta', 'Carrots', 'Parmesan'],
  },
];

/** @type {Map<string, Recipe>} */
export const recipeById = new Map(recipes.map((r) => [r.id, r]));
