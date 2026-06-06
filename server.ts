import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "src", "database.json");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Enable CORS for external devices (including campmarts.netlify.app)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Default Database helper
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

interface DBStructure {
  marketers: Marketer[];
  activities: LiveActivity[];
}

function getInitialDB(): DBStructure {
  return { marketers: [], activities: [] };
}

function loadDatabase(): DBStructure {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Database reading error, resetting...", err);
    return getInitialDB();
  }
}

function saveDatabase(data: DBStructure) {
  try {
    const parentDir = path.dirname(DB_FILE);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Database saving error:", err);
  }
}

// Generate beautiful helper logs
function logActivity(type: string, message: string, details?: string) {
  const db = loadDatabase();
  const newActivity: LiveActivity = {
    id: `act-${Date.now()}`,
    type,
    timestamp: new Date().toISOString(),
    message,
    details
  };
  db.activities.unshift(newActivity);
  // Keep logs at a reasonable size of 40 elements
  if (db.activities.length > 40) {
    db.activities = db.activities.slice(0, 40);
  }
  saveDatabase(db);
}

// REST APIs
// 1. Auth Endpoint
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  // Handle standard user/pass auth
  const targetAdminUser = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  const targetAdminPass = process.env.ADMIN_PASSWORD || "admin";

  const targetAdmin001User = (process.env.ADMIN001_USERNAME || "admin001").toLowerCase();
  const targetAdmin001Pass = process.env.ADMIN001_PASSWORD || "evans001";

  if (username.toLowerCase() === targetAdminUser && password === targetAdminPass) {
    return res.json({
      token: "mock-jwt-token-admin",
      user: {
        id: "admin-user",
        username: targetAdminUser,
        fullName: "Idris Dangalan",
        role: "admin"
      }
    });
  }

  if (username.toLowerCase() === targetAdmin001User && password === targetAdmin001Pass) {
    return res.json({
      token: "mock-jwt-token-admin-evans",
      user: {
        id: "admin-user-evans",
        username: targetAdmin001User,
        fullName: "Mr. Evans Okwor",
        role: "admin"
      }
    });
  }

  // Also support letting a Marketer log in with their registered phone number as password!
  const db = loadDatabase();
  const foundMarketer = db.marketers.find(
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

  return res.status(401).json({ error: "Invalid credentials." });
});

// 2. Marketers List & Create
app.get("/api/marketers", (req, res) => {
  const db = loadDatabase();
  res.json(db.marketers);
});

app.post("/api/marketers", (req, res) => {
  const { id, fullName, businessName, phone, standNumber, category, description, photo, createdAt, workers, verificationStatus, amountPaid } = req.body;
  if (!fullName || !businessName || !phone || !standNumber || !category) {
    return res.status(400).json({ error: "Required fields missing (fullName, businessName, phone, standNumber, category)" });
  }

  const db = loadDatabase();
  
  // Check if this marketer already exists by ID
  const existingIndex = id ? db.marketers.findIndex(m => m.id === id) : -1;

  // Check if stand number is occupied by another marketer
  const duplicatedStand = db.marketers.find(m => m.standNumber.trim() === standNumber.trim() && m.id !== id);
  if (duplicatedStand) {
    return res.status(400).json({ error: `Stand number is already occupied by ${duplicatedStand.businessName}. Please choose another stand.` });
  }

  const newMarketer: Marketer = {
    id: id || `mkt-${Date.now()}`,
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

  if (existingIndex !== -1) {
    db.marketers[existingIndex] = newMarketer;
    logActivity(
      "marketer_registered",
      `Updated campaign marketer profile: ${businessName}`,
      `Managed by ${fullName} at Stand ${standNumber}.`
    );
  } else {
    db.marketers.push(newMarketer);
    logActivity(
      "marketer_registered",
      `Registered new campaign marketer: ${businessName}`,
      `Managed by ${fullName} at Stand ${standNumber}.`
    );
  }

  saveDatabase(db);
  res.status(existingIndex !== -1 ? 200 : 201).json(newMarketer);
});

// Get individual marketer details
app.get("/api/marketers/:id", (req, res) => {
  const db = loadDatabase();
  const marketer = db.marketers.find(m => m.id === req.params.id);
  if (!marketer) {
    return res.status(404).json({ error: "Marketer not found" });
  }
  res.json(marketer);
});

// Delete individual marketer
app.delete("/api/marketers/:id", (req, res) => {
  const db = loadDatabase();
  const index = db.marketers.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Marketer not found" });
  }

  const name = db.marketers[index].businessName;
  db.marketers.splice(index, 1);
  saveDatabase(db);
  
  logActivity("marketer_deleted", `Removed campaign marketer: ${name}`, `All associated workers also unregistered.`);
  res.json({ success: true, message: "Marketer removed successfully." });
});

// Update verification status
app.post("/api/marketers/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !["verified", "pending", "review"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value. Must be 'verified', 'pending' or 'review'." });
  }

  const db = loadDatabase();
  const index = db.marketers.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Marketer not found" });
  }

  db.marketers[index].verificationStatus = status as "verified" | "pending" | "review";
  saveDatabase(db);

  logActivity(
    "marketer_registered",
    `Status altered for ${db.marketers[index].businessName}`,
    `Seeded verification status state to ${status.toUpperCase()}.`
  );

  res.json({ success: true, verificationStatus: status });
});

