import type {
  Align,
  Block,
  CalloutKind,
  Inline,
  ListItem,
  TableCell,
} from "./types";

// A small dependency-free markdown subset tuned for chat apps. It covers the
// classic blocks (headings, fences, quotes, lists, tables, hr) plus the chat
// extensions people actually send: @mentions, #tags, :emoji:, ||spoilers||,
// ==highlights==, ++kbd++, $math$ and footnotes. No HTML passes through.

let keyCounter = 0;
const key = (prefix: string) => `${prefix}-${keyCounter++}`;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

export function inlineText(inlines: Inline[]): string {
  return inlines
    .map((n) => {
      switch (n.type) {
        case "text":
        case "code":
        case "kbd":
          return n.value;
        case "math":
          return n.latex;
        case "mention":
          return `@${n.name}`;
        case "hashtag":
          return `#${n.tag}`;
        case "emoji":
          return `:${n.name}:`;
        case "autolink":
          return n.href;
        case "footnote_ref":
          return `[^${n.id}]`;
        case "break":
          return " ";
        case "image":
          return n.alt;
        default:
          return inlineText(n.children);
      }
    })
    .join("");
}

// ---------------------------------------------------------------- inline ---

const EMOJI_RE = /^[a-z0-9_+-]+/;
const NAME_RE = /^[A-Za-z0-9_-]+/;

