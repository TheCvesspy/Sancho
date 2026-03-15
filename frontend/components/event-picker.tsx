"use client";

import { useState } from "react";
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
                                                setActiveEvent(
                                                    event.id === activeEventId ? null : event.id
                                                );
                                                setOpen(false);
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
