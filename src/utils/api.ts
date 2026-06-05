import { Marketer, Worker, LiveActivity, DashboardStats } from "../types";

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
function getApiUrl(path: string): string {
  const savedUrl = localStorage.getItem("campmark_server_url");
  if (savedUrl) {
    const cleanUrl = savedUrl.replace(/\/+$/, "");
    return `${cleanUrl}${path}`;
  }

  const host = window.location.host;
  // If we are running inside the AI studio environment or local container on port 3000,
  // we use standard relative paths as of the current origin.
  if (host.includes("run.app") || host.includes("localhost:3000") || host.includes("127.0.0.1:3000")) {
    return path;
  }
  // Otherwise, point to the active Cloud Run backend sandbox to enable central registrations across devices
  return `https://ais-pre-qt7dsgacndhinsmr4bg5cf-10883856286.europe-west1.run.app${path}`;
}

// Master API wrapper
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
      // If server returned HTML, or connection failed, use local fallback logic
      if (e.message === "HTML_RESPONSE" || e.message.includes("Failed to fetch") || e.message.includes("Load failed")) {
        console.warn("Running in Static Fallback Mode (Netlify environment detected)");
        
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

        // Check if username/password matches local marketer
        const db = loadLocalDB();
        const found = db.marketers.find(m => m.fullName.toLowerCase() === usernameLower || m.businessName.toLowerCase() === usernameLower);
        if (found && (password === found.phone || password === "password")) {
          return {
            token: `local-jwt-token-${found.id}`,
            user: { id: found.id, username: found.fullName, fullName: found.fullName, role: "marketer" }
          };
        }
        throw new Error("Invalid master credentials.");
      }
      throw e;
    }
  },

  // 2. Fetch Stalls (Marketers)
  async getMarketers(): Promise<Marketer[]> {
    try {
      const response = await fetch(getApiUrl("/api/marketers"));
      const { isHtml, text } = await isHtmlResponse(response);
      if (isHtml || !response.ok) {
        throw new Error("API failed");
      }
      return JSON.parse(text);
    } catch (e) {
      console.warn("Falling back to local marketers data");
      return loadLocalDB().marketers;
    }
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
    try {
      const response = await fetch(getApiUrl("/api/marketers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const { isHtml, text } = await isHtmlResponse(response);
      if (isHtml || !response.ok) {
        if (isHtml) throw new Error("HTML_RESPONSE");
        const errData = JSON.parse(text || "{}");
        throw new Error(errData.error || "Failed to commit registration.");
      }
      return JSON.parse(text);
    } catch (e: any) {
      if (e.message !== "HTML_RESPONSE" && !e.message.includes("API failed") && !e.message.includes("Failed to fetch") && !e.message.includes("Load failed")) {
        throw e;
      }
      // Local fallback
      const db = loadLocalDB();
      const duplicate = db.marketers.find(m => m.standNumber.trim() === payload.standNumber.trim());
      if (duplicate) {
        throw new Error(`Stand number is already occupied by ${duplicate.businessName}. Please choose another stand.`);
      }

      const newMarketer: Marketer = {
        id: `mkt-${Date.now()}`,
        fullName: payload.fullName,
        businessName: payload.businessName,
        phone: payload.phone,
        standNumber: payload.standNumber,
        category: payload.category,
        description: payload.description || "No description provided.",
        photo: payload.photo,
        createdAt: new Date().toISOString(),
        workers: [],
        verificationStatus: "pending",
        amountPaid: 0
      };

      db.marketers.push(newMarketer);
      logLocalActivity(db, "marketer_registered", `Registered new campaign marketer: ${payload.businessName}`, `Managed by ${payload.fullName} at Stand ${payload.standNumber}.`);
      saveLocalDB(db);
      return newMarketer;
    }
  },

  // 4. Update Verification Status
  async updateVerificationStatus(id: string, status: "verified" | "pending" | "review"): Promise<any> {
    try {
      const response = await fetch(getApiUrl(`/api/marketers/${id}/status`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const { isHtml, text } = await isHtmlResponse(response);
      if (isHtml || !response.ok) {
        throw new Error("Status API failed");
      }
      return JSON.parse(text);
    } catch (e) {
      // Local fallback
      const db = loadLocalDB();
      const index = db.marketers.findIndex(m => m.id === id);
      if (index !== -1) {
        db.marketers[index].verificationStatus = status;
        logLocalActivity(db, "marketer_registered", `Status altered for ${db.marketers[index].businessName}`, `Seeded verification status state to ${status.toUpperCase()}.`);
        saveLocalDB(db);
        return { success: true, verificationStatus: status };
      }
      throw new Error("Marketer not found in database.");
    }
  },

  // 5. Update Payment Amount (₦)
  async updatePayment(id: string, amountPaid: number): Promise<any> {
    try {
      const response = await fetch(getApiUrl(`/api/marketers/${id}/payment`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaid })
      });
      const { isHtml, text } = await isHtmlResponse(response);
      if (isHtml || !response.ok) {
        if (isHtml) throw new Error("HTML_RESPONSE");
        const errData = JSON.parse(text || "{}");
        throw new Error(errData.error || "Payment update failed.");
      }
      return JSON.parse(text);
    } catch (e: any) {
      if (e.message !== "HTML_RESPONSE" && !e.message.includes("API failed") && !e.message.includes("Failed to fetch") && !e.message.includes("Load failed")) {
        throw e;
      }
      // Local fallback
      const db = loadLocalDB();
      const index = db.marketers.findIndex(m => m.id === id);
      if (index !== -1) {
        const oldPaid = db.marketers[index].amountPaid || 0;
        db.marketers[index].amountPaid = amountPaid;
        logLocalActivity(db, "marketer_registered", `Payment updated for ${db.marketers[index].businessName}`, `Changed amount paid from ₦${oldPaid.toLocaleString()} to ₦${amountPaid.toLocaleString()}.`);
        saveLocalDB(db);
        return { success: true, amountPaid };
      }
      throw new Error("Marketer not found in database.");
    }
  },

  // 6. Delete Stall
  async deleteMarketer(id: string): Promise<any> {
    try {
      const response = await fetch(getApiUrl(`/api/marketers/${id}`), {
        method: "DELETE"
      });
      const { isHtml, text } = await isHtmlResponse(response);
      if (isHtml || !response.ok) {
        throw new Error("Delete API failed");
      }
      return JSON.parse(text);
    } catch (e) {
      // Local fallback
      const db = loadLocalDB();
      const index = db.marketers.findIndex(m => m.id === id);
      if (index !== -1) {
        const name = db.marketers[index].businessName;
        db.marketers.splice(index, 1);
        logLocalActivity(db, "marketer_deleted", `Removed campaign marketer: ${name}`, "All associated workers also unregistered.");
        saveLocalDB(db);
        return { success: true };
      }
      throw new Error("Marketer not found in database.");
    }
  },

  // 7. Add Worker
  async addWorker(marketerId: string, payload: {
    fullName: string;
    phone: string;
    role: string;
    photo?: string;
  }): Promise<Worker> {
    try {
      const response = await fetch(getApiUrl(`/api/marketers/${marketerId}/workers`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const { isHtml, text } = await isHtmlResponse(response);
      if (isHtml || !response.ok) {
        if (isHtml) throw new Error("HTML_RESPONSE");
        const errData = JSON.parse(text || "{}");
        throw new Error(errData.error || "Worker add failed.");
      }
      return JSON.parse(text);
    } catch (e: any) {
      if (e.message !== "HTML_RESPONSE" && !e.message.includes("API failed") && !e.message.includes("Failed to fetch") && !e.message.includes("Load failed")) {
        throw e;
      }
      // Local fallback
      const db = loadLocalDB();
      const marketerIndex = db.marketers.findIndex(m => m.id === marketerId);
      if (marketerIndex === -1) {
        throw new Error("Associated marketer stand not found.");
      }

      const newWorker: Worker = {
        id: `wrk-${Date.now()}`,
        fullName: payload.fullName,
        phone: payload.phone,
        role: payload.role,
        marketerId,
        photo: payload.photo,
        createdAt: new Date().toISOString()
      };

      db.marketers[marketerIndex].workers.push(newWorker);
      logLocalActivity(db, "worker_added", `Added worker: ${payload.fullName} under ${db.marketers[marketerIndex].businessName}`, `Assigned role: ${payload.role}.`);
      saveLocalDB(db);
      return newWorker;
    }
  },

  // 8. Delete Worker
  async deleteWorker(workerId: string): Promise<any> {
    try {
      const response = await fetch(getApiUrl(`/api/workers/${workerId}`), {
        method: "DELETE"
      });
      const { isHtml, text } = await isHtmlResponse(response);
      if (isHtml || !response.ok) {
        throw new Error("Worker delete API failed");
      }
      return JSON.parse(text);
    } catch (e) {
      // Local fallback
      const db = loadLocalDB();
      let found = false;
      let workerName = "";
      let business = "";

      db.marketers = db.marketers.map(m => {
        const workerIndex = m.workers.findIndex(w => w.id === workerId);
        if (workerIndex !== -1) {
          workerName = m.workers[workerIndex].fullName;
          business = m.businessName;
          m.workers.splice(workerIndex, 1);
          found = true;
        }
        return m;
      });

      if (!found) {
        throw new Error("Worker not found under local storage.");
      }

      logLocalActivity(db, "worker_removed", `Removed worker: ${workerName}`, `Worker dismissed from ${business}.`);
      saveLocalDB(db);
      return { success: true };
    }
  },

  // 9. Fetch Live Stats
  async getStats(localMarketers: Marketer[]): Promise<DashboardStats> {
    try {
      const response = await fetch(getApiUrl("/api/stats"));
      const { isHtml, text } = await isHtmlResponse(response);
      if (isHtml || !response.ok) {
        throw new Error("Stats API failed");
      }
      return JSON.parse(text);
    } catch (e) {
      console.warn("Calculating stats client-side (static environment fallback)");
      const db = loadLocalDB();
      const currentMarketers = localMarketers.length > 0 ? localMarketers : db.marketers;
      
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
        categoryDist,
        recentActivities: db.activities.slice(0, 6)
      } as any;
    }
  },

  // 10. Simulate Live Logs Action
  async simulateAction(): Promise<any> {
    try {
      const response = await fetch(getApiUrl("/api/simulate-action"), {
        method: "POST"
      });
      const { isHtml, text } = await isHtmlResponse(response);
      if (isHtml || !response.ok) {
        throw new Error("Simulation API failed");
      }
      return JSON.parse(text);
    } catch (e) {
      const db = loadLocalDB();
      if (db.marketers.length === 0) {
        throw new Error("No marketers registered to simulate with.");
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
      logLocalActivity(db, action.type, action.message, action.details);
      saveLocalDB(db);
      return { success: true };
    }
  },

  // 11. Update Direct Photo
  // Allows operators to upload custom JPEG cards / profiles directly
  async updatePhoto(entityId: string, photoBase64: string): Promise<any> {
    try {
      const response = await fetch(getApiUrl(`/api/photos/${entityId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: photoBase64 })
      });
      const { isHtml, text } = await isHtmlResponse(response);
      if (isHtml || !response.ok) {
        throw new Error("Photo API failed");
      }
      return JSON.parse(text);
    } catch (e) {
      const db = loadLocalDB();
      const marketerIndex = db.marketers.findIndex(m => m.id === entityId);
      if (marketerIndex !== -1) {
        db.marketers[marketerIndex].photo = photoBase64;
        logLocalActivity(db, "marketer_registered", `Updated photo ID for marketer ${db.marketers[marketerIndex].fullName}`, `Stall: ${db.marketers[marketerIndex].businessName}`);
        saveLocalDB(db);
        return { success: true, photo: photoBase64 };
      }

      // Worker search
      for (let i = 0; i < db.marketers.length; i++) {
        const workerIndex = db.marketers[i].workers.findIndex(w => w.id === entityId);
        if (workerIndex !== -1) {
          db.marketers[i].workers[workerIndex].photo = photoBase64;
          logLocalActivity(db, "worker_added", `Updated photo ID for staff ${db.marketers[i].workers[workerIndex].fullName}`, `Stall: ${db.marketers[i].businessName}`);
          saveLocalDB(db);
          return { success: true, photo: photoBase64 };
        }
      }

      throw new Error("Operator registration code not found in fallback base.");
    }
  }
};
