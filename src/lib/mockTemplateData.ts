import { TemplateDocType } from './templateService';

export interface SystemFieldDefinition {
  key: string;
  label: string;
  example: string;
  category: 'header' | 'hospital' | 'signee' | 'financial' | 'items' | 'execution';
}

export const KOP_SURAT_SYSTEM_FIELDS: SystemFieldDefinition[] = [
  { key: 'companyName', label: 'Nama Perusahaan', example: 'PT. SARANA MULTI KALIBRASI', category: 'header' },
  { key: 'labSubtitle', label: 'Sub-Judul Laboratorium', example: 'Laboratorium Kalibrasi Alat Kesehatan', category: 'header' },
  { key: 'accreditationNo', label: 'Nomor Akreditasi KAN', example: 'LK-532-IDN', category: 'header' },
  { key: 'hospitalName', label: 'Nama Rumah Sakit / Tujuan', example: 'RSUD Subang Sehat Mandiri', category: 'hospital' },
  { key: 'date', label: 'Tanggal Surat', example: '07 September 2026', category: 'header' },
  { key: 'city', label: 'Kota Asal Surat', example: 'Surakarta', category: 'header' }
];

export const SPH_SYSTEM_FIELDS: SystemFieldDefinition[] = [
  { key: 'sphNumber', label: 'Nomor Surat SPH', example: '045/SPH-SMK/III/2026', category: 'header' },
  { key: 'subject', label: 'Perihal Surat', example: 'Surat Penawaran Harga Kalibrasi Alat Kesehatan', category: 'header' },
  { key: 'date', label: 'Tanggal Surat', example: '07 September 2026', category: 'header' },
  { key: 'city', label: 'Kota Asal Surat', example: 'Surakarta', category: 'header' },
  { key: 'recipientRole', label: 'Penerima / Jabatan', example: 'Direktur Utama', category: 'hospital' },
  { key: 'hospitalName', label: 'Nama Rumah Sakit / Faskes', example: 'RSUD Subang Sehat Mandiri', category: 'hospital' },
  { key: 'hospitalAddress', label: 'Alamat Rumah Sakit', example: 'Jl. Brigjen Katamso No. 12, Subang', category: 'hospital' },
  { key: 'marketingStaffName', label: 'Nama Marketing SMK', example: 'Sulis', category: 'signee' },
  { key: 'marketingStaffPhone', label: 'No. HP Marketing SMK', example: '0821-3670-7421', category: 'signee' },
  { key: 'directorName', label: 'Nama Direktur PT SMK', example: 'Ahmad Fajar Ariyanto', category: 'signee' },
  { key: 'directorTitle', label: 'Jabatan Direktur', example: 'Direktur', category: 'signee' },
  { key: 'subtotal1', label: 'Subtotal 1 (Sebelum PPN)', example: '15.000.000', category: 'financial' },
  { key: 'ppnAmount', label: 'Nilai PPN 11%', example: '1.650.000', category: 'financial' },
  { key: 'subtotal2', label: 'Subtotal 2 (Setelah PPN)', example: '16.650.000', category: 'financial' },
  { key: 'accommodationFee', label: 'Biaya Akomodasi', example: '1.850.000', category: 'financial' },
  { key: 'grandTotal', label: 'Total Akhir (Grand Total)', example: '18.500.000', category: 'financial' },
  { key: 'terbilang', label: 'Terbilang Kalimat Rupiah', example: 'Delapan Belas Juta Lima Ratus Ribu Rupiah', category: 'financial' },
  { key: 'items', label: 'Daftar Alat (Array / Baris)', example: 'Syringe Pump, ECG, Monitor...', category: 'items' }
];

export const SPK_SYSTEM_FIELDS: SystemFieldDefinition[] = [
  { key: 'spkNumber', label: 'Nomor SPK Resmi', example: 'SPK-20260907-001', category: 'header' },
  { key: 'hospitalName', label: 'Nama Rumah Sakit', example: 'RSUD Subang Sehat Mandiri', category: 'hospital' },
  { key: 'hospitalAddress', label: 'Alamat Rumah Sakit', example: 'Jl. Brigjen Katamso No. 12, Subang', category: 'hospital' },
  { key: 'hospitalCity', label: 'Kota RS', example: 'Subang, Jawa Barat', category: 'hospital' },
  { key: 'hospitalPic', label: 'PIC Rumah Sakit', example: 'dr. H. Hendrawan, Sp.A', category: 'hospital' },
  { key: 'hospitalPhone', label: 'No. Telepon RS', example: '0260-411234', category: 'hospital' },
  { key: 'poContractNumber', label: 'Nomor PO / Kontrak', example: 'PO-RSUDSUBANG-2026-009', category: 'header' },
  { key: 'poDateFormatted', label: 'Tanggal PO', example: '05 September 2026', category: 'header' },
  { key: 'leadTechnicianName', label: 'Nama Lead Teknisi', example: 'Wahyu Tri Prabowo', category: 'execution' },
  { key: 'scheduledDate', label: 'Tanggal Mulai Kalibrasi', example: '07 September 2026', category: 'execution' },
  { key: 'endDate', label: 'Tanggal Selesai Kalibrasi', example: '09 September 2026', category: 'execution' },
  { key: 'contractValue', label: 'Nilai Kontrak Pelaksanaan', example: 'Rp 18.500.000', category: 'financial' },
  { key: 'totalVolumePO', label: 'Total Target Unit', example: '12', category: 'items' },
  { key: 'devices', label: 'Daftar Rincian Alat', example: 'Daftar alat medis SPK', category: 'items' }
];

