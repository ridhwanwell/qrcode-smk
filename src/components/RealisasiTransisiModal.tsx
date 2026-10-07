import React, { useEffect, useMemo, useState } from 'react';
import { X, ClipboardCheck, Plus, Trash2, AlertTriangle, History, Loader2 } from 'lucide-react';
import { CalibrationSchedule, MedicalDeviceToCalibrate } from '../types';
import { ensureDeviceSeliaItems, deviceUnitCount } from '../utils/helpers';
import { TANDA_KETERANGAN } from '../utils/sphTransisiParser';
import { ambilRiwayatRealisasi, RiwayatRealisasi } from '../lib/sphTransisiApi';

interface Props {
  schedule: CalibrationSchedule;
  canEdit: boolean;
  onClose: () => void;
  onSave: (updated: CalibrationSchedule) => void;
}

interface Baris {
  id: string;
  name: string;
  sphQuantity: number | null;
  quantity: number;
  tanda: MedicalDeviceToCalibrate['tanda'];
  baru: boolean;
}

/** Ringkasan Qty SPH vs Realisasi untuk satu jadwal transisi */
export function hitungSelisihTransisi(schedule: CalibrationSchedule) {
  const devs = Array.isArray(schedule.targetDevices) ? schedule.targetDevices : [];
  const unitSph = devs.reduce((s, d) => s + (typeof d.sphQuantity === 'number' ? d.sphQuantity : 0), 0);
  const unitReal = devs.reduce((s, d) => s + deviceUnitCount(d), 0);
  const luarSph = devs.filter(d => typeof d.sphQuantity !== 'number' && deviceUnitCount(d) > 0).length;
  return { unitSph, unitReal, selisih: unitReal - unitSph, luarSph };
}

const JENIS_LABEL: Record<RiwayatRealisasi['jenis'], string> = {
  tambah_alat: 'Tambah alat',
  ubah_qty: 'Ubah qty',
  hapus_alat: 'Hapus alat'
};

