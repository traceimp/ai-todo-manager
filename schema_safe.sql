-- AI 할일 관리자 Supabase 데이터베이스 스키마 (안전한 버전)
-- 기존 객체가 있어도 에러 없이 실행되는 버전

-- ==============================================
-- 1. 확장 기능 활성화
-- ==============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ==============================================
-- 2. 우선순위 ENUM 타입 (안전한 생성)
-- ==============================================

-- 기존 타입이 있으면 삭제 후 재생성
DROP TYPE IF EXISTS priority_enum CASCADE;
CREATE TYPE priority_enum AS ENUM ('high', 'medium', 'low');

-- ==============================================
-- 3. 사용자 프로필 테이블
-- ==============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================
-- 4. 카테고리 테이블
-- ==============================================

CREATE TABLE IF NOT EXISTS public.categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================
-- 5. 할일 테이블
-- ==============================================

CREATE TABLE IF NOT EXISTS public.todos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description TEXT CHECK (char_length(description) <= 2000),
  due_date TIMESTAMPTZ,
  priority priority_enum NOT NULL DEFAULT 'medium',
  category_id BIGINT REFERENCES public.categories(id),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================
-- 6. 인덱스 생성 (안전한 생성)
-- ==============================================

-- 프로필 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- 카테고리 인덱스
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

-- 할일 인덱스
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON public.todos(due_date ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON public.todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_is_completed ON public.todos(is_completed);
CREATE INDEX IF NOT EXISTS idx_todos_category_id ON public.todos(category_id);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON public.todos(created_at DESC);

-- 검색 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_todos_title_trgm ON public.todos USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_todos_description_trgm ON public.todos USING GIN (description gin_trgm_ops);

-- ==============================================
-- 7. 트리거 함수 생성
-- ==============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 할일 완료 시 completed_at 자동 설정 함수
CREATE OR REPLACE FUNCTION public.set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
    NEW.completed_at = NOW();
  ELSIF NEW.is_completed = FALSE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 새 사용자 등록 시 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 8. 트리거 생성 (안전한 생성)
-- ==============================================

-- 프로필 트리거
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 카테고리 트리거
DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 할일 트리거
DROP TRIGGER IF EXISTS trg_todos_updated_at ON public.todos;
CREATE TRIGGER trg_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_todos_completed_at ON public.todos;
CREATE TRIGGER trg_todos_completed_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_completed_at();

-- 사용자 등록 트리거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================
-- 9. RLS 정책 설정
-- ==============================================

-- profiles 테이블 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- categories 테이블 RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "categories_block_write" ON public.categories;

CREATE POLICY "categories_select_all" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "categories_block_write" ON public.categories
  FOR ALL USING (false) WITH CHECK (false);

-- todos 테이블 RLS
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "todos_select_own" ON public.todos;
DROP POLICY IF EXISTS "todos_insert_own" ON public.todos;
DROP POLICY IF EXISTS "todos_update_own" ON public.todos;
DROP POLICY IF EXISTS "todos_delete_own" ON public.todos;

CREATE POLICY "todos_select_own" ON public.todos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "todos_insert_own" ON public.todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "todos_update_own" ON public.todos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "todos_delete_own" ON public.todos
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- 10. 기본 카테고리 데이터 삽입
-- ==============================================

INSERT INTO public.categories (name, description, color) VALUES
  ('업무', '업무 관련 할일', '#EF4444'),
  ('개인', '개인적인 할일', '#10B981'),
  ('학습', '학습 및 교육 관련', '#3B82F6'),
  ('건강', '건강 관리 관련', '#F59E0B'),
  ('취미', '취미 및 여가', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;

-- ==============================================
-- 11. 권한 설정
-- ==============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.todos TO authenticated;
GRANT SELECT ON public.categories TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ==============================================
-- 12. 유용한 뷰 생성
-- ==============================================

-- 할일과 카테고리 정보를 포함한 뷰
DROP VIEW IF EXISTS public.todos_with_category;
CREATE VIEW public.todos_with_category AS
SELECT 
  t.*,
  c.name as category_name,
  c.color as category_color
FROM public.todos t
LEFT JOIN public.categories c ON t.category_id = c.id;

-- 사용자별 할일 통계 뷰
DROP VIEW IF EXISTS public.user_todo_stats;
CREATE VIEW public.user_todo_stats AS
SELECT 
  user_id,
  COUNT(*) as total_todos,
  COUNT(*) FILTER (WHERE is_completed = true) as completed_todos,
  COUNT(*) FILTER (WHERE is_completed = false) as pending_todos,
  COUNT(*) FILTER (WHERE is_completed = false AND due_date < NOW()) as overdue_todos,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_todos,
  COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority_todos,
  COUNT(*) FILTER (WHERE priority = 'low') as low_priority_todos
FROM public.todos
GROUP BY user_id;

-- 뷰 권한 설정
GRANT SELECT ON public.todos_with_category TO authenticated;
GRANT SELECT ON public.user_todo_stats TO authenticated;

-- ==============================================
-- 완료 메시지
-- ==============================================

SELECT 'AI 할일 관리자 데이터베이스 스키마가 안전하게 생성되었습니다.' as message;
