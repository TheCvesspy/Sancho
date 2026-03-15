"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

interface ThemeInitializerProps {
    theme: string
}

export function ThemeInitializer({ theme }: ThemeInitializerProps) {
    const { theme: currentTheme, setTheme } = useTheme()

    useEffect(() => {
        if (theme && theme !== currentTheme) {
            setTheme(theme)
        }
    }, [theme, currentTheme, setTheme])

    return null
}
