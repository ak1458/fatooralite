import type { Metadata, Viewport } from "next";
import { appUrl } from "@/lib/appUrl";
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
  title: {
    default: "Fatoora Lite Pro — ZATCA Phase-2 E-Invoicing Platform",
    template: "%s | Fatoora Lite Pro",
  },
  description: "Enterprise ZATCA Phase-2 e-invoicing SaaS platform for Saudi Arabian businesses. Compliant cryptographic clearance, reporting, and automated tax invoicing.",
  keywords: ["ZATCA", "E-invoicing", "Saudi Arabia", "VAT", "Fatoora", "Phase-2", "CSID", "Tax Invoice"],
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Fatoora Lite Pro", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "Fatoora Lite Pro — ZATCA Phase-2 E-Invoicing Platform",
    description: "Enterprise ZATCA Phase-2 e-invoicing SaaS platform for Saudi Arabian businesses.",
    url: appUrl(),
    siteName: "Fatoora Lite Pro",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fatoora Lite Pro — ZATCA Phase-2 E-Invoicing",
    description: "ZATCA Phase-2 compliant e-invoicing platform for Saudi businesses.",
  },
};

export const viewport: Viewport = {
  // Mobile browser chrome. A single value pinned the address bar to the dark
  // palette even for a user in light mode. These are --bg from globals.css;
  // they cannot read the CSS variable, so keep them in step with it.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1ef" },
    { media: "(prefers-color-scheme: dark)", color: "#07090b" },
  ],
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
