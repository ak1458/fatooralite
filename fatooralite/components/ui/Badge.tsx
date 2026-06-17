/** Compact square-ish label chip (smaller radius than Pill). */
export function Badge({
  bg,
  fg,
  children,
}: {
  bg: string;
  fg: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 7,
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
