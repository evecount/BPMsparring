import type { BeatMap } from './types';

// A simple choreographed beat map for the "Mission Ready" track.
// This can be expanded significantly.
const missionReadyPunches: BeatMap['punches'] = [
  // Intro
  { beat: 4, type: '1' },
  { beat: 5, type: '2' },
  { beat: 6, type: '1' },
  { beat: 7, type: '2' },

  // First phrase
  { beat: 8, type: '1' },
  { beat: 8.5, type: '1' },
  { beat: 9, type: '2' },
  { beat: 10, type: '3' },
  { beat: 11, type: '4' },

  // Second phrase
  { beat: 12, type: '1' },
  { beat: 13, type: '2' },
  { beat: 14, type: '5' },
  { beat: 15, type: '6' },
  
  // Repeat with variation
  { beat: 16, type: '1' },
  { beat: 16.5, type: '2' },
  { beat: 17, type: '1' },
  { beat: 17.5, type: '2' },
  { beat: 18, type: '3' },
  { beat: 19, type: '4' },
  
  // Quick succession
  { beat: 20, type: '1' },
  { beat: 20.25, type: '1' },
  { beat: 20.5, type: '2' },
  { beat: 20.75, type: '2' },
  
  { beat: 22, type: '3' },
  { beat: 22.5, type: '4' },
  { beat: 23, type: '5' },
  { beat: 23.5, type: '6' },
];


export const MUSIC_TRACKS: BeatMap[] = [
  { 
    name: 'No Music (AI Mode)', 
    src: 'none', 
    bpm: 120, // Default BPM for AI mode without music
    offset: 0,
    punches: [], // Empty array signifies AI-driven mode
  },
  { 
    name: 'Mission Ready (Choreographed)', 
    src: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/cc_by/Ketsa/Raising_Frequecies/Ketsa_-_03_-_Mission_Ready.mp3', 
    bpm: 120,
    offset: 0.5,
    punches: missionReadyPunches, 
  },
  { 
    name: 'The 90s (AI)', 
    src: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Monk/The_Sagat/Monk_-_09_-_The_90s.mp3', 
    bpm: 100,
    offset: 0,
    punches: [],
  },
  { 
    name: 'Enthusiast (AI)', 
    src: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/cc_by/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3', 
    bpm: 130,
    offset: 0,
    punches: [],
  },
];
