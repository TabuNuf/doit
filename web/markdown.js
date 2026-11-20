// Markdown to HTML for reading epic documents: headings, lists, checkboxes, bold, code, links
// and fenced blocks. Text is escaped first, so nothing in a document can inject markup.

import { esc } from "./state.js";

function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function item(text) {
  const box = /^\[( |x|X)\]\s+(.*)$/.exec(text);
  if (!box) return `<li>${inline(text)}</li>`;
  const on = box[1] !== " ";
  return `<li class="check"><input type="checkbox" disabled ${on ? "checked" : ""} aria-label="${on ? "Done" : "Not done"}"> ${inline(box[2])}</li>`;
}

export function renderMarkdown(md) {
  const out = [];
  const rows = String(md).replace(/\r/g, "").split("\n");
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (!row.trim()) { i++; continue; }
    if (/^```/.test(row)) {
      const code = [];
      for (i++; i < rows.length && !/^```/.test(rows[i]); i++) code.push(rows[i]);
      i++;
      out.push(`<pre>${esc(code.join("\n"))}</pre>`);
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(row);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    const list = /^(\s*)([-*]|\d+\.)\s+/.exec(row);
    if (list) {
      const tag = /\d/.test(list[2]) ? "ol" : "ul";
      const items = [];
      for (; i < rows.length && /^\s*([-*]|\d+\.)\s+/.test(rows[i]); i++) items.push(item(rows[i].replace(/^\s*([-*]|\d+\.)\s+/, "")));
      out.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }
    const para = [];
    for (; i < rows.length && rows[i].trim() && !/^(#{1,6}\s|```|\s*([-*]|\d+\.)\s)/.test(rows[i]); i++) para.push(rows[i].trim());
    out.push(`<p>${para.map(inline).join("<br>")}</p>`);
  }
  return out.join("\n");
}
