"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  name: string;
  nameAr: string | null;
  vatNumber: string;
  crNumber?: string | null;
  address?: string | null;
  onboardingStatus?: string;
  onboardingStep?: number;
}
interface Branch { id: string; name: string; city: string | null }

const STEPS = ["Company", "ZATCA connection", "Locations", "Finish"];

const input: React.CSSProperties = {
  width: "100%", padding: "11px 13px", borderRadius: 11, border: "1px solid var(--bd)",
  background: "var(--s2)", color: "var(--tx)", fontSize: 14, fontFamily: "inherit", outline: "none",
};
const label: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 };
const primaryBtn: React.CSSProperties = {
  padding: "11px 20px", borderRadius: 11, border: "none",
  background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "#04130d",
  fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const ghostBtn: React.CSSProperties = {
  padding: "11px 18px", borderRadius: 11, border: "1px solid var(--bd)",
  background: "var(--s1)", color: "var(--t2)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadBranches = useCallback(async (companyId: string) => {
    const d = await fetch(`/api/branches?companyId=${companyId}`).then((r) => r.json()).catch(() => ({ branches: [] }));
    setBranches(d.branches ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (me) => {
        if (!me?.company) { router.replace("/login"); return; }
        if (me.company.onboardingStatus === "complete") { router.replace("/dashboard"); return; }
        setCompany(me.company);
        setStep(Math.min(me.company.onboardingStep ?? 0, 3));
        await loadBranches(me.company.id);
      })
      .finally(() => setLoading(false));
  }, [router, loadBranches]);

  async function patchCompany(data: Record<string, unknown>) {
    const res = await fetch(`/api/companies/${company!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Could not save");
    return res.json();
  }

  async function advance(to: number, extra: Record<string, unknown> = {}) {
    setBusy(true); setError("");
    try {
      const updated = await patchCompany({ onboardingStep: to, onboardingStatus: "in_progress", ...extra });
      setCompany(updated);
      setStep(to);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Centered><div style={{ color: "var(--t3)" }}>Loading…</div></Centered>;
  }
  if (!company) return null;

  return (
    <Centered>
      <div style={{ width: "100%", maxWidth: 620 }}>
        <Stepper step={step} />
        <div style={{ borderRadius: 18, border: "1px solid var(--bd)", background: "var(--s1)", boxShadow: "var(--sh)", padding: 28 }}>
          {error && <div style={{ color: "var(--dang)", fontSize: 13, marginBottom: 14 }}>{error}</div>}

          {step === 0 && (
            <CompanyStep company={company} busy={busy} onNext={(d) => advance(1, d)} />
          )}
          {step === 1 && (
            <ZatcaStep company={company} busy={busy} onSkip={() => advance(2)} onConnected={() => advance(2)} setError={setError} setBusy={setBusy} />
          )}
          {step === 2 && (
            <BranchStep
              company={company}
              branches={branches}
              busy={busy}
              reload={() => loadBranches(company.id)}
              onBack={() => setStep(1)}
              onNext={() => advance(3)}
              setError={setError}
            />
          )}
          {step === 3 && (
            <FinishStep
              company={company}
              branches={branches}
              busy={busy}
              onBack={() => setStep(2)}
              onFinish={async () => {
                setBusy(true); setError("");
                try {
                  // Ensure the company can sign invoices locally (idempotent —
                  // a real ZATCA cert from the connect step is left untouched).
                  await fetch("/api/onboarding/local-cert", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ companyId: company.id }),
                  });
                  await patchCompany({ onboardingStatus: "complete", onboardingStep: 4 });
                  router.push("/dashboard");
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not finish");
                  setBusy(false);
                }
              }}
            />
          )}
        </div>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
      {children}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 18, justifyContent: "center" }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26, height: 26, borderRadius: "50%", fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: i <= step ? "linear-gradient(150deg,var(--acb),var(--ac))" : "var(--s2)",
              color: i <= step ? "#04130d" : "var(--t3)",
              border: i <= step ? "none" : "1px solid var(--bd)",
            }}
          >
            {i + 1}
          </div>
          <span style={{ fontSize: 12.5, color: i === step ? "var(--tx)" : "var(--t3)", fontWeight: i === step ? 600 : 500 }}>{s}</span>
          {i < STEPS.length - 1 && <span style={{ width: 18, height: 1, background: "var(--bd)" }} />}
        </div>
      ))}
    </div>
  );
}

function StepTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "var(--fdisp)" }}>{title}</h1>
      <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function CompanyStep({ company, busy, onNext }: { company: Company; busy: boolean; onNext: (d: Record<string, unknown>) => void }) {
  const [nameAr, setNameAr] = useState(company.nameAr ?? "");
  const [crNumber, setCrNumber] = useState(company.crNumber ?? "");
  const [address, setAddress] = useState(company.address ?? "");
  return (
    <div>
      <StepTitle title="Company profile" sub="Confirm your business details for ZATCA." />
      <div style={{ marginBottom: 13 }}>
        <label style={label}>Legal name (English)</label>
        <input style={{ ...input, opacity: 0.7 }} value={company.name} readOnly />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 13 }}>
        <div>
          <label style={label}>Name (Arabic)</label>
          <input style={input} value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
        </div>
        <div>
          <label style={label}>VAT number</label>
          <input style={{ ...input, opacity: 0.7, fontFamily: "var(--fmono)" }} value={company.vatNumber} readOnly />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 13 }}>
        <div>
          <label style={label}>CR number</label>
          <input style={input} value={crNumber} onChange={(e) => setCrNumber(e.target.value)} />
        </div>
        <div>
          <label style={label}>Address</label>
          <input style={input} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy}
          onClick={() => onNext({ nameAr: nameAr || null, crNumber: crNumber || null, address: address || null })}>
          Continue
        </button>
      </div>
    </div>
  );
}

function ZatcaStep({ company, busy, onSkip, onConnected, setError, setBusy }: {
  company: Company; busy: boolean; onSkip: () => void; onConnected: () => void;
  setError: (s: string) => void; setBusy: (b: boolean) => void;
}) {
  const [mode, setMode] = useState<"sandbox" | "production">("sandbox");
  const [otp, setOtp] = useState("");

  async function connect() {
    if (!otp.trim()) { setError("Enter the OTP from the ZATCA Fatoora portal, or skip for now."); return; }
    setBusy(true); setError("");
    try {
      const start = await fetch("/api/onboarding/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, otp, commonName: company.name, organizationalUnit: "Main", mode }),
      });
      if (!start.ok) throw new Error((await start.json()).error || "ZATCA onboarding failed");
      const done = await fetch("/api/onboarding/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, mode }),
      });
      if (!done.ok) throw new Error((await done.json()).error || "Production CSID request failed");
      onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZATCA onboarding failed");
      setBusy(false);
    }
  }

  return (
    <div>
      <StepTitle title="Connect to ZATCA" sub="Onboard your device to clear & report invoices. You can also do this later." />
      <div style={{ marginBottom: 14 }}>
        <label style={label}>Environment</label>
        <div style={{ display: "flex", gap: 10 }}>
          {(["sandbox", "production"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              style={{
                flex: 1, padding: "10px", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 13,
                border: mode === m ? "1px solid var(--ac)" : "1px solid var(--bd)",
                background: mode === m ? "var(--acs)" : "var(--s2)", color: mode === m ? "var(--ac)" : "var(--t2)",
                textTransform: "capitalize",
              }}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={label}>ZATCA portal OTP</label>
        <input style={{ ...input, fontFamily: "var(--fmono)" }} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>
          Get this from the ZATCA Fatoora portal (Onboard new solution). No OTP yet? Skip and connect from Settings later.
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <button style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={onSkip}>Skip for now</button>
        <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={connect}>
          {busy ? "Connecting…" : "Connect"}
        </button>
      </div>
    </div>
  );
}

function BranchStep({ company, branches, busy, reload, onBack, onNext, setError }: {
  company: Company; branches: Branch[]; busy: boolean; reload: () => void;
  onBack: () => void; onNext: () => void; setError: (s: string) => void;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!name.trim()) { setError("Branch name is required."); return; }
    setAdding(true); setError("");
    try {
      const res = await fetch("/api/branches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, name, city: city || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not add branch");
      setName(""); setCity("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add branch");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <StepTitle title="Locations" sub="Add at least one branch/location. Invoices are issued per location." />
      {branches.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {branches.map((b) => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderRadius: 11, background: "var(--s2)", border: "1px solid var(--bd)" }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{b.name}</span>
              <span style={{ color: "var(--t3)", fontSize: 13 }}>{b.city || "—"}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr auto", gap: 10, marginBottom: 18, alignItems: "end" }}>
        <div>
          <label style={label}>Branch name</label>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Riyadh HQ" />
        </div>
        <div>
          <label style={label}>City</label>
          <input style={input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Riyadh" />
        </div>
        <button style={{ ...ghostBtn, opacity: adding ? 0.6 : 1 }} disabled={adding} onClick={add}>Add</button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button style={ghostBtn} onClick={onBack}>Back</button>
        <button style={{ ...primaryBtn, opacity: branches.length === 0 || busy ? 0.5 : 1 }} disabled={branches.length === 0 || busy} onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  );
}

function FinishStep({ company, branches, busy, onBack, onFinish }: {
  company: Company; branches: Branch[]; busy: boolean; onBack: () => void; onFinish: () => void;
}) {
  return (
    <div>
      <StepTitle title="You're ready" sub="Review and enter your dashboard." />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        <Row k="Company" v={company.name} />
        <Row k="VAT number" v={company.vatNumber} />
        <Row k="Locations" v={branches.map((b) => b.name).join(", ") || "—"} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button style={ghostBtn} onClick={onBack}>Back</button>
        <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={onFinish}>
          {busy ? "Finishing…" : "Go to dashboard"}
        </button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderRadius: 11, background: "var(--s2)", border: "1px solid var(--bd)" }}>
      <span style={{ color: "var(--t3)", fontSize: 13 }}>{k}</span>
      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{v}</span>
    </div>
  );
}
