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
  QrCode
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
            onClick={handlePrint}
            className="md:self-end py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Print Badge / Save PDF</span>
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
                <div className="bg-slate-900 border border-slate-801 rounded-3xl overflow-hidden aspect-[1/1.58] shadow-2xl relative flex flex-col justify-between font-sans print:border-slate-300">
                  
                  {/* Outer security stripe */}
                  <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

                  {/* Header overlay badge card */}
                  <div className="pt-6 px-6 pb-4 flex items-center justify-between gap-2 border-b border-slate-850 bg-slate-950/25">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-400" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-350 tracking-wider font-sans">NYSC KATSINA CAMP MARKET</span>
                        <span className="text-[7.2px] font-bold text-slate-450 font-mono tracking-tight uppercase">CAMP MARKET & VENDOR ACCESS CLEARANCE</span>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-black font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/20 py-0.5 px-2 rounded">
                      ZONE 1-A
                    </span>
                  </div>

                  {/* Body details of badge front */}
                  <div className="p-6 flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    
                    {/* User Profile Frame */}
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 to-blue-500 rounded-2xl blur-sm opacity-25 group-hover:opacity-40 transition-opacity" />
                      
                      {getPresetGradient(currentEntity.photo) ? (
                        <div className={`w-28 h-28 rounded-2xl bg-gradient-to-tr ${getPresetGradient(currentEntity.photo)} relative shadow flex items-center justify-center font-bold text-slate-950 text-3xl border border-slate-750/30 font-sans uppercase`}>
                          {currentEntity.business.slice(0, 2)}
                        </div>
                      ) : (
                        <img 
                          src={currentEntity.photo} 
                          alt={currentEntity.name} 
                          className="w-28 h-28 rounded-2xl object-cover relative border border-slate-750 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>

                    {/* Person Credentials and metadata */}
                    <div className="space-y-1 w-full px-2">
                      <h4 className="text-base font-extrabold text-slate-100 tracking-tight uppercase leading-snug">
                        {currentEntity.name}
                      </h4>
                      
                      <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950 border border-slate-800 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
                          {currentEntity.role}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                        Merchant: {currentEntity.business}
                      </p>
                    </div>
                  </div>

                  {/* Foot layout card */}
                  <div className="px-6 py-5 bg-slate-950/70 border-t border-slate-850 flex items-center justify-between gap-3 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[7.5px] uppercase tracking-wider text-slate-500">Assigned Stalls</span>
                      <strong className="text-slate-200 mt-0.5 text-sm uppercase">Stand {currentEntity.stand}</strong>
                    </div>

                    {/* ID Badge number bottom line  */}
                    <div className="flex flex-col text-right">
                      <span className="text-[7.5px] uppercase tracking-wider text-slate-500">Operator ID No</span>
                      <strong className="font-mono text-emerald-400 mt-0.5 text-xs">{currentEntity.id}</strong>
                    </div>
                  </div>

                </div>

                {/* 2. BACK OF BADGE CARD */}
                <div className="bg-slate-900 border border-slate-801 rounded-3xl overflow-hidden aspect-[1/1.58] shadow-2xl relative flex flex-col justify-between font-sans print:border-slate-300">
                  
                  {/* Decorative Magnetic Tape */}
                  <div className="h-10 bg-slate-950 shrink-0 mt-6 relative flex items-center px-6">
                    <span className="text-[6.5px] font-mono text-slate-700 tracking-widest font-bold">SECURE INTEGRATED MAGNETIC AUDIT TAG</span>
                  </div>

                  <div className="px-6 py-4 flex-1 flex flex-col justify-between gap-4 mt-2">
                    
                    {/* Legal security disclaimer lines */}
                    <div className="space-y-2 text-[8px] text-slate-500 leading-normal font-sans border-b border-slate-850 pb-4">
                      <p>
                        This credential is an official delegation for NYSC Katsina Camp Market event permissions. It remains the personal property of the general camp administration.
                      </p>
                      <p>
                        Bearer must showcase this identifier badge at all checkpoints. Alteration, replication, or delegation is subject to full clearance revocation.
                      </p>
                      <div className="flex justify-between font-mono text-[7px] text-slate-600 mt-3 pt-2">
                        <span>ISSUED ON: {new Date(currentEntity.createdAt).toLocaleDateString()}</span>
                        <span>SECURITY REF: CP-Z1</span>
                      </div>
                    </div>

                    {/* Signature and Verification section */}
                    <div className="flex items-center justify-between gap-3">
                      
                      {/* Interactive dynamic SVG QR representation */}
                      <div 
                        onClick={() => setShowQRModal(true)}
                        className="p-1.5 bg-white rounded-xl shrink-0 border border-slate-200 shadow-md cursor-pointer hover:bg-slate-50 transition-all hover:scale-110 active:scale-95 group relative"
                        title="Click to scan and view details"
                      >
                        <QrCode className="w-12 h-12 text-slate-900 group-hover:text-emerald-600 transition-colors" style={{ strokeWidth: 1.5 }} />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-slate-950" />
                      </div>

                      {/* Signature simulation */}
                      <div className="flex-1 flex flex-col items-end text-right">
                        <div className="font-mono text-[7.5px] text-slate-500 uppercase tracking-widest">Head of Camp Market</div>
                        <span className="text-slate-300 mt-1 mr-2 text-xs font-serif italic select-none opacity-85 tracking-widest">
                          Idris Dangalan
                        </span>
                        <div className="w-24 h-[1px] bg-slate-800 mt-0.5" />
                        <span className="text-[7.5px] text-slate-600 mt-1 uppercase tracking-wider">Audit Signature Verified</span>
                      </div>
                    </div>

                  </div>

                  {/* Bottom bar represent security protocols */}
                  <div className="py-4 bg-slate-950/70 border-t border-slate-850 flex flex-col items-center justify-center font-mono">
                    <div className="text-[6.5px] text-emerald-400 font-semibold tracking-widest uppercase">
                      CAMP CODE CERTIFICATE CLEARANCE ACTIVATED
                    </div>
                    {/* Fake barcode lines representation */}
                    <div className="flex gap-[1.5px] h-3.5 mt-2 opacity-50 pb-1">
                      {[1,3,1,4,2,1,1,3,2,1,2,4,1,2,1,3,1,1,4,2].map((w, idx) => (
                        <div key={idx} className="bg-slate-300" style={{ width: `${w}px` }} />
                      ))}
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
                <div className="flex items-center justify-between text-xs border-b border-slate-900/60 pb-1.5">
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

    </div>
  );
}
