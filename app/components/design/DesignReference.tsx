"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RangeSlider } from "@/components/ui/slider";
import { RulerSlider } from "@/components/ui/ruler-slider";
import { Spinner } from "@/components/ui/spinner";
import { THEME_EVENT } from "@/app/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Reads every custom property declared on :root straight out of the live
 * stylesheet, so this page can never drift from the theme the app is actually
 * running. Adding a colour to @theme makes it appear here on its own.
 *
 * The typography, radius and elevation sections still list their steps by
 * hand: each specimen needs a literal utility class (`text-display`) for
 * Tailwind to emit it at all, and a class name built at runtime would compile
 * to nothing. Their *values* are read live, so a changed step still shows.
 */
function collectRootProperties(rules: CSSRuleList, into: Set<string>): void {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule && rule.selectorText.includes(":root")) {
      for (const property of Array.from(rule.style)) {
        if (property.startsWith("--")) into.add(property);
      }
    }
    // Two traps here. Tailwind emits the whole theme inside `@layer theme`, so
    // walking only the top level finds nothing at all — and now that CSS
    // nesting exists, a plain style rule carries a (usually empty) cssRules of
    // its own. Recursing *instead of* reading declarations therefore skips
    // every rule; it has to happen after.
    const nested = (rule as CSSRule & { cssRules?: CSSRuleList }).cssRules;
    if (nested) collectRootProperties(nested, into);
  }
}

function readThemeTokens(): Record<string, string> {
  const names = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      collectRootProperties(sheet.cssRules, names);
    } catch {
      // A cross-origin sheet cannot be read; nothing of ours lives in one.
    }
  }

  const computed = getComputedStyle(document.documentElement);
  const values: Record<string, string> = {};
  for (const name of names) {
    values[name] = computed.getPropertyValue(name).trim();
  }
  return values;
}

/* getComputedStyle resolves a light-dark() pair down to the branch currently
   showing, so these values are theme-dependent and the cache has to be thrown
   away whenever the theme moves. Between those moments the cache is what keeps
   the snapshot referentially stable, which is what the store requires. */
let tokenCache: Record<string, string> | null = null;
const NO_TOKENS: Record<string, string> = {};

function subscribeToTheme(onStoreChange: () => void): () => void {
  const invalidate = () => {
    tokenCache = null;
    onStoreChange();
  };
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", invalidate);
  window.addEventListener(THEME_EVENT, invalidate);
  return () => {
    query.removeEventListener("change", invalidate);
    window.removeEventListener(THEME_EVENT, invalidate);
  };
}

function useThemeTokens(): Record<string, string> {
  return useSyncExternalStore(
    subscribeToTheme,
    () => (tokenCache ??= readThemeTokens()),
    () => NO_TOKENS,
  );
}

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-hairline pt-8">
      <header className="flex flex-col gap-1">
        <h2 className="text-body font-semibold">{title}</h2>
        <p className="max-w-[62ch] text-label text-muted">{intro}</p>
      </header>
      {children}
    </section>
  );
}

/** Name over value, in the same two-line shape everywhere on the page. */
function Caption({ name, value }: { name: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <code className="text-caption font-medium">{name}</code>
      {value ? (
        <code className="text-caption break-all text-muted">{value}</code>
      ) : null}
    </div>
  );
}

const COLOR_GROUPS: { title: string; names: string[] }[] = [
  { title: "Content", names: ["bg", "fg", "muted"] },
  { title: "Surfaces", names: ["shell", "chrome", "surface", "raised"] },
  {
    title: "Accent",
    names: ["accent", "accent-hover", "accent-fg", "active"],
  },
  { title: "Status", names: ["danger", "danger-fg", "info", "success"] },
  {
    title: "Separators and states",
    names: [
      "hairline",
      "hairline-strong",
      "hover",
      "selected",
      "track",
      "tick",
      "tick-strong",
      "glass",
    ],
  },
  {
    title: "Shadow and highlight",
    names: ["shadow", "shadow-strong", "top-highlight"],
  },
  { title: "Over content", names: ["scrim", "overlay"] },
];

const TYPE_STEPS = [
  { name: "display", className: "text-display", sample: "Edit photos" },
  { name: "body", className: "text-body", sample: "Every button label" },
  { name: "label", className: "text-label", sample: "Control labels and dial values" },
  { name: "caption", className: "text-caption", sample: "HEIC · JPEG · PNG · WebP" },
];

const RADIUS_STEPS = [
  { name: "inset", className: "rounded-inset", note: "nested in a control" },
  { name: "control", className: "rounded-control", note: "buttons, wells" },
  { name: "panel", className: "rounded-panel", note: "stage, deck, sheets" },
  { name: "pill", className: "rounded-pill", note: "capsules" },
];

