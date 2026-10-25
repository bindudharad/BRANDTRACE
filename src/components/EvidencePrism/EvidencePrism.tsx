import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface NodeConfig {
  color: number;
  radius: number;
  speed: number;
  inclination: number;
  phase: number;
  label: string;
}

const NODE_CONFIGS: NodeConfig[] = [
  { color: 0x2dd4bf, radius: 2.2, speed: 0.4, inclination: 0.3, phase: 0, label: 'Verified Source' },
  { color: 0xf87171, radius: 2.6, speed: 0.28, inclination: -0.5, phase: Math.PI * 0.7, label: 'Contradicted' },
  { color: 0xfbbf24, radius: 2.0, speed: 0.55, inclination: 0.8, phase: Math.PI * 1.3, label: 'Needs Review' },
  { color: 0x4ade80, radius: 2.8, speed: 0.35, inclination: -0.2, phase: Math.PI * 0.4, label: 'Approved' },
  { color: 0x67e8f9, radius: 2.4, speed: 0.22, inclination: 0.6, phase: Math.PI * 1.8, label: 'Evidence Link' },
];

export interface EvidencePrismProps {
  className?: string;
  height?: number | string;
  interactive?: boolean;
}

export const EvidencePrism: React.FC<EvidencePrismProps> = ({
  className = '',
  height = 500,
  interactive = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Renderer ---
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setWebglFailed(true);
      return;
    }

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;
    renderer.setPixelRatio(dpr);

    const initialHeight = typeof height === 'number' ? height : el.clientHeight || 500;
    renderer.setSize(el.clientWidth, initialHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    el.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / initialHeight, 0.1, 100);
    camera.position.set(0, 0, 5.8);

    // --- Lights ---
    const ambLight = new THREE.AmbientLight(0x0c1e2e, 1.2);
    scene.add(ambLight);

    const lightTeal = new THREE.PointLight(0x2dd4bf, 3.5, 14);
    lightTeal.position.set(3.2, 2.4, 3.0);
    scene.add(lightTeal);

    const lightCyan = new THREE.PointLight(0x38bdf8, 2.5, 12);
    lightCyan.position.set(-3.2, -1.8, 2.2);
    scene.add(lightCyan);

    const lightWarm = new THREE.PointLight(0xfbbf24, 1.8, 10);
    lightWarm.position.set(0, 3.5, -2.5);
    scene.add(lightWarm);

    // --- Central Evidence Prism (Icosahedron with crystalline translucency) ---
    const prismGeo = new THREE.IcosahedronGeometry(1.2, 1);
    const prismMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f766e,
      emissive: 0x042f2e,
      emissiveIntensity: 0.4,
      metalness: 0.15,
      roughness: 0.08,
      transmission: 0.65,
      thickness: 1.8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const prism = new THREE.Mesh(prismGeo, prismMat);

    // Wireframe overlay for architectural / blueprint feel
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const wireOverlay = new THREE.Mesh(new THREE.IcosahedronGeometry(1.22, 1), wireMat);

    // Inner core sphere representing ground truth
    const coreGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);

    const prismGroup = new THREE.Group();
    prismGroup.add(prism);
    prismGroup.add(wireOverlay);
    prismGroup.add(coreMesh);
    scene.add(prismGroup);

    // --- Orbiting Nodes & Connection Lines ---
    const nodeObjects: Array<{ mesh: THREE.Mesh; config: NodeConfig; line: THREE.Line }> = [];
    const disposables: Array<THREE.BufferGeometry | THREE.Material> = [
      prismGeo,
      prismMat,
      wireMat,
      wireOverlay.geometry,
      coreGeo,
      coreMat,
    ];

    NODE_CONFIGS.forEach((cfg) => {
      const geo = new THREE.SphereGeometry(0.09, 12, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.8,
        metalness: 0.3,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      // Connection dynamic line
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.45,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);

      disposables.push(geo, mat, lineGeo, lineMat);
      nodeObjects.push({ mesh, config: cfg, line });
    });

    // --- Atmospheric Ambient Particles ---
    const particleCount = 180;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 3.2 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x5eead4,
      size: 0.035,
      transparent: true,
      opacity: 0.5,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    disposables.push(particleGeo, particleMat);

    // --- Mouse Parallax Interaction ---
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      mouse.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.45;
      mouse.targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.35;
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // --- Resize Handler ---
    const handleResize = () => {
      if (!el) return;
      const w = el.clientWidth;
      const h = typeof height === 'number' ? height : el.clientHeight || 500;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- Visibility Lifecycle ---
    let isHidden = false;
    const handleVisibility = () => {
      isHidden = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // --- Animation Loop ---
    let t = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      if (isHidden || prefersReducedMotion) {
        renderer.render(scene, camera);
        return;
      }

      t += 0.009;

      // Smooth parallax easing
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // Floating prism rotation
      prismGroup.rotation.y = t * 0.32 + mouse.x;
      prismGroup.rotation.x = Math.sin(t * 0.22) * 0.16 - mouse.y * 0.6;
      prismGroup.rotation.z = Math.sin(t * 0.18) * 0.08;
      prismGroup.position.y = Math.sin(t * 0.55) * 0.12;

      // Pulse the central ground-truth core
      const coreScale = 1 + Math.sin(t * 2.0) * 0.08;
      coreMesh.scale.set(coreScale, coreScale, coreScale);

      // Orbiting evidence nodes & connecting data lines
      nodeObjects.forEach(({ mesh, config, line }) => {
        const angle = t * config.speed + config.phase;
        const nx = Math.cos(angle) * config.radius;
        const ny = Math.sin(angle * 0.75 + config.inclination) * (config.radius * 0.5);
        const nz = Math.sin(angle) * (config.radius * 0.6);
        mesh.position.set(nx, ny, nz);

        // Update connection line coordinates
        const positions = line.geometry.attributes.position.array as Float32Array;
        positions[0] = 0;
        positions[1] = prismGroup.position.y;
        positions[2] = 0;
        positions[3] = nx;
        positions[4] = ny;
        positions[5] = nz;
        line.geometry.attributes.position.needsUpdate = true;
      });

      // Subtle particle cloud drift
      particles.rotation.y += 0.0006;
      particles.rotation.x += 0.0003;

      // Orbit the teal accent light
      lightTeal.position.x = Math.cos(t * 0.35) * 4.2;
      lightTeal.position.z = Math.sin(t * 0.35) * 3.5;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      disposables.forEach((d) => d.dispose());
      nodeObjects.forEach(({ line }) => {
        line.geometry.dispose();
      });
      renderer.dispose();
      if (el.contains(canvas)) el.removeChild(canvas);
    };
  }, [height, interactive]);

  if (webglFailed) {
    return (
      <div
        className={className}
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, #0d2033 0%, #04080f 75%)',
          borderRadius: '16px',
          border: '1px solid #1a3045',
        }}
      >
        <div style={{ textAlign: 'center', color: '#2dd4bf', padding: '24px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>◈</div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.06em' }}>BRANDTRACE EVIDENCE PRISM</div>
          <div style={{ fontSize: 12, color: '#8da4bc', marginTop: 4 }}>WebGL acceleration active / Fallback surface</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
      }}
      aria-hidden="true"
    />
  );
};

export default EvidencePrism;
