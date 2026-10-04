/**
 * Kotak pencarian + daftar pilihan (combobox) untuk Kode Ruang / Kode Alat ASPAK.
 * - Bisa dicari dengan HURUF (nama ruang/alat, kategori) maupun ANGKA (kode).
 * - Saat diklik, SEMUA pilihan tampil (dikelompokkan per kategori), bukan hanya yang cocok dengan isi sekarang.
 * - Daftar memakai posisi "fixed" supaya tidak terpotong oleh tabel yang bisa di-scroll.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface ComboOption {
  value: string;   // kode yang disimpan
  label: string;   // nama ruang / alat
  group?: string;  // kategori (judul kelompok)
  muted?: boolean; // mis. ruang nonaktif [x]
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  className?: string;
  invalid?: boolean;
  /** Pola kode yang boleh dipakai walau tidak ada di daftar (mis. /^\d+$/) */
  customPattern?: RegExp;
  /** Batas jumlah baris yang digambar sekaligus (daftar sangat panjang, mis. 3.540 kode alat) */
  maxRender?: number;
  title?: string;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export function AspakCombobox({ value, onChange, options, placeholder, className, invalid, customPattern, maxRender = 600, title }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const byValue = useMemo(() => new Map(options.map(o => [o.value, o])), [options]);
  const selected = value ? byValue.get(value) : undefined;
  const display = value ? `${value} — ${selected ? selected.label : '(tidak ada di daftar)'}` : '';

  // Index pencarian dibuat sekali per daftar pilihan
  const searchIndex = useMemo(
    () => options.map(o => norm(`${o.value} ${o.label} ${o.group || ''}`)),
    [options],
  );

  const filtered = useMemo(() => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    if (!words.length) return options;
    const hits: { o: ComboOption; rank: number }[] = [];
    options.forEach((o, i) => {
      if (!words.every(w => searchIndex[i].includes(w))) return;
      const q = norm(query.trim());
      // urutan: kode persis > kode diawali ketikan > nama diawali ketikan > lainnya
      // ruang/kode nonaktif selalu di bawah yang aktif
      const rank = (o.value === q ? 0 : o.value.startsWith(q) ? 1 : norm(o.label).startsWith(q) ? 2 : 3) + (o.muted ? 10 : 0);
      hits.push({ o, rank });
    });
    return hits.sort((a, b) => a.rank - b.rank).map(h => h.o);
  }, [query, options, searchIndex]);

  const q = query.trim();
  const customValue = customPattern && q && customPattern.test(q) && !byValue.has(q) ? q : '';
  const shown = filtered.slice(0, maxRender);
  // item yang bisa dipilih dengan keyboard: [custom?, ...shown]
  const items: ComboOption[] = customValue ? [{ value: customValue, label: 'Pakai kode ini (tidak ada di daftar)' }, ...shown] : shown;

  const place = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, Math.min(460, window.innerWidth - 16));
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    const spaceBelow = window.innerHeight - r.bottom;
    const up = spaceBelow < 260 && r.top > spaceBelow;
    setPos({ top: up ? r.top - 4 : r.bottom + 4, left, width, up });
  };

  useLayoutEffect(() => { if (open) place(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => { window.removeEventListener('scroll', onMove, true); window.removeEventListener('resize', onMove); };
  }, [open]);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[active]) choose(items[active].value); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
  };

  let lastGroup: string | undefined;

  return (
    <div className={`relative inline-flex items-center ${className || 'w-64'}`} title={title || display}>
      <input
        ref={inputRef}
        value={open ? query : display}
        placeholder={open ? (display || 'Ketik nama atau kode…') : (placeholder || 'Cari nama / kode…')}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onBlur={() => { setOpen(false); setQuery(''); }}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        className={`w-full truncate rounded border py-0.5 pl-1.5 pr-9 text-xs ${
          !value ? 'border-amber-400 bg-amber-50' : invalid ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
        } focus:border-[#398AB9] focus:outline-none`}
      />
      <span className="pointer-events-none absolute right-1 flex items-center gap-0.5 text-slate-400">
        <ChevronDown className="h-3.5 w-3.5" />
      </span>
      {value && !open && (
        <button type="button" onMouseDown={e => { e.preventDefault(); onChange(''); }}
          className="absolute right-5 rounded p-0.5 text-slate-400 hover:text-red-600" title="Kosongkan">
          <X className="h-3 w-3" />
        </button>
      )}

      {open && pos && (
        <div
          ref={listRef}
          onMouseDown={e => e.preventDefault()} // supaya klik tidak menutup daftar sebelum terpilih
          style={{ position: 'fixed', left: pos.left, width: pos.width, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
          className="z-[1000] max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white text-xs shadow-xl"
        >
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
            {filtered.length} dari {options.length} pilihan{query ? ` cocok dengan "${query}"` : ''}
            {filtered.length > shown.length && ` · tampil ${shown.length}, ketik lebih spesifik untuk mempersempit`}
          </div>
          {items.length === 0 && <div className="px-3 py-3 text-slate-500">Tidak ada yang cocok. Coba kata lain (mis. "operasi", "bangsal", "poli").</div>}
          {items.map((o, idx) => {
            const header = !customValue || idx > 0 ? (o.group && o.group !== lastGroup ? o.group : undefined) : undefined;
            if (!customValue || idx > 0) lastGroup = o.group;
            return (
              <React.Fragment key={`${idx}-${o.value}`}>
                {header && <div className="sticky top-5 bg-[#EEEEEE] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1C658C]">{header}</div>}
                <div
                  data-idx={idx}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => choose(o.value)}
                  className={`flex cursor-pointer gap-2 px-2 py-1 ${idx === active ? 'bg-[#398AB9]/15' : ''} ${o.value === value ? 'font-semibold text-[#1C658C]' : ''} ${o.muted ? 'text-slate-400' : ''}`}
                >
                  <span className="w-20 shrink-0 font-mono">{o.value}</span>
                  <span className="min-w-0 flex-1">{o.label}{o.muted && ' [nonaktif]'}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AspakCombobox;
