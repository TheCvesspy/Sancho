"use client"

import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"

interface UserRoleBadgeProps {
    isSystemAdmin: boolean
    orgRole?: string | null
}

export function UserRoleBadge({ isSystemAdmin, orgRole }: UserRoleBadgeProps) {
    const t = useTranslations("identity.roles")

    if (isSystemAdmin) {
        return <Badge variant="destructive">{t("systemAdmin")}</Badge>
    }

    if (orgRole === "OrgOwner") {
        return <Badge className="bg-violet-600 hover:bg-violet-700">{t("orgOwner")}</Badge>
    }

    // Future-proofing in case there's another org-level role
    if (orgRole) {
        return <Badge variant="default">{orgRole}</Badge>
    }

    return <Badge variant="secondary" className="text-muted-foreground">{t("regular")}</Badge>
}
