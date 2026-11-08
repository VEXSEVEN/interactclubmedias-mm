import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyClXEkakq6020I_Q8p0rW7dLFIK9_f4Zjs",
  authDomain: "interactmedias-psj.firebaseapp.com",
  databaseURL: "https://interactmedias-psj-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "interactmedias-psj",
  storageBucket: "interactmedias-psj.firebasestorage.app",
  messagingSenderId: "421927316079",
  appId: "1:421927316079:web:74f9c80975cef8324f7b9a",
};

export const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
