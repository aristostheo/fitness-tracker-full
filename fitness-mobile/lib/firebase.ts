// @/lib/firebase.ts
import { Platform } from "react-native";
import { initializeApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  setPersistence,
  // NOTE: DO NOT import getReactNativePersistence here; we resolve it dynamically below
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

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

/**
 * Try to load getReactNativePersistence regardless of where your firebase version exports it.
 * - First try 'firebase/auth/react-native'
 * - Then try 'firebase/auth'
 * - If not found, return undefined (we'll fall back to inMemory)
 */
function resolveGetRNPersistence():
  | ((storage: typeof AsyncStorage) => any)
  | undefined {
  try {
    // Some versions export from the RN subpath
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("firebase/auth/react-native");
    if (mod?.getReactNativePersistence) return mod.getReactNativePersistence;
  } catch {}
  try {
    // Newer versions may re-export from the main entry
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("firebase/auth");
    if (mod?.getReactNativePersistence) return mod.getReactNativePersistence;
  } catch {}
  return undefined;
}

let auth =
  Platform.OS === "web"
    ? getAuth(app)
    : (() => {
        // Native: initialize once with RN persistence if available
        const getRNPersist = resolveGetRNPersistence();
        try {
          if (getRNPersist) {
            return initializeAuth(app, {
              persistence: getRNPersist(AsyncStorage),
            });
          } else {
            console.warn(
              "[firebase] getReactNativePersistence not found; falling back to in-memory persistence."
            );
            // Fall back (session won't survive app restarts)
            return initializeAuth(app, {});
          }
        } catch {
          // Hot-reload or already initialized
          return getAuth(app);
        }
      })();

// Web: durable session
if (Platform.OS === "web") {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
