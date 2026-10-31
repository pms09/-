// AI 빨래 도우미 — 멀티턴 대화 API
//   POST /api/chat
//   body: { dayOfWeek, messages: [{ role, text }, ...] }
//
// Gemini는 대화를 기억하지 않으므로 클라이언트가 전체 대화를 매번 보낸다.
// 무료 등급 할당량(모델당 하루 20회)을 지키기 위해 사용자 메시지 수를 제한한다.

import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";
import { buildDayCongestion } from "@/lib/congestion";
import { DAY_OPTIONS, HOUR_OPTIONS, MAX_CHAT_TURNS } from "@/lib/config";
import { isGeminiConfigured, requestChatReply } from "@/lib/gemini";
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  DayOfWeek,
} from "@/lib/types";

/** 메시지 1건이 올바른 모양인지 */
function isValidMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== "object") return false;
  const { role, text } = m as Record<string, unknown>;
  return (
    (role === "user" || role === "model") &&
    typeof text === "string" &&
    text.trim().length > 0 &&
    text.length <= 1000
  );
}

export async function POST(request: Request) {
  let body: Partial<ChatRequest>;
  try {
    body = await request.json();
  } catch {
    return json({ status: "error", message: "invalid JSON" }, 400);
  }

  const { dayOfWeek, messages } = body;

  if (
    typeof dayOfWeek !== "number" ||
    !DAY_OPTIONS.includes(dayOfWeek as DayOfWeek) ||
    !Array.isArray(messages) ||
    messages.length === 0 ||
    !messages.every(isValidMessage)
  ) {
    return json(
      { status: "error", message: "invalid input: 요일과 대화 내용을 확인하세요." },
      400,
    );
  }

  // 마지막은 사용자 차례여야 한다(AI 답변을 요청하는 상황).
  if (messages[messages.length - 1].role !== "user") {
    return json(
      { status: "error", message: "마지막 메시지는 사용자 질문이어야 합니다." },
      400,
    );
  }

  // 할당량 보호: 사용자 메시지 개수 제한
  const userTurns = messages.filter((m) => m.role === "user").length;
  if (userTurns > MAX_CHAT_TURNS) {
    return json(
      {
        status: "error",
        message: `대화는 ${MAX_CHAT_TURNS}번까지만 가능합니다. 새로 질문하려면 홈에서 다시 시작해 주세요.`,
      },
      429,
    );
  }

  if (!isGeminiConfigured()) {
    return json(
      {
        status: "not-implemented",
        message:
          "GEMINI_API_KEY 가 설정되지 않았습니다. 로컬은 .env.local, 배포 환경은 Vercel의 Settings → Environment Variables 에 키를 추가한 뒤 재배포하세요.",
      },
      501,
    );
  }

  let congestion;
  try {
    const records = await getDataStore().listRecords();
    congestion = buildDayCongestion(records, dayOfWeek as DayOfWeek, HOUR_OPTIONS);
  } catch (err) {
    console.error("[/api/chat] 혼잡도 조회 실패", err);
    const message = err instanceof Error ? err.message : "혼잡도 조회에 실패했습니다.";
    return json({ status: "error", message }, 503);
  }

  try {
    const { reply, model } = await requestChatReply(
      messages,
      congestion,
      dayOfWeek as DayOfWeek,
    );
    return json({ status: "ok", reply, model }, 200);
  } catch (err) {
    console.error("[/api/chat]", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return json({ status: "error", message }, 502);
  }
}

function json(payload: ChatResponse, status: number) {
  return NextResponse.json(payload, { status });
}
