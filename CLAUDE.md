# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code向けスキルドキュメント集リポジトリ。アプリケーションコードは含まない。

MuJoCo WASM + Next.js (App Router) + React Three Fiber / Three.js の統合パターンを `.claude/skills/` 配下のMarkdownファイルとして管理。対象プロジェクトに `cp .claude/skills/*.md /your-project/.claude/skills/` でコピーして使用する。

## Repository Structure

```
prototypings/             # 各WASMライブラリの動作検証用プロトタイプ
  <library-name>/         # ライブラリごとにディレクトリを分離（例: mujoco/）
.claude/skills/           # Claude Codeが自動検出するスキル定義ファイル群
├── mujoco-wasm-setup.md          # 環境構築（WASMファイル配置、webpack fallback）
├── mujoco-wasm-init.md           # WASM動的import・初期化パターン
├── mujoco-model-loading.md       # Model→State→Simulation生成・メモリ管理
├── mujoco-mjcf-reference.md      # MJCF XMLフォーマット・ジオメトリ型定義
├── mujoco-simulation-loop.md     # アダプティブステッピング・フレーム同期
├── mujoco-threejs-integration.md # 座標系変換・行列変換・パフォーマンス最適化
└── wasm-nextjs-patterns.md       # 汎用WASM + Next.js統合パターン（SSR回避等）
```

## Skill Dependency Order

スキルは以下の順序で段階的に適用される設計：

```
setup → init → model-loading → mjcf-reference → simulation-loop → threejs-integration
                                                                         ↑
wasm-nextjs-patterns（横断的な汎用パターン）─────────────────────────────────┘
```

## Key Technical Decisions

- MuJoCo WASMは npm パッケージではなく `public/mujoco/` に直接配置する方針
- WASMバインディングに型定義がないため TypeScript `any` 型を意図的に許容
- `"use client"` を徹底し SSR での WASM ロードを完全に回避
- WASMヒープオブジェクトは JS GC対象外のため `free()`/`delete()` の明示的呼び出しが必須
- MuJoCo (Z-up) と Three.js (Y-up) の座標系差異は `camera={{ up: [0, 0, 1] }}` で対応

## Prototyping Convention

- `prototypings/<library-name>/` 配下に各WASMライブラリの動作検証用プロトタイプを作成する
- プロトタイプはスキル作成の前段階として、実際に動作するコードで統合パターンを検証する目的で使用
- プロトタイプで得られた知見をスキルファイル（`.claude/skills/`）に反映すること
- 各プロトタイプは独立した Next.js プロジェクトとして構成し、他のプロトタイプに依存しないこと
- ディレクトリ命名はWASMライブラリ名をそのまま使用（例: `prototypings/mujoco/`）

## Editing Guidelines

- スキルファイルの frontmatter `description` フィールドは Claude Code のマッチングに使用されるため、正確なキーワードを含めること
- 各スキルファイルは独立して参照可能なよう、必要な情報を自己完結的に記述すること
- コード例は Next.js App Router + React Three Fiber 環境を前提とすること
