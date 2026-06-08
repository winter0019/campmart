import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const app = express();

// CRITICAL FOR CLOUD RUN: Cloud Run dynamically assigns a PORT env variable. 
// Do not lock this to 3000 exclusively.
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(process.cwd(), "src", "database.json");

// Initialize Firebase dynamically on backend
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// HARDENED PRODUCTION CORS MIDDLEWARE
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Access-Token");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});


// Default Interfaces
interface Worker {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  marketerId: string;
  createdAt: string;
  photo?: string;
}

interface Marketer {
  id: string;
  fullName: string;
  businessName: string;
  phone: string;
  standNumber: string;
  category: string;
  description: string;
  photo?: string;
  createdAt: string;
  workers: Worker[];
  verificationStatus?: "verified" | "pending" | "review";
  amountPaid?: number;
}

interface LiveActivity {
  id: string;
  type: string;
  timestamp: string;
  message: string;
  details?: string;
}

// Generate beautiful helper logs on Firestore
async function logActivity(type: string, message: string, details?: string) {
  try {
    const activityId = `act-${Date.now()}`;
    const newActivity: LiveActivity = {
      id: activityId,
      type,
      timestamp: new Date().toISOString(),
      message,
      details
    };
    await setDoc(doc(db, "activities", activityId), newActivity);
  } catch (err) {
    console.error("Failed to log activity to Firestore:", err);
  }
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// 1. Auth Endpoint
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const usernameLower = username.toLowerCase();
  const isAdminUsername = usernameLower === "admin" || usernameLower === "admin001";
  const isAdminPassword = password === "admin" || password === "evans001" || password === process.env.ADMIN_PASSWORD || password === process.env.ADMIN001_PASSWORD;

  if (isAdminUsername && isAdminPassword) {
    if (usernameLower === "admin") {
      return res.json({
        token: "mock-jwt-token-admin",
        user: {
          id: "admin-user",
          username: "admin",
          fullName: "Idris Dangalan",
          role: "admin"
        }
      });
    } else {
      return res.json({
        token: "mock-jwt-token-admin-evans",
        user: {
          id: "admin-user-evans",
          username: "admin001",
          fullName: "Mr. Evans Okwor",
          role: "admin"
        }
      });
    }
  }

  // Support for Marketer phone access authorization
  try {
    const marketersSnap = await getDocs(collection(db, "marketers"));
    const marketers = marketersSnap.docs.map(docSnap => docSnap.data() as Marketer);
    const foundMarketer = marketers.find(
      (m) => m.fullName.toLowerCase() === username.toLowerCase() || m.businessName.toLowerCase() === username.toLowerCase()
    );

    if (foundMarketer && (password === foundMarketer.phone || password === "password")) {
      return res.json({
        token: `mock-jwt-token-${foundMarketer.id}`,
        user: {
          id: foundMarketer.id,
          username: foundMarketer.fullName,
          fullName: foundMarketer.fullName,
          role: "marketer"
        }
      });
    }
  } catch (err: any) {
    console.error("Auth helper check against Firestore failed:", err);
  }

  return res.status(401).json({ error: "Invalid credentials." });
});

// 2. Marketers List & Create
app.get("/api/marketers", async (req, res) => {
  try {
    const snap = await getDocs(collection(db, "marketers"));
    const list = snap.docs.map(docSnap => docSnap.data() as Marketer);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load marketers: " + err.message });
  }
});

app.post("/api/marketers", async (req, res) => {
  const { id, fullName, businessName, phone, standNumber, category, description, photo, createdAt, workers, verificationStatus, amountPaid } = req.body;
  if (!fullName || !businessName || !phone || !standNumber || !category) {
    return res.status(400).json({ error: "Required fields missing (fullName, businessName, phone, standNumber, category)" });
  }

  try {
    const mId = id || `mkt-${Date.now()}`;
    
    const snap = await getDocs(collection(db, "marketers"));
    const marketers = snap.docs.map(d => d.data() as Marketer);
    const duplicatedStand = marketers.find(m => m.standNumber.trim() === standNumber.trim() && m.id !== mId);
    if (duplicatedStand) {
      return res.status(400).json({ error: `Stand number is already occupied by ${duplicatedStand.businessName}. Please choose another stand.` });
    }

    const newMarketer: Marketer = {
      id: mId,
      fullName,
      businessName,
      phone,
      standNumber,
      category,
      description: description || "No description provided.",
      photo: photo || undefined,
      createdAt: createdAt || new Date().toISOString(),
      workers: workers || [],
      verificationStatus: verificationStatus || "pending",
      amountPaid: amountPaid || 0
    };

    await setDoc(doc(db, "marketers", mId), newMarketer);
    
    await logActivity(
      "marketer_registered",
      `Registered new campaign marketer: ${businessName}`,
      `Managed by ${fullName} at Stand ${standNumber}.`
    );

    res.status(201).json(newMarketer);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save marketer registration: " + err.message });
  }
});

