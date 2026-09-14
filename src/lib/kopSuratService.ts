import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getLocalBlob, saveLocalBlob } from './localBlobStorage';

/**
 * All 21 geometric facet polygons matching the official PT. SMK letterhead top-right crystal ribbon
 */
const FACET_POLYGONS: Array<{ points: number[][]; color: [number, number, number] }> = [
  // Upper Right Outer Facets
  { points: [[320, 0], [320, 110], [230, 40]], color: [0, 0.588, 0.78] },      // #0096c7
  { points: [[320, 0], [230, 40], [180, 0]], color: [0.282, 0.792, 0.894] },     // #48cae4
  { points: [[180, 0], [230, 40], [130, 0]], color: [0.565, 0.878, 0.937] },     // #90e0ef
  { points: [[130, 0], [230, 40], [160, 70]], color: [0.678, 0.91, 0.957] },     // #ade8f4
  { points: [[130, 0], [160, 70], [90, 30]], color: [0.792, 0.941, 0.973] },     // #caf0f8
  { points: [[90, 30], [160, 70], [60, 70]], color: [0.878, 0.969, 0.98] },      // #e0f7fa
  { points: [[90, 30], [60, 70], [30, 10]], color: [0.878, 0.988, 1.0] },        // #e0fcff
  
  // Middle Facets
  { points: [[230, 40], [320, 110], [245, 130]], color: [0, 0.467, 0.714] },     // #0077b6
  { points: [[320, 110], [320, 195], [270, 165]], color: [0.008, 0.243, 0.541] },// #023e8a
  { points: [[320, 110], [270, 165], [245, 130]], color: [0, 0.588, 0.78] },     // #0096c7
  { points: [[320, 195], [320, 250], [285, 220]], color: [0.012, 0.016, 0.369] },// #03045e
  { points: [[320, 195], [285, 220], [270, 165]], color: [0.008, 0.243, 0.541] },// #023e8a
  { points: [[270, 165], [285, 220], [230, 190]], color: [0, 0.467, 0.714] },    // #0077b6
  
  // Lower-left Transition Facets
  { points: [[160, 70], [230, 40], [245, 130]], color: [0, 0.706, 0.847] },     // #00b4d8
  { points: [[160, 70], [245, 130], [190, 140]], color: [0.282, 0.792, 0.894] }, // #48cae4
  { points: [[245, 130], [270, 165], [230, 190]], color: [0, 0.588, 0.78] },    // #0096c7
  { points: [[245, 130], [230, 190], [190, 140]], color: [0, 0.706, 0.847] },    // #00b4d8
  { points: [[60, 70], [160, 70], [120, 120]], color: [0.698, 0.922, 0.949] },   // #b2ebf2
  { points: [[160, 70], [190, 140], [120, 120]], color: [0.502, 0.871, 0.918] }, // #80deea
  { points: [[120, 120], [190, 140], [150, 185]], color: [0.302, 0.816, 0.882] },// #4dd0e1
  { points: [[190, 140], [230, 190], [150, 185]], color: [0.149, 0.776, 0.855] } // #26c6da
];

let cachedBaseKopSuratBytes: Uint8Array | null = null;

/**
 * Generates an authentic, vector-sharp A4 Kop Surat PDF with the official:
 * - SMK circular logo on top left
 * - Centered company name and lab subtitle
 * - KAN accreditation mark with red tick on top right
 * - Top-right blue faceted crystal ribbon graphic
 * - Official 3-column footer (Alamat | No. Telephone & HOTLINE | E-mail)
 */
