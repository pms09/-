"use client";

// AI 빨래 도우미 — 이어서 질문하기(멀티턴 대화) 패널.
// 첫 추천 결과를 대화의 1턴으로 삼아, 사용자가 계속 물어볼 수 있게 한다.
// 대화 전체를 매번 서버로 보내고, 서버가 Gemini에 전달한다.

import { useEffect, useRef, useState } from "react";
import { MAX_CHAT_TURNS } from "@/lib/config";
import type { ChatMessage, ChatResponse, DayOfWeek } from "@/lib/types";

export function ChatPanel({
  dayOfWeek,
  initialReply,
}: {
  dayOfWeek: DayOfWeek;
  /** 첫 AI 추천 문장 — 대화의 출발점이 된다 */
  initialReply: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "model", text: initialReply },
  ]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const userTurns = messages.filter((m) => m.role === "user").length;
  const remaining = MAX_CHAT_TURNS - userTurns;
  const exhausted = remaining <= 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, pending]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending || exhausted) return;

    const next: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(next);
    setDraft("");
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOfWeek, messages: next }),
      });
      const data = (await res.json()) as ChatResponse;
      if (data.status === "ok") {
        setMessages([...next, { role: "model", text: data.reply }]);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                "max-w-md rounded-2xl px-4 py-2.5 text-sm leading-6 " +
                (m.role === "user"
                  ? "rounded-br-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "rounded-tl-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900")
              }
            >
              {m.text}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start">
            <div className="flex max-w-md items-center gap-2 rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              <span
                role="status"
                aria-label="답변 작성 중"
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200"
              />
              생각하는 중…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={send} className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending || exhausted}
          maxLength={1000}
          placeholder={
            exhausted ? "대화 횟수를 모두 사용했어요" : "이어서 물어보세요 (예: 그럼 토요일은요?)"
          }
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending || exhausted || draft.trim().length === 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          보내기
        </button>
      </form>

      <p className="text-xs text-zinc-500">
        {exhausted
          ? "대화 횟수를 모두 사용했습니다. 홈에서 새로 질문해 주세요."
          : `이어서 ${remaining}번 더 질문할 수 있어요.`}
      </p>
    </div>
  );
}
