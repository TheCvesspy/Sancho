"use client";

import { useTranslations } from "next-intl";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Trash2, FileIcon, Image as ImageIcon, FileText, Loader2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CharacterAttachmentDto, CharacterDetailDto, charactersApi } from "@/utils/characters-api";

interface AttachmentsPanelProps {
    eventId: string;
    character: CharacterDetailDto;
    initialAttachments: CharacterAttachmentDto[];
    token: string;
    isOrgOrSysAdmin: boolean;
}

export function AttachmentsPanel({ eventId, character, initialAttachments, token, isOrgOrSysAdmin }: AttachmentsPanelProps) {
    const t = useTranslations("characters");
    const router = useRouter();
    const isLocked = character.status === "Locked";

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const attachments = initialAttachments;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size must be less than 5MB");
            return;
        }

        try {
            setIsUploading(true);

            // 1. Get signed upload URL
            const category = file.type.startsWith("image/") ? "Image" :
                file.type.startsWith("application/pdf") || file.type.startsWith("text/") ? "Document" : "Other";

            const { uploadUrl, storagePath } = await charactersApi.createAttachmentUploadUrl(token, eventId, character.id, {
                fileName: file.name,
                mimeType: file.type,
                category: category as any
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
                throw new Error("Failed to upload file to storage");
            }

            // 3. Confirm with backend
            await charactersApi.confirmAttachment(token, eventId, character.id, {
                storagePath
            });

            toast.success("File uploaded successfully");
            router.refresh();

        } catch (error) {
            console.error(error);
            toast.error("Failed to upload attachment");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleDelete = async (attachmentId: string) => {
        if (!confirm("Are you sure you want to delete this file?")) return;

        try {
            await charactersApi.deleteAttachment(token, eventId, character.id, attachmentId);
            toast.success("File deleted");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete attachment");
        }
    };

    const getIcon = (category: string) => {
        switch (category) {
            case "Image": return <ImageIcon className="h-8 w-8 text-blue-500" />;
            case "Document": return <FileText className="h-8 w-8 text-amber-500" />;
            default: return <FileIcon className="h-8 w-8 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Attachments</h2>
                    <p className="text-sm text-muted-foreground">Upload character sheets, reference images, or notes.</p>
                </div>
                {!isLocked && (
                    <div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileUp className="mr-2 h-4 w-4" />
                            )}
                            Upload File
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1 text-right">Max 5MB</p>
                    </div>
                )}
            </div>

            {attachments.length === 0 ? (
                <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
                    No attachments uploaded.
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {attachments.map((attachment) => (
                        <div key={attachment.id} className="bg-card border rounded-md p-4 flex items-start gap-4 hover:border-border/80 transition-colors">
                            <div className="shrink-0 bg-muted rounded p-2">
                                {getIcon(attachment.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" title={attachment.fileName}>
                                    {attachment.fileName}
                                </p>
                                <p className="text-xs text-muted-foreground mb-3">
                                    {new Date(attachment.uploadedAt).toLocaleDateString()}
                                </p>
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm" className="h-7 text-xs" asChild>
                                        <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-1 h-3 w-3" />
                                            View
                                        </a>
                                    </Button>
                                    {!isLocked && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(attachment.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
