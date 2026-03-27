---
name: mujoco-threejs-integration
description: "MuJoCoとThree.js/React Three Fiberの統合パターン。ジオメトリマッピング、行列変換（行優先→列優先）、座標系対応、パフォーマンス最適化。mujoco threejs r3f integration matrix geometry"
---

# MuJoCoとThree.js/React Three Fiberの統合パターン

## 概要

MuJoCo物理シミュレーションの結果をThree.js（React Three Fiber）で3Dレンダリングするための統合パターン。ジオメトリマッピング、行列変換、座標系対応、パフォーマンス最適化。

---

## MuJoCoジオメトリ → Three.jsジオメトリ マッピング

| MuJoCo `geom_type` | 値 | Three.js Geometry | スケール計算 |
|---|---|---|---|
| plane | 0 | `PlaneGeometry(1,1)` | `makeScale(size[0]*2, size[1]*2, 1)` |
| sphere | 2 | `SphereGeometry(1,32,32)` | `makeScale(size[0], size[0], size[0])` |
| cylinder | 5 | `CylinderGeometry(1,1,1,32)` | X軸90度回転 + `makeScale(size[0], size[1]*2, size[0])` |
| box | 6 | `BoxGeometry(1,1,1)` | `makeScale(size[0]*2, size[1]*2, size[2]*2)` |

---

## ジオメトリ情報の事前解析（useMemo）

```typescript
const geoms = useMemo(() => {
  const result = [];
  const ngeom = model.ngeom;

  for (let i = 0; i < ngeom; i++) {
    const type = model.geom_type[i];
    const size = [
      model.geom_size[i * 3],
      model.geom_size[i * 3 + 1],
      model.geom_size[i * 3 + 2],
    ];
    const rgba = [
      model.geom_rgba[i * 4],
      model.geom_rgba[i * 4 + 1],
      model.geom_rgba[i * 4 + 2],
      model.geom_rgba[i * 4 + 3],
    ];

    // スケール行列を事前計算（フレームごとの計算を回避）
    const scaleM = new THREE.Matrix4();
    let geometry;

    switch (type) {
      case 0: // plane
        geometry = planeGeometry;
        scaleM.makeScale(size[0] * 2, size[1] * 2, 1);
        break;
      case 2: // sphere
        geometry = sphereGeometry;
        scaleM.makeScale(size[0], size[0], size[0]);
        break;
      case 5: // cylinder
        geometry = cylinderGeometry;
        scaleM.makeRotationX(Math.PI / 2);
        scaleM.multiply(new THREE.Matrix4().makeScale(size[0], size[1] * 2, size[0]));
        break;
      case 6: // box
        geometry = boxGeometry;
        scaleM.makeScale(size[0] * 2, size[1] * 2, size[2] * 2);
        break;
    }

    result.push({ type, size, rgba, geometry, scaleM });
  }
  return result;
}, [model]);
```

---

## 行列変換：MuJoCo → Three.js

MuJoCoの回転行列（3x3, 行優先）をThree.jsのMatrix4（4x4, 列優先）に変換：

```typescript
// MuJoCoのデータ配列
const xpos = data.geom_xpos;  // 位置 [x,y,z] × ngeom
const xmat = data.geom_xmat;  // 回転行列 [3×3] × ngeom（行優先）

for (let i = 0; i < geoms.length; i++) {
  const i3 = i * 3;
  const i9 = i * 9;

  // MuJoCo行列 → Three.js Matrix4
  // MuJoCoは行優先、Three.jsのset()は行優先で受け取る
  tempMatrix.set(
    xmat[i9],     xmat[i9 + 1], xmat[i9 + 2], xpos[i3],     // row 0 + tx
    xmat[i9 + 3], xmat[i9 + 4], xmat[i9 + 5], xpos[i3 + 1], // row 1 + ty
    xmat[i9 + 6], xmat[i9 + 7], xmat[i9 + 8], xpos[i3 + 2], // row 2 + tz
    0,            0,            0,            1               // homogeneous
  );

  // 位置・回転行列 × スケール行列を合成
  mesh.matrix.multiplyMatrices(tempMatrix, geoms[i].scaleM);
  mesh.matrixWorldNeedsUpdate = true;
}
```

---

## 座標系の違い

- **MuJoCo**: Z軸が上方向（右手系）
- **Three.js**: デフォルトはY軸が上方向
- **対応**: カメラの`up`を`[0, 0, 1]`に設定

```typescript
<Canvas camera={{ position: [0, -8, 6], up: [0, 0, 1], fov: 50 }}>
```

---

## パフォーマンス最適化テクニック

### 1. ジオメトリのシングルトン化（モジュールスコープ）

```typescript
// ファイルトップレベルで一度だけ生成
const tempMatrix = new THREE.Matrix4();
const tempMatrix2 = new THREE.Matrix4();
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 32);
const planeGeometry = new THREE.PlaneGeometry(1, 1);
```

- 同種オブジェクトはジオメトリインスタンスを共有
- GCプレッシャーを最小化

### 2. matrixAutoUpdateの無効化

```typescript
<mesh matrixAutoUpdate={false}>
```

- Three.jsの自動行列計算を無効化
- MuJoCoから直接行列を設定するため、自動計算は不要かつ無駄

### 3. スケール行列の事前計算

- `useMemo`でモデルロード時に一度だけ計算
- フレームごとのスケール計算を回避

---

## Canvas/シーン構成テンプレート

```tsx
<Canvas
  shadows
  gl={{ powerPreference: "high-performance" }}
  camera={{ position: [0, -8, 6], up: [0, 0, 1], fov: 50 }}
>
  <color attach="background" args={['#18181b']} />
  <ambientLight intensity={0.5} />
  <directionalLight position={[5, 5, 10]} intensity={1} castShadow />
  <MujocoSimulation />
  <OrbitControls />
  <Environment preset="city" />
</Canvas>
```
