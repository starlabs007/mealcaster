import { test } from 'node:test';
import assert from 'node:assert/strict';
import { constrain, edgeScrollSpeed, findTarget, passedThreshold, pressStep } from '../src/lib/pointerDrag.js';

test('a press becomes a drag once the pointer moves the threshold distance in any direction', () => {
  assert.equal(passedThreshold(0, 0, 5), false);
  assert.equal(passedThreshold(3, 3, 5), false); // ~4.2 px
  assert.equal(passedThreshold(3, 4, 5), true); // exactly 5 px
  assert.equal(passedThreshold(-6, 0, 5), true);
});

test('a touch that moves before its hold time is up scrolls the page instead of dragging', () => {
  const step = (held, dx, dy) => pressStep({ held, dx, dy, threshold: 5, holdTolerance: 8 });
  assert.equal(step(false, 3, 4), 'wait'); // a shaky finger keeps holding
  assert.equal(step(false, 0, 8), 'release'); // a swipe: the page scrolls
  assert.equal(step(false, 0, 40), 'release');
});

test('a held press (a mouse, or a touch past its hold time) drags once it moves the threshold distance', () => {
  const step = (dx, dy) => pressStep({ held: true, dx, dy, threshold: 5, holdTolerance: 8 });
  assert.equal(step(3, 3), 'wait');
  assert.equal(step(3, 4), 'drag');
  assert.equal(step(0, 40), 'drag'); // moving past the touch tolerance doesn't matter once held
});

test('an axis keeps the floating copy on that axis', () => {
  assert.deepEqual(constrain('y', 30, -40), { dx: 0, dy: -40 });
  assert.deepEqual(constrain('x', 30, -40), { dx: 30, dy: 0 });
  assert.deepEqual(constrain(undefined, 30, -40), { dx: 30, dy: -40 });
});

test('auto-scroll ramps up towards an edge and stays still in the middle', () => {
  const speed = (pos) => edgeScrollSpeed(pos, 100, 900, 50, 20);
  assert.equal(speed(500), 0);
  assert.equal(speed(150), 0); // just outside the top band
  assert.equal(speed(125), -10); // halfway into it
  assert.equal(speed(100), -20); // at the edge
  assert.equal(speed(40), -20); // past it (pointer over a fixed header) stays at full speed
  assert.equal(speed(875), 10);
  assert.equal(speed(950), 20);
});

// Just enough of an element for findTarget: closest() walks up `parent`.
function el(attrs = {}, parent = null) {
  return {
    attrs, parent,
    closest(selector) {
      const name = selector.slice(1, -1); // '[data-drop-id]' → 'data-drop-id'
      for (let node = this; node; node = node.parent) if (name in node.attrs) return node;
      return null;
    },
  };
}
const options = (canDrop = () => true) => ({ targetSelector: '[data-drop-id]', targetId: (t) => t.attrs['data-drop-id'], canDrop });

test('the drop target is the nearest marked ancestor of what is under the pointer', () => {
  const card = el({ 'data-drop-id': 'thu' });
  const title = el({}, el({}, card));
  assert.equal(findTarget(title, 'tue', options()), 'thu');
  assert.equal(findTarget(card, 'tue', options()), 'thu');
});

test('nothing, the source itself or a refused target is no target', () => {
  assert.equal(findTarget(null, 'tue', options()), null);
  assert.equal(findTarget(el({}), 'tue', options()), null);
  assert.equal(findTarget(el({ 'data-drop-id': 'tue' }), 'tue', options()), null);
  const seen = [];
  const refuse = (from, to) => (seen.push([from, to]), false);
  assert.equal(findTarget(el({ 'data-drop-id': 'sun' }), 'tue', options(refuse)), null);
  assert.deepEqual(seen, [['tue', 'sun']]);
});
