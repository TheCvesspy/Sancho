"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Camera, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NarrativeFactionDto, narrativeApi } from "@/utils/narrative-api";
import { resizeImageIfNeeded } from "@/utils/image-resize";

const MAX_SIGIL_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface SigilUploadProps {
    eventId: string;
    faction: NarrativeFactionDto;
    token: string;
    canWrite: boolean;
    onSigilChanged?: (newSigilUrl: string | null) => void;
}

export function SigilUpload({ eventId, faction, token, canWrite, onSigilChanged }: SigilUploadProps) {
    const router = useRouter();
    const t = useTranslations("narrative.factions.sigil");
    const canEdit = canWrite && faction.status !== "Locked" && !faction.deletedAt;

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error(t("invalidType"));
            return;
        }

        try {
            setIsUploading(true);

            // Auto-resize if needed
            let processedFile = file;
            if (file.size > MAX_SIGIL_BYTES) {
                toast.info(t("resizing"));
                processedFile = await resizeImageIfNeeded(file, MAX_SIGIL_BYTES);
            }

            // 1. Get signed upload URL
            const { uploadUrl, filePath } = await narrativeApi.createSigilUploadUrl(token, eventId, faction.id, {
                fileName: processedFile.name,
                contentType: processedFile.type,
                sizeBytes: processedFile.size,
            });

            // 2. Upload direct to Supabase Storage
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: processedFile,
                headers: { "Content-Type": processedFile.type },
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image to storage");
            }

            // 3. Confirm with backend
            const updated = await narrativeApi.confirmSigil(token, eventId, faction.id, { filePath });

            toast.success(t("uploadSuccess"));
            onSigilChanged?.(updated.sigilUrl);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(t("uploadFailed"));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemove = async () => {
        if (!confirm(t("removeConfirm"))) return;

        try {
            await narrativeApi.removeSigil(token, eventId, faction.id);
            toast.success(t("removeSuccess"));
            onSigilChanged?.(null);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(t("removeFailed"));
        }
    };

    return (
        <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                <AvatarImage src={faction.sigilUrl || ""} alt={faction.name} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl uppercase">
                    {faction.name.slice(0, 2)}
                </AvatarFallback>
            </Avatar>

            {canEdit && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-full transition-opacity">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                    />

                    {isUploading ? (
                        <Loader2 className="text-white h-8 w-8 animate-spin" />
                    ) : (
                        <div className="flex gap-2">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-10 w-10 rounded-full bg-white/90 hover:bg-white text-black"
                                onClick={() => fileInputRef.current?.click()}
                                title={t("uploadTitle")}
                            >
                                <Camera className="h-5 w-5" />
                            </Button>

                            {faction.sigilUrl && (
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-10 w-10 rounded-full"
                                    onClick={handleRemove}
                                    title={t("removeTitle")}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
