import { Panel } from "@xyflow/react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

export interface GraphFilterState {
    showCharacters: boolean;
    showFactions: boolean;
    showQuests: boolean;
    showDirectRelationships: boolean;
    showFactionMemberships: boolean;
    showQuestParticipations: boolean;
}

interface GraphFiltersProps {
    filters: GraphFilterState;
    onChange: (key: keyof GraphFilterState, value: boolean) => void;
}

export function GraphFilters({ filters, onChange }: GraphFiltersProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <Panel position="top-right">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border rounded-lg shadow-sm p-2 text-xs min-w-[160px]">
                <button
                    className="flex items-center justify-between w-full text-left font-medium text-slate-700 dark:text-slate-200 mb-1"
                    onClick={() => setCollapsed((v) => !v)}
                >
                    <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="h-3 w-3" />
                        Filters
                    </span>
                    {collapsed ? (
                        <ChevronDown className="h-3 w-3" />
                    ) : (
                        <ChevronUp className="h-3 w-3" />
                    )}
                </button>
                {!collapsed && (
                    <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <div className="space-y-1.5 pt-1">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                                Nodes
                            </p>
                            <FilterCheckbox
                                label="Characters"
                                checked={filters.showCharacters}
                                onChange={(v) => onChange("showCharacters", v)}
                            />
                            <FilterCheckbox
                                label="Factions"
                                checked={filters.showFactions}
                                onChange={(v) => onChange("showFactions", v)}
                            />
                            <FilterCheckbox
                                label="Quests"
                                checked={filters.showQuests}
                                onChange={(v) => onChange("showQuests", v)}
                            />
                        </div>
                        <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                                Edges
                            </p>
                            <FilterCheckbox
                                label="Relationships"
                                checked={filters.showDirectRelationships}
                                onChange={(v) => onChange("showDirectRelationships", v)}
                            />
                            <FilterCheckbox
                                label="Faction links"
                                checked={filters.showFactionMemberships}
                                onChange={(v) => onChange("showFactionMemberships", v)}
                            />
                            <FilterCheckbox
                                label="Quest links"
                                checked={filters.showQuestParticipations}
                                onChange={(v) => onChange("showQuestParticipations", v)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
}

function FilterCheckbox({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100">
            <Checkbox
                checked={checked}
                onCheckedChange={(v) => onChange(Boolean(v))}
                className="h-3.5 w-3.5"
            />
            <span>{label}</span>
        </label>
    );
}
