// 데이터 접근 계층 (Data Access Layer).
//
// 앱의 모든 라우트/컴포넌트는 여기 정의된 `LaundryDataStore` 인터페이스와
// `getDataStore()` 만 사용한다. 실제 저장 방식은 이 파일 안에서만 결정된다.
//
// 저장소 선택:
//   SUPABASE_URL + SUPABASE_ANON_KEY 가 있으면  → SupabaseLaundryStore (영구 저장)
//   없으면                                      → MockLaundryStore (메모리, 개발용)

import seed from "./mock-data.json";
import {
  RECORDS_TABLE,
  getSupabaseClient,
  isSupabaseConfigured,
  type LaundryRecordRow,
} from "./supabase";
import type { DayOfWeek, LaundryRecord, NewLaundryRecord } from "./types";

export interface LaundryDataStore {
  /** 모든 현황 기록을 반환 */
  listRecords(): Promise<LaundryRecord[]>;
  /** 새 현황 기록을 추가하고, 생성된 레코드를 반환 */
  addRecord(input: NewLaundryRecord): Promise<LaundryRecord>;
}

/** DB 행(snake_case) → 앱 타입(camelCase) */
function toRecord(row: LaundryRecordRow): LaundryRecord {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week as DayOfWeek,
    hour: row.hour,
    availableMachines: row.available_machines,
    createdAt: row.created_at,
  };
}

/**
 * Supabase(Postgres) 구현 — 실제 운영/배포용.
 * 여러 사용자가 남긴 기록이 영구 저장되고 서로에게 보인다.
 */
class SupabaseLaundryStore implements LaundryDataStore {
  async listRecords(): Promise<LaundryRecord[]> {
    const { data, error } = await getSupabaseClient()
      .from(RECORDS_TABLE)
      .select("id, day_of_week, hour, available_machines, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`기록을 불러오지 못했습니다: ${error.message}`);
    }
    return (data ?? []).map((row) => toRecord(row as LaundryRecordRow));
  }

  async addRecord(input: NewLaundryRecord): Promise<LaundryRecord> {
    const { data, error } = await getSupabaseClient()
      .from(RECORDS_TABLE)
      .insert({
        day_of_week: input.dayOfWeek,
        hour: input.hour,
        available_machines: input.availableMachines,
      })
      .select("id, day_of_week, hour, available_machines, created_at")
      .single();

    if (error) {
      throw new Error(`기록을 저장하지 못했습니다: ${error.message}`);
    }
    return toRecord(data as LaundryRecordRow);
  }
}

/**
 * Mock 구현: 메모리 배열 + JSON 시드.
 * 서버 재시작 시 초기화되고 인스턴스 간 공유도 안 되므로 로컬 개발용이다.
 */
class MockLaundryStore implements LaundryDataStore {
  private records: LaundryRecord[] = (seed as LaundryRecord[]).map((r) => ({ ...r }));

  async listRecords(): Promise<LaundryRecord[]> {
    return this.records.map((r) => ({ ...r }));
  }

  async addRecord(input: NewLaundryRecord): Promise<LaundryRecord> {
    const record: LaundryRecord = {
      id: crypto.randomUUID(),
      dayOfWeek: input.dayOfWeek,
      hour: input.hour,
      availableMachines: input.availableMachines,
      createdAt: new Date().toISOString(),
    };
    this.records.push(record);
    return { ...record };
  }
}

/** 현재 설정된 저장소의 종류 (상태 표시용) */
export function getStoreKind(): "supabase" | "mock" {
  return isSupabaseConfigured() ? "supabase" : "mock";
}

function createStore(): LaundryDataStore {
  if (isSupabaseConfigured()) {
    return new SupabaseLaundryStore();
  }
  console.warn(
    "[data] SUPABASE_URL/SUPABASE_ANON_KEY 가 없어 메모리 저장소를 사용합니다. 기록이 영구 저장되지 않습니다.",
  );
  return new MockLaundryStore();
}

// 개발 모드에서 HMR로 모듈이 다시 평가돼도 저장소가 새로 생기지 않도록 전역에 캐시.
const globalForStore = globalThis as unknown as {
  __laundryStore?: LaundryDataStore;
};

export function getDataStore(): LaundryDataStore {
  if (!globalForStore.__laundryStore) {
    globalForStore.__laundryStore = createStore();
  }
  return globalForStore.__laundryStore;
}
