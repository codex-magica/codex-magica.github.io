# Google Drive sync

Players can keep their characters in sync across devices through **their own Google Drive**. The
characters travel only between the browser and Google, and are stored nowhere except the player's devices
and their Drive. A small token service (`worker/`, a Cloudflare Worker) renews the browser's Google access
so sync never needs a tap; it sees tokens, never characters, and stores nothing.

The feature appears only in builds made with a Google OAuth client ID (`VITE_GOOGLE_CLIENT_ID`) and a
token service (`VITE_TOKEN_SERVICE_URL`). Without both, the app stays local-only and never contacts Google.

## How it works

- The **Google Drive** button on the roster opens a short explanation, a switch for **daily backups** (on by
  default) and a **Bekapcsolás** (turn on) button. It takes the player to Google's consent page and back to
  the roster. Google asks for `drive.appdata` (a hidden folder in the user's Drive that only this app can
  see; it can't read any other file) and the email address.
- **One file per device.** Each device keeps its own file in that folder (`codex-magica-sync.<device>.json`)
  and is the only one that ever writes it, so two devices can never overwrite each other's work. A sync round
  lists the folder, downloads the files that changed since last time, merges them with the roster on the
  device, and writes the device's own file. A round where nothing changed costs one listing request.
- **Version vectors, not clocks.** Every character carries a small per-device edit counter. Comparing two
  versions tells exactly whether one replaced the other or whether they were edited in parallel, whatever the
  devices' clocks say:
  - one contains the other → the newer one;
  - edited in parallel and one of them deleted → the edit wins;
  - edited in parallel, same content → one version;
  - edited in parallel, different content → **both are kept**: the one edited last keeps the character, the
    other becomes "Név (másik változat)". Every device resolves it identically (the copy's id comes from its
    content), so they converge without extra copies. The kept version also remembers which version its
    content was made as, so when the device it came from edits it again before seeing the merge, that edit
    counts as continuing it, not as one more parallel edit.
- **Nothing is replaced unless it was read.** A failed download stops the round and nothing is written; a
  download that isn't valid JSON is fetched again (a cut-off response reads fine the second time; two
  different texts mean cut-off downloads, not a damaged file, and stop the round); a damaged
  file of this device's own is kept aside (`kind=unreadable`) before it's rewritten; another device's damaged
  file is left alone; entries that don't check out are skipped, not applied and not deleted; a file from a
  newer app version stops the round with a "please update" note.
- **Edits during a round** are kept: the result is reconciled with the roster as it is when the round ends.
  Every edit carries the version it was started from (the creator, the sheet's equipment, companion and
  condition editors); if the stored version changed since (a sync), the edit is saved alongside it as
  "(másik változat)" rather than over it. Every change re-reads what's saved first.
- **Nothing is dropped for being unreadable.** Records from storage or Drive are only repaired, never
  rejected because the rules engine can't compute them today (that may be a bug fixed tomorrow): the
  screen shows "Ezt a karaktert most nem sikerült megnyitni" with export instead. Entries a device can't
  parse at all stay in its file verbatim. Saved data that couldn't be read is kept aside and offered on
  the roster for download; if there's no room to keep it aside, it stays where it is and nothing is saved
  over it until the player has downloaded and dropped it.
- **Storage full (or blocked):** memory is always what's saved. A change that can't be saved isn't made,
  and a banner says so (with an export button) until saving works again; a sync round whose result
  can't be saved fails and is tried again. Characters take a few kilobytes and browsers give the app
  megabytes, so this is for blocked storage and the unexpected, not everyday use. The roster and the
  deletion markers are saved so that they always fit together (a roster without a character whose
  marker isn't saved would get it back from Drive): both write orders are tried (deleting a character,
  the way to make room, must work when storage is full), then the markers without the deleted
  characters' last states, and if nothing fits, what was saved before is put back.
- **A cloned device** (browser data restored onto a second device) is noticed by the mark each write
  leaves in the device file. The last mark seen in the file is kept apart from recent attempts, so a run
  of failed writes can't make a device's own file look foreign. It takes a new id; its versions that were
  never published (in neither Drive nor its own last upload) move to the new id and are kept as parallel
  versions, while shared history keeps its vector, so deletions made by the other device still apply.
