import Link from "next/link";
import type { Guide } from "../types";

export const fixDarkPhoto: Guide = {
  slug: "fix-a-dark-photo",
  title: "How to fix a dark, underexposed photo",
  description:
    "Brightening a dark photo with one slider washes it out. Which adjustments to use, in what order, and how far to push them before noise and grey blacks take over.",
  published: "2026-08-28",
  minutes: 5,
  summary:
    "The instinct with a dark photo is to drag Brightness to the right until it looks lit. That lifts everything at once, including the parts that were meant to be dark, and the result is flat and grey. Fixing exposure well means lifting the parts that need it and leaving the rest alone. The iPhone-style sliders are built for exactly that.",
  related: [
    "exposure-brightness-highlights-shadows",
    "reduce-noise-in-a-photo",
    "saturation-vs-vibrancy",
  ],
  body: (
    <>
      <h2>First, decide what kind of dark it is</h2>
      <p>
        Two very different problems look alike at a glance. In the first, the
        whole photo is too dark: an indoor shot in poor light, or a camera that
        exposed for a bright window. In the second, only the subject is dark
        while the background is fine, which is what happens with a face
        against the sky. The first wants Exposure. The second wants Shadows.
        Mixing them up is where the washed-out look comes from.
      </p>

      <h2>A photo that is dark all over</h2>
      <ol>
        <li>
          <strong>Exposure</strong>, up, in small steps. This behaves like the
          camera having let in more light: everything gets brighter by the same
          ratio, so the relationships between tones are kept. Stop as soon as
          the midtones look right, even if the shadows are still heavy.
        </li>
        <li>
          <strong>Highlights</strong>, up, if any bright area has gone flat
          white. On these sliders positive Highlights darkens the brightest
          tones, the same direction as on the iPhone. A little brings the
          detail back.
        </li>
        <li>
          <strong>Black point</strong>, up a touch. Raising exposure lifts the
          darkest pixels off pure black, which makes the whole image look
          hazy. Black point puts them back.
        </li>
        <li>
          <strong>Contrast</strong>, if it still looks flat. Small amounts; it
          is easy to overdo.
        </li>
      </ol>

      <h2>A subject that is dark against a bright background</h2>
      <ol>
        <li>
          <strong>Shadows</strong>, up. This lifts only the dark tones and
          leaves the bright background where it was. Go until the subject
          reads clearly, then back off a little.
        </li>
        <li>
          <strong>Brilliance</strong>, up. It lifts shadows and gently tames
          highlights at the same time, which is often all a backlit photo
          needs. Try it before Shadows; sometimes it does the job alone.
        </li>
        <li>
          <strong>Highlights</strong>, up, to hold the background&#39;s detail if
          it has started to blow out.
        </li>
      </ol>

      <h2>Where it goes wrong</h2>
      <p>
        <strong>Noise.</strong> A dark photo has little signal in the shadows,
        and lifting them reveals the grain the camera hid. If Shadows or
        Exposure brings out speckle, use Noise reduction at a low value, and
        accept a slightly darker result rather than a clean-looking but plastic
        one.
      </p>
      <p>
        <strong>Grey blacks.</strong> Any global lift moves black towards grey.
        Watch the darkest area of the photo and use Black point to keep it
        black.
      </p>
      <p>
        <strong>Colour shift.</strong> Brightening often makes colour look
        weaker. Resist Saturation and use a little Vibrancy instead; it
        boosts the muted colours and leaves skin alone.
      </p>
      <p>
        <strong>Halos.</strong> Very strong Shadows or Brilliance can leave a
        light rim where a dark subject meets a bright sky. If you see one,
        reduce the slider; there is no fix for it downstream.
      </p>

      <h2>Checking your work</h2>
      <p>
        Press and hold the photo, or hold <kbd>Space</kbd>, to see the
        original. If the edited version looks brighter but the original looks
        richer, you have gone too far. The goal is a photo that looks like it
        was lit properly, not one that looks edited. In{" "}
        <Link href="/">Raspy</Link> every slider double-clicks back to zero,
        which makes it cheap to try a change and throw it away.
      </p>
    </>
  ),
};
