"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calendar, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveEvent } from "@/components/active-event-context";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

export function EventPicker() {
    const t = useTranslations("common");
    const { activeEventId, activeEvent, events, setActiveEvent, isLoading } =
        useActiveEvent();
    const { state: sidebarState } = useSidebar();
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const isCollapsed = sidebarState === "collapsed";

    const formatDateRange = (startAt: string, endAt: string) => {
        const start = new Date(startAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
        const end = new Date(endAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        return `${start} – ${end}`;
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="w-full cursor-pointer"
                            tooltip={t("sidebar.eventPicker.label")}
                        >
                            <Calendar className="h-4 w-4 shrink-0" />
                            {!isCollapsed && (
                                <>
                                    <div className="flex flex-col truncate flex-1">
                                        <span className="text-xs text-muted-foreground leading-none mb-0.5">
                                            {t("sidebar.eventPicker.label")}
                                        </span>
                                        <span className="text-sm font-semibold truncate leading-none">
                                            {isLoading
                                                ? "..."
                                                : activeEvent?.name ??
                                                  t("sidebar.eventPicker.placeholder")}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                </>
                            )}
                        </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" side="top" align="start">
                        <Command>
                            <CommandInput
                                placeholder={t("sidebar.eventPicker.searchPlaceholder")}
                            />
                            <CommandList>
                                <CommandEmpty>
                                    {events.length === 0
                                        ? t("sidebar.eventPicker.noEvents")
                                        : t("sidebar.eventPicker.noResults")}
                                </CommandEmpty>
                                <CommandGroup>
                                    {events.map((event) => (
                                        <CommandItem
                                            key={event.id}
                                            value={`${event.name} ${event.id}`}
                                            onSelect={() => {
                                                const newEventId = event.id === activeEventId ? null : event.id;
                                                setActiveEvent(newEventId);
                                                setOpen(false);

                                                // Navigate so the server re-fetches data for the new event.
                                                // Locale prefix may be absent for the default locale (localePrefix: "as-needed").
                                                const modules = "characters|narrative|logistics|npcOrg|finance|communications";
                                                const modulePattern = new RegExp(`^((?:\\/[^/]+)?\\/(${modules}))`);
                                                const eventScopedMatch = pathname.match(
                                                    new RegExp(modulePattern.source + "(\\/[^/]+)(.*)")
                                                );

                                                if (eventScopedMatch) {
                                                    // On an event-scoped page — swap the eventId in URL
                                                    const basePath = eventScopedMatch[1];
                                                    const rest = eventScopedMatch[4];
                                                    if (newEventId) {
                                                        router.push(`${basePath}/${newEventId}${rest}`);
                                                    } else {
                                                        router.push(basePath);
                                                    }
                                                    router.refresh();
                                                } else if (pathname.match(modulePattern)) {
                                                    // On a module landing page (no eventId) — navigate to event-scoped URL
                                                    if (newEventId) {
                                                        router.push(`${pathname}/${newEventId}`);
                                                    } else {
                                                        router.refresh();
                                                    }
                                                }
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4 shrink-0",
                                                    activeEventId === event.id
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col truncate">
                                                <span className="text-sm truncate">
                                                    {event.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDateRange(event.startAt, event.endAt)}
                                                </span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
