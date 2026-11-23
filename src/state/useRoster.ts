import { useEffect, useMemo, useSyncExternalStore } from "react";
import { CharacterRecord } from "../model/character";
import { rosterStore } from "./rosterStore";

export interface RosterApi {
  records: CharacterRecord[];
  saveFailed: boolean; // the last save to this device failed (storage full or blocked)
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

const store = rosterStore();
const upsert = (r: CharacterRecord) => store.upsert(r);
const remove = (id: string) => store.remove(id);
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
