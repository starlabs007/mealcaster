// What a day card offers, on plain data. The planner's list card (DayListCard) and week-grid card (DayGridCard) show
// the same evening, so they share these rules; the labels, icons and handlers stay in the components.

/** Whether the evening has a meal: planned or already cooked. @param {string} status */
export const hasMeal = (status) => status === 'planned' || status === 'completed';

/**
 * Which markers sit beside the date: Tonight stays on today's card after Mark Done, with Completed added; a finished
 * evening before today carries no chip (its tint says so).
 * @param {{ status: string, isToday: boolean, isPast: boolean }} day
 */
export const dayMarkers = ({ status, isToday, isPast }) => ({ tonight: isToday, completed: status === 'completed' && !isPast });

/**
 * Whether a planned meal can be moved: some other evening of the week can take it (Switch Days… or dragging).
 * @param {string} status @param {number} targetCount how many evenings could take it
 */
export const isMovable = (status, targetCount) => status === 'planned' && targetCount > 0;

/**
 * The ⋯ menu's actions by id, in groups (each group after the first starts with a rule).
 * - Open evening: Night Off only (Surprise Me already sits beside Choose a Meal).
 * - Planned evening: change the meal (Swap, Surprise Me) · move it (Switch Days, when it can move and the screen can
 *   switch) · take the evening out of the plan (Night Off, Clear Evening).
 * - Any other status has no menu.
 * - Minimal view keeps the menu on tonight only.
 * @param {{ status: string, isToday: boolean, minimal?: boolean, movable: boolean, canSwitch: boolean }} day
 * @returns {string[][]}
 */
export function dayActionGroups({ status, isToday, minimal = false, movable, canSwitch }) {
  if (minimal && !isToday) return [];
  if (status === 'open') return [['nightOff']];
  if (status !== 'planned') return [];
  return [['swap', 'surprise'], canSwitch && movable ? ['switch'] : [], ['nightOff', 'clear']];
}
