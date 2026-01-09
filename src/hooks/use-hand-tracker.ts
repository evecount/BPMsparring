
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { HAND_TRACKER_MODEL_PATH } from '@/lib/constants';

let handLandmarker: HandLandmarker | undefined = undefined;
let animationFrameId: number;

export function useHandTracker() {
  const [results, setResults] = useState<HandLandmarkerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRunning = useRef(false);

  const createHandLandmarker = useCallback(async () => {
    if (handLandmarker) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_TRACKER_MODEL_PATH,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
      setLoading(false);
    } catch (e: any) {
      console.error("Error creating HandLandmarker:", e);
      setError("Failed to load AI model. Your browser might not be supported, or there could be a network issue.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    createHandLandmarker();
    return () => {
      stopTracker();
      if (handLandmarker) {
        handLandmarker.close();
        handLandmarker = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createHandLandmarker]);

  const predictWebcam = useCallback(() => {
    if (!isRunning.current || !handLandmarker || !videoRef.current) {
      return;
    }
    
    const video = videoRef.current;
    if (video.paused || video.ended || !video.videoWidth) {
      animationFrameId = requestAnimationFrame(predictWebcam);
      return;
    }

    const startTimeMs = performance.now();
    const newResults = handLandmarker.detectForVideo(video, startTimeMs);
    setResults(newResults);

    animationFrameId = requestAnimationFrame(predictWebcam);
  }, []);

  const startTracker = useCallback(async () => {
    if (isRunning.current) return;
    
    if (loading) {
      setTimeout(startTracker, 100);
      return;
    }
    
    if (!handLandmarker) {
        await createHandLandmarker();
    }
     if (!handLandmarker) {
      setError("Hand tracking model could not be initialized. Please refresh the page.");
      return;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera access is not supported by your browser.");
      return;
    }
    
    setError(null);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", () => {
                isRunning.current = true;
                predictWebcam();
            });
        }
    } catch (err: any) {
        console.error("Error accessing webcam:", err);
        setError("Camera access was denied. Please enable camera permissions in your browser settings.");
    }
  }, [predictWebcam, loading, createHandLandmarker]);

  const stopTracker = useCallback(() => {
    isRunning.current = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setResults(null);
  }, []);

  return { videoRef, canvasRef, results, loading, error, startTracker, stopTracker };
}

    