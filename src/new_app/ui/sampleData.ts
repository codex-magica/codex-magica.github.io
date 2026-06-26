// Sample character + compendium content for the sheet and browse screens. This is demo data lifted
// from the design prototype — it intentionally does NOT have to match the live builder record yet;
// the goal is a uniform, navigable design across all three screens.

export interface SpellRow { name: string; mana: number; time: string }
export interface School { name: string; spells: SpellRow[] }

export const identity = {
  name: "Yhendorn Ularis",
  subLine: "Elf Bárd · 1. szint",
  fields: [
    { k: "Faj", v: "Elf" },
    { k: "Kaszt", v: "Bárd" },
    { k: "Jellem", v: "Élet, Káosz" },
    { k: "Vallás", v: "Eidhil K'Meakhan" },
    { k: "Szülőföld", v: "Erion" },
  ],
};

export const vitals = [
  { label: "Életpont", cur: 14, max: 14, kind: "hp" as const },
  { label: "Fájdalompont", cur: 30, max: 30, kind: "fp" as const },
  { label: "Mana", cur: 24, max: 24, kind: "mana" as const },
  { label: "Kegypont", cur: 13, max: 20, kind: "kegy" as const },
  { label: "Pszi", cur: 16, max: 25, kind: "pszi" as const },
];

export const attrs = [
  { k: "Erő", v: 10 }, { k: "Gyorsaság", v: 13 }, { k: "Ügyesség", v: 15 },
  { k: "Állóképesség", v: 14 }, { k: "Egészség", v: 14 }, { k: "Karizma", v: 16 },
  { k: "Intelligencia", v: 14 }, { k: "Akaraterő", v: 14 }, { k: "Asztrál", v: 17 },
  { k: "Érzékelés", v: 16 },
];

export const derivedValues = [
  { k: "Ép", v: 14 }, { k: "Fp", v: 28 }, { k: "Kp", v: 14 }, { k: "Psi", v: 14 },
  { k: "KÉ", v: 29 }, { k: "TÉ", v: 38 }, { k: "VÉ", v: 88 }, { k: "CÉ", v: 31 },
  { k: "Sebzésbónusz", v: 0 }, { k: "MME", v: 14 }, { k: "AME", v: 17 },
];

export const combat = [
  { name: "Közelharc", rows: [{ name: "Tőr", dmg: "1k10−1", val: 43 }] },
  { name: "Távolsági", rows: [{ name: "Hosszú íj", dmg: "2k6+1", val: 50 }] },
  { name: "Lőszer", rows: [{ name: "Nyíl", dmg: "", val: 25 }] },
];

export const skillCats = [
  { name: "Harci", items: [{ name: "Fegyverhasználat (íjak)", val: 3 }] },
  { name: "Alvilági", items: [
    { name: "Álcázás/álruha", val: 1 }, { name: "Lopódzás", val: 3 },
    { name: "Rejtőzködés", val: 3 }, { name: "Zárnyitás", val: 2 },
  ] },
  { name: "Világi", items: [
    { name: "Állatismeret (háziállatok)", val: 4 }, { name: "Állatismeret (erdei állatok)", val: 4 },
    { name: "Csomózás", val: 2 }, { name: "Futás", val: 2 }, { name: "Helyismeret (Erion)", val: 3 },
    { name: "Idomítás", val: 4 }, { name: "Időjóslás", val: 2 }, { name: "Lovaglás", val: 4 },
    { name: "Úszás", val: 2 }, { name: "Vadonjárás (erdő)", val: 4 }, { name: "Éberség", val: 1 },
  ] },
  { name: "Tudományos", items: [
    { name: "Herbalizmus", val: 3 }, { name: "Írás/Olvasás", val: 2 }, { name: "Legendaismeret", val: 3 },
  ] },
  { name: "Szociális", items: [{ name: "Ékesszólás", val: 2 }] },
];

