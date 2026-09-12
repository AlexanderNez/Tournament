// ─────────────────────────────────────────────────────────────────────────
// PASTE YOUR OWN FIREBASE CONFIG HERE.
// Get this from: Firebase Console → Project settings → General → Your apps → SDK setup and config.
// See README.md for the full step-by-step setup.
// ─────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAIqsNTYIsFJNjLJ-xueHeFTwlC8D1ugdM",
  authDomain: "sunset-horizon.firebaseapp.com",
  projectId: "sunset-horizon",
  storageBucket: "sunset-horizon.firebasestorage.app",
  messagingSenderId: "726614443162",
  appId: "1:726614443162:web:47ca3c84c66a765611cb23",
  measurementId: "G-0CCG1PGMJR"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
