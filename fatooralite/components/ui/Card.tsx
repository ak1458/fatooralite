import { cn } from "@/lib/cn";

/** Bordered surface card — the base container used across every module. */
export function Card({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(className)}
      style={{
        borderRadius: 18,
        padding: 20,
        border: "1px solid var(--bd)",
        background: "var(--s1)",
        boxShadow: "var(--sh)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