export const schools: School[] = [
  { name: "Dalmágia", spells: [
    { name: "Álom dala", mana: 2, time: "1 p" }, { name: "Bájolás dala", mana: 1, time: "1 p" },
    { name: "Bátorság dala", mana: 1, time: "1 p" }, { name: "Bénítás dala", mana: 3, time: "2 kör" },
    { name: "Dalegyesítés", mana: 5, time: "…" }, { name: "Ellentétek dala", mana: 4, time: "1 p" },
    { name: "Emlékek dala", mana: 2, time: "3 p" }, { name: "Feledés dala", mana: 4, time: "3 p" },
    { name: "Félelem dala", mana: 2, time: "1 kör" }, { name: "Gyógyítás dala", mana: 6, time: "1 óra" },
    { name: "Nyugalom dala", mana: 1, time: "1 p" }, { name: "Zavarodottság dala", mana: 3, time: "1 p" },
  ] },
  { name: "Hangmágia", spells: [
    { name: "Bűvhangszer", mana: 4, time: "1 kör" }, { name: "Csend", mana: 10, time: "1 kör" },
    { name: "Hamis beszéd", mana: 12, time: "1 sz" }, { name: "Hangidézés", mana: 10, time: "1 kör" },
    { name: "Hangkivetítés", mana: 6, time: "1 sz" }, { name: "Hangorkán", mana: 15, time: "4 sz" },
    { name: "Nyelvzagyválás", mana: 6, time: "1 sz" }, { name: "Zajkeltés", mana: 1, time: "1 sz" },
  ] },
  { name: "Fénymágia", spells: [
    { name: "Alakváltás", mana: 15, time: "1 kör" }, { name: "Aura", mana: 4, time: "1 sz" },
    { name: "Fényárny", mana: 6, time: "1 sz" }, { name: "Vakítás", mana: 8, time: "1 kör" },
  ] },
];

export const equipment = [
  "harci kutya (hastin)", "utazó ló (hűséges, parancsra megáll)", "egy okos holló",
  "hosszú íj", "átlagos ruha, szép ruha", "síp", "kis sátor", "10 papír",
  "2 adag tinta", "írótoll", "horog, cérna",
];

// Compendium reference (skills catalog).
export const compNames = [
  "Képzettségek", "Bárdmágia", "Szakrális Mágia", "Boszorkánymágia",
  "Boszorkánymesteri mágia", "Tűzmágia", "Pszi", "Magasmágia", "Fegyverek", "Páncélok",
];

export const refSkillGroups = [
  { group: "Harci", rows: [
    { name: "Fegyverhasználat", diff: "III", strong: "–", weak: "–", attr: "Erő, Gyorsaság, Ügyesség, Érzékelés" },
    { name: "Fegyverismeret", diff: "II", strong: "–", weak: "–", attr: "Intelligencia, Érzékelés" },
    { name: "Pajzshasználat", diff: "II", strong: "–", weak: "–", attr: "Erő, Ügyesség" },
  ] },
  { group: "Alvilági", rows: [
    { name: "Lopódzás", diff: "II", strong: "–", weak: "–", attr: "Ügyesség" },
    { name: "Rejtőzködés", diff: "II", strong: "–", weak: "–", attr: "Ügyesség, Érzékelés" },
    { name: "Zárnyitás", diff: "III", strong: "–", weak: "Szabadulóművészet", attr: "Ügyesség, Intelligencia" },
  ] },
  { group: "Világi", rows: [
    { name: "Állatismeret", diff: "II", strong: "–", weak: "–", attr: "Intelligencia, Érzékelés" },
    { name: "Vadonjárás", diff: "II", strong: "–", weak: "–", attr: "Intelligencia, Érzékelés" },
    { name: "Lovaglás", diff: "II", strong: "–", weak: "–", attr: "Gyorsaság, Ügyesség" },
  ] },
];

export const skillBody = (name: string): string[] => [
  `A(z) „${name}” képzettség a MAGUS szabálykönyv szerinti leírása: mire való, kik forgatják, és milyen helyzetekben kér érte a Kalandmester próbát.`,
  "A próbát a képzettséghez tartozó tulajdonság(ok) és a megszerzett fok együtt határozza meg. A magasabb fok ritkább, nehezebb alkalmazásokat is megenged.",
];

export const spellBody = (name: string): string[] => [
  `A(z) „${name}” a bárdok dallamokba szőtt mágiájának része. Hatása, hatótávja és időtartama a szabálykönyv vonatkozó sorából származik.`,
  "A megidézés mana-pontba (Mp) kerül; a bárd hangszerrel és énekkel szövi a varázslatot, ezért némaságban vagy lekötött kézzel nem alkalmazható.",
];

// The character's base combat values (for seeding the weapon calculator from the sheet).
export const charCombat = { KE: 29, VE: 88, CE: 31 };

// Welcome / roster sample — saved characters on the front door.
export interface RosterPip { k: string; cur: number; max: number; kind: string }
export interface RosterChar { id: string; name: string; race: string; cls: string; sub: string; level: number; pips: RosterPip[] }

