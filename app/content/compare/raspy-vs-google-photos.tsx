import Link from "next/link";
import { CompareTable, Sources } from "@/app/components/site/CompareTable";
import type { Comparison } from "../types";

export const raspyVsGooglePhotos: Comparison = {
  slug: "raspy-vs-google-photos",
  competitor: "Google Photos",
  title: "Raspy vs the Google Photos editor",
  description:
    "Google Photos edits the photos already in your Google library, on the web and in its apps. Raspy edits a file you open, on your device, with no library. Which one for which photo.",
  published: "2026-08-28",
  verdict:
    "Google Photos for the library you already back up there; Raspy for a photo you would rather not upload, or that is not in Google Photos at all.",
  summary:
    "The Google Photos editor is good and, if your photos are already backed up to Google, it is right there. That is its whole condition: the editor works on photos in your Google library, which means photos on Google's servers, in a Google account. Raspy works on a file, wherever it came from, and never sends it anywhere.",
  body: (
    <>
      <CompareTable
        competitor="Google Photos"
        rows={[
          {
            label: "Where editing happens",
            raspy: "On your device, in the browser",
            other:
              "On photos stored in your Google Photos library; edits sync to your account",
          },
          {
            label: "Account",
            raspy: "None",
            other: "Google account required",
          },
          {
            label: "Price",
            raspy: "Free, no ads",
            other: "Free with 15 GB shared across Google services; Google One from about $2 a month",
          },
          {
            label: "Adjustments on the web",
            raspy:
              "Exposure, brilliance, highlights, shadows, contrast, brightness, black point, saturation, vibrancy, warmth, tint, sharpness, definition, noise reduction, vignette",
            other:
              "Brightness, contrast, white and black point, highlights, shadows, saturation, warmth, tint, skin tone, blue tone, pop, vignette, HDR effect; plus portrait light, blur, sky and colour pop tools",
          },
          {
            label: "RAW",
            raspy: "No",
            other: "Converted to JPEG before editing on the web",
          },
          {
            label: "Metadata in exports",
            raspy: "Always removed",
            other:
              "Location is dropped from shared links and albums by default, but a downloaded photo keeps its original location",
          },
          {
            label: "Offline",
            raspy: "Yes, installable",
            other: "Web editor needs a connection; the phone apps edit locally",
          },
        ]}
      />

      <h2>Where Google Photos wins</h2>
      <p>
        If your library lives in Google Photos, editing there is zero
        friction: the photo is already open, the edit syncs to every device,
        and the original is kept so any change can be undone later. The
        editor has tools Raspy does not, including portrait light, background
        blur, sky adjustment, colour pop, and an HDR effect, and the phone
        apps add the Magic Editor tools. Skin tone and blue tone sliders are
        a nice touch for people photos.
      </p>

      <h2>Where Raspy wins</h2>
      <p>
        <strong>The photo that is not in Google Photos.</strong> A file
        someone emailed, a HEIC from an iPhone you do not want backed up to
        Google, a photo on a work laptop. Google Photos cannot edit it without
        uploading it to your library first. Raspy opens it from disk and
        never uploads it.
      </p>
      <p>
        <strong>No account, no library.</strong> Raspy needs nothing and
        keeps nothing. Google Photos is an account and a library by design;
        that is the point of it, and it is also the thing some photos should
        not join.
      </p>
      <p>
        <strong>Metadata on download.</strong> Google strips location from
        links and albums you share, which is sensible, but its help pages
        say a downloaded photo keeps the original location. Raspy&#39;s
        exports never carry location or any other EXIF, however you get them
        out.
      </p>
      <p>
        <strong>The iPhone tools.</strong> Raspy&#39;s sliders are the iPhone
        set, including brilliance, definition, noise reduction and a
        straighten that fills the frame. Google&#39;s web editor has a
        different, partly overlapping set and its own sign conventions.
      </p>

      <h2>Which to use</h2>
      <p>
        Google Photos for the photos you already keep there.{" "}
        <Link href="/">Raspy</Link> for the ones you do not, and for the edit
        you want done without a library, an account, or an upload.
      </p>

      <Sources
        checked="28 August 2026"
        items={[
          {
            label: "Google Photos help: edit photos on the web",
            href: "https://support.google.com/photos/answer/6128850?hl=en&co=GENIE.Platform%3DDesktop",
          },
          {
            label: "Google Photos help: location details in shared items",
            href: "https://support.google.com/photos/answer/11190100?hl=en",
          },
          {
            label: "Google Photos help: download photos (original location kept)",
            href: "https://support.google.com/photos/answer/6153599?hl=en",
          },
          { label: "Google: storage in your account", href: "https://support.google.com/accounts/answer/9312312" },
          { label: "Google Safety Center: Photos", href: "https://safety.google/photos/" },
        ]}
      />
    </>
  ),
};
