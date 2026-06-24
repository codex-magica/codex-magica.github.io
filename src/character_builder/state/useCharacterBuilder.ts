import { useMemo, useState } from "react";
import { CharacterRecord } from "../model/character";
import { RULES } from "../model/rulesDb";
import { derive } from "../engine/derive";
import { DerivedCharacter } from "../engine/types";
import { defaultRecord } from "./defaultRecord";

export interface CharacterBuilderApi {
  record: CharacterRecord;
  derived: DerivedCharacter;
  setRecord: (r: CharacterRecord) => void;
  update: (patch: Partial<CharacterRecord>) => void;
  patchPointBuy: (stat: keyof CharacterRecord["pointBuy"], value: number) => void;
  setSelection: (choiceId: string, option: string) => void;
}

// Minimal state container: holds the record, re-derives the sheet on every change.
export function useCharacterBuilder(initial: CharacterRecord = defaultRecord): CharacterBuilderApi {
  const [record, setRecord] = useState<CharacterRecord>(initial);

  const derived = useMemo(() => derive(RULES, record), [record]);

  const update = (patch: Partial<CharacterRecord>) => setRecord({ ...record, ...patch });

  const patchPointBuy = (stat: keyof CharacterRecord["pointBuy"], value: number) =>
    setRecord({ ...record, pointBuy: { ...record.pointBuy, [stat]: value } });

  const setSelection = (choiceId: string, option: string) =>
    setRecord({ ...record, selections: { ...record.selections, [choiceId]: option } });

  return { record, derived, setRecord, update, patchPointBuy, setSelection };
}
