/** Rounded status pill (with optional leading dot). Colors come from caller. */
export function Pill({
  bg,
  fg,
  dot,
  children,
}: {
  bg: string;
  fg: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 20,
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      {dot && (
        <span
          style={{ width: 6, height: 6, borderRadius: "50%", background: fg }}
        />
      )}
      {children}
    </span>
  );
}
