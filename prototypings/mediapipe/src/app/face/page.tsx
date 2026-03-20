"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  FilesetResolver,
  FaceLandmarker,
  DrawingUtils,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

interface BlendshapeEntry {
  categoryName: string;
  score: number;
}

export default function FacePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [blendshapes, setBlendshapes] = useState<BlendshapeEntry[]>([]);

  const initializeFaceLandmarker = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
      });
      faceLandmarkerRef.current = faceLandmarker;

      await startCamera();
    } catch (err) {
      console.error("[FaceLandmarker] 初期化エラー:", err);
      setError(
        err instanceof Error ? err.message : "初期化中に不明なエラーが発生しました"
      );
      setIsLoading(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
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
      video.addEventListener("loadeddata", () => {
        setIsLoading(false);
        startDetectionLoop();
      });
    } catch (err) {
      console.error("[FaceLandmarker] カメラアクセスエラー:", err);
      setError(
        err instanceof Error
          ? `カメラアクセスエラー: ${err.message}`
          : "カメラにアクセスできませんでした"
      );
      setIsLoading(false);
    }
  }, []);

  const startDetectionLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const faceLandmarker = faceLandmarkerRef.current;

    if (!video || !canvas || !faceLandmarker) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawingUtils = new DrawingUtils(ctx);

    const detect = () => {
      if (video.currentTime === lastVideoTimeRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(detect);
        return;
      }
      lastVideoTimeRef.current = video.currentTime;

      // canvasサイズをvideoに合わせる
      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let result: FaceLandmarkerResult;
      try {
        result = faceLandmarker.detectForVideo(video, performance.now());
      } catch (err) {
        console.error("[FaceLandmarker] 検出エラー:", err);
        animationFrameIdRef.current = requestAnimationFrame(detect);
        return;
      }

      const hasFace =
        result.faceLandmarks && result.faceLandmarks.length > 0;
      setFaceDetected(hasFace);

      if (hasFace) {
        for (const landmarks of result.faceLandmarks) {
          // テセレーション: 薄い半透明
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_TESSELATION,
            { color: "rgba(200,200,200,0.3)", lineWidth: 0.5 }
          );
          // 右目: 緑
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
            { color: "#30FF30", lineWidth: 1 }
          );
          // 左目: 緑
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
            { color: "#30FF30", lineWidth: 1 }
          );
          // 顔輪郭: 白
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
            { color: "#FFFFFF", lineWidth: 1 }
          );
          // 右眉: 黄
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
            { color: "#FF9800", lineWidth: 1 }
          );
          // 左眉: 黄
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
            { color: "#FF9800", lineWidth: 1 }
          );
          // 口: ピンク
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_LIPS,
            { color: "#FF69B4", lineWidth: 1 }
          );
        }

        // ブレンドシェイプ上位5件を取得
        if (
          result.faceBlendshapes &&
          result.faceBlendshapes.length > 0 &&
          result.faceBlendshapes[0].categories
        ) {
          const sorted = [...result.faceBlendshapes[0].categories]
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((c) => ({
              categoryName: c.categoryName,
              score: c.score,
            }));
          setBlendshapes(sorted);
        }
      } else {
        setBlendshapes([]);
      }

      animationFrameIdRef.current = requestAnimationFrame(detect);
    };

    animationFrameIdRef.current = requestAnimationFrame(detect);
  }, []);

  useEffect(() => {
    initializeFaceLandmarker();

    return () => {
      // アニメーションループ停止
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      // カメラストリーム停止
      const video = videoRef.current;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      // FaceLandmarkerクリーンアップ
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
    };
  }, [initializeFaceLandmarker]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* ヘッダー */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          ← Back
        </Link>
        <h1 className="text-xl font-bold">Face Landmarker</h1>
        {!isLoading && (
          <span
            className={`ml-auto text-xs px-2 py-1 rounded-full ${
              faceDetected
                ? "bg-green-900 text-green-300"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {faceDetected ? "顔を検出中" : "顔なし"}
          </span>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="flex flex-1 flex-col lg:flex-row gap-6 p-6">
        {/* ビデオ + キャンバス */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="w-10 h-10 border-2 border-zinc-600 border-t-zinc-200 rounded-full animate-spin" />
              <p className="text-zinc-400 text-sm">
                FaceLandmarkerを初期化中...
              </p>
            </div>
          )}
          {error && (
            <div className="w-full max-w-lg bg-red-950 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
              <p className="font-semibold mb-1">エラー</p>
              <p>{error}</p>
            </div>
          )}

          <div
            className={`relative rounded-xl overflow-hidden bg-zinc-900 ${
              isLoading ? "hidden" : ""
            }`}
          >
            {/* ミラー表示 */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="block w-full max-w-[640px]"
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ transform: "scaleX(-1)" }}
            />
          </div>

          {!isLoading && !error && (
            <p className="text-xs text-zinc-500">
              カメラ映像の上に顔メッシュをオーバーレイ描画しています
            </p>
          )}
        </div>

        {/* ブレンドシェイプパネル */}
        <div className="w-full lg:w-72 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Blendshapes Top 5
          </h2>

          {blendshapes.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              {isLoading ? "..." : "顔が検出されると表示されます"}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {blendshapes.map((bs) => (
                <div key={bs.categoryName} className="flex flex-col gap-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-zinc-300 truncate max-w-[200px]">
                      {bs.categoryName}
                    </span>
                    <span className="text-xs text-zinc-400 tabular-nums ml-2">
                      {(bs.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-100"
                      style={{ width: `${bs.score * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