export const RealisasiTransisiModal: React.FC<Props> = ({ schedule, canEdit, onClose, onSave }) => {
  const [rows, setRows] = useState<Baris[]>(() =>
    (schedule.targetDevices || []).map(d => ({
      id: d.id,
      name: d.name,
      sphQuantity: typeof d.sphQuantity === 'number' ? d.sphQuantity : null,
      quantity: deviceUnitCount(d),
      tanda: d.tanda ?? null,
      baru: false
    }))
  );
  const [riwayat, setRiwayat] = useState<RiwayatRealisasi[] | null>(null);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);

  useEffect(() => {
    ambilRiwayatRealisasi(schedule.id).then(r => { setRiwayat(r); setLoadingRiwayat(false); });
  }, [schedule.id]);

  const total = useMemo(() => {
    const unitSph = rows.reduce((s, r) => s + (r.sphQuantity ?? 0), 0);
    const unitReal = rows.reduce((s, r) => s + (r.quantity || 0), 0);
    return { unitSph, unitReal, selisih: unitReal - unitSph };
  }, [rows]);

  const adaNamaKosong = rows.some(r => !r.name.trim());
  const berubah = useMemo(() => {
    const awal = schedule.targetDevices || [];
    if (awal.length !== rows.length) return true;
    return rows.some(r => {
      const d = awal.find(x => x.id === r.id);
      return !d || deviceUnitCount(d) !== r.quantity || d.name !== r.name;
    });
  }, [rows, schedule.targetDevices]);

  const ubah = (id: string, patch: Partial<Baris>) => setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));

  const handleSimpan = () => {
    const lama = schedule.targetDevices || [];
    const targetDevices: MedicalDeviceToCalibrate[] = rows
      .filter(r => !(r.baru && r.quantity === 0))
      .map(r => {
        const d = lama.find(x => x.id === r.id);
        if (d) return { ...d, name: r.name.trim(), quantity: r.quantity };
        return {
          id: r.id,
          name: r.name.trim(),
          quantity: r.quantity,
          room: '-',
          brandModel: '-',
          serialNumber: '-',
          status: 'Pending' as const,
          notes: 'Alat di luar SPH (tambahan saat realisasi)'
        };
      });

    let updated: CalibrationSchedule = { ...schedule, targetDevices };
    const seliaItems = ensureDeviceSeliaItems(updated);
    // Label per alat & rentang label mengikuti unit selia terbaru
    updated = {
      ...updated,
      seliaItems,
      targetDevices: targetDevices.map(d => {
        const units = seliaItems.filter(u => u.parentDeviceId === d.id);
        if (units.length === 0) return { ...d, labelNumber: '-' };
        const a = units[0].labelNumber || '-';
        const b = units[units.length - 1].labelNumber || '-';
        return { ...d, labelNumber: a === b ? a : `${a} s/d ${b}` };
      })
    };
    const labels = seliaItems.map(u => u.labelNumber || '').filter(Boolean).sort();
    if (labels.length > 0) {
      updated.labelEnd = labels[labels.length - 1];
      updated.labelRange = updated.labelStart && updated.labelStart !== updated.labelEnd
        ? `${updated.labelStart} s/d ${updated.labelEnd}`
        : updated.labelEnd;
    }
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#DCDFE3] rounded-2xl w-full max-w-4xl my-auto flex flex-col max-h-[94vh] shadow-2xl overflow-hidden text-slate-800">
        <div className="px-5 py-4 text-white flex items-center justify-between shrink-0 bg-gradient-to-r from-teal-700 to-[#1C658C]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20"><ClipboardCheck className="w-5 h-5" /></div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg">Realisasi Alat — SPH {schedule.sphNumber}</h3>
              <p className="text-xs text-white/75 truncate">{schedule.hospitalName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-sm bg-slate-50/50">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white border border-slate-200 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Unit di SPH</p>
              <p className="font-mono font-black text-lg">{total.unitSph}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Unit Realisasi</p>
              <p className="font-mono font-black text-lg text-emerald-800">{total.unitReal}</p>
            </div>
            <div className={`border rounded-lg p-2.5 ${total.selisih > 0 ? 'bg-amber-50 border-amber-300' : total.selisih < 0 ? 'bg-sky-50 border-sky-300' : 'bg-white border-slate-200'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Selisih</p>
              <p className="font-mono font-black text-lg">{total.selisih > 0 ? `+${total.selisih}` : total.selisih}</p>
            </div>
          </div>
          {total.selisih > 0 && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Realisasi lebih banyak dari SPH — perbarui BO (Bukti Order) dan minta persetujuan RS.
            </p>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-2 py-2 text-left">Nama Alat</th>
                  <th className="px-2 py-2 text-center w-20">Qty SPH</th>
                  <th className="px-2 py-2 text-center w-28">Qty Realisasi</th>
                  <th className="px-2 py-2 text-center w-20">Selisih</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const sel = r.quantity - (r.sphQuantity ?? 0);
                  return (
                    <tr key={r.id} className={`border-t border-slate-100 ${r.sphQuantity === null ? 'bg-amber-50/60' : ''}`}>
                      <td className="px-2 py-1.5">
                        {r.baru ? (
                          <input value={r.name} onChange={e => ubah(r.id, { name: e.target.value })} placeholder="Nama alat tambahan"
                            className={`w-full px-2 py-1 border rounded-md ${r.name.trim() ? 'border-slate-200' : 'border-rose-400 bg-rose-50'}`} />
                        ) : (
                          <span className="font-semibold">{r.name}</span>
                        )}
                        {r.tanda && <span className="block text-[10px] text-amber-700">{r.tanda} {TANDA_KETERANGAN[r.tanda]}</span>}
                        {r.sphQuantity === null && <span className="block text-[10px] text-amber-800 font-semibold">Di luar SPH</span>}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono text-slate-500">{r.sphQuantity ?? '-'}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0} disabled={!canEdit} value={r.quantity}
                          onChange={e => ubah(r.id, { quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                          className="w-full px-1.5 py-1 border border-slate-300 rounded-md text-center font-mono font-bold disabled:bg-slate-100" />
                      </td>
                      <td className={`px-2 py-1.5 text-center font-mono font-bold ${sel > 0 ? 'text-amber-700' : sel < 0 ? 'text-sky-700' : 'text-slate-400'}`}>
                        {sel > 0 ? `+${sel}` : sel}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {r.baru && (
                          <button onClick={() => setRows(prev => prev.filter(x => x.id !== r.id))} className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {canEdit && (
            <button
              onClick={() => setRows(prev => [...prev, { id: `dev-x-${Date.now().toString(36)}`, name: '', sphQuantity: null, quantity: 1, tanda: null, baru: true }])}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#1C658C] text-[#1C658C] hover:bg-[#1C658C]/10 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah alat di luar SPH
            </button>
          )}
          <p className="text-[11px] text-slate-500">
            Qty 0 = alat tidak ada di lapangan. Unit selia yang sudah diproses tidak pernah dihapus; unit tambahan mendapat nomor label lanjutan.
          </p>

          {/* Riwayat */}
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="font-bold text-xs flex items-center gap-1.5 mb-2"><History className="w-4 h-4 text-[#1C658C]" /> Riwayat perubahan realisasi</p>
            {loadingRiwayat ? (
              <p className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat…</p>
            ) : riwayat === null ? (
              <p className="text-xs text-slate-500">Riwayat belum bisa dimuat (offline atau tidak punya akses).</p>
            ) : riwayat.length === 0 ? (
              <p className="text-xs text-slate-500">Belum ada perubahan sejak SPH diupload.</p>
            ) : (
              <ul className="text-[11px] space-y-1 max-h-48 overflow-y-auto">
                {riwayat.map((h, i) => (
                  <li key={i} className="flex flex-wrap gap-x-2 border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-mono">{new Date(h.waktu).toLocaleString('id-ID')}</span>
                    <span className="font-semibold">{JENIS_LABEL[h.jenis]}</span>
                    <span>{h.nama_alat || '-'}</span>
                    <span className="font-mono">{h.qty_lama ?? '-'} → {h.qty_baru ?? '-'}{h.qty_sph !== null ? ` (SPH ${h.qty_sph})` : ''}</span>
                    <span className="text-slate-500">oleh {h.diubah_oleh || '-'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="px-5 py-3 bg-white border-t border-[#DCDFE3] flex items-center justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-100 cursor-pointer">Tutup</button>
          {canEdit && (
            <button
              onClick={handleSimpan}
              disabled={!berubah || adaNamaKosong}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Simpan Realisasi
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
