import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { charactersApi } from "@/utils/characters-api";
import { eventsApi } from "@/utils/events-api";
import { CharactersList } from "@/components/characters/characters-list";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293";

export default async function EventCharactersPage({
    params,
    searchParams
}: {
    params: Promise<{ locale: string; eventId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { locale, eventId } = await params;
    const sp = await searchParams;
    setRequestLocale(locale);
    const t = await getTranslations("characters");

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect(`/${locale}/login`);
    }

    const token = session.access_token;

    // Get user profile for RBAC checks
    const userResponse = await fetch(`${API_BASE_URL}/api/user/me`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: "no-store"
    });

    if (!userResponse.ok) {
        return <div className="p-10 text-destructive">Error loading user profile.</div>;
    }

    const profile = await userResponse.json();
    const isOrgOrSysAdmin = profile.isSystemAdmin || profile.orgRole === "OrgOwner";

    const includeDeleted = sp.showDeleted === "true" && isOrgOrSysAdmin;

    try {
        // Fetch event data for the header
        const event = await eventsApi.getEvent(token, eventId);

        // Fetch characters list
        const characters = await charactersApi.listCharacters(token, eventId, includeDeleted);

        return (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <CharactersList
                    event={event}
                    initialCharacters={characters}
                    isOrgOrSysAdmin={isOrgOrSysAdmin}
                    token={token}
                />
            </div>
        );
    } catch (error) {
        console.error("Failed to load characters:", error);
        return (
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">{t("errors.loadFailed")}</h2>
                </div>
            </div>
        );
    }
}
