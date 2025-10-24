
# RPD.md — 제품 요구사항 정의서 (To‑Do + AI 요약/생성)

작성일: 2025-10-22  
대상 플랫폼: 웹 (데스크톱/모바일 반응형)  
배포 대상: Vercel(Frontend) + Supabase(Backend, DB, Auth, Edge Functions)

---

## 0. 비전 & 목표

- **비전:** “빠르게 기록하고, 똑똑하게 정리되는 개인용 할 일 관리자”.  
- **핵심 가치:** 입력 마찰 최소화(자연어 → 구조화), 오늘 해야 할 일 가시화, 주간 관성 유지(요약/피드백).  
- **측정 지표(초기):**
  - D1 신규 가입자의 **첫 할 일 생성 완료율 ≥ 80%**
  - 7일 차 **잔존율 ≥ 25%**
  - 주간 요약 버튼 **사용률 ≥ 40%**

---

## 1. 범위 (In/Out of Scope)

- **In Scope (MVP)**
  - 이메일/비밀번호 기반 회원가입·로그인 (Supabase Auth)
  - 할 일 CRUD (제목, 설명, 마감일, 우선순위, 카테고리, 생성일, 완료 여부)
  - 검색(제목/설명), 필터(우선순위/카테고리/진행상태), 정렬(우선순위/마감일/생성일)
  - AI 기능
    - 자연어 → 구조화된 할 일 생성
    - 일일/주간 요약 및 진행 분석
- **Out of Scope (차기)**
  - 협업(다중 사용자 공유), 알림/푸시, 캘린더 연동, 서브태스크/반복 작업, 파일 업로드

---

## 2. 사용자 페르소나 & 주요 시나리오

- **페르소나 A: 바쁜 강사/프리랜서**
  - 특징: 모바일·데스크톱 병행, 할 일을 빠르게 적고 주간 단위로 정리
  - 시나리오: 자연어로 “내일 10시 팀 회의 준비” 입력 → 즉시 카드 생성 → 오늘 탭에서 우선순위순 보기 → 금요일에 주간 요약 확인

- **페르소나 B: 취준생/학생**
  - 특징: 과목별/프로젝트별 카테고리 관리, 마감일 기반 정렬
  - 시나리오: “프로젝트 보고서 초안 수요일까지” → 생성 → 카테고리 ‘학습’ 필터 → 일일 요약으로 오늘 해야 할 3가지 확인

---

## 3. 화면 구성(IA) & 와이어프레임

### 3.1 라우팅 구조
- `/auth` : 로그인/회원가입(탭 전환)
- `/todos` : 메인(목록 + 검색/필터/정렬 + AI 입력 + 요약)
- `/settings` : 계정/환경설정(선택)

### 3.2 메인 레이아웃(와이어프레임)

```
+--------------------------------------------------------+
|  헤더: 로고 | 검색창 [제목/설명] | 프로필 메뉴              |
+--------------------------------------------------------+
|  필터: [우선] [카테고리] [상태]   정렬: [우선/마감/생성]   |
+--------------------------------------------------------+
|  입력바: [자연어 입력…] (Enter=일반 생성) [AI 생성]       |
+--------------------------------------------------------+
|  리스트(가상 스크롤)                                     |
|  [□] 제목            (우선 뱃지) (카테고리) (마감 D-3)    |
|      설명 미리보기…  [편집] [삭제]                        |
|  [■] 완료된 항목…                                         |
|  ...                                                    |
+--------------------------------------------------------+
|  하단 바: [오늘 요약] [주간 요약]                         |
+--------------------------------------------------------+
```

### 3.3 컴포넌트 트리(요약)
- `AppHeader`, `SearchInput`
- `FiltersBar`(PriorityFilter, CategoryFilter, StatusFilter, SortMenu)
- `AiQuickAdd`(NaturalInput, GenerateButton)
- `TodoList`(virtualized) → `TodoItemCard`
- `SummaryDrawer`(DailySummary, WeeklySummary)

---

## 4. 주요 기능 & 수용 기준

