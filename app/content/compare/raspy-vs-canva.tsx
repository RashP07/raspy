import Link from "next/link";
import { CompareTable, Sources } from "@/app/components/site/CompareTable";
import type { Comparison } from "../types";

export const raspyVsCanva: Comparison = {
  slug: "raspy-vs-canva",
  competitor: "Canva",
  title: "Raspy vs Canva photo editor",
  description:
    "Canva is a design tool with a photo editor inside it: templates, text, AI, and an account that stores your uploads. Raspy is a photo editor that never uploads. Where each one is the right choice.",
  published: "2026-08-28",
  verdict:
    "Canva for designs, templates and text on top of photos; Raspy for correcting a photo without an account or an upload.",
  summary:
    "Canva is not really a photo editor; it is a design tool that includes one. Its adjustments are decent, its templates are the reason people use it, and everything you upload lives in your Canva account on Canva's servers, where its privacy policy says it may be analysed and, unless you opt out, used to train its AI. Raspy is the opposite shape: one narrow job, no account, nothing stored.",
  body: (
    <>
      <CompareTable
        competitor="Canva"
        rows={[
          {
            label: "Where editing happens",
            raspy: "On your device, in the browser",
            other:
              "Uploads are stored on Canva's servers in several countries and may be used to train its AI unless you opt out",
          },
          {
            label: "Account",
            raspy: "None",
            other: "Required to edit and to download",
          },
          {
            label: "Price",
            raspy: "Free, no ads",
            other:
              "Free plan with limits on AI use; Pro about $180 a year",
          },
          {
            label: "Tools",
            raspy: "15 iPhone-style adjustments, crop, straighten, flip",
            other: "Templates, text, elements, layers, filters, Magic Studio AI",
          },
          {
            label: "HEIC import",
            raspy: "Yes, decoded on your device",
            other: "Yes, up to 50 MB",
          },
          {
            label: "Free export limits",
            raspy: "None",
            other:
              "No watermark on your own photo; transparent, compressed and bulk downloads are Pro only",
          },
          {
            label: "Metadata in exports",
            raspy: "Always removed",
            other: "Not documented",
          },
          {
            label: "Offline",
            raspy: "Yes, installable",
            other: "Existing designs can be marked for offline use for up to 14 days",
          },
        ]}
      />

      <h2>Where Canva wins</h2>
      <p>
        Anything that is a design rather than a photo. A social post with a
        headline over the picture, a poster, a collage, a presentation, a
        birthday card: Canva has a template for it and thousands of fonts
        and elements to fill it with. Its photo adjustments and filters are
        fine for the picture inside a design, and the Magic Studio tools
        remove backgrounds and generate fills. If the end product has words
        on it, Canva is the tool.
      </p>

      <h2>Where Raspy wins</h2>
      <p>
        <strong>The photo never leaves.</strong> Canva&#39;s privacy policy is
        explicit that the media you upload is received and stored, in the
        United States, Australia, Singapore, the EU, the UK, the Philippines
        and New Zealand, and that content may be analysed to train its
        models unless you turn that off in privacy settings. For a family
        photo that is a lot of places to be. Raspy processes the photo in the
        page and has no server that could receive it.
      </p>
      <p>
        <strong>No account.</strong> Canva needs a login to edit and to
        download; guests on a shared design cannot download at all. Raspy
        opens the file picker and that is it.
      </p>
      <p>
        <strong>A real photo editor&#39;s adjustments.</strong> Raspy has
        highlights and shadows recovery, black point, vibrancy with skin
        protection, definition and noise reduction, working in linear light,
        with a straighten that fills the frame. For fixing a photo rather
        than decorating one, that is the more useful set.
      </p>
      <p>
        <strong>Metadata.</strong> Raspy&#39;s exports carry no EXIF or GPS.
        Canva does not document what its downloads contain.
      </p>

      <h2>Which to use</h2>
      <p>
        Canva for making something out of a photo. <Link href="/">Raspy</Link>{" "}
        for making the photo itself better, with nothing uploaded and nothing
        to sign up for. Many people will use both: fix the photo in Raspy,
        then drop the result into a Canva design.
      </p>

      <Sources
        checked="28 August 2026"
        items={[
          { label: "Canva: privacy policy", href: "https://www.canva.com/policies/privacy-policy/" },
          { label: "Canva: pricing", href: "https://www.canva.com/pricing/" },
          { label: "Canva: photo editor", href: "https://www.canva.com/photo-editor/" },
          {
            label: "Canva help: download or purchase a design",
            href: "https://www.canva.com/help/download-or-purchase/",
          },
          {
            label: "Canva help: upload formats and requirements",
            href: "https://www.canva.com/help/upload-formats-requirements/",
          },
          {
            label: "Canva help: set up offline access",
            href: "https://www.canva.com/help/set-up-offline-access/",
          },
          {
            label: "Canva help: collaborate with anyone",
            href: "https://www.canva.com/help/collaborate-with-anyone/",
          },
        ]}
      />
    </>
  ),
};
