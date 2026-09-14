/**
 * Service to manage Document Templates and Kop Surat configurations with multi-version support.
 * Persisted in Supabase `settings` table under key 'document_templates_config'.
 */

import { supabase } from './supabaseClient';
import { getAuthenticKopSuratBase64 } from './kopSuratService';

export type TemplateDocType = 'kop_surat' | 'sph' | 'spk' | 'bap' | 'bastp';

export interface TemplateVersion {
  id: string;
  versionNumber: number;
  name: string; // e.g. "Versi 1.0 (Standar Resmi KAN)"
  fileUrl: string; // Supabase Storage URL or Base64 / Local URL
  fileName: string;
  fileType: 'pdf' | 'docx' | 'xlsx';
  uploadedAt: string;
  uploadedBy?: string;
  notes?: string;
  mappings?: Record<string, string>; // Maps template placeholder -> field key
  detectedPlaceholders?: string[];
}

export interface DocumentTypeConfig {
  type: TemplateDocType;
  title: string;
  description: string;
  supportedFormats: ('pdf' | 'docx' | 'xlsx')[];
  activeVersionId: string | null;
  activeUrl: string | null;
  activeFileName: string | null;
  activeFileType: 'pdf' | 'docx' | 'xlsx';
  versions: TemplateVersion[];
  mappings: Record<string, string>; // active mappings
}

export interface AllTemplatesConfig {
  kop_surat: DocumentTypeConfig;
  sph: DocumentTypeConfig;
  spk: DocumentTypeConfig;
  bap: DocumentTypeConfig;
  bastp: DocumentTypeConfig;
}

export type DocumentTemplatesConfig = AllTemplatesConfig;

const TEMPLATES_DOC_ID = 'document_templates_config';

/**
 * Creates default initial versions for a given document type
 */
function createDefaultVersions(type: TemplateDocType): TemplateVersion[] {
  const configs: Record<TemplateDocType, { v1Name: string; v1Notes: string; v2Name: string; defaultFileType: 'pdf' | 'docx' | 'xlsx' }> = {
    kop_surat: {
      v1Name: 'Versi 1.0 (Vektor Resmi PT SMK + KAN)',
      v1Notes: 'Kop Surat Vektor Resmi Standar Akreditasi KAN LK-532-IDN',
      v2Name: 'Versi 2.0 (Desain Modern Facet Ribbon)',
      defaultFileType: 'pdf'
    },
    sph: {
      v1Name: 'Versi 1.0 (Format Standar SMK)',
      v1Notes: 'Template Surat Penawaran Harga standar',
      v2Name: 'Versi 2.0 (Format Modern dengan Tabel Otomatis)',
      defaultFileType: 'pdf'
    },
    spk: {
      v1Name: 'Versi 1.0 (Surat Perintah Kerja Resmi)',
      v1Notes: 'Template SPK standar operasional',
      v2Name: 'Versi 2.0 (Format Baru)',
      defaultFileType: 'pdf'
    },
    bap: {
      v1Name: 'Versi 1.0 (Berita Acara Pekerjaan Standar)',
      v1Notes: 'Template BAP standar untuk kalibrasi RS',
      v2Name: 'Versi 2.0 (Format Komprehensif)',
      defaultFileType: 'pdf'
    },
    bastp: {
      v1Name: 'Versi 1.0 (BA Serah Terima Pekerjaan)',
      v1Notes: 'Template BASTP untuk penyelesaian kalibrasi',
      v2Name: 'Versi 2.0 (Format Rekap)',
      defaultFileType: 'xlsx'
    }
  };

  const cfg = configs[type];
  const now = new Date().toISOString();

  const v1: TemplateVersion = {
    id: `v1_${type}`,
    versionNumber: 1,
    name: cfg.v1Name,
    fileUrl: '',
    fileName: `${type}_template_v1.${cfg.defaultFileType}`,
    fileType: cfg.defaultFileType,
    uploadedAt: now,
    uploadedBy: 'Sistem PT. SMK',
    notes: cfg.v1Notes,
    mappings: {},
    detectedPlaceholders: []
  };

  const v2: TemplateVersion = {
    id: `v2_${type}`,
    versionNumber: 2,
    name: cfg.v2Name,
    fileUrl: '',
    fileName: `${type}_template_v2.${cfg.defaultFileType}`,
    fileType: cfg.defaultFileType,
    uploadedAt: now,
    uploadedBy: 'Sistem PT. SMK',
    notes: 'Template cadangan untuk kebutuhan kustomisasi',
    mappings: {},
    detectedPlaceholders: []
  };

  return [v1, v2];
}

