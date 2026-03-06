"use client";

import ELK, { ElkNode } from "elkjs/lib/elk.bundled.js";
import { useEffect, useMemo, useState } from "react";
import {
    CharacterNarrativeLinksDto,
    NarrativeFactionDto,
    NarrativeQuestDto,
    NarrativeRelationshipDto,
} from "@/utils/characters-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Swords, Scroll, Shield, Sparkles } from "lucide-react";

interface NarrativePanelProps {
    eventName: string;
    characterName: string;
    links: CharacterNarrativeLinksDto;
}

type SampleCharacterNode = {
    id: string;
    name: string;
    relationshipType: NarrativeRelationshipDto["type"];
    description: string;
    factionIds: string[];
    questIds: string[];
};

type SampleQuestNode = NarrativeQuestDto & {
    kind: "Quest" | "Plotline";
    participantIds: string[];
};

type MapNode = {
    id: string;
    label: string;
    subtitle?: string;
    kind: "central" | "character" | "faction" | "quest";
    width: number;
    height: number;
    badge?: string;
};

type MapEdge = {
    id: string;
    from: string;
    to: string;
    colorClass: string;
    dashed?: boolean;
};

type LayoutNode = MapNode & {
    x: number;
    y: number;
};

const RELATION_EDGE_COLOR: Record<NarrativeRelationshipDto["type"], string> = {
    Ally: "stroke-emerald-500",
    Enemy: "stroke-red-500",
    Family: "stroke-blue-500",
    Romantic: "stroke-pink-500",
    Neutral: "stroke-slate-500",
};

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
        role: "Primary Investigator",
        status: "Active",
        kind: "Quest",
        participantIds: ["central", "char-mirek", "char-elenne", "char-lyra"],
    },
    {
        questId: "plotline-blackwater",
        name: "Ashes Under Blackwater",
        role: "Witness",
        status: "In Review",
        kind: "Plotline",
        participantIds: ["central", "char-mirek", "char-varek"],
    },
    {
        questId: "plotline-copper-prince",
        name: "Debt of the Copper Prince",
        role: "Negotiator",
        status: "Completed",
        kind: "Plotline",
        participantIds: ["central", "char-ilya", "char-lyra"],
    },
];

const elk = new ELK();

