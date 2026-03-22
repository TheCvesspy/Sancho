"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { updateTheme } from "@/components/user-profile/actions"

const themeOrder = ["system", "light", "dark"] as const
type ThemeValue = (typeof themeOrder)[number]

const themeIcons: Record<ThemeValue, React.ElementType> = {
    system: Monitor,
    light: Sun,
    dark: Moon,
}

interface ThemeToggleProps {
    tooltip?: string
}

export function ThemeToggle({ tooltip }: ThemeToggleProps) {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <Monitor className="h-4 w-4" />
            </Button>
        )
    }

    const current = (theme as ThemeValue) || "system"
    const currentIndex = themeOrder.indexOf(current)
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length]
    const Icon = themeIcons[current]

    const handleToggle = () => {
        setTheme(nextTheme)
        // Fire-and-forget persist to backend
        updateTheme(nextTheme).catch(() => {
            // Silent fail — theme is already applied locally via next-themes
        })
    }

    const btn = (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 transition-colors"
            onClick={handleToggle}
            aria-label={tooltip || "Toggle theme"}
        >
            <Icon className="h-4 w-4 transition-transform duration-200" />
        </Button>
    )

    if (tooltip) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        )
    }

    return btn
}
