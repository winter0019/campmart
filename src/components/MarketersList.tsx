import React, { useState } from "react";
import { api, getProxyImageUrl } from "../utils/api";
import { 
  Building2, 
  Search, 
  Trash2, 
  Plus, 
  UserPlus, 
  Calendar,
  Layers,
  MapPin,
  Contact2,
  X,
  BadgeAlert,
  ShieldCheck,
  UserCheck,
  Smile,
  Eye,
  Trash,
  Phone,
  UserX,
  Camera,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  Info,
  Printer,
  Download,
  Database,
  Upload
} from "lucide-react";
import { motion } from "motion/react";
import { downloadIDCard } from "../utils/cardUtils";
import { Marketer, Worker } from "../types";
import { getAmountDue, formatNaira, downloadReceiptImage } from "../utils/pricing";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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

// Color mapping to enhance these specific trades with corresponding distinct themes
function obtenerTradeTheme(category: string) {
  const normalized = (category || "").toLowerCase();
  
  // 1. Food & Refreshments (Emerald/Teal)
  if (
    normalized.includes("restaurant") || 
    normalized.includes("food") || 
    normalized.includes("akara") || 
    normalized.includes("barbique") || 
    normalized.includes("kunu") || 
    normalized.includes("meat") || 
    normalized.includes("fruit") || 
    normalized.includes("drinks") || 
    normalized.includes("snacks") || 
    normalized.includes("milk") || 
    normalized.includes("sweet") || 
    normalized.includes("vendor")
  ) {
    return {
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      accentLine: "from-emerald-500 to-teal-500",
      primaryColor: "emerald"
    };
  }

  // 2. Apparel, Tailoring & Grooming (Pink/Rose/Amber)
  if (
    normalized.includes("tailor") || 
    normalized.includes("clothing") || 
    normalized.includes("cap") || 
    normalized.includes("customizing") || 
    normalized.includes("saloon") || 
    normalized.includes("barbing") || 
    normalized.includes("hanna") || 
    normalized.includes("dress") || 
    normalized.includes("jewellery")
  ) {
    return {
      badgeClass: "bg-pink-500/10 text-pink-400 border-pink-500/20",
      accentLine: "from-pink-500 to-rose-500",
      primaryColor: "pink"
    };
  }

  // 3. Tech Utilities & General Services (Blue/Cyan)
  if (
    normalized.includes("photocopy") || 
    normalized.includes("pos") || 
    normalized.includes("photographer") || 
    normalized.includes("laundry") || 
    normalized.includes("coverage") || 
    normalized.includes("charging") || 
    normalized.includes("charger") || 
    normalized.includes("water") || 
    normalized.includes("renting")
  ) {
    return {
      badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      accentLine: "from-blue-500 to-cyan-500",
      primaryColor: "blue"
    };
  }

  // 4. Cooperatives, Pharmacy & Healthcare (Indigo/Purple)
  if (
    normalized.includes("pharmacy") || 
    normalized.includes("herbs") || 
    normalized.includes("cooperative") || 
    normalized.includes("welfare")
  ) {
    return {
      badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      accentLine: "from-indigo-500 to-purple-500",
      primaryColor: "indigo"
    };
  }

  // 5. Hard Goods & Shopping (Amber/Orange)
  return {
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    accentLine: "from-amber-400 to-orange-500",
    primaryColor: "amber"
  };
}

function getCategoryBadgeStyle(category: string): string {
  return obtenerTradeTheme(category).badgeClass;
}

