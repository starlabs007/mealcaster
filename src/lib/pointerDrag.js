// Drag-and-drop on pointer events: one code path for mouse, touch and pen. The browser's own HTML drag-and-drop
// is unreliable with touch on iOS Safari, which is why this exists.
//
// Standalone on purpose (no framework, no runes, no imports) so it can be copied into other projects:
//
//   const drag = createPointerDrag({ canDrop, onOver, onDrop, onEnd });
//   const detach = drag.handle('item-1')(handleElement);   // Svelte: {@attach drag.handle(id)}
//   <li data-drag-source data-drop-id="item-2">…</li>       // what floats / where it can land
//
// Pressing the handle and moving past `threshold` starts the drag; a press without movement stays an ordinary
// click. While dragging, a fixed copy of the source element follows the pointer, the page scrolls near the
// scroller's edges, and Escape cancels. The source element gets a `data-dragging` attribute for styling.

/**
 * @typedef {object} PointerDragOptions
 * @property {string} [targetSelector] drop targets; default `[data-drop-id]`
 * @property {(target: Element) => string | undefined} [targetId] a target's id; default its `data-drop-id`
 * @property {(handle: Element) => Element} [source] the element that floats; default the handle's closest
 *   `[data-drag-source]`, else the handle itself
 * @property {(sourceId: string, targetId: string) => boolean} [canDrop] default: any target but the source
 * @property {'x' | 'y'} [axis] keep the floating copy on one axis
 * @property {number} [threshold] px the pointer moves before a press becomes a drag (default 5)
 * @property {{ edge?: number, speed?: number, insets?: Insets | (() => Insets) } | false} [autoScroll] scroll when
 *   within `edge` px of the scroller's edge, up to `speed` px per frame (defaults 64 / 18); `insets` move the edges
 *   in, e.g. below a fixed header; false turns it off
 * @property {Element | Window} [scroller] what auto-scroll scrolls (default window)
 * @property {string} [ghostClass] classes added to the floating copy
 * @property {number} [zIndex] of the floating copy (default 1000)
 * @property {(sourceId: string, ghost: HTMLElement) => void} [onStart] after the floating copy (`ghost`) is made
 * @property {(targetId: string | null, ghost: HTMLElement) => void} [onOver] the droppable target under the pointer
 *   changed; `ghost` lets you show on the floating copy what dropping will do
 * @property {(sourceId: string, targetId: string) => void} [onDrop]
 * @property {(sourceId: string) => void} [onCancel] Escape, a drop outside any target, or a lost pointer
 * @property {(sourceId: string) => void} [onEnd] after onDrop / onCancel, always
 */

/** @typedef {{ top?: number, right?: number, bottom?: number, left?: number }} Insets */

/** Has the pointer moved far enough to start dragging? */
export function passedThreshold(dx, dy, threshold) {
  return dx * dx + dy * dy >= threshold * threshold;
}

/** The pointer offset with the other axis zeroed when `axis` is set. */
export function constrain(axis, dx, dy) {
  return { dx: axis === 'y' ? 0 : dx, dy: axis === 'x' ? 0 : dy };
}

/**
 * Auto-scroll step along one axis: negative within `edge` px of `start`, positive within `edge` px of `end`,
 * ramping up to `speed` at (and past) the edge; 0 in between.
 */
export function edgeScrollSpeed(pos, start, end, edge, speed) {
  const ramp = (depth) => Math.round(Math.min(1, depth / edge) * speed);
  if (pos < start + edge) return -ramp(start + edge - pos);
  if (pos > end - edge) return ramp(pos - (end - edge));
  return 0;
}

/**
 * The id of the drop target containing `hit`, or null when it isn't one or can't take the drop.
 * @param {Element | null} hit @param {string} sourceId
 * @param {Pick<Required<PointerDragOptions>, 'targetSelector' | 'targetId' | 'canDrop'>} options
 */
export function findTarget(hit, sourceId, { targetSelector, targetId, canDrop }) {
  const target = hit?.closest(targetSelector);
  const id = target ? targetId(target) : undefined;
  return id && id !== sourceId && canDrop(sourceId, id) ? id : null;
}

