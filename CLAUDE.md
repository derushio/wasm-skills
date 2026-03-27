# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code向けスキルドキュメント集リポジトリ。アプリケーションコードは含まない。

MuJoCo WASM + Next.js (App Router) + React Three Fiber / Three.js の統合パターン、および MediaPipe Vision WASM + Next.js のカメラ入力・人体トラッキングパターンを `skills/` 配下のSKILL.mdファイルとして管理。`npx skills add derushio/wasm-skills` で他のプロジェクトにインストール可能。

## Repository Structure

```
prototypings/             # 各WASMライブラリの動作検証用プロトタイプ
  <library-name>/         # ライブラリごとにディレクトリを分離（例: mujoco/）
skills/                   # npx skills add でインストール可能なスキル群（SKILL.md形式）
├── mujoco-wasm-setup/            # 環境構築（WASMファイル配置、webpack fallback）
├── mujoco-wasm-init/             # WASM動的import・初期化パターン
├── mujoco-model-loading/         # Model→State→Simulation生成・メモリ管理
├── mujoco-mjcf-reference/        # MJCF XMLフォーマット・ジオメトリ型定義
├── mujoco-simulation-loop/       # アダプティブステッピング・フレーム同期
├── mujoco-threejs-integration/   # 座標系変換・行列変換・パフォーマンス最適化
├── wasm-nextjs-patterns/         # 汎用WASM + Next.js統合パターン（SSR回避等）
├── mediapipe-wasm-setup/         # MediaPipe環境構築（@mediapipe/tasks-vision、WASM配置）
├── mediapipe-wasm-init/          # FilesetResolver・タスク生成・SSR回避・GPU delegate
├── mediapipe-camera-input/       # カメラ入力・検出ループ・Canvas描画・DrawingUtils
├── mediapipe-hand-tracking/      # HandLandmarker（手21関節・左右判定・ジェスチャー）
├── mediapipe-pose-estimation/    # PoseLandmarker（全身33関節・visibility・ワールド座標）
└── mediapipe-face-mesh/          # FaceLandmarker（顔468点・ブレンドシェイプ・表情認識）
.claude/skills/           # skills/ へのシンボリックリンク（このリポジトリ自身での利用用）
```

## Skill Dependency Order

スキルは以下の順序で段階的に適用される設計：

```
[MuJoCo系]
setup → init → model-loading → mjcf-reference → simulation-loop → threejs-integration
                                                                         ↑
wasm-nextjs-patterns（横断的な汎用パターン）─────────────────────────────────┘

[MediaPipe系]
mediapipe-wasm-setup → mediapipe-wasm-init → mediapipe-camera-input
                                                  ↓
                              mediapipe-hand-tracking / mediapipe-pose-estimation / mediapipe-face-mesh
```

## Key Technical Decisions

- MuJoCo WASMは npm パッケージではなく `public/mujoco/` に直接配置する方針
- WASMバインディングに型定義がないため TypeScript `any` 型を意図的に許容
- `"use client"` を徹底し SSR での WASM ロードを完全に回避
- WASMヒープオブジェクトは JS GC対象外のため `free()`/`delete()` の明示的呼び出しが必須
- MuJoCo (Z-up) と Three.js (Y-up) の座標系差異は `camera={{ up: [0, 0, 1] }}` で対応
- MediaPipe Vision は `@mediapipe/tasks-vision` 統合パッケージを使用（旧個別パッケージはレガシー）
- MediaPipe WASMは `public/mediapipe/wasm/` にpostinstallスクリプトでコピー配置
- MediaPipe タスクの `close()` メソッドでWASMリソースを明示的に解放
- Next.js 16ではTurbopackデフォルト有効、webpack設定がある場合 `turbopack: {}` キーが必須

## Prototyping Convention

- `prototypings/<library-name>/` 配下に各WASMライブラリの動作検証用プロトタイプを作成する
- プロトタイプはスキル作成の前段階として、実際に動作するコードで統合パターンを検証する目的で使用
- プロトタイプで得られた知見をスキルファイル（`.claude/skills/`）に反映すること
- 各プロトタイプは独立した Next.js プロジェクトとして構成し、他のプロトタイプに依存しないこと
- ディレクトリ命名はWASMライブラリ名をそのまま使用（例: `prototypings/mujoco/`）

## Editing Guidelines

- スキルファイルの frontmatter `name` および `description` フィールドは Claude Code のマッチングに使用されるため、正確なキーワードを含めること
- 各スキルファイルは独立して参照可能なよう、必要な情報を自己完結的に記述すること
- コード例は Next.js App Router + React Three Fiber 環境を前提とすること
- スキルファイルは `skills/<name>/SKILL.md` 形式で配置し、`.claude/skills/` にはシンボリックリンクを配置すること
