import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Sidebar from "./utils/Sidebar";
import Dashboard from "./components/Dashboard";
import MarketersList from "./components/MarketersList";
import RegisterForm from "./components/RegisterForm";
import IDCardGenerator from "./components/IDCardGenerator";
import QRScanner from "./components/QRScanner";
import { AuthState, Marketer, LiveActivity } from "./types";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
import { Clock, RefreshCw, Server, Menu } from "lucide-react";
import { api } from "./utils/api";

export default function App() {
  // Authentication local session storage setup
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const savedUser = localStorage.getItem("campmark_user");
      const savedToken = localStorage.getItem("campmark_token");
      if (savedUser && savedToken) {
        return { user: JSON.parse(savedUser), token: savedToken };
      }
    } catch (e) {
      console.error("Session restore failed:", e);
    }
    return { user: null, token: null };
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedUser = localStorage.getItem("campmark_user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        return u.role === "admin" ? "dashboard" : "marketers";
      }
    } catch (e) {}
    return "dashboard";
  });
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Marketers master data states
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<LiveActivity[]>([]);

  // Sync clock trigger
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1005);
    return () => clearInterval(timer);
  }, []);

  // Secure Backend Syncing Strategy (Single Source of Truth)
  const fetchMarketers = async () => {
    try {
      setLoading(true);
      const data = await api.getMarketers();
      setMarketers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Stall registry offline.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Initial Load and Real-time Synchronizer Setup from Cloud Run Node
  useEffect(() => {
    if (!auth.token) return;
    
    // Initial fetch from backend to populate state safely
    fetchMarketers();

        // OPTIONAL: Keep direct real-time safety fallback streaming hook active
    const unsubscribe = onSnapshot(
      collection(db, "marketers"),
      (snapshot) => {
        console.log("Realtime snapshot:", snapshot.docs.length);
        const liveMarketers = snapshot.docs.map((doc) => doc.data() as Marketer);
        setMarketers(liveMarketers);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore marketers subscription error:", err);
        setError("Failed to stream real-time marketers. Falling back to API.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth.token]);

  // 2. Subscribe to activities collection in real-time
  useEffect(() => {
    if (!auth.token) return;

    const q = query(
      collection(db, "activities"),
      orderBy("timestamp", "desc"),
      limit(25)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveActivities = snapshot.docs.map((doc) => doc.data() as LiveActivity);
        setActivities(liveActivities);
      },
      (err) => {
        console.error("Firestore activities subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [auth.token]);

  const handleLoginSuccess = (user: any, token: string) => {
    localStorage.setItem("campmark_user", JSON.stringify(user));
    localStorage.setItem("campmark_token", token);
    setAuth({ user, token });
    setActiveTab(user.role === "admin" ? "dashboard" : "marketers");
  };

  const handleLogout = () => {
    // FIX: Standardized clean browser cleanup interface execution
    localStorage.removeItem("campmark_user");
    localStorage.removeItem("campmark_token");
    setAuth({ user: null, token: null });
    setActiveTab("dashboard");
  };

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  if (!auth.token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar navigation controls */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={auth.user}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main View Block */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        
        {/* Top Header Row Panel */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0 z-20">
          
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-700 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer shrink-0"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="hidden sm:inline-flex relative h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono tracking-widest leading-none">TACTICAL STATUS</span>
              <span className="text-[10px] sm:text-[11px] font-bold mt-1 uppercase font-mono tracking-wider flex items-center gap-1 truncate">
                <Server className="w-3.5 h-3.5 text-emerald-450 shrink-0" />
                <span className="truncate text-slate-300">Live Node Online</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 text-xs text-slate-400 font-sans">
            {/* Live Clock displayed cleanly inside Mono typography */}
            <div className="hidden lg:flex items-center gap-2 font-mono text-[10.5px] bg-slate-950/60 border border-slate-850 px-3 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                {currentTime.toUTCString().replace("GMT", "UTC")}
              </span>
            </div>

            <button
              onClick={fetchMarketers}
              disabled={loading}
              className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer text-slate-400 hover:text-emerald-450 transition-all flex items-center justify-center border border-slate-800/10 hover:border-slate-800 shrink-0"
              title="Sync dataset"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>
        </header>

        {/* Tactical Panels router container */}
        <div className="flex-1 min-h-0 flex relative">
          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-950/80 border border-red-800 text-red-200 px-4 py-2 rounded-xl text-xs z-50 backdrop-blur">
              {error}
            </div>
          )}
          
          {activeTab === "dashboard" && auth.user?.role === "admin" && (
            <Dashboard 
              marketers={marketers} 
              activities={activities}
              onRefreshAllData={fetchMarketers} 
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === "marketers" && (
            <MarketersList 
              marketers={marketers} 
              onRefresh={fetchMarketers} 
              userRole={auth.user?.role} 
              loggedInUserId={auth.user?.id || undefined}
            />
          )}

          {activeTab === "register" && (
            <RegisterForm 
              onSuccess={fetchMarketers} 
              onNavigate={handleNavigate} 
            />
          )}

          {activeTab === "id_card" && auth.user?.role === "admin" && (
            <IDCardGenerator 
              marketers={marketers} 
              onRefresh={fetchMarketers}
              userRole={auth.user?.role}
              loggedInUserId={auth.user?.id || undefined}
            />
          )}

          {activeTab === "qr_scanner" && auth.user?.role === "admin" && (
            <QRScanner marketers={marketers} />
          )}
        </div>

      </div>
    </div>
  );
}