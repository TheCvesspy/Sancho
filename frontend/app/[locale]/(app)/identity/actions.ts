"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293"

async function getAuthHeaders() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Unauthorized")
    return {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
    }
}

export async function assignOrgRole(userId: string) {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/api/identity/users/${userId}/org-role`, {
        method: "POST",
        headers
    })

    if (!response.ok) {
        throw new Error("Failed to assign role")
    }

    revalidatePath("/[locale]/(app)/identity", "page")
}

export async function revokeOrgRole(userId: string) {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/api/identity/users/${userId}/org-role`, {
        method: "DELETE",
        headers
    })

    if (!response.ok) {
        throw new Error("Failed to revoke role")
    }

    revalidatePath("/[locale]/(app)/identity", "page")
}

export async function createInviteToken(emailHint?: string, validityHours?: number) {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/api/identity/invite-tokens`, {
        method: "POST",
        headers,
        body: JSON.stringify({ emailHint, validityHours })
    })

    if (!response.ok) {
        throw new Error("Failed to create token")
    }

    const data = await response.json()
    revalidatePath("/[locale]/(app)/identity", "page")
    return data as { rawToken: string, id: string }
}

export async function revokeInviteToken(tokenId: string) {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/api/identity/invite-tokens/${tokenId}`, {
        method: "DELETE",
        headers
    })

    if (!response.ok) {
        throw new Error("Failed to revoke token")
    }

    revalidatePath("/[locale]/(app)/identity", "page")
}
