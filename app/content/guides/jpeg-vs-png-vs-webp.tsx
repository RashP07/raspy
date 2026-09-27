import Link from "next/link";
import type { Guide } from "../types";

export const jpegPngWebp: Guide = {
  slug: "jpeg-vs-png-vs-webp",
  title: "JPEG, PNG or WebP: which format to save a photo in",
  description:
    "Three export formats, three different trade-offs. When JPEG is right, when PNG is worth the size, when WebP is the better JPEG, and which quality setting to use for sharing, printing and archiving.",
  published: "2026-08-28",
  minutes: 4,
  summary:
    "The save sheet offers JPEG, PNG and WebP, and for most photos the answer is JPEG. But the exceptions matter, and the quality slider matters more than the format. This is the short version of what each one does and the settings that suit the common jobs.",
  related: [
    "convert-heic-to-jpg-in-your-browser",
    "remove-location-data-from-photos",
    "edit-photos-without-uploading",
  ],
  body: (
    <>
      <h2>JPEG</h2>
      <p>
        The default for photographs since the early nineties, and still the
        format every device, site and printer accepts. JPEG is lossy: it
        throws away detail the eye is poor at seeing, and the quality setting
        decides how much. It does not support transparency; a transparent PNG
        saved as JPEG gets a white background. Choose JPEG when the file is
        going to another person, a website, a print shop, or anywhere you do
        not control.
      </p>

      <h2>PNG</h2>
      <p>
        PNG is lossless. Every pixel is stored exactly, so a photo saved as
        PNG is identical to the preview, and it keeps transparency. The cost
        is size: a photo as PNG is commonly five to ten times the size of the
        same photo as a high-quality JPEG, because photographs have little of
        the flat colour PNG compresses well. Choose PNG for screenshots,
        graphics, anything with text or sharp edges, and for a photo you
        intend to edit again later and do not want to re-compress twice.
      </p>

      <h2>WebP</h2>
      <p>
        WebP is a newer format from Google that does what JPEG does in a
        smaller file, typically a quarter to a third smaller at the same
        visible quality, and supports transparency as well. Every current
        browser displays it, and so do recent versions of Windows, macOS,
        iOS and Android. Older software and some upload forms still reject
        it. Choose WebP for your own website, or when a size limit is tight
        and you know the destination can read it. For sending to other
        people, JPEG is still safer.
      </p>

      <h2>Quality settings</h2>
      <p>
        The quality slider in <Link href="/">Raspy</Link> applies to JPEG and
        WebP. Rough guidance:
      </p>
      <ul>
        <li>
          <strong>92 to 95</strong> for a copy you want to keep or print.
          Beyond 95 the file grows quickly with no visible gain.
        </li>
        <li>
          <strong>85 to 90</strong> for sharing. Indistinguishable from the
          original at normal viewing sizes, at roughly half the size of 95.
        </li>
        <li>
          <strong>75 to 80</strong> for email attachments and message apps,
          which will re-compress the photo anyway.
        </li>
        <li>
          <strong>Under 70</strong> only when a hard size cap forces it.
          Blocky artefacts start to show in smooth areas such as skies.
        </li>
      </ul>

      <h2>Size options</h2>
      <p>
        Full, 75% and 50% scale the pixel dimensions, not the file size. A
        12-megapixel photo at 50% is 3 megapixels, which is still larger than
        any phone or laptop screen and a fraction of the file size. For
        anything viewed on a screen, 50% is usually plenty; keep full size for
        printing and cropping later.
      </p>

      <h2>Two details specific to Raspy</h2>
      <p>
        Whatever format you choose, the saved file carries no EXIF metadata,
        because it is encoded from the raw pixels rather than copied from the
        original. And if the browser cannot encode the format you asked for,
        which happens with WebP on a few older versions of Safari, the save
        falls back to another format and the confirmation says which one it
        used, so you are never left with a file that is not what its
        extension claims.
      </p>
    </>
  ),
};
