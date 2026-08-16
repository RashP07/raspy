// Google Analytics 4. Page-level traffic only — no photo, edit, or export data
// is ever passed to gtag, which would defeat the point of the app.
export const GA_MEASUREMENT_ID = "G-SJ63XD3708";

// Only load in production, so local dev doesn't pollute the property.
export const GA_ENABLED =
  process.env.NODE_ENV === "production" && Boolean(GA_MEASUREMENT_ID);

export const GA_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

// Signals off: no Google-account-linked reporting and no ad personalisation, so
// the measurement stays traffic counting rather than advertising data.
//
// `dataLayer` and `gtag` are defined by CONSENT_INIT_SCRIPT, which must render
// ahead of this one — consent defaults are only binding if they are queued
// before the tag reads them. See app/lib/consent.ts.
//
// The Google tag is injected here rather than rendered as <script async src>,
// because React 19 hoists async script elements into <head>. Hoisted, the tag
// would sit *above* the inline consent defaults and could win the race on a
// warm cache, which is the one ordering the whole scheme depends on. Creating
// the element after the defaults are queued makes that unconditional.
export const GA_INIT_SCRIPT = `
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', {
  allow_google_signals: false,
  allow_ad_personalization_signals: false
});
(function () {
  var tag = document.createElement('script');
  tag.async = true;
  tag.src = ${JSON.stringify(GA_SRC)};
  document.head.appendChild(tag);
})();
`.trim();
