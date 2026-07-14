// Character classes (kasztok) as flexible recursive choice trees — transcribed from chapters 03–15.
//
// Per class, specialization is modelled with ChoiceDef nodes (see model/choices.ts):
//   • OVERRIDE classes (a school = a whole new package): Harcos, Lovag, Bárd, Boszorkánymester.
//     class.baseSkills is empty; each option carries its full level-1 package; an "Általános"
//     option holds the no-school/base package.
//   • ADDITIVE classes (shared base + deltas): Pap, Paplovag, Harcművész, Boszorkány, Tűzvarázsló,
//     Varázsló. class.baseSkills holds the shared package; options add deltas.
//   • TYPE + CLAN (two axes): Fejvadász, Tolvaj. A "típus" choice (override) gives the package; a
//     "klán" choice (additive) overlays abilities.
// Nested sub-choices: Arel-pap → irányzat; Isten Kardja → Arc. The tree is fully recursive.

import { ClassDef } from "./def";
import { Harcos } from "./harcos";
import { Lovag } from "./lovag";
import { Fejvadász } from "./fejvadasz";
import { Tolvaj } from "./tolvaj";
import { Bárd } from "./bard";
import { Harcművész } from "./harcmuvesz";
import { Pap } from "./pap";
import { Paplovag } from "./paplovag";
import { Boszorkány } from "./boszorkany";
import { Boszorkánymester } from "./boszorkanymester";
import { Tűzvarázsló } from "./tuzvarazslo";
import { Varázsló } from "./varazslo";

export type { ClassDef };

export const CLASSES: Record<string, ClassDef> = {
  Harcos,
  Lovag,
  Fejvadász,
  Tolvaj,
  Bárd,
  Harcművész,
  Pap,
  Paplovag,
  Boszorkány,
  Boszorkánymester,
  Tűzvarázsló,
  Varázsló,
};

export const CLASS_NAMES = Object.keys(CLASSES);
