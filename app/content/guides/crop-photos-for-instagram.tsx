import Link from "next/link";
import type { Guide } from "../types";

export const cropForInstagram: Guide = {
  slug: "crop-photos-for-instagram",
  title: "How to crop a photo for Instagram: 4:5, 1:1, 9:16 and the grid",
  description:
    "Instagram's feed, grid, stories and reels each want a different shape. The ratios and pixel sizes for each, how to crop to them before uploading so the app does not choose for you, and how to keep a portrait photo from being cut off.",
  published: "2026-08-28",
  minutes: 4,
  summary:
    "Upload a photo to Instagram and it picks a crop for you, usually the wrong one. A tall portrait loses its top and bottom; a wide landscape shrinks to a strip. Cropping to the right shape first means you decide what stays. Here are the shapes, and how to hit them exactly.",
  related: [
    "straighten-a-crooked-photo",
    "jpeg-vs-png-vs-webp",
    "remove-location-data-from-photos",
  ],
  body: (
    <>
      <h2>The shapes Instagram uses</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Where</th>
              <th>Ratio</th>
              <th>Pixels</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Feed, portrait</td>
              <td>4:5</td>
              <td>1080 x 1350</td>
            </tr>
            <tr>
              <td>Feed, square</td>
              <td>1:1</td>
              <td>1080 x 1080</td>
            </tr>
            <tr>
              <td>Feed, landscape</td>
              <td>1.91:1</td>
              <td>1080 x 566</td>
            </tr>
            <tr>
              <td>Stories and Reels</td>
              <td>9:16</td>
              <td>1080 x 1920</td>
            </tr>
            <tr>
              <td>Profile grid thumbnail</td>
              <td>4:5 (cropped from the post)</td>
              <td>Automatic</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        At the time of writing Instagram also accepts 3:4 feed posts, and the
        profile grid shows every post as a 4:5 rectangle, cropping whatever
        does not fit. Instagram changes these rules now and then; the ratios
        above have held for years, the grid shape is the part that moves.
      </p>
      <p>
        4:5 is the one to know. It is the tallest a feed post can be, so it
        takes up the most screen as people scroll, and it is what the grid
        shows, so a 4:5 post appears in the grid exactly as you cropped it.
      </p>

      <h2>Cropping to 4:5</h2>
      <ol>
        <li>
          Open the photo in <Link href="/">Raspy</Link> and switch to{" "}
          <strong>Crop</strong>.
        </li>
        <li>
          Choose <strong>4:5</strong> from the ratio row. The frame snaps to
          that shape and holds it while you drag.
        </li>
        <li>
          Drag inside the frame to move it over the part of the photo that
          matters. Drag a corner or edge to make it larger or smaller; the
          ratio stays locked.
        </li>
        <li>
          If the photo is landscape and you want a portrait post, the frame
          will be a tall slice of it. Decide what to keep; there is no way to
          fit a wide photo into 4:5 without losing the sides, which is why
          shooting portrait for Instagram is worth remembering.
        </li>
        <li>
          Save as JPEG at quality 85 to 90. Instagram re-compresses on upload,
          so higher settings gain nothing.
        </li>
      </ol>
      <p>
        For a square post, pick <strong>1:1</strong>. For a story or reel
        cover, pick <strong>16:9</strong> and tap <strong>Rotate</strong>, or
        rotate first, and the ratio swaps to 9:16; that is how the phone&#39;s
        editor does it too. Instagram&#39;s landscape shape, 1.91:1, is not in the
        list; use <strong>Free</strong> and watch the size readout on the
        photo until the width is 1.91 times the height.
      </p>

      <h2>Straighten before you crop</h2>
      <p>
        A tilted horizon is far more visible in a tight 4:5 crop than in the
        full photo. Use <strong>Straighten</strong> first, then set the ratio.
        Straightening trims the edges slightly, so doing it after cropping can
        pull the frame off the composition you chose.
      </p>

      <h2>Keeping the top and bottom</h2>
      <p>
        The most common complaint is a portrait photo, which is 3:4 straight
        from a phone camera, losing the top of a head when Instagram crops it
        to 4:5. The two shapes are close but not the same: 4:5 is a little
        shorter. Cropping to 4:5 yourself lets you slide the frame down to
        keep the head and lose some floor instead.
      </p>

      <h2>Resolution</h2>
      <p>
        Instagram resizes anything wider than 1080 pixels down to 1080, so
        exporting at 50% from a 12-megapixel phone photo, which gives roughly
        2000 by 1500, is already more than it will use. Full size is
        harmless, just slower to upload. The saved file also carries no
        location metadata, which is one less thing to think about before
        posting.
      </p>
    </>
  ),
};
