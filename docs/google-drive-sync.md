# Google Drive sync

Players can keep their characters in sync across devices through **their own Google Drive**. The
browser talks to Google directly; there is no server of ours in between, and nothing is stored anywhere
except the player's device and their Drive.

The feature appears only in builds made with a Google OAuth client ID (`VITE_GOOGLE_CLIENT_ID`).
Without one, the app stays local-only and never contacts Google.

## How it works

- The **Google Drive** button on the roster opens a short explanation and a **Bekapcsolás** (turn on)
  button. Google's popup asks for one permission, `drive.appdata`: access to a hidden folder in the
  user's Drive that only this app can see. It cannot read any other file.
- The app keeps one file there, `codex-magica-roster.json`, with every character, its last-modified
  time and deletions.
- Each sync downloads the file, merges, and uploads the result. The merge is three-way per character
  against the version both sides last agreed on: a change on one side is taken over, deletions
  propagate, an edit beats a deletion, and if the same character was edited on two devices, both
  versions are kept (the other one as "… (másik eszközről)").
- Browser-only apps get a Google access token that lasts about an hour and no refresh token. While it
  is valid, sync runs by itself a few seconds after each edit and when the app comes back to the
  foreground. After that, the footer asks for a tap on **Google Drive**; Google's popup then usually
  closes by itself.
- **Kikapcsolás** (turn off) revokes the token. The characters on the device stay; the copy in Drive can
  be deleted under Drive → Settings → Manage apps.

Code: `src/state/googleDrive.ts` (sign-in and Drive calls), `driveMerge.ts` (the merge),
`driveSyncEngine.ts` (one sync round), `useDriveSync.ts` (when to sync), `src/ui/DriveSyncModal.tsx`.
Tests: `src/state/driveSync.test.ts` simulates several devices against an in-memory Drive.

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
5. **Data Access:** add the scope `https://www.googleapis.com/auth/drive.appdata`. Google classifies it
   as non-sensitive, so no security review is needed.
6. **Clients → Create client → Web application.** Under *Authorized JavaScript origins* add the site's
   origin, e.g. `https://<user>.github.io` (no path), and `http://localhost:3000` for local development.
   No redirect URIs are needed. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`). It is
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

To open sync to everyone later, set the publishing status to **In production** (Audience page). With
only the non-sensitive `drive.appdata` scope this needs no review; Google may ask you to verify the
domain in Search Console if you add a logo.

## Privacy

`public/privacy.html` is the privacy notice the Google consent screen links to. It states what the app
stores and where, and that Google user data is used only for the sync, under the Google API Services
User Data Policy's Limited Use requirements. Keep it in step with the feature.
