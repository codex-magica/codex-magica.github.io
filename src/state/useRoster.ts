import { useEffect, useRef, useState } from "react";
import { CharacterRecord } from "../model/character";
import { clone, genId, loadRoster, saveRoster } from "./storage";
import { addTombstone } from "./syncState";

export interface RosterApi {
  records: CharacterRecord[];
  get: (id: string) => CharacterRecord | undefined;
  upsert: (record: CharacterRecord) => void; // create or replace by id
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  // for the optional Google Drive sync: counts local edits (not sync results), and applies a merge
  localRevision: number;
  applySync: (update: (current: CharacterRecord[]) => CharacterRecord[]) => void;
  currentRecords: () => CharacterRecord[];
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
// `updatedAt` is stamped on each mutation, and deletions leave a tombstone, so the optional Google
// Drive sync can tell what changed where.
export function useRoster(): RosterApi {
  const [records, setRecords] = useState<CharacterRecord[]>(() => loadRoster());
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const [localRevision, setLocalRevision] = useState(0);
  const bump = () => setLocalRevision((n) => n + 1);

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
    bump();
  };

  const remove = (id: string) => {
    addTombstone(id);
    setRecords((rs) => rs.filter((r) => r.id !== id));
    bump();
  };

  const duplicate = (id: string) => {
    const r = recordsRef.current.find((x) => x.id === id);
    if (!r) return;
    const copy = { ...clone(r), id: genId(), name: `${r.name} (másolat)`, updatedAt: Date.now() };
    setRecords((rs) => [...rs, copy]);
    bump();
  };

  const applySync = (update: (current: CharacterRecord[]) => CharacterRecord[]) => {
    const next = update(recordsRef.current);
    recordsRef.current = next;
    setRecords(next);
  };

  return { records, get, upsert, remove, duplicate, localRevision, applySync, currentRecords: () => recordsRef.current };
}
