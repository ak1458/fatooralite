import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FatooraLite — ZATCA Compliance",
    short_name: "FatooraLite",
    description: "ZATCA Phase 2 e-invoicing compliance for Saudi SMEs",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07090b",
    theme_color: "#07090b",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