- **Deletions** are kept as small markers (time + vector) and never expire, so an old copy in another device's
  file can't bring a deleted character back. A deletion beats only what it saw: the delete dialog deletes
  the version it showed (if a sync or another tab changed the character meanwhile, nothing is deleted and
  the roster says why), and a deletion made after seeing a merged version's content wins over it even
  though the merge made their vectors look parallel.
- **Daily backups** (if on, a per-device setting): before Drive's copy of a character is replaced by an edit
  from another day, or by a deletion, the last state of that day is saved as its own file (a deletion keeps
  the last state on the device until it's in Drive, however long that takes, so an edit just before
  deleting is kept too, also when a parallel edit elsewhere wins over the deletion) (`kind=backup`; created
  once, never modified).
  Backups are written before the device's file, so nothing is ever replaced before its backup exists. The sync
  window lists them per character, deleted characters included; restoring adds the version as a new character
  with the date in its name and never replaces anything.
- **One tab at a time.** The app runs in one browser tab at a time (`src/state/activeTab.ts`, a Web Lock
  held by the tab in use; another tab offers "Használat itt" to continue there, and a tab that was taken
  over reloads when continued; the lock is let go when the page is left, a busy lock is tried again for a
  moment before saying "another tab", and a return from Google's consent page takes it outright). Only the
  tab in use syncs: a round in a tab that stepped back writes nothing to Drive, and that tab neither
  retries nor turns sync on for itself (a connection it was finishing is saved for the tab in use, which
  follows the setting). Saving stays safe across tabs regardless: every change re-reads what's saved first.
- **Timing.** Sync runs 2 seconds after an edit, when the app goes to the background (renewing the token
  if it ran out, so an edit made just before locking the phone still goes), when it comes back, and when
  the device is back online.
- **Renewal.** Google's access tokens last an hour. Turning sync on uses the authorization-code flow
  (`access_type=offline`, `prompt=consent`, PKCE): the token service exchanges the code for an access token
  and a refresh token, and hands the refresh token back **encrypted** (AES-GCM, with a key only the service
  has) as an opaque credential, which stays on the device. When the access token runs out, the app sends the
  credential to the service and gets a new access token: no popup, no redirect, no tap. A token Drive refuses
  early is renewed and retried once. If the service is unreachable, the credential is kept and the next
  round tries again. A renewal answered after the credential changed (sync turned off, or reconnected) is
  dropped.
- **Retrying.** A round that fails for a passing reason (no network, Google or the token service busy) is
  tried again by itself after 30 seconds, then waiting twice as long each time, up to 15 minutes (and
  right away when the device comes back online or the app back to the foreground). Requests have time
  limits (the account check too), so a hung request can't stop sync.
- **Google storage full** (Drive answers `storageQuotaExceeded`): the player is told that their Google
  storage is full and only they can make room; rounds keep being retried (slowly), so sync goes on by
  itself afterwards.
- **What the player is told, and where.** The roster says at the top what sync needs from the player
  (reconnect, an app update, Google storage full, changes stuck on this device for hours), with a button
  to the sync window, and names the characters a round kept twice ("(másik változat)") or brought back
  after a deletion (an edit made elsewhere in parallel), until dismissed. The roster footer keeps the
  quiet status. If Google's permission goes away while the player is elsewhere (a character sheet), a
  card says so once on any screen. Coming back from Google's page with a problem reopens the sync window
  with what happened.
- **Reconnecting.** Only if Google withdrew the permission (revoked in the Google account, unused for six
  months) does the app ask the player to reconnect: the roster says so,
  and the window's **Újrakapcsolás** button goes through the consent page again, with the account pre-filled.
  The answer is stored only after the account check (and not at all if the check fails on the network:
  the player tries again): if another account answers, nothing it gave is kept and the right account's
  credential stays (the other account's permission stays in that account, which may
  sync a roster of its own elsewhere).
- **Account check.** Every new token is checked against the account sync was set up with; a different
  account is refused with an explanation, so characters never merge into someone else's Drive.
- **Kikapcsolás** (turn off) affects that device only: it forgets the token and the credential there, and
  revokes nothing at Google, because revoking removes the whole permission and would disconnect the player's
  other devices too. To withdraw access everywhere, the player removes the app in their Google account
  (myaccount.google.com/permissions); every device then gets `invalid_grant` and asks to reconnect.
  Nothing is deleted: the
  characters stay on the device, and the files and backups stay in Drive (Drive → Settings → Manage apps can delete them).

Code: `src/state/rosterStore.ts` (the roster, edit stamps and deletion markers), `storage.ts` (reading and
saving it), `versions.ts` (version vectors), `driveMerge.ts` (the merge, conflict resolution, backup
selection, reconciling), `driveSyncEngine.ts` (one round against Drive: reads, backups, write),
`driveSyncRound.ts` (a round with this device's saved sync state, clone handling), `syncState.ts` (what's
published, nonces, settings), `googleDrive.ts` (sign-in, the consent round trip, token service calls, Drive
calls), `useDriveSync.ts` (when to sync, what to tell the player), `driveStatus.ts` (the status texts),
`activeTab.ts` (one tab at a time), `transfer.ts` (export and import files); `src/ui/DriveSyncModal.tsx`,
`DriveHopNotice.tsx`, `TabGate.tsx`; the token service in `worker/src/index.ts` (tested in
`worker/src/index.test.ts`).
Tests: `src/state/driveSync.test.ts` runs rounds between simulated devices against an in-memory Drive,
including randomized runs with concurrent rounds, failed and cut-off requests, lost responses, skewed clocks
and edits during rounds, checking that all devices converge and no edit is lost except by a deletion that saw it.
`src/state/syncRegressions.test.ts` keeps the scenarios found in the pre-release reviews (storage full,
cloned devices, deletions racing syncs), and `src/state/useDriveSync.test.ts` runs the real hook against a
fake Google and token service (retries, renewals, the return from the consent page). They share the harness
in `src/state/testing/syncHarness.ts`; `googleDrive.test.ts`, `driveStatus.test.ts` and `activeTab.test.ts`
cover the Drive client, the status texts and the one-tab rule.

## Why this approach

Browser-only apps get a one-hour access token and no refresh token: a refresh token needs the client
secret, and a secret can't be kept in a public web app. The options weighed:

| Option | Tap needed | Server | Catch |
|---|---|---|---|
| Popup each time the token expires (supported until 2026-11; dropped as a second sign-in path to maintain) | about once an hour | none | a tap prompt |
| Redirect with `prompt=none` | would be none | none | doesn't work: Google answers `interaction_required` for this app every time |
| The client secret in the app | none | none | anyone could use the app's identity; a copied refresh token would work for months; against Google's policy |
| A stateless token service on Cloudflare Workers' free plan (chosen) | none | tiny, holds no data | a piece of infrastructure to run; it sees tokens in transit |
| Firebase | none | yours | players' data in your project and quota |

The token service keeps the refresh token inside the credential, encrypted, rather than in a database: there
is nothing to breach on the server, and replacing its key without keeping the old one (`BLOB_KEY_PREVIOUS`)
cancels every credential at once, should one ever leak. It answers only
the app's own origins, and is rate-limited.

A native app would renew silently, but only for itself: tokens stay on the device, so it wouldn't help the
web app.

## Setting it up

You need a Google account and about fifteen minutes. The steps use the Google Cloud console
(console.cloud.google.com); Google renames menu items now and then, so look for the closest match.

1. **Create a project**, for example "Codex Magica".
2. **Enable the Google Drive API**: APIs & Services → Library → Google Drive API → Enable.
3. **Google Auth Platform → Branding:** app name "Codex Magica", your support email, and under app
   domain the site's address (for GitHub Pages `https://<user>.github.io/<repo>/`) and the privacy
   policy `https://<user>.github.io/<repo>/privacy.html`. Add `<user>.github.io` as an authorized domain.
   Skip the logo for now: uploading one triggers a brand review.
4. **Audience:** user type *External*. Leave the publishing status on **Testing** and add the Google
   accounts that may use sync as **test users** (up to 100). Only they can turn sync on; this is how
   to roll the feature out privately.
5. **Data Access:** add the scopes `https://www.googleapis.com/auth/drive.appdata`, `openid` and
   `.../auth/userinfo.email`. Google classifies all three as non-sensitive, so no security review is
   needed.
6. **Clients → Create client → Web application.** Under *Authorized JavaScript origins* add the site's
   origin, e.g. `https://<user>.github.io` (no path), and `http://localhost:3000` for local development.
   Under *Authorized redirect URIs* add the app's full address with a trailing slash, e.g.
   `https://<user>.github.io/<repo>/` (and `http://localhost:3000/`): the consent round trip returns
   there. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`). It is not a secret: it only
   works from the origins listed here. For the token service you also need a **client secret**: on the
   client's page, *Add secret*, and copy it right away (Google shows it only once).
7. **Local development:** put it in `.env.local` (gitignored):

   ```sh
   VITE_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   ```

   and run `npm run dev`. Google only accepts `https://` origins and `http://localhost`, so sync works on
   `http://localhost:3000` but not through a LAN address like `http://192.168.x.x:3000`; test phones and
   tablets on the deployed site.
8. **GitHub Pages:** add a repository variable `GOOGLE_CLIENT_ID` with the client ID (Settings → Secrets
   and variables → Actions → Variables). The deploy workflow passes it to the build.

To open sync to everyone, set the publishing status to **In production** (Audience page). With only
non-sensitive scopes this needs no review; Google may ask you to verify the domain in Search Console if
you add a logo. In *Testing*, Google's long-term permissions expire after 7 days, so players would have to
reconnect weekly.

### The token service

Required for sync. Free on Cloudflare's Workers plan (no card).

1. **Cloudflare account** (dash.cloudflare.com), free plan. Under *Workers & Pages* pick your
   `*.workers.dev` subdomain.
2. **Configure** `worker/wrangler.toml`: your client IDs in `GOOGLE_CLIENT_ID` (production and the `dev`
   environment) and the app's origins in `ALLOWED_ORIGINS`.
3. **Secrets**, once per environment, from `worker/` (log in first with `npx wrangler login`):

   ```sh
   npx wrangler secret put GOOGLE_CLIENT_SECRET --env=""        # paste the production client's secret
   openssl rand -base64 32 | npx wrangler secret put BLOB_KEY --env=""
   npx wrangler secret put GOOGLE_CLIENT_SECRET --env dev       # the dev client's secret
   openssl rand -base64 32 | npx wrangler secret put BLOB_KEY --env dev
   ```

4. **Deploy:** `npm ci && npm run deploy` (production) and `npm run deploy:dev`, in `worker/`. Check
   `https://<name>.<subdomain>.workers.dev/health`: it should say `"configured":true`.
5. **The app:** set the repository variable `TOKEN_SERVICE_URL` to the production Worker's address (no
   trailing slash), and for local development add `VITE_TOKEN_SERVICE_URL=` with the dev Worker's address
   to `.env.local`.
6. **Automatic deploys** (optional): a Cloudflare API token from the *Edit Cloudflare Workers* template as the
   repository secret `CLOUDFLARE_API_TOKEN`, the account ID as the variable `CLOUDFLARE_ACCOUNT_ID`, and
   `DEPLOY_WORKER=true`. `.github/workflows/deploy-worker.yml` then tests and deploys the Worker whenever
   `worker/` changes on `main`.

**Rules for changes:** the Worker must keep working with the app version players still have open (an
installed app updates on its next start). Add to its API before the app uses the addition, and remove
something only a release after the app stopped using it. Rotating `BLOB_KEY`: move the old key to
`BLOB_KEY_PREVIOUS` and set a new one; credentials are re-encrypted as they are used. Dropping the previous
key makes every device that hasn't renewed since reconnect once.

## Privacy

`public/privacy.html` is the privacy notice the Google consent screen links to. It states what the app
stores and where, and that Google user data is used only for the sync, under the Google API Services
User Data Policy's Limited Use requirements. Keep it in step with the feature.
