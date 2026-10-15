import React from 'react';

interface KawaiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const KawaiLogo: React.FC<KawaiLogoProps> = ({ className = '', size = 'md' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Red Circular Badge with Kawai Monkey Emblem */}
      <div className="relative shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-red-500 to-rose-600 p-[2px] shadow-sm flex items-center justify-center">
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5">
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            {/* Monkey Head Base */}
            <circle cx="50" cy="50" r="46" fill="#DC2626" />
            
            {/* Inner Ring */}
            <circle cx="50" cy="50" r="43" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
            
            {/* Monkey Face Base */}
            {/* Outer Ears */}
            <circle cx="20" cy="46" r="14" fill="#9C5B42" />
            <circle cx="80" cy="46" r="14" fill="#9C5B42" />
            {/* Inner Ears */}
            <circle cx="20" cy="46" r="8" fill="#FCE7D6" />
            <circle cx="80" cy="46" r="8" fill="#FCE7D6" />
            
            {/* Head Round */}
            <circle cx="50" cy="48" r="28" fill="#9C5B42" />
            
            {/* Peach Face Mask */}
            <path
              d="M32 40 C32 30, 42 32, 50 36 C58 32, 68 30, 68 40 C68 54, 62 64, 50 64 C38 64, 32 54, 32 40 Z"
              fill="#FDE6D2"
            />
            
            {/* Cheerful Eyes */}
            <ellipse cx="42" cy="43" rx="4.5" ry="6" fill="#1E293B" />
            <circle cx="43.5" cy="41" r="1.8" fill="#FFFFFF" />
            <ellipse cx="58" cy="43" rx="4.5" ry="6" fill="#1E293B" />
            <circle cx="59.5" cy="41" r="1.8" fill="#FFFFFF" />
            
            {/* Sweet Nose */}
            <ellipse cx="50" cy="50" rx="3" ry="2" fill="#78350F" />
            
            {/* Cute Smile */}
            <path
              d="M43 54 Q50 61 57 54"
              stroke="#78350F"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Rosy Cheeks */}
            <circle cx="36" cy="49" r="3.5" fill="#FDA4AF" opacity="0.8" />
            <circle cx="64" cy="49" r="3.5" fill="#FDA4AF" opacity="0.8" />
            
            {/* Small red cap or shirt collar with 'K' */}
            <path d="M38 64 L62 64 L58 75 L42 75 Z" fill="#DC2626" />
            <text
              x="50"
              y="72"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="8"
              fontWeight="900"
              fontFamily="sans-serif"
            >
              K
            </text>
          </svg>
        </div>
      </div>

      {/* Typography: KAWAI 0511 + Subtitle */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-black text-xl tracking-tight text-red-600 font-sans">
            KAWAI
          </span>
          <span className="font-extrabold text-xl tracking-tight text-red-600 font-sans">
            0511
          </span>
        </div>
        <span className="text-[10px] font-medium text-slate-400 tracking-wider mt-1">
          Transport • Courier • Logistics
        </span>
      </div>
    </div>
  );
};
