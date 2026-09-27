import Link from "next/link";
import type { Guide } from "../types";

export const removeLocationData: Guide = {
  slug: "remove-location-data-from-photos",
  title: "How to remove location data from a photo before sharing it",
  description:
    "Phone photos carry GPS coordinates, the capture time and the device model in EXIF metadata. When that matters, when apps strip it for you, and how to remove it in the browser without uploading the photo.",
  published: "2026-08-28",
  minutes: 4,
  summary:
    "Every photo from a phone carries a block of metadata called EXIF. It usually holds where the photo was taken to within a few metres, when, and on which device. Some ways of sharing remove it, others pass it straight through. Here is how to know which, and how to strip it yourself.",
  related: [
    "edit-photos-without-uploading",
    "jpeg-vs-png-vs-webp",
    "convert-heic-to-jpg-in-your-browser",
  ],
  body: (
    <>
      <h2>What is in the metadata</h2>
      <p>
        EXIF is written by the camera into the file itself. For a phone photo
        it commonly includes GPS latitude and longitude, altitude, the date and
        time to the second, the phone model and software version, lens and
        exposure settings, and sometimes a thumbnail of the unedited original.
        The GPS fields are the sensitive ones: a photo taken at home is a map
        pin on your house.
      </p>

      <h2>When it is removed for you</h2>
      <p>
        The large social networks re-encode uploads and drop EXIF in the
        process. Instagram, Facebook and X do this; the photo people see holds
        no location. Messaging apps vary. WhatsApp strips metadata from photos
        sent as photos but keeps it when a file is sent as a document. Email
        attachments, cloud drive links, AirDrop and plain file transfers keep
        everything. So the risk is not the public post; it is the file handed
        directly to someone, or uploaded to a site that does not re-encode.
      </p>

      <h2>Removing it in the browser</h2>
      <p>
        Raspy never copies metadata into a saved file. Its export is built
        from the decoded pixels, so the JPEG, PNG or WebP it writes contains
        image data and nothing else. That makes it a metadata stripper that
        also happens to be an editor, and it works without sending the photo
        anywhere, which matters when the whole point is privacy.
      </p>
      <ol>
        <li>
          Open <Link href="/">Raspy</Link> and choose the photo. HEIC, JPEG,
          PNG and WebP all work.
        </li>
        <li>
          Make no edits if you want the image unchanged. Or crop, if the
          background gives away more than the metadata would.
        </li>
        <li>
          Press <strong>Save</strong>. JPEG at quality 90 keeps the file close
          to the original in size and appearance. PNG is lossless if you would
          rather not re-compress at all.
        </li>
        <li>
          Share the saved copy, not the original.
        </li>
      </ol>

      <h2>Checking the result</h2>
      <p>
        On a Mac, open the saved file in Preview and press{" "}
        <kbd>Cmd</kbd>+<kbd>I</kbd>; the GPS tab should be absent. On Windows,
        right-click the file, choose Properties, then Details; the GPS section
        should be empty. On a phone, the Photos or Gallery app&#39;s info panel
        shows a map when location is present and nothing when it is not.
      </p>

      <h2>Stopping it at the source</h2>
      <p>
        On an iPhone, the share sheet has an <strong>Options</strong> link at
        the top where location can be switched off per share. Settings,
        Privacy and Security, Location Services, Camera controls whether it is
        recorded at all. On Android, the Camera app&#39;s settings usually have a
        &quot;save location&quot; toggle. Turning it off means the photo never had the
        data; the trade is that your own library loses the map view.
      </p>
    </>
  ),
};
