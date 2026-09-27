"use client";

import * as React from "react";
import { parseMarkdown } from "./markdown/parse";
import {
  FlatCodeblock,
  Markdown,
  SpoilerBlackout,
  type Plugin,
} from "./markdown/render";
import { SAMPLE_MARKDOWN, TOKEN_CHEATSHEET } from "./markdown/sample";
import type { Inline } from "./markdown/types";

type Preset = "beautiful" | "minimal" | "playful";

function PlayfulMention({ node }: { node: Extract<Inline, { type: "mention" }> }) {
  return (
    <span className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-px text-[0.85em] font-bold text-white shadow-raised">
      ✦ @{node.name}
    </span>
  );
}

function PlayfulHashtag({ node }: { node: Extract<Inline, { type: "hashtag" }> }) {
  return (
    <span className="rounded-md border-2 border-dashed border-success/60 bg-success/10 px-1.5 py-px text-[0.85em] font-bold text-success">
      #{node.tag}
    </span>
  );
}

const PRESETS: Record<Preset, { label: string; blurb: string; plugins: Plugin[] }> = {
  beautiful: { label: "Beautiful", blurb: "Default chat renderers", plugins: [] },
  minimal: {
    label: "Minimal",
    blurb: "Plain text-first, flat code",
    plugins: [
      { token: "codeblock", render: FlatCodeblock },
      { token: "spoiler", render: SpoilerBlackout },
    ],
  },
  playful: {
    label: "Playful",
    blurb: "Gradient mentions, dashed tags",
    plugins: [
      { token: "mention", render: PlayfulMention },
      { token: "hashtag", render: PlayfulHashtag },
      { token: "spoiler", render: SpoilerBlackout },
    ],
  },
};

const SNIPPET = `// One map owns every token. Swap any renderer.
import { Markdown } from "./markdown/render";

const plugins = [
  { token: "mention", render: MyMentionPill },
  { token: "spoiler", render: MySpoiler },
  { token: "codeblock", render: MyCode },
];

<Markdown text={message} plugins={plugins} />
// Or inline: <Markdown text={m} components={{ mention: MyMention }} />`;

export function MarkUiPlayground() {
  const [source, setSource] = React.useState(SAMPLE_MARKDOWN);
  const [preset, setPreset] = React.useState<Preset>("beautiful");
  const [copied, setCopied] = React.useState(false);

  const blocks = React.useMemo(() => parseMarkdown(source), [source]);
  const blockCount = blocks.length;
  const active = PRESETS[preset];

  const insertToken = (syntax: string) => {
    setSource((s) => (s.endsWith("\n") ? `${s}${syntax}\n` : `${s}\n${syntax}\n`));
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <p className="text-caption font-semibold tracking-label text-muted uppercase">
          Experiments / mark-ui
        </p>
        <h1 className="text-display font-semibold tracking-snug text-fg">
          Pluggable markdown tokens
        </h1>
        <p className="max-w-2xl leading-7 text-muted">
          A zero-dependency parser that turns chat markdown into tokens, plus a
          renderer registry where each token type maps to a component. Pick a
          preset, edit the source, click a spoiler. Nothing here leaves the page.
        </p>
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Renderer preset">
          {(Object.keys(PRESETS) as Preset[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={preset === k}
              onClick={() => setPreset(k)}
              className={
                preset === k
                  ? "rounded-pill bg-accent px-4 py-2 text-label font-semibold text-accent-fg"
                  : "rounded-pill border border-hairline bg-surface px-4 py-2 text-label font-medium text-muted hover:text-fg"
              }
            >
              {PRESETS[k].label}
            </button>
          ))}
          <span className="text-caption text-muted">
            {active.blurb} · {blockCount} blocks parsed live
          </span>
        </div>
      </header>

      {/* Editor + preview */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-panel border border-hairline bg-surface shadow-raised">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
            <span className="text-caption font-semibold tracking-label text-muted uppercase">
              Source
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSource(SAMPLE_MARKDOWN)}
                className="rounded-control px-2.5 py-1.5 text-caption font-medium text-muted hover:bg-hover hover:text-fg"
              >
                Reset sample
              </button>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(source).catch(() => {});
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1200);
                }}
                className="rounded-control bg-accent px-2.5 py-1.5 text-caption font-semibold text-accent-fg"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            aria-label="Markdown source"
            className="min-h-[380px] flex-1 resize-y bg-transparent p-4 font-mono text-[0.8rem] leading-6 text-fg outline-none placeholder:text-muted"
            placeholder="Type markdown…"
          />
        </section>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-panel border border-hairline bg-bg">
          <div className="border-b border-hairline px-4 py-2.5">
            <span className="text-caption font-semibold tracking-label text-muted uppercase">
              Chat preview · {active.label}
            </span>
          </div>
          {/* Chat bubble framing shows how tokens behave in a message list. */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="max-w-full rounded-panel rounded-tl-inset border border-hairline bg-surface p-4 shadow-raised">
              <Markdown text={source} plugins={active.plugins} />
            </div>
            <p className="px-1 text-caption text-muted">
              Bubbles clip wide content on purpose. Tables scroll, images cover,
              fences keep their own scroll.
            </p>
          </div>
        </section>
      </div>

      {/* Token gallery */}
      <section className="rounded-panel border border-hairline bg-surface p-4 shadow-raised md:p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-body font-semibold text-fg">Every token, one click to try</h2>
          <span className="text-caption text-muted">click a row to append it</span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TOKEN_CHEATSHEET.map((t) => (
            <li key={t.token}>
              <button
                type="button"
                onClick={() => insertToken(t.syntax)}
                className="group flex w-full items-center justify-between gap-3 rounded-control border border-hairline bg-bg px-3 py-2 text-left transition-colors hover:border-hairline-strong hover:bg-hover"
              >
                <span className="font-mono text-caption font-semibold text-fg">{t.token}</span>
                <span className="truncate font-mono text-caption text-muted group-hover:text-fg">
                  {t.syntax}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Plugin API */}
      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-panel border border-hairline bg-surface p-4 shadow-raised md:p-5">
          <h2 className="mb-2 text-body font-semibold text-fg">How plugins plug in</h2>
          <ol className="flex flex-col gap-2 text-label leading-6 text-muted">
            <li><strong className="text-fg">1. Parse</strong> — <code className="rounded-md bg-hover px-1 font-mono text-[0.9em]">parseMarkdown(text)</code> returns block tokens with nested inline tokens.</li>
            <li><strong className="text-fg">2. Map</strong> — the registry maps each token type to a component. Defaults live in <code className="rounded-md bg-hover px-1 font-mono text-[0.9em]">markdown/render.tsx</code>.</li>
            <li><strong className="text-fg">3. Override</strong> — pass <code className="rounded-md bg-hover px-1 font-mono text-[0.9em]">components</code> or <code className="rounded-md bg-hover px-1 font-mono text-[0.9em]">plugins</code>. Unmentioned tokens keep their default.</li>
          </ol>
        </div>
        <div className="overflow-hidden rounded-panel border border-[#232329] bg-[#101014] text-[#e8e8ec]">
          <div className="border-b border-white/10 px-4 py-2 text-caption text-white/60">plugin.ts</div>
          <pre className="overflow-x-auto p-4 font-mono text-[0.78rem] leading-6">
            <code>{SNIPPET}</code>
          </pre>
        </div>
      </section>
    </div>
  );
}
