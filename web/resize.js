// Column widths: drag the gaps between the three panes (or focus one and use the arrow keys).
// Widths live in two CSS variables and are remembered in this browser.

export const DEFAULTS = { left: 250, right: 360 };
const MIN = { left: 160, right: 260, middle: 320 };
const KEY = "doit.columns";

/** Keeps both side columns at their minimum or more and leaves the middle one room. */
export function clampWidths({ left, right }, total) {
  const l = Math.max(MIN.left, Math.min(left, total - MIN.middle - MIN.right - 20));
  const r = Math.max(MIN.right, Math.min(right, total - MIN.middle - l - 20));
  return { left: Math.round(l), right: Math.round(r) };
}

let widths = { ...DEFAULTS };

function apply(wrap) {
  widths = clampWidths(widths, wrap.clientWidth || Infinity);
  wrap.style.setProperty("--w-left", widths.left + "px");
  wrap.style.setProperty("--w-right", widths.right + "px");
  wrap.querySelectorAll(".gutter").forEach(g => g.setAttribute("aria-valuenow", widths[g.dataset.gutter]));
}

function save() { try { localStorage.setItem(KEY, JSON.stringify(widths)); } catch { /* storage off */ } }

export function initResize() {
  const wrap = document.querySelector(".panes-wrap");
  try { widths = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { /* storage off */ }
  apply(wrap);
  window.addEventListener("resize", () => apply(wrap));

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
      apply(wrap);
    });
    g.addEventListener("pointerup", () => { document.body.classList.remove("resizing"); save(); });
    g.addEventListener("dblclick", () => { widths[side] = DEFAULTS[side]; apply(wrap); save(); });
    g.addEventListener("keydown", ev => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      ev.preventDefault();
      const grow = (ev.key === "ArrowRight") === (side === "left");
      widths[side] += grow ? 20 : -20;
      apply(wrap); save();
    });
  }
}
