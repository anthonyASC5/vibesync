export interface AudioState {
  file: File | null;
  buffer: AudioBuffer | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export interface Region {
  start: number;
  end: number;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  VISUALIZING = 'VISUALIZING',
}

export enum VisualizerMode {
  ORB = 'ORB',
  TERRAIN = 'TERRAIN',
  PARTY = 'PARTY',
  WALL = 'WALL',
}