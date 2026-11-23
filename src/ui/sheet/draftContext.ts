import { createContext, useContext, useEffect } from "react";

// Editors on the sheet that keep a draft (the equipment text, the companion and condition windows) tell
// the sheet while they're open. Their changes are then saved against the character as it was when they
// opened, so if a sync brings another device's change meanwhile, both versions are kept instead of the
// draft silently replacing it.
export interface DraftApi {
  open: () => void;
  close: () => void;
}
export const DraftContext = createContext<DraftApi>({ open: () => {}, close: () => {} });

export const useDraftWhile = (active: boolean): void => {
  const { open, close } = useContext(DraftContext);
  useEffect(() => {
    if (!active) return;
    open();
    return close;
  }, [active, open, close]);
};
