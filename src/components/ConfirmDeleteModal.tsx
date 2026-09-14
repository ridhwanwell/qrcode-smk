import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  itemName,
  confirmText = 'Ya, Hapus Sekarang',
  cancelText = 'Batal',
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#D8D2CB] rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-800 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-[#EEEEEE] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">Konfirmasi tindakan penghapusan data</p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
          {itemName && (
            <div className="p-2.5 bg-[#EEEEEE]/60 border border-[#D8D2CB] rounded-xl text-xs font-mono text-rose-700 font-semibold break-all">
              {itemName}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#D8D2CB]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#EEEEEE] hover:bg-[#D8D2CB]/50 text-slate-700 border border-[#D8D2CB] rounded-xl text-xs font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
