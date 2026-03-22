/**
 * PRD (Product Requirements Document) Parser
 *
 * Parses _bmad-output/planning-artifacts/PRD.md into a ParsedArtifact.
 *
 * BMAD PRD format:
 * - Optional frontmatter (gray-matter)
 * - H1 title
 * - Sections: Overview, Functional Requirements, Non-Functional Requirements, etc.
 */

import type { ParsedArtifact, ParsedSection } from "../types.js";
import {
  readMarkdownFile,
  extractTitle,
  extractSections,
} from "./markdown-utils.js";

/**
 * Parse a PRD.md file into a ParsedArtifact.
 *
 * @param filePath - Absolute path to the PRD.md file
 * @returns ParsedArtifact with type "prd"
 */
export function parsePrd(filePath: string): ParsedArtifact {
  const doc = readMarkdownFile(filePath);
  const title = extractTitle(doc.body) ?? "Product Requirements Document";
  const sections = extractSections(doc.body);

  return {
    type: "prd",
    title,
    content: doc.raw,
    filePath,
    frontmatter: doc.frontmatter,
    sections: sections.map(toSection),
  };
}

function toSection(s: { heading: string; level: number; content: string; startLine: number }): ParsedSection {
  return {
    heading: s.heading,
    level: s.level,
    content: s.content,
    startLine: s.startLine,
  };
}
