import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

interface CompanyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  variant?: 'light' | 'dark';
  allowUpload?: boolean;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  variant = 'dark',
  allowUpload = false
}) => {
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom logo from localStorage and Supabase settings table
  useEffect(() => {
    try {
      const saved = localStorage.getItem('smk_custom_logo_data');
      if (saved) {
        setCustomLogoUrl(saved);
      }
    } catch {
      // Ignore storage errors
    }

    // Try fetching synced branding logo from Supabase settings
    const fetchCloudLogo = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'branding')
          .maybeSingle();

        if (data && data.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (parsed?.logoDataUrl) {
            setCustomLogoUrl(parsed.logoDataUrl);
            try {
              localStorage.setItem('smk_custom_logo_data', parsed.logoDataUrl);
            } catch {
              // Ignore localStorage quota
            }
          }
        }
      } catch {
        // Silently fallback
      }
    };
    fetchCloudLogo();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'smk_custom_logo_data') {
        setCustomLogoUrl(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file logo terlalu besar. Harap unggah file di bawah 2MB (disarankan format PNG atau SVG).');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCustomLogoUrl(result);
          try {
            localStorage.setItem('smk_custom_logo_data', result);
          } catch {
            // LocalStorage might be full
          }

          // Persist to Supabase settings so all users and devices see it
          try {
            await supabase.from('settings').upsert({
              key: 'branding',
              value: JSON.stringify({
                logoDataUrl: result,
                updatedAt: new Date().toISOString()
              }),
              updated_at: new Date().toISOString()
            });
          } catch (err) {
            console.warn('Could not sync logo to Supabase:', err);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const sizeMap = {
    sm: { height: 38, width: 72, titleSize: 'text-sm sm:text-base', subSize: 'text-[10px]' },
    md: { height: 48, width: 92, titleSize: 'text-base sm:text-lg', subSize: 'text-xs' },
    lg: { height: 64, width: 122, titleSize: 'text-lg sm:text-xl', subSize: 'text-sm' },
    xl: { height: 86, width: 164, titleSize: 'text-xl sm:text-2xl', subSize: 'text-base' }
  };

  const currentSize = sizeMap[size];
  const defaultVectorLogo = '/smk-logo.webp';
  const logoSource = customLogoUrl || defaultVectorLogo;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} id="company-logo-brand">
      {/* Hidden file input for uploading custom PNG/SVG */}
      {allowUpload && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/png, image/jpeg, image/svg+xml, image/webp"
          className="hidden"
        />
      )}

      {/* Official SMK Logo Graphic */}
      <div 
        className={`relative flex items-center justify-center shrink-0 ${allowUpload ? 'cursor-pointer hover:opacity-90 group' : ''}`}
        style={{ height: `${currentSize.height}px` }}
        onClick={() => allowUpload && fileInputRef.current?.click()}
        title={allowUpload ? 'Klik untuk mengganti / upload logo resmi (PNG/SVG/JPG)' : 'PT. Sarana Multi Kalibrasi'}
      >
        <img
          src={logoSource}
          alt="PT. Sarana Multi Kalibrasi"
          className="h-full w-auto object-contain drop-shadow-sm transition-transform duration-150"
          referrerPolicy="no-referrer"
          onError={(e) => {
            if (e.currentTarget.src !== window.location.origin + defaultVectorLogo) {
              e.currentTarget.src = defaultVectorLogo;
            }
          }}
        />
        {allowUpload && (
          <span className="absolute -bottom-1 -right-1 bg-[#1C658C] text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-sans">
            Ganti
          </span>
        )}
      </div>

      {/* Typography: PT. SARANA MULTI KALIBRASI */}
      {showSubtitle && (
        <div className="flex flex-col justify-center text-left">
          <h2 className={`font-black tracking-tight leading-none uppercase ${
            variant === 'light' ? 'text-slate-950 font-extrabold' : 'text-white font-extrabold'
          } ${currentSize.titleSize}`}>
            PT. SARANA MULTI KALIBRASI
          </h2>
          <p className={`font-bold tracking-wide mt-1 leading-tight ${
            variant === 'light' ? 'text-slate-800' : 'text-cyan-400'
          } ${currentSize.subSize}`}>
            Laboratorium Uji dan Kalibrasi Alat Kesehatan
          </p>
          <span className={`text-[10px] tracking-normal font-medium mt-0.5 ${
            variant === 'light' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Sertifikat Standar Kemenkes RI No: 26062301565850001 • LK-532-IDN
          </span>
        </div>
      )}
    </div>
  );
};
