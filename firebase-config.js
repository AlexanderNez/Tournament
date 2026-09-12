// ─────────────────────────────────────────────────────────────────────────
// PASTE YOUR OWN FIREBASE CONFIG HERE.
// Get this from: Firebase Console → Project settings → General → Your apps → SDK setup and config.
// See README.md for the full step-by-step setup.
// ─────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "PASTE_ME",
  authDomain: "PASTE_ME.firebaseapp.com",
  projectId: "PASTE_ME",
  storageBucket: "PASTE_ME.appspot.com",
  messagingSenderId: "PASTE_ME",
  appId: "PASTE_ME"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
