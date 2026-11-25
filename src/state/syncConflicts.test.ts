// A character changed differently on two devices: the other version waits as an alternative (not
// listed), the player picks which one stays, and the choice reaches every device.
import { conflictsOf, listedRecords } from "./rosterStore";
import { Device, FakeDrive, later, settle, tokensOf, setupSyncHarness } from "./testing/syncHarness";

setupSyncHarness();

const parallelEdits = async () => {
  const drive = new FakeDrive();
  const a = new Device("deva");
  const b = new Device("devb");
  const x = a.create("Xena");
  await settle(drive, a, b);
  later();
  a.edit(x.id, "a1");
  later();
  b.edit(x.id, "b1"); // later: B's version stays listed
  await settle(drive, a, b);
  return { drive, a, b, x };
};
const listed = (d: Device) => listedRecords(d.records()).map((r) => `${r.name}: ${tokensOf(r).slice(1).join(",")}`).sort();

describe("conflicts: the player picks a version", () => {
  test("parallel edits: every device has one listed Xena (the later edit) and the same conflict", async () => {
    const { a, b, x } = await parallelEdits();
    for (const d of [a, b]) {
      expect(listed(d)).toEqual(["Xena: b1"]);
      const [c] = conflictsOf(d.records());
      expect(c.main.id).toBe(x.id);
      expect(c.alternatives.map(tokensOf)).toEqual([["Xena#0", "a1"]]);
    }
  });

  test("choosing the other version on one device: it replaces Xena everywhere, and the question is gone", async () => {
    const { drive, a, b, x } = await parallelEdits();
    const alt = conflictsOf(a.records())[0].alternatives[0];
    later();
    a.run(() => a.store.resolveConflict(x.id, alt.id));
    await settle(drive, a, b);
    for (const d of [a, b]) {
      expect(listed(d)).toEqual(["Xena: a1"]);
      expect(conflictsOf(d.records())).toEqual([]);
      expect(d.records().filter((r) => r.id.includes("~"))).toEqual([]);
    }
  });

  test("keeping the listed version drops the other one everywhere", async () => {
    const { drive, a, b, x } = await parallelEdits();
    later();
    b.run(() => b.store.resolveConflict(x.id, x.id));
    await settle(drive, a, b);
    for (const d of [a, b]) {
      expect(listed(d)).toEqual(["Xena: b1"]);
      expect(conflictsOf(d.records())).toEqual([]);
    }
  });

  test("keeping both: the other version becomes a character of its own", async () => {
    const { drive, a, b, x } = await parallelEdits();
    later();
    a.run(() => a.store.resolveConflict(x.id, "both"));
    await settle(drive, a, b);
    for (const d of [a, b]) {
      expect(listed(d)).toEqual(["Xena (másik változat): a1", "Xena: b1"]);
      expect(conflictsOf(d.records())).toEqual([]);
    }
  });

  test("two devices answering differently at once: nothing is lost, and they're asked again", async () => {
    const { drive, a, b, x } = await parallelEdits();
    const alt = conflictsOf(a.records())[0].alternatives[0];
    later();
    a.run(() => a.store.resolveConflict(x.id, alt.id)); // a1
    b.run(() => b.store.resolveConflict(x.id, x.id)); // b1
    await settle(drive, a, b);
    for (const d of [a, b]) {
      const all = d.records().flatMap(tokensOf);
      expect(all).toContain("a1");
      expect(all).toContain("b1");
      expect(conflictsOf(d.records())).toHaveLength(1);
    }
  });

  test("deleting a character whose conflict is unanswered: the other version is listed, not lost", async () => {
    const { drive, a, b, x } = await parallelEdits();
    later();
    a.remove(x.id);
    await settle(drive, a, b);
    for (const d of [a, b]) expect(listed(d)).toEqual(["Xena (másik változat): a1"]);
  });

  test("an editor saving over a version a sync replaced meanwhile: the replaced one waits as an alternative", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const x = a.create("Xena");
    await settle(drive, a, b);
    const opened = a.records().find((r) => r.id === x.id)!; // the editor opens Xena on A
    later();
    b.edit(x.id, "b1");
    await settle(drive, b, a); // A gets B's edit while the editor is open
    later();
    a.run(() => a.store.upsert({ ...opened, inventoryText: `${opened.inventoryText}\neditor` }, opened));
    expect(listed(a)).toEqual(["Xena: editor"]);
    expect(conflictsOf(a.records())[0].alternatives.map(tokensOf)).toEqual([["Xena#0", "b1"]]);
  });
});

describe("a conflict over content the player already dropped once", () => {
  test("ÉP set back to the same value on A while B edits in parallel: asked again, not dropped", async () => {
    const { drive, a, b, x } = await parallelEdits(); // a1 vs b1: Xena shows b1
    later();
    b.run(() => b.store.resolveConflict(x.id, x.id)); // the player keeps b1 (drops a1)
    await settle(drive, a, b);
    // A puts the content back exactly as a1 was (e.g. ÉP back to the same value), B edits in parallel
    later();
    a.run(() => {
      const r = a.records().find((v) => v.id === x.id)!;
      a.store.upsert({ ...r, inventoryText: "Xena#0\na1" }, r);
    });
    later();
    b.edit(x.id, "b2");
    await settle(drive, a, b);
    for (const d of [a, b]) {
      const [c] = conflictsOf(d.records());
      expect(c?.alternatives.map(tokensOf)).toEqual([["Xena#0", "a1"]]);
    }
  });
});
