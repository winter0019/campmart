// Pricing table for CampMark trades in Naira (₦)
export const TRADE_PRICES: Record<string, number> = {
  "tailor": 25000,
  "restaurant": 60000,
  "photocopy": 60000,
  "pos": 60000,
  "photographer": 40000,
  "laundry (male hostel)": 25000,
  "provision": 40000,
  "fast food": 25000,
  "laundry (female hostel)": 10000,
  "customizing": 26000,
  "saloon": 12000,
  "welfare/old cooperative": 20000,
  "akara": 10000,
  "video coverage": 22000,
  "barbing": 12000,
  "charging": 25000,
  "barbique": 10000,
  "hot water": 5000,
  "pharmacy": 5000,
  "jewellery": 10000,
  "kunu": 5000,
  "herbs": 10000,
  "shoe seller": 6000,
  "cap": 5000,
  "meat": 15000,
  "fruit": 10000,
  "shoe shinner": 5000,
  "clothing": 15000,
  "stick meat": 5000,
  "awara": 5000,
  "drinks": 10000,
  "snacks": 10000,
  "new cooperative": 30000,
  "sweet vendor": 4000,
  "fan milk": 3000,
  "charger vendor": 5000,
  "hanna": 2000,
  "renting": 10000,
  "fulani dress vendor": 7000
};

/**
 * Returns the price due for a given trade/category.
 * Case-insensitive lookup. Defaults to 5,000 ₦ if not specifically matching.
 */
export function getAmountDue(category: string): number {
  if (!category) return 5000;
  const key = category.trim().toLowerCase();
  
  // Try direct match
  if (TRADE_PRICES[key] !== undefined) {
    return TRADE_PRICES[key];
  }

  // Try substring lookup
  for (const [trade, price] of Object.entries(TRADE_PRICES)) {
    if (key.includes(trade) || trade.includes(key)) {
      return price;
    }
  }

  return 5000; // default rate
}

/**
 * Fast currency formatter for Naira symbols.
 */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

/**
 * Renders an official state stamp-approved tax clearance receipt as a PNG image using the HTML5 Canvas API in-browser.
 * This completely resolves any window.print() blockers imposed inside sandbox iframes.
 */
