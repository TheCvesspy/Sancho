import { useEffect, useRef, useCallback } from "react";
import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCenter,
    forceCollide,
    forceX,
    forceY,
    type SimulationNodeDatum,
    type SimulationLinkDatum,
} from "d3-force";
import type { Node, Edge } from "@xyflow/react";

interface SimNode extends SimulationNodeDatum {
    id: string;
    /** If set, node is pinned here (user-dragged or central). */
    fx?: number | null;
    fy?: number | null;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
    source: string | SimNode;
    target: string | SimNode;
}

interface UseForceLayoutOptions {
    /** Center x of the simulation canvas */
    centerX?: number;
    /** Center y of the simulation canvas */
    centerY?: number;
    /** Repulsion strength between nodes (negative = repel) */
    chargeStrength?: number;
    /** Desired distance between linked nodes */
    linkDistance?: number;
    /** Collision radius to prevent overlap */
    collideRadius?: number;
    /** Number of warm-start ticks (synchronous) before rendering */
    warmUpTicks?: number;
}

const DEFAULT_OPTIONS: Required<UseForceLayoutOptions> = {
    centerX: 0,
    centerY: 0,
    chargeStrength: -500,
    linkDistance: 180,
    collideRadius: 90,
    warmUpTicks: 80,
};

/**
 * Applies a d3-force simulation to position ReactFlow nodes.
 *
 * - The central node (id === "central") is pinned at center.
 * - User-dragged nodes get pinned at their drop position.
 * - When nodes/edges change (expand), the simulation re-runs
 *   while preserving existing node positions.
 */
export function useForceLayout(
    nodes: Node[],
    edges: Edge[],
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    options?: UseForceLayoutOptions
) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const simulationRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
    const isInitializedRef = useRef(false);

    // Track which nodes the user has dragged (pinned)
    const pinnedNodesRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    useEffect(() => {
        if (nodes.length === 0) return;

        // Build simulation nodes, preserving existing positions where available
        const simNodes: SimNode[] = nodes.map((n) => {
            const pinned = pinnedNodesRef.current.get(n.id);
            const isCentral = n.id === "central";

            return {
                id: n.id,
                x: pinned?.x ?? n.position.x ?? opts.centerX,
                y: pinned?.y ?? n.position.y ?? opts.centerY,
                // Pin central node and any user-dragged nodes
                fx: isCentral ? opts.centerX : pinned ? pinned.x : undefined,
                fy: isCentral ? opts.centerY : pinned ? pinned.y : undefined,
            };
        });

        // Build simulation links
        const simLinks: SimLink[] = edges
            .filter((e) => {
                // Only include links where both source and target exist in nodes
                const sourceExists = simNodes.some((n) => n.id === e.source);
                const targetExists = simNodes.some((n) => n.id === e.target);
                return sourceExists && targetExists;
            })
            .map((e) => ({
                source: e.source,
                target: e.target,
            }));

        // Stop any existing simulation
        if (simulationRef.current) {
            simulationRef.current.stop();
        }

        const simulation = forceSimulation<SimNode>(simNodes)
            .force(
                "link",
                forceLink<SimNode, SimLink>(simLinks)
                    .id((d) => d.id)
                    .distance(opts.linkDistance)
                    .strength(0.5)
            )
            .force("charge", forceManyBody<SimNode>().strength(opts.chargeStrength))
            .force("center", forceCenter<SimNode>(opts.centerX, opts.centerY).strength(0.1))
            .force("collide", forceCollide<SimNode>().radius(opts.collideRadius).strength(0.7))
            // Gentle pull toward center on each axis to prevent drift
            .force("x", forceX<SimNode>(opts.centerX).strength(0.05))
            .force("y", forceY<SimNode>(opts.centerY).strength(0.05))
            .alphaDecay(0.02);

        simulationRef.current = simulation;

        // Warm-start: run ticks synchronously to get a good initial layout
        if (!isInitializedRef.current) {
            simulation.tick(opts.warmUpTicks);
            isInitializedRef.current = true;
        } else {
            // For expansions, run fewer warm-up ticks
            simulation.alpha(0.5).tick(40);
        }

        // Apply positions immediately after warm-up
        const applyPositions = () => {
            setNodes((currentNodes) =>
                currentNodes.map((node) => {
                    const simNode = simNodes.find((sn) => sn.id === node.id);
                    if (!simNode) return node;
                    return {
                        ...node,
                        position: {
                            x: simNode.x ?? node.position.x,
                            y: simNode.y ?? node.position.y,
                        },
                    };
                })
            );
        };

        applyPositions();

        // Continue simulation with animation ticks
        simulation.on("tick", () => {
            applyPositions();
        });

        // Stop after stabilizing
        simulation.on("end", () => {
            // Simulation has stabilized
        });

        return () => {
            simulation.stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes.length, edges.length, nodes.map((n) => n.id).join(","), edges.map((e) => e.id).join(",")]);

    /**
     * Call this when a user finishes dragging a node.
     * Pins the node at its new position in the simulation.
     */
    const onNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            pinnedNodesRef.current.set(node.id, {
                x: node.position.x,
                y: node.position.y,
            });

            // Update the simulation's node fx/fy
            const sim = simulationRef.current;
            if (sim) {
                const simNode = sim.nodes().find((n) => n.id === node.id);
                if (simNode) {
                    simNode.fx = node.position.x;
                    simNode.fy = node.position.y;
                }
            }
        },
        []
    );

    /**
     * Call this to unpin a node (double-click to release).
     */
    const unpinNode = useCallback((nodeId: string) => {
        pinnedNodesRef.current.delete(nodeId);

        const sim = simulationRef.current;
        if (sim) {
            const simNode = sim.nodes().find((n) => n.id === nodeId);
            if (simNode && nodeId !== "central") {
                simNode.fx = null;
                simNode.fy = null;
                sim.alpha(0.3).restart();
            }
        }
    }, []);

    return { onNodeDragStop, unpinNode };
}
