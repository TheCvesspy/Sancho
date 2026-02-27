"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

export function DangerZone() {
    const t = useTranslations("profile")
    const supabase = createClient()
    const router = useRouter()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    return (
        <Card className="border-destructive/20">
            <CardHeader>
                <CardTitle className="text-destructive">{t("dangerZone")}</CardTitle>
            </CardHeader>
            <CardContent>
                <Button variant="destructive" onClick={handleSignOut}>
                    {t("signOut")}
                </Button>
            </CardContent>
        </Card>
    )
}
