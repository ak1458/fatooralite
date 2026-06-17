/** A small colored dot, optionally with a soft glow ring. */
export function StatusDot({
  color,
  glow,
  size = 8,
}: {
  color: string;
  glow?: string;
  size?: number;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        boxShadow: glow ? `0 0 0 3px ${glow}` : undefined,
        display: "inline-block",
        flex: "none",
      }}
    />
  );
}
