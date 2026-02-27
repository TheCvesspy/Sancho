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

const items = [
    { title: "Identity & Access", url: "#", icon: Fingerprint },
    { title: "Event Management", url: "#", icon: Calendar },
    { title: "Characters", url: "#", icon: Users },
    { title: "Narrative", url: "#", icon: BookOpen },
    { title: "Logistics", url: "#", icon: Truck },
    { title: "NPC & Org Team", url: "#", icon: ShieldAlert },
    { title: "Finance", url: "#", icon: BadgeDollarSign },
    { title: "Communications", url: "#", icon: MessageSquare },
]

export function AppSidebar() {
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
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
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
