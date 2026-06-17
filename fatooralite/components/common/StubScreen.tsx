import { Icon } from "@/components/ui/Icon";

/** Placeholder screen for modules not yet built (matches the design's stub). */
export function StubScreen({
  icon,
  title,
  sub,
}: {
  icon: string;
  title: string;
  sub: string;
}) {
  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "60px auto 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "var(--acs)",
          color: "var(--ac)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Icon name={icon} size={30} sw={1.6} />
      </div>
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-.02em",
          fontFamily: "var(--fdisp)",
        }}
      >
        {title}
      </h2>
      <p style={{ margin: "0 0 28px", fontSize: 14, color: "var(--t2)", maxWidth: 440 }}>
        {sub}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 14,
          width: "100%",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 120,
              borderRadius: 16,
              border: "1px solid var(--bd)",
              background: "var(--s1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
