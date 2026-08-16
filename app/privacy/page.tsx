import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ConsentControl } from "@/app/components/privacy/ConsentControl";
import { GA_MEASUREMENT_ID } from "@/app/lib/analytics";

export const metadata: Metadata = {
  title: "Raspy — privacy",
  description:
    "What Raspy stores, what it does not, and how to withdraw analytics consent.",
  openGraph: {
    type: "article",
    url: "/privacy",
    siteName: "Raspy",
    title: "Raspy — privacy",
    description:
      "Your photos never leave your device. The only third party is analytics, and you can turn it off.",
  },
};

/** Built from the id so it cannot drift: GA names this cookie after the
 *  property, minus the "G-" prefix. One expression, so React emits it as a
 *  single text node rather than splitting it around an interpolation. */
const GA_SESSION_COOKIE = `_ga_${GA_MEASUREMENT_ID.replace(/^G-/, "")}`;

const CONTACT = "rashmitaparmanik9876@gmail.com";
const UPDATED = "16 August 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-body font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-[68ch] flex-col gap-10 px-[max(var(--spacing-page),env(safe-area-inset-left))] pt-[max(var(--spacing-page),env(safe-area-inset-top))] pb-[max(4rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-4">
        <Link
          href="/"
          className="w-fit text-label font-medium text-muted underline underline-offset-4 hover:text-fg"
        >
          ← Raspy
        </Link>
        <h1 className="text-display font-medium text-balance">Privacy</h1>
        <p className="text-body leading-snug text-muted">
          Raspy edits photos in your browser. They are not uploaded, and there
          is no server that could receive them. This page describes the little
          that is collected, and how to stop it.
        </p>
        <p className="text-caption text-muted">Last updated {UPDATED}</p>
      </header>

      <div className="flex flex-col gap-8">
        <Section title="Your photos">
          <p className="text-body leading-normal text-muted">
            Photos never leave this device. Decoding, editing, and encoding all
            happen in the page, and no upload path exists in the application —
            there is no endpoint that a photo could be sent to. Nothing about an
            image, an edit, a crop, or an export is transmitted anywhere,
            including to analytics.
          </p>
          <p className="text-body leading-normal text-muted">
            One draft — the original file plus your adjustments — is stored on
            your own machine in IndexedDB so that closing the tab does not lose
            your work. It stays there until you clear it, open a different
            photo, or clear your browser data. The offline cache is written so
            that image data can never enter it.
          </p>
          <p className="text-body leading-normal text-muted">
            Exports are re-encoded from raw canvas pixels, which drops EXIF and
            GPS metadata. A photo you share from Raspy does not carry the
            location where it was taken.
          </p>
        </Section>

        <Section title="Settings stored on this device">
          <p className="text-body leading-normal text-muted">
            Your theme, sound, and analytics preferences are kept in this
            browser&rsquo;s local storage, under the keys{" "}
            <code className="text-label">raspy:theme</code>,{" "}
            <code className="text-label">raspy:sound</code>, and{" "}
            <code className="text-label">raspy:consent</code>. They are never
            sent anywhere and are readable only by this site, on this device.
          </p>
        </Section>

        <Section title="Analytics">
          <p className="text-body leading-normal text-muted">
            Raspy counts page visits using Google Analytics 4 (property{" "}
            <code className="text-label">{GA_MEASUREMENT_ID}</code>), to see
            whether the project is worth continuing. It measures visits, not
            use: no photo, edit, crop, or export detail is ever passed to it.
            Google Signals and advertising personalisation are disabled, and
            advertising storage is refused in every country. Nothing collected
            is sold, and none of it is used for advertising.
          </p>
          <p className="text-body leading-normal text-muted">
            When analytics is on, Google sets two cookies —{" "}
            <code className="text-label">_ga</code> and{" "}
            <code className="text-label">{GA_SESSION_COOKIE}</code>{" "}
            — which distinguish one browser from another for up to two years.
            They contain a randomly generated identifier, not your name or
            anything you have typed. Google also processes your IP address to
            approximate your country; IP addresses are not retained by Google
            Analytics. Collected data is retained for 14 months and then
            deleted automatically.
          </p>
        </Section>

        <Section title="Consent, and how to withdraw it">
          <p className="text-body leading-normal text-muted">
            If you are in the EU, EEA, UK, or Switzerland, analytics storage is
            refused by default and nothing is stored until you accept. That
            default is enforced by Google on the basis of your IP address, so it
            applies whether or not the consent banner appeared for you. Where
            consent applies, the legal basis is your consent under Article 6(1)(a)
            GDPR and the ePrivacy Directive.
          </p>
          <p className="text-body leading-normal text-muted">
            You can change your mind at any time, here or from Settings inside
            the editor. Turning it off stops measurement immediately and expires
            the analytics cookies already set.
          </p>
          <ConsentControl />
          <p className="text-caption leading-normal text-muted">
            This control reflects the choice stored in this browser. Clearing
            your browser data resets it, and the banner will ask again.
          </p>
        </Section>

        <Section title="Hosting">
          <p className="text-body leading-normal text-muted">
            The site is served as static files by Cloudflare, which processes
            your IP address and request metadata in order to deliver the page
            and to protect the service from abuse. This is ordinary server
            operation and happens for every website; no photo is included,
            because no photo is ever sent. The legal basis is legitimate
            interest under Article 6(1)(f) GDPR.
          </p>
        </Section>

        <Section title="Who processes what, and where">
          <p className="text-body leading-normal text-muted">
            Google (analytics) and Cloudflare (hosting) are the only third
            parties, and both may process data outside the EEA, including in the
            United States. Those transfers rely on the European Commission&rsquo;s
            standard contractual clauses and the EU&ndash;US Data Privacy
            Framework. There is no other recipient: no database, no object
            store, no advertising network, and no analytics beyond the one named
            above.
          </p>
        </Section>

        <Section title="Your rights">
          <p className="text-body leading-normal text-muted">
            Under the GDPR you may request access to your personal data, its
            correction or erasure, a restriction on its processing, a copy of it
            in portable form, or object to processing. You may also complain to
            your national data protection authority.
          </p>
          <p className="text-body leading-normal text-muted">
            In practice there is very little to exercise these rights against.
            Your photos and settings are on your own device and are not
            accessible to anyone else — clearing your browser data erases them
            completely. Analytics data is pseudonymous and holds no identifier
            that could be traced back to you, so a request to delete it usually
            cannot be matched to a specific person. Turning analytics off, above,
            removes the cookie that links your visits together.
          </p>
        </Section>

        <Section title="Children">
          <p className="text-body leading-normal text-muted">
            Raspy is not directed at children and does not knowingly collect
            personal data from them.
          </p>
        </Section>

        <Section title="Changes">
          <p className="text-body leading-normal text-muted">
            If what is collected changes, this page changes with it and the date
            at the top is updated. A change that widens what is collected will
            ask for consent again rather than assume the previous answer.
          </p>
        </Section>

        <Section title="Contact">
          <p className="text-body leading-normal text-muted">
            Raspy is operated by Rashmita Parmanik, who is the data controller.
            For any privacy question or request, write to{" "}
            <a
              href={`mailto:${CONTACT}`}
              className="text-fg underline underline-offset-4"
            >
              {CONTACT}
            </a>
            .
          </p>
        </Section>
      </div>

      <footer className="border-t border-hairline pt-6">
        <p className="text-caption leading-normal text-muted">
          Raspy is an independent project. It is not affiliated with, authorised
          by, or endorsed by Apple Inc. The source is available at{" "}
          <a
            href="https://github.com/RashP07/raspy"
            className="text-fg underline underline-offset-4"
          >
            github.com/RashP07/raspy
          </a>
          , so every claim on this page can be checked against the code.
        </p>
      </footer>
    </div>
  );
}
