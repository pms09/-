"use client";

// 현황 기록 화면
//   - '지금 비어 있는 세탁기 수' + 요일·시간대 입력
//   - 저장 버튼 → POST /api/records (mock 저장소에 추가)
//
// 데이터 접근 계층(lib/data.ts)이 실제로 동작하는지 확인하는 화면.

import { useState } from "react";
import {
  DAY_LABELS,
  DAY_OPTIONS,
  HOUR_OPTIONS,
  TOTAL_MACHINES,
  formatHour,
} from "@/lib/config";
import type { DayOfWeek } from "@/lib/types";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function RecordPage() {
  const now = new Date();
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(now.getDay() as DayOfWeek);
  const [hour, setHour] = useState<number>(
    HOUR_OPTIONS.includes(now.getHours()) ? now.getHours() : HOUR_OPTIONS[0],
  );
  const [availableMachines, setAvailableMachines] = useState(0);
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState({ kind: "saving" });
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOfWeek, hour, availableMachines }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `요청 실패 (${res.status})`);
      }
      setState({ kind: "done" });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "알 수 없는 오류",
      });
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">현황 기록</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          지금 세탁실에 비어 있는 세탁기 수를 남겨 주세요. 모인 기록이 혼잡도 예측의
          바탕이 됩니다. (전체 {TOTAL_MACHINES}대 기준)
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
          <span className="font-medium">지금 비어 있는 세탁기 수</span>
          <input
            type="number"
            min={0}
            max={TOTAL_MACHINES}
            value={availableMachines}
            onChange={(e) => setAvailableMachines(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <button
          type="submit"
          disabled={state.kind === "saving"}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {state.kind === "saving" ? "저장 중…" : "저장"}
        </button>

        {state.kind === "done" && (
          <p className="text-sm text-green-600 dark:text-green-400">저장되었습니다.</p>
        )}
        {state.kind === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
        )}
      </form>

      <p className="text-xs text-zinc-500">
        ※ 현재 기록은 mock 저장소(메모리)에 저장되어 서버 재시작 시 초기화됩니다. 다음
        단계에서 Supabase로 교체됩니다.
      </p>
    </section>
  );
}
