
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Play, Pause, X, Hand, Bot } from 'lucide-react';
import { useHandTracker } from '@/hooks/use-hand-tracker';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getAiMove } from '@/ai/flows/get-ai-move';
import { Card, CardContent } from './ui/card';

type Gesture = 'rock' | 'paper' | 'scissors' | 'unknown';
type GameState = 'idle' | 'starting' | 'countdown' | 'playing' | 'result' | 'error';
type Winner = 'user' | 'ai' | 'tie' | null;

// Simple gesture detection based on finger extension.
// This is a basic implementation that Antigravity can evolve.
function detectGesture(landmarks: HandLandmarkerResult['landmarks'][0]): Gesture {
  if (!landmarks || landmarks.length === 0) return 'unknown';

  const isThumbOpen = landmarks[4].x < landmarks[3].x;
  const areFingersOpen =
    landmarks[8].y < landmarks[6].y && // Index finger
    landmarks[12].y < landmarks[10].y && // Middle finger
    landmarks[16].y < landmarks[14].y && // Ring finger
    landmarks[20].y < landmarks[18].y; // Pinky finger

  const isIndexAndMiddleOpen =
    landmarks[8].y < landmarks[6].y &&
    landmarks[12].y < landmarks[10].y &&
    landmarks[16].y > landmarks[14].y &&
    landmarks[20].y > landmarks[18].y;

  if (areFingersOpen) return 'paper';
  if (isIndexAndMiddleOpen) return 'scissors';
  if (!areFingersOpen && !isThumbOpen) return 'rock';

  return 'unknown';
}

function determineWinner(userMove: Gesture, aiMove: Gesture): Winner {
  if (userMove === aiMove) return 'tie';
  if (
    (userMove === 'rock' && aiMove === 'scissors') ||
    (userMove === 'scissors' && aiMove === 'paper') ||
    (userMove === 'paper' && aiMove === 'rock')
  ) {
    return 'user';
  }
  return 'ai';
}

