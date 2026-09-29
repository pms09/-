"use client";

// 홈 / 입력 화면
//   - 요일·시간대 선택
//   - 자연어로 상황을 묻는 입력창
//   - '추천받기' 버튼 → AI 추천 결과 화면으로 이동
//
// 입력값은 sessionStorage에 담아 결과 화면으로 넘긴다.
// 실제 /api/recommend 호출은 결과 화면에서 이루어진다.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DAY_LABELS, DAY_OPTIONS, HOUR_OPTIONS, formatHour } from "@/lib/config";
import type { DayOfWeek, RecommendationInput } from "@/lib/types";

const STORAGE_KEY = "laundry:lastQuery";

export default function HomePage() {
  const router = useRouter();
  const now = new Date();

  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(now.getDay() as DayOfWeek);
  const [hour, setHour] = useState<number>(
    HOUR_OPTIONS.includes(now.getHours()) ? now.getHours() : HOUR_OPTIONS[0],
  );
  const [question, setQuestion] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload: RecommendationInput = { dayOfWeek, hour, question: question.trim() };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // sessionStorage 사용 불가 시 무시 (결과 화면이 기본값으로 동작)
    }
    router.push("/result");
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">AI 빨래 도우미</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          가고 싶은 요일·시간대를 고르고 상황을 편하게 적어 주세요. 학생들이 남긴
          혼잡도 기록을 바탕으로 언제 가면 좋을지 추천해 드립니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">요일</span>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value) as DayOfWeek)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {DAY_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  {DAY_LABELS[day]}요일
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">시간대</span>
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">상황 / 질문</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            placeholder="예) 목요일 저녁에 이불 빨래를 하고 싶은데 언제 가면 덜 붐빌까요?"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          추천받기
        </button>
      </form>

      <p className="text-xs text-zinc-500">
        ※ 학생들이 남긴 기록이 적은 시간대는 예측이 정확하지 않을 수 있어요.
        <br />
        현황 기록을 함께 남겨 주시면 추천이 더 정확해집니다.
      </p>
    </section>
  );
}
