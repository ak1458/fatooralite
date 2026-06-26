import type { Metadata, Viewport } from "next";
import {
  Space_Grotesk,
  Hanken_Grotesk,
  IBM_Plex_Sans_Arabic,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { PWARegister } from "@/components/common/PWARegister";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});
const ui = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-ui",
});
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "FatooraLite — ZATCA Compliance",
  description: "ZATCA Phase 2 e-invoicing compliance for Saudi SMEs",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "FatooraLite", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#07090b",
  width: "device-width",
  initialScale: 1,
};

// Applies the persisted theme/lang before first paint to avoid a flash.
const ANTI_FLASH = `
try {
  var e = document.documentElement;
  var t = localStorage.getItem('fl-theme');
  var l = localStorage.getItem('fl-lang');
  if (t) e.setAttribute('data-theme', t);
  if (l) { e.setAttribute('data-lang', l); e.setAttribute('lang', l); e.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr'); }
} catch (_) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-theme="dark"
      data-lang="ar"
      className={`${display.variable} ${ui.variable} ${arabic.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <LangProvider>{children}</LangProvider>
        </ThemeProvider>
        <PWARegister />
      </body>
    </html>
  );
}
