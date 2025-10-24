/**
 * 메인 페이지의 상단 헤더 컴포넌트입니다.
 * 서비스 로고, 사용자 정보, 로그아웃 버튼을 포함합니다.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sparkles, LogOut, User, Settings } from "lucide-react";
import { useAuth } from "@/components/providers";

interface HeaderProps {
    onLogout: () => void;
}

const Header = ({ onLogout }: HeaderProps) => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { user } = useAuth();

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await onLogout();
        } finally {
            setIsLoggingOut(false);
        }
    };

    // 사용자 이름의 첫 글자 추출
    const getUserInitials = (name: string) => {
        return name.split(' ').map(word => word[0]).join('').toUpperCase();
    };

    // 사용자 표시 이름 가져오기
    const getUserDisplayName = () => {
        if (user?.user_metadata?.display_name) {
            return user.user_metadata.display_name;
        }
        return user?.email?.split('@')[0] || '사용자';
    };

    return (
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* 로고 및 서비스명 */}
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-brand-gradient rounded-lg shadow-sm">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                AI 할일 관리자
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                빠르게 기록하고, 똑똑하게 정리되는
                            </p>
                        </div>
                    </div>

                    {/* 사용자 메뉴 */}
                    <div className="flex items-center space-x-4">
                        {/* 사용자 정보 */}
                        <div className="hidden sm:flex items-center space-x-3">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {getUserDisplayName()}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {user?.email}
                                </p>
                            </div>
                        </div>

                        {/* 사용자 드롭다운 메뉴 */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user?.user_metadata?.avatar_url || undefined} alt={getUserDisplayName()} />
                                        <AvatarFallback className="bg-brand-gradient text-white text-sm font-medium">
                                            {getUserInitials(getUserDisplayName())}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {getUserDisplayName()}
                                        </p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>프로필</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>설정</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>{isLoggingOut ? "로그아웃 중..." : "로그아웃"}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
