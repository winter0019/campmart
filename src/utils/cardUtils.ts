/**
 * Local Canvas rendering & PNG downloader for CampMark Operator ID Badges
 */

function getPresetGlowColors(presetName: string): [string, string] {
  const norm = (presetName || "").toLowerCase();
  if (norm === "emerald") return ["#34d399", "#14b8a6"];
  if (norm === "ocean") return ["#60a5fa", "#4f46e5"];
  if (norm === "sunset") return ["#fbbf24", "#e11d48"];
  if (norm === "purple") return ["#c084fc", "#db2777"];
  if (norm === "cyber") return ["#22d3ee", "#2563eb"];
  if (norm === "solar") return ["#fbbf24", "#ea580c"];
  return ["#94a3b8", "#475569"];
}

export function downloadIDCard(entity: {
  id: string;
  name?: string;
  fullName?: string;
  business?: string;
  businessName?: string;
  stand?: string;
  standNumber?: string;
  role?: string;
  category?: string;
  photo?: string;
  createdAt?: string;
}, side: "front" | "back") {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 632;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Basic styling configurations
  const primaryName = entity.fullName || entity.name || "Unknown Operator";
  const businessName = entity.business || entity.businessName || "Camp Market Vendor";
  const standNumber = entity.stand || entity.standNumber || "00-A";
  const roleName = entity.role || "Primary Registrant";
  const photoStr = entity.photo || "";
  const createdAtStr = entity.createdAt || new Date().toISOString();

  // Background Slate-900 style
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Fallback rounding method for older browsers
  const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  if (side === "front") {
    // 1. Emerald top strip
    const borderGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    borderGrad.addColorStop(0, "#10b981");
    borderGrad.addColorStop(0.5, "#14b8a6");
    borderGrad.addColorStop(1, "#3b82f6");
    ctx.fillStyle = borderGrad;
    ctx.fillRect(0, 0, canvas.width, 10);

    // 2. Header Box Background
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 10, canvas.width, 64);

    // 3. Header Texts
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("NYSC KATSINA CAMP MARKET", 24, 38);

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 7.5px monospace";
    ctx.fillText("CAMP MARKET & VENDOR ACCESS CLEARANCE", 24, 56);

    // ZONE 1-A badge pill
    ctx.fillStyle = "#064e40";
    drawRoundRect(canvas.width - 96, 26, 72, 26, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(16,185,129,0.2)";
    ctx.stroke();

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ZONE 1-A", canvas.width - 96 + 36, 42);
    ctx.textAlign = "left"; // Reset alignment

    // 4. Center Section Avatar Glow Ring
    const avatarX = canvas.width / 2 - 60;
    const avatarY = 110;
    const avatarSize = 120;

    const ringGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    ringGrad.addColorStop(0, "#10b981");
    ringGrad.addColorStop(1, "#3b82f6");
    ctx.fillStyle = ringGrad;
    drawRoundRect(avatarX - 4, avatarY - 4, avatarSize + 8, avatarSize + 8, 18);
    ctx.fill();

    const triggerFrontDownload = () => {
      // 5. Credentials Name
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(primaryName.toUpperCase(), canvas.width / 2, 276);

      // Role tag pill background
      ctx.fillStyle = "#020617";
      ctx.font = "bold 10px monospace";
      const txt = roleName.toUpperCase();
      const textWidth = ctx.measureText(txt).width;
      const px = 12;
      ctx.beginPath();
      drawRoundRect(canvas.width / 2 - (textWidth + px * 2) / 2, 296, textWidth + px * 2, 24, 12);
      ctx.fillStyle = "#020617";
      ctx.fill();
      ctx.strokeStyle = "#1e293b";
      ctx.stroke();

      // Pulsing status indicator dot inside card
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(canvas.width / 2 - textWidth / 2 - 2, 308, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "center";
      ctx.fillText(txt, canvas.width / 2 + 6, 311);

      // 6. Merchant / Shop Name
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Merchant: ${businessName}`, canvas.width / 2, 355);

      // 7. Footer Layout
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, canvas.height - 90, canvas.width, 90);
      ctx.strokeStyle = "#1e293b";
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 90);
      ctx.lineTo(canvas.width, canvas.height - 90);
      ctx.stroke();

      // Left stall
      ctx.textAlign = "left";
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("ASSIGNED STALLS", 24, canvas.height - 58);
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(`Stand ${standNumber}`, 24, canvas.height - 35);

      // Right Operator ID Code
      ctx.textAlign = "right";
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("OPERATOR ID NO", canvas.width - 24, canvas.height - 58);
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 14px monospace";
      ctx.fillText(entity.id, canvas.width - 24, canvas.height - 35);

      // Download file hook
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `ID_Front_${primaryName.replace(/\s+/g, "_")}_${entity.id}.png`;
      link.href = dataUrl;
      link.click();
    };

    if (!photoStr || photoStr.startsWith("preset:")) {
      const pName = photoStr ? photoStr.replace("preset:", "") : "emerald";
      const [c1, c2] = getPresetGlowColors(pName);
      const faceGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
      faceGrad.addColorStop(0, c1);
      faceGrad.addColorStop(1, c2);

      ctx.fillStyle = faceGrad;
      drawRoundRect(avatarX, avatarY, avatarSize, avatarSize, 14);
      ctx.fill();

      // Draw Initials
      ctx.fillStyle = "#020617";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(primaryName.slice(0, 2).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 15);
      triggerFrontDownload();
    } else {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = photoStr;
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        drawRoundRect(avatarX, avatarY, avatarSize, avatarSize, 14);
        ctx.clip();
        ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
        triggerFrontDownload();
      };
      img.onerror = () => {
        // Fallback default gradient
        const fallbackGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
        fallbackGrad.addColorStop(0, "#3b82f6");
        fallbackGrad.addColorStop(1, "#1d4ed8");
        ctx.fillStyle = fallbackGrad;
        drawRoundRect(avatarX, avatarY, avatarSize, avatarSize, 14);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 44px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(primaryName.slice(0, 2).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 15);
        triggerFrontDownload();
      };
    }

  } else {
    // 1. Magnetic tape slot at the top
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 32, canvas.width, 42);
    ctx.fillStyle = "#475569";
    ctx.font = "bold 8px monospace";
    ctx.fillText("SECURE INTEGRATED MAGNETIC AUDIT TAG", 24, 57);

    // 2. Disclaimers Box
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    
    const lines = [
      "This credential is an official delegation for the NYSC",
      "Katsina State Camp Market event permissions. It remains",
      "the personal property of Camp Administration.",
      "",
      "Bearer must showcase this identifier badge at all",
      "checkpoints. Alteration, replication, or delegation",
      "is subject to full clearance revocation."
    ];

    let startY = 115;
    lines.forEach(l => {
      ctx.fillText(l, 24, startY);
      startY += 18;
    });

    // Sub info separator line
    ctx.strokeStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(24, startY + 10);
    ctx.lineTo(canvas.width - 24, startY + 10);
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`ISSUED ON: ${new Date(createdAtStr).toLocaleDateString()}`, 24, startY + 32);
    ctx.textAlign = "right";
    ctx.fillText("SECURITY REF: CP-Z1", canvas.width - 24, startY + 32);
    ctx.textAlign = "left"; // Reset align

    // 3. Signature & QR Code Zone
    const bottomAreaY = 412;
    
    // Draw QR Code square simulator
    ctx.fillStyle = "#ffffff";
    drawRoundRect(24, bottomAreaY, 72, 72, 12);
    ctx.fill();

    // Draw little inner square patterns
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(32, bottomAreaY + 8, 16, 16);
    ctx.fillRect(36, bottomAreaY + 12, 8, 8);
    ctx.fillRect(68, bottomAreaY + 8, 16, 16);
    ctx.fillRect(72, bottomAreaY + 12, 8, 8);
    ctx.fillRect(32, bottomAreaY + 48, 16, 16);
    ctx.fillRect(36, bottomAreaY + 52, 8, 8);
    ctx.fillRect(52, bottomAreaY + 16, 8, 8);
    ctx.fillRect(58, bottomAreaY + 32, 8, 8);
    ctx.fillRect(68, bottomAreaY + 48, 16, 16);
    ctx.fillRect(72, bottomAreaY + 52, 8, 8);

    // Signature label
    ctx.textAlign = "right";
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 9px monospace";
    ctx.fillText("HEAD OF CAMP MARKET", canvas.width - 24, bottomAreaY + 10);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "italic 16px serif";
    ctx.fillText("Idris Dangalan", canvas.width - 32, bottomAreaY + 38);

    ctx.strokeStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(canvas.width - 130, bottomAreaY + 46);
    ctx.lineTo(canvas.width - 24, bottomAreaY + 46);
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "9px sans-serif";
    ctx.fillText("Audit Signature Verified", canvas.width - 24, bottomAreaY + 60);

    // 4. Barcode bottom area
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, canvas.height - 70, canvas.width, 70);
    ctx.strokeStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 70);
    ctx.lineTo(canvas.width, canvas.height - 70);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 8px monospace";
    ctx.fillText("CAMP CODE CERTIFICATE CLEARANCE ACTIVATED", canvas.width / 2, canvas.height - 48);

    // Draw barcode stripes
    const barXStart = canvas.width / 2 - 120;
    const barY = canvas.height - 35;
    const barWLayout = [1,3,1,4,2,1,1,3,2,1,2,4,1,2,1,3,1,1,4,2,2,1,3,1,2,3,1,1,4,1,2,4];
    let currentBarX = barXStart;
    ctx.fillStyle = "#64748b";
    barWLayout.forEach(w => {
      ctx.fillRect(currentBarX, barY, w * 1.5, 15);
      currentBarX += w * 1.5 + 2.5;
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `ID_Back_${primaryName.replace(/\s+/g, "_")}_${entity.id}.png`;
    link.href = dataUrl;
    link.click();
  }
}

export function downloadCombinedIDCard(entity: {
  id: string;
  name?: string;
  fullName?: string;
  business?: string;
  businessName?: string;
  stand?: string;
  standNumber?: string;
  role?: string;
  category?: string;
  photo?: string;
  createdAt?: string;
}) {
  const canvas = document.createElement("canvas");
  // Side-by-side template: 400px (front) + 20px (divider) + 400px (back) = 820px width
  canvas.width = 820;
  canvas.height = 632;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const primaryName = entity.fullName || entity.name || "Unknown Operator";
  const businessName = entity.business || entity.businessName || "Camp Market Vendor";
  const standNumber = entity.stand || entity.standNumber || "00-A";
  const roleName = entity.role || "Primary Registrant";
  const photoStr = entity.photo || "";
  const createdAtStr = entity.createdAt || new Date().toISOString();

  // Draw master deep sheet background covering divider padding
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const drawFront = (xOffset: number, onComplete: () => void) => {
    // Front card container bg
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(xOffset, 0, 400, 632);

    // Front top border gradient
    const borderGrad = ctx.createLinearGradient(xOffset, 0, xOffset + 400, 0);
    borderGrad.addColorStop(0, "#10b981");
    borderGrad.addColorStop(0.5, "#14b8a6");
    borderGrad.addColorStop(1, "#3b82f6");
    ctx.fillStyle = borderGrad;
    ctx.fillRect(xOffset, 0, 400, 10);

    // Header Background
    ctx.fillStyle = "#020617";
    ctx.fillRect(xOffset, 10, 400, 64);

    // Header Texts
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("NYSC KATSINA CAMP MARKET", xOffset + 24, 38);

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 7.5px monospace";
    ctx.fillText("CAMP MARKET & VENDOR ACCESS CLEARANCE", xOffset + 24, 56);

    // ZONE 1-A badge pill
    ctx.fillStyle = "#064e40";
    drawRoundRect(xOffset + 400 - 96, 26, 72, 26, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(16,185,129,0.2)";
    ctx.stroke();

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 11px monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("ZONE 1-A", xOffset + 400 - 96 + 36, 39);
    ctx.textBaseline = "alphabetic"; // Reset

    // Center Avatar Glow Ring
    const avatarX = xOffset + 400 / 2 - 60;
    const avatarY = 110;
    const avatarSize = 120;

    const ringGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    ringGrad.addColorStop(0, "#10b981");
    ringGrad.addColorStop(1, "#3b82f6");
    ctx.fillStyle = ringGrad;
    drawRoundRect(avatarX - 4, avatarY - 4, avatarSize + 8, avatarSize + 8, 18);
    ctx.fill();

    const drawFrontDetails = () => {
      // Name
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(primaryName.toUpperCase(), xOffset + 400 / 2, 276);

      // Role tag pill background
      ctx.fillStyle = "#020617";
      ctx.font = "bold 10px monospace";
      const txt = roleName.toUpperCase();
      const textWidth = ctx.measureText(txt).width;
      const px = 12;
      ctx.beginPath();
      drawRoundRect(xOffset + 400 / 2 - (textWidth + px * 2) / 2, 296, textWidth + px * 2, 24, 12);
      ctx.fillStyle = "#020617";
      ctx.fill();
      ctx.strokeStyle = "#1e293b";
      ctx.stroke();

      // Pulsing status dot
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(xOffset + 400 / 2 - textWidth / 2 - 2, 308, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "center";
      ctx.fillText(txt, xOffset + 400 / 2 + 6, 311);

      // Merchant
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Merchant: ${businessName}`, xOffset + 400 / 2, 355);

      // Footer layout
      ctx.fillStyle = "#020617";
      ctx.fillRect(xOffset, 632 - 90, 400, 90);
      ctx.strokeStyle = "#1e293b";
      ctx.beginPath();
      ctx.moveTo(xOffset, 632 - 90);
      ctx.lineTo(xOffset + 400, 632 - 90);
      ctx.stroke();

      // Left stall
      ctx.textAlign = "left";
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("ASSIGNED STALLS", xOffset + 24, 632 - 58);
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(`Stand ${standNumber}`, xOffset + 24, 632 - 35);

      // Right Operator ID
      ctx.textAlign = "right";
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("OPERATOR ID NO", xOffset + 400 - 24, 632 - 58);
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 14px monospace";
      ctx.fillText(entity.id, xOffset + 400 - 24, 632 - 35);

      onComplete();
    };

    if (!photoStr || photoStr.startsWith("preset:")) {
      const pName = photoStr ? photoStr.replace("preset:", "") : "emerald";
      const [c1, c2] = getPresetGlowColors(pName);
      const faceGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
      faceGrad.addColorStop(0, c1);
      faceGrad.addColorStop(1, c2);

      ctx.fillStyle = faceGrad;
      drawRoundRect(avatarX, avatarY, avatarSize, avatarSize, 14);
      ctx.fill();

      // Initials text centered
      ctx.fillStyle = "#020617";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(primaryName.slice(0, 2).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
      ctx.textBaseline = "alphabetic"; // Reset
      drawFrontDetails();
    } else {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = photoStr;
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        drawRoundRect(avatarX, avatarY, avatarSize, avatarSize, 14);
        ctx.clip();
        ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
        drawFrontDetails();
      };
      img.onerror = () => {
        const fallbackGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
        fallbackGrad.addColorStop(0, "#3b82f6");
        fallbackGrad.addColorStop(1, "#1d4ed8");
        ctx.fillStyle = fallbackGrad;
        drawRoundRect(avatarX, avatarY, avatarSize, avatarSize, 14);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 44px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(primaryName.slice(0, 2).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
        ctx.textBaseline = "alphabetic"; // Reset
        drawFrontDetails();
      };
    }
  };

  const drawBack = (xOffset: number) => {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(xOffset, 0, 400, 632);

    // Magnetic band top strip
    ctx.fillStyle = "#020617";
    ctx.fillRect(xOffset, 32, 400, 42);
    ctx.fillStyle = "#475569";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SECURE INTEGRATED MAGNETIC AUDIT TAG", xOffset + 24, 57);

    // Legal disclaimers text block
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    const lines = [
      "This credential is an official delegation for the NYSC",
      "Katsina State Camp Market event permissions. It remains",
      "the personal property of Camp Administration.",
      "",
      "Bearer must showcase this identifier badge at all",
      "checkpoints. Alteration, replication, or delegation",
      "is subject to full clearance revocation."
    ];

    let startY = 115;
    lines.forEach(l => {
      ctx.fillText(l, xOffset + 24, startY);
      startY += 18;
    });

    // Separation Rule border lines
    ctx.strokeStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(xOffset + 24, startY + 10);
    ctx.lineTo(xOffset + 400 - 24, startY + 10);
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`ISSUED ON: ${new Date(createdAtStr).toLocaleDateString()}`, xOffset + 24, startY + 32);
    ctx.textAlign = "right";
    ctx.fillText("SECURITY REF: CP-Z1", xOffset + 400 - 24, startY + 32);

    // Signature Area coordinates
    const bottomAreaY = 412;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    drawRoundRect(xOffset + 24, bottomAreaY, 72, 72, 12);
    ctx.fill();

    // Simulated QR pattern
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(xOffset + 32, bottomAreaY + 8, 16, 16);
    ctx.fillRect(xOffset + 36, bottomAreaY + 12, 8, 8);
    ctx.fillRect(xOffset + 68, bottomAreaY + 8, 16, 16);
    ctx.fillRect(xOffset + 72, bottomAreaY + 12, 8, 8);
    ctx.fillRect(xOffset + 32, bottomAreaY + 48, 16, 16);
    ctx.fillRect(xOffset + 36, bottomAreaY + 52, 8, 8);
    ctx.fillRect(xOffset + 52, bottomAreaY + 16, 8, 8);
    ctx.fillRect(xOffset + 58, bottomAreaY + 32, 8, 8);
    ctx.fillRect(xOffset + 68, bottomAreaY + 48, 16, 16);
    ctx.fillRect(xOffset + 72, bottomAreaY + 52, 8, 8);

    // Supervisor verification lines
    ctx.textAlign = "right";
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 9px monospace";
    ctx.fillText("HEAD OF CAMP MARKET", xOffset + 400 - 24, bottomAreaY + 10);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "italic 16px serif";
    ctx.fillText("Idris Dangalan", xOffset + 400 - 32, bottomAreaY + 38);

    ctx.strokeStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(xOffset + 400 - 130, bottomAreaY + 46);
    ctx.lineTo(xOffset + 400 - 24, bottomAreaY + 46);
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "9px sans-serif";
    ctx.fillText("Audit Signature Verified", xOffset + 400 - 24, bottomAreaY + 60);

    // Foot Barcode stripes
    ctx.fillStyle = "#020617";
    ctx.fillRect(xOffset, 632 - 70, 400, 70);
    ctx.strokeStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(xOffset, 632 - 70);
    ctx.lineTo(xOffset + 400, 632 - 70);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 8px monospace";
    ctx.fillText("CAMP CODE CERTIFICATE CLEARANCE ACTIVATED", xOffset + 400 / 2, 632 - 48);

    const barXStart = xOffset + 400 / 2 - 120;
    const barY = 632 - 35;
    const barWLayout = [1,3,1,4,2,1,1,3,2,1,2,4,1,2,1,3,1,1,4,2,2,1,3,1,2,3,1,1,4,1,2,4];
    let currentBarX = barXStart;
    ctx.fillStyle = "#64748b";
    barWLayout.forEach(w => {
      ctx.fillRect(currentBarX, barY, w * 1.5, 15);
      currentBarX += w * 1.5 + 2.5;
    });
  };

  // Draw front side starting at 0, divider of 20px, then draw back side starting at 420px.
  drawFront(0, () => {
    drawBack(420);

    // Fire actual browser download for single combined sheet!
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `ID_Badge_Combined_${primaryName.replace(/\s+/g, "_")}_${entity.id}.png`;
    link.href = dataUrl;
    link.click();
  });
}

