import { cookies } from "next/headers"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ActiveEventProvider } from "@/components/active-event-context"
import { createClient } from "@/utils/supabase/server"
import { ACTIVE_EVENT_COOKIE_NAME } from "@/utils/active-event-cookie"
import { Toaster } from "sonner"
import { ThemeInitializer } from "@/components/theme-initializer"

import { API_BASE_URL } from "@/lib/api-config"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    let isSystemAdmin = false;
    let userTheme = "system";
    if (session) {
        const headers = { "Authorization": `Bearer ${session.access_token}` }
        const userResponse = await fetch(`${API_BASE_URL}/api/user/me`, { headers, next: { revalidate: 60 } })
        if (userResponse.ok) {
            const profileData = await userResponse.json()
            isSystemAdmin = profileData?.isSystemAdmin || false;
            userTheme = profileData?.theme || "system";
        }
    }

    const cookieStore = await cookies()
    const activeEventId = cookieStore.get(ACTIVE_EVENT_COOKIE_NAME)?.value ?? null

    return (
        <SidebarProvider>
            <ThemeInitializer theme={userTheme} />
            <ActiveEventProvider initialEventId={activeEventId}>
                <AppSidebar isSystemAdmin={isSystemAdmin} />
                <SidebarInset>
                    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                        <SidebarTrigger />
                    </header>
                    <div className="min-w-0 flex-1 overflow-auto">
                        {children}
                    </div>
                </SidebarInset>
                <Toaster position="top-right" closeButton richColors />
            </ActiveEventProvider>
        </SidebarProvider>
    )
}
