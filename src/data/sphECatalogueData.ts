// Master Pricelist & Link E-Catalogue PT. Sarana Multi Kalibrasi (Inaproc LKPP) 2026
// 313 Item Alat Kesehatan Resmi Sesuai Dokumen Pricelist 2026

export interface ECatalogueItem {
  id: number;
  name: string;
  fullName: string;
  price: number;
  unit: string;
  category: string;
  link: string;
}

/**
 * Extracts clean tool name after phrases like:
 * 'Jasa Pengujian dan/atau Kalibrasi alat...'
 */
export function extractCleanToolName(fullName: string): string {
  if (!fullName) return '';
  let cleaned = fullName.trim();
  
  cleaned = cleaned.replace(/^(jasa\s+kalibrasi\s+dan\s*\/?\s*atau\s+pengujian\s+(alat\s+kesehatan\s+|alat\s+kalibrasi\s+|alat\s+)?)/i, '');
  cleaned = cleaned.replace(/^(jasa\s+pengujian\s+dan\s*\/?\s*atau\s+kalibrasi\s+(alat\s+kesehatan\s+|alat\s+kalibrasi\s+|alat\s+)?)/i, '');
  cleaned = cleaned.replace(/^(jasa\s+pengujian\s+kelistrikan\s+dan\s*\/?\s*atau\s+kalibrasi\s+(alat\s+kesehatan\s+|alat\s+)?)/i, '');
  cleaned = cleaned.replace(/^(jasa\s+pengujian\s+kelistrikan\s+dan\s+kalibrasi\s+(alat\s+kesehatan\s+|alat\s+)?)/i, '');
  cleaned = cleaned.replace(/^(jasa\s+pengujian\s+dan\s*\/?\s*atau\s+kelistrikan\s+(alat\s+kesehatan\s+|alat\s+)?)/i, '');
  cleaned = cleaned.replace(/^(jasa\s+kalibrasi\s+dan\s+pengujian\s+(alat\s+kesehatan\s+|alat\s+)?)/i, '');
  cleaned = cleaned.replace(/^(jasa\s+alat\s+kalibrasi\s+dan\s*\/?\s*atau\s+pengujian\s+(alat\s+kesehatan\s+|alat\s+)?)/i, '');
  cleaned = cleaned.replace(/^(jasa\s+kalibrasi\s+dan\s+atau\s+pengujian\s+(alat\s+kesehatan\s+|alat\s+)?)/i, '');
  cleaned = cleaned.replace(/^(jasa\s+pengujian\s+kelistrikan\s+(alat\s+kesehatan\s+)?)/i, '');
  cleaned = cleaned.replace(/^(jasa\s*pengujian\s+kelistrikan\s+dan\s*\/?[a-z]*kalibrasi\s+)/i, '');
  
  return cleaned.trim() || fullName;
}

