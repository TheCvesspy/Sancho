import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-base text-[color:var(--muted-foreground)]">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ThemeToggle label={t("toggleTheme")} />
          <Button>{t("primaryAction")}</Button>
          <span className="text-sm text-[color:var(--muted-foreground)]">
            {t("localeHint")}
          </span>
        </div>
      </div>
    </main>
  );
}
