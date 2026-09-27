import Link from "next/link";
import type { Guide } from "../types";

export const editIphonePhotosOnAndroid: Guide = {
  slug: "edit-iphone-photos-on-android",
  title: "How to edit iPhone photos on an Android phone",
  description:
    "HEIC photos sent from an iPhone often will not open on Android. How to open, edit and save them as JPEG in Chrome, with nothing uploaded and no app installed.",
  published: "2026-08-28",
  minutes: 3,
  summary:
    "A friend sends a photo from an iPhone, and your Android phone shows a grey box or a file called IMG_4021.HEIC that nothing wants to open. Android has understood HEIC since version 9, but plenty of apps and messaging services still do not. The quickest fix is to open the file in Chrome, in an editor that decodes it on the phone.",
  related: [
    "open-heic-photos-on-windows",
    "convert-heic-to-jpg-in-your-browser",
    "use-raspy-offline",
  ],
  body: (
    <>
      <h2>Why the photo arrived as HEIC</h2>
      <p>
        iPhones shoot HEIC by default. When a photo is shared through iMessage,
        AirDrop or most apps, iOS converts it to JPEG on the way out. When it
        is sent as a file, for example as an email attachment, through a cloud
        drive, or with WhatsApp&#39;s &quot;document&quot; option, it stays HEIC. Android
        itself can display HEIC, but the app you opened it in may not, and
        sites that accept photo uploads often reject it outright.
      </p>

      <h2>Open and edit it in Chrome</h2>
      <ol>
        <li>
          Save the HEIC file to the phone. From an email or a chat, tap the
          attachment and choose download or save.
        </li>
        <li>
          Open <Link href="/">Raspy</Link> in Chrome and tap{" "}
          <strong>Open photo</strong>. Pick the file from Downloads or from
          Files.
        </li>
        <li>
          Raspy asks the browser to decode the file, and if Chrome cannot, it
          loads a decoder into the page and decodes the photo on the phone.
          Either way the file does not leave the device.
        </li>
        <li>
          Edit if you want to. Sliders drag with a finger, and a press and hold
          on the photo shows the original.
        </li>
        <li>
          Tap <strong>Save</strong>, pick JPEG, and choose{" "}
          <strong>Share</strong> to send it straight to another app or{" "}
          <strong>Download</strong> to keep it in the Downloads folder.
        </li>
      </ol>

      <h2>A note on memory</h2>
      <p>
        A 48-megapixel HEIC decodes to about 190 MB of raw pixels. Raspy keeps
        the preview on the graphics chip at a reduced size and only builds the
        full-size image at save time, which is what lets a mid-range phone
        handle it. If a device cannot allocate a full-size export, Raspy
        saves at the largest size it can and the confirmation names the
        dimensions it used, rather than failing silently. Files over 75 MB or
        60 megapixels are refused up front.
      </p>

      <h2>Keeping the tool on the phone</h2>
      <p>
        Chrome&#39;s menu has <strong>Add to Home screen</strong>. Once added,
        Raspy opens full screen like an installed app and works without a
        connection, so the next HEIC that arrives on a train is not a
        problem. The install caches only the app itself; photos never enter
        the cache.
      </p>
    </>
  ),
};
