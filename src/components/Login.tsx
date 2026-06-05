import React, { useState } from "react";
import { 
  KeyRound, 
  ShieldAlert, 
  UserCheck, 
  Smartphone, 
  Sparkles, 
  Building, 
  Store, 
  Building2, 
  UserPlus, 
  Camera, 
  UploadCloud, 
  ArrowLeft, 
  CheckCircle2, 
  ClipboardCheck 
} from "lucide-react";

interface LoginProps {
  onLoginSuccess: (user: { id: string; username: string; fullName: string; role: "admin" | "marketer" }, token: string) => void;
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

const AVATAR_PRESETS = [
  { name: "Emerald Field", color: "from-emerald-400 to-teal-500", raw: "emerald" },
  { name: "Ocean Splash", color: "from-blue-400 to-indigo-600", raw: "ocean" },
  { name: "Sunset Blaze", color: "from-amber-400 to-rose-600", raw: "sunset" },
  { name: "Purple Dream", color: "from-purple-400 to-pink-600", raw: "purple" },
  { name: "Cyber Cyber", color: "from-cyan-400 to-blue-500", raw: "cyber" },
  { name: "Solar Wind", color: "from-yellow-400 to-orange-500", raw: "solar" }
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Registration states
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [standNumber, setStandNumber] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [photoType, setPhotoType] = useState<"preset" | "upload">("preset");
  const [selectedPreset, setSelectedPreset] = useState("emerald");
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all security credentials.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || "Unable to reach security gateway.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !businessName || !phone || !standNumber) {
      setError("Please complete all required fields (*).");
      return;
    }

