import { Handle, Position } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Check } from "lucide-react";

interface FactionNodeData {
    label: string;
    role?: string | null;
    expanded?: boolean;
    [key: string]: unknown;
}

export function FactionNode({ data }: { data: FactionNodeData }) {
    const isExpanded = data.expanded;

    return (
        <div
            className="relative px-3 py-2.5 rounded-lg border-2 border-teal-300 dark:border-teal-600 bg-teal-50 dark:bg-teal-950/60 shadow-md hover:shadow-lg hover:border-teal-400 dark:hover:border-teal-500 transition-all cursor-pointer min-w-[170px] max-w-[230px]"
            style={{ clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)" }}
        >
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-teal-400 !border-teal-300" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-teal-400 !border-teal-300" />
            <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-teal-400 !border-teal-300" />
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-teal-400 !border-teal-300" />

            <div className="flex items-center gap-2.5">
                <div className="shrink-0 h-8 w-8 rounded-md bg-teal-200 dark:bg-teal-800 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-teal-900 dark:text-teal-100 truncate">
                        {data.label}
                    </div>
                    {data.role && (
                        <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 border-teal-300 dark:border-teal-600 text-teal-700 dark:text-teal-300">
                            {data.role}
                        </Badge>
                    )}
                </div>
                <div className="shrink-0 ml-1">
                    {isExpanded ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                        <Plus className="h-3.5 w-3.5 text-teal-400 dark:text-teal-500" />
                    )}
                </div>
            </div>
        </div>
    );
}
