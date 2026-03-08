"use client";

import { useState, useMemo } from "react";
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
import { MoreHorizontal, Search, Eye, Trash2, RotateCcw } from "lucide-react";
import { NarrativeQuestDto, narrativeApi } from "@/utils/narrative-api";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { CreateQuestDialog } from "./create-quest-dialog";

interface QuestsListProps {
    eventId: string;
    initialQuests: NarrativeQuestDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function QuestsList({ eventId, initialQuests, isOrgOrSysAdmin, token }: QuestsListProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [quests, setQuests] = useState<NarrativeQuestDto[]>(initialQuests);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showDeleted, setShowDeleted] = useState(false);

    const filteredQuests = useMemo(() => quests.filter((q) => {
        const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase());

        let matchesStatus = true;
        if (statusFilter !== "all") {
            matchesStatus = q.status.toLowerCase() === statusFilter;
        }

        const matchesDeleted = showDeleted ? true : !q.deletedAt;

        return matchesSearch && matchesStatus && matchesDeleted;
    }), [quests, search, statusFilter, showDeleted]);

    const navigateToDetail = (id: string) => {
        router.push(`/${locale}/narrative/${eventId}/quests/${id}`);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm(t("quests.dialogs.delete.description"))) return;

        try {
            await narrativeApi.deleteQuest(token, eventId, id, "User requested deletion");
            setQuests(quests.map(q => q.id === id ? { ...q, deletedAt: new Date().toISOString() } : q));
        } catch (error) {
            console.error("Failed to delete quest:", error);
        }
    };

    const handleRestore = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await narrativeApi.undeleteQuest(token, eventId, id);
            setQuests(quests.map(q => q.id === id ? { ...q, deletedAt: null } : q));
        } catch (error) {
            console.error("Failed to restore quest:", error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center rounded-lg border bg-card p-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("common.search")}
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
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
                            id="show-deleted-quests"
                            checked={showDeleted}
                            onCheckedChange={(checked: boolean) => setShowDeleted(checked)}
                        />
                        <Label htmlFor="show-deleted-quests" className="text-sm font-medium leading-none cursor-pointer text-muted-foreground">
                            {t("common.showDeleted")}
                        </Label>
                    </div>
                )}

                <div className="ml-auto">
                    {isOrgOrSysAdmin && (
                        <CreateQuestDialog eventId={eventId} token={token} />
                    )}
                </div>
            </div>

            <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("quests.list.columns.title")}</TableHead>
                            <TableHead>{t("quests.list.columns.status")}</TableHead>
                            <TableHead className="w-[80px]">{t("common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredQuests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                                    {t("quests.list.empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredQuests.map((quest) => (
                                <TableRow
                                    key={quest.id}
                                    className={`cursor-pointer hover:bg-muted/50 transition-colors group ${quest.deletedAt ? "opacity-50" : ""}`}
                                    onClick={() => navigateToDetail(quest.id)}
                                >
                                    <TableCell className="font-semibold">{quest.title}</TableCell>
                                    <TableCell>
                                        <NarrativeStatusBadge status={quest.status} />
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => navigateToDetail(quest.id)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    {t("common.edit")}
                                                </DropdownMenuItem>
                                                {isOrgOrSysAdmin && (
                                                    <>
                                                        {!quest.deletedAt ? (
                                                            <DropdownMenuItem onClick={(e) => handleDelete(e, quest.id)} className="text-destructive focus:text-destructive font-medium">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                {t("common.delete")}
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={(e) => handleRestore(e, quest.id)} className="text-emerald-600 focus:text-emerald-700 font-medium">
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
