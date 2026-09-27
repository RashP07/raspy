import type { MetadataRoute } from "next";
import { COMPARISONS } from "@/app/content/compare";
import { GUIDES } from "@/app/content/guides";
import { absoluteUrl } from "@/app/lib/site";

const SITE_LAUNCH = "2026-08-09";

/** The newest date across a set of pages, for the index that lists them. */
function newest(dates: string[]): Date {
  const times = dates.map((d) => new Date(d).getTime());
  return new Date(Math.max(new Date(SITE_LAUNCH).getTime(), ...times));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const guideDates = GUIDES.map((g) => g.updated ?? g.published);
  const compareDates = COMPARISONS.map((c) => c.updated ?? c.published);

  return [
    {
      url: absoluteUrl("/"),
      lastModified: newest([...guideDates, ...compareDates]),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/guides"),
      lastModified: newest(guideDates),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...GUIDES.map((guide) => ({
      url: absoluteUrl(`/guides/${guide.slug}`),
      lastModified: new Date(guide.updated ?? guide.published),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: absoluteUrl("/compare"),
      lastModified: newest(compareDates),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...COMPARISONS.map((page) => ({
      url: absoluteUrl(`/compare/${page.slug}`),
      lastModified: new Date(page.updated ?? page.published),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: absoluteUrl("/privacy"),
      lastModified: new Date("2026-08-23"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
