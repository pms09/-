// AI 빨래 도우미 API (메인 기능)
//   POST /api/recommend
//   body: { dayOfWeek, hour, question }
//
// 흐름: 요청 검증 → 해당 요일 혼잡도 집계 → Gemini에 질문+데이터 전달 → 추천 문장 반환.
// AI 호출은 이 서버 라우트 안에서만 일어나며, GEMINI_API_KEY 는 브라우저로 나가지 않는다.
//
// 응답 상태:
//   ok              추천 생성 성공
//   not-implemented GEMINI_API_KEY 미설정 (501)
//   error           입력 오류(400) 또는 Gemini 호출 실패(502)

import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";
import { buildDayCongestion } from "@/lib/congestion";
import { DAY_OPTIONS, HOUR_OPTIONS } from "@/lib/config";
import { isGeminiConfigured, requestRecommendation } from "@/lib/gemini";
import type {
  DayOfWeek,
  RecommendationInput,
  RecommendationResponse,
} from "@/lib/types";

export async function POST(request: Request) {
  let body: Partial<RecommendationInput>;
  try {
    body = await request.json();
  } catch {
    return json({ status: "error", message: "invalid JSON" }, 400);
  }

  const { dayOfWeek, hour, question } = body;
  const valid =
    typeof dayOfWeek === "number" &&
    DAY_OPTIONS.includes(dayOfWeek as DayOfWeek) &&
    typeof hour === "number" &&
    HOUR_OPTIONS.includes(hour) &&
    typeof question === "string" &&
    question.trim().length > 0;

  if (!valid) {
    return json(
      { status: "error", message: "invalid input: 요일/시간대/질문을 확인하세요." },
      400,
    );
  }

  const records = await getDataStore().listRecords();
  const congestion = buildDayCongestion(
    records,
    dayOfWeek as DayOfWeek,
    HOUR_OPTIONS,
  );

  if (!isGeminiConfigured()) {
    return json(
      {
        status: "not-implemented",
        message:
          "GEMINI_API_KEY 가 설정되지 않았습니다. .env.local 에 키를 추가하고 다음 단계에서 연동하세요.",
      },
      501,
    );
  }

  try {
    const result = await requestRecommendation(
      { dayOfWeek: dayOfWeek as DayOfWeek, hour: hour as number, question: question as string },
      congestion,
    );
    return json({ status: "ok", result, congestion }, 200);
  } catch (err) {
    // Gemini 호출/파싱 실패. 키 자체는 있으므로 not-implemented가 아니라 error로 구분한다.
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[/api/recommend]", err);
    return json({ status: "error", message }, 502);
  }
}

function json(payload: RecommendationResponse, status: number) {
  return NextResponse.json(payload, { status });
}
