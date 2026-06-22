import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { GlowBackground } from "@/components/common/GlowBackground";
import { CompanyProvider } from "@/lib/useCompany";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
            <CompanyProvider>
              {children}
            </CompanyProvider>
          </main>
        </div>
      </div>
    </div>
  );
}
