-- 기숙사 세탁기 혼잡 예측 — Supabase 스키마
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → New query 에 붙여넣고 Run.
-- 여러 번 실행해도 안전하다(IF NOT EXISTS / ON CONFLICT).

-- 학생들이 직접 남기는 "현황 기록" 1건 = 1행
create table if not exists public.laundry_records (
  id                 uuid        primary key default gen_random_uuid(),
  -- 0=일요일 ~ 6=토요일 (JS Date.getDay 기준)
  day_of_week        smallint    not null check (day_of_week between 0 and 6),
  -- 24시간제 "시" 단위
  hour               smallint    not null check (hour between 0 and 23),
  -- 그 시각에 비어 있던 세탁기 대수
  available_machines smallint    not null check (available_machines >= 0),
  created_at         timestamptz not null default now()
);

-- 혼잡도 집계는 (요일, 시간)으로 조회하므로 복합 인덱스를 둔다.
create index if not exists laundry_records_day_hour_idx
  on public.laundry_records (day_of_week, hour);

-- RLS 활성화. 앱은 anon 키로만 접근하므로 정책이 없으면 전부 차단된다.
alter table public.laundry_records enable row level security;

-- 이 앱은 "학생들이 익명으로 공유하는 게시판" 성격이라 읽기/쓰기를 모두 허용한다.
-- 수정·삭제는 허용하지 않는다(정책을 만들지 않으면 차단됨).
drop policy if exists "anyone can read records"   on public.laundry_records;
drop policy if exists "anyone can insert records" on public.laundry_records;

create policy "anyone can read records"
  on public.laundry_records for select
  using (true);

create policy "anyone can insert records"
  on public.laundry_records for insert
  with check (true);
