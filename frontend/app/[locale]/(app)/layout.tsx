import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { createClient } from "@/utils/supabase/server"
import { Toaster } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    let isSystemAdmin = false;
    if (session) {
        const headers = { "Authorization": `Bearer ${session.access_token}` }
        const userResponse = await fetch(`${API_BASE_URL}/api/user/me`, { headers, cache: "no-store" })
        if (userResponse.ok) {
            const profileData = await userResponse.json()
            isSystemAdmin = profileData?.isSystemAdmin || false;
        }
    }

    return (
        <SidebarProvider>
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
        </SidebarProvider>
    )
}
