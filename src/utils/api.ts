import { Marketer, Worker, LiveActivity, DashboardStats } from "../types";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

// Promise timeout helper to prevent Firestore SDK from hanging indefinitely on network/proxy blocks
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 4000, context: string = "Operation"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${context} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Drops fields that are undefined or non-serializable to prevent setDoc from throwing SDK errors
function cleanFirestorePayload<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
}

// Helper function to upload photos to Firebase Storage if they are base64
async function uploadPhotoStorageIfNeeded(entityId: string, photo: string | undefined): Promise<string | null> {
  if (!photo) return null;
  if (photo.startsWith("data:image")) {
    try {
      const match = photo.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
      const mimeType = match ? match[1] : "image/jpeg";
      const storageRef = ref(storage, `gallery/${entityId}`);
      
      // Perform upload with 6000ms timeout
      await withTimeout(
        uploadString(storageRef, photo, "data_url", { contentType: mimeType }),
        6000,
        "Storage string upload"
      );
      
      const downloadURL = await withTimeout(
        getDownloadURL(storageRef),
        4000,
        "Storage download URL retrieval"
      );
      
      console.log(`Successfully uploaded photo to storage for ${entityId}: ${downloadURL}`);
      return downloadURL;
    } catch (err) {
      console.error("Failed to upload photo to Firebase Storage, using base64 fallback:", err);
      return photo;
    }
  }
  return photo;
}

// In-Memory or LocalStorage-backed fallback database for Netlify / Static hosting environments.
const LOCAL_DB_KEY = "campmark_fallback_db";

interface LocalDB {
  marketers: Marketer[];
  activities: LiveActivity[];
}

function getInitialLocalDB(): LocalDB {
  return {
    marketers: [],
    activities: []
  };
}

function loadLocalDB(): LocalDB {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to read fallback DB from localStorage:", e);
  }
  const initial = getInitialLocalDB();
  saveLocalDB(initial);
  return initial;
}

function saveLocalDB(db: LocalDB) {
  try {
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("Failed to write fallback DB to localStorage:", e);
  }
}

function logLocalActivity(db: LocalDB, type: string, message: string, details?: string) {
  const newActivity: LiveActivity = {
    id: `act-${Date.now()}`,
    type: type as any,
    timestamp: new Date().toISOString(),
    message,
    details
  };
  db.activities.unshift(newActivity);
  if (db.activities.length > 40) {
    db.activities = db.activities.slice(0, 40);
  }
}

// Check if response is likely HTML (meaning the API was intercepted or returned static 404/fallback page)
async function isHtmlResponse(response: Response): Promise<{ isHtml: boolean; text: string }> {
  try {
    const text = await response.text();
    const isHtml = text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html") || text.trim().startsWith("<body");
    return { isHtml, text };
  } catch (e) {
    return { isHtml: false, text: "" };
  }
}

// dynamic API endpoint resolver for CORS environments (e.g. Netlify)
export function getApiUrl(path: string): string {
  const savedUrl = localStorage.getItem("campmark_server_url");
  if (savedUrl) {
    const cleanUrl = savedUrl.replace(/\/+$/, "");
    return `${cleanUrl}${path}`;
  }

  const host = window.location.host;
  if (host.includes("run.app") || host.includes("localhost:3000") || host.includes("127.0.0.1:3000")) {
    return path;
  }
  return `https://ais-pre-qt7dsgacndhinsmr4bg5cf-10883856286.europe-west1.run.app${path}`;
}

// Proxies remote image URLs through the same-origin backend to prevent CORS security errors with canvas/html2canvas
export function getProxyImageUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("preset:")) return url;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("http")) {
    return getApiUrl(`/api/image-proxy?url=${encodeURIComponent(url)}`);
  }
  return url;
}

