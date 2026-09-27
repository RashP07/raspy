import Link from "next/link";
import type { Guide } from "../types";

export const straightenPhoto: Guide = {
  slug: "straighten-a-crooked-photo",
  title: "How to straighten a crooked photo",
  description:
    "A tilted horizon is the most common flaw in a phone photo and the easiest to fix. How to straighten one precisely, what it costs you at the edges, and when to leave a tilt alone.",
  published: "2026-08-28",
  minutes: 3,
  summary:
    "A horizon that leans two degrees is enough to make a photo feel wrong without anyone being able to say why. Straightening it takes ten seconds. The only skill is knowing what to line up against, and knowing that every degree of rotation trims a little off the edges.",
  related: [
    "crop-photos-for-instagram",
    "fix-a-dark-photo",
    "iphone-photos-editor-on-pc-or-mac",
  ],
  body: (
    <>
      <h2>Straighten, rotate, and what the difference is</h2>
      <p>
        Rotate turns the photo in 90 degree steps and is for a photo that came
        in sideways. Straighten turns it by a fraction of a degree to a few
        degrees, and is for a photo that is nearly level. In{" "}
        <Link href="/">Raspy</Link> both live in the Crop tool: Rotate is a
        button, Straighten is a dial that runs from -45 to +45 degrees in half
        degree steps.
      </p>

      <h2>Steps</h2>
      <ol>
        <li>
          Open the photo and switch to <strong>Crop</strong>.
        </li>
        <li>
          Choose <strong>Straighten</strong> under the frame. The dial appears
          with 0 in the centre.
        </li>
        <li>
          Find a reference. A horizon, the edge of a building, a table top, a
          doorframe. Pick one that should be exactly horizontal or exactly
          vertical, and prefer one near the middle of the frame, since lens
          distortion bends lines near the edges.
        </li>
        <li>
          Drag the dial until the reference is level. The frame rotates live
          and the grid lines over the photo give you something to compare
          against.
        </li>
        <li>
          Look at the whole photo, not just the reference line. A leaning
          person or a sloped hill can fool the eye; the grid does not lie, but
          the photo should also feel right.
        </li>
      </ol>

      <h2>What straightening costs</h2>
      <p>
        A rotated rectangle no longer fills its original frame; the corners
        would be empty. Raspy scales the photo up just enough to cover the
        frame, so there are never blank corners to crop out by hand. The price
        is that the edges of the photo are trimmed, by roughly 2.5% of the
        frame for each degree on a 3:2 photo. Two degrees costs a sliver. Ten
        degrees costs a noticeable strip all round, and anything close to the
        edge of the original, such as a head near the top, can be lost. If the
        subject is tight to an edge, either accept a slight tilt or crop
        deliberately so you choose what goes.
      </p>

      <h2>When to leave it</h2>
      <p>
        Not every tilt is a mistake. A deliberate angle on a street shot or a
        photo taken looking up at a building has lines that are not meant to
        be level, and forcing one of them straight only makes the others look
        worse. Straighten is for photos where a level line was intended and
        missed. When in doubt, straighten, hold the photo to compare with the
        original, and keep whichever one your eye settles on.
      </p>

      <h2>Undoing it</h2>
      <p>
        Double-click the dial to return it to zero. A drag counts as one step
        in history, so <kbd>Cmd</kbd>+<kbd>Z</kbd> (or <kbd>Ctrl</kbd>+<kbd>Z</kbd>)
        undoes the whole straighten rather than one tick of it. The original
        file is never changed; a save always writes a new copy.
      </p>
    </>
  ),
};
