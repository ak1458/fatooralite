import { cn } from "@/lib/cn";

/** Bordered surface card — the base container used across every module. */
export function Card({
  className,
  style,
  folderTab,
  glow = false,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  folderTab?: React.ReactNode;
  glow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("glass-card-hover", className)}
      style={{
        position: "relative",
        borderRadius: 20,
        padding: folderTab ? "24px 22px 22px" : 22,
        border: "1px solid var(--bd)",
        background: glow
          ? "radial-gradient(130% 120% at 100% 0%, var(--acs), transparent 60%), linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%), var(--s1)"
          : "linear-gradient(135deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0.01) 100%), var(--s1)",
        boxShadow: "var(--sh)",
        backdropFilter: "blur(14px)",
        ...style,
      }}
    >
      {folderTab && (
        <div
          style={{
            position: "absolute",
            top: -1,
            insetInlineStart: 20,
            height: 32,
            padding: "0 14px",
            background: "var(--s2)",
            border: "1px solid var(--bd)",
            borderBottom: "1px solid var(--s1)",
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: "var(--tx)",
            zIndex: 2,
          }}
        >
          {folderTab}
        </div>
      )}
      {children}
    </div>
  );
}
