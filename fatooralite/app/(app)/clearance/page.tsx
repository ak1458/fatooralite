"use client";
import { ClearanceStats } from "@/components/clearance/ClearanceStats";
import { ClearanceFeed } from "@/components/clearance/ClearanceFeed";
import { SuccessDonut } from "@/components/clearance/SuccessDonut";

export default function ClearancePage() {
  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <ClearanceStats />
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18 }}>
        <ClearanceFeed />
        <SuccessDonut />
      </div>
    </div>
  );
}
