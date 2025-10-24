/**
 * 개발 및 테스트를 위한 mock 데이터입니다.
 * 실제 API 연동 전까지 화면 구조를 확인하기 위해 사용됩니다.
 */

import { Todo, Category, Priority } from "./types";

// Mock 카테고리 데이터
export const mockCategories: Category[] = [
    { id: 1, name: "업무" },
    { id: 2, name: "개인" },
    { id: 3, name: "학습" },
    { id: 4, name: "건강" },
    { id: 5, name: "취미" },
];

// Mock 할일 데이터
export const mockTodos: Todo[] = [
    {
        id: 1,
        user_id: "user-1",
        title: "프로젝트 보고서 작성",
        description: "Q4 분기 보고서를 작성하고 상사에게 제출해야 합니다.",
        due_date: "2024-12-25T09:00:00Z",
        priority: "high",
        category_id: 1,
        category: mockCategories[0],
        is_completed: false,
        created_at: "2024-12-20T10:00:00Z",
        updated_at: "2024-12-20T10:00:00Z",
    },
    {
        id: 2,
        user_id: "user-1",
        title: "장보기",
        description: "주말 장보기 목록: 우유, 빵, 계란, 야채",
        due_date: "2024-12-22T14:00:00Z",
        priority: "medium",
        category_id: 2,
        category: mockCategories[1],
        is_completed: false,
        created_at: "2024-12-20T11:00:00Z",
        updated_at: "2024-12-20T11:00:00Z",
    },
    {
        id: 3,
        user_id: "user-1",
        title: "React 강의 수강",
        description: "Next.js 15 App Router 관련 강의를 완주해야 합니다.",
        due_date: "2024-12-30T18:00:00Z",
        priority: "medium",
        category_id: 3,
        category: mockCategories[2],
        is_completed: true,
        created_at: "2024-12-18T09:00:00Z",
        updated_at: "2024-12-19T15:30:00Z",
    },
    {
        id: 4,
        user_id: "user-1",
        title: "헬스장 가기",
        description: "주 3회 헬스장 운동 계획",
        due_date: "2024-12-21T19:00:00Z",
        priority: "low",
        category_id: 4,
        category: mockCategories[3],
        is_completed: false,
        created_at: "2024-12-19T08:00:00Z",
        updated_at: "2024-12-19T08:00:00Z",
    },
    {
        id: 5,
        user_id: "user-1",
        title: "독서하기",
        description: "읽고 있는 책: '클린 코드' 3장까지 읽기",
        due_date: "2024-12-23T20:00:00Z",
        priority: "low",
        category_id: 5,
        category: mockCategories[4],
        is_completed: false,
        created_at: "2024-12-20T14:00:00Z",
        updated_at: "2024-12-20T14:00:00Z",
    },
    {
        id: 6,
        user_id: "user-1",
        title: "팀 회의 준비",
        description: "내일 오전 10시 팀 회의 자료 준비 및 발표 연습",
        due_date: "2024-12-21T10:00:00Z",
        priority: "high",
        category_id: 1,
        category: mockCategories[0],
        is_completed: false,
        created_at: "2024-12-20T16:00:00Z",
        updated_at: "2024-12-20T16:00:00Z",
    },
];

// Mock 사용자 데이터
export const mockUser = {
    id: "user-1",
    email: "user@example.com",
    display_name: "홍길동",
    avatar_url: null,
    created_at: "2024-12-01T00:00:00Z",
};
