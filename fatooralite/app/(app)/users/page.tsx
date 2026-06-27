"use client";
import { useState } from "react";
import { useCompany } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { NoCompanyState } from "@/components/common/NoCompanyState";
import { Modal, modalInput, modalLabel, modalPrimary } from "@/components/common/Modal";
import { Icon } from "@/components/ui/Icon";

interface TeamUser { id: string; name: string; email: string; role: string; title: string | null; status: string }
interface RoleRow { role: string; permissions: string[] }
const ROLES = ["owner", "manager", "accountant", "auditor", "employee"];

const STATUS_TONE: Record<string, string> = { active: "var(--ac)", invited: "var(--warn,#f59e0b)", disabled: "var(--t3)" };

export default function UsersPage() {
  const { company, isLoading: companyLoading } = useCompany();
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [open, setOpen] = useState(false);

  const usersQ = useAsyncData<TeamUser[]>(
    async (signal) => {
      const r = await fetch(`/api/users?companyId=${company!.id}`, { signal });
      if (r.status === 403) throw new Error("Only owners/admins can manage users.");
      if (!r.ok) throw new Error(`Failed to load users (${r.status})`);
      return (await r.json()).users ?? [];
    },
    [company?.id],
    { enabled: !!company?.id && tab === "users" },
  );

  const rolesQ = useAsyncData<RoleRow[]>(
    async (signal) => {
      const r = await fetch(`/api/roles`, { signal });
      if (!r.ok) throw new Error(`Failed to load roles (${r.status})`);
      return (await r.json()).roles ?? [];
    },
    [tab],
    { enabled: tab === "roles" },
  );

  async function patchUser(id: string, data: Record<string, unknown>) {
    await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    usersQ.retry();
  }
  async function removeUser(id: string) {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    usersQ.retry();
  }

  if (!company?.id && !companyLoading) return <NoCompanyState />;

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Users &amp; Roles</h1>
        {tab === "users" && (
          <button onClick={() => setOpen(true)} disabled={!company?.id}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 11, border: "none", background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "#04130d", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <Icon name="plus" size={15} sw={2.4} /> Invite user
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {(["users", "roles"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--bd)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 13, textTransform: "capitalize",
              background: tab === t ? "var(--acs)" : "var(--s1)", color: tab === t ? "var(--ac)" : "var(--t2)" }}>
            {t === "users" ? "Team" : "Roles & permissions"}
          </button>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Invite a team member">
        <InviteForm companyId={company?.id ?? ""} onDone={() => { setOpen(false); usersQ.retry(); }} />
      </Modal>

      {tab === "users" ? (
        <AsyncBoundary state={usersQ.state} onRetry={usersQ.retry} isEmpty={(u) => u.length === 0} empty={<div style={{ padding: 32, color: "var(--t3)" }}>No team members yet.</div>}>
          {(users) => (
            <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 16, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--bd)", fontSize: 12.5, color: "var(--t3)" }}>
                    <th style={{ padding: "14px 18px", fontWeight: 500 }}>Name</th>
                    <th style={{ padding: "14px 18px", fontWeight: 500 }}>Designation</th>
                    <th style={{ padding: "14px 18px", fontWeight: 500 }}>Role</th>
                    <th style={{ padding: "14px 18px", fontWeight: 500 }}>Status</th>
                    <th style={{ padding: "14px 18px", fontWeight: 500 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--bd)", fontSize: 13.5 }}>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ color: "var(--t3)", fontSize: 12 }}>{u.email}</div>
                      </td>
                      <td style={{ padding: "14px 18px", color: "var(--t2)" }}>{u.title || "—"}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <select value={u.role} onChange={(e) => patchUser(u.id, { role: e.target.value })}
                          style={{ ...modalInput, padding: "6px 8px", width: "auto", textTransform: "capitalize" }}>
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_TONE[u.status] ?? "var(--t2)", textTransform: "capitalize" }}>{u.status}</span>
                      </td>
                      <td style={{ padding: "14px 18px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button onClick={() => patchUser(u.id, { status: u.status === "disabled" ? "active" : "disabled" })}
                          style={linkBtn}>{u.status === "disabled" ? "Enable" : "Disable"}</button>
                        <button onClick={() => removeUser(u.id)} style={{ ...linkBtn, color: "var(--dang)" }}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      ) : (
        <AsyncBoundary state={rolesQ.state} onRetry={rolesQ.retry}>
          {(roles) => (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
              {roles.map((r) => (
                <div key={r.role} style={{ padding: 18, borderRadius: 14, background: "var(--s1)", border: "1px solid var(--bd)" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, textTransform: "capitalize", marginBottom: 10 }}>{r.role}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {r.permissions.length === 0 ? <span style={{ color: "var(--t3)", fontSize: 12 }}>No permissions</span> :
                      r.permissions.map((p) => (
                        <span key={p} style={{ fontSize: 11, fontFamily: "var(--fmono)", padding: "3px 8px", borderRadius: 6, background: "var(--s2)", color: "var(--t2)" }}>{p}</span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AsyncBoundary>
      )}
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: "transparent", border: "none", color: "var(--ac)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, marginInlineStart: 12, fontFamily: "inherit" };

function InviteForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", role: "accountant", title: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, name: form.name, email: form.email, role: form.role, title: form.title || null, password: form.password || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not invite user");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not invite user");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><label style={modalLabel}>Name</label><input style={modalInput} value={form.name} onChange={set("name")} required /></div>
        <div><label style={modalLabel}>Email</label><input style={modalInput} type="email" value={form.email} onChange={set("email")} required /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><label style={modalLabel}>Role</label>
          <select style={modalInput} value={form.role} onChange={set("role")}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div><label style={modalLabel}>Designation (optional)</label><input style={modalInput} value={form.title} onChange={set("title")} placeholder="Chief Accountant" /></div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={modalLabel}>Temporary password (optional)</label>
        <input style={modalInput} type="text" value={form.password} onChange={set("password")} placeholder="Leave blank to send an invite" minLength={8} />
      </div>
      {error && <div style={{ color: "var(--dang)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={busy} style={{ ...modalPrimary, opacity: busy ? 0.7 : 1 }}>{busy ? "Saving…" : "Add member"}</button>
      </div>
    </form>
  );
}
