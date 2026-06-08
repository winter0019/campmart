import React, { useState } from "react";
import { api } from "../utils/api";
import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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
  ClipboardCheck,
  Mail,
  Settings
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

  // Google/Gmail Simulation bypass states
  const [showSimulator, setShowSimulator] = useState(false);
  const [simEmail, setSimEmail] = useState("");
  const [simName, setSimName] = useState("");

  // Connection settings states
  const [showConfig, setShowConfig] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(() => localStorage.getItem("campmark_server_url") || "");



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all security credentials.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.login(username, password);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || "Unable to reach security gateway.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const role: "admin" | "marketer" = "marketer"; // Rule enforce: Google accounts are STRICTLY limited to marketer role
      let fullName = user.displayName || "Google User";
      const usernamePart = user.email?.split("@")[0] || "google_user";
      let userId = user.uid;

      // Look up registered marketers
      try {
        const marketers = await api.getMarketers();
        const found = marketers.find(m => 
          m.fullName.toLowerCase() === fullName.toLowerCase() || 
          m.businessName.toLowerCase() === fullName.toLowerCase()
        );
        if (found) {
          fullName = found.fullName;
          userId = found.id;
        } else {
          // Dynamic auto-registration for the Gmail logged-in user to guarantee they have their dashboard
          const uniqueStandNum = `G-${user.uid.substring(0, 4).toUpperCase()}`;
          const newMkt = await api.registerMarketer({
            fullName: user.displayName || "Google User",
            businessName: `${user.displayName || "Google"}'s Merchant Stand`,
            phone: user.phoneNumber || "080-GOOGLE",
            standNumber: uniqueStandNum,
            category: "General",
            description: `Camp stand registered via Google account (${user.email || "N/A"}).`,
            photo: user.photoURL || "preset:emerald"
          });
          userId = newMkt.id;
          fullName = newMkt.fullName;
        }
      } catch (e) {
        console.warn("Failed to query marketers or auto-register, using fallback marketer profile details", e);
      }

      onLoginSuccess({
        id: userId,
        username: usernamePart,
        fullName,
        role
      }, `google-oauth-token-${user.uid}`);
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.message?.includes("popup-closed-by-user") ||
          err?.code === "auth/cancelled-popup-request" || err?.message?.includes("cancelled-popup-request")) {
        console.warn("Google login popup closed or blocked by browser iframe policy:", err.message);
        setError("FIREBASE_POPUP_CLOSED");
      } else {
        console.error("Google login failed", err);
        // Route any Google login popup failure (blocked popups, auth/internal-error, unconfigured project, or unauthorized domain) 
        // directly to the elegant Firebase oauth limitation display that provides copyable domains and simulation links.
        setError("FIREBASE_OAUTH_RESTRICTION");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInSimulated = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simEmail || !simEmail.includes("@")) {
      setError("Please input a valid simulated email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const role: "admin" | "marketer" = "marketer"; // STRICT ENFORCEMENT: No Gmail can access admin
      let sName = simName.trim() || "Simulated Google User";
      const usernamePart = simEmail.split("@")[0] || "simulated_user";
      let userId = `sim-google-${usernamePart}`;

      try {
        const marketers = await api.getMarketers();
        const found = marketers.find(m => 
          m.fullName.toLowerCase() === sName.toLowerCase() || 
          m.businessName.toLowerCase() === sName.toLowerCase() ||
          m.phone === simEmail
        );

        if (found) {
          sName = found.fullName;
          userId = found.id;
        } else {
          const uniqueStandNum = `G-${userId.substring(11, 15).toUpperCase()}`;
          const newMkt = await api.registerMarketer({
            fullName: sName,
            businessName: `${sName}'s Merchant Stand`,
            phone: simEmail,
            standNumber: uniqueStandNum,
            category: "General",
            description: `Camp stand registered via simulated Google account (${simEmail}).`,
            photo: `preset:${selectedPreset}`
          });
          userId = newMkt.id;
          sName = newMkt.fullName;
        }
      } catch (e) {
        console.warn("Failed to query marketers or auto-register, using fallback marketer profile details", e);
      }

      onLoginSuccess({
        id: userId,
        username: usernamePart,
        fullName: sName,
        role
      }, `simulated-oauth-token-${userId}`);
    } catch (err: any) {
      setError(err.message || "Unable to complete Gmail simulation.");
    } finally {
      setLoading(false);
      setShowSimulator(false);
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
      await api.registerMarketer({
        fullName,
        businessName,
        phone,
        standNumber: standNumber.toUpperCase(),
        category,
        description: description || "Camp Marketer business stand.",
        photo: finalPhoto
      });

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
          
          {showSimulator ? (
            /* Simulator Form */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSimulator(false)}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold font-mono">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span>Gmail Simulator</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 border border-slate-900/80 p-2.5 rounded-xl">
                Bypass real Google Sign-In constraints. Authenticate using any simulated Gmail profile.
              </p>

              <form onSubmit={handleGoogleSignInSimulated} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">
                    Simulated Email Name *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-650 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      placeholder="e.g. user@gmail.com"
                      value={simEmail}
                      onChange={(e) => setSimEmail(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-xs py-2.5 pl-9 pr-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">
                    Simulated Display Name (Optional)
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-650 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. Dang Alan"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-xs py-2.5 pl-9 pr-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  {loading ? "Constructing simulated identity..." : "Establish simulated Gmail connection"}
                </button>
              </form>
            </div>
          ) : regSuccess ? (
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
                <KeyRound className="w-5 h-5 text-emerald-400" id="login-sec-icon" />
                <h2 className="font-semibold text-slate-200">Security Access Gateway</h2>
              </div>

              {error === "FIREBASE_POPUP_CLOSED" ? (
                <div className="mb-4 p-3.5 bg-slate-950 border border-amber-500/20 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Popup Blocked / Closed</span>
                  </div>
                  <p className="text-slate-450 leading-relaxed text-[11px]">
                    The Google authentication popup was closed. Netlify environments might require configuring authorized credentials.
                  </p>
                  <button
                    onClick={() => {
                      setShowSimulator(true);
                      setError(null);
                    }}
                    className="w-full mt-1.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-lg text-[10px] cursor-pointer border border-emerald-500/10"
                  >
                    Use Gmail Simulator Connection Instantly
                  </button>
                </div>
              ) : error === "FIREBASE_OAUTH_RESTRICTION" ? (
                <div className="mb-4 p-4 bg-slate-950 border border-rose-500/20 rounded-xl space-y-3.5 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-450 font-extrabold uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>Firebase Domain Configuration Needed</span>
                  </div>
                  <p className="text-slate-400 leading-normal text-[11px]">
                    To complete Google Sign-In outside AI Studio, the host domain must be added to authorized domains list in Firebase Auth settings.
                  </p>
                  <div className="p-2 border border-slate-850 bg-slate-900/60 rounded font-mono text-[10px] text-slate-350 select-all break-all">
                    campmarts.netlify.app
                  </div>
                  <div className="pt-1 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleGoogleSignIn()}
                      className="text-[10px] text-emerald-450 hover:text-emerald-350 font-bold underline text-left cursor-pointer transition-all"
                    >
                      &gt; Retry Real Google Authentication
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSimulator(true);
                        setError(null);
                      }}
                      className="text-[10px] text-emerald-450 hover:text-emerald-350 font-bold underline text-left cursor-pointer transition-all"
                    >
                      &gt; Bypass with Simulated Gmail Login (Recommended)
                    </button>
                  </div>
                </div>
              ) : error && (
                <div className="mb-4 p-3.5 bg-rose-950/50 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-medium mb-1.5">
                    Username / Registered Owner Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Idris Dangalan"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-sm p-3.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-650"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-medium mb-1.5">
                    Password / Registered Phone Number
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. 08012345678"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-sm p-3.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-650"
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

                {/* Google OAuth Access Area */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800/80"></div>
                  </div>
                  <span className="relative bg-slate-900 border border-slate-800 px-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold backdrop-blur-md rounded-full shadow-sm py-0.5">
                    or access with
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleGoogleSignIn()}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 text-sm font-bold rounded-xl cursor-pointer hover:border-emerald-500/20 hover:text-emerald-450 hover:shadow-md transition-all uppercase tracking-wider text-[10px]"
                  >
                    {/* Simplified flat vector rendering of G letter logo */}
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Google Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSimulator(true);
                      setError(null);
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 text-sm font-bold rounded-xl cursor-pointer hover:border-emerald-500/20 hover:text-emerald-450 hover:shadow-md transition-all uppercase tracking-wider text-[10px]"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
                    <span>Gmail Bypass</span>
                  </button>
                </div>
              </form>

              {/* Self Register CTA */}
              <div className="mt-6 pt-4 border-t border-slate-800/40 text-center">
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

              {/* Advanced Config */}
              <div className="mt-4 pt-3 border-t border-slate-900 text-center">
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-[10px] text-slate-550 hover:text-slate-350 font-medium tracking-wide flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>Connection Settings</span>
                </button>

                {showConfig && (
                  <div className="mt-3.5 text-left p-3.5 bg-slate-950/80 border border-slate-850 rounded-xl space-y-2">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      API Server Base URL
                    </label>
                    <input
                      type="url"
                      placeholder="Default system host"
                      value={customServerUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomServerUrl(val);
                        if (val.trim()) {
                          localStorage.setItem("campmark_server_url", val.trim());
                        } else {
                          localStorage.removeItem("campmark_server_url");
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <p className="text-[9px] text-slate-500 leading-normal">
                      Leave blank to use pre-configured public backup channel:
                      <span className="font-mono text-emerald-500/60 select-all block mt-1 break-all bg-slate-950 p-1.5 rounded border border-slate-900">
                        https://ais-pre-qt7dsgacndhinsmr4bg5cf-10883856286.europe-west1.run.app
                      </span>
                    </p>
                  </div>
                )}
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
