"use client";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Icon } from "@/components/ui/Icon";

/** Sun/moon button toggling dark⇄light. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title="Theme"
      aria-label="Toggle theme"
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        border: "1px solid var(--bd)",
        background: "var(--s1)",
        color: "var(--t2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <Icon name={theme === "dark" ? "moon" : "sun"} size={18} sw={1.8} />
    </button>
  );
}
