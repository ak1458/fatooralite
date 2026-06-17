"use client";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";
import { navGroups } from "@/data/nav";
import { pageMeta } from "@/data/company";
import type { Dict } from "@/lib/i18n/dictionary";

/** Resolves the topbar title + subtitle for the current route. */
export function usePageMeta(): { title: string; sub: string } {
  const pathname = usePathname();
  const { t } = useLang();

  const item = navGroups
    .flatMap((g) => g.items)
    .find((i) => i.href === pathname);
  const id = item?.id ?? "dashboard";
  const meta = pageMeta[id] ?? pageMeta.dashboard;

  const title = t[meta.titleKey as keyof Dict] ?? meta.titleKey;
  // Subtitles are literal English unless they reference a dictionary key (e.g. ccSub).
  const sub = meta.sub in t ? t[meta.sub as keyof Dict] : meta.sub;

  return { title, sub };
}
