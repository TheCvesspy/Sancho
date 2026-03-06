import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { narrativeApi } from "@/utils/narrative-api";
import { eventsApi } from "@/utils/events-api";
import { FactionDetail } from "@/components/narrative/faction-detail";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293";

export default async function FactionDetailPage({
    params
}: {
    params: Promise<{ locale: string; eventId: string; factionId: string }>;
}) {
    const { locale, eventId, factionId } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("narrative");

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect(`/${locale}/login`);
    }

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

    try {
        const [event, faction, members, relationships, documents] = await Promise.all([
            eventsApi.getEvent(token, eventId),
            narrativeApi.getFaction(token, eventId, factionId),
            narrativeApi.listFactionMembers(token, eventId, factionId),
            narrativeApi.listFactionRelationships(token, eventId, factionId),
            narrativeApi.listFactionDocuments(token, eventId, factionId)
        ]);

        return (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <FactionDetail
                    event={event}
                    initialFaction={faction}
                    initialMembers={members}
                    initialRelationships={relationships}
                    initialDocuments={documents}
                    isOrgOrSysAdmin={isOrgOrSysAdmin}
                    token={token}
                />
            </div>
        );
    } catch (error) {
        console.error("Failed to load faction:", error);
        return (
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
                    <h2 className="font-semibold mb-2">Error loading faction. It may have been deleted or you do not have permission to view it.</h2>
                </div>
            </div>
        );
    }
}
