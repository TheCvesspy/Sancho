import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { cookies, headers } from "next/headers"

function getOrigin(request: Request): string {
    const headersList = new Headers(request.headers)
    const forwardedHost = headersList.get("x-forwarded-host")
    const forwardedProto = headersList.get("x-forwarded-proto") || "https"
    if (forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`
    }
    const host = headersList.get("host")
    if (host) {
        return `${forwardedProto}://${host}`
    }
    return new URL(request.url).origin
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")

    if (code) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        )
        await supabase.auth.exchangeCodeForSession(code)
    }

    // URL to redirect to after sign in process completes
    const origin = getOrigin(request)
    return NextResponse.redirect(`${origin}/`)
}
