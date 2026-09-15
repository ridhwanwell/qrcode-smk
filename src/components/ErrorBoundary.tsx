import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  private handleResetCache = () => {
    try {
      // Clear specific smk portal cache items
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('smk_supa_') || key.startsWith('smk_cached_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Terjadi Kendala Memuat Aplikasi
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Sistem mendeteksi adanya kendala saat merender komponen antarmuka. Anda dapat menyegarkan halaman atau mereset data lokal agar kembali normal.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-[#1C658C] hover:bg-[#144966] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Halaman</span>
              </button>
              <button
                onClick={this.handleResetCache}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border border-slate-300 cursor-pointer"
              >
                <Database className="w-4 h-4 text-slate-500" />
                <span>Reset Cache Lokal</span>
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 font-mono overflow-auto max-h-48">
                <summary className="font-bold cursor-pointer text-slate-700 mb-2">
                  Detail Teknis (Klik untuk melihat)
                </summary>
                <p className="text-rose-600 font-bold mb-1">{this.state.error.toString()}</p>
                <pre className="text-[11px] whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return (this.props as any)?.children ?? null;
  }
}
