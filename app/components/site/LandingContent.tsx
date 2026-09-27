import Link from "next/link";
import { COMPARISONS } from "@/app/content/compare";
import { GUIDES } from "@/app/content/guides";
import { REPO_URL } from "@/app/lib/site";
import { primaryLinkClass, SiteFooter } from "./SiteChrome";

/** Rendered on the page and mirrored into the FAQPage structured data. */
export const HOME_FAQ: { q: string; a: string }[] = [
  {
    q: "Is Raspy free?",
    a: "Yes. There is no paid plan, no watermark, no export limit and no advertising. The source code is public under the MIT licence.",
  },
  {
    q: "Are my photos uploaded anywhere?",
    a: "No. Decoding, editing and saving all happen inside the page on your device. The application has no endpoint that could receive a photo, and the only network requests it makes are for its own files. You can confirm this in your browser's network tab.",
  },
  {
    q: "Does it open HEIC photos from an iPhone?",
    a: "Yes, on any operating system. Where the browser cannot decode HEIC itself, Raspy loads a decoder (libheif, compiled to WebAssembly) into the page and decodes the file locally. Nothing is uploaded to convert it.",
  },
  {
    q: "Does it work on a phone?",
    a: "Yes. It runs in Safari on iPhone and in Chrome on Android, and can be added to the home screen as an app. Once installed it opens without a connection.",
  },
  {
    q: "Which formats can it open and save?",
    a: "It opens JPEG, PNG, WebP, HEIC and HEIF up to 75 MB and 60 megapixels. It saves JPEG, PNG or WebP at full, 75% or 50% size, with a quality control for JPEG and WebP.",
  },
  {
    q: "Is the saved photo's location removed?",
    a: "Yes. The exported file is re-encoded from raw pixels, so EXIF data, including GPS coordinates, camera model and the original date, is not carried across.",
  },
  {
    q: "Is this the iPhone Photos app?",
    a: "No. Raspy is an independent, open-source recreation of the Adjust and Crop tools from the iPhone Photos editor, with the same sliders and the same sign conventions, so edits feel familiar. It is not affiliated with Apple. Filters, portrait lighting, markup, layers, text and AI tools are not included.",
  },
  {
    q: "What does it need to run?",
    a: "A current browser with WebGL2, which includes recent versions of Chrome, Edge, Firefox and Safari on desktop and mobile. Without WebGL2, crop, rotate and export still work, but the adjustment sliders are unavailable and the app says so.",
  },
];

const ADJUSTMENTS: { name: string; does: string }[] = [
  { name: "Exposure", does: "the whole image lighter or darker, as a camera stop would" },
  { name: "Brilliance", does: "lifts dark areas and tames bright ones at the same time" },
  { name: "Highlights", does: "recovers or brightens the lightest parts" },
  { name: "Shadows", does: "opens up or deepens the darkest parts" },
  { name: "Contrast", does: "widens or narrows the gap between light and dark" },
  { name: "Brightness", does: "lifts the midtones without clipping the ends" },
  { name: "Black point", does: "sets how dark the darkest pixel is allowed to go" },
  { name: "Saturation", does: "strength of every colour equally" },
  { name: "Vibrancy", does: "boosts muted colours while protecting skin tones" },
  { name: "Warmth", does: "shifts the image towards amber or towards blue" },
  { name: "Tint", does: "shifts the image towards magenta or towards green" },
  { name: "Sharpness", does: "crisps fine edges" },
  { name: "Definition", does: "adds local contrast so mid-sized detail stands out" },
  { name: "Noise reduction", does: "smooths grain while keeping edges" },
  { name: "Vignette", does: "darkens or lightens the corners" },
];

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2
      id={id}
      className="scroll-mt-6 text-[1.5rem] leading-tight font-semibold tracking-snug text-balance"
    >
      {children}
    </h2>
  );
}

/**
 * Everything under the import screen on the home page. A server component:
 * it ships as HTML, never as client JavaScript, and is the text a search
 * engine reads about the app.
 */
