// Google Gemini 연동 (서버 전용).
//
// ⚠️ 이 모듈은 route handler(app/api/**)에서만 import 한다.
//    GEMINI_API_KEY 는 서버 환경변수이며 브라우저 번들에 절대 포함되지 않는다.
//    (NEXT_PUBLIC_ 접두사를 붙이지 말 것.)
//
// 현재 상태: 뼈대만. 실제 API 호출은 다음 단계에서 구현한다.

import { GEMINI_MODEL } from "./config";
import type {
  CongestionCell,
  RecommendationInput,
  RecommendationResult,
} from "./types";

/** .env.local 에 GEMINI_API_KEY 가 설정돼 있는지 여부 */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * 사용자의 자연어 질문 + 혼잡도 데이터를 Gemini에 보내
 * "언제 가면 좋을지" 추천 문장과 이유를 받아온다.
 *
 * TODO(다음 단계):
 *   1. const apiKey = process.env.GEMINI_API_KEY (없으면 에러)
 *   2. 모델: GEMINI_MODEL (무료 gemini-flash 계열)
 *   3. `congestion` 을 표 형태 텍스트로 만들어 프롬프트에 포함
 *   4. `input.question` 과 함께 generateContent 호출
 *   5. 응답 텍스트를 { suggestion, reason } 으로 파싱해 반환
 */
export async function requestRecommendation(
  input: RecommendationInput,
  congestion: CongestionCell[],
): Promise<RecommendationResult> {
  void input;
  void congestion;
  void GEMINI_MODEL;
  throw new Error(
    "NOT_IMPLEMENTED: Gemini 연동은 다음 단계에서 구현됩니다.",
  );
}
