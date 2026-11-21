import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { ContactBook } from "../src/domain/contactBook.js";
import { parseCsv, mapStreamers, reachOf, channelKind, dateOf, mergeNotes, takeGenreLines } from "../src/domain/contactImport.js";
import { MemoryContacts } from "./memoryContacts.js";

const csv = fs.readFileSync(new URL("./fixtures/new-streamers.csv", import.meta.url), "utf8");
const shelf = { list: () => [], has: () => false };
const book = () => new ContactBook(new MemoryContacts(), shelf, () => new Date("2026-11-21T10:00:00"));

test("the CSV parser handles quotes, commas and newlines in quoted fields", () => {
  assert.deepEqual(parseCsv('a,"b,c","d ""e""\nf"\r\ng,,h\n'), [["a", "b,c", 'd "e"\nf'], ["g", "", "h"]]);
});

test("reach and channel kinds", () => {
  assert.equal(reachOf("b"), null);
  assert.equal(reachOf(""), null);
  assert.equal(reachOf("2,500"), 2500);
  assert.equal(reachOf("12 400"), 12400);
  assert.equal(reachOf("30"), 30);
  assert.equal(reachOf("12k"), 12000);
  assert.equal(reachOf("1.2M"), 1200000);
  assert.equal(channelKind("https://twitch.tv/x"), "twitch");
  assert.equal(channelKind("https://www.youtube.com/@x"), "youtube");
  assert.equal(channelKind("https://example.test"), "website");
});

test("the mapper reads every column of the sheet", () => {
  const rows = mapStreamers(csv);
  assert.equal(rows.length, 5);
  const [pat, moss, quinn, nell, tom] = rows;
  assert.equal(pat.email, "pat@example.test");
  assert.deepEqual(pat.channels, [{ kind: "twitch", url: "twitch.tv/pixelpat" }, { kind: "bluesky", url: "https://bsky.app/profile/pixelpat.bsky.social" }]);
  assert.deepEqual(quinn.channels.map(c => c.kind), ["linktree", "youtube", "youtube", "steam", "bluesky", "instagram", "facebook"]);
  assert.deepEqual(moss.channels.map(c => c.kind), ["youtube", "discord", "x", "website"]);
  assert.deepEqual(rows.map(r => r.reach), [50, 10000, 5000, null, 500]);
  assert.deepEqual(rows.map(r => r.genres), [["Indie", "Co-op"], ["Puzzle"], ["Roguelike"], ["Racing"], ["Platformer"]]);
  assert.ok(rows.every(r => !/Genre|BB/.test(r.notes)));
  assert.equal(moss.notes, "Two-line\nnote\nPlatform: PC; Switch");
  assert.equal(nell.notes, 'Said "maybe later"');
  assert.deepEqual(tom.touches, []);
});

test("Last Contact is a dated mail touch; BB1 and BB2 are mail touches for Bunny Bunker dated by it, or by the import day", () => {
  const [pat, moss, quinn] = mapStreamers(csv);
  assert.deepEqual(pat.touches, [{ kind: "mail", date: "2025-09-16" }, { kind: "mail", date: "2025-09-16", game: "bunny-bunker", note: "BB1" }, { kind: "mail", date: "2025-09-16", game: "bunny-bunker", note: "BB2" }]);
  assert.deepEqual(moss.touches, [{ kind: "mail", date: "2025-09-08" }, { kind: "reply", date: "2025-09-08" }, { kind: "video", date: "2025-09-08" }, { kind: "mail", date: "2025-09-08", game: "bunny-bunker", note: "BB2" }]);
  assert.deepEqual(quinn.touches, [{ kind: "mail", date: "", game: "bunny-bunker", note: "BB1" }]);
});

test("dates, buckets and handles", () => {
  assert.equal(dateOf("16-Sep-2025"), "2025-09-16");
  assert.equal(dateOf("8-Sep-2025"), "2025-09-08");
  assert.equal(dateOf("2026-01-02"), "2026-01-02");
  assert.equal(dateOf("soon"), "");
  assert.equal(reachOf("A - Tiny >50"), 50);
  assert.equal(reachOf("E - Huge >10.000 "), 10000);
  assert.equal(reachOf("F - Gigantic >100.000"), 100000);
  assert.equal(reachOf("C - Medium >1.000"), 1000);
  assert.equal(mapStreamers("Name,Bluesky,X\nA,@a.example,@ax\n")[0].channels.map(c => c.url).join(" "), "https://bsky.app/profile/a.example https://x.com/ax");
  assert.deepEqual(mapStreamers("Name,Notes,Platform\nA,\"hi\",PC\n")[0].channels, []);
});

