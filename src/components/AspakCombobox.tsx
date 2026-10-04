/**
 * Kotak pilihan + pencarian untuk Kode Ruang / Kode Alat / Metode ASPAK.
 * - Klik -> panel melayang berisi kolom cari, daftar SEMUA pilihan, dan petunjuk tombol.
 * - Cari dengan huruf (nama, kategori/golongan) atau angka (kode). Kata yang cocok ditandai.
 * - Daftar digambar "bertahap" (hanya baris yang terlihat) sehingga ribuan pilihan tetap mulus di-scroll.
 * - Panel memakai posisi "fixed" supaya tidak terpotong tabel yang bisa di-scroll.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronDown, Search, X, CornerDownLeft } from 'lucide-react';

export interface ComboOption {
  value: string;   // kode yang disimpan
  label: string;   // nama ruang / alat / metode
  group?: string;  // kategori / golongan (judul kelompok)
  sub?: string;    // keterangan kecil di bawah nama (mis. subgolongan)
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
  /** Judul panel, mis. "Kode Ruang ASPAK" */
  heading?: string;
  title?: string;
  /** (tidak dipakai lagi, daftar selalu lengkap) */
  maxRender?: number;
}

const ROW_H = 48;          // tinggi satu baris pilihan (px)
const VISIBLE_ROWS = 7;    // baris terlihat sebelum scroll
const OVERSCAN = 6;        // baris ekstra di atas/bawah layar agar scroll halus

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Tandai kata yang dicari di dalam teks */
function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map(escapeRe).join('|')})`, 'ig');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <mark key={i} className="rounded bg-amber-200/70 px-0.5 text-inherit">{p}</mark>
          : <React.Fragment key={i}>{p}</React.Fragment>)}
    </>
  );
}

export function AspakCombobox({
  value, onChange, options, placeholder, className, invalid, customPattern, heading, title,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean; rows: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const byValue = useMemo(() => new Map(options.map(o => [o.value, o])), [options]);
  const selected = value ? byValue.get(value) : undefined;

  // Index pencarian dibuat sekali per daftar pilihan
  const searchIndex = useMemo(
    () => options.map(o => norm(`${o.value} ${o.label} ${o.group || ''} ${o.sub || ''}`)),
    [options],
  );

  const words = useMemo(() => norm(query).split(/\s+/).filter(Boolean), [query]);

  const filtered = useMemo(() => {
    if (!words.length) return options;
    const q = norm(query.trim());
    const hits: { o: ComboOption; rank: number; i: number }[] = [];
    options.forEach((o, i) => {
      if (!words.every(w => searchIndex[i].includes(w))) return;
      // urutan: kode persis > kode diawali ketikan > nama diawali ketikan > lainnya; nonaktif selalu di bawah
      const base = o.value.toLowerCase() === q ? 0 : o.value.toLowerCase().startsWith(q) ? 1 : norm(o.label).startsWith(q) ? 2 : 3;
      hits.push({ o, rank: base + (o.muted ? 10 : 0), i });
    });
    return hits.sort((a, b) => a.rank - b.rank || a.i - b.i).map(h => h.o);
  }, [words, query, options, searchIndex]);

  const q = query.trim();
  const customValue = customPattern && q && customPattern.test(q) && !byValue.has(q) ? q : '';
  const items: (ComboOption & { custom?: boolean })[] = customValue
    ? [{ value: customValue, label: 'Pakai kode ini (tidak ada di daftar)', custom: true }, ...filtered]
    : filtered;

  /* ---------- buka / tutup & posisi ---------- */
  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 480), window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    const chrome = 130; // tinggi kolom cari + petunjuk
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const need = chrome + VISIBLE_ROWS * ROW_H;
    // buka ke bawah bila muat; kalau tidak, pilih sisi yang lebih lega lalu pendekkan daftar agar tidak keluar layar
    const up = spaceBelow < need && spaceAbove > spaceBelow;
    const room = up ? spaceAbove : spaceBelow;
    const rows = Math.max(3, Math.min(VISIBLE_ROWS, Math.floor((room - chrome) / ROW_H)));
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left, width, up, rows });
  };

  const openPanel = () => {
    setQuery('');
    setOpen(true);
  };
  const close = () => { setOpen(false); setQuery(''); };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // langsung arahkan ke pilihan yang sedang terpilih
    const idx = value ? options.findIndex(o => o.value === value) : -1;
    setActive(Math.max(0, idx));
    requestAnimationFrame(() => {
      searchRef.current?.focus();
      if (listRef.current && idx > 0) {
        const top = Math.max(0, idx * ROW_H - ROW_H * 2);
        listRef.current.scrollTop = top;
        setScrollTop(top);
      }
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMove = (e: Event) => {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return; // scroll di dalam daftar
      place();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  // ketikan baru -> kembali ke atas daftar
  useEffect(() => {
    if (!open) return;
    setActive(0);
    if (listRef.current) listRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [query]);

  const ensureVisible = (idx: number) => {
    const el = listRef.current;
    if (!el) return;
    const top = idx * ROW_H;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_H - el.clientHeight;
  };

  const choose = (v: string) => {
    onChange(v);
    close();
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); const n = Math.min(active + 1, items.length - 1); setActive(n); ensureVisible(n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); const n = Math.max(active - 1, 0); setActive(n); ensureVisible(n); }
    else if (e.key === 'PageDown') { e.preventDefault(); const n = Math.min(active + (pos?.rows ?? VISIBLE_ROWS), items.length - 1); setActive(n); ensureVisible(n); }
    else if (e.key === 'PageUp') { e.preventDefault(); const n = Math.max(active - (pos?.rows ?? VISIBLE_ROWS), 0); setActive(n); ensureVisible(n); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[active]) choose(items[active].value); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); triggerRef.current?.focus(); }
  };

  /* ---------- daftar bertahap (virtual) ---------- */
  const listH = Math.max(1, Math.min(items.length, pos?.rows ?? VISIBLE_ROWS)) * ROW_H;
  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const last = Math.min(items.length, Math.ceil((scrollTop + listH) / ROW_H) + OVERSCAN);
  const topItem = items[Math.min(items.length - 1, Math.floor(scrollTop / ROW_H))];
  const stickyGroup = topItem && !topItem.custom ? topItem.group : undefined;

  /* ---------- tampilan ---------- */
  const triggerTone = !value
    ? 'border-amber-300 bg-amber-50/70 hover:border-amber-400'
    : invalid
      ? 'border-red-300 bg-red-50 hover:border-red-400'
      : 'border-slate-200 bg-white hover:border-[#398AB9]';

  const panel = (
    <AnimatePresence>
      {open && pos && (
        <motion.div
          ref={panelRef}
          role="listbox"
          initial={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          style={{
            position: 'fixed', left: pos.left, width: pos.width, zIndex: 1000,
            ...(pos.up ? { bottom: window.innerHeight - pos.top, transformOrigin: 'bottom' } : { top: pos.top, transformOrigin: 'top' }),
          }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-xs shadow-2xl ring-1 ring-black/5"
          onKeyDown={onKeyDown}
        >
          {/* Kolom cari */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-[#1C658C]/5 to-[#398AB9]/5 p-2.5">
            {heading && <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-[#1C658C]">{heading}</div>}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm focus-within:border-[#398AB9] focus-within:ring-2 focus-within:ring-[#398AB9]/20">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ketik nama atau kode…"
                className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                  className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Hapus pencarian">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-500">
              <span>
                <b className="text-slate-700">{filtered.length.toLocaleString('id-ID')}</b>
                {query ? ` cocok dari ${options.length.toLocaleString('id-ID')}` : ' pilihan'}
              </span>
              {stickyGroup && <span className="max-w-[60%] truncate font-medium text-[#1C658C]">{stickyGroup}</span>}
            </div>
          </div>

          {/* Daftar pilihan */}
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-slate-500">
              <div className="mb-1 font-medium text-slate-700">Tidak ada yang cocok</div>
              Coba kata lain, mis. "operasi", "bangsal", "poli", atau ketik kodenya.
            </div>
          ) : (
            <div
              ref={listRef}
              onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
              style={{ height: listH }}
              className="relative overflow-y-auto overscroll-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-transparent"
            >
              <div style={{ height: items.length * ROW_H, position: 'relative' }}>
                {items.slice(first, last).map((o, k) => {
                  const idx = first + k;
                  const isActive = idx === active;
                  const isSel = !o.custom && o.value === value;
                  return (
                    <div
                      key={`${o.value}-${idx}`}
                      data-idx={idx}
                      role="option"
                      aria-selected={isSel}
                      onMouseMove={() => active !== idx && setActive(idx)}
                      onClick={() => choose(o.value)}
                      style={{ position: 'absolute', top: idx * ROW_H, left: 0, right: 0, height: ROW_H }}
                      className={`flex cursor-pointer items-center gap-2.5 border-l-[3px] px-2.5 transition-colors ${
                        isSel ? 'border-l-[#1C658C] bg-[#1C658C]/[0.07]'
                          : isActive ? 'border-l-[#398AB9] bg-[#398AB9]/10'
                            : 'border-l-transparent'
                      } ${o.muted ? 'opacity-55' : ''}`}
                    >
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                        o.custom ? 'border border-dashed border-[#398AB9] text-[#1C658C]'
                          : isSel ? 'bg-[#1C658C] text-white' : 'bg-[#1C658C]/10 text-[#1C658C]'
                      }`} style={{ minWidth: 64, textAlign: 'center' }}>
                        <Highlight text={o.value} words={words} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[12px] ${isSel ? 'font-semibold text-[#1C658C]' : 'text-slate-800'}`}>
                          <Highlight text={o.label} words={words} />
                          {o.muted && <span className="ml-1.5 rounded bg-slate-200 px-1 text-[9px] font-medium uppercase text-slate-600">nonaktif</span>}
                        </span>
                        {(o.sub || o.group) && !o.custom && (
                          <span className="block truncate text-[10px] text-slate-400">{o.sub || o.group}</span>
                        )}
                      </span>
                      {isSel && <Check className="h-4 w-4 shrink-0 text-[#1C658C]" />}
                      {isActive && !isSel && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Petunjuk */}
          <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[10px] text-slate-500">
            <span><kbd className="rounded border border-slate-300 bg-white px-1">↑</kbd> <kbd className="rounded border border-slate-300 bg-white px-1">↓</kbd> pindah</span>
            <span><kbd className="rounded border border-slate-300 bg-white px-1">Enter</kbd> pilih</span>
            <span><kbd className="rounded border border-slate-300 bg-white px-1">Esc</kbd> tutup</span>
            {value && (
              <button type="button" onClick={() => choose('')} className="ml-auto text-red-500 hover:underline">
                Kosongkan
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={title || (selected ? `${value} — ${selected.label}` : value)}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={e => { if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { e.preventDefault(); openPanel(); } }}
        className={`group inline-flex items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left text-xs shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#398AB9]/30 ${triggerTone} ${open ? 'border-[#398AB9] ring-2 ring-[#398AB9]/20' : ''} ${className || 'w-64'}`}
      >
        {value ? (
          <>
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold ${invalid ? 'bg-red-100 text-red-700' : 'bg-[#1C658C]/10 text-[#1C658C]'}`}>{value}</span>
            <span className={`min-w-0 flex-1 truncate ${selected ? 'text-slate-700' : 'italic text-red-600'}`}>
              {selected ? selected.label : 'tidak ada di daftar'}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-amber-700/80">{placeholder || 'Pilih…'}</span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-[#398AB9]' : ''}`} />
      </button>
      {typeof document !== 'undefined' ? createPortal(panel, document.body) : panel}
    </>
  );
}

export default AspakCombobox;
