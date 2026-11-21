// The contact commands of the doit CLI. Cli parses, this class runs them against the ContactBook.
// Files are read through `readText(path)`, given by the root: the CLI tier does not touch the disk.

import { mapStreamers } from "../domain/contactImport.js";

export class ContactsCli {
  constructor(book, print, readText) {
    this.book = book;
    this.print = print;
    this.readText = readText;
  }

  /** `contacts import <file>` */
  contacts(pos) {
    if (pos[0] === "import") return this.#import(pos[1]);
    throw new Error("Usage: doit contacts import <file>");
  }

  #import(file) {
    if (!file) throw new Error("Usage: doit contacts import <file>");
    const { added, updated, skipped } = this.book.import(mapStreamers(this.readText(file)));
    this.print(`Imported: ${added} added, ${updated} updated, ${skipped} skipped`);
  }
}
