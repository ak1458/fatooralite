"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useCompany";
import { Icon } from "@/components/ui/Icon";

/** Avatar + name/role with a dropdown (settings, sign out). */
export function ProfileMenu() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const name = user?.name ?? "Account";
  const role = user?.role ?? "";
  const initial = name.charAt(0).toUpperCase();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 9, padding: "4px 6px", borderRadius: 11,
          border: "1px solid transparent", background: open ? "var(--s2)" : "transparent",
          cursor: "pointer", color: "var(--tx)",
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: "linear-gradient(150deg,var(--acb),var(--ac))",
          color: "#04130d", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 13, fontFamily: "var(--fdisp)",
        }}>
          {initial}
        </div>
        <div style={{ lineHeight: 1.15, textAlign: "start" }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ fontSize: 10.5, color: "var(--t3)", textTransform: "capitalize" }}>{role}</div>
        </div>
        <Icon name="chevron" size={14} sw={2} />
      </button>

      {open && (
        <div style={{
          position: "absolute", insetInlineEnd: 0, top: "calc(100% + 8px)", minWidth: 220,
          background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 13,
          boxShadow: "var(--sh)", padding: 7, zIndex: 50,
        }}>
          <div style={{ padding: "9px 11px 11px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>{user?.email}</div>
          </div>
          <div style={{ height: 1, background: "var(--bd)", margin: "2px 0 6px" }} />
          <Link href="/settings" onClick={() => setOpen(false)} style={menuItem}>
            <Icon name="settings" size={16} sw={1.8} /> Settings
          </Link>
          <button onClick={signOut} style={{ ...menuItem, width: "100%", border: "none", background: "transparent", color: "var(--dang)" }}>
            <Icon name="lock" size={16} sw={1.8} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

const menuItem: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 9,
  fontSize: 13.5, fontWeight: 500, color: "var(--tx)", textDecoration: "none", cursor: "pointer", fontFamily: "inherit",
};
