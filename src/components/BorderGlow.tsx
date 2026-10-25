import React, { useState, useRef, useCallback } from 'react';

export type GlowColor =
  | 'cyan'
  | 'teal'
  | 'emerald'
  | 'blue'
  | 'rose'
  | 'amber'
  | 'purple'
  | 'slate';

export interface BorderGlowProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  glowColor?: GlowColor;
  borderRadius?: string; // Tailwind class e.g. 'rounded-md', 'rounded-lg', 'rounded-xl'
  intensity?: 'subtle' | 'medium' | 'strong';
  interactive?: boolean;
  animated?: boolean;
  active?: boolean;
  id?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

interface ColorPalette {
  spotlight: string;
  secondary: string;
  ambient: string;
  ambientGradient: string;
  bloom: string;
}

const COLOR_MAP: Record<GlowColor, ColorPalette> = {
  cyan: {
    spotlight: 'rgba(34, 211, 238, 0.85)',
    secondary: 'rgba(45, 212, 191, 0.45)',
    ambient: 'rgba(6, 182, 212, 0.25)',
    ambientGradient:
      'linear-gradient(135deg, rgba(34, 211, 238, 0.4) 0%, rgba(6, 182, 212, 0.18) 45%, rgba(59, 130, 246, 0.25) 100%)',
    bloom: 'from-cyan-500/25 via-teal-500/15 to-blue-600/15'
  },
  teal: {
    spotlight: 'rgba(45, 212, 191, 0.85)',
    secondary: 'rgba(20, 184, 166, 0.5)',
    ambient: 'rgba(13, 148, 136, 0.25)',
    ambientGradient:
      'linear-gradient(135deg, rgba(45, 212, 191, 0.45) 0%, rgba(20, 184, 166, 0.2) 45%, rgba(16, 185, 129, 0.25) 100%)',
    bloom: 'from-teal-500/25 via-emerald-500/15 to-cyan-500/15'
  },
  emerald: {
    spotlight: 'rgba(52, 211, 153, 0.85)',
    secondary: 'rgba(16, 185, 129, 0.5)',
    ambient: 'rgba(5, 150, 105, 0.25)',
    ambientGradient:
      'linear-gradient(135deg, rgba(52, 211, 153, 0.4) 0%, rgba(16, 185, 129, 0.2) 45%, rgba(45, 212, 191, 0.25) 100%)',
    bloom: 'from-emerald-500/25 via-teal-500/15 to-cyan-500/15'
  },
  blue: {
    spotlight: 'rgba(96, 165, 250, 0.85)',
    secondary: 'rgba(59, 130, 246, 0.45)',
    ambient: 'rgba(37, 99, 235, 0.25)',
    ambientGradient:
      'linear-gradient(135deg, rgba(96, 165, 250, 0.4) 0%, rgba(37, 99, 235, 0.2) 45%, rgba(6, 182, 212, 0.25) 100%)',
    bloom: 'from-blue-500/25 via-cyan-500/15 to-indigo-600/15'
  },
  rose: {
    spotlight: 'rgba(251, 113, 133, 0.9)',
    secondary: 'rgba(244, 63, 94, 0.5)',
    ambient: 'rgba(225, 29, 72, 0.3)',
    ambientGradient:
      'linear-gradient(135deg, rgba(251, 113, 133, 0.45) 0%, rgba(225, 29, 72, 0.22) 45%, rgba(245, 158, 11, 0.2) 100%)',
    bloom: 'from-rose-500/25 via-red-500/15 to-amber-500/15'
  },
  amber: {
    spotlight: 'rgba(251, 191, 36, 0.9)',
    secondary: 'rgba(245, 158, 11, 0.5)',
    ambient: 'rgba(217, 119, 6, 0.3)',
    ambientGradient:
      'linear-gradient(135deg, rgba(251, 191, 36, 0.45) 0%, rgba(245, 158, 11, 0.22) 45%, rgba(234, 88, 12, 0.2) 100%)',
    bloom: 'from-amber-500/25 via-orange-500/15 to-yellow-500/15'
  },
  purple: {
    spotlight: 'rgba(192, 132, 252, 0.85)',
    secondary: 'rgba(168, 85, 247, 0.45)',
    ambient: 'rgba(147, 51, 234, 0.25)',
    ambientGradient:
      'linear-gradient(135deg, rgba(192, 132, 252, 0.4) 0%, rgba(147, 51, 234, 0.2) 45%, rgba(6, 182, 212, 0.2) 100%)',
    bloom: 'from-purple-500/25 via-violet-500/15 to-cyan-500/15'
  },
  slate: {
    spotlight: 'rgba(148, 163, 184, 0.65)',
    secondary: 'rgba(100, 116, 139, 0.35)',
    ambient: 'rgba(71, 85, 105, 0.2)',
    ambientGradient:
      'linear-gradient(135deg, rgba(148, 163, 184, 0.35) 0%, rgba(71, 85, 105, 0.15) 45%, rgba(51, 65, 85, 0.2) 100%)',
    bloom: 'from-slate-500/15 via-slate-600/10 to-slate-700/10'
  }
};

export const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  className = '',
  containerClassName = '',
  glowColor = 'cyan',
  borderRadius = 'rounded-md',
  intensity = 'medium',
  interactive = true,
  animated = false,
  active = false,
  id,
  onClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    },
    [interactive]
  );

  const handleMouseEnter = useCallback(() => {
    if (interactive) setIsHovered(true);
  }, [interactive]);

  const handleMouseLeave = useCallback(() => {
    if (interactive) {
      setIsHovered(false);
      setMousePos({ x: -1000, y: -1000 });
    }
  }, [interactive]);

  const colorPalette = COLOR_MAP[glowColor] || COLOR_MAP.cyan;

  // Intensity multipliers
  const opacityMultiplier =
    intensity === 'subtle' ? 0.65 : intensity === 'strong' ? 1.3 : 1.0;

  const spotlightBackground = isHovered
    ? `radial-gradient(360px circle at ${mousePos.x}px ${mousePos.y}px, ${colorPalette.spotlight}, ${colorPalette.secondary} 40%, ${colorPalette.ambient} 85%)`
    : active
    ? `linear-gradient(135deg, ${colorPalette.spotlight}, ${colorPalette.secondary}, ${colorPalette.ambient})`
    : colorPalette.ambientGradient;

  return (
    <div
      ref={containerRef}
      id={id}
      className={`relative group ${borderRadius} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* 1. Atmospheric Diffuse Ambient Bloom behind the container */}
      <div
        className={`pointer-events-none absolute -inset-0.5 ${borderRadius} bg-gradient-to-r ${colorPalette.bloom} blur-xl transition-opacity duration-500 -z-10 ${
          active
            ? 'opacity-80'
            : isHovered
            ? 'opacity-55'
            : animated
            ? 'opacity-30 animate-pulse'
            : 'opacity-20'
        }`}
        style={{
          opacity: (active ? 0.8 : isHovered ? 0.55 : animated ? 0.3 : 0.2) * opacityMultiplier
        }}
      />

      {/* 2. Precision Luminous 1px Perimeter Border Glow (using pure CSS Content-Box Masking) */}
      <div
        className={`pointer-events-none absolute inset-0 ${borderRadius} transition-opacity duration-300 z-10`}
        style={{
          padding: '1px',
          background: spotlightBackground,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          opacity: (active ? 1.0 : isHovered ? 1.0 : 0.65) * opacityMultiplier
        }}
      />

      {/* 3. Wrapped Content Container */}
      <div className={`relative z-0 h-full w-full ${borderRadius} ${containerClassName}`}>
        {children}
      </div>
    </div>
  );
};
