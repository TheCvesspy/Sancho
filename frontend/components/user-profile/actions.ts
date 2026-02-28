"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293"

async function getAuthHeaders() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
        throw new Error("Unauthorized")
    }

    return {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
    }
}

export async function updateProfile(formData: { displayName: string, bio: string, locale: string }) {
    try {
        const headers = await getAuthHeaders()
        const response = await fetch(`${API_BASE_URL}/api/user/me`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(formData)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Failed to update profile (${response.status}): ${errorText}`)
        }

        revalidatePath("/[locale]/profile", "page")
        return { success: true }
    } catch (error) {
        console.error("Profile update error:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred"
        }
    }
}

export async function requestAvatarUploadUrl(contentType: string) {
    try {
        const headers = await getAuthHeaders()
        const response = await fetch(`${API_BASE_URL}/api/user/me/avatar/upload-url`, {
            method: "POST",
            headers,
            body: JSON.stringify({ contentType })
        })

        if (!response.ok) {
            throw new Error("Failed to get upload URL")
        }

        return { success: true, data: await response.json() }
    } catch (error) {
        console.error("Upload URL error:", error)
        return { success: false, error: "Failed to initiate upload" }
    }
}

export async function confirmAvatarUpload(filePath: string) {
    try {
        const headers = await getAuthHeaders()
        const response = await fetch(`${API_BASE_URL}/api/user/me/avatar/confirm`, {
            method: "POST",
            headers,
            body: JSON.stringify({ filePath })
        })

        if (!response.ok) {
            throw new Error("Failed to confirm avatar")
        }

        revalidatePath("/[locale]/profile", "page")
        return { success: true }
    } catch (error) {
        console.error("Avatar confirmation error:", error)
        return { success: false, error: "Failed to save avatar" }
    }
}
