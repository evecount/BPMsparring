
export type SparringStats = {
  score: number;
  punches: number;
  accuracy: number; // as a percentage
  streak: number;
  bestStreak: number;
  avgSpeed: number; // in ms per punch
};

export type Handedness = 'Left' | 'Right';

export type Target = {
  id: string;
  x: number;
  y: number;
  radius: number;
  hand: Handedness;
  label: string; // e.g., '1' for Jab
  hit: boolean;
};

export type Punch = {
  name: string; // 'Jab', 'Cross', etc.
  hand: Handedness;
};

export type ChallengeLevel = "Easy" | "Medium" | "Hard";

export type ChoreographedPunch = {
  beat: number;
  type: string; // Corresponds to a key in PUNCH_MAP
};

export type BeatMap = {
  name: string;
  src: string;
  bpm: number;
  offset: number; // Seconds before the first beat
  punches: ChoreographedPunch[];
};
