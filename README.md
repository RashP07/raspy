# Raspy

A local-first photo editor that runs entirely in your browser. Your photos are
never uploaded, never sent to a server, and never leave the device — there is no
account to create and nothing to delete afterwards.

Raspy is a faithful recreation of the iPhone Photos editor, built as an
installable web app. It opens HEIC and HEIF files anywhere, including on
desktops and Android phones where they are normally awkward to work with, so
you can edit photos straight off an iPhone without handing them to an online
converter first.

## Local-first, in practice

The phrase describes how the app is built, not just how it is marketed:

- **No upload path exists.** Decoding, editing, and encoding all happen in the
  page. There is no endpoint to send a photo to.
- **No account, no telemetry, no server-side storage.** D1 and R2 are `null` in
  `.openai/hosting.json`; the deployment serves static files.
- **Exports strip EXIF and GPS** by re-encoding through canvas, so a shared
  photo does not carry the location where it was taken.
- **Your work survives a closed tab.** A single draft is kept in IndexedDB, on
  your machine, and restored when you come back.
- **It works offline.** The service worker caches the app shell only, and never
  photo data.

## Editing

- **15 adjustments** with a live WebGL2 preview: exposure, brilliance,
  highlights, shadows, contrast, brightness, black point, saturation, vibrancy,
  warmth, tint, sharpness, definition, noise reduction, and vignette
- **Crop** with free, original, 1:1, 4:3, 3:4, 3:2, 2:3, 16:9, and 9:16 ratios,
  plus rotate, straighten, and flip
- **Press and hold — or hold Space — to compare** against the original
- **Export** to JPEG, PNG, or WebP at full, 75%, or 50% size, with adjustable
  quality
- **Undo and redo** across the whole session
- Light, dark, and automatic themes, and optional UI sound

Adjustments need WebGL2. Without it, crop and export still work and the app
says so rather than failing silently.

## Install on iPhone

Open the deployed URL in Safari, then Share → Add to Home Screen. It launches
full screen like a native app.

## Stack

- [vinext](https://github.com/cloudflare/vinext) (Sites-compatible) + React 19 +
  TypeScript + Tailwind CSS 4
- WebGL2 live preview and adjustments, Canvas 2D crop overlay and fallback
  renderer
- Native-first HEIC/HEIF import with a lazy libheif WASM worker fallback
- IndexedDB single recoverable draft
- [Base UI](https://base-ui.com) primitives

## Develop

```bash
npm install
npm run dev
```

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## License

MIT — see [LICENSE](LICENSE).

Raspy is an independent project. It is not affiliated with, authorised by, or
endorsed by Apple Inc. References to the iPhone Photos editor describe what the
app reproduces; all trademarks belong to their respective owners.
