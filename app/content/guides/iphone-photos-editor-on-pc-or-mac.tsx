import Link from "next/link";
import type { Guide } from "../types";

export const iphoneEditorOnPc: Guide = {
  slug: "iphone-photos-editor-on-pc-or-mac",
  title: "Get the iPhone photo editing tools on a Windows PC",
  description:
    "The iPhone Photos editor's adjustments are good, and they exist only on Apple devices. How to use the same fifteen sliders, crop and straighten on Windows, Linux or ChromeOS, in a browser, with iPhone HEIC files.",
  published: "2026-08-28",
  minutes: 4,
  summary:
    "If you edit on an iPhone and then sit down at a Windows PC, the tools change completely. Windows Photos has its own set, Google Photos on the web has another, and neither matches what your hands already know. Raspy recreates the iPhone's Adjust and Crop tools in the browser, so the same sliders, in the same order, with the same behaviour, are available on any computer.",
  related: [
    "open-heic-photos-on-windows",
    "exposure-brightness-highlights-shadows",
    "use-raspy-offline",
  ],
  body: (
    <>
      <h2>What is the same</h2>
      <ul>
        <li>
          <strong>The fifteen adjustments</strong>: Exposure, Brilliance,
          Highlights, Shadows, Contrast, Brightness, Black point, Saturation,
          Vibrancy, Warmth, Tint, Sharpness, Definition, Noise reduction and
          Vignette, in that order.
        </li>
        <li>
          <strong>The directions</strong>. Positive Highlights darkens, the
          way it does on the phone. Vibrancy protects skin tones. Straighten
          fills the frame as it rotates.
        </li>
        <li>
          <strong>The dial</strong>. Each adjustment is a ruler you drag, with
          a tick every step, rather than a thin slider you aim at.
        </li>
        <li>
          <strong>Compare</strong>. Press and hold the photo to see the
          original, exactly as on the phone. On a keyboard, hold{" "}
          <kbd>Space</kbd>.
        </li>
        <li>
          <strong>Crop</strong> with the same aspect ratio choices, rotate,
          straighten and flip, and undo and redo.
        </li>
        <li>
          <strong>HEIC</strong> opens directly. No conversion first.
        </li>
      </ul>

      <h2>What is different</h2>
      <p>
        <Link href="/">Raspy</Link> is an independent open-source project, not
        an Apple product, and it stops at the Adjust and Crop tools. The
        iPhone&#39;s Filters tab, Portrait lighting, Markup, Live Photo controls
        and the newer AI clean-up tools are not there. It also runs on a photo
        you open, not on a library, so there is no syncing and nothing is kept
        between sessions. Each edit is a fresh open and a save.
      </p>

      <h2>Using it on a PC</h2>
      <ol>
        <li>
          Move the photos over. iCloud for Windows keeps a folder in sync; a
          USB cable or a cloud drive works too. Leave them as HEIC.
        </li>
        <li>
          Open Raspy in Chrome, Edge or Firefox. Drop a photo anywhere on the
          page, or click <strong>Open photo</strong>.
        </li>
        <li>
          Edit. The ruler responds to a mouse drag, a trackpad scroll, and to
          the arrow keys once it has focus. Double-click a ruler to reset it.
        </li>
        <li>
          Save as JPEG. It goes to the Downloads folder; drag it back to
          wherever your photos live.
        </li>
      </ol>

      <h2>On a Mac</h2>
      <p>
        A Mac already has the same editor inside its Photos app, which is the
        right tool if the photo is in your library. Raspy is useful on a Mac
        for a photo that is not in the library and should not be imported
        into it, such as a file someone sent, and for editing in a browser
        that has no access to your photo collection at all.
      </p>

      <h2>Keyboard shortcuts</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Space (hold)</td>
              <td>Show the original</td>
            </tr>
            <tr>
              <td>+ / - / 0</td>
              <td>Zoom in, out, and back to fit</td>
            </tr>
            <tr>
              <td>Arrow keys</td>
              <td>Move a focused ruler by one step, or the crop by one pixel</td>
            </tr>
            <tr>
              <td>Shift + arrows</td>
              <td>Ten steps, or ten pixels</td>
            </tr>
            <tr>
              <td>Alt + arrows</td>
              <td>Resize the crop while keeping its ratio</td>
            </tr>
            <tr>
              <td>Page Up / Page Down</td>
              <td>Jump a focused ruler by a major step</td>
            </tr>
            <tr>
              <td>Home / End</td>
              <td>Ruler to its minimum or maximum</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  ),
};
