// Magasmágia spells whose governing skill (Lélektan) must exceed fok 3. Default = 3.
export const magasFok3: Record<string, number> = {
  // Asztrálmágia — Formázások above Érintés require avatott Lélektan (4. fok); see line 880.
  "Hullám": 4,
  "Szőnyeg, Fal": 4,
  // Aura requires 5. fok Lélektan (asztrális sík mastery); see line 903.
  "Aura": 5,
};
