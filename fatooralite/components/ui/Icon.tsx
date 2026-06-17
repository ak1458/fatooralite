import { ICONS } from "@/lib/icons";

/** Stroke icon from the design's path table. Unknown names render nothing. */
export function Icon({
  name,
  size = 18,
  sw = 1.7,
}: {
  name: string;
  size?: number;
  sw?: number;
}) {
  const shapes = ICONS[name] ?? [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {shapes.map((s, i) => {
        if (s.t === "path") return <path key={i} d={s.d} />;
        if (s.t === "circle") return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />;
        return (
          <rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} />
        );
      })}
    </svg>
  );
}
