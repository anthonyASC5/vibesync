import React from 'react';
import { VisualizerOrb } from './VisualizerOrb';
import { VisualizerTerrain } from './VisualizerTerrain';
import { VisualizerCrowd } from './VisualizerCrowd';
import { VisualizerWall } from './VisualizerWall';
import { VisualizerMode } from '../../types';

interface VisualizerSceneProps {
  analyser: AnalyserNode;
  mode: VisualizerMode;
}

export const VisualizerScene: React.FC<VisualizerSceneProps> = ({ analyser, mode }) => {
  return (
    <>
      {mode === VisualizerMode.ORB && <VisualizerOrb analyser={analyser} />}
      {mode === VisualizerMode.TERRAIN && <VisualizerTerrain analyser={analyser} />}
      {mode === VisualizerMode.PARTY && <VisualizerCrowd analyser={analyser} />}
      {mode === VisualizerMode.WALL && <VisualizerWall analyser={analyser} />}
    </>
  );
};