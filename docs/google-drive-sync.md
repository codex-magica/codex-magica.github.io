# Google Drive sync

Players can keep their characters in sync across devices through **their own Google Drive**. The
browser talks to Google directly; there is no server of ours in between, and nothing is stored anywhere
except the player's device and their Drive.

The feature appears only in builds made with a Google OAuth client ID (`VITE_GOOGLE_CLIENT_ID`).
Without one, the app stays local-only and never contacts Google.

## How it works

- The **Google Drive** button on the roster opens a short explanation, a switch for **daily backups** (on by
  default) and a **Bekapcsolás** (turn on) button. Google's popup asks for `drive.appdata` (a hidden folder in
  the user's Drive that only this app can see; it can't read any other file) and the email address.
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
    content), so they converge without extra copies.
- **Nothing is replaced unless it was read.** A failed download stops the round and nothing is written; a
  download that isn't valid JSON is fetched again (a cut-off response reads fine the second time); a damaged
  file of this device's own is kept aside (`kind=unreadable`) before it's rewritten; another device's damaged
  file is left alone; entries that don't check out are skipped, not applied and not deleted; a file from a
  newer app version stops the round with a "please update" note.
- **Edits during a round** are kept: the result is reconciled with the roster as it is when the round ends.
  Every edit carries the version it was started from (the creator, the sheet's equipment, companion and
  condition editors); if the stored version changed since (a sync or another tab), the edit is saved
  alongside it as "(másik változat)" rather than over it. Every change re-reads what's saved first, so a
  stale tab can't overwrite another tab's work, and each device numbers its versions from one counter
  shared by its tabs.
- **Nothing is dropped for being unreadable.** Records from storage or Drive are only repaired, never
  rejected because the rules engine can't compute them today (that may be a bug fixed tomorrow): the
  screen shows "Ezt a karaktert most nem sikerült megnyitni" with export instead. Entries a device can't
  parse at all stay in its file verbatim. Saved data that couldn't be read is kept aside and offered on
  the roster for download.
- **Storage full:** memory isn't replaced by the older saved state; the sync uploads from memory, so the
  edit survives in Drive, and the renewal round trip waits.
- **A cloned device** (browser data restored onto a second device) is noticed by the mark each write
  leaves in the device file; it takes a new id and keeps its own edits as parallel versions.
- **Deletions** are kept as small markers (time + vector) and never expire, so an old copy in another device's
  file can't bring a deleted character back.
- **Daily backups** (if on, a per-device setting): before Drive's copy of a character is replaced by an edit
  from another day, or by a deletion, the last state of that day is saved as its own file (a deletion keeps
  the last state on the device until it's in Drive, so an edit just before deleting is kept too) (`kind=backup`; created once, never modified).
  Backups are written before the device's file, so nothing is ever replaced before its backup exists. The sync
  window lists them per character, deleted characters included; restoring adds the version as a new character
  with the date in its name and never replaces anything.
- **Timing.** While the token is valid, sync runs 2 seconds after an edit, when the app goes to the background
  and when it comes back. One round at a time, across tabs too (Web Locks); other tabs' changes arrive through
  the `storage` event.
- **Renewal without a tap.** Browser-only apps get a one-hour token and no refresh token. When it has expired,
  the app renews it at safe moments (app start, coming back to the app, arriving at the roster, or a minute
  without touches while changes are waiting) with a round trip through Google's authorization endpoint with
  `prompt=none` and `login_hint`. A small notice announces it 3 seconds ahead ("Most ne" cancels for 10
  minutes), and the app comes back to the same screen, tab and scroll position. Never while a window or the
  character creator is open or a text field has focus, and at most once every 10 minutes.
- Only if Google answers that it needs the user (signed out, permission removed) does the footer ask for a
  tap; silent attempts then pause for 12 hours (1 hour after other errors). The tap's popup has the account
  pre-filled.
- **Account check.** Every new token is checked against the account sync was set up with; a different
  account is refused with an explanation, so characters never merge into someone else's Drive.
- **Kikapcsolás** (turn off) revokes the token. Nothing is deleted: the characters stay on the device, and the
  files and backups stay in Drive (Drive → Settings → Manage apps can delete them).

Code: `src/state/rosterStore.ts` (the roster, edit stamps and deletion markers), `versions.ts` (version
vectors), `driveMerge.ts` (the merge, conflict resolution, backup selection, reconciling), `driveSyncEngine.ts`
(one round: reads, backups, write), `googleDrive.ts` (sign-in, renewal by redirect, Drive calls),
`useDriveSync.ts` (when to sync), `src/ui/DriveSyncModal.tsx`, `DriveHopNotice.tsx`, `scrollMemory.ts`.
Tests: `src/state/driveSync.test.ts` runs rounds between simulated devices against an in-memory Drive,
including randomized runs with concurrent rounds, failed and cut-off requests, lost responses, skewed clocks
and edits during rounds, checking that all devices converge and no edit is lost except by a deletion that saw it.

## Why this approach

Browser-only apps get a one-hour access token and no refresh token (a refresh token needs the client
secret, so a server). The options weighed:

| Option | Tap needed | Server | Catch |
|---|---|---|---|
| Popup each time the token expires | after each hour | none | a tap prompt |
| Redirect with `prompt=none` (chosen) | no, while the Google session lives | none | a quick hop through Google about once an hour of use; Google calls this flow legacy (if it's ever switched off, the app falls back to the tap) |
| A small token helper on the same domain (e.g. a Cloudflare Pages Function) | no | tiny, holds no character data | a piece of infrastructure to run |
| Firebase | no | yours | players' data in your project and quota |

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
   `https://<user>.github.io/<repo>/` (and `http://localhost:3000/`): the token renewal round trip
   returns there. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`). It is
   not a secret: it only works from the origins listed here.
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
you add a logo.

## Privacy

`public/privacy.html` is the privacy notice the Google consent screen links to. It states what the app
stores and where, and that Google user data is used only for the sync, under the Google API Services
User Data Policy's Limited Use requirements. Keep it in step with the feature.
