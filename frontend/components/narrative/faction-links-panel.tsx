"use client";

import { useTranslations } from "next-intl";

interface FactionLinksPanelProps {
    eventId: string;
    factionId: string;
    canWrite: boolean;
    token: string;
}

export function FactionLinksPanel({ eventId, factionId, canWrite, token }: FactionLinksPanelProps) {
    const t = useTranslations("narrative");

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">{t("factions.detail.tabs.links")}</h2>
            <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
                <p>Features coming soon: cross-entity narrative links representation.</p>
            </div>
        </div>
    );
}
