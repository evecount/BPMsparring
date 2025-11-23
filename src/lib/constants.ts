import type { Punch } from './types';

export const PUNCH_MAP: { [key: string]: Punch } = {
  '1': { name: 'Jab', hand: 'Left' },
  '2': { name: 'Cross', hand: 'Right' },
  '3': { name: 'Left Hook', hand: 'Left' },
  '4': { name: 'Right Hook', hand: 'Right' },
  '5': { name: 'Left Uppercut', hand: 'Left' },
  '6': { name: 'Right Uppercut', hand: 'Right' },
};

export const TARGET_RADIUS = 60; // in pixels

// Positions as percentages of canvas width/height
export const TARGET_POSITIONS: { [key: string]: { x: number; y: number } } = {
  '1': { x: 0.6, y: 0.4 },   // Jab
  '2': { x: 0.4, y: 0.4 },   // Cross
  '3': { x: 0.75, y: 0.5 },  // Left Hook
  '4': { x: 0.25, y: 0.5 },  // Right Hook
  '5': { x: 0.55, y: 0.65 }, // Left Uppercut
  '6': { x: 0.45, y: 0.65 }, // Right Uppercut
};

export const HAND_TRACKER_MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export const LOCAL_STORAGE_STATS_KEY = 'digital-spar-stats';
