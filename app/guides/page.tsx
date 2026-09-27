import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/app/content/guides";
import { JsonLd } from "@/app/components/site/JsonLd";
import { Breadcrumbs, SitePage } from "@/app/components/site/SiteChrome";
import { absoluteUrl, SITE_NAME } from "@/app/lib/site";

const TITLE = "Photo editing guides";
const DESCRIPTION =
  "Short, practical guides to editing photos in the browser: opening HEIC files anywhere, fixing exposure, straightening, cropping for Instagram, and what each adjustment does.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guides" },
  openGraph: {
    type: "website",
    url: "/guides",
    siteName: SITE_NAME,
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

export default function GuidesIndexPage() {
  return (
    <SitePage>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: TITLE,
          description: DESCRIPTION,
          url: absoluteUrl("/guides"),
          isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
          hasPart: GUIDES.map((guide) => ({
            "@type": "Article",
            headline: guide.title,
            url: absoluteUrl(`/guides/${guide.slug}`),
          })),
        }}
      />
      <Breadcrumbs
        items={[
          { href: "/", label: "Raspy" },
          { href: "/guides", label: "Guides" },
        ]}
      />
      <header className="flex flex-col gap-3">
        <h1 className="text-display font-medium text-balance">{TITLE}</h1>
        <p className="text-body leading-normal text-muted">
          Each guide is a few minutes long and ends with the exact steps in
          Raspy. Everything described here runs in your browser, with no
          upload.
        </p>
      </header>
      <ul className="flex flex-col divide-y divide-hairline">
        {GUIDES.map((guide) => (
          <li key={guide.slug} className="py-5">
            <Link
              href={`/guides/${guide.slug}`}
              prefetch={false}
              className="group flex flex-col gap-1.5 no-underline"
            >
              <h2 className="text-body font-semibold text-fg group-hover:underline group-hover:underline-offset-4">
                {guide.title}
              </h2>
              <p className="text-label leading-normal text-muted">
                {guide.description}
              </p>
              <p className="text-caption text-muted">{guide.minutes} min read</p>
            </Link>
          </li>
        ))}
      </ul>
    </SitePage>
  );
}
