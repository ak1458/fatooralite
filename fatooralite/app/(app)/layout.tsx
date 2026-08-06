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
import { useSidebarState } from "@/lib/hooks/useSidebarState";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mode, open, toggle, close } = useSidebarState();

  return (
    <CompanyProvider>
      <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <GlowBackground />
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Sidebar mode={mode} open={open} onClose={close} />
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Topbar sidebarMode={mode} onMenuClick={toggle} />
            <main
              id="main-content"
              style={{
                flex: 1,
                overflowY: "auto",
                // Bottom padding clears the fixed assistant button (54px tall
                // at a 24px inset); at 60px the last row of content sat under it.
                padding: mode === "drawer" ? "18px 14px 96px" : "26px 28px 96px",
              }}
            >
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
