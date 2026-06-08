import React, { useState } from "react";
import { 
  CreditCard, 
  Search, 
  Printer, 
  Download, 
  Check, 
  Smartphone, 
  Building,
  ScanLine,
  Activity,
  Award,
  Sparkles,
  QrCode,
  X,
  Eye
} from "lucide-react";
import { Marketer, Worker } from "../types";
import { downloadIDCard, downloadCombinedIDCard } from "../utils/cardUtils";

interface IDCardGeneratorProps {
  marketers: Marketer[];
  onRefresh?: () => Promise<void>;
  userRole?: "admin" | "marketer";
  loggedInUserId?: string;
}

// Map roles to distinctive styling
const ROLE_COLORS: { [key: string]: string } = {
  "Primary Registrant": "from-emerald-500 to-teal-500 text-slate-950",
  "Shift Lead": "from-blue-500 to-indigo-500 text-slate-100",
  "Sales Promoter": "from-amber-400 to-orange-500 text-slate-950",
  "Cashier Accountant": "from-pink-500 to-rose-500 text-slate-100",
  "Technical Advisor": "from-purple-500 to-indigo-600 text-slate-100"
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

export default function IDCardGenerator({ marketers, onRefresh, userRole = "admin", loggedInUserId }: IDCardGeneratorProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [copiedVerify, setCopiedVerify] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Compile a list of everyone who can receive a badge: Marketers and their Workers!
  const listAllEntities = () => {
    const entities: {
      uniqueId: string; // mkt-X or wrk-Y
      id: string; // real registration ID
      name: string;
      business: string;
      stand: string;
      role: string;
      category: string;
      photo?: string;
      createdAt: string;
    }[] = [];

    marketers.forEach((m) => {
      // Add primary Marketer
      entities.push({
        uniqueId: `m-${m.id}`,
        id: m.id,
        name: m.fullName,
        business: m.businessName,
        stand: m.standNumber,
        role: "Primary Registrant",
        category: m.category,
        photo: m.photo,
        createdAt: m.createdAt
      });

      // Add their Workers
      m.workers.forEach((w) => {
        entities.push({
          uniqueId: `w-${w.id}`,
          id: w.id,
          name: w.fullName,
          business: m.businessName,
          stand: m.standNumber,
          role: w.role,
          category: m.category,
          photo: w.photo || m.photo, // Use worker photo if defined, fallback to marketer photo
          createdAt: w.createdAt
        });
      });
    });

    return entities;
  };

  const allEntities = listAllEntities();
  const entities = userRole === "marketer" && loggedInUserId
    ? allEntities.filter(e => {
        if (e.uniqueId === `m-${loggedInUserId}`) return true;
        const ownerMarketer = marketers.find(m => m.id === loggedInUserId);
        return ownerMarketer?.workers.some(w => w.id === e.id) || false;
      })
    : allEntities;

  const currentEntity = entities.find(e => e.uniqueId === selectedEntityId) || entities[0];

  // Copy API route for QR simulated clipboard checks
  const handleCopyVerificationUrl = () => {
    if (!currentEntity) return;
    const verifyUrl = `${window.location.origin}/api/verify/${currentEntity.id}`;
    navigator.clipboard.writeText(verifyUrl);
    setCopiedVerify(true);
    setTimeout(() => setCopiedVerify(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 sm:p-8 font-sans">
      
      {/* Title block */}
      <div className="max-w-4xl mx-auto border-b border-slate-800 pb-5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Staff ID Card Generator</h1>
          <p className="text-xs text-slate-400 mt-1">Render and export verified smart security badges for campaign operators and personnel.</p>
        </div>
        
        {entities.length > 0 && (
          <button
            onClick={() => setShowPrintPreview(true)}
            className="md:self-end py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-lg hover:shadow-emerald-500/10"
          >
            <Printer className="w-4 h-4 shrink-0 text-slate-950" />
            <span>Visualize & Print Badge</span>
          </button>
        )}
      </div>

      {entities.length === 0 ? (
        <div className="max-w-4xl mx-auto py-24 text-center rounded-3xl border border-dashed border-slate-800/60 flex flex-col items-center gap-2">
          <CreditCard className="w-10 h-10 text-slate-700 font-sans" id="empty-badge-icon" />
          <p className="text-sm font-semibold text-slate-400">No registered profiles in database</p>
          <p className="text-xs text-slate-600">Register a primary marketer stand and register workers under them to enable the builder.</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Controls column */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
                <Search className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">Select Person</h3>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Select Active Operator</label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs py-3 px-3.5 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                >
                  <option value="">-- Choose Operator --</option>
                  {entities.map((item) => (
                    <option key={item.uniqueId} value={item.uniqueId}>
                      {item.name} ({item.role})
                    </option>
                  ))}
                </select>
              </div>

              {currentEntity && (
                <div className="pt-4 border-t border-slate-800/60 space-y-3.5">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Verification Options</span>
                  <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-900 pb-1.5">
                      <span>Operator ID Code:</span>
                      <strong className="font-mono text-emerald-400">{currentEntity.id}</strong>
                    </div>
                    <button
                      onClick={handleCopyVerificationUrl}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-lg text-[10px] uppercase tracking-wider font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 border border-slate-800/40"
                    >
                      {copiedVerify ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied Verification link</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copy verification path</span>
                        </>
                      )}
                    </button>

                    <div className="space-y-1.5 mt-2">
                      <button
                        onClick={() => {
                          downloadIDCard(currentEntity, "front");
                          setTimeout(() => downloadIDCard(currentEntity, "back"), 400);
                        }}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-450 text-slate-950 rounded-lg text-[10px] uppercase tracking-wider font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0 text-slate-950" />
                        <span>Download Dual-Sided (2 Files)</span>
                      </button>

                      <button
                        onClick={() => {
                          downloadCombinedIDCard(currentEntity);
                        }}
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-slate-200 rounded-lg text-[10px] uppercase tracking-wider font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 border border-slate-800/40"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span>Download Combined Sheet (1 File)</span>
                      </button>

                      <button
                        onClick={() => setShowPrintPreview(true)}
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 text-emerald-450 hover:text-emerald-350 rounded-lg text-[10px] uppercase tracking-wider font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 border border-emerald-500/10"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Print Preview & Align</span>
                      </button>
                    </div>
                  </div>

                  {/* ID Photo override zone */}
                  <div className="pt-4 border-t border-slate-800/60 space-y-2">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Upload / Change Face Photo</span>
                    <div className="relative border border-dashed border-slate-800 hover:border-emerald-555/25 rounded-xl p-3 text-center bg-slate-950/30 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingPhoto}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            setPhotoError("Selected image is too large (max 2MB)");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const base64 = reader.result as string;
                            setUploadingPhoto(true);
                            setPhotoError(null);
                            try {
                              const res = await fetch(`/api/photos/${currentEntity.id}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ photo: base64 })
                              });
                              if (!res.ok) {
                                throw new Error("Failed to register picture file");
                              }
                              await onRefresh?.();
                            } catch (err: any) {
                              setPhotoError(err.message || "Error saving picture");
                            } finally {
                              setUploadingPhoto(false);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] text-emerald-450 hover:text-emerald-350 cursor-pointer font-semibold">
                          {uploadingPhoto ? "Saving ID Photo..." : "Select Profile Face File"}
                        </span>
                        <span className="text-[8px] text-slate-550">Recommended: Square Aspect Ratio (Max 2MB)</span>
                      </div>
                    </div>
                    {photoError && (
                      <p className="text-[10px] text-rose-400 font-semibold">{photoError}</p>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Cards render preview layout */}
          {currentEntity && (
            <div className="md:col-span-2 space-y-8">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 print:col-span-2">
                
                {/* 1. FRONT OF BADGE CARD */}
                <div className="bg-white border border-slate-200/90 rounded-[18px] overflow-hidden aspect-[1/1.58] shadow-[0_4px_16px_rgba(0,0,0,0.06)] relative flex flex-col justify-between font-sans print:border-slate-300 w-full max-w-xs sm:max-w-sm mx-auto">
                  
                  {/* Top wave design */}
                  <div className="h-[140px] relative w-full bg-slate-100 overflow-hidden select-none shrink-0 border-b border-slate-100">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 140" preserveAspectRatio="none" fill="none">
                      <path d="M0,0 L300,0 L300,115 Q200,140 100,105 T0,125 Z" fill="#60a5fa" opacity="0.35" />
                      <path d="M0,0 L300,0 L300,102 Q220,128 120,90 T0,112 Z" fill="#1e3a8a" />
                      <path d="M0,0 L300,0 L300,88 Q240,110 150,80 T0,98 Z" fill="#ec4899" />
                    </svg>
                    
                    <div className="absolute top-4 left-5 right-5 flex items-center justify-between text-white drop-shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5.5 h-5.5 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center">
                          <Award className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-black leading-none font-sans">NYSC MARKET</span>
                      </div>
                      <span className="text-[8px] font-black font-mono bg-white/15 backdrop-blur-md border border-white/20 py-0.5 px-2 rounded-full uppercase tracking-wider text-rose-100">
                        ZONE 1-A
                      </span>
                    </div>

                    {/* Floating Profile Image wrapped in white ring */}
                    <div className="absolute bottom-[-56px] left-1/2 -translate-x-1/2 z-10">
                      <div className="w-24 h-28 rounded-xl border-4 border-white shadow-[0_4px_10px_rgba(0,0,0,0.12)] bg-slate-100 overflow-hidden flex items-center justify-center select-none">
                        {getPresetGradient(currentEntity.photo) ? (
                          <div className={`w-full h-full bg-gradient-to-tr ${getPresetGradient(currentEntity.photo)} relative flex items-center justify-center font-bold text-slate-955 text-xl uppercase`}>
                            {currentEntity.name.slice(0, 2)}
                          </div>
                        ) : (
                          <img 
                            src={currentEntity.photo} 
                            alt={currentEntity.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body details of badge front */}
                  <div className="pt-15 px-5 pb-4 flex-1 flex flex-col justify-between text-center">
                    
                    {/* Name & Role block */}
                    <div className="space-y-1 w-full text-center">
                      <h4 className="text-base font-extrabold text-slate-900 tracking-tight uppercase leading-tight">
                        {currentEntity.name}
                      </h4>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#1e3a8a]">
                        {currentEntity.role}
                      </p>
                    </div>

                    {/* Details Rows */}
                    <div className="my-2 py-2 px-3 bg-slate-50 border-y border-slate-105 flex flex-col gap-1.5 text-[10px] text-left rounded-lg">
                      <div className="flex justify-between items-center text-slate-605">
                        <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">ID NO:</span>
                        <span className="font-mono font-extrabold text-slate-900">{currentEntity.id}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-605">
                        <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">STALL NUMBER:</span>
                        <span className="font-extrabold text-slate-900 uppercase">Stand {currentEntity.stand}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-605">
                        <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">TRADE CATEGORY:</span>
                        <span className="font-extrabold text-[#111827] uppercase truncate max-w-[125px]">{currentEntity.category}</span>
                      </div>
                    </div>

                    {/* QR Code bottom alignment */}
                    <div className="flex justify-center items-center pb-1">
                      <div 
                        onClick={() => setShowQRModal(true)}
                        className="p-1 bg-white rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 hover:scale-105 transition-all w-11 h-11 flex items-center justify-center"
                        title="Click to scan and view details"
                      >
                        <QrCode className="w-8 h-8 text-slate-900" style={{ strokeWidth: 1.5 }} />
                      </div>
                    </div>
                  </div>

                </div>

                {/* 2. BACK OF BADGE CARD */}
                <div className="bg-white border border-slate-200/90 rounded-[18px] overflow-hidden aspect-[1/1.58] shadow-[0_4px_16px_rgba(0,0,0,0.06)] relative flex flex-col justify-between font-sans print:border-slate-300 w-full max-w-xs sm:max-w-sm mx-auto">
                  
                  {/* Top wave design back side */}
                  <div className="h-[90px] relative w-full bg-slate-100 overflow-hidden select-none shrink-0 border-b border-slate-100">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 90" preserveAspectRatio="none" fill="none">
                      <path d="M0,0 L300,0 L300,72 Q200,90 100,60 T0,76 Z" fill="#60a5fa" opacity="0.35" />
                      <path d="M0,0 L300,0 L300,62 Q220,80 120,50 T0,66 Z" fill="#1e3a8a" />
                      <path d="M0,0 L300,0 L300,52 Q240,68 150,44 T0,56 Z" fill="#ec4899" />
                    </svg>
                    
                    <div className="absolute top-4 left-5 right-5 flex items-center justify-between text-white">
                      <span className="text-[9px] uppercase tracking-widest font-black leading-none font-sans">TERMS & CONDITIONS</span>
                      <span className="text-[7px] font-mono bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider text-rose-100">REF: CP-Z1</span>
                    </div>
                  </div>

                  <div className="px-5 py-3 flex-1 flex flex-col justify-between gap-3 text-left">
                    <div>
                      <h5 className="text-[9px] font-black uppercase tracking-wider text-[#1e3a8a] mb-1.5">ATTENTION & POLICY</h5>
                      <ul className="space-y-1 text-[8px] text-slate-500 leading-normal font-sans">
                        <li className="flex items-start gap-1">
                          <span className="text-[#ec4899] font-bold">•</span>
                          <span>This credential is an official delegation for NYSC Katsina Camp Market permission. It remains the property of camp administration.</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-[#ec4899] font-[900]">•</span>
                          <span>Bearer must showcase this identifier badge at checkpoints. Alteration or replication is subject to clearance revocation.</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-[#ec4899] font-bold">•</span>
                          <span>For status verification, scan the dynamic QR Code located on the front of this security card.</span>
                        </li>
                      </ul>
                    </div>

                    {/* VALIDITY DATES */}
                    <div className="border-t border-slate-100 pt-2.5 text-center pb-1">
                      <p className="text-[7.5px] text-slate-400">If found, please return to NYSC Camp Secretariat.</p>
                    </div>

                    {/* Bottom delegation credentials */}
                    <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-50">
                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-205 flex items-center justify-center shrink-0">
                        <Award className="w-3 h-3 text-[#ec4899]" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[7.5px] uppercase tracking-wider text-slate-800 font-black leading-tight">CAMP ADMINISTRATION</span>
                        <span className="text-[6.5px] text-slate-400 font-medium font-sans leading-none">Under supervision of Idris Dangalan</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}
        </div>
      )}

      {/* Dynamic Pop-up Details Modal triggered by tapping/clicking the QR Code */}
      {showQRModal && currentEntity && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 to-slate-950 p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg animate-pulse">
                  <QrCode className="w-4 h-4" />
                </div>
                <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-slate-300">NYSC KATSINA SECURE SCAN</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-mono text-[8px] text-emerald-400 font-bold uppercase animate-bounce mt-0.5">Verified</span>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-center space-y-4">
              
              {/* Photo representation */}
              <div className="relative inline-block mx-auto">
                {/* Scanner active visual border */}
                <div className="absolute -inset-2.5 rounded-full border-2 border-dashed border-emerald-500 animate-spin" style={{ animationDuration: "12s" }} />
                
                {getPresetGradient(currentEntity.photo) ? (
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${getPresetGradient(currentEntity.photo)} border-4 border-slate-900 shadow-xl flex items-center justify-center font-bold text-slate-950 text-2.5xl uppercase`}>
                    {currentEntity.name.slice(0, 2)}
                  </div>
                ) : (
                  <img 
                    src={currentEntity.photo} 
                    alt={currentEntity.name} 
                    className="w-24 h-24 rounded-full object-cover border-4 border-slate-900 shadow-xl relative" 
                    referrerPolicy="no-referrer"
                  />
                )}
                
                {/* Verified badge hook */}
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1.5 rounded-full border-2 border-slate-900 shadow">
                  <Check className="w-3.5 h-3.5 text-slate-950" style={{ strokeWidth: 3 }} />
                </div>
              </div>

              {/* Verified Badge text */}
              <div className="space-y-0.5 pt-1">
                <span className="font-mono text-[8px] text-emerald-500 uppercase tracking-widest font-extrabold block">ID MATCH CONFIRMED</span>
                <h3 className="text-lg font-black text-slate-100 tracking-tight">{currentEntity.name.toUpperCase()}</h3>
                <p className="text-xs text-slate-400 font-semibold">{currentEntity.role}</p>
              </div>

              {/* Data Rows */}
              <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-500 font-mono text-[9px] uppercase">Business Stall:</span>
                  <span className="font-bold text-slate-205">{currentEntity.business}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-500 font-mono text-[9px] uppercase">Stand Assignment:</span>
                  <span className="font-mono font-bold text-emerald-400">{currentEntity.stand}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-900/65 pb-1.5">
                  <span className="text-slate-500 font-mono text-[9px] uppercase">Trade Division:</span>
                  <span className="font-bold text-slate-205">{currentEntity.category}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-0.5">
                  <span className="text-slate-500 font-mono text-[9px] uppercase">System UID Code:</span>
                  <span className="font-mono font-medium text-slate-400 text-[10px] tracking-wider">{currentEntity.id}</span>
                </div>
              </div>

              {/* Scan description */}
              <p className="text-[10px] text-slate-500 leading-relaxed font-sans px-2">
                Scan successfully authorized on {new Date().toLocaleTimeString()} by Head of Camp Market Idris Dangalan.
              </p>

            </div>

            {/* Modal Exit */}
            <div className="bg-slate-950 p-4 border-t border-slate-800/60 text-center">
              <button
                onClick={() => setShowQRModal(false)}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Dismiss Reader Screen
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modern Badge Print Preview Modal to visualize before printing */}
      {showPrintPreview && currentEntity && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">Badge Print Preview</h3>
              </div>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Preview Body */}
            <div className="p-6 flex-1 overflow-y-auto bg-slate-950/40">
              <p className="text-xs text-slate-400 mb-6 text-center">
                This indicates exactly how the ID Card badges will be structured and aligned on front/back sides during printing.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center max-w-2xl mx-auto">
                {/* 1. FRONT BADGE CARD PREVIEW */}
                <div className="bg-white text-slate-900 rounded-[18px] border border-slate-200/90 relative flex flex-col justify-between w-full aspect-[1/1.58] max-w-[300px] h-[470px] font-sans overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.06)] mx-auto">
                  {/* Top wave design */}
                  <div className="h-[140px] relative w-full bg-slate-105 overflow-hidden select-none shrink-0 border-b border-slate-100">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 140" preserveAspectRatio="none" fill="none">
                      <path d="M0,0 L300,0 L300,115 Q200,140 100,105 T0,125 Z" fill="#60a5fa" opacity="0.35" />
                      <path d="M0,0 L300,0 L300,102 Q220,128 120,90 T0,112 Z" fill="#1e3a8a" />
                      <path d="M0,0 L300,0 L300,88 Q240,110 150,80 T0,98 Z" fill="#ec4899" />
                    </svg>
                    
                    <div className="absolute top-4 left-5 right-5 flex items-center justify-between text-white drop-shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5.5 h-5.5 rounded-full bg-white/11 backdrop-blur-md border border-white/30 flex items-center justify-center">
                          <Award className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-black leading-none font-sans">NYSC MARKET</span>
                      </div>
                      <span className="text-[8px] font-black font-mono bg-white/11 backdrop-blur-md border border-white/20 py-0.5 px-2 rounded-full uppercase tracking-wider text-rose-100">
                        ZONE 1-A
                      </span>
                    </div>

                    {/* Floating Profile Image wrapped in white ring */}
                    <div className="absolute bottom-[-52px] left-1/2 -translate-x-1/2 z-10">
                      <div className="w-22 h-26 rounded-xl border-4 border-white shadow-[0_4px_10px_rgba(0,0,0,0.12)] bg-slate-100 overflow-hidden flex items-center justify-center select-none">
                        {currentEntity.photo && !currentEntity.photo.startsWith("preset:") ? (
                          <img 
                            src={currentEntity.photo} 
                            alt={currentEntity.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-tr ${getPresetGradient(currentEntity.photo || "preset:emerald")} relative z-10 flex items-center justify-center font-bold text-slate-955 text-xl uppercase`}>
                            {currentEntity.name.slice(0, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-14 px-5 pb-4 flex-1 flex flex-col justify-between text-center">
                    {/* Name */}
                    <div className="space-y-0.5 text-center mt-2">
                      <h4 className="text-sm font-extrabold uppercase tracking-tight text-slate-900 leading-tight">
                        {currentEntity.name}
                      </h4>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-[#1e3a8a]">
                        {currentEntity.role}
                      </p>
                    </div>

                    {/* Information block */}
                    <div className="my-1.5 py-2 px-3 bg-slate-50 border-y border-slate-100 flex flex-col gap-1.5 text-[9px] text-left rounded-lg">
                      <div className="flex justify-between items-center bg-slate-50">
                        <span className="text-[7.5px] uppercase font-bold text-slate-400 tracking-wider">ID NO:</span>
                        <span className="font-mono font-extrabold text-[#111827]">{currentEntity.id}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50">
                        <span className="text-[7.5px] uppercase font-bold text-slate-400 tracking-wider">STALL NUMBER:</span>
                        <span className="font-extrabold text-[#111827] uppercase">Stand {currentEntity.stand}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50">
                        <span className="text-[7.5px] uppercase font-bold text-slate-400 tracking-wider">TRADE CATEGORY:</span>
                        <span className="font-extrabold text-[#111827] uppercase truncate max-w-[124px]">{currentEntity.category}</span>
                      </div>
                    </div>

                    {/* QR Code in preview */}
                    <div className="flex justify-center items-center pb-0.5">
                      <div className="p-0.5 bg-white rounded-lg border border-slate-200 shadow-sm w-8 h-8 flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-slate-900" style={{ strokeWidth: 1.5 }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. BACK BADGE CARD PREVIEW */}
                <div className="bg-white text-slate-900 rounded-[18px] border border-slate-200/90 relative flex flex-col justify-between w-full aspect-[1/1.58] max-w-[300px] h-[470px] font-sans overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.06)] mx-auto">
                  {/* Top wave design back side */}
                  <div className="h-[90px] relative w-full bg-slate-100 overflow-hidden select-none shrink-0 border-b border-slate-100">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 90" preserveAspectRatio="none" fill="none">
                      <path d="M0,0 L300,0 L300,72 Q200,90 100,60 T0,76 Z" fill="#60a5fa" opacity="0.35" />
                      <path d="M0,0 L300,0 L300,62 Q220,80 120,50 T0,66 Z" fill="#1e3a8a" />
                      <path d="M0,0 L300,0 L300,52 Q240,68 150,44 T0,56 Z" fill="#ec4899" />
                    </svg>
                    
                    <div className="absolute top-4 left-5 right-5 flex items-center justify-between text-white">
                      <span className="text-[9px] uppercase tracking-widest font-black leading-none font-sans">TERMS & CONDITIONS</span>
                      <span className="text-[7px] font-mono bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider text-rose-100">REF: CP-Z1</span>
                    </div>
                  </div>

                  <div className="px-5 py-3 flex-1 flex flex-col justify-between gap-2.5 text-left">
                    <div>
                      <h5 className="text-[8.5px] font-black uppercase tracking-wider text-[#1e3a8a] mb-1">ATTENTION & POLICY</h5>
                      <ul className="space-y-1 text-[7.5px] text-slate-500 leading-normal font-sans">
                        <li className="flex items-start gap-1">
                          <span className="text-[#ec4899] font-bold">•</span>
                          <span>This credential is an official delegation for NYSC Katsina Camp Market permission. It remains the property of camp administration.</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-[#ec4899] font-bold">•</span>
                          <span>Bearer must showcase this identifier badge at checkpoints. Alteration or replication is subject to clearance revocation.</span>
                        </li>
                      </ul>
                    </div>

                    {/* VALIDITY EXPIRY */}
                    <div className="border-t border-slate-100 pt-2.5 text-center pb-1">
                      <p className="text-[7.5px] text-slate-450">If found, please return to NYSC Camp Secretariat.</p>
                    </div>

                    {/* Bottom delegation stats */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                      <div className="p-0.5 bg-white rounded border border-slate-200 w-8 h-8 flex items-center justify-center shrink-0">
                        <div className="grid grid-cols-4 gap-0.5 w-full h-full p-0.5">
                          <div className="bg-slate-900 rounded-2xs" />
                          <div className="bg-slate-900 rounded-2xs" />
                          <div className="bg-transparent" />
                          <div className="bg-slate-900 rounded-2xs" />
                          <div className="bg-slate-900 rounded-2xs" />
                          <div className="bg-transparent" />
                          <div className="bg-slate-900 rounded-2xs" />
                          <div className="bg-slate-900 rounded-2xs" />
                          <div className="bg-transparent" />
                          <div className="bg-slate-900 rounded-2xs" />
                          <div className="bg-transparent" />
                          <div className="bg-slate-900 rounded-2xs" />
                          <div className="bg-slate-900 rounded-2xs" />
                          <div className="bg-transparent" />
                          <div className="bg-slate-900 rounded-2xs" />
                          <div className="bg-slate-900 rounded-2xs" />
                        </div>
                      </div>

                      <div className="text-right flex-1">
                        <span className="block text-[6.5px] text-slate-450 uppercase font-mono font-bold leading-none">HEAD OF CAMP MARKET</span>
                        <span className="text-slate-800 font-serif italic tracking-widest text-[8.5px] block mt-0.5 font-bold">Idris Dangalan</span>
                        <div className="w-12 h-[1px] bg-slate-200 ml-auto mt-0.5" />
                        <span className="text-[6px] text-slate-400 uppercase block mt-0.5 leading-none">Signature Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row gap-2.5 sticky bottom-0 z-10 backdrop-blur-md">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-[1.5] py-3 bg-emerald-500 hover:bg-emerald-450 text-slate-950 text-xs font-extrabold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/10"
              >
                <Printer className="w-4 h-4" />
                <span>Trigger Printer Dialog / Save PDF</span>
              </button>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="py-3 px-5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-205 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High Definition Actual Print Specimen rendered dynamically behind other elements */}
      {currentEntity && (
        <div className="print-only">
          {/* Card Front view layout */}
          <div className="bg-white text-slate-900 rounded-[18px] border border-slate-300 relative flex flex-col justify-between w-[320px] h-[505px] font-sans overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.06)] mx-auto">
            {/* Top wave design */}
            <div className="h-[150px] relative w-full bg-slate-105 overflow-hidden select-none shrink-0 border-b border-slate-100">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 150" preserveAspectRatio="none" fill="none">
                <path d="M0,0 L300,0 L300,120 Q200,150 100,110 T0,130 Z" fill="#60a5fa" opacity="0.35" />
                <path d="M0,0 L300,0 L300,105 Q220,135 120,95 T0,120 Z" fill="#1e3a8a" />
                <path d="M0,0 L300,0 L300,90 Q240,115 150,85 T0,105 Z" fill="#ec4899" />
              </svg>
              
              <div className="absolute top-4 left-5 right-5 flex items-center justify-between text-white drop-shadow-sm font-sans">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-white/11 backdrop-blur-md border border-white/30 flex items-center justify-center">
                    <Award className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[11px] uppercase tracking-widest font-black leading-none font-sans">NYSC MARKET</span>
                </div>
                <span className="text-[8.5px] font-black font-mono bg-white/11 backdrop-blur-md border border-white/20 py-0.5 px-2.5 rounded-full uppercase tracking-wider text-rose-100">
                  ZONE 1-A
                </span>
              </div>

              {/* Floating Profile Image wrapped in white ring */}
              <div className="absolute bottom-[-56px] left-1/2 -translate-x-1/2 z-10">
                <div className="w-24 h-28 rounded-xl border-4 border-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] bg-slate-100 overflow-hidden flex items-center justify-center select-none">
                  {currentEntity.photo && !currentEntity.photo.startsWith("preset:") ? (
                    <img 
                      src={currentEntity.photo} 
                      alt={currentEntity.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-tr ${getPresetGradient(currentEntity.photo || "preset:emerald")} relative z-10 flex items-center justify-center font-bold text-slate-955 text-2.5xl uppercase`}>
                      {currentEntity.name.slice(0, 2)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-15 px-6 pb-5 flex-1 flex flex-col justify-between text-center font-sans h-full">
              {/* Name */}
              <div className="space-y-0.5 text-center mt-2">
                <h4 className="text-base font-extrabold uppercase tracking-tight text-slate-900 leading-tight">
                  {currentEntity.name}
                </h4>
                <p className="text-[9.5px] font-bold uppercase tracking-widest text-[#1e3a8a]">
                  {currentEntity.role}
                </p>
              </div>

              {/* Information block */}
              <div className="my-2 py-2 px-3 bg-slate-50 border-y border-slate-205 flex flex-col gap-1.5 text-[10px] text-left rounded-lg">
                <div className="flex justify-between items-center bg-slate-50">
                  <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">ID NO:</span>
                  <span className="font-mono font-extrabold text-[#111827]">{currentEntity.id}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50">
                  <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">STALL NUMBER:</span>
                  <span className="font-extrabold text-[#111827] uppercase">Stand {currentEntity.stand}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50">
                  <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">TRADE CATEGORY:</span>
                  <span className="font-extrabold text-[#111827] uppercase truncate max-w-[130px]">{currentEntity.category}</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center items-center pb-0.5">
                <div className="p-0.5 bg-white rounded-lg border border-slate-200 shadow-sm w-9 h-9 flex items-center justify-center">
                  <QrCode className="w-7 h-7 text-slate-900" style={{ strokeWidth: 1.5 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card Back view layout */}
          <div className="bg-white text-slate-900 rounded-[18px] border border-slate-300 relative flex flex-col justify-between w-[320px] h-[505px] font-sans overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.06)] mx-auto mt-6">
            {/* Top wave design back side */}
            <div className="h-[95px] relative w-full bg-slate-105 overflow-hidden select-none shrink-0 border-b border-slate-100">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 95" preserveAspectRatio="none" fill="none">
                <path d="M0,0 L300,0 L300,75 Q200,95 100,60 T0,78 Z" fill="#60a5fa" opacity="0.35" />
                <path d="M0,0 L300,0 L300,65 Q220,83 120,53 T0,69 Z" fill="#1e3a8a" />
                <path d="M0,0 L300,0 L300,55 Q240,71 150,47 T0,59 Z" fill="#ec4899" />
              </svg>
              
              <div className="absolute top-4 left-5 right-5 flex items-center justify-between text-white font-sans">
                <span className="text-[10px] uppercase tracking-widest font-black leading-none">TERMS & CONDITIONS</span>
                <span className="text-[7.5px] font-mono bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider text-rose-100">REF: CP-Z1</span>
              </div>
            </div>

            <div className="px-6 py-4 flex-1 flex flex-col justify-between gap-3 text-left">
              <div>
                <h5 className="text-[9.5px] font-black uppercase tracking-wider text-[#1e3a8a] mb-1.5">ATTENTION & POLICY</h5>
                <ul className="space-y-1.5 text-[8px] text-slate-500 leading-normal font-sans">
                  <li className="flex items-start gap-1">
                    <span className="text-[#ec4899] font-bold">•</span>
                    <span>This credential is an official delegation for NYSC Katsina Camp Market permission. It remains the property of camp administration.</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-[#ec4899] font-bold">•</span>
                    <span>Bearer must showcase this identifier badge at checkpoints. Alteration or replication is subject to clearance revocation.</span>
                  </li>
                </ul>
              </div>

              {/* VALIDITY EXPIRY */}
              <div className="border-t border-slate-105 pt-3 text-center pb-1">
                <p className="text-[7.5px] text-slate-455">If found, please return to NYSC Camp Secretariat.</p>
              </div>

              {/* Bottom delegation stats */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div className="p-0.5 bg-white rounded border border-slate-200 w-9 h-9 flex items-center justify-center shrink-0">
                  <div className="grid grid-cols-4 gap-0.5 w-full h-full p-0.5">
                    <div className="bg-slate-900 rounded-2xs" />
                    <div className="bg-slate-900 rounded-2xs" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-900 rounded-2xs" />
                    <div className="bg-slate-900 rounded-2xs" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-900 rounded-2xs" />
                    <div className="bg-slate-900 rounded-2xs" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-900 rounded-2xs" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-950 rounded-2xs" />
                    <div className="bg-slate-900 rounded-2xs" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-900 rounded-2xs" />
                    <div className="bg-slate-900 rounded-2xs" />
                  </div>
                </div>

                <div className="text-right flex-1">
                  <span className="block text-[7px] text-slate-455 uppercase font-mono font-bold leading-none font-sans">HEAD OF CAMP MARKET</span>
                  <span className="text-slate-800 font-serif italic tracking-widest text-[9.5px] block mt-0.5 font-bold">Idris Dangalan</span>
                  <div className="w-14 h-[1px] bg-slate-200 ml-auto mt-0.5" />
                  <span className="text-[6.5px] text-slate-400 uppercase block mt-0.5 leading-none">Signature Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

