import React, { useRef, useState, useEffect } from 'react';
import { Pipette, CheckCircle, AlertTriangle, Eye, Sparkles, Layers, Info } from 'lucide-react';
import { BrandDNAProfile, ExtractedColorCluster } from '../../types/brandDna';
import { calculateDeltaE, sampleImageColors } from '../../services/deterministicEngine';
import { getNearestColorName } from '../../utils/colorNames';

interface CanvasColorInspectorProps {
  imageDataUrl: string;
  activeBrandDNA: BrandDNAProfile;
  colorClusters?: ExtractedColorCluster[];
}

export const CanvasColorInspector: React.FC<CanvasColorInspectorProps> = ({
  imageDataUrl,
  activeBrandDNA,
  colorClusters: initialClusters
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverColor, setHoverColor] = useState<{
    hex: string;
    r: number;
    g: number;
    b: number;
    x: number;
    y: number;
    colorName: string;
    coveragePct: number;
    deltaE: number;
    nearestBrandHex: string;
    isCompliant: boolean;
  } | null>(null);

  const [clusters, setClusters] = useState<ExtractedColorCluster[]>(initialClusters || []);
  const [isHovering, setIsHovering] = useState(false);

  // Extract color clusters if not provided
  useEffect(() => {
    if (imageDataUrl && (!initialClusters || initialClusters.length === 0)) {
      sampleImageColors(imageDataUrl, activeBrandDNA).then((c) => {
        // Attach color names to clusters
        const namedClusters = c.map((cluster) => ({
          ...cluster,
          name: getNearestColorName(cluster.hex)
        }));
        setClusters(namedClusters);
      });
    } else if (initialClusters) {
      const namedClusters = initialClusters.map((cluster) => ({
        ...cluster,
        name: cluster.name || getNearestColorName(cluster.hex)
      }));
      setClusters(namedClusters);
    }
  }, [imageDataUrl, activeBrandDNA, initialClusters]);

  // Render image onto canvas
  useEffect(() => {
    if (!imageDataUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageDataUrl;
    img.onload = () => {
      // Fit to container while maintaining aspect ratio
      const containerWidth = canvas.parentElement?.clientWidth || 400;
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const displayWidth = Math.min(containerWidth, 500);
      const displayHeight = displayWidth * aspectRatio;

      canvas.width = displayWidth;
      canvas.height = displayHeight;
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
    };
  }, [imageDataUrl]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
      setHoverColor(null);
      return;
    }

    try {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const r = pixel[0];
      const g = pixel[1];
      const b = pixel[2];
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();

      const approvedPalette = [
        ...(activeBrandDNA.colors?.primaryHex || []),
        ...(activeBrandDNA.colors?.secondaryHex || [])
      ];

      let minDeltaE = 100;
      let nearestBrandHex = approvedPalette[0] || '#000000';

      approvedPalette.forEach((brandHex) => {
        const dE = calculateDeltaE(hex, brandHex);
        if (dE < minDeltaE) {
          minDeltaE = dE;
          nearestBrandHex = brandHex;
        }
      });

      // Find closest cluster to estimate coverage percentage
      let closestClusterPct = 5;
      let minClusterDist = 999;
      clusters.forEach((c) => {
        const dist = calculateDeltaE(hex, c.hex);
        if (dist < minClusterDist) {
          minClusterDist = dist;
          closestClusterPct = c.percentage;
        }
      });

      const colorName = getNearestColorName(hex);
      const strict = activeBrandDNA.colors?.strictCompliance ?? false;
      const tolerance = strict ? 10.0 : 16.0;

      setHoverColor({
        hex,
        r,
        g,
        b,
        x,
        y,
        colorName,
        coveragePct: closestClusterPct,
        deltaE: Math.round(minDeltaE * 10) / 10,
        nearestBrandHex,
        isCompliant: minDeltaE <= tolerance
      });
      setIsHovering(true);
    } catch {
      // canvas read error
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setHoverColor(null);
  };

  return (
    <div className="space-y-4">
      {/* Visual Canvas Container with Interactive Loupe */}
      <div className="relative rounded-2xl overflow-hidden bg-[#030818]/60 border border-cyan-500/20 flex flex-col items-center justify-center p-4 group">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={handleMouseLeave}
          className="rounded-xl max-w-full cursor-crosshair border border-cyan-500/30 shadow-md"
        />

        {/* Magnified Eyedropper Loupe */}
        {isHovering && hoverColor && (
          <div
            className="pointer-events-none absolute z-30 transform -translate-x-1/2 -translate-y-full mb-2 flex flex-col items-center bg-[#030818]/95 border border-cyan-500/40 backdrop-blur-md p-3.5 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-transform min-w-[200px]"
            style={{
              left: `${Math.min(Math.max(hoverColor.x + 12, 100), (canvasRef.current?.width || 400) - 100)}px`,
              top: `${Math.max(hoverColor.y - 12, 60)}px`
            }}
          >
            {/* Color Swatch & Color Name */}
            <div className="flex items-center gap-2.5 mb-2 w-full justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-md border border-white/20 shadow-sm flex-shrink-0"
                  style={{ backgroundColor: hoverColor.hex }}
                />
                <div>
                  <div className="font-semibold text-xs text-white leading-tight font-mono">{hoverColor.colorName}</div>
                  <div className="font-mono text-[10px] text-cyan-300">{hoverColor.hex}</div>
                </div>
              </div>

              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                hoverColor.isCompliant
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {hoverColor.isCompliant ? 'On-Brand' : 'Drift'}
              </span>
            </div>

            {/* Diagnostic metrics */}
            <div className="text-[11px] text-slate-300 w-full space-y-1 pt-2 border-t border-cyan-500/20">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-mono text-[10px]">Coverage:</span>
                <span className="font-mono font-medium text-white text-[11px]">~{hoverColor.coveragePct}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-mono text-[10px]">Distance:</span>
                <span className={`font-mono font-medium text-[11px] ${hoverColor.isCompliant ? 'text-teal-300' : 'text-rose-400'}`}>
                  ΔE {hoverColor.deltaE}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-mono">Nearest Hex:</span>
                <span className="font-mono text-cyan-300">{hoverColor.nearestBrandHex}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 text-center text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
          <Pipette className="w-3.5 h-3.5 text-cyan-400" />
          <span>Hover to inspect exact color, coverage %, and brand ΔE variance.</span>
        </div>
      </div>

      {/* Extracted Dominant Color Clusters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Dominant Palette Clusters &amp; Delta-E</span>
          <span className="text-[10px] text-slate-400 font-mono">Local Sampling</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {clusters.map((cluster, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border bg-[#030818]/60 transition-all ${
                cluster.isCompliant
                  ? 'border-cyan-500/20 hover:border-teal-500/40'
                  : 'border-cyan-500/20 hover:border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm flex-shrink-0"
                    style={{ backgroundColor: cluster.hex }}
                  />
                  <div className="truncate">
                    <div className="text-[11px] font-semibold text-white truncate font-mono">{cluster.name || getNearestColorName(cluster.hex)}</div>
                    <div className="text-[10px] font-mono text-cyan-300">{cluster.hex}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-0.5 text-[10px] pt-1.5 border-t border-cyan-500/20 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Coverage:</span>
                  <span className="text-white">{cluster.percentage}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Delta-E:</span>
                  <span className={cluster.isCompliant ? 'text-teal-300' : 'text-rose-400'}>
                    ΔE {cluster.deltaE}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
