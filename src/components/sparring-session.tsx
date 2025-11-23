
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Play, Pause, X, Music, Bot } from 'lucide-react';
import { useHandTracker } from '@/hooks/use-hand-tracker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PUNCH_MAP, TARGET_POSITIONS, TARGET_RADIUS } from '@/lib/constants';
import type { Target, SparringStats, Handedness, ChallengeLevel, BeatMap } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc, Firestore, writeBatch, getDoc } from 'firebase/firestore';
import { suggestCombination } from '@/ai/flows/suggest-combination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { MUSIC_TRACKS } from '@/lib/beat-maps';
import { Textarea } from '@/components/ui/textarea';

type SessionState = 'idle' | 'starting' | 'running' | 'paused' | 'error';

const initialStats: SparringStats = { score: 0, punches: 0, accuracy: 0, streak: 0, bestStreak: 0, avgSpeed: 0 };

const CHALLENGE_LEVELS = {
  Easy: { complexity: 2 },
  Medium: { complexity: 4 },
  Hard: { complexity: 6 },
};

export function SparringSession() {
  const { videoRef, canvasRef, results, loading, error, startTracker, stopTracker } = useHandTracker();
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [targets, setTargets] = useState<Target[]>([]);
  const [combinationHistory, setCombinationHistory] = useState<string[]>([]);
  const [sessionStats, setSessionStats] = useState(initialStats);
  const [isFetchingCombo, setIsFetchingCombo] = useState(false);
  const [challengeLevel, setChallengeLevel] = useState<ChallengeLevel>('Medium');
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_TRACKS[0]);
  const [customPrompt, setCustomPrompt] = useState('');

  const { user } = useUser();
  const firestore = useFirestore() as Firestore;
  const router = useRouter();

  const lastHitTimestamp = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const gameLoopRef = useRef<number>();
  
  const nextPunchIndexRef = useRef(0);

  const nextComboTimeout = useRef<NodeJS.Timeout | null>(null);
  const currentTargetIndex = useRef(0);


  const resetSession = () => {
    setSessionStats(initialStats);
    setTargets([]);
    setCombinationHistory([]);
    currentTargetIndex.current = 0;
    nextPunchIndexRef.current = 0;

    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (nextComboTimeout.current) clearTimeout(nextComboTimeout.current);
  };

  const handleStart = async () => {
    resetSession();
    setSessionState('starting');
    await startTracker();
  };

  const handleStop = async () => {
    stopTracker();
    setSessionState('idle');

    if (user && firestore && sessionStats.punches > 0) {
      const batch = writeBatch(firestore);

      const resultRef = doc(collection(firestore, `users/${user.uid}/results`));
      batch.set(resultRef, {
        userId: user.uid,
        date: serverTimestamp(),
        ...sessionStats,
      });

      const metricsRef = doc(firestore, 'metrics', user.uid);

      try {
        const currentMetricsDoc = await getDoc(metricsRef);
        const currentMetrics = currentMetricsDoc.exists() ? (currentMetricsDoc.data() as SparringStats) : initialStats;

        const newTotalPunches = currentMetrics.punches + sessionStats.punches;
        const newAccuracy =
          newTotalPunches > 0
            ? (currentMetrics.accuracy * currentMetrics.punches + sessionStats.accuracy * sessionStats.punches) / newTotalPunches
            : 0;
        const newAvgSpeed =
          newTotalPunches > 0
            ? (currentMetrics.avgSpeed * currentMetrics.punches + sessionStats.avgSpeed * sessionStats.punches) / newTotalPunches
            : 0;

        batch.set(
          metricsRef,
          {
            score: (currentMetrics.score || 0) + sessionStats.score,
            punches: newTotalPunches,
            bestStreak: Math.max(currentMetrics.bestStreak, sessionStats.bestStreak),
            accuracy: newAccuracy,
            avgSpeed: newAvgSpeed,
          },
          { merge: true }
        );

        await batch.commit();
      } catch (e) {
        console.error('Error updating metrics:', e);
      }
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };
  
  const handlePause = () => {
    setSessionState(ss => {
      if (ss === 'running') {
        if (audioRef.current?.src && selectedMusic.src !== 'none') audioRef.current.pause();
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        if (nextComboTimeout.current) clearTimeout(nextComboTimeout.current);
        return 'paused';
      }
      if (ss === 'paused') {
        if (audioRef.current?.src && selectedMusic.src !== 'none') audioRef.current.play();
        gameLoop();
        return 'running';
      }
      return ss;
    });
  };

  const scheduleNextAICombination = (delay: number) => {
    if (nextComboTimeout.current) {
      clearTimeout(nextComboTimeout.current);
    }
    nextComboTimeout.current = setTimeout(() => {
      fetchNextAICombination();
    }, delay);
  };

  const fetchNextAICombination = useCallback(async () => {
    if (isFetchingCombo || selectedMusic.punches.length > 0) return;
    setIsFetchingCombo(true);
    try {
      const { suggestedCombination } = await suggestCombination({ recentCombinations: combinationHistory.slice(-5), customPrompt: customPrompt });
      const punchKeys = suggestedCombination
        .split(/[-,\s]/)
        .filter(p => PUNCH_MAP[p])
        .slice(0, CHALLENGE_LEVELS[challengeLevel].complexity);

      const newTargets: Target[] = punchKeys.map((key, index) => {
        const punch = PUNCH_MAP[key];
        const position = TARGET_POSITIONS[key];
        return {
          id: `${Date.now()}-${index}`,
          x: position.x,
          y: position.y,
          radius: TARGET_RADIUS,
          hand: punch.hand,
          label: key,
          hit: false,
        };
      });
      setTargets(newTargets);
      setCombinationHistory(prev => [...prev, suggestedCombination]);
      currentTargetIndex.current = 0;
    } catch (e) {
      console.error('Failed to get new combination', e);
      setSessionState('error');
    } finally {
      setIsFetchingCombo(false);
    }
  }, [combinationHistory, challengeLevel, isFetchingCombo, selectedMusic, customPrompt]);

  const gameLoop = useCallback(() => {
    const isChoreographed = selectedMusic.punches.length > 0;
    
    if (isChoreographed) {
      const audio = audioRef.current;
      if (!audio) return;
      
      const currentTime = audio.currentTime;
      const secondsPerBeat = 60 / selectedMusic.bpm;
      const currentBeat = Math.max(0, (currentTime - selectedMusic.offset) / secondsPerBeat);

      const punches = selectedMusic.punches;
      let nextPunch = punches[nextPunchIndexRef.current];

      while (nextPunch && currentBeat >= nextPunch.beat) {
        const punchKey = nextPunch.type;
        const punchDetails = PUNCH_MAP[punchKey];
        if (punchDetails) {
          const position = TARGET_POSITIONS[punchKey];
          const newTarget: Target = {
            id: `${Date.now()}-${punchKey}-${nextPunch.beat}`,
            x: position.x,
            y: position.y,
            radius: TARGET_RADIUS,
            hand: punchDetails.hand,
            label: punchKey,
            hit: false,
          };
          setTargets(prev => [...prev.filter(t => !t.hit), newTarget]); // Clear old targets and add new
        }
        nextPunchIndexRef.current++;
        nextPunch = punches[nextPunchIndexRef.current];
      }
    } else {
      // AI Mode Logic
      if (targets.length > 0 && currentTargetIndex.current >= targets.length && !isFetchingCombo) {
        const beatInterval = (60000 / selectedMusic.bpm) * 4; // 4 beats
        scheduleNextAICombination(beatInterval);
      } else if (targets.length === 0 && !isFetchingCombo) {
        fetchNextAICombination();
      }
    }

    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [selectedMusic, targets, isFetchingCombo, fetchNextAICombination]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !results) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (sessionState !== 'running') return;
    
    // Determine the current target(s)
    const activeTargets = selectedMusic.punches.length > 0 
      ? targets.filter(t => !t.hit)
      : targets.slice(currentTargetIndex.current, currentTargetIndex.current + 1);

    activeTargets.forEach(target => {
      const targetX = target.x * canvas.width;
      const targetY = target.y * canvas.height;

      ctx.beginPath();
      ctx.arc(targetX, targetY, target.radius, 0, 2 * Math.PI);
      ctx.fillStyle = 'hsla(var(--accent) / 0.5)';
      ctx.strokeStyle = 'hsl(var(--accent))';
      ctx.lineWidth = 4;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'hsl(var(--accent-foreground))';
      ctx.font = `bold ${target.radius * 0.8}px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(target.label, targetX, targetY);
    });

    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        const handedness = results.handedness.find(h => h[0].index === results.landmarks.indexOf(landmarks))?.[0]?.categoryName as Handedness | undefined;
        const wrist = landmarks[0]; 

        if (wrist && handedness) {
          const handX = (1 - wrist.x) * canvas.width;
          const handY = wrist.y * canvas.height;

          for (const target of activeTargets) {
            if (handedness === target.hand) {
              const targetX = target.x * canvas.width;
              const targetY = target.y * canvas.height;

              const distance = Math.sqrt(Math.pow(handX - targetX, 2) + Math.pow(handY - targetY, 2));

              if (distance < target.radius) {
                const hitTime = Date.now();
                if (hitTime - lastHitTimestamp.current > 300) { // Debounce hits
                  lastHitTimestamp.current = hitTime;

                  setSessionStats(prev => {
                    const newPunches = prev.punches + 1;
                    const newStreak = prev.streak + 1;
                    const totalPunchesForAcc = prev.punches;
                    const newAccuracy = totalPunchesForAcc > 0 ? (prev.accuracy * (totalPunchesForAcc -1) + 100) / totalPunchesForAcc : 100;

                    return { ...prev, score: prev.score + 10, punches: newPunches, accuracy: newAccuracy, streak: newStreak, bestStreak: Math.max(prev.bestStreak, newStreak) };
                  });

                  if (selectedMusic.punches.length > 0) {
                    setTargets(prev => prev.map(t => t.id === target.id ? { ...t, hit: true } : t));
                  } else {
                    if (currentTargetIndex.current < targets.length - 1) {
                      currentTargetIndex.current++;
                    } else {
                      currentTargetIndex.current++; // Mark combo as finished
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, [results, canvasRef, videoRef, sessionState, targets, selectedMusic]);

  useEffect(() => {
    if (sessionState === 'running') {
      gameLoop();
    } else {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [sessionState, gameLoop]);


  useEffect(() => {
    if (!loading && sessionState === 'starting') {
      setSessionState('running');
      if (audioRef.current?.src && selectedMusic.src !== 'none') {
        audioRef.current.play().catch(e => console.error('Audio play failed:', e));
      }
      // Kick off the game loop as soon as the session is running
      gameLoop();
    }
  }, [loading, sessionState, selectedMusic, gameLoop]);

  useEffect(() => {
    if (error) setSessionState('error');
  }, [error]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = selectedMusic.src !== 'none' ? selectedMusic.src : '';
      audioRef.current.load();
    }
  }, [selectedMusic]);
  
  const handleMusicChange = (value: string) => {
    const track = MUSIC_TRACKS.find(t => t.src === value);
    if(track) setSelectedMusic(track);
  };

  const renderContent = () => {
    if (sessionState === 'error') {
      return (
        <Alert variant="destructive" className="max-w-md glass-panel">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>An Error Occurred</AlertTitle>
          <AlertDescription>{error || 'Something went wrong. Please refresh and try again.'}</AlertDescription>
        </Alert>
      );
    }

    if (sessionState === 'idle') {
      return (
        <div className="text-center p-4 max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight">Ready to Train?</h1>
          <p className="mt-2 text-lg text-foreground">
            Configure your session and get ready to spar with your AI coach. We'll track your hands and give you combinations to throw.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="w-5 h-5" /> Challenge Level (AI Mode)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={(value: ChallengeLevel) => setChallengeLevel(value)} defaultValue={challengeLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Music className="w-5 h-5" /> Music
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={handleMusicChange} defaultValue={selectedMusic.src}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select music" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSIC_TRACKS.map(track => (
                      <SelectItem key={track.src} value={track.src}>
                        {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
          <div className="w-full mt-6">
            <Card className="glass-panel">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Bot className="w-5 h-5" /> Custom AI Prompt
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea 
                        placeholder="e.g., 'Suggest combinations that focus on footwork' or 'Give me combos for a southpaw'"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                    />
                </CardContent>
            </Card>
          </div>

          <Button size="lg" className="mt-8" onClick={handleStart} variant="destructive">
            Start Session
          </Button>
          <audio ref={audioRef} />
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black/50">
        <div className="relative w-full h-full">
          {(sessionState === 'starting' || loading) && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <p className="text-primary-foreground mt-4 text-lg">Starting camera & loading AI model...</p>
            </div>
          )}
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} playsInline />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <Button size="icon" onClick={handleStop} variant="destructive">
              <X />
            </Button>
            <Button size="icon" onClick={handlePause}>
              {sessionState === 'paused' ? <Play /> : <Pause />}
            </Button>
          </div>
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mx-auto">
              <Card className="glass-panel">
                <CardHeader className="p-2 md:p-4">
                  <CardTitle className="text-sm md:text-base">Score</CardTitle>
                </CardHeader>
                <CardContent className="p-2 md:p-4">
                  <p className="text-xl md:text-3xl font-bold">{sessionStats.score}</p>
                </CardContent>
              </Card>
              <Card className="glass-panel">
                <CardHeader className="p-2 md:p-4">
                  <CardTitle className="text-sm md:text-base">Punches</CardTitle>
                </CardHeader>
                <CardContent className="p-2 md:p-4">
                  <p className="text-xl md:text-3xl font-bold">{sessionStats.punches}</p>
                </CardContent>
              </Card>
              <Card className="glass-panel">
                <CardHeader className="p-2 md:p-4">
                  <CardTitle className="text-sm md:text-base">Streak</CardTitle>
                </CardHeader>
                <CardContent className="p-2 md:p-4">
                  <p className="text-xl md:text-3xl font-bold">{sessionStats.streak}</p>
                </CardContent>
              </Card>
              <Card className="glass-panel">
                <CardHeader className="p-2 md:p-4">
                  <CardTitle className="text-sm md:text-base">Accuracy</CardTitle>
                </CardHeader>
                <CardContent className="p-2 md:p-4">
                  <p className="text-xl md:text-3xl font-bold">{sessionStats.accuracy.toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return renderContent();
}
