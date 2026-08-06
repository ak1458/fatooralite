"use client";

import React from "react";
import { errorText, hintText, labelStyle } from "./styles";

interface FieldProps {
  /** Becomes the control's `id` and the label's `htmlFor`. Must be unique per step. */
  id: string;
  label: string;
  required?: boolean;
  /** A `HelpLinks.*` element, rendered to the right of the label. */
  help?: React.ReactNode;
  /** Message shown below the control; also announced and wired via aria-describedby. */
  error?: string;
  /** Static guidance shown below the control when there is no error. */
  hint?: string;
  /** Receives `id`, `aria-required`, `aria-invalid` and `aria-describedby`. */
  children: (props: FieldControlProps) => React.ReactNode;
}

export interface FieldControlProps {
  id: string;
  "aria-required"?: true;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

/**
 * Labelled form field for the wizard.
 *
 * Every step previously wrote a bare `<label>` next to its `<input>` with no
 * `id`/`htmlFor`, so the two were visually adjacent but not programmatically
 * associated: screen readers announced the control unlabelled and clicking the
 * label text did not focus the field. Routing every field through this
 * component makes the association structural — a new field cannot be added
 * without one — rather than something each step has to remember.
 *
 * The control is supplied as a function so it receives the generated `id` and
 * ARIA attributes, and so `<select>`, `<input>` and read-only variants all
 * work without this component needing to know which is which.
 */
export function Field({ id, label, required, help, error, hint, children }: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        <label htmlFor={id} style={{ ...labelStyle, marginBottom: 0 }}>
          {label}
          {required && (
            <span style={{ color: "var(--dang)" }} aria-hidden="true">
              {" *"}
            </span>
          )}
        </label>
        {help}
      </div>
      {children({
        id,
        ...(required ? { "aria-required": true as const } : {}),
        ...(error ? { "aria-invalid": true as const } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}
      {error && (
        <div id={errorId} role="alert" style={errorText}>
          {error}
        </div>
      )}
      {hint && !error && (
        <div id={hintId} style={hintText}>
          {hint}
        </div>
      )}
    </div>
  );
}