const ELEVATION_STEPS = [
  { name: "raised", className: "shadow-raised", note: "pressed to the surface" },
  { name: "thumb", className: "shadow-thumb", note: "segmented thumb" },
  { name: "lifted", className: "shadow-lifted", note: "primary button, hover" },
  { name: "deck", className: "shadow-deck", note: "the tool deck" },
  { name: "toast", className: "shadow-toast", note: "floats over content" },
  { name: "popover", className: "shadow-popover", note: "reads as detached" },
];

const SPACING_RAMP = [1, 2, 3, 4, 6, 8, 10, 12, 14, 16];

const SPACING_NAMED = [
  { name: "--spacing-gutter", note: "chrome: toolbar, panels, ruler" },
  { name: "--spacing-page", note: "editorial: the import screen" },
  { name: "--spacing-hud", note: "viewport edge to a floating readout" },
  { name: "--spacing-touch", note: "minimum comfortable target" },
];

const DURATIONS = [
  { name: "--duration-instant", note: "a tick under a moving finger" },
  { name: "--duration-fast", note: "colour and opacity" },
  { name: "--duration-base", note: "a control changing in place" },
  { name: "--duration-slow", note: "something that travels" },
  { name: "--duration-slower", note: "the longest thing we ship" },
];

export function DesignReference() {
  const tokens = useThemeTokens();
  const [switchOn, setSwitchOn] = useState(true);
  const [range, setRange] = useState(40);
  const [ruler, setRuler] = useState(0);
  const [motion, setMotion] = useState(false);

  const colorNames = new Set(
    Object.keys(tokens)
      .filter((name) => name.startsWith("--color-"))
      .map((name) => name.slice("--color-".length)),
  );
  const grouped = new Set(COLOR_GROUPS.flatMap((group) => group.names));
  const ungrouped = [...colorNames].filter((name) => !grouped.has(name)).sort();

  return (
    <div className="h-dvh overflow-y-auto bg-bg text-fg">
      <div className="mx-auto flex max-w-[52rem] flex-col gap-8 px-page py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-display font-medium tracking-snug">
            Raspy design system
          </h1>
          <p className="max-w-[62ch] text-body text-muted">
            Every value below is read out of the running stylesheet, not copied
            into this page. What you see is what the app is using.
          </p>
        </header>

        <Section
          title="Colour"
          intro="One palette. Tokens are light-dark() pairs, so a component names the role it wants and the browser picks the branch — nothing here needs a light and a dark variant. The value printed under each chip is the branch currently showing; switch the OS theme and these follow."
        >
          <div className="flex flex-col gap-6">
            {COLOR_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-3">
                <h3 className="text-label font-medium tracking-label text-muted uppercase">
                  {group.title}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {group.names.map((name) => (
                    <Swatch
                      key={name}
                      name={name}
                      value={tokens[`--color-${name}`]}
                    />
                  ))}
                </div>
              </div>
            ))}

            {ungrouped.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h3 className="text-label font-medium tracking-label text-muted uppercase">
                  Ungrouped
                </h3>
                <p className="text-caption text-muted">
                  Present in @theme but not filed above — add it to a group in
                  DesignReference.tsx.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ungrouped.map((name) => (
                    <Swatch
                      key={name}
                      name={name}
                      value={tokens[`--color-${name}`]}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Section>

        <Section
          title="Type"
          intro="Four steps, which is all an interface with one headline can justify. Each carries its own leading, so changing a size never means also changing a line-height at the call site."
        >
          <div className="flex flex-col divide-y divide-hairline">
            {TYPE_STEPS.map((step) => (
              <div
                key={step.name}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span className={cn(step.className, "font-medium")}>
                  {step.sample}
                </span>
                <Caption
                  name={`text-${step.name}`}
                  value={`${tokens[`--text-${step.name}`] ?? ""} / ${
                    tokens[`--text-${step.name}--line-height`] ?? "—"
                  }`}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Radius"
          intro="Three rungs by role plus a pill, replacing the seven ad-hoc radii this app used to carry. Controls and the boxes holding them share one; anything that reads as a sheet shares the next."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {RADIUS_STEPS.map((step) => (
              <div key={step.name} className="flex flex-col gap-2">
                <div
                  className={cn(
                    "h-20 border border-hairline bg-surface",
                    step.className,
                  )}
                />
                <Caption
                  name={`rounded-${step.name}`}
                  value={tokens[`--radius-${step.name}`]}
                />
                <span className="text-caption text-muted">{step.note}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Elevation"
          intro="Ordered by how far off the surface the thing is meant to sit. Dark surfaces read as lifted by an inset top highlight rather than a heavier drop shadow."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {ELEVATION_STEPS.map((step) => (
              <div key={step.name} className="flex flex-col gap-2">
                <div
                  className={cn(
                    "h-20 rounded-control bg-surface",
                    step.className,
                  )}
                />
                <Caption name={`shadow-${step.name}`} />
                <span className="text-caption text-muted">{step.note}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Spacing"
          intro="Tailwind's own 4px ramp does the work. Only the two alignment rules that recur get names, because a name carries meaning that a number does not."
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              {SPACING_RAMP.map((step) => (
                <div key={step} className="flex items-center gap-3">
                  <code className="w-10 shrink-0 text-caption text-muted">
                    {step}
                  </code>
                  <div
                    className="h-3 rounded-pill bg-fg"
                    style={{ width: `calc(var(--spacing) * ${step})` }}
                  />
                  <code className="text-caption text-muted">
                    {step * 4}px
                  </code>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-label font-medium tracking-label text-muted uppercase">
                Named
              </h3>
              {SPACING_NAMED.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="h-3 shrink-0 rounded-pill bg-accent"
                    style={{ width: `var(${item.name})` }}
                  />
                  <Caption name={item.name} value={tokens[item.name]} />
                  <span className="text-caption text-muted">{item.note}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          title="Motion"
          intro="A five-rung duration ladder and one emphasized easing — the iOS-style decelerate used by anything that travels a distance. Short state changes stay on plain ease-out."
        >
          <div className="flex flex-col gap-4">
            <Button
              variant="ghost"
              size="md"
              className="self-start border border-hairline"
              onClick={() => setMotion((on) => !on)}
            >
              {motion ? "Send back" : "Play"}
            </Button>
            {DURATIONS.map((item) => (
              <div key={item.name} className="flex flex-col gap-1">
                <div className="h-8 rounded-control bg-surface p-1">
                  <div
                    className="h-6 w-6 rounded-inset bg-accent ease-emphasized"
                    style={{
                      transitionProperty: "translate",
                      transitionDuration: `var(${item.name})`,
                      translate: motion ? "calc(100cqw - 100%)" : "0",
                      containerType: "inline-size",
                    }}
                  />
                </div>
                <div className="flex items-baseline gap-3">
                  <Caption name={item.name} value={tokens[item.name]} />
                  <span className="text-caption text-muted">{item.note}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Components"
          intro="The primitives, live. If one of these looks wrong the token underneath it is wrong — nothing on this page restyles them."
        >
          <div className="flex flex-col gap-6">
            <Row label="Button variants">
              <Button variant="primary">Primary</Button>
              <Button variant="ghost" className="border border-hairline">
                Ghost
              </Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </Row>

            <Row label="Button sizes">
              <Button variant="primary" size="lg">
                Large
              </Button>
              <Button variant="primary" size="md">
                Medium
              </Button>
              <Button variant="primary" size="sm">
                Small
              </Button>
            </Row>

            <Row label="Switch">
              <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
              <span className="text-label text-muted">
                {switchOn ? "On" : "Off"}
              </span>
            </Row>

            <Row label="Spinner">
              <Spinner size={20} decorative />
              <Spinner size={28} decorative />
            </Row>

            <Row label="HUD pill">
              {/* Positioned absolutely in the app; anchored here so it shows. */}
              <div className="relative h-10 w-40">
                <span className="se-hud-pill top-1 left-1 text-caption font-medium tabular-nums">
                  900 × 600
                </span>
              </div>
            </Row>

            <div className="flex flex-col gap-2">
              <h3 className="text-label font-medium tracking-label text-muted uppercase">
                Range slider
              </h3>
              <RangeSlider
                value={range}
                min={0}
                max={100}
                origin={50}
                aria-label="Demo range"
                onValueChange={setRange}
              />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-label font-medium tracking-label text-muted uppercase">
                Ruler slider
              </h3>
              <RulerSlider
                value={ruler}
                min={-100}
                max={100}
                step={1}
                origin={0}
                aria-label="Demo ruler"
                onValueChange={setRuler}
              />
              <span className="text-caption tabular-nums text-muted">
                {ruler > 0 ? `+${ruler}` : ruler}
              </span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-label font-medium tracking-label text-muted uppercase">
        {label}
      </h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/**
 * Half the palette is translucent, so a swatch on one background is a lie —
 * hairlines and hovers only mean anything relative to what they sit on. Each
 * chip therefore shows the colour over the page and over a raised surface.
 */
function Swatch({ name, value }: { name: string; value?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-16 overflow-hidden rounded-control border border-hairline">
        <div className="flex-1 bg-bg p-2">
          <div
            className="h-full w-full rounded-inset"
            style={{ background: `var(--color-${name})` }}
          />
        </div>
        <div className="flex-1 bg-surface p-2">
          <div
            className="h-full w-full rounded-inset"
            style={{ background: `var(--color-${name})` }}
          />
        </div>
      </div>
      <Caption name={`--color-${name}`} value={value} />
    </div>
  );
}
