"use client";

// AI 추천 결과 화면
//   - 홈에서 sessionStorage에 저장한 질문을 읽어
//     GET /api/congestion, POST /api/recommend 를 호출한다.
//   - 시간대별 혼잡도 막대그래프 (여유/보통/혼잡)
//   - Gemini가 만든 추천 문장 말풍선
//
// 데이터가 한 번만 필요하고 공유 캐시도 필요 없으므로
// 별도 fetching 라이브러리 없이 useEffect + inline loading state 를 사용한다.

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CongestionBarChart,
  CongestionLegend,
} from "@/components/congestion-bar-chart";
import { DAY_LABELS, formatHour } from "@/lib/config";
import type {
  CongestionResponse,
  DayOfWeek,
  RecommendationInput,
  RecommendationResponse,
  RecommendationResult,
} from "@/lib/types";

const STORAGE_KEY = "laundry:lastQuery";

type Load<T> =
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
}

/** 홈 화면이 sessionStorage에 남긴 질문을 읽는다 */
function readQuery(): RecommendationInput | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecommendationInput>;
    if (
      typeof parsed.dayOfWeek === "number" &&
      typeof parsed.hour === "number" &&
      typeof parsed.question === "string"
    ) {
      return parsed as RecommendationInput;
    }
  } catch {
    // sessionStorage 사용 불가/손상된 값 → 질문 없음으로 처리
  }
  return null;
}

export default function ResultPage() {
  const [query, setQuery] = useState<RecommendationInput | null>(null);
  const [congestion, setCongestion] = useState<Load<CongestionResponse>>({
    status: "loading",
  });
  const [recommendation, setRecommendation] = useState<Load<RecommendationResult>>(
    { status: "loading" },
  );

  useEffect(() => {
    let cancelled = false;

    // 1) 시간대별 혼잡도
    async function loadCongestion(day: DayOfWeek) {
      try {
        const res = await fetch(`/api/congestion?day=${day}`);
        if (!res.ok) throw new Error(`혼잡도를 불러오지 못했습니다 (${res.status})`);
        const data = (await res.json()) as CongestionResponse;
        if (!cancelled) setCongestion({ status: "ok", data });
      } catch (err) {
        if (!cancelled) setCongestion({ status: "error", message: toMessage(err) });
      }
    }

    // 2) AI 추천 — 홈에서 질문을 입력한 경우에만 호출
    async function loadRecommendation(input: RecommendationInput | null) {
      if (!input) {
        if (!cancelled) {
          setRecommendation({
            status: "empty",
            message:
              "홈 화면에서 요일·시간대를 고르고 질문을 입력하면 AI 추천을 받을 수 있어요.",
          });
        }
        return;
      }
      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = (await res.json()) as RecommendationResponse;
        if (cancelled) return;
        if (data.status === "ok") {
          setRecommendation({ status: "ok", data: data.result });
        } else {
          setRecommendation({ status: "error", message: data.message });
        }
      } catch (err) {
        if (!cancelled) {
          setRecommendation({ status: "error", message: toMessage(err) });
        }
      }
    }

    void (async () => {
      // sessionStorage는 브라우저에서만 읽을 수 있어 마운트 후 한 번 읽는다.
      const savedQuery = readQuery();
      if (cancelled) return;
      setQuery(savedQuery);

      const day = savedQuery?.dayOfWeek ?? (new Date().getDay() as DayOfWeek);
      await Promise.all([loadCongestion(day), loadRecommendation(savedQuery)]);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const highlightHour =
    recommendation.status === "ok" ? recommendation.data.recommendedHour : null;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">AI 추천 결과</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {query
            ? `${DAY_LABELS[query.dayOfWeek]}요일 ${formatHour(query.hour)} 기준으로 물어보셨어요.`
            : "선택한 요일의 시간대별 혼잡도와 AI 빨래 도우미의 추천입니다."}
        </p>
        {query?.question && (
          <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            “{query.question}”
          </p>
        )}
      </header>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">
          시간대별 혼잡도
          {congestion.status === "ok" &&
            ` · ${DAY_LABELS[congestion.data.dayOfWeek]}요일`}
        </h2>

        {congestion.status === "loading" && (
          <ChartSkeleton label="혼잡도를 불러오는 중…" />
        )}
        {congestion.status === "error" && (
          <ErrorBox message={congestion.message} />
        )}
        {congestion.status === "ok" && (
          <>
            <CongestionBarChart
              cells={congestion.data.cells}
              highlightHour={highlightHour}
            />
            <CongestionLegend />
            {highlightHour !== null && (
              <p className="text-xs text-zinc-500">
                ★ 표시는 AI가 추천한 {formatHour(highlightHour)} 시간대입니다.
              </p>
            )}
          </>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">AI 빨래 도우미</h2>

        {recommendation.status === "loading" && (
          <Bubble>
            <span className="flex items-center gap-2 text-zinc-500">
              <Spinner />
              추천을 만들고 있어요…
            </span>
          </Bubble>
        )}

        {recommendation.status === "empty" && (
          <Bubble>
            <span className="text-zinc-500">{recommendation.message}</span>
          </Bubble>
        )}

        {recommendation.status === "error" && (
          <ErrorBox
            message={recommendation.message}
            title="추천을 받지 못했어요"
          />
        )}

        {recommendation.status === "ok" && (
          <>
            <Bubble>
              <p className="font-medium">{recommendation.data.suggestion}</p>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                {recommendation.data.reason}
              </p>
            </Bubble>
            <p className="text-xs text-zinc-500">
              {recommendation.data.model} 응답 · 학생들이 남긴 기록을 바탕으로 한
              참고용 추천입니다.
            </p>
          </>
        )}
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

function Spinner() {
  return (
    <span
      role="status"
      aria-label="불러오는 중"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200"
    />
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md rounded-2xl rounded-tl-sm border border-zinc-200 bg-white p-4 text-sm leading-6 dark:border-zinc-800 dark:bg-zinc-900">
      {children}
    </div>
  );
}

function ChartSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-[136px] items-center justify-center gap-2 rounded-lg border border-zinc-200 text-sm text-zinc-500 dark:border-zinc-800">
      <Spinner />
      {label}
    </div>
  );
}

function ErrorBox({ message, title }: { message: string; title?: string }) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      {title && <p className="font-medium">{title}</p>}
      <p className={title ? "mt-1" : undefined}>{message}</p>
    </div>
  );
}
