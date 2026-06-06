import { initializeApp } from "firebase/app";

import { 
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";

import { getStorage } from "firebase/storage";

import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

/**
 * FIRESTORE
 * Important fixes:
 * - experimentalForceLongPolling
 * - useFetchStreams: false
 * - persistent cache
 * - multiple tab support
 */

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    useFetchStreams: false,

    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  },
  (firebaseConfig as any).firestoreDatabaseId || undefined
);

/**
 * AUTH
 */

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Auth persistence error:", error);
  });

/**
 * STORAGE
 */

export const storage = getStorage(app);

export default app;