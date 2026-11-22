// Small labelled chips shared by the Detail column's pages.

import { esc } from "./state.js";

const MARKS = { human: "\u{1F9D1}", ai: "\u{1F916}" };

/** A chip for who owns a task: warm "you" for the designer, cool "claude" for Claude. */
export function whoChip(owner, text) {
  const you = owner === "human";
  return `<span class="chip ${you ? "you" : "claude"}">${MARKS[you ? "human" : "ai"]} ${esc(text ?? (you ? "You" : "Claude"))}</span>`;
}
