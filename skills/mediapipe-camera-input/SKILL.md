---
name: mediapipe-camera-input
description: "MediaPipeでのカメラ入力取得・映像表示・検出ループ・Canvas描画パターン。getUserMedia、requestAnimationFrame、DrawingUtils。mediapipe camera input video canvas drawing detection loop"
---

# MediaPipe カメラ入力・検出ループ・Canvas描画ガイド

## 概要

`getUserMedia` によるカメラ入力取得、video/canvas オーバーレイ表示、`requestAnimationFrame` を使用したリアルタイム検出ループ、`DrawingUtils` によるランドマーク描画パターン。

---

## カメラ入力の取得

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "user",
    width: { ideal: 640 },
    height: { ideal: 480 },
  },
  audio: false,
});

const video = videoRef.current!;
video.srcObject = stream;
await new Promise<void>((resolve) => {
  video.onloadedmetadata = () => resolve();
});
await video.play();
```

- `facingMode: "user"` でフロントカメラを指定（モバイル対応）
- `onloadedmetadata` イベントでメタデータ読み込み完了を待機してから `play()` を呼ぶ

---

## video + canvas のオーバーレイ配置

```tsx
<div className="relative">
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    className="w-[640px] h-[480px]"
    style={{ transform: "scaleX(-1)" }}
  />
  <canvas
    ref={canvasRef}
    className="absolute top-0 left-0 w-[640px] h-[480px]"
    style={{ transform: "scaleX(-1)" }}
  />
</div>
```

- `autoPlay`: 自動再生
- `playsInline`: iOS Safariでのインライン再生対応
- `muted`: ブラウザの autoPlay ポリシー対応（音声なしは自動再生が許可されやすい）
- ミラー表示: `scaleX(-1)` を video・canvas 両方に適用することで左右反転を統一
- canvas は video 上に `absolute` 配置してランドマークをオーバーレイ表示

---

## リアルタイム検出ループ

```typescript
const lastVideoTimeRef = useRef<number>(-1);
const animationFrameIdRef = useRef<number | null>(null);

function detect() {
  const video = videoRef.current!;
  const canvas = canvasRef.current!;
  const ctx = canvas.getContext("2d")!;

  // 重複フレームスキップ
  if (video.currentTime === lastVideoTimeRef.current) {
    animationFrameIdRef.current = requestAnimationFrame(detect);
    return;
  }
  lastVideoTimeRef.current = video.currentTime;

  // canvasサイズ同期
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // canvas クリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 検出実行
  const result = landmarkerRef.current!.detectForVideo(video, performance.now());

  // 描画処理...

  animationFrameIdRef.current = requestAnimationFrame(detect);
}

// ループ開始
animationFrameIdRef.current = requestAnimationFrame(detect);
```

- `video.currentTime !== lastVideoTime` で同じフレームの二重推論を防止（CPU負荷削減）
- `performance.now()` をタイムスタンプとして渡す（MediaPipe の VIDEO モードで必須）
- canvas サイズは毎フレーム video と同期（解像度変更・初期化タイミングのズレに対応）

---

## DrawingUtils による描画

```typescript
import { DrawingUtils } from "@mediapipe/tasks-vision";

// ループ外で1回だけ生成（パフォーマンス最適化）
const drawingUtils = new DrawingUtils(ctx);

// 接続線描画
drawingUtils.drawConnectors(landmarks, ConnectionList, {
  color: "#FFFFFF",
  lineWidth: 2,
});

// ランドマーク点描画
drawingUtils.drawLandmarks(landmarks, {
  color: "#FF0000",
  lineWidth: 1,
  radius: 3,
});

// visibilityに応じた動的radius
drawingUtils.drawLandmarks(landmarks, {
  radius: (data: any) => {
    const visibility = data.from?.visibility ?? 1;
    return visibility > 0.5 ? 3 : 1;
  },
});
```

- `DrawingUtils` インスタンスはループ外で1回生成が効率的（毎フレーム `new` しない）
- `drawConnectors`: 各タスクの CONNECTIONS 定数を使用して骨格の接続線を描画
- `drawLandmarks`: 色・サイズ・radius をカスタマイズ可能
- `radius` にコールバック関数を渡すと `visibility` に応じた動的サイズが可能

---

## 接続線定数の一覧

```
HandLandmarker.HAND_CONNECTIONS              // 手の21点
PoseLandmarker.POSE_CONNECTIONS              // 全身33点
FaceLandmarker.FACE_LANDMARKS_TESSELATION    // 顔フルメッシュ
FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE      // 右目
FaceLandmarker.FACE_LANDMARKS_LEFT_EYE       // 左目
FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW  // 右眉
FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW   // 左眉
FaceLandmarker.FACE_LANDMARKS_LIPS           // 唇
FaceLandmarker.FACE_LANDMARKS_FACE_OVAL      // 顔輪郭
FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS     // 右虹彩
FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS      // 左虹彩
```

---

## 推奨描画色

| タスク | ランドマーク色 | 接続線色 |
|--------|---------------|---------|
| Hand | 赤 `#FF0000` | 白 `#FFFFFF` |
| Pose | 緑 `#00FF00` | 白 `#FFFFFF` |
| Face テセレーション | — | `rgba(200,200,200,0.3)` |
| Face 目 | — | 緑 `#30FF30` |
| Face 輪郭 | — | 白 `#FFFFFF` |

---

## クリーンアップ

```typescript
useEffect(() => {
  let stream: MediaStream | null = null;

  async function init() {
    stream = await navigator.mediaDevices.getUserMedia({ ... });
    // ...
  }

  init();

  return () => {
    // 1. アニメーションループ停止
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    // 2. Landmarker解放
    landmarkerRef.current?.close();
    // 3. カメラ停止
    stream?.getTracks().forEach(track => track.stop());
  };
}, []);
```

- 順序: rAF停止 → `Landmarker.close()` → カメラ `track.stop()`
- `stream` を `useEffect` のクロージャ内でローカル変数として保持することでクリーンアップ時に確実に参照できる
- `track.stop()` を呼ばないとカメラインジケーター（録画中ランプ）が消えない

---

## パフォーマンスヒント

- 解像度は 640×480 が多くのユースケースに十分（高解像度は推論コスト増大）
- `DrawingUtils` は毎フレーム `new` しない（クロージャで保持）
- GPU delegate 使用時、canvas の WebGL コンテキスト競合に注意（2D canvas と WebGL canvas の混在を避ける）

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| カメラが起動しない | HTTPSでない / 権限拒否 | HTTPS環境で実行、ブラウザの権限設定を確認 |
| `NotAllowedError` | ユーザーがカメラ権限を拒否 | 権限リクエストのUIを実装してユーザーに案内 |
| canvasに描画されない | canvasサイズが0 | `canvas.width/height` を `video.videoWidth/Height` で設定しているか確認 |
| ランドマークが反転している | `scaleX(-1)` の適用漏れ | video と canvas 両方に同じ transform を適用 |
| 推論が重い・フレーム落ち | 毎フレーム推論が走っている | `video.currentTime` による重複フレームスキップを確認 |
| iOS Safariで映像が出ない | `playsInline` / `muted` 属性漏れ | `autoPlay playsInline muted` の3属性をすべて付与 |
