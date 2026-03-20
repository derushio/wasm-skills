---
description: "MediaPipe PoseLandmarkerによるポーズ推定実装パターン。全身33関節ランドマーク検出、ワールド座標、visibility。mediapipe pose estimation landmark body tracking"
---

# MediaPipe PoseLandmarkerによるポーズ推定実装パターン

## 概要
PoseLandmarkerを使った全身ポーズ推定フロー：初期化→detectForVideo呼び出し→33関節ランドマーク取得→visibility判定→DrawingUtilsによる描画。

## PoseLandmarker の初期化
```typescript
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const vision = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
);

const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
    delegate: "GPU",
  },
  runningMode: "VIDEO", // "IMAGE" or "VIDEO"
  numPoses: 1,
});
```

## モデル選択
| モデル | 精度 | 速度 | ユースケース |
|--------|------|------|-------------|
| Lite | 低 | 速い | リアルタイム、モバイル |
| Full | 中 | 中 | バランス型（推奨） |
| Heavy | 高 | 遅い | 高精度が必要な場面 |

モデルパスの `pose_landmarker_full` 部分を `pose_landmarker_lite` / `pose_landmarker_heavy` に変更して切り替え。

## 検出結果のデータ構造
```typescript
interface PoseLandmarkerResult {
  landmarks: NormalizedLandmark[][];    // ポーズごとに33点（正規化座標0-1）
  worldLandmarks: Landmark[][];         // メートル単位3D座標（腰が原点）
}

// NormalizedLandmark: { x: number, y: number, z: number, visibility?: number }
// Landmark (World): { x: number, y: number, z: number, visibility?: number }
// visibility: 0.0〜1.0（0=不可視、1=完全に可視）
```

## detectForVideo の呼び出しパターン
```typescript
// requestAnimationFrameループ内で呼び出す
const nowInMs = performance.now();
const result = poseLandmarker.detectForVideo(videoElement, nowInMs);
```

## 33関節ランドマークのインデックス
```
0: NOSE
1-2: LEFT_EYE_INNER, LEFT_EYE
3-4: LEFT_EYE_OUTER, RIGHT_EYE_INNER
5-6: RIGHT_EYE, RIGHT_EYE_OUTER
7-8: LEFT_EAR, RIGHT_EAR
9-10: MOUTH_LEFT, MOUTH_RIGHT
11-12: LEFT_SHOULDER, RIGHT_SHOULDER
13-14: LEFT_ELBOW, RIGHT_ELBOW
15-16: LEFT_WRIST, RIGHT_WRIST
17-22: 左右PINKY / INDEX / THUMB（手の端点）
23-24: LEFT_HIP, RIGHT_HIP
25-26: LEFT_KNEE, RIGHT_KNEE
27-28: LEFT_ANKLE, RIGHT_ANKLE
29-32: 左右HEEL / FOOT_INDEX
```

## 描画パターン
```typescript
import { DrawingUtils } from "@mediapipe/tasks-vision";

const drawingUtils = new DrawingUtils(ctx);
for (const landmarks of result.landmarks) {
  drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
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

## visibilityに応じた描画
```typescript
drawingUtils.drawLandmarks(landmarks, {
  radius: (data: any) => {
    const visibility = data.from?.visibility ?? 1;
    return visibility > 0.5 ? 3 : 1;
  },
  color: (data: any) => {
    const visibility = data.from?.visibility ?? 1;
    return visibility > 0.5 ? "#FF0000" : "#888888";
  },
});
```

## ワールド座標の活用（腰が原点）
```typescript
// ワールド座標は腰の中点付近が原点、メートル単位
const leftShoulder = result.worldLandmarks[0][11]; // { x, y, z }
const rightShoulder = result.worldLandmarks[0][12];

// 肩幅の計算例
const shoulderWidth = Math.sqrt(
  Math.pow(leftShoulder.x - rightShoulder.x, 2) +
  Math.pow(leftShoulder.y - rightShoulder.y, 2)
);
```

## ユースケース例
- リハビリ支援・理学療法（関節角度計測）
- フィットネスアプリ（フォーム判定）
- ダンス採点・モーション比較
- 姿勢分析・スポーツコーチング
- モーションキャプチャ・アバター制御
