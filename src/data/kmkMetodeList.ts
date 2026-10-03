/**
 * Daftar Metode Kerja (MK) Kalibrasi sesuai KMK Kemenkes.
 * Sumber: folder Google Drive "KMK" PT. SMK (MK 001 s/d MK 133).
 * Format kode metode untuk isian ASPAK: KMK-MK-<3 digit>-0  (contoh: KMK-MK-085-0)
 *
 * `keywords` dipakai untuk menebak metode otomatis dari nama alat di rekap.
 * `isDevice: false` = dokumen umum (bukan metode alat), tidak ditawarkan sebagai metode.
 */
export interface KmkMetode {
  no: string;          // '085'
  title: string;       // 'PULSE OXYMETER'
  keywords: string[];  // kata kunci nama alat (huruf kecil)
  isDevice?: boolean;
}

export const KMK_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1z5Okj7Ogup1WVSjDC7B7B-_1ghxc-QE3?usp=sharing';

export const toMetodeCode = (no: string) => `KMK-MK-${no.padStart(3, '0')}-0`;

export const KMK_METODE_LIST: KmkMetode[] = [
  { no: '001', title: 'METODE DISTRIBUSI DAN PENGENDALIAN DOKUMEN', keywords: [], isDevice: false },
  { no: '002', title: 'KELISTRIKAN', keywords: ['pengujian keselamatan listrik', 'kelistrikan', 'uji listrik'] },
  { no: '003', title: 'ATURAN PERSYARATAN DAN KEPUTUSAN', keywords: [], isDevice: false },
  { no: '004', title: 'ANAESTHESI UNIT', keywords: ['mesin anestesi', 'mesin anastesi', 'mesin anaesthesi', 'anaesthesi unit', 'anesthesia unit', 'anestesi unit'] },
  { no: '005', title: 'ANTROPOMETRI BAYI', keywords: ['antropometri', 'alat ukur panjang bayi', 'infantometer'] },
  { no: '006', title: 'AUDIOMETRI', keywords: ['audiometer', 'audiometri'] },
  { no: '007', title: 'AUTOCLAVE', keywords: ['autoclave', 'autoklaf', 'steam sterilizer', 'sterilisator basah'] },
  { no: '008', title: 'AED', keywords: ['aed', 'automated external defibrillator'] },
  { no: '009', title: 'AUTO CHEMISTRY ANALIZER / KIMIA ANALIZER', keywords: ['chemistry analyzer', 'chemistry analizer', 'kimia analyzer', 'kimia analizer', 'clinical chemistry'] },
  { no: '010', title: 'AUTOREFRAKTOMETER', keywords: ['autorefraktometer', 'autorefractometer', 'autorefrac', 'refraktometer', 'refrakto keratometer'] },
  { no: '011', title: 'AUTOTRANFUSION UNIT', keywords: ['autotransfusion', 'autotranfusion', 'cell saver'] },
  { no: '012', title: 'BEDSIDE MONITOR', keywords: ['bedside monitor', 'bed side monitor', 'patient monitor', 'pasien monitor', 'monitor pasien'] },
  { no: '013', title: 'BERA', keywords: ['bera', 'abr', 'brain evoked'] },
  { no: '014', title: 'BLANKET WARMER', keywords: ['blanket warmer', 'blanket roll'] },
  { no: '015', title: 'BLOOD BANK REFRIGERATOR', keywords: ['blood bank', 'blood bank refrigerator', 'kulkas darah'] },
  { no: '016', title: 'BLOOD AND SOLUTION WARMER', keywords: ['blood warmer', 'fluid warmer', 'solution warmer', 'infusion warmer'] },
  { no: '017', title: 'BIOMETRI ULTRASOUND', keywords: ['biometri', 'biometer', 'a-scan'] },
  { no: '018', title: 'BONE MINERAL DENSITOMETER', keywords: ['bone densitometer', 'bone mineral', 'bmd', 'dexa'] },
  { no: '019', title: 'CARDIOTOCOGRAPH', keywords: ['ctg', 'cardiotocograph', 'cardiotokograf', 'cardiocotograph', 'kardiotokografi'] },
  { no: '020', title: 'CENTRIFUGE', keywords: ['centrifuge', 'sentrifus', 'sentrifuse'] },
  { no: '021', title: 'CENTRIFUGE REFRIGERATOR', keywords: ['refrigerated centrifuge', 'centrifuge refrigerator'] },
  { no: '022', title: 'CHART VISUAL PROJECTOR ACP', keywords: ['chart projector', 'chart proyektor', 'visual projector', 'acp'] },
  { no: '023', title: 'COLD CHAIN VACCINE REFRIGERATOR', keywords: ['cold chain', 'vaccine refrigerator', 'refrigerator vaksin', 'kulkas vaksin'] },
  { no: '024', title: 'CONTRAST MEDIA INJECTOR', keywords: ['contrast media', 'injector kontras', 'pressure injector'] },
  { no: '025', title: 'CPAP', keywords: ['cpap'] },
  { no: '026', title: 'DEFIBRILATOR', keywords: ['defibrilator', 'defibrillator'] },
  { no: '027', title: 'DEFIBRILATOR DGN ECG', keywords: ['defibrilator dengan ecg', 'defibrillator ecg'] },
  { no: '028', title: 'DEFIBRILATOR DGN PATIENT MONITOR', keywords: ['defibrilator dengan pasien monitor', 'defibrilator dengan patient monitor'] },
  { no: '029', title: 'DEFIBRILATOR DGN SPO2 MONITOR', keywords: ['defibrilator dengan spo2'] },
  { no: '030', title: 'DENTAL UNIT', keywords: ['dental unit', 'dental chair'] },
  { no: '031', title: 'ELECTROCARDIOGRAPH', keywords: ['ecg', 'ekg', 'electrocardiograph', 'elektrokardiograf', 'ecg recorder'] },
  { no: '032', title: 'EXTRA CORPOREAL MEMBRAN OXYGENATION', keywords: ['ecmo'] },
  { no: '033', title: 'ELECTRO ACCUPUNTURE', keywords: ['akupuntur', 'acupuncture', 'acupunture', 'electro acupuncture'] },
  { no: '034', title: 'ELECTRO CONVULSIVE THERAPHY', keywords: ['ect', 'electro convulsive', 'electroconvulsive'] },
  { no: '035', title: 'ELECTRO ENCEPHALOGRAPH', keywords: ['eeg', 'electroencephalograph', 'elektroensefalograf'] },
  { no: '036', title: 'ELECTROMYOGRAPH EMG', keywords: ['emg', 'electromyograph', 'elektromiograf'] },
  { no: '037', title: 'ENT TREATMENT', keywords: ['ent unit', 'tht unit', 'ent treatment'] },
  { no: '038', title: 'ELECTROSTIMULATOR EST', keywords: ['electro stimulator', 'electrostimulator', 'tens', 'stimulator elektrik', 'est'] },
  { no: '039', title: 'ELECTROSTIMULATOR EST DENGAN VAKUM', keywords: ['stimulator dengan vakum', 'tens vacuum', 'est vakum'] },
  { no: '040', title: 'ELECTRO SURGERY ESU', keywords: ['esu', 'electrosurgical', 'electro surgical', 'cauter', 'couter', 'kauter'] },
  { no: '041', title: 'ENDOSCOPY SOURCE LIGHT', keywords: ['light source', 'endoscopy light', 'sumber cahaya endoskopi', 'endoscopy'] },
  { no: '042', title: 'EXAMINATION LAMP', keywords: ['examination lamp', 'lampu periksa', 'lampu tindakan'] },
  { no: '043', title: 'FETAL DOPPLER', keywords: ['fetal doppler', 'doppler janin'] },
  { no: '044', title: 'FLOWMETER', keywords: ['flowmeter', 'flow meter', 'regulator oksigen'] },
  { no: '045', title: 'HEAD LAMP MEDIK', keywords: ['head lamp', 'headlamp', 'lampu kepala'] },
  { no: '046', title: 'HEART LUNG MACHINE', keywords: ['heart lung', 'hlm'] },
  { no: '047', title: 'HEMATOLOGI ANALIZER', keywords: ['hematology analyzer', 'hematologi analyzer', 'hematologi analizer', 'hematology analizer'] },
  { no: '048', title: 'HEMODIALISA', keywords: ['hemodialisa', 'hemodialysis', 'haemodialisa', 'mesin hd'] },
  { no: '049', title: 'HIGH VACCUM SUCTION', keywords: ['suction pump', 'high vacuum suction', 'suction'] },
  { no: '050', title: 'Ho YAG LASER', keywords: ['holmium', 'ho yag', 'ho:yag'] },
  { no: '051', title: 'HUMIDIFIER', keywords: ['humidifier'] },
  { no: '052', title: 'INFANT RADIANT WARMER', keywords: ['infant warmer', 'radiant warmer', 'baby warmer'] },
  { no: '053', title: 'INFUSION PUMP', keywords: ['infusion pump', 'infuse pump', 'pompa infus'] },
  { no: '054', title: 'INKUBATOR BAYI', keywords: ['inkubator bayi', 'baby incubator', 'infant incubator', 'inkubator transport', 'incubator transport'] },
  { no: '055', title: 'INKUBATOR LABORATORIUM', keywords: ['inkubator lab', 'inkubator laboratorium', 'incubator lab'] },
  { no: '056', title: 'INSUFLATOR LAPAROSCOPY', keywords: ['insuflator', 'insufflator', 'laparoscopy', 'laparoskopi'] },
  { no: '057', title: 'INTERMITEN PNEUMATIC COMPRESSION UNIT', keywords: ['pneumatic compression', 'intermittent pressure', 'decubitus pump', 'compression therapy'] },
  { no: '058', title: 'INTRA AORTA BALOON PUMP', keywords: ['iabp', 'intra aortic', 'intra aorta'] },
  { no: '059', title: 'KOMPUTER RADIOGRAFI', keywords: ['computed radiography', 'komputer radiografi', 'cr '] },
  { no: '060', title: 'LAMPU OPERASI', keywords: ['lampu operasi', 'operating lamp', 'surgical lamp'] },
  { no: '061', title: 'LARYNGOSCOPE', keywords: ['laryngoscope', 'laringoskop'] },
  { no: '062', title: 'LASER ARGON SURGICAL', keywords: ['laser argon'] },
  { no: '063', title: 'LOW VACCUM SUCTION', keywords: ['low vacuum', 'suction thorax', 'thorax suction'] },
  { no: '064', title: 'MAGNETIC RESONANCE IMAGING MRI', keywords: ['mri', 'magnetic resonance'] },
  { no: '065', title: 'MEDICAL FREEZER', keywords: ['medical freezer', 'freezer', 'deep freezer'] },
  { no: '066', title: 'MEDICAL REFRIGERATOR', keywords: ['medical refrigerator', 'refrigerator', 'kulkas', 'lemari es'] },
  { no: '067', title: 'MEDIUM VACUUM SUCTION', keywords: ['medium vacuum', 'suction dinding', 'wall suction'] },
  { no: '068', title: 'MIKROSKOP LABORATORIUM', keywords: ['mikroskop', 'microscope'] },
  { no: '069', title: 'MIKROPIPET VOLUME TETAP', keywords: ['mikropipet fix', 'micropipet fix', 'mikropipet tetap'] },
  { no: '070', title: 'MIKROPIPET VOLUME VARIABLE', keywords: ['mikropipet', 'micropipet', 'mikropipet variabel', 'micropipet variable'] },
  { no: '071', title: 'SLIT LAMP', keywords: ['slit lamp'] },
  { no: '072', title: 'ND YAG LASER', keywords: ['nd yag', 'nd:yag', 'yag laser'] },
  { no: '073', title: 'NEBULIZER', keywords: ['nebulizer', 'nebuliser', 'nebullizer'] },
  { no: '074', title: 'RADIO FREQUENCY GENERATOR', keywords: ['radio frequency generator', 'rf generator'] },
  { no: '075', title: 'NON INVASIF SPHYGMOMANOMETER OTOMATIS', keywords: ['tensimeter digital', 'tensi digital', 'blood pressure monitor', 'nibp', 'sphygmomanometer otomatis'] },
  { no: '076', title: 'OVEN', keywords: ['oven'] },
  { no: '077', title: 'OXYGEN CONCENTRATOR', keywords: ['oxygen concentrator', 'oksigen konsentrator', 'oksigen concentrator'] },
  { no: '078', title: 'PACE MAKER', keywords: ['pacemaker', 'pace maker'] },
  { no: '079', title: 'PATIENT COOLING AND WARMING UNIT', keywords: ['hyper-hypothermia', 'hyperthermia', 'cooling and warming'] },
  { no: '080', title: 'PATIENT COOLING UNIT', keywords: ['patient cooling', 'cooling unit'] },
  { no: '081', title: 'PERITONEAL DIALYSIS', keywords: ['peritoneal dialysis', 'capd', 'apd'] },
  { no: '082', title: 'PHACO EMULSIFICATION', keywords: ['phaco', 'pacho', 'fakoemulsifikasi'] },
  { no: '083', title: 'PHOTO TERAPHY', keywords: ['fototerapi', 'phototherapy', 'photo therapy', 'phototerapy', 'photo terapi', 'fototherapy', 'blue light'] },
  { no: '084', title: 'PLATELET AGITATOR INCUBATOR', keywords: ['platelet agitator', 'platelet inkubator', 'platelet incubator'] },
  { no: '085', title: 'PULSE OXYMETER', keywords: ['pulse oxymeter', 'pulse oximeter', 'oximeter', 'oxymeter', 'spo2'] },
  { no: '086', title: 'RADIO FREQUENCY ABLATOR', keywords: ['radiofrequency ablation', 'rfa', 'ablator'] },
  { no: '087', title: 'RESUSITATOR PARU NEOPUFF', keywords: ['neopuff', 'neo puff', 'resusitator', 't-piece'] },
  { no: '088', title: 'ROTATOR', keywords: ['rotator'] },
  { no: '089', title: 'SPEKTROFOTOMETER', keywords: ['spektrofotometer', 'spectrophotometer', 'spektofotometer', 'photometer', 'fotometer'] },
  { no: '090', title: 'SPHYGMOMANOMETER NON OTOMATIS', keywords: ['tensimeter', 'tensi aneroid', 'tensimeter aneroid', 'sphygmomanometer', 'tensi'] },
  { no: '091', title: 'SPIROMETER', keywords: ['spirometer', 'spirometri'] },
  { no: '092', title: 'STERILISATOR KERING', keywords: ['sterilisator kering', 'dry heat', 'sterilisator'] },
  { no: '093', title: 'STIRER', keywords: ['stirer', 'stirrer'] },
  { no: '094', title: 'STRESS MONITOR', keywords: ['stress monitor'] },
  { no: '095', title: 'SYRINGE PUMP', keywords: ['syringe pump', 'pompa syringe'] },
  { no: '096', title: 'TERMOMETER KLINIK', keywords: ['termometer', 'thermometer'] },
  { no: '097', title: 'THORACIC DRAINAGE', keywords: ['thoracic drainage', 'wsd'] },
  { no: '098', title: 'TIMBANGAN ANALITIK', keywords: ['timbangan analitik', 'analytical balance'] },
  { no: '099', title: 'TIMBANGAN ELEKTRONIK', keywords: ['timbangan elektronik', 'timbangan digital'] },
  { no: '100', title: 'TIMBANGAN BAYI DIGITAL', keywords: ['timbangan bayi digital'] },
  { no: '101', title: 'TIMBANGAN BAYI MEKANIK', keywords: ['timbangan bayi mekanik', 'timbangan bayi'] },
  { no: '102', title: 'TIMBANGAN DARAH HEMOSCALE', keywords: ['hemoscale', 'timbangan darah'] },
  { no: '103', title: 'TIMBANGAN DEWASA MEKANIK', keywords: ['timbangan dewasa mekanik', 'timbangan dewasa', 'timbangan badan'] },
  { no: '104', title: 'TIMBANGAN DEWASA DIGITAL', keywords: ['timbangan dewasa digital'] },
  { no: '105', title: 'TIMBANGAN POPOK DAN PAMPERS', keywords: ['timbangan popok', 'timbangan pampers'] },
  { no: '106', title: 'TONOMETER', keywords: ['tonometer'] },
  { no: '107', title: 'TORNIQUET PNEUMATIC', keywords: ['torniquet', 'tourniquet', 'torniket'] },
  { no: '108', title: 'TRAKSI UNIT', keywords: ['traksi', 'traction'] },
  { no: '109', title: 'TREADMILL', keywords: ['treadmill'] },
  { no: '110', title: 'TREADMILL DENGAN ECG', keywords: ['treadmill dengan ecg', 'treadmill ecg', 'treadmill with ecg', 'stress test'] },
  { no: '111', title: 'TIMPANOMETER', keywords: ['timpanometer', 'tympanometer', 'tymphanometer'] },
  { no: '112', title: 'ULTRASOUND THERAPHY UST', keywords: ['ultrasound therapy', 'ultrasound theraphy', 'ust'] },
  { no: '113', title: 'ULTRASONOGRAPHY USG', keywords: ['usg', 'ultrasonograph', 'ultrasonography', 'ultrasound'] },
  { no: '114', title: 'VACCUM EXTRACTOR', keywords: ['vacuum extractor', 'vakum ekstraktor', 'vaccum extractor'] },
  { no: '115', title: 'VAPORIZER ANAESTHESI', keywords: ['vaporizer', 'vaporiser'] },
  { no: '116', title: 'VENTILATOR ANAESTHESI', keywords: ['ventilator anestesi', 'ventilator anaesthesi'] },
  { no: '117', title: 'VENTILATOR ICU', keywords: ['ventilator', 'ventilator icu'] },
  { no: '118', title: 'VENTILATOR INFANT', keywords: ['ventilator bayi', 'ventilator infant', 'infant ventilator', 'hfo'] },
  { no: '119', title: 'VENTILATOR TRANSPORT', keywords: ['ventilator transport', 'ventilator portabel'] },
  { no: '120', title: 'VITAL SIGN MONITOR', keywords: ['vital sign', 'vitalsign'] },
  { no: '121', title: 'X RAY ANGIOGRAPHY', keywords: ['angiography', 'angiografi', 'cathlab'] },
  { no: '122', title: 'XRAY C ARM', keywords: ['c-arm', 'c arm'] },
  { no: '123', title: 'XRAY CT SCAN', keywords: ['ct scan', 'ct-scan', 'msct'] },
  { no: '124', title: 'ESWL', keywords: ['eswl', 'lithotripsy', 'lithotriptor'] },
  { no: '125', title: 'FLUOROSCOPY DAN RADIOGRAPHY', keywords: ['fluoroscopy', 'fluoroskopi'] },
  { no: '126', title: 'INTRA ORAL DENTAL', keywords: ['dental x-ray', 'intra oral', 'rontgen gigi'] },
  { no: '127', title: 'X RAY MAMMOGRAPHY', keywords: ['mammography', 'mammografi', 'mamografi'] },
  { no: '128', title: 'XRAY MOBILE', keywords: ['mobile x-ray', 'x-ray mobile', 'rontgen mobile'] },
  { no: '129', title: 'X RAY PANORAMIC DENTAL', keywords: ['panoramic', 'dental panoramic'] },
  { no: '130', title: 'X RAY PANORAMIC DENTAL DAN CEPHALOMETRI', keywords: ['cephalometri', 'chephalometri', 'cephalometric'] },
  { no: '131', title: 'X RAY RADIOGRAFI UMUM', keywords: ['x-ray', 'xray', 'rontgen', 'radiografi umum', 'general x-ray'] },
  { no: '132', title: 'XRAY RADIOGRAFI UMUM', keywords: [] },
  { no: '133', title: 'WARMING CABINET', keywords: ['warming cabinet', 'lemari penghangat'] },
];

