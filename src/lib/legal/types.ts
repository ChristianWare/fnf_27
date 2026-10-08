// The shape of a legal page: numbered sections, each a mix of paragraphs
// and bullet lists. The Privacy Policy and the Terms both use it.

export type LegalBlock =
  { type: "p"; text: string } | { type: "list"; items: string[] };

export type LegalSection = {
  /** The anchor, e.g. "information-we-collect". */
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalDocData = {
  eyebrow: string;
  title: string;
  /** As shown, e.g. "October 8, 2026". */
  updated: string;
  sections: LegalSection[];
};
