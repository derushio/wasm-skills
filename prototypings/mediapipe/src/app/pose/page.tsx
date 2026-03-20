"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function PosePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poseLandmarkerRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poseDetected, setPoseDetected] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function init() {
      try {
        // 動的インポートで SSR を回避し、型解決の問題も回避
        const { FilesetResolver, PoseLandmarker, DrawingUtils } =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (await import("@mediapipe/tasks-vision")) as any;

        // MediaPipe PoseLandmarker の初期化
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        if (cancelled) {
          poseLandmarker.close();
          return;
        }

        poseLandmarkerRef.current = poseLandmarker;

        // カメラ入力取得
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
        await video.play();

        // canvas サイズを video に合わせる
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        setIsLoading(false);

        // 検出ループ
        function detect() {
          if (cancelled) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const poseLandmarker = poseLandmarkerRef.current;

          if (!video || !canvas || !poseLandmarker) {
            animationFrameIdRef.current = requestAnimationFrame(detect);
            return;
          }

          // 重複フレームスキップ
          if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              const result = poseLandmarker.detectForVideo(
                video,
                performance.now()
              );

              const detected =
                result.landmarks && result.landmarks.length > 0;
              setPoseDetected(detected);

              if (detected) {
                const drawingUtils = new DrawingUtils(ctx);
                for (const landmarks of result.landmarks) {
                  drawingUtils.drawConnectors(
                    landmarks,
                    PoseLandmarker.POSE_CONNECTIONS,
                    { color: "#FFFFFF", lineWidth: 2 }
                  );
                  drawingUtils.drawLandmarks(landmarks, {
                    color: "#00FF00",
                    lineWidth: 1,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    radius: (data: any) => {
                      const visibility = data.from?.visibility ?? 1;
                      return visibility > 0.5 ? 3 : 1;
                    },
                  });
                }
              }
            }
          }

          animationFrameIdRef.current = requestAnimationFrame(detect);
        }

        animationFrameIdRef.current = requestAnimationFrame(detect);
      } catch (e) {
        if (!cancelled) {
          console.error("Pose Landmarker init error:", e);
          setError(
            e instanceof Error ? e.message : "初期化に失敗しました"
          );
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;

      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }

      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }

      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center gap-6 p-6">
      {/* ヘッダー */}
      <div className="w-full max-w-2xl flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Pose Landmarker</h1>
        <div className="w-16" />
      </div>

      {/* ステータス */}
      <div className="flex items-center gap-2 text-sm">
        {isLoading && (
          <span className="text-zinc-400 animate-pulse">
            モデルを読み込み中...
          </span>
        )}
        {!isLoading && !error && (
          <span
            className={
              poseDetected ? "text-green-400" : "text-zinc-500"
            }
          >
            {poseDetected ? "ポーズを検出中" : "ポーズ未検出"}
          </span>
        )}
        {error && (
          <span className="text-red-400">エラー: {error}</span>
        )}
      </div>

      {/* video + canvas オーバーレイ */}
      <div className="relative rounded-xl overflow-hidden border border-zinc-800 shadow-xl">
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
          className="absolute top-0 left-0 w-full h-full"
          style={{ transform: "scaleX(-1)" }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
            <div className="w-10 h-10 border-4 border-zinc-600 border-t-zinc-100 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
