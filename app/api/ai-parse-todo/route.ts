import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// 입력 검증 및 전처리 함수들
const validateAndPreprocessInput = (text: string) => {
    // 1. 기본 검증
    if (!text || typeof text !== 'string') {
        throw new Error('유효한 텍스트를 제공해야 합니다.');
    }

    // 2. 길이 검증
    if (text.length < 2) {
        throw new Error('입력 텍스트는 최소 2자 이상이어야 합니다.');
    }

    if (text.length > 500) {
        throw new Error('입력 텍스트는 최대 500자까지 입력 가능합니다.');
    }

    // 3. 전처리
    let processedText = text
        .trim() // 앞뒤 공백 제거
        .replace(/\s+/g, ' ') // 연속된 공백을 하나로 통합
        .normalize('NFC'); // 유니코드 정규화

    // 4. 특수 문자 및 이모지 검증
    const hasValidContent = /[가-힣a-zA-Z0-9]/.test(processedText);
    if (!hasValidContent) {
        throw new Error('한글, 영문, 숫자가 포함된 유효한 내용을 입력해주세요.');
    }

    // 5. 후처리된 텍스트 길이 재검증
    if (processedText.length < 2) {
        throw new Error('전처리 후 텍스트가 너무 짧습니다.');
    }

    return processedText;
};

