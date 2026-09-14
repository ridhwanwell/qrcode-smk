import React from 'react';
import { 
  Activity, 
  FileText, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Layers,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SphQuotation, CalibrationSchedule } from '../types';

export type CoreSlideTab = 'dashboard' | 'sph' | 'schedules';

interface CoreWorkflowSliderProps {
  currentTab: 'dashboard' | 'sph' | 'schedules' | 'reminders' | 'calibrators' | 'financial' | 'masters';
  onSelectTab: (tab: 'dashboard' | 'sph' | 'schedules') => void;
  sphList: SphQuotation[];
  schedules: CalibrationSchedule[];
  slideDirection?: number;
}

interface SlideInfo {
  id: CoreSlideTab;
  index: number;
  title: string;
  badge: string;
  subtitle: string;
  icon: React.ElementType;
  colorScheme: {
    activeBg: string;
    activeBorder: string;
    textAccent: string;
    glow: string;
    iconBg: string;
  };
  metrics: {
    label1: string;
    val1: string | number;
    label2: string;
    val2: string | number;
  };
}

export const CoreWorkflowSlider: React.FC<CoreWorkflowSliderProps> = ({
  currentTab,
  onSelectTab,
  sphList,
  schedules
}) => {
  // Check if currentTab is one of the 3 primary core slides
  const isCoreTab = currentTab === 'dashboard' || currentTab === 'sph' || currentTab === 'schedules';
  const activeSlide: CoreSlideTab = isCoreTab ? (currentTab as CoreSlideTab) : 'dashboard';

  // Stats calculation
  const totalSphDeal = sphList.filter(s => s.status === 'Disetujui (Deal)').length;
  const activeSchedulesCount = schedules.filter(s => s.status !== 'Selesai Kalibrasi' && s.status !== 'Dibatalkan').length;

  const slides: SlideInfo[] = [
    {
      id: 'dashboard',
      index: 1,
      title: 'Dashboard Utama',
      badge: 'Tahap 1 • Ikhtisar',
      subtitle: 'Monitoring Keuangan, Alat & Kalender Kalibrasi',
      icon: Activity,
      colorScheme: {
        activeBg: 'from-teal-900/40 via-slate-900 to-slate-950',
        activeBorder: 'border-teal-500/50',
        textAccent: 'text-teal-300',
        glow: 'bg-teal-500/20',
        iconBg: 'bg-teal-500/10 text-teal-400 border-teal-500/30'
      },
      metrics: {
        label1: 'Jadwal Aktif',
        val1: `${activeSchedulesCount} RS`,
        label2: 'Aset Likuid',
        val2: 'Rp 632 Jt'
      }
    },
    {
      id: 'sph',
      index: 2,
      title: 'Penawaran SPH',
      badge: 'Tahap 2 • Proposal & Nego',
      subtitle: 'Katalog 121 Brosur, Simulasi Deal PPN 11% & Cetak 3 Hal',
      icon: FileText,
      colorScheme: {
        activeBg: 'from-cyan-900/40 via-slate-900 to-slate-950',
        activeBorder: 'border-cyan-500/50',
        textAccent: 'text-cyan-300',
        glow: 'bg-cyan-500/20',
        iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
      },
      metrics: {
        label1: 'Total SPH',
        val1: `${sphList.length} Dokumen`,
        label2: 'Deal Disetujui',
        val2: `${totalSphDeal} RS`
      }
    },
    {
      id: 'schedules',
      index: 3,
      title: 'Penjadwalan RS',
      badge: 'Tahap 3 • Eksekusi Lapangan',
      subtitle: 'Surat Perintah Kerja (SPK), BAP, BASTP & Teknisi STR',
      icon: Calendar,
      colorScheme: {
        activeBg: 'from-emerald-900/40 via-slate-900 to-slate-950',
        activeBorder: 'border-emerald-500/50',
        textAccent: 'text-emerald-300',
        glow: 'bg-emerald-500/20',
        iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      },
      metrics: {
        label1: 'Penugasan SPK',
        val1: `${schedules.length} RS`,
        label2: 'Regulasi',
        val2: 'Permenkes 54'
      }
    }
  ];

  const currentSlideIndex = slides.findIndex(s => s.id === activeSlide);

  const handlePrevSlide = () => {
    const prevIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
    onSelectTab(slides[prevIndex].id);
  };

  const handleNextSlide = () => {
    const nextIndex = (currentSlideIndex + 1) % slides.length;
    onSelectTab(slides[nextIndex].id);
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 sm:p-4 mb-6 shadow-xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-80 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mt-10" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        
        {/* Header Title with Step Flow */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400 shadow-inner">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Alur Kerja Kalibrasi RS (Slide Navigator)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                Slide {currentSlideIndex + 1} dari 3
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
              Pilih slide untuk berpindah antara Dashboard, Penawaran SPH, dan Penjadwalan RS tanpa bertumpuk.
            </p>
          </div>
        </div>

        {/* Slide Step Arrow Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={handlePrevSlide}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-all flex items-center gap-1 shadow-sm"
            title="Pindah ke slide sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {/* Slide Progress Indicator Dots */}
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-950/80 rounded-xl border border-slate-800">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => onSelectTab(s.id)}
                className={`transition-all rounded-full ${
                  idx === currentSlideIndex 
                    ? 'w-6 h-2 bg-teal-400 shadow-sm shadow-teal-500/50' 
                    : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'
                }`}
                title={`Buka Slide ${idx + 1}: ${s.title}`}
              />
            ))}
          </div>

          <button
            onClick={handleNextSlide}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1 shadow-sm shadow-teal-900/30"
            title="Pindah ke slide berikutnya"
          >
            <span className="hidden sm:inline">Selanjutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Core Slides Interactive Grid / Carousel Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
        {slides.map((slide) => {
          const isSelected = activeSlide === slide.id && isCoreTab;
          const Icon = slide.icon;

          return (
            <div
              key={slide.id}
              onClick={() => onSelectTab(slide.id)}
              className={`relative cursor-pointer rounded-xl p-3.5 transition-all select-none border group overflow-hidden ${
                isSelected
                  ? `bg-gradient-to-b ${slide.colorScheme.activeBg} ${slide.colorScheme.activeBorder} shadow-lg ring-1 ring-teal-500/30`
                  : 'bg-slate-950/50 hover:bg-slate-800/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Active Slide Indicator Bar */}
              {isSelected && (
                <motion.div 
                  layoutId="activeSlideIndicator" 
                  className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400"
                />
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${isSelected ? slide.colorScheme.iconBg : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                        {slide.title}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center text-[10px] text-teal-300 bg-teal-500/20 px-1.5 py-0.2 rounded-full font-medium">
                          Aktif
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block line-clamp-1 mt-0.5">
                      {slide.subtitle}
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-slate-900/90 text-teal-300 border border-teal-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}>
                  0{slide.index}
                </span>
              </div>

              {/* Quick Metrics Inside Slide Card */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/60 text-[11px]">
                <div className="bg-slate-950/60 rounded-lg px-2.5 py-1 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">{slide.metrics.label1}</span>
                  <span className={`font-mono font-semibold ${isSelected ? slide.colorScheme.textAccent : 'text-slate-300'}`}>
                    {slide.metrics.val1}
                  </span>
                </div>
                <div className="bg-slate-950/60 rounded-lg px-2.5 py-1 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">{slide.metrics.label2}</span>
                  <span className={`font-mono font-semibold ${isSelected ? slide.colorScheme.textAccent : 'text-slate-300'}`}>
                    {slide.metrics.val2}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
