import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const resolvedLocale = routing.locales.includes(locale as "en" | "cs")
    ? (locale as "en" | "cs")
    : routing.defaultLocale;

  return {
    locale: resolvedLocale,
    messages: {
      common: (await import(`../messages/${resolvedLocale}/common.json`)).default,
      profile: (await import(`../messages/${resolvedLocale}/profile.json`)).default,
      identity: (await import(`../messages/${resolvedLocale}/identity.json`)).default,
      events: (await import(`../messages/${resolvedLocale}/events.json`)).default,
    },
  };
});
