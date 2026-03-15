import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { narrativeApi } from "@/utils/narrative-api";
import { eventsApi } from "@/utils/events-api";
import { LocationDetail } from "@/components/narrative/location-detail";
import { fetchEventPermissions, resolveModuleAccess } from "@/utils/permissions";

import { API_BASE_URL } from "@/lib/api-config";

export default async function LocationDetailPage({
    params
}: {
    params: Promise<{ locale: string; eventId: string; locationId: string }>;
}) {
    const { locale, eventId, locationId } = await params;
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
    const { canWrite } = resolveModuleAccess(profile, permissions, "narrative");

    try {
        const [event, location, documents] = await Promise.all([
            eventsApi.getEvent(token, eventId),
            narrativeApi.getLocation(token, eventId, locationId),
            narrativeApi.listLocationDocuments(token, eventId, locationId)
        ]);

        return (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <LocationDetail
                    event={event}
                    initialLocation={location}
                    initialDocuments={documents}
                    canWrite={canWrite}
                    token={token}
                />
            </div>
        );
    } catch (error) {
        console.error("Failed to load location:", error);
        return (
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">Error loading location. It may have been deleted or you do not have permission to view it.</h2>
                </div>
            </div>
        );
    }
}
