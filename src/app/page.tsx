"use client";

// 홈 / 입력 화면
//   - 요일·시간대 선택
//   - 자연어로 상황을 묻는 입력창
//   - '추천받기' 버튼 → AI 추천 결과 화면으로 이동
//
// 입력값은 sessionStorage에 담아 결과 화면으로 넘긴다.
// 실제 /api/recommend 호출은 결과 화면에서 이루어진다.
//
// 요일·시간대 기본값은 접속한 시점(한국 시각)으로 맞춘다.
// 서버는 UTC로 돌아가므로 초기 렌더에서 현재 시각을 쓰면 서버/브라우저 결과가
// 달라져 hydration mismatch가 난다. 그래서 첫 렌더는 양쪽이 동일한 고정값으로
// 그리고, 마운트된 뒤에 실제 시각으로 한 번만 채운다.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  DAY_LABELS,
  DAY_OPTIONS,
  HOUR_OPTIONS,
  formatHour,
  getSeoulNow,
  nearestHourSlot,
} from "@/lib/config";
import type { DayOfWeek, RecommendationInput } from "@/lib/types";

const STORAGE_KEY = "laundry:lastQuery";

export default function HomePage() {
  const router = useRouter();

  // 서버·브라우저가 같은 값으로 첫 렌더를 그리도록 고정값으로 시작한다.
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(DAY_OPTIONS[0]);
  const [hour, setHour] = useState<number>(HOUR_OPTIONS[0]);
  const [question, setQuestion] = useState("");
  const [autoFilled, setAutoFilled] = useState(false);

  // 사용자가 한 번이라도 직접 고르면 자동 채움이 덮어쓰지 않게 한다.
  const pickedByUser = useRef(false);

  useEffect(() => {
    if (pickedByUser.current) return;
    const now = getSeoulNow();
    setDayOfWeek(now.dayOfWeek);
    setHour(nearestHourSlot(now.hour, now.minute));
    setAutoFilled(true);
  }, []);

  function chooseDay(value: number) {
    pickedByUser.current = true;
    setAutoFilled(false);
    setDayOfWeek(value as DayOfWeek);
  }

  function chooseHour(value: number) {
    pickedByUser.current = true;
    setAutoFilled(false);
    setHour(value);
  }

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
              onChange={(e) => chooseDay(Number(e.target.value))}
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
              onChange={(e) => chooseHour(Number(e.target.value))}
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

        {autoFilled && (
          <p className="text-xs text-zinc-500">
            지금 한국 시각({DAY_LABELS[dayOfWeek]}요일 {formatHour(hour)}) 기준으로
            맞춰 뒀어요. 다른 때를 보고 싶으면 바꿔 주세요.
          </p>
        )}

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
