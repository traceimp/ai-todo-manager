import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI 할 일 관리 서비스",
    template: "%s | AI 할 일 관리 서비스"
  },
  description: "AI가 도와주는 똑똑한 할 일 관리 서비스",
  keywords: [
    "AI",
    "할일관리",
    "일정관리",
    "생산성",
    "업무관리",
    "시간관리",
    "할일목록",
    "AI 어시스턴트",
    "스마트 할일관리",
    "개인비서"
  ],
  authors: [{ name: "AI 할일 관리 서비스" }],
  creator: "AI 할일 관리 서비스",
  publisher: "AI 할일 관리 서비스",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://ai-todo-manager.vercel.app"), // 실제 배포 URL로 변경 필요
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://ai-todo-manager.vercel.app", // 실제 배포 URL로 변경 필요
    title: "AI 할 일 관리 서비스",
    description: "AI가 도와주는 똑똑한 할 일 관리 서비스",
    siteName: "AI 할 일 관리 서비스",
    images: [
      {
        url: "/og-image", // Open Graph 이미지 경로 (동적 생성)
        width: 1200,
        height: 630,
        alt: "AI 할 일 관리 서비스",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 할 일 관리 서비스",
    description: "AI가 도와주는 똑똑한 할 일 관리 서비스",
    images: ["/twitter-image"], // Twitter 이미지 경로 (동적 생성)
    creator: "@ai_todo_manager", // 실제 Twitter 계정으로 변경 필요
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code", // 실제 Google Search Console 인증 코드로 변경 필요
  },
  category: "productivity",
  classification: "Productivity Application",
  referrer: "origin-when-cross-origin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