export function LandingContent() {
  const featuredGuides = GUIDES.slice(0, 6);

  return (
    <div className="site-page mx-auto flex w-full max-w-[72ch] flex-col gap-16 px-[max(var(--spacing-page),env(safe-area-inset-left))] pt-12 pb-[max(3rem,env(safe-area-inset-bottom))]">
      <section className="prose" aria-labelledby="about">
        <SectionHeading id="about">
          The iPhone Photos editor, in any browser
        </SectionHeading>
        <p>
          Raspy is a free online photo editor that recreates the Adjust and
          Crop tools from the iPhone Photos app and runs them entirely in your
          browser. Open a photo, move the same sliders, crop and straighten,
          and save a copy. There is no account, nothing to install, and the
          photo is never uploaded. The editing runs on your own device, on the
          graphics chip, through WebGL.
        </p>
        <p>
          It also opens HEIC files from an iPhone on Windows, Android, Linux
          and ChromeOS, where they are usually a nuisance, so a photo can go
          from the phone to a finished JPEG without passing through a
          conversion site first.
        </p>
        <p>
          <Link href="#top" className={`${primaryLinkClass} mt-2`}>
            Open a photo
          </Link>
        </p>
      </section>

      <section className="prose" aria-labelledby="how">
        <SectionHeading id="how">How it works</SectionHeading>
        <ol>
          <li>
            <strong>Open a photo.</strong> Choose a JPEG, PNG, WebP or HEIC
            file, or drop one anywhere on the page. Files up to 75 MB and 60
            megapixels are accepted.
          </li>
          <li>
            <strong>Edit.</strong> Fifteen adjustments with a live preview,
            plus crop, aspect ratios, rotate, straighten and flip. Press and
            hold the photo, or hold <kbd>Space</kbd>, to compare with the
            original. Undo and redo cover every change.
          </li>
          <li>
            <strong>Save.</strong> Export as JPEG, PNG or WebP at full, 75% or
            50% size, with a quality control. On a phone the file can go
            straight to the share sheet. Location data and the rest of the
            metadata are left out of the saved copy.
          </li>
        </ol>
      </section>

      <section className="prose" aria-labelledby="adjust">
        <SectionHeading id="adjust">What you can adjust</SectionHeading>
        <p>
          The same fifteen adjustments as the iPhone, in the same order, with
          the same direction of travel. Positive Highlights darkens, as it does
          on the phone, so muscle memory carries over.
        </p>
        <ul>
          {ADJUSTMENTS.map((item) => (
            <li key={item.name}>
              <strong>{item.name}</strong>: {item.does}.
            </li>
          ))}
        </ul>
        <p>
          Every slider works in linear light, with saturation and vibrancy
          stepping back into gamma space where colour behaves better. Sharpness
          and definition act on luminance only, so edges do not pick up colour
          fringes, and the export scales those filters so a full-resolution
          save looks like the preview you approved.
        </p>
      </section>

      <section className="prose" aria-labelledby="crop">
        <SectionHeading id="crop">Crop, straighten, and flip</SectionHeading>
        <p>
          Crop freely or lock to Original, 1:1, 4:5, 4:3 or 16:9. Rotating the
          frame swaps a ratio to its portrait version (5:4, 3:4, 9:16), which
          is how the phone does it. Straighten runs to 45 degrees either way
          and fills the frame as you turn it, so there are never empty corners
          to trim afterwards. Rotate in 90 degree steps, and flip horizontally
          or vertically.
        </p>
        <p>
          On a keyboard, the arrow keys move the crop one pixel, <kbd>Shift</kbd>{" "}
          makes that ten, and <kbd>Alt</kbd> with an arrow resizes the frame
          while holding its ratio.
        </p>
      </section>

      <section className="prose" aria-labelledby="heic">
        <SectionHeading id="heic">Opens HEIC where nothing else does</SectionHeading>
        <p>
          iPhones save photos as HEIC by default. Safari can display them, but
          Windows needs paid codec extensions, many Android apps refuse them,
          and most websites reject them at upload. Raspy first asks the
          browser to decode the file itself. When the browser cannot, it loads
          libheif compiled to WebAssembly into the page and decodes the file
          there, on your device. The decoder is only downloaded when it is
          needed, and the photo still goes nowhere.
        </p>
        <p>
          <Link href="/guides/open-heic-photos-on-windows">
            How to open and edit HEIC photos on Windows
          </Link>
        </p>
      </section>

      <section className="prose" aria-labelledby="private">
        <SectionHeading id="private">Private by construction</SectionHeading>
        <p>
          Most &quot;private&quot; claims are policy. Raspy&#39;s is architecture, and the
          code is public so each point can be checked.
        </p>
        <ul>
          <li>
            <strong>No upload path exists.</strong> Decoding, editing and
            encoding run in the page. There is no server endpoint a photo could
            be sent to.
          </li>
          <li>
            <strong>Nothing is stored.</strong> The photo lives in memory while
            its tab is open. Close the tab and it is gone.
          </li>
          <li>
            <strong>Saved copies carry no metadata.</strong> Export re-encodes
            from raw pixels, which drops EXIF, including GPS coordinates.
          </li>
          <li>
            <strong>Works offline.</strong> Install it once and it opens without
            a connection. The offline cache is written so image data can never
            enter it.
          </li>
          <li>
            <strong>One optional third party.</strong> A visit counter (Google
            Analytics) that never sees a photo, is off by default in the EU and
            UK, and can be switched off anywhere from Settings.
          </li>
        </ul>
        <p>
          <Link href="/privacy">Read the privacy page</Link> or{" "}
          <a href={REPO_URL}>the source on GitHub</a>.
        </p>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="guides">
        <SectionHeading id="guides">Guides</SectionHeading>
        <ul className="flex flex-col divide-y divide-hairline">
          {featuredGuides.map((guide) => (
            <li key={guide.slug} className="py-3">
              <Link
                href={`/guides/${guide.slug}`}
                prefetch={false}
                className="group flex flex-col gap-1 no-underline"
              >
                <span className="text-body font-medium text-fg group-hover:underline group-hover:underline-offset-4">
                  {guide.title}
                </span>
                <span className="text-label leading-normal text-muted">
                  {guide.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-label">
          <Link href="/guides" className="text-fg underline underline-offset-4">
            All guides
          </Link>
        </p>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="compare">
        <SectionHeading id="compare">How Raspy compares</SectionHeading>
        <p className="text-body leading-normal text-muted">
          Raspy does one narrow job well and leaves out layers, text and AI
          tools on purpose. These pages say where each editor wins.
        </p>
        <ul className="flex flex-wrap gap-2">
          {COMPARISONS.map((page) => (
            <li key={page.slug}>
              <Link
                href={`/compare/${page.slug}`}
                prefetch={false}
                className="inline-flex min-h-10 items-center rounded-control border border-hairline bg-surface px-3 text-label font-medium text-fg no-underline hover:bg-hover"
              >
                Raspy vs {page.competitor}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="prose" aria-labelledby="faq">
        <SectionHeading id="faq">Questions</SectionHeading>
        {HOME_FAQ.map((item) => (
          <div key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
      </section>

      <SiteFooter />
    </div>
  );
}
