// Google Gemini 연동 (서버 전용).
//
// ⚠️ 이 모듈은 route handler(app/api/**)에서만 import 한다.
//    GEMINI_API_KEY 는 서버 환경변수이며 브라우저 번들에 절대 포함되지 않는다.
//    (NEXT_PUBLIC_ 접두사를 붙이지 말 것.)

import { GoogleGenAI, Type } from "@google/genai";
import { DAY_LABELS, GEMINI_MODEL, TOTAL_MACHINES, formatHour } from "./config";
import type {
  CongestionCell,
  CongestionLevelOrUnknown,
  RecommendationInput,
  RecommendationResult,
} from "./types";

/** 프롬프트에 넣을 등급 표기 */
const LEVEL_TEXT: Record<CongestionLevelOrUnknown, string> = {
  free: "여유",
  normal: "보통",
  busy: "혼잡",
  unknown: "기록없음",
};

const SYSTEM_INSTRUCTION = `당신은 기숙사 세탁실 사정을 잘 아는 친근한 '빨래 도우미'입니다.
학생들이 직접 입력해 모은 혼잡도 데이터를 보고, 언제 빨래하러 가면 좋을지 추천합니다.

데이터 읽는 법:
- 각 줄은 "시각 | 등급 | 평균 여유 대수 | 표본 수" 형식입니다.
- '평균 여유 대수'는 전체 ${TOTAL_MACHINES}대 중 비어 있던 세탁기의 평균 개수입니다. 클수록 한가합니다.
- 등급은 여유 / 보통 / 혼잡 / 기록없음 네 가지입니다.

추천 규칙:
- 사용자가 생각 중인 시간대를 먼저 살펴보고, 더 나은 시간이 있으면 함께 제안하세요.
- 표본 수가 0인 시간대는 근거가 없으므로 단정하지 말고, 기록이 부족하다는 점을 알려 주세요.
- 표본 수가 적으면(1~2건) 참고용이라는 점을 덧붙이세요.
- 데이터에 없는 사실을 지어내지 마세요.
- 한국어 존댓말로, 과장 없이 간결하고 친근하게 씁니다.
- suggestion은 1~2문장, reason은 데이터 근거(등급·평균 여유 대수)를 포함해 2~3문장으로 작성하세요.`;

/** .env.local 에 GEMINI_API_KEY 가 설정돼 있는지 여부 */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/** 혼잡도 셀 배열을 프롬프트용 표 텍스트로 변환 */
function buildCongestionTable(cells: CongestionCell[]): string {
  return cells
    .map((cell) => {
      const avg =
        cell.averageAvailable === null
          ? "-"
          : `${cell.averageAvailable.toFixed(1)}대`;
      return `${formatHour(cell.hour)} | ${LEVEL_TEXT[cell.level]} | 평균 여유 ${avg} | 표본 ${cell.sampleCount}건`;
    })
    .join("\n");
}

function buildPrompt(
  input: RecommendationInput,
  congestion: CongestionCell[],
): string {
  return [
    "기숙사 세탁기 혼잡도 데이터를 보고 언제 빨래하러 가면 좋을지 추천하고 이유를 설명해줘.",
    "",
    `[요일] ${DAY_LABELS[input.dayOfWeek]}요일`,
    `[사용자가 생각 중인 시간] ${formatHour(input.hour)}`,
    `[사용자 질문] ${input.question}`,
    "",
    `[시간대별 혼잡도] (세탁기 전체 ${TOTAL_MACHINES}대 기준)`,
    buildCongestionTable(congestion),
  ].join("\n");
}

/**
 * 재시도할 실패 코드 — 모델 과부하만 해당한다.
 *
 * 429(RESOURCE_EXHAUSTED)는 재시도하지 않는다. 무료 등급은
 * "모델당 하루 20회"(GenerateRequestsPerDayPerProjectPerModel-FreeTier)가
 * 걸려 있어서, 짧은 백오프로 다시 부른다고 풀리지 않는다.
 * 서버가 알려 주는 retryDelay 를 그대로 사용자에게 보여 주는 편이 정확하다.
 */
const RETRIABLE_CODES = new Set([500, 503]);
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Gemini 오류 메시지(JSON 문자열)에서 HTTP 상태 코드를 뽑아낸다 */
function extractErrorCode(err: unknown): number | null {
  const message = err instanceof Error ? err.message : String(err);
  try {
    const parsed: unknown = JSON.parse(message);
    if (parsed && typeof parsed === "object") {
      const code = (parsed as { error?: { code?: unknown } }).error?.code;
      if (typeof code === "number") return code;
    }
  } catch {
    // JSON이 아닌 오류(네트워크 등)
  }
  return null;
}

