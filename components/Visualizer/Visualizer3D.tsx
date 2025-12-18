import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import { VisualizerScene } from './VisualizerScene';
import { VisualizerMode } from '../../types';

interface Visualizer3DProps {
  analyser: AnalyserNode;
  mode: VisualizerMode;
  isRecording: boolean;
  onStopRecording: () => void;
}

// --- Internal Recorder Component ---
const RecorderController: React.FC<{ 
  isRecording: boolean; 
  onStop: () => void; 
}> = ({ isRecording, onStop }) => {
  const { gl } = useThree();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isRecording) {
      chunksRef.current = [];
      const canvas = gl.domElement;
      
      // Use a higher framerate stream for smoother video
      const stream = canvas.captureStream(60); 
      
      // Prefer webm for transparency support
      const mimeType = 'video/webm;codecs=vp9';
      let options = { mimeType };
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
         console.warn("VP9 not supported, falling back to default");
         options = { mimeType: 'video/webm' };
      }

      try {
        const recorder = new MediaRecorder(stream, options);
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          
          // Auto download
          const a = document.createElement('a');
          a.href = url;
          a.download = `vibe-visualizer-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          onStop(); // Notify parent we are done
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch(err) {
        console.error("Failed to start recording", err);
        onStop();
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
  }, [isRecording, gl, onStop]);

  return null;
};

export const Visualizer3D: React.FC<Visualizer3DProps> = ({ analyser, mode, isRecording, onStopRecording }) => {
  // Adjust camera based on mode
  let cameraProps;
  switch(mode) {
    case VisualizerMode.TERRAIN:
      cameraProps = { position: [0, 2, 18], fov: 50 }; // Lower, looking straight on
      break;
    case VisualizerMode.PARTY:
      cameraProps = { position: [0, 4, 14], fov: 60 }; // Wider shot to see the crowd
      break;
    case VisualizerMode.WALL:
      cameraProps = { position: [0, 0, 12], fov: 50 }; // Flat frontal view for the wall
      break;
    case VisualizerMode.ORB:
    default:
      cameraProps = { position: [0, 5, 12], fov: 45 }; // Higher, looking down
      break;
  }

  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        camera={cameraProps as any}
        gl={{ 
          antialias: true, 
          preserveDrawingBuffer: true, // Required for recording
          alpha: true // Required for transparent background
        }}
        dpr={[1, 2]}
        shadows
      >
        <RecorderController isRecording={isRecording} onStop={onStopRecording} />

        {/* We do NOT attach a color to background generally. 
            This leaves the canvas background transparent. 
            The black background is handled by the parent DIV via CSS. 
        */}
        
        <Suspense fallback={null}>
          <VisualizerScene analyser={analyser} mode={mode} />
          
          {/* Stars: Only show in Orb or Terrain mode */}
          {(mode === VisualizerMode.ORB || mode === VisualizerMode.TERRAIN) && (
             <Stars 
             radius={100} 
             depth={50} 
             count={mode === VisualizerMode.TERRAIN ? 1000 : 3000} 
             factor={4} 
             saturation={0} 
             fade 
             speed={1} 
           />
          )}
          
          {mode === VisualizerMode.ORB && <Environment preset="city" />}
          
          {mode === VisualizerMode.TERRAIN && <fog attach="fog" args={['black', 10, 60]} />}
        </Suspense>
        
        <OrbitControls 
          enableZoom={true} 
          enablePan={false} 
          autoRotate={mode === VisualizerMode.ORB} 
          autoRotateSpeed={0.5} 
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 4}
        />
      </Canvas>
      
      {/* Overlay Vignette - pure CSS, won't be in the recording */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
    </div>
  );
};