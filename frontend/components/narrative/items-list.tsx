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
import { NarrativeItemDto, narrativeApi } from "@/utils/narrative-api";
import { NarrativeItemStatusBadge } from "./narrative-item-status-badge";
import { CreateItemDialog } from "./create-item-dialog";

interface ItemsListProps {
    eventId: string;
    initialItems: NarrativeItemDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function ItemsList({ eventId, initialItems, isOrgOrSysAdmin, token }: ItemsListProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [items, setItems] = useState<NarrativeItemDto[]>(initialItems);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showDeleted, setShowDeleted] = useState(false);

    const handleDelete = async (itemId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteItem(token, eventId, itemId, "User requested deletion");
            setItems(prev => prev.map(f => f.id === itemId ? { ...f, deletedAt: new Date().toISOString() } : f));
        } catch (error) {
            console.error(error);
        }
    };

    const handleRestore = async (itemId: string) => {
        try {
            await narrativeApi.undeleteItem(token, eventId, itemId);
            setItems(prev => prev.map(f => f.id === itemId ? { ...f, deletedAt: null } : f));
        } catch (error) {
            console.error(error);
        }
    };

    const filteredItems = items.filter(item => {
        if (!showDeleted && item.deletedAt) return false;
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center rounded-lg border bg-card p-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("items.list.searchPlaceholder")}
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
                        <SelectItem value="draft">{t("itemStatus.draft")}</SelectItem>
                        <SelectItem value="ready to review">{t("itemStatus.readyToReview")}</SelectItem>
                        <SelectItem value="final">{t("itemStatus.final")}</SelectItem>
                    </SelectContent>
                </Select>

                {isOrgOrSysAdmin && (
                    <div className="flex items-center space-x-2 px-2">
                        <Checkbox
                            id="show-deleted-items"
                            checked={showDeleted}
                            onCheckedChange={(checked: boolean) => setShowDeleted(checked)}
                        />
                        <Label htmlFor="show-deleted-items" className="text-sm font-medium leading-none cursor-pointer text-muted-foreground">
                            {t("common.showDeleted")}
                        </Label>
                    </div>
                )}

                <div className="ml-auto">
                    {isOrgOrSysAdmin && (
                        <CreateItemDialog eventId={eventId} token={token} onCreated={(i) => setItems(prev => [i, ...prev])} />
                    )}
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("items.list.columns.name")}</TableHead>
                            <TableHead>{t("items.list.columns.status")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("common.type")}</TableHead>
                            <TableHead className="hidden lg:table-cell">{t("items.list.columns.createdAt")}</TableHead>
                            <TableHead className="text-right">{t("common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    {t("common.noResults")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item) => (
                                <TableRow key={item.id} className={item.deletedAt ? "opacity-50" : ""}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="hover:underline cursor-pointer"
                                                onClick={() => router.push(`/${locale}/narrative/${eventId}/items/${item.id}`)}
                                            >
                                                {item.name}
                                            </span>
                                            {item.deletedAt && <Badge variant="destructive">{t("common.deleted")}</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <NarrativeItemStatusBadge status={item.status} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">
                                        {item.isMultiCopy ? (
                                            <div className="flex items-center gap-1">
                                                <Badge variant="outline">{t("common.multiCopy")}</Badge>
                                                {item.maxCopies && <span className="text-xs">Max: {item.maxCopies}</span>}
                                            </div>
                                        ) : (
                                            <Badge variant="secondary">{t("common.single")}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                                        {format(new Date(item.createdAt), "MMM d, yyyy")}
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
                                                <DropdownMenuItem onClick={() => router.push(`/${locale}/narrative/${eventId}/items/${item.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    {t("common.view")}
                                                </DropdownMenuItem>
                                                {isOrgOrSysAdmin && (
                                                    <>
                                                        {!item.deletedAt ? (
                                                            <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                {t("common.delete")}
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleRestore(item.id)}>
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