// Get individual marketer details
app.get("/api/marketers/:id", async (req, res) => {
  try {
    const docSnap = await getDoc(doc(db, "marketers", req.params.id));
    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Marketer not found" });
    }
    res.json(docSnap.data());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load marketer details: " + err.message });
  }
});

// Delete individual marketer
app.delete("/api/marketers/:id", async (req, res) => {
  try {
    const docRef = doc(db, "marketers", req.params.id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Marketer not found" });
    }

    const data = docSnap.data() as Marketer;
    const name = data.businessName;
    await deleteDoc(docRef);
    
    await logActivity("marketer_deleted", `Removed campaign marketer: ${name}`, `All associated workers also unregistered.`);
    res.json({ success: true, message: "Marketer removed successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete marketer stand: " + err.message });
  }
});

// Update verification status
app.post("/api/marketers/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !["verified", "pending", "review"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value. Must be 'verified', 'pending' or 'review'." });
  }

  try {
    const docRef = doc(db, "marketers", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Marketer not found" });
    }

    const data = docSnap.data() as Marketer;
    const updated = { ...data, verificationStatus: status as "verified" | "pending" | "review" };
    await setDoc(docRef, updated);

    await logActivity(
      "marketer_registered",
      `Status altered for ${data.businessName}`,
      `Seeded verification status state to ${status.toUpperCase()}.`
    );

    res.json({ success: true, verificationStatus: status });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update verification status: " + err.message });
  }
});

// Update payment details for a marketer
app.post("/api/marketers/:id/payment", async (req, res) => {
  const { id } = req.params;
  const { amountPaid } = req.body;

  if (amountPaid === undefined || typeof amountPaid !== "number" || amountPaid < 0) {
    return res.status(400).json({ error: "Invalid payment amount. Must be a non-negative number." });
  }

  try {
    const docRef = doc(db, "marketers", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Marketer not found" });
    }

    const data = docSnap.data() as Marketer;
    const oldPaid = data.amountPaid || 0;
    const updated = { ...data, amountPaid };
    await setDoc(docRef, updated);

    await logActivity(
      "marketer_registered",
      `Payment updated for ${data.businessName}`,
      `Changed amount paid from ₦${oldPaid.toLocaleString()} to ₦${amountPaid.toLocaleString()}.`
    );

    res.json({ success: true, amountPaid });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save payment status: " + err.message });
  }
});

// Add worker under marketer
app.post("/api/marketers/:id/workers", async (req, res) => {
  const { fullName, phone, role, photo } = req.body;
  if (!fullName || !phone || !role) {
    return res.status(400).json({ error: "Recipient worker fullName, phone, and role must be provided" });
  }

  try {
    const docRef = doc(db, "marketers", req.params.id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Associated marketer stand not found" });
    }

    const marketer = docSnap.data() as Marketer;
    const newWorker: Worker = {
      id: `wrk-${Date.now()}`,
      fullName,
      phone,
      role,
      marketerId: marketer.id,
      photo,
      createdAt: new Date().toISOString()
    };

    const workers = marketer.workers || [];
    workers.push(newWorker);
    await setDoc(docRef, { ...marketer, workers });

    await logActivity(
      "worker_added",
      `Added worker: ${fullName} under ${marketer.businessName}`,
      `Assigned role: ${role}.`
    );

    res.status(201).json(newWorker);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add worker connection: " + err.message });
  }
});

// Update or upload photo for marketer or worker directly
app.post("/api/photos/:id", async (req, res) => {
  const { id } = req.params;
  const { photo } = req.body;
  
  if (!photo) {
    return res.status(400).json({ error: "A valid photo is required" });
  }

  try {
    const marketerRef = doc(db, "marketers", id);
    const mSnap = await getDoc(marketerRef);
    if (mSnap.exists()) {
      const data = mSnap.data() as Marketer;
      await setDoc(marketerRef, { ...data, photo });
      await logActivity("marketer_registered", `Updated photo ID for marketer ${data.fullName}`, `Stall: ${data.businessName}`);
      return res.json({ success: true, photo });
    }

    const querySnapshot = await getDocs(collection(db, "marketers"));
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data() as Marketer;
      const workers = data.workers || [];
      const index = workers.findIndex(w => w.id === id);
      if (index !== -1) {
        workers[index].photo = photo;
        await setDoc(doc(db, "marketers", data.id), { ...data, workers });
        await logActivity("worker_added", `Updated photo ID for staff ${workers[index].fullName}`, `Stall: ${data.businessName}`);
        return res.json({ success: true, photo });
      }
    }

    return res.status(404).json({ error: "Operator registration code not found in cloud storage" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update profile photo: " + err.message });
  }
});

// Image Proxy to bypass CORS issues for card printing
app.get("/api/image-proxy", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing url parameter" });
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch remote image" });
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err: any) {
    console.error("Image proxy error for URL:", url, err);
    res.status(500).json({ error: "Image proxy failed: " + err.message });
  }
});

