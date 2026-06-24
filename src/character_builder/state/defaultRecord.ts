import { CharacterRecord, SCHEMA_VERSION } from "../model/character";

// A seed level-1 Elf Bárd that exercises the whole engine (granted skills, a Mana pool from the
// Mágikus fogékonyság background, bought Kp/Fp/HM/Mana, HM assigned to combat channels).
//
// Level-1 KAP budget = 50 − (Elf 1 + Bárd 6) = 43. Spent below: Kp 14 + Fp 4 + HM 6×2 + Mana 4×3 = 42.

export const defaultRecord: CharacterRecord = {
  schemaVersion: SCHEMA_VERSION,
  id: "seed-bard",
  name: "Yhendorn Ularis",
  concept: "Vándorló elf énekmondó",
  identity: { alignment: "Élet", homeland: "Erion", sex: "male", ageCategory: "Ifjúkor" },
  race: "Elf",
  class: "Bárd",
  selections: { iskola: "Magányos mester" },
  backgrounds: [],
  pointBuy: {
    Erő: 12,
    Gyorsaság: 16,
    Ügyesség: 15,
    Állóképesség: 12,
    Egészség: 13,
    Karizma: 16,
    Intelligencia: 15,
    Akaraterő: 12,
    Asztrál: 12,
    Érzékelés: 12,
  },
  levels: [
    {
      level: 1,
      allocations: [
        { target: "Kp", points: 14 },
        { target: "Fp", points: 4 },
        { target: "HM", points: 6 },
        { target: "Mana", points: 4 },
      ],
      skillPurchases: [
        { skill: "Úszás", from: 0, to: 2 },
        { skill: "Futás", from: 0, to: 2 },
      ],
      hmAssignments: [
        { channel: "KÉ", amount: 1 },
        { channel: "TÉ", amount: 1 },
        { channel: "VÉ", amount: 2 },
        { channel: "CÉ", amount: 2 },
      ],
      statIncreases: [],
    },
  ],
  kmAdjustments: [],
  inventory: [],
  vitalsState: {},
};
