import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { eventsApi } from "@/utils/events-api";
import { EventDetail } from "@/components/events/event-detail";
import { fetchEventPermissions, resolveModuleAccess } from "@/utils/permissions";

import { API_BASE_URL } from "@/lib/api-config";

export default async function EventDetailPage({
    params
}: {
    params: Promise<{ locale: string; eventId: string }>;
}) {
    const { locale, eventId } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("events");

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
    const { canWrite, isOrgOrSysAdmin } = resolveModuleAccess(profile, permissions, "event_management");

    try {
        // Fetch event, stats, and activity in parallel — they are independent.
        const [event, stats, activity] = await Promise.all([
            eventsApi.getEvent(token, eventId),
            eventsApi.getStats(token, eventId),
            eventsApi.getRecentActivity(token, eventId, 20),
        ]);

        return (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <EventDetail
                    event={event}
                    stats={stats}
                    initialActivity={activity}
                    canWrite={canWrite}
                    isOrgOrSysAdmin={isOrgOrSysAdmin}
                    token={token}
                />
            </div>
        );
    } catch (error: any) {
        if (error.message?.includes("404")) return notFound();

        const isForbidden = error.message?.includes("403");

        console.error("Failed to load event detail:", error);
        return (
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">
                        {isForbidden ? t("errors.forbidden.title") : "Error"}
                    </h2>
                    <p className="text-sm">
                        {isForbidden
                            ? t("errors.forbidden.description")
                            : "Failed to fetch event data."}
                    </p>
                </div>
            </div>
        );
    }
}