export const roster: RosterChar[] = [
  { id: "yh", name: "Yhendorn Ularis", race: "Elf", cls: "Bárd", sub: "Magányos Mester", level: 6,
    pips: [{ k: "ÉP", cur: 14, max: 14, kind: "hp" }, { k: "FP", cur: 30, max: 30, kind: "fp" }, { k: "MANA", cur: 18, max: 24, kind: "mana" }, { k: "PSZI", cur: 16, max: 25, kind: "pszi" }] },
  { id: "da", name: "Darton Vasököl", race: "Ember", cls: "Harcos", sub: "Pyarroni kardvívó", level: 8,
    pips: [{ k: "ÉP", cur: 9, max: 22, kind: "hp" }, { k: "FP", cur: 41, max: 58, kind: "fp" }, { k: "KÉ", cur: 62, max: 62, kind: "mana" }] },
  { id: "sh", name: "Shaale'an", race: "Elf", cls: "Tűzvarázsló", sub: "Lángmester", level: 5,
    pips: [{ k: "ÉP", cur: 11, max: 13, kind: "hp" }, { k: "FP", cur: 24, max: 26, kind: "fp" }, { k: "MANA", cur: 47, max: 62, kind: "mana" }] },
  { id: "go", name: "Gorlon, a Néma", race: "Ork", cls: "Fejvadász", sub: "Méregmester", level: 7,
    pips: [{ k: "ÉP", cur: 18, max: 20, kind: "hp" }, { k: "FP", cur: 52, max: 55, kind: "fp" }, { k: "PSZI", cur: 8, max: 30, kind: "pszi" }] },
  { id: "me", name: "Merean Holdfény", race: "Félelf", cls: "Papnő", sub: "Gyógyító irányzat", level: 4,
    pips: [{ k: "ÉP", cur: 10, max: 12, kind: "hp" }, { k: "FP", cur: 19, max: 22, kind: "fp" }, { k: "KEGY", cur: 21, max: 28, kind: "kegy" }] },
  { id: "br", name: "Brando Kópé", race: "Ember", cls: "Tolvaj", sub: "Útonálló iskola", level: 3,
    pips: [{ k: "ÉP", cur: 8, max: 10, kind: "hp" }, { k: "FP", cur: 15, max: 18, kind: "fp" }] },
];

export interface Weapon {
  name: string;
  kind: "melee" | "ranged";
  cat: string;
  dmg: string;
  ke?: number; // weapon KÉ contribution (melee)
  te?: number; // weapon TÉ contribution (melee)
  ve?: number; // weapon VÉ contribution (melee)
  ce?: number; // weapon CÉ contribution (ranged)
  range?: string;
}

export const weapons: Weapon[] = [
  { name: "Tőr", kind: "melee", cat: "Tőr jellegű fegyverek", dmg: "1k10−1", ke: 10, te: 8, ve: 7 },
  { name: "Hosszúkard", kind: "melee", cat: "Egykezes kardok", dmg: "1k10+1", ke: 6, te: 6, ve: 9 },
  { name: "Csatabárd", kind: "melee", cat: "Csatabárdok", dmg: "2k6", ke: 4, te: 5, ve: 5 },
  { name: "Harci bot", kind: "melee", cat: "Botok", dmg: "1k6", ke: 8, te: 4, ve: 12 },
  { name: "Nehézkard", kind: "melee", cat: "Nehézkardok", dmg: "2k6+2", ke: 3, te: 7, ve: 6 },
  { name: "Hosszú íj", kind: "ranged", cat: "Íjak", dmg: "2k6+1", ce: 8, range: "150 láb" },
  { name: "Rövid íj", kind: "ranged", cat: "Íjak", dmg: "1k6+2", ce: 6, range: "100 láb" },
  { name: "Nyílpuska", kind: "ranged", cat: "Nyílpuskák", dmg: "2k6", ce: 10, range: "120 láb" },
  { name: "Hajítótőr", kind: "ranged", cat: "Hajítófegyverek", dmg: "1k6", ce: 4, range: "20 láb" },
];

export const compNote = (title: string): string =>
  `A(z) „${title}” fejezet a kompendium része. A teljes alkalmazásban itt böngészhető a szabálykönyv vonatkozó listája; a részletek ugyanúgy felugró ablakban nyílnak, mint a Képzettségeknél.`;
