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
import { NarrativePlotlineDto, narrativeApi } from "@/utils/narrative-api";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { CreatePlotlineDialog } from "./create-plotline-dialog";

interface PlotlinesListProps {
    eventId: string;
    initialPlotlines: NarrativePlotlineDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function PlotlinesList({ eventId, initialPlotlines, isOrgOrSysAdmin, token }: PlotlinesListProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [plotlines, setPlotlines] = useState<NarrativePlotlineDto[]>(initialPlotlines);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showDeleted, setShowDeleted] = useState(false);

    const handleDelete = async (plotlineId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deletePlotline(token, eventId, plotlineId, "User requested deletion");
            setPlotlines(prev => prev.map(f => f.id === plotlineId ? { ...f, deletedAt: new Date().toISOString() } : f));
        } catch (error) {
            console.error(error);
        }
    };

    const handleRestore = async (plotlineId: string) => {
        try {
            await narrativeApi.undeletePlotline(token, eventId, plotlineId);
            setPlotlines(prev => prev.map(f => f.id === plotlineId ? { ...f, deletedAt: null } : f));
        } catch (error) {
            console.error(error);
        }
    };

    const filteredPlotlines = plotlines.filter(plotline => {
        if (!showDeleted && plotline.deletedAt) return false;
        if (statusFilter !== "all" && plotline.status !== statusFilter) return false;
        if (searchQuery && !plotline.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end">
                <div className="flex flex-1 gap-4 w-full sm:w-auto">
                    <div className="space-y-1 flex-1 sm:max-w-[300px]">
                        <Label htmlFor="search-plotlines">{t("common.search")}</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="search-plotlines"
                                placeholder={t("plotlines.list.searchPlaceholder")}
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                {isOrgOrSysAdmin && (
                    <div className="shrink-0 w-full sm:w-auto">
                        <CreatePlotlineDialog eventId={eventId} token={token} onCreated={(p) => setPlotlines(prev => [p, ...prev])} />
                    </div>
                )}
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("plotlines.list.columns.title")}</TableHead>
                            <TableHead>{t("plotlines.list.columns.status")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("plotlines.list.columns.createdAt")}</TableHead>
                            <TableHead className="text-right">{t("common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPlotlines.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    {t("common.noResults")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPlotlines.map((plotline) => (
                                <TableRow key={plotline.id} className={plotline.deletedAt ? "opacity-50" : ""}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="hover:underline cursor-pointer"
                                                onClick={() => router.push(`/${locale}/narrative/${eventId}/plotlines/${plotline.id}`)}
                                            >
                                                {plotline.title}
                                            </span>
                                            {plotline.deletedAt && <Badge variant="destructive">{t("common.deleted")}</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <NarrativeStatusBadge status={plotline.status} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">
                                        {format(new Date(plotline.createdAt), "MMM d, yyyy")}
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
                                                <DropdownMenuItem onClick={() => router.push(`/${locale}/narrative/${eventId}/plotlines/${plotline.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    {t("common.view")}
                                                </DropdownMenuItem>
                                                {isOrgOrSysAdmin && (
                                                    <>
                                                        {!plotline.deletedAt ? (
                                                            <DropdownMenuItem onClick={() => handleDelete(plotline.id)} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                {t("common.delete")}
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleRestore(plotline.id)}>
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