export async function generateAuthenticKopSuratPdfBytes(): Promise<Uint8Array> {
  if (cachedBaseKopSuratBytes) {
    return cachedBaseKopSuratBytes;
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);

  // 1. Top-Right Decorative Faceted Crystal Ribbon
  const ribbonScale = 0.52;
  for (const facet of FACET_POLYGONS) {
    const path = "M " + facet.points.map(([sx, sy]) => {
      const px = width - (320 - sx) * ribbonScale;
      const py = height - sy * ribbonScale;
      return `${px.toFixed(2)} ${py.toFixed(2)}`;
    }).join(" L ") + " Z";
    page.drawSvgPath(path, { color: rgb(facet.color[0], facet.color[1], facet.color[2]) });
  }

  // 2. SMK Logo on Top Left
  const logoCenterX = 76;
  const logoCenterY = height - 58;
  const logoRadius = 24;

  // Outer circular ring with cyan/blue
  page.drawCircle({
    x: logoCenterX,
    y: logoCenterY,
    size: logoRadius,
    color: rgb(0.96, 0.98, 1),
    borderColor: rgb(0, 0.46, 0.71),
    borderWidth: 2
  });
  // Inner metallic / cyan arc
  page.drawCircle({
    x: logoCenterX,
    y: logoCenterY,
    size: logoRadius - 4,
    color: rgb(0.88, 0.94, 0.98),
    borderColor: rgb(0, 0.7, 0.85),
    borderWidth: 1.2
  });

  // Red circular orbit accent (ikon bulat biru-merah)
  page.drawSvgPath(
    `M ${logoCenterX - 18} ${logoCenterY - 6} C ${logoCenterX - 10} ${logoCenterY + 22}, ${logoCenterX + 16} ${logoCenterY + 18}, ${logoCenterX + 22} ${logoCenterY + 4} C ${logoCenterX + 16} ${logoCenterY + 14}, ${logoCenterX - 8} ${logoCenterY + 16}, ${logoCenterX - 18} ${logoCenterY - 6} Z`,
    { color: rgb(0.85, 0.02, 0.16) }
  );

  // Blue lower orbit swoosh
  page.drawSvgPath(
    `M ${logoCenterX - 22} ${logoCenterY - 2} C ${logoCenterX - 14} ${logoCenterY - 22}, ${logoCenterX + 12} ${logoCenterY - 20}, ${logoCenterX + 20} ${logoCenterY - 6} C ${logoCenterX + 12} ${logoCenterY - 14}, ${logoCenterX - 10} ${logoCenterY - 15}, ${logoCenterX - 22} ${logoCenterY - 2} Z`,
    { color: rgb(0.01, 0.35, 0.65) }
  );

  // Central "SMK" text
  page.drawText("SMK", {
    x: logoCenterX - 13,
    y: logoCenterY - 4,
    size: 10.5,
    font: fontBold,
    color: rgb(0.04, 0.25, 0.45)
  });

  // 3. Centered Company Title & Subtitle
  const titleText = "PT. SARANA MULTI KALIBRASI";
  const titleSize = 17;
  const titleW = fontBold.widthOfTextAtSize(titleText, titleSize);
  page.drawText(titleText, {
    x: (width - titleW) / 2,
    y: height - 50,
    size: titleSize,
    font: fontBold,
    color: rgb(0.04, 0.04, 0.05)
  });

  const subText = "Laboratorium Kalibrasi";
  const subSize = 12;
  const subW = fontBold.widthOfTextAtSize(subText, subSize);
  page.drawText(subText, {
    x: (width - subW) / 2,
    y: height - 66,
    size: subSize,
    font: fontBold,
    color: rgb(0.12, 0.12, 0.14)
  });

  // 4. KAN Accreditation Badge on Top Right
  const kanX = width - 110;
  const kanY = height - 54;

  // Red Checkmark Tick
  const tickScale = 0.55;
  const tickPoints: number[][] = [[2, 12], [8, 22], [22, 3], [18, 1], [8, 16], [5, 10]];
  const tickPath = "M " + tickPoints.map(([tx, ty]) => {
    return `${(kanX + tx * tickScale).toFixed(2)} ${(kanY + (16 - ty) * tickScale).toFixed(2)}`;
  }).join(" L ") + " Z";
  page.drawSvgPath(tickPath, { color: rgb(0.85, 0.02, 0.16) });

  // KAN bold text
  page.drawText("KAN", {
    x: kanX + 16,
    y: kanY + 2,
    size: 13,
    font: fontBold,
    color: rgb(0.04, 0.3, 0.61)
  });

  // Subtitle: Komite Akreditasi Nasional
  page.drawText("Komite Akreditasi Nasional", {
    x: kanX - 12,
    y: kanY - 9,
    size: 6.8,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1)
  });

  // LK-532-IDN
  page.drawText("LK-532-IDN", {
    x: kanX + 5,
    y: kanY - 18,
    size: 7.8,
    font: fontBold,
    color: rgb(0.05, 0.05, 0.05)
  });

  // 5. 3-Column Footer
  const footerY = 50;
  page.drawLine({
    start: { x: 42, y: footerY + 24 },
    end: { x: width - 42, y: footerY + 24 },
    thickness: 1,
    color: rgb(0, 0, 0)
  });

  // Column 1: Alamat
  page.drawText("Alamat:", { x: 42, y: footerY + 11, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText("Jl. Kenari 3 No. A3, Ngipang RT 005/ RW 017,", { x: 42, y: footerY, size: 7.2, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  page.drawText("Kadipiro, Banjarsari, Kota Surakarta, Jawa Tengah,", { x: 42, y: footerY - 10, size: 7.2, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  page.drawText("Indonesia", { x: 42, y: footerY - 20, size: 7.2, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

  // Column 2: No. Telephone & HOTLINE
  const col2X = 260;
  page.drawText("No. Telephone & HOTLINE:", { x: col2X, y: footerY + 11, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText("Telephone : (0271) 2023035", { x: col2X, y: footerY, size: 7.2, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  page.drawText("WhatsApp : (0851) 1234570", { x: col2X, y: footerY - 10, size: 7.2, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

  // Column 3: E-mail
  const col3X = 425;
  page.drawText("E-mail :", { x: col3X, y: footerY + 11, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText("ptsaranamultikalibrasi@gmail.com", { x: col3X, y: footerY, size: 7.2, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  page.drawText("aptsaranamultikalibrasi@gmail.com", { x: col3X, y: footerY - 10, size: 7.2, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

  const bytes = await pdfDoc.save();
  cachedBaseKopSuratBytes = bytes;
  return bytes;
}

/**
 * Returns Base64 Data URL of the authentic Kop Surat PDF
 */
export async function getAuthenticKopSuratBase64(): Promise<string> {
  const bytes = await generateAuthenticKopSuratPdfBytes();
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:application/pdf;base64,${btoa(binary)}`;
}

/**
 * Resolves the active Kop Surat PDF bytes, prioritizing:
 * 1. Explicit parameter url (user-provided or passed from template config)
 * 2. User-uploaded PDF in localStorage ('smk_kop_surat_pdf' or 'kop_surat_pdf')
 * 3. Default authentic vector Kop Surat PDF
 */
export async function resolveActiveKopSuratPdfBytes(preferredUrl?: string | null): Promise<Uint8Array> {
  const candidates: string[] = [];

  if (preferredUrl && preferredUrl.trim()) {
    candidates.push(preferredUrl.trim());
  }

  try {
    const localUploaded = localStorage.getItem('smk_kop_surat_pdf');
    if (localUploaded && !candidates.includes(localUploaded)) {
      candidates.push(localUploaded);
    }
  } catch {
    // ignore localStorage errors
  }

  try {
    const fallbackUploaded = localStorage.getItem('kop_surat_pdf');
    if (fallbackUploaded && !candidates.includes(fallbackUploaded)) {
      candidates.push(fallbackUploaded);
    }
  } catch {
    // ignore
  }

  for (const candidate of candidates) {
    try {
      let resolvedCandidate = candidate;
      if (candidate.startsWith('idb://')) {
        resolvedCandidate = await getLocalBlob(candidate);
      }

      if (resolvedCandidate.startsWith('data:application/pdf') || resolvedCandidate.includes('application/pdf')) {
        const base64 = resolvedCandidate.split(',')[1];
        if (base64 && base64.length > 100) {
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          // Validate with PDFDocument.load
          const testDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          if (testDoc.getPageCount() > 0) {
            return bytes;
          }
        }
      } else if (resolvedCandidate.startsWith('http://') || resolvedCandidate.startsWith('https://')) {
        const res = await fetch(resolvedCandidate);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const bytes = new Uint8Array(ab);
          const testDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          if (testDoc.getPageCount() > 0) {
            return bytes;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse candidate letterhead PDF, checking next:', e);
    }
  }

  // Fallback to our authentic vector base Kop Surat
  return await generateAuthenticKopSuratPdfBytes();
}

/**
 * Saves a user-uploaded Kop Surat PDF to localStorage and IndexedDB so it immediately acts
 * as the permanent base layer for all SPH documents.
 */
export async function saveUserKopSuratPdf(fileDataUrl: string, fileName?: string): Promise<string> {
  let storedUrl = fileDataUrl;

  try {
    localStorage.setItem('smk_kop_surat_pdf', fileDataUrl);
    if (fileName) {
      localStorage.setItem('smk_kop_surat_name', fileName);
    }
  } catch {
    // If localStorage quota exceeded, save to IndexedDB
    try {
      const blobId = `kop_surat_custom_${Date.now()}`;
      storedUrl = await saveLocalBlob(blobId, fileDataUrl);
      localStorage.setItem('smk_kop_surat_pdf', storedUrl);
    } catch (idbErr) {
      console.warn('Could not save large Kop Surat to IndexedDB:', idbErr);
    }
  }

  // Notify all active components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smk_kop_surat_updated', {
      detail: { url: storedUrl, fileName: fileName || 'Kop Surat Asli' }
    }));
  }

  return storedUrl;
}
