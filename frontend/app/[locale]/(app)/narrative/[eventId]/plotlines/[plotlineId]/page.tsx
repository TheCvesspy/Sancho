import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { narrativeApi } from "@/utils/narrative-api";
import { eventsApi } from "@/utils/events-api";
import { PlotlineDetail } from "@/components/narrative/plotline-detail";
import { fetchEventPermissions, resolveModuleAccess } from "@/utils/permissions";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293";

export default async function PlotlineDetailPage({
    params
}: {
    params: Promise<{ locale: string; eventId: string; plotlineId: string }>;
}) {
    const { locale, eventId, plotlineId } = await params;
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
        const [event, plotline, phases, questLinks, documents, characterLinks, factionLinks, itemLinks] = await Promise.all([
            eventsApi.getEvent(token, eventId),
            narrativeApi.getPlotline(token, eventId, plotlineId),
            narrativeApi.listPlotlinePhases(token, eventId, plotlineId),
            narrativeApi.listPlotlineQuests(token, eventId, plotlineId),
            narrativeApi.listPlotlineDocuments(token, eventId, plotlineId),
            narrativeApi.listPlotlineCharacters(token, eventId, plotlineId),
            narrativeApi.listPlotlineFactions(token, eventId, plotlineId),
            narrativeApi.listPlotlineItems(token, eventId, plotlineId),
        ]);

        return (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between space-y-2 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{plotline.title}</h2>
                        <p className="text-muted-foreground">{t("hub.tabs.plotlines")}</p>
                    </div>
                </div>

                <PlotlineDetail
                    event={event}
                    initialPlotline={plotline}
                    initialPhases={phases}
                    initialQuestLinks={questLinks}
                    initialDocuments={documents}
                    initialCharacterLinks={characterLinks}
                    initialFactionLinks={factionLinks}
                    initialItemLinks={itemLinks}
                    canWrite={canWrite}
                    token={token}
                />
            </div>
        );
    } catch (error) {
        console.error("Failed to load plotline:", error);
        return (
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">Error loading plotline. It may have been deleted or you do not have permission to view it.</h2>
                </div>
            </div>
        );
    }
}
