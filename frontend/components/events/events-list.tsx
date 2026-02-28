"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Search, Plus, Calendar, MapPin, Eye } from "lucide-react";
import { EventListItemDto } from "@/utils/events-api";
import { EventStatusBadge } from "./event-status-badge";
import { CreateEventDialog } from "./create-event-dialog";
import Link from "next/link";

interface EventsListProps {
    initialEvents: EventListItemDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function EventsList({ initialEvents, isOrgOrSysAdmin, token }: EventsListProps) {
    const t = useTranslations("events");
    const locale = useLocale();
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showDeleted, setShowDeleted] = useState(false);

    const filteredEvents = initialEvents.filter((ev) => {
        const matchesSearch = ev.name.toLowerCase().includes(search.toLowerCase()) ||
            (ev.location?.toLowerCase().includes(search.toLowerCase()) ?? false);

        let matchesStatus = true;
        if (statusFilter !== "all") {
            matchesStatus = ev.status === statusFilter;
        }

        const matchesDeleted = showDeleted ? true : !ev.deletedAt;

        return matchesSearch && matchesStatus && matchesDeleted;
    });

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    const navigateToDetail = (id: string) => {
        router.push(`/${locale}/events/${id}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>

                {isOrgOrSysAdmin && (
                    <CreateEventDialog token={token} />
                )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("table.searchPlaceholder")}
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t("table.statusFilterPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("table.statusFilter.all")}</SelectItem>
                        <SelectItem value="active">{t("table.statusFilter.active")}</SelectItem>
                        <SelectItem value="archived">{t("table.statusFilter.archived")}</SelectItem>
                        {isOrgOrSysAdmin && <SelectItem value="deleted">{t("table.statusFilter.deleted")}</SelectItem>}
                    </SelectContent>
                </Select>

                {isOrgOrSysAdmin && (
                    <div className="flex items-center space-x-2 border rounded-md px-3 py-2">
                        <Checkbox
                            id="show-deleted"
                            checked={showDeleted}
                            onCheckedChange={(checked: boolean) => setShowDeleted(checked)}
                        />
                        <Label htmlFor="show-deleted" className="text-sm font-medium leading-none cursor-pointer">
                            {t("table.showDeleted")}
                        </Label>
                    </div>
                )}
            </div>

            <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("table.columns.name")}</TableHead>
                            <TableHead>{t("table.columns.location")}</TableHead>
                            <TableHead>{t("table.columns.dates")}</TableHead>
                            <TableHead>{t("table.columns.status")}</TableHead>
                            <TableHead className="w-[80px]">{t("table.columns.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEvents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    {t("table.emptyState")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEvents.map((ev) => (
                                <TableRow
                                    key={ev.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                                    onClick={() => navigateToDetail(ev.id)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <span className="group-hover:text-primary transition-colors">{ev.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {ev.location ? (
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span>{ev.location}</span>
                                            </div>
                                        ) : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm whitespace-nowrap">
                                            {formatDate(ev.startAt)} — {formatDate(ev.endAt)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <EventStatusBadge status={ev.status} />
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t("table.columns.actions")}</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => navigateToDetail(ev.id)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    {t("actions.view")}
                                                </DropdownMenuItem>
                                                {isOrgOrSysAdmin && (
                                                    <>
                                                        <DropdownMenuItem className="text-amber-500">
                                                            {t("actions.archive")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive font-medium">
                                                            {t("actions.delete")}
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
