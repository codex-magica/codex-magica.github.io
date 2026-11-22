import { useEffect, useRef, useState } from "react";
import { CharacterRecord } from "../model/character";
import { clone, genId, loadRoster, saveRoster } from "./storage";

export interface RosterApi {
  records: CharacterRecord[];
  get: (id: string) => CharacterRecord | undefined;
  upsert: (record: CharacterRecord) => void; // create or replace by id
  remove: (id: string) => void;
  duplicate: (id: string) => void;
}

// The character roster, kept in local storage on this device and saved on every change.
// `updatedAt` is stamped on each mutation (handy for exports and any future sync layer).
export function useRoster(): RosterApi {
  const [records, setRecords] = useState<CharacterRecord[]>(() => loadRoster());
  const recordsRef = useRef(records);
  recordsRef.current = records;

  useEffect(() => {
    saveRoster(records);
  }, [records]);

  const get = (id: string) => records.find((r) => r.id === id);

  const upsert = (record: CharacterRecord) => {
    const stamped = { ...record, updatedAt: Date.now() };
    setRecords((rs) => {
      const i = rs.findIndex((r) => r.id === stamped.id);
      if (i < 0) return [...rs, stamped];
      const copy = rs.slice();
      copy[i] = stamped;
      return copy;
    });
  };

  const remove = (id: string) => setRecords((rs) => rs.filter((r) => r.id !== id));

  const duplicate = (id: string) => {
    const r = recordsRef.current.find((x) => x.id === id);
    if (!r) return;
    const copy = { ...clone(r), id: genId(), name: `${r.name} (másolat)`, updatedAt: Date.now() };
    setRecords((rs) => [...rs, copy]);
  };

  return { records, get, upsert, remove, duplicate };
}
