// 혼잡도 API
//   GET /api/congestion?day=4  → 해당 요일의 시간대별 혼잡도 등급
//   day 파라미터가 없거나 잘못되면 오늘 요일로 대체

import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";
import { buildDayCongestion } from "@/lib/congestion";
import { DAY_OPTIONS, HOUR_OPTIONS } from "@/lib/config";
import type { CongestionResponse, DayOfWeek } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawDay = Number(searchParams.get("day"));
  const dayOfWeek = (
    DAY_OPTIONS.includes(rawDay as DayOfWeek) ? rawDay : new Date().getDay()
  ) as DayOfWeek;

  const records = await getDataStore().listRecords();
  const cells = buildDayCongestion(records, dayOfWeek, HOUR_OPTIONS);

  return NextResponse.json({ dayOfWeek, cells } satisfies CongestionResponse);
}
