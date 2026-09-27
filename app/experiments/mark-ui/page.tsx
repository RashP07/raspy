import type { Metadata } from "next";
import { MarkUiPlayground } from "./playground";

export const metadata: Metadata = {
  title: "mark-ui — pluggable markdown tokens",
  description: "Prototype chat markdown renderer with swappable token components.",
  robots: { index: false, follow: false },
};

export default function MarkUiPage() {
  return (
    <main className="site-page min-h-dvh bg-bg text-fg">
      <MarkUiPlayground />
    </main>
  );
}
