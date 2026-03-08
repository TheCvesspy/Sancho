import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { narrativeApi } from "@/utils/narrative-api";
import { eventsApi } from "@/utils/events-api";
import { NarrativeHub } from "@/components/narrative/narrative-hub";
import { fetchEventPermissions, resolveModuleAccess } from "@/utils/permissions";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293";

export default async function EventNarrativePage({
    params,
    searchParams
}: {
    params: Promise<{ locale: string; eventId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { locale, eventId } = await params;
    const sp = await searchParams;
    setRequestLocale(locale);

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
    const { canRead, canWrite, isOrgOrSysAdmin } = resolveModuleAccess(profile, permissions, "narrative");

    const t = await getTranslations("common");

    if (!canRead) {
        return (
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">{t("errors.forbidden")}</h2>
                </div>
            </div>
        );
    }

    const includeDeleted = sp.showDeleted === "true" && isOrgOrSysAdmin;

    try {
        const [event, quests, plotlines, plots, factions, items] = await Promise.all([
            eventsApi.getEvent(token, eventId),
            narrativeApi.listQuests(token, eventId, includeDeleted),
            narrativeApi.listPlotlines(token, eventId, includeDeleted),
            narrativeApi.listPlots(token, eventId, includeDeleted),
            narrativeApi.listFactions(token, eventId, includeDeleted),
            narrativeApi.listItems(token, eventId, includeDeleted),
        ]);

        return (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <NarrativeHub
                    event={event}
                    initialQuests={quests}
                    initialPlotlines={plotlines}
                    initialPlots={plots}
                    initialFactions={factions}
                    initialItems={items}
                    canWrite={canWrite}
                    token={token}
                />
            </div>
        );
    } catch (error: any) {
        console.error("Failed to load narrative data:", error);
        const errorMessage = error.message?.startsWith("errors.")
            ? t(error.message as any)
            : error.message || t("errors.general");

        return (
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">{errorMessage}</h2>
                </div>
            </div>
        );
    }
}
