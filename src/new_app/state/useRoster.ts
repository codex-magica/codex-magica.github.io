import { useEffect, useState } from "react";
import { CharacterRecord } from "../model/character";
import { clone, genId, loadRoster, saveRoster } from "./storage";

export interface RosterApi {
  records: CharacterRecord[];
  get: (id: string) => CharacterRecord | undefined;
  upsert: (record: CharacterRecord) => void; // create or replace by id
  remove: (id: string) => void;
  duplicate: (id: string) => void;
}

// The character roster, persisted to local storage on every change.
export function useRoster(): RosterApi {
  const [records, setRecords] = useState<CharacterRecord[]>(() => loadRoster());

  useEffect(() => {
    saveRoster(records);
  }, [records]);

  const get = (id: string) => records.find((r) => r.id === id);

  const upsert = (record: CharacterRecord) =>
    setRecords((rs) => {
      const i = rs.findIndex((r) => r.id === record.id);
      if (i < 0) return [...rs, record];
      const copy = rs.slice();
      copy[i] = record;
      return copy;
    });

  const remove = (id: string) => setRecords((rs) => rs.filter((r) => r.id !== id));

  const duplicate = (id: string) =>
    setRecords((rs) => {
      const r = rs.find((x) => x.id === id);
      if (!r) return rs;
      return [...rs, { ...clone(r), id: genId(), name: `${r.name} (másolat)` }];
    });

  return { records, get, upsert, remove, duplicate };
}
