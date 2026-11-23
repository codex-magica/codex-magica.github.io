import { BACKUP_FORMAT, parseImportFile } from "./transfer";
import { defaultRecord } from "./defaultRecord";
import { CharacterRecord } from "../model/character";

const rec = (id: string, name: string): CharacterRecord => ({ ...defaultRecord, id, name, updatedAt: 1000 });
const backupOf = (...chars: CharacterRecord[]) => JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: "2026-11-22T00:00:00Z", characters: chars });

test("backup restore onto an empty device adds everything, keeping ids", () => {
  const r = parseImportFile(backupOf(rec("a", "Anna"), rec("b", "Bálint")), [])!;
  expect(r.kind).toBe("backup");
  expect(r.add.map((x) => x.id)).toEqual(["a", "b"]);
  expect(r.skipped).toBe(0);
});

test("restoring the same backup twice is a no-op (timestamps don't count as a change)", () => {
  const local = [{ ...rec("a", "Anna"), updatedAt: 99999 }];
  const r = parseImportFile(backupOf(rec("a", "Anna")), local)!;
  expect(r.add).toEqual([]);
  expect(r.skipped).toBe(1);
});

test("a character that exists but differs is added as a copy, never overwritten", () => {
  const local = [rec("a", "Anna")];
  const r = parseImportFile(backupOf(rec("a", "Anna (régi)"), rec("c", "Cili")), local)!;
  expect(r.add).toHaveLength(2);
  const copy = r.add.find((x) => x.name === "Anna (régi)")!;
  expect(copy.id).not.toBe("a");
  expect(r.add.find((x) => x.name === "Cili")!.id).toBe("c");
});

test("a single character file always gets a fresh id", () => {
  const r = parseImportFile(JSON.stringify(rec("a", "Anna")), [rec("a", "Anna")])!;
  expect(r.kind).toBe("character");
  expect(r.add).toHaveLength(1);
  expect(r.add[0].id).not.toBe("a");
  expect(r.add[0].updatedAt).toBeUndefined();
});

test("garbage and unrelated JSON are rejected; malformed backup entries are skipped", () => {
  expect(parseImportFile("not json", [])).toBeNull();
  expect(parseImportFile(JSON.stringify({ hello: "world" }), [])).toBeNull();
  const r = parseImportFile(JSON.stringify({ format: BACKUP_FORMAT, version: 1, characters: [{ nope: 1 }, rec("a", "Anna")] }), [])!;
  expect(r.add.map((x) => x.id)).toEqual(["a"]);
});

test("the same id twice in one file: identical entries count once, different ones are both kept", () => {
  const r = parseImportFile(backupOf(rec("a", "Anna"), rec("a", "Anna"), rec("a", "Anna (más)")), [])!;
  expect(r.add.map((x) => x.name)).toEqual(["Anna", "Anna (más)"]);
  expect(new Set(r.add.map((x) => x.id)).size).toBe(2);
  expect(r.skipped).toBe(1);
});
