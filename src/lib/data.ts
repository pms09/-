// 데이터 접근 계층 (Data Access Layer).
//
// 앱의 모든 라우트/컴포넌트는 여기 정의된 `LaundryDataStore` 인터페이스와
// `getDataStore()` 만 사용한다. 실제 저장 방식(현재 mock, 이후 Supabase)은
// 이 파일 안에서만 바뀌므로 나머지 코드는 그대로 둘 수 있다.
//
// === 다음 단계: Supabase 교체 방법 ===
//   1. `SupabaseLaundryStore implements LaundryDataStore` 클래스 추가
//   2. `createStore()` 가 환경변수 유무에 따라 Supabase / mock 을 고르도록 변경
//   3. 라우트 코드는 수정 불필요

import seed from "./mock-data.json";
import type { LaundryRecord, NewLaundryRecord } from "./types";

export interface LaundryDataStore {
  /** 모든 현황 기록을 반환 */
  listRecords(): Promise<LaundryRecord[]>;
  /** 새 현황 기록을 추가하고, 생성된 레코드를 반환 */
  addRecord(input: NewLaundryRecord): Promise<LaundryRecord>;
}

/**
 * Mock 구현: 메모리 배열 + JSON 시드.
 * 서버 재시작/재배포 시 초기화된다 (개발·데모용).
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

function createStore(): LaundryDataStore {
  // TODO(다음 단계): process.env.SUPABASE_URL 등이 있으면 SupabaseLaundryStore 반환
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
