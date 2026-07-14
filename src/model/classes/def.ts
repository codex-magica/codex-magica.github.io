import { GrantEntry, Resource } from "../effects";
import { ChoiceDef } from "../choices";
import { RACE_NAMES } from "../races";

export interface ClassDef {
  name: string;
  cost: number;
  allowedRaces: string[];
  sexRestriction?: "female" | "male";
  grants: GrantEntry[]; // universal — always applied (free backgrounds, magic skill, teaching…)
  baseSkills?: GrantEntry[]; // shared base skill package (additive classes)
  choices: ChoiceDef[];
  suggestedAllocation?: Partial<Record<Resource, number>>;
}

export const ALL = RACE_NAMES;
