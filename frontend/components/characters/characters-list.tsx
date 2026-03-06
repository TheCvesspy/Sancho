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
import { MoreHorizontal, Search, Plus, Eye, Copy, Lock, Trash2, RotateCcw } from "lucide-react";
import { CharacterListItemDto } from "@/utils/characters-api";
import { EventDetailDto } from "@/utils/events-api";
import { CharacterStatusBadge } from "./character-status-badge";
import { EventSelectorHeader } from "./event-selector-header";
import { CreateCharacterDialog } from "./create-character-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import dynamic from "next/dynamic";

// Lazy-load the React Flow graph — @xyflow/react is large and only needed in graph view.
const RelationshipGraph = dynamic(
    () => import("./relationship-graph").then(m => ({ default: m.RelationshipGraph })),
    {
        ssr: false,
        loading: () => (
            <div className="bg-card rounded-lg border h-[600px] flex items-center justify-center text-muted-foreground animate-pulse">
                Loading graph…
            </div>
        )
    }
);

interface CharactersListProps {
    event: EventDetailDto;
    initialCharacters: CharacterListItemDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function CharactersList({ event, initialCharacters, isOrgOrSysAdmin, token }: CharactersListProps) {
    const t = useTranslations("characters");
    const locale = useLocale();
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showDeleted, setShowDeleted] = useState(false);
    const [viewMode, setViewMode] = useState<"table" | "graph">("table");

    const filteredCharacters = useMemo(() => initialCharacters.filter((char) => {
        const matchesSearch = char.name.toLowerCase().includes(search.toLowerCase()) ||
            char.race.toLowerCase().includes(search.toLowerCase());

        let matchesStatus = true;
        if (statusFilter !== "all") {
            matchesStatus = char.status.toLowerCase() === statusFilter;
        }

        const matchesDeleted = showDeleted ? true : !char.deletedAt;

        return matchesSearch && matchesStatus && matchesDeleted;
    }), [initialCharacters, search, statusFilter, showDeleted]);

    const navigateToDetail = (id: string) => {
        router.push(`/${locale}/characters/${event.id}/${id}`);
    };

    return (
        <div className="space-y-6 lg:max-w-6xl lg:mx-auto">
            <EventSelectorHeader currentEvent={event} token={token} />

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-muted p-1 rounded-md hidden sm:flex">
                        <Button
                            variant={viewMode === "table" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("table")}
                        >
                            Table
                        </Button>
                        <Button
                            variant={viewMode === "graph" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("graph")}
                        >
                            Graph
                        </Button>
                    </div>
                    {isOrgOrSysAdmin && (
                        <CreateCharacterDialog eventId={event.id} token={token} />
                    )}
                </div>
            </div>

            {viewMode === "table" ? (
                <>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center rounded-lg border bg-card p-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("list.searchPlaceholder")}
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t("list.statusFilter.all")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("list.statusFilter.all")}</SelectItem>
                                <SelectItem value="draft">{t("list.statusFilter.draft")}</SelectItem>
                                <SelectItem value="ready">{t("list.statusFilter.ready")}</SelectItem>
                                <SelectItem value="locked">{t("list.statusFilter.locked")}</SelectItem>
                            </SelectContent>
                        </Select>

                        {isOrgOrSysAdmin && (
                            <div className="flex items-center space-x-2 px-2">
                                <Checkbox
                                    id="show-deleted"
                                    checked={showDeleted}
                                    onCheckedChange={(checked: boolean) => setShowDeleted(checked)}
                                />
                                <Label htmlFor="show-deleted" className="text-sm font-medium leading-none cursor-pointer text-muted-foreground">
                                    {t("list.showDeleted")}
                                </Label>
                            </div>
                        )}
                    </div>

                    <div className="rounded-md border bg-card overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>{t("list.columns.name")}</TableHead>
                                    <TableHead>{t("list.columns.race")}</TableHead>
                                    <TableHead>{t("list.columns.status")}</TableHead>
                                    <TableHead>{t("list.columns.player")}</TableHead>
                                    <TableHead>{t("list.columns.stats")}</TableHead>
                                    <TableHead className="w-[80px]">{t("list.columns.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCharacters.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            {t("list.emptyState")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCharacters.map((char) => (
                                        <TableRow
                                            key={char.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors group"
                                            onClick={() => navigateToDetail(char.id)}
                                        >
                                            <TableCell>
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={char.photoUrl || ""} alt={char.name} />
                                                    <AvatarFallback className="bg-primary/10 text-primary uppercase">
                                                        {char.name.slice(0, 2)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TableCell>
                                            <TableCell className="font-semibold">{char.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{char.race}</TableCell>
                                            <TableCell>
                                                <CharacterStatusBadge status={char.status} />
                                            </TableCell>
                                            <TableCell>
                                                {char.playerUserId ? (
                                                    <span className="text-primary truncate max-w-[120px] inline-block">
                                                        {char.playerUserId}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground italic text-sm">Unassigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-xs text-muted-foreground">
                                                    <span>{char.abilitiesCount} abilities</span>
                                                    <span>{char.attachmentsCount} files</span>
                                                </div>
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>{t("list.columns.actions")}</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => navigateToDetail(char.id)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            {t("list.actions.view")}
                                                        </DropdownMenuItem>
                                                        {isOrgOrSysAdmin && (
                                                            <>
                                                                <DropdownMenuItem>
                                                                    <Copy className="mr-2 h-4 w-4" />
                                                                    {t("list.actions.duplicate")}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem>
                                                                    <Lock className="mr-2 h-4 w-4" />
                                                                    {t("list.actions.changeStatus")}
                                                                </DropdownMenuItem>
                                                                {!char.deletedAt ? (
                                                                    <DropdownMenuItem className="text-destructive focus:text-destructive font-medium">
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        {t("list.actions.delete")}
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem className="text-emerald-600 focus:text-emerald-700 font-medium">
                                                                        <RotateCcw className="mr-2 h-4 w-4" />
                                                                        {t("list.actions.restore")}
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
                </>
            ) : (
                <RelationshipGraph
                    eventId={event.id}
                    characters={filteredCharacters}
                    relationships={[]}
                />
            )}
        </div>
    );
}
