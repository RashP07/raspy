import Link from "next/link";
import type { Guide } from "../types";

export const useOffline: Guide = {
  slug: "use-raspy-offline",
  title: "Install Raspy as an app and use it offline",
  description:
    "Raspy is a web app that installs to the home screen or desktop and runs without a connection. How to install it on iPhone, Android, Windows, Mac and ChromeOS, and what the offline cache does and does not hold.",
  published: "2026-08-28",
  minutes: 3,
  summary:
    "Because everything in Raspy happens on your device, a network connection is only needed to fetch the app itself. Install it once and it opens full screen, without browser chrome, on a plane or in a basement. Installing is a menu item, not a download.",
  related: [
    "edit-photos-without-uploading",
    "edit-iphone-photos-on-android",
    "iphone-photos-editor-on-pc-or-mac",
  ],
  body: (
    <>
      <h2>iPhone and iPad</h2>
      <ol>
        <li>
          Open <Link href="/">raspy.rashmitaparmanik.com</Link> in Safari. It
          has to be Safari; other iOS browsers cannot add web apps.
        </li>
        <li>Tap the Share button, the square with an arrow.</li>
        <li>
          Scroll the sheet and tap <strong>Add to Home Screen</strong>, then{" "}
          <strong>Add</strong>.
        </li>
      </ol>
      <p>
        The icon appears with the others. It opens full screen and shows up in
        the app switcher like any app. Photos open from the same picker the
        Photos app uses, including HEIC.
      </p>

      <h2>Android</h2>
      <ol>
        <li>Open the site in Chrome.</li>
        <li>
          Tap the three-dot menu, then <strong>Add to Home screen</strong> or{" "}
          <strong>Install app</strong>, depending on the version.
        </li>
        <li>Confirm.</li>
      </ol>
      <p>
        Samsung Internet and Edge on Android have the same option under their
        own menus.
      </p>

      <h2>Windows, Mac, Linux and ChromeOS</h2>
      <p>
        In Chrome or Edge, an install icon appears at the right end of the
        address bar when the site is open; click it and confirm. The app gets
        its own window, a Start menu or Dock entry, and can be pinned to the
        taskbar. Firefox and Safari on desktop do not install web apps in
        this way, but the site works in them as a normal tab, offline
        included.
      </p>

      <h2>What works offline</h2>
      <p>
        Everything. Opening a photo, every adjustment, crop, and saving. The
        first time the app loads it stores its own files, roughly a megabyte,
        in the browser&#39;s cache. After that it starts from the cache and checks
        for a newer version in the background when a connection is present.
        The HEIC decoder is fetched the first time a HEIC is opened, so open
        one while online if you expect to need it offline.
      </p>

      <h2>What the cache never holds</h2>
      <p>
        Photos. The service worker that manages the cache refuses to store any
        response that is an image, and its fetch handler steps aside entirely
        for image requests, so a photo cannot enter the cache by accident.
        That is a deliberate part of the privacy design and it is checked in
        the app&#39;s tests. The photo you are editing lives in memory for as
        long as the tab or app window is open, and is gone when it closes.
      </p>

      <h2>Removing it</h2>
      <p>
        Delete the icon as you would any app. On desktop, the installed app&#39;s
        menu has an uninstall option. Removing it deletes the cache; the three
        settings Raspy keeps in local storage (theme, sound, analytics choice)
        are cleared along with the site&#39;s data if you clear browsing data.
      </p>
    </>
  ),
};
