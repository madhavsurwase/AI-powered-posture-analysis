import { PostureAnalyzer } from "@/components/posture-analyzer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <PostureAnalyzer />
    </main>
  );
}