/**
 * Returns the default fallback configuration for all template types
 */
export function getDefaultTemplatesConfig(): AllTemplatesConfig {
  return {
    kop_surat: {
      type: 'kop_surat',
      title: 'Kop Surat Resmi (Letterhead)',
      description: 'Digunakan sebagai header pada seluruh dokumen penawaran (SPH), BAP, dan surat dinas resmi.',
      supportedFormats: ['pdf'],
      activeVersionId: 'v1_kop_surat',
      activeUrl: null,
      activeFileName: 'kop_surat_resmi_kan.pdf',
      activeFileType: 'pdf',
      versions: createDefaultVersions('kop_surat'),
      mappings: {}
    },
    sph: {
      type: 'sph',
      title: 'Surat Penawaran Harga (SPH)',
      description: 'Template penawaran biaya kalibrasi peralatan rumah sakit/klinik.',
      supportedFormats: ['pdf', 'docx'],
      activeVersionId: 'v1_sph',
      activeUrl: null,
      activeFileName: 'sph_template_v1.pdf',
      activeFileType: 'pdf',
      versions: createDefaultVersions('sph'),
      mappings: {}
    },
    spk: {
      type: 'spk',
      title: 'Surat Perintah Kerja (SPK)',
      description: 'Template penugasan teknisi kalibrasi ke lokasi fasilitas kesehatan.',
      supportedFormats: ['pdf', 'docx'],
      activeVersionId: 'v1_spk',
      activeUrl: null,
      activeFileName: 'spk_template_v1.pdf',
      activeFileType: 'pdf',
      versions: createDefaultVersions('spk'),
      mappings: {}
    },
    bap: {
      type: 'bap',
      title: 'Berita Acara Pekerjaan (BAP)',
      description: 'Template laporan serah terima pekerjaan kalibrasi alat kesehatan.',
      supportedFormats: ['pdf', 'docx'],
      activeVersionId: 'v1_bap',
      activeUrl: null,
      activeFileName: 'bap_template_v1.pdf',
      activeFileType: 'pdf',
      versions: createDefaultVersions('bap'),
      mappings: {}
    },
    bastp: {
      type: 'bastp',
      title: 'BAST Pekerjaan (Excel / PDF)',
      description: 'Template Berita Acara Serah Terima Pekerjaan dan rekap daftar alat kesehatan.',
      supportedFormats: ['xlsx', 'pdf'],
      activeVersionId: 'v1_bastp',
      activeUrl: null,
      activeFileName: 'bastp_template_v1.xlsx',
      activeFileType: 'xlsx',
      versions: createDefaultVersions('bastp'),
      mappings: {}
    }
  };
}

/**
 * Fetch full configuration for all templates from Supabase
 */
export const getFullTemplatesConfig = async (): Promise<AllTemplatesConfig> => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', TEMPLATES_DOC_ID)
      .maybeSingle();

    if (!data || !data.value) {
      return getDefaultTemplatesConfig();
    }

    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    const defaults = getDefaultTemplatesConfig();

    const config: AllTemplatesConfig = {
      kop_surat: parsed.config_kop_surat || defaults.kop_surat,
      sph: parsed.config_sph || defaults.sph,
      spk: parsed.config_spk || defaults.spk,
      bap: parsed.config_bap || defaults.bap,
      bastp: parsed.config_bastp || defaults.bastp
    };

    return config;
  } catch (error) {
    console.warn('Error reading templates config from Supabase:', error);
    return getDefaultTemplatesConfig();
  }
};

/**
 * Save a new version for a document template in Supabase
 */