function findCloser(src: string, from: number, delim: string): number {
  let i = from;
  while (i < src.length) {
    if (src.startsWith(delim, i)) return i;
    if (src[i] === "\\") i += 2;
    else i += 1;
  }
  return -1;
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let buf = "";
  const flush = () => {
    if (buf) out.push({ type: "text", value: buf });
    buf = "";
  };
  let i = 0;

  const pushChildren = (kind: Inline["type"], inner: string) => {
    flush();
    const children = parseInline(inner);
    out.push({ type: kind, children } as Inline);
  };

  while (i < src.length) {
    const rest = src.slice(i);

    // Escape: \* \` etc.
    if (src[i] === "\\" && i + 1 < src.length) {
      buf += src[i + 1];
      i += 2;
      continue;
    }

    // Inline code `x`
    if (src[i] === "`") {
      const end = findCloser(src, i + 1, "`");
      if (end !== -1) {
        flush();
        out.push({ type: "code", value: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Kbd ++x++
    if (rest.startsWith("++")) {
      const end = findCloser(src, i + 2, "++");
      if (end !== -1 && end > i + 2) {
        flush();
        out.push({ type: "kbd", value: src.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // Spoiler ||x||
    if (rest.startsWith("||")) {
      const end = findCloser(src, i + 2, "||");
      if (end !== -1 && end > i + 2) {
        pushChildren("spoiler", src.slice(i + 2, end));
        i = end + 2;
        continue;
      }
    }

    // Bold **x**
    if (rest.startsWith("**")) {
      const end = findCloser(src, i + 2, "**");
      if (end !== -1 && end > i + 2) {
        pushChildren("bold", src.slice(i + 2, end));
        i = end + 2;
        continue;
      }
    }

    // Strike ~~x~~
    if (rest.startsWith("~~")) {
      const end = findCloser(src, i + 2, "~~");
      if (end !== -1 && end > i + 2) {
        pushChildren("strike", src.slice(i + 2, end));
        i = end + 2;
        continue;
      }
    }

    // Highlight ==x==
    if (rest.startsWith("==")) {
      const end = findCloser(src, i + 2, "==");
      if (end !== -1 && end > i + 2) {
        pushChildren("highlight", src.slice(i + 2, end));
        i = end + 2;
        continue;
      }
    }

    // Math $x$
    if (src[i] === "$" && src[i + 1] !== "$") {
      const end = findCloser(src, i + 1, "$");
      if (end !== -1 && end > i + 1 && end - i < 120) {
        flush();
        out.push({ type: "math", latex: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Image ![alt](src)
    if (rest.startsWith("![")) {
      const m = /^!\[([^\]]*)\]\((\S+?)(?:\s+"[^"]*")?\)/.exec(rest);
      if (m) {
        flush();
        out.push({ type: "image", alt: m[1], src: m[2] });
        i += m[0].length;
        continue;
      }
    }

    // Link [text](href)
    if (src[i] === "[") {
      const m = /^\[([^\]]+)\]\((\S+?)(?:\s+"[^"]*")?\)/.exec(rest);
      if (m) {
        flush();
        out.push({ type: "link", href: m[2], children: parseInline(m[1]) });
        i += m[0].length;
        continue;
      }
      const fn = /^\[\^([^\]]+)\]/.exec(rest);
      if (fn) {
        flush();
        out.push({ type: "footnote_ref", id: fn[1] });
        i += fn[0].length;
        continue;
      }
    }

    // Autolink <https://x>
    if (src[i] === "<") {
      const m = /^<(https?:\/\/[^<>\s]+)>/.exec(rest);
      if (m) {
        flush();
        out.push({ type: "autolink", href: m[1] });
        i += m[0].length;
        continue;
      }
    }

    // Bare URL
    {
      const m = /^(https?:\/\/[^\s<>()]+)/.exec(rest);
      if (m) {
        flush();
        // Trim trailing punctuation chat users never mean as part of a URL.
        const raw = m[1].replace(/[.,;:!?]+$/, "");
        out.push({ type: "autolink", href: raw });
        i += raw.length;
        continue;
      }
    }

    // Italic *x* (after bold so ** is not split)
    if (src[i] === "*") {
      const end = findCloser(src, i + 1, "*");
      if (end !== -1 && end > i + 1 && src[end + 1] !== "*") {
        pushChildren("italic", src.slice(i + 1, end));
        i = end + 1;
        continue;
      }
    }
    if (src[i] === "_" && /_\S/.test(rest.slice(0, 2))) {
      const end = findCloser(src, i + 1, "_");
      if (end !== -1 && end > i + 1 && /\S/.test(src.slice(i + 1, end))) {
        pushChildren("italic", src.slice(i + 1, end));
        i = end + 1;
        continue;
      }
    }

    // Mention @name (start or after whitespace/punctuation)
    if (src[i] === "@") {
      const prev = i === 0 ? " " : src[i - 1];
      const m = NAME_RE.exec(rest.slice(1));
      if (m && /[\s(,>“"']/.test(prev)) {
        flush();
        out.push({ type: "mention", name: m[0] });
        i += 1 + m[0].length;
        continue;
      }
    }

    // Hashtag #tag
    if (src[i] === "#") {
      const prev = i === 0 ? " " : src[i - 1];
      const m = /^[A-Za-z0-9_-]+/.exec(rest.slice(1));
      if (m && /[\s(,>“"']/.test(prev)) {
        flush();
        out.push({ type: "hashtag", tag: m[0] });
        i += 1 + m[0].length;
        continue;
      }
    }

    // Emoji :name:
    if (src[i] === ":") {
      const m = /^:([a-z0-9_+-]+):/.exec(rest);
      if (m && EMOJI_RE.test(m[1])) {
        flush();
        out.push({ type: "emoji", name: m[1] });
        i += m[0].length;
        continue;
      }
    }

    buf += src[i];
    i += 1;
  }
  flush();

  // Merge nothing else: keep hard breaks as their own token for the renderer.
  return out.flatMap((n) => {
    if (n.type !== "text") return [n];
    // Two trailing spaces or a backslash-newline inside a paragraph: hard break.
    const parts = n.value.split(/(?:  \n|\\\n|\n)/g);
    if (parts.length === 1) return [n];
    const out2: Inline[] = [];
    parts.forEach((p, idx) => {
      if (p) out2.push({ type: "text", value: p });
      if (idx < parts.length - 1) out2.push({ type: "break" });
    });
    return out2;
  });
}

// ----------------------------------------------------------------- block ---

function isHr(line: string): boolean {
  return /^\s*(\*\*\*|---|___)(\s*(\*\*\*|---|___|\*|-|_))*\s*$/.test(line) &&
    /[*\-_]{3,}/.test(line.replace(/\s/g, ""));
}

function headingMatch(line: string): { level: 1 | 2 | 3 | 4 | 5 | 6; text: string } | null {
  const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
  if (!m) return null;
  return { level: m[1].length as 1 | 2 | 3 | 4 | 5 | 6, text: m[2] };
}

function tableSeparator(line: string): Align[] | null {
  if (!line.includes("|") || !/[:|\-\s]/.test(line)) return null;
  const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  if (!cells.length || !cells.every((c) => /^:?-+:?$/.test(c))) return null;
  return cells.map((c) =>
    c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : "left",
  );
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

function calloutKind(tag: string): CalloutKind | null {
  const t = tag.toLowerCase();
  if (t === "note" || t === "info") return "note";
  if (t === "tip" || t === "success") return "tip";
  if (t === "warning" || t === "caution") return "warning";
  if (t === "danger" || t === "error") return "danger";
  return null;
}

function listMatch(line: string): {
  indent: number;
  ordered: boolean;
  start: number;
  checked?: boolean;
  text: string;
} | null {
  const m = /^(\s*)(?:(\d+)[.)]|([-*+]))\s+(?:\[([ xX])\]\s+)?(.*)$/.exec(line);
  if (!m) return null;
  // A "- - -" style line is an hr, not a list.
  if (/^([-*_]\s*){3,}$/.test(line.trim())) return null;
  return {
    indent: m[1].replace(/\t/g, "  ").length,
    ordered: Boolean(m[2]),
    start: m[2] ? Number.parseInt(m[2], 10) : 1,
    checked: m[4] !== undefined ? m[4].toLowerCase() === "x" : undefined,
    text: m[5] ?? "",
  };
}

export function parseMarkdown(src: string): Block[] {
  keyCounter = 0;
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  void key;
  let i = 0;

  const peek = (n = 0) => lines[i + n] ?? "";

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code ```lang
    if (/^\s*```/.test(line)) {
      const lang = line.trim().slice(3).trim().split(/\s+/)[0] ?? "";
      i++;
      const code: string[] = [];
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++; // closing fence
      // Strip one trailing blank line worth of fence padding.
      while (code.length && !code[code.length - 1].trim()) code.pop();
      blocks.push({ type: "codeblock", lang, code: code.join("\n") });
      continue;
    }

    // Math block $$ ... $$
    if (line.trim().startsWith("$$")) {
      const rest = line.trim().slice(2);
      if (rest.includes("$$")) {
        blocks.push({ type: "math_block", latex: rest.split("$$")[0].trim() });
        i++;
      } else {
        i++;
        const acc: string[] = [];
        while (i < lines.length && !lines[i].includes("$$")) acc.push(lines[i++]);
        if (i < lines.length) {
          acc.push(lines[i].split("$$")[0]);
          i++;
        }
        blocks.push({ type: "math_block", latex: acc.join("\n").trim() });
      }
      continue;
    }

    // :::callout ... :::
    {
      const m = /^\s*:::\s*(\w+)(.*)$/.exec(line);
      if (m) {
        const kind = calloutKind(m[1]) ?? "note";
        const title = m[2].trim() || m[1].toLowerCase();
        i++;
        const inner: string[] = [];
        while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) inner.push(lines[i++]);
        i++;
        blocks.push({
          type: "callout",
          kind,
          title,
          children: parseMarkdown(inner.join("\n")),
        });
        continue;
      }
    }

    // Heading
    {
      const h = headingMatch(line.trim());
      if (h) {
        const children = parseInline(h.text);
        blocks.push({
          type: "heading",
          level: h.level,
          children,
          id: slugify(inlineText(children)) || `h-${blocks.length}`,
        });
        i++;
        continue;
      }
    }

    // hr
    if (isHr(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Table: header row + separator row
    if (line.includes("|") && tableSeparator(peek(1) ?? "")) {
      const aligns = tableSeparator(peek(1)!)!;
      const headCells = splitRow(line);
      const head: TableCell[] = headCells.map((c, idx) => ({
        children: parseInline(c),
        align: aligns[idx % aligns.length] as Align,
      }));
      i += 2;
      const rows: TableCell[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(
          splitRow(lines[i]).map((c, idx) => ({
            children: parseInline(c),
            align: aligns[idx % aligns.length] as Align,
          })),
        );
        i++;
      }
      blocks.push({ type: "table", head, rows });
      continue;
    }

    // Blockquote (supports [!NOTE] github callouts)
    if (/^\s*>/.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        inner.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      const first = (inner[0] ?? "").trim();
      const cm = /^\[!(\w+)\]\s*$/.exec(first);
      const children = parseMarkdown(inner.slice(cm ? 1 : 0).join("\n"));
      if (cm && calloutKind(cm[1])) {
        blocks.push({ type: "quote", children, callout: calloutKind(cm[1])! });
      } else {
        blocks.push({ type: "quote", children });
      }
      continue;
    }

    // Footnote definition [^id]: text
    {
      const m = /^\s*\[\^([^\]]+)\]:\s*(.*)$/.exec(line);
      if (m) {
        blocks.push({
          type: "footnote_def",
          id: m[1],
          children: [{ type: "paragraph", children: parseInline(m[2]) }],
        });
        i++;
        continue;
      }
    }

    // Standalone image line => image block (optional italic caption next)
    {
      const m = /^\s*!\[([^\]]*)\]\((\S+?)(?:\s+"[^"]*")?\)\s*$/.exec(line);
      if (m) {
        let caption: Block["type"] extends never ? never : ReturnType<typeof parseInline> | null = null;
        const next = peek(1).trim();
        if (/^\*.+\*$/.test(next) || /^_.+_$/.test(next)) {
          caption = parseInline(next.replace(/^[*_]|[*_]$/g, ""));
          i++;
        }
        blocks.push({ type: "image_block", src: m[2], alt: m[1], caption });
        i++;
        continue;
      }
    }

    // List (ordered, bullet, task). Collects one indent level; deeper
    // indents recurse into the item body as nested blocks.
    {
      const first = listMatch(line);
      if (first) {
        const baseIndent = first.indent;
        const items: ListItem[] = [];
        const start = first.start;
        const ordered = first.ordered;
        while (i < lines.length) {
          const lm = listMatch(lines[i]);
          if (!lm || lm.indent !== baseIndent) {
            // Nested (deeper indent) belongs to the current item body.
            if (lm && lm.indent > baseIndent && items.length) {
              const nested: string[] = [];
              while (i < lines.length) {
                const nm = listMatch(lines[i]);
                if (nm && nm.indent < lm.indent) break;
                if (!lines[i].trim()) break;
                nested.push(lines[i].slice(baseIndent + 2));
                i++;
              }
              const prev = items[items.length - 1];
              prev.children.push(...parseMarkdown(nested.join("\n")));
              continue;
            }
            break;
          }
          const body: string[] = [lm.text];
          i++;
          // Continuation lines: indented text or blank + indented.
          while (i < lines.length) {
            const nxt = lines[i];
            if (!nxt.trim()) {
              if (listMatch(peek(1) ?? "")) break;
              i++;
              continue;
            }
            if (listMatch(nxt)) break;
            if (/^\s{2,}\S/.test(nxt) || /^\s*>\s?/.test(nxt) || /^\s*```/.test(nxt)) {
              body.push(nxt.trim());
              i++;
            } else break;
          }
          const item: ListItem = { children: parseMarkdown(body.join("\n")) };
          if (lm.checked !== undefined) item.checked = lm.checked;
          items.push(item);
        }
        blocks.push({ type: "list", ordered, start, items });
        continue;
      }
    }

    // Paragraph: run until a blank line or another block opener.
    {
      const acc: string[] = [];
      while (i < lines.length && lines[i].trim()) {
        const l = lines[i];
        if (/^\s*```/.test(l) || /^\s*:::\s*\w+/.test(l) || /^\s*>/.test(l)) break;
        if (headingMatch(l.trim()) || isHr(l)) break;
        if (listMatch(l)) break;
        if (l.includes("|") && tableSeparator(peek(1) ?? "")) break;
        if (/^\s*!\[/.test(l) && /^\s*!\[([^\]]*)\]\(\S+?\)\s*$/.test(l)) break;
        if (/^\s*\[\^[^\]]+\]:/.test(l)) break;
        if (l.trim().startsWith("$$")) break;
        acc.push(l);
        i++;
      }
      if (acc.length) {
        blocks.push({ type: "paragraph", children: parseInline(acc.join("\n")) });
        continue;
      }
      i++;
    }
  }

  return blocks;
}
