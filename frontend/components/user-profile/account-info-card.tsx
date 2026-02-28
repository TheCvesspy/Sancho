import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl"

interface AccountInfoCardProps {
    email: string
    provider: string
}

export function AccountInfoCard({ email, provider }: AccountInfoCardProps) {
    const t = useTranslations("profile")

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("accountInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-1">
                    <span className="text-sm text-muted-foreground">{t("email")}</span>
                    <span className="text-sm font-medium truncate" title={email}>{email}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                    <span className="text-sm text-muted-foreground">{t("authProvider")}</span>
                    <span className="text-sm font-medium capitalize">{provider}</span>
                </div>
            </CardContent>
        </Card>
    )
}
