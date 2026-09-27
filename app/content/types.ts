import type { ReactNode } from "react";

/** A long-form page rendered inside the shared site frame. */
export interface Article {
  slug: string;
  /** Page heading and browser title. Under 60 characters where possible. */
  title: string;
  /** Meta description. Aim for 120 to 155 characters. */
  description: string;
  /** ISO dates. `updated` only when the text changed in a way worth dating. */
  published: string;
  updated?: string;
  /** The opening paragraph, also used as the summary on index pages. */
  summary: string;
  body: ReactNode;
}

export interface Guide extends Article {
  minutes: number;
  /** Slugs of guides to link at the end. */
  related: string[];
}

export interface Comparison extends Article {
  /** The product being compared, as it names itself. */
  competitor: string;
  /** One line under the heading on the index page. */
  verdict: string;
}
