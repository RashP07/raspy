import type { Metadata } from "next";
import { DesignReference } from "@/app/components/design/DesignReference";

export const metadata: Metadata = {
  title: "Raspy — design system",
  description: "The tokens and primitives the editor is built from.",
  // A reference for whoever is working on the app, not a page to be found.
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return <DesignReference />;
}
