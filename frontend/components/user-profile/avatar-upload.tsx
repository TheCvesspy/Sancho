"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Camera, Loader2 } from "lucide-react"
import { requestAvatarUploadUrl, confirmAvatarUpload } from "./actions"
import { useTranslations } from "next-intl"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const TARGET_SIZE = 4.5 * 1024 * 1024 // Target size after downscale (leave margin)
const MAX_DIMENSION = 1024 // Max width/height for downscaled images

interface AvatarUploadProps {
    currentAvatarUrl?: string
    displayName?: string
}

/**
 * Downscale an image file to fit within MAX_FILE_SIZE.
 * Returns the original file if already small enough or if it's a GIF.
 */
async function downscaleImage(file: File): Promise<File> {
    // Don't downscale GIFs (would lose animation)
    if (file.type === "image/gif") return file
    if (file.size <= MAX_FILE_SIZE) return file

    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            URL.revokeObjectURL(url)

            let { width, height } = img

            // Scale down dimensions
            const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height, 1)
            width = Math.round(width * scale)
            height = Math.round(height * scale)

            const canvas = document.createElement("canvas")
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext("2d")!
            ctx.drawImage(img, 0, 0, width, height)

            // Use JPEG for best compression, start at quality 0.85 and reduce if needed
            const outputType = "image/jpeg"
            let quality = 0.85

            const tryCompress = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) return reject(new Error("Failed to compress image"))
                        if (blob.size <= TARGET_SIZE || quality <= 0.3) {
                            resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: outputType }))
                        } else {
                            quality -= 0.1
                            tryCompress()
                        }
                    },
                    outputType,
                    quality
                )
            }
            tryCompress()
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error("Failed to load image for downscaling"))
        }
        img.src = url
    })
}

export function AvatarUpload({ currentAvatarUrl, displayName }: AvatarUploadProps) {
    const t = useTranslations("profile")
    const [isUploading, setIsUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Client-side validation: MIME type
        const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if (!allowedMimes.includes(file.type)) {
            alert("Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.")
            return
        }

        // Downscale if larger than 5MB (except GIFs)
        let uploadFile = file
        if (file.size > MAX_FILE_SIZE) {
            if (file.type === "image/gif") {
                alert("GIF files must be 5MB or smaller.")
                return
            }
            try {
                uploadFile = await downscaleImage(file)
            } catch {
                alert("Failed to resize image. Please try a smaller file.")
                return
            }
        }

        // Preview
        const objectUrl = URL.createObjectURL(uploadFile)
        setPreviewUrl(objectUrl)

        setIsUploading(true)
        try {
            // 1. Get signed URL
            const result = await requestAvatarUploadUrl(uploadFile.type)
            if (!result.success) throw new Error(result.error)

            const { uploadUrl, filePath } = result.data

            // 2. Upload directly to Supabase Storage
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: uploadFile,
                headers: {
                    "Content-Type": uploadFile.type,
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
            const message = error instanceof Error ? error.message : "Unknown error"
            console.error("Avatar upload failed:", message)
            alert(`Failed to upload avatar: ${message}`)
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
                    accept="image/jpeg,image/png,image/gif,image/webp"
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
                <p className="text-xs text-muted-foreground">JPG, PNG, GIF (max 5MB, auto-resized)</p>
            </div>
        </div>
    )
}
