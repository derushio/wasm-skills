---
description: "MediaPipe Vision WASMをNext.js/Webプロジェクトに導入する環境構築ガイド。@mediapipe/tasks-vision インストール、WASMファイル配置、webpack設定、Turbopack対応。mediapipe wasm setup nextjs webpack environment vision"
---

# MediaPipe Vision WASM × Next.js 環境構築ガイド

## 概要

MediaPipe Vision（ハンドトラッキング、ポーズ推定、顔メッシュ等）をWebAssembly経由でNext.js/Webプロジェクトに導入するための環境構築ガイド。

---

## パッケージインストール

```bash
npm install @mediapipe/tasks-vision
```

- `@mediapipe/tasks-vision` にHandLandmarker、PoseLandmarker、FaceLandmarker等が統合済み
- `@mediapipe/hands`、`@mediapipe/pose` 等の旧パッケージはレガシーであり、現在は `@mediapipe/tasks-vision` に統合されている
- `@types/*` の追加インストール不要（`vision.d.ts` が同梱）

---

## WASMファイルの配置

- `public/mediapipe/wasm/` ディレクトリにWASMファイルを配置する
- 必要ファイル（計6ファイル）:
  - `vision_wasm_internal.js` / `vision_wasm_internal.wasm` — SIMD対応版
  - `vision_wasm_nosimd_internal.js` / `vision_wasm_nosimd_internal.wasm` — SIMD非対応版
  - `vision_wasm_module_internal.js` / `vision_wasm_module_internal.wasm` — モジュール版
- `FilesetResolver` がブラウザのSIMD対応を自動判定し、適切なWASMを選択する

```
public/
  mediapipe/
    wasm/
      vision_wasm_internal.js
      vision_wasm_internal.wasm
      vision_wasm_nosimd_internal.js
      vision_wasm_nosimd_internal.wasm
      vision_wasm_module_internal.js
      vision_wasm_module_internal.wasm
```

### postinstall スクリプトによる自動コピー

`package.json` に以下を追加すると `npm install` 後に自動でWASMファイルがコピーされる。

```json
{
  "scripts": {
    "postinstall": "cp -r node_modules/@mediapipe/tasks-vision/wasm public/mediapipe/"
  }
}
```

初回セットアップ時は `mkdir -p public/mediapipe` を事前に実行すること。

---

## next.config.ts の必須設定

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},  // Next.js 16+: Turbopackがデフォルト有効、このキーが必須
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};
```

- `@mediapipe/tasks-vision` がNode.js APIを参照するため、ブラウザバンドルでは `false` に設定必須
- Next.js 16ではTurbopackがデフォルト有効。webpackカスタム設定が存在する場合は `turbopack: {}` キーの明示が必須

---

## CDNからの読み込み（ローカル配置の代替）

ローカルへのWASMファイル配置の代わりに、CDN経由で `FilesetResolver` に直接URLを渡すことも可能。

```typescript
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const vision = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
);
```

- セットアップが簡単でWASMファイルのコピーが不要
- CDN障害時にアプリ全体が停止するリスクがある
- 本番環境ではローカル配置を推奨

---

## TypeScript 型定義

- `@mediapipe/tasks-vision` に `vision.d.ts` が同梱されており、`@types/*` の追加インストールは不要
- `PoseLandmarker` の型に解決問題が発生する場合は動的importと `any` キャストで回避する

```typescript
// 型エラーが出る場合の回避策
const { PoseLandmarker, FilesetResolver } = await import(
  "@mediapipe/tasks-vision"
) as any;
```

---

## 実装上のポイント

### クライアントコンポーネントの明示

MediaPipe WASMのロードやカメラAPIはブラウザAPIに依存するため、コンポーネントに `"use client"` を必ず付与する。

```typescript
"use client";

import { useEffect, useRef } from "react";
```

### FilesetResolver でのローカルWASMパス指定

```typescript
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");

const handLandmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: "/mediapipe/models/hand_landmarker.task",
  },
  numHands: 2,
});
```

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| `Module not found: Can't resolve 'fs'` | webpack fallback未設定 | `next.config.ts` にfallback設定を追加 |
| WASMファイルが404 | `public/mediapipe/wasm/` 未配置 | `npm run postinstall` を実行 |
| Turbopackビルドエラー | `turbopack` キー未設定 | `next.config.ts` に `turbopack: {}` を追加 |
| 型エラー（PoseLandmarker） | exports mapの型解決問題 | 動的import + `any` キャストで回避 |
| ハイドレーションエラー | SSRでWASMにアクセスしている | コンポーネントに `"use client"` を付与 |
