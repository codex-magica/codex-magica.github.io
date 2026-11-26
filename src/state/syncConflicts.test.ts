// A character changed differently on two devices: the other version waits as an alternative (not
// listed), the player picks which one stays, and the choice reaches every device.
import { conflictsOf, createRosterStore, listedRecords } from "./rosterStore";
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
    await settle(drive, a, b); // both versions reach every device
    for (const d of [a, b]) expect(d.records().flatMap(tokensOf)).toEqual(expect.arrayContaining(["editor", "b1"]));
  });
});

const everywhere = (d: Device) => d.records().flatMap(tokensOf);
const setText = (d: Device, id: string, text: string) =>
  d.run(() => {
    const r = d.records().find((v) => v.id === id)!;
    d.store.upsert({ ...r, inventoryText: text }, r);
  });

describe("an alternative made by an editor's save, on an id an earlier answer dropped", () => {
  test("B re-makes content A dropped; A's open creator saves over it: B's edit is kept as an alternative (sync + reload)", async () => {
    const { drive, a, b, x } = await parallelEdits(); // Xena: b1, alternative a1
    later();
    a.run(() => a.store.resolveConflict(x.id, x.id)); // on A the player keeps b1 (the a1 alternative is deleted here)
    await settle(drive, a, b);
    const opened = a.records().find((r) => r.id === x.id)!; // A's creator opens Xena (b1)
    later();
    setText(b, x.id, "Xena#0\na1"); // B: ÉP back to the same value, a fresh edit (exactly the content A dropped)
    await settle(drive, b, a); // A gets B's edit while the creator is open
    later();
    a.run(() => a.store.upsert({ ...opened, inventoryText: `${opened.inventoryText}\neditor` }, opened)); // the creator saves
    // the safety net works for a moment: B's version waits as an alternative...
    expect(conflictsOf(a.records())[0]?.alternatives.map(tokensOf)).toEqual([["Xena#0", "a1"]]);
    // ...but its vector is {deva: 1}, below A's own deletion marker of the same id ({~id: n, deva: 1})
    a.store = a.run(() => createRosterStore()); // a reload
    const afterReload = conflictsOf(a.records()).length;
    await settle(drive, a, b);
    expect({ afterReload, a: everywhere(a).includes("a1"), b: everywhere(b).includes("a1") }).toEqual({ afterReload: 1, a: true, b: true });
  });

  test("the same without a reload: the next round keeps it", async () => {
    const { drive, a, b, x } = await parallelEdits();
    later();
    a.run(() => a.store.resolveConflict(x.id, x.id));
    await settle(drive, a, b);
    const opened = a.records().find((r) => r.id === x.id)!;
    later();
    setText(b, x.id, "Xena#0\na1");
    await settle(drive, b, a);
    later();
    a.run(() => a.store.upsert({ ...opened, inventoryText: `${opened.inventoryText}\neditor` }, opened));
    await settle(drive, a, b);
    expect({ a: everywhere(a).includes("a1"), b: everywhere(b).includes("a1"), asked: conflictsOf(b.records()).length }).toEqual({ a: true, b: true, asked: 1 });
  });

  test("same device: a sheet editor open on Xena while the player picks the other version in the popup; the editor's save keeps it as a question", async () => {
    const { drive, a, b, x } = await parallelEdits(); // A shows b1
    const opened = a.records().find((r) => r.id === x.id)!; // a sheet editor (draft) opens on b1
    const alt = conflictsOf(a.records())[0].alternatives[0];
    later();
    a.run(() => a.store.resolveConflict(x.id, alt.id)); // the popup (over the sheet): the player picks a1
    await a.sync(drive); // the round 2 s later publishes the deletion of the alternative
    later();
    // the editor saves its draft (made from b1) on top of what's on screen now (AppShell.patch: {...record, field}, base = draftBase)
    a.run(() => {
      const cur = a.records().find((r) => r.id === x.id)!;
      a.store.upsert({ ...cur, inventoryText: `${opened.inventoryText}\neditor` }, opened);
    });
    expect(conflictsOf(a.records())[0]?.alternatives.map(tokensOf)).toEqual([["Xena#0", "a1"]]); // asked again, for now
    await settle(drive, a, b);
    // the version the player just picked (a1) must not vanish without an answer
    expect({ a: everywhere(a).includes("a1"), b: everywhere(b).includes("a1") }).toEqual({ a: true, b: true });
  });
});

