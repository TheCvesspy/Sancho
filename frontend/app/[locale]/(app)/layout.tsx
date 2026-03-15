import { cookies } from "next/headers"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ActiveEventProvider } from "@/components/active-event-context"
import { createClient } from "@/utils/supabase/server"
import { ACTIVE_EVENT_COOKIE_NAME } from "@/utils/active-event-cookie"
import { Toaster } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    let isSystemAdmin = false;
    if (session) {
        const headers = { "Authorization": `Bearer ${session.access_token}` }
        const userResponse = await fetch(`${API_BASE_URL}/api/user/me`, { headers, next: { revalidate: 60 } })
        if (userResponse.ok) {
            const profileData = await userResponse.json()
            isSystemAdmin = profileData?.isSystemAdmin || false;
        }
    }

    const cookieStore = await cookies()
    const activeEventId = cookieStore.get(ACTIVE_EVENT_COOKIE_NAME)?.value ?? null

    return (
        <SidebarProvider>
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
