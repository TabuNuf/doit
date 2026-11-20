// Column widths: drag the gaps between the three panes (or focus one and use the arrow keys).
// Each view (Board, Docs) has its own widths, kept in two CSS variables and remembered in this browser.

export const DEFAULTS = { left: 250, right: 360 };
export const VIEW_DEFAULTS = { board: DEFAULTS, docs: { left: 250, right: 300 } };
const MIN = { left: 160, right: 260, middle: 320 };
const KEYS = { board: "doit.columns", docs: "doit.columns.docs" };
const RAIL = 34;

/** Keeps both side columns at their minimum or more and leaves the middle one room. */
export function clampWidths({ left, right }, total) {
  const l = Math.max(MIN.left, Math.min(left, total - MIN.middle - MIN.right - 20));
  const r = Math.max(MIN.right, Math.min(right, total - MIN.middle - l - 20));
  return { left: Math.round(l), right: Math.round(r) };
}

/** The widths saved for a view, over its defaults. */
export function loadWidths(view, storage) {
  try { return { ...VIEW_DEFAULTS[view], ...JSON.parse(storage?.getItem(KEYS[view]) || "{}") }; } catch { return { ...VIEW_DEFAULTS[view] }; }
}

let view = "board";
let rightClosed = false;
let widths = { ...DEFAULTS };
let wrap = null;

const storage = () => { try { return localStorage; } catch { return null; } };

function apply() {
  if (!wrap) return;
  widths = clampWidths(widths, wrap.clientWidth || Infinity);
  wrap.classList.toggle("right-closed", rightClosed);
  wrap.style.setProperty("--w-left", widths.left + "px");
  wrap.style.setProperty("--w-right", (rightClosed ? RAIL : widths.right) + "px");
  wrap.querySelectorAll(".gutter").forEach(g => g.setAttribute("aria-valuenow", widths[g.dataset.gutter]));
}

function save() { try { localStorage.setItem(KEYS[view], JSON.stringify(widths)); } catch { /* storage off */ } }

/** Switches to a view's own widths; `closed` folds the right column to a rail. */
export function setLayout(nextView, closed = false) {
  if (nextView === view && closed === rightClosed) return;
  if (nextView !== view) { view = nextView; widths = loadWidths(view, storage()); }
  rightClosed = closed;
  apply();
}

export function initResize() {
  wrap = document.querySelector(".panes-wrap");
  widths = loadWidths(view, storage());
  apply();
  window.addEventListener("resize", apply);

  for (const g of wrap.querySelectorAll(".gutter")) {
    const side = g.dataset.gutter;
    g.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      g.setPointerCapture(ev.pointerId);
      document.body.classList.add("resizing");
    });
    g.addEventListener("pointermove", ev => {
      if (!g.hasPointerCapture(ev.pointerId)) return;
      const box = wrap.getBoundingClientRect();
      widths[side] = side === "left" ? ev.clientX - box.left - 5 : box.right - ev.clientX - 5;
      apply();
    });
    g.addEventListener("pointerup", () => { document.body.classList.remove("resizing"); save(); });
    g.addEventListener("dblclick", () => { widths[side] = VIEW_DEFAULTS[view][side]; apply(); save(); });
    g.addEventListener("keydown", ev => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      ev.preventDefault();
      const grow = (ev.key === "ArrowRight") === (side === "left");
      widths[side] += grow ? 20 : -20;
      apply(); save();
    });
  }
}
