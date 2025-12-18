import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { Play, Pause, RefreshCw, Scissors } from 'lucide-react';
import { Button } from './Button';
import { Region } from '../types';

interface WaveformEditorProps {
  file: File;
  onConfirmRegion: (region: Region) => void;
}

export const WaveformEditor: React.FC<WaveformEditorProps> = ({ file, onConfirmRegion }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null); // Type any for plugin 
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [region, setRegion] = useState<Region>({ start: 0, end: 30 });

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4b5563',
      progressColor: '#a855f7',
      cursorColor: '#d8b4fe',
      barWidth: 2,
      barGap: 3,
      barRadius: 3,
      height: 120,
      normalize: true,
      backend: 'WebAudio',
    });

    const wsRegions = RegionsPlugin.create();
    ws.registerPlugin(wsRegions);
    regionsRef.current = wsRegions;

    ws.loadBlob(file);

    ws.on('ready', () => {
      setIsReady(true);
      const duration = ws.getDuration();
      const end = Math.min(duration, 30);
      
      // Create initial region
      wsRegions.addRegion({
        start: 0,
        end: end,
        color: 'rgba(168, 85, 247, 0.2)',
        drag: true,
        resize: true,
        id: 'trim-region'
      });

      setRegion({ start: 0, end: end });
    });

    wsRegions.on('region-updated', (reg: any) => {
      setRegion({ start: reg.start, end: reg.end });
      // Enforce max 30s? optional, visually indicated for now.
    });

    wsRegions.on('region-clicked', (reg: any, e: any) => {
      e.stopPropagation();
      reg.play();
      setIsPlaying(true);
    });

    ws.on('finish', () => setIsPlaying(false));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [file]);

  const togglePlay = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
  };

  const handleConfirm = () => {
    // Enforce 30s max logic if strictly needed, or just pass current
    const duration = region.end - region.start;
    if (duration > 30.5) { // slight buffer
      alert("Please select a segment of 30 seconds or less.");
      return;
    }
    onConfirmRegion(region);
  };

  return (
    <div className="w-full space-y-6 bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Scissors className="w-5 h-5 text-purple-400" />
          Trim Audio Clip
        </h2>
        <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
          Selected: {(region.end - region.start).toFixed(1)}s
        </span>
      </div>

      <div 
        ref={containerRef} 
        className="w-full bg-gray-950/50 rounded-lg overflow-hidden ring-1 ring-gray-800"
      />

      <div className="flex justify-between items-center pt-2">
        <div className="flex space-x-3">
          <Button onClick={togglePlay} variant="secondary" disabled={!isReady}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            <span className="ml-2">{isPlaying ? 'Pause' : 'Preview'}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => {
              wavesurferRef.current?.stop();
              setIsPlaying(false);
            }}
            disabled={!isReady}
          >
            <RefreshCw size={18} />
          </Button>
        </div>

        <Button onClick={handleConfirm} disabled={!isReady} className="min-w-[160px]">
          Generate Visuals
        </Button>
      </div>
      
      <p className="text-xs text-gray-500 text-center">
        Drag edges to resize selection. Click region to loop preview. Max 30s recommended.
      </p>
    </div>
  );
};