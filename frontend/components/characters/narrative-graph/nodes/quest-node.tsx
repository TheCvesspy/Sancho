import { Handle, Position } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Scroll, Swords, Plus, Check } from "lucide-react";

interface QuestNodeData {
    label: string;
    questKind?: "Quest" | "Plotline";
    status?: string;
    expanded?: boolean;
    [key: string]: unknown;
}

const STATUS_CLASS: Record<string, string> = {
    active: "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-600 dark:bg-blue-900/50 dark:text-blue-300",
    "in review": "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-300",
    completed: "border-green-300 bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-900/50 dark:text-green-300",
};

function getStatusClass(status: string): string {
    const key = status.toLowerCase();
    return STATUS_CLASS[key] || STATUS_CLASS["active"];
}

export function QuestNode({ data }: { data: QuestNodeData }) {
    const isExpanded = data.expanded;
    const isPlotline = data.questKind === "Plotline";
    const Icon = isPlotline ? Swords : Scroll;

    return (
        <div className="relative px-3 py-2.5 rounded-lg border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/60 shadow-md hover:shadow-lg hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer min-w-[170px] max-w-[230px]">
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-amber-400 !border-amber-300" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-amber-400 !border-amber-300" />
            <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-amber-400 !border-amber-300" />
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-amber-400 !border-amber-300" />

            <div className="flex items-center gap-2.5">
                <div className="shrink-0 h-8 w-8 rounded-md bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-amber-900 dark:text-amber-100 truncate">
                        {data.label}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        {data.questKind && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300">
                                {data.questKind}
                            </Badge>
                        )}
                        {data.status && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusClass(data.status)}`}>
                                {data.status}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="shrink-0 ml-1">
                    {isExpanded ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                        <Plus className="h-3.5 w-3.5 text-amber-400 dark:text-amber-500" />
                    )}
                </div>
            </div>
        </div>
    );
}
