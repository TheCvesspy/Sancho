import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"

export interface OrgMembership {
    orgRole: string
    permissions: Record<string, string>
    isSystemAdmin?: boolean
}

interface RolesOverviewProps {
    membership: OrgMembership | null
}

export function RolesOverview({ membership }: RolesOverviewProps) {
    const t = useTranslations("profile")
    const hasAnyRole = Boolean(membership?.isSystemAdmin || membership?.orgRole)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("roles")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-xs text-muted-foreground mb-2">Assigned roles</p>
                    {hasAnyRole ? (
                        <div className="flex flex-wrap gap-2">
                            {membership?.isSystemAdmin && (
                                <Badge>System Admin</Badge>
                            )}
                            {membership?.orgRole && (
                                <Badge variant="secondary" className="capitalize">
                                    {membership.orgRole.replace(/([A-Z])/g, " $1").trim()}
                                </Badge>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t("noRoles")}</p>
                    )}
                </div>

                {/* Base Module Permissions */}
                {membership?.permissions && Object.keys(membership.permissions).length > 0 && (
                    <div className="pt-2">
                        <p className="text-xs text-muted-foreground mb-2">Base permissions</p>
                        <div className="flex flex-col gap-2">
                            {Object.entries(membership.permissions).map(([module, permission]) => (
                                <div key={module} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                                    <span className="capitalize">{module.replace(/_/g, " ")}</span>
                                    <Badge variant={permission === "write" ? "default" : permission === "read" ? "secondary" : "outline"} className="capitalize text-xs">
                                        {permission}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
