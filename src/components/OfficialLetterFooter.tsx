import React from 'react';

interface OfficialLetterFooterProps {
  className?: string;
}

export const OfficialLetterFooter: React.FC<OfficialLetterFooterProps> = ({ className = '' }) => {
  return (
    <div className={`w-full border-t border-black pt-2 text-[10.5px] sm:text-[11px] text-slate-900 leading-tight select-none ${className}`} id="official-kop-surat-footer">
      <div className="grid grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* Column 1: Alamat (5 cols) */}
        <div className="col-span-5 space-y-0.5">
          <p className="font-bold text-slate-950 text-[11px]">Alamat:</p>
          <p className="text-slate-900 leading-snug">
            Jl. Kenari 3 No. A3, Ngipang RT 005/ RW 017,<br />
            Kadipiro, Banjarsari, Kota Surakarta, Jawa Tengah,<br />
            Indonesia
          </p>
        </div>

        {/* Column 2: No. Telephone & HOTLINE (4 cols) */}
        <div className="col-span-4 space-y-0.5">
          <p className="font-bold text-slate-950 text-[11px]">No. Telephone & HOTLINE:</p>
          <div className="space-y-0.5 text-slate-900">
            <div className="grid grid-cols-[80px_1fr] items-baseline">
              <span className="text-slate-800">Telephone :</span>
              <span className="font-medium text-slate-950">(0271) 2023035</span>
            </div>
            <div className="grid grid-cols-[80px_1fr] items-baseline">
              <span className="text-slate-800">WhatsApp :</span>
              <span className="font-medium text-slate-950">(0851) 1234570</span>
            </div>
          </div>
        </div>

        {/* Column 3: E-mail : (3 cols) */}
        <div className="col-span-3 space-y-0.5">
          <p className="font-bold text-slate-950 text-[11px]">E-mail :</p>
          <div className="space-y-0.5 text-slate-900 break-all text-[11px]">
            <p className="text-slate-950">ptsaranamultikalibrasi@gmail.com</p>
            <p className="text-slate-950">aptsaranamultikalibrasi@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};
