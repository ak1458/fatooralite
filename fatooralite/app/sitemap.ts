import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/appUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = appUrl();
  const now = new Date();

  const publicRoutes = [
    "",
    "/login",
    "/register",
    "/terms",
    "/privacy",
    "/cookie-policy",
    "/disclaimer",
    "/refund-policy",
    "/cancellation-policy",
    "/data-retention",
    "/acceptable-use",
    "/security-policy",
    "/contact",
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "monthly",
    priority: route === "" ? 1.0 : 0.5,
  }));
}
