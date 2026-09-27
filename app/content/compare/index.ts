import type { Comparison } from "../types";
import { raspyVsIphonePhotos } from "./raspy-vs-iphone-photos";
import { raspyVsPhotopea } from "./raspy-vs-photopea";
import { raspyVsPixlr } from "./raspy-vs-pixlr";
import { raspyVsCanva } from "./raspy-vs-canva";
import { raspyVsFotor } from "./raspy-vs-fotor";
import { raspyVsAdobeExpress } from "./raspy-vs-adobe-express";
import { raspyVsGooglePhotos } from "./raspy-vs-google-photos";

/** Order is the order on the index page and on the home page. */
export const COMPARISONS: Comparison[] = [
  raspyVsIphonePhotos,
  raspyVsPhotopea,
  raspyVsPixlr,
  raspyVsCanva,
  raspyVsAdobeExpress,
  raspyVsFotor,
  raspyVsGooglePhotos,
];

export function comparisonBySlug(slug: string): Comparison | undefined {
  return COMPARISONS.find((page) => page.slug === slug);
}
