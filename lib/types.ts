/**
 * 할일 관리 시스템의 타입 정의입니다.
 * RPD 문서의 데이터 모델을 기반으로 정의되었습니다.
 */

export type Priority = 'high' | 'medium' | 'low';

export type TodoStatus = 'pending' | 'completed' | 'overdue';

export interface Category {
    id: number;
    name: string;
}

export interface Todo {
    id: number;
    user_id: string;
    title: string;
    description?: string;
    due_date?: string; // ISO 8601 형식
    priority: Priority;
    category_id?: number;
    category?: Category;
    categories?: Category; // Supabase join 결과용
    is_completed: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateTodoData {
    title: string;
    description?: string;
    due_date?: string;
    priority: Priority;
    category_id?: number;
}

export interface UpdateTodoData extends Partial<CreateTodoData> {
    is_completed?: boolean;
}

export interface TodoFilters {
    search?: string;
    priority?: Priority;
    category_id?: number;
    is_completed?: boolean;
    is_overdue?: boolean;
}

export type SortKey = 'priority' | 'due_date' | 'created_at';
export type SortDirection = 'asc' | 'desc';

export interface TodoSort {
    key: SortKey;
    direction: SortDirection;
}

// AI 생성 결과 타입
export interface AIGeneratedTodo {
    title: string;
    due_date?: string;
    priority?: Priority;
    category?: string;
}

// 일일/주간 요약 타입
export interface TodoSummary {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completion_rate: number;
    top_priorities: Todo[];
    summary_text: string;
}

export interface DailySummary extends TodoSummary {
    date: string;
}

export interface WeeklySummary extends TodoSummary {
    week_start: string;
    week_end: string;
    daily_stats: DailySummary[];
}