test("importing the fixture twice gives five contacts and touches once", () => {
  const b = book();
  assert.deepEqual(b.importCsv(csv), { added: 5, updated: 0, skipped: 0 });
  const first = b.list().map(c => c.touches.length);
  assert.deepEqual(b.import(mapStreamers(csv)), { added: 0, updated: 5, skipped: 0 });
  assert.deepEqual(b.import(mapStreamers(csv)), { added: 0, updated: 5, skipped: 0 });
  const all = b.list();
  assert.equal(all.length, 5);
  assert.deepEqual(all.map(c => c.touches.length), first, "no touch twice");
  const by = n => all.find(c => c.name === n);
  assert.deepEqual(by("Pixel Pat").touches.map(t => [t.date, t.kind, t.game, t.note]).sort(), [["2025-09-16", "mail", "", ""], ["2025-09-16", "mail", "bunny-bunker", "BB1"], ["2025-09-16", "mail", "bunny-bunker", "BB2"]]);
  assert.deepEqual(by("Quiet Quinn").touches, [{ date: "2026-11-21", kind: "mail", game: "bunny-bunker", note: "BB1" }]);
  assert.equal(by("Pixel Pat").last, "2025-09-16");
  assert.equal(by("Moss Gamer").reach, 10000);
  assert.deepEqual(by("Pixel Pat").genres, ["Indie", "Co-op"]);
  assert.deepEqual(by("Moss Gamer").touches.map(t => t.kind).sort(), ["mail", "mail", "reply", "video"]);
  assert.equal(by("Tiny Tom").notes, "");
});

test("a re-import keeps what a person wrote in notes and replaces the old import's own lines", () => {
  assert.equal(mergeNotes("Mine\nSheet reach: B\nGenre: Indie\nPlatform: PC", "Platform: PC\nSheet note"), "Mine\nPlatform: PC\nSheet note");
  assert.equal(mergeNotes("Mine\nSheet note", "Sheet note"), "Mine\nSheet note");
  assert.deepEqual(takeGenreLines("Hi\nGenre: Indie, Horror\nPlatform: PC"), { genres: ["Indie", "Horror"], notes: "Hi\nPlatform: PC" });
});

test("a re-import matches by email, then by a personal channel, then by name, and updates fields", () => {
  const b = book();
  b.import(mapStreamers("Name,Email,Reach\nAda,ada@example.test,E\n"));
  b.import(mapStreamers("Name,Contact,Reach\nAda Plays,ADA@example.test,\"3,000\"\n"));
  b.import(mapStreamers("Name,YouTube\nBo,https://youtube.com/@bo\n"));
  b.import(mapStreamers("Name,Links,Notes\nBo Two,https://www.youtube.com/@bo/,hello\n"));
  b.import(mapStreamers("Name,Twitch\nCy,twitch.tv/cy\n"));
  b.import(mapStreamers("Name,Twitch,Contact\nCy Again,https://www.twitch.tv/cy,cy@example.test\n"));
  b.import(mapStreamers("Name,Notes\nDee,one\n"));
  b.import(mapStreamers("Name,Notes\ndee,two\n"));
  const all = b.list();
  assert.deepEqual(all.map(c => [c.name, c.reach, c.notes]), [["Ada Plays", 3000, ""], ["Bo Two", null, "hello"], ["Cy Again", null, ""], ["dee", null, "one\ntwo"]]);
  assert.equal(all[2].email, "cy@example.test");
  assert.equal(all[2].channels.length, 1);
});

test("a row with no name and no link is skipped", () => {
  const b = book();
  assert.deepEqual(b.import(mapStreamers("Name,YouTube,Notes\n,,orphan\nCy,,ok\n")), { added: 1, updated: 0, skipped: 1 });
});
