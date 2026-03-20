import Link from "next/link";

const demos = [
  {
    href: "/hand",
    title: "Hand Landmarker",
    description: "リアルタイムで手のランドマーク（21点）を検出します。",
  },
  {
    href: "/pose",
    title: "Pose Landmarker",
    description: "全身のポーズランドマーク（33点）をリアルタイム推定します。",
  },
  {
    href: "/face",
    title: "Face Landmarker",
    description: "顔のランドマーク（478点）を検出しフェイスメッシュを表示します。",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-16">
      <h1 className="text-4xl font-bold mb-3 tracking-tight">MediaPipe Demos</h1>
      <p className="text-zinc-400 mb-12 text-center max-w-md">
        @mediapipe/tasks-vision を使ったリアルタイム推論のプロトタイプ集です。
      </p>
      <div className="grid gap-6 w-full max-w-2xl">
        {demos.map((demo) => (
          <Link
            key={demo.href}
            href={demo.href}
            className="block rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-5 hover:border-zinc-600 hover:bg-zinc-800 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-1">{demo.title}</h2>
            <p className="text-zinc-400 text-sm">{demo.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
