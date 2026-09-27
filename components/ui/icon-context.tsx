"use client";

import { IconContext } from "@phosphor-icons/react/dist/lib/context";
import type { ReactNode } from "react";

/**
 * One place to change weight or default size for every icon in the app.
 * Lives apart from icons.tsx so the provider, which the import screen needs,
 * does not drag the full icon set into the first load.
 */
export function IconProvider({ children }: { children: ReactNode }) {
  return (
    <IconContext.Provider value={{ weight: "duotone", size: 20 }}>
      {children}
    </IconContext.Provider>
  );
}
