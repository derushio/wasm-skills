---
name: mujoco-wasm-init
description: "MuJoCo WASMの動的import・Emscriptenモジュール初期化パターン。webpackIgnore、locateFile、React統合。mujoco wasm init dynamic import emscripten"
---

# MuJoCo WASM 動的import・初期化パターン

## 概要

MuJoCo WASMエンジンをブラウザで動的にロード・初期化するパターン。Emscriptenモジュールの非同期初期化、Reactコンポーネントとの統合方法。

## WASM動的importパターン

```typescript
useEffect(() => {
  let isMounted = true;

  // @ts-ignore - webpackIgnoreで型チェックスキップ
  import(/* webpackIgnore: true */ '/mujoco/mujoco_wasm.js?v=' + Date.now())
    .then((module) => {
      const initMujoco = module.default;
      return initMujoco({
        locateFile: (path: string) => `/mujoco/${path}`,
      });
    })
    .then((m) => {
      if (isMounted) {
        setMujoco(m);
      }
    })
    .catch((err) => {
      if (isMounted) {
        setError('MuJoCo WASMの読み込みに失敗: ' + err.message);
      }
    });

  return () => { isMounted = false; };
}, []);
```

## 重要ポイント

1. **`/* webpackIgnore: true */`** - Webpackのモジュールバンドルをバイパスし、ランタイムで動的にロード
2. **`?v=` + `Date.now()`** - ブラウザキャッシュバスティング。開発中のWASM更新を即座に反映
3. **`locateFile`コールバック** - Emscriptenが`.wasm`ファイルを見つけるためのパス解決関数
4. **`isMounted`フラグ** - Reactコンポーネントアンマウント後のsetState防止（メモリリーク対策）
5. **`module.default`** - Emscriptenのデフォルトエクスポートが初期化関数

## Emscriptenモジュールオブジェクト（`m`）の主要API

- `m.FS` - Emscripten仮想ファイルシステム
- `m.Model` - MuJoCoモデルクラス
- `m.State` - シミュレーション状態クラス
- `m.Simulation` - シミュレーションクラス

## React状態管理パターン

```typescript
const [mujoco, setMujoco] = useState<any>(null);  // Emscriptenモジュール
const [model, setModel] = useState<any>(null);     // MuJoCoモデル
const [data, setData] = useState<any>(null);       // シミュレーションデータ
const [error, setError] = useState<string | null>(null);
```

- 全て `any` 型（WASMバインディングに型定義がないため）
- ロード完了まではnull、UIでローディング表示を制御

## 注意事項

- WASMは必ずクライアントサイドでのみロード（`"use client"`必須）
- SSR環境では`window`や`WebAssembly`が存在しないためエラーになる
- 初回ロードにネットワーク時間がかかるため、ローディングUIの実装を推奨
