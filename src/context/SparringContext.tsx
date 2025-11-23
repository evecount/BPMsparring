
'use client';

import React, { createContext, useState, ReactNode } from 'react';
import type { SparringStats } from '@/lib/types';

type SessionState = 'idle' | 'starting' | 'running' | 'paused' | 'error';

const initialStats: SparringStats = { score: 0, punches: 0, accuracy: 0, streak: 0, bestStreak: 0, avgSpeed: 0 };

interface SparringContextType {
  sessionStats: SparringStats;
  setSessionStats: React.Dispatch<React.SetStateAction<SparringStats>>;
  sessionState: SessionState;
  setSessionState: React.Dispatch<React.SetStateAction<SessionState>>;
}

export const SparringContext = createContext<SparringContextType>({
  sessionStats: initialStats,
  setSessionStats: () => {},
  sessionState: 'idle',
  setSessionState: () => {},
});

export const SparringProvider = ({ children }: { children: ReactNode }) => {
  const [sessionStats, setSessionStats] = useState<SparringStats>(initialStats);
  const [sessionState, setSessionState] = useState<SessionState>('idle');

  return (
    <SparringContext.Provider value={{ sessionStats, setSessionStats, sessionState, setSessionState }}>
      {children}
    </SparringContext.Provider>
  );
};
