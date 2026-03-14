import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export async function updateSession(request: NextRequest) {
    const isApiRoute = request.nextUrl.pathname.startsWith("/api");
    const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");
    const isPublicAsset = request.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/) || request.nextUrl.pathname.startsWith('/_next');

    let supabaseResponse = (isApiRoute || isAuthCallback || isPublicAsset)
        ? NextResponse.next({ request })
        : handleI18nRouting(request);

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

                    if (!(isApiRoute || isAuthCallback || isPublicAsset)) {
                        supabaseResponse = handleI18nRouting(request);
                    } else {
                        supabaseResponse = NextResponse.next({ request });
                    }

                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const isLoginPage = request.nextUrl.pathname.endsWith("/login");

    if (isPublicAsset) {
        return supabaseResponse;
    }

    if (!user && !isLoginPage && !isApiRoute && !isAuthCallback) {
        const url = request.nextUrl.clone();
        const segments = url.pathname.split('/').filter(Boolean);
        const locale = (segments.length > 0 && routing.locales.includes(segments[0] as any)) ? segments[0] : routing.defaultLocale;

        url.pathname = `/${locale}/login`;
        return NextResponse.redirect(url);
    }

    if (user && isLoginPage) {
        const url = request.nextUrl.clone();
        const segments = url.pathname.split('/').filter(Boolean);
        const locale = (segments.length > 0 && routing.locales.includes(segments[0] as any)) ? segments[0] : routing.defaultLocale;

        url.pathname = `/${locale}/`;
        return NextResponse.redirect(url);
    }

    // --- Profile Locale Redirection Logic ---
    if (user && !isApiRoute && !isAuthCallback) {
        const segments = request.nextUrl.pathname.split('/').filter(Boolean);
        const currentPathLocale = (segments.length > 0 && routing.locales.includes(segments[0] as any))
            ? segments[0]
            : routing.defaultLocale;

        const sanchoLocaleCookie = request.cookies.get('sancho_locale')?.value;

        // Only fetch from DB if cookie is missing or mismatch
        if (sanchoLocaleCookie !== currentPathLocale) {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('locale')
                .eq('id', user.id)
                .single();

            const userLocale = profile?.locale;

            if (userLocale && routing.locales.includes(userLocale as any)) {
                if (currentPathLocale !== userLocale) {
                    const url = request.nextUrl.clone();
                    const pathWithoutLocale = (segments.length > 0 && routing.locales.includes(segments[0] as any))
                        ? '/' + segments.slice(1).join('/')
                        : request.nextUrl.pathname;

                    // Redirect to the correct locale
                    url.pathname = `/${userLocale}${pathWithoutLocale}`;
                    const response = NextResponse.redirect(url);
                    response.cookies.set('sancho_locale', userLocale, { maxAge: 60 * 60 * 24 * 7, path: '/' });
                    return response;
                } else {
                    // Match! Update cookie so we don't check DB on next request
                    supabaseResponse.cookies.set('sancho_locale', userLocale, { maxAge: 60 * 60 * 24 * 7, path: '/' });
                }
            }
        }
    }

    return supabaseResponse;
}
