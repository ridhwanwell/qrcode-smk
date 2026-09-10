import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection as firestoreCollection, query as firestoreQuery, orderBy as firestoreOrderBy, onSnapshot as firestoreOnSnapshot } from 'firebase/firestore';
import { FileText, Clock, CheckCircle2, Tags } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function AdminDashboard() {
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = firestoreQuery(firestoreCollection(db, 'labels'), firestoreOrderBy('createdAt', 'desc'));
    
    const unsubscribe = firestoreOnSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLabels(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'labels');
    });

    return () => unsubscribe();
  }, []);

  const total = labels.length;
  const menunggu = labels.filter(l => l.status === 'Menunggu Sertifikat').length;
  const tertaut = labels.filter(l => l.status === 'Sertifikat Tertaut').length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Ringkasan Sistem</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Label Dibuat</p>
            <h3 className="text-3xl font-bold text-slate-900">{loading ? '-' : total}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Tags className="w-6 h-6 text-slate-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Menunggu Sertifikat</p>
            <h3 className="text-3xl font-bold text-slate-900">{loading ? '-' : menunggu}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Sertifikat Tertaut</p>
            <h3 className="text-3xl font-bold text-slate-900">{loading ? '-' : tertaut}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Recent Labels Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Label Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">No Label</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tanggal Dibuat</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Memuat data...</td>
                </tr>
              ) : labels.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Belum ada label.</td>
                </tr>
              ) : (
                labels.slice(0, 10).map((label) => (
                  <tr key={label.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{label.noLabel}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        label.status === 'Sertifikat Tertaut' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {label.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {label.createdAt ? format(label.createdAt.toDate(), 'dd MMM yyyy, HH:mm', { locale: id }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <a href={`/sertifikat/${label.noLabel}`} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 font-medium text-sm">
                         Lihat Publik
                       </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
