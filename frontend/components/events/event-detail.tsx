"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ChevronLeft, Settings2, ShieldCheck, Activity, LineChart, Users } from "lucide-react";
import { EventDetailDto, EventStatsDto, RecentActivityItemDto } from "@/utils/events-api";
import { EventStatusBadge } from "./event-status-badge";
import { EventStatsPanel } from "./event-stats-panel";
import { RecentActivityFeed } from "./recent-activity-feed";
import { ManagersPanel } from "./managers-panel";
import { PermissionsMatrix } from "./permissions-matrix";
import { EditEventDialog } from "./edit-event-dialog";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import Link from "next/link";

interface EventDetailProps {
    event: EventDetailDto;
    stats: EventStatsDto;
    initialActivity: RecentActivityItemDto[];
    canWrite: boolean;
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function EventDetail({ event, stats, initialActivity, canWrite, isOrgOrSysAdmin, token }: EventDetailProps) {
    const t = useTranslations("events");
    const locale = useLocale();
    const [activeTab, setActiveTab] = useState("overview");

    const formatDateRange = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        return `${s.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })} — ${e.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4">
                <Link
                    href={`/${locale}/events`}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                    <ChevronLeft className="h-4 w-4" />
                    {t("detail.back")}
                </Link>

                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
                            <EventStatusBadge status={event.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                            {event.location && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    <span>{event.location}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDateRange(event.startAt, event.endAt)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {canWrite && (
                            <EditEventDialog event={event} token={token} />
                        )}

                        {isOrgOrSysAdmin && event.status === "active" && (
                            <ConfirmActionDialog
                                eventId={event.id}
                                token={token}
                                action="archive"
                                trigger={
                                    <Button variant="outline" className="text-amber-500 hover:text-amber-600 border-amber-200 hover:bg-amber-50">
                                        {t("actions.archive")}
                                    </Button>
                                }
                            />
                        )}

                        {isOrgOrSysAdmin && event.status === "archived" && (
                            <ConfirmActionDialog
                                eventId={event.id}
                                token={token}
                                action="restore"
                                trigger={
                                    <Button variant="outline">
                                        {t("actions.restore")}
                                    </Button>
                                }
                            />
                        )}

                        {isOrgOrSysAdmin && !event.deletedAt && (
                            <ConfirmActionDialog
                                eventId={event.id}
                                token={token}
                                action="delete"
                                trigger={
                                    <Button variant="outline" className="text-destructive hover:bg-destructive/5">
                                        {t("actions.delete")}
                                    </Button>
                                }
                            />
                        )}

                        {isOrgOrSysAdmin && event.deletedAt && (
                            <ConfirmActionDialog
                                eventId={event.id}
                                token={token}
                                action="undelete"
                                trigger={
                                    <Button variant="outline">
                                        {t("actions.undelete")}
                                    </Button>
                                }
                            />
                        )}
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="overview" className="gap-2">
                        <LineChart className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("detail.tabs.overview")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="managers" className="gap-2">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("detail.tabs.managers")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("detail.tabs.permissions")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("detail.tabs.activity")}</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 mt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <EventStatsPanel stats={stats} />
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                {t("activity.title")}
                            </h3>
                            <RecentActivityFeed items={initialActivity.slice(0, 5)} compact={true} />
                            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setActiveTab("activity")}>
                                View all activity
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="managers" className="mt-6">
                    <ManagersPanel eventId={event.id} token={token} isOrgOrSysAdmin={isOrgOrSysAdmin} />
                </TabsContent>

                <TabsContent value="permissions" className="mt-6">
                    <PermissionsMatrix eventId={event.id} token={token} isOrgOrSysAdmin={isOrgOrSysAdmin} />
                </TabsContent>

                <TabsContent value="activity" className="mt-6">
                    <RecentActivityFeed items={initialActivity} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
