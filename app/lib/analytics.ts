// Google Analytics 4 and PostHog, under one consent choice. Page-level traffic
// only — no photo, edit, or export data is ever passed to either, which would
// defeat the point of the app.
export const GA_MEASUREMENT_ID = "G-SJ63XD3708";

// Only load in production, so local dev doesn't pollute the property.
export const GA_ENABLED =
  process.env.NODE_ENV === "production" && Boolean(GA_MEASUREMENT_ID);

// PostHog's project token is public by design: it can write events, never read
// them, exactly like the GA measurement id above. See app/lib/posthog.ts.
export const POSTHOG_TOKEN = "phc_mQ9BnAswsrtCSW9NrTgYwAdNnyyMTDSuEwS3teT3Dg5J";
export const POSTHOG_HOST = "https://us.i.posthog.com";

export const POSTHOG_ENABLED =
  process.env.NODE_ENV === "production" && Boolean(POSTHOG_TOKEN);

/** Either tag being live is what makes the banner and the toggles meaningful. */
export const ANALYTICS_ENABLED = GA_ENABLED || POSTHOG_ENABLED;

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
//
// It is also injected late: after the load event and the next idle moment. The
// tag is 170 KB, more than the app itself, and on a slow connection it was
// sharing bandwidth with the stylesheet and font the first paint waits on.
// The config call above it queues in dataLayer regardless, so the page view
// is still recorded once the tag arrives.
export const GA_INIT_SCRIPT = `
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', {
  allow_google_signals: false,
  allow_ad_personalization_signals: false
});
(function () {
  function inject() {
    var tag = document.createElement('script');
    tag.async = true;
    tag.src = ${JSON.stringify(GA_SRC)};
    document.head.appendChild(tag);
  }
  function whenIdle() {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(inject, { timeout: 3000 });
    } else {
      setTimeout(inject, 1500);
    }
  }
  if (document.readyState === 'complete') {
    whenIdle();
  } else {
    addEventListener('load', whenIdle, { once: true });
  }
})();
`.trim();
