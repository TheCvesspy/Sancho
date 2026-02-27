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
import { updateProfile } from "./actions"
import { useState } from "react"

const profileSchema = z.object({
    displayName: z.string().min(2).max(50),
    bio: z.string().max(500),
    locale: z.string(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileFormProps {
    initialData: ProfileFormValues
}

export function ProfileForm({ initialData }: ProfileFormProps) {
    const t = useTranslations("profile")
    const [isSaving, setIsSaving] = useState(false)

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: initialData,
    })

    async function onSubmit(data: ProfileFormValues) {
        setIsSaving(true)
        const result = await updateProfile(data)
        setIsSaving(false)

        if (result.success && data.locale !== initialData.locale) {
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

                <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : t("saveChanges")}
                </Button>
            </form>
        </Form>
    )
}
