import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { sanitizeForFirestore } from '../firebase/useFirestoreData';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getAuthenticKopSuratBase64 } from './kopSuratService';

export type TemplateDocType = 'sph' | 'spk' | 'bap' | 'bastp' | 'kop_surat';

export interface TemplateVersion {
  id: string;
  versionNumber: number;
  name: string;
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'xlsx';
  uploadedAt: string;
  uploadedBy?: string;
  notes?: string;
  mappings: Record<string, string>; // e.g. { "{{NAMA_RS}}": "hospitalName", "{{NOMOR_SPH}}": "sphNumber" }
  detectedPlaceholders: string[];
}

export interface DocumentTypeConfig {
  activeVersionId: string | null;
  activeUrl: string | null;
  activeFileName: string | null;
  activeFileType: 'pdf' | 'docx' | 'xlsx';
  mappings: Record<string, string>;
  versions: TemplateVersion[];
}

export interface DocumentTemplatesConfig {
  sph: DocumentTypeConfig;
  spk: DocumentTypeConfig;
  bap: DocumentTypeConfig;
  bastp: DocumentTypeConfig;
  kop_surat: DocumentTypeConfig;
}

export interface LegacyDocumentTemplates {
  sph: string | null;
  spk: string | null;
  bap: string | null;
  bastp: string | null;
  kop_surat?: string | null;
}

const TEMPLATES_DOC_ID = 'document_templates';

