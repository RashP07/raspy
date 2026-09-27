import Link from "next/link";
import type { Guide } from "../types";

export const exposureVsBrightness: Guide = {
  slug: "exposure-brightness-highlights-shadows",
  title: "Exposure vs brightness, highlights vs shadows: what each slider does",
  description:
    "The iPhone Photos editor has seven light sliders that all seem to make the photo brighter. They do different things. A plain explanation of exposure, brilliance, highlights, shadows, contrast, brightness and black point, and when to reach for each.",
  published: "2026-08-28",
  minutes: 6,
  summary:
    "Drag Exposure and the photo gets brighter. Drag Brightness and the photo gets brighter. Drag Shadows and, again, brighter. The names come from darkroom and camera vocabulary, and each one touches a different part of the tonal range. Once you know which part, the right slider for a given photo is usually obvious.",
  related: [
    "fix-a-dark-photo",
    "saturation-vs-vibrancy",
    "reduce-noise-in-a-photo",
  ],
  body: (
    <>
      <h2>Think in three zones</h2>
      <p>
        Every photo&#39;s tones run from black to white. Call the darkest third
        the shadows, the middle third the midtones, and the brightest third
        the highlights. Each light slider has a home zone and a spill into its
        neighbours. Knowing the home zone is most of the skill.
      </p>

      <h2>Exposure</h2>
      <p>
        Home zone: everything. Exposure multiplies the light in the whole
        image, the way a wider aperture or a longer shutter would have. Every
        tone moves, and bright tones move further than dark ones in absolute
        terms, so the photo keeps its character while getting lighter or
        darker overall. Reach for it first when the whole photo is off, and
        use small amounts; a little goes a long way, and pushing it far
        clips highlights to white with nothing left to recover.
      </p>

      <h2>Brightness</h2>
      <p>
        Home zone: midtones. Brightness lifts the middle of the range while
        holding on to the ends, so blacks stay black and whites stay white. It
        is the slider for a photo that is correctly exposed but feels dim, and
        it is the slider people reach for first when they should have used
        Exposure or Shadows. If the photo looks flat afterwards, that is why.
      </p>

      <h2>Highlights</h2>
      <p>
        Home zone: the brightest tones. On the iPhone, and in{" "}
        <Link href="/">Raspy</Link>, dragging Highlights to the right{" "}
        <strong>darkens</strong> them, which is the opposite of what the name
        suggests and trips most people up once. It is the recovery slider: a
        sky that has gone white, a window that has blown out, a face lit too
        hard by flash. Positive values pull the detail back. Negative values
        push the bright tones brighter, for a deliberately airy look.
      </p>

      <h2>Shadows</h2>
      <p>
        Home zone: the darkest tones. Positive Shadows lifts them, revealing
        what was hiding in the dark without touching the sky or a bright
        wall. It is the fix for a backlit subject. Negative Shadows deepens
        them, for a moodier photo. The cost of lifting is noise, since the
        dark parts of a photo hold the least information, and a halo where a
        dark edge meets a bright one if you go far.
      </p>

      <h2>Brilliance</h2>
      <p>
        Home zone: shadows and highlights together, in opposite directions.
        Brilliance is Apple&#39;s one-slider fix: it lifts the dark areas and
        tones down the bright ones, then adds a little local contrast so the
        result does not look flat. For a photo shot into the light it is
        often the only slider you need. It does have a look, and too much of
        it makes a photo feel processed.
      </p>

      <h2>Contrast</h2>
      <p>
        Home zone: the ends, pushed apart or pulled together. Positive
        Contrast makes darks darker and lights lighter; negative flattens
        the range. Use it last and sparingly. Most photos want a small
        positive nudge after Shadows or Brightness has been raised, to restore
        what those sliders flattened.
      </p>

      <h2>Black point</h2>
      <p>
        Home zone: the very darkest tones. Black point decides what the
        darkest pixel is allowed to be. Raising it forces the deep shadows to
        true black, which cures the grey, hazy look that comes after
        brightening. Lowering it lets them sit above black, for a faded film
        feel. It is a finishing slider, applied after everything else.
      </p>

      <h2>A working order</h2>
      <ol>
        <li>Exposure, to get the midtones roughly right.</li>
        <li>Highlights and Shadows, to fix the ends.</li>
        <li>Brightness only if the middle still feels dim.</li>
        <li>Contrast, a nudge, if it looks flat.</li>
        <li>Black point, to anchor the blacks.</li>
      </ol>
      <p>
        Hold the photo to compare with the original after each step. Under
        the hood these sliders work in linear light, the way the camera
        recorded it, so they combine predictably; the order above is about
        judgement, not maths.
      </p>
    </>
  ),
};
