import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fatooralite.com";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/terms", "/privacy", "/cookie-policy", "/disclaimer", "/refund-policy", "/contact"],
      disallow: ["/api/", "/dashboard/", "/onboarding/", "/invoices/", "/customers/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
