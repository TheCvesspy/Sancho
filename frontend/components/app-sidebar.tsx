"use client"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Calendar, Users, Fingerprint, BookOpen, Truck, ShieldAlert, BadgeDollarSign, MessageSquare } from "lucide-react"
import { UserButton } from "@/components/user-button"
import { useLocale } from "next-intl"

const items = [
    { title: "Identity & Access", url: "/identity", icon: Fingerprint, requiresSystemAdmin: true },
    { title: "Event Management", url: "/events", icon: Calendar },
    { title: "Characters", url: "/characters", icon: Users },
    { title: "Narrative", url: "#", icon: BookOpen },
    { title: "Logistics", url: "#", icon: Truck },
    { title: "NPC & Org Team", url: "#", icon: ShieldAlert },
    { title: "Finance", url: "#", icon: BadgeDollarSign },
    { title: "Communications", url: "#", icon: MessageSquare },
]

export function AppSidebar({ isSystemAdmin = false }: { isSystemAdmin?: boolean }) {
    const locale = useLocale();

    const visibleItems = items.filter(i => !i.requiresSystemAdmin || (i.requiresSystemAdmin && isSystemAdmin));

    return (
        <Sidebar>
            <SidebarHeader className="p-4 pt-6 pb-2">
                <h2 className="text-xl font-bold tracking-tight">Sancho</h2>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Modules</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {visibleItems.map((item) => {
                                const url = item.url.startsWith("/") && item.url !== "/"
                                    ? `/${locale}${item.url}`
                                    : item.url;
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild>
                                            <a href={url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t">
                <UserButton />
            </SidebarFooter>
        </Sidebar>
    )
}
