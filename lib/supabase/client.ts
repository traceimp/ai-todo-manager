/**
 * 클라이언트 컴포넌트용 Supabase 클라이언트입니다.
 * Next.js App Router의 클라이언트 사이드에서 사용됩니다.
 */

import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
    createBrowserClient(
        process.env.NEXT_PUBLIC_SUPAASE_URL!,
        process.env.NEXT_PUBLIC_SUPAASE_PUBLISHABLE_KEY!
    )
