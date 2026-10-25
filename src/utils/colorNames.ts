/**
 * Human-readable color name resolver based on CIELAB Delta-E distance
 */
import { calculateDeltaE, hexToRgb } from '../services/deterministicEngine';

const NAMED_PALETTE: Array<{ name: string; hex: string }> = [
  { name: 'Pure Black', hex: '#000000' },
  { name: 'Charcoal Slate', hex: '#1E293B' },
  { name: 'Deep Midnight Navy', hex: '#0F172A' },
  { name: 'Steel Slate', hex: '#475569' },
  { name: 'Cool Gray', hex: '#94A3B8' },
  { name: 'Light Silver', hex: '#E2E8F0' },
  { name: 'Pure White', hex: '#FFFFFF' },
  
  { name: 'Electric Indigo', hex: '#6366F1' },
  { name: 'Royal Indigo', hex: '#4F46E5' },
  { name: 'Deep Violet', hex: '#7C3AED' },
  { name: 'Vibrant Purple', hex: '#9333EA' },
  { name: 'Neon Cyan', hex: '#06B6D4' },
  { name: 'Sky Blue', hex: '#0EA5E9' },
  { name: 'Cobalt Blue', hex: '#2563EB' },
  { name: 'Deep Azure', hex: '#1D4ED8' },
  { name: 'Teal Emerald', hex: '#14B8A6' },
  { name: 'Vibrant Emerald', hex: '#10B981' },
  { name: 'Forest Green', hex: '#059669' },
  { name: 'Lime Green', hex: '#84CC16' },
  
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Warm Orange', hex: '#F97316' },
  { name: 'Crimson Red', hex: '#EF4444' },
  { name: 'Deep Burgundy', hex: '#991B1B' },
  { name: 'Rose Pink', hex: '#F43F5E' },
  { name: 'Hot Magenta', hex: '#D946EF' }
];

export function getNearestColorName(hex: string): string {
  let minDeltaE = 999;
  let closestName = 'Custom Shade';

  for (const item of NAMED_PALETTE) {
    const dE = calculateDeltaE(hex, item.hex);
    if (dE < minDeltaE) {
      minDeltaE = dE;
      closestName = item.name;
    }
  }

  return closestName;
}
