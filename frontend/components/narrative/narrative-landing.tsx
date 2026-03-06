"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EventListItemDto } from "@/utils/events-api";
import { Check, ChevronsUpDown, BookOpen } from "lucide-react";

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
import { useLocale } from "next-intl";

interface NarrativeLandingProps {
    events: EventListItemDto[];
}

export function NarrativeLanding({ events }: NarrativeLandingProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState("");

    const handleSelect = (currentValue: string) => {
        setSelectedEventId(currentValue === selectedEventId ? "" : currentValue);
        setOpen(false);
        if (currentValue) {
            router.push(`/${locale}/narrative/${currentValue}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-md w-full">
            <div className="bg-primary/10 p-4 rounded-full">
                <BookOpen className="w-12 h-12 text-primary" />
            </div>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{t("subtitle")}</p>
                <p className="text-sm font-medium mt-4 text-foreground/80">
                    {t("noEventSelected")}
                </p>
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-12 text-base"
                    >
                        {selectedEventId
                            ? events.find((e) => e.id === selectedEventId)?.name
                            : t("landing.selectEvent")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                    <Command>
                        <CommandInput placeholder={t("landing.searchEvent")} />
                        <CommandList>
                            <CommandEmpty>{t("landing.noEventFound")}</CommandEmpty>
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
                                                selectedEventId === event.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{event.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(event.startAt).toLocaleDateString()} - {new Date(event.endAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
