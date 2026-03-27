---
name: mujoco-simulation-loop
description: "MuJoCoシミュレーションループ・アダプティブステッピング・フレーム同期・ポーズ制御・リアルタイムパラメータ変更パターン。mujoco simulation loop frame sync adaptive stepping"
---

# MuJoCoシミュレーションループとフレーム同期パターン

## 概要
MuJoCoの物理シミュレーションステップとブラウザのレンダリングフレームを同期するための実装パターン。アダプティブステッピング、ポーズ制御、パラメータのリアルタイム変更。

## アダプティブステッピングパターン
```typescript
useFrame((state, delta) => {
  if (!mujoco || !model || !data || !groupRef.current) return;

  // シミュレーションステップ
  if (!isPaused) {
    const timestep = model.getOptions().timestep || 0.01; // XMLで設定したタイムステップ
    const maxSteps = 10; // フレームスキップ上限（スパイク防止）
    let steps = Math.min(Math.ceil(delta / timestep), maxSteps);

    for (let s = 0; s < steps; s++) {
      data.step(); // MuJoCoシミュレーション1ステップ
    }
  }

  // ... Three.jsメッシュ更新（別Skill参照）
});
```

## 設計の解説
1. **`delta`ベースのステップ数計算**: ブラウザのフレームレートに依存せず、物理時間を正確に進める
   - 60fps時: `delta ≈ 0.0167s / 0.01s = 2ステップ`
   - 30fps時: `delta ≈ 0.0333s / 0.01s = 4ステップ`
2. **`maxSteps`制限**: タブがバックグラウンドに行った際等、`delta`が大きくなりすぎるのを防止
   - 制限なしだと数百ステップ実行されてフリーズする
3. **`Math.ceil`の使用**: 端数は切り上げて物理時間が実時間に追いつくようにする

## ポーズ制御パターン
```typescript
const [isPaused, setIsPaused] = useState(false);

// useFrame内でチェック
if (!isPaused) {
  // ステップ実行
}

// UIボタン
<button onClick={() => setIsPaused(!isPaused)}>
  {isPaused ? '再開' : '一時停止'}
</button>
```

## リアルタイムパラメータ変更

### 重力の変更（モデル再ロード不要）
```typescript
const [gravity, setGravity] = useState(-9.81);
const gravityRef = useRef(gravity);

// useRefで最新値を保持（useFrameからの参照用）
useEffect(() => {
  gravityRef.current = gravity;
}, [gravity]);

// モデルのオプションを直接変更
useEffect(() => {
  if (model?.opt?.gravity) {
    model.opt.gravity[2] = gravity;
  }
}, [model, gravity]);
```

### オブジェクト数の変更（モデル再ロード必要）
```typescript
const [numObjects, setNumObjects] = useState(50);

useEffect(() => {
  if (mujoco) {
    loadModel(mujoco, numObjects); // XMLを再生成してモデルをリロード
  }
}, [mujoco, numObjects, loadModel]);
```

## タイムステップの選択ガイド
| timestep | 用途 | 安定性 | 負荷 |
|---|---|---|---|
| 0.001s | 高精度シミュレーション | 非常に高い | 高い（60fpsで17ステップ/フレーム） |
| 0.005s | 標準的なシミュレーション | 高い | 中程度 |
| 0.01s | リアルタイムデモ（推奨） | 普通 | 低い（60fpsで2ステップ/フレーム） |
| 0.02s | 軽量デモ | やや低い | 非常に低い |

## XMLでのタイムステップ設定
```xml
<option timestep="0.01" gravity="0 0 -9.81" integrator="Euler" iterations="20"/>
```
- `integrator`: Euler（高速）/ RK4（高精度）
- `iterations`: ソルバーイテレーション数（高いほど安定だが遅い）
