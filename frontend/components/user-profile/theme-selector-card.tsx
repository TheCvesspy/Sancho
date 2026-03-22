"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { updateTheme } from "@/components/user-profile/actions"

const themeOptions = [
    { value: "system", icon: Monitor, labelKey: "themeSystem" },
    { value: "light", icon: Sun, labelKey: "themeLight" },
    { value: "dark", icon: Moon, labelKey: "themeDark" },
] as const

interface ThemeSelectorCardProps {
    initialTheme?: string
}

export function ThemeSelectorCard({ initialTheme }: ThemeSelectorCardProps) {
    const t = useTranslations("profile")
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const currentTheme = mounted ? theme : initialTheme || "system"

    const handleSelect = (value: string) => {
        setTheme(value)
        // Fire-and-forget persist to backend
        updateTheme(value).catch(() => {
            // Silent fail — theme is already applied locally
        })
    }

    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-sm font-medium text-foreground">
                    {t("theme")}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {t("appearanceDescription")}
                </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {themeOptions.map((option) => {
                    const isActive = currentTheme === option.value
                    const Icon = option.icon
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelect(option.value)}
                            className={cn(
                                "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all duration-200",
                                "hover:bg-accent hover:text-accent-foreground",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                isActive
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-muted bg-card"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "h-6 w-6 transition-colors duration-200",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                            />
                            <span
                                className={cn(
                                    "text-xs font-medium transition-colors duration-200",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                {t(option.labelKey)}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
