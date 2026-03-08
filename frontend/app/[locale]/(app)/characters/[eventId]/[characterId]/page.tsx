import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { charactersApi } from "@/utils/characters-api";
import { eventsApi } from "@/utils/events-api";
import { CharacterDetail } from "@/components/characters/character-detail";
import { fetchEventPermissions, resolveModuleAccess } from "@/utils/permissions";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293";

export default async function CharacterDetailPage({
    params
}: {
    params: Promise<{ locale: string; eventId: string; characterId: string }>;
}) {
    const { locale, eventId, characterId } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("characters");

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect(`/${locale}/login`);
    }

    const token = session.access_token;

    // Get user profile and event-scoped permissions in parallel
    const [userResponse, permissions] = await Promise.all([
        fetch(`${API_BASE_URL}/api/user/me`, {
            headers: { "Authorization": `Bearer ${token}` },
            next: { revalidate: 60 }
        }),
        fetchEventPermissions(token, eventId),
    ]);

    if (!userResponse.ok) {
        return <div className="p-10 text-destructive">Error loading user profile.</div>;
    }

    const profile = await userResponse.json();
    const { canWrite, isOrgOrSysAdmin } = resolveModuleAccess(profile, permissions, "characters");

    try {
        // Fetch all data in parallel — event, character, abilities, attachments, and narrative links
        // are all independent and can be resolved simultaneously.
        const [event, character, abilities, attachments, narrativeLinks] = await Promise.all([
            eventsApi.getEvent(token, eventId),
            charactersApi.getCharacter(token, eventId, characterId),
            charactersApi.listAbilities(token, eventId, characterId),
            charactersApi.listAttachments(token, eventId, characterId),
            charactersApi.getNarrativeLinks(token, eventId, characterId)
        ]);

        return (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <CharacterDetail
                    event={event}
                    initialCharacter={character}
                    initialAbilities={abilities}
                    initialAttachments={attachments}
                    initialNarrativeLinks={narrativeLinks}
                    canWrite={canWrite}
                    token={token}
                />
            </div>
        );
    } catch (error) {
        console.error("Failed to load character details:", error);
        return (
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">{t("errors.notFound")}</h2>
                </div>
            </div>
        );
    }
}
