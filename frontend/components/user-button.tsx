"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { createClient } from "@/utils/supabase/client"
import { useParams } from "next/navigation"
import Link from "next/link"

import { API_BASE_URL } from "@/lib/api-config"

export function UserButton() {
    const { locale } = useParams()
    const [userData, setUserData] = useState<{ displayName?: string, avatarUrl?: string, fullName?: string } | null>(null)
    useEffect(() => {
        async function fetchUser() {
            const supabase = createClient()
            // Get both session and user to have fallback metadata
            const { data: { session } } = await supabase.auth.getSession()
            const { data: { user } } = await supabase.auth.getUser()

            if (!session) return

            try {
                const response = await fetch(`${API_BASE_URL}/api/user/me`, {
                    headers: {
                        "Authorization": `Bearer ${session.access_token}`
                    }
                })
                if (response.ok) {
                    setUserData(await response.json())
                } else if (user) {
                    // Fallback to Supabase user metadata if API fails
                    setUserData({
                        displayName: user.user_metadata?.full_name || user.user_metadata?.name || '',
                        avatarUrl: user.user_metadata?.avatar_url || ''
                    })
                }
            } catch (error) {
                console.error("Failed to fetch user for sidebar:", error)
                if (user) {
                    // Fallback to Supabase user metadata if API throws
                    setUserData({
                        displayName: user.user_metadata?.full_name || user.user_metadata?.name || '',
                        avatarUrl: user.user_metadata?.avatar_url || ''
                    })
                }
            }
        }

        fetchUser()
    }, [])

    const displayName = userData?.displayName || userData?.fullName || "User"
    const initials = displayName.substring(0, 2).toUpperCase()

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild className="p-1">
                    <Link href={`/${locale}/profile`} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={userData?.avatarUrl} alt={displayName} />
                            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col truncate">
                            <span className="text-sm font-semibold truncate leading-none mb-1">
                                {displayName}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate leading-none">
                                View Profile
                            </span>
                        </div>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
