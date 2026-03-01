"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { EventDetailDto, eventsApi } from "@/utils/events-api";
import { Check, ChevronsUpDown, ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";

interface EventSelectorHeaderProps {
    currentEvent: EventDetailDto;
    token: string;
}

export function EventSelectorHeader({ currentEvent, token }: EventSelectorHeaderProps) {
    const t = useTranslations("characters");
    const locale = useLocale();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        if (open && events.length === 0) {
            eventsApi.listEvents(token, { includeArchived: true })
                .then(setEvents)
                .catch(console.error);
        }
    }, [open, token, events.length]);

    const handleSelect = (eventId: string) => {
        setOpen(false);
        if (eventId !== currentEvent.id) {
            router.push(`/${locale}/characters/${eventId}`);
        }
    };

    return (
        <div className="flex items-center gap-4 mb-6 pb-6 border-b">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
                <Link href={`/${locale}/characters`}>
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            </Button>

            <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">Event Context</p>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-[300px] justify-between font-semibold"
                        >
                            {currentEvent.name}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder={t("fields.placeholders.searchEvent")} />
                            <CommandList>
                                <CommandEmpty>No event found.</CommandEmpty>
                                <CommandGroup>
                                    {events.map((event) => (
                                        <CommandItem
                                            key={event.id}
                                            value={event.id}
                                            onSelect={handleSelect}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    currentEvent.id === event.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {event.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
