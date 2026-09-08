// 앱 전역 설정값. 값만 바꾸면 동작이 조정되도록 상수로 모아 둔다.

import type { DayOfWeek } from "./types";

/** 기숙사 전체 세탁기 대수 (혼잡도 등급 계산의 기준) */
export const TOTAL_MACHINES = 6;

/**
 * 혼잡도 등급 임계값.
 * 기준값 = (평균 여유 세탁기 대수) / (전체 세탁기 대수)
 *  - free   비율 이상 → "여유"
 *  - normal 비율 이상 → "보통"
 *  - 그 미만            → "혼잡"
 */
export const CONGESTION_THRESHOLDS = {
  free: 0.5,
  normal: 0.2,
} as const;

/** 요일 표시용 한글 라벨 */
export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "일",
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
  6: "토",
};

/** 선택 UI에 노출할 요일 순서 (월요일 시작) */
export const DAY_OPTIONS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

/** 세탁 가능 시간대. 기숙사 운영 시간을 06:00~23:00로 가정 */
export const HOUR_OPTIONS: number[] = Array.from({ length: 18 }, (_, i) => i + 6);

/** 시간 정수를 "HH:00" 문자열로 변환 */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * 사용할 Gemini 모델 이름 (무료 gemini-flash 계열).
 * 필요하면 환경변수 GEMINI_MODEL 로 재정의.
 * 실제 API 호출은 다음 단계에서 서버 라우트에만 추가한다.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
