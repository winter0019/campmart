import React, { useEffect, useState } from "react";
import { 
  Building2, 
  UserSquare2, 
  CheckSquare, 
  Activity, 
  Tv2, 
  Play, 
  AlertCircle,
  TrendingUp, 
  Users, 
  ShieldAlert, 
  RotateCcw,
  Coins
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from "recharts";
import { LiveActivity, Marketer } from "../types";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];

interface DashboardProps {
  marketers: Marketer[];
  onRefreshAllData: () => Promise<void>;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ marketers, onRefreshAllData, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<{
    totalMarketers: number;
    totalWorkers: number;
    activeStands: number;
    totalRevenue?: number;
    categoryDist: { name: string; value: number }[];
    recentActivities: LiveActivity[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);

  // Fetch stats from backend
  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      if (!response.ok) {
        throw new Error("Unable to retrieve tactical statistics.");
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Failed to contact database statistics service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [marketers]);

  const handleSimulateAction = async () => {
    setSimulationLoading(true);
    try {
      const response = await fetch("/api/simulate-action", {
        method: "POST"
      });
      if (response.ok) {
        await fetchStats();
        await onRefreshAllData();
      }
    } catch (err) {
      console.error("Action simulation error:", err);
    } finally {
      setSimulationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-400">
        <Activity className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <span className="text-sm">Synthesizing live metrics dashboard...</span>
      </div>
    );
  }

  // Prep charts
  const categoryData = stats?.categoryDist || [];
  
  // Format bar chart data (Workers per Marketer)
  const workerChartData = marketers.map(m => ({
    name: m.businessName.length > 15 ? m.businessName.slice(0, 15) + "..." : m.businessName,
    "Workers": m.workers.length,
    "Stand": m.standNumber
  }));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 sm:p-8 space-y-8 font-sans">
      
      {/* Upper Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Campaign Operations Command</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time supervision of active camp stands, marketers, and worker validations.</p>
        </div>
        <div className="flex items-center gap-3">
          {marketers.length > 0 && (
            <button
              onClick={handleSimulateAction}
              disabled={simulationLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{simulationLoading ? "Processing Scan..." : "Simulate Live Check-in"}</span>
            </button>
          )}
          <button
            onClick={fetchStats}
            title="Refresh database state"
            className="p-2 bg-slate-905 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded-xl cursor-pointer transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-xs text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-sans">
        
        {/* KPI 1 */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Stands / Marketers</span>
            <div className="p-2.5 bg-emerald-950/80 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <Building2 className="w-5 h-5" id="kpi-stands-icon" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-100">{stats?.totalMarketers || 0}</span>
            <span className="text-[10px] text-slate-500 ml-2">Total registered stalls</span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <button 
              onClick={() => onNavigate("marketers")} 
              className="text-xs text-emerald-450 hover:text-emerald-350 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              Manage Stalls &rarr;
            </button>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Registered Workers</span>
            <div className="p-2.5 bg-blue-950/80 text-blue-400 border border-blue-500/20 rounded-xl">
              <Users className="w-5 h-5" id="kpi-workers-icon" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-100">{stats?.totalWorkers || 0}</span>
            <span className="text-[10px] text-slate-500 ml-2">All field agents & staff</span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <button 
              onClick={() => onNavigate("id_card")} 
              className="text-xs text-blue-450 hover:text-blue-350 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              View Badges &rarr;
            </button>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Operational Status</span>
            <div className="p-2.5 bg-amber-950/80 text-amber-400 border border-amber-500/20 rounded-xl">
              <CheckSquare className="w-5 h-5" id="kpi-status-icon" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-100">{stats?.activeStands ? "ACTIVE" : "PENDING"}</span>
            <span className="text-[10px] text-slate-500 ml-2">Verified secure zone</span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <button 
              onClick={() => onNavigate("qr_scanner")} 
              className="text-xs text-amber-450 hover:text-amber-350 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              Verify Credentials &rarr;
            </button>
          </div>
        </div>

        {/* KPI 4 - Realtime Revenue Generated */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Total Money Generated</span>
            <div className="p-2.5 bg-indigo-950 /80 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <Coins className="w-5 h-5" id="kpi-revenue-icon" />
            </div>
          </div>
          <div className="mt-4 flex flex-col justify-start">
            <span className="text-2xl font-black text-slate-100 font-mono tracking-tight text-ellipsis overflow-hidden">
              ₦{(stats?.totalRevenue ?? marketers.reduce((acc, m) => acc + (m.amountPaid || 0), 0)).toLocaleString()}
            </span>
            <span className="text-[9px] text-emerald-400 font-bold self-start mt-1 font-mono tracking-wider bg-emerald-950/40 border border-emerald-500/10 px-1.5 py-0.5 rounded uppercase">
              Real-Time Sync
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <button 
              onClick={() => onNavigate("marketers")} 
              className="text-xs text-indigo-450 hover:text-indigo-350 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              Audits & Ledger &rarr;
            </button>
          </div>
        </div>

      </div>

      {/* Charts Box Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Workers Stand Load metric bar chart */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8 flex flex-col h-[340px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm text-slate-200">Staff Distribution Per Stall</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">RELATIONAL WORKER SIZE</span>
          </div>
          
          <div className="flex-1 w-full text-xs min-h-0">
            {workerChartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                Register stands to generate visualizer
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px", color: "#f8fafc" }}
                  />
                  <Bar dataKey="Workers" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category breakdown pie chart */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8 flex flex-col h-[340px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-sm text-slate-200">Stand Category Diversity</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">MARKETER TYPES</span>
          </div>

          <div className="flex-1 w-full text-xs min-h-0 flex flex-col sm:flex-row items-center justify-center gap-4">
            {categoryData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                Add categories representation
              </div>
            ) : (
              <>
                <div className="w-1/2 h-full min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px", color: "#f8fafc" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 flex flex-col gap-2 p-2">
                  {categoryData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2 justify-between border-b border-slate-800/50 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-slate-300 font-medium text-xs truncate max-w-[110px]">{item.name}</span>
                      </div>
                      <span className="font-mono text-slate-500 font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Real-time Validation Action Log */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col">
              <h3 className="font-semibold text-sm text-slate-200">Real-Time Validation Feed</h3>
              <span className="text-[10px] text-slate-400">Stream of security clearances & marketer actions</span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 py-1 px-2.5 rounded-full uppercase tracking-widest">
            SSE Connection Port 3000 Active
          </span>
        </div>

        <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2">
          {stats?.recentActivities && stats.recentActivities.length > 0 ? (
            stats.recentActivities.map((act) => {
              let tagColor = "bg-emerald-950/40 border-emerald-500/20 text-emerald-400";
              if (act.type === "worker_removed" || act.type === "marketer_deleted") {
                tagColor = "bg-rose-950/40 border-rose-500/20 text-rose-400";
              } else if (act.type === "customer_scan" || act.type === "stand_patrol") {
                tagColor = "bg-indigo-950/40 border-indigo-500/20 text-indigo-400";
              }

              return (
                <div 
                  key={act.id} 
                  className="p-3.5 bg-slate-950/45 border border-slate-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-800 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`text-[10px] shrink-0 font-mono font-medium py-0.5 px-2 rounded-md uppercase tracking-wider border ${tagColor}`}>
                      {act.type.replace("_", " ")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{act.message}</p>
                      {act.details && <p className="text-xs text-slate-500 mt-0.5">{act.details}</p>}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 shrink-0 self-end sm:self-center">
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-2xl">
              No tactical actions logged yet. Simulating updates or registering marketers will populate the feed.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