/** @param {PointerDragOptions} [options] */
export function createPointerDrag(options = {}) {
  const o = {
    targetSelector: '[data-drop-id]',
    targetId: (/** @type {Element} */ el) => /** @type {HTMLElement} */ (el).dataset.dropId,
    source: (/** @type {Element} */ handle) => handle.closest('[data-drag-source]') ?? handle,
    canDrop: () => true,
    threshold: 5,
    zIndex: 1000,
    ...options,
    autoScroll: options.autoScroll === false ? false : { edge: 64, speed: 18, ...options.autoScroll },
  };

  /**
   * The press or drag in progress.
   * @type {null | { id: string, handle: HTMLElement, pointerId: number, x0: number, y0: number, x: number, y: number,
   *   dragging: boolean, over: string | null, source?: HTMLElement, ghost?: HTMLElement, frame?: number,
   *   restore?: () => void, stop: () => void }}
   */
  let s = null;

  /** Attaches drag behaviour to a handle element; returns the detach function. @param {string} id */
  function handle(id) {
    return (/** @type {HTMLElement} */ el) => {
      // No panning, long-press callout or text selection starting on the handle, so touch drags instead.
      Object.assign(el.style, { touchAction: 'none', userSelect: 'none', webkitUserSelect: 'none', webkitTouchCallout: 'none' });
      const down = (/** @type {PointerEvent} */ e) => press(e, el, id);
      el.addEventListener('pointerdown', down);
      return () => {
        el.removeEventListener('pointerdown', down);
        if (s?.handle === el) cancel();
      };
    };
  }

  /** @param {PointerEvent} e @param {HTMLElement} el @param {string} id */
  function press(e, el, id) {
    if (s || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); // no text selection or emulated mouse events
    const move = (/** @type {PointerEvent} */ ev) => ev.pointerId === s?.pointerId && moved(ev.clientX, ev.clientY);
    const up = (/** @type {PointerEvent} */ ev) => ev.pointerId === s?.pointerId && release();
    const lost = (/** @type {PointerEvent} */ ev) => ev.pointerId === s?.pointerId && cancel();
    const key = (/** @type {KeyboardEvent} */ ev) => {
      if (ev.key !== 'Escape' || !s?.dragging) return;
      ev.preventDefault();
      ev.stopPropagation();
      cancel();
    };
    const scrolled = () => s?.dragging && hover();
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', lost);
    el.addEventListener('lostpointercapture', lost);
    window.addEventListener('keydown', key, true);
    window.addEventListener('scroll', scrolled, true);
    s = {
      id, handle: el, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dragging: false, over: null,
      stop: () => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', lost);
        el.removeEventListener('lostpointercapture', lost);
        window.removeEventListener('keydown', key, true);
        window.removeEventListener('scroll', scrolled, true);
      },
    };
    // Keep getting moves once the pointer leaves the handle (touch captures implicitly, mouse doesn't).
    try { el.setPointerCapture(e.pointerId); } catch {}
  }

  function moved(x, y) {
    if (!s) return;
    s.x = x;
    s.y = y;
    if (!s.dragging) {
      if (!passedThreshold(x - s.x0, y - s.y0, o.threshold)) return;
      begin();
    }
    place();
    hover();
  }

  function begin() {
    if (!s) return;
    const source = /** @type {HTMLElement} */ (o.source(s.handle));
    const rect = source.getBoundingClientRect();
    const ghost = /** @type {HTMLElement} */ (source.cloneNode(true));
    for (const el of [ghost, ...ghost.querySelectorAll('[id], [data-drop-id]')]) {
      el.removeAttribute('id');
      el.removeAttribute('data-drop-id');
    }
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    if (o.ghostClass) ghost.classList.add(...o.ghostClass.split(/\s+/).filter(Boolean));
    Object.assign(ghost.style, {
      position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
      margin: '0', boxSizing: 'border-box', pointerEvents: 'none', zIndex: String(o.zIndex), willChange: 'transform',
      transition: 'none', // a transition copied from the source would make the copy trail behind the pointer
    });
    document.body.append(ghost);
    source.setAttribute('data-dragging', '');

    const root = document.documentElement.style;
    const before = { cursor: root.cursor, userSelect: root.userSelect, webkitUserSelect: root.webkitUserSelect };
    Object.assign(root, { cursor: 'grabbing', userSelect: 'none', webkitUserSelect: 'none' });

    Object.assign(s, {
      dragging: true, source, ghost,
      restore: () => {
        Object.assign(root, before);
        ghost.remove();
        source.removeAttribute('data-dragging');
      },
    });
    o.onStart?.(s.id, ghost);
    if (o.autoScroll) s.frame = requestAnimationFrame(scrollStep);
  }

  function place() {
    if (!s?.ghost) return;
    const { dx, dy } = constrain(o.axis, s.x - s.x0, s.y - s.y0);
    s.ghost.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function hover() {
    if (!s) return;
    const over = findTarget(document.elementFromPoint(s.x, s.y), s.id, o);
    if (over === s.over) return;
    s.over = over;
    if (s.ghost) o.onOver?.(over, s.ghost);
  }

  function scrollStep() {
    if (!s?.dragging || !o.autoScroll) return;
    const { edge, speed, insets } = o.autoScroll;
    const rect = !o.scroller || o.scroller === window
      ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
      : /** @type {Element} */ (o.scroller).getBoundingClientRect();
    const inset = (typeof insets === 'function' ? insets() : insets) ?? {};
    const box = {
      left: rect.left + (inset.left ?? 0), top: rect.top + (inset.top ?? 0),
      right: rect.right - (inset.right ?? 0), bottom: rect.bottom - (inset.bottom ?? 0),
    };
    const left = o.axis === 'y' ? 0 : edgeScrollSpeed(s.x, box.left, box.right, edge, speed);
    const top = o.axis === 'x' ? 0 : edgeScrollSpeed(s.y, box.top, box.bottom, edge, speed);
    if (left || top) (o.scroller ?? window).scrollBy(left, top); // the scroll listener re-runs hover()
    s.frame = requestAnimationFrame(scrollStep);
  }

  function release() {
    if (!s) return;
    if (!s.dragging) return finish(); // a plain press: let the click through
    const { id, over } = s;
    if (over) {
      swallowClick();
      finish();
      o.onDrop?.(id, over);
      o.onEnd?.(id);
    } else cancel();
  }

  /** Stops the drag in progress, if any, as a cancel. */
  function cancel() {
    if (!s) return;
    const { id, dragging } = s;
    if (dragging) swallowClick();
    finish();
    if (!dragging) return;
    o.onCancel?.(id);
    o.onEnd?.(id);
  }

  function finish() {
    if (!s) return;
    const { handle: el, pointerId, frame, restore, stop } = s;
    s = null;
    stop(); // before releasing capture, whose lostpointercapture would otherwise cancel
    try { el.releasePointerCapture(pointerId); } catch {}
    if (frame) cancelAnimationFrame(frame);
    restore?.();
  }

  // The click that follows the pointerup of a drag isn't a press of the handle.
  function swallowClick() {
    const block = (/** @type {Event} */ e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('click', block, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', block, true));
  }

  return {
    handle,
    cancel,
    /** Whether a drag (not just a press) is in progress. */
    get dragging() {
      return !!s?.dragging;
    },
  };
}
