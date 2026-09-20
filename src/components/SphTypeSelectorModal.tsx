import React from 'react';
import { X, Sparkles, ShoppingCart, FileText, CheckCircle2, ArrowRight, ShieldCheck, Globe } from 'lucide-react';

interface SphTypeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'non_ecatalogue' | 'ecatalogue') => void;
}

export const SphTypeSelectorModal: React.FC<SphTypeSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectType
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1C658C] to-[#144966] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#398AB9]/30 text-white text-xs px-2.5 py-0.5 rounded-full font-mono border border-white/20 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-300" />
              Langkah 1: Pilih Jenis SPH
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Pembuatan Surat Penawaran Harga Baru
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-1">
            Pilih metode dan acuan tarif penawaran yang sesuai dengan pengadaan rumah sakit / klinik:
          </p>
        </div>

        {/* Selection Cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* OPTION 1: Non E-Catalogue */}
          <div 
            onClick={() => onSelectType('non_ecatalogue')}
            className="group cursor-pointer bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-[#1C658C] rounded-2xl p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#1C658C]/10 text-slate-700 group-hover:text-[#1C658C] flex items-center justify-center transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Standar Reguler
                </span>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#1C658C] transition-colors mt-0.5">
                  Non E-Catalogue
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Penawaran harga standar berbasis <strong>Katalog Tarif Brosur Resmi (121 Alat Medis)</strong> dengan opsi negosiasi tarif bebas.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Katalog Brosur 121 Alat</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Surat Pengantar & Rincian Harga</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Perhitungan PPN 11% Otomatis</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-5 w-full py-2.5 px-4 bg-slate-100 group-hover:bg-[#1C658C] text-slate-800 group-hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <span>Pilih Non E-Catalogue</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* OPTION 2: E-Catalogue */}
          <div 
            onClick={() => onSelectType('ecatalogue')}
            className="group cursor-pointer bg-gradient-to-b from-blue-50/50 to-white hover:from-blue-50/80 border-2 border-blue-200 hover:border-[#1C658C] rounded-2xl p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between relative overflow-hidden ring-2 ring-[#398AB9]/20"
          >
            <div className="absolute top-3 right-3">
              <span className="bg-[#1C658C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                Inaproc LKPP
              </span>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-[#1C658C] text-[#1C658C] group-hover:text-white flex items-center justify-center transition-colors">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C658C] font-mono">
                  Pengadaan Pemerintah
                </span>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#1C658C] transition-colors mt-0.5">
                  E-Catalogue
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Penawaran harga resmi terhubung dengan <strong>139 Item E-Katalog LKPP Inaproc PT. Sarana Multi Kalibrasi</strong>.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-blue-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Harga Standar E-Katalog Resmi</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Ekstraksi Nama Alat Otomatis</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Otomatis Lembar Lampiran Link E-Catalogue (1 File PDF)</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-5 w-full py-2.5 px-4 bg-[#398AB9] group-hover:bg-[#1C658C] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Pilih E-Catalogue</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            PT. Sarana Multi Kalibrasi • Akreditasi KAN LK-532-IDN
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-semibold"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
