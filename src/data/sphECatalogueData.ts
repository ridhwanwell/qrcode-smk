// Master Pricelist & Link E-Catalogue PT. Sarana Multi Kalibrasi (Inaproc LKPP)
// 139 Item Alat Kesehatan Resmi

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
 * "Jasa Pengujian dan/atau Kalibrasi alat..."
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
    name: 'Laser',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat Laser',
    price: 424020,
    unit: 'Unit',
    category: 'Terapi / Bedah',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-laser'
  },
  {
    id: 2,
    name: 'Ultrasound Therapy (UST)',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Ultrasound Therapy (UST)',
    price: 493950,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-ultrasound-theraphy'
  },
  {
    id: 3,
    name: 'Vibrator Therapy',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Vibrator Therapy',
    price: 424020,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-vibrator-theraphy'
  },
  {
    id: 4,
    name: 'X-Ray',
    fullName: 'Jasa Kalibrasi dan/atau pengujian X-Ray',
    price: 1110000,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-xray'
  },
  {
    id: 5,
    name: 'Ventilator',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Ventilator',
    price: 671550,
    unit: 'Unit',
    category: 'Life Support / ICU',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-ventilator'
  },
  {
    id: 6,
    name: 'USG Mata',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan USG Mata',
    price: 401820,
    unit: 'Unit',
    category: 'Mata',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-usg-mata'
  },
  {
    id: 7,
    name: 'Tonometer',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Tonometer',
    price: 488400,
    unit: 'Unit',
    category: 'Mata',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-tonometer'
  },
  {
    id: 8,
    name: 'Timbangan Bayi',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Timbangan Bayi',
    price: 366300,
    unit: 'Unit',
    category: 'Timbangan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-timbangan-bayi'
  },
  {
    id: 9,
    name: 'Timbangan Popok / Analitik',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Timbangan Popok/ Analitik',
    price: 238650,
    unit: 'Unit',
    category: 'Timbangan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-timbangan-popok-analitik'
  },
  {
    id: 10,
    name: 'ENT Unit',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan ENT Unit',
    price: 355200,
    unit: 'Unit',
    category: 'THT',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-ent-unit'
  },
  {
    id: 11,
    name: 'Thermometer Digital',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Thermometer Digital',
    price: 405150,
    unit: 'Unit',
    category: 'Suhu',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-termometer-digital'
  },
  {
    id: 12,
    name: 'TENS',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan TENS',
    price: 475080,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-tens'
  },
  {
    id: 13,
    name: 'Syringe Pump',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Syringe Pump',
    price: 460650,
    unit: 'Unit',
    category: 'Life Support / Injeksi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-syringe-pump'
  },
  {
    id: 14,
    name: 'Steam Sterilisator',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Steam Sterilisator',
    price: 482850,
    unit: 'Unit',
    category: 'Sterilisasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-steam-sterilisator'
  },
  {
    id: 15,
    name: 'Slit Lamp',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Slit Lamp',
    price: 366300,
    unit: 'Unit',
    category: 'Mata',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-slit-lamp'
  },
  {
    id: 16,
    name: 'Spirometer',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Spirometer',
    price: 505050,
    unit: 'Unit',
    category: 'Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-spirometer'
  },
  {
    id: 17,
    name: 'Pulse Oxymeter',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Pulse Oxymeter',
    price: 321900,
    unit: 'Unit',
    category: 'Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-pulse-oxymeter'
  },
  {
    id: 18,
    name: 'Pendingin Jenazah',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Pendingin Jenazah',
    price: 499500,
    unit: 'Unit',
    category: 'Laboratorium / Kamar Jenazah',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-pendingin-jenazah'
  },
  {
    id: 19,
    name: 'Dental Panoramic',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Dental Panoramic',
    price: 1332000,
    unit: 'Unit',
    category: 'Radiologi Gigi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-dental-panoramic'
  },
  {
    id: 20,
    name: 'Pacho',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Pacho',
    price: 424020,
    unit: 'Unit',
    category: 'Mata / Bedah',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-pacho'
  },
  {
    id: 21,
    name: 'Neopuff',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Neopuff',
    price: 360750,
    unit: 'Unit',
    category: 'Neonatus / ICU',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-neopuff'
  },
  {
    id: 22,
    name: 'Micro Wave Diathermy (MWD)',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Micro Wave Diathermy (MWD)',
    price: 599400,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-mwd'
  },
  {
    id: 23,
    name: 'Mobile X-Ray',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Mobile X-Ray',
    price: 1443000,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-mobile-x-ray'
  },
  {
    id: 24,
    name: 'Mikroskop Mata',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Mikroskop Mata',
    price: 424020,
    unit: 'Unit',
    category: 'Mata',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-mikroskop-mata'
  },
  {
    id: 25,
    name: 'Mikroskop',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Mikroskop',
    price: 310800,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-mikroskop'
  },
  {
    id: 26,
    name: 'Mikropipet',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Mikropipet',
    price: 333000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-mikropipet'
  },
  {
    id: 27,
    name: 'Low Sterilisator',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Low Sterilisator',
    price: 555000,
    unit: 'Unit',
    category: 'Sterilisasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-low-sterilisator'
  },
  {
    id: 28,
    name: 'Lensmeter',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Lensmeter',
    price: 421800,
    unit: 'Unit',
    category: 'Mata',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-lensmeter'
  },
  {
    id: 29,
    name: 'Laser Therapy',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Laser Therapy',
    price: 610500,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-laser-theraphy'
  },
  {
    id: 30,
    name: 'Laryngoscope',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Laryngoscope',
    price: 482850,
    unit: 'Unit',
    category: 'Diagnostik / Bedah',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-laryngoscope'
  },
  {
    id: 31,
    name: 'Laparoscopy',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Laparoscopy',
    price: 355200,
    unit: 'Unit',
    category: 'Bedah / Endoskopi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-laparoscopy'
  },
  {
    id: 32,
    name: 'Tensimeter Jarum / Sphygmomanometer',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Tensimeter Jarum/ Sphygmomanometer',
    price: 230880,
    unit: 'Unit',
    category: 'Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-tensi-jarum'
  },
  {
    id: 33,
    name: 'Lampu Tindakan',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Lampu Tindakan',
    price: 427350,
    unit: 'Unit',
    category: 'Bedah / Penerangan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-lampu-tindakan'
  },
  {
    id: 34,
    name: 'Lampu Operasi',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kesehatan Lampu Operasi',
    price: 360750,
    unit: 'Unit',
    category: 'Bedah / Penerangan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-lampu-operasi'
  },
  {
    id: 35,
    name: 'Keratometer',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Keratometer',
    price: 416250,
    unit: 'Unit',
    category: 'Mata',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-keratometer'
  },
  {
    id: 36,
    name: 'Lampu IR',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Lampu IR',
    price: 366300,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-lampu-ir'
  },
  {
    id: 37,
    name: 'Incubator Transport',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Incubator Transport',
    price: 987900,
    unit: 'Unit',
    category: 'Neonatus / Life Support',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-incubator-transport'
  },
  {
    id: 38,
    name: 'Infuse Pump',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Infuse Pump',
    price: 305250,
    unit: 'Unit',
    category: 'Life Support / Injeksi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-infuse-pump'
  },
  {
    id: 39,
    name: 'Phototherapy',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Phototeraphy',
    price: 344100,
    unit: 'Unit',
    category: 'Neonatus',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-fototerapi'
  },
  {
    id: 40,
    name: 'Finger Oximeter',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Finger Oximeter',
    price: 194250,
    unit: 'Unit',
    category: 'Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-finger-oximeter'
  },
  {
    id: 41,
    name: 'ESWT',
    fullName: 'Jasa Kalibrasi dan/atau pengujian ESWT',
    price: 488400,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-eswt'
  },
  {
    id: 42,
    name: 'ESWL',
    fullName: 'Jasa Kalibrasi dan/atau pengujian ESWL',
    price: 1753800,
    unit: 'Unit',
    category: 'Urologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibras-eswl'
  },
  {
    id: 43,
    name: 'ESU',
    fullName: 'Jasa Kalibrasi dan/atau pengujian ESU',
    price: 712620,
    unit: 'Unit',
    category: 'Bedah',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-esu'
  },
  {
    id: 44,
    name: 'Endoscopy',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Endoscopy',
    price: 427350,
    unit: 'Unit',
    category: 'Endoskopi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-endoscopy'
  },
  {
    id: 45,
    name: 'EEG',
    fullName: 'Jasa Kalibrasi dan/atau pengujian EEG',
    price: 813630,
    unit: 'Unit',
    category: 'Diagnostik Saraf',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-eeg'
  },
  {
    id: 46,
    name: 'Dosimeter',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Dosimeter',
    price: 555000,
    unit: 'Unit',
    category: 'Radiologi / Ukur',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-dosimeter'
  },
  {
    id: 47,
    name: 'Defibrillator',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Defibrillator',
    price: 527250,
    unit: 'Unit',
    category: 'Life Support / Emergency',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-defibrilator'
  },
  {
    id: 48,
    name: 'CT-Scan',
    fullName: 'Jasa Kalibrasi dan/atau pengujian CT-Scan',
    price: 2314350,
    unit: 'Unit',
    category: 'Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-ct-scan'
  },
  {
    id: 49,
    name: 'Cardiotocograph (CTG)',
    fullName: 'Jasa Kalibrasi dan/atau pengujian Cardiotograph (CTG)',
    price: 482850,
    unit: 'Unit',
    category: 'Kebidanan / Obgyn',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-ctg'
  },
  {
    id: 50,
    name: 'CPAP',
    fullName: 'Jasa Kalibrasi dan/atau pengujian CPAP',
    price: 623820,
    unit: 'Unit',
    category: 'Life Support',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-cpap'
  },
  {
    id: 51,
    name: 'C-Arm',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kalibrasi C-Arm',
    price: 1470750,
    unit: 'Unit',
    category: 'Radiologi Bedah',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-c-arm'
  },
  {
    id: 52,
    name: 'Blood Bank',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kalibrasi Blood Bank',
    price: 593850,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-blood-bank'
  },
  {
    id: 53,
    name: 'Bed Side Monitor',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kalibrasi Bed Side Monitor',
    price: 350000,
    unit: 'Unit',
    category: 'Life Support / ICU',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-bed-side-monitor'
  },
  {
    id: 54,
    name: 'Mesin Anestesi dengan Ventilator',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kalibrasi Mesin Anastesi dengan Ventilator',
    price: 1048950,
    unit: 'Unit',
    category: 'Anestesi / ICU',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-mesin-anastesi-dengan-ventilator'
  },
  {
    id: 55,
    name: 'AED',
    fullName: 'Jasa Kalibrasi dan/atau pengujian alat kalibrasi AED',
    price: 360750,
    unit: 'Unit',
    category: 'Life Support / Emergency',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-aed'
  },
  {
    id: 56,
    name: 'Refrigerator Laboratory',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Refrigerator Laboratory',
    price: 426000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-medical-refrigerator'
  },
  {
    id: 57,
    name: 'Refrigerator Vaksin',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Refrigerator Vaksin',
    price: 426000,
    unit: 'Unit',
    category: 'Laboratorium / Farmasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-refrigerator-vaksin'
  },
  {
    id: 58,
    name: 'Inkubator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Inkubator',
    price: 432750,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-inkubator'
  },
  {
    id: 59,
    name: 'Oven Sterilisator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Oven Sterilisator',
    price: 633750,
    unit: 'Unit',
    category: 'Sterilisasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-oven-sterilisator'
  },
  {
    id: 60,
    name: 'Chemistry Analyzer / Kimia Analyzer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Chemistry Analyzer/ Kimia Analyzer',
    price: 332250,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-chemistry-analyzer-kimia-analyzer'
  },
  {
    id: 61,
    name: 'Inkubator Laboratorium',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Inkubator Laboratorium',
    price: 432750,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-inkubator-laboratorium'
  },
  {
    id: 62,
    name: 'Ultrasonography (USG)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Ultrasonography (USG)',
    price: 384750,
    unit: 'Unit',
    category: 'Radiologi / USG',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-usg'
  },
  {
    id: 63,
    name: 'Timbangan Dewasa',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Timbangan Dewasa',
    price: 295500,
    unit: 'Unit',
    category: 'Timbangan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-timbangan-dewasa'
  },
  {
    id: 64,
    name: 'Blood Pressure Monitor',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blood Pressure Monitor',
    price: 250500,
    unit: 'Unit',
    category: 'Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-blood-pressure-monitor'
  },
  {
    id: 65,
    name: 'TDS Meter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi TDS Meter',
    price: 393750,
    unit: 'Unit',
    category: 'Alat Ukur',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-tds-meter'
  },
  {
    id: 66,
    name: 'Spektrofotometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Spektrofotometer',
    price: 363750,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-spektofotometer'
  },
  {
    id: 67,
    name: 'Rotator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Rotator',
    price: 283500,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-rotator'
  },
  {
    id: 68,
    name: 'Medical Refrigerator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Medical Refrigerator',
    price: 426000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-medical-refrigerator'
  },
  {
    id: 69,
    name: 'pH Meter',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi pH Meter',
    price: 366750,
    unit: 'Unit',
    category: 'Alat Ukur / Lab',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-ph-meter'
  },
  {
    id: 70,
    name: 'Oven',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Oven',
    price: 633750,
    unit: 'Unit',
    category: 'Laboratorium / Sterilisasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-oven'
  },
  {
    id: 71,
    name: 'Nebulizer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Nebulizer',
    price: 313500,
    unit: 'Unit',
    category: 'Terapi Pernapasan',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-nebulizer'
  },
  {
    id: 72,
    name: 'Inkubator Infant',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Alat Kesehatan Inkubator Infant',
    price: 510750,
    unit: 'Unit',
    category: 'Bayi / Neonatal',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-inkubator-infant'
  },
  {
    id: 73,
    name: 'Infant Warmer / Infant Radiant Warmer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Alat Kesehatan Infant Warmer/ Infant Radiant Warmer',
    price: 475500,
    unit: 'Unit',
    category: 'Bayi / Neonatal',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-infant-warmer'
  },
  {
    id: 74,
    name: 'Electrocardiograph (ECG)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Alat Kesehatan Electrocardiograph (ECG)',
    price: 298500,
    unit: 'Unit',
    category: 'Jantung / Kardiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-electrocardiograph'
  },
  {
    id: 75,
    name: 'Fetal Doppler',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Alat Kesehatan Fetal Doppler',
    price: 283651,
    unit: 'Unit',
    category: 'Kebidanan / Obgyn',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-fetal-doppler'
  },
  {
    id: 76,
    name: 'Dental Unit',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Alat Kesehatan Dental Unit',
    price: 324750,
    unit: 'Unit',
    category: 'Gigi / Dental',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-dental-unit'
  },
  {
    id: 77,
    name: 'Centrifuge',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Alat Kesehatan Centrifuge',
    price: 252000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-centrifuge'
  },
  {
    id: 78,
    name: 'Autoclave',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Alat Kesehatan Autoclave',
    price: 428999,
    unit: 'Unit',
    category: 'Sterilisasi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-autoclave'
  },
  {
    id: 79,
    name: 'Suction Pump',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Suction Pump',
    price: 239251,
    unit: 'Unit',
    category: 'Bedah / Rawat Inap',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-suction-pump'
  },
  {
    id: 80,
    name: 'Hemoscale / Timbangan Darah',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Hemoscale/ Timbangan Darah',
    price: 239251,
    unit: 'Unit',
    category: 'Laboratorium / Darah',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-hemoscale-timbangan-darah'
  },
  {
    id: 81,
    name: 'Flowmeter / Regulator Oksigen',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Flowmeter/ Regulator Oksigen',
    price: 217005,
    unit: 'Unit',
    category: 'Gas Medis',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-flowmeter-regulator-oksigen'
  },
  {
    id: 82,
    name: 'Blood Culture System',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blood Culture System',
    price: 250000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-automated-blood-culture-system'
  },
  {
    id: 83,
    name: 'High-Flow Nasal Cannula (HNFC)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi High-Flow Nasal Cannula (HNFC)',
    price: 388001,
    unit: 'Unit',
    category: 'Life Support',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatanhigh-flow-nasal-cannula'
  },
  {
    id: 84,
    name: 'TB Analyzer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi TB Analyzer',
    price: 250000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-tb-analizer'
  },
  {
    id: 85,
    name: 'Micro Wave Diathermy (MWD)',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Micro Wave Diathermy (MWD)',
    price: 250000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-microwave-diathermy'
  },
  {
    id: 86,
    name: 'Traksi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Traksi',
    price: 250000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-traksi'
  },
  {
    id: 87,
    name: 'Vital Stim',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vital Stim',
    price: 250000,
    unit: 'Unit',
    category: 'Fisioterapi / Rehab',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-kalibrasi-alat-kesehatan-vital-stim'
  },
  {
    id: 88,
    name: 'Vortex Mixer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vortex Mixer',
    price: 250000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-vortex-mixer'
  },
  {
    id: 89,
    name: 'Audiometer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Audiometer',
    price: 416250,
    unit: 'Unit',
    category: 'Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-audimeter'
  },
  {
    id: 90,
    name: 'BERA',
    fullName: 'Jasa Pengujian Kelistrikan dan/atau kalibrasi BERA',
    price: 250000,
    unit: 'Unit',
    category: 'Audiometri / Diagnostik',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-bera'
  },
  {
    id: 91,
    name: 'Autorefraktometer',
    fullName: 'Jasa Pengujian dan/atau kalibrasi Autorefraktometer',
    price: 250000,
    unit: 'Unit',
    category: 'Mata',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-autorefraktometer'
  },
  {
    id: 92,
    name: 'Blood Warmer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Blood Warmer',
    price: 444000,
    unit: 'Unit',
    category: 'Life Support',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-blood-warmer'
  },
  {
    id: 93,
    name: 'Chart Proyektor',
    fullName: 'Jasa Pengujian dan /atau kalibrasi Chart Proyektor',
    price: 421800,
    unit: 'Unit',
    category: 'Mata',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-chart-proyektor'
  },
  {
    id: 94,
    name: 'Cold Plate',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Cold Plate',
    price: 250000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-cold-plate'
  },
  {
    id: 95,
    name: 'Deep Freezer',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Deep Freezer',
    price: 480000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-deep-freezer'
  },
  {
    id: 96,
    name: 'Echo Cardiograph',
    fullName: 'Jasa Pengujian dan/atau kalibrasi Echo Cardiograph',
    price: 532800,
    unit: 'Unit',
    category: 'Jantung / Kardiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-echo-cardiograph'
  },
  {
    id: 97,
    name: 'Electro Convulsive Therapy (ECT)',
    fullName: 'Jasa Pengujian dan/atau kalibrasi Electro Convulsive Theraphy',
    price: 250000,
    unit: 'Unit',
    category: 'Terapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-electro-convulsive-theraphy'
  },
  {
    id: 98,
    name: 'Electromyograph (EMG)',
    fullName: 'Jasa Pengujia dan/atau Kalibrasi Electromyograph',
    price: 250000,
    unit: 'Unit',
    category: 'Diagnostik Saraf',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-electromyograph'
  },
  {
    id: 99,
    name: 'Electro Stimulator',
    fullName: 'Jasa Pengujian Kelistrikan dan/atau Kalibrasi Electro Stimulator',
    price: 275000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-electro-stimulator'
  },
  {
    id: 100,
    name: 'Endoskopi Urologi',
    fullName: 'Jasa Pengujian Kelistrikan dan/atau kalibrasi Endoskopi Urologi',
    price: 350000,
    unit: 'Unit',
    category: 'Endoskopi / Urologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-endoskopi-urologi'
  },
  {
    id: 101,
    name: 'Freezer Laboratorium',
    fullName: 'jasa Pengujian dan/atau kalibrasi Freezer Labratorium',
    price: 475500,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-freezer-laboratorium'
  },
  {
    id: 102,
    name: 'Gene Amp PCR System',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Gene Amp pcr System',
    price: 283500,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-gene-amp-pcr-system'
  },
  {
    id: 103,
    name: 'Haemodialisa',
    fullName: 'Jasa Pengujian dan/atau kalibrasi Haemodialisa',
    price: 2150000,
    unit: 'Unit',
    category: 'Life Support / HD',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-haemodialisa'
  },
  {
    id: 104,
    name: 'Hot Magner',
    fullName: 'Jasa Pengujian dan/atau kalibrasi Hot Magner',
    price: 475500,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-hot-magner'
  },
  {
    id: 105,
    name: 'Hydro Therapy Hydrocollator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Hydro Theraphy Hidrocollator',
    price: 475500,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-hidro-therapy-hidrocollator'
  },
  {
    id: 106,
    name: 'Hot Plate',
    fullName: 'Jasa Pengujia dan/atau Kalibrasi Hot Plate',
    price: 475500,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-hot-plate'
  },
  {
    id: 107,
    name: 'Immunoanalyzer',
    fullName: 'Jasa Pengujian dan/atau Kelistrikan Immunonalizer',
    price: 426000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-immunoanalyzer'
  },
  {
    id: 108,
    name: 'Microtome',
    fullName: 'Jasa Pengujian Kelistrikan dan/atau Kalibrasi Microtome',
    price: 250000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-microtome'
  },
  {
    id: 109,
    name: 'Medical Holmium Laser',
    fullName: 'JasaPengujian Kelistrikan dan/atukalibrasi Mdical Holmium Laser',
    price: 426000,
    unit: 'Unit',
    category: 'Bedah / Laser',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-medical-holmium-laser'
  },
  {
    id: 110,
    name: 'Mesin Anestesi',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mesin Anaesthesi',
    price: 777000,
    unit: 'Unit',
    category: 'Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-mesin-anaesthesi'
  },
  {
    id: 111,
    name: 'Micropipet Fix',
    fullName: 'Jasa Pengujian dan/atau kalibrasi Micropipet fix',
    price: 415000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-micropipet-fix'
  },
  {
    id: 112,
    name: 'Mikropipet Variable',
    fullName: 'Jasa Pengujian dan /atau Kalibrasi Mikropipet Variable',
    price: 415000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-micropipet-variable'
  },
  {
    id: 113,
    name: 'Mikroskop',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Mikroskop',
    price: 400000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-mikroskop'
  },
  {
    id: 114,
    name: 'Mikroskop Mata',
    fullName: 'Jasa Pengujian Kelistrikan dan/atau kalibrasi Mikroskop Mata',
    price: 426000,
    unit: 'Unit',
    category: 'Mata',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-kelistrikan-dan-atau-kalibrasi-mikroskop-mata'
  },
  {
    id: 115,
    name: 'Dental X-Ray (Uji Kesesuaian)',
    fullName: 'Uji Kesesuaian Dental X-Ray',
    price: 4999999,
    unit: 'Unit',
    category: 'Uji Kesesuaian Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/uji-kesesuaian-dental-x-ray'
  },
  {
    id: 116,
    name: 'Digital Pressure Meter',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan Digital Pressure meter',
    price: 2500000,
    unit: 'Unit',
    category: 'Alat Ukur / Standar',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-digital-pressure-meter'
  },
  {
    id: 117,
    name: 'General X-Ray Purpose tanpa AEC (Uji Kesesuaian)',
    fullName: 'Uji Kesesuaian General XRay Purpose tanpa AEC',
    price: 4999999,
    unit: 'Unit',
    category: 'Uji Kesesuaian Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/uji-kesesuaian-general-xray-purpose-tanpa-aec'
  },
  {
    id: 118,
    name: 'Suction Wall',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan Suction Wall',
    price: 180000,
    unit: 'Unit',
    category: 'Gas Medis / Vakum',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-suction-dinding-suction-wall'
  },
  {
    id: 119,
    name: 'Surgical Microscope',
    fullName: 'Jasa Kalibrasi dan atau Pengujian Alat Kesehatan Surgical Microssope',
    price: 500000,
    unit: 'Unit',
    category: 'Bedah / Mata',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-surgical-microscope'
  },
  {
    id: 120,
    name: 'Therabeam UV',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan Therabeam UV',
    price: 375000,
    unit: 'Unit',
    category: 'Fisioterapi / Dermatologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-surgical-microscope'
  },
  {
    id: 121,
    name: 'Tympanometer',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehaan Tympanometer',
    price: 375000,
    unit: 'Unit',
    category: 'THT',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-tympanometer'
  },
  {
    id: 122,
    name: 'Tissue Processor',
    fullName: 'Jasa Pengujian Kelistrikan Alat Kesehatan Tissue Proessor',
    price: 375000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-tissue-processor'
  },
  {
    id: 123,
    name: 'Parafin Bath',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan Parafin Bath',
    price: 400000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-parafin-bath'
  },
  {
    id: 124,
    name: 'Portable Oxygen Concentrator',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan Portable Oxygen Concentrator',
    price: 545000,
    unit: 'Unit',
    category: 'Terapi Oksigen',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-portable-oxygen-concentrator'
  },
  {
    id: 125,
    name: 'Radiofrequency Ablation (RFA)',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan Radiofrequency Ablation (RFA)',
    price: 375000,
    unit: 'Unit',
    category: 'Bedah / Terapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-radiofrequency-ablation-rfa'
  },
  {
    id: 126,
    name: 'Roller Mixer',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan Roller Mixer',
    price: 428999,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-roller-mixer'
  },
  {
    id: 127,
    name: 'RT PCR',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan RT PCR',
    price: 500000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-rt-pcr'
  },
  {
    id: 128,
    name: 'Shock Wave Therapy',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan Shock wave Therapy',
    price: 525000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-shock-wave-therapy'
  },
  {
    id: 129,
    name: 'Short Wave Diathermy',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan Shock Wave Diathermy',
    price: 500000,
    unit: 'Unit',
    category: 'Fisioterapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-short-wave-diathermy'
  },
  {
    id: 130,
    name: 'Stirrer',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan Stirer',
    price: 430000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-stirer'
  },
  {
    id: 131,
    name: 'Trans Magnetic Stimulator',
    fullName: 'Jasa Kalibrasi dan/atau Pengujin Alat Kesehatan Trans Magnetic Stimulator',
    price: 525000,
    unit: 'Unit',
    category: 'Diagnostik / Saraf',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-trans-magnetic-stimulator'
  },
  {
    id: 132,
    name: 'Transcranial Doppler',
    fullName: 'Jasa Kalibrasi dan/ata Pengujian Alat Kesehatan Transcranial Doppler',
    price: 539999,
    unit: 'Unit',
    category: 'Diagnostik / Saraf',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-transcranial-doppler'
  },
  {
    id: 133,
    name: 'Treadmill',
    fullName: 'Jasa Kalibrasi dan Pengujian Alat Kesehatan Treadmill',
    price: 250000,
    unit: 'Unit',
    category: 'Kardiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-treadmill'
  },
  {
    id: 134,
    name: 'Vaporizer',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Alat Kesehatan Vaporizer',
    price: 675000,
    unit: 'Unit',
    category: 'Anestesi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-vaporizer'
  },
  {
    id: 135,
    name: 'Vital Sign Simulator',
    fullName: 'Jasa Pengujian dan/atau Kalibrasi Vital Sign Simulator',
    price: 4850000,
    unit: 'Unit',
    category: 'Kalibrator / Simulator',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-vital-sign-simulator'
  },
  {
    id: 136,
    name: 'Water Bath',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian alat Kesehatan Water Bath',
    price: 525000,
    unit: 'Unit',
    category: 'Laboratorium',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-water-bath'
  },
  {
    id: 137,
    name: 'C-Arm X-Ray (Uji Kesesuaian)',
    fullName: 'Uji Kesesuaian C-Arm X-Ray',
    price: 4000000,
    unit: 'Unit',
    category: 'Uji Kesesuaian Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/uji-kesesuaian-c-arm-x-ray'
  },
  {
    id: 138,
    name: 'Portable X-Ray (Uji Kesesuaian)',
    fullName: 'Uji Kesesuaian Portable XRay',
    price: 4999999,
    unit: 'Unit',
    category: 'Uji Kesesuaian Radiologi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/uji-kesesuaian-portable-x-ray'
  },
  {
    id: 139,
    name: 'Blanket Warmer',
    fullName: 'Jasa Kalibrasi dan/atau Pengujian Blanket Warmer',
    price: 425000,
    unit: 'Unit',
    category: 'Terapi',
    link: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-alat-kalibrasi-dan-atau-pengujian-alat-kesehatan-blanket-warmer'
  }
];

// Helper to find E-Catalogue item by name or part of name
export const getECatalogueTariff = (name: string): ECatalogueItem | undefined => {
  const normalized = name.toLowerCase().trim();
  return SPH_ECATALOGUE_CATALOG.find(t => 
    t.name.toLowerCase() === normalized ||
    t.fullName.toLowerCase() === normalized ||
    normalized.includes(t.name.toLowerCase()) ||
    t.name.toLowerCase().includes(normalized)
  );
};
