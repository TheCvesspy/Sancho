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
    SidebarSeparator,
} from "@/components/ui/sidebar"
import { Calendar, Users, Fingerprint, BookOpen, Truck, ShieldAlert, BadgeDollarSign, MessageSquare, type LucideIcon } from "lucide-react"
import { UserButton } from "@/components/user-button"
import { EventPicker } from "@/components/event-picker"
import { useActiveEvent } from "@/components/active-event-context"
import { useLocale, useTranslations } from "next-intl"

type NavItem = {
    titleKey: string;
    url: string;
    icon: LucideIcon;
    requiresSystemAdmin?: boolean;
    eventScoped?: boolean;
};

const items: NavItem[] = [
    { titleKey: "sidebar.identity", url: "/identity", icon: Fingerprint, requiresSystemAdmin: true },
    { titleKey: "sidebar.events", url: "/events", icon: Calendar },
    { titleKey: "sidebar.characters", url: "/characters", icon: Users, eventScoped: true },
    { titleKey: "sidebar.narrative", url: "/narrative", icon: BookOpen, eventScoped: true },
    { titleKey: "sidebar.logistics", url: "#", icon: Truck, eventScoped: true },
    { titleKey: "sidebar.npcOrg", url: "#", icon: ShieldAlert, eventScoped: true },
    { titleKey: "sidebar.finance", url: "#", icon: BadgeDollarSign, eventScoped: true },
    { titleKey: "sidebar.communications", url: "#", icon: MessageSquare, eventScoped: true },
]

export function AppSidebar({ isSystemAdmin = false }: { isSystemAdmin?: boolean }) {
    const locale = useLocale();
    const t = useTranslations("common");
    const { activeEventId } = useActiveEvent();

    const visibleItems = items.filter(i => !i.requiresSystemAdmin || isSystemAdmin);

    const buildUrl = (item: NavItem) => {
        if (item.url === "#") return "#";
        const base = `/${locale}${item.url}`;
        return item.eventScoped && activeEventId ? `${base}/${activeEventId}` : base;
    };

    return (
        <Sidebar>
            <SidebarHeader className="p-4 pt-6 pb-2">
                <h2 className="text-xl font-bold tracking-tight">Sancho</h2>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>{t("sidebar.modules")}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {visibleItems.map((item) => (
                                <SidebarMenuItem key={item.titleKey}>
                                    <SidebarMenuButton asChild>
                                        <a href={buildUrl(item)}>
                                            <item.icon />
                                            <span>{t(item.titleKey)}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t">
                <EventPicker />
                <SidebarSeparator className="my-1" />
                <UserButton />
            </SidebarFooter>
        </Sidebar>
    )
}
