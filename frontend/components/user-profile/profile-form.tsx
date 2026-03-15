"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTheme } from "next-themes"
import { updateProfile } from "./actions"
import { useState } from "react"

const profileSchema = z.object({
    displayName: z.string().min(2).max(50),
    bio: z.string().max(500),
    locale: z.string(),
    theme: z.enum(["light", "dark", "system"]),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileFormProps {
    initialData: ProfileFormValues
}

export function ProfileForm({ initialData }: ProfileFormProps) {
    const t = useTranslations("profile")
    const { setTheme } = useTheme()
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: initialData,
    })

    async function onSubmit(data: ProfileFormValues) {
        setSaveError(null)
        setIsSaving(true)
        const result = await updateProfile(data)
        setIsSaving(false)

        if (!result.success) {
            setSaveError(result.error ?? "Failed to save profile")
            return
        }

        // Apply theme immediately so the user sees the change without refresh
        if (data.theme !== initialData.theme) {
            setTheme(data.theme)
        }

        if (data.locale !== initialData.locale) {
            // If locale changed, we might need a full page reload or router push to the new locale
            window.location.href = `/${data.locale}/profile`
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("displayName")}</FormLabel>
                            <FormControl>
                                <Input placeholder="Type your name..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("bio")}</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Tell us about yourself..."
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="locale"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("language")}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a language" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="cs">Čeština</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("theme")}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="system">{t("themeSystem")}</SelectItem>
                                    <SelectItem value="light">{t("themeLight")}</SelectItem>
                                    <SelectItem value="dark">{t("themeDark")}</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : t("saveChanges")}
                </Button>
                {saveError ? (
                    <p className="text-sm text-destructive">{saveError}</p>
                ) : null}
            </form>
        </Form>
    )
}
