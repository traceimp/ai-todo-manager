'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Brain, TrendingUp, Target, Lightbulb, CheckCircle2, AlertTriangle, Calendar, BarChart3, Clock, Zap } from 'lucide-react';

interface AISummaryData {
    summary: string;
    urgentTasks: string[];
    insights: string[];
    recommendations: string[];
}

interface AISummaryProps {
    period: 'today' | 'week';
    title: string;
}

/**
 * AI 요약 및 분석 컴포넌트
 * 사용자의 할일 목록을 분석하여 인사이트와 추천사항을 제공합니다.
 */
export default function AISummary({ period, title }: AISummaryProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [summaryData, setSummaryData] = useState<AISummaryData | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * AI 요약 데이터를 가져오는 함수
     */
    const handleAISummary = async () => {
        setIsLoading(true);
        setError(null);
        setSummaryData(null);

        try {
            const response = await fetch('/api/ai-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    period
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error || 'AI 요약 중 오류가 발생했습니다.';

                // HTTP 상태 코드에 따른 구체적인 에러 메시지
                if (response.status === 400) {
                    throw new Error(`입력 오류: ${errorMessage}`);
                } else if (response.status === 429) {
                    throw new Error('AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.');
                } else if (response.status === 503) {
                    throw new Error('AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
                } else if (response.status === 408) {
                    throw new Error('AI 처리 시간이 초과되었습니다. 다시 시도해주세요.');
                } else {
                    throw new Error(errorMessage);
                }
            }

            const result = await response.json();

            if (result.success && result.data) {
                setSummaryData(result.data);
            } else {
                throw new Error('AI 요약 데이터를 가져오는데 실패했습니다.');
            }

        } catch (error) {
            console.error('AI 요약 오류:', error);
            setError(error instanceof Error ? error.message : 'AI 요약 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 완료율 추출 함수
    const extractCompletionRate = (summary: string) => {
        const match = summary.match(/(\d+(?:\.\d+)?)%/);
        return match ? parseFloat(match[1]) : 0;
    };

    const completionRate = summaryData ? extractCompletionRate(summaryData.summary) : 0;

    return (
        <Card className="w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    {period === 'today' ? (
                        <Calendar className="h-5 w-5 text-blue-600" />
                    ) : (
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                    )}
                    {title}
                </CardTitle>
                <Button
                    onClick={handleAISummary}
                    disabled={isLoading}
                    size="sm"
                    className={`${period === 'today' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            분석 중...
                        </>
                    ) : (
                        <>
                            <Brain className="h-4 w-4 mr-2" />
                            AI 요약 보기
                        </>
                    )}
                </Button>
            </CardHeader>

            <CardContent className="space-y-4">
                {error && (
                    <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700">
                            {error}
                        </AlertDescription>
                        <Button
                            onClick={handleAISummary}
                            size="sm"
                            variant="outline"
                            className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                        >
                            재시도
                        </Button>
                    </Alert>
                )}

                {summaryData && (
                    <div className="space-y-4">
                        {/* 완료율 시각화 */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <span className="font-medium text-gray-900">완료율</span>
                                </div>
                                <span className="text-2xl font-bold text-gray-900">{completionRate}%</span>
                            </div>
                            <Progress value={completionRate} className="h-2" />
                            <p className="text-sm text-gray-600 mt-2">{summaryData.summary}</p>
                        </div>

                        {/* 긴급한 할일 */}
                        {summaryData.urgentTasks.length > 0 && (
                            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                                    <h4 className="font-medium text-orange-900">⚠️ 긴급한 할일</h4>
                                </div>
                                <div className="space-y-2">
                                    {summaryData.urgentTasks.map((task, index) => (
                                        <div key={index} className="flex items-center gap-3 p-2 bg-white rounded-md border border-orange-100">
                                            <Badge variant="destructive" className="text-xs">
                                                긴급
                                            </Badge>
                                            <span className="text-orange-900 text-sm font-medium">{task}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 인사이트 */}
                        {summaryData.insights.length > 0 && (
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                    <h4 className="font-medium text-green-900">💡 인사이트</h4>
                                </div>
                                <div className="space-y-2">
                                    {summaryData.insights.map((insight, index) => (
                                        <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-md border border-green-100">
                                            <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                                <span className="text-green-600 text-xs font-bold">{index + 1}</span>
                                            </div>
                                            <p className="text-green-800 text-sm">{insight}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 추천사항 */}
                        {summaryData.recommendations.length > 0 && (
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb className="h-5 w-5 text-purple-600" />
                                    <h4 className="font-medium text-purple-900">🎯 추천사항</h4>
                                </div>
                                <div className="space-y-2">
                                    {summaryData.recommendations.map((recommendation, index) => (
                                        <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-md border border-purple-100">
                                            <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                                <Zap className="h-3 w-3 text-purple-600" />
                                            </div>
                                            <p className="text-purple-800 text-sm font-medium">{recommendation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 기간별 특별 섹션 */}
                        {period === 'today' && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-5 w-5 text-blue-600" />
                                    <h4 className="font-medium text-blue-900">⏰ 오늘의 집중 포인트</h4>
                                </div>
                                <p className="text-blue-800 text-sm">
                                    남은 시간을 효율적으로 활용하여 중요한 할일부터 우선 처리하세요.
                                </p>
                            </div>
                        )}

                        {period === 'week' && (
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="h-5 w-5 text-purple-600" />
                                    <h4 className="font-medium text-purple-900">📊 주간 트렌드</h4>
                                </div>
                                <p className="text-purple-800 text-sm">
                                    이번주 패턴을 바탕으로 다음주 계획을 세워보세요.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {!summaryData && !error && !isLoading && (
                    <div className="text-center py-8">
                        <div className="mb-4">
                            {period === 'today' ? (
                                <Calendar className="h-12 w-12 text-blue-400 mx-auto" />
                            ) : (
                                <BarChart3 className="h-12 w-12 text-purple-400 mx-auto" />
                            )}
                        </div>
                        <p className="text-gray-500 text-sm mb-2">
                            {period === 'today' ? '오늘의 할일을' : '이번주의 할일을'} 분석해보세요
                        </p>
                        <p className="text-gray-400 text-xs">
                            AI가 당신의 생산성 패턴을 분석하고 개선 방안을 제시합니다
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
