// 앱 전역에서 공유하는 도메인 타입 정의.
// 데이터 저장소(현재 mock, 이후 Supabase)와 UI가 모두 이 타입에 의존한다.

/** 요일: 0=일요일 ~ 6=토요일 (JS `Date.getDay()` 기준) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** 시간대: 24시간제 "시" 단위 (예: 19 = 19:00~19:59) */
export type HourSlot = number;

/** 혼잡도 3단계 등급 */
export type CongestionLevel = "free" | "normal" | "busy";

/** 등급을 아직 알 수 없는 경우(해당 요일·시간대 기록 없음) 포함 */
export type CongestionLevelOrUnknown = CongestionLevel | "unknown";

/**
 * 학생이 직접 입력해 공유하는 "현황 기록" 1건.
 * "그 요일·시간대에 비어 있던 세탁기 대수"를 남긴다.
 */
export interface LaundryRecord {
  id: string;
  dayOfWeek: DayOfWeek;
  hour: HourSlot;
  /** 기록 시점에 비어 있던(사용 가능한) 세탁기 대수 */
  availableMachines: number;
  /** 생성 시각 (ISO 8601 문자열) */
  createdAt: string;
}

/** 새 기록 입력값. `id`/`createdAt`은 저장 시 서버가 생성한다. */
export interface NewLaundryRecord {
  dayOfWeek: DayOfWeek;
  hour: HourSlot;
  availableMachines: number;
}

/** 특정 (요일, 시간대) 한 칸의 집계 결과 */
export interface CongestionCell {
  dayOfWeek: DayOfWeek;
  hour: HourSlot;
  /** 이 칸에 반영된 기록 수 */
  sampleCount: number;
  /** 평균 여유 세탁기 대수. 기록이 없으면 null */
  averageAvailable: number | null;
  level: CongestionLevelOrUnknown;
}

/** 홈 화면에서 보내는 AI 추천 요청 */
export interface RecommendationInput {
  dayOfWeek: DayOfWeek;
  hour: HourSlot;
  /** 사용자가 자연어로 적은 상황/질문 */
  question: string;
}

/** AI(Gemini)가 생성한 추천 결과 — 결과 화면의 말풍선에 표시 */
export interface RecommendationResult {
  /** 추천 문장 (언제 가면 좋을지) */
  suggestion: string;
  /** 추천 이유 */
  reason: string;
  /** AI가 고른 추천 시각(0~23). 특정 시각을 고르지 못했으면 null */
  recommendedHour: HourSlot | null;
  /** 응답을 생성한 모델 이름 */
  model: string;
}

/** `POST /api/recommend` 응답 형태 (판별 유니언) */
export type RecommendationResponse =
  | { status: "ok"; result: RecommendationResult; congestion: CongestionCell[] }
  | { status: "not-implemented"; message: string }
  | { status: "error"; message: string };

/** `GET /api/congestion` 응답 형태 */
export interface CongestionResponse {
  dayOfWeek: DayOfWeek;
  cells: CongestionCell[];
}

/** `GET /api/records` 응답 형태 */
export interface RecordsResponse {
  records: LaundryRecord[];
}
