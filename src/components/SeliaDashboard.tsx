import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Search, 
  Building2, 
  FileCheck, 
  SlidersHorizontal, 
  ArrowLeft,
  ChevronRight,
  Check,
  Tag,
  AlertCircle
} from 'lucide-react';
import { CalibrationSchedule, DeviceSeliaItem, SeliaStatus } from '../types';
import { ensureDeviceSeliaItems, TODAY_STR } from '../utils/helpers';

interface SeliaDashboardProps {
  schedules: CalibrationSchedule[];
  onUpdateSchedule: (schedule: CalibrationSchedule) => void;
}

export const SeliaDashboard: React.FC<SeliaDashboardProps> = ({
  schedules,
  onUpdateSchedule
}) => {
  // Completed / eligible schedules for Selia
  const completedSchedules = schedules.filter(s => 
    s.status === 'Selesai Kalibrasi' || 
    s.status === 'Sertifikat Terbit' || 
    s.progressPercent === 100 ||
    !!s.completedDate ||
    (s.seliaItems && s.seliaItems.length > 0)
  );

  // Active view state: null = Stage 1 (Daftar RS), string = Stage 2 (Detail RS ID)
  const [activeRSId, setActiveRSId] = useState<string | null>(null);

  // Search queries
  const [rsSearchQuery, setRsSearchQuery] = useState('');
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  const [filterSeliaStatus, setFilterSeliaStatus] = useState<string>('all');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 2500);
  };

  // If no completed schedules available at all
  if (completedSchedules.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 my-4 shadow-xl">
        <div className="w-16 h-16 mx-auto bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Belum Ada RS Selesai Kalibrasi</h3>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          Dashboard Selia khusus menampilkan daftar nomor label per Rumah Sakit yang telah ditandai <strong className="text-emerald-400">"Selesai Kalibrasi"</strong>. 
          Silakan selesaikan kalibrasi pada menu <strong className="text-cyan-400">Penjadwalan RS</strong> terlebih dahulu.
        </p>
      </div>
    );
  }

  // Active selected schedule for Stage 2
  const activeSchedule = activeRSId ? completedSchedules.find(s => s.id === activeRSId) : null;

  // Helper to update individual tool status for a specific schedule
  const handleToolStatusChange = (targetItem: DeviceSeliaItem, parentSchedule: CalibrationSchedule, newStatus: SeliaStatus) => {
    const scheduleItems = ensureDeviceSeliaItems(parentSchedule);
    const updatedItems = scheduleItems.map(i => {
      if (i.id === targetItem.id) {
        return {
          ...i,
          seliaStatus: newStatus,
          updatedAt: TODAY_STR
        };
      }
      return i;
    });

    const isAllCetak = updatedItems.every(i => i.seliaStatus === 'Sudah Cetak Sertifikat');

    const updatedSchedule: CalibrationSchedule = {
      ...parentSchedule,
      seliaItems: updatedItems,
      status: isAllCetak ? 'Sertifikat Terbit' : 'Selesai Kalibrasi'
    };

    onUpdateSchedule(updatedSchedule);
    showToast(`Label "${targetItem.labelNumber || targetItem.unitTitle}" ➔ "${newStatus}"`);
  };

  // Helper to update individual tool notes for a specific schedule
  const handleToolNotesChange = (targetItem: DeviceSeliaItem, parentSchedule: CalibrationSchedule, newNotes: string) => {
    const scheduleItems = ensureDeviceSeliaItems(parentSchedule);
    const updatedItems = scheduleItems.map(i => {
      if (i.id === targetItem.id) {
        return {
          ...i,
          keterangan: newNotes,
          updatedAt: TODAY_STR
        };
      }
      return i;
    });

    const updatedSchedule: CalibrationSchedule = {
      ...parentSchedule,
      seliaItems: updatedItems
    };

    onUpdateSchedule(updatedSchedule);
  };

  // Batch update for an entire RS schedule
  const handleBatchUpdateSchedule = (parentSchedule: CalibrationSchedule, targetStatus: SeliaStatus) => {
    const scheduleItems = ensureDeviceSeliaItems(parentSchedule);
    const updatedItems = scheduleItems.map(i => ({
      ...i,
      seliaStatus: targetStatus,
      updatedAt: TODAY_STR
    }));

    const isAllCetak = targetStatus === 'Sudah Cetak Sertifikat';

    const updatedSchedule: CalibrationSchedule = {
      ...parentSchedule,
      seliaItems: updatedItems,
      status: isAllCetak ? 'Sertifikat Terbit' : 'Selesai Kalibrasi'
    };

    onUpdateSchedule(updatedSchedule);
    showToast(`Semua label ${parentSchedule.hospitalName} diperbarui ke "${targetStatus}"`);
  };

  // =========================================================
  // STAGE 2: HALAMAN DETAIL MONITORING SELIA PER RUMAH SAKIT
  // =========================================================
  if (activeSchedule) {
    const items = ensureDeviceSeliaItems(activeSchedule);
    const totalRsItems = items.length;
    const countRsBelum = items.filter(i => i.seliaStatus === 'Belum Diselia').length;
    const countRsProses = items.filter(i => i.seliaStatus === 'Sedang Proses Selia').length;
    const countRsCetak = items.filter(i => i.seliaStatus === 'Sudah Cetak Sertifikat').length;
    const percentRsCetak = totalRsItems > 0 ? Math.round((countRsCetak / totalRsItems) * 100) : 0;

    // Filter items by search & selia status
    const filteredItems = items.filter(item => {
      const query = labelSearchQuery.toLowerCase();
      const matchesSearch = 
        !query ||
        (item.labelNumber && item.labelNumber.toLowerCase().includes(query)) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(query)) ||
        (item.deviceName && item.deviceName.toLowerCase().includes(query)) ||
        (item.unitTitle && item.unitTitle.toLowerCase().includes(query));

      const matchesStatus = filterSeliaStatus === 'all' || item.seliaStatus === filterSeliaStatus;

      return matchesSearch && matchesStatus;
    });

    const labelRangeText = activeSchedule.labelRange || (items.length > 0 ? `${items[0]?.labelNumber || '-'} s/d ${items[items.length - 1]?.labelNumber || '-'}` : '-');

    return (
      <div className="space-y-6">
        {/* Toast Notification */}
        {savedNotice && (
          <div className="fixed bottom-5 right-5 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 text-xs border border-emerald-400 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Back Button Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setActiveRSId(null);
              setLabelSearchQuery('');
              setFilterSeliaStatus('all');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 rounded-xl border border-slate-700/80 font-bold text-xs transition-all shadow-md group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Kembali ke Daftar Rumah Sakit</span>
          </button>

          <span className="text-xs font-mono text-slate-400">
            Faskes ID: <strong className="text-white">{activeSchedule.hospitalName}</strong>
          </span>
        </div>

        {/* Detail Header RS Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 p-5 rounded-2xl border border-slate-800 shadow-xl text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl shrink-0 mt-0.5">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
                    {activeSchedule.hospitalName}
                  </h2>
                  <span className="font-mono text-xs text-cyan-300 bg-cyan-950 px-3 py-1 rounded-full border border-cyan-500/40 font-bold">
                    {activeSchedule.workOrderNumber}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1.5">
                  <span>No. Label: <strong className="text-amber-300 font-mono text-sm">{labelRangeText}</strong></span>
                  <span>•</span>
                  <span>Total: <strong className="text-white font-mono">{totalRsItems} Label Alat</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Batch Actions */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => handleBatchUpdateSchedule(activeSchedule, 'Sedang Proses Selia')}
                className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm"
              >
                Proses Selia RS Ini
              </button>
              <button
                onClick={() => handleBatchUpdateSchedule(activeSchedule, 'Sudah Cetak Sertifikat')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Cetak Sertifikat RS Ini</span>
              </button>
            </div>
          </div>

          {/* 3 Monitoring Cards: Belum Selia, Proses Selia, Cetak Sertifikat */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Belum Selia */}
            <div 
              onClick={() => setFilterSeliaStatus('Belum Diselia')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                filterSeliaStatus === 'Belum Diselia' 
                  ? 'bg-amber-950/80 border-amber-500/60 ring-1 ring-amber-400' 
                  : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Belum Selia
                </span>
                <span className="font-mono text-lg font-black text-amber-300">{countRsBelum}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Label belum diperiksa supervisor</p>
            </div>

            {/* Card 2: Proses Selia */}
            <div 
              onClick={() => setFilterSeliaStatus('Sedang Proses Selia')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                filterSeliaStatus === 'Sedang Proses Selia' 
                  ? 'bg-cyan-950/80 border-cyan-500/60 ring-1 ring-cyan-400' 
                  : 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  Proses Selia
                </span>
                <span className="font-mono text-lg font-black text-cyan-300">{countRsProses}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Sertifikat dalam tahap penyusunan</p>
            </div>

            {/* Card 3: Cetak Sertifikat */}
            <div 
              onClick={() => setFilterSeliaStatus('Sudah Cetak Sertifikat')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                filterSeliaStatus === 'Sudah Cetak Sertifikat' 
                  ? 'bg-emerald-950/80 border-emerald-500/60 ring-1 ring-emerald-400' 
                  : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Cetak Sertifikat
                </span>
                <span className="font-mono text-lg font-black text-emerald-400">{countRsCetak}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${percentRsCetak}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Label Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. Label atau Catatan Alat..."
              value={labelSearchQuery}
              onChange={(e) => setLabelSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterSeliaStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterSeliaStatus === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({totalRsItems})
            </button>
            <button
              onClick={() => setFilterSeliaStatus('Belum Diselia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterSeliaStatus === 'Belum Diselia'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Belum Selia ({countRsBelum})
            </button>
            <button
              onClick={() => setFilterSeliaStatus('Sedang Proses Selia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterSeliaStatus === 'Sedang Proses Selia'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Proses Selia ({countRsProses})
            </button>
            <button
              onClick={() => setFilterSeliaStatus('Sudah Cetak Sertifikat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterSeliaStatus === 'Sudah Cetak Sertifikat'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cetak Sertifikat ({countRsCetak})
            </button>
          </div>
        </div>

        {/* SIMPLIFIED TABLE (NO. LABEL, STATUS SELIA INDIVIDUAL, CATATAN ONLY) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-3 text-center w-12">No</th>
                  <th className="py-3.5 px-4 text-center w-48">No. Label</th>
                  <th className="py-3.5 px-4 text-center min-w-[280px]">Status Selia Individual</th>
                  <th className="py-3.5 px-4 text-left">Catatan / Keterangan Alat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500">
                      Tidak ditemukan label yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isBelum = item.seliaStatus === 'Belum Diselia';
                    const isProses = item.seliaStatus === 'Sedang Proses Selia';
                    const isCetak = item.seliaStatus === 'Sudah Cetak Sertifikat';

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* No */}
                        <td className="py-3 px-3 text-center font-bold font-mono text-cyan-400/90 text-xs">
                          {idx + 1}
                        </td>

                        {/* No Label Only */}
                        <td className="py-3 px-4 text-center">
                          <span 
                            title={item.unitTitle || item.deviceName}
                            className="font-mono text-sm font-black text-amber-300 bg-amber-950/50 px-3.5 py-1 rounded-lg border border-amber-500/40 inline-block shadow-xs tracking-wider"
                          >
                            {item.labelNumber || '-'}
                          </span>
                        </td>

                        {/* Status Selia Individual Toggle Buttons */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800 gap-1 w-full max-w-xs">
                            <button
                              onClick={() => handleToolStatusChange(item, activeSchedule, 'Belum Diselia')}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                                isBelum
                                  ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>Belum Selia</span>
                            </button>

                            <button
                              onClick={() => handleToolStatusChange(item, activeSchedule, 'Sedang Proses Selia')}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                                isProses
                                  ? 'bg-cyan-500 text-slate-950 shadow-md ring-1 ring-cyan-400'
                                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
                              }`}
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                              <span>Proses Selia</span>
                            </button>

                            <button
                              onClick={() => handleToolStatusChange(item, activeSchedule, 'Sudah Cetak Sertifikat')}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                                isCetak
                                  ? 'bg-emerald-500 text-slate-950 shadow-md ring-1 ring-emerald-400'
                                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Cetak Sertifikat</span>
                            </button>
                          </div>
                        </td>

                        {/* Catatan / Keterangan Alat */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Tambahkan catatan alat..."
                            value={item.keterangan || ''}
                            onChange={(e) => handleToolNotesChange(item, activeSchedule, e.target.value)}
                            className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400 text-white rounded-xl px-3 py-1.5 text-xs placeholder-slate-500 focus:outline-none shadow-inner"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // STAGE 1: TAMPILAN AWAL DAFTAR RUMAH SAKIT & NO. LABEL
  // =========================================================

  // Filter completed schedules by initial search query
  const filteredSchedules = completedSchedules.filter(sch => {
    const q = rsSearchQuery.toLowerCase();
    if (!q) return true;
    const items = ensureDeviceSeliaItems(sch);
    const labelMatch = items.some(i => i.labelNumber && i.labelNumber.toLowerCase().includes(q));
    const rangeMatch = sch.labelRange && sch.labelRange.toLowerCase().includes(q);
    const hospitalMatch = sch.hospitalName.toLowerCase().includes(q);
    const spkMatch = sch.workOrderNumber.toLowerCase().includes(q);
    return hospitalMatch || spkMatch || labelMatch || rangeMatch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {savedNotice && (
        <div className="fixed bottom-5 right-5 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 text-xs border border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Main Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-5 rounded-2xl border border-slate-800 shadow-xl text-white">
        <div className="flex items-center gap-3">
          <span className="p-3 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 shrink-0">
            <Building2 className="w-7 h-7" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Selia Dashboard Per Rumah Sakit
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {completedSchedules.length} RS Siap Diselia
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Pilih Rumah Sakit di bawah ini untuk mengelola monitoring <strong>Belum Selia</strong>, <strong>Proses Selia</strong>, dan <strong>Cetak Sertifikat</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Bar for RS List */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari Nama Rumah Sakit, No. SPK, atau No. Label..."
            value={rsSearchQuery}
            onChange={(e) => setRsSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
          />
        </div>

        <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">
          Menampilkan <strong className="text-cyan-400">{filteredSchedules.length}</strong> Faskes
        </span>
      </div>

      {/* Grid of Hospital Cards (Initial Clean Overview) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSchedules.map((schedule) => {
          const items = ensureDeviceSeliaItems(schedule);
          const totalCount = items.length;
          const countBelum = items.filter(i => i.seliaStatus === 'Belum Diselia').length;
          const countProses = items.filter(i => i.seliaStatus === 'Sedang Proses Selia').length;
          const countCetak = items.filter(i => i.seliaStatus === 'Sudah Cetak Sertifikat').length;
          const percentCetak = totalCount > 0 ? Math.round((countCetak / totalCount) * 100) : 0;

          const labelRangeText = schedule.labelRange || (items.length > 0 ? `${items[0]?.labelNumber || '-'} s/d ${items[items.length - 1]?.labelNumber || '-'}` : '-');

          return (
            <div
              key={schedule.id}
              onClick={() => setActiveRSId(schedule.id)}
              className="bg-slate-900 border border-slate-800 hover:border-cyan-500/60 p-5 rounded-2xl shadow-xl transition-all hover:bg-slate-800/80 cursor-pointer group flex flex-col justify-between relative overflow-hidden"
            >
              {/* Subtle accent line on hover */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                {/* Header: Name & SPK */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl group-hover:bg-cyan-500/20 transition-colors shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-base group-hover:text-cyan-300 transition-colors uppercase tracking-wide">
                        {schedule.hospitalName}
                      </h3>
                      <span className="font-mono text-xs text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-bold inline-block mt-1">
                        {schedule.workOrderNumber}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 border ${
                    percentCetak === 100 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {percentCetak === 100 ? 'Sertifikat Terbit' : 'Proses Selia'}
                  </span>
                </div>

                {/* No Label Range Highlight */}
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs text-slate-400">No. Label:</span>
                    <span className="font-mono text-sm font-black text-amber-300 tracking-wider">
                      {labelRangeText}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    {totalCount} Label Alat
                  </span>
                </div>

                {/* Progress Bar & Status Counts */}
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] mb-4">
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px]">Belum Selia</span>
                    <span className="font-bold text-amber-400 font-mono text-xs">{countBelum}</span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px]">Proses Selia</span>
                    <span className="font-bold text-cyan-400 font-mono text-xs">{countProses}</span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px]">Cetak Sertifikat</span>
                    <span className="font-bold text-emerald-400 font-mono text-xs">{countCetak}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Button */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Progres: <strong className="text-emerald-400">{percentCetak}% Sertifikat</strong>
                </span>
                <span className="font-bold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
                  <span>Kelola Monitoring Selia</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
