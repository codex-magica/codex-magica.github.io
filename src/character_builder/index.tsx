// Self-contained MAGUS character builder. The only connection to the rest of the app is that
// MainContainer renders this component. Data, model, engine and UI all live under this folder.

export { CharacterBuilder, default } from "./ui/CharacterBuilder";
export { derive } from "./engine/derive";
export { RULES } from "./model/rulesDb";
export type { CharacterRecord } from "./model/character";
export type { DerivedCharacter } from "./engine/types";
