"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth, useBranch } from "@/lib/useCompany";
import { Icon } from "@/components/ui/Icon";

/** Company badge + active-location selector at the top of the sidebar. */
export function WorkspaceSwitcher() {
  const { company } = useAuth();
  const { branches, activeBranch, setActiveBranch } = useBranch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const name = company?.name ?? "Workspace";
  const initial = name.charAt(0).toUpperCase();
  const sub = activeBranch?.name ?? (company?.vatNumber ? `VAT ${company.vatNumber}` : "—");
  const canOpen = branches.length > 0;

  return (
    <div ref={ref} style={{ position: "relative", margin: "6px 14px 10px" }}>
      <button
        onClick={() => canOpen && setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 12,
          border: "1px solid var(--bd)", background: open ? "var(--s1)" : "var(--s2)",
          cursor: canOpen ? "pointer" : "default", color: "var(--tx)", textAlign: "start", width: "100%",
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 8, background: "var(--acs)", color: "var(--ac)",
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12,
          flex: "none", fontFamily: "var(--fdisp)",
        }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--t3)", fontFamily: "var(--fmono)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {sub}
          </div>
        </div>
        {canOpen && <Icon name="chevron" size={14} sw={2} />}
      </button>

      {open && (
        <div style={{
          position: "absolute", insetInlineStart: 0, insetInlineEnd: 0, top: "calc(100% + 6px)",
          background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, boxShadow: "var(--sh)",
          padding: 6, zIndex: 50,
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--t3)", padding: "6px 9px 4px" }}>
            Locations
          </div>
          {branches.map((b) => {
            const active = b.id === activeBranch?.id;
            return (
              <button
                key={b.id}
                onClick={() => { setActiveBranch(b.id); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                  padding: "9px 10px", borderRadius: 9, border: "none",
                  background: active ? "var(--acs)" : "transparent", color: active ? "var(--ac)" : "var(--tx)",
                  fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <span>{b.name}</span>
                {active && <Icon name="check" size={14} sw={2.4} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
