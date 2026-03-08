import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { narrativeApi } from "@/utils/narrative-api";
import { eventsApi } from "@/utils/events-api";
import { PlotDetail } from "@/components/narrative/plot-detail";
import { fetchEventPermissions, resolveModuleAccess } from "@/utils/permissions";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293";

export default async function PlotDetailPage({
    params
}: {
    params: Promise<{ locale: string; eventId: string; plotId: string }>;
}) {
    const { locale, eventId, plotId } = await params;
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
        const [
            event,
            plot,
            plotlineLinks,
            documents,
            characterLinks,
            factionLinks,
            itemLinks
        ] = await Promise.all([
            eventsApi.getEvent(token, eventId),
            narrativeApi.getPlot(token, eventId, plotId),
            narrativeApi.listPlotPlotlines(token, eventId, plotId),
            narrativeApi.listPlotDocuments(token, eventId, plotId),
            narrativeApi.listPlotCharacters(token, eventId, plotId),
            narrativeApi.listPlotFactions(token, eventId, plotId),
            narrativeApi.listPlotItems(token, eventId, plotId),
        ]);

        return (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between space-y-2 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{plot.title}</h2>
                        <p className="text-muted-foreground">{t("hub.tabs.plots")}</p>
                    </div>
                </div>

                <PlotDetail
                    event={event}
                    initialPlot={plot}
                    initialPlotlineLinks={plotlineLinks}
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
        console.error("Failed to load plot:", error);
        return (
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">Error loading plot. It may have been deleted or you do not have permission to view it.</h2>
                </div>
            </div>
        );
    }
}
