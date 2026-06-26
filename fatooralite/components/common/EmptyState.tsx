"use client";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

interface EmptyStateProps {
  icon?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}

/** Friendly empty state for lists/sections that have no data yet. */
export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: 48,
        textAlign: "center",
        background: "var(--s1)",
        border: "1px solid var(--bd)",
        borderRadius: 16,
      }}
    >
      {icon && (
        <span
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            background: "var(--s2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--t3)",
          }}
        >
          <Icon name={icon} size={22} sw={1.7} />
        </span>
      )}
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--tx)" }}>{title}</div>
      {hint && <div style={{ fontSize: 13, color: "var(--t3)", maxWidth: 360 }}>{hint}</div>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
