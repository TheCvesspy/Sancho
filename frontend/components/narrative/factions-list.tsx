"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Search, Eye, Trash2, RotateCcw } from "lucide-react";
import { NarrativeFactionDto, narrativeApi } from "@/utils/narrative-api";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { CreateFactionDialog } from "./create-faction-dialog";

interface FactionsListProps {
    eventId: string;
    initialFactions: NarrativeFactionDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function FactionsList({ eventId, initialFactions, isOrgOrSysAdmin, token }: FactionsListProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [factions, setFactions] = useState<NarrativeFactionDto[]>(initialFactions);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showDeleted, setShowDeleted] = useState(false);

    // Placeholder actions
    const handleDelete = async (factionId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteFaction(token, eventId, factionId, "User requested deletion");
            setFactions(prev => prev.map(f => f.id === factionId ? { ...f, deletedAt: new Date().toISOString() } : f));
        } catch (error) {
            console.error(error);
        }
    };

    const handleRestore = async (factionId: string) => {
        try {
            await narrativeApi.undeleteFaction(token, eventId, factionId);
            setFactions(prev => prev.map(f => f.id === factionId ? { ...f, deletedAt: null } : f));
        } catch (error) {
            console.error(error);
        }
    };

    const filteredFactions = factions.filter(faction => {
        if (!showDeleted && faction.deletedAt) return false;
        if (statusFilter !== "all" && faction.status !== statusFilter) return false;
        if (searchQuery && !faction.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end">
                <div className="flex flex-1 gap-4 w-full sm:w-auto">
                    <div className="space-y-1 flex-1 sm:max-w-[300px]">
                        <Label htmlFor="search-factions">{t("common.search")}</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="search-factions"
                                placeholder={t("factions.list.searchPlaceholder")}
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                {isOrgOrSysAdmin && (
                    <div className="shrink-0 w-full sm:w-auto">
                        <CreateFactionDialog eventId={eventId} token={token} onCreated={(f) => setFactions(prev => [f, ...prev])} />
                    </div>
                )}
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("factions.list.columns.name")}</TableHead>
                            <TableHead>{t("factions.list.columns.status")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("factions.list.columns.createdAt")}</TableHead>
                            <TableHead className="text-right">{t("common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredFactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    {t("common.noResults")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredFactions.map((faction) => (
                                <TableRow key={faction.id} className={faction.deletedAt ? "opacity-50" : ""}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="hover:underline cursor-pointer"
                                                onClick={() => router.push(`/${locale}/narrative/${eventId}/factions/${faction.id}`)}
                                            >
                                                {faction.name}
                                            </span>
                                            {faction.deletedAt && <Badge variant="destructive">{t("common.deleted")}</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <NarrativeStatusBadge status={faction.status} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">
                                        {format(new Date(faction.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => router.push(`/${locale}/narrative/${eventId}/factions/${faction.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    {t("common.view")}
                                                </DropdownMenuItem>
                                                {isOrgOrSysAdmin && (
                                                    <>
                                                        {!faction.deletedAt ? (
                                                            <DropdownMenuItem onClick={() => handleDelete(faction.id)} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                {t("common.delete")}
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleRestore(faction.id)}>
                                                                <RotateCcw className="mr-2 h-4 w-4" />
                                                                {t("common.restore")}
                                                            </DropdownMenuItem>
                                                        )}
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
