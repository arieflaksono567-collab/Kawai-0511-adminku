import React from 'react';

export const KawaiMascot: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* SVG Mascot Graphic */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg viewBox="0 0 160 170" className="w-full h-full drop-shadow-sm" fill="none">
          {/* Shadow underneath */}
          <ellipse cx="80" cy="162" rx="42" ry="7" fill="#E2E8F0" />

          {/* Monkey Feet / Shoes */}
          <ellipse cx="62" cy="154" rx="14" ry="7" fill="#78350F" />
          <ellipse cx="98" cy="154" rx="14" ry="7" fill="#78350F" />
          
          {/* Monkey Legs */}
          <rect x="58" y="132" width="10" height="22" rx="5" fill="#9C5B42" />
          <rect x="92" y="132" width="10" height="22" rx="5" fill="#9C5B42" />

          {/* Left Arm (Relaxed) */}
          <path
            d="M48 98 Q36 112 40 128"
            stroke="#9C5B42"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="40" cy="130" r="7" fill="#FDE6D2" />

          {/* Right Arm (Thumbs Up Gesture) */}
          <path
            d="M112 98 Q128 106 126 84"
            stroke="#9C5B42"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
          />
          {/* Fist with Thumb Up */}
          <circle cx="126" cy="80" r="8" fill="#FDE6D2" />
          {/* Thumb */}
          <path
            d="M127 80 L127 68"
            stroke="#FDE6D2"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Body / Torso with Red Shirt */}
          <path
            d="M52 92 C50 128, 110 128, 108 92 C108 84, 52 84, 52 92 Z"
            fill="#DC2626"
          />
          
          {/* White 'K' on Red Shirt */}
          <text
            x="80"
            y="114"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="20"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            K
          </text>

          {/* Monkey Ears */}
          <circle cx="34" cy="46" r="18" fill="#9C5B42" />
          <circle cx="34" cy="46" r="10" fill="#FCE7D6" />

          <circle cx="126" cy="46" r="18" fill="#9C5B42" />
          <circle cx="126" cy="46" r="10" fill="#FCE7D6" />

          {/* Head Base */}
          <circle cx="80" cy="48" r="38" fill="#9C5B42" />

          {/* Face Mask (Peach) */}
          <path
            d="M54 38 C54 24, 68 28, 80 34 C92 28, 106 24, 106 38 C106 58, 98 72, 80 72 C62 72, 54 58, 54 38 Z"
            fill="#FDE6D2"
          />

          {/* Eyes */}
          <ellipse cx="69" cy="44" rx="5" ry="7.5" fill="#1E293B" />
          <circle cx="70.5" cy="41" r="2.2" fill="#FFFFFF" />

          <ellipse cx="91" cy="44" rx="5" ry="7.5" fill="#1E293B" />
          <circle cx="92.5" cy="41" r="2.2" fill="#FFFFFF" />

          {/* Nose */}
          <ellipse cx="80" cy="52" rx="3.5" ry="2.2" fill="#78350F" />

          {/* Cheerful Smile */}
          <path
            d="M71 58 Q80 68 89 58"
            stroke="#78350F"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Rosy Cheeks */}
          <ellipse cx="60" cy="52" rx="4.5" ry="3" fill="#FDA4AF" opacity="0.8" />
          <ellipse cx="100" cy="52" rx="4.5" ry="3" fill="#FDA4AF" opacity="0.8" />

          {/* Little hair tuft on top */}
          <path
            d="M78 12 Q80 4 84 8"
            stroke="#9C5B42"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Slogan Text Card */}
      <div className="mt-2 text-center px-3 py-1.5 rounded-xl bg-slate-50/80 border border-slate-100 max-w-[210px]">
        <p className="text-[11px] italic font-medium text-slate-500 leading-snug">
          &ldquo;Bersama KAWAI 0511 lebih dekat, lebih cepat, lebih mudah.&rdquo;
        </p>
      </div>
    </div>
  );
};