/** Daftar metode yang valid (hanya metode alat) */
export const KMK_DEVICE_METODES = KMK_METODE_LIST.filter(m => m.isDevice !== false);

/** Set kode metode yang valid, contoh 'KMK-MK-085-0' */
export const VALID_METODE_CODES = new Set(KMK_DEVICE_METODES.map(m => toMetodeCode(m.no)));

const normalize = (s: string) =>
  ` ${String(s || '').toLowerCase().replace(/[^a-z0-9:]+/g, ' ').replace(/\s+/g, ' ').trim()} `;

/**
 * Tebak metode KMK dari nama alat. Kata kunci terpanjang yang cocok menang
 * (mis. "Treadmill dengan ECG" -> MK 110, bukan MK 109).
 * Mengembalikan null bila tidak ada yang cocok.
 */
export function guessMetodeFromName(namaAlat: string): KmkMetode | null {
  const name = normalize(namaAlat);
  if (!name.trim()) return null;
  let best: { m: KmkMetode; len: number } | null = null;
  for (const m of KMK_DEVICE_METODES) {
    for (const kw of m.keywords) {
      const k = normalize(kw);
      if (k.trim() && name.includes(k)) {
        const len = k.trim().length;
        if (!best || len > best.len) best = { m, len };
      }
    }
  }
  return best ? best.m : null;
}
