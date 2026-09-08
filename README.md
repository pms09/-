# 기숙사 세탁기 혼잡 예측 웹앱

학생들이 직접 공유한 "비어 있는 세탁기 수" 기록을 요일·시간대별로 평균 내어
**여유 / 보통 / 혼잡** 3단계로 예측하고, **AI 빨래 도우미**(Google Gemini)가
언제 가면 좋을지 문장으로 추천하는 앱입니다.

## 기술 스택

- Next.js 16 (App Router) · TypeScript · Tailwind CSS v4
- 데이터: 현재 mock(메모리 + JSON), 이후 Supabase(Postgres)로 교체 예정
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

`.env.local` 은 `.gitignore` 에 포함되어 커밋되지 않습니다. AI 호출은
`app/api/recommend` 서버 라우트에서만 이루어지며 키는 브라우저로 전달되지 않습니다.

## 화면

| 경로      | 화면          | 설명                                                     |
| --------- | ------------- | -------------------------------------------------------- |
| `/`       | 홈 / 입력     | 요일·시간대 선택 + 자연어 질문 + '추천받기'              |
| `/result` | AI 추천 결과  | 시간대별 혼잡도 막대그래프 + AI 추천 말풍선              |
| `/record` | 현황 기록     | '지금 비어 있는 세탁기 수' 입력 + 저장                   |

## API 라우트

| 메서드 · 경로            | 설명                                             |
| ----------------------- | ------------------------------------------------ |
| `GET /api/records`      | 전체 현황 기록 조회                              |
| `POST /api/records`     | 새 현황 기록 추가                                |
| `GET /api/congestion`   | `?day=` 요일의 시간대별 혼잡도 등급              |
| `POST /api/recommend`   | 질문 + 혼잡도 → Gemini 추천 (연동은 다음 단계)   |

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
  components/
    site-nav.tsx              네비게이션
    congestion-bar-chart.tsx  혼잡도 막대그래프
  lib/
    types.ts             공유 도메인 타입
    config.ts            설정 상수 (세탁기 대수, 등급 임계값, 모델명 …)
    data.ts              데이터 접근 계층 (mock → Supabase 교체 지점)
    mock-data.json       시드 기록
    congestion.ts        평균 → 등급 계산
    gemini.ts            Gemini 연동 (서버 전용, 뼈대)
```

## 다음 단계

1. `lib/gemini.ts` 에 실제 Gemini `generateContent` 호출 구현
2. `/result` 화면에서 `/api/congestion` · `/api/recommend` 실제 호출
3. `lib/data.ts` 에 `SupabaseLaundryStore` 추가 후 교체
