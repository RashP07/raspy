import Link from "next/link";
import { CompareTable, Sources } from "@/app/components/site/CompareTable";
import type { Comparison } from "../types";

export const raspyVsFotor: Comparison = {
  slug: "raspy-vs-fotor",
  competitor: "Fotor",
  title: "Raspy vs Fotor",
  description:
    "Fotor is a cloud photo editor with AI tools, a free tier that watermarks exports, and uploads stored on its servers. Raspy is free without limits and never uploads. A plain comparison.",
  published: "2026-08-28",
  verdict:
    "Fotor for AI enhancement and batch work if you pay; Raspy for unlimited, watermark-free edits on your own device.",
  summary:
    "Fotor sells itself on AI: enhancers, background removal, generators, batch processing. Its privacy policy says uploads are stored on its servers in the United States for as long as your account exists. Its own pricing page says the free plan watermarks exports, while its homepage says the opposite. Raspy has no AI, no servers, no watermark and no plan.",
  body: (
    <>
      <CompareTable
        competitor="Fotor"
        rows={[
          {
            label: "Where editing happens",
            raspy: "On your device, in the browser",
            other:
              "Cloud. Inputs are stored on Fotor's servers (Amazon Web Services, USA) for the life of your account",
          },
          {
            label: "Account",
            raspy: "None",
            other: "Some tools work without one; the free plan is tied to an account",
          },
          {
            label: "Price",
            raspy: "Free, no ads",
            other:
              "Free plan; Pro about $9 a month, or about $40 a year",
          },
          {
            label: "Free export limits",
            raspy: "None",
            other:
              "Pricing page: watermarked JPG, PNG and PDF exports; HD downloads need Pro",
          },
          {
            label: "Tools",
            raspy: "15 iPhone-style adjustments, crop, straighten, flip",
            other: "AI enhancer, generator, background remover, templates, text, effects, batch",
          },
          {
            label: "HEIC import",
            raspy: "Yes, decoded on your device",
            other: "Yes, on its resize and batch tools",
          },
          {
            label: "Metadata in exports",
            raspy: "Always removed",
            other: "Not documented",
          },
          {
            label: "Offline",
            raspy: "Yes, installable",
            other: "Desktop apps for Windows and Mac; no offline web editor",
          },
        ]}
      />

      <h2>Where Fotor wins</h2>
      <p>
        AI and volume. Fotor&#39;s one-click enhancer, background removal,
        old-photo restoration and image generation all run on its servers,
        which is exactly why they can exist; a browser on a phone could not
        do them. Its batch editor applies the same change to a folder of
        photos, which Raspy, one photo at a time, cannot. If you want a
        machine to make the decisions, Fotor will.
      </p>

      <h2>Where Raspy wins</h2>
      <p>
        <strong>Nothing is uploaded or kept.</strong> Fotor&#39;s privacy
        policy says your input is stored on its servers for as long as your
        account exists, and that for unsubscribed users with gift credits,
        AI inputs and outputs are made public in its community by default.
        Raspy has no upload path: the photo is decoded, edited and encoded in
        the page, and closing the tab is the end of it.
      </p>
      <p>
        <strong>No watermark, no HD paywall.</strong> Fotor&#39;s pricing
        page lists watermarked exports on the free plan and reserves
        high-resolution downloads for Pro. Its homepage FAQ claims free
        exports have no watermark, so the experience may vary; the pricing
        page is the one that governs. Raspy exports at full resolution, in
        JPEG, PNG or WebP, with nothing stamped on it, for free.
      </p>
      <p>
        <strong>Predictable adjustments.</strong> Raspy&#39;s sliders do one
        thing each and the same thing every time, in the order the iPhone
        taught a billion people. An AI enhancer decides for you, which is
        quicker when it is right and frustrating when it is not.
      </p>

      <h2>Which to use</h2>
      <p>
        Fotor if you want AI to restore or generate, or need to process a
        batch, and are willing to pay to lose the watermark.{" "}
        <Link href="/">Raspy</Link> for the hand-done edit that stays on your
        device and costs nothing.
      </p>

      <Sources
        checked="28 August 2026"
        items={[
          { label: "Fotor: privacy policy", href: "https://www.fotor.com/privacypolicy" },
          { label: "Fotor: pricing", href: "https://www.fotor.com/pricing" },
          { label: "Fotor: homepage FAQ", href: "https://www.fotor.com/" },
          { label: "Fotor: resize tool (formats, cloud-based)", href: "https://www.fotor.com/features/resize.html" },
          { label: "Fotor: batch photo editor", href: "https://www.fotor.com/batch-photo-editor/" },
        ]}
      />
    </>
  ),
};