export const SPH_ECATALOGUE_CATALOG: ECatalogueItem[] = [
  {
    id: 1,
    name: 'Acupunture Teraphy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Acupunture Teraphy',
    price: 425000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-acupunture-teraphy'
  },
  {
    id: 2,
    name: 'Advanced Lung Fuction Testing',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Advanced Lung Fuction Testing',
    price: 499500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-advanced-lung-fuction-testing'
  },
  {
    id: 3,
    name: 'AED',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi AED',
    price: 360750,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-aed'
  },
  {
    id: 4,
    name: 'Agigator Presvac Trombosit',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Agigator Presvac Trombosit',
    price: 220000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-agigator-presvac-trombosit'
  },
  {
    id: 5,
    name: 'Anastesi Ventilator + 2 Vaporizer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Anastesi Ventilator + 2 Vaporizer',
    price: 1554000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-anastesi-ventilator-2-vaporizer'
  },
  {
    id: 6,
    name: 'Audiometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Audiometer',
    price: 416250,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-audiometer'
  },
  {
    id: 7,
    name: 'Autoclave',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Autoclave',
    price: 428999,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-autoclave'
  },
  {
    id: 8,
    name: 'Automated Blood Culture System',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Automated Blood Culture System',
    price: 250000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-automated-blood-culture-system'
  },
  {
    id: 9,
    name: 'Automatic Blood Separator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Automatic Blood Separator',
    price: 250000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-automatic-blood-separator'
  },
  {
    id: 10,
    name: 'Automatic Nucelic Acid',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Automatic Nucelic Acid',
    price: 305250,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-automatic-nucelic-acid'
  },
  {
    id: 11,
    name: 'Autorefraktometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Autorefraktometer',
    price: 250000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-autorefraktometer'
  },
  {
    id: 12,
    name: 'Bed Patient Electric',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Bed Patient Electric',
    price: 277500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-bed-patient-electric'
  },
  {
    id: 13,
    name: 'Bed Side Monitor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Bed Side Monitor',
    price: 277500,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-bed-side-monitor'
  },
  {
    id: 14,
    name: 'Bedside Monitor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Bedside Monitor',
    price: 523529,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-bedside-monitor'
  },
  {
    id: 15,
    name: 'BERA',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi BERA',
    price: 250000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-bera'
  },
  {
    id: 16,
    name: 'Bilirubin Meter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Bilirubin Meter',
    price: 388500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-bilirubin-meter'
  },
  {
    id: 17,
    name: 'Biometri',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Biometri',
    price: 360000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-biometri'
  },
  {
    id: 18,
    name: 'BioSafety Cabinet',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi BioSafety Cabinet',
    price: 1950000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-biosafety-cabinet'
  },
  {
    id: 19,
    name: 'Blader Scanner',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blader Scanner',
    price: 421800,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-blader-scanner'
  },
  {
    id: 20,
    name: 'Blanket & Fluid Warmer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blanket & Fluid Warmer',
    price: 450000,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-blanket-and-fluid-warmer'
  },
  {
    id: 21,
    name: 'Blanket Roll Air',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blanket Roll Air',
    price: 450000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-blanket-roll-air'
  },
  {
    id: 22,
    name: 'Blanket Warmer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blanket Warmer',
    price: 425000,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-alat-kalibrasi-dan-atau-pengujian-alat-kesehatan-blanket-warmer'
  },
  {
    id: 23,
    name: 'Blood Bank',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blood Bank',
    price: 593850,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-blood-bank'
  },
  {
    id: 24,
    name: 'Blood Gas Analizer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blood Gas Analizer',
    price: 400000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-blood-gas-analizer'
  },
  {
    id: 25,
    name: 'Blood Mixer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blood Mixer',
    price: 430000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-blood-mixer'
  },
  {
    id: 26,
    name: 'Blood Pressure Monitor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blood Pressure Monitor',
    price: 475500,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-blood-pressure-monitor'
  },
  {
    id: 27,
    name: 'Blood Warmer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blood Warmer',
    price: 444000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-blood-warmer'
  },
  {
    id: 28,
    name: 'Body Compotition Monitor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Body Compotition Monitor',
    price: 670000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-bed-side-monitor'
  },
  {
    id: 29,
    name: 'Bondmax',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Bondmax',
    price: 400000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-bondmax'
  },
  {
    id: 30,
    name: 'Bor Tulang',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Bor Tulang',
    price: 320000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-bor-tulang'
  },
  {
    id: 31,
    name: 'Breast Pump',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Breast Pump',
    price: 190000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-breast-pump'
  },
  {
    id: 32,
    name: 'Bronchoscopy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Bronchoscopy',
    price: 450000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-bronchoscopy'
  },
  {
    id: 33,
    name: 'C-Arm',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi C-Arm',
    price: 1470750,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-c-arm'
  },
  {
    id: 34,
    name: 'Cauter/ Elctro Cauter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Cauter/ Elctro Cauter',
    price: 333000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-cauter-elctro-cauter'
  },
  {
    id: 35,
    name: 'Centrifuge',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Centrifuge',
    price: 252000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-centrifuge'
  },
  {
    id: 36,
    name: 'Centrifuge Card',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Centrifuge Card',
    price: 340000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-centrifuge-card'
  },
  {
    id: 37,
    name: 'Centrifuge Kantong Darah',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Centrifuge Kantong Darah',
    price: 360000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-centrifuge-kantong-darah'
  },
  {
    id: 38,
    name: 'Centrifuge Refrigerator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Centrifuge Refrigerator',
    price: 380000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-centrifuge-refrigerator'
  },
  {
    id: 39,
    name: 'Chart Proyektor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Chart Proyektor',
    price: 421800,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-chart-proyektor'
  },
  {
    id: 40,
    name: 'Chemistry Analyzer/Kimia Analyzer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Chemistry Analyzer/Kimia Analyzer',
    price: 332250,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-chemistry-analyzer-kimia-analyzer'
  },
  {
    id: 41,
    name: 'Coagulation Analyzer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Coagulation Analyzer',
    price: 415000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-coagulation-analyzer'
  },
  {
    id: 42,
    name: 'Cold Bench',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Cold Bench',
    price: 360000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-cold-bench'
  },
  {
    id: 43,
    name: 'Cold Chain',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Cold Chain',
    price: 250000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-cold-chain'
  },
  {
    id: 44,
    name: 'Cold Plate',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Cold Plate',
    price: 250000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-cold-plate'
  },
  {
    id: 45,
    name: 'Colposcope',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Colposcope',
    price: 425000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-colposcope'
  },
  {
    id: 46,
    name: 'Contrast Media Pressure Injector (Cath Lab)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Contrast Media Pressure Injector (Cath Lab)',
    price: 420000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-contrast-media-pressure-injector-cath-lab'
  },
  {
    id: 47,
    name: 'Convective Warmer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Convective Warmer',
    price: 555000,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-convective-warmer'
  },
  {
    id: 48,
    name: 'CPAP',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi CPAP',
    price: 623820,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-cpap'
  },
  {
    id: 49,
    name: 'CR Computed Radiography',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi CR Computed Radiography',
    price: 670000,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-cr-computed-radiography'
  },
  {
    id: 50,
    name: 'Cryo Air Mini',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Cryo Air Mini',
    price: 621600,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-cryo-air-mini'
  },
  {
    id: 51,
    name: 'Cryostate',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Cryostate',
    price: 688200,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-cryostate'
  },
  {
    id: 52,
    name: 'Cryotherapy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Cryotherapy',
    price: 475000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-cryotherapy'
  },
  {
    id: 53,
    name: 'CT Scan',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi CT Scan',
    price: 2314350,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-ct-scan'
  },
  {
    id: 54,
    name: 'CT Simulator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi CT Simulator',
    price: 3385500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ct-simulator'
  },
  {
    id: 55,
    name: 'CTG',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi CTG',
    price: 482850,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-ctg'
  },
  {
    id: 56,
    name: 'Cutter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Cutter',
    price: 277500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-cutter'
  },
  {
    id: 57,
    name: 'Data Logger',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Data Logger',
    price: 875000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-data-logger'
  },
  {
    id: 58,
    name: 'Deep Freezer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Deep Freezer',
    price: 480000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-deep-freezer'
  },
  {
    id: 59,
    name: 'Defibrilator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Defibrilator',
    price: 632000,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-defibrilator'
  },
  {
    id: 60,
    name: 'Defibrillator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Defibrillator',
    price: 527250,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-defibrilator'
  },
  {
    id: 61,
    name: 'Dental Panoramic',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Dental Panoramic',
    price: 1332000,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-dental-panoramic'
  },
  {
    id: 62,
    name: 'Dental Unit',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Dental Unit',
    price: 542000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-dental-unit'
  },
  {
    id: 63,
    name: 'Dermabrasi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Dermabrasi',
    price: 421800,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-dermabrasi'
  },
  {
    id: 64,
    name: 'Detektor/ Farmer/ PinPoint/ Ross/ Semiflex',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Detektor/ Farmer/ PinPoint/ Ross/ Semiflex',
    price: 5022750,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-detektor-farmer-pinpoint-ross-semiflex'
  },
  {
    id: 65,
    name: 'Digital Pressure Meter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Digital Pressure Meter',
    price: 2500000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-digital-pressure-meter'
  },
  {
    id: 66,
    name: 'Digital Radiography (DR)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Digital Radiography (DR)',
    price: 490000,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-digital-radiography-dr'
  },
  {
    id: 67,
    name: 'Dosimeter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Dosimeter',
    price: 555000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-dosimeter'
  },
  {
    id: 68,
    name: 'Dosimeter Saku',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Dosimeter Saku',
    price: 960000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-dosimeter-saku'
  },
  {
    id: 69,
    name: 'Dosimeter Saku Gamma',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Dosimeter Saku Gamma',
    price: 1276500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-dosimeter-saku-gamma'
  },
  {
    id: 70,
    name: 'Drying Cabinet',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Drying Cabinet',
    price: 415000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-drying-cabinet'
  },
  {
    id: 71,
    name: 'ECG Analyzer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi ECG Analyzer',
    price: 1887000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ecg-analyzer'
  },
  {
    id: 72,
    name: 'Echo Cardiograph',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Echo Cardiograph',
    price: 532800,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-echo-cardiograph'
  },
  {
    id: 73,
    name: 'EEG',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi EEG',
    price: 813630,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-eeg'
  },
  {
    id: 74,
    name: 'EKG',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi EKG',
    price: 515324,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ekg'
  },
  {
    id: 75,
    name: 'Electro Convulsive Theraphy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Electro Convulsive Theraphy',
    price: 250000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-electro-convulsive-theraphy'
  },
  {
    id: 76,
    name: 'Electro Stimulator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Electro Stimulator',
    price: 275000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-electro-stimulator'
  },
  {
    id: 77,
    name: 'Electro Surgical Unit ESU',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Electro Surgical Unit ESU',
    price: 750000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-electro-surgical-unit-esu'
  },
  {
    id: 78,
    name: 'Electrocardiograph',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Electrocardiograph',
    price: 298500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-electrocardiograph'
  },
  {
    id: 79,
    name: 'Electrolyte Analyzer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Electrolyte Analyzer',
    price: 895000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-electrolyte-analyzer'
  },
  {
    id: 80,
    name: 'Electrometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Electrometer',
    price: 3607500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-electrometer'
  },
  {
    id: 81,
    name: 'Electromyograph',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Electromyograph',
    price: 250000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-electromyograph'
  },
  {
    id: 82,
    name: 'Endo Activator (Sonic Irrigator)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Endo Activator (Sonic Irrigator)',
    price: 350000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-endo-activator-sonic-irrigator'
  },
  {
    id: 83,
    name: 'Endo Motor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Endo Motor',
    price: 350000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-endo-motor'
  },
  {
    id: 84,
    name: 'Endoscopy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Endoscopy',
    price: 427350,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-endoscopy'
  },
  {
    id: 85,
    name: 'Endoskopi Urologi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Endoskopi Urologi',
    price: 350000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-endoskopi-urologi'
  },
  {
    id: 86,
    name: 'ENT Unit',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi ENT Unit',
    price: 355200,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-ent-unit'
  },
  {
    id: 87,
    name: 'ESA',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi ESA',
    price: 1665000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-esa'
  },
  {
    id: 88,
    name: 'ESU',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi ESU',
    price: 712620,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-esu'
  },
  {
    id: 89,
    name: 'ESWL',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi ESWL',
    price: 1753800,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibras-eswl'
  },
  {
    id: 90,
    name: 'ESWT',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi ESWT',
    price: 488400,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-eswt'
  },
  {
    id: 91,
    name: 'Fess THT',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Fess THT',
    price: 499500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-fess-tht'
  },
  {
    id: 92,
    name: 'Fetal Doppler',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Fetal Doppler',
    price: 283651,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-fetal-doppler'
  },
  {
    id: 93,
    name: 'FFR Link (Ivus)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi FFR Link (Ivus)',
    price: 350000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-ffr-link-ivus'
  },
  {
    id: 94,
    name: 'Finger Oximeter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Finger Oximeter',
    price: 194250,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-finger-oximeter'
  },
  {
    id: 95,
    name: 'Flow Meter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Flow Meter',
    price: 532800,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-flow-meter'
  },
  {
    id: 96,
    name: 'Flowmeter/ Regulator Oksigen',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Flowmeter/ Regulator Oksigen',
    price: 217005,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-flowmeter-regulator-oksigen'
  },
  {
    id: 97,
    name: 'Fluorescence Immunoassay Analyzer (POCT)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Fluorescence Immunoassay Analyzer (POCT)',
    price: 670000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-fluorescence-immunoassay-analyzer-poct'
  },
  {
    id: 98,
    name: 'Fototerapi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Fototerapi',
    price: 344100,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-fototerapi'
  },
  {
    id: 99,
    name: 'Freezer Laboratorium',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Freezer Laboratorium',
    price: 475500,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-freezer-laboratorium'
  },
  {
    id: 100,
    name: 'Funduskopi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Funduskopi',
    price: 388500,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-funduskopi'
  },
  {
    id: 101,
    name: 'Gene Amp PCR System',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Gene Amp PCR System',
    price: 283500,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-gene-amp-pcr-system'
  },
  {
    id: 102,
    name: 'Haemodialisa',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Haemodialisa',
    price: 2150000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-haemodialisa'
  },
  {
    id: 103,
    name: 'Handheld Blood Analyzer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Handheld Blood Analyzer',
    price: 360000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-handheld-blood-analyzer'
  },
  {
    id: 104,
    name: 'HD Light Source',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi HD Light Source',
    price: 388500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-hd-light-source'
  },
  {
    id: 105,
    name: 'Hemodilysis Unit',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Hemodilysis Unit',
    price: 2664000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-hemodilysis-unit'
  },
  {
    id: 106,
    name: 'Hemoscale/Timbangan Darah',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Hemoscale/Timbangan Darah',
    price: 239251,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-hemoscale-timbangan-darah'
  },
  {
    id: 107,
    name: 'Hidro Therapy/ Hidrocollator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Hidro Therapy/ Hidrocollator',
    price: 475500,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-hidro-therapy-hidrocollator'
  },
  {
    id: 108,
    name: 'High Flow Nasal Cannula',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi High Flow Nasal Cannula',
    price: 388001,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatanhigh-flow-nasal-cannula'
  },
  {
    id: 109,
    name: 'High Flow Nasal Canulla',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi High Flow Nasal Canulla',
    price: 388001,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-high-flow-nasal-canulla'
  },
  {
    id: 110,
    name: 'High Frequency Oscillation Ventilator HFO',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi High Frequency Oscillation Ventilator HFO',
    price: 815000,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-high-frequency-oscillation-ventilator-hfo'
  },
  {
    id: 111,
    name: 'High-Flow Nasal Cannula HNFC',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi High-Flow Nasal Cannula HNFC',
    price: 292862,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-high-flow-nasal-cannula-hnfc'
  },
  {
    id: 112,
    name: 'High-Power Laser Aesthetic',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi High-Power Laser Aesthetic',
    price: 460000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-high-power-laser-aesthetic'
  },
  {
    id: 113,
    name: 'Histeroscopy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Histeroscopy',
    price: 518000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-histeroscopy'
  },
  {
    id: 114,
    name: 'Histostar',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Histostar',
    price: 360000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-histostar'
  },
  {
    id: 115,
    name: 'Hot Magner',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Hot Magner',
    price: 475500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-hot-magner'
  },
  {
    id: 116,
    name: 'Hot Plate',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Hot Plate',
    price: 475500,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-hot-plate'
  },
  {
    id: 117,
    name: 'Hygrometer Portable',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Hygrometer Portable',
    price: 320000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-hygrometer-portable'
  },
  {
    id: 118,
    name: 'Hyper-Hypothermia System',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Hyper-Hypothermia System',
    price: 475000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-hyper-hypothermia-system'
  },
  {
    id: 119,
    name: 'IDA',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi IDA',
    price: 2664000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ida'
  },
  {
    id: 120,
    name: 'Immunoanalyzer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Immunoanalyzer',
    price: 426000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-immunoanalyzer'
  },
  {
    id: 121,
    name: 'Incubator Transport',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Incubator Transport',
    price: 987900,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-incubator-transport'
  },
  {
    id: 122,
    name: 'Infant Warmer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Infant Warmer',
    price: 475500,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-infant-warmer'
  },
  {
    id: 123,
    name: 'Infuse Pump',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Infuse Pump',
    price: 650000,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-infuse-pump'
  },
  {
    id: 124,
    name: 'Infusion Pump',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Infusion Pump',
    price: 305250,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-infusion-pump'
  },
  {
    id: 125,
    name: 'Inkubator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Inkubator',
    price: 432750,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-inkubator'
  },
  {
    id: 126,
    name: 'Inkubator infant',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Inkubator infant',
    price: 510750,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-inkubator-infant'
  },
  {
    id: 127,
    name: 'Inkubator Kultur Darah',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Inkubator Kultur Darah',
    price: 585000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-inkubator-kultur-darah'
  },
  {
    id: 128,
    name: 'Inkubator Lab',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Inkubator Lab',
    price: 219194,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-inkubator-lab'
  },
  {
    id: 129,
    name: 'Inkubator Laboratorium',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Inkubator Laboratorium',
    price: 432750,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-inkubator-laboratorium'
  },
  {
    id: 130,
    name: 'Inkubator Transport',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Inkubator Transport',
    price: 690000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-inkubator-transport'
  },
  {
    id: 131,
    name: 'Intermittent Vacuum Theraphy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Intermittent Vacuum Theraphy',
    price: 480000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-intermittent-vacuum-theraphy'
  },
  {
    id: 132,
    name: 'Intracorporeal Lithotriptor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Intracorporeal Lithotriptor',
    price: 440000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-intracorporeal-lithotriptor'
  },
  {
    id: 133,
    name: 'Ivus',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ivus',
    price: 585000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-ivus'
  },
  {
    id: 134,
    name: 'Keratometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Keratometer',
    price: 416250,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-keratometer'
  },
  {
    id: 135,
    name: 'Laju Endap Darah',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laju Endap Darah',
    price: 277500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-laju-endap-darah'
  },
  {
    id: 136,
    name: 'Laminar Flow',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laminar Flow',
    price: 1975000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-laminar-flow'
  },
  {
    id: 137,
    name: 'Lampu IR',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Lampu IR',
    price: 366300,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-lampu-ir'
  },
  {
    id: 138,
    name: 'Lampu Operasi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Lampu Operasi',
    price: 360750,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-lampu-operasi'
  },
  {
    id: 139,
    name: 'Lampu Operasi 1 Celling Type',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Lampu Operasi 1 Celling Type',
    price: 299700,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-lampu-operasi-1-celling-type'
  },
  {
    id: 140,
    name: 'Lampu Operasi 2 Celling Type',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Lampu Operasi 2 Celling Type',
    price: 310800,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-lampu-operasi-2-celling-type'
  },
  {
    id: 141,
    name: 'Lampu Terapi TDP (TDP Therapeutic Apparatus)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Lampu Terapi TDP (TDP Therapeutic Apparatus)',
    price: 400000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-lampu-terapi-tdp-tdp-therapeutic-apparatus'
  },
  {
    id: 142,
    name: 'Lampu Tindakan',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Lampu Tindakan',
    price: 576000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-lampu-tindakan'
  },
  {
    id: 143,
    name: 'Lampu UV Sterilizer Room',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Lampu UV Sterilizer Room',
    price: 355200,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-lampu-uv-sterilizer-room'
  },
  {
    id: 144,
    name: 'Laparoscopy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laparoscopy',
    price: 355200,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-laparoscopy'
  },
  {
    id: 145,
    name: 'Laryngoscope',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laryngoscope',
    price: 482850,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-laryngoscope'
  },
  {
    id: 146,
    name: 'Laser',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laser',
    price: 424020,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-laser'
  },
  {
    id: 147,
    name: 'Laser CO2',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laser CO2',
    price: 545000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-laser-co2'
  },
  {
    id: 148,
    name: 'Laser Katarak',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laser Katarak',
    price: 410000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-laser-katarak'
  },
  {
    id: 149,
    name: 'Laser Kulit',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laser Kulit',
    price: 545000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-laser-kulit'
  },
  {
    id: 150,
    name: 'Laser ND YAG',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laser ND YAG',
    price: 555000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-laser-nd-yag'
  },
  {
    id: 151,
    name: 'Laser Operasi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laser Operasi',
    price: 545000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-laser-operasi'
  },
  {
    id: 152,
    name: 'Laser Therapy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laser Therapy',
    price: 610500,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-laser-theraphy'
  },
  {
    id: 153,
    name: 'Laser Urology',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Laser Urology',
    price: 410000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-laser-urology'
  },
  {
    id: 154,
    name: 'Lensmeter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Lensmeter',
    price: 421800,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-lensmeter'
  },
  {
    id: 155,
    name: 'Ligasure',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ligasure',
    price: 400000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-ligasure'
  },
  {
    id: 156,
    name: 'Light Curing',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Light Curing',
    price: 515000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-light-curing'
  },
  {
    id: 157,
    name: 'Light Meter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Light Meter',
    price: 1021200,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-light-meter'
  },
  {
    id: 158,
    name: 'Low Sterilisator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Low Sterilisator',
    price: 555000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-low-sterilisator'
  },
  {
    id: 159,
    name: 'Low Temp (Freezer)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Low Temp (Freezer)',
    price: 633750,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-low-temp-freezer'
  },
  {
    id: 160,
    name: 'Lux Meter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Lux Meter',
    price: 840000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-kalibrasi-alat-kesehatan-lux-meter'
  },
  {
    id: 161,
    name: 'Medical Holmium Laser',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Medical Holmium Laser',
    price: 426000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-medical-holmium-laser'
  },
  {
    id: 162,
    name: 'Medical Refrigerator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Medical Refrigerator',
    price: 426000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-medical-refrigerator'
  },
  {
    id: 163,
    name: 'Medical Washer Disinfector',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Medical Washer Disinfector',
    price: 350000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-medical-washer-disinfector'
  },
  {
    id: 164,
    name: 'Meja Operasi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Meja Operasi',
    price: 539999,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-meja-operasi'
  },
  {
    id: 165,
    name: 'Mesin Anaesthesi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mesin Anaesthesi',
    price: 777000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-mesin-anaesthesi'
  },
  {
    id: 166,
    name: 'Mesin Anastesi dengan Ventilator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mesin Anastesi dengan Ventilator',
    price: 1250000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-mesin-anastesi-dengan-ventilator'
  },
  {
    id: 167,
    name: 'Mesin Anestesi Ventilator + 1 Vaporizer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mesin Anestesi Ventilator + 1 Vaporizer',
    price: 1443000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-mesin-anestesi-ventilator-1-vaporizer'
  },
  {
    id: 168,
    name: 'Micro Wave Diathermy - MWD',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Micro Wave Diathermy - MWD',
    price: 188700,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-micro-wave-diathermy-mwd'
  },
  {
    id: 169,
    name: 'Micromotor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Micromotor',
    price: 388500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-micromotor'
  },
  {
    id: 170,
    name: 'Micropipet fix',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Micropipet fix',
    price: 415000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-micropipet-fix'
  },
  {
    id: 171,
    name: 'Micropipet Variable',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Micropipet Variable',
    price: 415000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-micropipet-variable'
  },
  {
    id: 172,
    name: 'Microspeed',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Microspeed',
    price: 418000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-microspeed'
  },
  {
    id: 173,
    name: 'Microtome',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Microtome',
    price: 250000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-microtome'
  },
  {
    id: 174,
    name: 'Microwave Diathermy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Microwave Diathermy',
    price: 250000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-microwave-diathermy'
  },
  {
    id: 175,
    name: 'Mikromotor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mikromotor',
    price: 395000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-mikromotor'
  },
  {
    id: 176,
    name: 'Mikropipet',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mikropipet',
    price: 333000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-mikropipet'
  },
  {
    id: 177,
    name: 'Mikropipet Fix/ Variabel',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mikropipet Fix/ Variabel',
    price: 111000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-mikropipet-fix-variabel'
  },
  {
    id: 178,
    name: 'Mikroskop',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mikroskop',
    price: 400000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-mikroskop'
  },
  {
    id: 179,
    name: 'Mikroskop Bedah/ Operasi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mikroskop Bedah/ Operasi',
    price: 444000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-mikroskop-bedah-operasi'
  },
  {
    id: 180,
    name: 'Mikroskop Mata',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mikroskop Mata',
    price: 426000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-mikroskop-mata'
  },
  {
    id: 181,
    name: 'Mobile X-Ray',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mobile X-Ray',
    price: 1443000,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-mobile-x-ray'
  },
  {
    id: 182,
    name: 'MWD',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi MWD',
    price: 599900,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-mwd'
  },
  {
    id: 183,
    name: 'Nebulizer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Nebulizer',
    price: 464000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-nebulizer'
  },
  {
    id: 184,
    name: 'Nebulizer Ultrasonic',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Nebulizer Ultrasonic',
    price: 666000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kalibrasi-dan-atau-kalibrasi-nebulizer-ultrasonic'
  },
  {
    id: 185,
    name: 'Nebullizer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Nebullizer',
    price: 313500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-nebullizer'
  },
  {
    id: 186,
    name: 'Neo Puff',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Neo Puff',
    price: 272294,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-neo-puff'
  },
  {
    id: 187,
    name: 'NEOPUFF',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi NEOPUFF',
    price: 360750,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-neopuff'
  },
  {
    id: 188,
    name: 'Nerve Monitor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Nerve Monitor',
    price: 555000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-nerve-monitor'
  },
  {
    id: 189,
    name: 'Neuro Stimulator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Neuro Stimulator',
    price: 610500,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-neuro-stimulator'
  },
  {
    id: 190,
    name: 'NSK Bur Total Surgical System',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi NSK Bur Total Surgical System',
    price: 512000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-nsk-bur-total-surgical-system'
  },
  {
    id: 191,
    name: 'Oksigen Concentrator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Oksigen Concentrator',
    price: 400000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-oksigen-concentrator'
  },
  {
    id: 192,
    name: 'Operating Table Electric',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Operating Table Electric',
    price: 485000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-operating-table-electric'
  },
  {
    id: 193,
    name: 'Ophtalmoscope',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ophtalmoscope',
    price: 444000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ophtalmoscope'
  },
  {
    id: 194,
    name: 'Otoacoustic Emission (OAE)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Otoacoustic Emission (OAE)',
    price: 485000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-otoacoustic-emission-oae'
  },
  {
    id: 195,
    name: 'Otoskop',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Otoskop',
    price: 410000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-otoskop'
  },
  {
    id: 196,
    name: 'Oven',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Oven',
    price: 633750,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-oven'
  },
  {
    id: 197,
    name: 'Oven Blower',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Oven Blower',
    price: 349623,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-oven-blower'
  },
  {
    id: 198,
    name: 'Oven Sterilisator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Oven Sterilisator',
    price: 633750,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-oven-sterilisator'
  },
  {
    id: 199,
    name: 'Ozonizer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ozonizer',
    price: 421800,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-ozonizer'
  },
  {
    id: 200,
    name: 'Pacho',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Pacho',
    price: 424020,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-pacho'
  },
  {
    id: 201,
    name: 'Palm Microcentrifuge',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Palm Microcentrifuge',
    price: 460000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-palm-microcentrifuge'
  },
  {
    id: 202,
    name: 'Parafin Bath',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Parafin Bath',
    price: 400000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-parafin-bath'
  },
  {
    id: 203,
    name: 'Pasien Monitor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Pasien Monitor',
    price: 350000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-pasien-monitor'
  },
  {
    id: 204,
    name: 'PCNL',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi PCNL',
    price: 426000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-pcnl'
  },
  {
    id: 205,
    name: 'Pendingin Jenazah',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Pendingin Jenazah',
    price: 499500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-pendingin-jenazah'
  },
  {
    id: 206,
    name: 'Pengujian Kelistrikan Hematology Analizer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Pengujian Kelistrikan Hematology Analizer',
    price: 425000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-hematology-analizer'
  },
  {
    id: 207,
    name: 'pH Meter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi pH Meter',
    price: 366750,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ph-meter'
  },
  {
    id: 208,
    name: 'Photometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Photometer',
    price: 400000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-photometer'
  },
  {
    id: 209,
    name: 'Plasma Shock Freezer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Plasma Shock Freezer',
    price: 574000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-plasma-shock-freezer'
  },
  {
    id: 210,
    name: 'Plasma Thowing',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Plasma Thowing',
    price: 475500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-plasma-thowing'
  },
  {
    id: 211,
    name: 'Platelet Inkubator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Platelet Inkubator',
    price: 555000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-platelet-inkubator'
  },
  {
    id: 212,
    name: 'Pneumatic Lithotripter (Kelistrikan)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Pneumatic Lithotripter (Kelistrikan)',
    price: 414641,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-pneumatic-lithotripter-kelistrikan'
  },
  {
    id: 213,
    name: 'Portable Oxygen Concentrator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Portable Oxygen Concentrator',
    price: 545000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-portable-oxygen-concentrator'
  },
  {
    id: 214,
    name: 'PPortable Operation Lamp',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi PPortable Operation Lamp',
    price: 277500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-pportable-operation-lamp'
  },
  {
    id: 215,
    name: 'Pulse Oxymeter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Pulse Oxymeter',
    price: 321900,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-pulse-oxymeter'
  },
  {
    id: 216,
    name: 'Pulse Oxymetri',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Pulse Oxymetri',
    price: 440000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-pulse-oxymetri'
  },
  {
    id: 217,
    name: 'Radial Shockwave Therapy RESWT',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Radial Shockwave Therapy RESWT',
    price: 580001,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-radial-shockwave-therapy-reswt'
  },
  {
    id: 218,
    name: 'Radiant Monitor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Radiant Monitor',
    price: 599400,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-radiant-monitor'
  },
  {
    id: 219,
    name: 'Radiofrequency Ablation (RFA)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Radiofrequency Ablation (RFA)',
    price: 375000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-radiofrequency-ablation-rfa'
  },
  {
    id: 220,
    name: 'Refrigerator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Refrigerator',
    price: 370000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-refrigerator'
  },
  {
    id: 221,
    name: 'Refrigerator Laboratory',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Refrigerator Laboratory',
    price: 426000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-refrigerator-laboratory'
  },
  {
    id: 222,
    name: 'Refrigerator Vaksin',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Refrigerator Vaksin',
    price: 426000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-refrigerator-vaksin'
  },
  {
    id: 223,
    name: 'Regulator Oksigen (Flowmeter)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Regulator Oksigen (Flowmeter)',
    price: 188700,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-regulator-oksigen-flowmeter'
  },
  {
    id: 224,
    name: 'Roller Mixer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Roller Mixer',
    price: 525000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-roller-mixer'
  },
  {
    id: 225,
    name: 'Rotator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Rotator',
    price: 283500,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-rotator'
  },
  {
    id: 226,
    name: 'RT PCR',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi RT PCR',
    price: 500000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-rt-pcr'
  },
  {
    id: 227,
    name: 'Sepeda Statis',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Sepeda Statis',
    price: 765000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-sepeda-statis'
  },
  {
    id: 228,
    name: 'Shaker',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Shaker',
    price: 340000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-shaker'
  },
  {
    id: 229,
    name: 'Shock Wave Therapy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Shock Wave Therapy',
    price: 525000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-shock-wave-therapy'
  },
  {
    id: 230,
    name: 'Short Wave Diathermy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Short Wave Diathermy',
    price: 500000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-short-wave-diathermy'
  },
  {
    id: 231,
    name: 'Slit Lamp',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Slit Lamp',
    price: 366300,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-slit-lamp'
  },
  {
    id: 232,
    name: 'Spektofotometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Spektofotometer',
    price: 363750,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-spektofotometer'
  },
  {
    id: 233,
    name: 'Spirometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Spirometer',
    price: 505050,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-spirometer'
  },
  {
    id: 234,
    name: 'Stabilometric Platform',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Stabilometric Platform',
    price: 460000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-stabilometric-platform'
  },
  {
    id: 235,
    name: 'Standing Tensimeter/ Digital/ Jarum',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Standing Tensimeter/ Digital/ Jarum',
    price: 333000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-standing-tensimeter-digital-jarum'
  },
  {
    id: 236,
    name: 'Steam Sterilisator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Steam Sterilisator',
    price: 620000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-steam-sterilisator'
  },
  {
    id: 237,
    name: 'Sterilisator Kering / Dry-Heat Sterilizer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Sterilisator Kering / Dry-Heat Sterilizer',
    price: 470000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-body-compotition-monitor'
  },
  {
    id: 238,
    name: 'Sterilisator Suhu Rendah',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Sterilisator Suhu Rendah',
    price: 635000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-sterilisator-suhu-rendah'
  },
  {
    id: 239,
    name: 'Stimulator Elektrik Suction/TENS Vacuum',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Stimulator Elektrik Suction/TENS Vacuum',
    price: 350000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-stimulator-elektrik-suction-tens-vacuum'
  },
  {
    id: 240,
    name: 'Stirer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Stirer',
    price: 430000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-stirer'
  },
  {
    id: 241,
    name: 'Suction Dinding (Suction Wall)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Suction Dinding (Suction Wall)',
    price: 180000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-suction-dinding-suction-wall'
  },
  {
    id: 242,
    name: 'Suction Pump',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Suction Pump',
    price: 635000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-sterilisator-kering-dry-heat-sterilizer'
  },
  {
    id: 243,
    name: 'Surgical Microscope',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Surgical Microscope',
    price: 500000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-surgical-microscope'
  },
  {
    id: 244,
    name: 'Surgical Power System/ Huidamed',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Surgical Power System/ Huidamed',
    price: 444000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-surgical-power-system-huidamed'
  },
  {
    id: 245,
    name: 'Survey Meter Gamma/ Neutron',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Survey Meter Gamma/ Neutron',
    price: 1831500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-survey-meter-gamma-neutron'
  },
  {
    id: 246,
    name: 'Surveymeter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Surveymeter',
    price: 1600000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-surveymeter'
  },
  {
    id: 247,
    name: 'Syringe Pump',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Syringe Pump',
    price: 640000,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-syringe-pump'
  },
  {
    id: 248,
    name: 'Syringe Pump/ Pompa Syringe',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Syringe Pump/ Pompa Syringe',
    price: 830519,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-syringe-pump-pompa-syringe'
  },
  {
    id: 249,
    name: 'Tachometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Tachometer',
    price: 1054500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-tachometer'
  },
  {
    id: 250,
    name: 'TB Analizer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi TB Analizer',
    price: 250000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-tb-analizer'
  },
  {
    id: 251,
    name: 'TCM',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi TCM',
    price: 500000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-tcm'
  },
  {
    id: 252,
    name: 'TDS Meter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi TDS Meter',
    price: 393750,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-tds-meter'
  },
  {
    id: 253,
    name: 'Tele Endoscopy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Tele Endoscopy',
    price: 377400,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-tele-endoscopy'
  },
  {
    id: 254,
    name: 'Temperature Sensor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Temperature Sensor',
    price: 277500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-temperature-sensor'
  },
  {
    id: 255,
    name: 'TENS (Stimulator Elektrik)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi TENS (Stimulator Elektrik)',
    price: 475080,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-tens-stimulator-elektrik'
  },
  {
    id: 256,
    name: 'Tensi Aneroid',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Tensi Aneroid',
    price: 450000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-tensi-aneroid'
  },
  {
    id: 257,
    name: 'Tensi Digital',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Tensi Digital',
    price: 480000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-tensi-digital'
  },
  {
    id: 258,
    name: 'Termometer Digital',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Termometer Digital',
    price: 525000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-termometer-digital'
  },
  {
    id: 259,
    name: 'Termometer Kulkas',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Termometer Kulkas',
    price: 180000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-termometer-kulkas'
  },
  {
    id: 260,
    name: 'Therabeam UV',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Therabeam UV',
    price: 375000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-therabeam-uv'
  },
  {
    id: 261,
    name: 'Thermo Scientific Mikroton',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Thermo Scientific Mikroton',
    price: 444000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-thermo-scientific-mikroton'
  },
  {
    id: 262,
    name: 'Thermocouple',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Thermocouple',
    price: 780000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-thermocouple'
  },
  {
    id: 263,
    name: 'Thermohygrometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Thermohygrometer',
    price: 180000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-thermohygrometer'
  },
  {
    id: 264,
    name: 'Thermometer Clinic',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Thermometer Clinic',
    price: 200000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-thermometer-clinic'
  },
  {
    id: 265,
    name: 'Timbangan Badan',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Timbangan Badan',
    price: 199800,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-timbangan-badan'
  },
  {
    id: 266,
    name: 'Timbangan Barang',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Timbangan Barang',
    price: 416250,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-timbangan-barang'
  },
  {
    id: 267,
    name: 'Timbangan Bayi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Timbangan Bayi',
    price: 230880,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-tensi-jarum'
  },
  {
    id: 268,
    name: 'Timbangan Dewasa',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Timbangan Dewasa',
    price: 460000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-timbangan-dewasa'
  },
  {
    id: 269,
    name: 'Timbangan Gizi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Timbangan Gizi',
    price: 277500,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-timbangan-gizi'
  },
  {
    id: 270,
    name: 'Timbangan Laundry',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Timbangan Laundry',
    price: 277500,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-timbangan-laundry'
  },
  {
    id: 271,
    name: 'Timbangan Obat',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Timbangan Obat',
    price: 400000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-timbangan-obat'
  },
  {
    id: 272,
    name: 'Timbangan Popok/Analitik',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Timbangan Popok/Analitik',
    price: 420000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-timbangan-bayi'
  },
  {
    id: 273,
    name: 'Timpanometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Timpanometer',
    price: 375000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-timpanometer'
  },
  {
    id: 274,
    name: 'Tissue Processor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Tissue Processor',
    price: 375000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-tissue-processor'
  },
  {
    id: 275,
    name: 'Tonometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Tonometer',
    price: 488400,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-tonometer'
  },
  {
    id: 276,
    name: 'Traksi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Traksi',
    price: 250000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-traksi'
  },
  {
    id: 277,
    name: 'Trans Magnetic Stimulator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Trans Magnetic Stimulator',
    price: 525000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-trans-magnetic-stimulator'
  },
  {
    id: 278,
    name: 'Transcranial Doppler',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Transcranial Doppler',
    price: 539999,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-transcranial-doppler'
  },
  {
    id: 279,
    name: 'Treadmill',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Treadmill',
    price: 450000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-treadmill'
  },
  {
    id: 280,
    name: 'Treadmill with ECG',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Treadmill with ECG',
    price: 555000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-treadmill-with-ecg'
  },
  {
    id: 281,
    name: 'Tube Sealer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Tube Sealer',
    price: 277500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-tube-sealer'
  },
  {
    id: 282,
    name: 'Tympanometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Tympanometer',
    price: 375000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-tympanometer'
  },
  {
    id: 283,
    name: 'Uji Kesesuaian Alat Kesehatan CT Scan',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Uji Kesesuaian Alat Kesehatan CT Scan',
    price: 3163500,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-uji-kesesuaian-alat-kesehatan-ct-scan'
  },
  {
    id: 284,
    name: 'Uji Kesesuaian Alat Kesehatan Mobile X-Ray',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Uji Kesesuaian Alat Kesehatan Mobile X-Ray',
    price: 4051500,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-uji-kesesuaian-alat-kesehatan-mobile-x-ray'
  },
  {
    id: 285,
    name: 'Uji Kesesuaian C-Arm X-Ray',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Uji Kesesuaian C-Arm X-Ray',
    price: 4000000,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/uji-kesesuaian-c-arm-x-ray'
  },
  {
    id: 286,
    name: 'Uji Kesesuaian Dental X-Ray',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Uji Kesesuaian Dental X-Ray',
    price: 4999999,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/uji-kesesuaian-dental-x-ray'
  },
  {
    id: 287,
    name: 'Uji Kesesuaian General XRay Purpose tanpa AEC',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Uji Kesesuaian General XRay Purpose tanpa AEC',
    price: 4999999,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/uji-kesesuaian-general-xray-purpose-tanpa-aec'
  },
  {
    id: 288,
    name: 'Uji Kesesuaian Portable X-Ray',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Uji Kesesuaian Portable X-Ray',
    price: 4999999,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/uji-kesesuaian-portable-x-ray'
  },
  {
    id: 289,
    name: 'Ultrasonic Scaler',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ultrasonic Scaler',
    price: 499500,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ultrasonic-scaler'
  },
  {
    id: 290,
    name: 'Ultrasonic Surgical Aspiration',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ultrasonic Surgical Aspiration',
    price: 475500,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ultrasonic-surgical-aspiration'
  },
  {
    id: 291,
    name: 'Ultrasonographh',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ultrasonographh',
    price: 384750,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ultrasonographh'
  },
  {
    id: 292,
    name: 'Ultrasound Theraphy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ultrasound Theraphy',
    price: 238650,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-timbangan-popok-analitik'
  },
  {
    id: 293,
    name: 'USG',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi USG',
    price: 760000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-usg'
  },
  {
    id: 294,
    name: 'USG Mata',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi USG Mata',
    price: 401820,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-usg-mata'
  },
  {
    id: 295,
    name: 'USG Vena',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi USG Vena',
    price: 545000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-usg-vena'
  },
  {
    id: 296,
    name: 'Vaporizer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vaporizer',
    price: 675000,
    unit: 'Unit',
    category: 'Bedah & Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-vaporizer'
  },
  {
    id: 297,
    name: 'Ventilator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ventilator',
    price: 671550,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ventilator'
  },
  {
    id: 298,
    name: 'Ventilator Bayi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ventilator Bayi',
    price: 720000,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ventilator-bayi'
  },
  {
    id: 299,
    name: 'Ventilator Transport/ Portabel',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ventilator Transport/ Portabel',
    price: 600001,
    unit: 'Unit',
    category: 'Terapi & Resusitasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ventilator-transport-portabel'
  },
  {
    id: 300,
    name: 'Vibrator Theraphy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vibrator Theraphy',
    price: 493950,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-ultrasound-theraphy'
  },
  {
    id: 301,
    name: 'Vital Sign Monitor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vital Sign Monitor',
    price: 515000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-vital-sign-monitor'
  },
  {
    id: 302,
    name: 'Vital Sign Simulator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vital Sign Simulator',
    price: 4850000,
    unit: 'Unit',
    category: 'Monitoring & Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-vital-sign-simulator'
  },
  {
    id: 303,
    name: 'Vital Stim',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vital Stim',
    price: 250000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-vital-stim'
  },
  {
    id: 304,
    name: 'Vitas Sign/ Prosim',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vitas Sign/ Prosim',
    price: 3108000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-vitas-sign-prosim'
  },
  {
    id: 305,
    name: 'Vitek 2',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vitek 2',
    price: 305250,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-vitek-2'
  },
  {
    id: 306,
    name: 'Vocastim',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vocastim',
    price: 424000,
    unit: 'Unit',
    category: 'Alat Kesehatan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-vocastim'
  },
  {
    id: 307,
    name: 'Vortex Mixer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vortex Mixer',
    price: 250000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-vortex-mixer'
  },
  {
    id: 308,
    name: 'Water Bath',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Water Bath',
    price: 525000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-water-bath'
  },
  {
    id: 309,
    name: 'X-Ray',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi X-Ray',
    price: 1800000,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-xray'
  },
  {
    id: 310,
    name: 'X-Ray Fluoroscopy',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi X-Ray Fluoroscopy',
    price: 1831500,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-x-ray-fluoroscopy'
  },
  {
    id: 311,
    name: 'X-Ray General Purpose',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi X-Ray General Purpose',
    price: 1498500,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-x-ray-general-purpose'
  },
  {
    id: 312,
    name: 'X-Ray Mammography',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi X-Ray Mammography',
    price: 3607500,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-x-ray-mammography'
  },
  {
    id: 313,
    name: 'X-Ray MRI',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi X-Ray MRI',
    price: 4995000,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-x-ray-mri'
  }
];

