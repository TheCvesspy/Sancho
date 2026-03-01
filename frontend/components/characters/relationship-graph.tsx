"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    NodeProps,
    Handle,
    Position,
    Node,
    Edge
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CharacterListItemDto, NarrativeRelationshipDto } from "@/utils/characters-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CharacterStatusBadge } from "./character-status-badge";

// Custom Node for Character
function CharacterNode({ data }: { data: any }) {
    const { character, onClick } = data;
    const char = character as CharacterListItemDto;

    return (
        <div
            className="px-4 py-2 shadow-md rounded-md bg-card border-2 border-border cursor-pointer hover:border-primary transition-colors min-w-[150px] max-w-[200px]"
            onClick={() => onClick(char.id)}
        >
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground" />

            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border shadow-sm">
                    <AvatarImage src={char.photoUrl || ""} alt={char.name} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs uppercase">
                        {char.name.slice(0, 2)}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{char.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{char.race}</div>
                </div>
            </div>
            <div className="mt-2 flex justify-end">
                <CharacterStatusBadge status={char.status} className="text-[10px] px-1.5 py-0" />
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-muted-foreground" />
        </div>
    );
}

const nodeTypes = {
    character: CharacterNode,
};

interface RelationshipGraphProps {
    eventId: string;
    centralCharacterId?: string;
    characters: CharacterListItemDto[];
    relationships: NarrativeRelationshipDto[];
}

export function RelationshipGraph({ eventId, centralCharacterId, characters, relationships }: RelationshipGraphProps) {
    const router = useRouter();
    const locale = useLocale();

    // Setup local state for React Flow
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // We add a loading state briefly so we can measure DOM or just let it render naturally
    const [isReady, setIsReady] = useState(false);

    const onNodeClick = useCallback((characterId: string) => {
        router.push(`/${locale}/characters/${eventId}/${characterId}`);
    }, [router, locale, eventId]);

    useEffect(() => {
        // Build nodes
        // Simple grid layout since we don't have a layout engine installed
        // Given that it's just a stub for now, this is adequate.
        const cols = Math.ceil(Math.sqrt(characters.length));

        const initialNodes: Node[] = characters.map((char, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            return {
                id: char.id,
                type: 'character',
                position: { x: col * 250, y: row * 180 },
                data: { character: char, onClick: onNodeClick }
            };
        });

        // Build edges
        const initialEdges: Edge[] = relationships.map((rel, index) => {
            let stroke = '#888';
            if (rel.type === 'Enemy') stroke = '#ef4444'; // red-500
            else if (rel.type === 'Ally') stroke = '#10b981'; // emerald-500
            else if (rel.type === 'Family') stroke = '#3b82f6'; // blue-500

            return {
                id: `edge-${index}`,
                source: centralCharacterId || rel.otherCharacterId, // Fallback if no central char is provided
                target: rel.otherCharacterId,
                label: rel.type,
                animated: rel.type === 'Enemy', // Fun little visual detail
                style: { stroke, strokeWidth: 2 },
                labelStyle: { fill: stroke, fontWeight: 700, fontSize: 12 },
                labelBgStyle: { fill: 'var(--background)', fillOpacity: 0.8 },
            };
        });

        setNodes(initialNodes);
        setEdges(initialEdges);
        setIsReady(true);
    }, [characters, relationships, onNodeClick, setNodes, setEdges]);

    if (!isReady) return <div className="h-full w-full flex items-center justify-center">Loading graph...</div>;

    if (characters.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center p-8 border border-dashed rounded-lg text-muted-foreground">
                No characters available to map in graph.
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background />
                <Controls />
                <MiniMap zoomable pannable nodeClassName={(n) => "bg-primary/20 rounded-md shadow-sm"} />
            </ReactFlow>
        </div>
    );
}
