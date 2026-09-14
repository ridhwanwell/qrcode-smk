import React from 'react';

interface KanLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const KanLogo: React.FC<KanLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: { scale: 0.8, textKan: 'text-xs', textSub: 'text-[7.5px]', textCode: 'text-[9px]' },
    md: { scale: 1, textKan: 'text-sm', textSub: 'text-[9px]', textCode: 'text-[11px]' },
    lg: { scale: 1.25, textKan: 'text-base', textSub: 'text-[10.5px]', textCode: 'text-[13px]' }
  };

  const config = sizeMap[size];

  return (
    <div className={`flex flex-col items-center select-none text-center ${className}`} id="kan-accreditation-badge">
      {/* KAN Symbol & Name */}
      <div className="flex items-center justify-center gap-1.5">
        {/* KAN Red Checkmark / Tick */}
        <svg 
          viewBox="0 0 24 24" 
          className="w-5 h-5 block shrink-0" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stylized Red V / Checkmark */}
          <path 
            d="M 2 12 L 8 22 L 22 3 L 18 1 L 8 16 L 5 10 Z" 
            fill="#d90429" 
          />
        </svg>

        {/* KAN Bold Wordmark */}
        <span className="font-black text-xl sm:text-2xl tracking-tighter text-[#0b4d9c] leading-none font-sans">
          KAN
        </span>
      </div>

      {/* Subtitle 1: Komite Akreditasi Nasional */}
      <p className={`font-semibold tracking-tight text-slate-900 leading-tight mt-0.5 whitespace-nowrap ${config.textSub}`}>
        Komite Akreditasi Nasional
      </p>

      {/* Subtitle 2: LK-532-IDN */}
      <p className={`font-black tracking-wider text-slate-950 leading-tight mt-0.5 ${config.textCode}`}>
        LK-532-IDN
      </p>
    </div>
  );
};
