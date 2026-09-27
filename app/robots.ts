import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/app/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // A component reference for whoever works on the app, not a page.
        disallow: ["/design"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
