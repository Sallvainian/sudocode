/**
 * Architecture Document Parser
 *
 * Parses _bmad-output/planning-artifacts/architecture.md into a ParsedArtifact.
 *
 * BMAD architecture format:
 * - Optional frontmatter
 * - H1 title
 * - Sections: Overview, Tech Stack, Architecture Decisions (ADRs), etc.
 */

import type { ParsedArtifact, ParsedSection } from "../types.js";
import {
  readMarkdownFile,
  extractTitle,
  extractSections,
} from "./markdown-utils.js";

/**
 * Parse an architecture.md file into a ParsedArtifact.
 *
 * @param filePath - Absolute path to the architecture.md file
 * @returns ParsedArtifact with type "architecture"
 */
export function parseArchitecture(filePath: string): ParsedArtifact {
  const doc = readMarkdownFile(filePath);
  const title = extractTitle(doc.body) ?? "Architecture";
  const sections = extractSections(doc.body);

  return {
    type: "architecture",
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
