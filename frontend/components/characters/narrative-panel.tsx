"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
    CharacterNarrativeLinksDto,
    NarrativeFactionDto,
    NarrativeQuestDto,
    NarrativeRelationshipDto,
} from "@/utils/characters-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, Scroll, Shield, Sparkles } from "lucide-react";
import type { SampleCharacterNode, SampleQuestNode } from "./narrative-graph/types";

const NarrativeGraph = dynamic(
    () => import("./narrative-graph/narrative-graph").then((m) => ({ default: m.NarrativeGraph })),
    {
        ssr: false,
        loading: () => (
            <div className="h-[600px] w-full border rounded-lg bg-card/50 flex items-center justify-center">
                <div className="text-muted-foreground text-sm">Loading relationship map…</div>
            </div>
        ),
    }
);

interface NarrativePanelProps {
    eventName: string;
    characterName: string;
    links: CharacterNarrativeLinksDto;
}

const RELATION_BADGE_VARIANT: Record<NarrativeRelationshipDto["type"], "default" | "destructive" | "secondary" | "outline"> = {
    Ally: "default",
    Enemy: "destructive",
    Family: "secondary",
    Romantic: "outline",
    Neutral: "outline",
};

const SAMPLE_CHARACTERS: SampleCharacterNode[] = [
    {
        id: "char-mirek",
        name: "Captain Mirek Thorn",
        relationshipType: "Ally",
        description: "Trusted field commander and long-time tactical partner.",
        factionIds: ["fac-amber-banner"],
        questIds: ["quest-silent-reliquary", "plotline-blackwater"],
    },
    {
        id: "char-ilya",
        name: "Ilya the Whisper",
        relationshipType: "Enemy",
        description: "Competing over control of the Eastern trade corridor.",
        factionIds: ["fac-gilded-hand", "fac-night-market"],
        questIds: ["plotline-copper-prince"],
    },
    {
        id: "char-elenne",
        name: "Sister Elenne",
        relationshipType: "Family",
        description: "Half-sister; relationship strained by conflicting vows.",
        factionIds: ["fac-ashen-lanterns"],
        questIds: ["quest-silent-reliquary"],
    },
    {
        id: "char-varek",
        name: "Varek of the Reed",
        relationshipType: "Neutral",
        description: "Fixer and informant; loyalty follows coin.",
        factionIds: ["fac-night-market"],
        questIds: ["plotline-blackwater"],
    },
    {
        id: "char-lyra",
        name: "Archivist Lyra Den",
        relationshipType: "Romantic",
        description: "Former partner; currently discreet allies in research.",
        factionIds: ["fac-sapphire-archive"],
        questIds: ["quest-silent-reliquary", "plotline-copper-prince"],
    },
];

const SAMPLE_FACTIONS: NarrativeFactionDto[] = [
    { factionId: "fac-amber-banner", name: "Amber Banner Company", role: "Quartermaster" },
    { factionId: "fac-ashen-lanterns", name: "Order of Ashen Lanterns", role: "Probationary Member" },
    { factionId: "fac-gilded-hand", name: "The Gilded Hand", role: "Opposition Contact" },
    { factionId: "fac-night-market", name: "Night Market Syndicate", role: "Informant Network" },
    { factionId: "fac-sapphire-archive", name: "Sapphire Archive", role: "Research Liaison" },
];

const SAMPLE_QUEST_NODES: SampleQuestNode[] = [
    {
        questId: "quest-silent-reliquary",
        name: "The Silent Reliquary",
        shortDescription: "Recover the relic before rival factions discover its location.",
        role: "Primary Investigator",
        status: "Active",
        kind: "Quest",
        participantIds: ["central", "char-mirek", "char-elenne", "char-lyra"],
    },
    {
        questId: "plotline-blackwater",
        name: "Ashes Under Blackwater",
        shortDescription: "Trace the missing convoy and identify who controls the route.",
        role: "Witness",
        status: "In Review",
        kind: "Plotline",
        participantIds: ["central", "char-mirek", "char-varek"],
    },
    {
        questId: "plotline-copper-prince",
        name: "Debt of the Copper Prince",
        shortDescription: "Negotiate terms to prevent open conflict in the market district.",
        role: "Negotiator",
        status: "Completed",
        kind: "Plotline",
        participantIds: ["central", "char-ilya", "char-lyra"],
    },
];