// --- Firestore Hardened Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Master API wrapper with Firestore priority
export const api = {
  // 1. Auth Login
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    try {
      const response = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const { isHtml, text } = await isHtmlResponse(response);
      if (isHtml || !response.ok) {
        if (isHtml) {
          throw new Error("HTML_RESPONSE");
        }
        const errData = JSON.parse(text || "{}");
        throw new Error(errData.error || "Authentication failed.");
      }

      return JSON.parse(text);
    } catch (e: any) {
      console.warn("Running in Static Fallback Mode for Auth", e);
      
      const usernameLower = username.toLowerCase();
      
      // Match Evans Okwor & Idris Dangalan fallback credentials
      if (usernameLower === "admin" && (password === "admin" || password === "admin_change_this_on_netlify")) {
        return {
          token: "local-jwt-token-admin",
          user: { id: "admin-user", username: "admin", fullName: "Idris Dangalan", role: "admin" }
        };
      }
      if (usernameLower === "admin001" && (password === "evans001" || password === "admin001_change_this_on_netlify")) {
        return {
          token: "local-jwt-token-admin-evans",
          user: { id: "admin-user-evans", username: "admin001", fullName: "Mr. Evans Okwor", role: "admin" }
        };
      }

      // Check if username/password matches local or Firestore marketer
      try {
        const marketers = await this.getMarketers();
        const found = marketers.find(m => m.fullName.toLowerCase() === usernameLower || m.businessName.toLowerCase() === usernameLower);
        if (found && (password === found.phone || password === "password")) {
          return {
            token: `local-jwt-token-${found.id}`,
            user: { id: found.id, username: found.fullName, fullName: found.fullName, role: "marketer" }
          };
        }
      } catch (err) {
        console.error("Auth check against database failed", err);
      }

      // Local storage fallback
      const dbLocal = loadLocalDB();
      const foundLocal = dbLocal.marketers.find(m => m.fullName.toLowerCase() === usernameLower || m.businessName.toLowerCase() === usernameLower);
      if (foundLocal && (password === foundLocal.phone || password === "password")) {
        return {
          token: `local-jwt-token-${foundLocal.id}`,
          user: { id: foundLocal.id, username: foundLocal.fullName, fullName: foundLocal.fullName, role: "marketer" }
        };
      }
      throw new Error("Invalid master credentials.");
    }
  },

  // 2. Fetch Stalls (Marketers)
  async getMarketers(): Promise<Marketer[]> {
    let firestoreList: Marketer[] = [];
    let firestoreFailed = false;

    try {
      // Fetch with timeout to guarantee it never hangs the UI
      const marketersRef = collection(db, "marketers");
      const q = query(marketersRef);
      const querySnapshot = await withTimeout(getDocs(q), 3000, "getMarketers Firestore");
      firestoreList = querySnapshot.docs.map(docSnap => docSnap.data() as Marketer);
    } catch (e) {
      console.warn("Firestore fetch marketers failed or timed out. Falling back to backend/cache:", e);
      firestoreFailed = true;
    }

    // Try reading from Express backend JSON database
    let expressList: Marketer[] = [];
    try {
      const response = await fetch(getApiUrl("/api/marketers"));
      const { isHtml, text } = await isHtmlResponse(response);
      if (!isHtml && response.ok) {
        expressList = JSON.parse(text);
      }
    } catch (apiErr) {
      console.warn("Express backend marketers fetch failed:", apiErr);
    }

    // Merge databases: Prioritize Firestore data, then Express, then LocalStorage fallback cache
    const mergedMap = new Map<string, Marketer>();

    // Load LocalStorage first
    const dbLocal = loadLocalDB();
    if (Array.isArray(dbLocal.marketers)) {
      dbLocal.marketers.forEach(m => {
        if (m && m.id) mergedMap.set(m.id, m);
      });
    }

    // Overlay Express backend
    expressList.forEach(m => {
      if (m && m.id) mergedMap.set(m.id, m);
    });

    // Overlay Firestore live records (highest priority truth)
    firestoreList.forEach(m => {
      if (m && m.id) mergedMap.set(m.id, m);
    });

    const mergedList = Array.from(mergedMap.values());

    // Auto-heal / synchronize the databases in the background!
    // 1. If Firestore-query is clean and successful (not failed/timed out), but lacks any marketers
    // that are registered on local/Express, upload those missing marketers to Firestore in the background.
    if (!firestoreFailed) {
      const missingInFirestore = mergedList.filter(m => !firestoreList.some(fm => fm.id === m.id));
      missingInFirestore.forEach(async (m) => {
        try {
          console.log(`Self-healing: Synchronizing missing marketer "${m.businessName}" up to Firestore...`);
          const docRef = doc(db, "marketers", m.id);
          const cleanM = cleanFirestorePayload({
            ...m,
            photo: m.photo || null,
            description: m.description || "No description provided."
          });
          await withTimeout(setDoc(docRef, cleanM), 2500, `Heal marketer ${m.id}`);
        } catch (e) {
          console.warn(`Failed background sync up of "${m.businessName}":`, e);
        }
      });
    }

    // 2. Keep the local cache up to date
    dbLocal.marketers = mergedList;
    saveLocalDB(dbLocal);

    return mergedList;
  },

  // 3. Register Stall
  async registerMarketer(payload: {
    fullName: string;
    businessName: string;
    phone: string;
    standNumber: string;
    category: string;
    description?: string;
    photo?: string;
  }): Promise<Marketer> {
    const id = `mkt-${Date.now()}`;
    const uploadedPhoto = await uploadPhotoStorageIfNeeded(id, payload.photo);

    const newMarketer: Marketer = {
      id,
      fullName: payload.fullName,
      businessName: payload.businessName,
      phone: payload.phone,
      standNumber: payload.standNumber,
      category: payload.category,
      description: payload.description || "No description provided.",
      photo: uploadedPhoto || null,
      createdAt: new Date().toISOString(),
      workers: [],
      verificationStatus: "pending",
      amountPaid: 0
    };

    // Try committing to Firestore first
    try {
      const docRef = doc(db, "marketers", newMarketer.id);
      const cleanM = cleanFirestorePayload(newMarketer);
      await withTimeout(setDoc(docRef, cleanM), 4500, "registerMarketer Firestore write");

      // Log success activity to Firestore
      const newActivity: LiveActivity = {
        id: `act-${Date.now()}`,
        type: "marketer_registered",
        timestamp: new Date().toISOString(),
        message: `Registered new campaign marketer: ${payload.businessName}`,
        details: `Managed by ${payload.fullName} at Stand ${payload.standNumber}.`
      };
      await withTimeout(setDoc(doc(db, "activities", newActivity.id), cleanFirestorePayload(newActivity)), 3000, "registerMarketer activity write");
    } catch (e: any) {
      console.warn("Failed to write marketer to Firestore. Using fallback static local registry.", e);
      // Fallback local persistence
      const dbLocal = loadLocalDB();
      const duplicate = dbLocal.marketers.find(m => m.standNumber.trim() === payload.standNumber.trim());
      if (duplicate) {
        throw new Error(`Stand number is already occupied by ${duplicate.businessName}. Please choose another stand.`);
      }
      dbLocal.marketers.push(newMarketer);
      logLocalActivity(dbLocal, "marketer_registered", `Registered new campaign marketer: ${payload.businessName}`, `Managed by ${payload.fullName} at Stand ${payload.standNumber}.`);
      saveLocalDB(dbLocal);
    }

    try {
      // Attempt backend endpoint trigger with complete constructed object to sync IDs perfectly!
      await fetch(getApiUrl("/api/marketers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMarketer)
      });
    } catch (err) {
      // Graceful ignore
    }

    return newMarketer;
  },

  // 4. Update Verification Status
  async updateVerificationStatus(id: string, status: "verified" | "pending" | "review"): Promise<any> {
    try {
      const docRef = doc(db, "marketers", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Marketer;
        await setDoc(docRef, { ...data, verificationStatus: status });

        const newActivity: LiveActivity = {
          id: `act-${Date.now()}`,
          type: "marketer_registered",
          timestamp: new Date().toISOString(),
          message: `Status altered for ${data.businessName}`,
          details: `Seeded verification status state to ${status.toUpperCase()}.`
        };
        await setDoc(doc(db, "activities", newActivity.id), newActivity);
      }
    } catch (e: any) {
      console.warn("Firestore status update failed, writing local cache", e);
    }

    try {
      await fetch(getApiUrl(`/api/marketers/${id}/status`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      // Graceful
    }

    // Always update local storage
    const dbLocal = loadLocalDB();
    const index = dbLocal.marketers.findIndex(m => m.id === id);
    if (index !== -1) {
      dbLocal.marketers[index].verificationStatus = status;
      logLocalActivity(dbLocal, "marketer_registered", `Status altered for ${dbLocal.marketers[index].businessName}`, `Seeded verification status state to ${status.toUpperCase()}.`);
      saveLocalDB(dbLocal);
      return { success: true, verificationStatus: status };
    }
    return { success: true, verificationStatus: status };
  },

  // 5. Update Payment Amount (₦)
  async updatePayment(id: string, amountPaid: number): Promise<any> {
    try {
      const docRef = doc(db, "marketers", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Marketer;
        const oldPaid = data.amountPaid || 0;
        await setDoc(docRef, { ...data, amountPaid });

        const newActivity: LiveActivity = {
          id: `act-${Date.now()}`,
          type: "marketer_registered",
          timestamp: new Date().toISOString(),
          message: `Payment updated for ${data.businessName}`,
          details: `Changed amount paid from ₦${oldPaid.toLocaleString()} to ₦${amountPaid.toLocaleString()}.`
        };
        await setDoc(doc(db, "activities", newActivity.id), newActivity);
      }
    } catch (e: any) {
      console.warn("Firestore payment update failed", e);
    }

    try {
      await fetch(getApiUrl(`/api/marketers/${id}/payment`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaid })
      });
    } catch (err) {
      // Graceful
    }

    const dbLocal = loadLocalDB();
    const index = dbLocal.marketers.findIndex(m => m.id === id);
    if (index !== -1) {
      const oldPaid = dbLocal.marketers[index].amountPaid || 0;
      dbLocal.marketers[index].amountPaid = amountPaid;
      logLocalActivity(dbLocal, "marketer_registered", `Payment updated for ${dbLocal.marketers[index].businessName}`, `Changed amount paid from ₦${oldPaid.toLocaleString()} to ₦${amountPaid.toLocaleString()}.`);
      saveLocalDB(dbLocal);
      return { success: true, amountPaid };
    }
    return { success: true, amountPaid };
  },

  // 6. Delete Stall
  async deleteMarketer(id: string): Promise<any> {
    try {
      const docRef = doc(db, "marketers", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Marketer;
        await deleteDoc(docRef);

        const newActivity: LiveActivity = {
          id: `act-${Date.now()}`,
          type: "marketer_deleted",
          timestamp: new Date().toISOString(),
          message: `Removed campaign marketer: ${data.businessName}`,
          details: "All associated workers also unregistered."
        };
        await setDoc(doc(db, "activities", newActivity.id), newActivity);
      }
    } catch (e: any) {
      console.warn("Firestore marketer deletion failed", e);
    }

    try {
      await fetch(getApiUrl(`/api/marketers/${id}`), {
        method: "DELETE"
      });
    } catch (err) {
      // Graceful
    }

    const dbLocal = loadLocalDB();
    const index = dbLocal.marketers.findIndex(m => m.id === id);
    if (index !== -1) {
      const name = dbLocal.marketers[index].businessName;
      dbLocal.marketers.splice(index, 1);
      logLocalActivity(dbLocal, "marketer_deleted", `Removed campaign marketer: ${name}`, "All associated workers also unregistered.");
      saveLocalDB(dbLocal);
      return { success: true };
    }
    throw new Error("Marketer not found in local tracking cache.");
  },

  // 7. Add Worker
  async addWorker(marketerId: string, payload: {
    fullName: string;
    phone: string;
    role: string;
    photo?: string;
  }): Promise<Worker> {
    const id = `wrk-${Date.now()}`;
    const uploadedPhoto = await uploadPhotoStorageIfNeeded(id, payload.photo);

    const newWorker: Worker = {
      id,
      fullName: payload.fullName,
      phone: payload.phone,
      role: payload.role,
      marketerId,
      photo: uploadedPhoto || null,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, "marketers", marketerId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Marketer;
        const workers = data.workers || [];
        workers.push(newWorker);
        await setDoc(docRef, { ...data, workers });

        const newActivity: LiveActivity = {
          id: `act-${Date.now()}`,
          type: "worker_added",
          timestamp: new Date().toISOString(),
          message: `Added worker: ${payload.fullName} under ${data.businessName}`,
          details: `Assigned role: ${payload.role}.`
        };
        await setDoc(doc(db, "activities", newActivity.id), newActivity);
      }
    } catch (e: any) {
      console.warn("Firestore addWorker failed", e);
    }

    try {
      await fetch(getApiUrl(`/api/marketers/${marketerId}/workers`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // Graceful
    }

    const dbLocal = loadLocalDB();
    const marketerIndex = dbLocal.marketers.findIndex(m => m.id === marketerId);
    if (marketerIndex !== -1) {
      dbLocal.marketers[marketerIndex].workers.push(newWorker);
      logLocalActivity(dbLocal, "worker_added", `Added worker: ${payload.fullName} under ${dbLocal.marketers[marketerIndex].businessName}`, `Assigned role: ${payload.role}.`);
      saveLocalDB(dbLocal);
      return newWorker;
    }
    return newWorker;
  },

  // 8. Delete Worker
  async deleteWorker(workerId: string): Promise<any> {
    try {
      // Find the marketer that owns this worker in Firestore
      const querySnapshot = await getDocs(collection(db, "marketers"));
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data() as Marketer;
        const workers = data.workers || [];
        const index = workers.findIndex(w => w.id === workerId);
        if (index !== -1) {
          const workerName = workers[index].fullName;
          workers.splice(index, 1);
          await setDoc(doc(db, "marketers", data.id), { ...data, workers });

          const newActivity: LiveActivity = {
            id: `act-${Date.now()}`,
            type: "worker_removed",
            timestamp: new Date().toISOString(),
            message: `Removed worker: ${workerName}`,
            details: `Worker dismissed from ${data.businessName}.`
          };
          await setDoc(doc(db, "activities", newActivity.id), newActivity);
          break;
        }
      }
    } catch (e: any) {
      console.warn("Firestore deleteWorker failed", e);
    }

    try {
      await fetch(getApiUrl(`/api/workers/${workerId}`), {
        method: "DELETE"
      });
    } catch (err) {
      // Graceful
    }

    const dbLocal = loadLocalDB();
    let foundLocal = false;
    let workerNameLocal = "";
    let businessLocal = "";

    dbLocal.marketers = dbLocal.marketers.map(m => {
      const workerIndex = m.workers.findIndex(w => w.id === workerId);
      if (workerIndex !== -1) {
        workerNameLocal = m.workers[workerIndex].fullName;
        businessLocal = m.businessName;
        m.workers.splice(workerIndex, 1);
        foundLocal = true;
      }
      return m;
    });

    if (foundLocal) {
      logLocalActivity(dbLocal, "worker_removed", `Removed worker: ${workerNameLocal}`, `Worker dismissed from ${businessLocal}.`);
      saveLocalDB(dbLocal);
    }
    return { success: true };
  },

  // 9. Fetch Live Stats
  async getStats(localMarketers: Marketer[]): Promise<DashboardStats> {
    try {
      const currentMarketers = await this.getMarketers();
      
      // Fetch recent status logs from Firestore (with timeout to prevent freezing)
      const activitiesRef = collection(db, "activities");
      const q = query(activitiesRef, orderBy("timestamp", "desc"), limit(20));
      const snapshot = await withTimeout(getDocs(q), 3000, "getStats activities fetch");
      const recentActivities = snapshot.docs.map(docSnap => docSnap.data() as LiveActivity);

      let totalWorkers = 0;
      let totalRevenue = 0;
      const categories: { [key: string]: number } = {};

      currentMarketers.forEach(m => {
        totalWorkers += (m.workers || []).length;
        if (m.category) {
          categories[m.category] = (categories[m.category] || 0) + 1;
        }
        totalRevenue += (m.amountPaid || 0);
      });

      const categoryDist = Object.keys(categories).map(k => ({
        name: k,
        value: categories[k]
      }));

      return {
        totalMarketers: currentMarketers.length,
        totalWorkers,
        activeStands: currentMarketers.length,
        totalRevenue,
        categoryDist,
        recentActivities: recentActivities.length > 0 ? recentActivities : loadLocalDB().activities.slice(0, 10)
      } as any;
    } catch (e) {
      console.warn("Calculating stats client-side due to network fallback", e);
      const dbLocal = loadLocalDB();
      const currentMarketers = localMarketers.length > 0 ? localMarketers : dbLocal.marketers;
      
      let totalWorkers = 0;
      let totalRevenue = 0;
      const categories: { [key: string]: number } = {};

      currentMarketers.forEach(m => {
        totalWorkers += (m.workers || []).length;
        if (m.category) {
          categories[m.category] = (categories[m.category] || 0) + 1;
        }
        totalRevenue += (m.amountPaid || 0);
      });

      const categoryDist = Object.keys(categories).map(k => ({
        name: k,
        value: categories[k]
      }));

      return {
        totalMarketers: currentMarketers.length,
        totalWorkers,
        activeStands: currentMarketers.length,
        totalRevenue,
        categoryDist,
        recentActivities: dbLocal.activities.slice(0, 7)
      } as any;
    }
  },

  // 10. Simulate Live Logs Action
  async simulateAction(): Promise<any> {
    const marketers = await this.getMarketers();
    if (marketers.length === 0) {
      throw new Error("No marketers registered to simulate with.");
    }
    const randomMarketer = marketers[Math.floor(Math.random() * marketers.length)];
    const actionTypes = [
      {
        type: "customer_scan",
        message: `Visitor scanned QR code at ${randomMarketer.businessName}`,
        details: `Verification checked successfully for Stand ${randomMarketer.standNumber}.`
      },
      {
        type: "stand_patrol",
        message: `Security clearance verified for Stand ${randomMarketer.standNumber}`,
        details: `${randomMarketer.fullName} reported status ACTIVE.`
      }
    ];

    const action = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    
    try {
      const newActivity: LiveActivity = {
        id: `act-${Date.now()}`,
        type: action.type as any,
        timestamp: new Date().toISOString(),
        message: action.message,
        details: action.details
      };
      await setDoc(doc(db, "activities", newActivity.id), newActivity);
    } catch (e) {
      console.warn("Firestore simulation log failed", e);
    }

    const dbLocal = loadLocalDB();
    logLocalActivity(dbLocal, action.type, action.message, action.details);
    saveLocalDB(dbLocal);
    return { success: true };
  },

  // 11. Update Direct Photo
  async updatePhoto(entityId: string, photoBase64: string): Promise<any> {
    const uploadedPhoto = await uploadPhotoStorageIfNeeded(entityId, photoBase64);
    const finalPhoto = uploadedPhoto || photoBase64;

    try {
      const marketerRef = doc(db, "marketers", entityId);
      const marketerSnap = await getDoc(marketerRef);
      if (marketerSnap.exists()) {
        const data = marketerSnap.data() as Marketer;
        await setDoc(marketerRef, { ...data, photo: finalPhoto });

        const newActivity: LiveActivity = {
          id: `act-${Date.now()}`,
          type: "marketer_registered",
          timestamp: new Date().toISOString(),
          message: `Updated photo ID for marketer ${data.fullName}`,
          details: `Stall: ${data.businessName}`
        };
        await setDoc(doc(db, "activities", newActivity.id), newActivity);
      } else {
        // Look inside workers of all marketers
        const querySnapshot = await getDocs(collection(db, "marketers"));
        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data() as Marketer;
          const workers = data.workers || [];
          const index = workers.findIndex(w => w.id === entityId);
          if (index !== -1) {
            workers[index].photo = finalPhoto;
            await setDoc(doc(db, "marketers", data.id), { ...data, workers });

            const newActivity: LiveActivity = {
              id: `act-${Date.now()}`,
              type: "worker_added",
              timestamp: new Date().toISOString(),
              message: `Updated photo ID for staff ${workers[index].fullName}`,
              details: `Stall: ${data.businessName}`
            };
            await setDoc(doc(db, "activities", newActivity.id), newActivity);
            break;
          }
        }
      }
    } catch (e: any) {
      console.warn("Firestore photo update failed, using fallback URL.", e);
    }

    // fallback / cache updates
    const dbLocal = loadLocalDB();
    const marketerIndex = dbLocal.marketers.findIndex(m => m.id === entityId);
    if (marketerIndex !== -1) {
      dbLocal.marketers[marketerIndex].photo = finalPhoto;
      logLocalActivity(dbLocal, "marketer_registered", `Updated photo ID for marketer ${dbLocal.marketers[marketerIndex].fullName}`, `Stall: ${dbLocal.marketers[marketerIndex].businessName}`);
      saveLocalDB(dbLocal);
      return { success: true, photo: finalPhoto };
    }

    // Worker search local
    for (let i = 0; i < dbLocal.marketers.length; i++) {
      const workerIndex = dbLocal.marketers[i].workers.findIndex(w => w.id === entityId);
      if (workerIndex !== -1) {
        dbLocal.marketers[i].workers[workerIndex].photo = finalPhoto;
        logLocalActivity(dbLocal, "worker_added", `Updated photo ID for staff ${dbLocal.marketers[i].workers[workerIndex].fullName}`, `Stall: ${dbLocal.marketers[i].businessName}`);
        saveLocalDB(dbLocal);
        return { success: true, photo: finalPhoto };
      }
    }

    return { success: true, photo: photoBase64 };
  }
};
