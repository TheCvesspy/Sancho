"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Camera, Loader2 } from "lucide-react"
import { requestAvatarUploadUrl, confirmAvatarUpload } from "./actions"
import { useTranslations } from "next-intl"

interface AvatarUploadProps {
    currentAvatarUrl?: string
    displayName?: string
}

export function AvatarUpload({ currentAvatarUrl, displayName }: AvatarUploadProps) {
    const t = useTranslations("profile")
    const [isUploading, setIsUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Preview
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)

        setIsUploading(true)
        try {
            // 1. Get signed URL
            const result = await requestAvatarUploadUrl()
            if (!result.success) throw new Error(result.error)

            const { uploadUrl, filePath } = result.data

            // 2. Upload directly to Supabase Storage
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type,
                    "x-upsert": "true",
                },
            })

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text()
                throw new Error(`Failed to upload file (${uploadResponse.status}): ${errorText}`)
            }

            // 3. Confirm upload with our backend
            const confirmResult = await confirmAvatarUpload(filePath)
            if (!confirmResult.success) throw new Error(confirmResult.error)

        } catch (error) {
            console.error("Avatar upload failed:", error)
            alert("Failed to upload avatar. Please try again.")
            setPreviewUrl(null)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <Avatar className="h-32 w-32 border-2 border-muted">
                    <AvatarImage src={previewUrl || currentAvatarUrl} alt={t("avatarAlt")} />
                    <AvatarFallback className="text-2xl bg-primary/10">
                        {displayName?.substring(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                </Avatar>

                <Label
                    htmlFor="avatar-input"
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                >
                    <Camera className="h-8 w-8" />
                </Label>

                <input
                    id="avatar-input"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                />

                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}
            </div>
            <div className="text-center">
                <p className="text-sm font-medium">{t("avatarAlt")}</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, GIF (max 2MB)</p>
            </div>
        </div>
    )
}
