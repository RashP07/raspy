import Link from "next/link";
import type { ReactNode } from "react";
import { AUTHOR_NAME, AUTHOR_URL, REPO_URL } from "@/app/lib/site";

const NAV = [
  { href: "/guides", label: "Guides" },
  { href: "/compare", label: "Compare" },
  { href: "/privacy", label: "Privacy" },
];

/** Styled like the primary Button without pulling its client code in. */
export const primaryLinkClass =
  "inline-flex h-11 items-center justify-center rounded-control bg-accent px-4 text-body font-medium text-accent-fg no-underline transition-[background-color,box-shadow] duration-150 ease-out hover:bg-accent-hover hover:shadow-lifted";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 py-2">
      <Link
        href="/"
        prefetch={false}
        className="text-body font-semibold tracking-snug text-fg no-underline"
      >
        Raspy
      </Link>
      <nav aria-label="Site" className="flex items-center gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className="rounded-control px-3 py-2 text-label font-medium text-muted no-underline hover:bg-hover hover:text-fg"
          >
            {item.label}
          </Link>
        ))}
        {/* On a phone the three links fill the row; the wordmark already
            goes home, so the pill waits for a wider screen. */}
        <Link
          href="/"
          prefetch={false}
          className="ml-2 hidden h-9 items-center rounded-control bg-accent px-3.5 text-label font-medium text-accent-fg no-underline hover:bg-accent-hover sm:inline-flex"
        >
          Open editor
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 flex flex-col gap-4 border-t border-hairline pt-6 text-caption leading-normal text-muted">
      <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/" prefetch={false} className="hover:text-fg">
          Editor
        </Link>
        <Link href="/guides" prefetch={false} className="hover:text-fg">
          Guides
        </Link>
        <Link href="/compare" prefetch={false} className="hover:text-fg">
          Compare
        </Link>
        <Link href="/privacy" prefetch={false} className="hover:text-fg">
          Privacy
        </Link>
        <a href={REPO_URL} className="hover:text-fg">
          Source on GitHub
        </a>
      </nav>
      <p>
        Raspy is free and open source, made by{" "}
        <a href={AUTHOR_URL} className="text-fg underline underline-offset-4">
          {AUTHOR_NAME}
        </a>
        . It is an independent project, not affiliated with, authorised by, or
        endorsed by Apple Inc. References to the iPhone Photos editor describe
        what the app reproduces; all trademarks belong to their respective
        owners.
      </p>
    </footer>
  );
}

/**
 * The frame every non-editor page sits in: header, a readable measure, and
 * the footer. The editor keeps its own shell because it is not a document.
 */
export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="site-page mx-auto flex w-full max-w-[72ch] flex-col px-[max(var(--spacing-page),env(safe-area-inset-left))] pt-[max(var(--spacing-gutter),env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))]">
      <SiteHeader />
      <main className="mt-8 flex flex-col gap-8">{children}</main>
      <SiteFooter />
    </div>
  );
}

export interface Crumb {
  href: string;
  label: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-label text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {index === items.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href} prefetch={false} className="hover:text-fg">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
