import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { WaveformEditor } from './components/WaveformEditor';
import { Visualizer3D } from './components/Visualizer/Visualizer3D';
import { Button } from './components/Button';
import { ArrowLeft, Volume2, VolumeX, Activity, Globe, Users, Video, StopCircle, Layers } from 'lucide-react';
import { AppState, Region, VisualizerMode } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [, setTrimRegion] = useState<Region>({ start: 0, end: 30 });
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>(VisualizerMode.ORB);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Initialize Audio Context
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;

      const anal = ctx.createAnalyser();
      anal.fftSize = 2048; // Higher res for visuals
      anal.smoothingTimeConstant = 0.8;
      
      // Store in Ref for immediate access, and State for React rendering
      analyserRef.current = anal;
      setAnalyser(anal);
    }
    return audioContextRef.current;
  }, []);

  const handleFileSelect = (file: File) => {
    setAudioFile(file);
    setAppState(AppState.ANALYZING);
    // Simulate brief "loading"
    setTimeout(() => setAppState(AppState.READY), 500);
  };

  const startVisualizer = async (region: Region) => {
    setTrimRegion(region);
    const ctx = initAudioContext();

    // Ensure context is running (browser policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Decode Audio Data
    if (audioFile) {
      const arrayBuffer = await audioFile.arrayBuffer();
      try {
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferRef.current = buffer;
        playLoop(ctx, buffer, region);
        setAppState(AppState.VISUALIZING);
      } catch (err) {
        console.error("Error decoding audio", err);
        alert("Failed to decode audio file.");
        setAppState(AppState.READY);
      }
    }
  };

  const playLoop = (ctx: AudioContext, buffer: AudioBuffer, region: Region) => {
    // Stop previous
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = region.start;
    source.loopEnd = region.end;

    const currentAnalyser = analyserRef.current;
    if (currentAnalyser && gainNodeRef.current) {
      source.connect(currentAnalyser);
      currentAnalyser.connect(gainNodeRef.current);
    } else {
      console.warn("Analyser or Gain node not ready during playback start");
    }

    source.start(0, region.start);
    sourceNodeRef.current = source;
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
  };

  const handleBack = () => {
    stopAudio();
    setAppState(AppState.READY);
    setIsRecording(false);
  };

  const toggleMute = () => {
    if (gainNodeRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      gainNodeRef.current.gain.setTargetAtTime(newMuted ? 0 : 1, audioContextRef.current!.currentTime, 0.1);
    }
  };

  // Toggle Recording
  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      audioContextRef.current?.close();
    };
  }, []);

  return (
    // Container has black background so transparent canvas looks black to user
    <div className="min-h-screen bg-black text-white relative selection:bg-purple-500 selection:text-white overflow-hidden">
      
      {/* Header / Overlay Controls for Visualizer */}
      {appState === AppState.VISUALIZING && (
        <div className="absolute top-0 left-0 w-full z-50 p-6 flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto flex space-x-4">
             <Button variant="ghost" onClick={handleBack} className="backdrop-blur-md bg-black/30 hover:bg-black/50 border border-white/10">
               <ArrowLeft className="w-5 h-5 mr-2" />
               Back to Editor
             </Button>
          </div>
          
          <div className="pointer-events-auto flex flex-col items-end space-y-4">
            {/* Visualizer Controls */}
            <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10">
                {/* ORB - RED */}
                <button 
                  onClick={() => setVisualizerMode(VisualizerMode.ORB)}
                  className={`p-2 rounded-full transition-all ${visualizerMode === VisualizerMode.ORB ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'hover:bg-white/10 text-red-500'}`}
                  title="Orb Mode"
                >
                  <Globe size={20} />
                </button>
                
                {/* TERRAIN - BLUE */}
                <button 
                  onClick={() => setVisualizerMode(VisualizerMode.TERRAIN)}
                  className={`p-2 rounded-full transition-all ${visualizerMode === VisualizerMode.TERRAIN ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'hover:bg-white/10 text-blue-500'}`}
                  title="Terrain Mode"
                >
                  <Activity size={20} />
                </button>
                
                {/* PARTY - YELLOW */}
                <button 
                  onClick={() => setVisualizerMode(VisualizerMode.PARTY)}
                  className={`p-2 rounded-full transition-all ${visualizerMode === VisualizerMode.PARTY ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'hover:bg-white/10 text-yellow-400'}`}
                  title="Party Mode"
                >
                  <Users size={20} />
                </button>

                 {/* WALL - PURPLE */}
                 <button 
                  onClick={() => setVisualizerMode(VisualizerMode.WALL)}
                  className={`p-2 rounded-full transition-all ${visualizerMode === VisualizerMode.WALL ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'hover:bg-white/10 text-purple-500'}`}
                  title="Wall Mode"
                >
                  <Layers size={20} />
                </button>
                
                <div className="w-px h-4 bg-white/20 mx-1" />
                
                <button 
                    onClick={toggleRecording} 
                    className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'hover:bg-white/10 text-white'}`}
                    title={isRecording ? "Stop Recording" : "Record Export"}
                >
                  {isRecording ? <StopCircle size={20} /> : <Video size={20} />}
                </button>

                <div className="w-px h-4 bg-white/20 mx-1" />

                <button 
                    onClick={toggleMute} 
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
            </div>
             
             {isRecording && (
               <div className="bg-red-500/20 backdrop-blur text-red-200 px-3 py-1 rounded-full text-xs font-mono border border-red-500/50">
                 REC • Exporting WebM (Transparent)
               </div>
             )}

             <div className="text-right">
                <h1 className="text-2xl font-bold text-white tracking-tighter shadow-black drop-shadow-md">
                  VibeSync
                </h1>
                <p className="text-xs text-gray-400 font-mono shadow-black drop-shadow-sm">
                  {audioFile?.name.substring(0, 25)}{audioFile?.name && audioFile.name.length > 25 ? '...' : ''}
                </p>
             </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="w-full h-screen flex flex-col">
        
        {appState === AppState.IDLE && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#050505]">
             {/* Background Blobs */}
             <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-white/5 rounded-full blur-[128px] animate-pulse" />
             <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-white/5 rounded-full blur-[128px] animate-pulse delay-1000" />

             <div className="z-10 max-w-2xl w-full space-y-8 text-center">
               <div className="space-y-2">
                 <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-4">
                   See Your <span className="text-gray-400">Music.</span>
                 </h1>
                 <p className="text-lg text-gray-400">
                   Upload an MP3. Trim the beat. Watch it come alive in 3D.
                 </p>
               </div>
               
               <div className="max-w-md mx-auto">
                 <FileUpload onFileSelect={handleFileSelect} />
               </div>
             </div>
          </div>
        )}

        {appState === AppState.ANALYZING && (
          <div className="flex-1 flex items-center justify-center bg-[#050505]">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 font-mono text-sm animate-pulse">Parsing Audio Data...</p>
            </div>
          </div>
        )}

        {appState === AppState.READY && audioFile && (
           <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#050505]">
             <div className="w-full max-w-4xl space-y-6">
               <div className="flex items-center justify-between mb-8">
                  <Button variant="ghost" onClick={() => setAppState(AppState.IDLE)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Change File
                  </Button>
                  <h2 className="text-xl font-semibold">{audioFile.name}</h2>
               </div>
               
               <WaveformEditor 
                 file={audioFile} 
                 onConfirmRegion={startVisualizer} 
               />
             </div>
           </div>
        )}

        {appState === AppState.VISUALIZING && analyser && (
          <div className="w-full h-full bg-transparent">
             <Visualizer3D 
                analyser={analyser} 
                mode={visualizerMode} 
                isRecording={isRecording}
                onStopRecording={() => setIsRecording(false)}
             />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;