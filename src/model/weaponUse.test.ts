// Weapon-training resolution (book ch.16 Fegyverhasználat / Pusztakezes harc / Harcművészet, ch.9).
import { FIST, resolveWeaponUse, weaponByName } from "./weaponUse";

const w = (n: string) => weaponByName(n)!;
const s = (skill: string, subtype: string | undefined, fok: number) => ({ skill, subtype, fok });
const use = (weapon: string, ...skills: { skill: string; subtype?: string; fok: number }[]) =>
  resolveWeaponUse(w(weapon), skills);

describe("Fegyverhasználat", () => {
  test("category training counts up to fok 2 — the weapon's own values, no mastery bonus", () => {
    const u = use("hosszú kard", s("Fegyverhasználat", "egykezes kardok", 2));
    expect(u.fok).toBe(2);
    expect(u.masteryVals).toEqual({ ke: 0, te: 0, ve: 0, ce: 0 });
    expect(u.te).toBe(10); // the weapon's TÉ, nothing more
  });

  test("weapon-specific fok 5 adds the mastery tier and +1 Sp", () => {
    const u = use("hosszú kard", s("Fegyverhasználat", "hosszú kard", 5));
    expect(u.fok).toBe(5);
    expect(u.masteryVals).toEqual({ ke: 5, te: 10, ve: 10, ce: 10 });
    expect(u.dmgBonus).toBe(1);
  });

  test("untrained: no weapon values and −1 damage per die", () => {
    const u = use("hosszú kard");
    expect(u.fok).toBe(0);
    expect(u.te).toBe(0);
    expect(u.baseDmg).toBe("2k6−2");
  });
});

describe("Harcművészet — unarmed", () => {
  test("a style at fok 2 replaces the fist with the STYLE's values and damage (ch.16 fok 2)", () => {
    const u = use(FIST, s("Harcművészet", "Avad-ka-kinito", 2));
    expect(u.skillLabel).toBe("Harcművészet (Avad-ka-kinito)");
    expect(u.weaponVals).toEqual({ ke: 5, te: 19, ve: 5, ce: 0 }); // the Avad-ka-kinito style line
    expect(u.baseDmg).toBe("1k10+2");
  });

  test("naming no weapon IS the unarmed commitment — the fok counts in full above 2 (ch.16)", () => {
    // The fok-3 choice is "a weapon of the style, or the unarmed art": a style-only instance is the latter.
    for (const sub of ["Avad-ka-kinito", "Avad-ka-kinito (fegyvertelen)", "fegyvertelen"]) {
      const u = use(FIST, s("Harcművészet", sub, 5));
      expect(u.fok).toBe(5);
      expect(u.masteryVals).toEqual({ ke: 5, te: 10, ve: 10, ce: 10 });
      expect(u.dmgBonus).toBe(1); // fok 5: sebzése +1 — unarmed too
    }
  });

  test("an instance committed to a WEAPON doesn't master the bare hands", () => {
    expect(use(FIST, s("Harcművészet", "tonfa", 4)).fok).toBe(0); // no style named at all
    expect(use(FIST, s("Harcművészet", "Avad-ka-kinito (tonfa)", 4)).fok).toBe(2); // the style still covers them, ≤ fok 2
  });

  test("the weapon instance arms the weapon, the style instance the fists — independently", () => {
    const skills = [s("Harcművészet", "Avad-ka-kinito", 4), s("Harcművészet", "rövid bot", 4)];
    expect(use(FIST, ...skills).fok).toBe(4); // unarmed: from the style instance
    expect(use("rövid bot", ...skills).fok).toBe(4); // the bot: from its own instance
  });

  test("with two equal instances the one naming a style wins — its values beat a styleless art", () => {
    const u = use(FIST, s("Harcművészet", "fegyvertelen", 4), s("Harcművészet", "Shien-ka-to", 4));
    expect(u.skillLabel).toBe("Harcművészet (Shien-ka-to)");
    expect(u.baseDmg).toBe("1k10"); // the Shien-ka-to line, not the plain fist die
  });

  test("plain Pusztakezes harc still governs the fists when it's the better training", () => {
    const u = use(FIST, s("Pusztakezes harc", undefined, 4), s("Harcművészet", "Shien-ka-to", 2));
    expect(u.skillLabel).toBe("Pusztakezes harc");
    expect(u.baseDmg).toBe("1k6"); // the fist progression, not a style
    expect(u.dmgBonus).toBe(0);
  });
});