export function downloadReceiptImage(entity: {
  id: string;
  fullName?: string;
  businessName?: string;
  category?: string;
  standNumber?: string;
  amountPaid?: number;
  createdAt?: string;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 560;
  canvas.height = 760;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const fName = entity.fullName || "Unspecified Representative";
  const bName = entity.businessName || "Unspecified Business";
  const category = entity.category || "General Trade Service";
  const standNo = entity.standNumber || "00-A";
  const amountPaid = entity.amountPaid || 0;
  const rateExpected = getAmountDue(category);
  const balance = rateExpected - amountPaid;
  const createdDate = entity.createdAt ? new Date(entity.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

  // Draw background (invoice paper color)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border frame
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  // Inner dotted border
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  ctx.setLineDash([]); // Reset line dash

  // Watermark stamp in center representing state security clearance
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2 + 30);
  ctx.rotate(-Math.PI / 12);
  ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NYSC KATSINA", 0, -20);
  ctx.fillText("CAMP MARKET", 0, 40);
  ctx.restore();

  // Header Title
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.font = "bold 15px monospace";
  ctx.fillText("NYSC KATSINA OFFICIAL REVENUE RECEIPT", canvas.width / 2, 65);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 9px sans-serif";
  ctx.fillText("NYSC CAMP REVENUE COLLECTION BUREAU • KATSINA STATE", canvas.width / 2, 85);

  // Divider line
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(35, 105);
  ctx.lineTo(canvas.width - 35, 105);
  ctx.stroke();

  // Meta stats Row
  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 10px monospace";
  ctx.fillText(`RECEIPT REF: REC-${entity.id.substring(4).toUpperCase()}`, 40, 130);
  ctx.textAlign = "right";
  ctx.fillText(`DATE OF AUDIT: ${createdDate}`, canvas.width - 40, 130);

  // Details Area
  ctx.textAlign = "left";
  let curY = 180;
  const drawRow = (label: string, value: string, boldValue = true) => {
    ctx.fillStyle = "#64748b";
    ctx.font = "500 11px sans-serif";
    ctx.fillText(label, 40, curY);

    ctx.fillStyle = "#0f172a";
    ctx.font = boldValue ? "bold 12px monospace" : "500 12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(value.toUpperCase(), canvas.width - 40, curY);
    ctx.textAlign = "left"; // reset

    curY += 15;
    ctx.strokeStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.moveTo(40, curY);
    ctx.lineTo(canvas.width - 40, curY);
    ctx.stroke();
    curY += 24;
  };

  drawRow("REGISTERED LESSEE/MARKETER:", fName);
  drawRow("BUSINESS REGISTERED BRAND:", bName);
  drawRow("EXHIBITION TRADE CATEGORY:", category);
  drawRow("DESIGNATED STAND NUMBER:", `STAND ${standNo}`);

  curY += 10;

  // Solid Box for financials
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(40, curY, canvas.width - 80, 140);
  ctx.strokeStyle = "#e2e8f0";
  ctx.strokeRect(40, curY, canvas.width - 80, 140);

  // Dues & Payments Text lines inside solid box
  ctx.fillStyle = "#475569";
  ctx.font = "bold 10px monospace";
  ctx.fillText("MUNICIPAL DUES SUMMARY", 55, curY + 25);

  ctx.font = "500 11px sans-serif";
  ctx.fillText("Base Trade Permit Fee Assessment:", 55, curY + 55);
  ctx.textAlign = "right";
  ctx.fillText(`₦${rateExpected.toLocaleString()}.00`, canvas.width - 55, curY + 55);

  ctx.textAlign = "left";
  ctx.fillStyle = "#047857";
  ctx.fillText("Amount Paid / Credited to ledger:", 55, curY + 85);
  ctx.textAlign = "right";
  ctx.font = "bold 12px monospace";
  ctx.fillText(`₦${amountPaid.toLocaleString()}.00`, canvas.width - 55, curY + 85);

  ctx.textAlign = "left";
  ctx.fillStyle = "#b91c1c";
  ctx.font = "500 11px sans-serif";
  const balanceLabel = balance <= 0 ? "LEDGER STANDING CLEARANCE STATUS:" : "REMAINING UNPAID OUTSTANDING:";
  ctx.fillText(balanceLabel, 55, curY + 115);
  ctx.textAlign = "right";
  ctx.font = "bold 12px monospace";
  const balanceValue = balance <= 0 ? "FULLY CLEARED (₦0)" : `₦${balance.toLocaleString()}.00`;
  ctx.fillStyle = balance <= 0 ? "#047857" : "#b91c1c";
  ctx.fillText(balanceValue, canvas.width - 55, curY + 115);

  // Reset Alignment
  ctx.textAlign = "left";

  curY += 185;

  // Signatures / Stamps Circles
  // Let's draw an official-looking state revenue commission seal
  const stampX1 = 120;
  const stampY = curY + 40;

  ctx.strokeStyle = "#047857";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(stampX1, stampY, 32, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = "#047857";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.arc(stampX1, stampY, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.font = "bold 7px monospace";
  ctx.fillStyle = "#047857";
  ctx.textAlign = "center";
  ctx.fillText("REVENUE", stampX1, stampY - 8);
  ctx.fillText("APPROVED", stampX1, stampY + 2);
  ctx.fillText("STAMP CP", stampX1, stampY + 12);

  // Stamp 2 Commissioner
  const stampX2 = canvas.width - 120;
  ctx.strokeStyle = "#1e3a8a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(stampX2, stampY, 32, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#1e3a8a";
  ctx.font = "bold 7px monospace";
  ctx.fillText("NYSC KATSINA", stampX2, stampY - 8);
  ctx.fillText("AUDITED OK", stampX2, stampY + 2);
  ctx.fillText("RECEIPT STAMP", stampX2, stampY + 12);

  // Supervisor Signature Line
  ctx.textAlign = "center";
  ctx.fillStyle = "#64748b";
  ctx.font = "italic 11px serif";
  ctx.fillText("Idris Dangalan", stampX2, stampY - 48);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(stampX2 - 50, stampY - 42);
  ctx.lineTo(stampX2 + 50, stampY - 42);
  ctx.stroke();
  ctx.font = "8px sans-serif";
  ctx.fillText("HEAD OF CAMP MARKET", stampX2, stampY - 33);

  // Barcode representation
  const barcodeY = canvas.height - 75;
  ctx.fillStyle = "#0f172a";
  const codeLayout = [2,1,4,2,1,3,1,1,4,2,1,1,3,2,1,2,4,1,2,1,3,2,1,4,3,1,1,2,4,1];
  let barCurrentX = canvas.width / 2 - 120;
  codeLayout.forEach(w => {
    ctx.fillRect(barCurrentX, barcodeY, w * 1.6, 22);
    barCurrentX += (w * 1.6) + 3;
  });

  ctx.fillStyle = "#475569";
  ctx.font = "8px monospace";
  ctx.fillText(`*REC-${entity.id.substring(4).toUpperCase()}*`, canvas.width / 2, barcodeY + 34);

  // Legal footer disclaimer
  ctx.fillText("Duplicity or unnotified alteration of this document results in general cancellation.", canvas.width / 2, barcodeY + 46);

  // Fire receipt file download triggered by browser client
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `NYSC_Katsina_Receipt_${bName.replace(/\s+/g, "_")}_${entity.id}.png`;
  link.href = dataUrl;
  link.click();
}