describe("two devices answering differently, one of them 'keep both'", () => {
  test("A keeps both, B picks the alternative: asked again, nothing dropped", async () => {
    const { drive, a, b, x } = await parallelEdits(); // Xena: b1, alternative a1
    const alt = conflictsOf(b.records())[0].alternatives[0];
    later();
    a.run(() => a.store.resolveConflict(x.id, "both")); // A: keep b1 AND a1
    b.run(() => b.store.resolveConflict(x.id, alt.id)); // B, at the same time: a1 replaces b1
    await settle(drive, a, b);
    const outcome = (d: Device) => ({ b1: everywhere(d).includes("b1"), asked: conflictsOf(d.records()).length });
    // design (docs, combine/resolveConflict comments): two devices choosing differently meet as a new conflict
    expect([outcome(a), outcome(b)].map((o) => o.b1 || o.asked > 0)).toEqual([true, true]);
  });
});

describe("a conflict over content the player already dropped once", () => {
  test("ÉP set back to the same value on A while B edits in parallel: asked again (not dropped, and not announced as a deleted character)", async () => {
    const { drive, a, b, x } = await parallelEdits();
    later();
    b.run(() => b.store.resolveConflict(x.id, x.id)); // B keeps b1 (drops a1)
    await settle(drive, a, b);
    later();
    setText(a, x.id, "Xena#0\na1"); // A: the content back as a1 was
    later();
    b.edit(x.id, "b2");
    await a.sync(drive);
    const told = (await b.sync(drive)).undeleted;
    expect(conflictsOf(b.records())).toHaveLength(1); // asked again (as designed)
    expect(told).toEqual([]);
    await settle(drive, a, b);
    for (const d of [a, b]) expect(conflictsOf(d.records())[0]?.alternatives.map(tokensOf)).toEqual([["Xena#0", "a1"]]);
  });
});

const parallelEditsOn = async (devs: Device[]) => {
  const drive = new FakeDrive();
  const [a, b] = devs;
  const x = a.create("Xena");
  await settle(drive, ...devs);
  later();
  a.edit(x.id, "a1");
  later();
  b.edit(x.id, "b1"); // later: B's version stays listed, A's waits as an alternative
  await settle(drive, a, b);
  return { drive, x };
};
const listedTokensOf = (d: Device) => listedRecords(d.records()).map((r) => tokensOf(r).join(","));

describe("notices and dropped alternatives across devices", () => {
  // A deleted character that comes back because another device edited it in parallel must be announced
  // (driveMerge.mergeRound `undeleted`). An alternative listed as "(másik változat)" (its character was
  // deleted) is a character like any other to the player, but its id contains "~", so it comes back
  // silently.
  test("a listed alternative the player deleted, edited in parallel elsewhere, comes back WITH a notice", async () => {
    const a = new Device("deva");
    const b = new Device("devb");
    const { drive, x } = await parallelEditsOn([a, b]);
    later();
    a.remove(x.id); // Xena deleted with the question unanswered: "Xena (másik változat)" is listed
    await settle(drive, a, b);
    const alt = listedRecords(a.records())[0];
    expect(alt.id).toContain("~");
    expect(listedRecords(b.records()).map((r) => r.id)).toEqual([alt.id]);
    later();
    expect(a.remove(alt.id, alt)).toBe(true); // the player deletes it on A
    later();
    b.edit(alt.id, "b2"); // ...while B (offline) edits it
    await b.sync(drive);
    const out = await a.sync(drive);
    expect(listedRecords(a.records()).map((r) => r.id)).toEqual([alt.id]); // back on A's list (the edit wins: by design)
    expect(out.undeleted).toEqual([alt.name]); // ...and the player must be told
  });

  // A dropped alternative's marker must not swallow a later alternative of the same content from another
  // branch of the character's history (a device that was offline at the table).
  test("a third device's offline edit, same content as the dropped alternative, is asked about, not dropped", async () => {
    const a = new Device("deva");
    const b = new Device("devb");
    const c = new Device("devc");
    const { drive, x } = await parallelEditsOn([a, b, c]); // C synced the original Xena, then went offline
    // C, offline, makes the same change A made (ÉP 10 → 7 on both, say), while the conflict is pending
    const cRec = c.records().find((r) => r.id === x.id)!;
    expect(tokensOf(cRec)).toEqual(["Xena#0"]);
    c.run(() => c.store.upsert({ ...cRec, inventoryText: "Xena#0\na1" }, cRec));
    later();
    b.run(() => b.store.resolveConflict(x.id, x.id)); // the player keeps b1 (drops a1)
    await settle(drive, a, b);
    expect(conflictsOf(a.records())).toEqual([]);
    await settle(drive, c, a, b);
    // C's edit is one nobody has seen: some device must still show it, listed or as a question
    for (const d of [a, b, c]) expect({ dev: d.id, listed: listedTokensOf(d), conflicts: conflictsOf(d.records()).length }).toEqual({ dev: d.id, listed: ["Xena#0,b1"], conflicts: 1 });
  });
});