### 4.1 인증(이메일/비밀번호) — Supabase Auth
- **요구사항**
  - 회원가입, 로그인, 로그아웃, 비밀번호 재설정 메일
- **수용 기준**
  - 유효하지 않은 이메일/약한 비밀번호는 클라이언트 & 서버에서 검증
  - 로그인 성공 시 `/todos`로 리다이렉션
  - JWT 만료 시 재인증 플로우 제공(새로고침 시 자동 세션 복원)

### 4.2 할 일 관리(CRUD)
- **필드**
  - `title`(필수, 1~120자), `description`(선택, ≤ 2000자)
  - `due_date`(타임존 포함), `priority`(‘high’|‘medium’|‘low’)
  - `category`(문자열 또는 사전 테이블 참조), `is_completed`(boolean)
  - `created_at`(자동), `updated_at`(자동), `user_id`(소유자)
- **수용 기준**
  - 생성: 필수값 누락 시 에러 메시지, 성공 시 목록 최상단 반영(낙관적 업데이트)
  - 조회: 로그인 사용자 소유 데이터만 RLS로 보이기
  - 수정: 완료 토글·본문 편집 지원
  - 삭제: 되돌리기(3초 Undo 토스트) 제공(프론트 캐시 기반)

### 4.3 검색/필터/정렬
- **검색:** 제목/설명 `ILIKE` + trigram 인덱스
- **필터:** 우선순위, 카테고리, 상태(진행/완료/지연(마감<오늘 AND 미완료))
- **정렬:** 기본 `due_date ASC NULLS LAST` → 우선/마감/생성일 토글
- **수용 기준**
  - 조합 필터(AND) 동작, 서버 쿼리로 페이지네이션(무한 스크롤)

### 4.4 AI 할 일 생성
- **입력:** 자연어(예: “내일 오전 10시에 팀 회의 준비”)
- **출력:** 구조화 JSON `{ "title": string, "due_date": ISO8601, "priority"?: "high|medium|low", "category"?: string }`
- **수용 기준**
  - 날짜 파싱(상대일, 한국어 시간대) 정확도 90% 이상(내부 QA 샘플 기준)
  - 파싱 실패 시 사용자가 편집할 수 있는 드래프트 카드로 반환

### 4.5 AI 요약/분석
- **일일 요약:** 오늘 완료/미완료, 지연 항목 수, 상위 3개 추천
- **주간 요약:** 주차별 완료율, 카테고리별 분포, 리마인드 메시지
- **수용 기준**
  - 1초 내 최초 응답(스트리밍 텍스트), 10초 내 전체 결과 렌더 목표

---

## 5. 기술 스택

