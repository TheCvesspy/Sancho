import { setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { eventsApi } from "@/utils/events-api";
import { ACTIVE_EVENT_COOKIE_NAME } from "@/utils/active-event-cookie";
import { CharacterLanding } from "@/components/characters/character-landing";

export default async function CharactersLandingPage({
    params
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect(`/${locale}/login`);
    }

    // Redirect to event-scoped page if an active event is set
    const cookieStore = await cookies();
    const activeEventId = cookieStore.get(ACTIVE_EVENT_COOKIE_NAME)?.value;
    if (activeEventId) {
        redirect(`/${locale}/characters/${activeEventId}`);
    }

    // Fetch available events for the selector
    const token = session.access_token;

    let events: any[] = [];
    try {
        events = await eventsApi.listEvents(token, { includeArchived: false });
    } catch (error) {
        console.error("Failed to fetch events for character landing:", error);
    }

    return (
        <div className="flex h-[calc(100vh-60px)] w-full items-center justify-center p-4">
            <CharacterLanding events={events} />
        </div>
    );
}
