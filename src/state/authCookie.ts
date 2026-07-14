// Keeps the CloudFront edge gate's `id_token` cookie fresh while the app is open: Firebase rotates
// the ID token roughly hourly, and every rotation is written back to the cookie, so a reload or
// navigation never hits the edge with a stale token. (If the tab was closed for longer, login.html
// silently refreshes from the persisted Firebase session instead — still no popup.)
// Harmless in local dev, where there is no edge gate.

import { getFirebase } from "./firebase";

let started = false;

export const initAuthCookieRefresh = (): void => {
  if (started) return;
  started = true;
  void getFirebase().then(({ auth, authMod }) => {
    authMod.onIdTokenChanged(auth, (user) => {
      if (!user) return; // sign-out clears the cookie explicitly in the logout flow
      void user.getIdToken().then((token) => {
        document.cookie = `id_token=${token}; Path=/; Secure; SameSite=Lax`;
      });
    });
  });
};