export function NarrativePanel({ eventName, characterName, links }: NarrativePanelProps) {
    const hasRealData =
        links.relationships.length > 0 || links.factions.length > 0 || links.quests.length > 0;

    const [showCharacters, setShowCharacters] = useState(true);
    const [showFactions, setShowFactions] = useState(true);
    const [showQuests, setShowQuests] = useState(true);
    const [showDirectRelationships, setShowDirectRelationships] = useState(true);
    const [showFactionMemberships, setShowFactionMemberships] = useState(true);
    const [showQuestParticipations, setShowQuestParticipations] = useState(true);

    const relationships: NarrativeRelationshipDto[] = hasRealData
        ? links.relationships
        : SAMPLE_CHARACTERS.map((char) => ({
            otherCharacterId: char.id,
            otherCharacterName: char.name,
            type: char.relationshipType,
            description: char.description,
        }));
    const factions = links.factions.length > 0 ? links.factions : SAMPLE_FACTIONS;
    const quests: NarrativeQuestDto[] = links.quests.length > 0 ? links.quests : SAMPLE_QUEST_NODES;
    const questNodes: SampleQuestNode[] = hasRealData
        ? quests.map((quest) => ({
            ...quest,
            kind: quest.name.toLowerCase().includes("plot") ? "Plotline" : "Quest",
            participantIds: ["central"],
        }))
        : SAMPLE_QUEST_NODES;

    const statusBadgeClass = (status: string) => {
        if (status.toLowerCase() === "completed") return "border-green-300 bg-green-100 text-green-800";
        if (status.toLowerCase().includes("review")) return "border-amber-300 bg-amber-100 text-amber-800";
        return "border-blue-300 bg-blue-100 text-blue-800";
    };

    const mapNodes = useMemo(() => {
        const nodes: MapNode[] = [
            { id: "central", label: characterName, subtitle: "Character", kind: "central", width: 220, height: 78 },
        ];

        if (showCharacters) {
            relationships.forEach((rel) => {
                nodes.push({
                    id: rel.otherCharacterId,
                    label: rel.otherCharacterName,
                    subtitle: rel.type,
                    kind: "character",
                    width: 210,
                    height: 76,
                    badge: rel.type,
                });
            });
        }

        if (showFactions) {
            factions.forEach((faction) => {
                nodes.push({
                    id: faction.factionId,
                    label: faction.name,
                    subtitle: faction.role || "Faction",
                    kind: "faction",
                    width: 220,
                    height: 74,
                });
            });
        }

        if (showQuests) {
            questNodes.forEach((quest) => {
                nodes.push({
                    id: quest.questId,
                    label: quest.name,
                    subtitle: `${quest.kind} - ${quest.status}`,
                    kind: "quest",
                    width: 220,
                    height: 80,
                    badge: quest.kind,
                });
            });
        }

        return nodes;
    }, [characterName, factions, questNodes, relationships, showCharacters, showFactions, showQuests]);

    const mapEdges = useMemo(() => {
        const edges: MapEdge[] = [];

        if (showCharacters && showDirectRelationships) {
            relationships.forEach((rel) => {
                edges.push({
                    id: `central-${rel.otherCharacterId}`,
                    from: "central",
                    to: rel.otherCharacterId,
                    colorClass: RELATION_EDGE_COLOR[rel.type],
                });
            });
        }

        if (showFactionMemberships && showCharacters && showFactions) {
            if (hasRealData) {
                relationships.forEach((rel) => {
                    factions.slice(0, 2).forEach((fac) => {
                        edges.push({
                            id: `${rel.otherCharacterId}-${fac.factionId}`,
                            from: rel.otherCharacterId,
                            to: fac.factionId,
                            colorClass: "stroke-teal-500",
                            dashed: true,
                        });
                    });
                });
            } else {
                SAMPLE_CHARACTERS.forEach((char) => {
                    char.factionIds.forEach((factionId) => {
                        edges.push({
                            id: `${char.id}-${factionId}`,
                            from: char.id,
                            to: factionId,
                            colorClass: "stroke-teal-500",
                            dashed: true,
                        });
                    });
                });
            }
        }

        if (showQuests && showQuestParticipations) {
            questNodes.forEach((quest) => {
                edges.push({
                    id: `central-${quest.questId}`,
                    from: "central",
                    to: quest.questId,
                    colorClass: "stroke-violet-500",
                    dashed: true,
                });
            });
        }

        if (showQuestParticipations && showCharacters && showQuests) {
            if (hasRealData) {
                relationships.forEach((rel) => {
                    questNodes.forEach((quest) => {
                        edges.push({
                            id: `${rel.otherCharacterId}-${quest.questId}`,
                            from: rel.otherCharacterId,
                            to: quest.questId,
                            colorClass: "stroke-orange-500",
                            dashed: true,
                        });
                    });
                });
            } else {
                SAMPLE_CHARACTERS.forEach((char) => {
                    char.questIds.forEach((questId) => {
                        edges.push({
                            id: `${char.id}-${questId}`,
                            from: char.id,
                            to: questId,
                            colorClass: "stroke-orange-500",
                            dashed: true,
                        });
                    });
                });
            }
        }

        const nodeIds = new Set(mapNodes.map((node) => node.id));
        return edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
    }, [
        factions,
        hasRealData,
        mapNodes,
        questNodes,
        relationships,
        showCharacters,
        showDirectRelationships,
        showFactionMemberships,
        showFactions,
        showQuestParticipations,
        showQuests,
    ]);

    const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
    const [isLayouting, setIsLayouting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function runLayout() {
            if (mapNodes.length === 0) {
                setLayoutNodes([]);
                return;
            }

            setIsLayouting(true);
            try {
                const graph: ElkNode = {
                    id: "root",
                    layoutOptions: {
                        "elk.algorithm": "layered",
                        "elk.direction": "DOWN",
                        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
                        "elk.spacing.nodeNode": "44",
                        "elk.layered.spacing.nodeNodeBetweenLayers": "60",
                        "elk.edgeRouting": "ORTHOGONAL",
                        "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
                    },
                    children: mapNodes.map((node) => ({
                        id: node.id,
                        width: node.width,
                        height: node.height,
                    })),
                    edges: mapEdges.map((edge) => ({
                        id: edge.id,
                        sources: [edge.from],
                        targets: [edge.to],
                    })),
                };

                const result = await elk.layout(graph);
                if (cancelled) return;

                const children = (result.children ?? []) as Array<{ id: string; x?: number; y?: number }>;
                const childById = new Map(children.map((child) => [child.id, child]));

                const positioned = mapNodes.map((node, index) => {
                    const layouted = childById.get(node.id);
                    return {
                        ...node,
                        // Add padding margin around the auto-layout result.
                        x: (layouted?.x ?? (index % 4) * 260) + 24,
                        y: (layouted?.y ?? Math.floor(index / 4) * 140) + 24,
                    };
                });

                setLayoutNodes(positioned);
            } catch (error) {
                console.error("ELK layout failed; using fallback grid.", error);
                const fallback = mapNodes.map((node, index) => ({
                    ...node,
                    x: 24 + (index % 4) * 260,
                    y: 24 + Math.floor(index / 4) * 140,
                }));
                if (!cancelled) setLayoutNodes(fallback);
            } finally {
                if (!cancelled) setIsLayouting(false);
            }
        }

        void runLayout();
        return () => {
            cancelled = true;
        };
    }, [mapEdges, mapNodes]);

    const layoutNodeById = useMemo(
        () => new Map(layoutNodes.map((node) => [node.id, node])),
        [layoutNodes]
    );

    const canvasSize = useMemo(() => {
        if (layoutNodes.length === 0) {
            return { width: 1200, height: 620 };
        }

        const maxX = Math.max(...layoutNodes.map((node) => node.x + node.width));
        const maxY = Math.max(...layoutNodes.map((node) => node.y + node.height));

        return {
            width: Math.max(1200, Math.ceil(maxX + 32)),
            height: Math.max(620, Math.ceil(maxY + 32)),
        };
    }, [layoutNodes]);

    return (
        <div className="space-y-6">
            <div className="bg-muted/50 p-4 border rounded-md mb-2 flex items-start gap-4">
                <Scroll className="h-6 w-6 text-muted-foreground mt-0.5" />
                <div>
                    <h3 className="font-semibold">Managed in Narrative Module</h3>
                    <p className="text-sm text-muted-foreground">
                        Factions, relationships, and quests are managed in the Narrative module.
                        This tab provides a read-only consolidated view of how this character connects to the world story.
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Relationships</CardDescription>
                        <CardTitle className="text-2xl">{relationships.length}</CardTitle>
                    </CardHeader>
                </Card>
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
                {/* Relationships */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5 text-indigo-500" />
                            Relationships
                        </CardTitle>
                        <CardDescription>Direct connections to other characters</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {relationships.map((rel, index) => {
                                return (
                                    <li key={index} className="flex flex-col border-b last:border-0 pb-3 last:pb-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium">{rel.otherCharacterName}</span>
                                            <Badge variant={RELATION_BADGE_VARIANT[rel.type]}>
                                                {rel.type}
                                            </Badge>
                                        </div>
                                        {rel.description && (
                                            <p className="text-sm text-muted-foreground">{rel.description}</p>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>

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
                <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Swords className="h-5 w-5 text-amber-500" />
                            Quests & Plotlines
                        </CardTitle>
                        <CardDescription>Involvement in active and historical story elements</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {quests.map((q, index) => (
                                <div key={q.questId || index} className="border rounded-md p-3 hover:border-border/80 transition-colors">
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <h4 className="font-medium line-clamp-1" title={q.name}>{q.name}</h4>
                                        <Badge variant="outline" className={`text-[10px] uppercase ${statusBadgeClass(q.status)}`}>
                                            {q.status}
                                        </Badge>
                                    </div>
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

            <div className="pt-6">
                <Card className="mb-4">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Relationship Map Controls</CardTitle>
                        <CardDescription>Choose which object types and connection types are visible.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={showCharacters} onCheckedChange={(checked) => setShowCharacters(Boolean(checked))} />
                                Characters
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={showFactions} onCheckedChange={(checked) => setShowFactions(Boolean(checked))} />
                                Factions
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={showQuests} onCheckedChange={(checked) => setShowQuests(Boolean(checked))} />
                                Quests/Plotlines
                            </label>
                        </div>
                        <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={showDirectRelationships} onCheckedChange={(checked) => setShowDirectRelationships(Boolean(checked))} />
                                Direct relationships
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={showFactionMemberships} onCheckedChange={(checked) => setShowFactionMemberships(Boolean(checked))} />
                                Faction memberships
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={showQuestParticipations} onCheckedChange={(checked) => setShowQuestParticipations(Boolean(checked))} />
                                Quest participations
                            </label>
                        </div>
                    </CardContent>
                </Card>

                <h3 className="font-semibold text-lg mb-4">Relationship Map Preview</h3>
                <div className="border rounded-lg bg-card/50 p-4 md:p-6">
                    <div className="mx-auto max-w-6xl rounded-md border bg-background/60 overflow-auto">
                        <div
                            className="relative"
                            style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}
                        >
                            {isLayouting && (
                                <Badge variant="outline" className="absolute left-3 top-3 z-20 bg-white/95">
                                    Computing layout...
                                </Badge>
                            )}

                        <svg
                            className="absolute inset-0 h-full w-full"
                            viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
                            preserveAspectRatio="none"
                        >
                            {mapEdges.map((edge) => {
                                const from = layoutNodeById.get(edge.from);
                                const to = layoutNodeById.get(edge.to);
                                if (!from || !to) return null;
                                return (
                                    <line
                                        key={edge.id}
                                        x1={from.x + from.width / 2}
                                        y1={from.y + from.height / 2}
                                        x2={to.x + to.width / 2}
                                        y2={to.y + to.height / 2}
                                        className={`${edge.colorClass} ${edge.dashed ? "stroke-dasharray-[2_2]" : ""}`}
                                        strokeWidth={2}
                                    />
                                );
                            })}
                        </svg>

                        {layoutNodes.map((node) => (
                            <div
                                key={node.id}
                                className="absolute"
                                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                            >
                                <div
                                    className={
                                        node.kind === "central"
                                            ? "min-w-[180px] max-w-[220px] rounded-md border-2 border-indigo-300 bg-indigo-50 px-3 py-2 shadow-sm"
                                            : node.kind === "character"
                                                ? "min-w-[160px] max-w-[210px] rounded-md border border-slate-300 bg-slate-50 px-3 py-2 shadow-sm"
                                                : node.kind === "faction"
                                                    ? "min-w-[170px] max-w-[220px] rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 shadow-sm"
                                                    : "min-w-[170px] max-w-[220px] rounded-md border border-amber-300 bg-amber-50 px-3 py-2 shadow-sm"
                                    }
                                >
                                    <p className="text-sm font-semibold leading-tight">{node.label}</p>
                                    {node.subtitle && (
                                        <p className="text-[11px] text-muted-foreground mt-1">{node.subtitle}</p>
                                    )}
                                    {node.badge && (
                                        <Badge variant="outline" className="mt-2 text-[10px]">
                                            {node.badge}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="absolute left-3 top-14 space-y-1 z-20">
                            <Badge variant="outline" className="bg-white/90">Event: {eventName}</Badge>
                            <Badge variant="outline" className="bg-white/90">Character: {characterName}</Badge>
                        </div>

                        <div className="absolute right-3 bottom-3 space-y-1 text-right">
                            <p className="text-[11px] text-muted-foreground">Line legend</p>
                            <p className="text-[11px] text-emerald-600">Solid: direct relationship</p>
                            <p className="text-[11px] text-teal-600">Dashed teal: faction membership</p>
                            <p className="text-[11px] text-orange-600">Dashed orange: quest participation</p>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
