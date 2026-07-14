// The 10 MAGUS attributes (tulajdonságok).

export const STAT_KEYS = [
  "Erő",
  "Gyorsaság",
  "Ügyesség",
  "Állóképesség",
  "Egészség",
  "Karizma",
  "Intelligencia",
  "Akaraterő",
  "Asztrál",
  "Érzékelés",
] as const;

export type Stat = (typeof STAT_KEYS)[number];

export type Stats = Record<Stat, number>;

export const STAT_SHORT: Record<Stat, string> = {
  Erő: "Erő",
  Gyorsaság: "Gy",
  Ügyesség: "Ügy",
  Állóképesség: "Áks",
  Egészség: "Egs",
  Karizma: "Krz",
  Intelligencia: "Int",
  Akaraterő: "Akr",
  Asztrál: "Aszt",
  Érzékelés: "Érz",
};

// Short-code → full attribute name (matches the book's table abbreviations).
export const STAT_BY_SHORT: Record<string, Stat> = {
  Erő: "Erő",
  Gy: "Gyorsaság",
  Ügy: "Ügyesség",
  Áks: "Állóképesség",
  Egs: "Egészség",
  Krz: "Karizma",
  Int: "Intelligencia",
  Akr: "Akaraterő",
  Aszt: "Asztrál",
  Érz: "Érzékelés",
};

export const makeStats = (value = 0): Stats => ({
  Erő: value,
  Gyorsaság: value,
  Ügyesség: value,
  Állóképesség: value,
  Egészség: value,
  Karizma: value,
  Intelligencia: value,
  Akaraterő: value,
  Asztrál: value,
  Érzékelés: value,
});