export function NarrativePanel({ eventName, characterName, links }: NarrativePanelProps) {
    const hasRealData =
        links.relationships.length > 0 || links.factions.length > 0 || links.quests.length > 0;

    const relationships: NarrativeRelationshipDto[] = hasRealData
        ? links.relationships
        : SAMPLE_CHARACTERS.map((char) => ({
            otherCharacterId: char.id,
            otherCharacterName: char.name,
            type: char.relationshipType,
            description: char.description,
        }));
    const factions = hasRealData ? links.factions : SAMPLE_FACTIONS;
    const quests: NarrativeQuestDto[] = hasRealData ? links.quests : SAMPLE_QUEST_NODES;
    const questNodes: SampleQuestNode[] = useMemo(() => {
        if (hasRealData) {
            return quests.map((quest) => ({
                ...quest,
                kind: (quest.name.toLowerCase().includes("plot") ? "Plotline" : "Quest") as "Quest" | "Plotline",
                participantIds: ["central"],
            }));
        }
        return SAMPLE_QUEST_NODES;
    }, [hasRealData, quests]);

    const statusBadgeClass = (status: string) => {
        if (status.toLowerCase() === "completed") return "border-green-300 bg-green-100 text-green-800";
        if (status.toLowerCase().includes("review")) return "border-amber-300 bg-amber-100 text-amber-800";
        return "border-blue-300 bg-blue-100 text-blue-800";
    };

    return (
        <div className="space-y-6">
            <div className="bg-muted/50 p-4 border rounded-md mb-2 flex items-start gap-4">
                <Scroll className="h-6 w-6 text-muted-foreground mt-0.5" />
                <div>
                    <h3 className="font-semibold">Managed in Narrative Module</h3>
                    <p className="text-sm text-muted-foreground">
                        Factions and quests are managed in the Narrative module.
                        This section provides a read-only consolidated view of how this character connects to the world story.
                    </p>
                </div>
            </div>

            {!hasRealData && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-3 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 mt-0.5" />
                    <p className="text-sm">
                        Preview mode is active for this character. The cards below are mock data for visualization until
                        Narrative links are connected.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Factions</CardDescription>
                        <CardTitle className="text-2xl">{factions.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Quests & Plotlines</CardDescription>
                        <CardTitle className="text-2xl">{quests.length}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Factions */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Shield className="h-5 w-5 text-emerald-500" />
                            Factions
                        </CardTitle>
                        <CardDescription>Affiliations and standing within groups</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {factions.map((fac, index) => (
                                <li key={fac.factionId || index} className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
                                    <span className="font-medium">{fac.name}</span>
                                    {fac.role && <Badge variant="outline">{fac.role}</Badge>}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Quests */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Swords className="h-5 w-5 text-amber-500" />
                            Quests & Plotlines
                        </CardTitle>
                        <CardDescription>Involvement in active and historical story elements</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            {quests.map((q, index) => (
                                <div key={q.questId || index} className="border rounded-md p-3 hover:border-border/80 transition-colors">
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <h4 className="font-medium line-clamp-1" title={q.name}>{q.name}</h4>
                                        <Badge variant="outline" className={`text-[10px] uppercase ${statusBadgeClass(q.status)}`}>
                                            {q.status}
                                        </Badge>
                                    </div>
                                    {q.shortDescription && (
                                        <p className="text-xs text-muted-foreground line-clamp-2" title={q.shortDescription}>
                                            {q.shortDescription}
                                        </p>
                                    )}
                                    {q.role && (
                                        <div className="flex items-center mt-2 pt-2 border-t text-xs text-muted-foreground">
                                            <span className="font-medium mr-1">Role:</span> {q.role}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Interactive Relationship Map */}
            <div className="pt-6">
                <h3 className="font-semibold text-lg mb-4">Relationship Map</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Click nodes to expand their connections. Drag to pan, scroll to zoom. Use filters (top-right) to toggle visibility.
                </p>
                <NarrativeGraph
                    characterName={characterName}
                    eventName={eventName}
                    relationships={relationships}
                    factions={factions}
                    questNodes={questNodes}
                    sampleCharacters={SAMPLE_CHARACTERS}
                    items={links.items}
                    hasRealData={hasRealData}
                />
            </div>
        </div>
    );
}
