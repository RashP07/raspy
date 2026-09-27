import Link from "next/link";
import { REPO_URL } from "@/app/lib/site";
import type { Guide } from "../types";

export const editWithoutUploading: Guide = {
  slug: "edit-photos-without-uploading",
  title: "How to edit photos online without uploading them",
  description:
    "Most online photo editors send your photo to a server. Some run entirely in the browser. How to tell the difference, how to verify it yourself, and what an editor with no upload path looks like.",
  published: "2026-08-28",
  minutes: 4,
  summary:
    "\"Online photo editor\" usually means your photo goes to someone else's computer, is edited there, and comes back. It does not have to. A browser can decode, edit and encode a photo on its own, and an editor built that way has no upload to worry about. The difficult part is telling which kind you are using.",
  related: [
    "remove-location-data-from-photos",
    "use-raspy-offline",
    "convert-heic-to-jpg-in-your-browser",
  ],
  body: (
    <>
      <h2>Two kinds of &quot;online&quot;</h2>
      <p>
        A server-side editor uploads the file, runs the edit on the server,
        and streams the result back. The upside is that the server can be as
        powerful as the company likes, which is how heavy AI features work.
        The downside is that your photo is now stored, at least briefly, by a
        third party, subject to their privacy policy and their security.
      </p>
      <p>
        A client-side editor downloads the editor&#39;s code to your browser and
        does the work there. The photo is read from your disk into the page&#39;s
        memory and never leaves it. The upside is privacy and speed on a slow
        connection. The downside is that everything has to fit in your
        device&#39;s memory and run on its processor.
      </p>
      <p>
        Many editors are a mix, processing simple edits locally and sending
        the photo away for anything heavy. A privacy policy that says photos
        &quot;may be processed on our servers&quot; usually means exactly that.
      </p>

      <h2>How to check for yourself</h2>
      <ol>
        <li>
          Open the editor in Chrome, Edge or Firefox and press{" "}
          <kbd>F12</kbd> to open developer tools. Choose the{" "}
          <strong>Network</strong> tab.
        </li>
        <li>Open a photo in the editor and make an edit.</li>
        <li>
          Look for a request with a size close to your photo&#39;s, or any POST
          request that appears after you picked the file. If there is none,
          the photo stayed on your device.
        </li>
        <li>
          For a stronger test, load the editor, then switch on aeroplane mode
          before opening the photo. A local editor keeps working.
        </li>
      </ol>

      <h2>What Raspy does</h2>
      <p>
        <Link href="/">Raspy</Link> is client-side by construction rather than
        by policy. There is no server code that accepts an image; the
        deployment serves static files. Decoding uses the browser&#39;s own image
        decoder, or a WebAssembly decoder loaded into the page for HEIC. The
        adjustments run as a WebGL shader on your graphics chip. Export
        encodes in a worker thread on your device. The photo lives in memory
        for as long as the tab is open, is not written to disk, and is not
        placed in the offline cache. The service worker that makes the app
        work offline refuses to store any image response, so even the cache
        cannot hold a photo.
      </p>
      <p>
        The one third party is a visit counter, Google Analytics, which counts
        page loads and never receives anything about a photo or an edit. It is
        off by default in the EU, EEA, UK and Switzerland and can be turned
        off anywhere from Settings. <a href={REPO_URL}>The source is public</a>
        , so each of these claims can be checked in the code rather than taken
        on trust.
      </p>

      <h2>What a local editor cannot do</h2>
      <p>
        Honesty cuts both ways. Running on your device means no AI background
        removal trained on a server farm, no shared cloud library, and a hard
        limit set by your device&#39;s memory. Raspy caps imports at 75 MB and 60
        megapixels and will shrink an export if the graphics chip cannot
        allocate a full-size canvas, telling you when it does. For the
        everyday edit, which is exposure, a crop and a straighten, that is
        plenty. For compositing and generative tools, a server-side editor is
        the right tool, and the trade-off is worth knowing about before the
        photo is uploaded.
      </p>
    </>
  ),
};
