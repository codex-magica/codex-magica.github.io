# Notes for AI coding agents

Codex Magica is a Hungarian-language character sheet for the MAGUS tabletop RPG (React + TypeScript,
Vite, vitest, oxlint). User-facing text is Hungarian; code, comments and docs are English.

Checks before committing: `npm run typecheck`, `npm run lint`, `npm test`.

## Google Drive sync

Design, rules and setup: [docs/google-drive-sync.md](docs/google-drive-sync.md). In short:

- The hard requirement is that no edit is ever silently lost and a deleted character never silently comes
  back. Any change to `src/state/` sync or storage code must keep `driveSync.test.ts`,
  `syncRegressions.test.ts` and `useDriveSync.test.ts` green; add a test for any new failure mode.
- The sync deliberately does **not** cover several edge cases (several tabs syncing at once, edits that
  can't be saved locally when storage is full, sign-in without the token service, live updates, merging
  parallel edits field by field, …). This is a choice, made to keep the code small enough to be correct.
  Read "Scope and deliberate limitations" in the doc before adding support for any of them.
- The token service (`worker/`) is a Cloudflare Worker; deploy it before an app change that depends on it.
