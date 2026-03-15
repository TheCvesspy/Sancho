import { Handle, Position } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

interface ItemNodeData {
    label: string;
    status?: string | null;
    [key: string]: unknown;
}

const STATUS_CLASS: Record<string, string> = {
    draft: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-300",
    ready: "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-600 dark:bg-blue-900/50 dark:text-blue-300",
    final: "border-green-300 bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-900/50 dark:text-green-300",
};

function getStatusClass(status: string): string {
    const key = status.toLowerCase();
    return STATUS_CLASS[key] || STATUS_CLASS["draft"];
}

export function ItemNode({ data }: { data: ItemNodeData }) {
    return (
        <div className="relative px-3 py-2.5 rounded-lg border-2 border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/60 shadow-md hover:shadow-lg hover:border-orange-400 dark:hover:border-orange-500 transition-all min-w-[150px] max-w-[210px]">
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-orange-400 !border-orange-300" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-orange-400 !border-orange-300" />
            <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-orange-400 !border-orange-300" />
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-orange-400 !border-orange-300" />

            <div className="flex items-center gap-2.5">
                <div className="shrink-0 h-8 w-8 rounded-md bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
                    <Package className="h-4 w-4 text-orange-700 dark:text-orange-300" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-orange-900 dark:text-orange-100 truncate">
                        {data.label}
                    </div>
                    {data.status && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-1 ${getStatusClass(data.status)}`}>
                            {data.status}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}
