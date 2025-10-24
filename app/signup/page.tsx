/**
 * 회원가입 페이지입니다.
 * 사용자가 이메일/비밀번호로 새 계정을 생성할 수 있으며, 로그인 페이지로 이동할 수 있습니다.
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
import { Sparkles, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// 회원가입 폼 스키마
const SignupSchema = z.object({
    displayName: z.string().min(2, "이름은 최소 2자 이상이어야 합니다"),
    email: z.string().email("유효한 이메일 주소를 입력해주세요"),
    password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof SignupSchema>;

const SignupPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const supabase = createClient();

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        watch,
    } = useForm<SignupFormData>({
        resolver: zodResolver(SignupSchema),
        defaultValues: {
            displayName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const password = watch("password");

    // 비밀번호 강도 검사
    const getPasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(password);

    // 회원가입 처리
    const onSubmit = async (data: SignupFormData) => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Supabase Auth 회원가입
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        display_name: data.displayName,
                    },
                },
            });

            if (authError) {
                // Supabase 오류 메시지를 사용자 친화적으로 변환
                let errorMessage = "회원가입 중 오류가 발생했습니다.";

                if (authError.message.includes("already registered")) {
                    errorMessage = "이미 등록된 이메일입니다.";
                } else if (authError.message.includes("Password")) {
                    errorMessage = "비밀번호가 너무 약합니다. 더 강력한 비밀번호를 사용해주세요.";
                } else if (authError.message.includes("Email")) {
                    errorMessage = "유효하지 않은 이메일 주소입니다.";
                } else {
                    errorMessage = authError.message;
                }

                throw new Error(errorMessage);
            }

            if (authData.user) {
                // 회원가입 성공
                if (authData.user.email_confirmed_at) {
                    // 이메일 확인이 필요 없는 경우 (즉시 로그인)
                    setSuccess("회원가입이 완료되었습니다! 메인 페이지로 이동합니다.");
                    // AuthProvider가 자동으로 메인 페이지로 리다이렉션
                } else {
                    // 이메일 확인이 필요한 경우
                    setSuccess("회원가입이 완료되었습니다! 이메일을 확인해주세요.");
                    setTimeout(() => {
                        window.location.href = "/login?message=이메일을 확인한 후 로그인해주세요.";
                    }, 3000);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "회원가입 중 오류가 발생했습니다.");
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
                            회원가입
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            새 계정을 만들어 할일 관리를 시작하세요
                        </p>
                    </div>
                </div>

                {/* 회원가입 폼 */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-center text-xl">회원가입</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* 오류 메시지 */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* 성공 메시지 */}
                        {success && (
                            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>{success}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {/* 이름 입력 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    이름
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        {...register("displayName")}
                                        type="text"
                                        placeholder="홍길동"
                                        className={cn(
                                            "pl-10",
                                            errors.displayName && "border-red-500 focus:border-red-500"
                                        )}
                                        disabled={isLoading || !!success}
                                    />
                                </div>
                                {errors.displayName && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.displayName.message}
                                    </p>
                                )}
                            </div>

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
                                        disabled={isLoading || !!success}
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
                                        disabled={isLoading || !!success}
                                    />
                                </div>

                                {/* 비밀번호 강도 표시 */}
                                {password && (
                                    <div className="space-y-1">
                                        <div className="flex gap-1">
                                            {Array.from({ length: 5 }).map((_, index) => (
                                                <div
                                                    key={index}
                                                    className={cn(
                                                        "h-1 flex-1 rounded-full",
                                                        index < passwordStrength
                                                            ? "bg-green-500"
                                                            : "bg-gray-200 dark:bg-gray-700"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {passwordStrength < 3 ? "비밀번호를 더 강화해주세요" : "좋은 비밀번호입니다"}
                                        </p>
                                    </div>
                                )}

                                {errors.password && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* 비밀번호 확인 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    비밀번호 확인
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        {...register("confirmPassword")}
                                        type="password"
                                        placeholder="비밀번호를 다시 입력하세요"
                                        className={cn(
                                            "pl-10",
                                            errors.confirmPassword && "border-red-500 focus:border-red-500"
                                        )}
                                        disabled={isLoading || !!success}
                                    />
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.confirmPassword.message}
                                    </p>
                                )}
                            </div>

                            {/* 회원가입 버튼 */}
                            <Button
                                type="submit"
                                className="w-full bg-brand-gradient text-white hover:opacity-90"
                                disabled={!isValid || isLoading || !!success}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        회원가입 중...
                                    </>
                                ) : success ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        회원가입 완료
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        회원가입
                                    </>
                                )}
                            </Button>
                        </form>

                        <Separator />

                        {/* 로그인 링크 */}
                        <div className="text-center space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                이미 계정이 있으신가요?
                            </p>
                            <Link href="/login">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    disabled={isLoading || !!success}
                                >
                                    로그인
                                </Button>
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
                                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                스마트 정리
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

export default SignupPage;
