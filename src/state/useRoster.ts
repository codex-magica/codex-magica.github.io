import { useEffect, useMemo, useSyncExternalStore } from "react";
import { CharacterRecord } from "../model/character";
import { rosterStore } from "./rosterStore";

export interface RosterApi {
  records: CharacterRecord[];
  saveFailed: boolean; // the last save to this device failed (storage full or blocked)
  get: (id: string) => CharacterRecord | undefined;
  upsert: (record: CharacterRecord, base?: CharacterRecord) => void; // create or replace by id; `base`: the version the edit started from
  remove: (id: string, base?: CharacterRecord) => boolean; // `base`: the version the player confirmed; false if it changed since
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

const store = rosterStore();
const upsert = (r: CharacterRecord, base?: CharacterRecord) => store.upsert(r, base);
const remove = (id: string, base?: CharacterRecord) => store.remove(id, base);
const duplicate = (id: string) => store.duplicate(id);

// The character roster (see rosterStore.ts). The callbacks are stable; the object changes only when
// the roster does.
export function useRoster(): RosterApi {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const hasAny = state.records.length > 0;
  useEffect(() => {
    if (hasAny) requestPersistentStorage();
  }, [hasAny]);
  return useMemo(
    () => ({ records: state.records, saveFailed: state.saveFailed, get: (id: string) => state.records.find((r) => r.id === id), upsert, remove, duplicate }),
    [state.records, state.saveFailed]
  );
}
