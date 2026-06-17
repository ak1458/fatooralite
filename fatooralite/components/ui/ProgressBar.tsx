/** Horizontal progress bar filled with the accent gradient. */
export function ProgressBar({
  pct,
  height = 6,
}: {
  pct: number;
  height?: number;
}) {
  return (
    <div
      style={{
        height,
        borderRadius: height,
        background: "var(--s3)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: height,
          background: "linear-gradient(90deg,var(--ac),var(--acb))",
        }}
      />
    </div>
  );
}