// 응답 후처리 함수
const postprocessResponse = (data: any) => {
    const now = new Date();

    // 1. 제목 길이 조절
    if (data.title) {
        if (data.title.length > 120) {
            data.title = data.title.substring(0, 117) + '...';
        }
        if (data.title.length < 1) {
            data.title = '할일';
        }
    } else {
        data.title = '할일';
    }

    // 2. 날짜 검증 및 조절
    if (data.due_date) {
        const dueDate = new Date(data.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 과거 날짜인 경우 오늘로 설정
        if (dueDate < today) {
            data.due_date = today.toISOString();
        }
    }

    // 3. 우선순위 기본값 설정
    if (!data.priority || !['high', 'medium', 'low'].includes(data.priority)) {
        data.priority = 'medium';
    }

    // 4. 카테고리 기본값 설정
    if (!data.category || !['업무', '개인', '건강', '학습'].includes(data.category)) {
        data.category = '개인';
    }

    // 5. 설명 길이 제한
    if (data.description && data.description.length > 2000) {
        data.description = data.description.substring(0, 1997) + '...';
    }

    return data;
};

// AI 파싱 결과 스키마 정의
const ParsedTodoSchema = z.object({
    title: z.string().min(1).max(120).describe('할일의 제목 (120자 이내)'),
    description: z.string().max(2000).optional().describe('할일에 대한 상세 설명 (선택 사항, 2000자 이내)'),
    due_date: z.string().datetime().optional().nullable().describe('할일의 마감 날짜 및 시간 (ISO 8601 형식, 예: 2024-01-16T15:00:00Z). 시간이 명시되지 않은 경우 09:00로 설정.'),
    priority: z.enum(['high', 'medium', 'low']).optional().nullable().describe('할일의 우선순위 (high, medium, low 중 하나). 문맥을 기반으로 자동 판단.'),
    category: z.string().describe('할일의 카테고리. 반드시 "업무", "개인", "건강", "학습" 중 하나로 분류해야 합니다.')
});

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

        const { text } = requestBody;

        // 3. 입력 검증 및 전처리
        let processedText;
        try {
            processedText = validateAndPreprocessInput(text);
        } catch (validationError) {
            return NextResponse.json(
                {
                    success: false,
                    error: validationError instanceof Error ? validationError.message : '입력 검증에 실패했습니다.'
                },
                { status: 400 }
            );
        }

        // 현재 날짜 정보 계산 (한국 시간대 기준)
        const now = new Date();

        // 한국 시간대 (UTC+9)로 변환
        const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        const today = koreaTime.toISOString().split('T')[0];

        // 내일 계산 (한국 시간 기준 + 1일)
        const tomorrowDate = new Date(koreaTime);
        tomorrowDate.setDate(koreaTime.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];

        // 모레 계산 (한국 시간 기준 + 2일)
        const dayAfterTomorrowDate = new Date(koreaTime);
        dayAfterTomorrowDate.setDate(koreaTime.getDate() + 2);
        const dayAfterTomorrow = dayAfterTomorrowDate.toISOString().split('T')[0];

        // 이번주 금요일 계산 (한국 시간 기준, 금요일 = 5)
        const thisFriday = new Date(koreaTime);
        const daysUntilFriday = (5 - koreaTime.getDay() + 7) % 7;
        thisFriday.setDate(koreaTime.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
        const thisFridayStr = thisFriday.toISOString().split('T')[0];

        // 다음주 월요일 계산 (한국 시간 기준, 월요일 = 1)
        const nextMonday = new Date(koreaTime);
        const daysUntilNextMonday = (1 - koreaTime.getDay() + 7) % 7;
        nextMonday.setDate(koreaTime.getDate() + (daysUntilNextMonday === 0 ? 7 : daysUntilNextMonday));
        const nextMondayStr = nextMonday.toISOString().split('T')[0];

        // 현재 요일 정보 (한국 시간대 기준)
        const weekday = koreaTime.toLocaleDateString('ko-KR', { weekday: 'long' });

        // 디버깅을 위한 로그
        console.log('날짜 계산 디버깅:');
        console.log('서버 현재 시간 (UTC):', now.toString());
        console.log('한국 시간:', koreaTime.toString());
        console.log('현재 날짜 (한국 기준):', today);
        console.log('내일:', tomorrow);
        console.log('모레:', dayAfterTomorrow);
        console.log('이번주 금요일:', thisFridayStr);
        console.log('다음주 월요일:', nextMondayStr);

        // 4. Gemini API를 사용한 자연어 파싱
        const result = await generateObject({
            model: google('gemini-2.0-flash-exp'),
            schema: ParsedTodoSchema,
            prompt: `다음 자연어로 입력된 할일을 구조화된 데이터로 변환해주세요.

입력 텍스트: "${processedText}"

현재 날짜: ${today} (${weekday})

=== 날짜 처리 규칙 ===
현재 날짜가 ${today}이므로:
- "오늘" → ${today}T09:00:00.000Z
- "내일" → ${tomorrow}T09:00:00.000Z  
- "모레" → ${dayAfterTomorrow}T09:00:00.000Z
- "이번주 금요일" → ${thisFridayStr}T09:00:00.000Z
- "다음주 월요일" → ${nextMondayStr}T09:00:00.000Z

=== 시간 처리 규칙 ===
- "아침" → 09:00
- "점심" → 12:00
- "오후" → 14:00
- "저녁" → 18:00
- "밤" → 21:00
- 시간이 명시되지 않은 경우 09:00으로 기본 설정

=== 우선순위 키워드 ===
- high: "급하게", "중요한", "빨리", "꼭", "반드시"
- medium: "보통", "적당히", 키워드 없음
- low: "여유롭게", "천천히", "언젠가"

=== 카테고리 분류 키워드 ===
반드시 다음 카테고리 중 하나로 분류해야 합니다:
- "업무": "회의", "보고서", "프로젝트", "업무", "회사", "사무", "미팅", "발표", "기획", "업무용", "직장"
- "개인": "쇼핑", "친구", "가족", "개인", "여행", "휴가", "모임", "데이트", "쇼핑", "놀이", "취미"
- "건강": "운동", "병원", "건강", "요가", "헬스", "약속", "검진", "치료", "약", "의료", "피트니스"
- "학습": "공부", "책", "강의", "학습", "독서", "교육", "수업", "시험", "책 읽기", "독서하기", "공부하기", "배우기", "읽기", "학원"

중요: 카테고리는 반드시 정확한 한글 이름으로 반환해야 합니다 ("업무", "개인", "건강", "학습" 중 하나).
특히 "책 읽기", "독서하기", "읽기" 등은 모두 "학습" 카테고리로 분류해야 합니다.
카테고리 필드는 필수이며, 반드시 위 4개 카테고리 중 하나를 선택해야 합니다.

=== 출력 형식 ===
반드시 JSON 형식으로 응답하고, 모든 필드가 올바른 타입이어야 합니다.

=== 예시 ===
입력: "내일 오후 3시까지 중요한 팀 회의 준비하기"
출력: {
  "title": "팀 회의 준비",
  "description": "내일 오후 3시까지 팀 회의를 위한 준비 작업",
  "due_date": "${tomorrow}T15:00:00.000Z",
  "priority": "high",
  "category": "업무"
}

입력: "다음주 월요일까지 여유롭게 독서하기"
출력: {
  "title": "독서하기",
  "due_date": "${nextMondayStr}T09:00:00.000Z",
  "priority": "low",
  "category": "학습"
}

입력: "오늘 저녁 운동하기"
출력: {
  "title": "운동하기",
  "due_date": "${today}T18:00:00.000Z",
  "priority": "medium",
  "category": "건강"
}

입력: "모레 아침에 병원 예약하기"
출력: {
  "title": "병원 예약하기",
  "due_date": "${dayAfterTomorrow}T09:00:00.000Z",
  "priority": "medium",
  "category": "건강"
}

입력: "언젠가 책 읽기"
출력: {
  "title": "책 읽기",
  "due_date": null,
  "priority": "low",
  "category": "학습"
}

위 규칙에 따라 정확히 변환해주세요.`
        });

        // 5. 응답 후처리
        const processedData = postprocessResponse(result.object);

        // 6. 결과 반환
        return NextResponse.json({
            success: true,
            data: processedData,
            meta: {
                processed_at: new Date().toISOString(),
                original_text: processedText,
                processing_time: Date.now()
            }
        });

    } catch (error: any) {
        console.error('AI 할일 파싱 오류:', error);

        // 구체적인 에러 타입별 처리
        if (error.name === 'AI_LoadAPIKeyError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Google Generative AI API 키가 누락되었거나 잘못되었습니다. 환경 변수 GOOGLE_GENERATIVE_AI_API_KEY를 확인해주세요.'
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

        if (error.message?.includes('timeout')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'AI 처리 시간이 초과되었습니다. 더 간단한 문장으로 다시 시도해주세요.'
                },
                { status: 408 }
            );
        }

        // 일반적인 서버 오류
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'AI 처리 중 오류가 발생했습니다. 다시 시도해주세요.'
            },
            { status: 500 }
        );
    }
}