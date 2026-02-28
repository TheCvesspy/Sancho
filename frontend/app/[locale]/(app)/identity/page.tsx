import { getTranslations, setRequestLocale } from "next-intl/server"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { UsersTable, UserListItem } from "@/components/identity/users-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InviteTokenManager, InviteToken } from "@/components/identity/invite-token-manager"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293"

export default async function IdentityPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    setRequestLocale(locale)
    const t = await getTranslations("identity")

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        redirect(`/${locale}/login`)
    }

    const headers = {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
    }

    // Try to fetch users list
    const usersResponse = await fetch(`${API_BASE_URL}/api/identity/users`, {
        headers,
        cache: "no-store"
    })

    if (usersResponse.status === 403 || usersResponse.status === 401) {
        // Not a SystemAdmin or unauthorized
        redirect(`/${locale}/`)
    }

    if (!usersResponse.ok) {
        const errorText = await usersResponse.text()
        console.error("Identity API Error:", usersResponse.status, errorText)
        return (
            <div className="mx-auto w-full max-w-5xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">Error loading users data</h2>
                    <p className="text-sm">
                        The API returned <strong>{usersResponse.status}</strong>.
                    </p>
                    {errorText && <p className="text-xs mt-2 opacity-70">Detail: {errorText}</p>}
                </div>
            </div>
        )
    }

    const usersData: UserListItem[] = await usersResponse.json()

    // Fetch invite tokens
    const tokensResponse = await fetch(`${API_BASE_URL}/api/identity/invite-tokens`, {
        headers,
        cache: "no-store"
    })
    const tokensData: InviteToken[] = tokensResponse.ok ? await tokensResponse.json() : []

    return (
        <div className="mx-auto w-full max-w-5xl px-6 py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>

                <Tabs defaultValue="users" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="invites">Invite Tokens</TabsTrigger>
                    </TabsList>

                    <TabsContent value="users">
                        <UsersTable users={usersData} />
                    </TabsContent>

                    <TabsContent value="invites">
                        <InviteTokenManager tokens={tokensData} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
