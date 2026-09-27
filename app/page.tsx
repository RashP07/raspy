import { EditorApp } from "@/app/components/editor/EditorApp";
import { JsonLd } from "@/app/components/site/JsonLd";
import { HOME_FAQ, LandingContent } from "@/app/components/site/LandingContent";
import {
  absoluteUrl,
  AUTHOR_NAME,
  AUTHOR_URL,
  REPO_URL,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/app/lib/site";

export default function Home() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": absoluteUrl("/#website"),
              name: SITE_NAME,
              url: absoluteUrl("/"),
              description: SITE_TAGLINE,
              publisher: { "@id": absoluteUrl("/#author") },
            },
            {
              "@type": "Person",
              "@id": absoluteUrl("/#author"),
              name: AUTHOR_NAME,
              url: AUTHOR_URL,
            },
            {
              "@type": "WebApplication",
              "@id": absoluteUrl("/#app"),
              name: SITE_NAME,
              url: absoluteUrl("/"),
              description: SITE_TAGLINE,
              applicationCategory: "MultimediaApplication",
              applicationSubCategory: "Photo editor",
              operatingSystem: "Any",
              browserRequirements: "Requires a browser with WebGL2",
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              screenshot: absoluteUrl("/og.png"),
              image: absoluteUrl("/og.png"),
              author: { "@id": absoluteUrl("/#author") },
              license: "https://opensource.org/license/mit",
              codeRepository: REPO_URL,
              featureList: [
                "Edits photos on your device; no upload",
                "Opens HEIC and HEIF in any browser",
                "15 adjustments: exposure, brilliance, highlights, shadows, contrast, brightness, black point, saturation, vibrancy, warmth, tint, sharpness, definition, noise reduction, vignette",
                "Crop with aspect ratios, rotate, straighten, flip",
                "Export to JPEG, PNG or WebP with metadata removed",
                "Works offline as an installable web app",
              ],
            },
            {
              "@type": "FAQPage",
              "@id": absoluteUrl("/#faq"),
              mainEntity: HOME_FAQ.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            },
          ],
        }}
      />
      <EditorApp landing={<LandingContent />} />
    </>
  );
}
