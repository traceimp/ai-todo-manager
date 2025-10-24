import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// AI 요약 결과 스키마 정의
const TodoSummarySchema = z.object({
    summary: z.string().describe('할일 목록의 전체 요약 (완료율, 총 개수 등 포함)'),
    urgentTasks: z.array(z.string()).describe('긴급하거나 중요한 할일 목록 (최대 5개)'),
    insights: z.array(z.string()).describe('할일 패턴이나 특징에 대한 인사이트 (최대 5개)'),
    recommendations: z.array(z.string()).describe('사용자에게 도움이 되는 실행 가능한 추천 사항 (최대 5개)')
});

// 입력 검증 함수
const validateInput = (period: string) => {
    if (!period || !['today', 'week'].includes(period)) {
        throw new Error('분석 기간은 "today" 또는 "week"이어야 합니다.');
    }
};

// 할일 데이터 전처리 함수
const preprocessTodoData = (todos: any[], period: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let filteredTodos = todos;

    if (period === 'today') {
        // 오늘 할일만 필터링
        filteredTodos = todos.filter(todo => {
            if (!todo.due_date) return false;
            const dueDate = new Date(todo.due_date);
            const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            return dueDateOnly.getTime() === today.getTime();
        });
    } else if (period === 'week') {
        // 이번주 할일만 필터링
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // 일요일
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // 토요일

        filteredTodos = todos.filter(todo => {
            if (!todo.due_date) return false;
            const dueDate = new Date(todo.due_date);
            return dueDate >= startOfWeek && dueDate <= endOfWeek;
        });
    }

    return filteredTodos;
};

// 분석 데이터 생성 함수
const generateAnalysisData = (todos: any[]) => {
    const totalTodos = todos.length;
    const completedTodos = todos.filter(todo => todo.is_completed).length;
    const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

    // 우선순위별 완료율 분석
    const priorityStats = {
        high: {
            total: todos.filter(todo => todo.priority === 'high').length,
            completed: todos.filter(todo => todo.priority === 'high' && todo.is_completed).length,
            completionRate: 0
        },
        medium: {
            total: todos.filter(todo => todo.priority === 'medium').length,
            completed: todos.filter(todo => todo.priority === 'medium' && todo.is_completed).length,
            completionRate: 0
        },
        low: {
            total: todos.filter(todo => todo.priority === 'low').length,
            completed: todos.filter(todo => todo.priority === 'low' && todo.is_completed).length,
            completionRate: 0
        }
    };

    // 우선순위별 완료율 계산
    Object.keys(priorityStats).forEach(priority => {
        const stats = priorityStats[priority as keyof typeof priorityStats];
        stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    });

    // 우선순위 분포 (기존 호환성 유지)
    const priorityDistribution = {
        high: priorityStats.high.total,
        medium: priorityStats.medium.total,
        low: priorityStats.low.total
    };

    // 마감일 상태 분석
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const overdueTasks = todos.filter(todo => {
        if (!todo.due_date || todo.is_completed) return false;
        const dueDate = new Date(todo.due_date);
        return dueDate < today;
    });

    const dueTodayTasks = todos.filter(todo => {
        if (!todo.due_date || todo.is_completed) return false;
        const dueDate = new Date(todo.due_date);
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        return dueDateOnly.getTime() === today.getTime();
    });

    const dueTomorrowTasks = todos.filter(todo => {
        if (!todo.due_date || todo.is_completed) return false;
        const dueDate = new Date(todo.due_date);
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        return dueDateOnly.getTime() === tomorrow.getTime();
    });

    // 마감일 준수율 계산
    const totalWithDueDate = todos.filter(todo => todo.due_date && todo.is_completed).length;
    const onTimeCompleted = todos.filter(todo => {
        if (!todo.due_date || !todo.is_completed) return false;
        const dueDate = new Date(todo.due_date);
        const completedDate = new Date(todo.completed_at || todo.updated_at);
        return completedDate <= dueDate;
    }).length;
    const onTimeRate = totalWithDueDate > 0 ? Math.round((onTimeCompleted / totalWithDueDate) * 100) : 0;

    // 시간대별 분석
    const timeDistribution = {
        morning: 0, // 06:00-12:00
        afternoon: 0, // 12:00-18:00
        evening: 0, // 18:00-24:00
        night: 0 // 00:00-06:00
    };

    todos.forEach(todo => {
        if (todo.due_date) {
            const dueDate = new Date(todo.due_date);
            const hour = dueDate.getHours();
            if (hour >= 6 && hour < 12) timeDistribution.morning++;
            else if (hour >= 12 && hour < 18) timeDistribution.afternoon++;
            else if (hour >= 18 && hour < 24) timeDistribution.evening++;
            else timeDistribution.night++;
        }
    });

    // 카테고리별 분석
    const categoryStats = todos.reduce((acc, todo) => {
        const category = todo.categories?.name || '미분류';
        if (!acc[category]) {
            acc[category] = { total: 0, completed: 0, completionRate: 0 };
        }
        acc[category].total++;
        if (todo.is_completed) acc[category].completed++;
        return acc;
    }, {} as Record<string, { total: number; completed: number; completionRate: number }>);

    // 카테고리별 완료율 계산
    Object.keys(categoryStats).forEach(category => {
        const stats = categoryStats[category];
        stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    });

    // 가장 생산적인 시간대 찾기
    const mostProductiveTime = Object.entries(timeDistribution)
        .sort(([, a], [, b]) => b - a)[0];

    return {
        totalTodos,
        completedTodos,
        completionRate,
        priorityDistribution,
        priorityStats,
        overdueTasks: overdueTasks.length,
        dueTodayTasks: dueTodayTasks.length,
        dueTomorrowTasks: dueTomorrowTasks.length,
        timeDistribution,
        onTimeRate,
        categoryStats,
        mostProductiveTime: mostProductiveTime ? `${mostProductiveTime[0]} (${mostProductiveTime[1]}개)` : '없음',
        urgentTasks: [...overdueTasks, ...dueTodayTasks].slice(0, 5).map(todo => todo.title)
    };
};

