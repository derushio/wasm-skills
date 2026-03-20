---
description: "MediaPipe Vision WASMの動的ロード・初期化・タスク生成パターン。FilesetResolver、タスク生成、SSR回避、GPU delegate設定。mediapipe wasm init filesetresolver ssr gpu delegate"
---

# MediaPipe WASM 動的ロード・初期化パターン

## 概要

`@mediapipe/tasks-vision` のWASMロード・初期化・タスク生成パターン。FilesetResolverでWASMを解決し、HandLandmarker / PoseLandmarker / FaceLandmarker などの各タスクを生成する。

## FilesetResolver の使い方

```typescript
import { FilesetResolver } from "@mediapipe/tasks-vision";

const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
```

- 引数はWASMファイルのベースパス（`public/` からの相対パス）
- SIMD対応を自動判定し、最適なWASMバイナリを選択
- CDN使用時は以下を渡す:
  ```typescript
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );
  ```

## タスク生成パターン — createFromOptions

### Hand Landmarker

```typescript
import { HandLandmarker } from "@mediapipe/tasks-vision";

const handLandmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    delegate: "GPU",
  },
  runningMode: "VIDEO",
  numHands: 2,
});
```

### Pose Landmarker

```typescript
import { PoseLandmarker } from "@mediapipe/tasks-vision";

const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    delegate: "GPU",
  },
  runningMode: "VIDEO",
  numPoses: 1,
});
```

### Face Landmarker

```typescript
import { FaceLandmarker } from "@mediapipe/tasks-vision";

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
```

## baseOptions の共通設定

- `modelAssetPath`: Google Cloud StorageのURLまたはローカルパス
- `delegate`: `"GPU"`（WebGLアクセラレーション）または `"CPU"`（デフォルト）
- GPU delegateを推奨（大幅なパフォーマンス向上）
- GPU delegateが利用不可の環境では自動的にCPUにフォールバック

## runningMode の選択

| モード | 用途 | 特徴 |
|--------|------|------|
| `"IMAGE"` | 静止画 | フレーム間トラッキングなし |
| `"VIDEO"` | 動画/カメラ（同期） | `detectForVideo()` で同期的に結果返却 |
| `"LIVE_STREAM"` | カメラ（非同期） | コールバック方式、メインスレッド非ブロック |

## SSR回避パターン

```typescript
"use client";
import { useEffect, useRef, useState } from "react";

export default function MediaPipeComponent() {
  const landmarkerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { FilesetResolver, HandLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });

      if (cancelled) {
        landmarker.close();
        return;
      }

      landmarkerRef.current = landmarker;
      setIsLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);
}
```

## 重要ポイント

1. **`"use client"` + `useEffect` 内で初期化** — SSR環境ではWASMをロードできないため必須
2. **動的import** — 静的importが型エラーになる場合は `await import(...)` + `any` キャストで回避
3. **`cancelled` フラグ** — 非同期初期化中にコンポーネントがアンマウントされた場合に `landmarker.close()` でリソース解放
4. **`landmarker.close()`** — MediaPipeタスクのリソースはJSのGC対象外のため、不要になったら明示的に解放が必要

## モデルファイルURL一覧

ベースURL: `https://storage.googleapis.com/mediapipe-models/`

| タスク | モデルURL（ベースURLからの相対パス） |
|--------|--------------------------------------|
| Hand Landmarker | `hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` |
| Pose Landmarker (Lite) | `pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task` |
| Pose Landmarker (Full) | `pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task` |
| Pose Landmarker (Heavy) | `pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task` |
| Face Landmarker | `face_landmarker/face_landmarker/float16/1/face_landmarker.task` |
| Gesture Recognizer | `gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task` |

## 注意事項

- WASMファイルはローカル配置時 `public/mediapipe/wasm/` に置き、`FilesetResolver.forVisionTasks("/mediapipe/wasm")` で参照
- `runningMode: "VIDEO"` では推論時に `detectForVideo(videoElement, Date.now())` のようにタイムスタンプ（ミリ秒）を渡す
- タイムスタンプは単調増加していなければならない（同フレームに同じ値を渡すとエラー）
