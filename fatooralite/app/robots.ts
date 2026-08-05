import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/appUrl";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = appUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/terms", "/privacy", "/cookie-policy", "/disclaimer", "/refund-policy", "/contact"],
      disallow: ["/api/", "/dashboard/", "/onboarding/", "/invoices/", "/customers/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
