"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, CameraOff, Play, Pause, X } from "lucide-react";
import { useHandTracker } from "@/hooks/use-hand-tracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PUNCH_MAP, TARGET_POSITIONS, TARGET_RADIUS, LOCAL_STORAGE_STATS_KEY } from "@/lib/constants";
import type { Target, SparringStats, Handedness } from "@/lib/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { suggestCombination } from "@/ai/flows/suggest-combination";

type SessionState = "idle" | "starting" | "running" | "paused" | "finished" | "error";

const initialStats: SparringStats = { score: 0, punches: 0, accuracy: 0, streak: 0, bestStreak: 0, avgSpeed: 0 };

export function SparringSession() {
  const { videoRef, canvasRef, results, loading, error, startTracker, stopTracker } = useHandTracker();
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [targets, setTargets] = useState<Target[]>([]);
  const [combinationHistory, setCombinationHistory] = useState<string[]>([]);
  const [stats, setStats] = useLocalStorage<SparringStats>(LOCAL_STORAGE_STATS_KEY, initialStats);
  const [sessionStats, setSessionStats] = useState(initialStats);
  const [isFetchingCombo, setIsFetchingCombo] = useState(false);

  const currentTargetIndex = useRef(0);
  const lastHitTimestamp = useRef(0);

  const resetSession = () => {
    setSessionStats(initialStats);
    setTargets([]);
    setCombinationHistory([]);
    currentTargetIndex.current = 0;
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
      // A more complex averaging would be needed for accuracy and speed across sessions
      accuracy: sessionStats.punches > 0 ? ((prevStats.accuracy * prevStats.punches + sessionStats.accuracy * sessionStats.punches) / (prevStats.punches + sessionStats.punches)) : prevStats.accuracy,
      avgSpeed: sessionStats.punches > 0 ? ((prevStats.avgSpeed * prevStats.punches + sessionStats.avgSpeed * sessionStats.punches) / (prevStats.punches + sessionStats.punches)) : prevStats.avgSpeed,
      streak: 0,
    }));
  };

  const handlePause = () => {
    setSessionState(ss => (ss === "running" ? "paused" : "running"));
  }

  const fetchNextCombination = useCallback(async () => {
    setIsFetchingCombo(true);
    try {
      const { suggestedCombination } = await suggestCombination({ recentCombinations: combinationHistory.slice(-5) });
      const punchKeys = suggestedCombination.split(/[-,\s]/).filter(p => PUNCH_MAP[p]);
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
  }, [combinationHistory]);

  useEffect(() => {
    if (sessionState === "running" && targets.length === 0 && !isFetchingCombo) {
      fetchNextCombination();
    }
  }, [sessionState, targets, isFetchingCombo, fetchNextCombination]);
  
  useEffect(() => {
    if(!loading && sessionState === 'starting') {
        setSessionState('running');
    }
  }, [loading, sessionState]);

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
                fetchNextCombination();
              }
            }
          }
        }
      }
    }
  }, [results, canvasRef, videoRef, sessionState, targets, fetchNextCombination]);
  
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
        <div className="text-center p-4">
            <h1 className="text-4xl font-bold tracking-tight">Ready to Train?</h1>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">Allow camera access and get ready to spar with your AI coach. We'll track your hands and give you combinations to throw.</p>
            <Button size="lg" className="mt-8" onClick={handleStart}>
                Start Session
            </Button>
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
