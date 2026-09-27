import type { Metadata, Viewport } from "next";
import { ConsentBanner } from "./components/ConsentBanner";
import { GA_ENABLED, GA_INIT_SCRIPT } from "./lib/analytics";
import { CONSENT_INIT_SCRIPT } from "./lib/consent";
import { SITE_URL } from "./lib/site";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "./lib/theme";
import "./globals.css";

/** Declared in globals.css. One latin file, preloaded below; next/font/google
 *  preloaded all five Google subsets and they shared bandwidth with the
 *  stylesheet on every first visit. */
const GEIST_LATIN = "/fonts/geist-latin-v2.woff2";

const HOME_TITLE = "Raspy: free online photo editor that never uploads your photos";
const HOME_DESCRIPTION =
  "Edit photos in your browser with the iPhone Photos tools: exposure, highlights, shadows, crop, straighten and more. Opens HEIC on any device. No account, no upload, free.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: "%s | Raspy",
  },
  description: HOME_DESCRIPTION,
  applicationName: "Raspy",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Raspy",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Raspy: edit photos that never leave your device.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Raspy",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must run before first paint, or a stored override flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link
          rel="preload"
          href={GEIST_LATIN}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="relative bg-bg text-fg antialiased">
        <div className="root">{children}</div>
        {GA_ENABLED && <ConsentBanner />}
        {/* Last, so measurement never delays first paint or the editor. Order
            within the block is load-bearing: the consent defaults must be on
            dataLayer before GA_INIT_SCRIPT injects the Google tag. */}
        {GA_ENABLED && (
          <>
            <script dangerouslySetInnerHTML={{ __html: CONSENT_INIT_SCRIPT }} />
            <script dangerouslySetInnerHTML={{ __html: GA_INIT_SCRIPT }} />
          </>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
`,
          }}
        />
      </body>
    </html>
  );
}
