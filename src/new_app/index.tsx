// The new MAGUS app: a uniform parchment design across the roster (welcome), the live character
// sheet, the compendium, and a full-screen character creator. MainContainer renders <RootApp />.
// Data, model, engine and UI all live under this folder.

export { RootApp, default } from "./ui/RootApp";
export { AppShell } from "./ui/AppShell";
export { CharacterBuilder } from "./ui/CharacterBuilder";
export { derive } from "./engine/derive";
export { RULES } from "./model/rulesDb";
export type { CharacterRecord } from "./model/character";
export type { DerivedCharacter } from "./engine/types";
