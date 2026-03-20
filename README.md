# wasm-skills

Claude Code skills for MuJoCo WASM + Next.js/React Three Fiber integration.

## Skills

| File | Description |
|------|-------------|
| `mujoco-wasm-init.md` | Dynamic WASM import and Emscripten module initialization patterns |
| `mujoco-wasm-setup.md` | Next.js environment setup: WASM file placement and webpack configuration |
| `mujoco-simulation-loop.md` | Simulation loop implementation and frame synchronization |
| `mujoco-threejs-integration.md` | Three.js/R3F integration: geometry mapping and row-major to column-major matrix conversion |
| `mujoco-mjcf-reference.md` | MJCF XML format reference for defining MuJoCo models |
| `mujoco-model-loading.md` | Model loading and memory management patterns |
| `wasm-nextjs-patterns.md` | General-purpose WASM + Next.js integration patterns |

## Usage

Copy the skill files into your project's `.claude/skills/` directory:

```bash
cp .claude/skills/*.md /your-project/.claude/skills/
```

Claude Code will automatically discover and use skills from `.claude/skills/` when relevant to your task.

## Tech Stack

- MuJoCo WASM
- Next.js
- React Three Fiber
- Three.js
- Emscripten

## License

MIT
