"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
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
import { Check, ChevronsUpDown, UserPlus, Trash2, Users } from "lucide-react";
import { eventsApi, EventManagerDto } from "@/utils/events-api";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ManagersPanelProps {
    eventId: string;
    token: string;
    isOrgOrSysAdmin: boolean;
}

type UserSummary = {
    id: string;
    email: string;
    displayName: string | null;
}

export function ManagersPanel({ eventId, token, isOrgOrSysAdmin }: ManagersPanelProps) {
    const t = useTranslations("events.managers");
    const locale = useLocale();
    const router = useRouter();

    const [managers, setManagers] = useState<EventManagerDto[]>([]);
    const [availableUsers, setAvailableUsers] = useState<UserSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [assignOpen, setAssignOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [userSearchOpen, setUserSearchOpen] = useState(false);

    const fetchManagers = async () => {
        try {
            const data = await eventsApi.getManagers(token, eventId);
            setManagers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            // Identity API base URL
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293";
            const resp = await fetch(`${API_BASE_URL}/api/identity/users`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (resp.ok) {
                setAvailableUsers(await resp.json());
            }
        } catch (err) {
            console.error("Failed to fetch users for selection:", err);
        }
    };

    useEffect(() => {
        fetchManagers();
        if (isOrgOrSysAdmin) fetchUsers();
    }, [eventId, token]);

    const handleAssign = async () => {
        if (!selectedUserId) return;
        try {
            await eventsApi.assignManager(token, eventId, selectedUserId);
            setAssignOpen(false);
            setSelectedUserId(null);
            fetchManagers();
            router.refresh();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRevoke = async (userId: string) => {
        if (!confirm(t("revokeConfirm"))) return;
        try {
            await eventsApi.revokeManager(token, eventId, userId);
            fetchManagers();
            router.refresh();
        } catch (err) {
            console.error(err);
        }
    };

    const formatDate = (ds: string) => new Date(ds).toLocaleDateString(locale, { dateStyle: "medium" });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {t("title")}
                    </h3>
                    <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
                </div>

                {isOrgOrSysAdmin && (
                    <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-2">
                                <UserPlus className="h-4 w-4" />
                                {t("assign")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>{t("assign")}</DialogTitle>
                                <DialogDescription>{t("selectUser")}</DialogDescription>
                            </DialogHeader>

                            <div className="py-4">
                                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={userSearchOpen}
                                            className="w-full justify-between"
                                        >
                                            {selectedUserId
                                                ? availableUsers.find((u) => u.id === selectedUserId)?.email
                                                : t("searchUser")}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                        <Command>
                                            <CommandInput placeholder={t("searchUser")} />
                                            <CommandList>
                                                <CommandEmpty>No user found.</CommandEmpty>
                                                <CommandGroup>
                                                    {availableUsers
                                                        .filter(u => !managers.some(m => m.userId === u.id))
                                                        .map((user) => (
                                                            <CommandItem
                                                                key={user.id}
                                                                value={user.email}
                                                                onSelect={() => {
                                                                    setSelectedUserId(user.id);
                                                                    setUserSearchOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedUserId === user.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span>{user.displayName || user.email}</span>
                                                                    {user.displayName && <span className="text-[10px] text-muted-foreground">{user.email}</span>}
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
                                <Button onClick={handleAssign} disabled={!selectedUserId}>{t("assign")}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Manager</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>{t("assignedAt")}</TableHead>
                            {isOrgOrSysAdmin && <TableHead className="w-[80px]">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                        ) : managers.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No managers assigned.</TableCell></TableRow>
                        ) : (
                            managers.map((m) => (
                                <TableRow key={m.userId}>
                                    <TableCell className="font-medium">{m.userDisplayName || m.userId}</TableCell>
                                    <TableCell>{m.role}</TableCell>
                                    <TableCell>{formatDate(m.createdAt)}</TableCell>
                                    {isOrgOrSysAdmin && (
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive h-8 w-8"
                                                onClick={() => handleRevoke(m.userId)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
