# Raspy

A local-first photo editor that runs entirely in your browser. Your photos are
never uploaded, never sent to a server, and never leave the device — there is no
account to create and nothing to delete afterwards.

Raspy is a faithful recreation of the iPhone Photos editor, built as an
installable web app. It opens HEIC and HEIF files anywhere, including on
desktops and Android phones where they are normally awkward to work with, so you
can edit photos straight off an iPhone without handing them to an online
converter first.

**Stack:** React 19 · TypeScript · WebGL2 (GLSL ES 3.00) · Tailwind CSS 4 ·
Web Workers · OffscreenCanvas · WebAssembly · IndexedDB · Service Worker ·
Vitest + Testing Library

---

## Local-first, in practice

The phrase describes how the app is built, not just how it is marketed:

- **No upload path exists.** Decoding, editing, and encoding all happen in the
  page. There is no endpoint to send a photo to.
- **No account and no server-side storage.** No database or object store is
  provisioned; the deployment serves static files only. The one third party is
  Google Analytics, which counts page visits with Google Signals and ad
  personalisation disabled, and is gated behind consent in the EU. It never
  sees a photo, an edit, or an export — nothing about your image is passed to
  it. See [Analytics and consent](#analytics-and-consent).
- **Exports carry no metadata.** The file is re-encoded from raw canvas pixels,
  so EXIF and GPS are dropped — a shared photo does not carry the location where
  it was taken.
- **Your work survives a closed tab.** A single draft is kept in IndexedDB, on
  your machine, and restored when you come back.
- **It works offline**, and the service worker is written so photo data can
  never enter the cache.

## Editing

- **15 adjustments** with a live WebGL2 preview: exposure, brilliance,
  highlights, shadows, contrast, brightness, black point, saturation, vibrancy,
  warmth, tint, sharpness, definition, noise reduction, and vignette
- **Crop** with free, original, 1:1, 4:3, 3:4, 3:2, 2:3, 16:9, and 9:16 ratios,
  plus rotate, straighten (±45°), and flip
- **Press and hold — or hold Space — to compare** against the original
- **Export** to JPEG, PNG, or WebP at full, 75%, or 50% size, with adjustable
  quality
- **Undo and redo** with gesture-aware history
- Light, dark, and automatic themes, and optional UI sound

Adjustments require WebGL2. Without it the app degrades to a Canvas 2D renderer
where crop, orientation, and export still work, and says so rather than failing
silently.

---

# Technical overview

## Rendering pipeline

The preview is a **single-pass WebGL2 fragment shader**. There are no
framebuffers, no ping-pong texture chain, and no multi-pass compositing: one
texture, one program, one `TRIANGLE_STRIP` draw of a fullscreen quad. All
fifteen adjustments are applied in one shader invocation, which is what keeps
slider drags at frame rate.

Geometry is not baked into vertices. Crop, rotation, straighten, flip, pan, and
zoom are composed into a single **`mat3`** uniform (`u_sourceUvFromOutput`) and
applied in the vertex shader, so changing the crop never touches a buffer.

**Colour is handled properly rather than conveniently.** Textures are 8-bit
RGBA, but every sample is converted to linear light through the exact piecewise
IEC sRGB transfer function (cutoffs `0.04045` / `0.0031308`, exponent `2.4`),
all tone and exposure maths runs in linear space, and the result is encoded back
at the end. Luma uses the Rec.709 coefficients `(0.2126, 0.7152, 0.0722)`.
Saturation and vibrancy deliberately step _back_ into gamma space, because
perceptual colour operations behave better there, then return to linear.

Two shader details worth calling out:

- **Sharpen and definition operate on luma only.** Both compute a detail term
  from luminance and apply it as a scalar multiplier that preserves the R:G:B
  ratio. The per-channel form tinted edges; this doesn't. Both also apply a
  **gain correction** — the unadjusted neighbourhood is rescaled by
  `luma(base)/luma(rawCenter)` so the high-frequency term measures local detail
  rather than the tonal delta introduced by earlier stages. Sharpen is a
  4-neighbour Laplacian gated by an edge mask; definition is an 8-tap ring
  unsharp mask at radius 2.
- **Vibrancy protects skin tones.** A hue-ratio mask built from `(r-g)/max` and
  `(g-b)/max` with smoothstep bands, gated on luma, attenuates the effect by up
  to 70% in skin-tone regions, so pushing vibrancy doesn't turn faces orange.

Noise reduction is an edge-aware **bilateral-style 3×3 kernel** weighted by
`exp(-Δluma · k)`, so it smooths flat areas without dissolving edges. Highlights
and shadows follow Apple's sign convention (positive highlights _darkens_), and
the chain ends with an exponential **soft clip** above 0.8 to roll off highlights
instead of hard-clipping them.

## Preview and export are separate renderers

Export does not reuse the on-screen canvas. It allocates its own canvas, its own
WebGL2 context with `preserveDrawingBuffer`, and its own full-resolution texture
— the preview stays on its 2048px texture untouched.

**It also runs off the main thread.** The GPU draw and the encode happen in an
`OffscreenCanvas` worker, which is where a large export spends its time and
where the jank used to show. The decode deliberately stays on the main thread
because it owns the libheif fallback; the resulting `ImageBitmap` is
_transferred_ into the worker, so nothing is copied. Cancelling is then
immediate rather than cooperative — terminating the worker takes its context and
any in-flight encode with it. Browsers without OffscreenCanvas WebGL2 fall
through to an equivalent main-thread path, which releases its GPU objects in a
`finally` on every exit path, including abort.

Rendering export separately creates a subtle problem the code solves
explicitly. The preview is
downscaled to a 2048px long edge, so a convolution kernel measured in texels
covers a much larger _fraction_ of the image on screen than it would at full
resolution. Exporting naively would make sharpening, definition, and noise
reduction come out visibly weaker than what you approved. So export scales the
kernel:

```js
const exportKernel = Math.max(1, Math.max(texW, texH) / PREVIEW_LONG_EDGE);
```

and feeds `u_texel` accordingly, so those three filters cover the same image
fraction at any output size.

Export dimensions are clamped twice: by `gl.MAX_TEXTURE_SIZE` (capped at 8192),
and by a **256 MB memory budget** estimated at 8 bytes per pixel, scaled down by
`sqrt(cap/estimate)`. When either clamp bites, the UI reports the reduction
instead of silently producing a smaller file. JPEG export flattens onto a white
canvas first, since alpha would otherwise encode as black.

## Resilience

**WebGL context loss is handled, not ignored.** The renderer listens for
`webglcontextlost`, calls `preventDefault()` so a restore can fire, and on
`webglcontextrestored` re-acquires the context, recompiles the program, rebuilds
the VAO and buffers, re-reads uniform locations, and re-uploads the texture from
the source blob — deliberately dropping the cached preview bitmap, which may
have been closed. Status is broadcast as `raspy:renderer-status` events so the
UI can show a recovering state. This is the failure mode that kills naive WebGL
apps on mobile when the OS reclaims GPU memory.

When a context does **not** come back — no restore within 8 seconds, or a
restore that yields an unusable context — the renderer stops waiting and emits
`raspy:renderer-unrecoverable`, and the app **downgrades to Canvas 2D at
runtime** rather than sitting on a dead canvas. That downgrade has a constraint
worth knowing: a canvas that has handed out a WebGL context can never return a
2D one, so the fallback remounts the `<canvas>` under a new React key and builds
the replacement renderer on a fresh element. Crop and export keep working;
only adjustments are lost.

Initial renderer selection is a plain `try/catch`: `WebGLPhotoRenderer`, falling
back to `Canvas2DPhotoRenderer`, which shares the same geometry code so crop,
rotation, flip, and DPR behave identically and only the colour work is missing.
Async image loads carry a `loadVersion` counter so stale decodes are discarded
and their bitmaps closed.

## Render scheduling and device adaptation

Rendering is **coalesced through `requestAnimationFrame`**: `scheduleRender()`
is a no-op if a frame is already queued, and the callback reads current values
off refs, so any number of state updates in a tick produce exactly one paint
with the newest state. No debouncing, no dirty-flag bookkeeping.

Device pixel ratio is capped at 3, and dropped to 1 entirely on low-power
devices — detected from `navigator.connection.saveData`, `deviceMemory ≤ 2`,
`hardwareConcurrency ≤ 2`, or the combination of `deviceMemory ≤ 4` and
`cores ≤ 4`. This is the difference between a smooth drag and a slideshow on a
budget Android phone. The heuristic is memoised once per session and is the most
thoroughly tested unit in the repo.

## Image import

Import is **native-first with a WebAssembly fallback**. `createImageBitmap(file,
{ imageOrientation: "from-image" })` handles JPEG, PNG, WebP, and — on Safari
and modern Chrome — HEIC directly, letting the browser apply EXIF orientation.
Only when that fails _and_ the file sniffs as HEIC does the app spin up a
**module Web Worker** that lazily `import()`s the libheif WASM bundle, decodes to
RGBA off the main thread, and transfers the buffer back. The worker is created
per decode and terminated in a `finally`, with a 45-second timeout.

That ordering matters: the WASM bundle is never downloaded by the majority of
users whose browser can already decode HEIC natively.

File type is established by a three-tier cascade — declared MIME, then **magic
bytes** (PNG signature, JPEG SOI, RIFF/WEBP, and ISOBMFF `ftyp` brand
inspection for `heic`/`heix`/`hevc`/`hevx`/`mif1`/`msf1`), then extension.
Limits are 75 MB and 60 megapixels, enforced on both sides of the worker
boundary, and every failure maps to a typed `ImportError` code
(`TYPE`/`SIZE`/`DIMENSIONS`/`DECODE`/`HEIC_UNSUPPORTED`) with a message that
tells the user what to actually do.

## Geometry

Crop bounds are normalised to 0..1 source-UV space rather than pixels, so they
survive any change of display size. `sourceUvMatrix` composes nine operations —
centre, scale to output, straighten rotation, cover scale, normalise, flips,
inverse 90° rotation, and crop-rect mapping — into one `mat3`, with an affine
inverse (`invertAffineMat3`) used to map pointer coordinates back to source
space for the crop overlay.

Straighten behaves differently per mode, which is the detail most
implementations get wrong. In **adjust** mode it applies a computed **cover
scale** so a rotated image never shows empty corners. In **crop** mode it
instead grows the output box to the rotated bounding box, so you can see and
grab the full frame while dragging handles.

## State and history

A single `useReducer` with 18 actions. Project state (source, adjustments, crop)
is kept separate from UI state (mode, comparing, busy, renderer status), and
**only project state enters history** — undo never rewinds which panel you had
open.

History is a `past`/`future` pair of `{adjustments, crop}` snapshots capped at
`HISTORY_LIMIT = 50`. The interesting part is **coalescing**: a
`coalesceKey` of `adjust:<key>` or `crop-gesture` means a continuous slider drag
or crop gesture collapses into exactly **one** undo step rather than one per
pointer event. No-op edits are suppressed by snapshot comparison before pushing.

## Persistence and offline

Autosave is **debounced at 500 ms** and writes to IndexedDB (raw API, no
wrapper) under a single `"active"` key. It stores the original `Blob`, never a
decoded bitmap or rendered output. Records are schema-versioned and rejected on
mismatch. Storage failures degrade gracefully into a user-visible warning rather
than a thrown error, and `navigator.storage.persist()` is requested after a
successful import to reduce the chance of eviction.

Draft restore is **opt-in**: a recovered draft surfaces as a "Continue last
edit" button rather than silently reopening someone's photo.

The service worker precaches six app-shell entries and uses
stale-while-revalidate. Its cache-write path refuses any response whose
`request.destination` is `image`, and its fetch path bypasses non-GET,
cross-origin, and image-accepting requests entirely. **Photo data cannot enter
the cache**, which is a correctness requirement for the privacy claim, not an
optimisation.

## Analytics and consent

Page-view counting via Google Analytics 4, on **Consent Mode v2**, loaded only
in production builds. No photo, edit, crop, or export detail is ever passed to
`gtag` — the app measures visits, not use.

The gating rests on two independent mechanisms, which is what lets a static app
with no server be correct without an IP lookup:

1. **`gtag('consent','default',…)` with a `region` list**, covering the EU, EEA,
   UK, and Switzerland. Google resolves this by IP on their side, so an EU
   visitor gets `analytics_storage: denied` regardless of what the client
   concludes. This is the legal floor, and it holds even if the banner never
   renders.
2. **A timezone guess** (`isLikelyEuVisitor`) decides only whether to *show* the
   banner. It is deliberately over-inclusive — every `Europe/` zone counts, plus
   the Atlantic and Cypriot zones belonging to listed countries. Guessing wrong
   shows a banner to someone who did not need one, or withholds one from someone
   whose storage is already denied by (1). It cannot fail the other way.

Ad storage, ad user data, and ad personalisation are denied unconditionally, in
every region. `ads_data_redaction` and `url_passthrough` are set.

The policy at [`/privacy`](https://raspy.rashmitaparmanik.com/privacy) names the
controller, the contact, the two cookies, the 14-month retention, the legal
bases, and the transfer basis — and carries the withdrawal toggle itself, so
nobody has to read the page and then go hunting through Settings to act on it.
It is linked from the banner, from Settings, and from the import screen. Its
tests read the measurement ID from `analytics.ts`, so the page cannot drift from
the tag it describes.

Two details that are easy to get wrong:

- **The Google tag is injected from the inline script, not rendered as
  `<script async src>`.** React 19 hoists async script elements into `<head>`,
  which would place the tag *above* the inline consent defaults and let it win
  the race on a warm cache. Creating the element after the defaults are queued
  makes the ordering unconditional rather than merely likely.
- **Withdrawal expires the cookies.** Consent Mode stops GA writing new ones but
  does not retract ones already set, so revoking walks every parent domain
  suffix and expires `_ga*`, `_gid`, and `_gat`.

Consent is withdrawable from Settings → Analytics or from `/privacy`, one
toggle either way — the same single interaction that granted it. The banner is a bar rather than a modal: the editor
stays usable behind it, Accept and Decline are the same size and one click each,
and no answer is required to use the app.

## Accessibility

Built in from the start rather than retrofitted:

- Every option group is a proper `role="radiogroup"` with **roving tabindex**
  and arrow-key navigation, including the adjustment rail and aspect-ratio picker
- The custom ruler slider exposes `role="slider"` with
  `aria-valuemin`/`max`/`now`/`valuetext`, and supports arrows, PageUp/PageDown
  for major steps, Home/End, and double-click to reset
- The canvas is a focusable `role="application"` with an `aria-describedby`
  shortcut list: Space to compare, `+`/`-`/`0` for zoom, arrows to move the crop,
  Alt+arrows to resize it aspect-constrained, Shift for 10× steps
- A polite `aria-live` region announces the active tool, with
  `role="status"`/`role="alert"` on progress and error states
- Focus is moved explicitly when a button unmounts mid-action, so it never falls
  to `document.body`
- `prefers-reduced-motion` collapses animation globally, with a
  `data-allow-motion` opt-out, and drives `scrollIntoView` behaviour
- 44px minimum touch targets and a visible `:focus-visible` ring throughout

Sound is a separate preference from reduced motion, on the reasoning that
Reduce Motion asks for less movement, not less sound.

## Testing

98 Vitest tests across two projects — a `node` project for pure logic and a
`jsdom` one for components, so the logic tests keep running without a DOM they
never needed.

**Logic (49):** reducer history semantics including gesture coalescing, the
undo/redo boundaries and the 50-entry cap; the display-scale heuristics, 9 cases
each with stubbed globals since the module memoises; crop maths; geometry
including matrix invertibility and export-dimension clamping; and IndexedDB
round-trips against `fake-indexeddb`, covering the schema-version rejection and
the rule that the source blob is stored rather than a decoded bitmap.

**Components and integration (49):** the autosave debounce — that a burst of
slider edits collapses to a single write, and that a failed write raises a
warning instead of throwing; draft restore staying opt-in; import error, busy,
and drag-affordance states, including the enter/leave pairing that used to make
the drop highlight flicker; and the crop keyboard model — per-pixel arrows, 10×
with Shift, Alt-resize holding the aspect ratio, and clamping at the edges.

Honest scope: the WebGL renderer, the shaders, and the decode paths still have
**no automated coverage**, because they need a real GPU and real image data.
Verifying those means a browser-based layer — Playwright with WebGL enabled and
golden-image comparison — which is the next worthwhile investment.

## Trade-offs and known limits

- Single-pass shading keeps the preview fast but rules out true separable
  multi-pass blurs; every kernel is a fixed-tap approximation.
- 8-bit textures throughout. Extreme exposure pushes can band; float textures
  would fix it at a memory and compatibility cost.
- Export progress is reported as fixed milestones, not measured work.
- Browsers without OffscreenCanvas WebGL2 still export on the main thread and
  can jank briefly at very large output sizes.
- EXIF orientation relies on the browser; the `createImageBitmap` retry path and
  the libheif path do not apply it independently.
- The Canvas 2D fallback is genuinely reduced: crop, orientation, and export
  work, but no adjustment does.

---

## Install on iPhone

Open the deployed URL in Safari, then Share → Add to Home Screen. It launches
full screen like a native app.

## Develop

```bash
npm install
npm run dev
```

```bash
npm test        # vitest
npm run typecheck
npm run lint
npm run build
```

## Social preview image

`public/og.png` (1200×630) backs the Open Graph and Twitter tags in
`app/layout.tsx`, which resolve against `metadataBase`. It is rendered from
`og-image.html` — a static page that composes the copy over `og-editor.png`, a
crop of the real editor — so edit that file and re-shoot it rather than
retouching the PNG:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
  --virtual-time-budget=6000 --window-size=1200,630 --force-device-scale-factor=1 \
  --screenshot=public/og.png "file://$PWD/og-image.html"
```

The service worker deliberately does not cache it — `sw.js` skips image
requests outside `/icons/`.

## Architecture map

```
app/lib/render/     WebGL2 renderer, GLSL shaders, Canvas2D fallback, DPR heuristics
app/lib/image/      decode + HEIC worker bridge, mat3 geometry, crop maths
app/lib/editor/     reducer, context, types, defaults
app/lib/storage/    IndexedDB draft persistence
app/workers/        libheif WASM decode worker, OffscreenCanvas export worker
app/components/     editor UI (viewport, panels, sheets, toolbar), consent banner
app/privacy/        privacy policy, with the withdrawal control on the page
components/ui/      primitives — ruler slider, sheet, toast, popover, switch
public/sw.js        app-shell service worker
```

Built on [vinext](https://github.com/cloudflare/vinext) (Cloudflare
Sites-compatible) with [Base UI](https://base-ui.com) primitives.

## License

MIT — see [LICENSE](LICENSE).

Raspy is an independent project. It is not affiliated with, authorised by, or
endorsed by Apple Inc. References to the iPhone Photos editor describe what the
app reproduces; all trademarks belong to their respective owners.
