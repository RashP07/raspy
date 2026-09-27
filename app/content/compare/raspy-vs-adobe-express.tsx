import Link from "next/link";
import { CompareTable, Sources } from "@/app/components/site/CompareTable";
import type { Comparison } from "../types";

export const raspyVsAdobeExpress: Comparison = {
  slug: "raspy-vs-adobe-express",
  competitor: "Adobe Express",
  title: "Raspy vs Adobe Express",
  description:
    "Adobe Express is Adobe's free, cloud-based design and photo tool with Firefly AI and an Adobe account. Raspy is a small, local photo editor with no account. What each does better.",
  published: "2026-08-28",
  verdict:
    "Adobe Express for templates, Firefly AI and Adobe's ecosystem; Raspy for a photo edit that needs no account and never leaves the device.",
  summary:
    "Adobe Express is the free, lighter sibling of Photoshop, built around templates and Adobe's Firefly generative AI, and it runs on Adobe's servers with an Adobe account. It is polished and generous for what it is. Raspy is a different kind of thing: an editor that does the iPhone adjustments on your own device and asks for nothing.",
  body: (
    <>
      <CompareTable
        competitor="Adobe Express"
        rows={[
          {
            label: "Where editing happens",
            raspy: "On your device, in the browser",
            other:
              "Adobe's cloud. Adobe says it may analyse stored content to improve its products, and does not use it to train generative AI unless you submit it to Adobe Stock",
          },
          {
            label: "Account",
            raspy: "None",
            other: "Adobe account required, including on the free plan",
          },
          {
            label: "Price",
            raspy: "Free, no ads",
            other:
              "Free plan with 25 generative credits a month and 5 GB; Premium about $10 a month",
          },
          {
            label: "Tools",
            raspy: "15 iPhone-style adjustments, crop, straighten, flip",
            other: "Templates, text, layers, filters, Firefly AI, background removal",
          },
          {
            label: "HEIC",
            raspy: "Opens HEIC on any device; exports JPEG, PNG, WebP",
            other: "Import added in February 2026; HEIC export is Premium and iOS only",
          },
          {
            label: "Metadata in exports",
            raspy: "Always removed",
            other: "Not documented",
          },
          {
            label: "Offline",
            raspy: "Yes, installable",
            other: "Installable as a web app in Chrome and Edge; offline editing not documented",
          },
        ]}
      />

      <h2>Where Adobe Express wins</h2>
      <p>
        The free plan is a lot of software. Templates for every social
        format, thousands of fonts, layers and text, background removal,
        and Firefly generative fill and text-to-image with a monthly credit
        allowance. It sits inside Adobe&#39;s ecosystem, so assets move to and
        from Photoshop and Lightroom, and it installs as a web app on Chrome
        and Edge. For producing finished designs from photos, it is hard to
        beat at the price.
      </p>

      <h2>Where Raspy wins</h2>
      <p>
        <strong>No account, no cloud.</strong> Adobe Express needs an Adobe
        login and stores your work on Adobe&#39;s servers. Adobe&#39;s content
        analysis FAQ says stored content may be analysed with machine
        learning to improve its products, with an opt-out in account
        settings, and that it is not used to train generative models unless
        you submit it to Adobe Stock. That is a more careful policy than
        most. It is still a policy, and Raspy&#39;s answer is not to have a
        server at all.
      </p>
      <p>
        <strong>HEIC everywhere.</strong> Raspy has opened HEIC in any browser
        since it launched, decoding on your device. Adobe Express added HEIC
        import in early 2026 and, at the time of writing, exports HEIC only
        on iOS with Premium. Raspy exports JPEG, PNG or WebP anywhere.
      </p>
      <p>
        <strong>Familiar sliders.</strong> Raspy&#39;s adjustments are the
        iPhone&#39;s, which for most phone users is the set they already know.
        Express has its own, oriented to design rather than photo correction.
      </p>
      <p>
        <strong>Weight and speed.</strong> Raspy&#39;s first load is a few
        hundred kilobytes and it works on a budget Android phone. Express is
        a large application that expects a capable device and a connection.
      </p>

      <h2>Which to use</h2>
      <p>
        Adobe Express when the result is a design and you are already in
        Adobe&#39;s world. <Link href="/">Raspy</Link> when it is a photo that
        needs correcting, quickly, with no sign-up and no upload.
      </p>

      <Sources
        checked="28 August 2026"
        items={[
          {
            label: "Adobe: content analysis FAQ",
            href: "https://helpx.adobe.com/account/individual/terms-policies-and-regulations/content-analysis-faq.html",
          },
          {
            label: "Adobe Express: free plan",
            href: "https://helpx.adobe.com/express/web/adobe-express-subscription/free.html",
          },
          { label: "Adobe Express: pricing", href: "https://www.adobe.com/express/pricing" },
          {
            label: "Adobe Express: release notes (HEIC import, February 2026)",
            href: "https://helpx.adobe.com/express/web/whats-new/release-notes.html",
          },
          {
            label: "Adobe Express: progressive web app",
            href: "https://helpx.adobe.com/express/using/express-progressive-web-app.html",
          },
        ]}
      />
    </>
  ),
};
