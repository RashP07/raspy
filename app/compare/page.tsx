import type { Metadata } from "next";
import Link from "next/link";
import { COMPARISONS } from "@/app/content/compare";
import { JsonLd } from "@/app/components/site/JsonLd";
import { Breadcrumbs, SitePage } from "@/app/components/site/SiteChrome";
import { absoluteUrl, SITE_NAME } from "@/app/lib/site";

const TITLE = "Raspy compared with other online photo editors";
const DESCRIPTION =
  "Honest comparisons of Raspy with Photopea, Pixlr, Canva, Fotor, Adobe Express, Google Photos and the iPhone Photos app: where photos are processed, what is free, and what each one can do.";

export const metadata: Metadata = {
  title: "Compare online photo editors",
  description: DESCRIPTION,
  alternates: { canonical: "/compare" },
  openGraph: {
    type: "website",
    url: "/compare",
    siteName: SITE_NAME,
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

export default function CompareIndexPage() {
  return (
    <SitePage>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: TITLE,
          description: DESCRIPTION,
          url: absoluteUrl("/compare"),
          isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
          hasPart: COMPARISONS.map((page) => ({
            "@type": "Article",
            headline: page.title,
            url: absoluteUrl(`/compare/${page.slug}`),
          })),
        }}
      />
      <Breadcrumbs
        items={[
          { href: "/", label: "Raspy" },
          { href: "/compare", label: "Compare" },
        ]}
      />
      <header className="flex flex-col gap-3">
        <h1 className="text-display font-medium text-balance">{TITLE}</h1>
        <p className="text-body leading-normal text-muted">
          Raspy does one narrow job: the iPhone Photos adjustments, crop and
          straighten, on your own device. Most of the editors below do far
          more. These pages say plainly where each one wins, with sources,
          so you can pick the right tool rather than the one that shouts
          loudest.
        </p>
      </header>
      <ul className="flex flex-col divide-y divide-hairline">
        {COMPARISONS.map((page) => (
          <li key={page.slug} className="py-5">
            <Link
              href={`/compare/${page.slug}`}
              prefetch={false}
              className="group flex flex-col gap-1.5 no-underline"
            >
              <h2 className="text-body font-semibold text-fg group-hover:underline group-hover:underline-offset-4">
                {page.title}
              </h2>
              <p className="text-label leading-normal text-muted">
                {page.verdict}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </SitePage>
  );
}