export const BAP_SYSTEM_FIELDS: SystemFieldDefinition[] = [
  { key: 'bapNumber', label: 'Nomor BAP', example: 'BAP-20260907-001', category: 'header' },
  { key: 'hospitalName', label: 'Nama Rumah Sakit', example: 'RSUD Subang Sehat Mandiri', category: 'hospital' },
  { key: 'hospitalAddress', label: 'Alamat Rumah Sakit', example: 'Jl. Brigjen Katamso No. 12, Subang', category: 'hospital' },
  { key: 'hospitalCity', label: 'Kota RS', example: 'Subang', category: 'hospital' },
  { key: 'poContractNumber', label: 'Nomor Kontrak / PO', example: 'PO-RSUDSUBANG-2026-009', category: 'header' },
  { key: 'leadTechnicianName', label: 'Nama Lead Teknisi', example: 'Wahyu Tri Prabowo', category: 'execution' },
  { key: 'totalVolumePO', label: 'Total Volume PO', example: '12', category: 'items' },
  { key: 'totalRealisasi', label: 'Total Realisasi Selesai', example: '12', category: 'items' },
  { key: 'totalSisa', label: 'Sisa Belum Selesai', example: '0', category: 'items' },
  { key: 'laikPakaiCount', label: 'Jumlah Laik Pakai', example: '12', category: 'items' },
  { key: 'tidakLaikCount', label: 'Jumlah Tidak Laik', example: '0', category: 'items' },
  { key: 'scheduledDate', label: 'Tanggal Pelaksanaan', example: '07 September 2026', category: 'execution' },
  { key: 'devices', label: 'Daftar Rincian Status Alat', example: 'Tabel status laik/tidak laik', category: 'items' }
];

export const BASTP_SYSTEM_FIELDS: SystemFieldDefinition[] = [
  { key: 'hospitalName', label: 'Nama Rumah Sakit', example: 'RSUD Subang Sehat Mandiri', category: 'hospital' },
  { key: 'hospitalAddress', label: 'Alamat Rumah Sakit', example: 'Jl. Brigjen Katamso No. 12, Subang', category: 'hospital' },
  { key: 'hospitalCity', label: 'Kota RS', example: 'Subang', category: 'hospital' },
  { key: 'poContractNumber', label: 'Nomor Kontrak / PO', example: 'PO-RSUDSUBANG-2026-009', category: 'header' },
  { key: 'leadTechnicianName', label: 'Lead Teknisi Penguji', example: 'Wahyu Tri Prabowo', category: 'execution' },
  { key: 'scheduledDate', label: 'Tanggal Berita Acara', example: '07 September 2026', category: 'execution' },
  { key: 'devices', label: 'Daftar Hasil Kalibrasi Alat', example: 'Tabel sertifikat & status', category: 'items' }
];

export const getSystemFieldsForType = (type: TemplateDocType): SystemFieldDefinition[] => {
  switch (type) {
    case 'kop_surat': return KOP_SURAT_SYSTEM_FIELDS;
    case 'sph': return SPH_SYSTEM_FIELDS;
    case 'spk': return SPK_SYSTEM_FIELDS;
    case 'bap': return BAP_SYSTEM_FIELDS;
    case 'bastp': return BASTP_SYSTEM_FIELDS;
  }
};

/**
 * Realistic mock data used for template testing and instant preview
 */
