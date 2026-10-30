import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Play,
  Pause,
  Compass,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
  CheckCircle,
} from 'lucide-react';

export interface OrbitNodeData {
  id: number;
  title: string;
  badge: string;
  desc: string;
  status: string;
  color: string;
  hexColor: number;
  iconName?: string;
}

export const ORBIT_NODES: OrbitNodeData[] = [
  {
    id: 1,
    title: 'Brand Constitution',
    badge: 'NORMATIVE RULES',
    desc: 'Structured repository of active brand terminology, prohibited phrases, required disclaimers, and voice rules with exact source citations.',
    status: 'Active',
    color: '#00E6A0',
    hexColor: 0x00E6A0,
  },
  {
    id: 2,
    title: 'Claim Ledger',
    badge: 'TIME-AWARE FACTS',
    desc: 'Verified factual claims ledger with validity timestamps, expiry tracking, 30-day proactive alerts, and operational notes.',
    status: 'Active',
    color: '#00C8F0',
    hexColor: 0x00C8F0,
  },
  {
    id: 3,
    title: 'Visual Compliance',
    badge: 'PALETTE & ASSETS',
    desc: 'Pillow CIELAB Delta-E (CIE76) color distance, WCAG 2.1 relative luminance on known token pairs, and exact SHA-256 asset catalog matching.',
    status: 'Verified (R3)',
    color: '#8467FF',
    hexColor: 0x8467FF,
  },
  {
    id: 4,
    title: 'Content Analysis',
    badge: 'MULTI-FORMAT INGEST',
    desc: 'Deterministic exact-span regex matching across plain copy, Markdown, and digital PDF text layers. Source-grounded rule evaluation.',
    status: 'Active',
    color: '#00E6A0',
    hexColor: 0x00E6A0,
  },
  {
    id: 5,
    title: 'Human Review & Gate',
    badge: 'SERVER APPROVAL GATE',
    desc: 'Server-enforced approval gate (HTTP 409) blocking sign-off until all high-risk findings are resolved with documented dispositions.',
    status: 'Enforced',
    color: '#FFB84D',
    hexColor: 0xFFB84D,
  },
  {
    id: 6,
    title: 'Audit & Impact Tracking',
    badge: 'DEPENDENCY MAPPING',
    desc: 'Append-only audit ledger and dynamic impact map that identifies historical drafts affected by changed or expired facts.',
    status: 'Active (R3)',
    color: '#20DDA4',
    hexColor: 0x20DDA4,
  },
];

interface EvidenceCore3DProps {
  onSelectNode: (nodeId: number) => void;
  selectedNodeId: number | null;
  onEnterWorkspace?: () => void;
}

