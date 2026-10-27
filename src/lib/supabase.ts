// Supabase 클라이언트 (서버 전용).
//
// ⚠️ 이 모듈은 route handler(app/api/**)를 통해서만 사용된다.
//    환경변수에 NEXT_PUBLIC_ 접두사를 붙이지 않으므로 브라우저 번들에 들어가지 않는다.
//    DB 접근은 전부 서버에서 일어난다.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** laundry_records 테이블의 한 행 (DB는 snake_case) */
export interface LaundryRecordRow {
  id: string;
  day_of_week: number;
  hour: number;
  available_machines: number;
  created_at: string;
}

export const RECORDS_TABLE = "laundry_records";

/** Supabase 환경변수가 모두 설정돼 있는지 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_ANON_KEY?.trim(),
  );
}

let cached: SupabaseClient | null = null;

/** Supabase 클라이언트를 만든다(한 번 만들고 재사용) */
export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_ANON_KEY 가 설정되지 않았습니다.",
    );
  }

  cached = createClient(url, key, {
    auth: {
      // 서버에서만 쓰므로 세션을 저장하거나 갱신할 필요가 없다.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
