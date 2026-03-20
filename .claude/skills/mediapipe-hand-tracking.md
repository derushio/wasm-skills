---
description: "MediaPipe HandLandmarkerによるハンドトラッキング実装パターン。手の21関節ランドマーク検出、左右判定、ジェスチャー認識。mediapipe hand tracking landmark gesture recognition"
---

# MediaPipe HandLandmarkerによるハンドトラッキング実装パターン

## 概要
HandLandmarkerを使った手のランドマーク検出フロー：初期化→detectForVideo呼び出し→21関節ランドマーク取得→左右判定→DrawingUtilsによる描画。

## HandLandmarker の初期化
```typescript
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const vision = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
);

const handLandmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    delegate: "GPU",
  },
  runningMode: "VIDEO", // "IMAGE" or "VIDEO"
  numHands: 2,
});
```

## 検出結果のデータ構造
```typescript
interface HandLandmarkerResult {
  landmarks: NormalizedLandmark[][];   // 手ごとに21点（正規化座標0-1）
  worldLandmarks: Landmark[][];        // 手ごとに21点（メートル単位3D座標）
  handedness: Category[][];            // 左右判定
}

// NormalizedLandmark: { x: number, y: number, z: number }
// Landmark (World): { x: number, y: number, z: number }
// Category: { categoryName: "Left" | "Right", score: number }
```

## detectForVideo の呼び出しパターン
```typescript
// requestAnimationFrameループ内で呼び出す
const nowInMs = performance.now();
const result = handLandmarker.detectForVideo(videoElement, nowInMs);
```

## 21関節ランドマークのインデックス
```
0: WRIST（手首）
1-4: THUMB（親指）— CMC, MCP, IP, TIP
5-8: INDEX_FINGER（人差し指）— MCP, PIP, DIP, TIP
9-12: MIDDLE_FINGER（中指）— MCP, PIP, DIP, TIP
13-16: RING_FINGER（薬指）— MCP, PIP, DIP, TIP
17-20: PINKY（小指）— MCP, PIP, DIP, TIP
```

## 描画パターン
```typescript
import { DrawingUtils } from "@mediapipe/tasks-vision";

const drawingUtils = new DrawingUtils(ctx);
for (const landmarks of result.landmarks) {
  drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
    color: "#FFFFFF",
    lineWidth: 2,
  });
  drawingUtils.drawLandmarks(landmarks, {
    color: "#FF0000",
    lineWidth: 1,
    radius: 3,
  });
}
```

## 左右判定の表示
```typescript
for (let i = 0; i < result.handedness.length; i++) {
  const handedness = result.handedness[i][0].categoryName; // "Left" or "Right"
  const score = result.handedness[i][0].score;             // 信頼度 0.0〜1.0
  // ミラー表示（selfie mode）時は左右が反転する点に注意
}
```

## ランドマーク座標の活用
```typescript
// 特定の指先座標取得（人差し指TIP = index 8）
const indexTip = result.landmarks[0][8]; // { x, y, z } 正規化座標
const xPixel = indexTip.x * canvasWidth;
const yPixel = indexTip.y * canvasHeight;

// ワールド座標（メートル単位、手首が原点に近い）
const worldIndexTip = result.worldLandmarks[0][8];
```

## ユースケース例
- ジェスチャー操作（ピンチ、グー、パー判定）
- 手話認識
- バーチャル楽器（空中ピアノ、ドラムなど）
- AR/VRハンドインタラクション
- ポインティングデバイス代替