export const getMockDataForType = (type: TemplateDocType) => {
  const commonDevices = [
    { no: 1, name: 'Syringe Pump', description: 'Syringe Pump B.Braun Perfusor Space', labelNumber: '100.0001', quantity: 2, unit: 'Unit', unitPrice: '450.000', totalPrice: '900.000', room: 'ICU', brandModel: 'B.Braun Perfusor Space', serialNumber: 'SN-BB98231', status: 'Laik Pakai', notes: 'Kondisi Baik & Terkalibrasi' },
    { no: 2, name: 'Infusion Pump', description: 'Infusion Pump Terumo TE-171', labelNumber: '100.0002', quantity: 3, unit: 'Unit', unitPrice: '450.000', totalPrice: '1.350.000', room: 'Rawat Inap', brandModel: 'Terumo TE-171', serialNumber: 'SN-TR44120', status: 'Laik Pakai', notes: 'Kondisi Baik & Terkalibrasi' },
    { no: 3, name: 'Patient Monitor', description: 'Bedside Monitor Mindray BeneView T5', labelNumber: '100.0003', quantity: 2, unit: 'Unit', unitPrice: '850.000', totalPrice: '1.700.000', room: 'IGD', brandModel: 'Mindray BeneView T5', serialNumber: 'SN-MR78119', status: 'Laik Pakai', notes: 'Kondisi Baik & Terkalibrasi' },
    { no: 4, name: 'Electrocardiograph (ECG)', description: 'ECG 12-Lead Fukuda Denshi FX-7102', labelNumber: '100.0004', quantity: 1, unit: 'Unit', unitPrice: '750.000', totalPrice: '750.000', room: 'Poli Jantung', brandModel: 'Fukuda Denshi FX-7102', serialNumber: 'SN-FK33219', status: 'Laik Pakai', notes: 'Kondisi Baik & Terkalibrasi' },
    { no: 5, name: 'Defibrillator', description: 'Defibrillator Zoll M-Series Biphasic', labelNumber: '100.0005', quantity: 1, unit: 'Unit', unitPrice: '1.100.000', totalPrice: '1.100.000', room: 'ICU', brandModel: 'Zoll M-Series', serialNumber: 'SN-ZL55102', status: 'Laik Pakai', notes: 'Kondisi Baik & Terkalibrasi' }
  ];

  switch (type) {
    case 'kop_surat':
      return {
        companyName: 'PT. SARANA MULTI KALIBRASI',
        labSubtitle: 'Laboratorium Kalibrasi Alat Kesehatan',
        accreditationNo: 'LK-532-IDN',
        hospitalName: 'RSUD Subang Sehat Mandiri',
        date: '07 September 2026',
        city: 'Surakarta'
      };

    case 'sph':
      return {
        sphNumber: '045/SPH-SMK/III/2026',
        subject: 'Surat Penawaran Harga Kalibrasi Alat Kesehatan',
        date: '07 September 2026',
        city: 'Surakarta',
        recipientRole: 'Direktur Utama',
        hospitalName: 'RSUD Subang Sehat Mandiri',
        hospitalAddress: 'Jl. Brigjen Katamso No. 12, Dangdeur, Subang, Jawa Barat',
        marketingStaffName: 'Sulis',
        marketingStaffPhone: '0821-3670-7421',
        directorName: 'Ahmad Fajar Ariyanto',
        directorTitle: 'Direktur',
        subtotal1: '15.000.000',
        ppnAmount: '1.650.000',
        subtotal2: '16.650.000',
        accommodationFee: '1.850.000',
        grandTotal: '18.500.000',
        terbilang: 'Delapan Belas Juta Lima Ratus Ribu Rupiah',
        items: commonDevices
      };

    case 'spk':
      return {
        spkNumber: 'SPK-20260907-001',
        hospitalName: 'RSUD Subang Sehat Mandiri',
        hospitalAddress: 'Jl. Brigjen Katamso No. 12, Dangdeur, Subang, Jawa Barat',
        hospitalCity: 'Subang, Jawa Barat',
        hospitalPic: 'dr. H. Hendrawan, Sp.A (0812-9988-7766)',
        hospitalPhone: '0260-411234',
        poContractNumber: 'PO-RSUDSUBANG-2026-009',
        poDateFormatted: '05 September 2026',
        leadTechnicianName: 'Wahyu Tri Prabowo',
        scheduledDate: '07 September 2026',
        endDate: '09 September 2026',
        contractValue: 'Rp 18.500.000',
        totalVolumePO: '12',
        devices: commonDevices
      };

    case 'bap':
      return {
        bapNumber: 'BAP-20260907-001',
        hospitalName: 'RSUD Subang Sehat Mandiri',
        hospitalAddress: 'Jl. Brigjen Katamso No. 12, Dangdeur, Subang, Jawa Barat',
        hospitalCity: 'Subang',
        poContractNumber: 'PO-RSUDSUBANG-2026-009',
        leadTechnicianName: 'Wahyu Tri Prabowo',
        totalVolumePO: '12',
        totalRealisasi: '12',
        totalSisa: '0',
        laikPakaiCount: '12',
        tidakLaikCount: '0',
        scheduledDate: '07 September 2026',
        devices: commonDevices
      };

    case 'bastp':
      return {
        hospitalName: 'RSUD Subang Sehat Mandiri',
        hospitalAddress: 'Jl. Brigjen Katamso No. 12, Dangdeur, Subang, Jawa Barat',
        hospitalCity: 'Subang',
        poContractNumber: 'PO-RSUDSUBANG-2026-009',
        leadTechnicianName: 'Wahyu Tri Prabowo',
        scheduledDate: '07 September 2026',
        devices: commonDevices
      };
  }
};