/** 429 응답에 들어 있는 재시도 대기 시간("25s") 을 뽑아낸다 */
function extractRetryDelay(detail: string): string | null {
  const match = detail.match(/"retryDelay"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

/** 사용자에게 보여줄 한국어 오류 문구 */
function friendlyMessage(code: number | null, detail: string): string {
  switch (code) {
    case 429: {
      // 무료 등급은 모델당 하루 20회 제한이 있다.
      const delay = extractRetryDelay(detail);
      const when = delay ? `약 ${delay} 뒤에` : "잠시 후";
      return `Gemini 무료 사용량 한도에 도달했습니다(모델당 하루 20회). ${when} 다시 시도해 주세요.`;
    }
    case 503:
      return "Gemini 모델이 혼잡합니다. 잠시 후 다시 시도해 주세요.";
    case 404:
      return `모델 '${GEMINI_MODEL}' 을(를) 사용할 수 없습니다. GEMINI_MODEL 환경변수를 확인해 주세요.`;
    case 400:
    case 401:
    case 403:
      return "Gemini API 키가 올바르지 않거나 권한이 없습니다. GEMINI_API_KEY 를 확인해 주세요.";
    default:
      return `Gemini 호출에 실패했습니다: ${detail}`;
  }
}

/** 일시적 오류에 한해 지수 백오프로 재시도 */
async function generateWithRetry(
  ai: GoogleGenAI,
  prompt: string,
): Promise<string | undefined> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedHour: {
                type: Type.INTEGER,
                description:
                  "추천하는 시각(0~23 정수). 특정 시각을 고르기 어려우면 생략하세요.",
              },
              suggestion: {
                type: Type.STRING,
                description: "언제 가면 좋을지 알려주는 1~2문장.",
              },
              reason: {
                type: Type.STRING,
                description:
                  "그렇게 추천한 이유. 등급과 평균 여유 대수 같은 데이터 근거를 포함해 2~3문장.",
              },
            },
            required: ["suggestion", "reason"],
          },
        },
      });
      return response.text;
    } catch (err) {
      lastError = err;
      const code = extractErrorCode(err);
      if (attempt === MAX_ATTEMPTS || !RETRIABLE_CODES.has(code ?? -1)) break;
      await sleep(attempt * 1500); // 1.5초 → 3초
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(friendlyMessage(extractErrorCode(lastError), detail));
}

/**
 * 사용자의 자연어 질문 + 혼잡도 데이터를 Gemini에 보내
 * "언제 가면 좋을지" 추천 문장과 이유를 받아온다.
 *
 * 구조화 출력(responseSchema)을 사용해 { recommendedHour, suggestion, reason } 으로 받는다.
 */
export async function requestRecommendation(
  input: RecommendationInput,
  congestion: CongestionCell[],
): Promise<RecommendationResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 가 설정되지 않았습니다.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const text = await generateWithRetry(ai, buildPrompt(input, congestion));

  return parseResult(text);
}

/** ```json ... ``` 코드펜스가 붙어 오는 경우를 대비해 벗겨낸다 */
function stripCodeFence(text: string): string {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : text;
}

function normalizeHour(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 23
    ? value
    : null;
}

/** 모델 응답 텍스트를 RecommendationResult 로 파싱 */
function parseResult(text: string | undefined): RecommendationResult {
  const raw = text?.trim();
  if (!raw) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }

  try {
    const parsed: unknown = JSON.parse(stripCodeFence(raw));
    if (parsed && typeof parsed === "object") {
      const { suggestion, reason, recommendedHour } = parsed as Record<
        string,
        unknown
      >;
      if (typeof suggestion === "string" && typeof reason === "string") {
        return {
          suggestion: suggestion.trim(),
          reason: reason.trim(),
          recommendedHour: normalizeHour(recommendedHour),
          model: GEMINI_MODEL,
        };
      }
    }
  } catch {
    // JSON이 아니면 아래 평문 처리로 넘어간다.
  }

  // 구조화 출력이 실패한 경우: 첫 문단을 추천, 나머지를 이유로 사용
  const paragraphs = raw
    .split(/\n{1,}/)
    .map((line) => line.trim())
    .filter(Boolean);
  const [first, ...rest] = paragraphs;

  return {
    suggestion: first,
    reason: rest.join(" ") || first,
    recommendedHour: null,
    model: GEMINI_MODEL,
  };
}
