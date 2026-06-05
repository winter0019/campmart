import React, { useState, useEffect } from "react";
import { 
  ScanLine, 
  Camera, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Building,
  UserCheck,
  RotateCw,
  Sparkles,
  RefreshCw,
  QrCode
} from "lucide-react";
import { Marketer } from "../types";

const CATEGORY_COLORS: { [key: string]: string } = {
  "Food & Beverage": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Electronics": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Apparel & Textiles": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Crafts & Decor": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Beauty & Cosmetics": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Services & Entertainment": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
};

// Gradient representation parsed
function getPresetGradient(photoStr?: string) {
  if (!photoStr) return "from-slate-600 to-slate-800";
  if (photoStr.startsWith("preset:")) {
    const raw = photoStr.replace("preset:", "");
    if (raw === "emerald") return "from-emerald-400 to-teal-500";
    if (raw === "ocean") return "from-blue-400 to-indigo-600";
    if (raw === "sunset") return "from-amber-400 to-rose-600";
    if (raw === "purple") return "from-purple-400 to-pink-600";
    if (raw === "cyber") return "from-cyan-400 to-blue-500";
    if (raw === "solar") return "from-yellow-400 to-orange-500";
  }
  return null;
}

interface QRScannerProps {
  marketers: Marketer[];
}

