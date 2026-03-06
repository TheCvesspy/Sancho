import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { charactersApi } from "@/utils/characters-api";
import { eventsApi } from "@/utils/events-api";
import { CharacterDetail } from "@/components/characters/character-detail";

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

    // Get user profile for RBAC checks
    const userResponse = await fetch(`${API_BASE_URL}/api/user/me`, {
        headers: { "Authorization": `Bearer ${token}` },
        next: { revalidate: 60 }
    });

    const isOrgOrSysAdmin = userResponse.ok ? (await userResponse.json()).isSystemAdmin : false;

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
                    isOrgOrSysAdmin={isOrgOrSysAdmin}
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
