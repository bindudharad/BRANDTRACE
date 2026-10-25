import React, { useEffect, useState } from 'react';
import { getScoreColor } from '../services/scoringEngine';
import { BorderGlow, GlowColor } from './BorderGlow';

interface ScoreGaugeProps {
  score: number;
  label: string;
  mathSymbol: string;
  description: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  label,
  mathSymbol,
  description,
  size = 'md',
  showPercentage = true
}) => {
  const [displayScore, setDisplayScore] = useState<number>(0);
  const colorInfo = getScoreColor(score);

  // Animated rolling counter effect
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 800; // ms
    const target = score;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(easedProgress * target * 10) / 10);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [score]);

  const radius = size === 'lg' ? 44 : size === 'md' ? 36 : 28;
  const strokeWidth = size === 'lg' ? 6 : size === 'md' ? 5 : 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2 + 8;

  const glowColor: GlowColor =
    score >= 85 ? 'emerald' : score >= 60 ? 'teal' : score >= 40 ? 'amber' : 'rose';

  return (
    <BorderGlow
      borderRadius="rounded-2xl"
      glowColor={glowColor}
      intensity="subtle"
      className="h-full w-full"
    >
      <div className="flex flex-col items-center justify-center p-4 rounded-2xl neo-liquid-card border border-cyan-500/20 bg-[#030818]/70 backdrop-blur-md relative overflow-hidden group h-full">
        {/* Gauge Ring */}
      <div className="relative flex items-center justify-center p-1.5 rounded-full bg-[#030818]">
        <svg
          width={svgSize}
          height={svgSize}
          className="transform -rotate-90 transition-all duration-700 ease-out"
        >
          {/* Background Track */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Fill */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke={colorInfo.hex}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Rolling Counter Number */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={`font-mono font-bold tracking-tight text-white ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-base'}`}>
            {displayScore.toFixed(displayScore % 1 === 0 ? 0 : 1)}
            {showPercentage && <span className="text-xs text-slate-400 ml-0.5">%</span>}
          </span>
          {mathSymbol && (
            <span className="text-[10px] font-mono text-cyan-400 -mt-0.5 font-medium tracking-wide">
              {mathSymbol}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 text-center px-1 w-full">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider font-lexend">{label}</div>
        <div className="text-[11px] text-slate-400 leading-snug mt-0.5 font-sans">{description}</div>
      </div>
    </div>
    </BorderGlow>
  );
};