// Minimal valid base64 PDF string for instant loading
export async function createSamplePdfBase64(docTypeTitle: string, versionTitle: string, docCode: string): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // KOP SURAT RESMI
    page.drawText('PT. SARANA MULTI KALIBRASI', { x: 50, y: 790, size: 15, font: fontBold, color: rgb(0.11, 0.40, 0.55) });
    page.drawText('Laboratorium Uji & Kalibrasi Fasilitas Kesehatan | Kemenkes RI & KAN LK-532-IDN', { x: 50, y: 772, size: 8.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    page.drawText('Jl. Kenari 3 No. A3, Ngipang RT 005/017 Kadipiro Banjarsari Surakarta | info@ptsaranamultikalibrasi.com', { x: 50, y: 760, size: 7.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    page.drawLine({ start: { x: 50, y: 752 }, end: { x: 545, y: 752 }, thickness: 2, color: rgb(0.11, 0.40, 0.55) });
    page.drawLine({ start: { x: 50, y: 749 }, end: { x: 545, y: 749 }, thickness: 0.5, color: rgb(0.11, 0.40, 0.55) });

    // JUDUL DOKUMEN
    page.drawText(docTypeTitle.toUpperCase(), { x: 50, y: 715, size: 13, font: fontBold, color: rgb(0.08, 0.08, 0.08) });
    page.drawText(`Template Format Dokumen Resmi | ${versionTitle} | [${docCode}]`, { x: 50, y: 700, size: 8.5, font: fontRegular, color: rgb(0.45, 0.45, 0.45) });

    // BODY & PLACEHOLDERS
    page.drawText('Nomor Berkas      : {{sphNumber}} {{spkNumber}} {{bapNumber}}', { x: 50, y: 660, size: 9.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('Nama Fasilitas RS : {{hospitalName}}', { x: 50, y: 640, size: 9.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('Alamat Lokasi     : {{hospitalAddress}}, {{hospitalCity}} {{city}}', { x: 50, y: 620, size: 9.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('Tanggal Dokumen   : {{date}} {{scheduledDate}}', { x: 50, y: 600, size: 9.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('Penanggung Jawab  : {{leadTechnicianName}} {{marketingStaffName}}', { x: 50, y: 580, size: 9.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('Nilai Kontrak     : {{grandTotal}} {{contractValue}}', { x: 50, y: 560, size: 9.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

    // TABLE MOCK
    page.drawRectangle({ x: 50, y: 440, width: 495, height: 90, color: rgb(0.97, 0.98, 0.99), borderColor: rgb(0.8, 0.85, 0.9), borderWidth: 1 });
    page.drawText('TABEL RINCIAN PENGUJIAN / KALIBRASI PERALATAN MEDIS', { x: 60, y: 512, size: 8.5, font: fontBold, color: rgb(0.11, 0.40, 0.55) });
    page.drawText('- Baris 1: Alat Medis Radiologi / Terapi / ICU / Laboratorium Teruji', { x: 65, y: 492, size: 8.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('- Status Kelaikan Fisik & Kalibrasi Sesuai Standar KAN LK-532-IDN', { x: 65, y: 474, size: 8.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('- Daftar Alokasi Kalibrator Acuan & Tablet Digitalisasi Lapangan', { x: 65, y: 456, size: 8.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

    // SIGNATURE AREA
    page.drawText('Surakarta, {{date}}', { x: 370, y: 220, size: 9.5, font: fontRegular });
    page.drawText('PT. SARANA MULTI KALIBRASI', { x: 370, y: 205, size: 9.5, font: fontBold, color: rgb(0.11, 0.40, 0.55) });
    page.drawText('[ Area Tanda Tangan Digital Resmi ]', { x: 370, y: 155, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
    page.drawLine({ start: { x: 370, y: 115 }, end: { x: 520, y: 115 }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('{{directorName}}', { x: 370, y: 100, size: 9.5, font: fontBold });
    page.drawText('Direktur / Manajer Teknik', { x: 370, y: 88, size: 8.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

    const bytes = await pdfDoc.save();
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:application/pdf;base64,${btoa(binary)}`;
  } catch (err) {
    console.error('Error creating base64 sample PDF:', err);
    return '';
  }
}

// Generate Blank A4 Letterhead (Kop Surat) PDF
export async function createSampleLetterheadPdfBase64(): Promise<string> {
  return await getAuthenticKopSuratBase64();
}

// Built-in seed versions so users immediately have multiple versions to switch between
const createSeedVersions = (type: TemplateDocType): TemplateVersion[] => {
  const configs: Record<TemplateDocType, { v1Name: string; v2Name: string; v1Notes: string; v2Notes: string; docTitle: string; defaultFileType: 'pdf' | 'docx' | 'xlsx' }> = {
    kop_surat: {
      docTitle: 'Kop Surat Resmi (Kertas Kosongan A4)',
      v1Name: 'Kop Surat A4 Resmi PT. SMK (Kemenkes & KAN)',
      v2Name: 'Kop Surat Standar A4 Khusus SPH & SPK',
      v1Notes: 'Kertas A4 kosong dengan Kop & Footer resmi PT. Sarana Multi Kalibrasi untuk penempatan isi dokumen SPH/SPK.',
      v2Notes: 'Format template kop surat A4 siap pakai untuk pencetakan dokumen resmi.',
      defaultFileType: 'pdf'
    },
    sph: {
      docTitle: 'Surat Penawaran Harga (SPH) Kalibrasi',
      v1Name: 'Versi 1.0 (Standar Kemenkes RI)',
      v2Name: 'Versi 2.0 (Format Akreditasi KAN LK-532-IDN)',
      v1Notes: 'Format baku penawaran harga 2 halaman sesuai regulasi Ditjen Nakes.',
      v2Notes: 'Pembaruan kop surat resmi KAN LK-532, klausul PPN 11%, dan rincian akomodasi.',
      defaultFileType: 'pdf'
    },
    spk: {
      docTitle: 'Surat Perintah Kerja (SPK) Kalibrasi',
      v1Name: 'Versi 1.0 (SPK Reguler Lapangan)',
      v2Name: 'Versi 2.0 (SPK Terpadu Kalibrator & Tablet)',
      v1Notes: 'Format surat tugas awal untuk penugasan tim elektromedis ke rumah sakit.',
      v2Notes: 'Integrasi nomor seri master kalibrator dan unit tablet teknisi lapangan.',
      defaultFileType: 'pdf'
    },
    bap: {
      docTitle: 'Berita Acara Pekerjaan (BAP) Kalibrasi',
      v1Name: 'Versi 1.0 (BAP Excel Template .xlsx)',
      v2Name: 'Versi 2.0 (BAP Pengujian Standar PDF)',
      v1Notes: 'Format template Excel (.xlsx) Berita Acara Pekerjaan dengan ekspor PDF otomatis.',
      v2Notes: 'Format berita acara pekerjaan kalibrasi standar rumah sakit dengan tabel realisasi.',
      defaultFileType: 'xlsx'
    },
    bastp: {
      docTitle: 'Berita Acara Serah Terima Pekerjaan & Sertifikat (BASTP)',
      v1Name: 'Versi 1.0 (BASTP Excel Template .xlsx)',
      v2Name: 'Versi 2.0 (BASTP Digital & Barcode KAN)',
      v1Notes: 'Format template Excel (.xlsx) serah terima fisik sertifikat & stiker kelaikan.',
      v2Notes: 'Integrasi validasi barcode digital sertifikat dan stempel resmi Kemenkes RI.',
      defaultFileType: 'xlsx'
    }
  };

  const c = configs[type];
  const dummyPdfData = 'data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICU' + 'entry'; // fallback stub

  const v1: TemplateVersion = {
    id: `${type}_v1_seed`,
    versionNumber: 1,
    name: c.v1Name,
    fileUrl: dummyPdfData,
    fileName: `${type.toUpperCase()}_Standar_v1.${c.defaultFileType}`,
    fileType: c.defaultFileType,
    uploadedAt: '2025-11-15T09:30:00Z',
    uploadedBy: 'Admin Metrologi PT SMK',
    notes: c.v1Notes,
    mappings: {
      '{{sphNumber}}': 'sphNumber',
      '{{spkNumber}}': 'spkNumber',
      '{{bapNumber}}': 'bapNumber',
      '{{hospitalName}}': 'hospitalName',
      '{{city}}': 'city',
      '{{date}}': 'date',
      '{{directorName}}': 'directorName'
    },
    detectedPlaceholders: ['{{sphNumber}}', '{{hospitalName}}', '{{city}}', '{{date}}', '{{directorName}}']
  };

  const v2: TemplateVersion = {
    id: `${type}_v2_seed`,
    versionNumber: 2,
    name: c.v2Name,
    fileUrl: dummyPdfData,
    fileName: `${type.toUpperCase()}_KAN_2026_v2.pdf`,
    fileType: 'pdf',
    uploadedAt: '2026-02-20T14:15:00Z',
    uploadedBy: 'Hafizh Pasifianto, S.Tr.T. (Manajer Teknik)',
    notes: c.v2Notes,
    mappings: {
      '{{sphNumber}}': 'sphNumber',
      '{{spkNumber}}': 'spkNumber',
      '{{bapNumber}}': 'bapNumber',
      '{{hospitalName}}': 'hospitalName',
      '{{city}}': 'city',
      '{{date}}': 'date',
      '{{directorName}}': 'directorName',
      '{{grandTotal}}': 'grandTotal',
      '{{scheduledDate}}': 'scheduledDate'
    },
    detectedPlaceholders: ['{{sphNumber}}', '{{hospitalName}}', '{{city}}', '{{date}}', '{{directorName}}', '{{grandTotal}}']
  };

  return [v2, v1];
};

const defaultTypeConfig = (type: TemplateDocType): DocumentTypeConfig => {
  const versions = createSeedVersions(type);
  const activeVer = versions[0];
  return {
    activeVersionId: activeVer.id,
    activeUrl: activeVer.fileUrl,
    activeFileName: activeVer.fileName,
    activeFileType: activeVer.fileType,
    mappings: activeVer.mappings,
    versions: versions
  };
};

export const getDefaultTemplatesConfig = (): DocumentTemplatesConfig => ({
  kop_surat: defaultTypeConfig('kop_surat'),
  sph: defaultTypeConfig('sph'),
  spk: defaultTypeConfig('spk'),
  bap: defaultTypeConfig('bap'),
  bastp: defaultTypeConfig('bastp')
});

/**
 * Get full template configuration including versions & mappings
 */
export const getFullTemplatesConfig = async (): Promise<DocumentTemplatesConfig> => {
  try {
    const docRef = doc(db, 'settings', TEMPLATES_DOC_ID);
    const docSnap = await getDoc(docRef);
    const config = getDefaultTemplatesConfig();

    if (docSnap.exists()) {
      const data = docSnap.data();
      const types: TemplateDocType[] = ['kop_surat', 'sph', 'spk', 'bap', 'bastp'];
      types.forEach(type => {
        if (data[`config_${type}`]) {
          config[type] = {
            ...defaultTypeConfig(type),
            ...data[`config_${type}`]
          };
        } else if (data[type]) {
          const legacyUrl = data[type];
          const legacyVersion: TemplateVersion = {
            id: `v1_legacy`,
            versionNumber: 1,
            name: 'Template Awal (Migrasi)',
            fileUrl: legacyUrl,
            fileName: legacyUrl.split('/').pop()?.split('?')[0] || `${type}-template.pdf`,
            fileType: legacyUrl.toLowerCase().includes('.xlsx') ? 'xlsx' : legacyUrl.toLowerCase().includes('.docx') ? 'docx' : 'pdf',
            uploadedAt: new Date().toISOString(),
            mappings: {},
            detectedPlaceholders: []
          };
          config[type] = {
            activeVersionId: legacyVersion.id,
            activeUrl: legacyUrl,
            activeFileName: legacyVersion.fileName,
            activeFileType: legacyVersion.fileType,
            mappings: {},
            versions: [legacyVersion]
          };
        }
      });
    }

    // Check user-uploaded Kop Surat in localStorage first
    try {
      const localUploadedKop = localStorage.getItem('smk_kop_surat_pdf');
      if (localUploadedKop && localUploadedKop.length > 100) {
        config.kop_surat.activeUrl = localUploadedKop;
        const uploadedName = localStorage.getItem('smk_kop_surat_name');
        if (uploadedName) config.kop_surat.activeFileName = uploadedName;
      }
    } catch {
      // ignore
    }

    // Ensure kop_surat activeUrl is NEVER an empty or broken stub
    if (
      !config.kop_surat.activeUrl ||
      config.kop_surat.activeUrl.length < 100 ||
      config.kop_surat.activeUrl.includes('JVBERi0xLjcKCjEgMCBvYmogICU')
    ) {
      config.kop_surat.activeUrl = await getAuthenticKopSuratBase64();
      config.kop_surat.activeFileName = 'Kop_Surat_Resmi_PT_SMK.pdf';
    }

    return config;
  } catch (error) {
    console.error("Error fetching template config:", error);
    const fallback = getDefaultTemplatesConfig();
    try {
      fallback.kop_surat.activeUrl = await getAuthenticKopSuratBase64();
    } catch {
      // ignore
    }
    return fallback;
  }
};

/**
 * Backward-compatible helper used across existing print modals
 */
export const getTemplates = async (): Promise<LegacyDocumentTemplates> => {
  const full = await getFullTemplatesConfig();
  return {
    kop_surat: full.kop_surat.activeUrl,
    sph: full.sph.activeUrl,
    spk: full.spk.activeUrl,
    bap: full.bap.activeUrl,
    bastp: full.bastp.activeUrl
  };
};

import { saveLocalBlob } from './localBlobStorage';

/**
 * Save new template version and set as active
 */
export const saveNewTemplateVersion = async (
  type: TemplateDocType,
  rawFileUrl: string,
  fileName: string,
  fileType: 'pdf' | 'docx' | 'xlsx',
  notes: string = '',
  detectedPlaceholders: string[] = [],
  customName?: string
): Promise<TemplateVersion> => {
  try {
    const currentConfig = await getFullTemplatesConfig();
    const typeConfig = currentConfig[type] || defaultTypeConfig(type);
    
    const nextVersionNumber = (typeConfig.versions && typeConfig.versions.length > 0)
      ? Math.max(...typeConfig.versions.map(v => v.versionNumber || 1)) + 1
      : 1;

    const newVersionId = `v${nextVersionNumber}_${Date.now()}`;
    const newVersionName = customName || `Versi ${nextVersionNumber} (${fileName})`;

    // If fileUrl is a large Base64 string (>200KB), store locally in IndexedDB to avoid Firestore 1MB doc limit
    let fileUrl = rawFileUrl;
    if (rawFileUrl.startsWith('data:') && rawFileUrl.length > 200000) {
      fileUrl = await saveLocalBlob(newVersionId, rawFileUrl);
    }

    const initialMappings: Record<string, string> = { ...(typeConfig.mappings || {}) };
    detectedPlaceholders.forEach(token => {
      const cleanToken = token.replace(/[{}]/g, '').trim();
      if (!initialMappings[token]) {
        initialMappings[token] = cleanToken;
      }
    });

    const newVersion: TemplateVersion = {
      id: newVersionId,
      versionNumber: nextVersionNumber,
      name: newVersionName,
      fileUrl,
      fileName,
      fileType,
      uploadedAt: new Date().toISOString(),
      notes,
      mappings: initialMappings,
      detectedPlaceholders
    };

    const updatedVersions = [newVersion, ...(typeConfig.versions || [])];

    const updatedTypeConfig: DocumentTypeConfig = {
      activeVersionId: newVersionId,
      activeUrl: fileUrl,
      activeFileName: fileName,
      activeFileType: fileType,
      mappings: initialMappings,
      versions: updatedVersions
    };

    const docRef = doc(db, 'settings', TEMPLATES_DOC_ID);
    await setDoc(docRef, sanitizeForFirestore({
      [type]: fileUrl, // legacy compatibility
      [`config_${type}`]: updatedTypeConfig
    }), { merge: true });

    return newVersion;
  } catch (error) {
    console.error(`Error saving new version for ${type}:`, error);
    throw error;
  }
};

/**
 * Switch active version
 */
export const setActiveTemplateVersion = async (
  type: TemplateDocType,
  versionId: string
): Promise<void> => {
  try {
    const currentConfig = await getFullTemplatesConfig();
    const typeConfig = currentConfig[type];
    const targetVersion = typeConfig.versions.find(v => v.id === versionId);
    
    if (!targetVersion) throw new Error(`Version ${versionId} not found`);

    const updatedTypeConfig: DocumentTypeConfig = {
      ...typeConfig,
      activeVersionId: targetVersion.id,
      activeUrl: targetVersion.fileUrl,
      activeFileName: targetVersion.fileName,
      activeFileType: targetVersion.fileType,
      mappings: targetVersion.mappings || typeConfig.mappings
    };

    const docRef = doc(db, 'settings', TEMPLATES_DOC_ID);
    await setDoc(docRef, sanitizeForFirestore({
      [type]: targetVersion.fileUrl,
      [`config_${type}`]: updatedTypeConfig
    }), { merge: true });
  } catch (error) {
    console.error(`Error activating template version:`, error);
    throw error;
  }
};

/**
 * Delete a template version
 */
export const deleteTemplateVersion = async (
  type: TemplateDocType,
  versionId: string
): Promise<void> => {
  try {
    const currentConfig = await getFullTemplatesConfig();
    const typeConfig = currentConfig[type];
    const updatedVersions = typeConfig.versions.filter(v => v.id !== versionId);

    let activeVersionId = typeConfig.activeVersionId;
    let activeUrl = typeConfig.activeUrl;
    let activeFileName = typeConfig.activeFileName;
    let activeFileType = typeConfig.activeFileType;
    let mappings = typeConfig.mappings;

    if (activeVersionId === versionId) {
      if (updatedVersions.length > 0) {
        const nextActive = updatedVersions[0];
        activeVersionId = nextActive.id;
        activeUrl = nextActive.fileUrl;
        activeFileName = nextActive.fileName;
        activeFileType = nextActive.fileType;
        mappings = nextActive.mappings;
      } else {
        activeVersionId = null;
        activeUrl = null;
        activeFileName = null;
        activeFileType = 'pdf';
        mappings = {};
      }
    }

    const updatedTypeConfig: DocumentTypeConfig = {
      activeVersionId,
      activeUrl,
      activeFileName,
      activeFileType,
      mappings,
      versions: updatedVersions
    };

    const docRef = doc(db, 'settings', TEMPLATES_DOC_ID);
    await setDoc(docRef, sanitizeForFirestore({
      [type]: activeUrl,
      [`config_${type}`]: updatedTypeConfig
    }), { merge: true });
  } catch (error) {
    console.error(`Error deleting template version:`, error);
    throw error;
  }
};

/**
 * Save field mappings for a template type and its active version
 */
export const saveTemplateMappings = async (
  type: TemplateDocType,
  mappings: Record<string, string>
): Promise<void> => {
  try {
    const currentConfig = await getFullTemplatesConfig();
    const typeConfig = currentConfig[type];

    const updatedVersions = (typeConfig.versions || []).map(v => {
      if (v.id === typeConfig.activeVersionId) {
        return { ...v, mappings };
      }
      return v;
    });

    const updatedTypeConfig: DocumentTypeConfig = {
      ...typeConfig,
      mappings,
      versions: updatedVersions
    };

    const docRef = doc(db, 'settings', TEMPLATES_DOC_ID);
    await setDoc(docRef, sanitizeForFirestore({
      [`config_${type}`]: updatedTypeConfig
    }), { merge: true });
  } catch (error) {
    console.error(`Error saving mappings for ${type}:`, error);
    throw error;
  }
};

/**
 * Legacy save template function for backward compatibility
 */
export const saveTemplate = async (type: TemplateDocType, url: string | null) => {
  if (!url) {
    const current = await getFullTemplatesConfig();
    const active = current[type]?.activeVersionId;
    if (active) await deleteTemplateVersion(type, active);
    return;
  }
  const fileName = url.split('/').pop()?.split('?')[0] || `${type}-template.pdf`;
  const fileType = url.toLowerCase().includes('.xlsx') ? 'xlsx' : url.toLowerCase().includes('.docx') ? 'docx' : 'pdf';
  await saveNewTemplateVersion(type, url, fileName, fileType, 'Versi Unggahan Baru');
};
