import Link from "next/link";
import type { Guide } from "../types";

export const reduceNoise: Guide = {
  slug: "reduce-noise-in-a-photo",
  title: "How to reduce noise in a grainy photo",
  description:
    "Grain in low-light and night photos, what causes it, and how to smooth it with the Noise reduction slider without turning skin and fabric into plastic. Plus how sharpness and definition interact with it.",
  published: "2026-08-28",
  minutes: 4,
  summary:
    "Noise is the speckle that appears in photos taken in low light, and it gets worse the moment you brighten the shadows. Noise reduction smooths it away, and too much noise reduction smooths everything else away with it. The trick is finding the value where the grain goes and the detail stays.",
  related: [
    "fix-a-dark-photo",
    "exposure-brightness-highlights-shadows",
    "jpeg-vs-png-vs-webp",
  ],
  body: (
    <>
      <h2>Where noise comes from</h2>
      <p>
        A camera sensor counts photons. In bright light it counts millions per
        pixel and the random variation between neighbouring pixels is
        invisible. In dim light it counts far fewer, the variation becomes a
        large share of the signal, and the camera amplifies it all to make the
        photo look exposed. That amplified randomness is the grain. It is worst
        in shadows, in flat areas such as walls and skies, and in the blue
        channel, which sensors are least sensitive to.
      </p>

      <h2>How the slider works</h2>
      <p>
        A naive blur would smooth noise and edges alike. The Noise reduction
        slider in <Link href="/">Raspy</Link> is edge-aware: for each pixel it
        averages the neighbours that are similar in brightness and ignores
        the ones that are not. A flat wall gets smoothed because all its
        pixels are alike; the edge of a face does not, because the pixels on
        either side differ. Higher values widen what counts as &quot;similar&quot;, so
        finer detail starts to be treated as noise and smoothed away. That
        is the plastic look.
      </p>

      <h2>Steps</h2>
      <ol>
        <li>
          Do the exposure work first. Lifting Shadows or Exposure reveals
          noise, so there is no point judging it before.
        </li>
        <li>
          Zoom in on a flat, dark area. Press <kbd>+</kbd> on a keyboard, or
          pinch on a phone. Noise is judged at 100%, not on the whole frame.
        </li>
        <li>
          Raise Noise reduction until the speckle in the flat area calms down.
          Usually between 20 and 50.
        </li>
        <li>
          Move to an area with fine texture: hair, fabric, foliage. If it has
          gone smooth, reduce the slider until the texture returns, even if
          some grain returns with it. Grain is a photographic look; smeared
          texture is a flaw.
        </li>
        <li>
          Zoom back out. A little visible grain at 100% is invisible at the
          size the photo will be seen.
        </li>
      </ol>

      <h2>Sharpness and definition fight noise reduction</h2>
      <p>
        Sharpness crisps fine edges and Definition adds contrast to mid-sized
        detail. Both amplify whatever small variation they find, and noise is
        small variation, so raising either after Noise reduction brings the
        grain back. If a photo needs both, keep Sharpness low, use Definition
        instead of Sharpness where possible since it works at a larger
        scale, and revisit Noise reduction after. Raspy applies these three
        on luminance only, so they do not add coloured speckle, and the
        export scales them so the full-size file matches the preview.
      </p>

      <h2>Accepting some noise</h2>
      <p>
        A night photo that is a little grainy looks like a night photo. One
        that has been scrubbed clean looks like a painting. Most of the time
        the right amount of noise reduction is less than the amount that
        removes all the noise, and a good compromise is to reduce the noise
        in the shadows and leave the midtones alone, which is roughly what
        happens at moderate values anyway.
      </p>
    </>
  ),
};