describe("Harcművészet — weapons", () => {
  test("a style covers the traditional ten, but only up to fok 2", () => {
    const u = use("tonfa", s("Harcművészet", "Avad-ka-kinito", 4));
    expect(u.fok).toBe(2);
    expect(u.ve).toBe(15); // the tonfa's own VÉ, no mastery bonus yet
  });

  test("the book's own form — Harcművészet 4. fok (tonfa) — gets the full mastery", () => {
    const u = use("tonfa", s("Harcművészet", "tonfa", 4));
    expect(u.fok).toBe(4);
    expect(u.masteryVals).toEqual({ ke: 5, te: 10, ve: 10, ce: 10 });
  });

  test("the kardművész blades need to be NAMED — no style teaches them (ch.9)", () => {
    expect(use("Slan kard", s("Harcművészet", "Avad-ka-kinito", 3)).fok).toBe(0);
    expect(use("Slan kard", s("Harcművészet", "Slan kard", 5)).fok).toBe(5);
  });

  test("a signature weapon counts only for its own style", () => {
    expect(use("Nisen-kard", s("Harcművészet", "Nisen-nid-to", 2)).fok).toBe(2);
    expect(use("Nisen-kard", s("Harcművészet", "Shien-ka-to", 2)).fok).toBe(0);
  });

  test("Shien-su stacks its own tier on top of the blade's (ch.9)", () => {
    const blades = [s("Harcművészet", "Slan kard", 4), s("Harcművészet", "Slan tőr", 4)];
    const alone = use("Slan kard", ...blades);
    const shien = use("Slan kard", ...blades, s("Harcművészet", "Shien-su", 4));
    expect(alone.masteryVals).toEqual({ ke: 5, te: 10, ve: 10, ce: 10 });
    expect(shien.extras).toEqual([{ label: "Shien-su 4. fok", vals: { ke: 5, te: 10, ve: 10, ce: 10 } }]);
    expect(shien.te).toBe(alone.te + 10); // added, not replaced
  });

  test("Shien-su only reaches as far as the two blades it builds on", () => {
    const shien = use(
      "Slan tőr",
      s("Harcművészet", "Slan kard", 5),
      s("Harcművészet", "Slan tőr", 3), // the weaker blade caps it
      s("Harcművészet", "Shien-su", 5)
    );
    expect(shien.extras).toEqual([{ label: "Shien-su 3. fok", vals: { ke: 2, te: 5, ve: 5, ce: 5 } }]);
  });

  test("Shien-su grants nothing without BOTH blades, and never arms the bare hands", () => {
    const half = [s("Harcművészet", "Slan kard", 4), s("Harcművészet", "Shien-su", 4)]; // no Slan tőr
    expect(use("Slan kard", ...half).extras).toEqual([]);
    expect(use(FIST, s("Harcművészet", "Shien-su", 4)).fok).toBe(0); // not a style ⇒ not the unarmed art
    expect(use("hosszú kard", s("Harcművészet", "Shien-su", 4)).extras).toEqual([]); // Slan blades only
  });

  test("the book's own one-instance phrasing — Harcművészet (Slan kard és Slan tőr) — arms both blades", () => {
    const skills = [s("Harcművészet", "Slan kard és Slan tőr", 4), s("Harcművészet", "Shien-su", 4)];
    expect(use("Slan kard", ...skills).fok).toBe(4);
    expect(use("Slan tőr", ...skills).fok).toBe(4);
    expect(use("Slan kard", ...skills).extras).toEqual([{ label: "Shien-su 4. fok", vals: { ke: 5, te: 10, ve: 10, ce: 10 } }]);
  });

  test("Dhala-saa adds to KÉ and VÉ only, on the Slan kard (ch.9, udvari irányzat)", () => {
    const skills = [s("Harcművészet", "Slan kard", 4), s("Harcművészet", "Dhala-saa", 4)];
    const u = use("Slan kard", ...skills);
    expect(u.extras).toEqual([{ label: "Dhala-saa 4. fok", vals: { ke: 5, te: 0, ve: 10, ce: 0 } }]);
    const plain = use("Slan kard", s("Harcművészet", "Slan kard", 4));
    expect(u.te).toBe(plain.te); // TÉ untouched
    expect(u.ke).toBe(plain.ke + 5);
    // it's the Slan kard's art — the Slan tőr gets nothing
    expect(use("Slan tőr", ...skills).extras).toEqual([]);
  });

  test("Dhala-saa is capped by the Slan kard instance it builds on", () => {
    const u = use("Slan kard", s("Harcművészet", "Slan kard", 3), s("Harcművészet", "Dhala-saa", 5));
    expect(u.extras).toEqual([{ label: "Dhala-saa 3. fok", vals: { ke: 2, te: 0, ve: 5, ce: 0 } }]);
  });

  test("the better of the two governing skills wins", () => {
    const u = use("hosszú kard", s("Fegyverhasználat", "hosszú kard", 5), s("Harcművészet", "Avad-ka-kinito", 2));
    expect(u.fok).toBe(5);
    expect(u.skillLabel).toBe("Fegyverhasználat");
  });
});
