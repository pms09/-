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
 * 사용할 Gemini 모델 목록 (앞에서부터 차례로 시도).
 *
 * 무료 등급은 모델당 하루 20회 제한이 있고, 인기 있는 모델은 과부하(503)로
 * 막히는 일도 잦다. 하나가 막혀도 시연이 끊기지 않도록 대체 모델을 둔다.
 * 1순위는 환경변수 GEMINI_MODEL 로 바꿀 수 있다.
 */
export const GEMINI_MODELS: string[] = [
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
].filter((name, i, all) => all.indexOf(name) === i);

/** 1순위 모델 이름 (오류 메시지 표기용) */
export const GEMINI_MODEL = GEMINI_MODELS[0];

/**
 * 한 대화에서 사용자가 보낼 수 있는 최대 메시지 수.
 * Gemini 무료 등급은 모델당 하루 20회라, 대화가 길어지면 금방 소진된다.
 */
export const MAX_CHAT_TURNS = 5;
