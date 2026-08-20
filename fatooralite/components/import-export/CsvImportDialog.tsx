"use client";
import { useRef, useState } from "react";
import { Modal, modalPrimary } from "@/components/common/Modal";

interface RowResult {
  row: number;
  verdict: "create" | "skip-duplicate" | "error";
  message?: string;
}
interface ImportPreview {
  headers: string[];
  results: RowResult[];
  summary: { create: number; skipDuplicate: number; error: number };
}

/**
 * Entity-agnostic CSV import dialog (Phase 5 / N4). The file is read
 * client-side with FileReader and posted as JSON text — no multipart, no
 * file object ever reaches a server route (see the import routes' own
 * comment for why that matters).
 */
export function CsvImportDialog({
  open,
  onClose,
  title,
  endpoint,
  companyId,
  templateHeaders,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  endpoint: string;
  companyId: string;
  templateHeaders: string[];
  onImported: () => void;
}) {
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function reset() {
    setCsv(null);
    setFileName("");
    setPreview(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function downloadTemplate() {
    const blob = new Blob([templateHeaders.join(",") + "\r\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setPreview(null);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsText(file);
  }

  async function runPreview() {
    if (!csv) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, csv, mode: "preview" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Preview failed (${res.status}).`);
        return;
      }
      setPreview(data as ImportPreview);
    } catch {
      setError("Connection error.");
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    if (!csv) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, csv, mode: "commit" }),
      });
      const data = await res.json();
      if (!res.ok) {
        // A 422 still carries the per-row verdict table — show it, don't discard it.
        if (data.results) setPreview(data as ImportPreview);
        setError(data.error || `Import failed (${res.status}).`);
        return;
      }
      onImported();
      reset();
      onClose();
    } catch {
      setError("Connection error.");
    } finally {
      setBusy(false);
    }
  }

  const errorRows = preview?.results.filter((r) => r.verdict === "error") ?? [];
  const canCommit = !!preview && preview.summary.error === 0 && preview.summary.create > 0;

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title={title}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <button onClick={downloadTemplate} style={{ alignSelf: "flex-start", background: "transparent", border: "1px solid var(--bd)", color: "var(--t2)", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit", padding: "7px 12px", borderRadius: 8 }}>
          Download template
        </button>

        <div>
          <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={onFile} style={{ fontSize: 13 }} />
          {fileName && <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 6 }}>{fileName}</div>}
        </div>

        {csv && !preview && (
          <button onClick={runPreview} disabled={busy} style={{ ...modalPrimary, opacity: busy ? 0.7 : 1, alignSelf: "flex-start" }}>
            {busy ? "Checking…" : "Preview"}
          </button>
        )}

        {preview && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 13, color: "var(--t2)" }}>
              {preview.summary.create} to create · {preview.summary.skipDuplicate} duplicate(s) skipped · {preview.summary.error} error(s)
            </div>
            {errorRows.length > 0 && (
              <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--bd)", borderRadius: 8, padding: "8px 10px" }}>
                {errorRows.map((r) => (
                  <div key={r.row} style={{ fontSize: 12, color: "var(--dang)", padding: "3px 0" }}>
                    Row {r.row}: {r.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <div style={{ color: "var(--dang)", fontSize: 12.5 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => { reset(); onClose(); }} style={{ background: "transparent", border: "1px solid var(--bd)", color: "var(--t2)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: "9px 16px", borderRadius: 10 }}>
            Cancel
          </button>
          {canCommit && (
            <button onClick={runCommit} disabled={busy} style={{ ...modalPrimary, opacity: busy ? 0.7 : 1 }}>
              {busy ? "Importing…" : `Import ${preview.summary.create}`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
