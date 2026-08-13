import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge resolves conflicts by class *group*, and it infers the group
 * from Tailwind's stock scales. Our theme's names are not in those scales, so
 * out of the box it guessed wrong in the one way that matters: `text-body` is
 * not a font size it recognises, so it filed it as a text *colour* — and then
 * `cn("text-accent-fg", "text-body")` dropped the colour as a duplicate. The
 * primary button rendered white-on-white.
 *
 * Registering the theme's own scales is what keeps size and colour in separate
 * groups. Any new step added to @theme belongs here too.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["caption", "label", "body", "display"] }],
      rounded: [{ rounded: ["inset", "control", "panel", "pill"] }],
      shadow: [
        { shadow: ["raised", "thumb", "lifted", "deck", "toast", "popover"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
