
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
import type { Handedness, BeatMap } from '@/lib/types';
import { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { MUSIC_TRACKS } from '@/lib/beat-maps';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type GameState = 'initializing' | 'ready' | 'countdown' | 'playing' | 'error' | 'permission_denied';

export function RpsSession() {
  const { toast } = useToast();
  const { videoRef, canvasRef, handLandmarker, loading: modelLoading, error: modelError } = useHandTracker();
  
  const [gameState, setGameState] = useState<GameState>('initializing');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const [userScore, setUserScore] = useState(0);
  const [aiScore, setAiScore] = useState(0); // Using as streak
  const [countdown, setCountdown] = useState<number | null>(null);

  const [activePunch, setActivePunch] = useState<string | null>(null);
  const [lastHitTime, setLastHitTime] = useState<number>(0);
  
  const [selectedTrack, setSelectedTrack] = useState<BeatMap>(MUSIC_TRACKS[0]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const gameLoopRef = useRef<number>();
  const isRunning = useRef(false);

  // 1. Effect for Camera Permissions
  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setGameState('error');
        setHasCameraPermission(false);
        console.error("Camera access is not supported by this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
             setHasCameraPermission(true);
             isRunning.current = true;
          });
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setGameState('permission_denied');
      }
    };

    getCameraPermission();

     return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
     }
  }, [videoRef]);

  const chooseNextPunch = useCallback(() => {
    const punchIds = Object.keys(PUNCH_MAP);
    const nextPunch = punchIds[Math.floor(Math.random() * punchIds.length)];
    setActivePunch(nextPunch);
  }, []);

  const checkHit = useCallback((handedness: Handedness, x: number, y: number, currentActivePunch: string | null, canvas: HTMLCanvasElement) => {
    if (!currentActivePunch) return;

    const punchDetails = PUNCH_MAP[currentActivePunch];
    if (punchDetails.hand !== handedness) return; // Wrong hand

    const target = TARGET_POSITIONS[currentActivePunch];
    
    const targetX = target.x * canvas.width;
    const targetY = target.y * canvas.height;

    // The video is flipped, so we must flip the x-coordinate of the hand.
    const handX = (1 - x) * canvas.width;
    const handY = y * canvas.height;

    const distance = Math.sqrt(Math.pow(handX - targetX, 2) + Math.pow(handY - targetY, 2));

    if (distance < TARGET_RADIUS) {
      if (Date.now() - lastHitTime > 500) { // 500ms debounce
        setUserScore(score => score + 1);
        setLastHitTime(Date.now());

        if (selectedTrack.punches.length === 0) {
          chooseNextPunch();
        } else {
          setActivePunch(null); // Hide target until next beat
        }
      }
    }
  }, [lastHitTime, chooseNextPunch, selectedTrack.punches.length]);
  
  const draw = useCallback((results: HandLandmarkerResult | null) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let currentActivePunch = activePunch;

    if (gameState === 'playing' && audioRef.current && selectedTrack.punches.length > 0) {
      const currentTime = audioRef.current.currentTime - selectedTrack.offset;
      const currentBeat = (currentTime * selectedTrack.bpm) / 60;
      
      const upcomingPunch = selectedTrack.punches.find(p => p.beat > currentBeat - 0.5 && p.beat < currentBeat + 1);

      if (upcomingPunch && activePunch !== upcomingPunch.type) {
        currentActivePunch = upcomingPunch.type;
        setActivePunch(upcomingPunch.type);
      }
    }

    if (gameState === 'playing' && currentActivePunch) {
      const pos = TARGET_POSITIONS[currentActivePunch];
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
      ctx.fillText(PUNCH_MAP[currentActivePunch].name.toUpperCase(), x, y);
    }
    
    if (results?.landmarks) {
      for (const handLandmarks of results.landmarks) {
        const handedness = results.handednesses[results.landmarks.indexOf(handLandmarks)][0].categoryName as Handedness;
        const fingerTip = handLandmarks[12]; 
        if (fingerTip) {
          checkHit(handedness, fingerTip.x, fingerTip.y, currentActivePunch, canvas);
        }
        for (const connection of HandLandmarker.HAND_CONNECTIONS) {
          const start = handLandmarks[connection.start];
          const end = handLandmarks[connection.end];
          if (start && end) {
            ctx.beginPath();
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
    
  }, [canvasRef, videoRef, gameState, activePunch, checkHit, selectedTrack]);

  const predictWebcam = useCallback(() => {
    if (!isRunning.current || !handLandmarker || !videoRef.current || hasCameraPermission === false) {
      return;
    }
    
    const video = videoRef.current;
    if (video.paused || video.ended || !video.videoWidth) {
      gameLoopRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    const startTimeMs = performance.now();
    const results = handLandmarker.detectForVideo(video, startTimeMs);
    
    // Draw and check for hits
    draw(results);
    
    gameLoopRef.current = requestAnimationFrame(predictWebcam);
  }, [handLandmarker, hasCameraPermission, draw]);


  // 2. Effect to Start Game Loop once camera and model are ready
  useEffect(() => {
    if (hasCameraPermission && !modelLoading && handLandmarker) {
      if (gameState === 'initializing') {
        setGameState('ready');
      }
      predictWebcam();
    }
    
    return () => {
        if(gameLoopRef.current) {
            cancelAnimationFrame(gameLoopRef.current);
            isRunning.current = false;
        }
    }
  }, [hasCameraPermission, modelLoading, handLandmarker, gameState, predictWebcam]);


  // Handle model loading errors
   useEffect(() => {
    if (modelError) {
      setGameState('error');
    }
  }, [modelError]);


  
  const handleMusicSelection = (trackName: string) => {
    const track = MUSIC_TRACKS.find(t => t.name === trackName) || MUSIC_TRACKS[0];
    setSelectedTrack(track);
  };

  const startGameRound = useCallback(() => {
    setUserScore(0);
    setAiScore(0);
    setCountdown(3);
    setGameState('countdown');
  
    if (audioRef.current) {
      audioRef.current.pause();
      if (selectedTrack.src !== 'none') {
        audioRef.current.src = selectedTrack.src;
      }
    }
  
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownInterval);
        setGameState('playing');
        if (audioRef.current && selectedTrack.src !== 'none') {
          audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        }
  
        if (selectedTrack.punches.length === 0) {
          chooseNextPunch();
        }
      }
    }, 1000);
  }, [chooseNextPunch, selectedTrack]);

  const handleStop = () => {
    window.location.reload(); 
  };

  const isSessionActive = ['countdown', 'playing'].includes(gameState);

  return (
    <>
      <audio ref={audioRef} onError={(e) => console.error('Audio Error:', e.currentTarget.error)} />
      <div className={cn("w-full h-full flex flex-col items-center justify-center absolute inset-0 z-0 bg-black")}>
        <div className={cn("relative w-full h-full")}>
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover z-10" style={{ transform: 'scaleX(-1)' }} playsInline autoPlay muted/>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-20" />
        </div>
      </div>
      
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4">
        
        {(gameState === 'initializing' || modelLoading || hasCameraPermission === null) && !isSessionActive && (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-16 h-16 animate-spin text-primary" />
            <p className="text-foreground mt-4 text-lg">
              {hasCameraPermission === null ? 'Requesting Camera...' : 'Initializing Bio-Temporal Link...'}
            </p>
          </div>
        )}

        {gameState === 'ready' && hasCameraPermission && (
           <div className="text-center p-4 max-w-2xl mx-auto glass-panel rounded-lg">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary">Engage the Edge of Now</h1>
            <p className="mt-4 text-lg sm:text-xl text-foreground/80">
              You are entering a reactive feedback loop. The system syncs with your physical state, not a button click. This is a test of a new AI paradigm.
            </p>
             <div className="mt-8 grid w-full max-w-sm items-center gap-1.5 mx-auto">
                <Label htmlFor="music-track" className="text-left">Select Music Track</Label>
                 <Select onValueChange={handleMusicSelection} defaultValue={selectedTrack.name}>
                    <SelectTrigger id="music-track">
                        <SelectValue placeholder="Select a track" />
                    </SelectTrigger>
                    <SelectContent>
                        {MUSIC_TRACKS.map(track => (
                            <SelectItem key={track.name} value={track.name}>
                                {track.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
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
            <AlertDescription>{modelError || 'Something went wrong. Please refresh and try again.'}</AlertDescription>
            <Button onClick={() => window.location.reload()} className="mt-4">Refresh Page</Button>
          </Alert>
        )}
      </div>
    </>
  );
}

    