import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface FrogHero3DProps {
  className?: string;
}

/**
 * Procedural 3D Voxel Frog Hero Visual built entirely from flat-faced cube/box primitives
 * (Three.js BoxGeometry) in a minimalist Minecraft mob aesthetic.
 * 
 * Features:
 * - 100% Box/Rectangular-Prism geometry (zero spheres or rounded primitives).
 * - Flat-shaded faces with visible wireframe edge outlines.
 * - Dynamic face-by-face lighting shift across 3D rotation: faces pointing toward the
 *   implied light source read brighter and more saturated; faces rotated away read darker.
 * - Prominent, bulging voxel eye cubes perched atop the head block.
 * - Crouched hind legs and planted forelegs in resting frog posture.
 * - Autonomous orbiting voxel satellite cube tracing the contour.
 * - Color: #00F0FF (LoomFrog pure electric cyan accent).
 * - Full prefers-reduced-motion support and visible Pause/Resume controls.
 */
export const FrogHero3D: React.FC<FrogHero3DProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  // Animation and state references
  const animFrameIdRef = useRef<number | null>(null);
  const isPausedRef = useRef<boolean>(false);
  isPausedRef.current = isPaused;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const frogGroupRef = useRef<THREE.Group | null>(null);
  const satelliteMeshRef = useRef<THREE.Mesh | null>(null);
  const trailMeshesRef = useRef<THREE.Mesh[]>([]);

  // Interaction tracking (mouse hover tilt / drag to orbit)
  const pointerRef = useRef<{
    x: number;
    y: number;
    isDown: boolean;
    startX: number;
    startY: number;
    rotY: number;
    rotX: number;
  }>({
    x: 0,
    y: 0,
    isDown: false,
    startX: 0,
    startY: 0,
    rotY: 0,
    rotX: 0
  });

  // Check prefers-reduced-motion on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsReducedMotion(true);
      setIsPaused(true);
    }
    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
      if (e.matches) {
        setIsPaused(true);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // 1. Scene & Perspective Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 360;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.95, 3.65);
    camera.lookAt(0, 0.08, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3. Implied Directional Light (fixed in world space)
    // Front-top-right light source so rotation creates a strong face-by-face brightness shift
    const lightDirection = new THREE.Vector3(0.7, 1.2, 0.9).normalize();

    // 4. Flat-Shading Custom Shader for Voxel Cube Faces
    // Calculates face normals dynamically via screen-space derivatives (dFdx/dFdy)
    // so every cube face is completely flat-shaded with zero gradient bleeding.
    // Color: Exactly #00F0FF (0.0, 0.941176, 1.0)
    const voxelFaceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uBaseColor: { value: new THREE.Color(0x00f0ff) },
        uLightDir: { value: lightDirection },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vViewPos;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vec4 mvPos = viewMatrix * worldPos;
          vViewPos = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform vec3 uBaseColor;
        uniform vec3 uLightDir;
        uniform float uTime;

        varying vec3 vWorldPos;
        varying vec3 vViewPos;

        void main() {
          // Compute flat geometric face normal from world position derivatives
          vec3 dX = dFdx(vWorldPos);
          vec3 dY = dFdy(vWorldPos);
          vec3 N = normalize(cross(dX, dY));

          vec3 L = normalize(uLightDir);
          vec3 V = normalize(vViewPos);

          // Face-by-face directional lighting shift across 3D rotation:
          // Faces oriented toward the light source read brighter and more saturated;
          // faces rotated away read darker/dimmer.
          float NdotL = dot(N, L);
          float lightFactor = clamp(NdotL * 0.55 + 0.45, 0.0, 1.0);

          // Subtle rim accent on grazing edges
          float fresnel = pow(1.0 - max(0.0, dot(N, V)), 3.0);

          // Color palette: lit electric cyan (#00F0FF) to deep shadowed cyan (#003138)
          vec3 litColor = uBaseColor * (0.45 + 0.55 * lightFactor + 0.25 * fresnel);
          vec3 shadowColor = uBaseColor * 0.18; // Dark tone on shadowed face
          vec3 finalColor = mix(shadowColor, litColor, lightFactor);

          // Solid semi-translucent flat face with subtle cyber depth
          float alpha = mix(0.82, 0.94, lightFactor);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });

    // Dark Pupil Material for Voxel Eye Accents (Minecraft style)
    const pupilFaceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uBaseColor: { value: new THREE.Color(0x021b24) }, // Deep obsidian-cyan pupil
        uLightDir: { value: lightDirection }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform vec3 uBaseColor;
        uniform vec3 uLightDir;
        varying vec3 vWorldPos;

        void main() {
          vec3 dX = dFdx(vWorldPos);
          vec3 dY = dFdy(vWorldPos);
          vec3 N = normalize(cross(dX, dY));
          float NdotL = dot(N, normalize(uLightDir));
          float lightFactor = clamp(NdotL * 0.4 + 0.6, 0.1, 1.0);
          gl_FragColor = vec4(uBaseColor * lightFactor, 0.95);
        }
      `,
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });

    // Bright Glowing Wireframe Edge Material for Every Cube
    const edgeLineMaterial = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.92,
      linewidth: 1
    });

    // Helper: Create a voxel block with flat-shaded faces and crisp edge lines
    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const createVoxelBlock = (
      width: number,
      height: number,
      depth: number,
      x: number,
      y: number,
      z: number,
      customMaterial: THREE.Material = voxelFaceMaterial
    ): THREE.Group => {
      const blockGroup = new THREE.Group();
      blockGroup.position.set(x, y, z);

      const boxGeo = new THREE.BoxGeometry(width, height, depth);
      geometriesToDispose.push(boxGeo);

      const boxMesh = new THREE.Mesh(boxGeo, customMaterial);
      blockGroup.add(boxMesh);

      const edgesGeo = new THREE.EdgesGeometry(boxGeo, 15);
      geometriesToDispose.push(edgesGeo);

      const edgesMesh = new THREE.LineSegments(edgesGeo, edgeLineMaterial);
      blockGroup.add(edgesMesh);

      return blockGroup;
    };

    // 5. Build Frog Entirely from Cube/Box Primitives (Minecraft Mob Aesthetic)
    const frogGroup = new THREE.Group();
    frogGroupRef.current = frogGroup;
    scene.add(frogGroup);

    // --- 1. MAIN BODY: Lower Squat Torso Block ---
    // Wide, flat, low-slung lower rectangular prism
    // width: 1.65, height: 0.58, depth: 1.35
    const bodyBlock = createVoxelBlock(1.65, 0.58, 1.35, 0, 0.04, -0.08);
    frogGroup.add(bodyBlock);

    // --- 2. HEAD / SNOUT: Upper Front Block ---
    // Slightly smaller cube volume seated on top-front of body, extending forward
    // width: 1.35, height: 0.52, depth: 1.05
    const headBlock = createVoxelBlock(1.35, 0.52, 1.05, 0, 0.24, 0.48);
    frogGroup.add(headBlock);

    // --- 3. EYES: Bulging Cube Volumes on Top-Front (Signature Frog Detail) ---
    // Two clearly visible protruding cubes perched high on the top-front corners of the head.
    // Proportioned prominently (0.42 x 0.42 x 0.42) so they unmistakably read as frog eyes!
    const leftEyeBlock = createVoxelBlock(0.42, 0.42, 0.42, -0.46, 0.62, 0.58);
    frogGroup.add(leftEyeBlock);

    const rightEyeBlock = createVoxelBlock(0.42, 0.42, 0.42, 0.46, 0.62, 0.58);
    frogGroup.add(rightEyeBlock);

    // Flat front pupil accents on the forward face of each eye cube (Minecraft mob eye look)
    const leftPupilBlock = createVoxelBlock(0.22, 0.22, 0.05, -0.46, 0.62, 0.80, pupilFaceMaterial);
    frogGroup.add(leftPupilBlock);

    const rightPupilBlock = createVoxelBlock(0.22, 0.22, 0.05, 0.46, 0.62, 0.80, pupilFaceMaterial);
    frogGroup.add(rightPupilBlock);

    // --- 4. CROUCHED HIND LEGS (Back Thighs & Feet in Resting Frog Pose) ---
    // Chunky back thighs tucked tightly along the rear flanks
    const leftThighBlock = createVoxelBlock(0.48, 0.52, 1.02, -1.06, 0.06, -0.22);
    frogGroup.add(leftThighBlock);

    const rightThighBlock = createVoxelBlock(0.48, 0.52, 1.02, 1.06, 0.06, -0.22);
    frogGroup.add(rightThighBlock);

    // Flat rear webbed foot blocks resting on the floor plane
    const leftHindFoot = createVoxelBlock(0.42, 0.14, 0.72, -1.06, -0.32, 0.36);
    frogGroup.add(leftHindFoot);

    const rightHindFoot = createVoxelBlock(0.42, 0.14, 0.72, 1.06, -0.32, 0.36);
    frogGroup.add(rightHindFoot);

    // --- 5. FORELEGS & FRONT FEET (Resting Under Chest) ---
    // Vertical rectangular columns supporting the front chest
    const leftFrontLeg = createVoxelBlock(0.24, 0.50, 0.24, -0.50, -0.12, 0.72);
    frogGroup.add(leftFrontLeg);

    const rightFrontLeg = createVoxelBlock(0.24, 0.50, 0.24, 0.50, -0.12, 0.72);
    frogGroup.add(rightFrontLeg);

    // Front feet pads on the floor
    const leftFrontFoot = createVoxelBlock(0.32, 0.12, 0.38, -0.50, -0.33, 0.86);
    frogGroup.add(leftFrontFoot);

    const rightFrontFoot = createVoxelBlock(0.32, 0.12, 0.38, 0.50, -0.33, 0.86);
    frogGroup.add(rightFrontFoot);

    // --- 6. WIDE MOUTH / LOWER JAW PLATE ---
    // A subtle horizontal rectangular chin block establishing the iconic wide frog mouth
    const mouthBlock = createVoxelBlock(1.20, 0.12, 0.26, 0, 0.02, 1.02);
    frogGroup.add(mouthBlock);

    // 6. Autonomous Satellite Voxel Cube (Contour Tracer)
    // A small solid glowing cube orbiting around the blocky frog silhouette
    const satelliteGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    geometriesToDispose.push(satelliteGeo);
    const satelliteMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const satelliteMesh = new THREE.Mesh(satelliteGeo, satelliteMat);

    const satEdgeGeo = new THREE.EdgesGeometry(satelliteGeo);
    geometriesToDispose.push(satEdgeGeo);
    const satEdgeMesh = new THREE.LineSegments(satEdgeGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
    satelliteMesh.add(satEdgeMesh);

    frogGroup.add(satelliteMesh);
    satelliteMeshRef.current = satelliteMesh;

    // Trail cubes following satellite
    const trailMeshes: THREE.Mesh[] = [];
    for (let i = 1; i <= 4; i++) {
      const s = 0.07 - i * 0.012;
      const tGeo = new THREE.BoxGeometry(s, s, s);
      geometriesToDispose.push(tGeo);
      const tMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.8 - i * 0.18
      });
      const tMesh = new THREE.Mesh(tGeo, tMat);
      frogGroup.add(tMesh);
      trailMeshes.push(tMesh);
    }
    trailMeshesRef.current = trailMeshes;

    // 7. Ground Voxel Coordinate Ring
    // A square wireframe boundary frame beneath the frog matching the voxel geometry
    const groundBoxGeo = new THREE.BoxGeometry(2.8, 0.02, 2.8);
    geometriesToDispose.push(groundBoxGeo);
    const groundEdgesGeo = new THREE.EdgesGeometry(groundBoxGeo);
    geometriesToDispose.push(groundEdgesGeo);
    const groundFrame = new THREE.LineSegments(
      groundEdgesGeo,
      new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.18 })
    );
    groundFrame.position.y = -0.40;
    frogGroup.add(groundFrame);

    const innerGridGeo = new THREE.BoxGeometry(1.8, 0.02, 1.8);
    geometriesToDispose.push(innerGridGeo);
    const innerEdgesGeo = new THREE.EdgesGeometry(innerGridGeo);
    geometriesToDispose.push(innerEdgesGeo);
    const innerFrame = new THREE.LineSegments(
      innerEdgesGeo,
      new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.12 })
    );
    innerFrame.position.y = -0.40;
    frogGroup.add(innerFrame);

    // Initial slight upward tilt to showcase face and bulging eyes
    frogGroup.rotation.x = 0.14;

    // 8. Animation Loop
    let lastTime = performance.now();
    let accumulatedRotation = 0;
    const trailHistory: THREE.Vector3[] = [];

    const animate = (now: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const elapsed = now * 0.001;

      // Update shader time uniform
      voxelFaceMaterial.uniforms.uTime.value = elapsed;

      // Only advance rotation & satellite motion if NOT paused
      if (!isPausedRef.current) {
        // Slow, continuous, subtle ambient rotation
        accumulatedRotation += delta * 0.42;

        // Subtle floating bob
        frogGroup.position.y = Math.sin(elapsed * 1.4) * 0.035;
      }

      // Smooth interpolation for interactive drag/hover tilt
      const targetRotY = accumulatedRotation + pointerRef.current.rotY;
      const targetRotX = 0.14 + pointerRef.current.rotX;

      frogGroup.rotation.y += (targetRotY - frogGroup.rotation.y) * 0.08;
      frogGroup.rotation.x += (targetRotX - frogGroup.rotation.x) * 0.08;

      // Position the autonomous satellite cube along a 3D contour path hugging the blocky silhouette
      const satTime = elapsed * 1.1;
      const sx = Math.sin(satTime) * (1.35 + 0.14 * Math.sin(satTime * 2.0));
      const sy = 0.22 + Math.sin(satTime * 3.0) * 0.40 + Math.cos(satTime) * 0.12;
      const sz = Math.cos(satTime) * (1.28 + 0.16 * Math.cos(satTime * 2.0));

      satelliteMesh.position.set(sx, sy, sz);
      satelliteMesh.rotation.y += delta * 1.2;
      satelliteMesh.rotation.x += delta * 0.8;

      // Record trail history
      if (!isPausedRef.current) {
        trailHistory.unshift(new THREE.Vector3(sx, sy, sz));
        if (trailHistory.length > 20) {
          trailHistory.pop();
        }
      }

      // Update trail positions
      for (let i = 0; i < trailMeshes.length; i++) {
        const historyIndex = (i + 1) * 3;
        if (trailHistory[historyIndex]) {
          trailMeshes[i].position.copy(trailHistory[historyIndex]);
          trailMeshes[i].visible = true;
        } else {
          trailMeshes[i].visible = false;
        }
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // 9. Responsive Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 500;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 10. Cleanup on Unmount
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose all box geometries and materials
      geometriesToDispose.forEach(geo => geo.dispose());
      voxelFaceMaterial.dispose();
      pupilFaceMaterial.dispose();
      edgeLineMaterial.dispose();
      satelliteMat.dispose();
      trailMeshes.forEach(m => (m.material as THREE.Material).dispose());
      renderer.dispose();
    };
  }, []);

  // Pointer Drag & Hover Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerRef.current.isDown = true;
    pointerRef.current.startX = e.clientX;
    pointerRef.current.startY = e.clientY;
    setIsInteracting(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerRef.current.isDown) {
      // Subtle mouse hover tilt
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        pointerRef.current.rotY = mouseX * 0.35;
        pointerRef.current.rotX = -mouseY * 0.2;
      }
      return;
    }
    const dx = e.clientX - pointerRef.current.startX;
    const dy = e.clientY - pointerRef.current.startY;
    pointerRef.current.rotY += dx * 0.008;
    pointerRef.current.rotX += dy * 0.006;
    pointerRef.current.startX = e.clientX;
    pointerRef.current.startY = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointerRef.current.isDown = false;
    setIsInteracting(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const resetAngle = useCallback(() => {
    pointerRef.current.rotY = 0;
    pointerRef.current.rotX = 0;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-3xl overflow-hidden neo-liquid-panel border border-cyan-500/30 p-2 sm:p-3 shadow-[0_0_50px_rgba(0,240,255,0.14)] ${className}`}
    >
      {/* Ambient Lighting Gradient Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#030818]/80 via-[#030818]/60 to-[#020617]/90 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[280px] bg-cyan-500/[0.08] rounded-full blur-[90px] pointer-events-none" />

      {/* Top Controls Bar (Clean unobtrusive pause & angle reset) */}
      <div className="relative z-10 flex items-center justify-end px-3 pt-2 pb-1">
        {/* Action Controls: Pause/Play & Angle Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetAngle}
            title="Reset viewing angle"
            className="p-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs transition-colors cursor-pointer"
            aria-label="Reset viewing angle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={togglePause}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 text-xs font-mono text-cyan-200 hover:text-white transition-all cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.15)]"
            aria-label={isPaused ? 'Resume rotation' : 'Pause rotation'}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-teal-400 fill-teal-400" />
                <span>Resume motion</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pause motion</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* WebGL Canvas Interactive Container */}
      <div
        ref={canvasContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative w-full h-[300px] sm:h-[350px] lg:h-[400px] xl:h-[430px] touch-none select-none ${
          isInteracting ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        title="Click and drag to orbit voxel frog"
      />
    </div>
  );
};
