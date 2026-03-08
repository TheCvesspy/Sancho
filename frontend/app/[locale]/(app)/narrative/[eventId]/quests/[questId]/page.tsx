import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { narrativeApi } from "@/utils/narrative-api";
import { eventsApi } from "@/utils/events-api";
import { QuestDetail } from "@/components/narrative/quest-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchEventPermissions, resolveModuleAccess } from "@/utils/permissions";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293";

export default async function QuestDetailPage({
    params
}: {
    params: Promise<{ locale: string; eventId: string; questId: string }>;
}) {
    const { locale, eventId, questId } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("narrative");

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
    const { canWrite, isOrgOrSysAdmin } = resolveModuleAccess(profile, permissions, "narrative");

    try {
        const [event, quest, steps, documents, charLinks, factionLinks, itemLinks] = await Promise.all([
            eventsApi.getEvent(token, eventId),
            narrativeApi.getQuest(token, eventId, questId),
            narrativeApi.listQuestSteps(token, eventId, questId),
            narrativeApi.listQuestDocuments(token, eventId, questId),
            narrativeApi.listQuestCharacters(token, eventId, questId),
            narrativeApi.listQuestFactions(token, eventId, questId),
            narrativeApi.listQuestItems(token, eventId, questId),
        ]);

        return (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <QuestDetail
                    event={event}
                    initialQuest={quest}
                    initialSteps={steps}
                    initialDocuments={documents}
                    initialCharacterLinks={charLinks}
                    initialFactionLinks={factionLinks}
                    initialItemLinks={itemLinks}
                    canWrite={canWrite}
                    token={token}
                />
            </div>
        );
    } catch (error) {
        console.error("Failed to load quest:", error);
        return (
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">Error loading quest. It may have been deleted or you do not have permission to view it.</h2>
                </div>
            </div>
        );
    }
}