export default function QRScanner({ marketers }: QRScannerProps) {
  const [searchId, setSearchId] = useState("");
  const [scanning, setScanning] = useState(false);
  
  // Scanned record container state
  const [scannedResult, setScannedResult] = useState<{
    valid: boolean;
    type?: string;
    details?: {
      id: string;
      name: string;
      business: string;
      phone: string;
      standNumber: string;
      category: string;
      role: string;
      primaryContact?: string;
      createdAt: string;
      photo?: string;
    };
    error?: string;
  } | null>(null);

  // Compile rapid select lists for quick scanning simulations
  const simulateEntries: { id: string; name: string; role: string; type: string }[] = [];
  marketers.forEach((m) => {
    simulateEntries.push({ id: m.id, name: m.fullName, role: "Primary Registrant", type: "Marketer" });
    m.workers.forEach((w) => {
      simulateEntries.push({ id: w.id, name: w.fullName, role: w.role, type: "Staff Worker" });
    });
  });

  const handleQueryVerify = async (idToQuery: string) => {
    const queryId = idToQuery.trim();
    if (!queryId) return;

    setScanning(true);
    setScannedResult(null);

    // Short timeout mock to feel like a high-tech camera scan resolves the database!
    setTimeout(async () => {
      try {
        const response = await fetch(`/api/verify/${queryId}`);
        const data = await response.json();

        if (response.ok) {
          setScannedResult({
            valid: true,
            type: data.type,
            details: data.details
          });
        } else {
          setScannedResult({
            valid: false,
            error: data.error || "Tactical ID coordinate not identified."
          });
        }
      } catch (err: any) {
        setScannedResult({
          valid: false,
          error: "Unable to reach tactical lookup server."
        });
      } finally {
        setScanning(false);
      }
    }, 1200);
  };

  const handleSimulateQuickScan = (id: string) => {
    setSearchId(id);
    handleQueryVerify(id);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 sm:p-8 font-sans">
      
      {/* Header section */}
      <div className="max-w-4xl mx-auto border-b border-slate-800 pb-5 mb-8">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">QR Verification Hub</h1>
        <p className="text-xs text-slate-400 mt-1">Audit credentials, scan credentials barcodes, and confirm campaign stall operator clearances instantly.</p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column (Webcam Scan Simulator Panel) */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-850 mb-5">
                <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">Access Camera Scan</h3>
              </div>

              {/* Viewport Box Mock */}
              <div className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center p-4">
                
                {/* Visual Laser Scanner line */}
                {scanning && (
                  <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,1)] z-10 animate-[bounce_2s_infinite]" />
                )}

                {/* Video backdrop grids */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.1),rgba(2,6,23,0.85))]" />
                <div className="absolute inset-4 border border-emerald-500/15 rounded-xl border-dashed pointer-events-none" />

                {scanning ? (
                  <div className="flex flex-col items-center gap-3 relative z-10 text-center">
                    <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin" />
                    <span className="text-xs font-mono text-emerald-400/85 tracking-widest uppercase">resolving biometric barcode...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 relative z-10 text-center animate-pulse">
                    <ScanLine className="w-10 h-10 text-slate-700" style={{ strokeWidth: 1.2 }} />
                    <span className="text-xs text-slate-500 font-semibold max-w-[210px]">
                      Camera scanner preview ready. Use the simulations below.
                    </span>
                  </div>
                )}
                
                {/* Camera feedback tag */}
                <div className="absolute top-3 left-3 bg-slate-950/80 border border-slate-800/60 rounded px-2 py-0.5 text-[8.5px] font-mono text-slate-500 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                  CAM-01: ON
                </div>
              </div>

              {/* Enter manually */}
              <div className="mt-6 space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-sans">Lookup Registration ID manually</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. mkt-1 or wrk-11"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-700"
                    />
                    <button
                      onClick={() => handleQueryVerify(searchId)}
                      className="py-2.5 px-4 bg-slate-950 border border-slate-800 hover:border-slate-705 text-slate-200 hover:text-white rounded-xl transition-all font-semibold font-sans cursor-pointer"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick simulations selector */}
            <div className="pt-6 mt-6 border-t border-slate-800/60 space-y-3.5">
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Simulate Live Verification Events</span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {simulateEntries.slice(0, 3).map((ent) => (
                  <button
                    key={ent.id}
                    onClick={() => handleSimulateQuickScan(ent.id)}
                    className="py-2.5 px-3 bg-slate-950 hover:bg-slate-950/80 border border-slate-850 hover:border-emerald-500/30 text-slate-400 hover:text-slate-200 text-left rounded-xl truncate transition-all cursor-pointer font-medium"
                    title={`Scan ${ent.name}`}
                  >
                    Scan {ent.name}
                  </button>
                ))}
                <button
                  onClick={() => handleSimulateQuickScan("mkt-invalid-code")}
                  className="py-2.5 px-3 bg-slate-950 hover:bg-slate-950/80 border border-slate-850 hover:border-rose-500/30 text-rose-450 hover:text-rose-300 text-left rounded-xl truncate transition-all cursor-pointer font-medium"
                >
                  Scan Invalid Barcode ID
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Verification Results Panel) */}
        <div>
          {scannedResult ? (
            <div>
              {scannedResult.valid && scannedResult.details ? (
                /* Valid Pass Card details */
                <div className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6">
                  {/* Decorative corner tag color */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center gap-3 border-b border-slate-850 pb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-400 animate-pulse shrink-0" />
                    <div>
                      <span className="text-[9px] font-mono tracking-widest text-emerald-400/80 uppercase font-semibold">Security audit clear</span>
                      <h4 className="text-base font-extrabold text-slate-250 tracking-tight leading-tight uppercase">CLEARANCE GRANTED</h4>
                    </div>
                  </div>

                  {/* Profile section details */}
                  <div className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-850/60">
                    {getPresetGradient(scannedResult.details.photo) ? (
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-tr ${getPresetGradient(scannedResult.details.photo)} shadow flex items-center justify-center font-bold text-slate-950 shrink-0 text-xl`}>
                        {scannedResult.details.business.slice(0, 2)}
                      </div>
                    ) : (
                      <img 
                        src={scannedResult.details.photo} 
                        alt={scannedResult.details.name} 
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-800/30 shadow" 
                        referrerPolicy="no-referrer"
                      />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] uppercase tracking-wider font-bold py-0.5 px-2 border rounded-full ${
                          CATEGORY_COLORS[scannedResult.details.category] || "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          {scannedResult.details.category}
                        </span>
                        <span className="text-[9px] font-mono text-emerald-400 font-extrabold">
                          Stand {scannedResult.details.standNumber}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-slate-100 mt-1">{scannedResult.details.name}</h5>
                      <p className="text-[10px] text-slate-500">Merchant business: {scannedResult.details.business}</p>
                    </div>
                  </div>

                  {/* Operational audits details lines */}
                  <div className="space-y-2 text-xs">
                    <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Credential Verification Specifications</span>
                    <div className="bg-slate-950/70 border border-slate-850 p-4 rounded-xl space-y-2.5 text-[11px] font-sans">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Authorization Level:</span>
                        <strong className="text-emerald-405 font-mono">{scannedResult.details.role}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Phone / Contact Cell:</span>
                        <strong className="text-slate-300">{scannedResult.details.phone}</strong>
                      </div>
                      {scannedResult.details.primaryContact && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Primary Representative:</span>
                          <strong className="text-slate-300">{scannedResult.details.primaryContact}</strong>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-slate-405 mt-2 pt-2 border-t border-slate-900">
                        <span>Registered Seal Stamp:</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">
                          GENUINE EXEMPTION ACTIVE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Invalid scan reject results  */
                <div className="bg-slate-900 border border-rose-500/20 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-slate-850 pb-4">
                    <XCircle className="w-8 h-8 text-rose-450 shrink-0" />
                    <div>
                      <span className="text-[9px] font-mono tracking-widest text-rose-405/80 uppercase font-semibold">Security exception triggered</span>
                      <h4 className="text-base font-extrabold text-slate-200 tracking-tight leading-tight uppercase">CLEARANCE REJECTED</h4>
                    </div>
                  </div>

                  <div className="p-4 bg-rose-955/20 border border-rose-500/20 rounded-2xl flex items-start gap-3.5 text-xs text-rose-300">
                    <AlertTriangle className="w-5 h-5 text-rose-450 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">Invalid Registration ID Coordinate</p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        The queried identity record matches no authorized databases or stand registrations on port 3000. Access is completely denied.
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 text-center font-mono italic">
                    Refer back to the Operator Stalls or regenerate their ID card.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Blank state waiting scanning */
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-8 h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs">
              <QrCode className="w-12 h-12 text-slate-800 mb-3" style={{ strokeWidth: 1.2 }} />
              <span className="font-bold text-slate-450">Awaiting ID Scans Barcode Target</span>
              <p className="text-slate-600 mt-1 max-w-[240px]">
                Input manually or click a "Simulate Live Events" button on the left to resolve a profile instantly.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
