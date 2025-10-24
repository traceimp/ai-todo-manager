/**
 * 할일 관리 툴바 컴포넌트입니다.
 * 검색, 필터, 정렬 기능을 제공합니다.
 */

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, SortAsc, SortDesc, X } from "lucide-react";
import { TodoFilters, TodoSort, SortKey, SortDirection, Priority } from "@/lib/types";

interface ToolbarProps {
    filters: TodoFilters;
    sort: TodoSort;
    onFiltersChange: (filters: TodoFilters) => void;
    onSortChange: (sort: TodoSort) => void;
    todoCount: number;
}

const Toolbar = ({ filters, sort, onFiltersChange, onSortChange, todoCount }: ToolbarProps) => {
    const [showFilters, setShowFilters] = useState(false);

    // 검색어 변경 핸들러
    const handleSearchChange = (value: string) => {
        onFiltersChange({ ...filters, search: value || undefined });
    };

    // 우선순위 필터 변경 핸들러
    const handlePriorityFilterChange = (value: string) => {
        onFiltersChange({
            ...filters,
            priority: value === "all" ? undefined : value as Priority
        });
    };

    // 완료 상태 필터 변경 핸들러
    const handleStatusFilterChange = (value: string) => {
        let isCompleted: boolean | undefined;
        let isOverdue: boolean | undefined;

        switch (value) {
            case "completed":
                isCompleted = true;
                break;
            case "pending":
                isCompleted = false;
                break;
            case "overdue":
                isOverdue = true;
                break;
            default:
                isCompleted = undefined;
                isOverdue = undefined;
        }

        onFiltersChange({
            ...filters,
            is_completed: isCompleted,
            is_overdue: isOverdue
        });
    };

    // 정렬 변경 핸들러
    const handleSortChange = (key: string, direction: string) => {
        onSortChange({
            key: key as SortKey,
            direction: direction as SortDirection
        });
    };

    // 필터 초기화
    const clearFilters = () => {
        onFiltersChange({});
    };

    // 활성 필터 개수 계산
    const activeFilterCount = Object.values(filters).filter(value =>
        value !== undefined && value !== null && value !== ""
    ).length;

    return (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="max-w-7xl mx-auto">
                {/* 검색 및 필터 버튼 */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    {/* 검색 입력창 */}
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="할일을 검색하세요..."
                                value={filters.search || ""}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* 필터 및 정렬 버튼들 */}
                    <div className="flex flex-wrap gap-2 items-center">
                        {/* 필터 토글 버튼 */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className="relative"
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            필터
                            {activeFilterCount > 0 && (
                                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>

                        {/* 정렬 드롭다운 */}
                        <Select
                            value={`${sort.key}-${sort.direction}`}
                            onValueChange={(value) => {
                                const [key, direction] = value.split('-');
                                handleSortChange(key, direction);
                            }}
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="정렬 기준" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="priority-desc">우선순위 높음순</SelectItem>
                                <SelectItem value="priority-asc">우선순위 낮음순</SelectItem>
                                <SelectItem value="due_date-asc">마감일 빠른순</SelectItem>
                                <SelectItem value="due_date-desc">마감일 늦은순</SelectItem>
                                <SelectItem value="created_at-desc">최신 생성순</SelectItem>
                                <SelectItem value="created_at-asc">오래된 생성순</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* 할일 개수 표시 */}
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            총 {todoCount}개
                        </div>
                    </div>
                </div>

                {/* 필터 패널 */}
                {showFilters && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                        <div className="flex flex-wrap gap-4 items-center">
                            {/* 우선순위 필터 */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    우선순위:
                                </label>
                                <Select
                                    value={filters.priority || "all"}
                                    onValueChange={handlePriorityFilterChange}
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">전체</SelectItem>
                                        <SelectItem value="high">높음</SelectItem>
                                        <SelectItem value="medium">중간</SelectItem>
                                        <SelectItem value="low">낮음</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 상태 필터 */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    상태:
                                </label>
                                <Select
                                    value={
                                        filters.is_overdue
                                            ? "overdue"
                                            : filters.is_completed === true
                                                ? "completed"
                                                : filters.is_completed === false
                                                    ? "pending"
                                                    : "all"
                                    }
                                    onValueChange={handleStatusFilterChange}
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">전체</SelectItem>
                                        <SelectItem value="pending">진행중</SelectItem>
                                        <SelectItem value="completed">완료</SelectItem>
                                        <SelectItem value="overdue">지연됨</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 필터 초기화 버튼 */}
                            {activeFilterCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    필터 초기화
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Toolbar;