// Gradient representation parser
function getPresetGradient(photoStr?: string) {
  if (!photoStr) return "from-slate-650 to-slate-800";
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

interface MarketersListProps {
  marketers: Marketer[];
  onRefresh: () => Promise<void>;
  userRole?: "admin" | "marketer";
  loggedInUserId?: string;
}

export default function MarketersList({ marketers, onRefresh, userRole = "admin", loggedInUserId }: MarketersListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Selected Marketer details view state (used primarily by Admin)
  const [selectedMarketer, setSelectedMarketer] = useState<Marketer | null>(null);

  // Payment update states
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>("");
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [printReceiptTarget, setPrintReceiptTarget] = useState<Marketer | null>(null);
  const [printSlipTarget, setPrintSlipTarget] = useState<Marketer | null>(null);

  // Database Backup / Sync States
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncDirection, setSyncDirection] = useState<"export" | "import" | "gateway">("export");
  const [syncString, setSyncString] = useState("");
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [customServerUrl, setCustomServerUrl] = useState(() => localStorage.getItem("campmark_server_url") || "");

  // Helper trigger to open marketer details with loaded payment context
  const selectMarketerWithPaymentInit = (marketer: Marketer | null) => {
    setSelectedMarketer(marketer);
    if (marketer) {
      setPaymentAmountInput(marketer.amountPaid !== undefined ? marketer.amountPaid.toString() : "0");
      setPaymentError(null);
      setPaymentSuccess(false);
    }
  };

  const handleUpdatePayment = async (marketerId: string) => {
    const parsedAmount = parseInt(paymentAmountInput, 10);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setPaymentError("Please provide a valid non-negative payment amount.");
      return;
    }

    setUpdatingPayment(true);
    setPaymentError(null);
    setPaymentSuccess(false);

    try {
      await api.updatePayment(marketerId, parsedAmount);

      setPaymentSuccess(true);
      if (selectedMarketer) {
        setSelectedMarketer({
          ...selectedMarketer,
          amountPaid: parsedAmount
        });
      }
      await onRefresh();
    } catch (err: any) {
      setPaymentError(err.message || "Could not connect to payment server.");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleExportDataByJson = () => {
    try {
      const raw = localStorage.getItem("campmark_fallback_db");
      if (raw) {
        setSyncString(raw);
        setSyncMessage({ type: "success", text: "Successfully read Local Storage fallback data from this browser!" });
      } else {
        // If there is no local storage but we have state data, make a JSON from state
        const obj = { marketers: marketers, activities: [] };
        setSyncString(JSON.stringify(obj, null, 2));
        setSyncMessage({ type: "success", text: "Formatted current live directory list into sync code." });
      }
    } catch (e) {
      setSyncMessage({ type: "error", text: "Could not read localStorage fallback database on this phone." });
    }
  };

  const handleImportDataByJson = async () => {
    if (!syncString.trim()) {
      setSyncMessage({ type: "error", text: "Please paste a valid JSON sync code." });
      return;
    }
    
    try {
      const parsed = JSON.parse(syncString);
      if (!parsed || (!Array.isArray(parsed.marketers) && !Array.isArray(parsed))) {
        throw new Error("Invalid structure. Sync code must be a valid JSON package.");
      }

      const listToImport = Array.isArray(parsed) ? parsed : parsed.marketers;
      
      let successCount = 0;
      let errorCount = 0;

      for (const m of listToImport) {
        if (!m.fullName || !m.businessName || !m.phone || !m.standNumber) {
          continue; // skip invalid objects
        }
        try {
          await api.registerMarketer({
            fullName: m.fullName,
            businessName: m.businessName,
            phone: m.phone,
            standNumber: m.standNumber,
            category: m.category || "General",
            description: m.description,
            photo: m.photo
          });
          successCount++;
        } catch (e: any) {
          errorCount++;
        }
      }

      setSyncMessage({
        type: "success",
        text: `Batch Synced! Successfully imported ${successCount} stands. ${errorCount} records were already present or skipped.`
      });
      await onRefresh();
    } catch (e: any) {
      setSyncMessage({ type: "error", text: `Verification of code failed: ${e.message}` });
    }
  };

  const handlePrintReceipt = (marketer: Marketer) => {
    setPrintReceiptTarget(marketer);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintSlip = (marketer: Marketer) => {
    setPrintSlipTarget(marketer);
  };

  const [downloadingSlip, setDownloadingSlip] = useState(false);
  const [sharingSlip, setSharingSlip] = useState(false);

  const handleDownloadSlipPNG = () => {
    const element = document.getElementById("confirmation-slip-preview");
    if (!element) return;
    setDownloadingSlip(true);
    html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false
    }).then((canvas) => {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `NYSC_Confirmation_Slip_${printSlipTarget?.businessName.replace(/\s+/g, "_") || "Stall"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadingSlip(false);
      setSyncMessage({ type: "success", text: "Confirmation Slip downloaded successfully as PNG Image!" });
    }).catch((err: any) => {
      console.error("html2canvas render error:", err);
      setDownloadingSlip(false);
      setSyncMessage({ type: "error", text: "Failed to render PNG image." });
    });
  };

  const handleDownloadSlipPDF = () => {
    const element = document.getElementById("confirmation-slip-preview");
    if (!element) return;
    setDownloadingSlip(true);
    html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false
    }).then((canvas) => {
      const doc = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 size width in mm
      const pageHeight = 295; // A4 size height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      doc.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      
      doc.save(`NYSC_Confirmation_Slip_${printSlipTarget?.businessName.replace(/\s+/g, "_") || "Stall"}.pdf`);
      setDownloadingSlip(false);
      setSyncMessage({ type: "success", text: "Confirmation Slip downloaded successfully as PDF!" });
    }).catch((err: any) => {
      console.error("html2canvas or jspdf render error:", err);
      setDownloadingSlip(false);
      setSyncMessage({ type: "error", text: "Failed to render PDF: " + err.message });
    });
  };

  const handleShareSlip = () => {
    const element = document.getElementById("confirmation-slip-preview");
    if (!element) return;
    setSharingSlip(true);
    html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false
    }).then((canvas) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          setSharingSlip(false);
          setSyncMessage({ type: "error", text: "Could not process document image." });
          return;
        }

        const fileName = `NYSC_Confirmation_Slip_${printSlipTarget?.businessName.replace(/\s+/g, "_") || "Stall"}.png`;
        const file = new File([blob], fileName, { type: "image/png" });
        
        const copyShareText = () => {
          const shareText = `NYSC KATSINA CAMP MARKET CONFIRMATION:\nOperator Name: ${printSlipTarget?.fullName}\nBusiness: ${printSlipTarget?.businessName}\nStand assigned: Stand ${printSlipTarget?.standNumber}\nVerification code: CM-${printSlipTarget?.id.substring(4).toUpperCase()}`;
          navigator.clipboard.writeText(shareText).then(() => {
            setSyncMessage({ type: "success", text: "Web Share not supported in this browser. Details copied to clipboard!" });
          }).catch(() => {
            setSyncMessage({ type: "error", text: "Could not share or copy details. Please take a snapshot of your screen." });
          });
        };

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: "NYSC Confirmation Slip",
            text: `Official registration confirmation slip for NYSC Katsina Camp Market exhibitor: ${printSlipTarget?.fullName} (${printSlipTarget?.businessName}).`
          }).then(() => {
            setSharingSlip(false);
            setSyncMessage({ type: "success", text: "Confirmation slip shared successfully!" });
          }).catch((err: any) => {
            console.error("navigator.share failed, failing back to clipboard:", err);
            setSharingSlip(false);
            copyShareText();
          });
        } else {
          setSharingSlip(false);
          copyShareText();
        }
      }, "image/png");
    }).catch((err: any) => {
      console.error("html2canvas render error:", err);
      setSharingSlip(false);
      setSyncMessage({ type: "error", text: "Could not generate screenshot for sharing." });
    });
  };
  
  // State to hold temporary data for window printing
  const [printTarget, setPrintTarget] = useState<{
    id: string;
    name: string;
    role: string;
    business: string;
    stand: string;
    photo?: string;
    createdAt?: string;
  } | null>(null);

  const handlePrintAction = (entity: any, isMarketer: boolean) => {
    const mapped = {
      id: entity.id,
      name: isMarketer ? entity.fullName : entity.fullName,
      role: isMarketer ? "Primary Registrant" : (entity.role || "Staff Agent"),
      business: isMarketer ? entity.businessName : (selectedMarketer?.businessName || "Camp Market Vendor"),
      stand: isMarketer ? entity.standNumber : (selectedMarketer?.standNumber || "00-A"),
      photo: entity.photo || (isMarketer ? undefined : selectedMarketer?.photo),
      createdAt: entity.createdAt
    };
    setPrintTarget(mapped);
    // Micro-delay to let the browser process DOM mount, then open print dialog
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadBothSides = (entity: any, isMarketer: boolean) => {
    const mapped = {
      id: entity.id,
      fullName: isMarketer ? entity.fullName : entity.fullName,
      role: isMarketer ? "Primary Registrant" : (entity.role || "Staff Agent"),
      businessName: isMarketer ? entity.businessName : (selectedMarketer?.businessName || "Camp Market Vendor"),
      standNumber: isMarketer ? entity.standNumber : (selectedMarketer?.standNumber || "00-A"),
      photo: entity.photo || (isMarketer ? undefined : selectedMarketer?.photo),
      createdAt: entity.createdAt
    };
    
    // Download front
    downloadIDCard(mapped, "front");
    // Micro-delay download back
    setTimeout(() => {
      downloadIDCard(mapped, "back");
    }, 300);
  };
  
  // Worker registration form states (inside detail view / dashboard)
  const [workerName, setWorkerName] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [workerRole, setWorkerRole] = useState("Sales Promoter");
  const [submittingWorker, setSubmittingWorker] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Worker custom photo states
  const [workerPhotoType, setWorkerPhotoType] = useState<"preset" | "upload" | "none">("preset");
  const [workerPreset, setWorkerPreset] = useState("emerald");
  const [workerUploadedBase64, setWorkerUploadedBase64] = useState<string | null>(null);

  // Marketers remove safety confirmation state
  const [deletingMarketer, setDeletingMarketer] = useState<string | null>(null);

  // Marketer uploading their own profile photo
  const [uploadingSelfPhoto, setUploadingSelfPhoto] = useState(false);
  const [selfPhotoError, setSelfPhotoError] = useState<string | null>(null);
  const [selfPhotoSuccess, setSelfPhotoSuccess] = useState(false);

  // Specific staff direct profile upload state
  const [uploadingWorkerPhotoId, setUploadingWorkerPhotoId] = useState<string | null>(null);

  const categories = ["All", ...CATEGORIES];

  const handleWorkerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setWorkerError("Selected staff photo file is too large (max 2MB).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setWorkerUploadedBase64(reader.result as string);
      setWorkerError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteMarketer = async (id: string) => {
    try {
      await api.deleteMarketer(id);
      setSelectedMarketer(null);
      setDeletingMarketer(null);
      await onRefresh();
    } catch (err) {
      console.error("Deregistration error:", err);
    }
  };

  // Onboard new worker
  const handleAddWorker = async (targetId: string) => {
    if (!workerName || !workerPhone || !workerRole) {
      setWorkerError("Please supply worker name, cell and designated role.");
      return;
    }

    setSubmittingWorker(true);
    setWorkerError(null);

    const finalWorkerPhoto = workerPhotoType === "upload" && workerUploadedBase64
      ? workerUploadedBase64
      : `preset:${workerPreset}`;

    try {
      const data = await api.addWorker(targetId, {
        fullName: workerName,
        phone: workerPhone,
        role: workerRole,
        photo: finalWorkerPhoto
      });

      // If viewing in active admin modal, sync modal's active state
      if (selectedMarketer && selectedMarketer.id === targetId) {
        setSelectedMarketer({
          ...selectedMarketer,
          workers: [...selectedMarketer.workers, data]
        });
      }

      setWorkerName("");
      setWorkerPhone("");
      setWorkerRole("Sales Promoter");
      setWorkerUploadedBase64(null);
      setWorkerPhotoType("preset");
      
      await onRefresh();
    } catch (err: any) {
      setWorkerError(err.message || "Failed worker insert.");
    } finally {
      setSubmittingWorker(false);
    }
  };

  const handleDeleteWorker = async (workerId: string, currentMarketerObj?: Marketer) => {
    try {
      await api.deleteWorker(workerId);
      if (selectedMarketer) {
        setSelectedMarketer({
          ...selectedMarketer,
          workers: selectedMarketer.workers.filter(w => w.id !== workerId)
        });
      }
      await onRefresh();
    } catch (err) {
      console.error("Worker removal error:", err);
    }
  };

  // Custom photo upload for marketer
  const handleMarketerPhotoUpload = async (file: File, marketerId: string) => {
    if (file.size > 2 * 1024 * 1024) {
      setSelfPhotoError("Image file is too large (max 2MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setUploadingSelfPhoto(true);
      setSelfPhotoError(null);
      setSelfPhotoSuccess(false);

      try {
        await api.updatePhoto(marketerId, base64);
        await onRefresh();
        setSelfPhotoSuccess(true);
        setTimeout(() => setSelfPhotoSuccess(false), 3000);
      } catch (err: any) {
        setSelfPhotoError(err.message || "Error saving image.");
      } finally {
        setUploadingSelfPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Custom photo upload directly for a specific worker
  const handleWorkerPhotoUpload = async (file: File, workerId: string) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large (max 2MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setUploadingWorkerPhotoId(workerId);

      try {
        await api.updatePhoto(workerId, base64);
        if (selectedMarketer) {
          // Update the localized modal state too
          const updatedWorkers = selectedMarketer.workers.map(w => {
            if (w.id === workerId) {
              return { ...w, photo: base64 };
            }
            return w;
          });
          setSelectedMarketer({ ...selectedMarketer, workers: updatedWorkers });
        }
        await onRefresh();
      } catch (err: any) {
        console.error("Worker photo error:", err);
      } finally {
        setUploadingWorkerPhotoId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Reusable confirmation slip preview and print layouts
  const renderConfirmationSlipModals = () => {
    if (!printSlipTarget) return null;
    return (
      <React.Fragment>
        {/* On-screen Preview and Print Action Modal */}
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-450" />
                <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">Registration Slip Preview</h3>
              </div>
              <button
                onClick={() => setPrintSlipTarget(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Preview Body */}
            <div className="p-6 flex-1 overflow-auto bg-slate-950/40 flex items-start justify-center custom-scrollbar">
              <div 
                id="confirmation-slip-preview"
                className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-300 font-sans shadow-lg leading-relaxed mx-auto text-left w-[640px] shrink-0"
              >
                {/* Top Bar Branding */}
                <div className="flex items-center justify-between border-b-2 border-slate-300 pb-5 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-305 flex items-center justify-center font-bold font-sans text-lg shrink-0">
                      NYSC
                    </div>
                    <div>
                      <h2 className="text-sm font-black tracking-tight uppercase leading-none text-slate-900">CAMP MARKET REGISTRATION</h2>
                      <p className="text-[9px] text-slate-500 font-mono tracking-wide mt-1 uppercase">Katsina State Division • Official Exhibitor Bureau</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="inline-flex py-0.5 px-2 bg-slate-100 border border-slate-200 rounded-lg text-[8.5px] font-mono font-bold tracking-wider text-slate-655 uppercase">
                      CONFIRMATION SLIP
                    </span>
                    <p className="text-[8.5px] text-slate-500 font-mono mt-0.5">REF: CM-{printSlipTarget.id.substring(4).toUpperCase()}</p>
                  </div>
                </div>

                {/* Main Details Panel */}
                <div className="grid grid-cols-3 gap-6 mb-5">
                  {/* Left Column - Marketer Profile Photo */}
                  <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    {getPresetGradient(printSlipTarget.photo) ? (
                      <div className={`w-24 h-24 rounded-xl bg-gradient-to-tr ${getPresetGradient(printSlipTarget.photo) || "from-teal-400 to-emerald-500"} shadow-sm flex items-center justify-center font-bold text-slate-955 text-3xl uppercase border border-slate-300`}>
                        {printSlipTarget.businessName.slice(0, 2)}
                      </div>
                    ) : (
                      <img 
                        src={getProxyImageUrl(printSlipTarget.photo)} 
                        alt={printSlipTarget.fullName} 
                        className="w-24 h-24 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="mt-2.5">
                      <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider truncate max-w-[130px]">{printSlipTarget.fullName}</h3>
                      <p className="text-[8px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">Primary Registrant</p>
                    </div>
                  </div>

                  {/* Right Columns - Info Fields */}
                  <div className="col-span-2 space-y-2.5 text-xs text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-555 font-semibold font-sans text-[9px] uppercase tracking-wider">Business/Brand:</span>
                      <span className="font-extrabold text-slate-900 uppercase">{printSlipTarget.businessName}</span>
                    </div>
                    
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-555 font-semibold font-sans text-[9px] uppercase tracking-wider">Stand Code:</span>
                      <span className="font-mono text-emerald-700 font-black text-[11px]">STAND {printSlipTarget.standNumber}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-555 font-semibold font-sans text-[9px] uppercase tracking-wider">Category Segment:</span>
                      <span className="font-bold text-slate-800">{printSlipTarget.category}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-555 font-semibold font-sans text-[9px] uppercase tracking-wider">Cell Number:</span>
                      <span className="font-mono text-slate-800 font-semibold">{printSlipTarget.phone}</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-555 font-semibold font-sans text-[9px] uppercase tracking-wider">Audit Match:</span>
                      <span className={`font-mono text-[9px] font-bold ${printSlipTarget.verificationStatus === "verified" ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {printSlipTarget.verificationStatus === "verified" ? "★ APPROVED & SEALED" : "★ PENDING AUDIT"}
                      </span>
                    </div>
                  </div>
                </div></div>

                {/* Description */}
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 mb-5 text-[11px] text-slate-600 font-sans italic">
                  "Description: {printSlipTarget.description}"
                </div>

                {/* Ledger */}
                <div className="bg-emerald-50/20 border border-emerald-200 rounded-xl p-3 mb-5 text-slate-800 text-xs">
                  <h3 className="text-[9px] font-black uppercase tracking-wider text-emerald-800 pb-1.5 border-b border-emerald-150 mb-2">FINANCIAL OVERVIEW</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white border border-emerald-105 p-2 rounded-lg">
                      <span className="block text-[7.5px] font-mono text-slate-500 uppercase">Trade Base Due</span>
                      <strong className="block text-slate-800 font-bold font-mono mt-0.5 text-[10px]">{formatNaira(getAmountDue(printSlipTarget.category))}</strong>
                    </div>
                    <div className="bg-white border border-emerald-105 p-2 rounded-lg">
                      <span className="block text-[7.5px] font-mono text-slate-500 uppercase">Paid to Date</span>
                      <strong className="block text-emerald-700 font-black font-mono mt-0.5 text-[10px]">{formatNaira(printSlipTarget.amountPaid || 0)}</strong>
                    </div>
                    <div className="bg-white border border-emerald-105 p-2 rounded-lg">
                      <span className="block text-[7.5px] font-mono text-slate-500 uppercase">Balance</span>
                      <strong className={`block font-black font-mono mt-0.5 text-[10px] ${getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0) <= 0 ? 'text-emerald-750' : 'text-rose-700'}`}>
                        {getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0) <= 0 
                          ? "Cleared" 
                          : formatNaira(getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0))}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Personnel Group */}
                <div className="border-t border-slate-200 pt-4 mb-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800 font-sans">REGISTERED STAFF & WORKERS</h3>
                    <span className="text-[8.5px] font-mono text-slate-500 font-bold bg-slate-100 border border-slate-205 px-2.5 py-0.5 rounded-lg shrink-0">
                      {printSlipTarget.workers.length} Personnel
                    </span>
                  </div>

                  {printSlipTarget.workers.length === 0 ? (
                    <div className="py-4 text-center border border-dashed border-slate-205 rounded-xl text-slate-400 text-xs italic">
                      No personnel or field representatives onboarded for this stand yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {printSlipTarget.workers.map((w) => (
                        <div key={w.id} className="p-2.5 border border-slate-150 bg-slate-50 rounded-xl flex items-center gap-2.5 text-xs font-sans">
                          {w.photo && !w.photo.startsWith("preset:") ? (
                            <img 
                              src={getProxyImageUrl(w.photo)} 
                              alt={w.fullName} 
                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200 shadow-xs" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-tr ${getPresetGradient(w.photo || "preset:emerald")} shadow-xs flex items-center justify-center text-[10px] font-bold text-slate-955 shrink-0 border border-slate-200`}>
                              {w.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-slate-900 truncate text-[10.5px] leading-none">{w.fullName}</h4>
                            <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">Role: <strong className="text-slate-805">{w.role}</strong></p>
                            <p className="text-[8.5px] text-slate-500 leading-tight font-mono truncate">{w.phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Signatures */}
                <div className="mt-6 border-t border-slate-200 pt-4 flex justify-between items-end text-[9px] text-slate-500">
                  <div className="text-center w-28">
                    <div className="w-10 h-10 rounded-full border border-dashed border-emerald-600 text-emerald-600 flex flex-col items-center justify-center font-serif text-[6px] font-bold -rotate-12 mx-auto mb-1 select-none pointer-events-none uppercase">
                      <span>OFFICIAL</span>
                      <span>CONFIRMED</span>
                    </div>
                    <div className="border-t border-slate-300 pt-0.5 text-slate-400 font-sans uppercase font-bold text-[7.5px]">STAFF EXAMINER</div>
                  </div>

                  <div className="text-center w-28 text-right">
                    <span className="block font-serif italic text-slate-444 select-none pb-2 pointer-events-none">NYSC Katsina</span>
                    <div className="border-t border-slate-300 pt-0.5 text-slate-400 font-sans uppercase font-bold text-[7.5px] text-right">STAMP COMMISSIONER</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row gap-2 sticky bottom-0 z-10 backdrop-blur-md">
              <button
                onClick={handleDownloadSlipPDF}
                disabled={downloadingSlip}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 text-xs font-extrabold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/10"
              >
                <Download className="w-4 h-4" />
                <span>{downloadingSlip ? "Generating..." : "Download PDF"}</span>
              </button>
              
              <button
                onClick={handleShareSlip}
                disabled={sharingSlip}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-extrabold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>{sharingSlip ? "Sharing..." : "Share Slip"}</span>
              </button>

              <button
                onClick={handleDownloadSlipPNG}
                disabled={downloadingSlip}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 border border-slate-705 text-slate-300 disabled:text-slate-500 text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-450" />
                <span>Download PNG</span>
              </button>

              <button
                onClick={() => window.print()}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-705 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print</span>
              </button>

              <button
                onClick={() => setPrintSlipTarget(null)}
                className="py-3 px-4 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-205 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Official Registration Confirmation Slip Print Layout */}
        <div className="print-slip-only animate-fade-in text-slate-900">
          <div className="w-[720px] bg-white text-slate-900 p-8 rounded-3xl border-2 border-slate-300 font-sans relative shadow-2xl mx-auto my-6 leading-relaxed">
            
            {/* Top Bar Branding */}
            <div className="flex items-center justify-between border-b-2 border-slate-400 pb-5 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-105 text-emerald-800 rounded-2xl border border-emerald-300 flex items-center justify-center font-bold font-sans text-xl shrink-0">
                  NYSC
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight uppercase leading-none text-slate-900">CAMP MARKET REGISTRATION</h2>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wide mt-1 uppercase select-none">Katsina State Division • Official Exhibitor Bureau</p>
                </div>
              </div>
              
              <div className="text-right">
                <span className="inline-flex py-1 px-2.5 bg-slate-100 border border-slate-300 rounded-xl text-[9px] font-mono font-bold tracking-wider text-slate-650 uppercase">
                  CONFIRMATION SLIP
                </span>
                <p className="text-[9px] text-slate-500 font-mono mt-1">REF: CM-{printSlipTarget.id.substring(4).toUpperCase()}</p>
              </div>
            </div>

            {/* Main Details Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              
              {/* Left Column - Marketer Profile Photo */}
              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                {getPresetGradient(printSlipTarget.photo) ? (
                  <div className={`w-32 h-32 rounded-2xl bg-gradient-to-tr ${getPresetGradient(printSlipTarget.photo) || "from-teal-400 to-emerald-500"} shadow-md flex items-center justify-center font-bold text-slate-955 text-4xl uppercase select-none border border-slate-300`}>
                    {printSlipTarget.businessName.slice(0, 2)}
                  </div>
                ) : (
                  <img 
                    src={getProxyImageUrl(printSlipTarget.photo)} 
                    alt={printSlipTarget.fullName} 
                    className="w-32 h-32 rounded-2xl object-cover shrink-0 border border-slate-300 shadow-sm animate-fade-in" 
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="mt-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{printSlipTarget.fullName}</h3>
                  <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mt-0.5 select-none text-slate-400">Primary Registrant</p>
                </div>
              </div>

              {/* Right Columns - Info Fields */}
              <div className="md:col-span-2 space-y-3.5 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Registered Business/Brand:</span>
                  <span className="font-extrabold text-slate-900 uppercase">{printSlipTarget.businessName}</span>
                </div>
                
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Designated Stand Assignment:</span>
                  <span className="font-mono text-emerald-700 font-black text-[13px]">STAND {printSlipTarget.standNumber}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Industry Sector:</span>
                  <span className="font-bold text-slate-800">{printSlipTarget.category}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Owner Direct Contact:</span>
                  <span className="font-mono text-slate-800 font-semibold">{printSlipTarget.phone}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Registration Timestamp:</span>
                  <span className="font-mono text-slate-800">{new Date(printSlipTarget.createdAt).toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-slate-505 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Account Audit Status:</span>
                  <span className={`font-mono text-[10.5px] font-bold ${printSlipTarget.verificationStatus === "verified" ? 'text-emerald-600' : 'text-amber-600'}`}>
                    ★ {printSlipTarget.verificationStatus === "verified" ? "APPROVED & SEALED" : "PENDING AUDIT EXAMINATION"}
                  </span>
                </div>
              </div>

            </div>

            {/* Description quote */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-xs text-slate-600 font-sans italic">
              "Description: {printSlipTarget.description}"
            </div>

            {/* Financial Status Summary */}
            <div className="bg-emerald-50/45 border border-emerald-200 rounded-2xl p-4.5 mb-6 text-xs">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-emerald-800 pb-2 border-b border-emerald-250 mb-3 select-none">FINANCIAL LEDGER STATS</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white border border-emerald-150 p-2.5 rounded-xl shadow-sm">
                  <span className="block text-[8.5px] font-mono text-slate-500 uppercase">Trade Base Due</span>
                  <strong className="block text-slate-800 font-bold font-mono mt-1">{formatNaira(getAmountDue(printSlipTarget.category))}</strong>
                </div>
                <div className="bg-white border border-emerald-150 p-2.5 rounded-xl shadow-sm">
                  <span className="block text-[8.5px] font-mono text-slate-500 uppercase">Paid to Date</span>
                  <strong className="block text-emerald-700 font-black font-mono mt-1">{formatNaira(printSlipTarget.amountPaid || 0)}</strong>
                </div>
                <div className="bg-white border border-emerald-150 p-2.5 rounded-xl shadow-sm">
                  <span className="block text-[8.5px] font-mono text-slate-500 uppercase">Unpaid Balance</span>
                  <strong className={`block font-black font-mono mt-1 ${getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0) <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0) <= 0 
                      ? "₦0 (Cleared)" 
                      : formatNaira(getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0))}
                  </strong>
                </div>
              </div>
            </div>

            {/* Registered Operational Workers Segment */}
            <div className="border-t border-slate-300 pt-5 mb-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <h3 className="text-[10.5px] font-black uppercase tracking-wider text-slate-800 font-sans">REGISTERED OPERATIONAL PROMOTERS & STAFF</h3>
                <span className="text-[9.5px] font-mono text-slate-500 font-bold bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-xl shrink-0 select-none">
                  {printSlipTarget.workers.length} Onboarded Personnel
                </span>
              </div>

              {printSlipTarget.workers.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs italic">
                  No operational personnel or field representatives onboarded for this stall yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {printSlipTarget.workers.map((w) => (
                    <div key={w.id} className="p-3 border border-slate-200 bg-slate-50 rounded-2xl flex items-center gap-3 text-xs font-sans">
                      {w.photo && !w.photo.startsWith("preset:") ? (
                        <img 
                          src={getProxyImageUrl(w.photo)} 
                          alt={w.fullName} 
                          className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-300 shadow-xs" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${getPresetGradient(w.photo || "preset:emerald") || "from-teal-400 to-emerald-500"} shadow-xs flex items-center justify-center text-xs font-bold text-slate-955 shrink-0 border border-slate-300`}>
                          {w.fullName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-slate-900 truncate text-[11px] leading-tight">{w.fullName}</h4>
                        <p className="text-[9px] text-slate-500 leading-tight mt-0.5 font-medium">Role: <strong className="text-slate-850">{w.role}</strong></p>
                        <p className="text-[9px] text-slate-500 leading-tight font-mono">Cell: {w.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature columns with high fidelity legal seal representations */}
            <div className="mt-10 border-t border-slate-300 pt-6 flex justify-between items-end text-[10px] text-slate-700">
              <div className="text-center w-36">
                <div className="w-14 h-14 rounded-full border border-dashed border-emerald-600 text-emerald-600 flex flex-col items-center justify-center font-serif text-[7.5px] font-bold -rotate-12 mx-auto mb-2 select-none pointer-events-none uppercase">
                  <span>OFFICIAL</span>
                  <span>CONFIRMED</span>
                </div>
                <div className="border-t border-slate-450 pt-1 text-slate-500 font-sans uppercase font-bold text-[8.5px] select-none text-slate-400">STAFF EXAMINER</div>
              </div>

              <div className="text-center w-36">
                <span className="block font-serif italic text-slate-350 select-none pb-4 pointer-events-none">NYSC State Coordinator</span>
                <div className="border-t border-slate-450 pt-1 text-slate-500 font-sans uppercase font-bold text-[8.5px] select-none text-slate-400">STAMP COMMISSIONER</div>
              </div>
            </div>

            {/* Disclaimer Barcode and Instructions */}
            <div className="mt-10 border-t-2 border-slate-400 pt-4 text-center space-y-2">
              <p className="text-[7.5px] text-slate-450 leading-normal font-sans">
                Confirmation Notice: This slip acts as the official certification record proving stand validation and operational personnel clearance inside the NYSC Katsina Camp Market parameters. Present it to field inspection marshals on request. Use 'Save as PDF' option in your browser print system to download a file-backed variant.
              </p>
              <div className="flex justify-center gap-[1.5px] h-4 opacity-40 mt-1">
                {[1,3,1,4,2,1,1,3,2,1,2,4,1,2,1,3,1,1,4,2,2,1,3,1,2].map((w, idx) => (
                  <div key={idx} className="bg-slate-700" style={{ width: `${w}px` }} />
                ))}
              </div>
              <span className="block text-[6px] text-slate-400 mt-1 uppercase font-mono select-none">TACTICAL VERIFICATION BARCODE KEY</span>
            </div>

          </div>
        </div>
      </React.Fragment>
    );
  };

  // Decide if we are rendering for the MARKETER or the ADMIN
  if (userRole === "marketer") {
    const currentMarketer = marketers.find((m) => m.id === loggedInUserId);

    if (!currentMarketer) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8 text-slate-400 font-sans">
          <Building2 className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
          <h2 className="text-sm font-bold text-slate-300">My Stand Hub Offline</h2>
          <p className="text-xs text-slate-650 mt-1">Please ensure your brand registration has been completed or ask your administrator.</p>
        </div>
      );
    }

    const marketerPresetGrad = getPresetGradient(currentMarketer.photo);
    const tradeTheme = obtenerTradeTheme(currentMarketer.category);

    return (
      <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-8 font-sans">
        
        {/* Welcome Banner */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-4">
            {marketerPresetGrad ? (
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${marketerPresetGrad} shadow-lg flex items-center justify-center font-bold text-slate-950 text-xl shrink-0 border border-slate-700/60 select-none uppercase`}>
                {currentMarketer.businessName.slice(0, 2)}
              </div>
            ) : (
              <img 
                src={currentMarketer.photo} 
                alt={currentMarketer.fullName} 
                className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-slate-800 shadow-md" 
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] uppercase tracking-wider font-extrabold py-0.5 px-2 border rounded-full ${tradeTheme.badgeClass}`}>
                  {currentMarketer.category}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-emerald-450 border border-emerald-500/15">
                  Stand {currentMarketer.standNumber}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight mt-1">{currentMarketer.businessName}</h1>
              <p className="text-xs text-slate-400 mt-1">Managed by <strong className="text-slate-200">{currentMarketer.fullName}</strong> | Phone: <strong className="text-slate-200">{currentMarketer.phone}</strong></p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
            <button
              onClick={() => handlePrintSlip(currentMarketer)}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/10 shrink-0"
              title="Print/Download Official Registration Confirmation Slip"
            >
              <Printer className="w-4 h-4" />
              <span>Print Confirmation Slip</span>
            </button>

            <div className="shrink-0 bg-slate-950/60 border border-slate-850 p-3 rounded-2xl text-xs flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-505 font-bold font-mono">STAND STATUS</span>
                <span className="text-slate-300 font-semibold font-mono">active campaign station</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Col Left - Profile details & Change pic */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Business Card Info */}
            <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${tradeTheme.accentLine}`} />
              
              <div className="flex items-center gap-2 border-b border-slate-805 pb-3">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Stall Information</h3>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed italic">
                "{currentMarketer.description}"
              </p>

              <div className="space-y-2.5 pt-1.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/40 font-sans">
                  <span className="text-slate-500">Stand Assignment:</span>
                  <span className="font-mono text-slate-200 font-bold">{currentMarketer.standNumber}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-500">Industry / Trade:</span>
                  <span className="text-slate-200 font-semibold">{currentMarketer.category}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-805/40">
                  <span className="text-slate-500">Primary Registrant:</span>
                  <span className="text-slate-200 font-semibold">{currentMarketer.fullName}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Registration Date:</span>
                  <span className="text-slate-200 font-mono text-[11px]">
                    {new Date(currentMarketer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Picture Override Zone */}
            <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-400 animate-pulse" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">My Profile Photo</h3>
                </div>
                {uploadingSelfPhoto && (
                  <span className="text-[10px] text-blue-450 animate-pulse font-bold uppercase tracking-widest font-mono">Syncing...</span>
                )}
              </div>

              <div className="flex items-center gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                {marketerPresetGrad ? (
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-tr ${marketerPresetGrad} shadow flex items-center justify-center font-bold text-slate-950 text-2xl select-none uppercase shrink-0`}>
                    {currentMarketer.businessName.slice(0, 2)}
                  </div>
                ) : (
                  <img 
                    src={currentMarketer.photo} 
                    alt={currentMarketer.fullName} 
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-800 shadow" 
                  />
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{currentMarketer.fullName}</h4>
                  <p className="text-[10px] text-slate-505 mt-0.5">Recommended: Clear face photo with portrait orientation (Max 2MB)</p>
                </div>
              </div>

              <div className="relative border border-dashed border-slate-850 hover:border-emerald-550/25 rounded-2xl p-4 text-center bg-slate-950/30 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingSelfPhoto}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleMarketerPhotoUpload(file, currentMarketer.id);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center justify-center gap-2 font-sans">
                  <UploadCloud className="w-5 h-5 text-slate-500 group-hover:text-emerald-500" />
                  <span className="text-[11px] text-emerald-450 hover:text-emerald-300 font-bold transition-all">
                    {uploadingSelfPhoto ? "Saving profile photo..." : "Select Profile Face File"}
                  </span>
                  <span className="text-[9px] text-slate-550">JPEG or PNG file (Square layout preferred)</span>
                </div>
              </div>

              {selfPhotoError && (
                <p className="text-[10.5px] text-rose-450 font-semibold bg-rose-950/20 border border-rose-500/20 p-2.5 rounded-xl">{selfPhotoError}</p>
              )}
              {selfPhotoSuccess && (
                <p className="text-[10.5px] text-emerald-400 font-semibold bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Profile picture modified and deployed successfully!</span>
                </p>
              )}
            </div>

          </div>

          {/* Col Right - Staff onboarding & List */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Direct Onboarding Form */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-lg">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-805 mb-5">
                <UserPlus className="w-4 h-4 text-emerald-400 animate-bounce" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Staff Onboarding & Credentials</h4>
              </div>

              {workerError && (
                <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/20 rounded-xl text-[11px] text-rose-300 flex items-start gap-1.5">
                  <BadgeAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{workerError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                
                {/* Form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Worker Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Samuel Adewale"
                      value={workerName}
                      onChange={(e) => setWorkerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-700 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-sans">Contact Cell Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +234 812 345 6789"
                      value={workerPhone}
                      onChange={(e) => setWorkerPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Assigned Campaign Role</label>
                    <select
                      value={workerRole}
                      onChange={(e) => setWorkerRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-300 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-sans"
                    >
                      <option value="Shift Lead">Shift Lead</option>
                      <option value="Sales Promoter">Sales Promoter</option>
                      <option value="Cashier Accountant">Cashier Accountant</option>
                      <option value="Technical Advisor">Technical Advisor</option>
                      <option value="Stand Decor Associate">Stand Decor Associate</option>
                    </select>
                  </div>
                </div>

                {/* Worker Avatar Picker */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-805 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">Staff Credentials Photo</span>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setWorkerPhotoType("preset")}
                        className={`text-[9.5px] uppercase tracking-widest px-3 py-1 rounded-md font-extrabold cursor-pointer transition-colors ${workerPhotoType === "preset" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-slate-950 border border-slate-850 text-slate-500"}`}
                      >
                        Preset Gradient
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkerPhotoType("upload")}
                        className={`text-[9.5px] uppercase tracking-widest px-3 py-1 rounded-md font-extrabold cursor-pointer transition-colors ${workerPhotoType === "upload" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-slate-950 border border-slate-850 text-slate-500"}`}
                      >
                        Upload Picture
                      </button>
                    </div>

                    {workerPhotoType === "preset" ? (
                      <div className="flex items-center gap-2 pt-1">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getPresetGradient(`preset:${workerPreset}`) || "from-teal-400 to-emerald-500"} flex items-center justify-center font-bold text-slate-950 text-xs shrink-0 border border-slate-800`}>
                          {workerName ? workerName.slice(0, 2).toUpperCase() : "W"}
                        </div>
                        <div className="grid grid-cols-6 gap-0.5 flex-1 select-none">
                          {["emerald", "ocean", "sunset", "purple", "cyber", "solar"].map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setWorkerPreset(p)}
                              className={`h-5 rounded bg-gradient-to-tr ${getPresetGradient(`preset:${p}`)} border ${workerPreset === p ? "border-slate-100" : "border-transparent"}`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-800 hover:border-emerald-500/20 rounded-xl p-3 text-center relative cursor-pointer font-sans bg-slate-950">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleWorkerFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {workerUploadedBase64 ? (
                          <div className="flex items-center justify-center gap-2">
                            <img src={workerUploadedBase64} alt="Avatar inline" className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-705" />
                            <span className="text-[10px] text-slate-300 font-semibold truncate">Replace file</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-[10px] text-slate-500">
                            <UploadCloud className="w-4 h-4 text-slate-650 mb-1" />
                            <span>Select Staff Photo</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleAddWorker(currentMarketer.id)}
                    disabled={submittingWorker}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5 fill-current" />
                    <span>{submittingWorker ? "Saving Staff..." : "Onboard Worker"}</span>
                  </button>
                </div>

              </div>
            </div>

            {/* Staff Credentials Directory Table */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-805 mb-4">
                <div className="flex items-center gap-2">
                  <Contact2 className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Staff Credentials Audit</h4>
                </div>
                <span className="text-[10px] font-mono text-slate-405 uppercase tracking-widest font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                  {currentMarketer.workers.length} active registered staff
                </span>
              </div>

              <div className="overflow-y-auto max-h-[400px] space-y-3 pr-1 text-xs">
                {currentMarketer.workers.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-600 gap-1.5 border border-dashed border-slate-850 rounded-xl bg-slate-950/20">
                    <Smile className="w-6 h-6 text-slate-700" />
                    <span className="font-semibold text-slate-505">No staff onboarded for your stall yet.</span>
                    <span className="text-[10px] text-slate-600">Fill in the onboarding panel to register your field agents.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentMarketer.workers.map((w) => (
                      <div key={w.id} className="p-4 bg-slate-950/60 border border-slate-805/80 rounded-2xl flex flex-col justify-between gap-3 font-sans">
                        <div className="flex items-start gap-3">
                          {w.photo && !w.photo.startsWith("preset:") ? (
                            <img 
                              src={w.photo} 
                              referrerPolicy="no-referrer"
                              alt={w.fullName} 
                              className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-800" 
                            />
                          ) : (
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${getPresetGradient(w.photo || "preset:emerald") || "from-teal-400 to-emerald-500"} flex items-center justify-center text-xs font-bold text-slate-950 shrink-0 border border-slate-800`}>
                              {w.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h5 className="font-extrabold text-slate-205 truncate" title={w.fullName}>
                              {w.fullName}
                            </h5>
                            <p className="text-[10.5px] text-slate-400 mt-0.5">
                              Role: <strong className="text-slate-200">{w.role}</strong>
                            </p>
                            <p className="text-[10.5px] text-slate-500 font-mono">
                              Phone: <strong className="text-slate-400">{w.phone}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Upload direct worker picture & Dismiss buttons */}
                        <div className="border-t border-slate-800/40 pt-2 flex items-center justify-between gap-2 text-[10px]">
                          <label className="relative cursor-pointer py-1 px-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 rounded-md transition-colors flex items-center gap-1 shrink-0">
                            <Camera className="w-3 h-3 text-blue-400" />
                            <span>
                              {uploadingWorkerPhotoId === w.id ? "Uploading..." : "Upload Face Photo"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingWorkerPhotoId !== null}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleWorkerPhotoUpload(file, w.id);
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto"
                            />
                          </label>

                          <button
                            onClick={() => handleDeleteWorker(w.id, currentMarketer)}
                            title="Dismiss staff member"
                            className="py-1 px-2 bg-slate-900 border border-slate-850 text-slate-600 hover:text-rose-400 hover:border-rose-500/20 rounded-md cursor-pointer transition-all flex items-center gap-1 font-semibold"
                          >
                            <UserX className="w-3 h-3 shrink-0" />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {renderConfirmationSlipModals()}
      </div>
    );
  }

  // ELSE: ADMIN VIEW
  // Filtering marketers
  const filteredMarketers = marketers.filter((m) => {
    const searchMatch = 
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.standNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const categoryMatch = selectedCategory === "All" || m.category === selectedCategory;
    return searchMatch && categoryMatch;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 sm:p-8 font-sans">
      
      {/* Directory Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-800 pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Active Stands Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Operational viewports, detail records, and staff management for active campaign stands.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setSyncDirection("export");
              handleExportDataByJson();
              setShowSyncModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 font-mono text-[11px] font-bold rounded-xl cursor-pointer transition-all"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>BRIDGE DEVICE SYNC CODE</span>
          </button>
          
          <div className="text-xs text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            TOTAL RECORDED STANDS: <strong className="text-slate-100 font-extrabold font-sans text-xs">{marketers.length}</strong>
          </div>
        </div>
      </div>

      {/* Directory Filters Bar */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-stretch md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-650 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Name, Business, or Stand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs py-2.5 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-700 font-semibold"
          />
        </div>

        {/* Category switcher dropdown */}
        <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-slate-800/60 pt-3 md:pt-0">
          <span className="text-xs text-slate-505 font-bold font-sans uppercase tracking-wider">Filter by Trade:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 hover:border-slate-705 text-slate-300 text-xs py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-sans"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bento Grid layout */}
      {filteredMarketers.length === 0 ? (
        <div className="py-24 text-center rounded-3xl border border-dashed border-slate-850 flex flex-col items-center gap-2">
          <Building2 className="w-10 h-10 text-slate-700" id="empty-dir-icon" />
          <p className="text-sm font-semibold text-slate-400">No active stands identified matching the filters</p>
          <p className="text-xs text-slate-600">Register new ones in the 'Register Stand' panel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarketers.map((m, idx) => {
            const presetGrad = getPresetGradient(m.photo);
            const tTheme = obtenerTradeTheme(m.category);
            
            return (
              <motion.div 
                key={m.id} 
                className="bg-slate-900 border border-slate-805 rounded-2xl flex flex-col overflow-hidden hover:border-slate-750 hover:shadow-xl hover:shadow-slate-950/40 group transition-all"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: idx * 0.03 }}
                whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.15 } }}
              >
                {/* Header Banner representing category colors */}
                <div className="h-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 relative">
                  <span className="absolute top-2 right-4 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-emerald-500/10">
                    Stand {m.standNumber}
                  </span>
                </div>

                {/* Profile main box */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="flex items-start gap-3.5">
                    {/* User Photo Preview */}
                    {presetGrad ? (
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-tr ${presetGrad} shadow flex items-center justify-center font-bold text-slate-950 shrink-0 border border-slate-800/40 select-none uppercase`}>
                        {m.businessName.slice(0, 2)}
                      </div>
                    ) : (
                      <img 
                        src={m.photo} 
                        alt={m.fullName} 
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-800/40 shadow" 
                        referrerPolicy="no-referrer"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className={`text-[9.5px] uppercase tracking-wider font-extrabold py-0.5 px-2 border rounded-full ${tTheme.badgeClass}`}>
                          {m.category}
                        </span>
                        
                        {/* Account Verification pill */}
                        {m.verificationStatus === "verified" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            Verified
                          </span>
                        ) : m.verificationStatus === "review" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-450 border border-rose-500/20 text-[9px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                            In-Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-450 border border-amber-500/20 text-[9px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            Pending Audit
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 truncate group-hover:text-emerald-450 transition-colors" title={m.businessName}>
                        {m.businessName}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">Owner: {m.fullName}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-4 line-clamp-2 h-8 leading-relaxed font-sans">
                    {m.description}
                  </p>

                  {/* Payment Details Segment */}
                  <div className="mt-3 p-3 bg-slate-950/45 border border-slate-800/60 rounded-xl flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-[#94a3b8] font-bold font-mono">TRADE RATE ({m.category.toUpperCase()})</span>
                      <span className="font-extrabold text-slate-300 font-mono">{formatNaira(getAmountDue(m.category))}</span>
                    </div>

                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-slate-400 text-[11px]">Paid to Date:</span>
                      <span className="font-black text-emerald-450 font-mono text-[11.5px]">{formatNaira(m.amountPaid || 0)}</span>
                    </div>

                    {/* Progress slider showing visual completion ratio */}
                    <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-0.5">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${(m.amountPaid || 0) >= getAmountDue(m.category) ? 'from-emerald-500 to-teal-400' : (m.amountPaid || 0) > 0 ? 'from-amber-500 to-emerald-500' : 'from-rose-500 to-amber-500'}`}
                        style={{ width: `${Math.min(100, Math.round(((m.amountPaid || 0) / getAmountDue(m.category)) * 100))}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-500 font-medium">Unpaid Balance:</span>
                      <span className={`font-mono font-black ${getAmountDue(m.category) - (m.amountPaid || 0) <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {getAmountDue(m.category) - (m.amountPaid || 0) <= 0 ? "₦0 (Fully Cleared)" : formatNaira(getAmountDue(m.category) - (m.amountPaid || 0))}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/50 flex items-center justify-between gap-3 text-xs">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      Staff: {m.workers.length} registered
                    </span>

                    <button
                      onClick={() => {
                        selectMarketerWithPaymentInit(m);
                        setWorkerError(null);
                      }}
                      className="py-1.5 px-3 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Manage Stalls</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Manage Marketer Details & Staff Modal Backdrop */}
      {selectedMarketer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div 
            className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header banner */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                <h3 className="font-bold text-slate-200 text-sm">Stand Management Panel</h3>
              </div>
              <button
                onClick={() => setSelectedMarketer(null)}
                className="p-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inner Content scrollable */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-8 flex-1">
              
              {/* Profile card summary */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  {getPresetGradient(selectedMarketer.photo) ? (
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-tr ${getPresetGradient(selectedMarketer.photo)} shadow flex items-center justify-center font-bold text-slate-950 shrink-0 text-xl`}>
                      {selectedMarketer.businessName.slice(0, 2)}
                    </div>
                  ) : (
                    <img 
                      src={selectedMarketer.photo} 
                      alt={selectedMarketer.fullName} 
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-800/30 shadow" 
                      referrerPolicy="no-referrer"
                    />
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9.5px] uppercase tracking-wider font-extrabold py-0.5 px-2.5 border rounded-full ${
                        getCategoryBadgeStyle(selectedMarketer.category)
                      }`}>
                        {selectedMarketer.category}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-450 bg-emerald-950/50 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                        Stand {selectedMarketer.standNumber}
                      </span>
                    </div>
                    <h2 className="text-lg font-extrabold text-slate-200 mt-1">{selectedMarketer.businessName}</h2>
                    <p className="text-xs text-slate-500 font-sans">General Manager: <strong className="text-slate-400">{selectedMarketer.fullName}</strong> | Contact: <strong className="text-slate-400">{selectedMarketer.phone}</strong></p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center">
                  {/* Verification Status selector */}
                  {userRole === "admin" && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0 font-sans">Verification:</span>
                      <select
                        value={selectedMarketer.verificationStatus || "pending"}
                        onChange={async (e) => {
                          const newStatus = e.target.value as "verified" | "pending" | "review";
                          try {
                            await api.updateVerificationStatus(selectedMarketer.id, newStatus);
                            const updated = { ...selectedMarketer, verificationStatus: newStatus };
                            setSelectedMarketer(updated);
                            await onRefresh();
                          } catch (err) {
                            console.error("Failed to update status", err);
                          }
                        }}
                        className="bg-slate-950 border border-slate-800 text-slate-305 text-[10.5px] font-bold py-1 px-1.5 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-505 font-sans shrink-0"
                      >
                        <option value="verified">🛡️ Verified (Active)</option>
                        <option value="pending">⏳ Pending (Audit Necessary)</option>
                        <option value="review">⚠️ In-Review (Credentials)</option>
                      </select>
                    </div>
                  )}

                  {/* Print Badge Button */}
                  <button
                    onClick={() => handlePrintAction(selectedMarketer, true)}
                    className="py-1.5 px-3 bg-slate-905 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                    title="Print Badge front & back side layout"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Print Badge</span>
                  </button>

                  {/* Download Badge Button */}
                  <button
                    onClick={() => handleDownloadBothSides(selectedMarketer, true)}
                    className="py-1.5 px-3 bg-slate-905 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                    title="Download Badge front & back PNGs"
                  >
                    <Download className="w-4 h-4 text-teal-400" />
                    <span>Download ID</span>
                  </button>

                  {/* Print Confirmation Slip Button */}
                  <button
                    onClick={() => handlePrintSlip(selectedMarketer)}
                    className="py-1.5 px-3 bg-slate-905 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                    title="Print Registration Confirmation Slip containing marketer details and staff people"
                  >
                    <Printer className="w-4 h-4 text-emerald-450" />
                    <span>Print Confirmation Slip</span>
                  </button>

                  {userRole === "admin" && (
                    <>
                      {deletingMarketer === selectedMarketer.id ? (
                        <div className="flex items-center gap-2 bg-rose-955/35 border border-rose-500/30 p-1.5 rounded-xl">
                          <span className="text-[9px] text-rose-300 font-semibold leading-none">Teardown?</span>
                          <button
                            onClick={() => handleDeleteMarketer(selectedMarketer.id)}
                            className="bg-rose-600 hover:bg-rose-500 text-slate-100 text-[10px] font-bold py-1 px-2.5 rounded-md cursor-pointer"
                          >
                            YES
                          </button>
                          <button
                            onClick={() => setDeletingMarketer(null)}
                            className="bg-slate-800 hover:bg-slate-755 text-slate-400 text-[10px] py-1 px-2 rounded-md cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingMarketer(selectedMarketer.id)}
                          className="py-1.5 px-3 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-500/20 hover:border-rose-500/40 text-rose-450 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                          <span>Teardown Stall</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Payment Status & Receipt Controller */}
              {userRole === "admin" && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-6">
                  {/* Title Bar */}
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                    <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-505/15 font-mono text-[9px] font-bold shrink-0">₦ LEDGER</span>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Financial Ledger & Clearance Receipts</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Admin tools to audit dues, record payments, and issue stamp-approved tax invoice receipts.</p>
                    </div>
                  </div>

                  {/* Two Column Layout: Control Console & Live Receipt */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Column 1: Financial Standing & Update Controls */}
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-950/45 rounded-xl border border-slate-800/80 space-y-3 text-xs">
                        <span className="block text-[9.5px] font-bold uppercase tracking-widest text-slate-400 font-mono">Ledger Balances</span>
                        
                        <div className="flex justify-between py-1 border-b border-slate-850">
                          <span className="text-slate-500">Base Trade Category:</span>
                          <span className="text-slate-350 font-semibold">{selectedMarketer.category}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-850">
                          <span className="text-slate-500">Required Trade Rate:</span>
                          <span className="font-mono text-slate-300 font-semibold">{formatNaira(getAmountDue(selectedMarketer.category))}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-850">
                          <span className="text-slate-500">Total Recorded Payments:</span>
                          <span className="font-mono text-emerald-400 font-bold">{formatNaira(selectedMarketer.amountPaid || 0)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Outstanding Balance:</span>
                          <span className={`font-mono font-bold ${getAmountDue(selectedMarketer.category) - (selectedMarketer.amountPaid || 0) <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {getAmountDue(selectedMarketer.category) - (selectedMarketer.amountPaid || 0) <= 0 
                              ? "₦0 (Fully Cleared)" 
                              : formatNaira(getAmountDue(selectedMarketer.category) - (selectedMarketer.amountPaid || 0))}
                          </span>
                        </div>

                        {/* Status bar */}
                        <div className="pt-2">
                          <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden relative">
                            <div 
                              className={`h-full rounded-full bg-gradient-to-r ${(selectedMarketer.amountPaid || 0) >= getAmountDue(selectedMarketer.category) ? 'from-emerald-500 to-teal-400' : (selectedMarketer.amountPaid || 0) > 0 ? 'from-amber-500 to-emerald-500' : 'from-rose-500 to-amber-500'}`}
                              style={{ width: `${Math.min(100, Math.round(((selectedMarketer.amountPaid || 0) / getAmountDue(selectedMarketer.category)) * 100))}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[8px] text-slate-600 mt-1 font-semibold uppercase font-mono">
                            <span>0%</span>
                            <span>{Math.round(((selectedMarketer.amountPaid || 0) / getAmountDue(selectedMarketer.category)) * 100)}% Paid</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>

                      {/* Record payment subform */}
                      <div className="p-4 bg-slate-950/20 border border-slate-800/80 rounded-xl space-y-3">
                        <span className="block text-[9.5px] font-bold uppercase tracking-widest text-slate-400 font-mono">Record Fee Collection</span>
                        
                        {paymentError && (
                          <div className="text-[10px] text-rose-300 bg-rose-950/30 border border-rose-500/20 p-2 rounded-lg font-semibold leading-relaxed">
                            {paymentError}
                          </div>
                        )}

                        {paymentSuccess && (
                          <div className="text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 p-2 rounded-lg font-semibold leading-relaxed flex items-center gap-1.5 animate-pulse">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Payment ledger status synchronized!</span>
                          </div>
                        )}

                        <div className="flex gap-2 text-xs">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500">₦</span>
                            <input
                              type="number"
                              placeholder="e.g. 20000"
                              value={paymentAmountInput}
                              onChange={(e) => setPaymentAmountInput(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-slate-200 pl-7 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold placeholder:text-slate-800"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUpdatePayment(selectedMarketer.id)}
                            disabled={updatingPayment}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg cursor-pointer transition-all disabled:opacity-40 shrink-0 text-xs flex items-center gap-1"
                          >
                            <span>{updatingPayment ? "Updating..." : "Record Payment"}</span>
                          </button>
                        </div>

                        {/* Fast Shortcuts */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setPaymentAmountInput("0")}
                            className="text-[9px] font-bold font-mono py-1 px-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-500 hover:text-slate-350 rounded-lg cursor-pointer transition-colors"
                          >
                            ₦0 (Reset)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentAmountInput((getAmountDue(selectedMarketer.category) / 2).toString())}
                            className="text-[9px] font-bold font-mono py-1 px-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-500 hover:text-slate-350 rounded-lg cursor-pointer transition-colors"
                          >
                            50% Partial
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentAmountInput(getAmountDue(selectedMarketer.category).toString())}
                            className="text-[9px] font-bold font-mono py-1 px-2.5 bg-emerald-950/20 hover:bg-emerald-950/45 border border-emerald-500/20 text-emerald-400 rounded-lg cursor-pointer transition-colors"
                          >
                            ₦ CLEAR DUES (100%)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Live Receipt Generator Preview */}
                    <div className="flex flex-col justify-between">
                      {/* Live invoice container preview */}
                      <div className="p-5 bg-slate-950 text-slate-150 rounded-xl border border-slate-800/80 font-mono relative overflow-hidden flex flex-col justify-between aspect-[1.4/1] shadow-inner select-none">
                        {/* Decorative watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.03] pointer-events-none text-center select-none">
                          <span className="text-[34px] font-semibold tracking-widest text-[#cbd5e1] uppercase">AUDIT STAMP</span>
                        </div>

                        <div className="flex items-start justify-between border-b border-slate-850 pb-2">
                          <div>
                            <span className="block text-[6px] uppercase text-slate-600 font-bold leading-none mb-1">RECEIPT OFFICIAL REF</span>
                            <span className="text-[9px] text-[#cbd5e1] font-bold">REC-{selectedMarketer.id.substring(4).toUpperCase()}</span>
                          </div>
                          
                          <div className="text-right">
                            {/* Watermark of status */}
                            {(selectedMarketer.amountPaid || 0) >= getAmountDue(selectedMarketer.category) ? (
                              <span className="px-1.5 py-0.5 rounded text-[7.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold uppercase tracking-wider inline-block">
                                Fully Paid
                              </span>
                            ) : (selectedMarketer.amountPaid || 0) > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[7.5px] bg-amber-500/10 text-amber-450 border border-amber-500/25 font-bold uppercase tracking-wider inline-block">
                                Partial Paid
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[7.5px] bg-rose-500/10 text-rose-400 border border-rose-500/25 font-bold uppercase tracking-wider inline-block">
                                Unpaid Balance
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="my-2.5 space-y-1 text-[9.5px]">
                          <div className="flex justify-between">
                            <span className="text-slate-555 text-[8.5px]">MERCHANT brand:</span>
                            <span className="text-slate-205 font-bold truncate max-w-[150px]">{selectedMarketer.businessName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-555 text-[8.5px]">OWNER/REPRESENTATIVE:</span>
                            <span className="text-slate-205 font-bold truncate max-w-[150px]">{selectedMarketer.fullName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-555 text-[8.5px]">TRADE / STAND NO:</span>
                            <span className="text-[#a7f3d0] font-bold">{selectedMarketer.category} / #{selectedMarketer.standNumber}</span>
                          </div>
                          <div className="h-[1px] bg-dashed border-t border-slate-850 my-0.5" />
                          <div className="flex justify-between font-bold text-[10px]">
                            <span className="text-slate-400 font-mono text-[8.5px]">ASSESSMENT RATE:</span>
                            <span className="text-slate-205">{formatNaira(getAmountDue(selectedMarketer.category))}</span>
                          </div>
                          <div className="flex justify-between font-bold text-[10px]">
                            <span className="text-slate-400 font-mono text-[8.5px]">AMOUNT CREDITED:</span>
                            <span className="text-emerald-400">{formatNaira(selectedMarketer.amountPaid || 0)}</span>
                          </div>
                        </div>

                        <div className="border-t border-slate-850 pt-1.5 flex items-center justify-between text-[8px] text-slate-500">
                          <span>DATE: {new Date(selectedMarketer.createdAt || new Date()).toLocaleDateString()}</span>
                          <span className="text-[7px] font-sans text-emerald-450 font-bold tracking-wider uppercase">NYSC KATSINA CERTIFIED</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => downloadReceiptImage(selectedMarketer)}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Stamp Approved Receipt (PNG)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(selectedMarketer)}
                          className="w-full py-2 bg-slate-900 border border-slate-800 hover:border-slate-705 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-400 fill-current shrink-0" />
                          <span>Print File / Save PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid 2 Columns: Add Staff vs Staff directory */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* Coll left: Add Worker form */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/80">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800 mb-4">
                      <UserPlus className="w-4 h-4 text-emerald-450 animate-bounce" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Staff Onboarding</h4>
                    </div>

                    {workerError && (
                      <div className="mb-3.5 p-3 bg-rose-950/40 border border-rose-500/20 rounded-xl text-[11px] text-rose-300 flex items-start gap-1.5">
                        <BadgeAlert className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{workerError}</span>
                      </div>
                    )}

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddWorker(selectedMarketer.id);
                      }} 
                      className="space-y-4 text-xs font-sans"
                    >
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Worker Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Liam Watson"
                          value={workerName}
                          onChange={(e) => setWorkerName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-700 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-sans">Contact Cell Phone *</label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. +1 (555) 321-4455"
                          value={workerPhone}
                          onChange={(e) => setWorkerPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Assigned Campaign Role</label>
                        <select
                          value={workerRole}
                          onChange={(e) => setWorkerRole(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-300 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-sans"
                        >
                          <option value="Shift Lead">Shift Lead</option>
                          <option value="Sales Promoter">Sales Promoter</option>
                          <option value="Cashier Accountant">Cashier Accountant</option>
                          <option value="Technical Advisor">Technical Advisor</option>
                          <option value="Stand Decor Associate">Stand Decor Associate</option>
                        </select>
                      </div>

                      {/* Photo ID Segment */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Set Worker ID Photo</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setWorkerPhotoType("preset")}
                            className={`text-[9.5px] uppercase tracking-widest px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${workerPhotoType === "preset" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/15" : "bg-slate-950 border border-slate-850 text-slate-500"}`}
                          >
                            Preset
                          </button>
                          <button
                            type="button"
                            onClick={() => setWorkerPhotoType("upload")}
                            className={`text-[9.5px] uppercase tracking-widest px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${workerPhotoType === "upload" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/15" : "bg-slate-950 border border-slate-850 text-slate-500"}`}
                          >
                            File Upload
                          </button>
                        </div>

                        {workerPhotoType === "preset" ? (
                          <div className="flex items-center gap-2 pt-1">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${getPresetGradient(`preset:${workerPreset}`) || "from-teal-400 to-emerald-500"} flex items-center justify-center font-bold text-slate-950 text-[10px] shrink-0 border border-slate-800`}>
                              {workerName ? workerName.slice(0, 2).toUpperCase() : "W"}
                            </div>
                            <div className="grid grid-cols-6 gap-0.5 flex-1 select-none">
                              {["emerald", "ocean", "sunset", "purple", "cyber", "solar"].map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setWorkerPreset(p)}
                                  className={`h-4 rounded bg-gradient-to-tr ${getPresetGradient(`preset:${p}`)} border ${workerPreset === p ? "border-slate-100" : "border-transparent"}`}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="border border-dashed border-slate-800 hover:border-emerald-550/25 rounded-lg p-2 text-center relative cursor-pointer font-sans bg-slate-950">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleWorkerFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            {workerUploadedBase64 ? (
                              <div className="flex items-center justify-center gap-2">
                                <img src={workerUploadedBase64} alt="Avatar inline" className="w-8 h-8 rounded-md object-cover" />
                                <span className="text-[9px] text-slate-400 font-semibold">Change Picture</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-[9px] text-slate-500">
                                <span>Choose Image (Max 2MB)</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={submittingWorker}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5 fill-current" />
                        <span>{submittingWorker ? "Saving Staff..." : "Onboard Worker"}</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Coll right: Staff listings table */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/80 h-full flex flex-col">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <Contact2 className="w-4 h-4 text-blue-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Staff Credentials Audit</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-505 uppercase tracking-widest font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">{selectedMarketer.workers.length} active staff</span>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[350px] text-xs">
                      {selectedMarketer.workers.length === 0 ? (
                        <div className="h-full py-16 flex flex-col items-center justify-center text-slate-600 gap-1 border border-dashed border-slate-800/80 rounded-xl">
                          <Smile className="w-6 h-6 text-slate-700" />
                          <span>No staff onboarded for this merchant stall.</span>
                          <span className="text-[10px] text-slate-700">Use onboarding control client on the left.</span>
                        </div>
                      ) : (
                        <div className="space-y-3 font-sans">
                          {selectedMarketer.workers.map((w) => (
                            <div key={w.id} className="p-3 bg-slate-900 border border-slate-805 rounded-xl flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-3">
                                {w.photo && !w.photo.startsWith("preset:") ? (
                                  <img 
                                    src={w.photo} 
                                    referrerPolicy="no-referrer"
                                    alt={w.fullName} 
                                    className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-800" 
                                  />
                                ) : (
                                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getPresetGradient(w.photo || "preset:emerald") || "from-teal-400 to-emerald-500"} flex items-center justify-center text-xs font-bold text-slate-950 shrink-0 border border-slate-800`}>
                                    {w.fullName.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h5 className="font-bold text-slate-200 truncate">
                                    {w.fullName}
                                  </h5>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Role: <strong className="text-slate-200">{w.role}</strong>
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    Phone: <strong className="text-slate-400">{w.phone}</strong>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 font-sans">
                                {/* Upload directly on Admin modal as well */}
                                <label className="relative cursor-pointer py-1 px-2 bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-slate-300 border border-slate-850 rounded-lg transition-colors flex items-center shrink-0">
                                  <Camera className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleWorkerPhotoUpload(file, w.id);
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                </label>

                                {/* Print staff badge */}
                                <button
                                  onClick={() => handlePrintAction(w, false)}
                                  title="Print staff identification badge layout"
                                  className="p-1.5 bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-emerald-400 rounded-lg cursor-pointer transition-all flex items-center justify-center shrink-0"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {/* Download staff badge */}
                                <button
                                  onClick={() => handleDownloadBothSides(w, false)}
                                  title="Download staff badge PNG files (Front & Back)"
                                  className="p-1.5 bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-teal-400 rounded-lg cursor-pointer transition-all flex items-center justify-center shrink-0"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteWorker(w.id)}
                                  title="Dismiss staff member"
                                  className="p-1.5 bg-slate-950 border border-slate-850 hover:border-rose-500/20 text-slate-600 hover:text-rose-450 rounded-lg cursor-pointer transition-colors"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Dynamic Landscape High Definition Print Layout */}
      {printTarget && (
        <div className="print-only">
          {/* Card Front view layout */}
          <div className="bg-slate-950 text-slate-100 p-6 rounded-3xl border border-slate-300 relative flex flex-col justify-between w-[320px] h-[505px] font-sans overflow-hidden shadow-2xl mx-auto">
            {/* Emerald glow top banner strip */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
            
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mt-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">NYSC KATSINA CAMP</span>
              <span className="text-[9px] font-bold font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/25 px-2 py-0.5 rounded">ZONE 1-A</span>
            </div>

            <div className="flex flex-col items-center gap-4 text-center my-auto">
              {/* Photo */}
              {printTarget.photo && !printTarget.photo.startsWith("preset:") ? (
                <div className="relative">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-500 opacity-75 blur-sm" />
                  <img 
                    src={getProxyImageUrl(printTarget.photo)} 
                    alt={printTarget.name} 
                    className="w-[105px] h-[105px] rounded-2xl object-cover relative border border-slate-950 z-10" 
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-400 to-blue-550 opacity-100 blur-sm" />
                  <div className={`w-[105px] h-[105px] rounded-2xl bg-gradient-to-tr ${getPresetGradient(printTarget.photo || "preset:emerald")} relative z-10 flex items-center justify-center font-bold text-slate-950 text-3xl uppercase`}>
                    {printTarget.name.slice(0, 2)}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <h4 className="text-base font-extrabold uppercase tracking-tight text-slate-50">
                  {printTarget.name.toUpperCase()}
                </h4>
                <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-805 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-405 animate-pulse animate-duration-1000" />
                  {printTarget.role}
                </div>
                <p className="text-[10.5px] text-slate-500 font-medium tracking-tight">Merchant: {printTarget.business}</p>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs text-slate-400">
              <div>
                <span className="block text-[7.5px] uppercase tracking-wider text-slate-500 font-mono font-bold leading-none mb-1">ASSIGNED STALL</span>
                <strong className="text-slate-100 uppercase text-[12px] font-extrabold">Stand {printTarget.stand}</strong>
              </div>
              <div className="text-right">
                <span className="block text-[7.5px] uppercase tracking-wider text-slate-500 font-mono font-bold leading-none mb-1 font-sans">OPERATOR ID NO</span>
                <strong className="font-mono text-emerald-400 text-[12.5px] font-extrabold">{printTarget.id}</strong>
              </div>
            </div>
          </div>

          {/* Card Back view layout */}
          <div className="bg-slate-950 text-slate-100 p-6 rounded-3xl border border-slate-300 relative flex flex-col justify-between w-[320px] h-[505px] font-sans overflow-hidden shadow-2xl mx-auto">
            {/* Magnetic strip mock */}
            <div className="h-8 bg-slate-900 absolute top-8 left-0 w-full flex items-center px-6 border-y border-slate-800">
              <span className="text-[6.5px] font-mono text-slate-650 tracking-wider">SECURE INTEGRATED MAGNETIC AUDIT TAG</span>
            </div>

            <div className="flex-1 flex flex-col justify-between mt-18">
              {/* Disclaimer */}
              <div className="space-y-2 text-[8px] text-slate-500 leading-relaxed border-b border-slate-800/60 pb-3">
                <p>This credential is an official delegation for NYSC Katsina Camp Market event permissions. It remains the personal property of general campaign administration.</p>
                <p>Bearer must showcase this identifier badge at all checkpoints. Alteration, replication, or delegation is subject to clearance revocation.</p>
                <div className="flex justify-between font-mono text-[7px] text-slate-600 pt-1">
                  <span>ISSUED: {new Date(printTarget.createdAt || new Date()).toLocaleDateString()}</span>
                  <span>REF: CP-Z1</span>
                </div>
              </div>

              {/* Signature and barcode items */}
              <div className="flex items-center justify-between gap-4 py-2 mt-auto">
                <div className="p-1 bg-white rounded-lg border border-slate-200 w-12 h-12 flex items-center justify-center shrink-0">
                  <div className="grid grid-cols-4 gap-0.5 w-full h-full p-0.5">
                    <div className="bg-slate-950 rounded-xs" />
                    <div className="bg-slate-950 rounded-xs" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-950 rounded-xs" />
                    <div className="bg-slate-950 rounded-xs" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-950 rounded-xs" />
                    <div className="bg-slate-950 rounded-xs" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-950 rounded-xs" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-950 rounded-xs" />
                    <div className="bg-slate-950 rounded-xs" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-950 rounded-xs" />
                    <div className="bg-slate-950 rounded-xs" />
                  </div>
                </div>

                <div className="text-right flex-1">
                  <span className="block text-[7.5px] text-slate-600 uppercase font-mono leading-none font-bold">HEAD OF CAMP MARKET</span>
                  <span className="text-slate-300 font-serif italic tracking-widest text-[12px] block mt-1">Idris Dangalan</span>
                  <div className="w-18 h-[1px] bg-slate-800 ml-auto mt-0.5" />
                  <span className="text-[7.5px] text-slate-505 uppercase block mt-0.5 leading-none">Signature Verified</span>
                </div>
              </div>
            </div>

            <div className="py-2 mt-auto border-t border-slate-800/80 text-center flex flex-col items-center">
              <span className="text-[7px] text-emerald-400 font-extrabold tracking-widest font-mono">CAMP CODE CERTIFICATE ACTIVE</span>
              <div className="flex gap-[1.5px] h-4 mt-2 opacity-50">
                {[1,3,1,4,2,1,1,3,2,1,2,4,1,2,1,3,1,1,4,2,2,1,3,1,2].map((w, idx) => (
                  <div key={idx} className="bg-slate-500" style={{ width: `${w}px` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Portrait Official Tax Clearance Receipt Print Layout */}
      {printReceiptTarget && (
        <div className="print-receipt-only">
          <div className="w-[600px] bg-white text-slate-900 p-8 rounded-3xl border-2 border-dashed border-slate-400 font-mono relative flex flex-col justify-between aspect-[0.72/1] shadow-2xl mx-auto my-12 leading-relaxed">
            
            {/* Header branding */}
            <div className="text-center border-b-2 border-slate-400 pb-4 relative">
              <h2 className="text-base font-black tracking-widest uppercase">NYSC KATSINA OFFICIAL REVENUE RECEIPT</h2>
              <p className="text-[9px] text-slate-550 font-sans tracking-wide mt-1">CAMP MARKET REVENUE BUREAU • KATSINA STATE DIVISION</p>
              <div className="absolute top-0 right-0 text-[9px] font-bold border border-slate-400 px-2 py-0.5 rounded font-mono">
                DUPLICATE
              </div>
            </div>

            {/* General Info */}
            <div className="my-6 space-y-3 font-mono text-xs text-slate-800">
              <div className="flex justify-between items-center text-[9.5px] font-sans font-bold uppercase tracking-wider text-slate-500 mb-2">
                <span>RECEIPT REF: REC-{printReceiptTarget.id.substring(4).toUpperCase()}</span>
                <span>DATE: {new Date().toLocaleDateString()}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-300">
                <span className="text-slate-500">STALL REGISTERED LEGAL BRAND:</span>
                <span className="font-bold text-slate-900">{printReceiptTarget.businessName.toUpperCase()}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-300">
                <span className="text-slate-500">PRIMARY EXPLOITATION OWNER:</span>
                <span className="font-bold text-slate-900">{printReceiptTarget.fullName.toUpperCase()}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-300">
                <span className="text-slate-500">REGISTERED TRADE SECTOR:</span>
                <span className="font-bold text-slate-900">{printReceiptTarget.category.toUpperCase()}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-300">
                <span className="text-slate-500">DESIGNATED STAND NUMBER:</span>
                <span className="font-bold text-slate-900">STAND {printReceiptTarget.standNumber}</span>
              </div>

              <div className="h-4" />

              <div className="border-t-2 border-slate-400 pt-4 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>BASE TAX & TRADE PERMIT RATE:</span>
                  <span className="font-bold">{formatNaira(getAmountDue(printReceiptTarget.category))}</span>
                </div>
                
                <div className="flex justify-between text-slate-600">
                  <span>PREVIOUS RECOVERIES:</span>
                  <span>₦0.00</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-800 text-[11px] font-sans font-bold">AMOUNT TENDERED TODAY:</span>
                  <span className="font-black text-[13px] text-emerald-700 border-b-2 border-emerald-700 pb-0.5">
                    {formatNaira(printReceiptTarget.amountPaid || 0)}
                  </span>
                </div>

                <div className="h-1 bg-dashed border-t border-slate-300 my-2" />

                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-300 mt-2">
                  <span className="text-slate-600 text-[9.5px] font-sans font-semibold">REMAINING UNPAID OUTSTANDING:</span>
                  <span className={`font-black text-xs ${getAmountDue(printReceiptTarget.category) - (printReceiptTarget.amountPaid || 0) <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {getAmountDue(printReceiptTarget.category) - (printReceiptTarget.amountPaid || 0) <= 0 
                      ? "₦0.00 (COMPLETELY CLEARED)" 
                      : formatNaira(getAmountDue(printReceiptTarget.category) - (printReceiptTarget.amountPaid || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Stamps */}
            <div className="mt-8 border-t border-slate-300 pt-4 flex justify-between items-end text-[10px] text-slate-705">
              <div className="text-center w-36">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-emerald-600 text-emerald-600 flex flex-col items-center justify-center font-serif text-[7.5px] font-bold -rotate-12 mx-auto mb-2 select-none pointer-events-none uppercase">
                  <span>TRUST</span>
                  <span>APPROVED</span>
                </div>
                <div className="border-t border-slate-400 pt-1 text-slate-500 font-sans">REVENUE INSPECTOR</div>
              </div>

              <div className="text-center w-36">
                <span className="block font-serif italic text-slate-300 select-none pb-4 pointer-events-none">Idris Dangalan</span>
                <div className="border-t border-slate-400 pt-1 text-slate-500 font-sans">STAMP COMMISSIONER</div>
              </div>
            </div>

            {/* Disclaimer & Barcode */}
            <div className="mt-8 border-t-2 border-slate-400 pt-4 text-center space-y-2">
              <p className="text-[7.5px] text-slate-450 leading-normal font-sans">
                Notice: This receipt constitutes formal evidence of transaction recording on the NYSC Katsina Camp Market exhibitor permit logs. Keep in proximity of the registered exhibition stand for quick inspections. This duplicate certifies clearance of corresponding municipal dues.
              </p>
              <div className="flex justify-center gap-[1.5px] h-4 opacity-40 mt-1">
                {[1,3,1,4,2,1,1,3,2,1,2,4,1,2,1,3,1,1,4,2,2,1,3,1,2].map((w, idx) => (
                  <div key={idx} className="bg-slate-700" style={{ width: `${w}px` }} />
                ))}
              </div>
              <span className="block text-[6px] text-slate-400 mt-1 uppercase font-mono">EXHIBITOR PERMIT LOG AUDIT KEY</span>
            </div>

          </div>
        </div>
      )}

      {/* On-screen Preview and Print Action Modal */}
      {printSlipTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-450" />
                <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">Registration Slip Preview</h3>
              </div>
              <button
                onClick={() => setPrintSlipTarget(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
               {/* Modal Preview Body */}
            <div className="p-6 flex-1 overflow-auto bg-slate-950/40 flex items-start justify-center custom-scrollbar">
              <div 
                id="confirmation-slip-preview"
                className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-300 font-sans shadow-lg leading-relaxed mx-auto text-left w-[640px] shrink-0"
              >
                {/* Top Bar Branding */}
                <div className="flex items-center justify-between border-b-2 border-slate-300 pb-5 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-305 flex items-center justify-center font-bold font-sans text-lg shrink-0">
                      NYSC
                    </div>
                    <div>
                      <h2 className="text-sm font-black tracking-tight uppercase leading-none text-slate-900">CAMP MARKET REGISTRATION</h2>
                      <p className="text-[9px] text-slate-500 font-mono tracking-wide mt-1 uppercase">Katsina State Division • Official Exhibitor Bureau</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="inline-flex py-0.5 px-2 bg-slate-100 border border-slate-200 rounded-lg text-[8.5px] font-mono font-bold tracking-wider text-slate-655 uppercase">
                      CONFIRMATION SLIP
                    </span>
                    <p className="text-[8.5px] text-slate-500 font-mono mt-0.5">REF: CM-{printSlipTarget.id.substring(4).toUpperCase()}</p>
                  </div>
                </div>

                {/* Main Details Panel */}
                <div className="grid grid-cols-3 gap-6 mb-5">
                  {/* Left Column - Marketer Profile Photo */}
                  <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    {getPresetGradient(printSlipTarget.photo) ? (
                      <div className={`w-24 h-24 rounded-xl bg-gradient-to-tr ${getPresetGradient(printSlipTarget.photo) || "from-teal-400 to-emerald-500"} shadow-sm flex items-center justify-center font-bold text-slate-905 text-3xl uppercase border border-slate-300`}>
                        {printSlipTarget.businessName.slice(0, 2)}
                      </div>
                    ) : (
                      <img 
                        src={getProxyImageUrl(printSlipTarget.photo)} 
                        alt={printSlipTarget.fullName} 
                        className="w-24 h-24 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="mt-2.5">
                      <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider truncate max-w-[130px]">{printSlipTarget.fullName}</h3>
                      <p className="text-[8px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">Primary Registrant</p>
                    </div>
                  </div>

                  {/* Right Columns - Info Fields */}
                  <div className="col-span-2 space-y-2.5 text-xs text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-555 font-semibold font-sans text-[9px] uppercase tracking-wider">Business/Brand:</span>
                      <span className="font-extrabold text-slate-900 uppercase">{printSlipTarget.businessName}</span>
                    </div>
                    
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-555 font-semibold font-sans text-[9px] uppercase tracking-wider">Stand Code:</span>
                      <span className="font-mono text-emerald-700 font-black text-[11px]">STAND {printSlipTarget.standNumber}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-555 font-semibold font-sans text-[9px] uppercase tracking-wider">Category Segment:</span>
                      <span className="font-bold text-slate-800">{printSlipTarget.category}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-555 font-semibold font-sans text-[9px] uppercase tracking-wider">Cell Number:</span>
                      <span className="font-mono text-slate-800 font-semibold">{printSlipTarget.phone}</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-555 font-semibold font-sans text-[9px] uppercase tracking-wider">Audit Match:</span>
                      <span className={`font-mono text-[9px] font-bold ${printSlipTarget.verificationStatus === "verified" ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {printSlipTarget.verificationStatus === "verified" ? "★ APPROVED & SEALED" : "★ PENDING AUDIT"}
                      </span>
                    </div>
                  </div>
                </div>xt-3xl uppercase border border-slate-300`}>
                        {printSlipTarget.businessName.slice(0, 2)}
                      </div>
                    ) : (
                      <img 
                        src={getProxyImageUrl(printSlipTarget.photo)} 
                        alt={printSlipTarget.fullName} 
                        className="w-24 h-24 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="mt-2.5">
                      <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider truncate max-w-[130px]">{printSlipTarget.fullName}</h3>
                      <p className="text-[8px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">Primary Registrant</p>
                    </div>
                  </div>

                  {/* Right Columns - Info Fields */}
                  <div className="sm:col-span-2 space-y-2.5 text-xs text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-semibold font-sans text-[9px] uppercase tracking-wider">Business/Brand:</span>
                      <span className="font-extrabold text-slate-900 uppercase">{printSlipTarget.businessName}</span>
                    </div>
                    
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-semibold font-sans text-[9px] uppercase tracking-wider">Stand Code:</span>
                      <span className="font-mono text-emerald-700 font-black text-[11px]">STAND {printSlipTarget.standNumber}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-semibold font-sans text-[9px] uppercase tracking-wider">Category Segment:</span>
                      <span className="font-bold text-slate-800">{printSlipTarget.category}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-semibold font-sans text-[9px] uppercase tracking-wider">Cell Number:</span>
                      <span className="font-mono text-slate-800 font-semibold">{printSlipTarget.phone}</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 font-semibold font-sans text-[9px] uppercase tracking-wider">Audit Match:</span>
                      <span className={`font-mono text-[9px] font-bold ${printSlipTarget.verificationStatus === "verified" ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {printSlipTarget.verificationStatus === "verified" ? "★ APPROVED & SEALED" : "★ PENDING AUDIT"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 mb-5 text-[11px] text-slate-600 font-sans italic">
                  "Description: {printSlipTarget.description}"
                </div>

                {/* Ledger */}
                <div className="bg-emerald-50/20 border border-emerald-200 rounded-xl p-3 mb-5 text-slate-800 text-xs">
                  <h3 className="text-[9px] font-black uppercase tracking-wider text-emerald-800 pb-1.5 border-b border-emerald-150 mb-2">FINANCIAL OVERVIEW</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white border border-emerald-105 p-2 rounded-lg">
                      <span className="block text-[7.5px] font-mono text-slate-500 uppercase">Trade Base Due</span>
                      <strong className="block text-slate-800 font-bold font-mono mt-0.5 text-[10px]">{formatNaira(getAmountDue(printSlipTarget.category))}</strong>
                    </div>
                    <div className="bg-white border border-emerald-105 p-2 rounded-lg">
                      <span className="block text-[7.5px] font-mono text-slate-500 uppercase">Paid to Date</span>
                      <strong className="block text-emerald-700 font-black font-mono mt-0.5 text-[10px]">{formatNaira(printSlipTarget.amountPaid || 0)}</strong>
                    </div>
                    <div className="bg-white border border-emerald-105 p-2 rounded-lg">
                      <span className="block text-[7.5px] font-mono text-slate-500 uppercase">Balance</span>
                      <strong className={`block font-black font-mono mt-0.5 text-[10px] ${getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0) <= 0 ? 'text-emerald-750' : 'text-rose-700'}`}>
                        {getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0) <= 0 
                          ? "Cleared" 
                          : formatNaira(getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0))}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Personnel Group */}
                <div className="border-t border-slate-200 pt-4 mb-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800 font-sans">REGISTERED STAFF & WORKERS</h3>
                    <span className="text-[8.5px] font-mono text-slate-500 font-bold bg-slate-100 border border-slate-205 px-2.5 py-0.5 rounded-lg shrink-0">
                      {printSlipTarget.workers.length} Personnel
                    </span>
                  </div>

                  {printSlipTarget.workers.length === 0 ? (
                    <div className="py-4 text-center border border-dashed border-slate-205 rounded-xl text-slate-400 text-xs italic">
                      No personnel or field representatives onboarded for this stand yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {printSlipTarget.workers.map((w) => (
                        <div key={w.id} className="p-2.5 border border-slate-150 bg-slate-50 rounded-xl flex items-center gap-2.5 text-xs font-sans">
                          {w.photo && !w.photo.startsWith("preset:") ? (
                            <img 
                              src={getProxyImageUrl(w.photo)} 
                              alt={w.fullName} 
                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200 shadow-xs" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-tr ${getPresetGradient(w.photo || "preset:emerald")} shadow-xs flex items-center justify-center text-[10px] font-bold text-slate-955 shrink-0 border border-slate-200`}>
                              {w.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-slate-900 truncate text-[10.5px] leading-none">{w.fullName}</h4>
                            <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">Role: <strong className="text-slate-800">{w.role}</strong></p>
                            <p className="text-[8.5px] text-slate-500 leading-tight font-mono truncate">{w.phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Signatures */}
                <div className="mt-6 border-t border-slate-200 pt-4 flex justify-between items-end text-[9px] text-slate-500">
                  <div className="text-center w-28">
                    <div className="w-10 h-10 rounded-full border border-dashed border-emerald-600 text-emerald-600 flex flex-col items-center justify-center font-serif text-[6px] font-bold -rotate-12 mx-auto mb-1 select-none pointer-events-none uppercase">
                      <span>OFFICIAL</span>
                      <span>CONFIRMED</span>
                    </div>
                    <div className="border-t border-slate-300 pt-0.5 text-slate-400 font-sans uppercase font-bold text-[7.5px]">STAFF EXAMINER</div>
                  </div>

                  <div className="text-center w-28 text-right">
                    <span className="block font-serif italic text-slate-444 select-none pb-2 pointer-events-none">NYSC Katsina</span>
                    <div className="border-t border-slate-300 pt-0.5 text-slate-400 font-sans uppercase font-bold text-[7.5px] text-right">STAMP COMMISSIONER</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row gap-2 sticky bottom-0 z-10 backdrop-blur-md">
              <button
                onClick={handleDownloadSlipPDF}
                disabled={downloadingSlip}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 text-xs font-extrabold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/10"
              >
                <Download className="w-4 h-4" />
                <span>{downloadingSlip ? "Generating..." : "Download PDF"}</span>
              </button>
              
              <button
                onClick={handleShareSlip}
                disabled={sharingSlip}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-extrabold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>{sharingSlip ? "Sharing..." : "Share Slip"}</span>
              </button>

              <button
                onClick={handleDownloadSlipPNG}
                disabled={downloadingSlip}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 border border-slate-705 text-slate-300 disabled:text-slate-500 text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-450" />
                <span>Download PNG</span>
              </button>

              <button
                onClick={() => window.print()}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-755 border border-slate-705 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-emerald-450" />
                <span>Print</span>
              </button>

              <button
                onClick={() => setPrintSlipTarget(null)}
                className="py-3 px-4 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-205 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Registration Confirmation Slip Print Layout */}
      {printSlipTarget && (
        <div className="print-slip-only">
          <div className="w-[720px] bg-white text-slate-900 p-8 rounded-3xl border-2 border-slate-300 font-sans relative shadow-2xl mx-auto my-6 leading-relaxed">
            
            {/* Top Bar Branding */}
            <div className="flex items-center justify-between border-b-2 border-slate-400 pb-5 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-105 text-emerald-800 rounded-2xl border border-emerald-300 flex items-center justify-center font-bold font-sans text-xl shrink-0">
                  NYSC
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight uppercase leading-none text-slate-900">CAMP MARKET REGISTRATION</h2>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wide mt-1 uppercase select-none">Katsina State Division • Official Exhibitor Bureau</p>
                </div>
              </div>
              
              <div className="text-right">
                <span className="inline-flex py-1 px-2.5 bg-slate-100 border border-slate-300 rounded-xl text-[9px] font-mono font-bold tracking-wider text-slate-650 uppercase">
                  CONFIRMATION SLIP
                </span>
                <p className="text-[9px] text-slate-500 font-mono mt-1">REF: CM-{printSlipTarget.id.substring(4).toUpperCase()}</p>
              </div>
            </div>

            {/* Main Details Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              
              {/* Left Column - Marketer Profile Photo */}
              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                {getPresetGradient(printSlipTarget.photo) ? (
                  <div className={`w-32 h-32 rounded-2xl bg-gradient-to-tr ${getPresetGradient(printSlipTarget.photo) || "from-teal-400 to-emerald-500"} shadow-md flex items-center justify-center font-bold text-slate-955 text-4xl uppercase select-none border border-slate-300`}>
                    {printSlipTarget.businessName.slice(0, 2)}
                  </div>
                ) : (
                  <img 
                    src={getProxyImageUrl(printSlipTarget.photo)} 
                    alt={printSlipTarget.fullName} 
                    className="w-32 h-32 rounded-2xl object-cover shrink-0 border border-slate-300 shadow-sm animate-fade-in" 
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="mt-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{printSlipTarget.fullName}</h3>
                  <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mt-0.5 select-none text-slate-400">Primary Registrant</p>
                </div>
              </div>

              {/* Right Columns - Info Fields */}
              <div className="md:col-span-2 space-y-3.5 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Registered Business/Brand:</span>
                  <span className="font-extrabold text-slate-900 uppercase">{printSlipTarget.businessName}</span>
                </div>
                
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Designated Stand Assignment:</span>
                  <span className="font-mono text-emerald-700 font-black text-[13px]">STAND {printSlipTarget.standNumber}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Industry Sector:</span>
                  <span className="font-bold text-slate-800">{printSlipTarget.category}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Owner Direct Contact:</span>
                  <span className="font-mono text-slate-800 font-semibold">{printSlipTarget.phone}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Registration Timestamp:</span>
                  <span className="font-mono text-slate-800">{new Date(printSlipTarget.createdAt).toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500 font-semibold font-sans uppercase text-[9.5px] tracking-wider">Account Audit Status:</span>
                  <span className={`font-mono text-[10.5px] font-bold ${printSlipTarget.verificationStatus === "verified" ? 'text-emerald-600' : 'text-amber-600'}`}>
                    ★ {printSlipTarget.verificationStatus === "verified" ? "APPROVED & SEALED" : "PENDING AUDIT EXAMINATION"}
                  </span>
                </div>
              </div>

            </div>

            {/* Description quote */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-xs text-slate-600 font-sans italic">
              "Description: {printSlipTarget.description}"
            </div>

            {/* Financial Status Summary */}
            <div className="bg-emerald-50/45 border border-emerald-200 rounded-2xl p-4.5 mb-6 text-xs">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-emerald-800 pb-2 border-b border-emerald-250 mb-3 select-none">FINANCIAL LEDGER STATS</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white border border-emerald-150 p-2.5 rounded-xl shadow-sm">
                  <span className="block text-[8.5px] font-mono text-slate-500 uppercase">Trade Base Due</span>
                  <strong className="block text-slate-800 font-bold font-mono mt-1">{formatNaira(getAmountDue(printSlipTarget.category))}</strong>
                </div>
                <div className="bg-white border border-emerald-150 p-2.5 rounded-xl shadow-sm">
                  <span className="block text-[8.5px] font-mono text-slate-500 uppercase">Paid to Date</span>
                  <strong className="block text-emerald-700 font-black font-mono mt-1">{formatNaira(printSlipTarget.amountPaid || 0)}</strong>
                </div>
                <div className="bg-white border border-emerald-150 p-2.5 rounded-xl shadow-sm">
                  <span className="block text-[8.5px] font-mono text-slate-500 uppercase">Unpaid Balance</span>
                  <strong className={`block font-black font-mono mt-1 ${getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0) <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0) <= 0 
                      ? "₦0 (Cleared)" 
                      : formatNaira(getAmountDue(printSlipTarget.category) - (printSlipTarget.amountPaid || 0))}
                  </strong>
                </div>
              </div>
            </div>

            {/* Registered Operational Workers Segment */}
            <div className="border-t border-slate-300 pt-5 mb-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <h3 className="text-[10.5px] font-black uppercase tracking-wider text-slate-800 font-sans">REGISTERED OPERATIONAL PROMOTERS & STAFF</h3>
                <span className="text-[9.5px] font-mono text-slate-500 font-bold bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-xl shrink-0 select-none">
                  {printSlipTarget.workers.length} Onboarded Personnel
                </span>
              </div>

              {printSlipTarget.workers.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs italic">
                  No operational personnel or field representatives onboarded for this stall yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {printSlipTarget.workers.map((w) => (
                    <div key={w.id} className="p-3 border border-slate-200 bg-slate-50 rounded-2xl flex items-center gap-3 text-xs font-sans">
                      {w.photo && !w.photo.startsWith("preset:") ? (
                        <img 
                          src={getProxyImageUrl(w.photo)} 
                          alt={w.fullName} 
                          className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-300 shadow-xs" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${getPresetGradient(w.photo || "preset:emerald") || "from-teal-400 to-emerald-500"} shadow-xs flex items-center justify-center text-xs font-bold text-slate-950 shrink-0 border border-slate-300`}>
                          {w.fullName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-slate-900 truncate text-[11px] leading-tight">{w.fullName}</h4>
                        <p className="text-[9px] text-slate-500 leading-tight mt-0.5 font-medium">Role: <strong className="text-slate-850">{w.role}</strong></p>
                        <p className="text-[9px] text-slate-500 leading-tight font-mono">Cell: {w.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature columns with high fidelity legal seal representations */}
            <div className="mt-10 border-t border-slate-300 pt-6 flex justify-between items-end text-[10px] text-slate-700">
              <div className="text-center w-36">
                <div className="w-14 h-14 rounded-full border border-dashed border-emerald-600 text-emerald-600 flex flex-col items-center justify-center font-serif text-[7.5px] font-bold -rotate-12 mx-auto mb-2 select-none pointer-events-none uppercase">
                  <span>OFFICIAL</span>
                  <span>CONFIRMED</span>
                </div>
                <div className="border-t border-slate-450 pt-1 text-slate-500 font-sans uppercase font-bold text-[8.5px] select-none text-slate-400">STAFF EXAMINER</div>
              </div>

              <div className="text-center w-36">
                <span className="block font-serif italic text-slate-350 select-none pb-4 pointer-events-none">NYSC State Coordinator</span>
                <div className="border-t border-slate-450 pt-1 text-slate-500 font-sans uppercase font-bold text-[8.5px] select-none text-slate-400">STAMP COMMISSIONER</div>
              </div>
            </div>

            {/* Disclaimer Barcode and Instructions */}
            <div className="mt-10 border-t-2 border-slate-400 pt-4 text-center space-y-2">
              <p className="text-[7.5px] text-slate-450 leading-normal font-sans">
                Confirmation Notice: This slip acts as the official certification record proving stand validation and operational personnel clearance inside the NYSC Katsina Camp Market parameters. Present it to field inspection marshals on request. Use 'Save as PDF' option in your browser print system to download a file-backed variant.
              </p>
              <div className="flex justify-center gap-[1.5px] h-4 opacity-40 mt-1">
                {[1,3,1,4,2,1,1,3,2,1,2,4,1,2,1,3,1,1,4,2,2,1,3,1,2].map((w, idx) => (
                  <div key={idx} className="bg-slate-700" style={{ width: `${w}px` }} />
                ))}
              </div>
              <span className="block text-[6px] text-slate-400 mt-1 uppercase font-mono select-none">TACTICAL VERIFICATION BARCODE KEY</span>
            </div>

          </div>
        </div>
      )}

      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5 shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">Bridge Device Data Synchronizer</h3>
              </div>
              <button
                onClick={() => {
                  setShowSyncModal(false);
                  setSyncMessage(null);
                }}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl mb-4 shrink-0">
              <button
                onClick={() => {
                  setSyncDirection("export");
                  handleExportDataByJson();
                  setSyncMessage(null);
                }}
                className={`py-2 text-[10px] font-bold rounded-lg cursor-pointer transition-all truncate ${syncDirection === "export" ? 'bg-slate-900 text-emerald-400 border border-emerald-500/10' : 'text-slate-400 hover:text-slate-200'}`}
              >
                1. EXPORT
              </button>
              <button
                onClick={() => {
                  setSyncDirection("import");
                  setSyncString("");
                  setSyncMessage(null);
                }}
                className={`py-2 text-[10px] font-bold rounded-lg cursor-pointer transition-all truncate ${syncDirection === "import" ? 'bg-slate-900 text-emerald-400 border border-emerald-500/10' : 'text-slate-400 hover:text-slate-200'}`}
              >
                2. IMPORT
              </button>
              <button
                onClick={() => {
                  setSyncDirection("gateway");
                  setSyncMessage(null);
                }}
                className={`py-2 text-[10px] font-bold rounded-lg cursor-pointer transition-all truncate ${syncDirection === "gateway" ? 'bg-slate-900 text-emerald-400 border border-emerald-500/10' : 'text-slate-400 hover:text-slate-200'}`}
              >
                3. LINK DEVICE
              </button>
            </div>

            {/* Description */}
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4 shrink-0">
              {syncDirection === "export" 
                ? "If you have registered marketer stands on your mobile phone or at the campmarts.netlify.app domain, click the copy button below to prepare a Sync Code package of your local database registers." 
                : syncDirection === "import"
                  ? "Paste the exported Sync Code package from another phone, device, or fallback domain here to merge those registrations into the active server database."
                  : "Sync multi-device registers together in real-time by linking local devices directly to a centralized server Gateway URL."}
            </p>

            {/* Msg banner */}
            {syncMessage && (
              <div className={`p-3 rounded-xl border mb-4 text-xs ${syncMessage.type === "success" ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300' : 'bg-rose-950/40 border-rose-500/20 text-rose-300'} shrink-0`}>
                {syncMessage.text}
              </div>
            )}

            {/* Input area / Form */}
            <div className="flex-1 overflow-y-auto mb-5 min-h-[140px]">
              {syncDirection === "gateway" ? (
                <div className="space-y-4 p-4 bg-slate-950 rounded-2xl border border-slate-850 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-emerald-400 font-bold tracking-wider uppercase text-[9px]">Server Gateway Hub</label>
                    <p className="text-slate-400 leading-normal text-[11px]">
                      By default, devices connect directly to the server they are launched from. If you are on an offline mirror or static Netlify copy, you can link it directly to the master server below.
                    </p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-slate-450">Cloud Run Server URL</label>
                    <input
                      type="url"
                      value={customServerUrl}
                      onChange={(e) => setCustomServerUrl(e.target.value)}
                      placeholder="e.g. https://ais-pre-xxxxxxxx.run.app"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-slate-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">This Active Gateway:</div>
                    <div className="font-mono text-[11px] text-emerald-400 select-all overflow-x-auto whitespace-nowrap bg-slate-950/80 p-1.5 rounded-lg border border-slate-850">
                      {window.location.origin}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-normal pt-1">
                      💡 copy this Gateway URL above, and paste it into the "LINK DEVICE" Gateway URL on your phones or Netlify browser to link everyone to this central master registry database!
                    </div>
                  </div>
                </div>
              ) : (
                <textarea
                  readOnly={syncDirection === "export"}
                  value={syncString}
                  onChange={(e) => setSyncString(e.target.value)}
                  placeholder='Paste Sync Code JSON package here (starts with {"marketers": [...])...'
                  className="w-full h-full bg-slate-950 border border-slate-800 text-slate-350 p-4 rounded-2xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-[10px] resize-none"
                />
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 shrink-0">
              <button
                onClick={() => {
                  setShowSyncModal(false);
                  setSyncMessage(null);
                }}
                className="py-2 px-4 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold rounded-xl cursor-pointer transition-all"
              >
                Close
              </button>
              
              {syncDirection === "gateway" ? (
                <button
                  onClick={() => {
                    if (customServerUrl.trim()) {
                      localStorage.setItem("campmark_server_url", customServerUrl.trim());
                      setSyncMessage({ type: "success", text: "Successfully saved Server Gateway! Reloading the app to apply..." });
                    } else {
                      localStorage.removeItem("campmark_server_url");
                      setSyncMessage({ type: "success", text: "Reset to standard automatic relative API routing. Reloading..." });
                    }
                    setTimeout(() => {
                      window.location.reload();
                    }, 1200);
                  }}
                  className="py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Update & Link Device</span>
                </button>
              ) : syncDirection === "export" ? (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(syncString);
                    setSyncMessage({ type: "success", text: "Sync Code copied to clipboard! Share it with the Admin or import it." });
                  }}
                  disabled={!syncString}
                  className="py-2 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Copy Sync Code</span>
                </button>
              ) : (
                <button
                  onClick={handleImportDataByJson}
                  disabled={!syncString.trim()}
                  className="py-2 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Verify & Sync Now</span>
                </button>
              )}
            </div>
            
          </div>
        </div>
      )}

      {renderConfirmationSlipModals()}
    </div>
  );
}
