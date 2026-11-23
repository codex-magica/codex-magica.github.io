// A short fingerprint of a character's content, used by the Drive sync to tell "the same version"
// from "a different version with the same timestamp", and identical copies from real conflicts.
// `updatedAt` and `syncVc` are bookkeeping, not content, so they're left out. Key order doesn't matter.

import { CharacterRecord } from "../model/character";

const stable = (v: unknown): string => {
  if (v === null || typeof v !== "object") return v === undefined ? "null" : JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(",")}}`;
};

// FNV-1a over the stable JSON, two independent 32-bit lanes → 16 hex characters. Not cryptographic;
// it only has to make accidental collisions between versions of one character practically impossible.
export const contentHash = (record: CharacterRecord): string => {
  const { updatedAt: _t, syncVc: _v, ...content } = record;
  const s = stable(content);
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995) ^ (b >>> 15);
  }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
};

export const sameContent = (a: CharacterRecord, b: CharacterRecord): boolean => contentHash(a) === contentHash(b);

// The edit stamp: never behind the version it was made from, even if this device's clock is behind
// another device's. That keeps "newer" meaningful across devices with skewed clocks.
export const nextStamp = (previous: number | undefined, now = Date.now()): number => Math.max(now, (previous ?? 0) + 1);
