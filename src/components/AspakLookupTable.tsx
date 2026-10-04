/**
 * Tabel pemetaan sederhana: satu baris per nilai unik di file rekap (Lokasi / Nama Alat / Petugas)
 * -> kode yang dipakai ASPAK. Dipakai bersama untuk Kode Ruang, Kode Alat, dan NIK Petugas.
 */
import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { AspakCombobox, ComboOption } from './AspakCombobox';

export interface LookupItem { key: string; label: string; count: number; note?: string }
export interface LookupCandidate { value: string; label: string }

interface Props {
  items: LookupItem[];
  value: (key: string) => string;
  status: (key: string) => 'saved' | 'guess' | 'edited' | 'empty';
  onChange: (key: string, value: string) => void;
  /** Penjelasan nilai terpilih (mis. nama ruang). ok=false -> ditandai merah */
  describe: (value: string) => { text: string; ok: boolean };
  candidates?: (key: string) => LookupCandidate[];
  /** Jika diisi: pakai kotak pencarian (bisa cari huruf/angka). Jika tidak: input biasa (mis. NIK). */
  options?: ComboOption[];
  customPattern?: RegExp;
  maxRender?: number;
  heading?: string;
  placeholder: string;
  sanitize: (raw: string) => string;
  firstColTitle: string;
  valueColTitle: string;
  inputWidth?: string;
}

const STATUS_BADGE = {
  saved: <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">Tersimpan</span>,
  guess: <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Saran</span>,
  edited: <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">Diubah</span>,
  empty: <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">Belum diisi</span>,
};

export function AspakLookupTable(p: Props) {
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const shown = p.items.filter(it => !onlyEmpty || !p.value(it.key));

  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs">
        <input type="checkbox" checked={onlyEmpty} onChange={e => setOnlyEmpty(e.target.checked)} />
        Tampilkan hanya yang belum diisi
      </label>
      <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10 bg-[#398AB9] text-white">
            <tr>
              {[p.firstColTitle, 'Jumlah alat', p.valueColTitle, 'Keterangan', 'Status'].map(h =>
                <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.map(it => {
              const v = p.value(it.key);
              const st = p.status(it.key);
              const d = v ? p.describe(v) : null;
              const cands = p.candidates ? p.candidates(it.key).filter(c => c.value !== v) : [];
              return (
                <tr key={it.key} className="border-t border-slate-100 align-top">
                  <td className="px-2 py-1.5 font-medium text-slate-800">{it.label}</td>
                  <td className="px-2 py-1.5 text-slate-600">
                    {it.count}{it.note && <span className="block text-slate-400">{it.note}</span>}
                  </td>
                  <td className="px-1 py-1">
                    <div className="flex items-center gap-1">
                      {st === 'guess' && <Wand2 className="h-3 w-3 shrink-0 text-amber-600" aria-label="saran otomatis" />}
                      {p.options ? (
                        <AspakCombobox value={v} options={p.options} placeholder={p.placeholder}
                          onChange={nv => p.onChange(it.key, p.sanitize(nv))}
                          customPattern={p.customPattern} heading={p.heading || p.valueColTitle}
                          invalid={!!d && !d.ok} className={p.inputWidth || 'w-72'} />
                      ) : (
                        <input value={v} placeholder={p.placeholder}
                          onChange={e => p.onChange(it.key, p.sanitize(e.target.value))}
                          className={`${p.inputWidth || 'w-28'} rounded border px-1 py-0.5 font-mono ${!v ? 'border-amber-400 bg-amber-50' : d && !d.ok ? 'border-red-300 bg-red-50' : 'border-slate-200'}`} />
                      )}
                    </div>
                    {cands.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {cands.slice(0, 3).map(c => (
                          <button key={c.value} onClick={() => p.onChange(it.key, c.value)} title={c.label}
                            className="max-w-[220px] truncate rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 hover:border-[#398AB9] hover:text-[#1C658C]">
                            {c.value} · {c.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="max-w-[320px] px-2 py-1.5">
                    {d ? <span className={d.ok ? '' : 'text-red-600'}>{d.text}</span>
                      : <span className="text-amber-700">Belum diisi</span>}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">{STATUS_BADGE[st]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AspakLookupTable;
