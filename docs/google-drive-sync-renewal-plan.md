# Plan: fewer taps for Google Drive sync

Status: **built** (2026-11-23), all six items; tested against a fake Google in the browser. Still to
confirm on a real iPad home-screen install. Added afterwards: a card that announces each round trip 3
seconds ahead (with "Most ne"), a round trip after a minute without touches while changes are waiting
(for a sheet left open all evening), and the return restores the sheet/compendium view, tab and scroll. The current sync (see
[google-drive-sync.md](google-drive-sync.md)) needs a tap whenever the one-hour Google token has expired.

## What "a tap per hour" means today

- Every edit is saved on the device first; nothing is lost. The question is only when it reaches Drive.
- A sign-in gives a token for about an hour. During that hour every edit is uploaded a few seconds later,
  and the app also syncs when it returns to the foreground.
- After the hour, sync pauses: edits keep saving locally and wait. The footer asks for a tap on
  **Google Drive**; Google's sheet then closes by itself and everything waiting is uploaded.
- A typical session: the app is opened days after the last one, so the token has long expired. One tap
  at the start, automatic for the first hour, then changes wait until someone taps.
- The real risk is switching devices: play three hours on the iPad, close it without tapping, open the
  phone at home, and the phone lacks the last two hours until the iPad syncs again.

## Why a tap is needed

A browser-only app gets Google access tokens through Google Identity Services, which only supports a
popup ("only the dialog UX is supported"), and Safari only opens popups from a tap. There is no refresh
token without a client secret, and a secret cannot live in the browser.

## The plan

1. **Renew silently at natural moments (redirect with `prompt=none`).** When the app starts, comes back
   to the foreground, or returns to the roster with sync on and an expired token, it navigates to
   Google's OAuth endpoint (`response_type=token`, `prompt=none`, `login_hint` = the user's email) and
   back. A navigation needs no tap. While the user's Google session is alive (usually weeks), no taps
   at all. At launch it looks like a slightly longer load.
2. **Never bounce at a bad moment.** Not while the creator or any modal is open. Save the current
   screen and character before leaving and restore them after the return. Only when online, at most once
   every few minutes (no loops).
3. **Sync more eagerly while the token is valid.** About 2 seconds after an edit instead of 4, and also
   when the app goes to the background (covers closing the iPad at the end of the night).
4. **Show what is waiting.** A small dot on the Google Drive button when there are unsynced changes;
   the window shows how many ("3 módosítás vár szinkronra").
5. **Make the fallback tap smooth.** If silent renewal fails (`login_required`, `interaction_required`,
   cookies cleared, offline at launch), highlight the button with the reason. Also request the
   `openid email` scopes (non-sensitive) to know the account: every tap and redirect then passes
   `login_hint`, so no account chooser appears, and the window shows which account syncs.
6. **Warn before switching devices.** If this device has unsynced changes older than a few hours, the
   roster says so ("Ezen az eszközön vannak még fel nem töltött módosítások").

Setup change: register the app's URL as an **Authorized redirect URI** on the OAuth client (the popup
flow needs only JavaScript origins).

## Risks to check first

- The redirect round trip in an iPad **home-screen** app is untested (the popup worked). Test this
  first; if it misbehaves, items 3 to 6 still help on their own.
- Google calls the redirect (implicit) flow "legacy support" and "considered insecure for browser-based
  single-page applications". It is not deprecated; if it is ever switched off, the app falls back to
  the tap.

## Alternatives considered

| Option | Tap needed | Server | Catch |
|---|---|---|---|
| Popup (current) | after each hour | none | tap prompt in the footer |
| Redirect with `prompt=none` (this plan) | no, while the Google session lives | none | page bounces through Google about once an hour of use; legacy flow |
| Token helper (e.g. a Cloudflare Worker holding the client secret) | no | tiny, holds no character data | one piece of infrastructure |
| Firebase (the private build's approach) | no | yours | players' data in your project and quota |

## Research notes (2026-11-23)

**Google's token types**

| Token | Lifetime | What it's for |
|---|---|---|
| Access token | about 1 hour, fixed | Calling the Drive API. The only thing the app sends to Drive. |
| Refresh token | long: until unused for 6 months, revoked, or over the cap (100 per Google account per client ID); **only 7 days while the consent screen is in Testing** | Minting new access tokens without the user. Web-app clients need the client secret to use one, so it needs a server. |
| ID token | about 1 hour | Proving who the user is ("Sign in with Google", One Tap, FedCM). Can come silently, but gives no Drive access. |
| Authorization code | minutes, one use | Exchanged once for access and refresh tokens (needs the secret for web clients). |
| Google session cookie | weeks | The user's login at accounts.google.com. What the redirect with `prompt=none` relies on. |
| Firebase ID and refresh tokens | 1 hour, refreshed forever | Firebase services only (why the private build synced silently). Not usable for Drive. |

**How other apps do it**

- draw.io (diagrams.net): its server exchanges the code with its client secret and keeps the refresh
  token in a secure HttpOnly cookie, so sessions outlast the hour.
- A small open-source app (naught, PR #31): a Cloudflare Pages Function on the **same domain** as the
  app exchanges the code and refreshes tokens; the refresh token lives only in an HttpOnly cookie, and
  nothing is stored on the server. The app tries a silent refresh before ever showing a popup.
- Browser-only apps without a server simply re-prompt.

**A variant worth considering:** host the app on Cloudflare Pages instead of GitHub Pages. A Pages
Function on the same domain can then refresh tokens through a first-party cookie (Safari allows that),
and Cloudflare Access can make the whole site private for a small group, which GitHub Pages can't. Both
are free at this scale. Note that refresh tokens last only 7 days while the Google consent screen is in
Testing, so this variant works best with the consent screen in production.

**Native apps (Android / iOS)**

- Android's Authorization API returns a fresh access token "without any user interaction" in later
  sessions, as long as the permission isn't removed; Google Play services handles the renewal.
- The iOS Google Sign-In SDK refreshes tokens itself (`refreshTokensIfNeeded`).
- So a native app (or the web app wrapped in a native shell such as Capacitor) syncs silently, but only
  for itself: tokens stay on that device, and Google's guidance is not to move refresh tokens around. A
  companion Android app would not make the iPad web app's token last longer.