export function RpsSession() {
  const { videoRef, canvasRef, results, loading, error, startTracker, stopTracker } = useHandTracker();
  const [gameState, setGameState] = useState<GameState>('idle');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const { toast } = useToast();
  
  const [userMove, setUserMove] = useState<Gesture>('unknown');
  const [aiMove, setAiMove] = useState<Gesture>('unknown');
  const [winner, setWinner] = useState<Winner>(null);
  const [userScore, setUserScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const gameLoopRef = useRef<number>();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      stopTracker();
    };
  }, [stopTracker]);

  const requestCamera = async () => {
    if (hasCameraPermission) return true;
    if (typeof hasCameraPermission === 'boolean' && !hasCameraPermission) return false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera access is not supported by your browser.");
      setHasCameraPermission(false);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings to use this app.',
      });
      return false;
    }
  };

  const handleStart = async () => {
    const gotPermission = await requestCamera();
    if (!gotPermission) return;
    
    setGameState('starting');
    setUserScore(0);
    setAiScore(0);
    await startTracker();
  };

  const handleStop = () => {
    stopTracker();
    setGameState('idle');
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
  
  const startGameRound = () => {
    setWinner(null);
    setUserMove('unknown');
    setAiMove('unknown');
    setCountdown(3);
    setGameState('countdown');

    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(countdownInterval);
        setGameState('playing');
        
        // "SHOOT" - AI makes its move, user has a short window
        timeoutRef.current = setTimeout(async () => {
          const detectedGesture = results?.landmarks[0] ? detectGesture(results.landmarks[0]) : 'unknown';
          const finalUserMove = detectedGesture === 'unknown' ? 'rock' : detectedGesture; // Default to rock if undetected
          setUserMove(finalUserMove);
          
          const { aiMove: newAiMove } = await getAiMove({ userHistory: [] });
          setAiMove(newAiMove);

          const roundWinner = determineWinner(finalUserMove, newAiMove);
          setWinner(roundWinner);
          if (roundWinner === 'user') setUserScore(s => s + 1);
          if (roundWinner === 'ai') setAiScore(s => s + 1);

          setGameState('result');
          
          // Reset for next round
          timeoutRef.current = setTimeout(startGameRound, 3000);

        }, 1000); // 1 second to "shoot"
      }
    }, 1000);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, [canvasRef, videoRef]);

  const gameLoop = useCallback(() => {
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  useEffect(() => {
    if (!loading && gameState === 'starting' && hasCameraPermission) {
      startGameRound();
      gameLoop();
    }
  }, [loading, gameState, hasCameraPermission, gameLoop]);

  useEffect(() => {
    if (error) setGameState('error');
  }, [error]);

  const isSessionActive = ['starting', 'countdown', 'playing', 'result'].includes(gameState);

  const renderGestureIcon = (gesture: Gesture, size = 'w-24 h-24') => {
    const iconClass = cn('text-foreground', size);
    if (gesture === 'rock') return <Hand className={cn(iconClass, 'rotate-90')} />;
    if (gesture === 'paper') return <Hand className={iconClass} />;
    if (gesture === 'scissors') return <Hand className={cn(iconClass, 'rotate-90')} style={{ transform: 'scaleX(-1) rotate(90deg) scaleY(0.7)' }} />;
    return <div className={cn(size, "flex items-center justify-center text-5xl")}>?</div>
  }
  
  return (
    <>
      <div className={cn("w-full h-full flex flex-col items-center justify-center bg-black/50 absolute inset-0 z-10", isSessionActive ? "flex" : "hidden")}>
        <div className="relative w-full h-full">
          {(gameState === 'starting' || loading) && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-30">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <p className="text-primary-foreground mt-4 text-lg">Loading Reactive AI...</p>
            </div>
          )}
          
          <video ref={videoRef} className={cn("absolute inset-0 w-full h-full object-cover z-10", {"hidden": !isSessionActive})} style={{ transform: 'scaleX(-1)' }} playsInline autoPlay muted/>
          <canvas ref={canvasRef} className={cn("absolute inset-0 w-full h-full object-cover z-20", {"hidden": !isSessionActive})} />

          {isSessionActive && (
             <div className="absolute top-4 left-4 z-30 flex gap-2">
                <Button size="icon" onClick={handleStop} variant="destructive">
                  <X />
                </Button>
              </div>
          )}

          <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-8">
            {/* Scoreboard */}
            <div className="w-full grid grid-cols-2 gap-4 max-w-sm">
                <Card className="glass-panel">
                  <CardContent className="p-4 flex flex-col items-center">
                    <p className="text-sm text-muted-foreground">YOU</p>
                    <p className="text-5xl font-bold">{userScore}</p>
                  </CardContent>
                </Card>
                <Card className="glass-panel">
                  <CardContent className="p-4 flex flex-col items-center">
                    <p className="text-sm text-muted-foreground">AI</p>
                    <p className="text-5xl font-bold">{aiScore}</p>
                  </CardContent>
                </Card>
            </div>
            
            {/* Game State Display */}
            <div className="flex flex-col items-center">
              {gameState === 'countdown' && <div className="text-9xl font-bold animate-ping">{countdown}</div>}
              {gameState === 'playing' && <div className="text-9xl font-bold text-destructive">SHOOT!</div>}
              {gameState === 'result' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="text-6xl font-bold">
                    {winner === 'user' && "YOU WIN"}
                    {winner === 'ai' && "AI WINS"}
                    {winner === 'tie' && "TIE"}
                  </div>
                  <div className="flex gap-16 items-center">
                    <div>
                      <p className="text-center text-muted-foreground mb-2">You</p>
                      {renderGestureIcon(userMove)}
                    </div>
                     <div>
                      <p className="text-center text-muted-foreground mb-2">AI</p>
                      {renderGestureIcon(aiMove)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Empty div for spacing */}
            <div></div>
          </div>
        </div>
      </div>
      
      {gameState === 'idle' && (
        <div className="text-center p-4 max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight">ANTIGRAVITY-ZERO</h1>
          <p className="mt-2 text-lg text-foreground">
            A demonstration of a reactive AI feedback loop. Play Rock-Paper-Scissors against a temporal AI opponent in real-time.
          </p>

          <Button size="lg" className="mt-8" onClick={handleStart} variant="destructive" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Start Session
          </Button>
           {hasCameraPermission === false && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>
                  Please enable camera permissions in your browser settings to use this app. You may need to refresh the page.
                </AlertDescription>
              </Alert>
          )}
        </div>
      )}
      
      {gameState === 'error' && (
        <Alert variant="destructive" className="max-w-md glass-panel">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>An Error Occurred</AlertTitle>
          <AlertDescription>{error || 'Something went wrong. Please refresh and try again.'}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
