// The new MAGUS app: a uniform parchment design across three reachable screens — the live character
// sheet, the compendium, and the character creator (a right-side drawer). MainContainer renders
// <AppShell />. Data, model, engine and UI all live under this folder.

export { AppShell, default } from "./ui/AppShell";
export { CharacterBuilder } from "./ui/CharacterBuilder";
export { derive } from "./engine/derive";
export { RULES } from "./model/rulesDb";
export type { CharacterRecord } from "./model/character";
export type { DerivedCharacter } from "./engine/types";
