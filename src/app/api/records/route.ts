// 현황 기록 API
//   GET  /api/records  → 전체 기록 조회
//   POST /api/records  → 새 기록 추가 (현황 기록 화면에서 사용)

import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";
import { DAY_OPTIONS, HOUR_OPTIONS, TOTAL_MACHINES } from "@/lib/config";
import type { DayOfWeek, NewLaundryRecord, RecordsResponse } from "@/lib/types";

export async function GET() {
  try {
    const records = await getDataStore().listRecords();
    return NextResponse.json({ records } satisfies RecordsResponse);
  } catch (err) {
    console.error("[GET /api/records]", err);
    const message = err instanceof Error ? err.message : "기록 조회에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: Partial<NewLaundryRecord>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { dayOfWeek, hour, availableMachines } = body;

  const valid =
    typeof dayOfWeek === "number" &&
    DAY_OPTIONS.includes(dayOfWeek as DayOfWeek) &&
    typeof hour === "number" &&
    HOUR_OPTIONS.includes(hour) &&
    typeof availableMachines === "number" &&
    Number.isInteger(availableMachines) &&
    availableMachines >= 0 &&
    availableMachines <= TOTAL_MACHINES;

  if (!valid) {
    return NextResponse.json(
      { error: "invalid record: dayOfWeek/hour/availableMachines 값을 확인하세요." },
      { status: 400 },
    );
  }

  try {
    const record = await getDataStore().addRecord({
      dayOfWeek: dayOfWeek as DayOfWeek,
      hour: hour as number,
      availableMachines: availableMachines as number,
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/records]", err);
    const message = err instanceof Error ? err.message : "기록 저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
