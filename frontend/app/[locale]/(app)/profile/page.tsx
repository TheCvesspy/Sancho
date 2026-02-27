import { getTranslations, setRequestLocale } from "next-intl/server"
import { createClient } from "@/utils/supabase/server"
import { AvatarUpload } from "@/components/user-profile/avatar-upload"
import { ProfileForm } from "@/components/user-profile/profile-form"
import { RolesOverview } from "@/components/user-profile/roles-overview"
import { AccountInfoCard } from "@/components/user-profile/account-info-card"
import { ContentSummary } from "@/components/user-profile/content-summary"
import { DangerZone } from "@/components/user-profile/danger-zone"
import { Separator } from "@/components/ui/separator"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293"

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    setRequestLocale(locale)
    const t = await getTranslations("profile")

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div>Unauthorized</div>
    }

    // After confirming the user is valid, get the session to access the token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        return <div>Unauthorized</div>
    }

    const headers = { "Authorization": `Bearer ${session.access_token}` }

    // Fetch user-specific data from OUR API
    const userResponse = await fetch(`${API_BASE_URL}/api/user/me`, { headers, cache: "no-store" })
    const membershipsResponse = await fetch(`${API_BASE_URL}/api/user/me/memberships`, { headers, cache: "no-store" })

    const profileData = userResponse.ok ? await userResponse.json() : null
    const memberships = membershipsResponse.ok ? await membershipsResponse.json() : []

    if (!profileData) {
        const errorText = await userResponse.text();
        console.error("Profile API Error:", userResponse.status, errorText);
        return (
            <div className="mx-auto w-full max-w-5xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">Error loading profile data</h2>
                    <p className="text-sm">
                        The API returned <strong>{userResponse.status}</strong>.
                        Please ensure the backend is running and you are properly authenticated.
                    </p>
                    {errorText && <p className="text-xs mt-2 opacity-70">Detail: {errorText}</p>}
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-5xl px-6 py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground">Manage your personal information and preferences.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Avatar & Account Info */}
                    <div className="space-y-6">
                        <div className="flex justify-center md:justify-start">
                            <AvatarUpload
                                currentAvatarUrl={profileData.avatarUrl}
                                displayName={profileData.displayName || profileData.fullName}
                            />
                        </div>
                        <AccountInfoCard
                            email={session.user.email!}
                            provider={session.user.app_metadata.provider || "google"}
                        />
                        <RolesOverview memberships={memberships} />
                    </div>

                    {/* Right Column: Settings & Content */}
                    <div className="md:col-span-2 space-y-8">
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold">Profile Settings</h2>
                            <Separator />
                            <ProfileForm initialData={{
                                displayName: profileData.displayName || "",
                                bio: profileData.bio || "",
                                locale: profileData.locale || locale
                            }} />
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold">Activity Overview</h2>
                            <Separator />
                            <ContentSummary />
                        </section>

                        <section className="space-y-4 pt-4">
                            <DangerZone />
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
