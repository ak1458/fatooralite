"use client";

import React from "react";
import { ONBOARDING_STEPS, type OnboardingStepKey } from "@/lib/onboarding/steps";

/** Full-viewport centering used by the wizard and its loading fallback. */
export function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Step indicator. Rendered as an ordered list so assistive technology reports
 * position and count, with the current step marked `aria-current` and each
 * item stating its own state in text rather than only through colour.
 */
export function Stepper({ currentStepKey }: { currentStepKey: OnboardingStepKey }) {
  const currentIdx = ONBOARDING_STEPS.findIndex((s) => s.key === currentStepKey);

  return (
    <nav aria-label="Setup progress">
      <ol
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 18,
          justifyContent: "center",
          flexWrap: "wrap",
          listStyle: "none",
          padding: 0,
          margin: "0 0 18px",
        }}
      >
        {ONBOARDING_STEPS.map((s, i) => {
          const done = i < currentIdx;
          const current = i === currentIdx;
          return (
            <li
              key={s.key}
              aria-current={current ? "step" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: i <= currentIdx ? "linear-gradient(150deg,var(--acb),var(--ac))" : "var(--s2)",
                  color: i <= currentIdx ? "#04130d" : "var(--t3)",
                  border: i <= currentIdx ? "none" : "1px solid var(--bd)",
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  color: current ? "var(--tx)" : "var(--t3)",
                  fontWeight: current ? 600 : 500,
                }}
              >
                {s.label}
                <span className="sr-only">
                  {done ? " (completed)" : current ? " (current step)" : " (not started)"}
                </span>
              </span>
              {i < ONBOARDING_STEPS.length - 1 && (
                <span aria-hidden="true" style={{ width: 18, height: 1, background: "var(--bd)" }} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StepTitle({ title, sub, help }: { title: string; sub: string; help?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "var(--fdisp)" }}>{title}</h1>
          <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 4 }}>{sub}</div>
        </div>
        {help && <div style={{ alignSelf: "flex-start" }}>{help}</div>}
      </div>
    </div>
  );
}

/** Key/value line used by the branch list and the finish-step summary. */
export function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "11px 14px",
        borderRadius: 11,
        background: "var(--s2)",
        border: "1px solid var(--bd)",
      }}
    >
      <span style={{ color: "var(--t3)", fontSize: 13 }}>{k}</span>
      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{v}</span>
    </div>
  );
}
