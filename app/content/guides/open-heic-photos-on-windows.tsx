import Link from "next/link";
import type { Guide } from "../types";

export const openHeicOnWindows: Guide = {
  slug: "open-heic-photos-on-windows",
  title: "How to open and edit HEIC photos on Windows",
  description:
    "HEIC photos from an iPhone will not open on many Windows PCs. Here is why, the three ways round it, and how to edit one in the browser without converting or uploading it.",
  published: "2026-08-28",
  minutes: 4,
  summary:
    "An iPhone saves photos as HEIC, and a Windows PC often greets them with a broken thumbnail and an error. You can buy a codec, change a setting on the phone, or skip the problem and open the file in a browser that decodes it locally. This guide covers all three and recommends the last.",
  related: [
    "convert-heic-to-jpg-in-your-browser",
    "edit-iphone-photos-on-android",
    "iphone-photos-editor-on-pc-or-mac",
  ],
  body: (
    <>
      <h2>Why HEIC fails on Windows</h2>
      <p>
        HEIC is a container for images compressed with HEVC, the same codec used
        for 4K video. Apple made it the default camera format in 2017 because a
        HEIC file is roughly half the size of an equivalent JPEG. Windows can
        show a HEIC only if two extensions are installed: HEIF Image Extensions,
        which is free, and HEVC Video Extensions, which Microsoft charges for
        on most PCs. Without both, Photos, Explorer and most other apps refuse
        the file.
      </p>
      <p>
        Browsers are different. Safari decodes HEIC on its own, and a web page
        can ship its own decoder and run it inside the page. That is the route
        Raspy takes, and it is why the file opens on a PC that has no codec at
        all.
      </p>

      <h2>Option 1: open it in the browser and edit it there</h2>
      <p>
        This needs nothing installed and nothing uploaded. Raspy first asks the
        browser to decode the file. If the browser cannot, it loads libheif, an
        open-source HEIC decoder compiled to WebAssembly, and decodes the file
        on your PC. The decoder is about 1.4 MB and is only fetched when it is
        needed.
      </p>
      <ol>
        <li>
          Get the photo onto the PC. A USB cable, iCloud for Windows, or
          sending it to yourself all work. Keep it as HEIC; there is no need to
          convert first.
        </li>
        <li>
          Open <Link href="/">Raspy</Link> in Chrome, Edge or Firefox and click{" "}
          <strong>Open photo</strong>, or drop the file anywhere on the page.
        </li>
        <li>
          Edit as you would on the phone. The adjustments are the iPhone&#39;s
          fifteen, in the same order, and crop and straighten work the same
          way.
        </li>
        <li>
          Click <strong>Save</strong> and choose JPEG. The file lands in your
          Downloads folder as a JPEG that any Windows app can open.
        </li>
      </ol>
      <p>
        If you only need the JPEG and no edits, do the same and skip step 3.
        The export re-encodes from the decoded pixels, so it is a real
        conversion, not a renamed file.
      </p>

      <h2>Option 2: install the Windows codecs</h2>
      <p>
        Open the Microsoft Store and install HEIF Image Extensions. Then search
        for HEVC Video Extensions. On some PCs a free &quot;from Device
        Manufacturer&quot; version is available; otherwise it is a small one-off
        purchase. After both are installed, HEIC files show thumbnails in
        Explorer and open in Photos. This is the right choice if you deal with
        HEIC every day and want every Windows app to understand it.
      </p>

      <h2>Option 3: stop the iPhone making HEIC</h2>
      <p>
        On the phone, go to <strong>Settings</strong>, then{" "}
        <strong>Camera</strong>, then <strong>Formats</strong>, and choose{" "}
        <strong>Most Compatible</strong>. New photos are saved as JPEG at the
        cost of roughly twice the storage. Photos already taken stay HEIC. A
        gentler option is <strong>Settings</strong>, <strong>Photos</strong>,{" "}
        <strong>Transfer to Mac or PC</strong>, set to <strong>Automatic</strong>
        , which converts to JPEG only when the phone is plugged into a
        computer.
      </p>

      <h2>What you lose, and do not lose, by going through the browser</h2>
      <p>
        The decoded image is the full-resolution photo, so there is no
        quality lost in opening it. When you save as JPEG, the usual JPEG
        compression applies; the quality slider in the save sheet controls it.
        EXIF metadata, including the GPS location, is not carried into the
        saved file, which is usually what you want for a photo that is about
        to be shared. If you need the metadata preserved, use option 2 and
        copy the HEIC as it is.
      </p>
    </>
  ),
};
