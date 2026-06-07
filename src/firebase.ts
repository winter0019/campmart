import { initializeApp } from "firebase/app";

import {
  initializeFirestore,
} from "firebase/firestore";

import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

/**
 * SIMPLE FIRESTORE CONFIG
 * Stable across Chrome, Edge, Firefox, mobile with Database ID support
 */

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
  } as any,
  (firebaseConfig as any).firestoreDatabaseId || undefined
);

export const auth = getAuth(app);

export const storage = getStorage(app);

export default app;
