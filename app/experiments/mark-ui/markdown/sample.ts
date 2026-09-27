// One document that exercises every token, written the way people write in
// chat: short, informal, with mentions and emoji next to tables and code.

export const SAMPLE_MARKDOWN = `# Launch notes for @raspy crew

Hey @ana and @teo — shipping the new chat renderer today. :tada: Tag it #release so #design can find it later.

We support **bold takes**, *soft emphasis*, ~~cut ideas~~, ==highlights==, and ||spoilers for the ending||. Press ++⌘+K++ to jump anywhere. Math like $E = mc^2$ renders inline.

## What changed

> [!TIP]
> Paste anything below into the editor on the left. Every token re-renders live.

- [x] Token parser with zero dependencies
- [ ] Streamed partial fences without layout jump
- [ ] Footnote popovers on hover[^1]

1. Pick a renderer from the plugin bar
2. Break it on purpose
3. File the edge case with \`/experiments/mark-ui\` in the title

---

### Code, quotes and callouts

\`\`\`ts
// plugins are just a map from token type to component
export const plugins = {
  mention: (m) => <Pill>@{m.name}</Pill>,
  spoiler: (s) => <Spoiler>{s.children}</Spoiler>,
};
\`\`\`

> Bold claims need receipts.
> — every reviewer ever

:::warning Watch the fences
Unclosed \`\`\` blocks during streaming render as plain code, never as broken layout.
:::

Use \`inline code\` for tokens, [the docs](https://example.com/docs) for reading, or <https://example.com/status> for the raw status page.

![Gradient over the lake](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=60)
*Lakedale at dusk, shot on the demo unit.*

| Token     | Renderer   | Cute? |
| :-------- | :--------: | ----: |
| \`mention\` | Pill       |   yes |
| \`spoiler\` | Blur       |   yes |
| \`table\`   | Card grid  |   yes |

$$

\\sum_{i=1}^{n} delight_i \\approx shipping
$$

[^1]: Footnotes collect at the bottom so chat stays scannable.
`;

export const TOKEN_CHEATSHEET: { token: string; syntax: string }[] = [
  { token: "heading", syntax: "# H1 … ###### H6" },
  { token: "paragraph", syntax: "blank line separates" },
  { token: "bold", syntax: "**bold**" },
  { token: "italic", syntax: "*italic* or _italic_" },
  { token: "strike", syntax: "~~strike~~" },
  { token: "highlight", syntax: "==highlight==" },
  { token: "spoiler", syntax: "||spoiler||" },
  { token: "code", syntax: "`code`" },
  { token: "kbd", syntax: "++⌘+K++" },
  { token: "math", syntax: "$E=mc^2$ / $$block$$" },
  { token: "link", syntax: "[text](https://…)" },
  { token: "autolink", syntax: "<https://…> or bare https://…" },
  { token: "image", syntax: "![alt](https://…)" },
  { token: "mention", syntax: "@ana" },
  { token: "hashtag", syntax: "#release" },
  { token: "emoji", syntax: ":tada:" },
  { token: "quote", syntax: "> quote / > [!TIP]" },
  { token: "callout", syntax: ":::warning … :::" },
  { token: "list", syntax: "- / 1. / - [x]" },
  { token: "table", syntax: "| a | b |" },
  { token: "codeblock", syntax: "```ts … ```" },
  { token: "hr", syntax: "---" },
  { token: "footnote", syntax: "[^1] + [^1]: …" },
];
