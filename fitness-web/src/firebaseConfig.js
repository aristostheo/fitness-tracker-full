// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA79bGyI_bTle35GuOKNPqqDd3bniQEXYU",
  authDomain: "fitness-tracker-25254.firebaseapp.com",
  projectId: "fitness-tracker-25254",
  storageBucket: "fitness-tracker-25254.firebasestorage.app",
  messagingSenderId: "553795836715",
  appId: "1:553795836715:web:dfeb28e39114e1fa46836e",
  measurementId: "G-D850D0LNGD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use long-polling + ignore undefined fields to reduce internal assertions
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true, // or experimentalForceLongPolling: true
  ignoreUndefinedProperties: true,
});
export const storage = getStorage(app);
