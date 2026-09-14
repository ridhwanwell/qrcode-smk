import React, { useState } from 'react';
import { uploadFile } from '../lib/storageHelper';
import { UploadCloud, FileText, CheckCircle2, Loader2, X, Eye, Trash2, Image as ImageIcon, Link as LinkIcon, ExternalLink } from 'lucide-react';

interface PdfUploaderProps {
  folder: string;
  documentId: string;
  existingPdfUrl?: string;
  onUploadSuccess: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  acceptTypes?: string;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ 
  folder, 
  documentId, 
  existingPdfUrl, 
  onUploadSuccess,
  onRemove,
  label = "Dokumen Scan / Lampiran PDF / Link Google Drive",
  acceptTypes = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'drive'>('upload');
  const [uploading, setUploading] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size limit check (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setError('Ukuran file maksimal 15MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const folderPath = `${folder}/${documentId}`;
      const url = await uploadFile(file, folderPath);
      onUploadSuccess(url);
    } catch (err) {
      console.error('Error uploading document file:', err);
      setError('Gagal mengunggah file. Silakan coba file lain atau gunakan opsi Link Google Drive.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleApplyDriveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUrlInput.trim()) {
      setError('Masukkan tautan Google Drive / Cloud terlebih dahulu');
      return;
    }

    let formattedUrl = driveUrlInput.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    onUploadSuccess(formattedUrl);
    setDriveUrlInput('');
    setError(null);
  };

  const isImage = existingPdfUrl?.startsWith('data:image/') || 
    existingPdfUrl?.match(/\.(jpeg|jpg|png|gif|webp)$/i);

  const isDriveOrCloudLink = existingPdfUrl?.startsWith('http://') || existingPdfUrl?.startsWith('https://');

  return (
    <div className="mt-2 p-3 border border-slate-700/80 rounded-xl bg-slate-900/90 flex flex-col items-start w-full text-xs text-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-1.5 font-bold text-cyan-300">
          {isDriveOrCloudLink ? (
            <LinkIcon className="w-4 h-4 text-amber-400" />
          ) : isImage ? (
            <ImageIcon className="w-4 h-4 text-cyan-400" />
          ) : (
            <FileText className="w-4 h-4 text-cyan-400" />
          )}
          <span>{label}</span>
        </div>

        {existingPdfUrl && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1 rounded-md transition-all flex items-center gap-1 text-[11px]"
            title="Hapus file / tautan"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>
        )}
      </div>

      {/* If File/Link already attached */}
      {existingPdfUrl ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate max-w-[180px] sm:max-w-xs">
              <span className="text-xs font-semibold text-emerald-300 block truncate">
                {isDriveOrCloudLink ? 'Tautan Google Drive / Cloud Terhubung' : 'Dokumen / Scan Terlampir'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                {isDriveOrCloudLink ? existingPdfUrl : 'Format siap cetak / buka'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a 
              href={existingPdfUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            >
              {isDriveOrCloudLink ? <ExternalLink className="w-3.5 h-3.5 text-amber-300" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isDriveOrCloudLink ? 'Buka Google Drive' : 'Buka File'}</span>
            </a>

            <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-all">
              <span>Ganti</span>
              <input 
                type="file" 
                accept={acceptTypes} 
                className="hidden" 
                onChange={handleFileChange} 
                disabled={uploading} 
              />
            </label>
          </div>
        </div>
      ) : (
        /* Input Selection: Upload File vs Google Drive Link */
        <div className="w-full space-y-2">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => { setActiveTab('upload'); setError(null); }}
              className={`flex-1 py-1 px-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'upload' 
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/50 shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Unggah File / Scan</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('drive'); setError(null); }}
              className={`flex-1 py-1 px-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'drive' 
                  ? 'bg-amber-950 text-amber-300 border border-amber-700/50 shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Link Google Drive / Cloud</span>
            </button>
          </div>

          {activeTab === 'upload' ? (
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-xl cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-colors relative">
              <input 
                type="file" 
                accept={acceptTypes} 
                className="hidden" 
                onChange={handleFileChange} 
                disabled={uploading} 
              />
              {uploading ? (
                <div className="flex flex-col items-center text-cyan-400">
                  <Loader2 className="w-5 h-5 animate-spin mb-1" />
                  <span className="text-xs font-medium">Mengunggah file ke server...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <UploadCloud className="w-5 h-5 mb-1 text-cyan-400" />
                  <span className="text-xs font-medium text-slate-300">Klik untuk upload SPH / Kop Surat / BAP / BASTP</span>
                  <span className="text-[10px] text-slate-500">(PDF, JPG, PNG, DOCX, XLSX - Maks 15MB)</span>
                </div>
              )}
            </label>
          ) : (
            <form onSubmit={handleApplyDriveUrl} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 text-amber-400 absolute left-2.5 top-2.5" />
                <input
                  type="url"
                  value={driveUrlInput}
                  onChange={(e) => setDriveUrlInput(e.target.value)}
                  placeholder="Tempel link Google Drive (misal: https://drive.google.com/file/d/.../view)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all shrink-0"
              >
                <span>Gunakan Link</span>
              </button>
            </form>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-rose-400 text-xs font-medium">
          <X className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};
