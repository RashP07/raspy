import Link from "next/link";
import type { Guide } from "../types";

export const saturationVsVibrancy: Guide = {
  slug: "saturation-vs-vibrancy",
  title: "Saturation vs vibrancy: which one to use, and why skin cares",
  description:
    "Both sliders make colour stronger. Saturation pushes every colour equally; vibrancy pushes the weak ones and protects skin tones. When each is right, plus warmth and tint for fixing colour casts.",
  published: "2026-08-28",
  minutes: 4,
  summary:
    "A photo looks a little grey, so you push Saturation. The sky improves, and so does the grass, and so does everyone's face, which is now orange. Vibrancy exists to solve exactly that. The two sliders sit next to each other and are often treated as one; they are not.",
  related: [
    "exposure-brightness-highlights-shadows",
    "fix-a-dark-photo",
    "reduce-noise-in-a-photo",
  ],
  body: (
    <>
      <h2>Saturation</h2>
      <p>
        Saturation scales the intensity of every colour by the same amount.
        A colour that was already strong becomes stronger, and a weak one
        becomes a little less weak. At +30 a red jumper is vivid, a blue sky
        is deep, and skin, which is a pale orange, is noticeably more orange.
        Pushed further, strong colours hit the limit of what the file can
        store and turn into flat blocks with no detail inside them. Negative
        Saturation drains colour evenly, down to black and white at -100.
      </p>

      <h2>Vibrancy</h2>
      <p>
        Vibrancy is selective. It boosts colours in proportion to how muted
        they are, so a dull colour gets a large lift and an already saturated
        one barely moves. On top of that it detects the range of hues that
        skin falls into and holds back there. In <Link href="/">Raspy</Link>{" "}
        the skin-tone mask reduces the effect by up to 70% in those hues, the
        same idea Apple&#39;s slider uses. The result is a photo whose colour
        looks richer while the people in it still look like themselves.
      </p>

      <h2>Which to use</h2>
      <ul>
        <li>
          <strong>Any photo with a person in it:</strong> Vibrancy. Start
          around +20 and rarely go past +40.
        </li>
        <li>
          <strong>Landscapes, food, objects:</strong> either. Vibrancy is
          still the safer first move because it will not blow out the colours
          that were already strong.
        </li>
        <li>
          <strong>A deliberately punchy look:</strong> Saturation, in small
          amounts, after Vibrancy.
        </li>
        <li>
          <strong>Calming a photo down:</strong> negative Saturation. Negative
          Vibrancy works too and leaves skin tones intact, which makes for a
          more natural muted look.
        </li>
      </ul>

      <h2>When the colour is wrong rather than weak</h2>
      <p>
        Sometimes the problem is not strength but a cast: a photo under warm
        indoor lighting that has gone yellow, or one in shade that has gone
        blue. No amount of Saturation fixes that; it only makes the cast
        stronger. The tools for it are the next two sliders down.
      </p>
      <p>
        <strong>Warmth</strong> slides the whole image between blue and
        amber. Drag left to cool a yellow indoor shot, right to warm a blue
        shade shot. <strong>Tint</strong> slides between green and magenta,
        and fixes the green cast from fluorescent tubes or the magenta cast
        some LEDs produce. Between them they are a manual white balance. Find
        something in the photo that should be neutral grey or white, and move
        the two sliders until it is.
      </p>

      <h2>A habit worth keeping</h2>
      <p>
        Colour is the easiest thing to overdo, because a stronger version
        always looks better for the first second. Set the slider, then hold
        the photo to compare with the original. If the original looks
        drained, you were right. If the original looks normal and the edit
        looks like a sweet wrapper, halve the value.
      </p>
    </>
  ),
};
