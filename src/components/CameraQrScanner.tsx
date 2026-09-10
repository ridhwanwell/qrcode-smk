import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, Upload, AlertCircle } from 'lucide-react';
import { cleanLabelString } from '../lib/labelParser';

interface CameraQrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedLabel: string) => void;
}

export default function CameraQrScanner({ isOpen, onClose, onScanSuccess }: CameraQrScannerProps) {
  const [scannerError, setScannerError] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elementId = 'camera-qr-reader-container';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setScannerError('');
        setIsScanning(true);

        // Allow DOM element to mount
        await new Promise((res) => setTimeout(res, 150));

        if (!isMounted) return;

        const html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            const parsed = cleanLabelString(decodedText);
            if (parsed) {
              stopScanner();
              onScanSuccess(parsed);
            }
          },
          () => {
            // Frame scan callback (silent)
          }
        );
      } catch (err: any) {
        console.error('Camera scan start error:', err);
        if (isMounted) {
          setScannerError(
            err?.message?.includes('NotAllowedError') || err?.name === 'NotAllowedError'
              ? 'Izin kamera ditolak. Silakan aktifkan izin kamera pada browser Anda atau unggah foto QR code.'
              : 'Tidak dapat mengakses kamera. Anda dapat memilih foto QR code dari galeri.'
          );
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerError('');
      const html5QrCode = new Html5Qrcode('camera-qr-file-scan-temp', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      const decodedText = await html5QrCode.scanFile(file, true);
      const parsed = cleanLabelString(decodedText);

      if (parsed) {
        onScanSuccess(parsed);
      } else {
        setScannerError('QR Code tidak mengandung nomor label kalibrasi yang valid.');
      }
    } catch (err) {
      setScannerError('Gagal membaca QR Code dari file foto. Pastikan gambar QR Code terlihat jelas dan tajam.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">Pindai QR Code Label</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-950 text-white relative min-h-[300px]">
          <div
            id={elementId}
            className="w-full max-w-[320px] rounded-xl overflow-hidden shadow-inner bg-black"
          ></div>
          <div id="camera-qr-file-scan-temp" className="hidden"></div>

          {scannerError ? (
            <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
              <p className="text-xs text-slate-300 leading-relaxed mb-4">{scannerError}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-xl shadow transition-colors flex items-center"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Pilih Foto QR dari Galeri
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 text-center mt-3">
              Arahkan kamera ke QR Code pada stiker fisik label kalibrasi
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition-colors flex items-center justify-center"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Upload Foto QR
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
