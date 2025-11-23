
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, CameraOff, Play, Pause, X, Music, Bot } from "lucide-react";
import { useHandTracker } from "@/hooks/use-hand-tracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PUNCH_MAP, TARGET_POSITIONS, TARGET_RADIUS, LOCAL_STORAGE_STATS_KEY } from "@/lib/constants";
import type { Target, SparringStats, Handedness, ChallengeLevel } from "@/lib/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { suggestCombination } from "@/ai/flows/suggest-combination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SessionState = "idle" | "starting" | "running" | "paused" | "finished" | "error";

const initialStats: SparringStats = { score: 0, punches: 0, accuracy: 0, streak: 0, bestStreak: 0, avgSpeed: 0 };

const CHALLENGE_LEVELS: Record<ChallengeLevel, { speed: number; complexity: number }> = {
  Easy: { speed: 1500, complexity: 3 },
  Medium: { speed: 1000, complexity: 5 },
  Hard: { speed: 700, complexity: 7 },
};

const MUSIC_TRACKS = [
    { name: "No Music", src: "none" },
    { name: "Mission Ready", src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/cc_by/Ketsa/Raising_Frequecies/Ketsa_-_03_-_Mission_Ready.mp3" },
    { name: "The 90s", src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Monk/The_Sagat/Monk_-_09_-_The_90s.mp3" },
    { name: "Enthusiast", src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/cc_by/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3" },
];

export function SparringSession() {
  const { videoRef, canvasRef, results, loading, error, startTracker, stopTracker } = useHandTracker();
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [targets, setTargets] = useState<Target[]>([]);
  const [combinationHistory, setCombinationHistory] = useState<string[]>([]);
  const [stats, setStats] = useLocalStorage<SparringStats>(LOCAL_STORAGE_STATS_KEY, initialStats);
  const [sessionStats, setSessionStats] = useState(initialStats);
  const [isFetchingCombo, setIsFetchingCombo] = useState(false);
  const [challengeLevel, setChallengeLevel] = useState<ChallengeLevel>("Medium");
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_TRACKS[0].src);

  const currentTargetIndex = useRef(0);
  const lastHitTimestamp = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const nextComboTimeout = useRef<NodeJS.Timeout | null>(null);


  const resetSession = () => {
    setSessionStats(initialStats);
    setTargets([]);
    setCombinationHistory([]);
    currentTargetIndex.current = 0;
    if (nextComboTimeout.current) {
        clearTimeout(nextComboTimeout.current);
    }
  };

  const handleStart = async () => {
    resetSession();
    setSessionState("starting");
    await startTracker();
  };
  
  const handleStop = () => {
    stopTracker();
    setSessionState("idle");
    setStats(prevStats => ({
      score: prevStats.score + sessionStats.score,
      punches: prevStats.punches + sessionStats.punches,
      bestStreak: Math.max(prevStats.bestStreak, sessionStats.bestStreak),
      accuracy: sessionStats.punches > 0 ? ((prevStats.accuracy * prevStats.punches + sessionStats.accuracy * sessionStats.punches) / (prevStats.punches + sessionStats.punches)) : prevStats.accuracy,
      avgSpeed: sessionStats.punches > 0 ? ((prevStats.avgSpeed * prevStats.punches + sessionStats.avgSpeed * sessionStats.punches) / (prevStats.punches + sessionStats.punches)) : prevStats.avgSpeed,
      streak: 0,
    }));
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
  };

  const handlePause = () => {
    setSessionState(ss => {
        if (ss === "running") {
            if (audioRef.current?.src && selectedMusic !== "none") audioRef.current.pause();
            if(nextComboTimeout.current) clearTimeout(nextComboTimeout.current);
            return "paused";
        }
        if (ss === "paused") {
            if (audioRef.current?.src && selectedMusic !== "none") audioRef.current.play();
            scheduleNextCombination(0);
            return "running";
        }
        return ss;
    });
  }

  const scheduleNextCombination = (delay: number) => {
    if (nextComboTimeout.current) {
      clearTimeout(nextComboTimeout.current);
    }
    nextComboTimeout.current = setTimeout(() => {
        fetchNextCombination();
    }, delay);
  }

  const fetchNextCombination = useCallback(async () => {
    setIsFetchingCombo(true);
    try {
      const { suggestedCombination } = await suggestCombination({ recentCombinations: combinationHistory.slice(-5) });
      const punchKeys = suggestedCombination.split(/[-,\s]/).filter(p => PUNCH_MAP[p]).slice(0, CHALLENGE_LEVELS[challengeLevel].complexity);
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
      console.error("Failed to get new combination", e);
      setSessionState("error");
    } finally {
      setIsFetchingCombo(false);
    }
  }, [combinationHistory, challengeLevel]);

  useEffect(() => {
    if (sessionState === "running" && targets.length > 0 && currentTargetIndex.current >= targets.length && !isFetchingCombo) {
        scheduleNextCombination(CHALLENGE_LEVELS[challengeLevel].speed);
    }
  }, [sessionState, targets, isFetchingCombo, fetchNextCombination, challengeLevel]);

  useEffect(() => {
    if (sessionState === "running" && targets.length === 0 && !isFetchingCombo) {
        fetchNextCombination();
    }
  }, [sessionState, targets.length, isFetchingCombo, fetchNextCombination]);
  
  useEffect(() => {
    if(!loading && sessionState === 'starting') {
        setSessionState('running');
        if (audioRef.current?.src && selectedMusic !== "none") {
            audioRef.current.play();
        }
    }
  }, [loading, sessionState, selectedMusic]);

  useEffect(() => {
    if (error) setSessionState("error");
  }, [error]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !results) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw mirrored video
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (sessionState !== "running") return;

    const currentTarget = targets[currentTargetIndex.current];
    if (currentTarget) {
      const targetX = currentTarget.x * canvas.width;
      const targetY = currentTarget.y * canvas.height;
      
      ctx.beginPath();
      ctx.arc(targetX, targetY, currentTarget.radius, 0, 2 * Math.PI);
      ctx.fillStyle = "hsla(var(--accent) / 0.5)";
      ctx.strokeStyle = "hsl(var(--accent))";
      ctx.lineWidth = 4;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "hsl(var(--accent-foreground))";
      ctx.font = `bold ${currentTarget.radius * 0.8}px 'Inter', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(currentTarget.label, targetX, targetY);
    }

    if (results.landmarks) {
      for (let i = 0; i < results.landmarks.length; i++) {
        const landmarks = results.landmarks[i];
        const handedness = results.handedness[i]?.[0]?.categoryName as Handedness;
        const wrist = landmarks[0]; // Wrist landmark
        
        if (wrist && currentTarget && handedness === currentTarget.hand) {
          const handX = (1 - wrist.x) * canvas.width;
          const handY = wrist.y * canvas.height;
          const targetX = currentTarget.x * canvas.width;
          const targetY = currentTarget.y * canvas.height;

          const distance = Math.sqrt(Math.pow(handX - targetX, 2) + Math.pow(handY - targetY, 2));

          if (distance < currentTarget.radius) {
            const hitTime = Date.now();
            if (hitTime - lastHitTimestamp.current > 500) { // 500ms cooldown
              lastHitTimestamp.current = hitTime;
              
              setSessionStats(prev => {
                const newPunches = prev.punches + 1;
                const newStreak = prev.streak + 1;
                return {
                    ...prev,
                    score: prev.score + 10,
                    punches: newPunches,
                    accuracy: ((prev.accuracy * prev.punches + 100) / newPunches),
                    streak: newStreak,
                    bestStreak: Math.max(prev.bestStreak, newStreak),
                }
              });

              if (currentTargetIndex.current < targets.length - 1) {
                currentTargetIndex.current++;
              } else {
                currentTargetIndex.current++; // Move past the last target
                scheduleNextCombination(CHALLENGE_LEVELS[challengeLevel].speed);
              }
            }
          }
        }
      }
    }
  }, [results, canvasRef, videoRef, sessionState, targets, challengeLevel]);
  
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      draw();
      animationFrameId = requestAnimationFrame(animate);
    };
    if (sessionState === "running" || sessionState === "paused") {
      animate();
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [draw, sessionState]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.src = selectedMusic !== "none" ? selectedMusic : "";
    }
  }, [selectedMusic]);

  const renderContent = () => {
    if (sessionState === "error") {
      return (
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>An Error Occurred</AlertTitle>
          <AlertDescription>{error || "Something went wrong. Please refresh and try again."}</AlertDescription>
        </Alert>
      );
    }

    if (sessionState === "idle") {
      return (
        <div className="text-center p-4 max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight">Ready to Train?</h1>
            <p className="text-muted-foreground mt-2">Configure your session and get ready to spar with your AI coach. We'll track your hands and give you combinations to throw.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Bot className="w-5 h-5"/> Challenge Level</CardTitle>
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
               <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Music className="w-5 h-5"/> Music</CardTitle>
                </CardHeader>
                <CardContent>
                   <Select onValueChange={setSelectedMusic} defaultValue={selectedMusic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select music" />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSIC_TRACKS.map(track => (
                        <SelectItem key={track.src} value={track.src}>{track.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            <Button size="lg" className="mt-8" onClick={handleStart}>
                Start Session
            </Button>
            <audio ref={audioRef} loop />
        </div>
      );
    }
    
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black">
            <div className="relative w-full h-full">
                {(sessionState === "starting" || loading) && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20">
                        <Loader2 className="w-16 h-16 animate-spin text-primary-foreground" />
                        <p className="text-primary-foreground mt-4 text-lg">Starting camera & loading AI model...</p>
                    </div>
                )}
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" style={{ display: 'none' }} playsInline />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <Button size="icon" onClick={handleStop} variant="destructive">
                        <X />
                    </Button>
                    <Button size="icon" onClick={handlePause}>
                        {sessionState === 'paused' ? <Play/> : <Pause/>}
                    </Button>
                </div>
                 <div className="absolute bottom-4 left-4 right-4 z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mx-auto">
                        <Card className="bg-black/50 text-white">
                            <CardHeader className="p-2 md:p-4"><CardTitle className="text-sm md:text-base">Score</CardTitle></CardHeader>
                            <CardContent className="p-2 md:p-4"><p className="text-xl md:text-3xl font-bold">{sessionStats.score}</p></CardContent>
                        </Card>
                        <Card className="bg-black/50 text-white">
                            <CardHeader className="p-2 md:p-4"><CardTitle className="text-sm md:text-base">Punches</CardTitle></CardHeader>
                            <CardContent className="p-2 md:p-4"><p className="text-xl md:text-3xl font-bold">{sessionStats.punches}</p></CardContent>
                        </Card>
                        <Card className="bg-black/50 text-white">
                            <CardHeader className="p-2 md:p-4"><CardTitle className="text-sm md:text-base">Streak</CardTitle></CardHeader>
                            <CardContent className="p-2 md:p-4"><p className="text-xl md:text-3xl font-bold">{sessionStats.streak}</p></CardContent>
                        </Card>
                        <Card className="bg-black/50 text-white">
                            <CardHeader className="p-2 md:p-4"><CardTitle className="text-sm md:text-base">Accuracy</CardTitle></CardHeader>
                            <CardContent className="p-2 md:p-4"><p className="text-xl md:text-3xl font-bold">{sessionStats.accuracy.toFixed(1)}%</p></CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return renderContent();
}

    