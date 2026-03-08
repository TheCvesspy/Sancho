"use client";

import { useCallback, useMemo, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
    NarrativeRelationshipDto,
    NarrativeFactionDto,
    NarrativeQuestDto,
} from "@/utils/characters-api";

import { CentralNode } from "./nodes/central-node";
import { CharacterNode } from "./nodes/character-node";
import { FactionNode } from "./nodes/faction-node";
import { QuestNode } from "./nodes/quest-node";
import { GraphLegend } from "./graph-legend";
import { GraphFilters, type GraphFilterState } from "./graph-filters";
import { useForceLayout } from "./use-force-layout";
import type { SampleCharacterNode, SampleQuestNode } from "./types";

// --- Edge color map ---

const RELATION_EDGE_COLOR: Record<NarrativeRelationshipDto["type"], string> = {
    Ally: "#10b981",
    Enemy: "#ef4444",
    Family: "#3b82f6",
    Romantic: "#ec4899",
    Neutral: "#64748b",
};

// --- Register custom node types ---

const nodeTypes = {
    central: CentralNode,
    character: CharacterNode,
    faction: FactionNode,
    quest: QuestNode,
};

// --- Props ---

interface NarrativeGraphProps {
    characterName: string;
    eventName: string;
    relationships: NarrativeRelationshipDto[];
    factions: NarrativeFactionDto[];
    questNodes: SampleQuestNode[];
    sampleCharacters: SampleCharacterNode[];
    hasRealData: boolean;
}

// --- Helpers to build initial nodes/edges ---

function buildInitialNodes(
    characterName: string,
    relationships: NarrativeRelationshipDto[],
    factions: NarrativeFactionDto[],
    questNodes: SampleQuestNode[]
): Node[] {
    const nodes: Node[] = [
        {
            id: "central",
            type: "central",
            position: { x: 0, y: 0 },
            data: { label: characterName },
            draggable: true,
        },
    ];

    // Direct relationship characters
    relationships.forEach((rel, i) => {
        const angle = (2 * Math.PI * i) / relationships.length;
        nodes.push({
            id: rel.otherCharacterId,
            type: "character",
            position: {
                x: Math.cos(angle) * 250,
                y: Math.sin(angle) * 250,
            },
            data: {
                label: rel.otherCharacterName,
                relationshipType: rel.type,
                expanded: false,
            },
            draggable: true,
        });
    });

    // Factions the central character belongs to
    factions.forEach((fac, i) => {
        const angle = (2 * Math.PI * i) / factions.length + Math.PI / 6;
        nodes.push({
            id: fac.factionId,
            type: "faction",
            position: {
                x: Math.cos(angle) * 350,
                y: Math.sin(angle) * 350,
            },
            data: {
                label: fac.name,
                role: fac.role,
                expanded: false,
            },
            draggable: true,
        });
    });

    // Quests the central character is involved in
    questNodes.forEach((quest, i) => {
        const angle = (2 * Math.PI * i) / questNodes.length + Math.PI / 3;
        nodes.push({
            id: quest.questId,
            type: "quest",
            position: {
                x: Math.cos(angle) * 400,
                y: Math.sin(angle) * 400,
            },
            data: {
                label: quest.name,
                questKind: quest.kind,
                status: quest.status,
                expanded: false,
            },
            draggable: true,
        });
    });

    return nodes;
}

function buildInitialEdges(
    relationships: NarrativeRelationshipDto[],
    factions: NarrativeFactionDto[],
    questNodes: SampleQuestNode[],
    sampleCharacters: SampleCharacterNode[]
): Edge[] {
    const edges: Edge[] = [];

    // Central → characters (direct relationships)
    relationships.forEach((rel) => {
        const color = RELATION_EDGE_COLOR[rel.type];
        edges.push({
            id: `central-${rel.otherCharacterId}`,
            source: "central",
            target: rel.otherCharacterId,
            label: rel.type,
            animated: rel.type === "Enemy",
            style: { stroke: color, strokeWidth: 2 },
            labelStyle: { fill: color, fontWeight: 600, fontSize: 10 },
            labelBgStyle: { fill: "white", fillOpacity: 0.85 },
            type: "default",
            data: { edgeKind: "relationship" },
        });
    });

    // Central → factions (membership)
    factions.forEach((fac) => {
        edges.push({
            id: `central-${fac.factionId}`,
            source: "central",
            target: fac.factionId,
            style: { stroke: "#14b8a6", strokeWidth: 1.5, strokeDasharray: "6 3" },
            type: "default",
            data: { edgeKind: "faction" },
        });
    });

    // Central → quests (participation)
    questNodes.forEach((quest) => {
        edges.push({
            id: `central-${quest.questId}`,
            source: "central",
            target: quest.questId,
            style: { stroke: "#f97316", strokeWidth: 1.5, strokeDasharray: "6 3" },
            type: "default",
            data: { edgeKind: "quest" },
        });
    });

    // Character → faction memberships (from sample data cross-references)
    sampleCharacters.forEach((char) => {
        char.factionIds.forEach((factionId) => {
            // Only add if both nodes exist
            if (
                factions.some((f) => f.factionId === factionId) &&
                relationships.some((r) => r.otherCharacterId === char.id)
            ) {
                edges.push({
                    id: `${char.id}-${factionId}`,
                    source: char.id,
                    target: factionId,
                    style: { stroke: "#14b8a6", strokeWidth: 1, strokeDasharray: "4 2" },
                    type: "default",
                    data: { edgeKind: "faction" },
                });
            }
        });
    });

    // Character → quest participations (from sample data cross-references)
    sampleCharacters.forEach((char) => {
        char.questIds.forEach((questId) => {
            if (
                questNodes.some((q) => q.questId === questId) &&
                relationships.some((r) => r.otherCharacterId === char.id)
            ) {
                edges.push({
                    id: `${char.id}-${questId}`,
                    source: char.id,
                    target: questId,
                    style: { stroke: "#f97316", strokeWidth: 1, strokeDasharray: "4 2" },
                    type: "default",
                    data: { edgeKind: "quest" },
                });
            }
        });
    });

    return edges;
}

