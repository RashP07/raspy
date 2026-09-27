/** Site-wide constants shared by metadata, structured data, and the sitemap. */

export const SITE_URL = "https://raspy.rashmitaparmanik.com";
export const SITE_NAME = "Raspy";
export const AUTHOR_NAME = "Rashmita Parmanik";
export const AUTHOR_URL = "https://github.com/RashP07";
export const REPO_URL = "https://github.com/RashP07/raspy";

/** The one-line pitch used wherever a description is needed. */
export const SITE_TAGLINE =
  "A free online photo editor that never uploads your photos. The iPhone Photos adjustments, crop and straighten, HEIC support, in any browser.";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
