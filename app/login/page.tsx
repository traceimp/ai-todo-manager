/**
 * 로그인 페이지입니다.
 * 사용자가 이메일/비밀번호로 로그인할 수 있으며, 회원가입 페이지로 이동할 수 있습니다.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Mail, Lock, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// 로그인 폼 스키마
const LoginSchema = z.object({
    email: z.string().email("유효한 이메일 주소를 입력해주세요"),
    password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
});

type LoginFormData = z.infer<typeof LoginSchema>;

const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm<LoginFormData>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    // 로그인 처리
    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            // Supabase Auth 로그인
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (authError) {
                // Supabase 오류 메시지를 사용자 친화적으로 변환
                let errorMessage = "로그인 중 오류가 발생했습니다.";

                if (authError.message.includes("Invalid login credentials")) {
                    errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
                } else if (authError.message.includes("Email not confirmed")) {
                    errorMessage = "이메일을 확인해주세요. 이메일 확인 링크를 클릭해주세요.";
                } else if (authError.message.includes("Too many requests")) {
                    errorMessage = "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.";
                } else {
                    errorMessage = authError.message;
                }

                throw new Error(errorMessage);
            }

            if (authData.user) {
                // 로그인 성공 시 AuthProvider가 자동으로 메인 페이지로 리다이렉션
                // 별도의 리다이렉션 코드 불필요
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                {/* 서비스 로고 및 소개 */}
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3">
                        <div className="p-3 bg-brand-gradient rounded-xl shadow-lg">
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                AI 할일 관리자
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                빠르게 기록하고, 똑똑하게 정리되는
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            로그인
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            계정에 로그인하여 할일을 관리하세요
                        </p>
                    </div>
                </div>

                {/* 로그인 폼 */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-center text-xl">로그인</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* 오류 메시지 */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {/* 이메일 입력 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    이메일
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        {...register("email")}
                                        type="email"
                                        placeholder="your@email.com"
                                        className={cn(
                                            "pl-10",
                                            errors.email && "border-red-500 focus:border-red-500"
                                        )}
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* 비밀번호 입력 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    비밀번호
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        {...register("password")}
                                        type="password"
                                        placeholder="비밀번호를 입력하세요"
                                        className={cn(
                                            "pl-10",
                                            errors.password && "border-red-500 focus:border-red-500"
                                        )}
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.password && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* 로그인 버튼 */}
                            <Button
                                type="submit"
                                className="w-full bg-brand-gradient text-white hover:opacity-90"
                                disabled={!isValid || isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        로그인 중...
                                    </>
                                ) : (
                                    <>
                                        로그인
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <Separator />

                        {/* 회원가입 링크 */}
                        <div className="text-center space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                아직 계정이 없으신가요?
                            </p>
                            <Link href="/signup">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    회원가입
                                </Button>
                            </Link>
                        </div>

                        {/* 비밀번호 찾기 */}
                        <div className="text-center">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                                비밀번호를 잊으셨나요?
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* 서비스 특징 소개 */}
                <div className="text-center space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-2">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                                <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                AI 자동 생성
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                                <ArrowRight className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                빠른 입력
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto">
                                <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                안전한 보관
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        AI가 도와주는 스마트한 할일 관리로 생산성을 높여보세요
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
