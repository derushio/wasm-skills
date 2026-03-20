---
description: "MuJoCoモデルのロード・MJCF XML・仮想FS書き込み・Model/State/Simulation生成・WASMメモリ解放パターン。mujoco model loading virtual fs memory management"
---

# MuJoCoモデルのロード・生成・メモリ管理パターン

## 概要
MuJoCo WASMでのモデルロードフロー：MJCF XML生成→仮想FS書き込み→Model/State/Simulation生成→メモリ解放パターン。

## モデルロードの基本フロー
```typescript
const loadModel = useCallback((m: any, xmlString: string) => {
  // 1. Emscripten仮想FSにXMLを書き込む
  m.FS.writeFile("model.xml", xmlString);

  // 2. Model・State・Simulationを生成
  const newModel = new m.Model("model.xml");
  const newState = new m.State(newModel);
  const newSimulation = new m.Simulation(newModel, newState);

  // 3. オプション設定（重力等）
  if (newModel.opt && newModel.opt.gravity) {
    newModel.opt.gravity[2] = -9.81; // Z軸重力
  }

  return { model: newModel, state: newState, simulation: newSimulation };
}, []);
```

## Emscripten仮想ファイルシステム（FS）
- `m.FS.writeFile(path, content)` - ファイルを仮想FSに書き込み
- XMLの文字列をそのまま渡せる（バイナリ変換不要）
- ファイルパスは仮想的なもの（実際のファイルシステムには書き込まれない）

## MuJoCo APIオブジェクト構造
| オブジェクト | 生成方法 | 役割 |
|---|---|---|
| `Model` | `new m.Model("model.xml")` | 物理モデル定義（静的データ） |
| `State` | `new m.State(model)` | シミュレーション状態（動的データ） |
| `Simulation` | `new m.Simulation(model, state)` | シミュレーション実行エンジン |

## Modelオブジェクトの主要プロパティ
```typescript
model.ngeom              // ジオメトリ総数 (number)
model.geom_type[i]       // ジオメトリ種別 (0=plane, 2=sphere, 5=cylinder, 6=box)
model.geom_size[i*3..+2] // サイズ (Float64Array, 各geom3要素)
model.geom_rgba[i*4..+3] // RGBA色 (Float64Array, 各geom4要素)
model.opt.gravity[0..2]  // 重力ベクトル [x, y, z]
model.getOptions()       // オプション取得 (.timestep等)
```

> **命名規約**: 実装例では `new m.Simulation(model, state)` の戻り値を `data` 変数に格納しています。これはMuJoCoのC APIで `mjData` と呼ばれるシミュレーションデータに対応するためです。

## Simulation(data)オブジェクトの主要プロパティ
```typescript
data.step()              // シミュレーション1ステップ実行
data.geom_xpos[i*3..+2]  // ジオメトリのワールド位置 (Float64Array)
data.geom_xmat[i*9..+8]  // ジオメトリの3x3回転行列 (Float64Array, 行優先)
```

## WASMメモリ解放パターン（重要）
```typescript
// WASMオブジェクトはJSのGCでは解放されない！明示的に解放必須
setModel((prevModel: any) => {
  if (prevModel) {
    // APIバージョンによりfree()またはdelete()
    setTimeout(() => {
      prevModel.free ? prevModel.free() : (prevModel.delete && prevModel.delete());
    }, 100); // 遅延解放で参照切れを防止
  }
  return newModel;
});
```

## メモリ管理の注意点
- WASMヒープ上のオブジェクトはJavaScriptのGCでは回収されない
- `free()` または `delete()` を明示的に呼び出す必要がある
- モデル再ロード時は旧オブジェクトを必ず解放すること
- 100ms遅延は、レンダリングループが旧データを参照中の可能性があるため

## モデル再ロードのuseEffectパターン
```typescript
useEffect(() => {
  if (mujoco) {
    loadModel(mujoco, numObjects);
  }
}, [mujoco, numObjects, loadModel]);
```
