import Link from "next/link";
import type { Guide } from "../types";

export const convertHeicToJpg: Guide = {
  slug: "convert-heic-to-jpg-in-your-browser",
  title: "Convert HEIC to JPG in your browser, without uploading it",
  description:
    "Most HEIC to JPG converters upload your photo to a server. This one decodes it on your device. Steps for desktop and phone, and what happens to quality and metadata.",
  published: "2026-08-28",
  minutes: 3,
  summary:
    "Search for a HEIC converter and the first page of results is sites that take your photo, process it on their server, and hand back a JPEG. That works, but a personal photo has now been copied to a machine you know nothing about. The same conversion can happen entirely inside the browser.",
  related: [
    "open-heic-photos-on-windows",
    "edit-iphone-photos-on-android",
    "jpeg-vs-png-vs-webp",
  ],
  body: (
    <>
      <h2>How an in-browser conversion works</h2>
      <p>
        A HEIC file is HEVC-compressed pixels in a container. To convert it,
        something has to decode those pixels and encode them again as JPEG.
        Raspy does both on your device. Safari can decode HEIC itself. Other
        browsers usually cannot, so Raspy loads libheif, an open-source
        decoder compiled to WebAssembly, and runs it in the page. The JPEG is
        then encoded from the decoded pixels, also in the page. At no point is
        the file sent anywhere; you can watch the network tab in the browser&#39;s
        developer tools and see only the app&#39;s own files load.
      </p>

      <h2>Steps</h2>
      <ol>
        <li>
          Open <Link href="/">Raspy</Link> and choose <strong>Open photo</strong>
          , or drop the HEIC onto the page.
        </li>
        <li>
          Press <strong>Save</strong>. Leave the format on JPEG. Full size is
          the default; 75% and 50% are there if the file is going somewhere
          with a size limit.
        </li>
        <li>
          Set quality. The default of 92 suits a photo you intend to keep; 80
          is fine for sharing.
        </li>
        <li>
          Choose <strong>Download</strong>. On a phone, <strong>Share</strong>{" "}
          sends the JPEG straight to another app.
        </li>
      </ol>

      <h2>Quality</h2>
      <p>
        Decoding is lossless; the pixels Raspy gets are the ones the iPhone
        stored. JPEG encoding is lossy, as it is in every converter, and the
        quality slider is the only place quality is traded for size. At 90 the
        difference from the original is not visible at normal viewing sizes.
        If you need a lossless copy, choose PNG instead; it will be several
        times larger.
      </p>

      <h2>Metadata</h2>
      <p>
        The converted file carries no EXIF. The date, the camera model, and the
        GPS coordinates from the HEIC are not written into the JPEG, because
        the export is built from raw pixels rather than by rewriting the
        original. That is the safer default for a file about to be shared. If
        you are archiving photos and want the capture date kept, the original
        HEIC is the file to archive; the JPEG is a copy for use.
      </p>

      <h2>Batch conversion</h2>
      <p>
        Raspy opens one photo at a time, because it is an editor first. For
        converting a whole folder, a desktop tool is the better fit: the Photos
        app on a Mac exports JPEG in bulk, and on Windows the HEIF and HEVC
        extensions let Photos do the same. For the one or two files that
        arrive by message, the browser is faster than installing anything.
      </p>
    </>
  ),
};
