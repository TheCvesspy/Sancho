"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { eventsApi, type EventListItemDto } from "@/utils/events-api";
import {
    setActiveEventCookie,
    clearActiveEventCookie,
} from "@/utils/active-event-cookie";

type ActiveEventContextValue = {
    activeEventId: string | null;
    activeEvent: EventListItemDto | null;
    events: EventListItemDto[];
    setActiveEvent: (eventId: string | null) => void;
    isLoading: boolean;
};

const ActiveEventContext = createContext<ActiveEventContextValue | null>(null);

export function ActiveEventProvider({
    initialEventId,
    children,
}: {
    initialEventId: string | null;
    children: ReactNode;
}) {
    const [activeEventId, setActiveEventId] = useState<string | null>(initialEventId);
    const [events, setEvents] = useState<EventListItemDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const params = useParams();

    // Fetch events on mount
    useEffect(() => {
        async function fetchEvents() {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setIsLoading(false);
                return;
            }

            try {
                const eventList = await eventsApi.listEvents(
                    session.access_token,
                    { includeArchived: false }
                );
                setEvents(eventList);

                // Validate initialEventId against fetched events
                if (activeEventId && !eventList.find((e) => e.id === activeEventId)) {
                    clearActiveEventCookie();
                    setActiveEventId(null);
                }
            } catch (error) {
                console.error("Failed to fetch events for context:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // URL sync: URL is source of truth
    const urlEventId = params?.eventId as string | undefined;
    useEffect(() => {
        if (urlEventId) {
            setActiveEventId((prev) => {
                if (prev !== urlEventId) {
                    setActiveEventCookie(urlEventId);
                    return urlEventId;
                }
                return prev;
            });
        }
    }, [urlEventId]);

    const setActiveEvent = useCallback(
        (eventId: string | null) => {
            setActiveEventId(eventId);
            if (eventId) {
                setActiveEventCookie(eventId);
            } else {
                clearActiveEventCookie();
            }
        },
        []
    );

    const activeEvent = events.find((e) => e.id === activeEventId) ?? null;

    return (
        <ActiveEventContext.Provider
            value={{ activeEventId, activeEvent, events, setActiveEvent, isLoading }}
        >
            {children}
        </ActiveEventContext.Provider>
    );
}

export function useActiveEvent(): ActiveEventContextValue {
    const context = useContext(ActiveEventContext);
    if (!context) {
        throw new Error("useActiveEvent must be used within ActiveEventProvider");
    }
    return context;
}
