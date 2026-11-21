// DocsLibrary: the docs facade the interfaces use. It knows which paths are allowed and
// which tasks cite a document, not the files. Pure: the DocsSource port does the I/O.
//
// The source it is given provides, per project id and docs-relative path:
//   tree(project) -> nested {type, name, path, children?, folded?} nodes
//   read(project, path) -> text | null, write(project, path, text),
//   lastChange(project, path) -> {author, date} | null

/** An error the interfaces turn into a status: 400 for a refused path, 404 for a missing file. */
export class DocsError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

/** The normalized relative path of a Markdown document inside the docs folder; throws when it may not be used. */
export function checkDocPath(input) {
  const p = typeof input === "string" ? input.trim() : "";
  if (!p) throw new DocsError("A document path is needed");
  if (p.includes("\\")) throw new DocsError(`Path may not contain a backslash: ${p}`);
  if (p.startsWith("/") || /^[A-Za-z]:/.test(p)) throw new DocsError(`Path must be inside the docs folder: ${p}`);
  const parts = p.split("/").filter(Boolean);
  if (parts.includes("..")) throw new DocsError(`Path may not contain "..": ${p}`);
  if (parts.some(s => s.startsWith("."))) throw new DocsError(`Path may not enter a hidden file or folder: ${p}`);
  if (!parts.length || !parts[parts.length - 1].endsWith(".md")) throw new DocsError(`Only .md documents can be used: ${p}`);
  return parts.join("/");
}

export class DocsLibrary {
  constructor(source, board) {
    this.source = source;
    this.board = board;
  }

  tree(project) { return this.source.tree(project); }

  read(project, path) {
    const rel = checkDocPath(path);
    const text = this.source.read(project, rel);
    if (text === null) throw new DocsError(`No document ${rel} in ${project}`, 404);
    return { path: rel, text, lastChange: this.source.lastChange(project, rel) };
  }

  save(project, path, text) {
    const rel = checkDocPath(path);
    if (typeof text !== "string") throw new DocsError("The document text is needed");
    this.source.write(project, rel, text);
    return this.read(project, rel);
  }

  /** Open tasks of the project whose description or done-when names the document's file name. */
  linked(project, path) {
    const name = checkDocPath(path).split("/").pop();
    return this.board.list({ project, state: "open" })
      .filter(t => `${t.description || ""}\n${t.doneWhen || ""}`.includes(name))
      .map(t => ({ project: t.project, id: t.id, title: t.title }));
  }
}
