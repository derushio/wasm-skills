---
name: wasm-nextjs-patterns
description: "汎用WASM + Next.js統合パターン。webpackIgnore動的import、Emscripten設定、SSR回避、メモリ管理、デプロイ。wasm nextjs webpack emscripten dynamic import ssr"
---

# 汎用WASM + Next.js統合パターン

WebAssemblyモジュールをNext.js（App Router）プロジェクトに統合するための汎用パターン集。Emscriptenビルド、動的import、webpack設定、SSR回避、メモリ管理。

## 1. WASMファイルの配置パターン

```
public/
  wasm-module/
    module.js       ← Emscripten JSグルーコード
    module.wasm     ← WASMバイナリ
```

- Next.jsの`public/`ディレクトリに配置し、静的アセットとして配信
- npmパッケージとして配布されるWASMより、直接配置の方が制御しやすいケースが多い

## 2. webpack fallback設定（next.config.ts）

```typescript
const nextConfig: NextConfig = {
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

- EmscriptenコンパイルされたJSがNode.js APIを参照するため必須
- `!isServer`条件でクライアントバンドルのみに適用
- 使用するWASMモジュールによって必要なfallbackは異なる

## 3. 動的importパターン（webpackIgnore）

```typescript
// WASMモジュールはWebpackバンドルに含めず、ランタイムで動的ロード
const module = await import(
  /* webpackIgnore: true */ '/wasm-module/module.js?v=' + Date.now()
);
const instance = module.default({
  locateFile: (path: string) => `/wasm-module/${path}`,
});
```

### なぜ`webpackIgnore`が必要か

- Webpackは`.wasm`ファイルのバンドルを試みてエラーになる
- EmscriptenのJSグルーコードは自前でWASMをfetchするため、バンドル不要
- `webpackIgnore: true`でWebpackの解析・バンドルを完全にスキップ

### `locateFile`コールバック

- Emscriptenが`.wasm`ファイルを探す際に呼ばれる
- デフォルトではJSファイルと同じディレクトリを探すが、CDNやpublicパスでは一致しないことがある
- 明示的にパスを返すことで確実にWASMを見つけられる

### キャッシュバスティング

- `?v=` + `Date.now()` で開発中のWASM更新を即座に反映
- 本番環境ではビルドハッシュやバージョン番号に置き換え推奨

## 4. SSR回避パターン

```typescript
// パターンA: "use client" ディレクティブ
"use client";

// パターンB: next/dynamic でSSR無効化
import dynamic from 'next/dynamic';
const WasmComponent = dynamic(() => import('./WasmComponent'), { ssr: false });

// パターンC: useEffect内でのみロード（サーバーサイドでは実行されない）
useEffect(() => {
  // WASM関連の処理はここに書く
}, []);
```

## 5. React状態管理パターン

```typescript
const [wasmModule, setWasmModule] = useState<any>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  let isMounted = true;

  loadWasm()
    .then((m) => {
      if (isMounted) {
        setWasmModule(m);
        setIsLoading(false);
      }
    })
    .catch((err) => {
      if (isMounted) {
        setError(err.message);
        setIsLoading(false);
      }
    });

  return () => { isMounted = false; };
}, []);

// 条件付きレンダリング
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
return <MainContent wasm={wasmModule} />;
```

## 6. WASMメモリ管理の原則

```typescript
// WASMオブジェクトはJSのGCで回収されない
// 明示的にfree/deleteを呼ぶ必要がある

// パターン: React stateの更新時に旧オブジェクトを解放
setInstance((prev) => {
  if (prev) {
    setTimeout(() => {
      prev.free ? prev.free() : (prev.delete && prev.delete());
    }, 100); // レンダリングループとの競合を避ける遅延解放
  }
  return newInstance;
});

// パターン: コンポーネントアンマウント時のクリーンアップ
useEffect(() => {
  return () => {
    instanceRef.current?.free?.();
    instanceRef.current?.delete?.();
  };
}, []);
```

## 7. Emscripten仮想ファイルシステム（FS）

```typescript
// ファイル書き込み
m.FS.writeFile("data.xml", xmlString);

// ファイル読み込み
const content = m.FS.readFile("output.dat");

// ディレクトリ作成
m.FS.mkdir("/models");

// ファイル存在確認
try {
  m.FS.stat("/models/data.xml");
  // 存在する
} catch {
  // 存在しない
}
```

## 8. パフォーマンス最適化の一般原則

1. **オブジェクトプーリング**: フレームごとのオブジェクト生成を避け、事前に確保
2. **TypedArrayの直接参照**: WASMメモリをTypedArrayとして直接参照（コピー不要）
3. **Web Workerへのオフロード**: 重いWASM計算はメインスレッドから分離可能
4. **SharedArrayBuffer**: Worker間でメモリを共有（COOP/COEP設定が必要）

## 9. デプロイ時の注意点

- WASMファイルのContent-Typeが`application/wasm`であること確認
- gzip/brotli圧縮でWASMファイルサイズを削減（サーバー設定）
- CDN配信時はCORSヘッダーの設定が必要な場合あり
- `output: 'standalone'`でCloud Run等へのデプロイに対応

## 10. トラブルシューティング

| 症状 | 原因 | 解決策 |
|---|---|---|
| `fs is not defined` | webpack fallback未設定 | `config.resolve.fallback.fs = false` |
| WASMファイルが404 | パスが間違い | `locateFile`でパスを明示指定 |
| ハイドレーションエラー | SSRでWASMアクセス | `"use client"` or `dynamic({ ssr: false })` |
| メモリリーク | WASMオブジェクト未解放 | `free()`/`delete()`を明示呼び出し |
| CORS エラー | CDN/外部配信時 | サーバーのCORS設定確認 |
