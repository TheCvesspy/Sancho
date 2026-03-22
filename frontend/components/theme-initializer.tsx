"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface ThemeInitializerProps {
    theme: string
}

export function ThemeInitializer({ theme }: ThemeInitializerProps) {
    const { setTheme } = useTheme()
    const initialized = useRef(false)

    useEffect(() => {
        if (!initialized.current && theme) {
            initialized.current = true
            setTheme(theme)
        }
    }, [theme, setTheme])

    return null
}
