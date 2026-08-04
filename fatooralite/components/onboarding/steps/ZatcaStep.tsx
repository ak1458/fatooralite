"use client";

import { useState } from "react";
import { HelpLinks } from "../HelpLink";
import { Field } from "../Field";
import { StepTitle } from "../WizardChrome";
import { ghostBtn, input, labelStyle, primaryBtn, stepNav } from "../styles";
import type { Company } from "../types";

/**
 * Activation runs three gateway calls behind one request, so the button would
 * otherwise sit silent for the better part of a minute. These labels are
 * timed to the typical duration of each phase — they report which phase is
 * expected to be running, not a confirmed server state.
 */
const PROGRESS_STEPS = [
  { at: 0, label: "Requesting certificate…" },
  { at: 2500, label: "Running compliance checks…" },
  { at: 6000, label: "Activating production CSID…" },
];

interface ZatcaStepProps {
  company: Company;
  busy: boolean;
  onSkip: () => void;
  onConnected: () => void;
  setError: (message: string) => void;
  setBusy: (busy: boolean) => void;
}

export function ZatcaStep({ company, busy, onSkip, onConnected, setError, setBusy }: ZatcaStepProps) {
  const [mode, setMode] = useState<"sandbox" | "production">("sandbox");
  const [otp, setOtp] = useState("");
  const [progress, setProgress] = useState("");
  const [otpError, setOtpError] = useState("");

  const connect = async () => {
    if (!otp.trim()) {
      setOtpError("Enter the OTP from the ZATCA Fatoora portal, or skip for now.");
      return;
    }
    setOtpError("");
    setBusy(true);
    setError("");
    setProgress(PROGRESS_STEPS[0].label);
    const timers = PROGRESS_STEPS.slice(1).map((s) => setTimeout(() => setProgress(s.label), s.at));
    try {
      const res = await fetch("/api/onboarding/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, otp, mode }),
      });
      const data = await res.json();
      if (!res.ok || data.step !== "done") {
        const stepLabel = data.step === "compliance" ? "Compliance checks" : "Certificate request";
        throw new Error(data.error ? `${stepLabel}: ${data.error}` : "ZATCA onboarding failed");
      }
      onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZATCA onboarding failed");
      setBusy(false);
    } finally {
      timers.forEach(clearTimeout);
      setProgress("");
    }
  };

  return (
    <div>
      <StepTitle
        title="Connect to ZATCA"
        sub="Onboard your device to clear & report invoices. You can also do this later."
        help={<HelpLinks.zatcaOtp />}
      />

      <fieldset style={{ border: "none", padding: 0, margin: "0 0 14px" }}>
        <legend style={labelStyle}>Environment</legend>
        <div style={{ display: "flex", gap: 10 }}>
          {(["sandbox", "production"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 11,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 13,
                border: mode === m ? "1px solid var(--ac)" : "1px solid var(--bd)",
                background: mode === m ? "var(--acs)" : "var(--s2)",
                color: mode === m ? "var(--ac)" : "var(--t2)",
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </fieldset>

      <div style={{ marginBottom: 16 }}>
        <Field
          id="zatca-otp"
          label="ZATCA portal OTP"
          help={<HelpLinks.zatcaOtp />}
          error={otpError}
          hint="Get this from the ZATCA Fatoora portal (Onboard new solution). No OTP yet? Skip and connect from Settings later."
        >
          {(p) => (
            <input
              {...p}
              style={{ ...input, fontFamily: "var(--fmono)" }}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          )}
        </Field>
        {progress && (
          <div
            role="status"
            aria-live="polite"
            style={{ fontSize: 12.5, color: "var(--ac)", marginTop: 8, fontWeight: 600 }}
          >
            {progress}
          </div>
        )}
      </div>

      <div style={stepNav}>
        <button type="button" style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={onSkip}>
          Skip for now
        </button>
        <button type="button" style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={connect}>
          {busy ? progress || "Connecting…" : "Connect"}
        </button>
      </div>
    </div>
  );
}
