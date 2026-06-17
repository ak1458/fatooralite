/** Two fixed ambient radial-gradient blobs behind the app content. */
export function GlowBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: -220,
          insetInlineEnd: -160,
          width: 620,
          height: 620,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,var(--glow),transparent 68%)",
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -260,
          insetInlineStart: "18%",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,var(--glow2),transparent 70%)",
          filter: "blur(30px)",
        }}
      />
    </div>
  );
}
