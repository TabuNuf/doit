// Keeps each pane's scroll position across a redraw, so a live reload does not jump the reader to the top.
// A pane is matched by its data-scroll key (the document or task it shows) or else by its place and title.

/** The key a scrolled pane body is remembered under; `i` is its place among the pane bodies. */
export function scrollKey(el, i) {
  if (el.dataset.scroll) return el.dataset.scroll;
  const pane = el.closest(".pane");
  const title = pane?.getAttribute("aria-label") || pane?.querySelector(".pane-h")?.firstChild?.textContent || "";
  return `${i}:${title}`;
}

/** Notes every pane body's scroll in `root`; the returned function puts it back after `root` is redrawn. */
export function keepScroll(root) {
  const saved = new Map();
  root.querySelectorAll(".pane-b").forEach((el, i) => { if (el.scrollTop || el.scrollLeft) saved.set(scrollKey(el, i), [el.scrollTop, el.scrollLeft]); });
  return () => {
    if (!saved.size) return;
    root.querySelectorAll(".pane-b").forEach((el, i) => {
      const at = saved.get(scrollKey(el, i));
      if (at) [el.scrollTop, el.scrollLeft] = at;
    });
  };
}
