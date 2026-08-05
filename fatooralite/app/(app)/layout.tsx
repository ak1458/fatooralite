"use client";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { GlowBackground } from "@/components/common/GlowBackground";
import { OnboardingGuard } from "@/components/common/OnboardingGuard";
import { AssistantDock } from "@/components/ai/AssistantDock";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { ApiRefusalWatcher } from "@/components/common/ApiRefusalWatcher";
import { CompanyProvider } from "@/lib/useCompany";
import { FadeIn } from "@/components/common/Motion";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanyProvider>
      <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
        <GlowBackground />
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Sidebar />
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Topbar />
            <main style={{ flex: 1, overflowY: "auto", padding: "26px 28px 60px" }}>
              <OnboardingGuard>
                <TrialBanner />
                <FadeIn>{children}</FadeIn>
              </OnboardingGuard>
            </main>
          </div>
        </div>
        <AssistantDock />
        <ApiRefusalWatcher />
      </div>
    </CompanyProvider>
  );
}