// Update payment details for a marketer
app.post("/api/marketers/:id/payment", (req, res) => {
  const { id } = req.params;
  const { amountPaid } = req.body;

  if (amountPaid === undefined || typeof amountPaid !== "number" || amountPaid < 0) {
    return res.status(400).json({ error: "Invalid payment amount. Must be a non-negative number." });
  }

  const db = loadDatabase();
  const index = db.marketers.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Marketer not found" });
  }

  const oldPaid = db.marketers[index].amountPaid || 0;
  db.marketers[index].amountPaid = amountPaid;
  saveDatabase(db);

  logActivity(
    "marketer_registered",
    `Payment updated for ${db.marketers[index].businessName}`,
    `Changed amount paid from ₦${oldPaid.toLocaleString()} to ₦${amountPaid.toLocaleString()}.`
  );

  res.json({ success: true, amountPaid });
});

// Add worker under marketer
app.post("/api/marketers/:id/workers", (req, res) => {
  const { fullName, phone, role, photo } = req.body;
  if (!fullName || !phone || !role) {
    return res.status(400).json({ error: "Recipient worker fullName, phone, and role must be provided" });
  }

  const db = loadDatabase();
  const marketerIndex = db.marketers.findIndex(m => m.id === req.params.id);
  if (marketerIndex === -1) {
    return res.status(404).json({ error: "Associated marketer stand not found" });
  }

  const marketer = db.marketers[marketerIndex];
  
  const newWorker: Worker = {
    id: `wrk-${Date.now()}`,
    fullName,
    phone,
    role,
    marketerId: marketer.id,
    photo,
    createdAt: new Date().toISOString()
  };

  marketer.workers.push(newWorker);
  db.marketers[marketerIndex] = marketer;
  saveDatabase(db);

  logActivity(
    "worker_added",
    `Added worker: ${fullName} under ${marketer.businessName}`,
    `Assigned role: ${role}.`
  );

  res.status(201).json(newWorker);
});

// Update or upload photo for marketer or worker directly
app.post("/api/photos/:id", (req, res) => {
  const { id } = req.params;
  const { photo } = req.body;
  
  if (!photo) {
    return res.status(400).json({ error: "A valid photo is required" });
  }

  const db = loadDatabase();
  
  // Check if it's a marketer
  const marketerIndex = db.marketers.findIndex(m => m.id === id);
  if (marketerIndex !== -1) {
    db.marketers[marketerIndex].photo = photo;
    saveDatabase(db);
    logActivity("marketer_registered", `Updated photo ID for marketer ${db.marketers[marketerIndex].fullName}`, `Stall: ${db.marketers[marketerIndex].businessName}`);
    return res.json({ success: true, photo });
  }

  // Check if it's a worker
  for (let i = 0; i < db.marketers.length; i++) {
    const workerIndex = db.marketers[i].workers.findIndex(w => w.id === id);
    if (workerIndex !== -1) {
      db.marketers[i].workers[workerIndex].photo = photo;
      saveDatabase(db);
      logActivity("worker_added", `Updated photo ID for staff ${db.marketers[i].workers[workerIndex].fullName}`, `Stall: ${db.marketers[i].businessName}`);
      return res.json({ success: true, photo });
    }
  }

  return res.status(404).json({ error: "Operator registration code not found" });
});

// Image Proxy to bypass CORS issues for card printing/html2canvas screenshots
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
app.delete("/api/workers/:id", (req, res) => {
  const db = loadDatabase();
  let found = false;
  let workerName = "";
  let business = "";

  db.marketers = db.marketers.map(m => {
    const workerIndex = m.workers.findIndex(w => w.id === req.params.id);
    if (workerIndex !== -1) {
      workerName = m.workers[workerIndex].fullName;
      business = m.businessName;
      m.workers.splice(workerIndex, 1);
      found = true;
    }
    return m;
  });

  if (!found) {
    return res.status(404).json({ error: "Worker not found" });
  }

  saveDatabase(db);
  logActivity("worker_removed", `Removed worker: ${workerName}`, `Worker dismissed from ${business}.`);
  res.json({ success: true, message: `Worker ${workerName} has been layout-dismissed.` });
});

// Helper validation scan API for QR scanner
app.get("/api/verify/:id", (req, res) => {
  const db = loadDatabase();
  const marketer = db.marketers.find(m => m.id === req.params.id);
  if (marketer) {
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

  // Search in workers
  for (const m of db.marketers) {
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
});

// 3. Stats Endpoint for quick rendering
app.get("/api/stats", (req, res) => {
  const db = loadDatabase();
  const totalMarketers = db.marketers.length;
  let totalWorkers = 0;
  let totalRevenue = 0;
  const categories: { [key: string]: number } = {};

  db.marketers.forEach(m => {
    totalWorkers += m.workers.length;
    categories[m.category] = (categories[m.category] || 0) + 1;
    totalRevenue += (m.amountPaid || 0);
  });

  const categoryDist = Object.keys(categories).map(k => ({
    name: k,
    value: categories[k]
  }));

  res.json({
    totalMarketers,
    totalWorkers,
    activeStands: totalMarketers, // Since 1 marketer has 1 stand
    totalRevenue,
    categoryDist,
    recentActivities: db.activities.slice(0, 6)
  });
});

// Simulated real-time action flow for notifications panel
app.post("/api/simulate-action", (req, res) => {
  const db = loadDatabase();
  if (db.marketers.length === 0) {
    return res.status(400).json({ error: "No marketers registered to simulate with." });
  }

  const randomMarketer = db.marketers[Math.floor(Math.random() * db.marketers.length)];
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
  logActivity(action.type, action.message, action.details);
  res.json({ success: true, activity: action });
});

async function startServer() {
  // Vite integration middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    // Pre-initialize DB on startup
    loadDatabase();
  });
}

startServer();
