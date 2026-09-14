import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  Check, 
  PenTool, 
  Upload, 
  UserCheck, 
  ShieldCheck, 
  Sparkles, 
  Trash2,
  Download,
  FileText
} from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (signatureDataUrl: string, signerName?: string, signerRole?: string) => void;
  initialSignerName?: string;
  initialSignerRole?: string;
  title?: string;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSaveSignature,
  initialSignerName = 'Hafizh Pasifianto Utomo, S.Tr.T.',
  initialSignerRole = 'Manajer Teknik & Penanggung Jawab KAN',
  title = 'Bubuhkan Tanda Tangan & Stempel Digital Resmi'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [inkColor, setInkColor] = useState('#1e3a8a'); // Professional Blue Ink default
  const [penWidth, setPenWidth] = useState(2.8);
  const [signerName, setSignerName] = useState(initialSignerName);
  const [signerRole, setSignerRole] = useState(initialSignerRole);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [uploadedPdfBase64, setUploadedPdfBase64] = useState<string | null>(null);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setSignerName(initialSignerName);
      setSignerRole(initialSignerRole);
      // Wait for canvas element to mount
      setTimeout(() => {
        initCanvas();
      }, 100);
    }
  }, [isOpen, initialSignerName, initialSignerRole]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = penWidth;

    // Save blank canvas state to history
    const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory([initialImageData]);
    setHasDrawn(false);
  };

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = penWidth;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Push state into undo history
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory(prev => [...prev.slice(-15), currentState]);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const blankState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory([blankState]);
    setHasDrawn(false);
  };

  const undoStroke = () => {
    if (strokeHistory.length <= 1) {
      clearCanvas();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...strokeHistory];
    newHistory.pop(); // Remove current
    const previousState = newHistory[newHistory.length - 1];

    ctx.putImageData(previousState, 0, 0);
    setStrokeHistory(newHistory);
    setHasDrawn(newHistory.length > 1);
  };

  // Generate an authentic vector-like preview signature preset for fast selection
  const applyPresetSignature = (name: string, role: string, presetType: 'director' | 'manager' | 'tech') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    clearCanvas();
    setSignerName(name);
    setSignerRole(role);

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = penWidth;
    ctx.beginPath();

    if (presetType === 'director') {
      // Elegant stylized initial swoop
      ctx.moveTo(w * 0.18, h * 0.58);
      ctx.bezierCurveTo(w * 0.22, h * 0.18, w * 0.32, h * 0.22, w * 0.30, h * 0.72);
      ctx.bezierCurveTo(w * 0.28, h * 0.90, w * 0.35, h * 0.88, w * 0.42, h * 0.48);
      ctx.bezierCurveTo(w * 0.46, h * 0.35, w * 0.54, h * 0.65, w * 0.60, h * 0.45);
      ctx.bezierCurveTo(w * 0.68, h * 0.30, w * 0.72, h * 0.70, w * 0.82, h * 0.52);
      ctx.bezierCurveTo(w * 0.88, h * 0.42, w * 0.90, h * 0.62, w * 0.92, h * 0.55);
      // Underline flourish
      ctx.moveTo(w * 0.20, h * 0.78);
      ctx.bezierCurveTo(w * 0.45, h * 0.76, w * 0.75, h * 0.84, w * 0.86, h * 0.72);
    } else if (presetType === 'manager') {
      // Bold technical signature loop
      ctx.moveTo(w * 0.22, h * 0.65);
      ctx.bezierCurveTo(w * 0.25, h * 0.25, w * 0.38, h * 0.20, w * 0.36, h * 0.68);
      ctx.bezierCurveTo(w * 0.34, h * 0.85, w * 0.48, h * 0.40, w * 0.55, h * 0.42);
      ctx.bezierCurveTo(w * 0.62, h * 0.44, w * 0.64, h * 0.65, w * 0.74, h * 0.35);
      ctx.bezierCurveTo(w * 0.80, h * 0.20, w * 0.85, h * 0.55, w * 0.88, h * 0.60);
      // Cross / underline
      ctx.moveTo(w * 0.28, h * 0.74);
      ctx.lineTo(w * 0.84, h * 0.74);
    } else {
      // Dynamic technician signature
      ctx.moveTo(w * 0.20, h * 0.62);
      ctx.bezierCurveTo(w * 0.26, h * 0.32, w * 0.34, h * 0.32, w * 0.38, h * 0.66);
      ctx.bezierCurveTo(w * 0.42, h * 0.50, w * 0.52, h * 0.48, w * 0.58, h * 0.62);
      ctx.bezierCurveTo(w * 0.66, h * 0.42, w * 0.76, h * 0.40, w * 0.84, h * 0.58);
      ctx.moveTo(w * 0.24, h * 0.72);
      ctx.bezierCurveTo(w * 0.50, h * 0.70, w * 0.75, h * 0.76, w * 0.88, h * 0.70);
    }
    ctx.stroke();

    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory([state]);
    setHasDrawn(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let dataUrl = event.target?.result as string;
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      
      if (isPdf) {
        if (!dataUrl.startsWith('data:application/pdf')) {
           const base64Part = dataUrl.split(',')[1];
           if (base64Part) {
             dataUrl = `data:application/pdf;base64,${base64Part}`;
           }
        }
        setUploadedPdfBase64(dataUrl);
        setHasDrawn(true);
        return;
      }
      
      setUploadedPdfBase64(null);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        clearCanvas();
        const rect = canvas.getBoundingClientRect();
        // Scale and center image inside canvas
        const scale = Math.min((rect.width * 0.8) / img.width, (rect.height * 0.8) / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = (rect.width - drawW) / 2;
        const drawY = (rect.height - drawH) / 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setStrokeHistory([state]);
        setHasDrawn(true);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSave = () => {
    if (!hasDrawn) return;

    let dataUrl = uploadedPdfBase64;
    
    if (!dataUrl) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Export as transparent high-res PNG
      dataUrl = canvas.toDataURL('image/png');
    }
    
    // Save to localStorage so it can be reused effortlessly
    try {
      localStorage.setItem('smk_last_signature', dataUrl);
      localStorage.setItem('smk_last_signer_name', signerName);
      localStorage.setItem('smk_last_signer_role', signerRole);
    } catch {
      // localstorage ignore
    }

    onSaveSignature(dataUrl, signerName, signerRole);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                {title}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                  Digital Sign
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Goreskan tanda tangan digital langsung atau pilih dari profil penandatangan resmi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Signer Profile Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Penandatangan Resmi:
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g. Hafizh Pasifianto Utomo, S.Tr.T."
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jabatan / Kapasitas Penandatangan:
              </label>
              <input
                type="text"
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value)}
                placeholder="e.g. Manajer Teknik PT SMK"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Preset Buttons for Authorized Personnel */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Profil Pejabat Resmi PT. Sarana Multi Kalibrasi:
              </span>
              <span className="text-[11px] text-slate-400">Klik untuk isi otomatis</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPresetSignature('Ahmad Fajar Ariyanto', 'Direktur Utama PT. Sarana Multi Kalibrasi', 'director')}
                className="p-2 text-left bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-lg transition-all group"
              >
                <p className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-700 truncate">
                  Ahmad Fajar Ariyanto
                </p>
                <p className="text-[10px] text-slate-500 truncate">Direktur Utama</p>
              </button>

              <button
                type="button"
                onClick={() => applyPresetSignature('Hafizh Pasifianto Utomo, S.Tr.T.', 'Manajer Teknik & Lead Elektromedis', 'manager')}
                className="p-2 text-left bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-lg transition-all group"
              >
                <p className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-700 truncate">
                  Hafizh Pasifianto, S.Tr.T.
                </p>
                <p className="text-[10px] text-slate-500 truncate">Manajer Teknik</p>
              </button>

              <button
                type="button"
                onClick={() => applyPresetSignature('Junior Yudha Pamungkas', 'Lead Teknisi Elektromedis KAN', 'tech')}
                className="p-2 text-left bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-lg transition-all group"
              >
                <p className="text-[11px] font-bold text-slate-800 group-hover:text-blue-700 truncate">
                  Junior Yudha Pamungkas
                </p>
                <p className="text-[10px] text-slate-500 truncate">Lead Teknisi</p>
              </button>
            </div>
          </div>

          {/* Canvas Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                Area Goresan Tanda Tangan (Stylus Pen / Touch / Mouse):
              </span>
              <div className="flex items-center gap-2">
                {/* Color Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                  <button
                    type="button"
                    title="Tinta Biru Resmi (Royal Blue)"
                    onClick={() => setInkColor('#1e3a8a')}
                    className={`w-4 h-4 rounded-full bg-blue-900 transition-transform ${inkColor === '#1e3a8a' ? 'scale-125 ring-2 ring-indigo-400' : 'opacity-60'}`}
                  />
                  <button
                    type="button"
                    title="Tinta Hitam Tegas"
                    onClick={() => setInkColor('#0f172a')}
                    className={`w-4 h-4 rounded-full bg-slate-900 transition-transform ${inkColor === '#0f172a' ? 'scale-125 ring-2 ring-indigo-400' : 'opacity-60'}`}
                  />
                  <button
                    type="button"
                    title="Tinta Biru Muda"
                    onClick={() => setInkColor('#0284c7')}
                    className={`w-4 h-4 rounded-full bg-sky-600 transition-transform ${inkColor === '#0284c7' ? 'scale-125 ring-2 ring-indigo-400' : 'opacity-60'}`}
                  />
                </div>

                {/* Pen Width */}
                <select
                  value={penWidth}
                  onChange={(e) => setPenWidth(Number(e.target.value))}
                  className="text-[11px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700"
                >
                  <option value={2}>Halus (2px)</option>
                  <option value={2.8}>Standar (2.8px)</option>
                  <option value={4}>Tebal (4px)</option>
                </select>
              </div>
            </div>

            {/* Canvas Container */}
            <div className="relative rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors bg-white overflow-hidden shadow-inner touch-none">
              {uploadedPdfBase64 ? (
                <div className="w-full h-48 flex flex-col items-center justify-center bg-slate-50">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-2">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">File PDF Terunggah</p>
                  <p className="text-xs text-slate-500 mt-1">Dokumen PDF akan disisipkan sebagai tanda tangan/stempel.</p>
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  className="w-full h-48 cursor-crosshair block"
                />
              )}

              {/* Watermark Guidelines */}
              {!hasDrawn && !uploadedPdfBase64 && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300 select-none">
                  <PenTool className="w-8 h-8 mb-1.5 opacity-40 animate-pulse" />
                  <p className="text-xs font-medium">Tanda tangan di sini menggunakan stylus atau jari</p>
                  <p className="text-[10px] text-slate-300">Format PNG transparan otomatis diekspor</p>
                </div>
              )}

              {/* Baseline indicator */}
              {!uploadedPdfBase64 && (
                <div className="absolute bottom-9 left-8 right-8 border-b border-slate-200 border-dashed pointer-events-none" />
              )}
            </div>

            {/* Canvas Actions */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={undoStroke}
                  disabled={strokeHistory.length <= 1 || !!uploadedPdfBase64}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Urungkan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedPdfBase64(null);
                    clearCanvas();
                  }}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Bersihkan
                </button>
              </div>

              {/* Upload image alternative */}
              <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors shadow-sm">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                Unggah File (PNG/JPG/PDF)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,.pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tanda tangan akan disisipkan langsung ke dokumen PDF & SPK/SPH</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={!hasDrawn}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-md transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              Terapkan Tanda Tangan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
