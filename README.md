# SimplyEdit

Privacy-first iPhone photo editor PWA. Adjust, crop, and export entirely on-device — no accounts, uploads, or cloud processing.

## Stack

- [vinext](https://github.com/cloudflare/vinext) (Sites-compatible) + React 19 + TypeScript + Tailwind CSS 4
- WebGL2 live preview / adjustments, Canvas 2D crop overlay + fallback
- Native-first HEIC/HEIF import with a lazy libheif WASM worker fallback
- IndexedDB single recoverable draft
- [Base UI](https://base-ui.com) primitives (Button, Slider, Tabs, Drawer, Toast)

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

## Privacy

- D1 and R2 are `null` in `.openai/hosting.json`
- Photos never leave the device; the service worker caches only the app shell
- Exports strip EXIF/GPS by re-encoding through canvas

## Install on iPhone

Open the deployed URL in Safari → Share → Add to Home Screen.
