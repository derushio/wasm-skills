# wasm-skills

Webアプリケーションへの WebAssembly 統合を支援する Claude Code スキル集です。

MuJoCo WASM（物理シミュレーション）と MediaPipe Vision WASM（人体トラッキング）を中心に、Next.js App Router 環境でのスキルを提供しています。

## スキル一覧

### MuJoCo WASM

MuJoCo 物理シミュレーションエンジンの WASM ビルドを統合するためのスキルです。

**mujoco-wasm-setup.md** - 環境構築

- 静的配信のための `public/mujoco/` 以下への WASM ファイル配置
- Node.js 組み込みモジュール向け `next.config.ts` webpack fallback 設定
- 必要な依存パッケージと推奨 `tsconfig.json` 設定
- よくあるセットアップエラーのトラブルシューティングガイド

**mujoco-wasm-init.md** - WASM 初期化

- バンドラー処理をバイパスする `webpackIgnore` コメント付き dynamic import
- Emscripten `locateFile` コールバックとキャッシュバスティング戦略
- 非同期初期化のための `useState` / `useEffect` を使った React 状態管理
- コンポーネントアンマウント時のメモリリーク防止のための `isMounted` フラグパターン
- 主要 Emscripten モジュール API の概要: `FS`、`Model`、`State`、`Simulation`

**mujoco-model-loading.md** - モデルの読み込みとメモリ管理

- `FS.writeFile` による Emscripten 仮想ファイルシステムへのモデルデータ書き込み
- オブジェクト生成フロー: `Model` -> `State` -> `Simulation`
- 主要プロパティのリファレンス: `ngeom`、`geom_type`、`geom_size`、`geom_pos`、`geom_mat` など
- `.free()` と `.delete()` による明示的な WASM メモリ解放
- レンダリングループとの競合状態を避けるための遅延解放パターン

**mujoco-mjcf-reference.md** - MJCF XML リファレンス

- 基本 XML 構造: `mujoco` > `option`、`asset`、`worldbody`
- `option` 要素の属性: `timestep`、`gravity`、`integrator`、`iterations`
- サイズの意味付きジオメトリ型リファレンス: `plane`、`box`、`sphere`、`cylinder`、`capsule`、`ellipsoid`
- ボディとジョイント構造: `freejoint`、`hinge`、`slide`、`ball`
- JavaScript による動的 XML 生成

**mujoco-simulation-loop.md** - シミュレーションループとフレーム同期

- フレームのデルタタイムからステップ数を計算するアダプティブステッピング
- バックグラウンドタブや低速フレームでのフリーズを防ぐ `maxSteps` 上限
- アニメーションループに統合したポーズ制御パターン
- 実行時パラメータ変更: 重力の更新、動的なオブジェクト数の変更
- `0.001s`（高精度）から `0.02s`（パフォーマンス重視）までのタイムステップ選択ガイド

**mujoco-threejs-integration.md** - Three.js / R3F 統合

- MuJoCo ジオメトリから Three.js ジオメトリへのマッピング（`geom_type` インデックス -> BufferGeometry）
- MuJoCo 行優先 3x3 回転行列から Three.js 列優先 4x4 Matrix4 への変換
- 座標系の違い: MuJoCo は Z-up、Three.js は Y-up
- パフォーマンス最適化: ジオメトリのシングルトン化、`matrixAutoUpdate` の無効化、スケールベクトルの事前計算

### MediaPipe Vision WASM

カメラ入力からリアルタイムで人体（手・ポーズ・顔）を検出する MediaPipe Vision Tasks の WASM 統合スキルです。

**mediapipe-wasm-setup.md** - 環境構築

- `@mediapipe/tasks-vision` パッケージのインストールと WASM ファイル配置
- `postinstall` スクリプトによる `public/mediapipe/wasm/` への自動コピー
- Next.js 16 Turbopack 対応の `next.config.ts` 設定
- TypeScript 型定義の問題と回避策

