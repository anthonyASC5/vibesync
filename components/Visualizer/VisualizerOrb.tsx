import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Alias 'line' to avoid TypeScript conflict with SVG <line> element
const ThreeLine = 'line' as any;

interface VisualizerOrbProps {
  analyser: AnalyserNode;
}

export const VisualizerOrb: React.FC<VisualizerOrbProps> = ({ analyser }) => {
  // Mesh References
  const sphereRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Points>(null);
  const innerRingRef = useRef<THREE.Group>(null);
  const waveformLineRef = useRef<THREE.Line>(null);
  
  // Data arrays for audio analysis
  const dataArray = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const waveformData = useMemo(() => new Uint8Array(analyser.fftSize), [analyser]);
  
  // --- GEOMETRY SETUP ---

  // 1. Waveform Line Geometry (Circular)
  const WAVE_POINTS = 256;
  const WAVE_RADIUS = 4.5;
  const waveformGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((WAVE_POINTS + 1) * 3);
    
    for (let i = 0; i <= WAVE_POINTS; i++) {
      const angle = (i / WAVE_POINTS) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * WAVE_RADIUS;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * WAVE_RADIUS;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  // 2. Outer Particle Ring
  const particleCount = 300;
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = (i / particleCount) * Math.PI * 2;
      const radius = 8 + Math.random() * 3;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
    }
    return positions;
  }, []);

  // 3. Bars for inner ring
  const barCount = 64;
  const bars = useMemo(() => {
    return new Array(barCount).fill(0).map((_, i) => {
      const theta = (i / barCount) * Math.PI * 2;
      return {
        position: [Math.cos(theta) * 3, 0, Math.sin(theta) * 3] as [number, number, number],
        rotation: [0, -theta, 0] as [number, number, number],
      };
    });
  }, []);
  
  const barRefs = useRef<(THREE.Mesh | null)[]>([]);

  // --- ANIMATION LOOP ---

  useFrame(() => {
    analyser.getByteFrequencyData(dataArray);
    analyser.getByteTimeDomainData(waveformData);

    const bass = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const bassNorm = bass / 255;

    // A. Animate Waveform Line
    if (waveformLineRef.current) {
      const positions = waveformLineRef.current.geometry.attributes.position.array as Float32Array;
      const step = Math.floor(waveformData.length / WAVE_POINTS);

      for (let i = 0; i <= WAVE_POINTS; i++) {
        const dataIndex = (i * step) % waveformData.length;
        const rawValue = waveformData[dataIndex];
        const value = (rawValue / 128.0) - 1.0;

        const angle = (i / WAVE_POINTS) * Math.PI * 2;
        const distortion = value * 1.5; 
        const r = WAVE_RADIUS + distortion;

        positions[i * 3] = Math.cos(angle) * r;
        positions[i * 3 + 1] = distortion * 0.5; 
        positions[i * 3 + 2] = Math.sin(angle) * r;
      }
      waveformLineRef.current.geometry.attributes.position.needsUpdate = true;
      waveformLineRef.current.rotation.y += 0.001;
    }

    // B. Animate Central Sphere
    if (sphereRef.current) {
      const scale = 1.2 + bassNorm * 1.8;
      sphereRef.current.scale.setScalar(THREE.MathUtils.lerp(sphereRef.current.scale.x, scale, 0.3));
    }

    // C. Animate Inner Ring Bars
    barRefs.current.forEach((bar, i) => {
      if (bar) {
        const dataIndex = Math.floor((i / barCount) * 40);
        const value = dataArray[dataIndex] / 255;
        
        const targetHeight = 0.2 + value * 6;
        bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, targetHeight, 0.3);
      }
    });

    // D. Animate Outer Particles
    if (outerRingRef.current) {
      outerRingRef.current.rotation.y -= 0.001 + bassNorm * 0.005;
    }
  });

  return (
    <group>
      <ThreeLine ref={waveformLineRef} geometry={waveformGeometry}>
        <lineBasicMaterial 
          color="#ffffff" 
          linewidth={2} 
          transparent 
          opacity={0.8} 
          blending={THREE.AdditiveBlending}
        />
      </ThreeLine>

      <mesh ref={sphereRef}>
        <icosahedronGeometry args={[1.8, 3]} />
        <meshStandardMaterial 
          color="#ffffff"
          wireframe={true} 
          transparent
          opacity={0.4}
        />
      </mesh>
      
      <mesh scale={[1.6, 1.6, 1.6]}>
         <icosahedronGeometry args={[1, 2]} />
         <meshBasicMaterial color="black" />
      </mesh>

      <group ref={innerRingRef}>
        {bars.map((props, i) => (
          <mesh 
            key={i} 
            position={props.position} 
            rotation={props.rotation}
            ref={(el) => { barRefs.current[i] = el }}
          >
            <boxGeometry args={[0.15, 1, 0.15]} />
            <meshStandardMaterial 
              color="#ffffff" 
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>

      <points ref={outerRingRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlesPosition.length / 3}
            array={particlesPosition}
            itemSize={3}
            args={[particlesPosition, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color="#ffffff"
          transparent
          opacity={0.5}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
    </group>
  );
};
