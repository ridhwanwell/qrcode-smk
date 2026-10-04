import React, { useMemo, useState } from 'react';
import { X, FileUp, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { SphQuotation, BapDocument } from '../types';
import {
  ParsedBapPdf,
  BapPdfKind,
  matchBapRows,
  applyBapPdfRealization,
  applyBapPdfNonPo,
  suggestNonPoPrice,
  isSameSphNumber
} from '../utils/bapPdfImport';
import { calculateBillingFromBap } from '../utils/billingHelpers';
import { createBapFromSph } from '../utils/bapHelpers';
import { formatRupiah } from '../utils/helpers';

interface BapPdfImportModalProps {
  kind: BapPdfKind;
  sph: SphQuotation;
  bap: BapDocument | null;
  parsed: ParsedBapPdf;
  fileName: string;
  onClose: () => void;
  onApply: (updatedBap: BapDocument, isNew: boolean) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  ecatalogue: 'Katalog E-Cat',
  brosur: 'Katalog Brosur',
  manual: 'Isi manual'
};

/**
 * Pratinjau hasil baca PDF BAP (PO atau Non PO) sebelum diterapkan:
 * realisasi per alat, harga satuan, dan perubahan total tagihan BO/FP/KWP.
 */
export const BapPdfImportModal: React.FC<BapPdfImportModalProps> = ({ kind, sph, bap, parsed, fileName, onClose, onApply }) => {
  const isNonPo = kind === 'non_po';
  const [confirmMismatch, setConfirmMismatch] = useState(false);

  const isNew = !bap;
  const baseBap = useMemo(() => bap || createBapFromSph(sph), [bap, sph]);

  // Baris yang dipakai: PO = baris di tabel PO; Non PO = baris bertanda Non PO (atau semua baris)
  const nonPoRows = useMemo(
    () => (parsed.rows.some(r => r.isNonPo) ? parsed.rows.filter(r => r.isNonPo) : parsed.rows),
    [parsed]
  );
  const nonPoParsed = useMemo<ParsedBapPdf>(() => ({ ...parsed, rows: nonPoRows }), [parsed, nonPoRows]);

  // Harga Non PO: saran dari katalog, bisa diedit admin
  const suggestions = useMemo(
    () => nonPoRows.map(r => suggestNonPoPrice(sph, r.namaAlat, baseBap.nonPoItems?.find(it => it.namaAlat === r.namaAlat))),
    [nonPoRows, sph, baseBap]
  );
  const [prices, setPrices] = useState<number[]>(() => suggestions.map(s => s.price));

  const matches = useMemo(() => (isNonPo ? [] : matchBapRows(baseBap, parsed)), [isNonPo, baseBap, parsed]);
  const updatedBap = useMemo(
    () => (isNonPo ? applyBapPdfNonPo(baseBap, nonPoParsed, fileName, prices) : applyBapPdfRealization(baseBap, parsed, fileName)),
    [isNonPo, baseBap, nonPoParsed, parsed, fileName, prices]
  );
  const before = useMemo(() => calculateBillingFromBap(sph, bap), [sph, bap]);
  const after = useMemo(() => calculateBillingFromBap(sph, updatedBap), [sph, updatedBap]);

  const sameSph = isSameSphNumber(sph, parsed);
  const poRowsCount = parsed.rows.filter(r => !r.isNonPo).length;
  const missingPrice = isNonPo && nonPoRows.some((r, i) => (r.realisasi ?? 0) > 0 && !(prices[i] > 0));
  const hasRows = isNonPo ? nonPoRows.length > 0 : matches.some(m => m.item);
  const canApply = hasRows && !missingPrice && (sameSph || confirmMismatch);

  const priceOfPo = (itemNo: number, fallbackName: string): number => {
    const bapItem = baseBap.items.find(it => it.no === itemNo);
    const sphItem =
      sph.items?.[itemNo - 1] ||
      sph.items?.find(s => s.description.trim().toLowerCase() === fallbackName.trim().toLowerCase());
    return Number(bapItem?.unitPrice || sphItem?.unitPrice || 0);
  };

  const diff = after.grandTotal - before.grandTotal;
  const extraWarnings: string[] = [];
  if (!isNonPo && poRowsCount === 0 && parsed.rows.length > 0) {
    extraWarnings.push('PDF ini sepertinya BAP Non PO. Tutup lalu gunakan tombol "Upload BAP Non PO".');
  }
  if (!isNonPo && parsed.rows.length > poRowsCount && poRowsCount > 0) {
    extraWarnings.push(`${parsed.rows.length - poRowsCount} baris Non PO di PDF ini tidak diproses. Upload lewat tombol "Upload BAP Non PO".`);
  }
  if (isNonPo && (baseBap.nonPoItems || []).length > 0) {
    extraWarnings.push(`Daftar alat Non PO sebelumnya (${baseBap.nonPoItems.length} alat) akan diganti dengan isi PDF ini.`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#DCDFE3] rounded-2xl w-full max-w-5xl my-auto flex flex-col max-h-[92vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 text-white flex items-center justify-between shrink-0 bg-gradient-to-r ${isNonPo ? 'from-orange-700 to-rose-800' : 'from-purple-800 to-indigo-900'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <FileUp className="w-5 h-5 text-white/90" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Upload {isNonPo ? 'BAP Non PO' : 'BAP PO'} → Sesuaikan Harga BO
              </h3>
              <p className="text-xs text-white/70 truncate max-w-[60vw]">
                {sph.hospitalName} • {fileName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-sm bg-slate-50/50">
          {/* Info dokumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-white border border-slate-200 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">No. PO / Kontrak (PDF)</p>
              <p className="font-mono font-bold text-slate-900">{parsed.sphNumber || '-'}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">No. BAP (PDF)</p>
              <p className="font-mono font-bold text-slate-900">{parsed.bapNumber || '-'}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Pelanggan (PDF)</p>
              <p className="font-bold text-slate-900 truncate">{parsed.customerName || '-'}</p>
            </div>
          </div>

          {/* Peringatan */}
          {!sameSph && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                No. PO di PDF ({parsed.sphNumber}) berbeda dengan SPH ini ({sph.sphNumber}).
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={confirmMismatch} onChange={e => setConfirmMismatch(e.target.checked)} />
                <span>Saya yakin PDF ini memang untuk SPH {sph.sphNumber}</span>
              </label>
            </div>
          )}
          {(parsed.warnings.length > 0 || matches.some(m => m.issue) || extraWarnings.length > 0) && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Perlu dicek:
              </p>
              <ul className="list-disc pl-5 space-y-0.5">
                {extraWarnings.map((w, i) => <li key={`e${i}`}>{w}</li>)}
                {parsed.warnings.map((w, i) => <li key={`w${i}`}>{w}</li>)}
                {matches.filter(m => m.issue).map((m, i) => (
                  <li key={`m${i}`}>Baris {m.row.no}: {m.issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tabel realisasi */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-2 py-2 text-center">No</th>
                  <th className="px-2 py-2 text-left">Nama Alat</th>
                  <th className="px-2 py-2 text-center">Vol. PO</th>
                  <th className="px-2 py-2 text-center">Vol. Realisasi</th>
                  <th className="px-2 py-2 text-center">Sisa</th>
                  <th className="px-2 py-2 text-left">Keterangan</th>
                  <th className="px-2 py-2 text-right">Harga Satuan</th>
                  <th className="px-2 py-2 text-right">Ditagihkan</th>
                </tr>
              </thead>
              <tbody>
                {isNonPo
                  ? nonPoRows.map((row, i) => {
                      const realized = row.realisasi ?? 0;
                      const po = row.poQty ?? realized;
                      const price = prices[i] || 0;
                      const needPrice = realized > 0 && !(price > 0);
                      return (
                        <tr key={i} className={`border-t border-slate-100 ${needPrice ? 'bg-rose-50/70' : ''}`}>
                          <td className="px-2 py-1.5 text-center font-mono">{row.no}</td>
                          <td className="px-2 py-1.5">{row.namaAlat}</td>
                          <td className="px-2 py-1.5 text-center font-mono">{po}</td>
                          <td className="px-2 py-1.5 text-center font-mono font-bold text-emerald-800">{realized}</td>
                          <td className="px-2 py-1.5 text-center font-mono">{po - realized}</td>
                          <td className="px-2 py-1.5">{row.keterangan || '-'}</td>
                          <td className="px-2 py-1.5 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={price || ''}
                                placeholder="Isi harga"
                                onChange={e => {
                                  const v = Number(e.target.value);
                                  setPrices(prev => prev.map((p, idx) => (idx === i ? (isNaN(v) ? 0 : v) : p)));
                                }}
                                className={`w-28 px-2 py-1 text-right font-mono border rounded-md ${needPrice ? 'border-rose-400 bg-white' : 'border-slate-300'}`}
                              />
                              <span className="text-[9px] text-slate-500">
                                {price === suggestions[i]?.price && suggestions[i]?.price > 0
                                  ? `dari ${SOURCE_LABEL[suggestions[i].source] || 'data sebelumnya'}`
                                  : needPrice ? 'Tidak ada di katalog — wajib diisi' : 'diubah admin'}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono font-bold">{formatRupiah(realized * price)}</td>
                        </tr>
                      );
                    })
                  : matches.map((m, i) => {
                      const realized = m.row.realisasi ?? 0;
                      const price = m.item ? priceOfPo(m.item.no, m.item.namaAlat) : 0;
                      const po = m.item ? Number(m.item.poQty) : m.row.poQty ?? 0;
                      return (
                        <tr key={i} className={`border-t border-slate-100 ${!m.item ? 'bg-rose-50/60 text-slate-400' : realized < po ? 'bg-amber-50/50' : ''}`}>
                          <td className="px-2 py-1.5 text-center font-mono">{m.row.no}</td>
                          <td className="px-2 py-1.5">{m.row.namaAlat}</td>
                          <td className="px-2 py-1.5 text-center font-mono">{po}</td>
                          <td className="px-2 py-1.5 text-center font-mono font-bold text-emerald-800">{realized}</td>
                          <td className={`px-2 py-1.5 text-center font-mono ${po - realized > 0 ? 'text-rose-700 font-bold' : ''}`}>{po - realized}</td>
                          <td className="px-2 py-1.5">{m.row.keterangan || '-'}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{m.item ? formatRupiah(price) : '-'}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-bold">{m.item ? formatRupiah(realized * price) : 'tidak diproses'}</td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* Ringkasan perubahan tagihan */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Tagihan BO Sekarang</p>
              <p className="font-mono font-black text-slate-800 text-lg">{formatRupiah(before.grandTotal)}</p>
              <p className="text-[10px] text-slate-500">{before.totalRealizedUnits} unit ditagihkan</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 mx-auto rotate-90 sm:rotate-0" />
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3">
              <p className="text-[10px] font-bold text-emerald-700 uppercase">Tagihan BO Setelah Upload</p>
              <p className="font-mono font-black text-emerald-900 text-lg">{formatRupiah(after.grandTotal)}</p>
              <p className="text-[10px] text-emerald-800">
                {after.totalRealizedUnits} unit • Sub Total {formatRupiah(after.subtotal1)}
                {after.accommodationFee > 0 ? ` + Akomodasi ${formatRupiah(after.accommodationFee)}` : ''} + PPN {formatRupiah(after.ppnAmount)}
              </p>
              {diff !== 0 && (
                <p className={`text-[10px] font-bold ${diff < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  Selisih {diff < 0 ? '-' : '+'}{formatRupiah(Math.abs(diff))}
                </p>
              )}
            </div>
          </div>
          {after.grandTotal === 0 && (
            <p className="text-xs text-rose-700 font-bold">
              Semua alat tercatat 0 / batal, sehingga tidak ada yang ditagihkan (Rp 0).
            </p>
          )}
          {missingPrice && (
            <p className="text-xs text-rose-700 font-bold">
              Isi harga satuan untuk semua alat Non PO yang dikerjakan sebelum menerapkan.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-[#DCDFE3] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 max-w-md">
            {isNonPo
              ? 'Daftar alat Non PO di BAP akan diganti sesuai PDF beserta harganya. Alat PO tidak berubah.'
              : 'Realisasi alat PO di BAP akan diganti sesuai PDF. Alat Non PO tidak berubah.'}{' '}
            BO, FP, Kwitansi, dan Excel otomatis ikut harga baru.
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-100 cursor-pointer">
              Batal
            </button>
            <button
              onClick={() => onApply(updatedBap, isNew)}
              disabled={!canApply}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              Terapkan ke BAP & BO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
