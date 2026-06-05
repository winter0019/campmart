import React, { useState } from "react";
import { 
  Building2, 
  UserPlus, 
  UploadCloud, 
  Smartphone, 
  Store, 
  ClipboardCheck, 
  BadgeHelp,
  Tag, 
  Sparkles,
  Camera,
  AlertCircle
} from "lucide-react";
import { Marketer } from "../types";

interface RegisterFormProps {
  onSuccess: () => void;
  onNavigate: (tab: string) => void;
}

const CATEGORIES = [
  "Tailor",
  "Restaurant",
  "Photocopy",
  "POS",
  "Photographer",
  "Laundry (Male Hostel)",
  "Provision",
  "Fast Food",
  "Laundry (Female Hostel)",
  "Customizing",
  "Saloon",
  "Welfare/Old cooperative",
  "Akara",
  "Video Coverage",
  "Barbing",
  "Charging",
  "Barbique",
  "Hot Water",
  "Pharmacy",
  "Jewellery",
  "Kunu",
  "Herbs",
  "Shoe Seller",
  "Cap",
  "Meat",
  "Fruit",
  "Shoe Shinner",
  "Clothing",
  "Stick Meat",
  "Awara",
  "Drinks",
  "Snacks",
  "New Cooperative",
  "Sweet Vendor",
  "Fan Milk",
  "Charger Vendor",
  "Hanna",
  "Renting",
  "Fulani Dress Vendor"
];

// 6 beautiful abstract gradient avatars
const AVATAR_PRESETS = [
  { name: "Emerald Field", color: "from-emerald-400 to-teal-500", raw: "emerald" },
  { name: "Ocean Splash", color: "from-blue-400 to-indigo-600", raw: "ocean" },
  { name: "Sunset Blaze", color: "from-amber-400 to-rose-600", raw: "sunset" },
  { name: "Purple Dream", color: "from-purple-400 to-pink-600", raw: "purple" },
  { name: "Cyber Cyber", color: "from-cyan-400 to-blue-500", raw: "cyber" },
  { name: "Solar Wind", color: "from-yellow-400 to-orange-500", raw: "solar" }
];

