// Copy for open (unplanned) dinner slots, indexed Monday (0) → Sunday (6).
// `alt` is the secondary action shown beside "Choose a Meal".

/** @typedef {'surprise' | 'diningOut' | 'browse'} AltAction */

/** @type {{ tag: string, icon: string, title: string, text: string, alt: { action: AltAction, label: string, icon: string } }[]} */
export const slotPrompts = [
  {
    tag: 'Fresh start',
    icon: 'eco',
    title: 'Kick off the week with Monday dinner',
    text: 'Ease into the week with something light that leaves leftovers for tomorrow’s lunch.',
    alt: { action: 'surprise', label: 'Surprise Me', icon: 'casino' },
  },
  {
    tag: 'Slot open',
    icon: 'restaurant',
    title: 'No dinner planned yet for Tuesday',
    text: 'Weeknight rhythm — pick something quick or revisit a household favorite.',
    alt: { action: 'surprise', label: 'Surprise Me', icon: 'casino' },
  },
  {
    tag: 'Slot open',
    icon: 'restaurant',
    title: 'No dinner planned yet for Wednesday',
    text: 'Mid-week evening — choose a quick 20-minute meal or browse your saved household favorites.',
    alt: { action: 'surprise', label: 'Surprise Me', icon: 'casino' },
  },
  {
    tag: 'Slot open',
    icon: 'skillet',
    title: 'Thursday dinner is still open',
    text: 'Almost the weekend — a one-pan supper keeps the cleanup short.',
    alt: { action: 'surprise', label: 'Surprise Me', icon: 'casino' },
  },
  {
    tag: 'Friday',
    icon: 'local_pizza',
    title: 'Friday night is wide open',
    text: 'Celebrate the week with pizza night, tacos, or a cozy shared platter.',
    alt: { action: 'diningOut', label: 'Dining Out / Leftovers', icon: 'storefront' },
  },
  {
    tag: 'Weekend',
    icon: 'wine_bar',
    title: 'What’s for Saturday dinner?',
    text: 'Plan a leisurely weekend feast, invite friends over, or mark this slot for dining out.',
    alt: { action: 'diningOut', label: 'Dining Out / Leftovers', icon: 'storefront' },
  },
  {
    tag: 'Gathering',
    icon: 'soup_kitchen',
    title: 'Sunday Family Dinner slot open',
    text: 'Great moment for batch cooking, braised slow cooker roasts, or fragrant sourdough focaccia.',
    alt: { action: 'browse', label: 'Browse Recipes', icon: 'menu_book' },
  },
];
