"use client";
import { ChatThread } from "@/components/ai/ChatThread";
import { InsightsPanel } from "@/components/ai/InsightsPanel";

export default function AiPage() {
  return (
    <div
      style={{
        maxWidth: 1480,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr",
        gap: 18,
        alignItems: "start",
      }}
    >
      <ChatThread />
      <InsightsPanel />
    </div>
  );
}
