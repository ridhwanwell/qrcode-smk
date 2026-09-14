import React, { useState } from 'react';
import { 
  UserCheck, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Award, 
  Star, 
  Briefcase, 
  Edit3, 
  Trash2, 
  X,
  ShieldCheck,
  CheckCircle2,
  Users,
  FileCheck
} from 'lucide-react';
import { Technician, MarketingStaff, CalibrationSchedule } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { PostCalibrationSeliaManager } from './PostCalibrationSeliaManager';

interface MasterHospitalAndTechProps {
  technicians: Technician[];
  marketingList?: MarketingStaff[];
  schedules?: CalibrationSchedule[];
  onUpdateSchedule?: (schedule: CalibrationSchedule) => void;
  onAddTechnician: (technician: Technician) => void;
  onUpdateTechnician: (technician: Technician) => void;
  initialSubTab?: 'technicians' | 'marketing' | 'management';
  onDeleteTechnician?: (technicianId: string) => void;
  onAddMarketing?: (marketing: MarketingStaff) => void;
  onDeleteMarketing?: (marketingId: string) => void;
  // Kept optional for backward compatibility if passed
  hospitals?: any[];
  onAddHospital?: (hospital: any) => void;
  onUpdateHospital?: (hospital: any) => void;
  onDeleteHospital?: (hospitalId: string) => void;
  onQuickCreateScheduleForHospital?: (hospital: any) => void;
}

