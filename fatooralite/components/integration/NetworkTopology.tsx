"use client";
import { useLang } from "@/lib/i18n/LangProvider";

/** Animated ERP → Engine → capabilities → APIs → ZATCA topology diagram. */
export function NetworkTopology() {
  const { t } = useLang();
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 22,
        border: "1px solid var(--bd)",
        background:
          "radial-gradient(90% 120% at 50% 0%, var(--acs), transparent 60%), var(--s1)",
        boxShadow: "var(--sh)",
        marginBottom: 18,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
        {t.networkTitle}
      </div>
      <svg viewBox="0 0 940 300" style={{ width: "100%", height: "auto", display: "block" }}>
        <g
          stroke="var(--ac)"
          strokeWidth="1.6"
          fill="none"
          strokeDasharray="5 7"
          opacity=".55"
          style={{ animation: "flFlow 1.6s linear infinite" }}
        >
          <path d="M150 150 H250" />
          <path d="M400 150 C450 60 470 60 520 60" />
          <path d="M400 150 C450 120 470 120 520 120" />
          <path d="M400 150 C450 180 470 180 520 180" />
          <path d="M400 150 C450 240 470 240 520 240" />
          <path d="M660 90 C720 90 720 110 770 110" />
          <path d="M660 210 C720 210 720 190 770 190" />
          <path d="M870 110 H900" />
          <path d="M870 190 H900" />
        </g>
        {/* ERP source */}
        <g>
          <rect x="30" y="126" width="120" height="48" rx="12" fill="var(--s2)" stroke="var(--bd)" />
          <text x="90" y="155" fill="var(--t2)" fontSize="13" fontWeight="600" textAnchor="middle">
            ERP / POS
          </text>
        </g>
        {/* engine */}
        <g>
          <rect x="250" y="112" width="150" height="76" rx="18" fill="var(--s2)" stroke="var(--ac)" strokeWidth="1.5" />
          <text x="325" y="146" fill="var(--tx)" fontSize="15" fontWeight="700" textAnchor="middle">
            FatooraLite
          </text>
          <text x="325" y="166" fill="var(--ac)" fontSize="11" fontWeight="600" textAnchor="middle">
            Compliance Engine
          </text>
        </g>
        {/* capabilities */}
        <g fill="var(--s2)" stroke="var(--bd)">
          <rect x="520" y="40" width="140" height="40" rx="11" />
          <rect x="520" y="100" width="140" height="40" rx="11" />
          <rect x="520" y="160" width="140" height="40" rx="11" />
          <rect x="520" y="220" width="140" height="40" rx="11" />
        </g>
        <g fill="var(--t2)" fontSize="12" fontWeight="600" textAnchor="middle">
          <text x="590" y="64">CSID Issuance</text>
          <text x="590" y="124">Cryptographic Stamp</text>
          <text x="590" y="184">XML Validation</text>
          <text x="590" y="244">QR Generation</text>
        </g>
        {/* APIs */}
        <g fill="var(--s2)" stroke="var(--ac)" strokeWidth="1.3">
          <rect x="770" y="92" width="100" height="36" rx="10" />
          <rect x="770" y="172" width="100" height="36" rx="10" />
        </g>
        <g fill="var(--ac)" fontSize="12" fontWeight="700" textAnchor="middle">
          <text x="820" y="115">Clearance</text>
          <text x="820" y="195">Reporting</text>
        </g>
        {/* ZATCA */}
        <g>
          <rect x="900" y="94" width="34" height="32" rx="9" fill="var(--acs)" stroke="var(--ac)" />
          <rect x="900" y="174" width="34" height="32" rx="9" fill="var(--s3)" stroke="var(--bd)" />
        </g>
        <g fill="var(--t3)" fontSize="9" fontWeight="700" textAnchor="middle">
          <text x="917" y="114">PROD</text>
          <text x="917" y="194">TEST</text>
        </g>
      </svg>
    </div>
  );
}
