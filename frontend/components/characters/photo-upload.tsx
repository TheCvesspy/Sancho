"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CharacterDetailDto, charactersApi } from "@/utils/characters-api";

interface PhotoUploadProps {
    eventId: string;
    character: CharacterDetailDto;
    token: string;
    isOrgOrSysAdmin: boolean;
}

export function PhotoUpload({ eventId, character, token, isOrgOrSysAdmin }: PhotoUploadProps) {
    const router = useRouter();
    const isLocked = character.status === "Locked";

    // Only characters owners (if assigned) or admin/org can edit, plus not locked
    const canEdit = !isLocked && isOrgOrSysAdmin; // Assuming for now only orgs upload, but rules might be open if assigned

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error("Image must be JPG, PNG, or WEBP");
            return;
        }

        try {
            setIsUploading(true);

            // 1. Get signed upload URL
            const { uploadUrl, storagePath } = await charactersApi.createPhotoUploadUrl(token, eventId, character.id, {
                fileName: file.name,
                mimeType: file.type
            });

            // 2. Upload direct to Supabase Storage
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type
                }
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image to storage");
            }

            // 3. Confirm with backend
            await charactersApi.confirmPhoto(token, eventId, character.id, {
                storagePath
            });

            toast.success("Photo uploaded successfully");
            router.refresh();

        } catch (error) {
            console.error(error);
            toast.error("Failed to upload photo");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemove = async () => {
        if (!confirm("Are you sure you want to remove this photo?")) return;

        try {
            await charactersApi.removePhoto(token, eventId, character.id);
            toast.success("Photo removed");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove photo");
        }
    };

    return (
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
                                title="Upload new photo"
                            >
                                <Camera className="h-5 w-5" />
                            </Button>

                            {character.photoUrl && (
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-10 w-10 rounded-full"
                                    onClick={handleRemove}
                                    title="Remove photo"
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
