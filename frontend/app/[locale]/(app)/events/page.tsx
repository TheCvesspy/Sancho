import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { eventsApi } from "@/utils/events-api";
import { EventsList } from "@/components/events/events-list";

import { API_BASE_URL } from "@/lib/api-config";

export default async function EventsPage({
    params,
    searchParams
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { locale } = await params;
    const sp = await searchParams;
    setRequestLocale(locale);
    const t = await getTranslations("events");

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect(`/${locale}/login`);
    }

    // Get user profile for RBAC checks
    const token = session.access_token;
    const userResponse = await fetch(`${API_BASE_URL}/api/user/me`, {
        headers: { "Authorization": `Bearer ${token}` },
        next: { revalidate: 60 }
    });

    if (!userResponse.ok) {
        return <div className="p-10 text-destructive">Error loading user profile.</div>;
    }

    const profile = await userResponse.json();
    const isOrgOrSysAdmin = profile.isSystemAdmin || profile.orgRole === "OrgOwner";

    const includeArchived = sp.status === "archived" || sp.status === "all";
    const includeDeleted = sp.showDeleted === "true" && isOrgOrSysAdmin;

    try {
        const events = await eventsApi.listEvents(token, {
            includeArchived,
            includeDeleted
        });

        return (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <EventsList
                    initialEvents={events}
                    isOrgOrSysAdmin={isOrgOrSysAdmin}
                    token={token}
                />
            </div>
        );
    } catch (error) {
        console.error("Failed to load events:", error);
        return (
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">{t("table.error")}</h2>
                    <p className="text-sm">Failed to fetch events list from API.</p>
                </div>
            </div>
        );
    }
}