// Helper to find E-Catalogue item by name or part of name
export const getECatalogueTariff = (name: string): ECatalogueItem | undefined => {
  if (!name) return undefined;
  const normalized = name.toLowerCase().trim();
  const cleanInput = extractCleanToolName(normalized).toLowerCase();
  
  // 1. Exact match on clean name
  const exact = SPH_ECATALOGUE_CATALOG.find(t => {
    const tName = t.name.toLowerCase().trim();
    return tName === normalized || tName === cleanInput;
  });
  if (exact) return exact;
  
  // 2. StartsWith or Substring match on name
  const subMatch = SPH_ECATALOGUE_CATALOG.find(t => {
    const tName = t.name.toLowerCase().trim();
    return cleanInput.includes(tName) || tName.includes(cleanInput) || normalized.includes(tName);
  });
  if (subMatch) return subMatch;
  
  // 3. Fallback check inside link slug
  return SPH_ECATALOGUE_CATALOG.find(t => {
    const slug = t.link.split('/').pop() || '';
    const cleanSlug = slug.replace(/^(jasa-pengujian-dan-atau-kalibrasi-|jasa-kalibrasi-dan-atau-pengujian-|jasa-pengujian-kelistrikan-dan-kalibrasi-)/, '').replace(/-/g, ' ');
    return cleanInput.includes(cleanSlug) || cleanSlug.includes(cleanInput);
  });
};
