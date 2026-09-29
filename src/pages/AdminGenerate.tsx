import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  CheckCircle2, 
  XCircle, 
  Printer, 
  AlertCircle, 
  RefreshCw, 
  LayoutTemplate, 
  ExternalLink, 
  FolderOpen, 
  Building2, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  Info 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { cn } from '../lib/utils';
import { fetchTemplateConfigs } from '../lib/templateStorage';
import { saveFolderRsToSupabase, bulkSyncLabelsToSupabase, fetchFolderRsFromSupabase } from '../lib/supabaseSync';
import { INITIAL_HOSPITALS } from '../data/mockData';

export interface LabelBatchCalculation {
  baseCount: number;
  sheets: number;
  totalCount: number;
  spareCount: number;
  spareWasBumped: boolean;
}

export interface ExistingFolderSummary {
  prefix: string;
  count: number;
  maxNum: number;
  maxLabel: string;
  nextNum: number;
  nextLabel: string;
  namaRs: string | null;
}

/**
 * Kalkulasi jumlah lembar dan stiker A3+ (kapasitas 85 stiker/lembar).
 * Aturan:
 * - Jika applyA3Multiples = true:
 *   Dihitung selalu dalam kelipatan 85 (85, 170, 255, 340, dst).
 *   Jika sisa/spare cadangan kurang dari 15 stiker (< 15), otomatis pembulatan ke kelipatan berikutnya (+85 lagi).
 *   Contoh:
 *   - 114 label -> kelipatan 170 (2 lembar), spare = 56 (>= 15, tetap 170)
 *   - 155 label -> kelipatan 170 (2 lembar), spare = 15 (>= 15, tetap 170)
 *   - 161 label -> spare ke 170 hanya 9 (< 15), langsung dibulatkan ke 255 (3 lembar), spare = 94
 *   - 168 label -> spare ke 170 hanya 2 (< 15), langsung dibulatkan ke 255 (3 lembar), spare = 87
 * - Jika applyA3Multiples = false (Mode Jumlah Pas / Penambahan Lanjutan):
 *   Dihitung tepat sejumlah kebutuhan label (spareCount = 0).
 *   Contoh: 1 label lanjutan (misal 16 s/d 16) -> tepat 1 stiker tanpa dipaksa 85 stiker.
 */
export function calculateLabelBatches(baseCount: number, applyA3Multiples: boolean = true): LabelBatchCalculation {
  if (baseCount <= 0) {
    return { baseCount: 0, sheets: 0, totalCount: 0, spareCount: 0, spareWasBumped: false };
  }
  
  if (!applyA3Multiples) {
    const sheets = Math.ceil(baseCount / 85);
    return {
      baseCount,
      sheets,
      totalCount: baseCount,
      spareCount: 0,
      spareWasBumped: false
    };
  }
  
  let sheets = Math.ceil(baseCount / 85);
  let totalCount = sheets * 85;
  let spareCount = totalCount - baseCount;
  
  let spareWasBumped = false;
  // Jika sisa / spare kurang dari 15, langsung otomatis pembulatan lagi ke atasnya
  if (spareCount < 15) {
    sheets += 1;
    totalCount = sheets * 85;
    spareCount = totalCount - baseCount;
    spareWasBumped = true;
  }
  
  return {
    baseCount,
    sheets,
    totalCount,
    spareCount,
    spareWasBumped
  };
}

interface LabelBreakdown {
  baseRangeStart: string;
  baseRangeEnd: string;
  baseCount: number;
  extraLaikStart: string;
  extraLaikEnd: string;
  extraLaikCount: number;
  extraTidakLaikStart: string;
  extraTidakLaikEnd: string;
  extraTidakLaikCount: number;
  totalCount: number;
  sheetsCount: number;
  spareWasBumped?: boolean;
  type: 'laik' | 'tidak_laik';
  spareMode?: 'a3_multiples' | 'exact';
}

