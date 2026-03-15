import { Calendar } from "lucide-react";

interface EventContextBannerProps {
    eventName: string;
}

export function EventContextBanner({ eventName }: EventContextBannerProps) {
    return (
        <div className="flex items-center gap-2 mb-6 pb-4 border-b">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{eventName}</span>
        </div>
    );
}