export async function POST(request: Request) {
    try {
        // 1. API 키 검증
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'API 키가 설정되지 않았습니다. 환경 변수 GOOGLE_GENERATIVE_AI_API_KEY를 확인해주세요.'
                },
                { status: 500 }
            );
        }

        // 2. 요청 본문 파싱
        let requestBody;
        try {
            requestBody = await request.json();
        } catch (parseError) {
            return NextResponse.json(
                {
                    success: false,
                    error: '잘못된 JSON 형식입니다. 올바른 형식으로 요청해주세요.'
                },
                { status: 400 }
            );
        }

        const { period } = requestBody;

        // 3. 입력 검증
        try {
            validateInput(period);
        } catch (validationError) {
            return NextResponse.json(
                {
                    success: false,
                    error: validationError instanceof Error ? validationError.message : '입력 검증에 실패했습니다.'
                },
                { status: 400 }
            );
        }

        // 4. Supabase에서 사용자 할일 데이터 조회
        const supabase = await createClient();

        // 현재 사용자 정보 가져오기
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json(
                {
                    success: false,
                    error: '인증되지 않은 사용자입니다.'
                },
                { status: 401 }
            );
        }

        const { data: todos, error: todosError } = await supabase
            .from('todos')
            .select(`
                id,
                title,
                description,
                due_date,
                priority,
                is_completed,
                category_id,
                created_at,
                categories (
                    name
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (todosError) {
            console.error('할일 데이터 조회 오류:', todosError);
            return NextResponse.json(
                {
                    success: false,
                    error: '할일 데이터를 가져오는 중 오류가 발생했습니다.'
                },
                { status: 500 }
            );
        }

        // 5. 할일 데이터 전처리
        const filteredTodos = preprocessTodoData(todos || [], period);

        if (filteredTodos.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    summary: period === 'today' ? '오늘 예정된 할일이 없습니다.' : '이번주 예정된 할일이 없습니다.',
                    urgentTasks: [],
                    insights: ['새로운 할일을 추가해보세요!'],
                    recommendations: ['할일을 추가하여 생산성을 높여보세요.']
                }
            });
        }

        // 6. 분석 데이터 생성
        const analysisData = generateAnalysisData(filteredTodos);

        // 7. Gemini API를 사용한 AI 분석
        const result = await generateObject({
            model: google('gemini-2.0-flash-exp'),
            schema: TodoSummarySchema,
            prompt: `당신은 전문적인 생산성 분석가입니다. 사용자의 할일 데이터를 분석하여 정교하고 실용적인 인사이트를 제공해주세요.

=== 분석 기간 ===
${period === 'today' ? '오늘 (당일 분석)' : '이번주 (주간 분석)'}

=== 기본 데이터 ===
총 ${analysisData.totalTodos}개의 할일 중 ${analysisData.completedTodos}개 완료 (완료율: ${analysisData.completionRate}%)

우선순위별 상세 분석:
- 높음: ${analysisData.priorityStats.high.total}개 (완료: ${analysisData.priorityStats.high.completed}개, 완료율: ${analysisData.priorityStats.high.completionRate}%)
- 보통: ${analysisData.priorityStats.medium.total}개 (완료: ${analysisData.priorityStats.medium.completed}개, 완료율: ${analysisData.priorityStats.medium.completionRate}%)
- 낮음: ${analysisData.priorityStats.low.total}개 (완료: ${analysisData.priorityStats.low.completed}개, 완료율: ${analysisData.priorityStats.low.completionRate}%)

마감일 현황:
- 지연된 할일: ${analysisData.overdueTasks}개
- 오늘 마감: ${analysisData.dueTodayTasks}개
- 내일 마감: ${analysisData.dueTomorrowTasks}개
- 마감일 준수율: ${analysisData.onTimeRate}%

시간대별 분포:
- 오전 (06:00-12:00): ${analysisData.timeDistribution.morning}개
- 오후 (12:00-18:00): ${analysisData.timeDistribution.afternoon}개
- 저녁 (18:00-24:00): ${analysisData.timeDistribution.evening}개
- 밤 (00:00-06:00): ${analysisData.timeDistribution.night}개
- 가장 집중된 시간대: ${analysisData.mostProductiveTime}

카테고리별 분석:
${Object.entries(analysisData.categoryStats).map(([category, stats]) => {
                const categoryStats = stats as { total: number; completed: number; completionRate: number };
                return `- ${category}: ${categoryStats.total}개 (완료: ${categoryStats.completed}개, 완료율: ${categoryStats.completionRate}%)`;
            }).join('\n')}

긴급한 할일:
${analysisData.urgentTasks.map(task => `- ${task}`).join('\n')}

=== 분석 요청사항 ===

**1. 완료율 분석**
- 일일/주간 완료율 계산 및 평가
- 우선순위별 완료 패턴 분석 (높음/보통/낮음 우선순위별 완료율)
- 마감일 준수율 계산 (지연된 할일 비율 분석)

**2. 시간 관리 분석**
- 마감일 준수율 계산 및 평가
- 연기된 할일의 빈도 및 패턴 파악
- 시간대별 업무 집중도 분포 분석 (어느 시간대에 가장 많은 할일이 집중되는지)

**3. 생산성 패턴**
- 가장 생산적인 요일과 시간대 도출
- 자주 미루는 작업 유형 식별
- 완료하기 쉬운 작업의 공통 특징 도출

**4. 실행 가능한 추천**
- 구체적인 시간 관리 팁 제공
- 우선순위 조정 및 일정 재배치 제안
- 업무 과부하를 줄이는 분산 전략 포함

**5. 긍정적인 피드백**
- 사용자가 잘하고 있는 부분 강조
- 개선점을 격려하는 긍정적 톤으로 제시
- 동기부여 메시지 포함

**6. 기간별 차별화**
${period === 'today' ?
                    '- 오늘의 요약: 당일 집중도와 남은 할일 우선순위 제시\n- 오늘 남은 시간을 효율적으로 활용하는 방법 제안' :
                    '- 이번주 요약: 주간 패턴 분석 및 다음주 계획 제안\n- 주간 생산성 트렌드 분석 및 개선 방향 제시'}

=== 출력 형식 ===

**summary**: 전체적인 요약 (완료율, 주요 성과, 개선 영역을 포함한 자연스러운 한국어 문장)

**urgentTasks**: 긴급하거나 중요한 할일 목록 (최대 5개, 구체적인 액션 아이템)

**insights**: 할일 패턴 분석 인사이트 (최대 5개, 데이터 기반의 구체적인 발견사항)

**recommendations**: 실행 가능한 추천사항 (최대 5개, 바로 실천할 수 있는 구체적인 조언)

=== 톤앤매너 ===
- 친근하고 격려하는 톤
- 전문적이면서도 이해하기 쉬운 언어
- 구체적이고 실용적인 조언
- 긍정적이면서도 현실적인 피드백
- 사용자의 노력을 인정하고 동기부여하는 메시지

분석 결과를 사용자가 이해하기 쉽고, 바로 실천할 수 있는 자연스러운 한국어 문장으로 구성해주세요.`
        });

        // 8. 결과 반환
        return NextResponse.json({
            success: true,
            data: result.object,
            meta: {
                period,
                totalTodos: analysisData.totalTodos,
                completedTodos: analysisData.completedTodos,
                completionRate: analysisData.completionRate,
                analyzed_at: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('AI 할일 요약 오류:', error);

        // 구체적인 에러 타입별 처리
        if (error.name === 'AI_LoadAPIKeyError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Google Generative AI API 키가 누락되었거나 잘못되었습니다.'
                },
                { status: 401 }
            );
        }

        if (error.name === 'AI_NetworkError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
                },
                { status: 503 }
            );
        }

        if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.'
                },
                { status: 429 }
            );
        }

        // 일반적인 서버 오류
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.'
            },
            { status: 500 }
        );
    }
}
