"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Camera, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { CharacterDetailDto, charactersApi } from "@/utils/characters-api";
import { resizeImageIfNeeded } from "@/utils/image-resize";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface PhotoUploadProps {
    eventId: string;
    character: CharacterDetailDto;
    token: string;
    canWrite: boolean;
}

export function PhotoUpload({ eventId, character, token, canWrite }: PhotoUploadProps) {
    const router = useRouter();
    const t = useTranslations("characters");
    const isLocked = character.status === "Locked";
    const canEdit = !isLocked && canWrite;

    const [isUploading, setIsUploading] = useState(false);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
    const [selectedMimeType, setSelectedMimeType] = useState<string>("image/jpeg");
    const [selectedFileName, setSelectedFileName] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error(t("photo.invalidType"));
            resetFileInput();
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setSelectedImageSrc(objectUrl);
        setSelectedMimeType(file.type);
        setSelectedFileName(file.name);
        setCropDialogOpen(true);
    };

    const resetFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const cleanupCropState = useCallback(() => {
        if (selectedImageSrc) {
            URL.revokeObjectURL(selectedImageSrc);
        }
        setSelectedImageSrc(null);
        setSelectedFileName("");
        setCropDialogOpen(false);
        resetFileInput();
    }, [selectedImageSrc]);

    const handleCropComplete = async (blob: Blob) => {
        cleanupCropState();

        try {
            setIsUploading(true);

            const safeName = selectedFileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "avatar.jpg";
            let file = new File([blob], safeName, { type: blob.type });

            // Auto-resize if cropped image exceeds 5 MB
            file = await resizeImageIfNeeded(file, MAX_UPLOAD_BYTES);

            // 1. Get signed upload URL
            const { uploadUrl, filePath } = await charactersApi.createPhotoUploadUrl(token, eventId, character.id, {
                fileName: file.name,
                contentType: file.type,
                sizeBytes: file.size,
            });

            // 2. Upload direct to Supabase Storage
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type,
                },
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image to storage");
            }

            // 3. Confirm with backend
            await charactersApi.confirmPhoto(token, eventId, character.id, {
                filePath: filePath,
            });

            toast.success(t("photo.uploadSuccess"));
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(t("photo.uploadFailed"));
        } finally {
            setIsUploading(false);
        }
    };

    const handleCropDialogChange = (open: boolean) => {
        if (!open) {
            cleanupCropState();
        }
    };

    const handleRemove = async () => {
        if (!confirm(t("photo.removeConfirm"))) return;

        try {
            await charactersApi.removePhoto(token, eventId, character.id);
            toast.success(t("photo.removeSuccess"));
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(t("photo.removeFailed"));
        }
    };

    return (
        <>
            <div className="relative group">
                <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-sm">
                    <AvatarImage src={character.photoUrl || ""} alt={character.name} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-4xl uppercase">
                        {character.name.slice(0, 2)}
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
                                    title={character.photoUrl ? t("photo.replace") : t("photo.upload")}
                                >
                                    <Camera className="h-5 w-5" />
                                </Button>

                                {character.photoUrl && (
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="h-10 w-10 rounded-full"
                                        onClick={handleRemove}
                                        title={t("photo.remove")}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedImageSrc && (
                <ImageCropDialog
                    open={cropDialogOpen}
                    onOpenChange={handleCropDialogChange}
                    imageSrc={selectedImageSrc}
                    onCropComplete={handleCropComplete}
                    mimeType={selectedMimeType}
                    aspectRatio={1}
                    cropShape="round"
                />
            )}
        </>
    );
}
