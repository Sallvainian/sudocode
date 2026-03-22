/**
 * Shared markdown parsing utilities for BMAD artifacts.
 *
 * Provides frontmatter extraction (via gray-matter), section parsing,
 * and title extraction from markdown files.
 */

import matter from "gray-matter";
import { readFileSync } from "fs";

// =============================================================================
// Types
// =============================================================================

export interface MarkdownDocument {
  /** Frontmatter key-value pairs */
  frontmatter: Record<string, unknown>;
  /** Markdown body (without frontmatter) */
  body: string;
  /** Raw file content */
  raw: string;
}

export interface MarkdownSection {
  heading: string;
  level: number;
  content: string;
  startLine: number;
}

// =============================================================================
// Patterns
// =============================================================================

/** Regex for markdown headings (H1-H6) */
const HEADING_RE = /^(#{1,6})\s+(.+)$/;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Read and parse a markdown file with gray-matter frontmatter.
 */
export function readMarkdownFile(filePath: string): MarkdownDocument {
  const raw = readFileSync(filePath, "utf-8");
  return parseMarkdownContent(raw);
}

/**
 * Parse markdown content string with gray-matter frontmatter.
 */
export function parseMarkdownContent(content: string): MarkdownDocument {
  const { data, content: body } = matter(content);
  return {
    frontmatter: data as Record<string, unknown>,
    body,
    raw: content,
  };
}

/**
 * Extract the first H1 title from markdown content.
 * Returns undefined if no H1 heading is found.
 */
export function extractTitle(content: string): string | undefined {
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}

/**
 * Extract all sections from markdown content.
 *
 * A section starts at a heading and includes all content until the next
 * heading of equal or higher level (lower number).
 */
export function extractSections(content: string): MarkdownSection[] {
  const lines = content.split("\n");
  const sections: MarkdownSection[] = [];
  let currentSection: MarkdownSection | null = null;
  const contentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(HEADING_RE);

    if (match) {
      // Flush previous section
      if (currentSection) {
        currentSection.content = contentLines.join("\n").trim();
        sections.push(currentSection);
        contentLines.length = 0;
      }

      currentSection = {
        heading: match[2].trim(),
        level: match[1].length,
        content: "",
        startLine: i + 1, // 1-indexed
      };
    } else if (currentSection) {
      contentLines.push(line);
    }
  }

  // Flush last section
  if (currentSection) {
    currentSection.content = contentLines.join("\n").trim();
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract a specific section by heading name (case-insensitive).
 * Returns the section content or undefined if not found.
 */
export function extractSectionByName(
  content: string,
  sectionName: string,
): string | undefined {
  const sections = extractSections(content);
  const section = sections.find(
    (s) => s.heading.toLowerCase() === sectionName.toLowerCase(),
  );
  return section?.content;
}

/**
 * Extract sections at a specific heading level.
 */
export function extractSectionsAtLevel(
  content: string,
  level: number,
): MarkdownSection[] {
  return extractSections(content).filter((s) => s.level === level);
}

/**
 * Parse a "Status: value" line from markdown content.
 */
export function extractStatus(content: string): string | undefined {
  const match = content.match(/^Status:\s*(.+)$/im);
  return match ? match[1].trim() : undefined;
}

/**
 * Extract task checkboxes from markdown content.
 * Returns array of { title, completed, indent } objects.
 */
export function extractCheckboxes(
  content: string,
): Array<{ title: string; completed: boolean; indent: number }> {
  const results: Array<{ title: string; completed: boolean; indent: number }> = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(\s*)- \[([ xX])\]\s+(.+)$/);
    if (match) {
      results.push({
        indent: match[1].length,
        completed: match[2].toLowerCase() === "x",
        title: match[3].trim(),
      });
    }
  }

  return results;
}
