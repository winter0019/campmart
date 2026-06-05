import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import MarketersList from "./components/MarketersList";
import RegisterForm from "./components/RegisterForm";
import IDCardGenerator from "./components/IDCardGenerator";
import QRScanner from "./components/QRScanner";
import { AuthState, Marketer } from "./types";
import { Clock, RefreshCw, KeyRound, Signal, Server, Globe } from "lucide-react";

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
  const [currentTime, setCurrentTime] = useState(new Date());

  // Marketers master data states
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync clock trigger
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMarketers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/marketers");
      if (!response.ok) {
        throw new Error("Failed to contact stands directory.");
      }
      const data = await response.json();
      setMarketers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Stall registry offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.token) {
      fetchMarketers();
    }
  }, [auth.token]);

  const handleLoginSuccess = (user: any, token: string) => {
    localStorage.setItem("campmark_user", JSON.stringify(user));
    localStorage.setItem("campmark_token", token);
    setAuth({ user, token });
    setActiveTab(user.role === "admin" ? "dashboard" : "marketers");
  };

  const handleLogout = () => {
    localStorage.removeAttr?.("campmark_user"); // fallback check
    localStorage.removeItem("campmark_user");
    localStorage.removeItem("campmark_token");
    setAuth({ user: null, token: null });
    setActiveTab("dashboard");
  };

  // Switch tabs
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
      />

      {/* Main View Block */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        
        {/* Top Header Row Panel */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur px-6 py-2.5 flex items-center justify-between shrink-0 z-20">
          
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex relative h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest leading-none">TACTICAL STATUS</span>
              <span className="text-[11px] font-bold text-slate-350 mt-1 uppercase font-mono tracking-wider flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-emerald-450" />
                Live Node Online (Port 3000)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            {/* Live Clock displayed cleanly inside Mono typography */}
            <div className="hidden md:flex items-center gap-2 font-mono text-[10.5px] bg-slate-950/60 border border-slate-850 px-3 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                {currentTime.toUTCString().replace("GMT", "UTC")}
              </span>
            </div>

            <button
              onClick={fetchMarketers}
              disabled={loading}
              className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer text-slate-400 hover:text-emerald-450 transition-all flex items-center justify-center border border-slate-800/10 hover:border-slate-800"
              title="Sync dataset"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>
        </header>

        {/* Tactical Panels router container */}
        <div className="flex-1 min-h-0 flex relative">
          
          {activeTab === "dashboard" && auth.user?.role === "admin" && (
            <Dashboard 
              marketers={marketers} 
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
