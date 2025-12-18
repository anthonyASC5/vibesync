import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VisualizerCrowdProps {
  analyser: AnalyserNode;
}

const ROW_COUNT = 7;
const COL_COUNT = 14;
const SPACING_X = 1.4;
const SPACING_Z = 1.4;

type HairStyle = 'spiky' | 'bob' | 'buns' | 'cap';
type Reactivity = 'bass' | 'snare' | 'high';

// --- Hair Component ---
const Hair: React.FC<{ style: HairStyle; color: string }> = ({ style, color }) => {
  switch (style) {
    case 'spiky':
      return (
        <mesh position={[0, 1.85, 0]}>
          <coneGeometry args={[0.35, 0.5, 8]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      );
    case 'buns':
      return (
        <group>
          <mesh position={[0, 1.7, -0.1]}>
             <sphereGeometry args={[0.36, 16, 16, 0, Math.PI * 2, 0, 1.5]} />
             <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[-0.35, 1.75, 0]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0.35, 1.75, 0]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      );
    case 'bob':
      return (
        <group position={[0, 1.65, 0]}>
          <mesh scale={[1.1, 1, 1.1]}>
            <sphereGeometry args={[0.35, 32, 16, 0, Math.PI * 2, 0, 2]} />
            <meshStandardMaterial color={color} roughness={0.6} side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
    case 'cap':
    default:
      return (
        <group>
           <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.32, 0.35, 0.3, 16]} />
            <meshStandardMaterial color={color} roughness={0.9} />
           </mesh>
           <mesh position={[0, 1.95, 0]}>
             <sphereGeometry args={[0.32, 16, 16, 0, Math.PI*2, 0, 1.0]} />
             <meshStandardMaterial color={color} roughness={0.9} />
           </mesh>
        </group>
      );
  }
};

// --- Character Component ---
const Character: React.FC<{ 
  position: [number, number, number]; 
  color: string; 
  bounce: number;
  delay: number;
  hairStyle: HairStyle;
  hairColor: string;
}> = ({ position, color, bounce, delay, hairStyle, hairColor }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      const uniqueFactor = (position[0] * position[2]); 
      
      // Apply delay to bounce for wave effect but keep it snappy
      let effectiveBounce = Math.max(0, bounce - (delay * 0.15));
      
      // Add a tiny bit of idle sway
      const idleY = Math.sin(state.clock.elapsedTime * 2 + uniqueFactor) * 0.05;
      
      // Lerp Y position
      const targetY = position[1] + idleY + effectiveBounce * 1.8; // 1.8 = Jump height multiplier
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.25);
      
      // Squash/Stretch
      const squash = Math.max(0, -effectiveBounce) * 0.2; // Landing squash
      const stretch = effectiveBounce * 0.15; // Jumping stretch
      
      const scaleY = 1 + stretch - squash;
      const scaleXZ = 1 - (stretch * 0.5) + (squash * 0.5);
      
      groupRef.current.scale.set(scaleXZ, scaleY, scaleXZ);
      
      // Look at center (approximate)
      groupRef.current.rotation.y = Math.atan2(-position[0], -position[2] - 15) * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Head */}
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#ffdbac" roughness={0.5} />
      </mesh>
      
      {/* Hair */}
      <Hair style={hairStyle} color={hairColor} />
      
      {/* Eyes */}
      <mesh position={[-0.12, 1.65, 0.3]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="black" />
      </mesh>
      <mesh position={[0.12, 1.65, 0.3]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="black" />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.35, 0.8, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>

      {/* Arms (Simple) */}
      <mesh position={[-0.4, 1.1, 0]} rotation={[0, 0, 0.2]}>
         <capsuleGeometry args={[0.1, 0.6]} />
         <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.4, 1.1, 0]} rotation={[0, 0, -0.2]}>
         <capsuleGeometry args={[0.1, 0.6]} />
         <meshStandardMaterial color={color} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.2, 0.3, 0]}>
         <capsuleGeometry args={[0.13, 0.6]} />
         <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0.2, 0.3, 0]}>
         <capsuleGeometry args={[0.13, 0.6]} />
         <meshStandardMaterial color="#1f2937" />
      </mesh>
    </group>
  );
};

