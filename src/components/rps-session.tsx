
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Play, X, CameraOff } from 'lucide-react';
import { useHandTracker } from '@/hooks/use-hand-tracker';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';

type GameState = 'initializing' | 'permission_denied' | 'ready' | 'countdown' | 'playing' | 'error';
type Winner = 'user' | 'ai' | 'tie' | null;


export function RpsSession() {
  const { videoRef, canvasRef, results, loading, error, startTracker, stopTracker } = useHandTracker();
  const [gameState, setGameState] = useState<GameState>('initializing');
  const { toast } = useToast();
  
  const [userScore, setUserScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const gameLoopRef = useRef<number>();
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Immediately request camera and start tracker on component mount
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Stop this initial stream, hook will start its own
        startTracker(); // This will handle the stream and landmarker loading
      } catch (err) {
        console.error("Camera permission denied on init:", err);
        setGameState('permission_denied');
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions to start the session.',
        });
      }
    };
    init();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      stopTracker();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopTracker]);


  const startGameRound = useCallback(() => {
    setCountdown(3);
    setGameState('countdown');

    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownInterval);
        setGameState('playing');
        
        timeoutRef.current = setTimeout(() => {
          // Placeholder for game logic
          console.log("Shoot!");
          // Reset for next round
          timeoutRef.current = setTimeout(startGameRound, 3000);

        }, 1000); // 1 second to "shoot"
      }
    }, 1000);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !results) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // No need to draw video on canvas, video is visible below it
    ctx.restore();
    
  }, [canvasRef, videoRef, results]);

  const gameLoop = useCallback(() => {
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  useEffect(() => {
    // When tracker is no longer loading and not in an error state, it's ready.
    if (!loading && !error && gameState === 'initializing') {
      setGameState('ready');
      gameLoop();
    }
  }, [loading, error, gameState, gameLoop]);


  useEffect(() => {
    if (error) setGameState('error');
  }, [error]);

  const handleStop = () => {
    // This function might need to reset the app state more gracefully
    window.location.reload(); 
  };


  const isSessionActive = ['countdown', 'playing'].includes(gameState);

  return (
    <>
      <div className={cn("w-full h-full flex flex-col items-center justify-center absolute inset-0 z-0 bg-black")}>
         {/* Video and Canvas are always in the DOM */}
        <div className={cn("relative w-full h-full")}>
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover z-10" style={{ transform: 'scaleX(-1)' }} playsInline autoPlay muted/>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-20" />
        </div>
      </div>
      
      {/* UI Overlay */}
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4">
        
        {gameState === 'initializing' && (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-16 h-16 animate-spin text-primary" />
            <p className="text-foreground mt-4 text-lg">
              Loading Reactive AI...
            </p>
          </div>
        )}

        {gameState === 'ready' && (
          <div className="text-center p-4 max-w-2xl mx-auto glass-panel rounded-lg">
            <h1 className="text-4xl font-bold tracking-tight">ANTIGRAVITY-ZERO</h1>
            <p className="mt-2 text-lg text-foreground/80">
              A reactive sparring partner that pushes your speed and precision.
            </p>
            <Button size="lg" className="mt-8" onClick={startGameRound} variant="destructive">
              <Play className="mr-2 h-4 w-4" />
              Start Session
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
              {/* Scoreboard */}
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
              
              {/* Game State Display */}
              <div className="flex flex-col items-center">
                {gameState === 'countdown' && <div className="text-9xl font-bold animate-ping">{countdown}</div>}
              </div>

              {/* Empty div for spacing */}
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
