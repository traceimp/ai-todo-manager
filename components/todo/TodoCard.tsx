/**
 * 개별 할일을 표시하는 카드 컴포넌트입니다.
 * 우선순위, 마감일, 카테고리 정보를 시각적으로 표시하고 완료/편집/삭제 기능을 제공합니다.
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Tag, Edit, Trash2, Clock } from "lucide-react";
import { Todo, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TodoCardProps {
    todo: Todo;
    onToggleComplete: (id: number, isCompleted: boolean) => void;
    onEdit: (todo: Todo) => void;
    onDelete: (id: number) => void;
    isLoading?: boolean;
}

const TodoCard = ({ todo, onToggleComplete, onEdit, onDelete, isLoading = false }: TodoCardProps) => {
    const [isDeleting, setIsDeleting] = useState(false);

    // 우선순위 색상 매핑
    const getPriorityColor = (priority: Priority) => {
        switch (priority) {
            case 'high':
                return 'bg-red-500 text-white';
            case 'medium':
                return 'bg-amber-500 text-white';
            case 'low':
                return 'bg-emerald-500 text-white';
            default:
                return 'bg-slate-500 text-white';
        }
    };

    // 우선순위 텍스트 매핑
    const getPriorityText = (priority: Priority) => {
        switch (priority) {
            case 'high':
                return '높음';
            case 'medium':
                return '중간';
            case 'low':
                return '낮음';
            default:
                return priority;
        }
    };

    // 마감일 상태 확인
    const isOverdue = !todo.is_completed && todo.due_date && new Date(todo.due_date) < new Date();

    // 마감일 포맷팅 함수
    const formatDueDate = () => {
        if (!todo.due_date) return null;
        const dueDate = new Date(todo.due_date);
        return dueDate.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const dueDateText = formatDueDate();

    // 마감일까지 남은 일수 계산
    const getDaysUntilDue = () => {
        if (!todo.due_date) return null;
        const dueDate = new Date(todo.due_date);
        const today = new Date();
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysUntilDue = getDaysUntilDue();

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete(todo.id);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Card className={cn(
            "transition-all duration-200 hover:shadow-md card-hover",
            todo.is_completed && "opacity-75 bg-muted/50",
            isOverdue && !todo.is_completed && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10"
        )}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                        <Checkbox
                            checked={todo.is_completed}
                            onCheckedChange={(checked) => onToggleComplete(todo.id, !!checked)}
                            disabled={isLoading}
                            className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className={cn(
                                "font-medium text-sm leading-5",
                                todo.is_completed && "line-through text-muted-foreground"
                            )}>
                                {todo.title}
                            </h3>
                            {todo.description && (
                                <p className={cn(
                                    "text-xs text-muted-foreground mt-1 line-clamp-2",
                                    todo.is_completed && "line-through"
                                )}>
                                    {todo.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                            onClick={() => onEdit(todo)}
                            disabled={isLoading}
                        >
                            <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                            onClick={handleDelete}
                            disabled={isLoading || isDeleting}
                        >
                            <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                <div className="space-y-3">
                    {/* 마감일과 카테고리 정보 */}
                    <div className="flex items-center justify-between">
                        {/* 카테고리 정보 */}
                        {(todo.category || todo.categories) && (
                            <div className="flex items-center text-xs text-muted-foreground">
                                <Tag className="h-3 w-3 mr-1 text-blue-500" />
                                <span className="text-blue-600 font-medium">
                                    {todo.category?.name || todo.categories?.name || '카테고리 없음'}
                                </span>
                            </div>
                        )}

                        {/* 마감일 정보 */}
                        {dueDateText && (
                            <div className="flex items-center text-xs">
                                <Calendar className="h-3 w-3 mr-1 text-gray-500" />
                                <span className={cn(
                                    "font-medium",
                                    isOverdue && "text-red-600"
                                )}>
                                    {dueDateText}
                                    {daysUntilDue !== null && (
                                        <span className="ml-1 text-gray-500">
                                            ({isOverdue ? '지연됨' : daysUntilDue === 0 ? '오늘' : daysUntilDue === 1 ? '내일' : `D-${daysUntilDue}`})
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 우선순위 뱃지 */}
                    <div className="flex items-center justify-end">
                        <Badge className={cn("text-xs", getPriorityColor(todo.priority))}>
                            {getPriorityText(todo.priority)}
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TodoCard;
