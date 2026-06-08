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

// Promise timeout helper to prevent Firestore SDK from hanging indefinitely
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 8000, context: string = "Operation"): Promise<T> {
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

// Drops fields that are undefined to prevent Firestore SDK from throwing errors
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
      
      await withTimeout(
        uploadString(storageRef, photo, "data_url", { contentType: mimeType }),
        1500,
        "Storage string upload"
      );
      
      const downloadURL = await withTimeout(
        getDownloadURL(storageRef),
        1000,
        "Storage download URL retrieval"
      );
      
      console.log(`Uploaded photo to storage for ${entityId}: ${downloadURL}`);
      return downloadURL;
    } catch (err) {
      console.warn("Failed to upload photo to Firebase Storage, using base64 fallback:", err);
      return photo;
    }
  }
  return photo;
}

// dynamic API endpoint resolver
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
  
  // Default to active public preview environment containing modern server edits.
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

// Master API wrapper with absolute Firestore authority
export const api = {
  // 1. Auth Login
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    const response = await fetch(getApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const text = await response.text();
      let errMsg = "Authentication failed.";
      try {
        const errData = JSON.parse(text);
        errMsg = errData.error || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
    }

    return response.json();
  },

  // 2. Fetch Stalls (Marketers) directly from Firestore
  async getMarketers(): Promise<Marketer[]> {
    const marketersRef = collection(db, "marketers");
    const querySnapshot = await withTimeout(getDocs(marketersRef), 8000, "getMarketers Firestore");
    return querySnapshot.docs.map(docSnap => docSnap.data() as Marketer);
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
    const marketers = await this.getMarketers();
    const duplicate = marketers.find(m => m.standNumber.trim() === payload.standNumber.trim());
    if (duplicate) {
      throw new Error(`Stand number is already occupied by ${duplicate.businessName}. Please choose another stand.`);
    }

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

    const docRef = doc(db, "marketers", newMarketer.id);
    const cleanM = cleanFirestorePayload(newMarketer);
    console.log("Saving marketer:", cleanM);
    await withTimeout(setDoc(docRef, cleanM), 8000, "registerMarketer Firestore write");

    // Write activity log
    const activityId = `act-${Date.now()}`;
    const newActivity: LiveActivity = {
      id: activityId,
      type: "marketer_registered",
      timestamp: new Date().toISOString(),
      message: `Registered new campaign marketer: ${payload.businessName}`,
      details: `Managed by ${payload.fullName} at Stand ${payload.standNumber}.`
    };
    await setDoc(doc(db, "activities", activityId), cleanFirestorePayload(newActivity));

    return newMarketer;
  },

  // 4. Update Verification Status
  async updateVerificationStatus(id: string, status: "verified" | "pending" | "review"): Promise<any> {
    const docRef = doc(db, "marketers", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error("Marketer stand not found in database.");
    }
    
    const data = docSnap.data() as Marketer;
    const updated = { ...data, verificationStatus: status };
    await setDoc(docRef, cleanFirestorePayload(updated));

    const activityId = `act-${Date.now()}`;
    const newActivity: LiveActivity = {
      id: activityId,
      type: "marketer_registered",
      timestamp: new Date().toISOString(),
      message: `Status altered for ${data.businessName}`,
      details: `Seeded verification status state to ${status.toUpperCase()}.`
    };
    await setDoc(doc(db, "activities", activityId), cleanFirestorePayload(newActivity));

    return { success: true, verificationStatus: status };
  },

  // 5. Update Payment Amount (₦)
  async updatePayment(id: string, amountPaid: number): Promise<any> {
    const docRef = doc(db, "marketers", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error("Marketer stand not found in database.");
    }

    const data = docSnap.data() as Marketer;
    const oldPaid = data.amountPaid || 0;
    const updated = { ...data, amountPaid };
    await setDoc(docRef, cleanFirestorePayload(updated));

    const activityId = `act-${Date.now()}`;
    const newActivity: LiveActivity = {
      id: activityId,
      type: "marketer_registered",
      timestamp: new Date().toISOString(),
      message: `Payment updated for ${data.businessName}`,
      details: `Changed amount paid from ₦${oldPaid.toLocaleString()} to ₦${amountPaid.toLocaleString()}.`
    };
    await setDoc(doc(db, "activities", activityId), cleanFirestorePayload(newActivity));

    return { success: true, amountPaid };
  },

  // 6. Delete Stall
  async deleteMarketer(id: string): Promise<any> {
    const docRef = doc(db, "marketers", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error("Marketer stand not found in database.");
    }

    const data = docSnap.data() as Marketer;
    await deleteDoc(docRef);

    const activityId = `act-${Date.now()}`;
    const newActivity: LiveActivity = {
      id: activityId,
      type: "marketer_deleted",
      timestamp: new Date().toISOString(),
      message: `Removed campaign marketer: ${data.businessName}`,
      details: "All associated workers also unregistered."
    };
    await setDoc(doc(db, "activities", activityId), cleanFirestorePayload(newActivity));

    return { success: true };
  },

  // 7. Add Worker
  async addWorker(marketerId: string, payload: {
    fullName: string;
    phone: string;
    role: string;
    photo?: string;
  }): Promise<Worker> {
    const docRef = doc(db, "marketers", marketerId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error("Associated marketer stand not found in database.");
    }

    const marketer = docSnap.data() as Marketer;
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

    const workers = marketer.workers || [];
    workers.push(newWorker);
    await setDoc(docRef, cleanFirestorePayload({ ...marketer, workers }));

    const activityId = `act-${Date.now()}`;
    const newActivity: LiveActivity = {
      id: activityId,
      type: "worker_added",
      timestamp: new Date().toISOString(),
      message: `Added worker: ${payload.fullName} under ${marketer.businessName}`,
      details: `Assigned role: ${payload.role}.`
    };
    await setDoc(doc(db, "activities", activityId), cleanFirestorePayload(newActivity));

    return newWorker;
  },

  // 8. Delete Worker
  async deleteWorker(workerId: string): Promise<any> {
    let found = false;
    let workerName = "";
    let businessName = "";

    const querySnapshot = await getDocs(collection(db, "marketers"));
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data() as Marketer;
      const workers = data.workers || [];
      const index = workers.findIndex(w => w.id === workerId);
      if (index !== -1) {
        workerName = workers[index].fullName;
        businessName = data.businessName;
        workers.splice(index, 1);
        await setDoc(doc(db, "marketers", data.id), cleanFirestorePayload({ ...data, workers }));
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error("Worker not found in database.");
    }

    const activityId = `act-${Date.now()}`;
    const newActivity: LiveActivity = {
      id: activityId,
      type: "worker_removed",
      timestamp: new Date().toISOString(),
      message: `Removed worker: ${workerName}`,
      details: `Worker dismissed from ${businessName}.`
    };
    await setDoc(doc(db, "activities", activityId), cleanFirestorePayload(newActivity));

    return { success: true };
  },

  // 9. Fetch Live Stats from Firestore Only
  async getStats(): Promise<DashboardStats> {
    const marketers = await this.getMarketers();
    const activitiesRef = collection(db, "activities");
    const q = query(activitiesRef, orderBy("timestamp", "desc"), limit(20));
    const snapshot = await getDocs(q);
    const recentActivities = snapshot.docs.map(docSnap => docSnap.data() as LiveActivity);

    let totalWorkers = 0;
    let totalRevenue = 0;
    const categories: { [key: string]: number } = {};

    marketers.forEach(m => {
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
      totalMarketers: marketers.length,
      totalWorkers,
      activeStands: marketers.length,
      totalRevenue,
      categoryDist,
      recentActivities
    } as any;
  },

  // 10. Simulate Live Logs Action on Firestore Only
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
    
    const activityId = `act-${Date.now()}`;
    const newActivity: LiveActivity = {
      id: activityId,
      type: action.type as any,
      timestamp: new Date().toISOString(),
      message: action.message,
      details: action.details
    };
    await setDoc(doc(db, "activities", activityId), cleanFirestorePayload(newActivity));
    return { success: true };
  },

  // 11. Update Direct Photo on Firestore Only
  async updatePhoto(entityId: string, photoBase64: string): Promise<any> {
    const uploadedPhoto = await uploadPhotoStorageIfNeeded(entityId, photoBase64);
    const finalPhoto = uploadedPhoto || photoBase64;

    const marketerRef = doc(db, "marketers", entityId);
    const marketerSnap = await getDoc(marketerRef);
    if (marketerSnap.exists()) {
      const data = marketerSnap.data() as Marketer;
      await setDoc(marketerRef, cleanFirestorePayload({ ...data, photo: finalPhoto }));

      const activityId = `act-${Date.now()}`;
      const newActivity: LiveActivity = {
        id: activityId,
        type: "marketer_registered",
        timestamp: new Date().toISOString(),
        message: `Updated photo ID for marketer ${data.fullName}`,
        details: `Stall: ${data.businessName}`
      };
      await setDoc(doc(db, "activities", activityId), cleanFirestorePayload(newActivity));
      return { success: true, photo: finalPhoto };
    }

    // Worker search
    const querySnapshot = await getDocs(collection(db, "marketers"));
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data() as Marketer;
      const workers = data.workers || [];
      const index = workers.findIndex(w => w.id === entityId);
      if (index !== -1) {
        workers[index].photo = finalPhoto;
        await setDoc(doc(db, "marketers", data.id), cleanFirestorePayload({ ...data, workers }));

        const activityId = `act-${Date.now()}`;
        const newActivity: LiveActivity = {
          id: activityId,
          type: "worker_added",
          timestamp: new Date().toISOString(),
          message: `Updated photo ID for staff ${workers[index].fullName}`,
          details: `Stall: ${data.businessName}`
        };
        await setDoc(doc(db, "activities", activityId), cleanFirestorePayload(newActivity));
        return { success: true, photo: finalPhoto };
      }
    }

    throw new Error("Specified registrant or worker ID could not be identified.");
  },

  // 12. Update Marketer Profile (Details + Photo update) on Firestore Only
  async updateMarketerProfile(id: string, payload: {
    fullName: string;
    businessName: string;
    phone: string;
    standNumber: string;
    category: string;
    description: string;
    photo?: string;
  }): Promise<any> {
    const uploadedPhoto = payload.photo && payload.photo.startsWith("data:") 
      ? await uploadPhotoStorageIfNeeded(id, payload.photo) 
      : payload.photo;
    const finalPhoto = uploadedPhoto || payload.photo;

    const docRef = doc(db, "marketers", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error("Marketer stand not found in database.");
    }

    const data = docSnap.data() as Marketer;
    const updated = {
      ...data,
      fullName: payload.fullName,
      businessName: payload.businessName,
      phone: payload.phone,
      standNumber: payload.standNumber,
      category: payload.category,
      description: payload.description,
      photo: finalPhoto || data.photo
    };
    await setDoc(docRef, cleanFirestorePayload(updated));

    const activityId = `act-${Date.now()}`;
    const newActivity: LiveActivity = {
      id: activityId,
      type: "marketer_registered",
      timestamp: new Date().toISOString(),
      message: `Updated profile details for marketer ${payload.fullName}`,
      details: `Stall: ${payload.businessName}`
    };
    await setDoc(doc(db, "activities", activityId), cleanFirestorePayload(newActivity));

    return { success: true, updatedMarketer: updated };
  }
};
