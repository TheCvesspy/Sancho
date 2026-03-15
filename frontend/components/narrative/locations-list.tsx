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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Search, Eye, Trash2, RotateCcw } from "lucide-react";
import { NarrativeLocationDto, narrativeApi } from "@/utils/narrative-api";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { LocationTypeBadge } from "./location-type-badge";
import { CreateLocationDialog } from "./create-location-dialog";

interface LocationsListProps {
    eventId: string;
    initialLocations: NarrativeLocationDto[];
    canWrite: boolean;
    token: string;
}

export function LocationsList({ eventId, initialLocations, canWrite, token }: LocationsListProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [locations, setLocations] = useState<NarrativeLocationDto[]>(initialLocations);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [showDeleted, setShowDeleted] = useState(false);

    const handleDelete = async (locationId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteLocation(token, eventId, locationId, "User requested deletion");
            setLocations(prev => prev.map(l => l.id === locationId ? { ...l, deletedAt: new Date().toISOString() } : l));
        } catch (error) {
            console.error(error);
        }
    };

    const handleRestore = async (locationId: string) => {
        try {
            await narrativeApi.undeleteLocation(token, eventId, locationId);
            setLocations(prev => prev.map(l => l.id === locationId ? { ...l, deletedAt: null } : l));
        } catch (error) {
            console.error(error);
        }
    };

    const filteredLocations = locations.filter(location => {
        if (!showDeleted && location.deletedAt) return false;
        if (statusFilter !== "all" && location.status.toLowerCase() !== statusFilter) return false;
        if (typeFilter !== "all" && location.locationType.toLowerCase() !== typeFilter) return false;
        if (searchQuery && !location.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center rounded-lg border bg-card p-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("locations.list.searchPlaceholder")}
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

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t("locations.allTypes")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("locations.allTypes")}</SelectItem>
                        <SelectItem value="basic">{t("locations.type.basic")}</SelectItem>
                        <SelectItem value="dungeon">{t("locations.type.dungeon")}</SelectItem>
                    </SelectContent>
                </Select>

                {canWrite && (
                    <div className="flex items-center space-x-2 px-2">
                        <Checkbox
                            id="show-deleted-locations"
                            checked={showDeleted}
                            onCheckedChange={(checked: boolean) => setShowDeleted(checked)}
                        />
                        <Label htmlFor="show-deleted-locations" className="text-sm font-medium leading-none cursor-pointer text-muted-foreground">
                            {t("common.showDeleted")}
                        </Label>
                    </div>
                )}

                <div className="ml-auto">
                    {canWrite && (
                        <CreateLocationDialog eventId={eventId} token={token} onCreated={(l) => setLocations(prev => [l, ...prev])} />
                    )}
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("locations.list.columns.name")}</TableHead>
                            <TableHead>{t("locations.list.columns.type")}</TableHead>
                            <TableHead>{t("locations.list.columns.status")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("locations.list.columns.createdAt")}</TableHead>
                            <TableHead className="text-right">{t("common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLocations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    {t("common.noResults")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLocations.map((location) => (
                                <TableRow key={location.id} className={location.deletedAt ? "opacity-50" : ""}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="hover:underline cursor-pointer"
                                                onClick={() => router.push(`/${locale}/narrative/${eventId}/locations/${location.id}`)}
                                            >
                                                {location.name}
                                            </span>
                                            {location.deletedAt && <Badge variant="destructive">{t("common.deleted")}</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <LocationTypeBadge type={location.locationType} />
                                    </TableCell>
                                    <TableCell>
                                        <NarrativeStatusBadge status={location.status} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">
                                        {format(new Date(location.createdAt), "MMM d, yyyy")}
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
                                                <DropdownMenuItem onClick={() => router.push(`/${locale}/narrative/${eventId}/locations/${location.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    {t("common.view")}
                                                </DropdownMenuItem>
                                                {canWrite && (
                                                    <>
                                                        {!location.deletedAt ? (
                                                            <DropdownMenuItem onClick={() => handleDelete(location.id)} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                {t("common.delete")}
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleRestore(location.id)}>
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