// --- Main Component ---

export function NarrativeGraph({
    characterName,
    relationships,
    factions,
    questNodes,
    sampleCharacters,
}: NarrativeGraphProps) {
    // Build initial graph data
    const initialNodes = useMemo(
        () => buildInitialNodes(characterName, relationships, factions, questNodes),
        [characterName, relationships, factions, questNodes]
    );

    const initialEdges = useMemo(
        () => buildInitialEdges(relationships, factions, questNodes, sampleCharacters),
        [relationships, factions, questNodes, sampleCharacters]
    );

    // ReactFlow state
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Track which nodes have been expanded
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set(["central"]));

    // Filter state
    const [filters, setFilters] = useState<GraphFilterState>({
        showCharacters: true,
        showFactions: true,
        showQuests: true,
        showDirectRelationships: true,
        showFactionMemberships: true,
        showQuestParticipations: true,
    });

    // Force layout
    const { onNodeDragStop } = useForceLayout(nodes, edges, setNodes);

    // Apply filters: compute visible nodes/edges
    const filteredNodes = useMemo(() => {
        return nodes.map((node) => {
            let hidden = false;
            if (node.type === "character" && !filters.showCharacters) hidden = true;
            if (node.type === "faction" && !filters.showFactions) hidden = true;
            if (node.type === "quest" && !filters.showQuests) hidden = true;
            return { ...node, hidden };
        });
    }, [nodes, filters.showCharacters, filters.showFactions, filters.showQuests]);

    const filteredEdges = useMemo(() => {
        const visibleNodeIds = new Set(filteredNodes.filter((n) => !n.hidden).map((n) => n.id));

        return edges.map((edge) => {
            const edgeKind = (edge.data as { edgeKind?: string })?.edgeKind;
            let hidden = false;

            // Hide if source or target is hidden
            if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) {
                hidden = true;
            }

            // Hide by edge type filter
            if (edgeKind === "relationship" && !filters.showDirectRelationships) hidden = true;
            if (edgeKind === "faction" && !filters.showFactionMemberships) hidden = true;
            if (edgeKind === "quest" && !filters.showQuestParticipations) hidden = true;

            return { ...edge, hidden };
        });
    }, [
        edges,
        filteredNodes,
        filters.showDirectRelationships,
        filters.showFactionMemberships,
        filters.showQuestParticipations,
    ]);

    const handleFilterChange = useCallback((key: keyof GraphFilterState, value: boolean) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    }, []);

    // --- Expand-on-click logic ---

    const expandNode = useCallback(
        (nodeId: string) => {
            if (expandedNodes.has(nodeId)) return;

            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];

            // Find the clicked node's current position for placing new nodes nearby
            const clickedNode = nodes.find((n) => n.id === nodeId);
            const baseX = clickedNode?.position.x ?? 0;
            const baseY = clickedNode?.position.y ?? 0;

            const existingNodeIds = new Set(nodes.map((n) => n.id));

            if (nodeId.startsWith("char-")) {
                // Character node: expand to show their factions and quests
                const charData = sampleCharacters.find((c) => c.id === nodeId);
                if (charData) {
                    charData.factionIds.forEach((factionId, i) => {
                        if (!existingNodeIds.has(factionId)) {
                            const faction = factions.find((f) => f.factionId === factionId);
                            if (faction) {
                                newNodes.push({
                                    id: factionId,
                                    type: "faction",
                                    position: {
                                        x: baseX + (i + 1) * 100,
                                        y: baseY + 150,
                                    },
                                    data: {
                                        label: faction.name,
                                        role: faction.role,
                                        expanded: false,
                                    },
                                    draggable: true,
                                });
                                existingNodeIds.add(factionId);
                            }
                        }
                        // Add edge: character → faction (if not already present)
                        const edgeId = `${nodeId}-${factionId}`;
                        if (!edges.some((e) => e.id === edgeId)) {
                            newEdges.push({
                                id: edgeId,
                                source: nodeId,
                                target: factionId,
                                style: { stroke: "#14b8a6", strokeWidth: 1, strokeDasharray: "4 2" },
                                type: "default",
                                data: { edgeKind: "faction" },
                            });
                        }
                    });

                    charData.questIds.forEach((questId, i) => {
                        if (!existingNodeIds.has(questId)) {
                            const quest = questNodes.find((q) => q.questId === questId);
                            if (quest) {
                                newNodes.push({
                                    id: questId,
                                    type: "quest",
                                    position: {
                                        x: baseX - (i + 1) * 100,
                                        y: baseY + 150,
                                    },
                                    data: {
                                        label: quest.name,
                                        questKind: quest.kind,
                                        status: quest.status,
                                        expanded: false,
                                    },
                                    draggable: true,
                                });
                                existingNodeIds.add(questId);
                            }
                        }
                        const edgeId = `${nodeId}-${questId}`;
                        if (!edges.some((e) => e.id === edgeId)) {
                            newEdges.push({
                                id: edgeId,
                                source: nodeId,
                                target: questId,
                                style: { stroke: "#f97316", strokeWidth: 1, strokeDasharray: "4 2" },
                                type: "default",
                                data: { edgeKind: "quest" },
                            });
                        }
                    });
                }
            } else if (nodeId.startsWith("fac-")) {
                // Faction node: expand to show other member characters
                const members = sampleCharacters.filter((c) => c.factionIds.includes(nodeId));
                members.forEach((member, i) => {
                    if (!existingNodeIds.has(member.id)) {
                        newNodes.push({
                            id: member.id,
                            type: "character",
                            position: {
                                x: baseX + (i - members.length / 2) * 120,
                                y: baseY + 150,
                            },
                            data: {
                                label: member.name,
                                relationshipType: member.relationshipType,
                                expanded: false,
                            },
                            draggable: true,
                        });
                        existingNodeIds.add(member.id);
                    }
                    const edgeId = `${member.id}-${nodeId}`;
                    if (!edges.some((e) => e.id === edgeId)) {
                        newEdges.push({
                            id: edgeId,
                            source: member.id,
                            target: nodeId,
                            style: { stroke: "#14b8a6", strokeWidth: 1, strokeDasharray: "4 2" },
                            type: "default",
                            data: { edgeKind: "faction" },
                        });
                    }
                });
            } else if (nodeId.startsWith("quest-") || nodeId.startsWith("plotline-")) {
                // Quest node: expand to show participants
                const quest = questNodes.find((q) => q.questId === nodeId);
                if (quest) {
                    quest.participantIds.forEach((participantId, i) => {
                        if (participantId === "central") return; // Already in graph
                        if (!existingNodeIds.has(participantId)) {
                            const charData = sampleCharacters.find((c) => c.id === participantId);
                            if (charData) {
                                newNodes.push({
                                    id: participantId,
                                    type: "character",
                                    position: {
                                        x: baseX + (i - quest.participantIds.length / 2) * 120,
                                        y: baseY + 150,
                                    },
                                    data: {
                                        label: charData.name,
                                        relationshipType: charData.relationshipType,
                                        expanded: false,
                                    },
                                    draggable: true,
                                });
                                existingNodeIds.add(participantId);
                            }
                        }
                        const edgeId = `${participantId}-${nodeId}`;
                        if (!edges.some((e) => e.id === edgeId)) {
                            newEdges.push({
                                id: edgeId,
                                source: participantId,
                                target: nodeId,
                                style: { stroke: "#f97316", strokeWidth: 1, strokeDasharray: "4 2" },
                                type: "default",
                                data: { edgeKind: "quest" },
                            });
                        }
                    });
                }
            }

            // Update state
            if (newNodes.length > 0 || newEdges.length > 0) {
                setNodes((prev) => [...prev, ...newNodes]);
                setEdges((prev) => [...prev, ...newEdges]);
            }

            // Mark the node as expanded
            setExpandedNodes((prev) => {
                const next = new Set(prev);
                next.add(nodeId);
                return next;
            });

            // Update the node's data to show expanded state
            setNodes((prev) =>
                prev.map((n) =>
                    n.id === nodeId ? { ...n, data: { ...n.data, expanded: true } } : n
                )
            );
        },
        [expandedNodes, nodes, edges, sampleCharacters, factions, questNodes, setNodes, setEdges]
    );

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            expandNode(node.id);
        },
        [expandNode]
    );

    return (
        <div className="h-[600px] w-full border rounded-lg bg-card/50 overflow-hidden">
            <ReactFlow
                nodes={filteredNodes}
                edges={filteredEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.15}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                    type: "default",
                }}
            >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d1d5db" />
                <Controls showInteractive={false} />
                <MiniMap
                    zoomable
                    pannable
                    nodeClassName={(node) => {
                        if (node.type === "central") return "fill-indigo-300";
                        if (node.type === "faction") return "fill-teal-300";
                        if (node.type === "quest") return "fill-amber-300";
                        return "fill-slate-300";
                    }}
                    className="!bg-white/80 dark:!bg-slate-900/80"
                />
                <GraphFilters filters={filters} onChange={handleFilterChange} />
                <GraphLegend />
            </ReactFlow>
        </div>
    );
}
