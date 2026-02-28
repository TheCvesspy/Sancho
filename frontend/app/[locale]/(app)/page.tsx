import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { redirect } from 'next/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/events`);
}
