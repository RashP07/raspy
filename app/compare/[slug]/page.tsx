import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPARISONS, comparisonBySlug } from "@/app/content/compare";
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
  return COMPARISONS.map((page) => ({ slug: page.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = comparisonBySlug(slug);
  if (!page) return {};
  const path = `/compare/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      siteName: SITE_NAME,
      title: `${page.title} | ${SITE_NAME}`,
      description: page.description,
      publishedTime: page.published,
      modifiedTime: page.updated ?? page.published,
      authors: [AUTHOR_URL],
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.title} | ${SITE_NAME}`,
      description: page.description,
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

export default async function ComparePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const page = comparisonBySlug(slug);
  if (!page) notFound();

  const url = absoluteUrl(`/compare/${page.slug}`);
  const others = COMPARISONS.filter((other) => other.slug !== page.slug);

  return (
    <SitePage>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: page.title,
          description: page.description,
          url,
          mainEntityOfPage: url,
          datePublished: page.published,
          dateModified: page.updated ?? page.published,
          author: { "@type": "Person", name: AUTHOR_NAME, url: AUTHOR_URL },
          publisher: { "@type": "Person", name: AUTHOR_NAME, url: AUTHOR_URL },
          image: absoluteUrl("/og.png"),
          isAccessibleForFree: true,
          about: [
            { "@type": "SoftwareApplication", name: SITE_NAME, url: absoluteUrl("/") },
            { "@type": "SoftwareApplication", name: page.competitor },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Compare", item: absoluteUrl("/compare") },
            { "@type": "ListItem", position: 3, name: page.title, item: url },
          ],
        }}
      />
      <article className="flex flex-col gap-6">
        <Breadcrumbs
          items={[
            { href: "/", label: "Raspy" },
            { href: "/compare", label: "Compare" },
            { href: `/compare/${page.slug}`, label: page.title },
          ]}
        />
        <header className="flex flex-col gap-3">
          <h1 className="text-display font-medium text-balance">{page.title}</h1>
          <p className="text-caption text-muted">
            {page.updated ? "Updated" : "Published"}{" "}
            <time dateTime={page.updated ?? page.published}>
              {formatDate(page.updated ?? page.published)}
            </time>
          </p>
        </header>
        <div className="prose">
          <p className="text-fg!">{page.summary}</p>
          {page.body}
        </div>
        <aside className="mt-4 flex flex-col gap-3 rounded-panel border border-hairline bg-surface p-5">
          <p className="text-body font-semibold">See for yourself</p>
          <p className="text-label leading-normal text-muted">
            Raspy opens in the browser with no account. Nothing is uploaded,
            so trying it costs nothing but a minute.
          </p>
          <Link href="/" className={`${primaryLinkClass} w-fit`}>
            Open the editor
          </Link>
        </aside>
        <nav aria-label="Other comparisons" className="flex flex-col gap-3">
          <h2 className="text-body font-semibold">Other comparisons</h2>
          <ul className="flex flex-col gap-2">
            {others.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/compare/${other.slug}`}
                  prefetch={false}
                  className="text-label text-fg underline underline-offset-4"
                >
                  {other.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </SitePage>
  );
}