export const MasterHospitalAndTech: React.FC<MasterHospitalAndTechProps> = ({
  technicians,
  marketingList = [],
  schedules = [],
  initialSubTab = 'technicians',
  onUpdateSchedule,
  onAddTechnician,
  onUpdateTechnician,
  onDeleteTechnician,
  onAddMarketing,
  onDeleteMarketing
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'technicians' | 'marketing' | 'management'>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddTechModal, setShowAddTechModal] = useState(false);
  const [showAddMarketingModal, setShowAddMarketingModal] = useState(false);

  // Edit states for Technician
  const [editingTech, setEditingTech] = useState<Technician | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'technician' | 'marketing';
    name: string;
    detail: string;
  } | null>(null);

  // Technician Form State
  const [techName, setTechName] = useState('');
  const [techTitle, setTechTitle] = useState('Teknisi Elektromedis Madya');
  const [techStr, setTechStr] = useState('');
  const [techSpec, setTechSpec] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [techEmail, setTechEmail] = useState('');
  const [techStatus, setTechStatus] = useState<'Tersedia' | 'Bertugas di RS' | 'Cuti / Libur'>('Tersedia');

  // Marketing Form State
  const [mktName, setMktName] = useState('');
  const [mktRole, setMktRole] = useState('Senior Account Executive Medis');
  const [mktPhone, setMktPhone] = useState('');
  const [mktEmail, setMktEmail] = useState('');
  const [mktArea, setMktArea] = useState('Jabodetabek & Jawa Barat');

  const filteredTechs = technicians.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.strNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMarketing = marketingList.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.assignedRegion && m.assignedRegion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Open Edit Modal for Technician
  const handleOpenEditTech = (tech: Technician) => {
    setEditingTech(tech);
    setTechName(tech.name);
    setTechTitle(tech.title);
    setTechStr(tech.strNumber);
    setTechSpec(tech.specialization);
    setTechPhone(tech.phone);
    setTechEmail(tech.email);
    setTechStatus(tech.status as any);
    setShowAddTechModal(true);
  };

  const handleSaveTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techName) return;

    if (editingTech) {
      const updated: Technician = {
        ...editingTech,
        name: techName,
        title: techTitle,
        strNumber: techStr || editingTech.strNumber,
        specialization: techSpec || editingTech.specialization,
        phone: techPhone || editingTech.phone,
        email: techEmail || editingTech.email,
        status: techStatus
      };
      onUpdateTechnician(updated);
    } else {
      const colors = ['bg-cyan-600', 'bg-teal-600', 'bg-blue-600', 'bg-purple-600', 'bg-amber-600', 'bg-indigo-600', 'bg-emerald-600'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newT: Technician = {
        id: `TECH-${Date.now().toString().slice(-3)}`,
        name: techName,
        title: techTitle,
        strNumber: techStr || `STR-TEM-2026-${Date.now().toString().slice(-5)}`,
        specialization: techSpec || 'Elektromedis Umum & Uji Kalibrasi',
        phone: techPhone || '0812-3344-5566',
        email: techEmail || `${techName.toLowerCase().replace(/\s+/g, '.')}@ptsmk.co.id`,
        status: techStatus,
        activeAssignmentsCount: 0,
        completedJobsCount: 12,
        rating: 4.9,
        avatarColor: randomColor
      };
      onAddTechnician(newT);
    }

    setShowAddTechModal(false);
    setEditingTech(null);
    setTechName('');
    setTechStr('');
    setTechSpec('');
    setTechPhone('');
  };

  const handleSaveMarketing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mktName || !onAddMarketing) return;

    const newMkt: MarketingStaff = {
      id: `MKT-${Date.now().toString().slice(-3)}`,
      name: mktName,
      title: mktRole || 'Senior Account Executive Medis',
      phone: mktPhone || '0811-2233-4455',
      email: mktEmail || `${mktName.toLowerCase().replace(/\s+/g, '.')}@ptsmk.co.id`,
      assignedRegion: mktArea || 'Jabodetabek & Jawa Barat',
      activeHospitalCount: 3,
      totalDealValue: 120000000,
      status: 'Aktif'
    };

    onAddMarketing(newMkt);
    setShowAddMarketingModal(false);
    setMktName('');
    setMktPhone('');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'technician' && onDeleteTechnician) {
      onDeleteTechnician(deleteTarget.id);
    } else if (deleteTarget.type === 'marketing' && onDeleteMarketing) {
      onDeleteMarketing(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Master Data Personel & Tim Teknik
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 font-mono">
                  PT. SARANA MULTI KALIBRASI
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                11 Tim teknisi elektromedis bersertifikat STR Kemenkes RI, tim marketing, dan manajemen teknis LK-532-IDN.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {activeSubTab === 'technicians' && (
            <button
              onClick={() => {
                setEditingTech(null);
                setTechName('');
                setTechStr('');
                setTechSpec('');
                setTechPhone('');
                setShowAddTechModal(true);
              }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Teknisi</span>
            </button>
          )}

          {activeSubTab === 'marketing' && (
            <button
              onClick={() => setShowAddMarketingModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tim Marketing</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab switcher & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl w-full sm:w-auto gap-1">
          <button
            onClick={() => setActiveSubTab('technicians')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'technicians'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>11 Tim Teknisi Elektromedis ({technicians.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('marketing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'marketing'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Tim Marketing & Area ({marketingList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('management')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'management'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Manajemen Teknik & KAN</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, keahlian, nomor STR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* SUB-TAB 1: 11 TECHNICIANS */}
      {activeSubTab === 'technicians' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTechs.map((tech, index) => (
            <div
              key={tech.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 shadow-sm p-4 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-md">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                        {tech.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">{tech.title}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    tech.status === 'Tersedia' 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {tech.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span>No. STR Elektromedis:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[11px]">{tech.strNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Spesialisasi:</span>
                    <span className="text-slate-200 text-[11px] truncate max-w-[170px]">{tech.specialization}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Kontak HP:</span>
                    <span className="text-slate-300 font-mono text-[11px]">{tech.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Email:</span>
                    <span className="text-slate-300 text-[11px] truncate max-w-[170px]">{tech.email}</span>
                  </div>
                </div>

                {tech.certifications && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {tech.certifications.map((c, i) => (
                      <span key={i} className="text-[9px] font-semibold bg-slate-950 text-cyan-300 border border-slate-800 px-1.5 py-0.5 rounded">
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Tugas Selesai: <strong className="text-white font-mono">{tech.completedJobsCount} RS</strong></span>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" /> {tech.rating}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleOpenEditTech(tech)}
                      className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Data Teknisi"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteTechnician && (
                      <button
                        onClick={() => {
                          setDeleteTarget({
                            id: tech.id,
                            type: 'technician',
                            name: tech.name,
                            detail: `No. STR: ${tech.strNumber} • Spesialisasi: ${tech.specialization}`
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Hapus Teknisi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 2: MARKETING TEAM */}
      {activeSubTab === 'marketing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMarketing.map((mkt) => (
            <div
              key={mkt.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 shadow-sm p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-sm">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{mkt.name}</h4>
                      <p className="text-[11px] text-purple-300">{mkt.title}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {mkt.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span>Wilayah Kerja:</span>
                    <span className="text-white font-medium">{mkt.assignedRegion}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>RS Binaan:</span>
                    <span className="text-purple-300 font-bold font-mono">{mkt.activeHospitalCount} Rumah Sakit</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Kontak HP / WA:</span>
                    <span className="text-slate-300 font-mono text-[11px]">{mkt.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Email Resmi:</span>
                    <span className="text-slate-300 text-[11px] truncate max-w-[170px]">{mkt.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">ID: <strong className="font-mono text-white">{mkt.id}</strong></span>
                {onDeleteMarketing && (
                  <button
                    onClick={() => {
                      setDeleteTarget({
                        id: mkt.id,
                        type: 'marketing',
                        name: mkt.name,
                        detail: `Area: ${mkt.assignedRegion} • Telp: ${mkt.phone}`
                      });
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Hapus Marketing"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 3: MANAGEMENT TEKNIK */}
      {activeSubTab === 'management' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Hafizh Pasifianto Utomo</h4>
                  <p className="text-xs text-cyan-300">Manajer Teknik & Penanggung Jawab Mutu Metrologi</p>
                  <p className="text-[11px] text-slate-400">Laboratorium Pengujian & Kalibrasi PT. Sarana Multi Kalibrasi</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Akreditasi KAN:</span>
                  <span className="font-mono text-cyan-300 font-bold">LK-532-IDN (ISO/IEC 17025:2017)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sertifikat Standar Kemenkes:</span>
                  <span className="font-mono text-slate-200">No: 26062301565850001</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tanggung Jawab:</span>
                  <span className="text-slate-200 text-right">Otorisasi Sertifikat, Validasi Ketidakpastian & Metrologi</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Ahmad Fajar Ariyanto</h4>
                  <p className="text-xs text-teal-300">Direktur Utama</p>
                  <p className="text-[11px] text-slate-400">PT. Sarana Multi Kalibrasi</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Penandatangan Legal:</span>
                  <span className="text-slate-200 font-medium">Surat Penawaran Harga (SPH)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kontak Kantor:</span>
                  <span className="font-mono text-slate-200">(0271) 2023035 / (0851) 1234570</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email Legalitas:</span>
                  <span className="font-mono text-slate-200">ptsaranamultikalibrasi@gmail.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT TECHNICIAN MODAL */}
      {showAddTechModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-white relative">
            <button
              onClick={() => setShowAddTechModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {editingTech ? 'Edit Data Teknisi Elektromedis' : 'Tambah Teknisi Elektromedis Baru'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              PT. Sarana Multi Kalibrasi • Laboratorium Kalibrasi LK-532-IDN
            </p>

            <form onSubmit={handleSaveTech} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nama Lengkap Teknisi & Gelar</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Shifa Zalza Billa"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Jabatan / Jenjang</label>
                  <input
                    type="text"
                    value={techTitle}
                    onChange={(e) => setTechTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nomor STR Elektromedis</label>
                  <input
                    type="text"
                    placeholder="STR-TEM-2024-XXXX"
                    value={techStr}
                    onChange={(e) => setTechStr(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Keahlian & Spesialisasi Pengujian</label>
                <input
                  type="text"
                  placeholder="Contoh: Ventilator ICU, ESU, Defibrillator, Incubator"
                  value={techSpec}
                  onChange={(e) => setTechSpec(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="0812-XXXX-XXXX"
                    value={techPhone}
                    onChange={(e) => setTechPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Status Ketersediaan</label>
                  <select
                    value={techStatus}
                    onChange={(e) => setTechStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Tersedia">Tersedia (Ready)</option>
                    <option value="Bertugas di RS">Bertugas di RS</option>
                    <option value="Cuti / Libur">Cuti / Libur</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTechModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {editingTech ? 'Simpan Perubahan' : 'Simpan Data Teknisi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MARKETING MODAL */}
      {showAddMarketingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-white relative">
            <button
              onClick={() => setShowAddMarketingModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Tambah Tim Marketing Baru</h3>
            <p className="text-xs text-slate-400 mb-4">Pengelola relasi penawaran dan kontrak rumah sakit</p>

            <form onSubmit={handleSaveMarketing} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nama Lengkap Marketing</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, S.Kom"
                  value={mktName}
                  onChange={(e) => setMktName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={mktRole}
                    onChange={(e) => setMktRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Wilayah Binaan</label>
                  <input
                    type="text"
                    value={mktArea}
                    onChange={(e) => setMktArea(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">No. HP / WhatsApp</label>
                <input
                  type="text"
                  placeholder="0811-XXXX-XXXX"
                  value={mktPhone}
                  onChange={(e) => setMktPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMarketingModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Marketing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REACT CONFIRMATION MODAL FOR DELETION (100% RELIABLE IN IFRAMES) */}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        title={deleteTarget?.type === 'technician' ? 'Hapus Data Teknisi?' : 'Hapus Data Marketing?'}
        message={
          deleteTarget?.type === 'technician'
            ? 'Apakah Anda yakin ingin menghapus data teknisi ini dari master personel? Tindakan ini akan menghapus catatan teknisi dari daftar aktif.'
            : 'Apakah Anda yakin ingin menghapus staf marketing ini dari daftar master?'
        }
        itemName={deleteTarget ? `${deleteTarget.name} (${deleteTarget.detail})` : ''}
        confirmText="Ya, Hapus Data"
        cancelText="Batal"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
