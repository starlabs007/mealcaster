// Grocery store departments the Quick Grocery List is grouped by.

/** @typedef {'produce' | 'meat' | 'dairy' | 'pantry'} Dept */

export const departments = [
  { id: 'produce', label: 'Fresh Produce & Herbs', short: 'Produce', icon: 'eco', where: 'Aisle 1 & Wet Rack', color: '#4a6b56' },
  { id: 'meat', label: 'Meat & Fresh Seafood', short: 'Seafood & Meat', icon: 'set_meal', where: 'Butcher & Fishmonger', color: '#a23e18' },
  { id: 'dairy', label: 'Dairy & Refrigerated', short: 'Dairy', icon: 'egg_alt', where: 'Cheese Counter & Dairy Wall', color: '#865c00' },
  { id: 'pantry', label: 'Pantry, Grains & Spices', short: 'Pantry', icon: 'shelves', where: 'Center Aisles', color: '#727973' },
];
