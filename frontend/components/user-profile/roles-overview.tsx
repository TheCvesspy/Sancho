import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"

interface Membership {
    tenantId: string
    tenantName: string
    roles: string[]
}

interface RolesOverviewProps {
    memberships: Membership[]
}

export function RolesOverview({ memberships }: RolesOverviewProps) {
    const t = useTranslations("profile")

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("roles")}</CardTitle>
            </CardHeader>
            <CardContent>
                {memberships.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("noRoles")}</p>
                ) : (
                    <div className="space-y-4">
                        {memberships.map((m) => (
                            <div key={m.tenantId} className="flex flex-col gap-2 border-b pb-3 last:border-0 last:pb-0">
                                <span className="text-sm font-semibold">{m.tenantName}</span>
                                <div className="flex flex-wrap gap-1">
                                    {m.roles.map((role) => (
                                        <Badge key={role} variant="secondary" className="capitalize">
                                            {role.replace('_', ' ')}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
