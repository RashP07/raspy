import Link from "next/link";
import { CompareTable, Sources } from "@/app/components/site/CompareTable";
import type { Comparison } from "../types";

export const raspyVsIphonePhotos: Comparison = {
  slug: "raspy-vs-iphone-photos",
  competitor: "the iPhone Photos app",
  title: "Raspy vs the iPhone Photos app",
  description:
    "Raspy is a recreation of the iPhone Photos editor's Adjust and Crop tools for any browser. What is the same, what is missing, and when you would use it instead of the phone.",
  published: "2026-08-28",
  verdict:
    "On an iPhone, use the Photos app. Raspy is the same tools for everywhere the Photos app is not: Windows, Android, Linux, a work laptop, or a file you do not want in your library.",
  summary:
    "This is the comparison Raspy exists for. On an iPhone, the Photos app is better: it is native, it is on every photo you take, and it has filters, portrait effects and clean-up tools Raspy does not. Raspy recreates the part of it that people actually use most, the Adjust sliders and the crop and straighten tools, and puts them in a browser so they work on a Windows PC, an Android phone, a Chromebook, or on a photo that should not be imported into anything.",
  body: (
    <>
      <CompareTable
        competitor="iPhone Photos"
        rows={[
          {
            label: "Runs on",
            raspy: "Any device with a modern browser",
            other: "iPhone, iPad, Mac",
          },
          {
            label: "Where editing happens",
            raspy: "On your device, in the browser",
            other: "On the device; iCloud Photos is optional",
          },
          {
            label: "Account",
            raspy: "None",
            other: "None to edit; an Apple account for iCloud sync",
          },
          {
            label: "Adjustments",
            raspy:
              "The same fifteen: exposure, brilliance, highlights, shadows, contrast, brightness, black point, saturation, vibrancy, warmth, tint, sharpness, definition, noise reduction, vignette",
            other: "The same fifteen",
          },
          {
            label: "Crop tools",
            raspy: "Aspect ratios, rotate, straighten, flip",
            other: "Aspect ratios, rotate, straighten, flip, vertical and horizontal perspective",
          },
          {
            label: "Beyond Adjust and Crop",
            raspy: "Nothing",
            other:
              "Filters, Portrait lighting, Markup, Live Photo and video editing, Clean Up on supported models, RAW editing",
          },
          {
            label: "Edits are",
            raspy: "Saved as a new file; the original is untouched",
            other: "Non-destructive on the library photo; Revert at any time",
          },
          {
            label: "Metadata in exports",
            raspy: "Always removed",
            other: "Kept unless you turn off Location in the share sheet's Options",
          },
        ]}
      />

      <h2>What is the same</h2>
      <p>
        The fifteen adjustments, in the same order, with the same sign
        conventions: dragging Highlights to the right darkens them, as it does
        on the phone, and Vibrancy protects skin tones. The controls are
        rulers you drag rather than thin sliders, as on the phone. Press and
        hold shows the original. The crop tool offers the same ratios and
        swaps them to portrait when you rotate. Straighten covers the frame as
        it turns, so there are no empty corners. Undo and redo cover everything.
        Someone who edits on an iPhone should be able to open Raspy on a PC and
        not think about the interface.
      </p>

      <h2>What is missing</h2>
      <p>
        Everything outside Adjust and Crop. Raspy has no Filters tab, no
        Portrait lighting effects, no Markup, no Live Photo or video editing,
        no Clean Up, and no RAW or ProRAW support. It also has no library: it
        edits the file you open and saves a new file, rather than keeping a
        non-destructive edit on a photo you can revert later. That is a
        genuine loss compared to the phone. It is also what makes Raspy work
        on a photo that was never in any library.
      </p>

      <h2>When Raspy is the better choice</h2>
      <ul>
        <li>
          <strong>You are not on an Apple device.</strong> Windows, Android,
          Linux and ChromeOS have no Photos app. Raspy is the same tools in a
          browser, and it opens the iPhone&#39;s HEIC files there without a
          codec or a conversion.
        </li>
        <li>
          <strong>The photo is not yours to import.</strong> A file a client
          sent, a photo on a shared computer, an image you want to fix and
          send back without it joining your iCloud library.
        </li>
        <li>
          <strong>You want the metadata gone.</strong> The Photos app keeps
          location unless you remember to turn it off in the share sheet each
          time. Raspy&#39;s export never carries it.
        </li>
        <li>
          <strong>A bigger screen.</strong> The same edit on a 27-inch
          monitor, with a mouse and keyboard, and arrow keys that nudge a
          slider one step at a time.
        </li>
      </ul>

      <h2>A note on the relationship</h2>
      <p>
        Raspy is an independent, open-source project. It is not made by, or
        affiliated with, or endorsed by Apple. It recreates how the Photos
        editor behaves because that behaviour is good and widely known, and
        so that the phone edit can happen on every other kind of computer.
        The source is public, so what it does and does not do can be checked
        rather than taken on trust. Open <Link href="/">the editor</Link> to
        see for yourself.
      </p>

      <Sources
        checked="28 August 2026"
        items={[
          {
            label: "Apple: edit photos and videos on iPhone",
            href: "https://support.apple.com/guide/iphone/edit-photos-and-videos-iphb08064d57/ios",
          },
          {
            label: "Apple: crop, rotate, flip, straighten and adjust perspective",
            href: "https://support.apple.com/en-gb/guide/iphone/iph0f3ebb1dd/ios",
          },
          {
            label: "Apple: manage location metadata in Photos",
            href: "https://support.apple.com/guide/personal-safety/manage-location-metadata-in-photos-ips0d7a5df82/web",
          },
          {
            label: "Apple: Clean Up in Photos (supported models)",
            href: "https://support.apple.com/en-us/121429",
          },
        ]}
      />
    </>
  ),
};
