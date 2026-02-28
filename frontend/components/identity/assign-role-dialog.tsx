"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import {
    assignOrgRole,
    revokeOrgRole
} from "@/app/[locale]/(app)/identity/actions"

interface AssignRoleDialogProps {
    userId: string
    displayName: string
    currentRole: "Regular" | "OrgOwner"
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function AssignRoleDialog({
    userId,
    displayName,
    currentRole,
    open,
    onOpenChange,
    onSuccess
}: AssignRoleDialogProps) {
    const t = useTranslations("identity")
    const [loading, setLoading] = useState(false)
    const isAssigning = currentRole === "Regular"

    const handleConfirm = async () => {
        setLoading(true)
        try {
            if (isAssigning) {
                await assignOrgRole(userId)
            } else {
                await revokeOrgRole(userId)
            }
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            alert(t("actions.errorGen"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isAssigning ? t("dialog.assignTitle") : t("dialog.revokeTitle")} - {displayName}
                    </DialogTitle>
                    <DialogDescription>
                        {isAssigning ? t("dialog.assignDescription") : t("dialog.revokeDescription")}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        {t("dialog.cancel")}
                    </Button>
                    <Button
                        variant={isAssigning ? "default" : "destructive"}
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {t("dialog.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