export const EvidenceCore3D: React.FC<EvidenceCore3DProps> = ({
  onSelectNode,
  selectedNodeId,
  onEnterWorkspace,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [hoveredNode, setHoveredNode] = useState<OrbitNodeData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // References to preserve state across animate loop
  const isRotatingRef = useRef(true);
  isRotatingRef.current = isRotating;

  const selectedNodeIdRef = useRef<number | null>(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;

  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;

  // Scene state refs for interaction
  const sceneStateRef = useRef<{
    resetCamera: () => void;
    selectOrbitIndex: (idx: number) => void;
  } | null>(null);

  useEffect(() => {
    // 1. Check WebGL support
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) {
      setWebglSupported(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    // 2. Setup Three.js Scene, Camera, Renderer
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.2, 11.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting System
    const ambientLight = new THREE.AmbientLight(0x0a1420, 2.5);
    scene.add(ambientLight);

    const centerLight = new THREE.PointLight(0x00e6a0, 3, 20);
    centerLight.position.set(0, 0, 0);
    scene.add(centerLight);

    const keyLight = new THREE.DirectionalLight(0x00c8f0, 2.5);
    keyLight.position.set(6, 8, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x8467ff, 2.0);
    rimLight.position.set(-6, -4, -4);
    scene.add(rimLight);

    // 4. Central Evidence Intelligence Core (Glass & Wireframe)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Outer geometric facet body
    const coreGeo = new THREE.IcosahedronGeometry(1.7, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x071b14,
      emissive: 0x00e6a0,
      emissiveIntensity: 0.28,
      metalness: 0.5,
      roughness: 0.18,
      transparent: true,
      opacity: 0.88,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);

    // Wireframe halo lattice
    const wireGeo = new THREE.IcosahedronGeometry(1.78, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00e6a0,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    coreGroup.add(wireMesh);

    // Inner pulsing core nucleus
    const innerGeo = new THREE.OctahedronGeometry(0.9, 0);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x00c8f0,
      emissive: 0x00c8f0,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerMesh);

    // Orbital Rings
    const orbitRadius = 4.3;
    const ringGeo = new THREE.TorusGeometry(orbitRadius, 0.02, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e6a0,
      transparent: true,
      opacity: 0.22,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo, ringMat);
    ringMesh1.rotation.x = Math.PI * 0.35;
    scene.add(ringMesh1);

    const ringMesh2 = new THREE.Mesh(ringGeo, ringMat.clone());
    ringMesh2.rotation.x = -Math.PI * 0.35;
    ringMesh2.rotation.y = Math.PI * 0.2;
    scene.add(ringMesh2);

    // 5. Six Orbiting Module Satellites
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const satelliteMeshes: {
      mesh: THREE.Group;
      data: OrbitNodeData;
      haloMesh: THREE.Mesh;
      basePos: THREE.Vector3;
    }[] = [];

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00e6a0,
      transparent: true,
      opacity: 0.25,
    });

    ORBIT_NODES.forEach((node, i) => {
      const angle = (i / ORBIT_NODES.length) * Math.PI * 2;
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius * 0.65;
      const y = Math.sin(angle * 2) * 0.9;

      const satGroup = new THREE.Group();
      satGroup.position.set(x, y, z);
      satGroup.userData = { nodeId: node.id, nodeData: node };

      // Satellite sphere
      const sphereGeo = new THREE.SphereGeometry(0.48, 32, 32);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x0b1723,
        emissive: node.hexColor,
        emissiveIntensity: 0.55,
        roughness: 0.25,
        metalness: 0.4,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      satGroup.add(sphere);

      // Orbiting halo ring
      const haloGeo = new THREE.TorusGeometry(0.7, 0.025, 16, 48);
      const haloMat = new THREE.MeshBasicMaterial({
        color: node.hexColor,
        transparent: true,
        opacity: 0.6,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI * 0.4;
      satGroup.add(halo);

      orbitGroup.add(satGroup);
      satelliteMeshes.push({
        mesh: satGroup,
        data: node,
        haloMesh: halo,
        basePos: new THREE.Vector3(x, y, z),
      });

      // Connecting energy line from center to satellite
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(x, y, z),
      ]);
      const line = new THREE.Line(lineGeo, lineMaterial);
      orbitGroup.add(line);
    });

    // 6. Atmospheric Stardust Particles
    const particleCount = 300;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 22;
      particlePositions[i + 1] = (Math.random() - 0.5) * 16;
      particlePositions[i + 2] = (Math.random() - 0.5) * 18;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00e6a0,
      size: 0.05,
      transparent: true,
      opacity: 0.45,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 7. Raycasting & Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);

    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;

    const onPointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        targetRotationY += deltaX * 0.005;
        targetRotationX += deltaY * 0.003;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }

      // Check raycast for hover
      raycaster.setFromCamera(mouse, camera);
      const allObjects: THREE.Object3D[] = [];
      satelliteMeshes.forEach((s) => allObjects.push(s.mesh));
      allObjects.push(coreMesh);

      const intersects = raycaster.intersectObjects(allObjects, true);
      if (intersects.length > 0) {
        let foundNode: OrbitNodeData | null = null;
        let curr: THREE.Object3D | null = intersects[0].object;
        while (curr && curr !== scene) {
          if (curr.userData && curr.userData.nodeData) {
            foundNode = curr.userData.nodeData;
            break;
          }
          if (curr === coreMesh) {
            foundNode = {
              id: 0,
              title: 'BRANDTRACE Core',
              badge: 'CENTRAL GOVERNANCE ENGINE',
              desc: 'Deterministic pattern matching, fact integrity, server approval gate, and immutable audit persistence.',
              status: 'Active',
              color: '#00E6A0',
              hexColor: 0x00e6a0,
            };
            break;
          }
          curr = curr.parent;
        }

        if (foundNode) {
          container.style.cursor = 'pointer';
          setHoveredNode(foundNode);
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        } else {
          container.style.cursor = 'default';
          setHoveredNode(null);
          setTooltipPos(null);
        }
      } else {
        container.style.cursor = 'default';
        setHoveredNode(null);
        setTooltipPos(null);
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const allObjects: THREE.Object3D[] = [];
      satelliteMeshes.forEach((s) => allObjects.push(s.mesh));
      allObjects.push(coreMesh);

      const intersects = raycaster.intersectObjects(allObjects, true);
      if (intersects.length > 0) {
        let curr: THREE.Object3D | null = intersects[0].object;
        while (curr && curr !== scene) {
          if (curr.userData && curr.userData.nodeId !== undefined) {
            onSelectNodeRef.current(curr.userData.nodeId);
            return;
          }
          if (curr === coreMesh) {
            onSelectNodeRef.current(0);
            return;
          }
          curr = curr.parent;
        }
      }
    };

    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    container.addEventListener('click', onClick);

    // Save controller functions for toolbar
    sceneStateRef.current = {
      resetCamera: () => {
        targetRotationX = 0;
        targetRotationY = 0;
        orbitGroup.rotation.set(0, 0, 0);
        camera.position.set(0, 2.2, 11.5);
      },
      selectOrbitIndex: (idx: number) => {
        const sat = satelliteMeshes[idx];
        if (sat) {
          onSelectNodeRef.current(sat.data.id);
        }
      },
    };

    // 8. Animation Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Rotate core continuously
      coreMesh.rotation.y = elapsed * 0.35;
      coreMesh.rotation.x = Math.sin(elapsed * 0.2) * 0.15;
      wireMesh.rotation.y = -elapsed * 0.45;
      innerMesh.rotation.x = elapsed * 0.6;
      innerMesh.rotation.z = elapsed * 0.4;

      // Pulse inner light
      const pulse = Math.sin(elapsed * 3) * 0.5 + 2.5;
      centerLight.intensity = pulse;

      // Rotate orbit satellites if rotation active
      if (isRotatingRef.current) {
        orbitGroup.rotation.y += 0.0035;
      }

      // Smooth mouse drag damping
      orbitGroup.rotation.y += (targetRotationY - orbitGroup.rotation.y) * 0.08;
      orbitGroup.rotation.x += (targetRotationX - orbitGroup.rotation.x) * 0.08;

      // Animate individual satellite halos
      satelliteMeshes.forEach((sat) => {
        sat.haloMesh.rotation.z = elapsed * 1.5;
        const isSelected = selectedNodeIdRef.current === sat.data.id;
        const targetScale = isSelected ? 1.35 : 1.0;
        sat.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      });

      // Slowly drift starfield
      particleSystem.rotation.y = elapsed * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // 10. Clean-up on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);

      // Dispose Geometries and Materials
      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      lineMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // SVG Fallback for devices without WebGL
  if (!webglSupported) {
    return (
      <div className="w-full aspect-[640/460] bg-[#070B12] rounded-2xl border border-white/10 p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-radial from-[#00E6A0]/10 via-transparent to-transparent pointer-events-none" />
        <div className="text-center space-y-3 z-10 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#0C1420] border border-[#00E6A0]/40 flex items-center justify-center mx-auto text-[#00E6A0] shadow-[0_0_25px_rgba(0,230,160,0.3)]">
            <Shield size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">BRANDTRACE Evidence Core</h3>
          <p className="text-xs text-[#9AAABD] leading-relaxed">
            High-performance WebGL context unavailable. Displaying interactive architecture fallback.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-3">
            {ORBIT_NODES.map((node) => (
              <button
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                  selectedNodeId === node.id
                    ? 'bg-[#00E6A0]/15 border-[#00E6A0] text-white'
                    : 'bg-[#111D2A] border-white/10 text-[#9AAABD] hover:border-white/20'
                }`}
              >
                <div className="font-semibold text-white">{node.title}</div>
                <div className="text-[10px] text-[#00E6A0] uppercase tracking-wider font-bold">
                  {node.badge}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedNodeData =
    selectedNodeId === 0
      ? {
          id: 0,
          title: 'BRANDTRACE Core Engine',
          badge: 'CENTRAL GOVERNANCE ENGINE',
          desc: 'High-throughput governance orchestration coordinating deterministic pattern matching, fact validity windows, approval gates, and immutable audit logs.',
          status: 'Active',
          color: '#00E6A0',
        }
      : ORBIT_NODES.find((n) => n.id === selectedNodeId) || ORBIT_NODES[0];

  return (
    <div className="relative w-full aspect-[640/480] sm:aspect-[640/440] bg-[#070B12] rounded-2xl border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
      {/* Background glow layers */}
      <div className="absolute inset-0 bg-radial from-[#00E6A0]/10 via-[#00C8F0]/5 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#8467FF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Tooltip */}
      {hoveredNode && tooltipPos && (
        <div
          className="absolute z-20 pointer-events-none transition-transform duration-75 ease-out"
          style={{
            left: `${tooltipPos.x + 16}px`,
            top: `${tooltipPos.y - 32}px`,
            transform: 'translate(0, -50%)',
          }}
        >
          <div className="bg-[#0C1420]/95 backdrop-blur-md border border-[#00E6A0]/40 px-3 py-1.5 rounded-lg shadow-xl text-left">
            <span
              className="text-[9px] font-black tracking-wider uppercase block"
              style={{ color: hoveredNode.color }}
            >
              {hoveredNode.badge}
            </span>
            <span className="text-xs font-bold text-white block leading-tight">
              {hoveredNode.title}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Scene Controls Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 p-2 bg-[#0C1420]/80 backdrop-blur-md rounded-xl border border-white/10">
        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            className="p-1.5 rounded-lg text-[#9AAABD] hover:text-white hover:bg-white/10 transition-colors"
            title={isRotating ? 'Pause Orbit Animation' : 'Resume Orbit Animation'}
            aria-label={isRotating ? 'Pause 3D rotation' : 'Resume 3D rotation'}
          >
            {isRotating ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            onClick={() => sceneStateRef.current?.resetCamera()}
            className="p-1.5 rounded-lg text-[#9AAABD] hover:text-white hover:bg-white/10 transition-colors"
            title="Reset 3D Perspective"
            aria-label="Reset 3D Perspective"
          >
            <RotateCcw size={14} />
          </button>
          <span className="text-[10px] text-[#64748B] hidden sm:inline ml-1 font-mono">
            Drag to rotate · Click node to inspect
          </span>
        </div>

        {/* Quick Node Pills */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-[260px] sm:max-w-none">
          <button
            type="button"
            onClick={() => onSelectNode(0)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase transition-all ${
              selectedNodeId === 0
                ? 'bg-[#00E6A0] text-[#070B12] shadow-[0_0_10px_rgba(0,230,160,0.4)]'
                : 'text-[#9AAABD] hover:text-white hover:bg-white/5'
            }`}
          >
            Core
          </button>
          {ORBIT_NODES.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectNode(node.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide transition-all ${
                selectedNodeId === node.id
                  ? 'bg-white text-[#070B12] shadow-sm'
                  : 'text-[#9AAABD] hover:text-white hover:bg-white/5'
              }`}
            >
              #{node.id}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Node Drawer / Info Overlay */}
      {selectedNodeData && (
        <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-xs z-10 bg-[#0C1420]/90 backdrop-blur-md rounded-xl border border-white/10 p-3.5 shadow-2xl transition-all">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className="text-[10px] font-black tracking-wider uppercase"
              style={{ color: selectedNodeData.color }}
            >
              {selectedNodeData.badge}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#9AAABD] border border-white/10">
              {selectedNodeData.status}
            </span>
          </div>
          <h4 className="text-sm font-bold text-white mb-1.5">{selectedNodeData.title}</h4>
          <p className="text-xs text-[#9AAABD] leading-relaxed mb-3">
            {selectedNodeData.desc}
          </p>
          {onEnterWorkspace && (
            <button
              type="button"
              onClick={onEnterWorkspace}
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#00E6A0]/15 hover:bg-[#00E6A0]/25 text-[#00E6A0] border border-[#00E6A0]/40 text-xs font-bold transition-all cursor-pointer"
            >
              <span>Explore in Workspace</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
