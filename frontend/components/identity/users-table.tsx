"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserRoleBadge } from "./user-role-badge"
import { AssignRoleDialog } from "./assign-role-dialog"

export type UserListItem = {
    id: string
    email: string
    displayName: string | null
    avatarUrl: string | null
    locale: string
    isSystemAdmin: boolean
    orgRole: string | null
    orgRoleAssignedAt: string | null
    eventsManaged: number
    createdAt: string
    lastSignInAt: string | null
}

interface UsersTableProps {
    users: UserListItem[]
}

export function UsersTable({ users }: UsersTableProps) {
    const t = useTranslations("identity")
    const locale = useLocale()

    const [search, setSearch] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")

    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)

    const filteredUsers = users.filter((u) => {
        // Text search
        const textMatch =
            (u.displayName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
            u.email.toLowerCase().includes(search.toLowerCase())

        // Role filter
        let roleMatch = true
        if (roleFilter !== "all") {
            if (roleFilter === "systemAdmin") roleMatch = u.isSystemAdmin
            else if (roleFilter === "orgOwner") roleMatch = u.orgRole === "OrgOwner"
            else if (roleFilter === "regular") roleMatch = !u.isSystemAdmin && !u.orgRole
        }

        return textMatch && roleMatch
    })

    const openDialog = (user: UserListItem) => {
        setSelectedUser(user)
        setDialogOpen(true)
    }

    const getInitials = (name?: string | null, email?: string) => {
        if (name) return name.substring(0, 2).toUpperCase()
        if (email) return email.substring(0, 2).toUpperCase()
        return "??"
    }

    const formatDate = (ds?: string | null) => {
        if (!ds) return "-"
        return new Date(ds).toLocaleDateString(locale, {
            year: "numeric",
            month: "short",
            day: "numeric"
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("table.searchPlaceholder")}
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t("table.roleFilterAll")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("table.roleFilterAll")}</SelectItem>
                        <SelectItem value="systemAdmin">{t("table.roleFilterSystemAdmin")}</SelectItem>
                        <SelectItem value="orgOwner">{t("table.roleFilterOrgOwner")}</SelectItem>
                        <SelectItem value="regular">{t("table.roleFilterRegular")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("table.columns.user")}</TableHead>
                            <TableHead>{t("table.columns.role")}</TableHead>
                            <TableHead>{t("table.columns.events")}</TableHead>
                            <TableHead>{t("table.columns.joined")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("table.columns.lastSignIn")}</TableHead>
                            <TableHead className="w-[80px]">{t("table.columns.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={user.avatarUrl ?? ""} />
                                                <AvatarFallback>{getInitials(user.displayName, user.email)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium leading-none">{user.displayName || user.email}</span>
                                                {user.displayName && (
                                                    <span className="text-xs text-muted-foreground mt-1">{user.email}</span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <UserRoleBadge isSystemAdmin={user.isSystemAdmin} orgRole={user.orgRole} />
                                    </TableCell>
                                    <TableCell>{user.eventsManaged}</TableCell>
                                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                                    <TableCell className="hidden md:table-cell">{formatDate(user.lastSignInAt)}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t("table.columns.actions")}</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {!user.isSystemAdmin && user.orgRole !== "OrgOwner" && (
                                                    <DropdownMenuItem onClick={() => openDialog(user)}>
                                                        {t("actions.assignOrgOwner")}
                                                    </DropdownMenuItem>
                                                )}
                                                {!user.isSystemAdmin && user.orgRole === "OrgOwner" && (
                                                    <DropdownMenuItem onClick={() => openDialog(user)} className="text-destructive">
                                                        {t("actions.revokeOrgOwner")}
                                                    </DropdownMenuItem>
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

            {selectedUser && (
                <AssignRoleDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    userId={selectedUser.id}
                    displayName={selectedUser.displayName || selectedUser.email}
                    currentRole={selectedUser.orgRole === "OrgOwner" ? "OrgOwner" : "Regular"}
                    onSuccess={() => { }}
                />
            )}
        </div>
    )
}
