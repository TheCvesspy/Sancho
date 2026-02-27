"use client";

import * as React from "react";
import { useTheme } from "next-themes";

type ThemeToggleProps = {
  label: string;
};

export function ThemeToggle({ label }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="rounded-md border px-3 py-2 text-sm"
      onClick={() => setTheme(nextTheme ?? "light")}
    >
      {label}: {currentTheme}
    </button>
  );
}
