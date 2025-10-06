// // lib/firebase.ts
// import { initializeApp, getApps, getApp } from "firebase/app";
// import { getAuth, initializeAuth, inMemoryPersistence } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// import { getReactNativePersistence } from "firebase/auth";

// const firebaseConfig = {
//   apiKey: "AIzaSyA79bGyI_bTle35GuOKNPqqDd3bniQEXYU",
//   authDomain: "fitness-tracker-25254.firebaseapp.com",
//   projectId: "fitness-tracker-25254",
//   storageBucket: "fitness-tracker-25254.firebasestorage.app",
//   messagingSenderId: "553795836715",
//   appId: "1:553795836715:web:dfeb28e39114e1fa46836e",
//   measurementId: "G-D850D0LNGD",
// };

// export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// // 🔑 Ensure Auth is initialized with persistence once
// let _auth;
// try {
//   _auth = initializeAuth(app, {
//     persistence: getReactNativePersistence(AsyncStorage),
//   });
// } catch {
//   // fallback: already initialized
//   _auth = getAuth(app);
// }

// export const auth = _auth;
// export const db = getFirestore(app);
// mobile/lib/firebase.ts
// src/lib/firebase.ts (or @/lib/firebase)
// lib/firebase.ts
// lib/firebase.ts
// @/lib/firebase.ts
import { Platform } from "react-native";
import { initializeApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  inMemoryPersistence,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA79bGyI_bTle35GuOKNPqqDd3bniQEXYU",
  authDomain: "fitness-tracker-25254.firebaseapp.com",
  projectId: "fitness-tracker-25254",
  storageBucket: "fitness-tracker-25254.firebasestorage.app",
  messagingSenderId: "553795836715",
  appId: "1:553795836715:web:dfeb28e39114e1fa46836e",
  measurementId: "G-D850D0LNGD",
};

export const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

// IMPORTANT: don’t mix getAuth() and initializeAuth() on native.
// Initialize ONCE for native; use getAuth for web.
let auth =
  Platform.OS === "web"
    ? getAuth(app)
    : (() => {
        try {
          return initializeAuth(app, { persistence: inMemoryPersistence });
        } catch {
          // Already initialized (hot reload) — fall back to existing instance
          return getAuth(app);
        }
      })();

// Web: ensure durable persistence (no-op on native)
if (Platform.OS === "web") {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

export { auth };
export const db = getFirestore(app);
