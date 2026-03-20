# wasm-skills

A collection of Claude Code skills for WebAssembly integration in web applications.

Currently focused on MuJoCo WASM with Next.js and React Three Fiber. Additional WASM library skills will be added over time.

## Skills

### MuJoCo WASM

Skills for integrating the MuJoCo physics simulation engine via its WASM build.

**mujoco-wasm-setup.md** - Environment Setup

- WASM file placement under `public/mujoco/` for static serving
- `next.config.ts` webpack fallback configuration for Node.js built-ins
- Required dependencies and recommended `tsconfig.json` settings
- Troubleshooting guide for common setup errors

**mujoco-wasm-init.md** - WASM Initialization

- Dynamic import with `webpackIgnore` comment to bypass bundler processing
- Emscripten `locateFile` callback and cache busting strategies
- React state management with `useState` and `useEffect` for async initialization
- `isMounted` flag pattern to prevent memory leaks on component unmount
- Overview of key Emscripten module APIs: `FS`, `Model`, `State`, `Simulation`

**mujoco-model-loading.md** - Model Loading and Memory Management

- Writing model data into the Emscripten virtual filesystem via `FS.writeFile`
- Object creation flow: `Model` -> `State` -> `Simulation`
- Key properties reference: `ngeom`, `geom_type`, `geom_size`, `geom_pos`, `geom_mat`, and others
- Explicit WASM memory release using `.free()` and `.delete()`
- Deferred release pattern to avoid race conditions with the rendering loop

**mujoco-mjcf-reference.md** - MJCF XML Reference

- Basic XML structure: `mujoco` > `option`, `asset`, `worldbody`
- `option` element attributes: `timestep`, `gravity`, `integrator`, `iterations`
- Geometry type reference with size semantics: `plane`, `box`, `sphere`, `cylinder`, `capsule`, `ellipsoid`
- Body and joint structures: `freejoint`, `hinge`, `slide`, `ball`
- Dynamic XML generation from JavaScript

**mujoco-simulation-loop.md** - Simulation Loop and Frame Sync

- Adaptive stepping: calculating step count from frame delta time
- `maxSteps` cap to prevent freezing on background tabs or slow frames
- Pause control pattern integrated into the animation loop
- Runtime parameter changes: gravity updates, dynamic object count modification
- Timestep selection guide ranging from `0.001s` (high precision) to `0.02s` (performance)

**mujoco-threejs-integration.md** - Three.js / R3F Integration

- MuJoCo geometry to Three.js geometry mapping (`geom_type` index -> BufferGeometry)
- Matrix conversion from MuJoCo row-major 3x3 rotation to Three.js column-major 4x4 Matrix4
- Coordinate system differences: MuJoCo Z-up vs Three.js Y-up
- Performance optimizations: geometry singletons, disabling `matrixAutoUpdate`, pre-computing scale vectors

### General WASM Patterns

**wasm-nextjs-patterns.md** - WASM + Next.js Integration

- SSR avoidance strategies: `"use client"` directive, `next/dynamic` with `ssr: false`, `useEffect`-based lazy loading
- React state machine pattern for WASM lifecycle (`loading` / `error` / `ready`)
- WASM memory management principles and ownership rules
- Performance optimizations: TypedArray direct references, Web Worker offloading, SharedArrayBuffer
- Deployment considerations: `Content-Type` headers, Brotli/gzip compression, CORS configuration

## Usage

```bash
cp .claude/skills/*.md /your-project/.claude/skills/
```

Claude Code automatically discovers and applies skills from `.claude/skills/` when they are relevant to your task.

## Tech Stack (Current)

- WebAssembly / Emscripten
- Next.js (App Router)
- React Three Fiber / Three.js
- TypeScript

## License

MIT