export default function RegisterForm({ onSuccess, onNavigate }: RegisterFormProps) {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [standNumber, setStandNumber] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  
  // Photo option state - Custom URL, File base64, or Preset Gradient
  const [photoType, setPhotoType] = useState<"preset" | "upload">("preset");
  const [selectedPreset, setSelectedPreset] = useState("emerald");
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // File to Base64 conversion
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Represented file is too large. Choose an image smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedBase64(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are permitted.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Represented file is too large. Choose an image smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedBase64(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !businessName || !phone || !standNumber) {
      setError("Please complete all required fields (*).");
      return;
    }

    setLoading(true);
    setError(null);

    // Form final avatar representation
    const finalPhoto = photoType === "upload" && uploadedBase64 
      ? uploadedBase64 
      : `preset:${selectedPreset}`;

    try {
      const response = await fetch("/api/marketers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          businessName,
          phone,
          standNumber: standNumber.toUpperCase(),
          category,
          description,
          photo: finalPhoto
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to commit marketer profile registration.");
      }

      setFormSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Unable to speak with registration server.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFullName("");
    setBusinessName("");
    setPhone("");
    setStandNumber("");
    setCategory(CATEGORIES[0]);
    setDescription("");
    setPhotoType("preset");
    setSelectedPreset("emerald");
    setUploadedBase64(null);
    setError(null);
    setFormSuccess(false);
  };

  if (formSuccess) {
    return (
      <div className="flex-1 bg-slate-950 flex items-center justify-center p-6 sm:p-8 font-sans">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="inline-flex p-4 bg-emerald-950 text-emerald-400 border border-emerald-500/10 rounded-2xl mb-4">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Stand Registration Validated</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
            The business stall <strong className="text-emerald-400">{businessName}</strong> has been saved with Stand <strong className="text-emerald-400">{standNumber.toUpperCase()}</strong>. Issuing biometric credentials database record.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-8">
            <button
              onClick={resetForm}
              className="py-3 px-4 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold rounded-xl cursor-pointer transition-all"
            >
              Register Another Stand
            </button>
            <button
              onClick={() => onNavigate("marketers")}
              className="py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-xl cursor-pointer transition-all"
            >
              Browse Stands Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 sm:p-8 font-sans">
      
      {/* Page Header */}
      <div className="max-w-4xl mx-auto border-b border-slate-800 pb-5 mb-8">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Register Campaign Stand</h1>
        <p className="text-xs text-slate-400 mt-1">Deploy a new registered seller stall and secure their operational location tags.</p>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-rose-950/40 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-xs text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Fields Layout */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left column (Form controls) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
              <Store className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm text-slate-200">Merchant Credentials</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">Business Name *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vance Fresh Organics"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">Primary Owner Full Name *</label>
                <div className="relative">
                  <UserPlus className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alice Vance"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">Contact Phone *</label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +1 (555) 012-3456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">Designated Stand / Stall No. *</label>
                <div className="relative">
                  <span className="text-xs font-mono font-bold text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2">NO.</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A-12, B-04"
                    value={standNumber}
                    onChange={(e) => setStandNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs py-3 pl-11 pr-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase placeholder:text-slate-700 font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-2">Operational Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`py-2 px-3 border rounded-xl text-[11px] text-center font-medium cursor-pointer transition-all truncate ${
                          isSelected 
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                            : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Stand Bio & Campaign Offerings</label>
              <textarea
                rows={3}
                placeholder="Brief summary of offerings, campaigns or menu items for ID verification records."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-3.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-705"
              />
            </div>
          </div>
        </div>

        {/* Right column (Photo Selector UI) */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60 mb-4 animate-pulse">
                <Camera className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-sm text-slate-200">Merchant Photo ID</h3>
              </div>

              {/* Photo representation switcher */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setPhotoType("preset")}
                  className={`py-1.5 px-3 rounded-lg text-[10px] uppercase font-bold cursor-pointer tracking-wider text-center transition-all ${
                    photoType === "preset"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-950 border border-slate-850 text-slate-500"
                  }`}
                >
                  Gradient Presets
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoType("upload")}
                  className={`py-1.5 px-3 rounded-lg text-[10px] uppercase font-bold cursor-pointer tracking-wider text-center transition-all ${
                    photoType === "upload"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-950 border border-slate-850 text-slate-500"
                  }`}
                >
                  Upload File
                </button>
              </div>

              {/* Display panel */}
              {photoType === "preset" ? (
                <div className="space-y-4">
                  {/* Preset Preview Box */}
                  <div className="flex justify-center py-4">
                    <div className={`w-24 h-24 rounded-2xl bg-gradient-to-tr ${
                      AVATAR_PRESETS.find(p => p.raw === selectedPreset)?.color || "from-emerald-400 to-teal-500"
                    } shadow-md flex items-center justify-center border border-slate-700/50`}>
                      <span className="text-slate-950 font-black text-2xl tracking-wider uppercase">
                        {businessName ? businessName.slice(0, 2) : "CP"}
                      </span>
                    </div>
                  </div>

                  {/* Grid Selector */}
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-semibold">Select Color Preset</label>
                  <div className="grid grid-cols-3 gap-2">
                    {AVATAR_PRESETS.map((p) => (
                      <button
                        key={p.raw}
                        type="button"
                        onClick={() => setSelectedPreset(p.raw)}
                        className={`h-11 rounded-lg bg-gradient-to-tr ${p.color} cursor-pointer relative border transition-all ${
                          selectedPreset === p.raw ? "border-white ring-2 ring-emerald-500" : "border-transparent"
                        }`}
                        title={p.name}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Upload Drop Zone */}
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 text-center cursor-pointer transition-colors relative group"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    
                    {uploadedBase64 ? (
                      <div className="flex flex-col items-center gap-2">
                        <img 
                          src={uploadedBase64} 
                          alt="Uploaded avatar" 
                          className="w-20 h-20 rounded-xl object-cover border border-slate-700" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px]">Change Photo</span>
                      </div>
                    ) : (
                      <div className="py-4 flex flex-col items-center gap-1.5">
                        <UploadCloud className="w-8 h-8 text-slate-650 group-hover:text-emerald-500 transition-colors" />
                        <span className="text-xs text-slate-400 font-semibold">Drag image or click</span>
                        <span className="text-[9px] text-slate-600 font-mono">PNG, JPG, WEBP (Max 2MB)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800/60">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl hover:shadow-lg hover:shadow-emerald-950/20 cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>{loading ? "Registering Stand..." : "Deploy Active Stall"}</span>
              </button>
            </div>
          </div>
        </div>

      </form>

    </div>
  );
}
