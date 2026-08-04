"use client";

import React from "react";
import { ghostBtn, primaryBtn, stepNav } from "./styles";

interface StepNavProps {
  onBack?: () => void;
  backLabel?: string;
  onNext: () => void;
  nextLabel?: string;
  busy?: boolean;
  /** Disables Next for a reason other than busy (e.g. no branches added yet). */
  nextDisabled?: boolean;
}

/** Back/Continue pair at the foot of every wizard step. */
export function StepNav({
  onBack,
  backLabel = "Back",
  onNext,
  nextLabel = "Continue",
  busy = false,
  nextDisabled = false,
}: StepNavProps) {
  const disabled = busy || nextDisabled;
  return (
    <div style={stepNav}>
      {onBack ? (
        <button type="button" style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={onBack}>
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        style={{ ...primaryBtn, opacity: disabled ? 0.6 : 1 }}
        disabled={disabled}
        onClick={onNext}
      >
        {nextLabel}
      </button>
    </div>
  );
}
