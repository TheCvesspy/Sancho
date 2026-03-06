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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Search, Eye, Trash2, RotateCcw } from "lucide-react";
import { NarrativePlotDto, narrativeApi } from "@/utils/narrative-api";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { CreatePlotDialog } from "./create-plot-dialog";

interface PlotsListProps {
    eventId: string;
    initialPlots: NarrativePlotDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function PlotsList({ eventId, initialPlots, isOrgOrSysAdmin, token }: PlotsListProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [plots, setPlots] = useState<NarrativePlotDto[]>(initialPlots);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showDeleted, setShowDeleted] = useState(false);

    const handleDelete = async (plotId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deletePlot(token, eventId, plotId, "User requested deletion");
            setPlots(prev => prev.map(f => f.id === plotId ? { ...f, deletedAt: new Date().toISOString() } : f));
        } catch (error) {
            console.error(error);
        }
    };

    const handleRestore = async (plotId: string) => {
        try {
            await narrativeApi.undeletePlot(token, eventId, plotId);
            setPlots(prev => prev.map(f => f.id === plotId ? { ...f, deletedAt: null } : f));
        } catch (error) {
            console.error(error);
        }
    };

    const filteredPlots = plots.filter(plot => {
        if (!showDeleted && plot.deletedAt) return false;
        if (statusFilter !== "all" && plot.status !== statusFilter) return false;
        if (searchQuery && !plot.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center rounded-lg border bg-card p-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("plots.list.searchPlaceholder")}
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t("common.allStatuses")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.allStatuses")}</SelectItem>
                        <SelectItem value="draft">{t("status.draft")}</SelectItem>
                        <SelectItem value="ready">{t("status.ready")}</SelectItem>
                        <SelectItem value="locked">{t("status.locked")}</SelectItem>
                    </SelectContent>
                </Select>

                {isOrgOrSysAdmin && (
                    <div className="flex items-center space-x-2 px-2">
                        <Checkbox
                            id="show-deleted-plots"
                            checked={showDeleted}
                            onCheckedChange={(checked: boolean) => setShowDeleted(checked)}
                        />
                        <Label htmlFor="show-deleted-plots" className="text-sm font-medium leading-none cursor-pointer text-muted-foreground">
                            {t("common.showDeleted")}
                        </Label>
                    </div>
                )}

                <div className="ml-auto">
                    {isOrgOrSysAdmin && (
                        <CreatePlotDialog eventId={eventId} token={token} onCreated={(p) => setPlots(prev => [p, ...prev])} />
                    )}
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("plots.list.columns.title")}</TableHead>
                            <TableHead>{t("plots.list.columns.status")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("plots.list.columns.createdAt")}</TableHead>
                            <TableHead className="text-right">{t("common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPlots.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    {t("common.noResults")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPlots.map((plot) => (
                                <TableRow key={plot.id} className={plot.deletedAt ? "opacity-50" : ""}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="hover:underline cursor-pointer"
                                                onClick={() => router.push(`/${locale}/narrative/${eventId}/plots/${plot.id}`)}
                                            >
                                                {plot.title}
                                            </span>
                                            {plot.deletedAt && <Badge variant="destructive">{t("common.deleted")}</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <NarrativeStatusBadge status={plot.status} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">
                                        {format(new Date(plot.createdAt), "MMM d, yyyy")}
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
                                                <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => router.push(`/${locale}/narrative/${eventId}/plots/${plot.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    {t("common.view")}
                                                </DropdownMenuItem>
                                                {isOrgOrSysAdmin && (
                                                    <>
                                                        {!plot.deletedAt ? (
                                                            <DropdownMenuItem onClick={() => handleDelete(plot.id)} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                {t("common.delete")}
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleRestore(plot.id)}>
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
