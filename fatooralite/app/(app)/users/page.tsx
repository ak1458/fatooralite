"use client";
import { useState } from "react";
import { useCompany } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { NoCompanyState } from "@/components/common/NoCompanyState";
import { Modal, modalInput, modalLabel, modalPrimary } from "@/components/common/Modal";
import { Icon } from "@/components/ui/Icon";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

interface TeamUser {
  id: string; name: string; email: string; role: string;
  roleId: string | null; customRoleName: string | null;
  title: string | null; status: string;
}
interface RoleRow { role: string; permissions: string[] }
interface CustomRole { id: string; name: string; description: string | null; permissions: string[]; userCount: number }
interface RolesResponse { roles: RoleRow[]; customRoles: CustomRole[]; allPermissions: string[] }
const ROLES = ["owner", "manager", "accountant", "auditor", "employee"];

const STATUS_TONE: Record<string, string> = { active: "var(--ac)", invited: "var(--warn)", disabled: "var(--t3)" };

export default function UsersPage() {
  const { company, isLoading: companyLoading } = useCompany();
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [open, setOpen] = useState(false);
  const [roleModal, setRoleModal] = useState<CustomRole | "new" | null>(null);
  const mobile = useMediaQuery(639);

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

  const rolesQ = useAsyncData<RolesResponse>(
    async (signal) => {
      const r = await fetch(`/api/roles`, { signal });
      if (!r.ok) throw new Error(`Failed to load roles (${r.status})`);
      const data = await r.json();
      return { roles: data.roles ?? [], customRoles: data.customRoles ?? [], allPermissions: data.allPermissions ?? [] };
    },
    [tab],
    { enabled: tab === "roles" || tab === "users" },
  );
  const customRoles = rolesQ.state.status === "success" ? rolesQ.state.data.customRoles : [];

  async function patchUser(id: string, data: Record<string, unknown>) {
    await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    usersQ.retry();
  }
  async function removeUser(id: string) {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    usersQ.retry();
  }
  async function deleteRole(id: string) {
    await fetch(`/api/roles/${id}`, { method: "DELETE" });
    rolesQ.retry();
  }

  if (!company?.id && !companyLoading) return <NoCompanyState />;

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Users &amp; Roles</h1>
        {tab === "users" ? (
          <button onClick={() => setOpen(true)} disabled={!company?.id}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 11, border: "none", background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "var(--on-ac)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <Icon name="plus" size={15} sw={2.4} /> Invite user
          </button>
        ) : (
          <button onClick={() => setRoleModal("new")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 11, border: "none", background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "var(--on-ac)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <Icon name="plus" size={15} sw={2.4} /> New role
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

      <Modal open={roleModal !== null} onClose={() => setRoleModal(null)}
        title={roleModal === "new" ? "Create a custom role" : "Edit role"}>
        {roleModal !== null && (
          <RoleForm
            role={roleModal === "new" ? null : roleModal}
            allPermissions={rolesQ.state.status === "success" ? rolesQ.state.data.allPermissions : []}
            onDone={() => { setRoleModal(null); rolesQ.retry(); }}
          />
        )}
      </Modal>

      {tab === "users" ? (
        <AsyncBoundary state={usersQ.state} onRetry={usersQ.retry} isEmpty={(u) => u.length === 0} empty={<div style={{ padding: 32, color: "var(--t3)" }}>No team members yet.</div>}>
          {(users) => mobile ? (
            <div role="list" aria-label="Team members" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {users.map((u) => (
                <div key={u.id} role="listitem" style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ color: "var(--t3)", fontSize: 12 }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_TONE[u.status] ?? "var(--t2)", textTransform: "capitalize" }}>{u.status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--t2)" }}>
                    <span style={{ textTransform: "capitalize", fontWeight: 500, color: "var(--tx)" }}>{u.roleId ? `Custom: ${customRoles.find(r => r.id === u.roleId)?.name ?? 'Unknown'}` : u.role}</span>
                    {u.title && <span> • {u.title}</span>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
                    <button onClick={() => patchUser(u.id, { status: u.status === "disabled" ? "active" : "disabled" })}
                      style={{ ...linkBtn, marginInlineStart: 0 }}>{u.status === "disabled" ? "Enable" : "Disable"}</button>
                    <button onClick={() => removeUser(u.id)} style={{ ...linkBtn, color: "var(--dang)", marginInlineStart: 0 }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-scroll">
              <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 16, overflow: "hidden", minWidth: 600 }}>
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
                          <select
                            aria-label={`Role for ${u.name}`}
                            value={u.roleId ? `custom:${u.roleId}` : u.role}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v.startsWith("custom:")) patchUser(u.id, { roleId: v.slice(7) });
                              else patchUser(u.id, { role: v });
                            }}
                            style={{ ...modalInput, padding: "6px 8px", width: "auto", textTransform: "capitalize" }}>
                            <optgroup label="System roles">
                              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </optgroup>
                            {customRoles.length > 0 && (
                              <optgroup label="Custom roles">
                                {customRoles.map((r) => <option key={r.id} value={`custom:${r.id}`}>{r.name}</option>)}
                              </optgroup>
                            )}
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
            </div>
          )}
        </AsyncBoundary>
      ) : (
        <AsyncBoundary state={rolesQ.state} onRetry={rolesQ.retry}>
          {(data) => (
            <>
              {data.customRoles.length > 0 && (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".05em", margin: "4px 0 12px" }}>Custom roles</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginBottom: 24 }}>
                    {data.customRoles.map((r) => (
                      <div key={r.id} style={{ padding: 18, borderRadius: 14, background: "var(--s1)", border: "1px solid var(--ac)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</div>
                          <span style={{ fontSize: 11.5, color: "var(--t3)" }}>{r.userCount} user{r.userCount === 1 ? "" : "s"}</span>
                        </div>
                        {r.description && <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 10 }}>{r.description}</div>}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                          {r.permissions.map((p) => (
                            <span key={p} style={{ fontSize: 11, fontFamily: "var(--fmono)", padding: "3px 8px", borderRadius: 6, background: "var(--acs)", color: "var(--ac)" }}>{p}</span>
                          ))}
                        </div>
                        <div>
                          <button onClick={() => setRoleModal(r)} style={{ ...linkBtn, marginInlineStart: 0 }}>Edit</button>
                          <button onClick={() => deleteRole(r.id)} style={{ ...linkBtn, color: "var(--dang)" }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".05em", margin: "4px 0 12px" }}>System roles</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
                {data.roles.map((r) => (
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
            </>
          )}
        </AsyncBoundary>
      )}
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: "transparent", border: "none", color: "var(--ac)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, marginInlineStart: 12, fontFamily: "inherit" };

function RoleForm({ role, allPermissions, onDone }: { role: CustomRole | null; allPermissions: string[]; onDone: () => void }) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [perms, setPerms] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(p: string) {
    setPerms((s) => {
      const next = new Set(s);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (perms.size === 0) {
      setError("Select at least one permission.");
      return;
    }
    setBusy(true); setError("");
    try {
      const res = await fetch(role ? `/api/roles/${role.id}` : "/api/roles", {
        method: role ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null, permissions: [...perms] }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not save role");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save role");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit}>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="role-name" style={modalLabel}>Role name</label>
        <input id="role-name" style={modalInput} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} placeholder="e.g. Billing Clerk" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="role-desc" style={modalLabel}>Description (optional)</label>
        <input id="role-desc" style={modalInput} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="What this role is for" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label id="role-perms-label" style={modalLabel}>Permissions</label>
        <div role="group" aria-labelledby="role-perms-label" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
          {allPermissions.map((p) => (
            <label key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontFamily: "var(--fmono)", color: perms.has(p) ? "var(--ac)" : "var(--t2)", cursor: "pointer" }}>
              <input type="checkbox" checked={perms.has(p)} onChange={() => toggle(p)} />
              {p}
            </label>
          ))}
        </div>
      </div>
      {error && <div style={{ color: "var(--dang)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={busy} style={{ ...modalPrimary, opacity: busy ? 0.7 : 1 }}>
          {busy ? "Saving…" : role ? "Save changes" : "Create role"}
        </button>
      </div>
    </form>
  );
}

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
        <div><label htmlFor="invite-name" style={modalLabel}>Name</label><input id="invite-name" style={modalInput} value={form.name} onChange={set("name")} required /></div>
        <div><label htmlFor="invite-email" style={modalLabel}>Email</label><input id="invite-email" style={modalInput} type="email" value={form.email} onChange={set("email")} required /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><label htmlFor="invite-role" style={modalLabel}>Role</label>
          <select id="invite-role" style={modalInput} value={form.role} onChange={set("role")}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div><label htmlFor="invite-title" style={modalLabel}>Designation (optional)</label><input id="invite-title" style={modalInput} value={form.title} onChange={set("title")} placeholder="Chief Accountant" /></div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="invite-password" style={modalLabel}>Temporary password (optional)</label>
        <input id="invite-password" style={modalInput} type="text" value={form.password} onChange={set("password")} placeholder="Leave blank to send an invite" minLength={8} />
      </div>
      {error && <div style={{ color: "var(--dang)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={busy} style={{ ...modalPrimary, opacity: busy ? 0.7 : 1 }}>{busy ? "Saving…" : "Add member"}</button>
      </div>
    </form>
  );
}