**mediapipe-wasm-init.md** - WASM 初期化

- `FilesetResolver.forVisionTasks()` による WASM 解決（ローカル / CDN 両対応）
- Hand / Pose / Face Landmarker の `createFromOptions` パターン
- `runningMode` の選択ガイド: `IMAGE` / `VIDEO` / `LIVE_STREAM`
- GPU delegate（WebGL アクセラレーション）設定
- `"use client"` + `useEffect` + `cancelled` フラグによる SSR 回避・安全な非同期初期化

**mediapipe-camera-input.md** - カメラ入力と検出ループ

- `getUserMedia` によるカメラストリーム取得と `video` 要素の設定
- `video` + `canvas` のオーバーレイ配置とミラー表示（`scaleX(-1)`）
- `requestAnimationFrame` + `lastVideoTime` ガードによる効率的な検出ループ
- `DrawingUtils` によるランドマーク・接続線の描画パターン
- クリーンアップ順序: rAF 停止 → `close()` → カメラ `track.stop()`

**mediapipe-hand-tracking.md** - ハンドトラッキング

- `HandLandmarker` による手の 21 関節ランドマーク検出
- 左右判定（`handedness`）と正規化座標 / ワールド座標の使い分け
- 21 関節インデックスマップ（WRIST、THUMB、INDEX_FINGER 等）
- `HAND_CONNECTIONS` による接続線描画

**mediapipe-pose-estimation.md** - ポーズ推定

- `PoseLandmarker` による全身 33 関節ランドマーク検出
- Lite / Full / Heavy モデルの精度・速度比較と選択ガイド
- `visibility` に応じた動的描画（低信頼度ランドマークの薄表示）
- ワールド座標（メートル単位、腰が原点）の活用パターン

**mediapipe-face-mesh.md** - 顔メッシュ / ブレンドシェイプ

- `FaceLandmarker` による顔 468 ランドマーク検出
- テセレーション・目・眉・唇・輪郭の個別描画パターン
- ARKit 互換 52 ブレンドシェイプ出力（表情係数）
- ブレンドシェイプのソート・Top-N 表示パターン

### 汎用 WASM パターン

**wasm-nextjs-patterns.md** - WASM + Next.js 統合

- SSR 回避戦略: `"use client"` ディレクティブ、`ssr: false` を指定した `next/dynamic`、`useEffect` ベースの遅延読み込み
- WASM ライフサイクル向け React ステートマシンパターン（`loading` / `error` / `ready`）
- WASM メモリ管理の原則と所有権ルール
- パフォーマンス最適化: TypedArray の直接参照、Web Worker へのオフロード、SharedArrayBuffer
- デプロイ時の考慮点: `Content-Type` ヘッダー、Brotli/gzip 圧縮、CORS 設定

## 使い方

```bash
cp .claude/skills/*.md /your-project/.claude/skills/
```

`.claude/skills/` に配置されたスキルは、タスクに関連する場合に Claude Code が自動的に検出・適用します。

## プロトタイプ

`prototypings/` 配下に各ライブラリの動作検証用プロトタイプがあります。

### MediaPipe (`prototypings/mediapipe/`)

Next.js 16 + @mediapipe/tasks-vision の統合プロトタイプ。

```bash
cd prototypings/mediapipe
npm install
npm run dev
```

- `/hand` — Hand Landmarker（両手 21 関節、左右判定）
- `/pose` — Pose Landmarker（全身 33 関節、visibility 対応）
- `/face` — Face Landmarker（顔 468 点メッシュ、ブレンドシェイプ Top5 表示）

## 技術スタック

- WebAssembly / Emscripten
- Next.js 16+ (App Router / Turbopack)
- React Three Fiber / Three.js
- MediaPipe Vision Tasks (@mediapipe/tasks-vision)
- TypeScript

## ライセンス

MIT
