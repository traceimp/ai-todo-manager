/**
 * Supabase를 사용한 할 일 관리 API 함수들입니다.
 * CRUD 기능과 검색/필터/정렬 기능을 제공합니다.
 */

import { createClient } from "@/lib/supabase/client";
import { Todo, CreateTodoData, UpdateTodoData, TodoFilters, TodoSort } from "@/lib/types";

// Supabase 클라이언트 인스턴스
const supabase = createClient();

/**
 * 할 일 목록 조회 (검색, 필터, 정렬 포함)
 */
export const getTodos = async (
    filters: TodoFilters = {},
    sort: TodoSort = { key: "created_at", direction: "desc" }
): Promise<Todo[]> => {
    try {
        let query = supabase
            .from("todos")
            .select(`
        *,
        categories (
          id,
          name
        )
      `)
            .order("created_at", { ascending: false }); // 기본 정렬

        // 검색 필터 적용
        if (filters.search) {
            query = query.ilike("title", `%${filters.search}%`);
        }

        // 상태 필터 적용
        if (filters.is_completed !== undefined) {
            query = query.eq("is_completed", filters.is_completed);
        }

        // 우선순위 필터 적용
        if (filters.priority) {
            query = query.eq("priority", filters.priority);
        }

        // 카테고리 필터 적용
        if (filters.category_id) {
            query = query.eq("category_id", filters.category_id);
        }

        // 정렬 적용
        if (sort.key && sort.direction) {
            const ascending = sort.direction === "asc";
            query = query.order(sort.key, { ascending });
        }

        const { data, error } = await query;

        if (error) {
            console.error("할 일 목록 조회 오류:", error);
            throw new Error("할 일 목록을 불러오는데 실패했습니다.");
        }

        return data || [];
    } catch (error) {
        console.error("getTodos 오류:", error);
        throw error;
    }
};

/**
 * 할 일 생성
 */
export const createTodo = async (todoData: CreateTodoData): Promise<Todo> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("로그인이 필요합니다.");
        }

        const { data, error } = await supabase
            .from("todos")
            .insert({
                ...todoData,
                user_id: user.id,
            })
            .select(`
        *,
        categories (
          id,
          name
        )
      `)
            .single();

        if (error) {
            console.error("할 일 생성 오류:", error);
            throw new Error("할 일을 생성하는데 실패했습니다.");
        }

        return data;
    } catch (error) {
        console.error("createTodo 오류:", error);
        throw error;
    }
};

/**
 * 할 일 수정
 */
export const updateTodo = async (id: number, todoData: UpdateTodoData): Promise<Todo> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("로그인이 필요합니다.");
        }

        const { data, error } = await supabase
            .from("todos")
            .update(todoData)
            .eq("id", id)
            .eq("user_id", user.id) // 본인 소유의 할 일만 수정 가능
            .select(`
        *,
        categories (
          id,
          name
        )
      `)
            .single();

        if (error) {
            console.error("할 일 수정 오류:", error);
            throw new Error("할 일을 수정하는데 실패했습니다.");
        }

        return data;
    } catch (error) {
        console.error("updateTodo 오류:", error);
        throw error;
    }
};

/**
 * 할 일 삭제
 */
export const deleteTodo = async (id: number): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("로그인이 필요합니다.");
        }

        const { error } = await supabase
            .from("todos")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id); // 본인 소유의 할 일만 삭제 가능

        if (error) {
            console.error("할 일 삭제 오류:", error);
            throw new Error("할 일을 삭제하는데 실패했습니다.");
        }
    } catch (error) {
        console.error("deleteTodo 오류:", error);
        throw error;
    }
};

/**
 * 할 일 완료 상태 토글
 */
export const toggleTodoComplete = async (id: number, isCompleted: boolean): Promise<Todo> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("로그인이 필요합니다.");
        }

        const { data, error } = await supabase
            .from("todos")
            .update({
                is_completed: isCompleted,
                completed_at: isCompleted ? new Date().toISOString() : null
            })
            .eq("id", id)
            .eq("user_id", user.id) // 본인 소유의 할 일만 수정 가능
            .select(`
        *,
        categories (
          id,
          name
        )
      `)
            .single();

        if (error) {
            console.error("할 일 상태 변경 오류:", error);
            throw new Error("할 일 상태를 변경하는데 실패했습니다.");
        }

        return data;
    } catch (error) {
        console.error("toggleTodoComplete 오류:", error);
        throw error;
    }
};

/**
 * 카테고리 목록 조회
 */
export const getCategories = async () => {
    try {
        const { data, error } = await supabase
            .from("categories")
            .select("*")
            .order("name");

        if (error) {
            console.error("카테고리 목록 조회 오류:", error);
            throw new Error("카테고리 목록을 불러오는데 실패했습니다.");
        }

        return data || [];
    } catch (error) {
        console.error("getCategories 오류:", error);
        throw error;
    }
};
