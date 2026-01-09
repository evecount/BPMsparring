
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { HAND_TRACKER_MODEL_PATH } from '@/lib/constants';

let handLandmarker: HandLandmarker | undefined = undefined;
let animationFrameId: number;

export function useHandTracker() {
  const [results, setResults] = useState<HandLandmarkerResult | null>(null);
  const [loading, setLoading] = useState(false); // Default to false
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRunning = useRef(false);

  const createHandLandmarker = useCallback(async () => {
    setLoading(true);
    try {
      if (!handLandmarker) {
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
      }
    } catch (e: any) {
      console.error("Error creating HandLandmarker:", e);
      setError("Failed to load AI model. Please check your connection and try again.");
    } finally {
        setLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    createHandLandmarker();
  }, [createHandLandmarker]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracker();
      if (handLandmarker) {
        handLandmarker.close();
        handLandmarker = undefined;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const predictWebcam = useCallback(() => {
    if (!isRunning.current || !handLandmarker || !videoRef.current) {
      return;
    }
    
    const video = videoRef.current;
    if (video.paused || video.ended || video.readyState < 2) {
      animationFrameId = requestAnimationFrame(predictWebcam);
      return;
    }

    if (video.currentTime === (video.dataset.lastTime ? parseFloat(video.dataset.lastTime) : 0)) {
        animationFrameId = requestAnimationFrame(predictWebcam);
        return;
    }
    video.dataset.lastTime = video.currentTime.toString();

    const newResults = handLandmarker.detectForVideo(video, Date.now());
    setResults(newResults);

    animationFrameId = requestAnimationFrame(predictWebcam);
  }, []);

  const startTracker = useCallback(async () => {
    if (isRunning.current) return;
    if (!handLandmarker) {
      setError("Hand tracking model is not yet ready. Please wait.");
      return;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera access is not supported by your browser.");
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", () => {
                isRunning.current = true;
                setLoading(false);
                predictWebcam();
            });
        }
    } catch (err: any) {
        console.error("Error accessing webcam:", err);
        setError("Camera access was denied. Please enable camera permissions in your browser settings and refresh the page.");
        setLoading(false);
    }

  }, [predictWebcam]);

  const stopTracker = useCallback(() => {
    isRunning.current = false;
    cancelAnimationFrame(animationFrameId);

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setResults(null);
  }, []);

  return { videoRef, canvasRef, results, loading, error, startTracker, stopTracker };
}

    