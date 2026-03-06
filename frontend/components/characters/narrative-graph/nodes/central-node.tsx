import { Handle, Position } from "@xyflow/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles } from "lucide-react";

interface CentralNodeData {
    label: string;
    [key: string]: unknown;
}

export function CentralNode({ data }: { data: CentralNodeData }) {
    return (
        <div className="relative px-4 py-3 rounded-xl border-2 border-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 dark:border-indigo-500 shadow-lg shadow-indigo-200/40 dark:shadow-indigo-900/30 min-w-[180px] max-w-[240px]">
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-indigo-400 !border-indigo-300" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-indigo-400 !border-indigo-300" />
            <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-indigo-400 !border-indigo-300" />
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-indigo-400 !border-indigo-300" />

            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-indigo-300 shadow-sm">
                    <AvatarFallback className="bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 text-sm font-bold uppercase">
                        {data.label.slice(0, 2)}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-indigo-900 dark:text-indigo-100 truncate">
                        {data.label}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-300">
                        <Sparkles className="h-3 w-3" />
                        <span>Central Character</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
