// 혼잡도 계산 로직.
// 과거 기록(LaundryRecord[])을 요일·시간대별로 평균 내어 3단계 등급으로 변환한다.
// mock / Supabase 어느 저장소든 `LaundryRecord[]` 만 넘기면 동작한다.

import { CONGESTION_THRESHOLDS, TOTAL_MACHINES } from "./config";
import type {
  CongestionCell,
  CongestionLevelOrUnknown,
  DayOfWeek,
  LaundryRecord,
} from "./types";

/** 평균 여유 대수 → 혼잡도 등급 */
export function classifyLevel(
  averageAvailable: number | null,
): CongestionLevelOrUnknown {
  if (averageAvailable === null) return "unknown";
  const ratio = averageAvailable / TOTAL_MACHINES;
  if (ratio >= CONGESTION_THRESHOLDS.free) return "free";
  if (ratio >= CONGESTION_THRESHOLDS.normal) return "normal";
  return "busy";
}

/**
 * 특정 요일의 시간대별 혼잡도 집계.
 * @param records 전체 기록
 * @param dayOfWeek 대상 요일
 * @param hours 집계할 시간대 목록 (보통 config의 HOUR_OPTIONS)
 */
export function buildDayCongestion(
  records: LaundryRecord[],
  dayOfWeek: DayOfWeek,
  hours: number[],
): CongestionCell[] {
  return hours.map((hour) => {
    const matched = records.filter(
      (r) => r.dayOfWeek === dayOfWeek && r.hour === hour,
    );
    const averageAvailable =
      matched.length > 0
        ? matched.reduce((sum, r) => sum + r.availableMachines, 0) /
          matched.length
        : null;

    return {
      dayOfWeek,
      hour,
      sampleCount: matched.length,
      averageAvailable,
      level: classifyLevel(averageAvailable),
    };
  });
}
