// Character file import/export. The file is the raw CharacterRecord JSON (schemaVersion travels
// inside it); import validates the shape, applies legacy migrations, and always mints a fresh id,
// so an import can never collide with — or silently overwrite — an existing character.

import { CharacterRecord } from "../model/character";
import { genId, migrateRecord } from "./storage";

export const exportRecordFile = (record: CharacterRecord): void => {
  const { updatedAt, ...clean } = record; // sync bookkeeping — meaningless in a file
  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${record.name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "karakter"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const parseImportedRecord = (text: string): CharacterRecord | null => {
  try {
    const raw = JSON.parse(text) as CharacterRecord;
    if (!raw || typeof raw !== "object" || typeof raw.name !== "string" || !Array.isArray(raw.levels)) return null;
    const { updatedAt, ...rest } = raw; // fresh copy gets its own timestamp on save
    return migrateRecord({ ...rest, id: genId() });
  } catch {
    return null;
  }
};
