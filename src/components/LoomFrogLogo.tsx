import React from 'react';

interface LoomFrogLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

/**
 * Pixel-perfect SVG Vector reproduction of the custom LoomFrog neon emblem.
 * Features:
 * - Precise geometric head with prominent circular eye domes & pupil dots
 * - Continuous wide cheek curves & rounded jawline
 * - Dual symmetrically crouching flipper legs with flat foot pads
 * - Multilayer neon-glow filter with cyan & electric-blue bloom
 */
export const LoomFrogIcon: React.FC<{
  className?: string;
  size?: number;
  glow?: boolean;
}> = ({
  className = '',
  size = 40,
  glow = true
}) => {
  const strokeColor = '#00F0FF';
  const glowColor = '#00D8F6';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none transition-all duration-300 ${className}`}
      style={{
        filter: glow
          ? `drop-shadow(0 0 4px ${strokeColor}) drop-shadow(0 0 12px ${glowColor}99) drop-shadow(0 0 24px #06b6d440)`
          : undefined
      }}
    >
      <defs>
        <filter id="frog-neon-bloom" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="neon-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38E1FF" />
          <stop offset="50%" stopColor="#00F0FF" />
          <stop offset="100%" stopColor="#00C4EE" />
        </linearGradient>
      </defs>

      <g filter="url(#frog-neon-bloom)">
        {/* =========================================================
            1. FROG HEAD & JAW OUTLINE (Single smooth continuous path)
            ========================================================= */}
        {/* Head silhouette with two eye bulges and curved smiling jaw */}
        <path
          d="
            M 64 34
            C 70 32, 90 32, 96 34
            C 100 24, 114 24, 117 35
            C 119 43, 115 50, 110 54
            C 120 62, 122 75, 112 85
            C 96 95, 64 95, 48 85
            C 38 75, 40 62, 50 54
            C 45 50, 41 43, 43 35
            C 46 24, 60 24, 64 34
            Z
          "
          stroke="url(#neon-cyan-grad)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* =========================================================
            2. PUPIL DOTS (Centered inside eye domes)
            ========================================================= */}
        <circle cx="53" cy="38" r="4.2" fill="#00F0FF" />
        <circle cx="107" cy="38" r="4.2" fill="#00F0FF" />

        {/* =========================================================
            3. LEFT CROUCHING LEG & FOOT PAD
            ========================================================= */}
        {/* Outer thigh loop to flat foot resting on base */}
        <path
          d="
            M 44 68
            C 32 68, 22 74, 23 88
            C 24 96, 20 102, 16 106
            C 14 108, 16 110, 20 110
            L 48 110
            C 56 110, 52 98, 43 90
            C 40 86, 38 80, 42 75
          "
          stroke="url(#neon-cyan-grad)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* =========================================================
            4. RIGHT CROUCHING LEG & FOOT PAD (Symmetrical)
            ========================================================= */}
        {/* Outer thigh loop to flat foot resting on base */}
        <path
          d="
            M 116 68
            C 128 68, 138 74, 137 88
            C 136 96, 140 102, 144 106
            C 146 108, 144 110, 140 110
            L 112 110
            C 104 110, 108 98, 117 90
            C 120 86, 122 80, 118 75
          "
          stroke="url(#neon-cyan-grad)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
};

export const LoomFrogLogo: React.FC<LoomFrogLogoProps> = ({
  className = '',
  iconOnly = false,
  size = 'md',
  showSubtitle = true,
  glow = true,
  onClick
}) => {
  const sizeMap = {
    sm: { iconSize: 34, textClass: 'text-lg', subClass: 'text-[9.5px]', gap: 'gap-2.5' },
    md: { iconSize: 44, textClass: 'text-2xl', subClass: 'text-[11px]', gap: 'gap-3' },
    lg: { iconSize: 58, textClass: 'text-3xl', subClass: 'text-xs', gap: 'gap-3.5' },
    xl: { iconSize: 84, textClass: 'text-5xl', subClass: 'text-sm', gap: 'gap-5' }
  };

  const config = sizeMap[size];

  if (iconOnly) {
    return (
      <div onClick={onClick} className={`inline-flex items-center justify-center ${className}`}>
        <LoomFrogIcon size={config.iconSize} glow={glow} />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${config.gap} group select-none cursor-pointer ${className}`}
    >
      {/* Neon Frog Icon */}
      <div className="relative flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
        <LoomFrogIcon size={config.iconSize} glow={glow} />
      </div>

      {/* Typography: "LoomFrog" matching exact clean white geometric font */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center tracking-tight leading-none">
          <span className={`font-lexend font-bold ${config.textClass} text-white tracking-[-0.02em]`}>
            LoomFrog
          </span>
        </div>
        {showSubtitle && (
          <span className={`${config.subClass} font-semibold text-[#00F0FF] tracking-wide mt-1 leading-tight`}>
            Brand DNA &amp; Tone Consistency
          </span>
        )}
      </div>
    </div>
  );
};
