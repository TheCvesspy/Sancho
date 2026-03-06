import { Panel } from "@xyflow/react";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const LEGEND_ITEMS = [
    { label: "Ally", color: "#10b981", dashed: false },
    { label: "Enemy", color: "#ef4444", dashed: false },
    { label: "Family", color: "#3b82f6", dashed: false },
    { label: "Romantic", color: "#ec4899", dashed: false },
    { label: "Neutral", color: "#64748b", dashed: false },
    { label: "Faction", color: "#14b8a6", dashed: true },
    { label: "Quest", color: "#f97316", dashed: true },
];

export function GraphLegend() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <Panel position="bottom-right">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border rounded-lg shadow-sm p-2 text-xs min-w-[120px]">
                <button
                    className="flex items-center justify-between w-full text-left font-medium text-slate-700 dark:text-slate-200 mb-1"
                    onClick={() => setCollapsed((v) => !v)}
                >
                    <span>Legend</span>
                    {collapsed ? (
                        <ChevronDown className="h-3 w-3" />
                    ) : (
                        <ChevronUp className="h-3 w-3" />
                    )}
                </button>
                {!collapsed && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-700">
                        {LEGEND_ITEMS.map((item) => (
                            <div key={item.label} className="flex items-center gap-2">
                                <svg width="20" height="8" className="shrink-0">
                                    <line
                                        x1="0"
                                        y1="4"
                                        x2="20"
                                        y2="4"
                                        stroke={item.color}
                                        strokeWidth="2"
                                        strokeDasharray={item.dashed ? "4 2" : undefined}
                                    />
                                </svg>
                                <span className="text-slate-600 dark:text-slate-300">
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Panel>
    );
}
