"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Pill } from "@/components/ui/Pill";
import { statusMeta } from "@/lib/status";
import type { InvoiceStatus } from "@/types";

export function StatusPill({ status }: { status: InvoiceStatus }) {
  const { t, lang } = useLang();
  const m = statusMeta(status, t, lang);
  return (
    <Pill bg={m.bg} fg={m.color} dot>
      {m.label}
    </Pill>
  );
}
