// Reusable token model for the mark-ui experiment.
//
// Two levels, like most chat renderers: Block tokens for layout and Inline
// tokens for styled runs inside a block. Renderers stay decoupled from
// parsing: the parser only produces this data, and any React component can
// claim a token type through the registry in render.tsx.

export type Inline =
  | { type: "text"; value: string }
  | { type: "bold"; children: Inline[] }
  | { type: "italic"; children: Inline[] }
  | { type: "strike"; children: Inline[] }
  | { type: "highlight"; children: Inline[] }
  | { type: "code"; value: string }
  | { type: "kbd"; value: string }
  | { type: "math"; latex: string }
  | { type: "link"; href: string; children: Inline[] }
  | { type: "autolink"; href: string }
  | { type: "image"; src: string; alt: string }
  | { type: "mention"; name: string }
  | { type: "hashtag"; tag: string }
  | { type: "emoji"; name: string }
  | { type: "spoiler"; children: Inline[] }
  | { type: "footnote_ref"; id: string }
  | { type: "break" };

export type InlineType = Inline["type"];

export type Align = "left" | "center" | "right";

export interface TableCell {
  children: Inline[];
  align: Align;
}

export interface ListItem {
  checked?: boolean;
  children: Block[];
}

export type CalloutKind = "note" | "tip" | "warning" | "danger";

export type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; children: Inline[]; id: string }
  | { type: "paragraph"; children: Inline[] }
  | { type: "codeblock"; lang: string; code: string }
  | { type: "quote"; children: Block[]; callout?: CalloutKind }
  | { type: "callout"; kind: CalloutKind; title: string; children: Block[] }
  | { type: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { type: "table"; head: TableCell[]; rows: TableCell[][] }
  | { type: "hr" }
  | { type: "image_block"; src: string; alt: string; caption: Inline[] | null }
  | { type: "math_block"; latex: string }
  | { type: "footnote_def"; id: string; children: Block[] };

export type BlockType = Block["type"];

export type Token = Block | Inline;
export type TokenType = Token["type"];
