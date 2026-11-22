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

// Ask the browser not to evict our storage (Safari, for one, may clear a site's data after a week
// without a visit unless it's installed to the home screen). Asked only once there's a character to
// protect, because Firefox shows a permission prompt for it. Best effort: some browsers just say no.
let persistRequested = false;
const requestPersistentStorage = (): void => {
  if (persistRequested || typeof navigator === "undefined" || !navigator.storage?.persist) return;
  persistRequested = true;
  void navigator.storage.persisted().then((already) => (already ? true : navigator.storage.persist())).catch(() => {});
};

// The character roster, kept in local storage on this device and saved on every change.
// `updatedAt` is stamped on each mutation (handy for exports and any future sync layer).
export function useRoster(): RosterApi {
  const [records, setRecords] = useState<CharacterRecord[]>(() => loadRoster());
  const recordsRef = useRef(records);
  recordsRef.current = records;

  useEffect(() => {
    saveRoster(records);
    if (records.length > 0) requestPersistentStorage();
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
