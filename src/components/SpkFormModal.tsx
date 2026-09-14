import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  UserCheck, 
  Wrench, 
  Building2, 
  Layers, 
  FileCheck,
  Printer,
  MapPin,
  Tag,
  Hash
} from 'lucide-react';
import { 
  CalibrationSchedule, 
  Hospital, 
  Technician, 
  CalibratorAsset, 
  MedicalDeviceToCalibrate,
  MarketingStaff 
} from '../types';
import { 
  TODAY_STR, 
  formatRupiah,
  getHospitalCode
} from '../utils/helpers';
import { CompanyLogo } from './CompanyLogo';
import { PdfUploader } from './PdfUploader';

interface SpkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: CalibrationSchedule, andPrint?: boolean) => void;
  hospitals: Hospital[];
  technicians: Technician[];
  calibrators: CalibratorAsset[];
  marketingList?: MarketingStaff[];
  initialData?: CalibrationSchedule | null;
}

export const SpkFormModal: React.FC<SpkFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  hospitals = [],
  technicians = [],
  calibrators = [],
  marketingList = [],
  initialData
}) => {
  if (!isOpen) return null;

  // Selected Hospital
  const defaultHospital = hospitals[0] || {
    id: 'RS-000',
    hospitalCode: '100',
    name: 'RSUD Dr. Moewardi Surakarta',
    type: 'RSUD' as const,
    address: 'Jl. Kolonel Sutarto No.132, Jebres, Kec. Jebres',
    city: 'Kota Surakarta, Jawa Tengah 57126',
    picName: 'H. Bambang Setiawan, S.ST., M.Kes.',
    picRole: 'Kepala IPSRS / ATEM',
    picPhone: '0812-2980-4567',
    picEmail: 'ipsrs.moewardi@jatengprov.go.id',
    activeDevicesCount: 32
  };

  const [hospitalId, setHospitalId] = useState(initialData?.hospitalId || defaultHospital.id);
  const selectedHospitalObj = useMemo(() => {
    return hospitals.find(h => h.id === hospitalId) || defaultHospital;
  }, [hospitals, hospitalId, defaultHospital]);

  const [pdfUrl, setPdfUrl] = useState<string | undefined>(initialData?.pdfUrl);

  // 7-Digit Calibration Label System States
  const initialHospCode = initialData?.hospitalCode || getHospitalCode(hospitalId, hospitals);
  const [hospitalCode, setHospitalCode] = useState(initialHospCode || '100');
  const [startSequence, setStartSequence] = useState<number>(initialData?.labelSequenceStart || 1);

  // Custom Hospital Fields
  const [hospitalName, setHospitalName] = useState(initialData?.hospitalName || selectedHospitalObj?.name || '');
  const [hospitalAddress, setHospitalAddress] = useState(
    initialData?.hospitalAddress || selectedHospitalObj?.address || 'Jl. Kolonel Sutarto No.132, Jebres, Kec. Jebres'
  );
  const [hospitalCity, setHospitalCity] = useState(
    initialData?.hospitalCity || selectedHospitalObj?.city || 'Kota Surakarta, Jawa Tengah 57126'
  );
  const [hospitalPicName, setHospitalPicName] = useState(
    initialData?.hospitalPic || selectedHospitalObj?.picName || 'H. Bambang Setiawan, S.ST., M.Kes.'
  );
  const [hospitalPicRole, setHospitalPicRole] = useState(
    initialData?.hospitalPicRole || selectedHospitalObj?.picRole || 'Kepala IPSRS / ATEM'
  );
  const [hospitalPicPhone, setHospitalPicPhone] = useState(
    initialData?.hospitalPhone || selectedHospitalObj?.picPhone || '0812-2980-4567'
  );

  // Document Numbers
  const [workOrderNumber, setWorkOrderNumber] = useState(
    initialData?.workOrderNumber || `SPK/SMK/2026/08/${Math.floor(100 + Math.random() * 900)}`
  );
  const [bapNumber, setBapNumber] = useState(
    initialData?.bapNumber || `021/SMK/BAP/VIII/2026`
  );
  const [poContractNumber, setPoContractNumber] = useState(
    initialData?.poContractNumber || `PO-${selectedHospitalObj?.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'RSUDM'}-2026-0744`
  );
  const [poDate, setPoDate] = useState(initialData?.poDate || TODAY_STR);

  // Dates & Priority
  const [scheduledDate, setScheduledDate] = useState(initialData?.scheduledDate || TODAY_STR);
  const [endDate, setEndDate] = useState(initialData?.endDate || TODAY_STR);
  const [priority, setPriority] = useState<'Kritis' | 'Tinggi' | 'Sedang' | 'Rutin'>(initialData?.priority || 'Tinggi');
  const [contractValue, setContractValue] = useState(initialData ? String(initialData.contractValue) : '42000000');
  const [notes, setNotes] = useState(initialData?.notes || 'Pengujian kalibrasi dan uji keselamatan listrik berkala sesuai standar Kemenkes RI No. 54/2015.');
  
  const defaultMkt = marketingList[0]?.name || 'Dimas Raditya, S.E.';
  const [marketingName, setMarketingName] = useState(initialData?.marketingName || defaultMkt);

  // Technician Assignment
  const defaultLead = technicians[0]?.id || '';
  const [leadTechId, setLeadTechId] = useState(initialData?.leadTechnicianId || defaultLead);
  const [selectedSupportIds, setSelectedSupportIds] = useState<string[]>(
    initialData?.supportTechnicianIds || (technicians.length > 2 ? [technicians[1].id, technicians[2].id] : [])
  );

  // MT Sign-off
  const [approvedByName, setApprovedByName] = useState(initialData?.approvedByName || 'Hafizh Pasifianto, S.Tr.T.');
  const [approvedByRole, setApprovedByRole] = useState(initialData?.approvedByRole || 'Manajer Teknik PT. Sarana Multi Kalibrasi');

  // Calibrators
  const [selectedCalibratorIds, setSelectedCalibratorIds] = useState<string[]>(
    initialData?.assignedCalibratorIds || (calibrators.slice(0, 3).map(c => c.id))
  );

  // Medical devices list
  const [devices, setDevices] = useState<MedicalDeviceToCalibrate[]>(
    initialData?.targetDevices || [
      { id: 'dev-1', name: 'Bedside Monitor', quantity: 9, room: 'ICU & HCU Lt. 2', brandModel: 'Mindray BeneVision N15', serialNumber: 'SN-MND-991 s/d 999', status: 'Pending', notes: 'Uji ECG, NIBP, SpO2, Temp' },
      { id: 'dev-2', name: 'Autoclave', quantity: 1, room: 'CSSD Sentral', brandModel: 'Tuttnauer 3870E', serialNumber: 'SN-TUT-8821', status: 'Pending', notes: 'Uji Suhu & Tekanan Sterilisasi' },
      { id: 'dev-3', name: 'High-Flow Nasal Cannula (HNFC)', quantity: 2, room: 'PICU / NICU', brandModel: 'Fisher & Paykel AIRVO 2', serialNumber: 'SN-FPA-3301/02', status: 'Pending', notes: 'Uji Flow & Kelembaban Oksigen' },
      { id: 'dev-4', name: 'Pulse Oxymetri', quantity: 1, room: 'Ruang Operasi 3', brandModel: 'Masimo Rad-97', serialNumber: 'SN-MSM-1144', status: 'Pending', notes: 'Uji SpO2 & Heart Rate' }
    ]
  );

  // Handle hospital select
  const handleHospitalSelect = (hId: string) => {
    setHospitalId(hId);
    const targetHosp = hospitals.find(h => h.id === hId);
    if (targetHosp) {
      setHospitalName(targetHosp.name);
      setHospitalAddress(targetHosp.address);
      setHospitalCity(targetHosp.city);
      setHospitalPicName(targetHosp.picName);
      setHospitalPicRole(targetHosp.picRole || 'Kepala IPSRS / ATEM');
      setHospitalPicPhone(targetHosp.picPhone);
      const code = targetHosp.hospitalCode || getHospitalCode(targetHosp.id, hospitals);
      setHospitalCode(code);
      setPoContractNumber(`PO-${targetHosp.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-2026`);
    }
  };

  const handleAddDeviceRow = () => {
    const newId = `dev-${Date.now().toString().slice(-4)}`;
    setDevices([
      ...devices,
      {
        id: newId,
        name: 'Infusion Pump',
        quantity: 5,
        room: 'Ruang Rawat Inap',
        brandModel: 'Terumo TE-171',
        serialNumber: `SN-INF-${Date.now().toString().slice(-4)}`,
        status: 'Pending',
        notes: 'Pengujian kalibrasi debit laju alir'
      }
    ]);
  };

  const handleRemoveDeviceRow = (id: string) => {
    if (devices.length <= 1) return;
    setDevices(devices.filter(d => d.id !== id));
  };

  const handleDeviceChange = (id: string, field: keyof MedicalDeviceToCalibrate, val: any) => {
    setDevices(devices.map(d => {
      if (d.id === id) {
        return { ...d, [field]: val };
      }
      return d;
    }));
  };

  const toggleSupportTech = (techId: string) => {
    if (selectedSupportIds.includes(techId)) {
      setSelectedSupportIds(selectedSupportIds.filter(id => id !== techId));
    } else {
      setSelectedSupportIds([...selectedSupportIds, techId]);
    }
  };

  const toggleCalibrator = (calId: string) => {
    if (selectedCalibratorIds.includes(calId)) {
      setSelectedCalibratorIds(selectedCalibratorIds.filter(id => id !== calId));
    } else {
      setSelectedCalibratorIds([...selectedCalibratorIds, calId]);
    }
  };

  const totalDeviceUnits = devices.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const selectedLeadTech = technicians.find(t => t.id === leadTechId) || technicians[0] || {
    id: 'TECH-001',
    name: 'Shifa Zalza Billa',
    strNumber: 'STR-TEM-2023-0101',
    specialization: 'Alat Terapi & Bedah'
  };

  const buildScheduleObject = (): CalibrationSchedule => {
    const supportTechNames = technicians
      .filter(t => selectedSupportIds.includes(t.id))
      .map(t => t.name);

    const calibratorNames = calibrators
      .filter(c => selectedCalibratorIds.includes(c.id))
      .map(c => `${c.code} - ${c.name.slice(0, 26)}`);

    return {
      id: initialData?.id || `SCH-${Date.now().toString().slice(-6)}`,
      workOrderNumber,
      bapNumber,
      bastpNumber: bapNumber.replace('BAP', 'BASTP'),
      poContractNumber,
      poDate,
      hospitalId: hospitalId || selectedHospitalObj?.id || 'RS-CUSTOM',
      hospitalCode: hospitalCode || '100',
      hospitalName: hospitalName || selectedHospitalObj.name,
      hospitalAddress: hospitalAddress || selectedHospitalObj.address,
      hospitalCity: hospitalCity || selectedHospitalObj.city,
      hospitalPic: hospitalPicName || selectedHospitalObj.picName,
      hospitalPicRole: hospitalPicRole || 'Kepala IPSRS / ATEM',
      hospitalPhone: hospitalPicPhone || selectedHospitalObj.picPhone,
      marketingName,
      labelStart: '',
      labelEnd: '',
      labelRange: '',
      labelSequenceStart: startSequence,
      approvedByName,
      approvedByRole,
      scheduledDate,
      endDate,
      leadTechnicianId: selectedLeadTech.id,
      leadTechnicianName: selectedLeadTech.name,
      supportTechnicianIds: selectedSupportIds,
      supportTechnicianNames: supportTechNames,
      targetDevices: devices,
      assignedCalibratorIds: selectedCalibratorIds,
      assignedCalibratorNames: calibratorNames,
      priority,
      status: (initialData?.status as any) || 'Dijadwalkan',
      estimatedHours: totalDeviceUnits * 2,
      contractValue: Number(contractValue) || 35000000,
      notes,
      pdfUrl,
      progressPercent: initialData?.progressPercent || 0,
      createdAt: initialData?.createdAt || TODAY_STR,
      remindersSentCount: initialData?.remindersSentCount || 0
    };
  };

  const handleSubmit = (e: React.FormEvent, andPrint: boolean = false) => {
    e.preventDefault();
    const schedule = buildScheduleObject();
    onSave(schedule, andPrint);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <form 
        onSubmit={(e) => handleSubmit(e, false)} 
        className="bg-white text-slate-800 rounded-2xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-[#D8D2CB] my-4 max-h-[94vh] flex flex-col justify-between"
      >
        {/* Header Modal - Flux Theme */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D8D2CB] shrink-0">
          <div className="flex items-center gap-3">
            <CompanyLogo size="sm" showSubtitle={false} variant="light" />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#1C658C]/10 text-[#1C658C] text-[10px] font-bold font-mono border border-[#1C658C]/30">
                  SURAT PERINTAH KERJA (SPK)
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">Form Resmi PT. Sarana Multi Kalibrasi</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#1C658C] mt-0.5">
                {initialData ? 'Formulir Edit & Penerbitan SPK' : 'Formulir Pembuatan Surat Perintah Kerja (SPK) Baru'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-[#EEEEEE] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 space-y-4 text-xs pr-1.5 custom-scrollbar">
          
          {/* SECTION 1: NAMA RS & ALAMAT RS */}
          <div className="p-4 bg-white rounded-xl border border-[#D8D2CB] space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#D8D2CB]/60 pb-2">
              <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1C658C]" />
                <span>1. Data Klien Rumah Sakit & Alamat Lengkap (Wajib)</span>
              </h3>
              <span className="text-[11px] text-slate-500">Data Rumah Sakit & Nomor SPK Resmi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Rumah Sakit / Faskes *
                </label>
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="Contoh: RS Unim Islam YAKSSI Gemolong"
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nomor SPK / Work Order *
                </label>
                <input
                  type="text"
                  required
                  value={workOrderNumber}
                  onChange={(e) => setWorkOrderNumber(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-[#1C658C] font-mono font-bold focus:outline-none focus:border-[#1C658C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Kota / Kabupaten RS *
                </label>
                <input
                  type="text"
                  required
                  value={hospitalCity}
                  onChange={(e) => setHospitalCity(e.target.value)}
                  placeholder="Contoh: Kab. Sragen / Kota Surakarta"
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-slate-900 focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#1C658C]" />
                  <span>ALAMAT LENGKAP RUMAH SAKIT (Wajib untuk SPK & Berita Acara) *</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={hospitalAddress}
                  onChange={(e) => setHospitalAddress(e.target.value)}
                  placeholder="Contoh: Jl. Kolonel Sutarto No.132, Jebres, Kec. Jebres, Kota Surakarta, Jawa Tengah 57126"
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-slate-900 focus:outline-none focus:border-[#1C658C] text-xs"
                />
              </div>
            </div>

            {/* PIC RS & Marketing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#D8D2CB]/60">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama PIC RS (IPSRS/ATEM) *</label>
                <input
                  type="text"
                  required
                  value={hospitalPicName}
                  onChange={(e) => setHospitalPicName(e.target.value)}
                  placeholder="Contoh: H. Bambang Setiawan, S.ST."
                  className="w-full p-2 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg text-slate-900 focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jabatan PIC RS</label>
                <input
                  type="text"
                  value={hospitalPicRole}
                  onChange={(e) => setHospitalPicRole(e.target.value)}
                  placeholder="Kepala IPSRS / ATEM"
                  className="w-full p-2 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg text-slate-900 focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">No. Kontak / HP PIC RS</label>
                <input
                  type="text"
                  value={hospitalPicPhone}
                  onChange={(e) => setHospitalPicPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full p-2 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg text-slate-900 font-mono focus:outline-none focus:border-[#1C658C]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: TANGGAL PELAKSANAAN & TEKNISI */}
          <div className="p-4 bg-white rounded-xl border border-[#D8D2CB] space-y-3 shadow-xs">
            <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-2 border-b border-[#D8D2CB]/60 pb-2">
              <Calendar className="w-4 h-4 text-[#1C658C]" />
              <span>2. Tanggal Pelaksanaan & Tim Teknisi Elektromedis (11 Personil)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  TANGGAL MULAI PELAKSANAAN *
                </label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  TANGGAL SELESAI PELAKSANAAN *
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#1C658C]"
                />
              </div>
            </div>

            {/* Lead Teknisi & Teknisi Pendamping */}
            <div className="space-y-2 pt-2 border-t border-[#D8D2CB]/60">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Lead Teknisi Elektromedis (Penanggung Jawab Lapangan) *
                </label>
                <select
                  value={leadTechId}
                  onChange={(e) => setLeadTechId(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-[#1C658C] rounded-xl text-[#1C658C] font-bold focus:outline-none"
                >
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.strNumber} ({t.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Teknisi Pendamping / Anggota Tim:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {technicians.filter(t => t.id !== leadTechId).map(tech => (
                    <label
                      key={tech.id}
                      className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        selectedSupportIds.includes(tech.id)
                          ? 'bg-[#1C658C]/10 border-[#1C658C] text-[#1C658C] font-semibold'
                          : 'bg-[#EEEEEE]/30 border-[#D8D2CB] text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSupportIds.includes(tech.id)}
                        onChange={() => toggleSupportTech(tech.id)}
                        className="rounded text-[#1C658C] focus:ring-[#1C658C]"
                      />
                      <div className="truncate">
                        <p className="truncate text-[11px] font-medium">{tech.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{tech.strNumber}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: KALIBRATOR STANDAR */}
          <div className="p-4 bg-white rounded-xl border border-[#D8D2CB] space-y-3 shadow-xs">
            <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-2 border-b border-[#D8D2CB]/60 pb-2">
              <Wrench className="w-4 h-4 text-[#1C658C]" />
              <span>3. Alat Kalibrator Standar yang Ditugaskan ke Lapangan</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {calibrators.map(cal => (
                <label
                  key={cal.id}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    selectedCalibratorIds.includes(cal.id)
                      ? 'bg-[#398AB9]/10 border-[#398AB9] text-[#1C658C] font-semibold'
                      : 'bg-[#EEEEEE]/30 border-[#D8D2CB] text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCalibratorIds.includes(cal.id)}
                    onChange={() => toggleCalibrator(cal.id)}
                    className="rounded text-[#1C658C] focus:ring-[#1C658C]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold">{cal.code} - {cal.name}</p>
                    <p className="text-[10px] text-slate-400">{cal.brand} {cal.model ? `(${cal.model})` : ''} • Kalibrasi s/d: {cal.nextCalibrationDueDate}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* SECTION 4: DAFTAR ALAT & NOMOR LABEL 7-DIGIT */}
          <div className="p-4 bg-white rounded-xl border border-[#D8D2CB] space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#D8D2CB]/60 pb-2">
              <div>
                <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#1C658C]" />
                  <span>4. Daftar Alat Medis & Alokasi Nomor Label 7-Digit ({totalDeviceUnits} Unit Total)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Nomor label di-generate otomatis berurutan sesuai format 7-digit RS.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddDeviceRow}
                className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Alat</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 px-2">
                <div className="col-span-1 text-center">No</div>
                <div className="col-span-4">Nama Alat Medis RS *</div>
                <div className="col-span-2 text-center">Jumlah (Qty) *</div>
                <div className="col-span-2">Ruangan</div>
                <div className="col-span-2">No. Label (7-Digit)</div>
                <div className="col-span-1 text-right">Aksi</div>
              </div>

              {devices.map((d, idx) => (
                <div key={d.id} className="grid grid-cols-12 gap-2 bg-[#EEEEEE]/40 p-2 rounded-xl border border-[#D8D2CB] items-center">
                  <div className="col-span-1 text-center font-bold text-[#1C658C] text-xs">
                    #{idx + 1}
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Suction Pump, Patient Monitor"
                      value={d.name}
                      onChange={(e) => handleDeviceChange(d.id, 'name', e.target.value)}
                      className="w-full p-2 bg-white border border-[#D8D2CB] rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#1C658C] font-medium"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-1 bg-white border border-[#398AB9] rounded-lg px-2 py-1">
                      <input
                        type="number"
                        min={1}
                        required
                        placeholder="Qty"
                        value={d.quantity || 1}
                        onChange={(e) => handleDeviceChange(d.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full bg-transparent text-xs text-[#1C658C] font-bold text-center focus:outline-none font-mono"
                      />
                      <span className="text-[10px] text-slate-500 font-medium">Unit</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="ICU / IGD / Poli"
                      value={d.room}
                      onChange={(e) => handleDeviceChange(d.id, 'room', e.target.value)}
                      className="w-full p-2 bg-white border border-[#D8D2CB] rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#1C658C]"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Label dari Teknisi"
                      value={d.labelNumber || ''}
                      onChange={(e) => handleDeviceChange(d.id, 'labelNumber', e.target.value)}
                      className="w-full p-2 bg-white border border-[#1C658C]/40 rounded-lg text-[11px] font-mono text-[#1C658C] font-bold focus:outline-none focus:border-[#1C658C]"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveDeviceRow(d.id)}
                      disabled={devices.length <= 1}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded disabled:opacity-20 shrink-0 transition-colors"
                      title="Hapus baris"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: KONTRAK & OTORISASI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white rounded-xl border border-[#D8D2CB] shadow-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nilai Kontrak Kalibrasi (Rp)</label>
              <input
                type="number"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                className="w-full p-2 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-[#1C658C] font-mono font-bold focus:outline-none focus:border-[#1C658C]"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Marketing In-Charge</label>
              <input
                type="text"
                value={marketingName}
                onChange={(e) => setMarketingName(e.target.value)}
                className="w-full p-2 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-slate-900 focus:outline-none focus:border-[#1C658C]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Catatan Khusus Lapangan</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instruksi tambahan..."
                className="w-full p-2 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-slate-900 focus:outline-none focus:border-[#1C658C]"
              />
            </div>
            {initialData?.id && (
              <div className="sm:col-span-2 mt-2 pt-2 border-t border-[#D8D2CB]">
                <PdfUploader 
                  folder="spk"
                  documentId={initialData.id}
                  existingPdfUrl={pdfUrl}
                  onUploadSuccess={setPdfUrl}
                />
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Buttons */}
        <div className="pt-4 border-t border-[#D8D2CB] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#D8D2CB] text-slate-600 hover:bg-[#EEEEEE] text-xs font-semibold transition-colors"
          >
            Batal
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="bg-[#398AB9] hover:bg-[#1C658C] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Simpan & Langsung Cetak SPK</span>
            </button>

            <button
              type="submit"
              className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <FileCheck className="w-4 h-4" />
              <span>Simpan Surat Perintah Kerja (SPK)</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
