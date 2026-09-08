// AI 추천 결과 화면
//   - 시간대별 혼잡도 막대그래프 (여유/보통/혼잡)
//   - AI가 만든 추천 문장 말풍선
//
// 뼈대 단계: 그래프/말풍선의 자리와 모양만 잡아 둔 placeholder.
// 다음 단계에서 sessionStorage의 질문을 읽어 /api/congestion, /api/recommend 를 호출한다.

import Link from "next/link";
import {
  CongestionBarChart,
  CongestionLegend,
} from "@/components/congestion-bar-chart";
import { HOUR_OPTIONS } from "@/lib/config";
import type { CongestionCell, CongestionLevelOrUnknown } from "@/lib/types";

// TODO(다음 단계): 실제 /api/congestion 응답으로 교체
const PLACEHOLDER_CELLS: CongestionCell[] = HOUR_OPTIONS.map((hour, i) => {
  const pattern: CongestionLevelOrUnknown[] = ["free", "free", "normal", "busy", "normal"];
  const level = pattern[i % pattern.length];
  return {
    dayOfWeek: 4,
    hour,
    sampleCount: level === "unknown" ? 0 : 2,
    averageAvailable: level === "free" ? 4 : level === "normal" ? 2 : level === "busy" ? 0.5 : null,
    level,
  };
});

export default function ResultPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">AI 추천 결과</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          선택한 요일의 시간대별 혼잡도와 AI 빨래 도우미의 추천입니다.
        </p>
      </header>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">시간대별 혼잡도</h2>
        <CongestionBarChart cells={PLACEHOLDER_CELLS} />
        <CongestionLegend />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">AI 빨래 도우미</h2>
        <div className="max-w-md rounded-2xl rounded-tl-sm border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          여기에 Gemini가 만든 추천 문장과 이유가 표시됩니다. (다음 단계에서 연결)
        </div>
      </div>

      <Link
        href="/"
        className="inline-block text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
      >
        ← 다시 질문하기
      </Link>
    </section>
  );
}
