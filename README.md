# wasm-skills

Webアプリケーションへの WebAssembly 統合を支援する Claude Code スキル集です。

現在は MuJoCo WASM と Next.js / React Three Fiber を中心に構成されています。今後、他の WASM ライブラリ向けスキルも順次追加予定です。

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

## 技術スタック（現在）

- WebAssembly / Emscripten
- Next.js (App Router)
- React Three Fiber / Three.js
- TypeScript

## ライセンス

MIT
