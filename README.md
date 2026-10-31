# 기숙사 세탁기 혼잡 예측 웹앱

학생들이 직접 공유한 "비어 있는 세탁기 수" 기록을 요일·시간대별로 평균 내어
**여유 / 보통 / 혼잡** 3단계로 예측하고, **AI 빨래 도우미**(Google Gemini)가
언제 가면 좋을지 문장으로 추천하는 앱입니다.

## 기술 스택

- Next.js 16 (App Router) · TypeScript · Tailwind CSS v4
- 데이터: Supabase(Postgres). 환경변수가 없으면 메모리 mock으로 자동 폴백
- AI: Google Gemini (무료 `gemini-flash` 계열) — 서버 라우트에서만 호출

## 개발 서버

```bash
npm run dev
```

http://localhost:3000 접속.

## 환경변수

`.env.example` 을 복사해 `.env.local` 을 만들고 값을 채웁니다.

| 이름             | 설명                                                  |
| ---------------- | ----------------------------------------------------- |
| `GEMINI_API_KEY` | Google Gemini API 키. **서버 전용**, 커밋 금지.       |
| `GEMINI_MODEL`   | (선택) 모델 이름. 기본 `gemini-flash-latest`.         |
| `SUPABASE_URL`      | Supabase 프로젝트 URL. **서버 전용**.              |
| `SUPABASE_ANON_KEY` | Supabase anon 키. **서버 전용**.                   |

`.env.local` 은 `.gitignore` 에 포함되어 커밋되지 않습니다. AI 호출은
`app/api/recommend` 서버 라우트에서만 이루어지며 키는 브라우저로 전달되지 않습니다.

## Supabase 설정

현황 기록을 영구 저장하려면 Supabase 프로젝트가 필요합니다.
`SUPABASE_URL` / `SUPABASE_ANON_KEY` 가 **둘 다** 있으면 Postgres에 저장하고,
하나라도 없으면 메모리 mock 저장소로 자동 폴백합니다(서버 로그에 경고가 찍힘).

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. 대시보드 → **SQL Editor** → `supabase/schema.sql` 내용을 붙여넣고 **Run**
   (테이블 + 인덱스 + RLS 정책 생성. 여러 번 실행해도 안전)
3. 그래프에 예시 데이터를 넣으려면 `supabase/seed.sql` 도 같은 방식으로 실행 (선택)
4. **Project Settings → Data API** 에서 Project URL 과 anon public 키 복사
5. 로컬은 `.env.local`, 배포는 Vercel **Settings → Environment Variables** 에 등록 후 재배포

### 테이블 구조

`public.laundry_records` — 학생이 남긴 기록 1건 = 1행

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid | 기본키 (자동 생성) |
| `day_of_week` | smallint | 0=일 ~ 6=토 |
| `hour` | smallint | 0~23 |
| `available_machines` | smallint | 비어 있던 세탁기 대수 |
| `created_at` | timestamptz | 생성 시각 (자동) |

RLS가 켜져 있고 **읽기·추가만** 허용됩니다(수정·삭제 정책 없음).

## 화면

| 경로      | 화면          | 설명                                                     |
| --------- | ------------- | -------------------------------------------------------- |
| `/`       | 홈 / 입력     | 요일·시간대 선택 + 자연어 질문 + '추천받기'              |
| `/result` | AI 추천 결과  | 혼잡도 막대그래프 + AI 추천 말풍선 + 이어서 대화하기     |
| `/record` | 현황 기록     | '지금 비어 있는 세탁기 수' 입력 + 저장                   |

## API 라우트

| 메서드 · 경로            | 설명                                             |
| ----------------------- | ------------------------------------------------ |
| `GET /api/records`      | 전체 현황 기록 조회                              |
| `POST /api/records`     | 새 현황 기록 추가                                |
| `GET /api/congestion`   | `?day=` 요일의 시간대별 혼잡도 등급              |
| `POST /api/recommend`   | 질문 + 혼잡도 → Gemini 추천 문장                 |
| `POST /api/chat`        | 대화 기록 + 혼잡도 → Gemini 후속 답변            |

`POST /api/recommend` · `POST /api/chat` 응답 상태: `ok` /
`not-implemented`(키 미설정, 501) / `error`(입력 오류 400 · Gemini 호출 실패
502 · DB 오류 503).

`POST /api/chat` 은 무료 등급(모델당 하루 20회) 보호를 위해 한 대화에서
사용자 메시지를 최대 `MAX_CHAT_TURNS`(기본 5)회로 제한합니다.

## 폴더 구조 (핵심)

```
src/
  app/
    layout.tsx            루트 레이아웃 + 네비게이션
    page.tsx              홈 / 입력
    result/page.tsx       AI 추천 결과
    record/page.tsx       현황 기록
    api/
      records/route.ts    기록 조회·추가
      congestion/route.ts 혼잡도 집계
      recommend/route.ts  AI 추천 (Gemini)
      chat/route.ts       AI 대화 (Gemini)
  components/
    site-nav.tsx              네비게이션
    congestion-bar-chart.tsx  혼잡도 막대그래프
  lib/
    types.ts             공유 도메인 타입
    config.ts            설정 상수 (세탁기 대수, 등급 임계값, 모델명 …)
    data.ts              데이터 접근 계층 (Supabase / mock 선택)
    supabase.ts          Supabase 클라이언트 (서버 전용)
    mock-data.json       시드 기록
    congestion.ts        평균 → 등급 계산
    gemini.ts            Gemini 연동 (서버 전용)
```

## 다음 단계

1. 기록 화면에 최근 기록 목록 표시
2. 같은 요일·시간대 중복 입력 처리 (예: 10분 내 재입력 제한)
3. 표본 수가 쌓인 뒤 혼잡도 임계값(`lib/config.ts`) 재조정
