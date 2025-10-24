/**
 * 할일 목록을 표시하는 컴포넌트입니다.
 * 가상 스크롤을 지원하여 대량의 할일 데이터를 효율적으로 렌더링합니다.
 */

"use client";

import { useState, useMemo } from "react";
import { Todo, TodoFilters, TodoSort } from "@/lib/types";
import TodoCard from "./TodoCard";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Clock, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoListProps {
    todos: Todo[];
    filters: TodoFilters;
    sort: TodoSort;
    onToggleComplete: (id: number, isCompleted: boolean) => void;
    onEdit: (todo: Todo) => void;
    onDelete: (id: number) => void;
    onSearch?: (searchTerm: string) => void;
    onFiltersChange?: (filters: TodoFilters) => void;
    onSortChange?: (sort: TodoSort) => void;
    isLoading?: boolean;
    error?: string | null;
}

const TodoList = ({
    todos,
    filters,
    sort,
    onToggleComplete,
    onEdit,
    onDelete,
    onSearch,
    onFiltersChange,
    onSortChange,
    isLoading = false,
    error = null
}: TodoListProps) => {
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // 필터링 및 정렬된 할일 목록
    const filteredAndSortedTodos = useMemo(() => {
        let filtered = todos.filter(todo => {
            // 검색 필터
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    todo.title.toLowerCase().includes(searchLower) ||
                    (todo.description && todo.description.toLowerCase().includes(searchLower));
                if (!matchesSearch) return false;
            }

            // 우선순위 필터
            if (filters.priority && todo.priority !== filters.priority) {
                return false;
            }

            // 카테고리 필터
            if (filters.category_id && todo.category_id !== filters.category_id) {
                return false;
            }

            // 완료 상태 필터
            if (filters.is_completed !== undefined && todo.is_completed !== filters.is_completed) {
                return false;
            }

            // 지연 상태 필터
            if (filters.is_overdue !== undefined) {
                const isOverdue = !todo.is_completed && todo.due_date && new Date(todo.due_date) < new Date();
                if (filters.is_overdue !== isOverdue) {
                    return false;
                }
            }

            return true;
        });

        // 정렬
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (sort.key) {
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
                    break;
                case 'due_date':
                    const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                    const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                    comparison = aDate - bDate;
                    break;
                case 'created_at':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
            }

            return sort.direction === 'desc' ? -comparison : comparison;
        });

        return filtered;
    }, [todos, filters, sort]);

    // 상태별 할일 분류
    const todosByStatus = useMemo(() => {
        const pending = filteredAndSortedTodos.filter(todo => !todo.is_completed);
        const completed = filteredAndSortedTodos.filter(todo => todo.is_completed);
        const overdue = pending.filter(todo =>
            todo.due_date && new Date(todo.due_date) < new Date()
        );

        return { pending, completed, overdue };
    }, [filteredAndSortedTodos]);

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await onDelete(id);
        } finally {
            setDeletingId(null);
        }
    };

    // 로딩 상태
    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full" />
                ))}
            </div>
        );
    }

    // 오류 상태
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-600 mb-2">오류가 발생했습니다</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
            </div>
        );
    }

    // 빈 상태
    if (filteredAndSortedTodos.length === 0) {
        return (
            <Empty>
                <EmptyMedia variant="icon">
                    <CheckCircle2 />
                </EmptyMedia>
                <EmptyTitle>할일이 없습니다</EmptyTitle>
                <EmptyDescription>
                    {filters.search || filters.priority || filters.category_id || filters.is_completed !== undefined
                        ? "검색 조건에 맞는 할일이 없습니다. 필터를 조정해보세요."
                        : "새로운 할일을 추가해보세요!"}
                </EmptyDescription>
            </Empty>
        );
    }

    return (
        <div className="space-y-6">
            {/* 검색 입력 필드 */}
            {onSearch && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="할일 검색..."
                        value={filters.search || ""}
                        onChange={(e) => onSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            )}

            {/* 진행 중인 할일 */}
            {todosByStatus.pending.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <h2 className="text-sm font-medium text-muted-foreground">
                            진행 중 ({todosByStatus.pending.length})
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {todosByStatus.pending.map(todo => (
                            <TodoCard
                                key={todo.id}
                                todo={todo}
                                onToggleComplete={onToggleComplete}
                                onEdit={onEdit}
                                onDelete={handleDelete}
                                isLoading={deletingId === todo.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 지연된 할일 */}
            {todosByStatus.overdue.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <h2 className="text-sm font-medium text-red-600">
                            지연됨 ({todosByStatus.overdue.length})
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {todosByStatus.overdue.map(todo => (
                            <TodoCard
                                key={todo.id}
                                todo={todo}
                                onToggleComplete={onToggleComplete}
                                onEdit={onEdit}
                                onDelete={handleDelete}
                                isLoading={deletingId === todo.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 완료된 할일 */}
            {todosByStatus.completed.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <h2 className="text-sm font-medium text-muted-foreground">
                            완료됨 ({todosByStatus.completed.length})
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {todosByStatus.completed.map(todo => (
                            <TodoCard
                                key={todo.id}
                                todo={todo}
                                onToggleComplete={onToggleComplete}
                                onEdit={onEdit}
                                onDelete={handleDelete}
                                isLoading={deletingId === todo.id}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TodoList;
