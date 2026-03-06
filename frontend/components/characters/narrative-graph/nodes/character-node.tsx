import { Handle, Position } from "@xyflow/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";
import type { NarrativeRelationshipDto } from "@/utils/characters-api";

const RELATION_BADGE_VARIANT: Record<NarrativeRelationshipDto["type"], "default" | "destructive" | "secondary" | "outline"> = {
    Ally: "default",
    Enemy: "destructive",
    Family: "secondary",
    Romantic: "outline",
    Neutral: "outline",
};

const RELATION_BADGE_CLASS: Record<NarrativeRelationshipDto["type"], string> = {
    Ally: "",
    Enemy: "",
    Family: "",
    Romantic: "border-pink-300 text-pink-700 dark:border-pink-600 dark:text-pink-300",
    Neutral: "",
};

interface CharacterNodeData {
    label: string;
    relationshipType?: NarrativeRelationshipDto["type"];
    expanded?: boolean;
    [key: string]: unknown;
}

export function CharacterNode({ data }: { data: CharacterNodeData }) {
    const relType = data.relationshipType;
    const isExpanded = data.expanded;

    return (
        <div className="relative px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg hover:border-slate-400 dark:hover:border-slate-500 transition-all cursor-pointer min-w-[160px] max-w-[220px]">
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-400 !border-slate-300" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-400 !border-slate-300" />
            <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-400 !border-slate-300" />
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-slate-400 !border-slate-300" />

            <div className="flex items-center gap-2.5">
                <Avatar className="h-9 w-9 border shadow-sm shrink-0">
                    <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase">
                        {data.label.slice(0, 2)}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {data.label}
                    </div>
                    {relType && (
                        <Badge
                            variant={RELATION_BADGE_VARIANT[relType]}
                            className={`mt-1 text-[10px] px-1.5 py-0 ${RELATION_BADGE_CLASS[relType]}`}
                        >
                            {relType}
                        </Badge>
                    )}
                </div>
                <div className="shrink-0 ml-1">
                    {isExpanded ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                        <Plus className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    )}
                </div>
            </div>
        </div>
    );
}
