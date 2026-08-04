"use client";

import { useState } from "react";
import { HelpLinks } from "../HelpLink";
import { Field } from "../Field";
import { StepNav } from "../StepNav";
import { StepTitle, SummaryRow } from "../WizardChrome";
import { ghostBtn, input } from "../styles";
import type { Branch, Company } from "../types";

interface BranchesStepProps {
  company: Company;
  branches: Branch[];
  busy: boolean;
  reload: () => void;
  onBack: () => void;
  onNext: () => void;
  setError: (message: string) => void;
}

export function BranchesStep({ company, branches, busy, reload, onBack, onNext, setError }: BranchesStepProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [adding, setAdding] = useState(false);
  const [nameError, setNameError] = useState("");

  const add = async () => {
    if (!name.trim()) {
      setNameError("Branch name is required.");
      return;
    }
    setNameError("");
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, name, city: city || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not add branch");
      setName("");
      setCity("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add branch");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <StepTitle
        title="Locations"
        sub="Add at least one branch/location. Invoices are issued per location."
        help={<HelpLinks.branch />}
      />

      <div aria-live="polite">
        {branches.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {branches.map((b) => (
              <SummaryRow key={b.id} k={b.name} v={b.city || "—"} />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr auto", gap: 10, marginBottom: 18, alignItems: "end" }}>
        <Field id="branch-name" label="Branch name" required error={nameError}>
          {(p) => (
            <input
              {...p}
              style={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Riyadh HQ"
              maxLength={100}
            />
          )}
        </Field>

        <Field id="branch-city" label="City">
          {(p) => (
            <input
              {...p}
              style={input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Riyadh"
              maxLength={100}
            />
          )}
        </Field>

        <button type="button" style={{ ...ghostBtn, opacity: adding ? 0.6 : 1 }} disabled={adding} onClick={add}>
          {adding ? "Adding…" : "Add"}
        </button>
      </div>

      <StepNav onBack={onBack} onNext={onNext} busy={busy} nextDisabled={branches.length === 0} />
      {branches.length === 0 && (
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 8, textAlign: "right" }}>
          Add at least one location to continue.
        </div>
      )}
    </div>
  );
}
