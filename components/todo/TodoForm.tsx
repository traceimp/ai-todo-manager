/**
 * 할일 추가/편집을 위한 폼 컴포넌트입니다.
 * 자연어 입력과 AI 생성을 지원하며, 우선순위, 마감일, 카테고리 설정이 가능합니다.
 */

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Tag, Sparkles, Loader2, AlertCircle, Wand2 } from "lucide-react";
import { Todo, CreateTodoData, Priority, Category } from "@/lib/types";
import { cn } from "@/lib/utils";

// 폼 스키마 정의
const TodoFormSchema = z.object({
    title: z.string().min(1, "제목을 입력해주세요").max(120, "제목은 120자를 초과할 수 없습니다"),
    description: z.string().max(2000, "설명은 2000자를 초과할 수 없습니다").optional(),
    due_date: z.string().optional(),
    priority: z.enum(["high", "medium", "low"]),
    category_id: z.string().optional(),
});

type TodoFormData = z.infer<typeof TodoFormSchema>;

interface TodoFormProps {
    todo?: Todo; // 편집 모드일 때 기존 할일 데이터
    categories: Category[];
    onSubmit: (data: CreateTodoData) => Promise<void>;
    onCancel?: () => void;
    isLoading?: boolean;
}

const TodoForm = ({
    todo,
    categories,
    onSubmit,
    onCancel,
    isLoading = false
}: TodoFormProps) => {
    const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
    const [isAIParsing, setIsAIParsing] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const isEditMode = !!todo;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        trigger,
        formState: { errors, isValid },
        reset,
    } = useForm<TodoFormData>({
        resolver: zodResolver(TodoFormSchema),
        mode: "onChange", // 실시간 유효성 검사 활성화
        defaultValues: {
            title: todo?.title || "",
            description: todo?.description || "",
            due_date: todo?.due_date ? new Date(todo.due_date).toISOString().slice(0, 16) : "",
            priority: todo?.priority || "medium",
            category_id: todo?.category_id?.toString() || "",
        },
    });

    const watchedValues = watch();

    // AI 자연어 파싱 처리
    const handleAIParse = async () => {
        if (!naturalLanguageInput.trim()) return;

        setIsAIParsing(true);
        setAiError(null);

        try {
            const response = await fetch('/api/ai-parse-todo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: naturalLanguageInput }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error || 'AI 파싱 중 오류가 발생했습니다.';

                // HTTP 상태 코드에 따른 구체적인 에러 메시지
                if (response.status === 400) {
                    throw new Error(`입력 오류: ${errorMessage}`);
                } else if (response.status === 429) {
                    throw new Error('AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.');
                } else if (response.status === 503) {
                    throw new Error('AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
                } else if (response.status === 408) {
                    throw new Error('AI 처리 시간이 초과되었습니다. 더 간단한 문장으로 다시 시도해주세요.');
                } else {
                    throw new Error(errorMessage);
                }
            }

            const result = await response.json();

            if (result.success && result.data) {
                const parsedData = result.data;

                console.log('=== AI 파싱 결과 ===');
                console.log('전체 파싱 데이터:', parsedData);
                console.log('파싱된 제목:', parsedData.title);
                console.log('파싱된 카테고리:', parsedData.category);
                console.log('파싱된 우선순위:', parsedData.priority);

                // 폼에 파싱된 데이터 적용
                setValue('title', parsedData.title);
                if (parsedData.description) {
                    setValue('description', parsedData.description);
                }
                if (parsedData.due_date) {
                    const dueDate = new Date(parsedData.due_date);
                    setValue('due_date', dueDate.toISOString().slice(0, 16));
                }
                setValue('priority', parsedData.priority);

                // 카테고리 찾기 및 설정
                console.log('=== 카테고리 처리 시작 ===');
                console.log('AI 파싱된 카테고리:', parsedData.category);
                console.log('사용 가능한 카테고리들:', categories.map(cat => cat.name));
                console.log('카테고리 배열:', categories);

                if (parsedData.category) {

                    // 정확한 매칭 시도
                    let matchedCategory = categories.find(cat =>
                        cat.name.toLowerCase() === parsedData.category.toLowerCase()
                    );

                    // 정확한 매칭이 없으면 부분 매칭 시도
                    if (!matchedCategory) {
                        matchedCategory = categories.find(cat =>
                            cat.name.toLowerCase().includes(parsedData.category.toLowerCase()) ||
                            parsedData.category.toLowerCase().includes(cat.name.toLowerCase())
                        );
                    }

                    // 키워드 기반 매칭 시도
                    if (!matchedCategory) {
                        const categoryKeywords = {
                            '업무': ['업무', '회의', '보고서', '프로젝트', '회사', '사무', '미팅', '발표', '기획', '업무용', '직장'],
                            '개인': ['개인', '쇼핑', '친구', '가족', '여행', '휴가', '모임', '데이트', '놀이', '취미'],
                            '건강': ['건강', '운동', '병원', '요가', '헬스', '약속', '검진', '치료', '약', '의료', '피트니스'],
                            '학습': ['학습', '공부', '책', '강의', '독서', '교육', '책 읽기', '독서하기', '공부하기', '배우기', '읽기', '학원', '수업', '시험']
                        };

                        for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
                            const matchedKeyword = keywords.find(keyword =>
                                parsedData.category.toLowerCase().includes(keyword.toLowerCase()) ||
                                naturalLanguageInput.toLowerCase().includes(keyword.toLowerCase())
                            );
                            if (matchedKeyword) {
                                matchedCategory = categories.find(cat => cat.name === categoryName);
                                if (matchedCategory) {
                                    console.log(`키워드 매칭 성공: "${matchedKeyword}" → "${categoryName}"`);
                                    break;
                                }
                            }
                        }
                    }

                    if (matchedCategory) {
                        console.log('매칭된 카테고리:', matchedCategory.name);
                        setValue('category_id', matchedCategory.id.toString());
                    } else {
                        console.log('카테고리 매칭 실패:', parsedData.category);
                    }
                } else {
                    console.log('AI에서 카테고리를 파싱하지 않음');
                }

                console.log('=== 카테고리 처리 완료 ===');

                // 폼 유효성 재검증 (AI 파싱 후 버튼 활성화를 위해)
                await trigger();

                // 자연어 입력 초기화
                setNaturalLanguageInput("");
            }
        } catch (error) {
            console.error('AI 파싱 오류:', error);
            setAiError(error instanceof Error ? error.message : 'AI 파싱 중 오류가 발생했습니다.');
        } finally {
            setIsAIParsing(false);
        }
    };


    // 폼 제출 처리
    const handleFormSubmit = async (data: TodoFormData) => {
        try {
            const submitData: CreateTodoData = {
                title: data.title,
                description: data.description || undefined,
                due_date: data.due_date || undefined,
                priority: data.priority,
                category_id: data.category_id ? parseInt(data.category_id) : undefined,
            };

            await onSubmit(submitData);

            if (!isEditMode) {
                reset();
                setNaturalLanguageInput("");
            }
        } catch (error) {
            console.error("폼 제출 오류:", error);
        }
    };

    // 우선순위 옵션
    const priorityOptions = [
        { value: "high", label: "높음", color: "bg-red-500" },
        { value: "medium", label: "중간", color: "bg-amber-500" },
        { value: "low", label: "낮음", color: "bg-emerald-500" },
    ] as const;

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    {isEditMode ? "할일 편집" : "새 할일 추가"}
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* 자연어 입력 섹션 */}
                {!isEditMode && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                자연어로 할일을 입력하세요
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="예: 내일 오후 3시까지 중요한 팀 회의 준비하기"
                                    value={naturalLanguageInput}
                                    onChange={(e) => setNaturalLanguageInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAIParse();
                                        }
                                    }}
                                    disabled={isAIParsing}
                                />
                                <Button
                                    type="button"
                                    onClick={handleAIParse}
                                    disabled={!naturalLanguageInput.trim() || isAIParsing}
                                    className="bg-brand-gradient text-white"
                                >
                                    {isAIParsing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Wand2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Enter 키를 눌러 AI가 자연어를 구조화된 할일 데이터로 변환할 수 있습니다
                            </p>

                            {/* AI 오류 메시지 */}
                            {aiError && (
                                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-red-700 dark:text-red-300">
                                        {aiError}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>

                        <Separator />
                    </div>
                )}

                {/* 수동 입력 폼 */}
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    {/* 제목 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            제목 <span className="text-red-500">*</span>
                        </label>
                        <Input
                            {...register("title")}
                            placeholder="할일 제목을 입력하세요"
                            disabled={isLoading}
                            className={cn(errors.title && "border-red-500")}
                        />
                        {errors.title && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.title.message}
                            </p>
                        )}
                    </div>

                    {/* 설명 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">설명</label>
                        <Textarea
                            {...register("description")}
                            placeholder="할일에 대한 상세 설명을 입력하세요"
                            rows={3}
                            disabled={isLoading}
                            className={cn(errors.description && "border-red-500")}
                        />
                        {errors.description && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    {/* 마감일 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            마감일
                        </label>
                        <Input
                            type="datetime-local"
                            {...register("due_date")}
                            disabled={isLoading}
                        />
                    </div>

                    {/* 우선순위 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">우선순위</label>
                        <Select
                            value={watchedValues.priority}
                            onValueChange={(value) => setValue("priority", value as Priority)}
                            disabled={isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {priorityOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                            <Badge className={cn("text-xs", option.color)}>
                                                {option.label}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 카테고리 */}
                    {categories.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                카테고리
                            </label>
                            <Select
                                value={watchedValues.category_id}
                                onValueChange={(value) => setValue("category_id", value)}
                                disabled={isLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="카테고리를 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id.toString()}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* 폼 액션 버튼들 */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="submit"
                            disabled={!isValid || isLoading}
                            className="flex-1"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    {isEditMode ? "저장 중..." : "추가 중..."}
                                </>
                            ) : (
                                isEditMode ? "저장" : "추가"
                            )}
                        </Button>

                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={isLoading}
                            >
                                취소
                            </Button>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default TodoForm;