- **Frontend:** Next.js(App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zod
- **Backend:** Supabase(Auth, Postgres, Storage, Edge Functions)
- **AI:** Google Gemini(API via server-side Edge Function), OpenAI 대체 가능 (인터페이스 동일)
- **Infra/배포:** Vercel(프론트), Supabase(백엔드), Sentry(에러), Logflare/Edge Logs
- **테스트:** Vitest/Jest(유닛), Playwright(E2E)
- **품질:** ESLint, Prettier, Lighthouse(a11y/성능)

---

## 6. 데이터 모델 (Supabase / Postgres)

### 6.1 ERD (텍스트)
```
users (auth.users)
   └── profiles (1:1)
         └── todos (1:N)
categories (마스터, 선택)
```

### 6.2 스키마(SQL)

```sql
-- profiles: auth.users 보조 프로필 (선택)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

-- categories: 확장 가능
create table if not exists public.categories (
  id bigserial primary key,
  name text unique not null check (char_length(name) between 1 and 40)
);

-- todos
create type priority_enum as enum ('high','medium','low');

create table if not exists public.todos (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  due_date timestamptz,
  priority priority_enum not null default 'medium',
  category_id bigint references public.categories(id),
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_todos_user on public.todos(user_id);
create index if not exists idx_todos_due on public.todos(due_date asc nulls last);
create index if not exists idx_todos_priority on public.todos(priority);
create index if not exists idx_todos_completed on public.todos(is_completed);

-- 검색 최적화 (trigram)
create extension if not exists pg_trgm;
create index if not exists idx_todos_title_trgm on public.todos using gin (title gin_trgm_ops);
create index if not exists idx_todos_desc_trgm on public.todos using gin (description gin_trgm_ops);

-- 업데이트 트리거
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_updated_at on public.todos;
create trigger trg_set_updated_at before update on public.todos
for each row execute function public.set_updated_at();
```

### 6.3 RLS 정책

```sql
alter table public.todos enable row level security;

-- 소유자만 CRUD
create policy "todos_select_own" on public.todos
for select using (auth.uid() = user_id);

create policy "todos_insert_own" on public.todos
for insert with check (auth.uid() = user_id);

create policy "todos_update_own" on public.todos
for update using (auth.uid() = user_id);

create policy "todos_delete_own" on public.todos
for delete using (auth.uid() = user_id);
```

> **참고:** `categories`는 전역 공개 읽기, 쓰기 제한을 권장합니다.

```sql
alter table public.categories enable row level security;

create policy "categories_read_all" on public.categories
for select using (true);

-- 관리자만 쓰기(차기): 지금은 임시로 차단
create policy "categories_block_write" on public.categories
for all using (false) with check (false);
```

---

## 7. 서버(Edge Function) 설계 — AI

### 7.1 엔드포인트
- `POST /functions/v1/ai-generate-todo`
  - 입력: `{ "text": "내일 오전 10시에 팀 회의 준비" }`
  - 출력: `{ "title": "...", "due_date": "YYYY-MM-DDTHH:mm:ssZ", "priority":"?", "category":"?" }`
- `POST /functions/v1/ai-summarize`
  - 입력: `{ "range": "daily" | "weekly", "todos": [...] }`
  - 출력: `{ "summary": "텍스트", "stats": { "done": n, "pending": n, ... } }`

### 7.2 의사코드(Typescript)

```ts
// ai-generate-todo.ts (Supabase Edge Function)
import { serve } from "https://deno.land/std/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

serve(async (req) => {
  try {
    const { text, tz = "Asia/Seoul" } = await req.json();
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `다음 한국어 문장을 파싱하여 JSON으로만 반환하세요.
형식: { "title": string, "due_date": ISO8601, "priority": "high|medium|low"?, "category"?: string }
문장: "${text}"
현재 타임존: ${tz}
상대 표현(내일/모레/이번주 금요일 등)을 정확히 해석하세요. 불명확하면 필드는 생략.`;

    const r = await model.generateContent(prompt);
    const content = r.response.text().trim();

    return new Response(content, { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
```

> **보안:** 이 경로는 **서버 전용 키**로 AI 호출하며, 클라이언트에서 키를 노출하지 않도록 합니다.

---

## 8. 프런트엔드 설계

### 8.1 상태 관리
- TanStack Query로 서버 상태 관리, 비동기 캐시·낙관적 업데이트
- Zod로 폼·API 응답 스키마 검증

### 8.2 API 예시 (supabase-js)

```ts
// 읽기 (검색/필터/정렬/페이징)
const { data, error } = await supabase
  .from("todos")
  .select("*")
  .ilike("title", `%${q}%`)   // q가 있으면
  .or(`description.ilike.%${q}%`)
  .eq("priority", priority ?? undefined)
  .eq("is_completed", isCompleted ?? undefined)
  .eq("category_id", categoryId ?? undefined)
  .order(sortKey, { ascending: sortAsc })
  .range(offset, offset + limit - 1);

// 생성
const { data: created } = await supabase.from("todos").insert({
  user_id: user.id,
  title,
  description,
  due_date,
  priority,
  category_id
}).select().single();

// 완료 토글
await supabase.from("todos").update({ is_completed: !prev }).eq("id", id);
```

> **지연 상태 필터**는 클라이언트 계산 또는 `rpc`로 처리할 수 있습니다.

### 8.3 지연 상태 계산 예시

```ts
const isOverdue = (t: Todo) => !t.is_completed && t.due_date && Date.now() > Date.parse(t.due_date);
```

### 8.4 UI 컴포넌트 (shadcn/ui)
- `Card`, `Badge`, `DropdownMenu`, `Dialog`, `Toast`, `Sheet` 활용
- 키보드 UX: `Enter` 추가, `⌘K`로 전역 검색(차기)

---

## 9. 검색/필터/정렬 쿼리 설계

- **검색:** `(title ILIKE %q%) OR (description ILIKE %q%)` + GIN trigram 인덱스
- **필터 조합:** `AND` 결합. 예) `priority='high' AND category_id=3 AND is_completed=false`
- **정렬:** `CASE WHEN priority='high' THEN 1 ... END, due_date ASC NULLS LAST` 등 복합 정렬 지원

