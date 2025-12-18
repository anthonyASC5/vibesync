import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VisualizerWallProps {
  analyser: AnalyserNode;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform float bass;
  varying vec2 vUv;

  void main() {
    // 1. "Zoom out" by scaling UVs up significantly (High density)
    // Center the coordinates so scaling happens from center
    vec2 uv = (vUv - 0.5) * 50.0;
    
    // 2. Rotation over time for disorientation
    float rot = time * 0.05;
    float s = sin(rot);
    float c = cos(rot);
    mat2 m = mat2(c, -s, s, c);
    uv = m * uv;

    // 3. "Trippy" Domain Warping
    // The coordinate itself is offset by trigonometric functions of itself
    // Bass adds aggressive energy to this warp
    float warpStrength = 1.5 + bass * 2.0;
    
    vec2 warp = vec2(
      sin(uv.y * 0.5 + time * 0.5),
      cos(uv.x * 0.5 + time * 0.4)
    );
    
    uv += warp * warpStrength;

    // 4. Pattern Generation (Turing / Maze / Interference)
    // Combining varying frequencies creates the complexity
    float v = sin(uv.x) + sin(uv.y) + sin(uv.x * 0.5 + uv.y * 0.5 + time);
    
    // 5. Sharpness
    // We want crisp lines. We use a very narrow smoothstep or fwidth.
    // abs(v) creates the "lines" where the wave crosses zero.
    float lineThickness = 0.15 + bass * 0.1; // Bass makes lines slightly thicker
    float sharpness = 0.05; // Very low value = sharp edge
    
    // The 'pattern' is 1.0 where there is a line, 0.0 where background
    float pattern = 1.0 - smoothstep(lineThickness - sharpness, lineThickness + sharpness, abs(v));
    
    // 6. Output: Pure White lines on Pure Black
    gl_FragColor = vec4(vec3(pattern), 1.0);
  }
`;

export const VisualizerWall: React.FC<VisualizerWallProps> = ({ analyser }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const dataArray = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);

  useFrame((state) => {
    if (materialRef.current) {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate Bass energy (low frequencies)
      let bassSum = 0;
      for(let i=0; i<10; i++) bassSum += dataArray[i];
      const bass = (bassSum / 10) / 255;

      // Update uniforms
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      // Interpolate bass for responsiveness but smoothness
      materialRef.current.uniforms.bass.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.bass.value, 
        bass, 
        0.2
      );
    }
  });

  const uniforms = useMemo(() => ({
    time: { value: 0 },
    bass: { value: 0 },
  }), []);

  return (
    <mesh position={[0, 0, 0]}>
      {/* Large plane to ensure full screen coverage even with the warp effects */}
      <planeGeometry args={[60, 40]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};
