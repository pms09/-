// 시간대별 혼잡도 막대그래프.
// 여유=초록 / 보통=노랑 / 혼잡=빨강 / 기록없음=회색.
// 막대 아래에는 그 값의 근거가 된 기록 수를 함께 적고, 기록이 적은 시간대는
// 막대를 옅게 그려 "참고용"임을 구분한다.
// CongestionCell[] 만 넘기면 되므로 mock·Supabase 어느 데이터든 재사용 가능.

import { classifyConfidence } from "@/lib/congestion";
import { formatHour, TOTAL_MACHINES } from "@/lib/config";
import type {
  CongestionCell,
  CongestionLevelOrUnknown,
  ConfidenceLevel,
} from "@/lib/types";

/**
 * 셀의 신뢰도. 배포 직후처럼 confidence 가 없는 예전 응답이 섞여 와도
 * 화면이 깨지지 않도록 기록 수로 다시 계산한다.
 */
function confidenceOf(cell: CongestionCell): ConfidenceLevel {
  return cell.confidence ?? classifyConfidence(cell.sampleCount);
}

const LEVEL_META: Record<
  CongestionLevelOrUnknown,
  { label: string; bar: string; dot: string }
> = {
  free: { label: "여유", bar: "bg-green-500", dot: "bg-green-500" },
  normal: { label: "보통", bar: "bg-yellow-400", dot: "bg-yellow-400" },
  busy: { label: "혼잡", bar: "bg-red-500", dot: "bg-red-500" },
  unknown: { label: "기록 없음", bar: "bg-zinc-300 dark:bg-zinc-700", dot: "bg-zinc-300 dark:bg-zinc-700" },
};

/** 신뢰도 표시 방식. 기록이 적으면 막대를 옅게 그린다. */
export const CONFIDENCE_META: Record<
  ConfidenceLevel,
  { label: string; bar: string; text: string }
> = {
  none: {
    label: "근거 없음",
    bar: "opacity-100",
    text: "text-zinc-400 dark:text-zinc-600",
  },
  low: {
    label: "참고용",
    bar: "opacity-45",
    text: "text-amber-600 dark:text-amber-500",
  },
  medium: {
    label: "보통",
    bar: "opacity-100",
    text: "text-zinc-500",
  },
};

export function CongestionLegend() {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400">
        {(["free", "normal", "busy", "unknown"] as const).map((level) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${LEVEL_META[level].dot}`} />
            {LEVEL_META[level].label}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500">
        막대 아래는 그 시간대 추천의 근거가 된 기록 수예요. 기록이 1~2건뿐인 시간대는
        막대를 옅게 표시했어요(참고용).
      </p>
    </div>
  );
}

/** 근거 기록 수 + 신뢰도를 한 줄로 보여 주는 배지 */
export function ConfidenceBadge({
  sampleCount,
  confidence,
}: {
  sampleCount: number;
  confidence: ConfidenceLevel;
}) {
  const meta = CONFIDENCE_META[confidence];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] dark:bg-zinc-900 ${meta.text}`}
    >
      {sampleCount > 0 ? `기록 ${sampleCount}건 기준` : "근거 기록 없음"}
      {sampleCount > 0 && ` · ${meta.label}`}
    </span>
  );
}

export function CongestionBarChart({
  cells,
  highlightHour = null,
}: {
  cells: CongestionCell[];
  /** AI가 추천한 시각. 해당 막대를 강조 표시한다. */
  highlightHour?: number | null;
}) {
  return (
    <div className="flex items-end gap-1 overflow-x-auto rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      {cells.map((cell) => {
        const ratio =
          cell.averageAvailable === null
            ? 0.12
            : Math.max(0.08, cell.averageAvailable / TOTAL_MACHINES);
        const highlighted = cell.hour === highlightHour;
        return (
          <div
            key={cell.hour}
            className="flex min-w-[26px] flex-1 flex-col items-center gap-1"
            title={
              cell.averageAvailable === null
                ? `${formatHour(cell.hour)} · 기록 없음`
                : `${formatHour(cell.hour)} · 평균 여유 ${cell.averageAvailable.toFixed(1)}대 · 기록 ${cell.sampleCount}건 기준(${CONFIDENCE_META[confidenceOf(cell)].label})`
            }
          >
            <span className="text-[10px] leading-3 text-zinc-900 dark:text-zinc-100">
              {highlighted ? "★" : " "}
            </span>
            <div className="flex h-28 w-full items-end">
              <div
                className={
                  `w-full rounded-t ${LEVEL_META[cell.level].bar} ` +
                  `${CONFIDENCE_META[confidenceOf(cell)].bar} ` +
                  (highlighted
                    ? "ring-2 ring-zinc-900 ring-offset-1 dark:ring-white dark:ring-offset-zinc-950"
                    : "")
                }
                style={{ height: `${ratio * 100}%` }}
              />
            </div>
            <span
              className={
                "text-[10px] " +
                (highlighted
                  ? "font-bold text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500")
              }
            >
              {cell.hour}
            </span>
            <span
              className={`text-[9px] leading-3 ${CONFIDENCE_META[confidenceOf(cell)].text}`}
            >
              {cell.sampleCount > 0 ? `${cell.sampleCount}건` : "0건"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
