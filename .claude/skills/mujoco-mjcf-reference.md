---
description: "MuJoCo MJCF XMLフォーマットリファレンス。geomタイプ、joint、option、asset、動的XML生成パターン。mujoco mjcf xml reference geom joint body"
---

# MuJoCo MJCF XMLフォーマットリファレンス

## 概要
MuJoCo MJCF（MuJoCo Modeling Format）XMLの構造・要素・属性のクイックリファレンス。WASM環境での動的XML生成に必要な知識。

## 基本XML構造
```xml
<mujoco>
  <option timestep="0.01" gravity="0 0 -9.81" integrator="Euler" iterations="20"/>

  <asset>
    <texture .../>
    <material .../>
  </asset>

  <worldbody>
    <light .../>
    <geom .../> <!-- 静的ジオメトリ（地面、壁等） -->
    <body name="obj" pos="x y z">
      <freejoint/>  <!-- 6自由度ジョイント -->
      <geom type="..." size="..." rgba="..." mass="1"/>
    </body>
  </worldbody>
</mujoco>
```

## `<option>` 要素
| 属性 | 説明 | デフォルト |
|---|---|---|
| `timestep` | シミュレーションタイムステップ（秒） | 0.002 |
| `gravity` | 重力ベクトル `"x y z"` | `"0 0 -9.81"` |
| `integrator` | 積分法: `Euler`, `RK4`, `implicit` | `Euler` |
| `iterations` | ソルバーイテレーション数 | 100 |

## `<asset>` 要素

### テクスチャ
```xml
<texture type="skybox" builtin="gradient" rgb1="0.3 0.5 0.7" rgb2="0 0 0" width="512" height="512"/>
<texture name="texplane" type="2d" builtin="checker" rgb1=".2 .3 .4" rgb2=".1 0.15 0.2"
         width="512" height="512" mark="cross" markrgb=".8 .8 .8"/>
```

### マテリアル
```xml
<material name="matplane" reflectance="0.3" texture="texplane" texrepeat="1 1" texuniform="true"/>
```

## `<worldbody>` 要素

### ライト
```xml
<light directional="true" diffuse=".8 .8 .8" specular=".2 .2 .2" pos="0 0 5" dir="0 0 -1"/>
```

### ジオメトリタイプ（`<geom>`）
| type | 説明 | size意味 | size例 |
|---|---|---|---|
| `plane` | 無限平面 | `[x半幅, y半幅, 間隔]` | `"5 5 0.1"` |
| `box` | 直方体 | `[x半幅, y半幅, z半幅]` | `"0.3 0.3 0.3"` |
| `sphere` | 球 | `[半径]` | `"0.3"` |
| `cylinder` | 円柱 | `[半径, 半長]` | `"0.2 0.4"` |
| `capsule` | カプセル | `[半径, 半長]` | `"0.2 0.4"` |
| `ellipsoid` | 楕円体 | `[x半径, y半径, z半径]` | `"0.3 0.2 0.1"` |

### geom属性
| 属性 | 説明 | 例 |
|---|---|---|
| `name` | 識別名 | `"ground"` |
| `type` | ジオメトリタイプ | `"box"` |
| `size` | サイズ（タイプ依存） | `"0.3 0.3 0.3"` |
| `pos` | 位置 `"x y z"` | `"0 0 1"` |
| `rgba` | 色 `"r g b a"` (0-1) | `"0.8 0.2 0.3 1"` |
| `mass` | 質量（kg） | `"1"` |
| `friction` | 摩擦係数 `"slide spin roll"` | `"1 0.005 0.0001"` |
| `material` | マテリアル参照 | `"matplane"` |

## `<body>` と `<joint>`

### body要素
```xml
<body name="obj0" pos="1.5 -0.3 2">
  <freejoint/>  <!-- 6自由度（並進3 + 回転3） -->
  <geom type="box" size="0.3 0.3 0.3" rgba="0.8 0.3 0.2 1" mass="1"/>
</body>
```

### ジョイントタイプ
| タイプ | 説明 | 自由度 |
|---|---|---|
| `freejoint` | 完全自由（落下物等） | 6 |
| `hinge` | 回転ジョイント | 1 |
| `slide` | 直線スライド | 1 |
| `ball` | 球面ジョイント | 3 |

## 動的XML生成パターン（JavaScript）
```typescript
function generateXML(numObjects: number): string {
  const types = ["box", "sphere", "cylinder"];
  let bodies = '';

  for (let i = 0; i < numObjects; i++) {
    const type = types[i % types.length];
    const x = (Math.random() - 0.5) * 4;
    const y = (Math.random() - 0.5) * 4;
    const z = 2 + i * 0.8;
    const r = (Math.random() * 0.5 + 0.5).toFixed(2);
    const g = (Math.random() * 0.5 + 0.5).toFixed(2);
    const b = (Math.random() * 0.5 + 0.5).toFixed(2);

    let size;
    switch (type) {
      case "box": size = "0.3 0.3 0.3"; break;
      case "sphere": size = "0.3"; break;
      case "cylinder": size = "0.2 0.4"; break;
    }

    bodies += `
    <body name="obj${i}" pos="${x} ${y} ${z}">
      <freejoint/>
      <geom type="${type}" size="${size}" rgba="${r} ${g} ${b} 1" mass="1" friction="0.5 0.005 0.0001"/>
    </body>`;
  }

  return `<mujoco>
  <option timestep="0.01" gravity="0 0 -9.81" integrator="Euler" iterations="20"/>
  <worldbody>
    <geom name="ground" type="box" size="5 5 0.1" pos="0 0 -0.1" rgba="0.8 0.8 0.8 1"/>
    ${bodies}
  </worldbody>
</mujoco>`;
}
```

## ボウル（壁付き）構造パターン
```xml
<geom name="ground" type="box" size="5 5 0.1" pos="0 0 -0.1" rgba="0.8 0.8 0.8 1" friction="1 0.005 0.0001"/>
<geom name="wall1" type="box" size="5 0.1 1" pos="0 5 1" rgba="0.8 0.8 0.8 0.5"/>
<geom name="wall2" type="box" size="5 0.1 1" pos="0 -5 1" rgba="0.8 0.8 0.8 0.5"/>
<geom name="wall3" type="box" size="0.1 5 1" pos="5 0 1" rgba="0.8 0.8 0.8 0.5"/>
<geom name="wall4" type="box" size="0.1 5 1" pos="-5 0 1" rgba="0.8 0.8 0.8 0.5"/>
```
- 半透明壁（alpha=0.5）でオブジェクトの外部への飛び出しを防止
- 地面は少し下げて配置（`pos="0 0 -0.1"`）
