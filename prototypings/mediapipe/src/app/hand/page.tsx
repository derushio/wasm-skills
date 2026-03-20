"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  DrawingUtils,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

export default function HandPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handsDetected, setHandsDetected] = useState(0);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const handLandmarker = handLandmarkerRef.current;

    if (!video || !canvas || !handLandmarker) return;

    if (video.currentTime === lastVideoTimeRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(detect);
      return;
    }
    lastVideoTimeRef.current = video.currentTime;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let result: HandLandmarkerResult;
    try {
      result = handLandmarker.detectForVideo(video, performance.now());
    } catch {
      animationFrameIdRef.current = requestAnimationFrame(detect);
      return;
    }

    setHandsDetected(result.landmarks.length);

    if (result.landmarks.length > 0) {
      const drawingUtils = new DrawingUtils(ctx);

      result.landmarks.forEach((landmarks, index) => {
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: "#FFFFFF",
          lineWidth: 2,
        });
        drawingUtils.drawLandmarks(landmarks, {
          color: "#FF0000",
          lineWidth: 1,
          radius: 3,
        });

        // handedness ラベル表示
        const handedness = result.handedness[index]?.[0];
        if (handedness && landmarks[0]) {
          const x = landmarks[0].x * canvas.width;
          const y = landmarks[0].y * canvas.height;
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = "#FFFF00";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          const label = handedness.categoryName;
          ctx.strokeText(label, x + 8, y - 8);
          ctx.fillText(label, x + 8, y - 8);
        }
      });
    }

    animationFrameIdRef.current = requestAnimationFrame(detect);
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const init = async () => {
      try {
        // HandLandmarker 初期化
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        });
        handLandmarkerRef.current = handLandmarker;

        // カメラ取得
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
        await video.play();

        setIsLoading(false);
        animationFrameIdRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.error("Hand Landmarker init error:", err);
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setError("カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。");
        } else if (err instanceof DOMException && err.name === "NotFoundError") {
          setError("カメラが見つかりませんでした。");
        } else {
          setError(`初期化に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
        }
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [detect]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center gap-6 p-6">
      {/* ヘッダー */}
      <div className="w-full max-w-2xl flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Hand Landmarker</h1>
        <div className="text-sm text-zinc-400">
          {!isLoading && !error && (
            <span>
              検出中の手:{" "}
              <span className="font-bold text-zinc-100">{handsDetected}</span>
            </span>
          )}
        </div>
      </div>

      {/* ローディング */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 mt-16">
          <div className="w-10 h-10 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">WASMロード中・カメラ許可待ち...</p>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg p-4 max-w-md text-center">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* ビデオ + キャンバス オーバーレイ */}
      <div
        className="relative rounded-lg overflow-hidden bg-zinc-900"
        style={{ display: isLoading || error ? "none" : "block" }}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="block"
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ transform: "scaleX(-1)" }}
        />
      </div>

      {/* 説明テキスト */}
      {!isLoading && !error && (
        <p className="text-zinc-500 text-xs text-center max-w-md">
          カメラに手をかざすとランドマーク（21点）と接続線がリアルタイムで描画されます。
          両手同時対応。
        </p>
      )}
    </div>
  );
}
