import type React from "react";

/**
 * Shared inline styles for the onboarding wizard. These were duplicated at the
 * top of the single 787-line page component; every step now imports them.
 */

export const input: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 11,
  border: "1px solid var(--bd)",
  background: "var(--s2)",
  color: "var(--tx)",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

export const readOnlyInput: React.CSSProperties = { ...input, opacity: 0.7 };

export const monoReadOnlyInput: React.CSSProperties = {
  ...readOnlyInput,
  fontFamily: "var(--fmono)",
};

export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--t3)",
  marginBottom: 5,
};

export const primaryBtn: React.CSSProperties = {
  padding: "11px 20px",
  borderRadius: 11,
  border: "none",
  background: "linear-gradient(150deg,var(--acb),var(--ac))",
  color: "#04130d",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

export const ghostBtn: React.CSSProperties = {
  padding: "11px 18px",
  borderRadius: 11,
  border: "1px solid var(--bd)",
  background: "var(--s1)",
  color: "var(--t2)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

export const section: React.CSSProperties = { marginBottom: 18 };

export const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 13,
};

export const errorText: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--dang)",
  marginTop: 3,
};

export const hintText: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--t3)",
  marginTop: 4,
};

export const groupHeading: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 12,
  color: "var(--tx)",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export const stepNav: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 6,
};
