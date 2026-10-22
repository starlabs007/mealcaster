// A ⋯ menu's groups as one flat list: each group after the first begins with a divider (see ActionMenu).
// Empty groups are dropped, so a missing group never leaves a stray rule. Plain JS so node tests can load it.

/**
 * @template {object} A
 * @param {A[][]} groups
 * @returns {(A & { divider?: boolean })[]}
 */
export function groupedActions(groups) {
  return groups
    .filter((group) => group.length)
    .flatMap((group, at) => group.map((action, i) => (at > 0 && i === 0 ? { ...action, divider: true } : action)));
}