예시(View 또는 RPC):

```sql
create or replace function public.list_todos(
  q text default null,
  p priority_enum default null,
  c_id bigint default null,
  only_overdue boolean default null,
  only_done boolean default null,
  sort_key text default 'due',
  asc boolean default true
) returns setof public.todos language sql stable as $$
  select * from public.todos
  where user_id = auth.uid()
    and (q is null or (title ilike '%'||q||'%' or description ilike '%'||q||'%'))
    and (p is null or priority = p)
    and (c_id is null or category_id = c_id)
    and (only_done is null or is_completed = only_done)
    and (only_overdue is null or (not is_completed and due_date is not null and now() > due_date))
  order by
    case when sort_key='priority' then
      case priority when 'high' then 1 when 'medium' then 2 else 3 end
    end nulls last,
    case when sort_key='due' then due_date end asc,
    case when sort_key='created' then created_at end asc;
$$;
```

> 실제 구현 시 정렬 방향은 동적 SQL로 분기하십시오.

---

## 10. 보안, 프라이버시, 권한

- **RLS 강제**: 모든 `todos`는 `user_id=auth.uid()`만 접근 가능
- **비공개 기본값**: 요약 결과는 서버에서 일시 생성 후 폐기(미저장)
- **API 키 보호**: Gemini API는 Edge Function에서만 호출
- **CSP/HTTPS**: 프로덕션에서 HTTPS 강제, CSP 기본 정책 적용
- **감사 로깅**: 실패 요청/에러는 Supabase Logs + Sentry

---

## 11. 비기능 요구사항

- **성능**: 최초 뷰 LCP ≤ 2.5s(Vercel 캐시, 코드 스플리팅), 리스트 가상 스크롤
- **가용성**: Supabase SLA 준수, 장애 시 읽기 전용 모드(클라이언트 캐시 표시)
- **a11y**: WCAG 2.1 AA, 키보드 내비게이션/스크린리더 라벨
- **i18n**: 기본 한국어, 차기 영어 로딩 지원

---

## 12. 에러 처리 & UX

- **낙관적 UI**: 생성/수정/삭제 즉시 반영 → 실패 시 토스트로 롤백
- **네트워크 에러**: 재시도/오프라인 배지
- **AI 실패**: 파싱 불가 시 원문을 “임시 카드”로 삽입 후 사용자가 직접 수정

토스트 메시지 표준 예시
- 성공: “할 일이 추가되었습니다.”
- 실패: “추가에 실패했습니다. 네트워크 상태를 확인해 주세요.”
- Undo: “삭제됨. [되돌리기] (3초)”

---

## 13. 분석(Analytics)

- 이벤트: `todo_created`, `todo_completed`, `ai_generate_clicked`, `summary_daily_viewed`, `filter_changed`
- 개인정보 최소화(PII 금지), 이벤트 샘플링 50% 시작 → 단계적 확장

---

## 14. 배포 & 환경 변수

- **Vercel(프런트)**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Supabase(Edge Functions)**
  - `GEMINI_API_KEY` (서버 전용)
- **브랜치 전략**: `main`(prod), `dev`(preview), PR마다 Preview URL

---

## 15. 테스트 전략

- **단위**: 날짜 파서 유틸, 상태 계산, Zod 스키마
- **통합**: Supabase 로컬(Studio)로 CRUD/RLS 시나리오
- **E2E**: Playwright — 가입→로그인→생성→검색/필터→완료→요약
- **성능**: Lighthouse 스냅샷 CI

