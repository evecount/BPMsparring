
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { HAND_TRACKER_MODEL_PATH } from '@/lib/constants';

let handLandmarkerSingleton: HandLandmarker | undefined = undefined;

export function useHandTracker() {
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const createHandLandmarker = useCallback(async () => {
    if (handLandmarkerSingleton) {
      setHandLandmarker(handLandmarkerSingleton);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      const newHandLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_TRACKER_MODEL_PATH,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
      handLandmarkerSingleton = newHandLandmarker;
      setHandLandmarker(newHandLandmarker);
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
      // The singleton instance should persist, but we can clear component state
      setHandLandmarker(undefined);
    };
  }, [createHandLandmarker]);


  return { videoRef, canvasRef, handLandmarker, loading, error };
}

    