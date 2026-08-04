import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth flows and the client dashboard have no SEO value and the
      // dashboard is private — keep crawlers out of all of them.
      disallow: ["/login", "/dashboard", "/forgot-password", "/reset-password"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