    setLoading(true);
    setError(null);

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
          description: description || "Camp Marketer business stand.",
          photo: finalPhoto
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to commit marketer profile registration.");
      }

      setRegSuccess(true);
      // Pre-fill login credentials for them as helper!
      setUsername(fullName);
      setPassword(phone);
    } catch (err: any) {
      setError(err.message || "Unable to register marketer profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Selected image file is too large (max 2MB).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedBase64(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Abstract Background Accents */}
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 w-96 h-96 bg-blue-920 rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 w-96 h-96 bg-emerald-920 rounded-full blur-3xl opacity-20 pointer-events-none" />

      {/* Main Container */}
      <div className={`w-full ${isRegistering && !regSuccess ? "max-w-2xl" : "max-w-md"} relative z-10 transition-all duration-300`}>
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-950/80 border border-emerald-500/20 rounded-2xl text-emerald-400 mb-2 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <Building className="w-8 h-8" id="brand-hdr-icon" style={{ strokeWidth: 1.5 }} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 font-sans uppercase">
            NYSC Camp Market <span className="text-emerald-400 block sm:inline text-lg sm:text-2.5xl font-extrabold">Katsina</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Official Exhibitor Stand & Personnel ID Registration Portal
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          
          {regSuccess ? (
            /* Success screen after registering */
            <div className="text-center py-4 space-y-5">
              <div className="inline-flex p-3 bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded-2xl">
                <ClipboardCheck className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Merchant Stand Registered</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Excellent! <strong className="text-emerald-400">{businessName}</strong> under Owner <strong className="text-emerald-400">{fullName}</strong> has been registered at Stand <strong className="text-emerald-300">{standNumber.toUpperCase()}</strong>.
              </p>
              
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-left space-y-2">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">Your Web Identity:</span>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>Username: <strong className="text-slate-200">{fullName}</strong></div>
                  <div>Password: <strong className="text-emerald-400">{phone}</strong> <span className="text-[10px] text-slate-500 font-normal">(Registered phone number)</span></div>
                </div>
              </div>

              <button
                onClick={() => {
                  setRegSuccess(false);
                  setIsRegistering(false);
                  setError(null);
                }}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Proceed to Security Gateway
              </button>
            </div>
          ) : isRegistering ? (
            /* Self registration form */
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to login</span>
                </button>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono font-bold">
                  <UserPlus className="w-4 h-4" />
                  <span>Marketer Registration</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl flex items-start gap-2 text-xs text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">
                      Business Stall Name *
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-600 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="e.g. Vance Fresh Organics"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-xs py-2.5 pl-9 pr-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">
                      Primary Owner Full Name *
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-600 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="e.g. Alice Vance"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-xs py-2.5 pl-9 pr-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">
                      Contact Phone *
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-600 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        placeholder="e.g. +1 (555) 012-3456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-xs py-2.5 pl-9 pr-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">
                      Designated Stand Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A-12, B-04"
                      value={standNumber}
                      onChange={(e) => setStandNumber(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-xs py-2.5 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 text-slate-300 text-xs py-2.5 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">
                      Stand Campaign Offerings
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Handmade garments & textiles"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-xs py-2.5 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Photo ID Setup */}
                <div className="border border-slate-800/80 bg-slate-950/40 rounded-2xl p-4">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Set Profile ID Image</span>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setPhotoType("preset")}
                      className={`text-[9px] uppercase tracking-wider px-3 py-1 rounded-md font-semibold cursor-pointer transition-colors ${photoType === "preset" ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" : "bg-slate-900 text-slate-500"}`}
                    >
                      Use Color Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoType("upload")}
                      className={`text-[9px] uppercase tracking-wider px-3 py-1 rounded-md font-semibold cursor-pointer transition-colors ${photoType === "upload" ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" : "bg-slate-900 text-slate-500"}`}
                    >
                      Upload Picture
                    </button>
                  </div>

                  {photoType === "preset" ? (
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${AVATAR_PRESETS.find(p => p.raw === selectedPreset)?.color || "from-emerald-400 to-teal-500"} flex items-center justify-center font-bold text-slate-950 text-base`}>
                        {businessName ? businessName.slice(0, 2) : "M"}
                      </div>
                      <div className="grid grid-cols-6 gap-1 flex-1">
                        {AVATAR_PRESETS.map(p => (
                          <button
                            key={p.raw}
                            type="button"
                            onClick={() => setSelectedPreset(p.raw)}
                            className={`h-6 rounded bg-gradient-to-tr ${p.color} border transition-all ${selectedPreset === p.raw ? "border-slate-100 scale-110" : "border-transparent"}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-800 hover:border-emerald-500/30 rounded-xl p-3 text-center relative cursor-pointer group transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {uploadedBase64 ? (
                        <div className="flex items-center justify-center gap-2">
                          <img src={uploadedBase64} alt="Avatar inline" className="w-10 h-10 rounded-lg object-cover" />
                          <span className="text-[10px] text-slate-400 font-semibold">Change Photo File</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 justify-center">
                          <UploadCloud className="w-5 h-5 text-slate-650 group-hover:text-emerald-400" />
                          <span className="text-[10px] text-slate-400 font-semibold">Select image (Max 2MB)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer transition-all disabled:opacity-50"
                >
                  {loading ? "Saving Merchant Details..." : "Register My Camp Stand"}
                </button>
              </form>
            </div>
          ) : (
            /* Login Form */
            <>
              <div className="flex items-center gap-2 mb-6">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-slate-200">Security Access Gateway</h2>
              </div>

              {error && (
                <div className="mb-4 p-3.5 bg-rose-950/50 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-medium mb-1.5">
                    Username / Registered Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. admin or Alice Vance"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-sm p-3.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-medium mb-1.5">
                    Password / Registered Phone
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. admin or +1 (555) 012-3456"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-sm p-3.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 text-sm font-semibold rounded-xl hover:shadow-lg focus:outline-none cursor-pointer transition-all disabled:opacity-50 mt-2"
                >
                  {loading ? "Decrypting Credentials..." : "Authenticate Access"}
                </button>
              </form>

              {/* Self Register CTA */}
              <div className="mt-4 pt-3 border-t border-slate-800/40 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setError(null);
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer transition-all uppercase tracking-wider"
                >
                  New Marketer? Register Your Stand Here
                </button>
              </div>

            </>
          )}

        </div>

        {/* Outer credit */}
        <div className="text-center mt-6 text-[10px] tracking-wider text-slate-600 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-slate-700" />
          SECURE CREDENTIAL PROTOCOL ACTIVE ON PORT 3000
        </div>
      </div>
    </div>
  );
}