export default function AdminGenerate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  
  // Single mode state
  const [noLabel, setNoLabel] = useState('');
  const [singleType, setSingleType] = useState<'laik' | 'tidak_laik'>('laik');
  
  // Bulk mode state
  const [startLabel, setStartLabel] = useState('');
  const [endLabel, setEndLabel] = useState('');
  const [bulkType, setBulkType] = useState<'laik' | 'tidak_laik'>('laik');
  // Spare mode: 'a3_multiples' (kelipatan 85) atau 'exact' (jumlah pas / lanjutan tanpa cadangan)
  const [spareMode, setSpareMode] = useState<'a3_multiples' | 'exact'>('a3_multiples');

  // Existing folder summaries for continuation / suggestion
  const [existingFolders, setExistingFolders] = useState<ExistingFolderSummary[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // Hospital Name state (Optional)
  const [namaRs, setNamaRs] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Generated result state
  const [generatedLabels, setGeneratedLabels] = useState<string[]>([]);
  const [breakdownInfo, setBreakdownInfo] = useState<LabelBreakdown | null>(null);
  const labelType = 'besar'; // Always use Template Besar (6x2,5 cm)
  const [bulkFormat, setBulkFormat] = useState<'a3_plus' | 'individual'>('a3_plus');
  const [templateConfigs, setTemplateConfigs] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('smk_template_configs');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
  });

  const getSuggestedPublicOrigin = () => {
    const origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  };

  // Domain configuration state (loaded automatically from settings or origin)
  const [customDomain, setCustomDomain] = useState(getSuggestedPublicOrigin());

  useEffect(() => {
    const fetchTemplatesAndSettings = async () => {
      try {
        // Fetch unified template configs directly from Supabase / cache
        const tplConfigs = await fetchTemplateConfigs();
        if (tplConfigs && (tplConfigs.besar || tplConfigs.besarTidakLaik || tplConfigs.kecil)) {
          setTemplateConfigs(tplConfigs);
        }

        const genRes = await fetch('/api/settings/general').catch(() => null);
        if (genRes && genRes.ok) {
          const genData = await genRes.json();
          if (genData?.value) {
            const val = typeof genData.value === 'string' ? JSON.parse(genData.value) : genData.value;
            if (val?.publicBaseUrl) {
              setCustomDomain(val.publicBaseUrl);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load templates or settings", err);
      }
    };
    fetchTemplatesAndSettings();
    fetchExistingFoldersSummary();
  }, []);

  // Read URL search params (e.g. from AdminLabels "+ Tambah / Lanjut Label" button)
  useEffect(() => {
    const pStart = searchParams.get('start');
    const pEnd = searchParams.get('end');
    const pNo = searchParams.get('no') || searchParams.get('label');
    const pNamaRs = searchParams.get('namaRs');
    const pMode = searchParams.get('mode');
    const pSpare = searchParams.get('spareMode');

    if (pStart) setStartLabel(pStart);
    if (pEnd) setEndLabel(pEnd);
    if (pNo) setNoLabel(pNo);
    if (pNamaRs) setNamaRs(decodeURIComponent(pNamaRs));
    if (pMode === 'bulk' || pMode === 'single') setMode(pMode);
    if (pSpare === 'exact' || pSpare === 'a3_multiples') setSpareMode(pSpare);
  }, [searchParams]);

  // Fetch summary of all existing folders & their max label numbers
  const fetchExistingFoldersSummary = async () => {
    setLoadingFolders(true);
    try {
      const [sbLabelsRes, sbFolderMap, apiLabelsRes] = await Promise.all([
        supabase
          .from('labels')
          .select('no_label, nama_rs')
          .not('no_label', 'like', '__meta_%')
          .not('no_label', 'like', '__aset_%')
          .order('no_label', { ascending: true }),
        fetchFolderRsFromSupabase(),
        fetch('/api/labels').then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      const allItems: { noLabel: string; namaRs?: string | null }[] = [];
      (sbLabelsRes.data || []).forEach((d: any) => {
        if (d.no_label) allItems.push({ noLabel: d.no_label, namaRs: d.nama_rs });
      });
      (apiLabelsRes || []).forEach((d: any) => {
        const key = d.noLabel || d.no_label;
        if (key && !key.startsWith('__meta_') && !key.startsWith('__aset_')) {
          allItems.push({ noLabel: key, namaRs: d.namaRs || d.nama_rs });
        }
      });

      // Also check localStorage
      try {
        const local = JSON.parse(localStorage.getItem('smk_labels') || '[]');
        local.forEach((l: any) => {
          const k = l.noLabel || l.no_label;
          if (k && !k.startsWith('__meta_') && !k.startsWith('__aset_')) {
            allItems.push({ noLabel: k, namaRs: l.namaRs || l.nama_rs });
          }
        });
      } catch (_) {}

      // Group by 3-digit prefix
      const map = new Map<string, { maxNum: number; count: number; namaRs: string | null }>();
      allItems.forEach(it => {
        const parts = it.noLabel.split('.');
        if (parts.length === 2 && /^\d{3}$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
          const prefix = parts[0];
          const num = parseInt(parts[1], 10);
          const curr = map.get(prefix) || { maxNum: 0, count: 0, namaRs: it.namaRs || sbFolderMap[prefix] || null };
          if (num > curr.maxNum) curr.maxNum = num;
          curr.count += 1;
          if (!curr.namaRs && (it.namaRs || sbFolderMap[prefix])) {
            curr.namaRs = it.namaRs || sbFolderMap[prefix] || null;
          }
          map.set(prefix, curr);
        }
      });

      const summaries: ExistingFolderSummary[] = [];
      map.forEach((val, prefix) => {
        summaries.push({
          prefix,
          count: val.count,
          maxNum: val.maxNum,
          maxLabel: `${prefix}.${val.maxNum.toString().padStart(4, '0')}`,
          nextNum: val.maxNum + 1,
          nextLabel: `${prefix}.${(val.maxNum + 1).toString().padStart(4, '0')}`,
          namaRs: val.namaRs
        });
      });

      summaries.sort((a, b) => a.prefix.localeCompare(b.prefix, undefined, { numeric: true }));
      setExistingFolders(summaries);
    } catch (err) {
      console.warn('Could not fetch existing folders summary:', err);
    } finally {
      setLoadingFolders(false);
    }
  };

  // Validate format XXX.XXXX
  const validateFormat = (value: string) => {
    return /^[0-9]{3}\.[0-9]{4}$/.test(value);
  };

  const parseLabel = (label: string) => {
    const parts = label.split('.');
    return { prefix: parts[0] + '.', number: parseInt(parts[1], 10) };
  };

  // Live calculation of A3+ sheets and spare when user is typing in bulk mode
  const liveCalculation = React.useMemo(() => {
    if (mode !== 'bulk') return null;
    if (!validateFormat(startLabel) || !validateFormat(endLabel)) {
      return null;
    }
    const start = parseLabel(startLabel);
    const end = parseLabel(endLabel);
    if (start.prefix !== end.prefix || start.number > end.number) {
      return null;
    }
    const count = end.number - start.number + 1;
    if (count <= 0 || count > 2000) return null;
    return calculateLabelBatches(count, spareMode === 'a3_multiples');
  }, [mode, startLabel, endLabel, spareMode]);

  // Detected folder info for currently typed label prefix
  const activeInputPrefixInfo = React.useMemo(() => {
    const raw = mode === 'single' ? noLabel : startLabel;
    if (!raw) return null;
    const cleanPrefix = raw.split('.')[0];
    if (!cleanPrefix || cleanPrefix.length < 3) return null;
    return existingFolders.find(f => f.prefix === cleanPrefix) || null;
  }, [mode, noLabel, startLabel, existingFolders]);

  const handleApplyContinuation = (folder: ExistingFolderSummary) => {
    if (mode === 'single') {
      setNoLabel(folder.nextLabel);
    } else {
      setStartLabel(folder.nextLabel);
      setEndLabel(folder.nextLabel); // default to 1 sticker addition (misal 15 lanjut sampai 16)
      setSpareMode('exact'); // Default to exact count for continuation so it won't force 85 stickers
    }
    if (folder.namaRs) {
      setNamaRs(folder.namaRs);
    }
    setError('');
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    let prefix = '033.';
    let baseStartNum = 1;
    let baseEndNum = 1;
    let batchCalc: LabelBatchCalculation = { baseCount: 1, sheets: 1, totalCount: 1, spareCount: 0, spareWasBumped: false };

    if (mode === 'single') {
      if (!validateFormat(noLabel)) {
        setError('Format No Label tidak valid. Harus format XXX.XXXX (contoh: 001.0016).');
        return;
      }
      const parsed = parseLabel(noLabel);
      prefix = parsed.prefix;
      baseStartNum = parsed.number;
      baseEndNum = parsed.number;
    } else {
      if (!validateFormat(startLabel) || !validateFormat(endLabel)) {
        setError('Format No Label tidak valid. Harus format XXX.XXXX (contoh: 001.0016).');
        return;
      }
      const start = parseLabel(startLabel);
      const end = parseLabel(endLabel);
      
      if (start.prefix !== end.prefix) {
        setError('Awalan (3 digit pertama) harus sama untuk bulk generate.');
        return;
      }
      if (start.number > end.number) {
        setError('Label akhir harus lebih besar atau sama dengan label awal.');
        return;
      }
      
      const count = end.number - start.number + 1;
      if (count > 2000) {
        setError('Maksimal 2000 label dalam satu kali proses.');
        return;
      }
      prefix = start.prefix;
      baseStartNum = start.number;
      baseEndNum = end.number;

      // Hitung otomatis berdasarkan spareMode ('a3_multiples' atau 'exact')
      batchCalc = calculateLabelBatches(count, spareMode === 'a3_multiples');
    }

    const isSingleTidakLaik = mode === 'single' && singleType === 'tidak_laik';
    const isBulkTidakLaik = mode === 'bulk' && bulkType === 'tidak_laik';
    const isTargetTidakLaik = isSingleTidakLaik || isBulkTidakLaik;

    // 1. Primary requested labels
    const baseLabels: string[] = [];
    for (let i = baseStartNum; i <= baseEndNum; i++) {
      baseLabels.push(`${prefix}${i.toString().padStart(4, '0')}`);
    }

    // 2. Extra Spare labels to fill multiples of 85 (85, 170, 255, 340, ...)
    // Sesuai aturan: semua cadangan adalah Laik Pakai (kecuali jika batch sengaja dipilih Tidak Laik Pakai)
    const extraLaikLabels: string[] = [];
    const extraTidakLaikLabels: string[] = [];

    if (mode !== 'single' && batchCalc.spareCount > 0) {
      const extraStartNum = baseEndNum + 1;
      const extraEndNum = baseEndNum + batchCalc.spareCount;
      for (let i = extraStartNum; i <= extraEndNum; i++) {
        const lbl = `${prefix}${i.toString().padStart(4, '0')}`;
        if (isBulkTidakLaik) {
          extraTidakLaikLabels.push(lbl);
        } else {
          extraLaikLabels.push(lbl);
        }
      }
    }

    const labelsToGenerate = [...baseLabels, ...extraLaikLabels, ...extraTidakLaikLabels];

    const currentBreakdown: LabelBreakdown = {
      baseRangeStart: isSingleTidakLaik ? '' : (baseLabels[0] || ''),
      baseRangeEnd: isSingleTidakLaik ? '' : (baseLabels[baseLabels.length - 1] || ''),
      baseCount: isSingleTidakLaik ? 0 : baseLabels.length,
      extraLaikStart: extraLaikLabels.length > 0 ? extraLaikLabels[0] : '',
      extraLaikEnd: extraLaikLabels.length > 0 ? extraLaikLabels[extraLaikLabels.length - 1] : '',
      extraLaikCount: extraLaikLabels.length,
      extraTidakLaikStart: isSingleTidakLaik ? (baseLabels[0] || '') : (extraTidakLaikLabels.length > 0 ? extraTidakLaikLabels[0] : ''),
      extraTidakLaikEnd: isSingleTidakLaik ? (baseLabels[baseLabels.length - 1] || '') : (extraTidakLaikLabels.length > 0 ? extraTidakLaikLabels[extraTidakLaikLabels.length - 1] : ''),
      extraTidakLaikCount: isSingleTidakLaik ? 1 : extraTidakLaikLabels.length,
      totalCount: labelsToGenerate.length,
      sheetsCount: mode === 'bulk' ? batchCalc.sheets : 1,
      spareWasBumped: mode === 'bulk' ? batchCalc.spareWasBumped : false,
      type: mode === 'bulk' ? bulkType : singleType,
      spareMode: mode === 'bulk' ? spareMode : 'exact'
    };

    setLoading(true);
    setProgressMsg('Menyimpan ke database...');
    
    try {
      const cleanNamaRs = namaRs.trim() || null;

      const itemsToSave = [
        ...baseLabels.map(lbl => ({
          noLabel: lbl,
          no_label: lbl,
          status: isTargetTidakLaik ? 'Tidak Laik Pakai' : 'Menunggu Sertifikat',
          namaRs: cleanNamaRs,
          nama_rs: cleanNamaRs
        })),
        ...extraLaikLabels.map(lbl => ({
          noLabel: lbl,
          no_label: lbl,
          status: 'Cadangan Laik Pakai',
          namaRs: cleanNamaRs,
          nama_rs: cleanNamaRs
        })),
        ...extraTidakLaikLabels.map(lbl => ({
          noLabel: lbl,
          no_label: lbl,
          status: 'Tidak Laik Pakai',
          namaRs: cleanNamaRs,
          nama_rs: cleanNamaRs
        }))
      ];

      // 1. Direct save to Supabase with chunked batching
      const syncRes = await bulkSyncLabelsToSupabase(itemsToSave);
      if (!syncRes.success) {
        console.warn('Supabase bulk save warning: Primary sync failed, trying API fallback...');
      }

      // If hospital name is provided, update folder metadata map in Supabase & API
      if (cleanNamaRs && labelsToGenerate.length > 0) {
        const prefixVal = labelsToGenerate[0].split('.')[0];
        if (prefixVal) {
          await saveFolderRsToSupabase(prefixVal, cleanNamaRs);
          try {
            const currentFolderMap = JSON.parse(localStorage.getItem('smk_folder_nama_rs_map') || '{}');
            currentFolderMap[prefixVal] = cleanNamaRs;
            localStorage.setItem('smk_folder_nama_rs_map', JSON.stringify(currentFolderMap));
          } catch (_) {}
          fetch('/api/folders/nama-rs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix: prefixVal, namaRs: cleanNamaRs })
          }).catch(() => {});
        }
      }

      // 2. Sync to API backend with Auth Token if available
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          apiHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch('/api/labels/bulk', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({ items: itemsToSave })
        }).catch(err => console.warn('API bulk sync deferred:', err));
      } catch (_) {}

      // 3. Update localStorage labels as local backup and un-tombstone
      try {
        const localList = JSON.parse(localStorage.getItem('smk_labels') || '[]');
        const existingMap = new Map(localList.map((l: any) => [l.noLabel || l.no_label, l]));
        itemsToSave.forEach(it => {
          existingMap.set(it.noLabel, {
            id: it.noLabel,
            noLabel: it.noLabel,
            namaRs: cleanNamaRs,
            status: it.status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });
        localStorage.setItem('smk_labels', JSON.stringify(Array.from(existingMap.values())));

        // Un-tombstone if re-generated
        const p = labelsToGenerate[0]?.split('.')[0];
        if (p) {
          const delF = JSON.parse(localStorage.getItem('smk_deleted_folders') || '[]');
          const updatedF = delF.filter((x: string) => x !== p);
          localStorage.setItem('smk_deleted_folders', JSON.stringify(updatedF));
        }
        const delL = JSON.parse(localStorage.getItem('smk_deleted_labels') || '[]');
        const genSet = new Set(labelsToGenerate);
        const updatedL = delL.filter((x: string) => !genSet.has(x));
        localStorage.setItem('smk_deleted_labels', JSON.stringify(updatedL));
      } catch (_) {}

      setGeneratedLabels(labelsToGenerate);
      setBreakdownInfo(currentBreakdown);
      setSuccess(true);
      setNoLabel('');
      setStartLabel('');
      setEndLabel('');
      setNamaRs('');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan label.');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const getPublicUrl = (label: string) => {
    let base = (customDomain || window.location.origin).trim().replace(/\/+$/, '');
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = `https://${base}`;
    }
    return `${base}/sertifikat/${label}`;
  };

  const downloadPDF = async () => {
    const configLaik = templateConfigs?.besar;
    const configTidakLaik = templateConfigs?.besarTidakLaik || configLaik;

    if (!configLaik || !configLaik.imageUrl) {
      alert("Template Besar (Laik Pakai) belum diatur di menu 'Desain Template'. Silakan atur terlebih dahulu.");
      return;
    }

    setLoading(true);
    setProgressMsg('Menyiapkan file PDF...');
    
    try {
      // Real physical dimensions of individual sticker (6x2.5 cm)
      const labelWidth = 60; // 60 mm / 6 cm
      const labelHeight = 25; // 25 mm / 2.5 cm
      
      // Preview box dimensions in pixels from template editor
      const previewWidth = 750;
      const previewHeight = 312.5;
      
      // Scale ratios from preview pixels to sticker mm
      const scaleX = labelWidth / previewWidth;
      const scaleY = labelHeight / previewHeight;

      const isBulkA3 = (mode === 'bulk' || generatedLabels.length > 1) && bulkFormat === 'a3_plus';

      let isAllTidakLaik = false;
      let cutoffTidakLaikIndex = generatedLabels.length;

      if (breakdownInfo) {
        if (breakdownInfo.type === 'tidak_laik') {
          isAllTidakLaik = true;
          cutoffTidakLaikIndex = 0;
        } else if (breakdownInfo.extraTidakLaikCount > 0) {
          cutoffTidakLaikIndex = breakdownInfo.baseCount + breakdownInfo.extraLaikCount;
        }
      } else {
        if (mode === 'single' && singleType === 'tidak_laik') {
          isAllTidakLaik = true;
          cutoffTidakLaikIndex = 0;
        } else if (mode === 'bulk' && bulkType === 'tidak_laik') {
          isAllTidakLaik = true;
          cutoffTidakLaikIndex = 0;
        }
      }

      if (isBulkA3) {
        // Standar format cetak lembaran A3+ (320 mm x 480 mm, portrait)
        const sheetWidth = 320;
        const sheetHeight = 480;
        const cols = 5;
        const rows = 17;
        const labelsPerSheet = cols * rows; // 85 stiker (besar: 5x17)

        const gapX = 2; // 2mm kiss-cut gap antar stiker
        const gapY = 2; // 2mm kiss-cut gap antar stiker

        const totalGridWidth = cols * labelWidth + (cols - 1) * gapX; // 308 mm
        const marginLeft = (sheetWidth - totalGridWidth) / 2; // 6 mm

        const totalGridHeight = rows * labelHeight + (rows - 1) * gapY; // 457 mm
        const marginTop = (sheetHeight - totalGridHeight) / 2; // 11.5 mm margin atas & bawah

        const totalSheets = Math.ceil(generatedLabels.length / labelsPerSheet);

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [sheetWidth, sheetHeight],
        });

        for (let sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
          if (sheetIdx > 0) pdf.addPage();

          const startIdx = sheetIdx * labelsPerSheet;
          const endIdx = Math.min(startIdx + labelsPerSheet, generatedLabels.length);
          const sheetCount = endIdx - startIdx;

          setProgressMsg(`Membuat lembar A3+ (${sheetIdx + 1}/${totalSheets})...`);
          await new Promise(r => setTimeout(r, 10));

          // 1. Header Metadata Text
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          pdf.setTextColor(110, 110, 110);
          const headerText = `PT SARANA MULTI KALIBRASI  •  LEMBAR A3+ KISSCUT/DIECUT  •  Lembar ${sheetIdx + 1}/${totalSheets} (${sheetCount} Stiker)  •  Ukuran Besar 60x25 mm / 6x2,5 cm (Maks 85/lbr)  •  Label ${generatedLabels[startIdx]} s/d ${generatedLabels[endIdx - 1]}`;
          pdf.text(headerText, marginLeft, Math.max(5, marginTop - 3.5));

          // 2. Optical Registration Crop Marks pada 4 sudut grid
          pdf.setDrawColor(160, 160, 160);
          pdf.setLineWidth(0.2);
          const rightEdge = marginLeft + totalGridWidth;
          const bottomEdge = marginTop + totalGridHeight;
          // Top-Left
          pdf.line(marginLeft - 6, marginTop, marginLeft - 1, marginTop);
          pdf.line(marginLeft, marginTop - 6, marginLeft, marginTop - 1);
          // Top-Right
          pdf.line(rightEdge + 1, marginTop, rightEdge + 6, marginTop);
          pdf.line(rightEdge, marginTop - 6, rightEdge, marginTop - 1);
          // Bottom-Left
          pdf.line(marginLeft - 6, bottomEdge, marginLeft - 1, bottomEdge);
          pdf.line(marginLeft, bottomEdge + 1, marginLeft, bottomEdge + 6);
          // Bottom-Right
          pdf.line(rightEdge + 1, bottomEdge, rightEdge + 6, bottomEdge);
          pdf.line(rightEdge, bottomEdge + 1, rightEdge, bottomEdge + 6);

          // 3. Render Setiap Stiker di dalam Grid Lembar A3+
          for (let k = 0; k < sheetCount; k++) {
            const globalIdx = startIdx + k;
            const labelStr = generatedLabels[globalIdx];

            const col = k % cols;
            const row = Math.floor(k / cols);

            const x = marginLeft + col * (labelWidth + gapX);
            const y = marginTop + row * (labelHeight + gapY);

            const isTidakLaik = isAllTidakLaik || (globalIdx >= cutoffTidakLaikIndex);
            const activeConfig = isTidakLaik && configTidakLaik?.imageUrl ? configTidakLaik : configLaik;

            // A. Background Template Image
            pdf.addImage(activeConfig.imageUrl, 'JPEG', x, y, labelWidth, labelHeight);

            // B. QR Code
            const qrUrl = getPublicUrl(labelStr);
            const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
              margin: 0, 
              width: 260, 
              color: { dark: '#000000', light: '#FFFFFF' } 
            });
            pdf.addImage(
              qrDataUrl,
              'PNG',
              x + (activeConfig.qr.x * scaleX),
              y + (activeConfig.qr.y * scaleY),
              activeConfig.qr.width * scaleX,
              activeConfig.qr.height * scaleY
            );

            // C. Text Nomor Label
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor('#000000');
            const ptSize = activeConfig.text.fontSize * scaleY * 2.83465;
            pdf.setFontSize(ptSize);
            pdf.text(
              labelStr,
              x + (activeConfig.text.x * scaleX),
              y + (activeConfig.text.y * scaleY) + (ptSize * 0.3527)
            );

            // D. Marker visual jika Tidak Laik Pakai dan belum punya template khusus
            if (isTidakLaik && (!templateConfigs?.besarTidakLaik || !templateConfigs.besarTidakLaik.imageUrl)) {
              pdf.setFillColor(225, 29, 72); // rose-600
              pdf.rect(x + labelWidth - 18, y + 1, 17, 3.5, 'F');
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(3.8);
              pdf.setTextColor(255, 255, 255);
              pdf.text("TIDAK LAIK PAKAI", x + labelWidth - 17.2, y + 3.5);
            }

            // E. Hairline Kiss-Cut / Die-Cut Boundary (0.08 mm)
            pdf.setDrawColor(210, 210, 210);
            pdf.setLineWidth(0.08);
            pdf.rect(x, y, labelWidth, labelHeight);
          }
        }

        setProgressMsg('Menyimpan PDF A3+...');
        const fileName = `Labels_A3Plus_KissCut_Besar_${generatedLabels[0]}_to_${generatedLabels[generatedLabels.length - 1]}.pdf`;
        pdf.save(fileName);
      } else {
        // Mode satuan (1 label per halaman individual landscape)
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [labelWidth, labelHeight],
        });

        for (let i = 0; i < generatedLabels.length; i++) {
          if (i > 0) pdf.addPage();
          
          if (i % 25 === 0) {
             setProgressMsg(`Membuat halaman PDF... (${i + 1}/${generatedLabels.length})`);
             await new Promise(r => setTimeout(r, 10));
          }

          const labelStr = generatedLabels[i];
          const isTidakLaik = isAllTidakLaik || (i >= cutoffTidakLaikIndex);
          const activeConfig = isTidakLaik && configTidakLaik?.imageUrl ? configTidakLaik : configLaik;
          
          // 1. Draw Background
          pdf.addImage(activeConfig.imageUrl, 'JPEG', 0, 0, labelWidth, labelHeight);
          
          // 2. Draw QR Code
          const qrUrl = getPublicUrl(labelStr);
          const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 0, width: 300, color: { dark: '#000000', light: '#FFFFFF' } });
          pdf.addImage(
            qrDataUrl, 
            'PNG', 
            activeConfig.qr.x * scaleX, 
            activeConfig.qr.y * scaleY, 
            activeConfig.qr.width * scaleX, 
            activeConfig.qr.height * scaleY
          );
          
          // 3. Draw Text
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor('#000000');
          const ptSize = (activeConfig.text.fontSize * scaleY * 2.83465); 
          pdf.setFontSize(ptSize);
          pdf.text(
            labelStr, 
            activeConfig.text.x * scaleX, 
            (activeConfig.text.y * scaleY) + (ptSize * 0.3527)
          );

          if (isTidakLaik && (!templateConfigs?.besarTidakLaik || !templateConfigs.besarTidakLaik.imageUrl)) {
            pdf.setFillColor(225, 29, 72);
            pdf.rect(labelWidth - 18, 1, 17, 3.5, 'F');
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(3.8);
            pdf.setTextColor(255, 255, 255);
            pdf.text("TIDAK LAIK PAKAI", labelWidth - 17.2, 3.5);
          }
        }
        
        setProgressMsg('Menyimpan PDF...');
        const fileName = generatedLabels.length === 1 
          ? `Label_${generatedLabels[0]}.pdf` 
          : `Labels_${generatedLabels[0]}_to_${generatedLabels[generatedLabels.length - 1]}.pdf`;
        pdf.save(fileName);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat membuat PDF.');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setGeneratedLabels([]);
    setBreakdownInfo(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Buat Label Baru</h2>
          <p className="text-slate-500 text-sm mt-0.5">Generate nomor label dan unduh PDF stiker kalibrasi siap cetak.</p>
        </div>
      </div>

      {!success ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8">
          <div className="flex-1 max-w-md">
            
            {/* Folder Continuation Suggestions */}
            {existingFolders.length > 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-amber-50/90 to-orange-50/70 border border-amber-200/80 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Penambahan Stiker dari Seri yang Sudah Ada:
                  </span>
                  <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-2 py-0.5 rounded-full font-mono">
                    {existingFolders.length} Seri Folder
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {existingFolders.map((f) => (
                    <div 
                      key={f.prefix} 
                      className="flex items-center justify-between bg-white/90 hover:bg-white p-2 rounded-xl border border-amber-100/90 shadow-2xs transition-all text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                          <span>Folder {f.prefix}</span>
                          <span className="text-[10px] font-normal text-slate-500 font-sans">
                            ({f.count} label, terakhir <strong className="text-slate-800 font-mono">{f.maxLabel}</strong>)
                          </span>
                        </div>
                        {f.namaRs && (
                          <div className="text-[11px] text-amber-800 truncate" title={f.namaRs}>
                            {f.namaRs}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyContinuation(f)}
                        className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                        title={`Lanjutkan penambahan stiker mulai dari ${f.nextLabel}`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Lanjut {f.nextLabel}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => { setMode('single'); setError(''); }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  mode === 'single' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Satuan
              </button>
              <button
                type="button"
                onClick={() => { setMode('bulk'); setError(''); }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  mode === 'bulk' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Sekaligus (Bulk)
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Intelligent Active Prefix Continuation Notification */}
              {activeInputPrefixInfo && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">
                      Seri Folder {activeInputPrefixInfo.prefix} {activeInputPrefixInfo.namaRs ? `(${activeInputPrefixInfo.namaRs})` : ''}
                    </p>
                    <p className="text-[11px] text-amber-900 mt-0.5">
                      Nomor terakhir yang terdaftar adalah <strong className="font-mono">{activeInputPrefixInfo.maxLabel}</strong>.
                    </p>
                    {(mode === 'single' ? noLabel !== activeInputPrefixInfo.nextLabel : startLabel !== activeInputPrefixInfo.nextLabel) && (
                      <button
                        type="button"
                        onClick={() => handleApplyContinuation(activeInputPrefixInfo)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 hover:text-black bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Gunakan nomor lanjutan: {activeInputPrefixInfo.nextLabel}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {mode === 'single' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">No Label</label>
                    <input
                      type="text"
                      required
                      value={noLabel}
                      onChange={(e) => {
                        setNoLabel(e.target.value);
                        setError('');
                      }}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-slate-50 text-slate-900 outline-none font-mono"
                      placeholder="001.0016"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status / Jenis Stiker</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSingleType('laik')}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-lg transition-all",
                          singleType === 'laik'
                            ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Laik Pakai</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSingleType('tidak_laik')}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-lg transition-all",
                          singleType === 'tidak_laik'
                            ? "bg-rose-600 text-white shadow-sm ring-1 ring-rose-700"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                        )}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Tidak Laik Pakai</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status / Jenis Stiker</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setBulkType('laik')}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-lg transition-all",
                          bulkType === 'laik'
                            ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Laik Pakai (Standar)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkType('tidak_laik')}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-lg transition-all",
                          bulkType === 'tidak_laik'
                            ? "bg-rose-600 text-white shadow-sm ring-1 ring-rose-700"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                        )}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Tidak Laik Pakai</span>
                      </button>
                    </div>
                  </div>

                  {/* Spare Mode Selector */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Metode Cadangan (Spare)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSpareMode('exact')}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all text-xs",
                          spareMode === 'exact'
                            ? "border-amber-500 bg-amber-50/80 text-amber-950 ring-2 ring-amber-500/20 shadow-2xs font-semibold"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">🎯 Pas / Lanjutan (+0 Spare)</span>
                          {spareMode === 'exact' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Tepat sesuai nomor (misal 15 lanjut sampai 16 hanya 1 stiker).
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSpareMode('a3_multiples')}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all text-xs",
                          spareMode === 'a3_multiples'
                            ? "border-blue-500 bg-blue-50/80 text-blue-950 ring-2 ring-blue-500/20 shadow-2xs font-semibold"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">📦 Kelipatan 85 (A3+ Penuh)</span>
                          {spareMode === 'a3_multiples' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Dibulatkan ke 85, 170, 255 dst (spare &lt; 15 dibulatkan ke atas).
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Label Awal</label>
                      <input
                        type="text"
                        required
                        value={startLabel}
                        onChange={(e) => {
                          setStartLabel(e.target.value);
                          setError('');
                        }}
                        className="block w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-slate-50 text-slate-900 outline-none font-mono"
                        placeholder="001.0016"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Label Akhir</label>
                      <input
                        type="text"
                        required
                        value={endLabel}
                        onChange={(e) => {
                          setEndLabel(e.target.value);
                          setError('');
                        }}
                        className="block w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-slate-50 text-slate-900 outline-none font-mono"
                        placeholder="001.0016"
                      />
                    </div>
                  </div>

                  {liveCalculation && (
                    <div className={cn(
                      "border rounded-xl p-3.5 text-xs space-y-2",
                      spareMode === 'exact' 
                        ? "bg-gradient-to-r from-amber-50/90 to-orange-50/80 border-amber-200 text-amber-950"
                        : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-950"
                    )}>
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full animate-pulse", spareMode === 'exact' ? "bg-amber-600" : "bg-blue-600")}></span>
                          {spareMode === 'exact' 
                            ? 'Simulasi Penambahan Stiker Pas (Tanpa Cadangan):' 
                            : 'Simulasi Kelipatan 85 & Cadangan (A3+):'}
                        </span>
                        <span className={cn("text-white font-mono px-2 py-0.5 rounded text-[11px] font-bold", spareMode === 'exact' ? "bg-amber-700" : "bg-blue-600")}>
                          {liveCalculation.sheets} Lembar • {liveCalculation.totalCount} Stiker
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-white/70 p-2.5 rounded-lg border border-slate-200/60 text-center">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Kebutuhan Pokok</span>
                          <span className="font-extrabold text-slate-900 font-mono text-xs">{liveCalculation.baseCount} Label</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Cadangan (Spare)</span>
                          <span className={cn("font-extrabold font-mono text-xs", liveCalculation.spareCount > 0 ? "text-amber-700" : "text-slate-400")}>
                            +{liveCalculation.spareCount} Label
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Total Digenerate</span>
                          <span className={cn("font-extrabold font-mono text-xs", spareMode === 'exact' ? "text-amber-900" : "text-blue-900")}>
                            {liveCalculation.totalCount} Stiker
                          </span>
                        </div>
                      </div>

                      {spareMode === 'exact' ? (
                        <p className="text-[11px] text-amber-900 bg-amber-100/70 border border-amber-200 p-2 rounded-md font-medium">
                          🎯 <strong>Mode Pas Sesuai Permintaan:</strong> Menghasilkan tepat {liveCalculation.baseCount} stiker (mulai {startLabel} s/d {endLabel}) tanpa dipaksa menghasilkan cadangan 85 stiker.
                        </p>
                      ) : liveCalculation.spareWasBumped ? (
                        <p className="text-[11px] text-amber-900 bg-amber-100/70 border border-amber-200 p-2 rounded-md font-medium">
                          ⚠️ <strong>Otomatis Pembulatan ke Atas ({liveCalculation.totalCount} stiker / {liveCalculation.sheets} lembar):</strong> Karena sisa spare kurang dari 15 stiker, otomatis digenapkan ke kelipatan 85 berikutnya (+{liveCalculation.spareCount} cadangan {bulkType === 'laik' ? 'Laik Pakai' : 'Tidak Laik'}).
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-800 bg-emerald-100/70 border border-emerald-200 p-2 rounded-md">
                          ✅ <strong>Format Pas ({liveCalculation.totalCount} stiker / {liveCalculation.sheets} lembar):</strong> Sisa spare {liveCalculation.spareCount} stiker (≥ 15) melengkapi kelipatan 85 lembar A3+.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Hospital Name (Optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>Nama Rumah Sakit / Instansi</span>
                  <span className="text-xs text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  list="hospitals-generate-list"
                  value={namaRs}
                  onChange={(e) => setNamaRs(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-slate-50 text-slate-900 outline-none text-sm"
                  placeholder="Pilih atau tulis nama RS (Contoh: RSUD Dr. Moewardi)"
                />
                <datalist id="hospitals-generate-list">
                  {INITIAL_HOSPITALS.map(h => (
                    <option key={h.id} value={h.name} />
                  ))}
                </datalist>
                <p className="text-[11px] text-slate-400 mt-1">
                  Jika diisi, nama RS akan tersimpan di label & folder metadata. Jika dikosongi, label tidak akan memiliki asosiasi nama RS bawaan.
                </p>
              </div>

              {error && (
                <p className="text-sm text-rose-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 inline shrink-0" />
                  {error}
                </p>
              )}
              <p className="text-xs text-slate-500">Format: 3 digit angka, titik, 4 digit angka.</p>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-slate-900 bg-amber-500 hover:bg-amber-400 focus:outline-none disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    {progressMsg || 'Memproses...'}
                  </>
                ) : (
                  'Generate Label'
                )}
              </button>
            </form>
          </div>
          
          <div className="hidden md:flex flex-1 items-center justify-center border-l border-slate-100 pl-8">
             <div className="text-center text-slate-400">
               <LayoutTemplate className="w-16 h-16 mx-auto mb-4 opacity-50" />
               <p className="text-sm">Gunakan mode <strong>Sekaligus</strong> untuk membuat ratusan label dalam satu klik, lalu unduh sebagai satu file PDF siap cetak.</p>
             </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-6">
            <div className="flex items-center text-emerald-600 mb-2">
              <CheckCircle2 className="w-8 h-8 mr-3 shrink-0" />
              <div>
                <h3 className="text-xl font-bold">Berhasil Dibuat!</h3>
                <p className="text-sm text-emerald-700/80">
                  Total {generatedLabels.length} label telah tersimpan di database.
                </p>
              </div>
            </div>

            {/* Rincian Label Card Breakdown */}
            {breakdownInfo && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center justify-between">
                  <span>
                    Rincian Komposisi Label {breakdownInfo.spareMode === 'exact' ? '(Mode Pas Sesuai Permintaan)' : '(Kelipatan 85 / Lembar A3+)'}
                  </span>
                  <span className="text-xs font-mono bg-slate-900 text-amber-400 px-2.5 py-1 rounded-lg font-bold">
                    {breakdownInfo.totalCount} Total Stiker ({breakdownInfo.sheetsCount} Lembar)
                  </span>
                </h4>
                
                <div className={cn(
                  "grid grid-cols-1 gap-3",
                  (breakdownInfo.extraLaikCount > 0 || breakdownInfo.extraTidakLaikCount > 0) ? "sm:grid-cols-2" : "sm:grid-cols-1"
                )}>
                  <div className={cn(
                    "p-3.5 rounded-xl border",
                    breakdownInfo.type === 'tidak_laik' 
                      ? "bg-rose-50/80 border-rose-200/80 text-rose-950" 
                      : "bg-emerald-50/80 border-emerald-200/80 text-emerald-950"
                  )}>
                    <div className="text-[11px] font-bold uppercase tracking-wider">
                      {breakdownInfo.type === 'tidak_laik' ? 'Label Utama (Tidak Laik Pakai)' : 'Label Utama (Laik Pakai)'}
                    </div>
                    <div className="text-sm font-extrabold font-mono mt-1">
                      {breakdownInfo.baseRangeStart === breakdownInfo.baseRangeEnd 
                        ? breakdownInfo.baseRangeStart 
                        : `${breakdownInfo.baseRangeStart} s/d ${breakdownInfo.baseRangeEnd}`}
                    </div>
                    <div className="text-[11px] font-medium mt-0.5 opacity-80">
                      {breakdownInfo.baseCount} Label ({breakdownInfo.type === 'tidak_laik' ? 'Status Tidak Laik Pakai' : 'Status Menunggu Sertifikat'})
                    </div>
                  </div>

                  {breakdownInfo.extraLaikCount > 0 && (
                    <div className="bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-xl">
                      <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                        +{breakdownInfo.extraLaikCount} Cadangan Laik Pakai
                      </div>
                      <div className="text-sm font-extrabold text-amber-950 font-mono mt-1">
                        {breakdownInfo.extraLaikStart === breakdownInfo.extraLaikEnd 
                          ? breakdownInfo.extraLaikStart 
                          : `${breakdownInfo.extraLaikStart} s/d ${breakdownInfo.extraLaikEnd}`}
                      </div>
                      <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                        {breakdownInfo.extraLaikCount} Label Cadangan (Kelipatan 85 Lembar A3+)
                      </div>
                      {breakdownInfo.spareWasBumped && (
                        <div className="text-[10px] text-amber-800 font-semibold mt-1">
                          *Dibulatkan otomatis ke kelipatan berikutnya karena sisa spare &lt; 15 stiker
                        </div>
                      )}
                    </div>
                  )}

                  {breakdownInfo.extraTidakLaikCount > 0 && (
                    <div className="bg-rose-50/80 border border-rose-200/80 p-3.5 rounded-xl">
                      <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                        +{breakdownInfo.extraTidakLaikCount} Cadangan Tidak Laik Pakai
                      </div>
                      <div className="text-sm font-extrabold text-rose-950 font-mono mt-1">
                        {breakdownInfo.extraTidakLaikStart === breakdownInfo.extraTidakLaikEnd 
                          ? breakdownInfo.extraTidakLaikStart 
                          : `${breakdownInfo.extraTidakLaikStart} s/d ${breakdownInfo.extraTidakLaikEnd}`}
                      </div>
                      <div className="text-[11px] text-rose-700 font-medium mt-0.5">
                        {breakdownInfo.extraTidakLaikCount} Label Cadangan Tidak Laik
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Opsi Format Cetak */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-700 text-sm">Format Output PDF:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBulkFormat('a3_plus')}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all",
                    bulkFormat === 'a3_plus'
                      ? "border-blue-500 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Lembar Kertas A3+ Kiss-Cut / Die-Cut</span>
                    {bulkFormat === 'a3_plus' && (
                      <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">Rekomendasi</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ukuran 320 x 480 mm siap cetak offset/laser digital. Lengkap dengan garis potong kiss-cut & crop marks.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkFormat('individual')}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all",
                    bulkFormat === 'individual'
                      ? "border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div className="font-bold text-xs">Satuan / Thermal Roll</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    1 stiker per halaman (Ukuran Besar 6x2,5 cm), cocok untuk printer thermal gulungan.
                  </p>
                </button>
              </div>

              {bulkFormat === 'a3_plus' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Rincian Lembar Cetak A3+ (320 × 480 mm):</span>
                    <span className="text-blue-700 font-mono">
                      {Math.ceil(generatedLabels.length / 85)} Lembar A3+
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Total <strong>{generatedLabels.length} stiker</strong> akan di-layout otomatis:
                  </p>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                    <li>
                      Kapasitas per lembar: <strong>85 stiker (5 kolom × 17 baris)</strong>
                    </li>
                    <li>
                      Lembar 1: <strong>{Math.min(generatedLabels.length, 85)} stiker</strong>
                    </li>
                    {generatedLabels.length > 85 && (
                      <li>
                        Lembar 2: <strong>
                          {Math.min(generatedLabels.length - 85, 85)} stiker
                        </strong>
                        {generatedLabels.length > 170 && ' (dan lembar selanjutnya)'}
                      </li>
                    )}
                  </ul>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Tersedia margin keliling aman (6 mm) & jarak potong pisau / kiss-cut 2 mm antarstiker.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-800 text-sm">
               <strong>Catatan Warna (CMYK):</strong> File PDF yang dihasilkan aplikasi ini secara bawaan berformat RGB (standar web). Namun jangan khawatir, ketika file ini dikirim ke mesin cetak digital offset/laser, <strong>RIP software pada mesin cetak akan otomatis mengkonversinya ke warna CMYK</strong> dengan sangat baik. 
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={downloadPDF}
                disabled={loading}
                className="flex items-center px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />} 
                {loading 
                  ? progressMsg 
                  : bulkFormat === 'a3_plus'
                    ? `Download PDF Lembar A3+ (${Math.ceil(generatedLabels.length / 85)} Lembar • ${generatedLabels.length} Stiker)`
                    : `Download Label PDF (${generatedLabels.length} Halaman)`
                }
              </button>

              {generatedLabels.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const firstLabel = generatedLabels[0];
                      const prefix = firstLabel.split('.')[0] || '';
                      navigate(`/admin/labels?folder=${prefix}`);
                    }}
                    className="flex items-center px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Buka Folder Label ({generatedLabels[0].split('.')[0] || 'Daftar'})
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(getPublicUrl(generatedLabels[0]), '_blank')}
                    className="flex items-center px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                    title="Buka halaman scan hasil label pertama"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Tes Scan Label Pertama ({generatedLabels[0]})
                  </button>
                </>
              )}

              <button
                onClick={resetForm}
                disabled={loading}
                className="flex items-center px-4 py-2.5 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 ml-auto"
              >
                Buat Label Lain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
