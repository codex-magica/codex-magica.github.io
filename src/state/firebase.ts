// Lazy Firebase bootstrap for Google sync. The SDK is dynamic-imported so it stays out of the main
// bundle until the user actually enables sync. The config below is a public app identifier, not a
// secret — all access control lives in the Firestore security rules (each signed-in user can only
// read/write users/{their-own-uid}/characters/**).

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export interface FirebaseHandles {
  auth: import("firebase/auth").Auth;
  db: import("firebase/firestore").Firestore;
  authMod: typeof import("firebase/auth");
  fsMod: typeof import("firebase/firestore");
}

let handles: Promise<FirebaseHandles> | null = null;

export const getFirebase = (): Promise<FirebaseHandles> => {
  if (!handles) {
    handles = (async () => {
      const [appMod, authMod, fsMod] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
        import("firebase/firestore"),
      ]);
      const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
      return { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
    })();
  }
  return handles;
};
