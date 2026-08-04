import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fatooralite.com";
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