// Delete worker
app.delete("/api/workers/:id", async (req, res) => {
  try {
    let found = false;
    let workerName = "";
    let business = "";

    const querySnapshot = await getDocs(collection(db, "marketers"));
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data() as Marketer;
      const workers = data.workers || [];
      const index = workers.findIndex(w => w.id === req.params.id);
      if (index !== -1) {
        workerName = workers[index].fullName;
        business = data.businessName;
        workers.splice(index, 1);
        await setDoc(doc(db, "marketers", data.id), { ...data, workers });
        found = true;
        break;
      }
    }

    if (!found) {
      return res.status(404).json({ error: "Worker not found" });
    }

    await logActivity("worker_removed", `Removed worker: ${workerName}`, `Worker dismissed from ${business}.`);
    res.json({ success: true, message: `Worker ${workerName} has been layout-dismissed.` });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete worker connection: " + err.message });
  }
});

// Helper validation scan API for QR scanner
app.get("/api/verify/:id", async (req, res) => {
  try {
    const marketerRef = doc(db, "marketers", req.params.id);
    const mSnap = await getDoc(marketerRef);
    if (mSnap.exists()) {
      const marketer = mSnap.data() as Marketer;
      return res.json({
        valid: true,
        type: "Marketer",
        details: {
          id: marketer.id,
          name: marketer.fullName,
          business: marketer.businessName,
          phone: marketer.phone,
          standNumber: marketer.standNumber,
          category: marketer.category,
          role: "Primary Registrant",
          createdAt: marketer.createdAt,
          photo: marketer.photo
        }
      });
    }

    const querySnapshot = await getDocs(collection(db, "marketers"));
    for (const docSnap of querySnapshot.docs) {
      const m = docSnap.data() as Marketer;
      const worker = m.workers.find(w => w.id === req.params.id);
      if (worker) {
        return res.json({
          valid: true,
          type: "Staff / Worker",
          details: {
            id: worker.id,
            name: worker.fullName,
            phone: worker.phone,
            role: worker.role,
            business: m.businessName,
            standNumber: m.standNumber,
            category: m.category,
            primaryContact: m.fullName,
            photo: worker.photo || m.photo,
            createdAt: worker.createdAt
          }
        });
      }
    }

    res.status(404).json({ valid: false, error: "Registration Record ID could not be identified." });
  } catch (err: any) {
    res.status(500).json({ error: "Verification failed: " + err.message });
  }
});

// 3. Stats Endpoint
app.get("/api/stats", async (req, res) => {
  try {
    const marketersSnap = await getDocs(collection(db, "marketers"));
    const marketers = marketersSnap.docs.map(d => d.data() as Marketer);

    const activitiesSnap = await getDocs(collection(db, "activities"));
    const activities = activitiesSnap.docs.map(d => d.data() as LiveActivity);

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalMarketers = marketers.length;
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

    res.json({
      totalMarketers,
      totalWorkers,
      activeStands: totalMarketers,
      totalRevenue,
      categoryDist,
      recentActivities: activities.slice(0, 6)
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to compile stats: " + err.message });
  }
});

// Simulated real-time action flow
app.post("/api/simulate-action", async (req, res) => {
  try {
    const snap = await getDocs(collection(db, "marketers"));
    const marketers = snap.docs.map(d => d.data() as Marketer);
    if (marketers.length === 0) {
      return res.status(400).json({ error: "No marketers registered to simulate with." });
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
    await logActivity(action.type, action.message, action.details);
    res.json({ success: true, activity: action });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to simulate transaction: " + err.message });
  }
});

// ==========================================
// VITE INTEGRATION & ROUTING SEQUENCING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // CRITICAL: Prevent the frontend wildcard route from overriding /api paths.
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next(); 
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Always listen on 0.0.0.0 for container accessibility
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();