import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The invoice PDF embeds Amiri to render Arabic (lib/pdf/fonts.ts reads the
  // TTFs from assets/fonts at runtime). Next's tracer cannot see a path built
  // with process.cwd(), so without this the font files are absent from the
  // serverless bundle and every Arabic invoice fails in production while
  // working locally.
  outputFileTracingIncludes: {
    "/api/invoices/[id]/pdf": ["./assets/fonts/**"],
  },
};

export default nextConfig;
