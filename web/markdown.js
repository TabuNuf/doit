// Markdown to HTML for reading epic documents and docs: headings, lists, checkboxes, bold, code, links,
// pipe tables and fenced blocks. Text is escaped first, so nothing in a document can inject markup.

import { esc } from "./state.js";

export function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\u0001([^\u0002]*)\u0002/g, '<span class="md-note">$1</span>');
}

function item(text) {
  const box = /^\[( |x|X)\]\s+(.*)$/.exec(text);
  if (!box) return `<li>${inline(text)}</li>`;
  const on = box[1] !== " ";
  return `<li class="check"><input type="checkbox" disabled ${on ? "checked" : ""} aria-label="${on ? "Done" : "Not done"}"> ${inline(box[2])}</li>`;
}

const SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const isTableAt = (rows, i) => rows[i].includes("|") && i + 1 < rows.length && rows[i + 1].includes("|") && SEPARATOR.test(rows[i + 1]);

/** The cells of a table row: outer pipes dropped, "\\|" kept inside a cell. */
function cells(row) {
  const t = row.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  return t.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, "|"));
}

function table(rows, i) {
  const head = cells(rows[i]);
  const body = [];
  for (i += 2; i < rows.length && rows[i].trim() && rows[i].includes("|"); i++) body.push(cells(rows[i]));
  const tr = (cs, tag) => `<tr>${head.map((_, k) => `<${tag}>${inline(cs[k] ?? "")}</${tag}>`).join("")}</tr>`;
  return { html: `<table><thead>${tr(head, "th")}</thead><tbody>${body.map(r => tr(r, "td")).join("")}</tbody></table>`, next: i };
}

// An HTML comment becomes a note: its text between these two marks, on one line, so the reader sees the note
// and not the markup. Fenced blocks and code spans keep their comments as written.
const OPEN = "\u0001", SHUT = "\u0002";
const NOTE_ROW = new RegExp(`^\\s*${OPEN}[^${SHUT}]*${SHUT}\\s*$`);

function markComments(text) {
  return text.split(/(^```[^\n]*\n[\s\S]*?(?:^```[^\n]*$|(?![\s\S])))/m).map((part, k) => k % 2 ? part
    : part.replace(/(`[^`\n]+`)|<!--([\s\S]*?)-->/g, (m, code, body) => code ?? (body.trim() ? OPEN + body.trim().replace(/\s*\n\s*/g, " ") + SHUT : ""))).join("");
}

export function renderMarkdown(md) {
  const out = [];
  const rows = markComments(String(md).replace(/\r/g, "")).split("\n");
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
      for (; i < rows.length && (/^\s*([-*]|\d+\.)\s+/.test(rows[i]) || (items.length && NOTE_ROW.test(rows[i]))); i++) {
        if (NOTE_ROW.test(rows[i])) items.push(items.pop().replace(/<\/li>$/, `<br>${inline(rows[i].trim())}</li>`));
        else items.push(item(rows[i].replace(/^\s*([-*]|\d+\.)\s+/, "")));
      }
      out.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }
    if (isTableAt(rows, i)) { const t = table(rows, i); out.push(t.html); i = t.next; continue; }
    const para = [];
    for (; i < rows.length && rows[i].trim() && !/^(#{1,6}\s|```|\s*([-*]|\d+\.)\s)/.test(rows[i]) && !(para.length && isTableAt(rows, i)); i++) para.push(rows[i].trim());
    out.push(`<p>${para.map(inline).join("<br>")}</p>`);
  }
  return out.join("\n");
}
