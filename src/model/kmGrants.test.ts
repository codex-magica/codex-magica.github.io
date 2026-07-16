import { blankKmRow, buildKmEffect, isEditableKmAdjustment, kmGrantSummary, readKmRow } from "./kmGrants";

test("isEditableKmAdjustment: only a single KM-grant effect is an editable row", () => {
  expect(isEditableKmAdjustment({ effects: [{ kind: "grantKap", amount: 10 }] })).toBe(true);
  expect(isEditableKmAdjustment({ effects: [{ kind: "grantSkill", skill: "Úszás", level: 2 }] })).toBe(true);
  expect(isEditableKmAdjustment({ effects: [{ kind: "tag", tag: "x" }] })).toBe(true);
  // foreign / non-KM-grant effect — must NOT be shown as an editable "KAP 0" row
  expect(isEditableKmAdjustment({ effects: [{ kind: "statBonus", stat: "Erő", amount: 2 }] })).toBe(false);
  // empty or multi-effect — not a single round-trippable row
  expect(isEditableKmAdjustment({ effects: [] })).toBe(false);
  expect(isEditableKmAdjustment({ effects: [{ kind: "grantKap", amount: 1 }, { kind: "tag", tag: "y" }] })).toBe(false);
});

test("kmGrantSummary: rich labels for KM grants, readable fallback for other kinds", () => {
  expect(kmGrantSummary({ kind: "grantKap", amount: 40 })).toBe("+40 KAP");
  expect(kmGrantSummary({ kind: "grantPoolPoints", pool: "Kegy", amount: 12 })).toBe("+12 Kegy");
  expect(kmGrantSummary({ kind: "tag", tag: "  Lát a sötétben  " })).toBe("„Lát a sötétben”");
  expect(kmGrantSummary({ kind: "statBonus", stat: "Erő", amount: 2 })).toBe("Erő +2");
  expect(kmGrantSummary({ kind: "note", text: "jegyzet" })).toBe("jegyzet");
});

test("KM tag round-trips RAW text so spaces can be typed", () => {
  const eff = buildKmEffect({ ...blankKmRow(), kind: "tag", text: "Lát a " });
  expect(eff).toEqual({ kind: "tag", tag: "Lát a " }); // untrimmed in storage
  expect(readKmRow(eff).text).toBe("Lát a "); // round-trips unchanged
});
