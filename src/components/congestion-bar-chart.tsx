// 시간대별 혼잡도 막대그래프.
// 여유=초록 / 보통=노랑 / 혼잡=빨강 / 기록없음=회색.
// CongestionCell[] 만 넘기면 되므로 mock·Supabase 어느 데이터든 재사용 가능.

import { formatHour, TOTAL_MACHINES } from "@/lib/config";
import type { CongestionCell, CongestionLevelOrUnknown } from "@/lib/types";

const LEVEL_META: Record<
  CongestionLevelOrUnknown,
  { label: string; bar: string; dot: string }
> = {
  free: { label: "여유", bar: "bg-green-500", dot: "bg-green-500" },
  normal: { label: "보통", bar: "bg-yellow-400", dot: "bg-yellow-400" },
  busy: { label: "혼잡", bar: "bg-red-500", dot: "bg-red-500" },
  unknown: { label: "기록 없음", bar: "bg-zinc-300 dark:bg-zinc-700", dot: "bg-zinc-300 dark:bg-zinc-700" },
};

export function CongestionLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400">
      {(["free", "normal", "busy", "unknown"] as const).map((level) => (
        <span key={level} className="flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-sm ${LEVEL_META[level].dot}`} />
          {LEVEL_META[level].label}
        </span>
      ))}
    </div>
  );
}

export function CongestionBarChart({ cells }: { cells: CongestionCell[] }) {
  return (
    <div className="flex items-end gap-1 overflow-x-auto rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      {cells.map((cell) => {
        const ratio =
          cell.averageAvailable === null
            ? 0.12
            : Math.max(0.08, cell.averageAvailable / TOTAL_MACHINES);
        return (
          <div
            key={cell.hour}
            className="flex min-w-[26px] flex-1 flex-col items-center gap-1"
            title={
              cell.averageAvailable === null
                ? `${formatHour(cell.hour)} · 기록 없음`
                : `${formatHour(cell.hour)} · 평균 여유 ${cell.averageAvailable.toFixed(1)}대 (표본 ${cell.sampleCount})`
            }
          >
            <div className="flex h-28 w-full items-end">
              <div
                className={`w-full rounded-t ${LEVEL_META[cell.level].bar}`}
                style={{ height: `${ratio * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500">{cell.hour}</span>
          </div>
        );
      })}
    </div>
  );
}
