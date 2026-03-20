---
description: "MuJoCo WASMをNext.js/Webプロジェクトに導入する環境構築ガイド。WASMファイル配置、webpack設定、依存関係の設定パターン。mujoco wasm setup nextjs webpack environment"
---

# MuJoCo WASM × Next.js 環境構築ガイド

## 概要

MuJoCo物理シミュレーションエンジンをWebAssembly経由でNext.js/Webプロジェクトに導入するための環境構築ガイド。

---

## WASMファイルの配置

- `public/mujoco/` ディレクトリにWASMファイルを配置する
- 必要ファイル:
  - `mujoco_wasm.js` — EmscriptenのJSグルーコード
  - `mujoco_wasm.wasm` — WASMバイナリ本体
- Next.jsの `public/` ディレクトリから静的配信される（パスは `/mujoco/mujoco_wasm.js` 等）

```
public/
  mujoco/
    mujoco_wasm.js
    mujoco_wasm.wasm
```

---

## package.json 依存関係

```json
{
  "@react-three/fiber": "^9.5.0",
  "@react-three/drei": "^10.7.7",
  "three": "^0.183.2"
}
```

- MuJoCo WASM自体はnpmパッケージではなく `public/` ディレクトリに直接配置するパターンが安定
- npmには `@mujoco/mujoco`、`mujoco_wasm_contrib`、`mujoco-js`、`mujoco-react` も存在するが、直接WASMファイル配置の方が制御しやすく依存関係の問題が起きにくい

---

## next.config.ts の必須設定

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        module: false,
        worker_threads: false,
      };
    }
    return config;
  },
};
```

- MuJoCo WASMのEmscriptenコードがNode.js APIを参照するため、ブラウザバンドルでは `false` に設定必須
- 無効化が必要な5つのモジュール: `fs`, `path`, `crypto`, `module`, `worker_threads`

---

## tsconfig.json 推奨設定

- `"target": "ES2017"` 以上を指定（async/await、dynamic import対応のため）
- `"moduleResolution": "bundler"`（Next.js向け推奨設定）

---

## 実装上のポイント

### WASMロード時のパス指定

EmscriptenのJSグルーコードはデフォルトで同ディレクトリからWASMを探すが、Next.jsの配信パスと一致しない場合がある。`locateFile` コールバックでパスを明示的に指定する。

```typescript
const mujoco = await load({
  locateFile: (file: string) => `/mujoco/${file}`,
});
```

### クライアントコンポーネントの明示

MuJoCoのWASMロードやThree.jsのWebGLコンテキストはブラウザAPIに依存するため、コンポーネントに `"use client"` を必ず付与する。

```typescript
"use client";

import { useEffect, useRef } from "react";
```

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| WASMファイルが見つからない（404） | パスの不一致 | `locateFile` コールバックでパスを明示指定 |
| `Module not found: Can't resolve 'fs'` | webpack fallback未設定 | `next.config.ts` の fallback設定を確認 |
| ハイドレーションエラー | SSRでブラウザAPIを呼び出している | コンポーネントに `"use client"` を付与 |
| WASMが初期化されない | dynamic importの非同期処理漏れ | `useEffect` 内で `await` を正しく使用 |
| WebGL contextエラー | Three.jsのCanvas重複 | `<Canvas>` の重複マウントを確認 |
