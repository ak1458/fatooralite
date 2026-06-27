"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              background: "var(--s1)",
              border: "1px solid var(--bd)",
              borderRadius: 16,
              padding: 24,
              boxShadow: "var(--sh)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
              <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: "var(--t3)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>
                ×
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const modalInput: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--bd)",
  background: "var(--s2)", color: "var(--tx)", fontSize: 14, fontFamily: "inherit", outline: "none",
};
export const modalLabel: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 };
export const modalPrimary: React.CSSProperties = {
  padding: "10px 18px", borderRadius: 10, border: "none",
  background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "#04130d",
  fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};

