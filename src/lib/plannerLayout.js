// How the planner's week grid is laid out, on plain data (routes/WeeklyPlanner.svelte renders it): from `xl` one row of
// seven with tonight's column wider; below `xl` an 8-track grid. Also which look each card has while a meal is dragged.

/** Tracks in the grid below `xl`. */
export const GRID_TRACKS = 8;

/**
 * One entry per day of the viewed week. Past days beside a live week are narrow tiles (a fully past or future week
 * keeps full cards). Below `xl` a tile takes 1 track and an evening 2, so tonight always lands in the first row; after an
 * odd number of tiles tonight takes 3, which fills that row and makes it wider, as from `xl`.
 * @param {{ iso: string, isToday: boolean, isPast: boolean }[]} days
 * @returns {{ iso: string, compact: boolean, wideTonight: boolean, tracks: 1 | 2 | 3, column: '1.6fr' | '0.55fr' | '1fr' }[]}
 */
export function gridPlan(days) {
  const live = days.some((d) => !d.isPast);
  const tile = (d) => d.isPast && live;
  const oddTiles = days.filter(tile).length % 2 === 1;
  return days.map((d) => {
    const compact = tile(d);
    const wideTonight = d.isToday && oddTiles;
    return {
      iso: d.iso,
      compact,
      wideTonight,
      tracks: compact ? 1 : wideTonight ? 3 : 2,
      // From `xl`: tonight 1.6 wide, tiles narrow (a day that is today is never a tile).
      column: d.isToday ? '1.6fr' : compact ? '0.55fr' : '1fr',
    };
  });
}

/** The `grid-template-columns` from `xl`. @param {ReturnType<typeof gridPlan>} plan */
export const columnTemplate = (plan) => plan.map((p) => p.column).join(' ');

/**
 * A card's look while a meal is dragged: the one it came from, the one under the pointer, the ones it can go to, the
 * rest; none when nothing is dragged.
 * @param {{ from: string, over: string, targets: string[] }} drag @param {string} iso
 * @returns {'' | 'source' | 'over' | 'target' | 'off'}
 */
export function dropState(drag, iso) {
  if (!drag.from) return '';
  if (iso === drag.from) return 'source';
  if (iso === drag.over) return 'over';
  return drag.targets.includes(iso) ? 'target' : 'off';
}
