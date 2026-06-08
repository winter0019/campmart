import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
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
  Coins,
  Search
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
  activities: LiveActivity[];
  onRefreshAllData: () => Promise<void>;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ marketers, activities, onRefreshAllData, onNavigate }: DashboardProps) {
  console.log("Dashboard marketers:", marketers);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Derive stats reactively
  const totalMarketers = marketers.length;
  let totalWorkers = 0;
  let totalRevenue = 0;
  const categories: { [key: string]: number } = {};

  marketers.forEach((m) => {
    totalWorkers += (m.workers || []).length;
    if (m.category) {
      categories[m.category] = (categories[m.category] || 0) + 1;
    }
    totalRevenue += (m.amountPaid || 0);
  });

  const categoryDist = Object.keys(categories).map((k) => ({
    name: k,
    value: categories[k]
  }));

  const stats = {
    totalMarketers,
    totalWorkers,
    activeStands: totalMarketers,
    totalRevenue,
    categoryDist,
    recentActivities: activities
  };

  const filteredMarketersForDashboard = marketers.filter((m) => {
    return (
      m.fullName.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
      m.businessName.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
      m.standNumber.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
      m.category.toLowerCase().includes(dashboardSearch.toLowerCase())
    );
  });

  const handleSimulateAction = async () => {
    setSimulationLoading(true);
    try {
      await api.simulateAction();
    } catch (err: any) {
      console.error("Action simulation error:", err);
      setError(err.message || "Failed to simulate transaction on cloud server.");
    } finally {
      setSimulationLoading(false);
    }
  };

  // Prep charts
  const categoryData = stats.categoryDist || [];
  
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
            onClick={onRefreshAllData}
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

      {/* Category Distribution Deep-Dive Analysis Section */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8 flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-950/80 text-indigo-400 border border-indigo-500/15 rounded-2xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 tracking-tight">Business Category Market Distribution</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Demographics and density analysis of registered marketers by trade categories.</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-950/50 border border-indigo-500/10 px-3 py-1 rounded-full uppercase tracking-wider select-none">
              {categoryData.length} Active Segments
            </span>
          </div>
        </div>

        {categoryData.length === 0 ? (
          <div className="py-16 text-center text-slate-600 border border-dashed border-slate-800 rounded-2xl text-xs font-sans">
            No marketer categories registered. Create or onboard standard vendors to generate demographics.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Recharts category bar chart representation (Vertical layout for legible long names) */}
            <div className="lg:col-span-7 h-[320px] flex flex-col justify-between">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono font-bold tracking-wider uppercase">Live Density Chart</span>
                <span className="text-[10px] text-slate-500 font-mono font-bold tracking-wider uppercase text-slate-400">Total Registered: {categoryData.reduce((acc, c) => acc + c.value, 0)} Stalls</span>
              </div>
              <div className="flex-1 w-full text-xs min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={categoryData} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <XAxis 
                      type="number" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      allowDecimals={false} 
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      width={140} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#0f172a", 
                        borderColor: "#1e293b", 
                        borderRadius: "12px", 
                        color: "#f8fafc",
                        fontSize: "11px",
                        fontFamily: "sans-serif"
                      }}
                      cursor={{ fill: "rgba(30, 41, 59, 0.4)" }}
                    />
                    <Bar 
                      dataKey="value" 
                      name="Registered Stalls" 
                      fill="#3b82f6" 
                      radius={[0, 6, 6, 0]} 
                      barSize={16}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Detailed breakdown grid cards */}
            <div className="lg:col-span-5 flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="text-[10px] text-slate-500 font-mono font-bold tracking-wider uppercase mb-1 flex items-center justify-between">
                <span>Category Breakdown</span>
                <span>Portion Share</span>
              </div>
              
              {categoryData.map((item, index) => {
                const totalStandsCount = categoryData.reduce((acc, c) => acc + c.value, 0);
                const percentage = totalStandsCount > 0 ? Math.round((item.value / totalStandsCount) * 100) : 0;
                const catColor = COLORS[index % COLORS.length];

                return (
                  <div 
                    key={item.name} 
                    className="p-3 bg-slate-950/45 border border-slate-800/40 rounded-2xl flex items-center justify-between gap-4 transition-all hover:border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span 
                        className="w-3.5 h-3.5 rounded-xl shrink-0 shadow-lg border border-white/5" 
                        style={{ backgroundColor: catColor }} 
                      />
                      <div className="min-w-0">
                        <span className="text-slate-200 text-xs font-bold font-sans tracking-tight block truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {item.value} {item.value === 1 ? 'registered booth' : 'registered booths'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-100 font-mono tracking-tight block">
                        {percentage}%
                      </span>
                      <div className="w-16 bg-slate-850 h-1.5 rounded-full overflow-hidden mt-1 ml-auto border border-slate-805">
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            backgroundColor: catColor,
                            width: `${percentage}%`
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* Registered Marketers & Stands Registry */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/80 text-emerald-400 border border-emerald-500/15 rounded-2xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 tracking-tight">Registered Marketers & Stands Registry</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Quick search and review of all registered market operators and active stands.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, category, stand..."
                value={dashboardSearch}
                onChange={(e) => setDashboardSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs py-2 pl-9 pr-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600 font-medium"
              />
            </div>
            
            {/* Direct navigation helper */}
            <button
              onClick={() => onNavigate("marketers")}
              className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0 animate-pulse hover:animate-none"
            >
              <span>Manage Directory &rarr;</span>
            </button>
          </div>
        </div>

        {filteredMarketersForDashboard.length === 0 ? (
          <div className="py-12 text-center text-slate-600 border border-dashed border-slate-800 rounded-2xl text-xs">
            {marketers.length === 0 
              ? "No marketers registered in this session. Go to the 'Register Stand' panel to register one."
              : "No search results match your criteria."
            }
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/20 custom-scrollbar">
            <table className="w-full text-left font-sans border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-mono tracking-wider text-slate-400 uppercase select-none">
                  <th className="py-3 px-4 font-semibold">Exhibitor / Business</th>
                  <th className="py-3 px-4 font-semibold">Stand No</th>
                  <th className="py-3 px-4 font-semibold">Trade Category</th>
                  <th className="py-3 px-4 font-semibold">Contact</th>
                  <th className="py-3 px-4 font-semibold">Verification</th>
                  <th className="py-3 px-4 font-semibold">Amt Paid</th>
                  <th className="py-3 px-4 font-semibold text-right">Registered Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredMarketersForDashboard.map((m) => {
                  let badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  if (m.verificationStatus === "verified") {
                    badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  } else if (m.verificationStatus === "review") {
                    badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                  }

                  return (
                    <tr key={m.id} className="hover:bg-slate-900/45 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 font-bold uppercase flex items-center justify-center shrink-0">
                            {m.businessName.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-200 block truncate max-w-[180px]">{m.businessName}</span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[185px]">{m.fullName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold bg-slate-800 text-slate-200 border border-slate-705 rounded-md py-0.5 px-2 text-[10.5px]">
                          {m.standNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">{m.category}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{m.phone}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 py-0.5 px-2 border rounded-md font-medium text-[9.5px] ${badgeColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.verificationStatus === 'verified' ? 'bg-emerald-400 animate-pulse' : m.verificationStatus === 'review' ? 'bg-rose-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                          {m.verificationStatus === "verified" ? "Verified" : m.verificationStatus === "review" ? "In-Review" : "Pending Audit"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        ₦{(m.amountPaid || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-300 rounded-full h-5 min-w-5 px-1.5 font-bold font-mono text-[10px]">
                          {(m.workers || []).length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
