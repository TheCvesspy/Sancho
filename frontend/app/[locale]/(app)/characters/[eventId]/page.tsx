import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { charactersApi } from "@/utils/characters-api";
import { eventsApi } from "@/utils/events-api";
import { CharactersList } from "@/components/characters/characters-list";
import { fetchEventPermissions, resolveModuleAccess } from "@/utils/permissions";

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

    const includeDeleted = sp.showDeleted === "true" && isOrgOrSysAdmin;

    try {
        // Fetch event and character list in parallel — they are independent.
        const [event, characters] = await Promise.all([
            eventsApi.getEvent(token, eventId),
            charactersApi.listCharacters(token, eventId, includeDeleted),
        ]);

        return (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <CharactersList
                    event={event}
                    initialCharacters={characters}
                    canWrite={canWrite}
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
