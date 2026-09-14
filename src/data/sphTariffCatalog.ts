// Master Pola Tarif Kalibrasi Alat Kesehatan PT. Sarana Multi Kalibrasi
// Sesuai Brosur Resmi LK-532-IDN / Kemenkes RI No. 26062301565850001

export interface TariffItem {
  id: number;
  name: string;
  price: number;
  unit: string;
  category: string;
  notes?: string;
}

export const SPH_TARIFF_CATALOG: TariffItem[] = [
  // Kolom 1 (No 1 - 54)
  { id: 1, name: 'Analytical Balance', price: 505000, unit: 'Unit', category: 'Laboratorium' },
  { id: 2, name: 'Angiography', price: 760500, unit: 'Unit', category: 'Radiologi' },
  { id: 3, name: 'Audiometer', price: 1782000, unit: 'Unit', category: 'Diagnostik' },
  { id: 4, name: 'Autoclave', price: 694800, unit: 'Unit', category: 'Sterilisasi' },
  { id: 5, name: 'Bed Side Monitor', price: 543600, unit: 'Unit', category: 'Life Support / ICU' },
  { id: 6, name: 'Light Source', price: 556000, unit: 'Unit', category: 'Bedah' },
  { id: 7, name: 'Blanket Warmer', price: 3718800, unit: 'Unit', category: 'Terapi' },
  { id: 8, name: 'Blood Bank', price: 680000, unit: 'Unit', category: 'Laboratorium' },
  { id: 9, name: 'Blood Pressure Monitor', price: 328000, unit: 'Unit', category: 'Diagnostik' },
  { id: 10, name: 'Blood Warmer', price: 522000, unit: 'Unit', category: 'Life Support' },
  { id: 11, name: 'Cardiotocograph (CTG)', price: 336000, unit: 'Unit', category: 'Kebidanan / Obgyn' },
  { id: 12, name: 'Centrifuge', price: 336000, unit: 'Unit', category: 'Laboratorium' },
  { id: 13, name: 'Centrifuge Refrigerator', price: 342000, unit: 'Unit', category: 'Laboratorium' },
  { id: 14, name: 'Cold Plate', price: 420000, unit: 'Unit', category: 'Laboratorium' },
  { id: 15, name: 'Computed Radiography (CR)', price: 1861200, unit: 'Unit', category: 'Radiologi' },
  { id: 16, name: 'Continuous Positive Airway Pressure (CPAP)', price: 1062000, unit: 'Unit', category: 'Life Support' },
  { id: 17, name: 'CT-Scan', price: 694800, unit: 'Unit', category: 'Radiologi' },
  { id: 18, name: 'Deep Freezer', price: 673200, unit: 'Unit', category: 'Laboratorium' },
  { id: 19, name: 'Defibrillator Monitor', price: 522000, unit: 'Unit', category: 'Life Support / Emergency' },
  { id: 20, name: 'Defibrillator with Electrocardiograph (ECG)', price: 702000, unit: 'Unit', category: 'Life Support' },
  { id: 21, name: 'Defibrillator / DC Shock / AED', price: 522000, unit: 'Unit', category: 'Life Support' },
  { id: 22, name: 'Dental Unit', price: 1692000, unit: 'Unit', category: 'Gigi / Dental' },
  { id: 23, name: 'Dental X-Ray', price: 1062000, unit: 'Unit', category: 'Radiologi Gigi' },
  { id: 24, name: 'Dental X-Ray Panoramic', price: 1242000, unit: 'Unit', category: 'Radiologi Gigi' },
  { id: 25, name: 'Dental X-Ray Panoramic with Cephalometric', price: 1321200, unit: 'Unit', category: 'Radiologi Gigi' },
  { id: 26, name: 'Digital Pressure Meter', price: 314000, unit: 'Unit', category: 'Alat Ukur' },
  { id: 27, name: 'Ear Nose Trouth (ENT) Treatment', price: 500400, unit: 'Unit', category: 'THT' },
  { id: 28, name: 'Echo Cardigraph', price: 738000, unit: 'Unit', category: 'Jantung / Kardiologi' },
  { id: 29, name: 'Electro Convulsive Therapy (ECT)', price: 446400, unit: 'Unit', category: 'Terapi' },
  { id: 30, name: 'Electro Encephalograph (EEG)', price: 500400, unit: 'Unit', category: 'Diagnostik Saraf' },
  { id: 31, name: 'Electro Myograph (EMG)', price: 608400, unit: 'Unit', category: 'Diagnostik Saraf' },
  { id: 32, name: 'Electro Stimulator (EST)', price: 348000, unit: 'Unit', category: 'Fisioterapi' },
  { id: 33, name: 'Electro Surgery Unit (ESU) / Cauter', price: 1782000, unit: 'Unit', category: 'Bedah' },
  { id: 34, name: 'Electrocardiograph (ECG)', price: 305000, unit: 'Unit', category: 'Jantung / Kardiologi' },
  { id: 35, name: 'Electrocardiograph (ECG) Monitor', price: 694800, unit: 'Unit', category: 'Jantung / Kardiologi' },
  { id: 36, name: 'Electrocardiograph (ECG) Simulator', price: 1494000, unit: 'Unit', category: 'Kalibrator / Standar' },
  { id: 37, name: 'ESWL', price: 1200000, unit: 'Unit', category: 'Urologi' },
  { id: 38, name: 'Fetal Detector / Doppler', price: 225000, unit: 'Unit', category: 'Kebidanan / Obgyn' },
  { id: 39, name: 'Freezer Laboratorium', price: 305000, unit: 'Unit', category: 'Laboratorium' },
  { id: 40, name: 'General Purpose X-Ray with Automatic Exposure (AEC)', price: 1839600, unit: 'Unit', category: 'Radiologi' },
  { id: 41, name: 'General Purpose X-Ray / X-Ray Konvensional', price: 2574000, unit: 'Unit', category: 'Radiologi' },
  { id: 42, name: 'Head Lamp', price: 360000, unit: 'Unit', category: 'Penerangan Medis' },
  { id: 43, name: 'Heart Rate Monitor', price: 300000, unit: 'Unit', category: 'Diagnostik' },
  { id: 44, name: 'Hematologi Analyzer', price: 1800000, unit: 'Unit', category: 'Laboratorium', notes: '*Uji keselamatan listrik & fungsi' },
  { id: 45, name: 'Hemodialisa', price: 2000000, unit: 'Unit', category: 'Life Support / HD' },
  { id: 46, name: 'High Flow Nasal Canula (HFNC)', price: 460000, unit: 'Unit', category: 'Life Support' },
  { id: 47, name: 'Hot Plate', price: 230000, unit: 'Unit', category: 'Laboratorium' },
  { id: 48, name: 'Infant Warmer', price: 414000, unit: 'Unit', category: 'Bayi / Neonatal' },
  { id: 49, name: 'Infra Red Lamp (IR Lamp)', price: 520000, unit: 'Unit', category: 'Fisioterapi' },
  { id: 50, name: 'Inkubator Perawatan', price: 565200, unit: 'Unit', category: 'Bayi / Neonatal' },
  { id: 51, name: 'Infusion Pump', price: 543600, unit: 'Unit', category: 'Life Support / Injeksi' },
  { id: 52, name: 'Keselamatan Listrik', price: 435600, unit: 'Unit', category: 'Safety Medis' },
  { id: 53, name: 'Laboratorium Inkubator', price: 435600, unit: 'Unit', category: 'Laboratorium' },
  { id: 54, name: 'Laboratorium Refrigerator', price: 435600, unit: 'Unit', category: 'Laboratorium' },

  // Kolom 2 (No 55 - 105)
  { id: 55, name: 'Laboratorium Rotator', price: 241200, unit: 'Unit', category: 'Laboratorium' },
  { id: 56, name: 'Lampu Operasi', price: 327600, unit: 'Unit', category: 'Bedah' },
  { id: 57, name: 'Laser Theraphy', price: 543600, unit: 'Unit', category: 'Terapi' },
  { id: 58, name: 'Light Source Endoscopy', price: 556000, unit: 'Unit', category: 'Endoskopi' },
  { id: 59, name: 'Magnetic Resonance Imaging (MRI)', price: 3978800, unit: 'Unit', category: 'Radiologi' },
  { id: 60, name: 'Mesin Anasthesi tanpa Vaporizer tanpa Ventilator', price: 480000, unit: 'Unit', category: 'Anestesi' },
  { id: 61, name: 'Mikropipet Fix', price: 480000, unit: 'Unit', category: 'Laboratorium' },
  { id: 62, name: 'Mikropipet Variabel', price: 890000, unit: 'Unit', category: 'Laboratorium' },
  { id: 63, name: 'Mikroskop', price: 1558800, unit: 'Unit', category: 'Laboratorium' },
  { id: 64, name: 'Mobile C-Arm X-Ray', price: 1796400, unit: 'Unit', category: 'Radiologi Bedah' },
  { id: 65, name: 'Mobile Unit X-Ray / Portable X-Ray', price: 1040400, unit: 'Unit', category: 'Radiologi' },
  { id: 66, name: 'Monitor Pasien (Bed Side Monitor)', price: 694800, unit: 'Unit', category: 'Life Support' },
  { id: 67, name: 'Nebulizer', price: 540000, unit: 'Unit', category: 'Terapi Pernapasan' },
  { id: 68, name: 'Nebulizer with Suction', price: 1062000, unit: 'Unit', category: 'Terapi Pernapasan' },
  { id: 69, name: 'Oven', price: 435600, unit: 'Unit', category: 'Laboratorium / Sterilisasi' },
  { id: 70, name: 'Paraffin Bath', price: 673200, unit: 'Unit', category: 'Fisioterapi' },
  { id: 71, name: 'Parameter Tester', price: 522000, unit: 'Unit', category: 'Alat Ukur' },
  { id: 72, name: 'Photo Therapy Unit / Blue Light', price: 300000, unit: 'Unit', category: 'Neonatus' },
  { id: 73, name: 'Photometer', price: 280000, unit: 'Unit', category: 'Laboratorium' },
  { id: 74, name: 'Portable Oxygen Concentrator', price: 320000, unit: 'Unit', category: 'Terapi Oksigen' },
  { id: 75, name: 'Pulse Oxymetri (SPO2 Monitor)', price: 522000, unit: 'Unit', category: 'Diagnostik' },
  { id: 76, name: 'Refraktometer / Auto Refraktor', price: 376000, unit: 'Unit', category: 'Mata' },
  { id: 77, name: 'Regulator Oksigen (Flowmeter)', price: 315000, unit: 'Unit', category: 'Gas Medis' },
  { id: 78, name: 'Ruang kedap suara audiometer (Chamber Audiometer)', price: 1062000, unit: 'Unit', category: 'Audiometri' },
  { id: 79, name: 'Sensor Thermocouple', price: 241200, unit: 'Unit', category: 'Suhu' },
  { id: 80, name: 'Short Wave Diathermy / Micro wave Diathermy (SWD/MWD)', price: 543600, unit: 'Unit', category: 'Fisioterapi', notes: '*Uji keselamatan listrik & fungsi' },
  { id: 81, name: 'Spectrophotometer', price: 441000, unit: 'Unit', category: 'Laboratorium' },
  { id: 82, name: 'Spirometer', price: 500400, unit: 'Unit', category: 'Paru / Diagnostik' },
  { id: 83, name: 'Sterilisator Basah', price: 327600, unit: 'Unit', category: 'Sterilisasi' },
  { id: 84, name: 'Sterilisator Kering', price: 349200, unit: 'Unit', category: 'Sterilisasi' },
  { id: 85, name: 'Stimulator / Roller Mixer', price: 262800, unit: 'Unit', category: 'Laboratorium' },
  { id: 86, name: 'Suction Dinding (Suction Walper)', price: 349200, unit: 'Unit', category: 'Gas Medis / Vakum' },
  { id: 87, name: 'Suction Pump', price: 250000, unit: 'Unit', category: 'Bedah / Rawat Inap' },
  { id: 88, name: 'Syringe Pump', price: 289000, unit: 'Unit', category: 'Life Support / Injeksi' },
  { id: 89, name: 'Tabung Oxygen', price: 500400, unit: 'Unit', category: 'Gas Medis' },
  { id: 90, name: 'Tachometer', price: 392400, unit: 'Unit', category: 'Kecepatan Putar' },
  { id: 91, name: 'Tensimeter (Sphygmomanometer Air Raksa/Jarum)', price: 225000, unit: 'Unit', category: 'Diagnostik Tekanan' },
  { id: 92, name: 'Tensimeter Digital', price: 250000, unit: 'Unit', category: 'Diagnostik Tekanan' },
  { id: 93, name: 'Termometer Gelas', price: 250000, unit: 'Unit', category: 'Suhu' },
  { id: 94, name: 'Termometer Infrared', price: 250000, unit: 'Unit', category: 'Suhu' },
  { id: 95, name: 'Termometer Klinik (Clinical Thermometer)', price: 250000, unit: 'Unit', category: 'Suhu' },
  { id: 96, name: 'Termometer Ruang', price: 250000, unit: 'Unit', category: 'Suhu' },
  { id: 97, name: 'Thermohygrometer Analog', price: 250000, unit: 'Unit', category: 'Suhu & Kelembaban' },
  { id: 98, name: 'Thermohygrometer Digital', price: 420000, unit: 'Unit', category: 'Suhu & Kelembaban' },
  { id: 99, name: 'Timbangan Bayi', price: 300000, unit: 'Unit', category: 'Timbangan' },
  { id: 100, name: 'Timbangan Digital / Timbangan Dewasa', price: 475000, unit: 'Unit', category: 'Timbangan' },
  { id: 101, name: 'Timbangan Mekanik / Timbangan Dewasa', price: 230000, unit: 'Unit', category: 'Timbangan' },
  { id: 102, name: 'Traksi', price: 414000, unit: 'Unit', category: 'Fisioterapi' },
  { id: 103, name: 'Treadmill', price: 515000, unit: 'Unit', category: 'Kardiologi' },
  { id: 104, name: 'Treadmill with Electrocardiograph (ECG)', price: 565200, unit: 'Unit', category: 'Kardiologi' },

  // Kolom 3 (No 105 - 121)
  { id: 105, name: 'Ultra Sound Therapy (UST)', price: 505000, unit: 'Unit', category: 'Fisioterapi', notes: '*Uji keselamatan listrik & fungsi' },
  { id: 106, name: 'Ultra Violet Lamp (UV Lamp)', price: 320000, unit: 'Unit', category: 'Sterilisasi' },
  { id: 107, name: 'Ultra Violet Sterilizer', price: 760000, unit: 'Unit', category: 'Sterilisasi' },
  { id: 108, name: 'Ultrasonography (USG)', price: 522000, unit: 'Unit', category: 'Radiologi / USG' },
  { id: 109, name: 'USG Mata', price: 3718800, unit: 'Unit', category: 'Mata' },
  { id: 110, name: 'Ventilator ICU / Transport', price: 3718800, unit: 'Unit', category: 'Life Support / ICU' },
  { id: 111, name: 'Vacuum Extractor', price: 289000, unit: 'Unit', category: 'Kebidanan / Obgyn' },
  { id: 112, name: 'Vaporizer dengan gas desflurane', price: 3718800, unit: 'Unit', category: 'Anestesi' },
  { id: 113, name: 'Vaporizer dengan gas enflurane', price: 3718800, unit: 'Unit', category: 'Anestesi' },
  { id: 114, name: 'Vaporizer dengan gas halothane', price: 3718800, unit: 'Unit', category: 'Anestesi' },
  { id: 115, name: 'Vaporizer dengan gas isoflurane', price: 3718800, unit: 'Unit', category: 'Anestesi' },
  { id: 116, name: 'Vaporizer dengan gas sevoflurane', price: 3718800, unit: 'Unit', category: 'Anestesi' },
  { id: 117, name: 'Vaporizer tanpa gas anesthesi', price: 560000, unit: 'Unit', category: 'Anestesi' },
  { id: 118, name: 'Water Bath', price: 695000, unit: 'Unit', category: 'Laboratorium' },
  { id: 119, name: 'X-Ray Fluoroscopy (Dual fungsi R/F)', price: 1990800, unit: 'Unit', category: 'Radiologi' },
  { id: 120, name: 'X-Ray Mammography', price: 1623600, unit: 'Unit', category: 'Radiologi' },
  { id: 121, name: 'X-Ray Radiografi Umum / Konvensional', price: 2574000, unit: 'Unit', category: 'Radiologi' }
];

// Helper to find standard price
export const getStandardTariff = (name: string): TariffItem | undefined => {
  const normalized = name.toLowerCase().trim();
  return SPH_TARIFF_CATALOG.find(t => 
    t.name.toLowerCase() === normalized ||
    normalized.includes(t.name.toLowerCase()) ||
    t.name.toLowerCase().includes(normalized)
  );
};
