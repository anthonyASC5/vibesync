import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Alias 'line' to avoid TypeScript conflict with SVG <line> element
const ThreeLine = 'line' as any;

interface VisualizerTerrainProps {
  analyser: AnalyserNode;
}

const ROWS = 45; 
const SAMPLES = 80;
const WIDTH = 55;
const SPACING = 0.7;

export const VisualizerTerrain: React.FC<VisualizerTerrainProps> = ({ analyser }) => {
  const groupRef = useRef<THREE.Group>(null);
  const dataArray = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  
  // History buffer: [row][sample]
  const rowData = useRef<number[][]>(
    Array(ROWS).fill(0).map(() => Array(SAMPLES).fill(0))
  );

  // Initialize Geometries (Position only, no color attribute needed for pure white)
  const lines = useMemo(() => {
    return new Array(ROWS).fill(0).map((_, rowIndex) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(SAMPLES * 3);
      
      const z = -rowIndex * SPACING;
      const xStep = WIDTH / (SAMPLES - 1);
      const xStart = -WIDTH / 2;

      for (let i = 0; i < SAMPLES; i++) {
        positions[i * 3] = xStart + i * xStep;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = z;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return geometry;
    });
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;

    // 1. Audio Analysis
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate bass intensity for global movement
    let bassTotal = 0;
    for(let i = 0; i < 20; i++) bassTotal += dataArray[i];
    const bass = (bassTotal / 20) / 255; // 0.0 to 1.0
    
    // 2. Shift History (Waterfall effect)
    for (let i = ROWS - 1; i > 0; i--) {
      for (let j = 0; j < SAMPLES; j++) {
        rowData.current[i][j] = rowData.current[i - 1][j];
      }
    }

    // 3. Update Front Row with New Data
    const frequencyStep = Math.floor((dataArray.length * 0.6) / SAMPLES);
    
    for (let j = 0; j < SAMPLES; j++) {
      const dataIndex = j * frequencyStep;
      const rawValue = dataArray[dataIndex];
      
      // Windowing
      const t = (j / (SAMPLES - 1)) * Math.PI;
      const window = Math.sin(t); 
      
      // Scale height
      const value = (rawValue / 255.0) * 10.0 * window;
      rowData.current[0][j] = value;
    }

    // 4. Update Geometries
    lines.forEach((geometry, rowIndex) => {
      const positions = geometry.attributes.position.array as Float32Array;
      const currentDataRow = rowData.current[rowIndex];
      
      for (let j = 0; j < SAMPLES; j++) {
        const targetY = currentDataRow[j];
        const currentY = positions[j * 3 + 1];
        
        const lerpSpeed = 0.4;
        const nextY = currentY + (targetY - currentY) * lerpSpeed;
        positions[j * 3 + 1] = nextY;
      }

      geometry.attributes.position.needsUpdate = true;
    });

    // 5. Global Group Animation
    const breatheY = -4 + (bass * 0.8);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, breatheY, 0.1);
    groupRef.current.rotation.x = 0.1 + Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
  });

  return (
    <group ref={groupRef} position={[0, -4, 5]}>
      {lines.map((geometry, i) => {
        // Calculate fade based on depth
        const opacity = Math.max(0, 1 - (i / ROWS)); 
        
        return (
          <React.Fragment key={i}>
            <ThreeLine geometry={geometry}>
              <lineBasicMaterial 
                color="#ffffff"
                transparent={true}
                opacity={opacity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                linewidth={2}
              />
            </ThreeLine>
          </React.Fragment>
        );
      })}
    </group>
  );
};