---

## 16. 예시 UI 흐름(스크린샷 대체 시나리오)

1) 로그인 → 첫 접속 `/todos`  
2) 상단 입력바에 “내일 오전 10시에 팀 회의 준비” 입력 → **AI 생성**  
3) 카드 미리보기 확인 후 **추가** → 목록 반영  
4) `우선순위=높음`, `정렬=마감일순` 선택  
5) 하단 **오늘 요약** 클릭 → 완료/미완료/지연 요약 표시

---

## 17. 구현 체크리스트(스프린트 2주)

- [ ] Supabase 프로젝트/테이블/RLS 구성
- [ ] Auth UI + 세션 복원
- [ ] Todo CRUD + 가상 스크롤
- [ ] 검색/필터/정렬 + 인덱스
- [ ] AI Edge Function 2종(GEN/SUMMARY)
- [ ] 요약 UI(스트리밍) + 통계칩
- [ ] E2E 시나리오 6개
- [ ] 배포/모니터링(Sentry)

---

## 18. Next.js 파일 구조(제안)

```
src/
  app/
    auth/page.tsx
    todos/page.tsx
    layout.tsx
  components/
    header/AppHeader.tsx
    todos/
      AiQuickAdd.tsx
      TodoList.tsx
      TodoItemCard.tsx
      FiltersBar.tsx
      SummaryDrawer.tsx
  lib/
    supabaseClient.ts
    ai.ts (Edge 호출 래퍼)
    validators.ts (zod)
    utils/date.ts
```

---

## 19. Zod 스키마 & 폼

```ts
import { z } from "zod";

export const TodoSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional().or(z.literal("").transform(() => undefined)),
  due_date: z.string().datetime().optional(),
  priority: z.enum(["high","medium","low"]).default("medium"),
  category_id: z.number().optional(),
  is_completed: z.boolean().default(false)
});
```

---

## 20. AI 프롬프트 스펙 (한국어)

**생성 프롬프트(요약):**  
- 지시: “사용자 문장을 한국어 기준으로 시간대를 Asia/Seoul로 해석하여 ISO8601로 변환. 불명확하면 해당 필드 제외. JSON만.”  
- 컨텍스트: 오늘 날짜, 사용자의 기본 근무시간대(선택)  
- 출력 스키마: 위 Zod와 호환

**요약 프롬프트:**  
- 입력: 사용자의 이번 주 todos 배열(필수 필드만), 완료/미완료/지연 기준 정의 포함  
- 출력: “한 문단 요약 + 불릿 3개(추천 작업)”

---

## 21. 위험 요소 & 대응

- 날짜 파싱 모호성 → 사용자 확인 단계(드래프트) + 에지 케이스 테스트 세트
- AI 비용 증가 → 캐싱(같은 입력 10분 캐시), Flash 모델 우선, 긴 목록은 서버 집계 후 요약
- 성능 저하(대량 항목) → 무한 스크롤 + 서버 페이지네이션 + 필요 컬럼만 선택

---

## 22. 용어 정의

- **지연(Overdue)**: `now() > due_date AND is_completed = false`
- **완료율**: `완료 개수 / 총 개수`
- **주간**: ISO Week(월~일) 기준(한국어 로캘)

---

## 23. 부록 — 샘플 카테고리 시드

```sql
insert into public.categories(name) values
('업무'),('개인'),('학습')
on conflict do nothing;
```

---

## 24. 수락 테스트(샘플)

- [ ] “내일 10시 팀 회의 준비” → `due_date`가 내일 10:00(+09:00)로 생성
- [ ] `우선=높음` + `정렬=마감일`에서 높음이 먼저, 같은 우선 내 마감 임박 순
- [ ] “보고서” 검색 시 제목/설명에 포함된 항목만 노출
- [ ] 다른 사용자 데이터 비가시성(RLS)
- [ ] 주간 요약 버튼 동작, 10초 내 결과 수신

---

끝.