// --- Main Component ---
export const VisualizerCrowd: React.FC<VisualizerCrowdProps> = ({ analyser }) => {
  // Store separate bounce values for different frequency bands
  const [bounceValues, setBounceValues] = useState({ bass: 0, snare: 0, high: 0 });
  
  const dataArray = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  
  // Generate characters
  const characters = useMemo(() => {
    const chars = [];
    const hairStyles: HairStyle[] = ['spiky', 'bob', 'buns', 'cap'];
    const hairColors = ['#2c1810', '#4a3020', '#f59e0b', '#000000', '#881337']; // Brown, Light Brown, Blonde, Black, Red
    
    // Color palettes mapped to reactivity
    const bassColors = ['#dc2626', '#1d4ed8', '#15803d', '#b91c1c']; // Red, Blue, Green (Deep)
    const snareColors = ['#f59e0b', '#9333ea', '#d97706', '#7c3aed']; // Orange, Purple
    const highColors = ['#f472b6', '#22d3ee', '#a78bfa', '#fbbf24']; // Pink, Cyan, Light Purple
    
    for (let z = 0; z < ROW_COUNT; z++) {
      for (let x = 0; x < COL_COUNT; x++) {
        
        // Determine reactivity based loosely on position rows to create "sections" of the crowd
        // but mix it up a bit randomly
        const rand = Math.random();
        let reactivity: Reactivity = 'bass';
        let shirtColor = '#ffffff';

        if (rand > 0.66) {
           reactivity = 'snare';
           shirtColor = snareColors[Math.floor(Math.random() * snareColors.length)];
        } else if (rand > 0.33) {
           reactivity = 'bass';
           shirtColor = bassColors[Math.floor(Math.random() * bassColors.length)];
        } else {
           reactivity = 'high';
           shirtColor = highColors[Math.floor(Math.random() * highColors.length)];
        }

        chars.push({
          id: `${x}-${z}`,
          x: (x - COL_COUNT / 2) * SPACING_X + (z % 2 === 0 ? 0 : SPACING_X / 2),
          z: -z * SPACING_Z,
          color: shirtColor,
          reactivity,
          delay: z * 0.1 + Math.abs(x - COL_COUNT/2) * 0.05,
          hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
          hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
        });
      }
    }
    return chars;
  }, []);

  useFrame(() => {
    analyser.getByteFrequencyData(dataArray);
    
    // 1. Bass (0-60Hz approx) -> Bins 0-3 approx
    let bassSum = 0;
    for(let i=0; i<4; i++) bassSum += dataArray[i];
    const bassLevel = bassSum / 4;

    // 2. Snare/Mids (200-500Hz approx) -> Bins 10-25 approx
    let snareSum = 0;
    for(let i=10; i<25; i++) snareSum += dataArray[i];
    const snareLevel = snareSum / 15;

    // 3. Highs (Hats) (5kHz+) -> Bins 200+
    let highSum = 0;
    for(let i=200; i<250; i++) highSum += dataArray[i];
    const highLevel = highSum / 50;

    // Thresholds
    const calcBounce = (val: number, threshold: number) => {
        if (val > threshold) {
            return (val - threshold) / (255 - threshold);
        }
        return 0;
    };

    const targetBass = calcBounce(bassLevel, 150);
    const targetSnare = calcBounce(snareLevel, 130);
    const targetHigh = calcBounce(highLevel, 90) * 0.6; // Highs jump less high

    setBounceValues(prev => ({
        bass: Math.max(0, prev.bass * 0.85 < targetBass ? targetBass : prev.bass - 0.1),
        snare: Math.max(0, prev.snare * 0.85 < targetSnare ? targetSnare : prev.snare - 0.1),
        high: Math.max(0, prev.high * 0.85 < targetHigh ? targetHigh : prev.high - 0.1),
    }));
  });

  return (
    <group position={[0, -2.5, 0]}>
      {/* White Background for Studio Look */}
      <color attach="background" args={['#ffffff']} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#f9fafb" roughness={0.8} />
      </mesh>

      {/* Crowd */}
      {characters.map((char) => {
        let bounce = 0;
        if (char.reactivity === 'bass') bounce = bounceValues.bass;
        else if (char.reactivity === 'snare') bounce = bounceValues.snare;
        else bounce = bounceValues.high;

        return (
            <Character 
            key={char.id}
            position={[char.x, 0, char.z]}
            color={char.color}
            bounce={bounce}
            delay={char.delay}
            hairStyle={char.hairStyle}
            hairColor={char.hairColor}
            />
        );
      })}
      
      {/* Disco Lights - Adjusted for white background */}
      <spotLight position={[10, 15, 5]} angle={0.6} intensity={2} color="#ef4444" castShadow />
      <spotLight position={[-10, 15, 5]} angle={0.6} intensity={2} color="#3b82f6" castShadow />
      <pointLight position={[0, 10, -5]} intensity={0.6} color="#ffffff" />
      <ambientLight intensity={0.7} />
    </group>
  );
};