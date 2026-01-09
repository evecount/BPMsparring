
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Play, X, CameraOff } from 'lucide-react';
import { useHandTracker } from '@/hooks/use-hand-tracker';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { PUNCH_MAP, TARGET_POSITIONS, TARGET_RADIUS } from '@/lib/constants';
import type { Handedness } from '@/lib/types';
import { HandLandmarker } from '@mediapipe/tasks-vision';

type GameState = 'initializing' | 'permission_denied' | 'ready' | 'countdown' | 'playing' | 'error';
type Winner = 'user' | 'ai' | 'tie' | null;


export function RpsSession() {
  const { videoRef, canvasRef, results, loading, error, startTracker, stopTracker } = useHandTracker();
  const [gameState, setGameState] = useState<GameState>('initializing');
  const { toast } = useToast();
  
  const [userScore, setUserScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [activePunch, setActivePunch] = useState<string | null>(null);
  const [lastHitTime, setLastHitTime] = useState<number>(0);

  const gameLoopRef = useRef<number>();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const init = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setGameState('error');
        toast({
          variant: 'destructive',
          title: 'Unsupported Browser',
          description: 'Camera access is not supported by your browser.',
        });
        return;
      }
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        startTracker();
      } catch (err) {
        console.error("Camera permission denied on init:", err);
        setGameState('permission_denied');
      }
    };
    init();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      stopTracker();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseNextPunch = useCallback(() => {
    // Simple logic: pick a random punch. Antigravity will make this smart.
    const punchIds = Object.keys(PUNCH_MAP);
    const nextPunch = punchIds[Math.floor(Math.random() * punchIds.length)];
    setActivePunch(nextPunch);
  }, []);

  const startGameRound = useCallback(() => {
    setUserScore(0);
    setAiScore(0); // Using as streak for now
    setCountdown(3);
    setGameState('countdown');

    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownInterval);
        setGameState('playing');
        chooseNextPunch();
      }
    }, 1000);
  }, [chooseNextPunch]);

  const checkHit = useCallback((hand: Handedness, x: number, y: number) => {
    if (!activePunch) return;

    const punchDetails = PUNCH_MAP[activePunch];
    if (punchDetails.hand !== hand) return; // Wrong hand

    const target = TARGET_POSITIONS[activePunch];
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const targetX = target.x * canvas.width;
    const targetY = target.y * canvas.height;

    // The video is flipped, so we must flip the x-coordinate of the hand.
    const handX = (1 - x) * canvas.width;
    const handY = y * canvas.height;

    const distance = Math.sqrt(Math.pow(handX - targetX, 2) + Math.pow(handY - targetY, 2));

    if (distance < TARGET_RADIUS) {
      //debounce hits
      if (Date.now() - lastHitTime > 500) { // 500ms debounce
        console.log(`Hit detected for ${punchDetails.name}!`);
        setUserScore(score => score + 1);
        setLastHitTime(Date.now());
        chooseNextPunch();
      }
    }
  }, [activePunch, canvasRef, chooseNextPunch, lastHitTime]);


  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Active Target
    if (gameState === 'playing' && activePunch) {
      const pos = TARGET_POSITIONS[activePunch];
      const x = pos.x * canvas.width;
      const y = pos.y * canvas.height;
      
      ctx.beginPath();
      ctx.arc(x, y, TARGET_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = 'hsla(var(--primary), 0.5)';
      ctx.fill();
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = 'hsl(var(--primary-foreground))';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px Orbitron';
      ctx.fillText(PUNCH_MAP[activePunch].name.toUpperCase(), x, y);
    }
    
    // Draw Hand Landmarks and check for hits
    if (results?.landmarks) {
      for (const handLandmarks of results.landmarks) {
        // Find the wrist landmark to determine handedness
        const wrist = handLandmarks[0];
        const handedness = results.handednesses[results.landmarks.indexOf(handLandmarks)][0].categoryName as Handedness;
        
        // We'll use the tip of the middle finger for hit detection
        const fingerTip = handLandmarks[12]; 
        if (fingerTip) {
          checkHit(handedness, fingerTip.x, fingerTip.y);
        }

        // Draw connections
        for (const connection of HandLandmarker.HAND_CONNECTIONS) {
          const start = handLandmarks[connection.start];
          const end = handLandmarks[connection.end];
          if (start && end) {
            ctx.beginPath();
            // Flip horizontally for mirrored video
            ctx.moveTo((1 - start.x) * canvas.width, start.y * canvas.height);
            ctx.lineTo((1 - end.x) * canvas.width, end.y * canvas.height);
            ctx.strokeStyle = 'hsl(var(--foreground))';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
    }
    
    ctx.restore();
    
  }, [canvasRef, videoRef, results, gameState, activePunch, checkHit]);

  const gameLoop = useCallback(() => {
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  useEffect(() => {
    if (!loading && !error && gameState === 'initializing') {
      setGameState('ready');
      gameLoop();
    }
  }, [loading, error, gameState, gameLoop]);


  useEffect(() => {
    if (error) setGameState('error');
  }, [error]);

  const handleStop = () => {
    window.location.reload(); 
  };


  const isSessionActive = ['countdown', 'playing'].includes(gameState);

  return (
    <>
      <div className={cn("w-full h-full flex flex-col items-center justify-center absolute inset-0 z-0 bg-black")}>
        <div className={cn("relative w-full h-full")}>
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover z-10" style={{ transform: 'scaleX(-1)' }} playsInline autoPlay muted/>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-20" />
        </div>
      </div>
      
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4">
        
        {gameState === 'initializing' && (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-16 h-16 animate-spin text-primary" />
            <p className="text-foreground mt-4 text-lg">
              Initializing Bio-Temporal Link...
            </p>
          </div>
        )}

        {gameState === 'ready' && (
           <div className="text-center p-4 max-w-2xl mx-auto glass-panel rounded-lg">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary">Engage the Edge of Now</h1>
            <p className="mt-4 text-lg sm:text-xl text-foreground/80">
              You are entering a reactive feedback loop. The system syncs with your physical state, not a button click. This is a test of a new AI paradigm.
            </p>
            <Button size="lg" className="mt-8" onClick={startGameRound} variant="destructive">
              <Play className="mr-2 h-4 w-4" />
              Begin Synchronization
            </Button>
          </div>
        )}

        {gameState === 'permission_denied' && (
           <div className="text-center p-4 max-w-2xl mx-auto glass-panel rounded-lg">
              <CameraOff className="mx-auto h-16 w-16 text-destructive" />
              <h1 className="text-3xl font-bold tracking-tight mt-4">Camera Access Denied</h1>
              <p className="mt-2 text-lg text-foreground/80">
                This experience requires camera access. Please enable camera permissions in your browser settings and refresh the page.
              </p>
           </div>
        )}


        {isSessionActive && (
          <>
            <div className="absolute top-4 left-4 z-30 flex gap-2">
              <Button size="icon" onClick={handleStop} variant="destructive">
                <X />
              </Button>
            </div>

            <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-8 pointer-events-none">
              <div className="w-full grid grid-cols-2 gap-4 max-w-sm">
                  <Card className="glass-panel">
                    <CardContent className="p-4 flex flex-col items-center">
                      <p className="text-sm text-muted-foreground">SCORE</p>
                      <p className="text-5xl font-bold">{userScore}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-panel">
                    <CardContent className="p-4 flex flex-col items-center">
                      <p className="text-sm text-muted-foreground">STREAK</p>
                      <p className="text-5xl font-bold">{aiScore}</p>
                    </CardContent>
                  </Card>
              </div>
              
              <div className="flex flex-col items-center">
                {gameState === 'countdown' && <div className="text-9xl font-bold animate-ping">{countdown}</div>}
              </div>

              <div></div>
            </div>
          </>
        )}
        
        {gameState === 'error' && (
          <Alert variant="destructive" className="max-w-md glass-panel">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>An Error Occurred</AlertTitle>
            <AlertDescription>{error || 'Something went wrong. Please refresh and try again.'}</AlertDescription>
            <Button onClick={() => window.location.reload()} className="mt-4">Refresh Page</Button>
          </Alert>
        )}
      </div>
    </>
  );
}
