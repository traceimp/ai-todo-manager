/**
 * 메인 페이지입니다.
 * 할일 관리의 모든 기능을 통합하여 제공하는 대시보드입니다.
 */

"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Toolbar from "@/components/layout/Toolbar";
import { TodoForm, TodoList } from "@/components/todo";
import { AISummary } from "@/components/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, BarChart3, Calendar, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Todo, TodoFilters, TodoSort, CreateTodoData, UpdateTodoData, Category } from "@/lib/types";
import { useAuth } from "@/components/providers";
import { getTodos, createTodo, updateTodo, deleteTodo, toggleTodoComplete, getCategories } from "@/lib/api";

const MainPage = () => {
  const { user, signOut } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<TodoFilters>({});
  const [sort, setSort] = useState<TodoSort>({ key: "created_at", direction: "desc" });
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 데이터 로딩 함수
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [todosData, categoriesData] = await Promise.all([
        getTodos(filters, sort),
        getCategories()
      ]);

      setTodos(todosData);
      setCategories(categoriesData);
    } catch (err) {
      console.error("데이터 로딩 오류:", err);
      setError(err instanceof Error ? err.message : "데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 데이터 로딩
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filters, sort]);

  // 할일 통계 계산
  const todoStats = {
    total: todos.length,
    completed: todos.filter(todo => todo.is_completed).length,
    pending: todos.filter(todo => !todo.is_completed).length,
    overdue: todos.filter(todo =>
      !todo.is_completed && todo.due_date && new Date(todo.due_date) < new Date()
    ).length,
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    await signOut();
  };

  // 할일 추가 처리
  const handleCreateTodo = async (data: CreateTodoData) => {
    try {
      const newTodo = await createTodo(data);
      setTodos(prev => [newTodo, ...prev]);
      setShowTodoForm(false);
      setError(null);
    } catch (error) {
      console.error("할일 생성 오류:", error);
      setError(error instanceof Error ? error.message : "할일을 추가하는데 실패했습니다.");
    }
  };

  // 할일 수정 처리
  const handleUpdateTodo = async (data: UpdateTodoData) => {
    try {
      if (!editingTodo) return;

      const updatedTodo = await updateTodo(editingTodo.id, data);
      setTodos(prev => prev.map(todo =>
        todo.id === editingTodo.id ? updatedTodo : todo
      ));
      setEditingTodo(null);
      setShowTodoForm(false);
      setError(null);
    } catch (error) {
      console.error("할일 수정 오류:", error);
      setError(error instanceof Error ? error.message : "할일을 수정하는데 실패했습니다.");
    }
  };

  // 할일 완료 토글 처리
  const handleToggleComplete = async (id: number, isCompleted: boolean) => {
    try {
      const updatedTodo = await toggleTodoComplete(id, isCompleted);
      setTodos(prev => prev.map(todo =>
        todo.id === id ? updatedTodo : todo
      ));
      setError(null);
    } catch (error) {
      console.error("할일 완료 토글 오류:", error);
      setError(error instanceof Error ? error.message : "할일 상태를 변경하는데 실패했습니다.");
    }
  };

  // 할일 삭제 처리
  const handleDeleteTodo = async (id: number) => {
    try {
      if (confirm("정말로 이 할일을 삭제하시겠습니까?")) {
        await deleteTodo(id);
        setTodos(prev => prev.filter(todo => todo.id !== id));
        setError(null);
      }
    } catch (error) {
      console.error("할일 삭제 오류:", error);
      setError(error instanceof Error ? error.message : "할일을 삭제하는데 실패했습니다.");
    }
  };

  // 할일 편집 시작
  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setShowTodoForm(true);
  };

  // 폼 닫기
  const handleCloseForm = () => {
    setShowTodoForm(false);
    setEditingTodo(null);
  };

  // 검색 처리
  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
  };

  // 필터 처리
  const handleFilterChange = (newFilters: TodoFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // 정렬 처리
  const handleSortChange = (newSort: TodoSort) => {
    setSort(newSort);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <Header onLogout={handleLogout} />

      {/* 툴바 */}
      <Toolbar
        filters={filters}
        sort={sort}
        onFiltersChange={setFilters}
        onSortChange={setSort}
        todoCount={todos.length}
      />

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 오류 메시지 */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* 로딩 상태 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">할일을 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 좌측: 할일 추가 폼 및 통계 */}
            <div className="lg:col-span-1 space-y-6">
              {/* 할일 추가 버튼 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5 text-blue-500" />
                    AI 할일 관리 서비스
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowTodoForm(true)}
                    className="w-full bg-brand-gradient text-white hover:opacity-90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    새 할일 추가
                  </Button>
                </CardContent>
              </Card>

              {/* 할일 통계 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    통계
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {todoStats.total}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        전체
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {todoStats.completed}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        완료
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {todoStats.pending}
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        진행중
                      </div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {todoStats.overdue}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        지연
                      </div>
                    </div>
                  </div>

                  {/* 완료율 */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span>완료율</span>
                      <span>{Math.round((todoStats.completed / todoStats.total) * 100) || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(todoStats.completed / todoStats.total) * 100 || 0}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 빠른 액션 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-purple-500" />
                    빠른 액션
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setFilters({ is_completed: false })}
                  >
                    진행중인 할일만 보기
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setFilters({ is_overdue: true })}
                  >
                    지연된 할일만 보기
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setFilters({ priority: "high" })}
                  >
                    높은 우선순위만 보기
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 우측: 할일 목록 */}
            <div className="lg:col-span-3 space-y-6">
              {/* AI 요약 섹션 - 가로 배치 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AISummary
                  period="today"
                  title="오늘의 요약"
                />
                <AISummary
                  period="week"
                  title="이번주 요약"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-indigo-500" />
                      할일 목록
                    </span>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        전체 {todoStats.total}개
                      </Badge>
                      <Badge variant="secondary">
                        완료 {todoStats.completed}개
                      </Badge>
                      {todoStats.overdue > 0 && (
                        <Badge variant="destructive">
                          지연 {todoStats.overdue}개
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TodoList
                    todos={todos}
                    filters={filters}
                    sort={sort}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEditTodo}
                    onDelete={handleDeleteTodo}
                    onSearch={handleSearch}
                    onFiltersChange={handleFilterChange}
                    onSortChange={handleSortChange}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* 할일 추가/편집 폼 모달 */}
      {showTodoForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <TodoForm
              todo={editingTodo || undefined}
              categories={categories}
              onSubmit={editingTodo ? handleUpdateTodo : handleCreateTodo}
              onCancel={handleCloseForm}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;