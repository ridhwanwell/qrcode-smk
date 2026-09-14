import React, { useState, useEffect } from 'react';
import AdminLabels from '../pages/AdminLabels';
import AdminGenerate from '../pages/AdminGenerate';
import AdminTemplates from '../pages/AdminTemplates';
import AdminDashboard from '../pages/AdminDashboard';
import { Tags, FilePlus2, Palette, BarChart3, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const LabelModuleView: React.FC = () => {
  const [subTab, setSubTab] = useState<'labels' | 'generate' | 'templates' | 'dashboard'>('labels');
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; count: number }>({ connected: true, count: 0 });

  useEffect(() => {
    const checkCount = async () => {
      try {
        const { count, error } = await supabase
          .from('labels')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          setDbStatus({ connected: true, count });
        }
      } catch (err) {
        console.warn('Supabase label check:', err);
      }
    };
    checkCount();
  }, []);

  return (
    <div className="space-y-4">
      {/* Sub Navigation Bar for Label Module */}
      <div className="bg-white rounded-2xl p-2 sm:p-3 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <button
            onClick={() => setSubTab('labels')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'labels'
                ? 'bg-[#1C658C] text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>Daftar Label & Cetak</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {dbStatus.count}
            </span>
          </button>

          <button
            onClick={() => setSubTab('generate')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'generate'
                ? 'bg-[#1C658C] text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Buat / Generate Nomor Label</span>
          </button>

          <button
            onClick={() => setSubTab('templates')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'templates'
                ? 'bg-[#1C658C] text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Desain Template Stiker</span>
          </button>

          <button
            onClick={() => setSubTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'dashboard'
                ? 'bg-[#1C658C] text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Statistik & Sinkronisasi</span>
          </button>
        </div>

        {/* Database Supabase Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs">
          <Database className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span className="font-semibold">Supabase PostgreSQL:</span>
          <span className="font-mono font-bold bg-emerald-100/80 px-2 py-0.5 rounded text-emerald-900">
            {dbStatus.count} Label Terhubung
          </span>
        </div>
      </div>

      {/* Main SubTab Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 min-h-[600px]">
        {subTab === 'labels' && <AdminLabels />}
        {subTab === 'generate' && <AdminGenerate />}
        {subTab === 'templates' && <AdminTemplates />}
        {subTab === 'dashboard' && <AdminDashboard />}
      </div>
    </div>
  );
};
