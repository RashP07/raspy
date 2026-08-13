import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "./lib/theme";
import "./globals.css";

// No `weight`: that pulls the variable font, so every weight the UI uses comes
// from one file instead of three static cuts.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://raspy.rashmitaparmanik.com"),
  title: "Raspy — private photo editor",
  description: "Photos and edits never leave this device.",
  applicationName: "Raspy",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Raspy",
    title: "Raspy — private photo editor",
    description:
      "A local-first photo editor in the browser. No account, no upload, nothing to delete later.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Raspy — edit photos that never leave your device.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Raspy — private photo editor",
    description:
      "A local-first photo editor in the browser. No account, no upload, nothing to delete later.",
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Raspy — private photo editor",
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
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <head>
        {/* Must run before first paint, or a stored override flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="relative bg-bg text-fg antialiased">
        <div className="root">{children}</div>
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
