import React from "react";
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Contact, 
  QrCode, 
  LogOut, 
  Building, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Smartphone
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  user: { fullName: string; role: string } | null;
  onLogout: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  user,
  onLogout
}: SidebarProps) {
  const menuItems = [
    ...(user?.role === "admin" ? [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
    { id: "marketers", label: user?.role === "marketer" ? "My Stand Hub" : "Marketers & Staff", icon: Users },
    ...(user?.role === "admin" ? [
      { id: "register", label: "Register Stand", icon: UserPlus },
      { id: "id_card", label: "ID Card Generator", icon: Contact },
      { id: "qr_scanner", label: "QR Verifier Hub", icon: QrCode }
    ] : []),
  ];

  return (
    <aside 
      className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 relative ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand logo container */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0 gap-3">
        <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-500/20 shrink-0">
          <Building className="w-5 h-5" id="sidebar-logo-icon" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-slate-100">NYSC Katsina</span>
            <span className="text-[10px] text-emerald-400 font-mono tracking-wider">VERSION 1.0</span>
          </div>
        )}
      </div>

      {/* Collapse Trigger Button (Floating on the border) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 border border-slate-700 hover:border-emerald-500 rounded-full flex items-center justify-center text-slate-400 cursor-pointer shadow transition-all duration-150"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Navigation list */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer group ${
                isActive 
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500" 
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-transform ${isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Info & Footer Session Block */}
      <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-950/40">
        {!collapsed ? (
          <div className="space-y-4">
            {/* User Bio */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold uppercase overflow-hidden text-sm">
                {user?.fullName?.charAt(0) || "U"}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-slate-200 truncate">{user?.fullName || "Active User"}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {user?.role === "admin" ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Smartphone className="w-3 h-3 text-teal-400" />
                  )}
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 truncate">{user?.role || "user"}</span>
                </div>
              </div>
            </div>

            {/* Logout Trigger */}
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded-xl text-xs font-medium cursor-pointer transition-all"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out Gate</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold uppercase text-xs">
              {user?.fullName?.charAt(0) || "U"}
            </div>
            <button
              onClick={onLogout}
              title="Logout session"
              className="p-2 text-red-400 hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
