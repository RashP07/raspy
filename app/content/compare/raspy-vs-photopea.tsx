import Link from "next/link";
import { CompareTable, Sources } from "@/app/components/site/CompareTable";
import type { Comparison } from "../types";

export const raspyVsPhotopea: Comparison = {
  slug: "raspy-vs-photopea",
  competitor: "Photopea",
  title: "Raspy vs Photopea",
  description:
    "Both run in the browser without uploading your photo. Photopea is a full Photoshop-style editor with layers and 40 file formats; Raspy is the iPhone Photos adjustments with no ads. Which one fits the job.",
  published: "2026-08-28",
  verdict:
    "Both edit on your device. Photopea for layers, masks and RAW; Raspy for a quick, ad-free, phone-style edit.",
  summary:
    "Photopea deserves credit up front: it is one of the very few browser editors that processes your photo on your own computer, and it says so plainly. So the privacy argument that separates Raspy from most online editors does not apply here. The difference is scope and feel. Photopea is a Photoshop replacement. Raspy is the Adjust and Crop tools from an iPhone.",
  body: (
    <>
      <CompareTable
        competitor="Photopea"
        rows={[
          {
            label: "Where editing happens",
            raspy: "On your device, in the browser",
            other: "On your device, in the browser",
          },
          {
            label: "Account",
            raspy: "None",
            other: "None to edit or export",
          },
          {
            label: "Price",
            raspy: "Free, no ads",
            other: "Free with ads; about $5 a month removes them",
          },
          {
            label: "Tools",
            raspy: "15 iPhone-style adjustments, crop, straighten, flip",
            other: "Layers, masks, text, vectors, filters, 8 to 32-bit",
          },
          {
            label: "Formats opened",
            raspy: "JPEG, PNG, WebP, HEIC, HEIF",
            other: "PSD, RAW, HEIC, PDF, AI, SVG and dozens more",
          },
          {
            label: "Metadata in exports",
            raspy: "Always removed",
            other: "Removed unless you tick 'attach metadata'",
          },
          {
            label: "Offline",
            raspy: "Yes, installable",
            other: "Yes, once loaded",
          },
        ]}
      />

      <h2>Where Photopea wins</h2>
      <p>
        Almost everywhere that involves more than one image. Photopea opens
        Photoshop files with their layers intact, handles RAW from most
        cameras, does masks, blend modes, text, vector shapes and 16-bit
        colour, and exports to formats Raspy has never heard of. If the job is
        compositing, retouching with a healing brush, designing something with
        text on it, or opening a PSD a designer sent you, Photopea is the
        tool and Raspy is not in the running.
      </p>
      <p>
        It also matches Raspy on the point that matters most for a personal
        photo. Photopea&#39;s own documentation says it runs completely on your
        device and does not upload your files, and that you can disconnect
        from the internet and keep working. Its HEIC converter is downloaded
        into the browser and runs there, the same approach Raspy takes.
      </p>

      <h2>Where Raspy wins</h2>
      <p>
        <strong>The phone edit, on a computer.</strong> Raspy&#39;s sliders are
        the iPhone&#39;s fifteen, in the same order, with the same direction of
        travel and the same feel, including the press-and-hold compare and the
        straighten dial that fills the frame as it turns. Someone who edits on
        a phone can sit down at a laptop and carry on without learning
        anything. Photopea&#39;s adjustment layers are more capable and take
        longer to learn.
      </p>
      <p>
        <strong>No ads.</strong> Photopea is free because of an ad panel
        beside the canvas, which its premium tier removes for a monthly fee.
        Raspy has no ads and no paid tier; the only third parties are two
        visit counters, switched off together with one toggle.
      </p>
      <p>
        <strong>Metadata off by default.</strong> Photopea lets you attach
        metadata on export, which is the right choice for an archive.
        Raspy never carries it across, which is the safer default for a photo
        about to be shared, and means the location of your house never rides
        along by accident.
      </p>
      <p>
        <strong>Weight.</strong> Raspy&#39;s first load is a few hundred
        kilobytes and it works as an installed app on a phone. Photopea is a
        desktop-class application and is best used as one.
      </p>

      <h2>Which to use</h2>
      <p>
        Use Photopea when the photo needs more than tone and framing, or when
        the file is a PSD or RAW. Use <Link href="/">Raspy</Link> when it needs
        exposure, a crop and a straighten, and you want that done in under a
        minute with nothing to dismiss. Both keep your photo on your device,
        which puts them in a small club among online editors.
      </p>

      <Sources
        checked="28 August 2026"
        items={[
          {
            label: "Photopea: Learn (runs on your device, works offline)",
            href: "https://www.photopea.com/learn/",
          },
          {
            label: "Photopea: Convert HEIC to JPG, including metadata",
            href: "https://www.photopea.com/tuts/convert-heic-to-jpg-online-including-metadata/",
          },
          {
            label: "Photopea: Open RAW photos online",
            href: "https://www.photopea.com/tuts/open-raw-photos-online/",
          },
          {
            label: "Photopea blog: Photopea Premium",
            href: "https://blog.photopea.com/photopea-premium.html",
          },
        ]}
      />
    </>
  ),
};
