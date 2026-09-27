"use client";

import * as React from "react";
import { parseMarkdown } from "./parse";
import type { Block, CalloutKind, Inline } from "./types";

// ---------------------------------------------------------------------------
// Pluggable renderer.
//
// Parsing produces data (see types.ts). Rendering is a map from token type to
// component. Override one token without touching the rest:
//
//   <Markdown text={src} components={{ mention: MyMention }} />
//
// or bundle overrides as plugins:
//
//   const plugins = [{ token: "codeblock", render: NeonCode }]
//   <Markdown text={src} plugins={plugins} />
// ---------------------------------------------------------------------------

export type AnyBlockProps = { node: Block };
export type AnyInlineProps = { node: Inline };

// The registry is heterogeneous on purpose: each token carries its own node
// shape, so the map erases to `any` here and each renderer narrows back to
// its own token at the definition site.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Components = Partial<Record<Block["type"] | Inline["type"], React.ComponentType<any>>>;

export interface Plugin {
  token: Block["type"] | Inline["type"];
  render: React.ComponentType<any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function mergeComponents(...layers: (Components | undefined | Plugin[])[]): Components {
  const out: Components = {};
  for (const layer of layers) {
    if (!layer) continue;
    if (Array.isArray(layer)) {
      for (const p of layer) out[p.token] = p.render;
    } else {
      Object.assign(out, layer);
    }
  }
  return out;
}

// --- tiny helpers -----------------------------------------------------------

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

function useCopy(text: string): [boolean, () => void] {
  const [copied, setCopied] = React.useState(false);
  return [
    copied,
    () => {
      void navigator.clipboard?.writeText(text).catch(() => {});
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    },
  ];
}

const EMOJI_MAP: Record<string, string> = {
  tada: "🎉",
  fire: "🔥",
  heart: "❤️",
  rocket: "🚀",
  eyes: "👀",
  check: "✅",
  warn: "⚠️",
  warning: "⚠️",
  sparkles: "✨",
  thumbsup: "👍",
  "+1": "👍",
  think: "💭",
  wave: "👋",
  party: "🥳",
  bug: "🐛",
  camera: "📷",
  photo: "🖼️",
};

const CALLOUT_STYLE: Record<CalloutKind, { bar: string; chip: string; label: string }> = {
  note: { bar: "border-info/60", chip: "bg-info/10 text-info", label: "Note" },
  tip: { bar: "border-success/60", chip: "bg-success/10 text-success", label: "Tip" },
  warning: { bar: "border-amber-500/60", chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400", label: "Warning" },
  danger: { bar: "border-danger/60", chip: "bg-danger/10 text-danger", label: "Danger" },
};

// --- inline defaults --------------------------------------------------------

function RText({ node }: { node: Extract<Inline, { type: "text" }> }) {
  return <>{node.value}</>;
}

function RBreak() {
  return <br />;
}

function RBold({ node }: { node: Extract<Inline, { type: "bold" }> }) {
  return (
    <strong className="font-semibold text-fg">
      <RenderInline nodes={node.children} />
    </strong>
  );
}

function RItalic({ node }: { node: Extract<Inline, { type: "italic" }> }) {
  return (
    <em className="text-fg/90">
      <RenderInline nodes={node.children} />
    </em>
  );
}

function RStrike({ node }: { node: Extract<Inline, { type: "strike" }> }) {
  return (
    <s className="text-muted decoration-danger/70 decoration-2">
      <RenderInline nodes={node.children} />
    </s>
  );
}

function RHighlight({ node }: { node: Extract<Inline, { type: "highlight" }> }) {
  return (
    <mark className="rounded-md bg-amber-300/40 px-1 py-px text-fg decoration-amber-500/50 dark:bg-amber-400/20">
      <RenderInline nodes={node.children} />
    </mark>
  );
}

function RCode({ node }: { node: Extract<Inline, { type: "code" }> }) {
  return (
    <code className="rounded-md border border-hairline bg-hover px-1.5 py-px font-mono text-[0.85em] text-fg">
      {node.value}
    </code>
  );
}

function RKbd({ node }: { node: Extract<Inline, { type: "kbd" }> }) {
  return (
    <kbd className="rounded-md border border-hairline-strong bg-surface px-1.5 py-px font-sans text-[0.8em] font-medium text-fg shadow-[0_2px_0_var(--color-hairline-strong)]">
      {node.value}
    </kbd>
  );
}

function RMath({ node }: { node: Extract<Inline, { type: "math" }> }) {
  return (
    <span
      className="rounded-full border border-hairline bg-surface px-2 py-px font-serif text-[0.95em] italic"
      title={node.latex}
    >
      {node.latex}
    </span>
  );
}

function RLink({ node }: { node: Extract<Inline, { type: "link" }> }) {
  const external = /^https?:\/\//.test(node.href);
  return (
    <a
      href={node.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
      className="font-medium text-info underline decoration-info/40 underline-offset-4 transition-colors hover:decoration-info"
    >
      <RenderInline nodes={node.children} />
    </a>
  );
}

function RAutolink({ node }: { node: Extract<Inline, { type: "autolink" }> }) {
  let label = node.href.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (label.length > 42) label = `${label.slice(0, 42)}…`;
  return (
    <a
      href={node.href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-hairline bg-hover px-2 py-px text-[0.9em] font-medium text-info underline-offset-2 hover:underline"
    >
      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-info" aria-hidden />
      <span className="truncate">{label}</span>
    </a>
  );
}

function RImage({ node }: { node: Extract<Inline, { type: "image" }> }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={node.src}
      alt={node.alt}
      loading="lazy"
      className="my-2 max-h-64 rounded-control border border-hairline object-cover"
    />
  );
}

export function MentionPill({ node }: { node: Extract<Inline, { type: "mention" }> }) {
  return (
    <a
      href={`#${node.name}`}
      onClick={(e) => e.preventDefault()}
      className="rounded-full bg-accent px-2 py-px text-[0.85em] font-semibold text-accent-fg transition-opacity hover:opacity-80"
    >
      @{node.name}
    </a>
  );
}

export function PlainMention({ node }: { node: Extract<Inline, { type: "mention" }> }) {
  return <span className="font-semibold text-info">@{node.name}</span>;
}

export function HashtagPill({ node }: { node: Extract<Inline, { type: "hashtag" }> }) {
  return (
    <a
      href={`#tag-${node.tag}`}
      onClick={(e) => e.preventDefault()}
      className="rounded-full border border-info/30 bg-info/10 px-2 py-px text-[0.85em] font-medium text-info hover:bg-info/20"
    >
      #{node.tag}
    </a>
  );
}

export function EmojiGlyph({ node }: { node: Extract<Inline, { type: "emoji" }> }) {
  const glyph = EMOJI_MAP[node.name];
  if (!glyph) {
    return (
      <span className="rounded-md bg-hover px-1.5 py-px font-mono text-[0.85em] text-muted">
        :{node.name}:
      </span>
    );
  }
  return (
    <span role="img" aria-label={node.name} title={`:${node.name}:`} className="text-[1.1em] leading-none">
      {glyph}
    </span>
  );
}

export function SpoilerBlur({ node }: { node: Extract<Inline, { type: "spoiler" }> }) {
  const [open, setOpen] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      title={open ? "Hide spoiler" : "Reveal spoiler"}
      className={cx(
        "rounded-md px-1.5 py-px text-[0.95em] transition-all",
        open
          ? "bg-hover text-fg"
          : "cursor-pointer bg-fg/10 text-transparent blur-[5px] select-none hover:blur-[4px]",
      )}
    >
      <RenderInline nodes={node.children} />
    </button>
  );
}

export function SpoilerBlackout({ node }: { node: Extract<Inline, { type: "spoiler" }> }) {
  const [open, setOpen] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className={cx(
        "rounded-md px-1.5 py-px text-[0.95em]",
        open ? "bg-hover text-fg" : "cursor-pointer bg-fg text-fg select-none",
      )}
    >
      <span className={open ? undefined : "invisible"}>{open ? <RenderInline nodes={node.children} /> : node.children.map((c, i) => <span key={i}>█</span>)}</span>
    </button>
  );
}

function RFootnoteRef({ node }: { node: Extract<Inline, { type: "footnote_ref" }> }) {
  return (
    <a
      href={`#fn-${node.id}`}
      className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-hover px-1 align-super font-sans text-[0.7em] font-semibold text-muted hover:text-fg"
    >
      {node.id}
    </a>
  );
}

// --- block defaults ----------------------------------------------------------

function RHeading({ node }: { node: Extract<Block, { type: "heading" }> }) {
  const inner = <RenderInline nodes={node.children} />;
  if (node.level === 1) {
    return (
      <h1 className="pt-2 text-[1.65rem] leading-tight font-semibold tracking-snug text-fg">
        <a href={`#${node.id}`} className="group no-underline">
          {inner}
        </a>
      </h1>
    );
  }
  if (node.level === 2) {
    return (
      <h2 className="flex items-center gap-2 pt-4 text-[1.2rem] leading-snug font-semibold text-fg">
        <span aria-hidden className="h-5 w-1 rounded-full bg-accent" />
        {inner}
      </h2>
    );
  }
  return (
    <h3 className="pt-3 text-[1.02rem] font-semibold tracking-label text-muted uppercase">
      {inner}
    </h3>
  );
}

function RParagraph({ node }: { node: Extract<Block, { type: "paragraph" }> }) {
  return (
    <p className="leading-7 text-fg/90">
      <RenderInline nodes={node.children} />
    </p>
  );
}

export function DefaultCodeblock({ node }: { node: Extract<Block, { type: "codeblock" }> }) {
  const [copied, copy] = useCopy(node.code);
  return (
    <div className="overflow-hidden rounded-panel border border-hairline bg-[#101014] text-[#e8e8ec]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="flex items-center gap-2 font-mono text-caption text-white/60">
          <span className="flex gap-1" aria-hidden>
            <i className="block h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <i className="block h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <i className="block h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          {node.lang || "code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded-control px-2 py-1 font-sans text-caption font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[0.82rem] leading-6">
        <code>{node.code}</code>
      </pre>
    </div>
  );
}

export function FlatCodeblock({ node }: { node: Extract<Block, { type: "codeblock" }> }) {
  return (
    <pre className="overflow-x-auto rounded-control border border-hairline bg-hover p-3 font-mono text-[0.82rem] leading-6 text-fg">
      <code>{node.code}</code>
    </pre>
  );
}

function RQuote({ node }: { node: Extract<Block, { type: "quote" }> }) {
  if (node.callout) {
    const s = CALLOUT_STYLE[node.callout];
    return (
      <blockquote className={cx("rounded-control border-l-4 bg-surface px-4 py-3", s.bar)}>
        <span className={cx("mb-2 inline-block rounded-full px-2 py-px text-caption font-semibold", s.chip)}>
          {s.label}
        </span>
        <RenderBlocks blocks={node.children} />
      </blockquote>
    );
  }
  return (
    <blockquote className="rounded-r-control border-l-2 border-hairline-strong pl-4 text-muted italic">
      <RenderBlocks blocks={node.children} />
    </blockquote>
  );
}

function RCallout({ node }: { node: Extract<Block, { type: "callout" }> }) {
  const s = CALLOUT_STYLE[node.kind];
  return (
    <aside className={cx("rounded-panel border border-hairline border-l-4 bg-surface px-4 py-3 shadow-raised", s.bar)}>
      <p className="mb-1 flex items-center gap-2 text-label font-semibold text-fg">
        <span className={cx("rounded-full px-2 py-px text-caption", s.chip)}>{s.label}</span>
        <span className="capitalize">{node.title}</span>
      </p>
      <div className="text-muted">
        <RenderBlocks blocks={node.children} />
      </div>
    </aside>
  );
}

function RList({ node }: { node: Extract<Block, { type: "list" }> }) {
  const hasTasks = node.items.some((it) => it.checked !== undefined);
  if (node.ordered) {
    return (
      <ol className="flex flex-col gap-2 pl-1" start={node.start}>
        {node.items.map((item, idx) => (
          <li key={idx} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-caption font-semibold text-accent-fg tabular-nums">
              {node.start + idx}
            </span>
            <div className="min-w-0 flex-1">
              <RenderBlocks blocks={item.children} />
            </div>
          </li>
        ))}
      </ol>
    );
  }
  if (hasTasks) {
    return (
      <ul className="flex flex-col gap-2">
        {node.items.map((item, idx) => (
          <li
            key={idx}
            className={cx(
              "flex items-start gap-3 rounded-control border border-hairline bg-surface px-3 py-2",
              item.checked && "opacity-70",
            )}
          >
            <span
              aria-hidden
              className={cx(
                "mt-1 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border text-[0.7rem]",
                item.checked
                  ? "border-success bg-success text-white"
                  : "border-hairline-strong bg-bg text-transparent",
              )}
              style={{ width: 18, height: 18 }}
            >
              {item.checked ? "✓" : ""}
            </span>
            <div className={cx("min-w-0 flex-1", item.checked && "line-through decoration-muted")}>
              <RenderBlocks blocks={item.children} />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {node.items.map((item, idx) => (
        <li key={idx} className="flex gap-3 pl-1">
          <span aria-hidden className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1">
            <RenderBlocks blocks={item.children} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RTable({ node }: { node: Extract<Block, { type: "table" }> }) {
  const alignCls = (a: string) =>
    a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";
  return (
    <div className="overflow-x-auto rounded-panel border border-hairline">
      <table className="w-full border-collapse text-label">
        <thead>
          <tr className="bg-hover/70">
            {node.head.map((cell, i) => (
              <th key={i} className={cx("px-3 py-2 font-semibold text-fg", alignCls(cell.align))}>
                <RenderInline nodes={cell.children} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {node.rows.map((row, r) => (
            <tr key={r} className="border-t border-hairline last:rounded-b-panel hover:bg-hover/40">
              {row.map((cell, c) => (
                <td key={c} className={cx("px-3 py-2 text-muted", alignCls(cell.align))}>
                  <RenderInline nodes={cell.children} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RHr() {
  return (
    <div className="flex items-center gap-3 py-1" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-hairline-strong to-transparent" />
      <span className="h-1.5 w-1.5 rounded-full bg-tick-strong" />
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-hairline-strong to-transparent" />
    </div>
  );
}

function RImageBlock({ node }: { node: Extract<Block, { type: "image_block" }> }) {
  return (
    <figure className="overflow-hidden rounded-panel border border-hairline bg-surface shadow-raised">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={node.src} alt={node.alt} loading="lazy" className="aspect-[16/9] w-full object-cover" />
      {(node.alt || node.caption) && (
        <figcaption className="px-4 py-2 text-center text-caption text-muted">
          {node.caption ? <RenderInline nodes={node.caption} /> : node.alt}
        </figcaption>
      )}
    </figure>
  );
}

function RMathBlock({ node }: { node: Extract<Block, { type: "math_block" }> }) {
  return (
    <div className="rounded-panel border border-hairline bg-surface px-4 py-3 text-center">
      <span className="mb-1 block text-caption font-medium tracking-label text-muted uppercase">Math</span>
      <span className="font-serif text-lg italic">{node.latex}</span>
    </div>
  );
}

function RFootnoteDef({ node }: { node: Extract<Block, { type: "footnote_def" }> }) {
  return (
    <div id={`fn-${node.id}`} className="flex gap-2 rounded-control bg-hover/60 px-3 py-2 text-caption text-muted">
      <span className="font-semibold text-fg">[{node.id}]</span>
      <div className="min-w-0 flex-1">
        <RenderBlocks blocks={node.children} />
      </div>
    </div>
  );
}

// --- registry ---------------------------------------------------------------

const DEFAULTS: Components = {
  heading: RHeading,
  paragraph: RParagraph,
  codeblock: DefaultCodeblock,
  quote: RQuote,
  callout: RCallout,
  list: RList,
  table: RTable,
  hr: RHr,
  image_block: RImageBlock,
  math_block: RMathBlock,
  footnote_def: RFootnoteDef,
  text: RText,
  break: RBreak,
  bold: RBold,
  italic: RItalic,
  strike: RStrike,
  highlight: RHighlight,
  code: RCode,
  kbd: RKbd,
  math: RMath,
  link: RLink,
  autolink: RAutolink,
  image: RImage,
  mention: MentionPill,
  hashtag: HashtagPill,
  emoji: EmojiGlyph,
  spoiler: SpoilerBlur,
  footnote_ref: RFootnoteRef,
};

const Ctx = React.createContext<Components>(DEFAULTS);

function FallbackNull() {
  return null;
}

export function RenderInline({ nodes }: { nodes: Inline[] }) {
  const map = React.useContext(Ctx);
  return (
    <>
      {nodes.map((node, i) => {
        const C = map[node.type] ?? FallbackNull;
        return React.createElement(C as React.ComponentType<{ node: Inline }>, {
          key: i,
          node,
        });
      })}
    </>
  );
}

export function RenderBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <RenderBlock key={i} block={block} />
      ))}
    </>
  );
}

export function RenderBlock({ block }: { block: Block }) {
  const map = React.useContext(Ctx);
  const C = map[block.type] ?? FallbackNull;
  return React.createElement(C as React.ComponentType<{ node: Block }>, { node: block });
}

// --- public components -------------------------------------------------------

export interface MarkdownProps {
  text: string;
  components?: Components;
  plugins?: Plugin[];
  className?: string;
}

/** Parse + render. Memoizes the parse so typing in a chat box stays cheap. */
export function Markdown({ text, components, plugins, className }: MarkdownProps) {
  const merged = React.useMemo(
    () => mergeComponents(DEFAULTS, components, plugins),
    [components, plugins],
  );
  const blocks = React.useMemo(() => parseMarkdown(text), [text]);
  return (
    <Ctx.Provider value={merged}>
      <div className={cx("flex min-w-0 flex-col gap-3", className)}>
        <RenderBlocks blocks={blocks} />
      </div>
    </Ctx.Provider>
  );
}

/** Render pre-parsed blocks, for message lists that parse upstream. */
export function MarkdownBlocks({
  blocks,
  components,
  plugins,
  className,
}: {
  blocks: Block[];
  components?: Components;
  plugins?: Plugin[];
  className?: string;
}) {
  const merged = React.useMemo(
    () => mergeComponents(DEFAULTS, components, plugins),
    [components, plugins],
  );
  return (
    <Ctx.Provider value={merged}>
      <div className={cx("flex min-w-0 flex-col gap-3", className)}>
        <RenderBlocks blocks={blocks} />
      </div>
    </Ctx.Provider>
  );
}

// --- example plugin packs ----------------------------------------------------

export const minimalPack: Plugin[] = [
  { token: "mention", render: PlainMention },
  { token: "spoiler", render: SpoilerBlackout },
  { token: "codeblock", render: FlatCodeblock },
];
