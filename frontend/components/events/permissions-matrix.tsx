"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Plus, Trash2, ShieldAlert } from "lucide-react";
import { eventsApi, EventPermissionDto } from "@/utils/events-api";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface PermissionsMatrixProps {
    eventId: string;
    token: string;
    isOrgOrSysAdmin: boolean;
}

import { toast } from "sonner";

const MODULES = [
    { key: "characters", label: "Characters" },
    { key: "narrative", label: "Narrative" },
    { key: "logistics", label: "Logistics" },
    { key: "npc_org", label: "NPC" },
    { key: "finance", label: "Finance" },
    { key: "communications", label: "Communications" },
];

export function PermissionsMatrix({ eventId, token, isOrgOrSysAdmin }: PermissionsMatrixProps) {
    const t = useTranslations("events.permissions");
    const router = useRouter();

    const [permissions, setPermissions] = useState<EventPermissionDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [availableUsers, setAvailableUsers] = useState<{ id: string, email: string }[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [userSearchOpen, setUserSearchOpen] = useState(false);
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    const fetchPermissions = async () => {
        try {
            const data = await eventsApi.getPermissions(token, eventId);
            setPermissions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293";
            const resp = await fetch(`${API_BASE_URL}/api/identity/users`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (resp.ok) setAvailableUsers(await resp.json());
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchPermissions();
        fetchUsers();
    }, [eventId, token]);

    const updatePermission = async (userId: string, module: string, permission: string) => {
        try {
            if (permission === "none") {
                await eventsApi.revokePermission(token, eventId, userId, module);
            } else {
                await eventsApi.upsertPermission(token, eventId, userId, module, permission);
            }
            toast.success(t("success"));
            fetchPermissions();
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error(t("error"));
        }
    };

    const handleAddUser = async () => {
        if (!selectedUserId) return;
        setAddDialogOpen(false);
        try {
            await updatePermission(selectedUserId, "communications", "read");
            setSelectedUserId(null);
        } catch (err) {
            // Error handled in updatePermission
        }
    };

    // Group by user
    const userMap = permissions.reduce((acc, p) => {
        if (!acc[p.userId]) acc[p.userId] = { displayName: p.userDisplayName, modules: {} };
        acc[p.userId].modules[p.module] = p.permission;
        return acc;
    }, {} as Record<string, { displayName: string | null, modules: Record<string, string> }>);

    const userIds = Object.keys(userMap);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        {t("title")}
                    </h3>
                    <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
                </div>

                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t("addUser")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t("addUser")}</DialogTitle>
                            <DialogDescription>Select a user to grant permissions on this event.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between">
                                        {selectedUserId ? availableUsers.find(u => u.id === selectedUserId)?.email : "Select user..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search user..." />
                                        <CommandList>
                                            <CommandEmpty>No user found.</CommandEmpty>
                                            <CommandGroup>
                                                {availableUsers.map((user) => (
                                                    <CommandItem
                                                        key={user.id}
                                                        onSelect={() => {
                                                            setSelectedUserId(user.id);
                                                            setUserSearchOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedUserId === user.id ? "opacity-100" : "opacity-0")} />
                                                        {user.email}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddUser} disabled={!selectedUserId}>Add</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[200px]">{t("user")}</TableHead>
                            {MODULES.map(m => <TableHead key={m.key} className="text-center">{m.label}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={MODULES.length + 1} className="text-center py-8">Loading...</TableCell></TableRow>
                        ) : userIds.length === 0 ? (
                            <TableRow><TableCell colSpan={MODULES.length + 1} className="text-center py-8 text-muted-foreground">No custom permissions granted.</TableCell></TableRow>
                        ) : (
                            userIds.map((uid) => (
                                <TableRow key={uid}>
                                    <TableCell className="font-medium max-w-[200px] truncate" title={uid}>
                                        {userMap[uid].displayName || uid}
                                    </TableCell>
                                    {MODULES.map(module => (
                                        <TableCell key={module.key} className="text-center">
                                            <Select
                                                value={userMap[uid].modules[module.key] || "none"}
                                                onValueChange={(v) => updatePermission(uid, module.key, v)}
                                            >
                                                <SelectTrigger className="h-8 w-[100px] mx-auto text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">{t("levels.none")}</SelectItem>
                                                    <SelectItem value="read">{t("levels.read")}</SelectItem>
                                                    <SelectItem value="write">{t("levels.write")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

