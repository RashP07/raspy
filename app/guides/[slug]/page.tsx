import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, guideBySlug } from "@/app/content/guides";
import { JsonLd } from "@/app/components/site/JsonLd";
import {
  Breadcrumbs,
  primaryLinkClass,
  SitePage,
} from "@/app/components/site/SiteChrome";
import {
  absoluteUrl,
  AUTHOR_NAME,
  AUTHOR_URL,
  SITE_NAME,
} from "@/app/lib/site";

interface Params {
  slug: string;
}

export function generateStaticParams(): Params[] {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return {};
  const path = `/guides/${guide.slug}`;
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      siteName: SITE_NAME,
      title: `${guide.title} | ${SITE_NAME}`,
      description: guide.description,
      publishedTime: guide.published,
      modifiedTime: guide.updated ?? guide.published,
      authors: [AUTHOR_URL],
    },
    twitter: {
      card: "summary_large_image",
      title: `${guide.title} | ${SITE_NAME}`,
      description: guide.description,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const url = absoluteUrl(`/guides/${guide.slug}`);
  const related = guide.related
    .map((s) => guideBySlug(s))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  return (
    <SitePage>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.description,
          url,
          mainEntityOfPage: url,
          datePublished: guide.published,
          dateModified: guide.updated ?? guide.published,
          author: { "@type": "Person", name: AUTHOR_NAME, url: AUTHOR_URL },
          publisher: { "@type": "Person", name: AUTHOR_NAME, url: AUTHOR_URL },
          image: absoluteUrl("/og.png"),
          isAccessibleForFree: true,
          about: {
            "@type": "SoftwareApplication",
            name: SITE_NAME,
            url: absoluteUrl("/"),
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Guides", item: absoluteUrl("/guides") },
            { "@type": "ListItem", position: 3, name: guide.title, item: url },
          ],
        }}
      />
      <article className="flex flex-col gap-6">
        <Breadcrumbs
          items={[
            { href: "/", label: "Raspy" },
            { href: "/guides", label: "Guides" },
            { href: `/guides/${guide.slug}`, label: guide.title },
          ]}
        />
        <header className="flex flex-col gap-3">
          <h1 className="text-display font-medium text-balance">{guide.title}</h1>
          <p className="text-caption text-muted">
            {guide.updated ? "Updated" : "Published"}{" "}
            <time dateTime={guide.updated ?? guide.published}>
              {formatDate(guide.updated ?? guide.published)}
            </time>
            {" · "}
            {guide.minutes} min read
          </p>
        </header>
        <div className="prose">
          <p className="text-fg!">{guide.summary}</p>
          {guide.body}
        </div>
        <aside className="mt-4 flex flex-col gap-3 rounded-panel border border-hairline bg-surface p-5">
          <p className="text-body font-semibold">Try it on your own photo</p>
          <p className="text-label leading-normal text-muted">
            Raspy is free, needs no account, and never uploads the photo. Open
            one and follow the steps above.
          </p>
          <Link href="/" className={`${primaryLinkClass} w-fit`}>
            Open the editor
          </Link>
        </aside>
        {related.length > 0 ? (
          <nav aria-label="Related guides" className="flex flex-col gap-3">
            <h2 className="text-body font-semibold">Related guides</h2>
            <ul className="flex flex-col gap-2">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/guides/${item.slug}`}
                    prefetch={false}
                    className="text-label text-fg underline underline-offset-4"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </article>
    </SitePage>
  );
}
