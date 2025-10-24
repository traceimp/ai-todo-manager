/**
 * 인증 상태를 관리하는 Provider 컴포넌트입니다.
 * Supabase Auth 상태를 전역적으로 관리하고 라우트 보호를 제공합니다.
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    // 보호된 라우트 목록
    const protectedRoutes = ["/"];
    const authRoutes = ["/login", "/signup"];

    useEffect(() => {
        // 초기 사용자 상태 확인
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
            } catch (error) {
                console.error("사용자 인증 확인 오류:", error);
            } finally {
                setLoading(false);
            }
        };

        checkUser();

        // 인증 상태 변화 감지
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);

                // 인증 상태에 따른 라우팅 처리
                if (event === 'SIGNED_OUT') {
                    if (protectedRoutes.includes(pathname)) {
                        router.push("/login");
                    }
                } else if (event === 'SIGNED_IN' && session?.user) {
                    if (authRoutes.includes(pathname)) {
                        router.push("/");
                    }
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [router, pathname, supabase.auth]);

    // 로그아웃 함수
    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("로그아웃 오류:", error);
            }
            setUser(null);
            router.push("/login");
        } catch (error) {
            console.error("로그아웃 중 오류:", error);
        }
    };

    // 라우트 보호 로직
    useEffect(() => {
        if (!loading) {
            // 보호된 라우트에 접근 시 로그인 확인
            if (protectedRoutes.includes(pathname) && !user) {
                router.push("/login");
                return;
            }

            // 인증 라우트에 접근 시 로그인된 사용자 리다이렉트
            if (authRoutes.includes(pathname) && user) {
                router.push("/");
                return;
            }
        }
    }, [user, loading, pathname, router]);

    // 로딩 중일 때 표시할 컴포넌트
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

// 인증 컨텍스트 훅
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
