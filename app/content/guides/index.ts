import type { Guide } from "../types";
import { openHeicOnWindows } from "./open-heic-photos-on-windows";
import { editIphonePhotosOnAndroid } from "./edit-iphone-photos-on-android";
import { convertHeicToJpg } from "./convert-heic-to-jpg-in-your-browser";
import { removeLocationData } from "./remove-location-data-from-photos";
import { editWithoutUploading } from "./edit-photos-without-uploading";
import { fixDarkPhoto } from "./fix-a-dark-photo";
import { straightenPhoto } from "./straighten-a-crooked-photo";
import { cropForInstagram } from "./crop-photos-for-instagram";
import { exposureVsBrightness } from "./exposure-brightness-highlights-shadows";
import { saturationVsVibrancy } from "./saturation-vs-vibrancy";
import { jpegPngWebp } from "./jpeg-vs-png-vs-webp";
import { reduceNoise } from "./reduce-noise-in-a-photo";
import { useOffline } from "./use-raspy-offline";
import { iphoneEditorOnPc } from "./iphone-photos-editor-on-pc-or-mac";

/** Order is the order on the index page and on the home page. */
export const GUIDES: Guide[] = [
  openHeicOnWindows,
  editIphonePhotosOnAndroid,
  removeLocationData,
  editWithoutUploading,
  fixDarkPhoto,
  cropForInstagram,
  straightenPhoto,
  exposureVsBrightness,
  saturationVsVibrancy,
  convertHeicToJpg,
  jpegPngWebp,
  reduceNoise,
  iphoneEditorOnPc,
  useOffline,
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
