"use client";
import { useState, useEffect } from "react";
import { useCompany } from "@/lib/useCompany";
import { Card } from "@/components/ui/Card";
import { useLang } from "@/lib/i18n/LangProvider";

export default function SettingsPage() {
  const { company } = useCompany();
  
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [crNumber, setCrNumber] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!company?.id) return;
    fetch(`/api/companies/${company.id}`)
      .then(res => res.json())
      .then(data => {
        setName(data.name || "");
        setNameAr(data.nameAr || "");
        setVatNumber(data.vatNumber || "");
        setCrNumber(data.crNumber || "");
        setAddress(data.address || "");
      })
      .catch(console.error);
  }, [company?.id]);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/companies/${company?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nameAr, vatNumber, crNumber, address })
      });
      if (res.ok) {
        setMessage("Settings saved successfully.");
      } else {
        setMessage("Failed to save settings.");
      }
    } catch {
      setMessage("Error saving settings.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid var(--bd)",
    background: "var(--s2)",
    color: "var(--tx)",
    fontSize: 14,
    fontFamily: "inherit",
    marginBottom: 16
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Card style={{ padding: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 0, marginBottom: 24 }}>Company Settings</h1>
        
        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--t2)", fontWeight: 500 }}>Company Name (English)</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />

        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--t2)", fontWeight: 500 }}>Company Name (Arabic)</label>
        <input value={nameAr} onChange={e => setNameAr(e.target.value)} style={inputStyle} dir="rtl" />

        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--t2)", fontWeight: 500 }}>VAT Number (15 digits)</label>
        <input value={vatNumber} onChange={e => setVatNumber(e.target.value)} style={inputStyle} />

        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--t2)", fontWeight: 500 }}>CR Number</label>
        <input value={crNumber} onChange={e => setCrNumber(e.target.value)} style={inputStyle} />

        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--t2)", fontWeight: 500 }}>Registered Address</label>
        <textarea value={address} onChange={e => setAddress(e.target.value)} style={{ ...inputStyle, minHeight: 80 }} />

        {message && <div style={{ marginBottom: 16, color: message.includes("success") ? "var(--ac)" : "var(--dang)", fontSize: 13 }}>{message}</div>}

        <button 
          onClick={save} 
          disabled={saving}
          style={{
            padding: "12px 24px",
            borderRadius: 11,
            border: "none",
            background: "linear-gradient(150deg,var(--acb),var(--ac))",
            color: "#04130d",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </Card>
    </div>
  );
}
