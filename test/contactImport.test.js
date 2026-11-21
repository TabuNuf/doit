import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { ContactBook } from "../src/domain/contactBook.js";
import { parseCsv, mapStreamers, reachOf, channelKind } from "../src/domain/contactImport.js";
import { MemoryContacts } from "./memoryContacts.js";

const csv = fs.readFileSync(new URL("./fixtures/new-streamers.csv", import.meta.url), "utf8");
const shelf = { list: () => [], has: () => false };
const book = () => new ContactBook(new MemoryContacts(), shelf, () => new Date("2026-11-21T10:00:00"));

test("the CSV parser handles quotes, commas and newlines in quoted fields", () => {
  assert.deepEqual(parseCsv('a,"b,c","d ""e""\nf"\r\ng,,h\n'), [["a", "b,c", 'd "e"\nf'], ["g", "", "h"]]);
});

test("reach and channel kinds", () => {
  assert.equal(reachOf("b"), "B");
  assert.equal(reachOf("2,500"), "C");
  assert.equal(reachOf("30"), "");
  assert.equal(channelKind("https://twitch.tv/x"), "twitch");
  assert.equal(channelKind("https://www.youtube.com/@x"), "youtube");
  assert.equal(channelKind("https://example.test"), "website");
});

test("the mapper skips BB1 and BB2 and reads touches", () => {
  const rows = mapStreamers(csv);
  assert.equal(rows.length, 5);
  assert.ok(rows.every(r => !r.notes.includes("BB")));
  const pat = rows[0];
  assert.deepEqual(pat.touches, [{ kind: "reply", date: "2026-10-12" }]);
  assert.equal(pat.notes, "Likes cozy games, plays weekly\nGenre: Co-op\nPlatform: PC");
  assert.deepEqual(rows[2].touches, [{ kind: "reply", date: "" }, { kind: "video", date: "" }]);
});

test("importing the fixture twice gives five contacts and touches once", () => {
  const b = book();
  assert.deepEqual(b.import(mapStreamers(csv)), { added: 5, updated: 0, skipped: 0 });
  assert.deepEqual(b.import(mapStreamers(csv)), { added: 0, updated: 5, skipped: 0 });
  const all = b.list();
  assert.equal(all.length, 5);
  const by = n => all.find(c => c.name === n);
  assert.deepEqual(by("Pixel Pat").touches, [{ date: "2026-10-12", kind: "reply", game: "" }]);
  assert.equal(by("Moss Gamer").reach, "C");
  assert.deepEqual(by("Moss Gamer").touches, [{ date: "2026-10-20", kind: "video", game: "" }]);
  assert.deepEqual(by("Quiet Quinn").touches.map(t => t.kind).sort(), ["reply", "video"]);
  assert.deepEqual(by("Quiet Quinn").channels.map(c => c.kind), ["youtube", "twitch"]);
  assert.equal(by("Tiny Tom").notes, 'Said "maybe later"\nGenre: Platformer');
});

test("a re-import matches by email, then by YouTube link, and updates fields", () => {
  const b = book();
  b.import(mapStreamers("Name,Email,Reach\nAda,ada@example.test,E\n"));
  b.import(mapStreamers("Name,E-mail,Reach\nAda Plays,ADA@example.test,B\n"));
  b.import(mapStreamers("Name,YouTube\nBo,https://youtube.com/@bo\n"));
  b.import(mapStreamers("Name,Links,Notes\nBo Two,https://www.youtube.com/@bo/,hello\n"));
  const all = b.list();
  assert.deepEqual(all.map(c => [c.name, c.reach, c.notes]), [["Ada Plays", "B", ""], ["Bo Two", "", "hello"]]);
});

test("a row with no name and no link is skipped", () => {
  const b = book();
  assert.deepEqual(b.import(mapStreamers("Name,YouTube,Notes\n,,orphan\nCy,,ok\n")), { added: 1, updated: 0, skipped: 1 });
});
