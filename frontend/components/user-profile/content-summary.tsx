import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl"

export function ContentSummary() {
    const t = useTranslations("profile")

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("contentSummary")}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground italic">{t("comingSoon")}</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/40 p-4 text-center">
                        <span className="block text-2xl font-bold">--</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Characters</span>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-4 text-center">
                        <span className="block text-2xl font-bold">--</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Narrative Items</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