export const saveTemplateVersion = async (
  type: TemplateDocType,
  fileUrl: string,
  fileName: string,
  arg4?: any,
  arg5?: any,
  arg6?: any,
  arg7?: any
): Promise<TemplateVersion> => {
  try {
    const currentConfig = await getFullTemplatesConfig();
    const typeConfig = currentConfig[type];

    let fileType: 'pdf' | 'docx' | 'xlsx' = 'pdf';
    let versionName = '';
    let notes = '';
    let initialMappings: Record<string, string> = {};
    let detectedPlaceholders: string[] = [];

    if (arg4 === 'pdf' || arg4 === 'docx' || arg4 === 'xlsx') {
      fileType = arg4;
      notes = typeof arg5 === 'string' ? arg5 : '';
      if (Array.isArray(arg6)) {
        detectedPlaceholders = arg6;
      } else if (arg6 && typeof arg6 === 'object') {
        initialMappings = arg6;
      }
      versionName = typeof arg7 === 'string' ? arg7 : '';
    } else {
      versionName = typeof arg4 === 'string' ? arg4 : '';
      notes = typeof arg5 === 'string' ? arg5 : '';
      if (arg6 && typeof arg6 === 'object' && !Array.isArray(arg6)) {
        initialMappings = arg6;
      }
      if (Array.isArray(arg7)) {
        detectedPlaceholders = arg7;
      }
    }

    const nextVersionNumber = (typeConfig.versions?.length || 0) + 1;
    const newVersionId = `v${nextVersionNumber}_${Date.now()}`;

    const newVersion: TemplateVersion = {
      id: newVersionId,
      versionNumber: nextVersionNumber,
      name: versionName || `Versi ${nextVersionNumber}.0`,
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
      ...typeConfig,
      activeVersionId: newVersionId,
      activeUrl: fileUrl,
      activeFileName: fileName,
      activeFileType: fileType,
      mappings: initialMappings,
      versions: updatedVersions
    };

    currentConfig[type] = updatedTypeConfig;

    const payload: Record<string, any> = {};
    const types: TemplateDocType[] = ['kop_surat', 'sph', 'spk', 'bap', 'bastp'];
    types.forEach(t => {
      payload[`config_${t}`] = currentConfig[t];
    });

    await supabase
      .from('settings')
      .upsert({
        key: TEMPLATES_DOC_ID,
        value: JSON.stringify(payload),
        updated_at: new Date().toISOString()
      });

    return newVersion;
  } catch (error) {
    console.error(`Error saving new version for ${type}:`, error);
    throw error;
  }
};

export const saveNewTemplateVersion = saveTemplateVersion;

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

    currentConfig[type] = updatedTypeConfig;

    const payload: Record<string, any> = {};
    const types: TemplateDocType[] = ['kop_surat', 'sph', 'spk', 'bap', 'bastp'];
    types.forEach(t => {
      payload[`config_${t}`] = currentConfig[t];
    });

    await supabase
      .from('settings')
      .upsert({
        key: TEMPLATES_DOC_ID,
        value: JSON.stringify(payload),
        updated_at: new Date().toISOString()
      });
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
      ...typeConfig,
      activeVersionId,
      activeUrl,
      activeFileName,
      activeFileType,
      mappings,
      versions: updatedVersions
    };

    currentConfig[type] = updatedTypeConfig;

    const payload: Record<string, any> = {};
    const types: TemplateDocType[] = ['kop_surat', 'sph', 'spk', 'bap', 'bastp'];
    types.forEach(t => {
      payload[`config_${t}`] = currentConfig[t];
    });

    await supabase
      .from('settings')
      .upsert({
        key: TEMPLATES_DOC_ID,
        value: JSON.stringify(payload),
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error(`Error deleting template version:`, error);
    throw error;
  }
};

/**
 * Save placeholder mappings for active template
 */
export const saveTemplateMappings = async (
  type: TemplateDocType,
  mappings: Record<string, string>
): Promise<void> => {
  try {
    const currentConfig = await getFullTemplatesConfig();
    const typeConfig = currentConfig[type];

    const updatedVersions = typeConfig.versions.map(v => {
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

    currentConfig[type] = updatedTypeConfig;

    const payload: Record<string, any> = {};
    const types: TemplateDocType[] = ['kop_surat', 'sph', 'spk', 'bap', 'bastp'];
    types.forEach(t => {
      payload[`config_${t}`] = currentConfig[t];
    });

    await supabase
      .from('settings')
      .upsert({
        key: TEMPLATES_DOC_ID,
        value: JSON.stringify(payload),
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error(`Error saving mappings for ${type}:`, error);
    throw error;
  }
};
