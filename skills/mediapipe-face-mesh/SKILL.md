---
name: mediapipe-face-mesh
description: "MediaPipe FaceLandmarkerによる顔メッシュ・ブレンドシェイプ実装パターン。顔468ランドマーク、ARKit互換ブレンドシェイプ、表情認識。mediapipe face mesh landmark blendshapes expression"
---

# MediaPipe FaceLandmarkerによる顔メッシュ・ブレンドシェイプ実装パターン

## 概要
FaceLandmarkerを使った顔メッシュ検出フロー：初期化→detectForVideo呼び出し→468ランドマーク取得→ARKit互換ブレンドシェイプ出力→DrawingUtilsによる描画。

## FaceLandmarker の初期化
```typescript
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const vision = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
);

const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    delegate: "GPU",
  },
  runningMode: "VIDEO", // "IMAGE" or "VIDEO"
  numFaces: 1,
  outputFaceBlendshapes: true,           // ARKit互換ブレンドシェイプを出力
  outputFacialTransformationMatrixes: true, // 顔の変換行列を出力
});
```

## 検出結果のデータ構造
```typescript
interface FaceLandmarkerResult {
  faceLandmarks: NormalizedLandmark[][];       // 顔ごとに468点（正規化座標0-1）
  faceBlendshapes?: Classifications[];          // ブレンドシェイプ（要outputFaceBlendshapes: true）
  facialTransformationMatrixes?: Matrix[];     // 顔の変換行列（要outputFacialTransformationMatrixes: true）
}

// NormalizedLandmark: { x: number, y: number, z: number }
// faceBlendshapes[0].categories: Category[]
// Category: { categoryName: string, score: number }  // score: 0.0〜1.0
```

## detectForVideo の呼び出しパターン
```typescript
// requestAnimationFrameループ内で呼び出す
const nowInMs = performance.now();
const result = faceLandmarker.detectForVideo(videoElement, nowInMs);
```

## 顔メッシュの描画パターン
```typescript
import { DrawingUtils } from "@mediapipe/tasks-vision";

const drawingUtils = new DrawingUtils(ctx);
for (const landmarks of result.faceLandmarks) {
  // テセレーション（フルメッシュ）— 薄い半透明
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
    color: "rgba(200,200,200,0.3)",
    lineWidth: 0.5,
  });
  // 目
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
    color: "#30FF30",
  });
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
    color: "#30FF30",
  });
  // 眉毛
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, {
    color: "#FF3030",
  });
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, {
    color: "#FF3030",
  });
  // 顔輪郭
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, {
    color: "#FFFFFF",
  });
  // 唇
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
    color: "#FF69B4",
  });
}
```

## ブレンドシェイプ（ARKit互換、最大52カテゴリ）
```
browDownLeft, browDownRight, browInnerUp, browOuterUpLeft, browOuterUpRight
eyeBlinkLeft, eyeBlinkRight, eyeLookDownLeft, eyeLookUpLeft
eyeSquintLeft, eyeSquintRight, eyeWideLeft, eyeWideRight
jawForward, jawLeft, jawOpen, jawRight
mouthClose, mouthFunnel, mouthLeft, mouthRight, mouthSmileLeft, mouthSmileRight
mouthPucker, mouthShrugLower, mouthShrugUpper
noseSneerLeft, noseSneerRight
cheekPuff, cheekSquintLeft, cheekSquintRight
```

## ブレンドシェイプのトップN表示
```typescript
const blendshapes = result.faceBlendshapes?.[0]?.categories ?? [];
const topN = [...blendshapes]
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);
// topN.map(bs => `${bs.categoryName}: ${(bs.score * 100).toFixed(1)}%`)
```

## ブレンドシェイプを名前で参照
```typescript
const blendshapes = result.faceBlendshapes?.[0]?.categories ?? [];
const blendshapeMap = Object.fromEntries(
  blendshapes.map((bs) => [bs.categoryName, bs.score])
);

// 目の開閉状態
const eyeBlinkLeft = blendshapeMap["eyeBlinkLeft"] ?? 0;   // 0=開, 1=閉
const jawOpen = blendshapeMap["jawOpen"] ?? 0;             // 0=閉, 1=開
const mouthSmileLeft = blendshapeMap["mouthSmileLeft"] ?? 0;
```

## 顔の変換行列（顔向き・位置）
```typescript
if (result.facialTransformationMatrixes?.[0]) {
  const matrix = result.facialTransformationMatrixes[0].data; // Float32Array, 4x4列優先
  // Three.jsのMatrix4に変換可能
  // new THREE.Matrix4().fromArray(matrix)
}
```

## ユースケース例
- バーチャルアバター（表情のリアルタイム転送）
- 表情認識（感情分析、ユーザーリサーチ）
- ARフィルター（サングラス、マスク等の顔へのオーバーレイ）
- 3DキャラクターアニメーションへのARKitブレンドシェイプ適用
- アクセシビリティ（視線・口形状によるUI操作）
