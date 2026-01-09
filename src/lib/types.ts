
export type Handedness = 'Left' | 'Right';

export interface Punch {
  name: string;
  hand: Handedness;
}

export interface Beat {
  beat: number;
  type: string; // Punch type, e.g., '1' for Jab
}

export interface BeatMap {
  name: string;
  src: string;
  bpm: number;
  offset: number;
  punches: Beat[];
}

    