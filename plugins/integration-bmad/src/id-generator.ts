/**
 * BMAD ID Generator
 *
 * Generates deterministic IDs for BMAD entities. Unlike OpenSpec's hash-based
 * IDs, BMAD IDs are directly derived from artifact type, epic number, and
 * story number — making them human-readable and predictable.
 *
 * ID Formats:
 * - Specs:   bm-prd, bm-arch, bm-ux, bm-brief, bm-ctx
 * - Epics:   bme-1, bme-2, ...
 * - Stories: bms-1-3 (epic 1, story 3)
 */

import type { BmadPluginOptions } from "./types.js";

/** Default prefix for BMAD spec IDs */
export const DEFAULT_SPEC_PREFIX = "bm";

/** Default prefix for BMAD epic IDs */
export const DEFAULT_EPIC_PREFIX = "bme";

/** Default prefix for BMAD story IDs */
export const DEFAULT_STORY_PREFIX = "bms";

/**
 * Artifact type to ID suffix mapping
 */
const ARTIFACT_TYPE_SUFFIXES: Record<string, string> = {
  "prd": "prd",
  "architecture": "arch",
  "ux-spec": "ux",
  "product-brief": "brief",
  "project-context": "ctx",
};

/**
 * All recognized BMAD artifact types
 */
export type BmadArtifactType = keyof typeof ARTIFACT_TYPE_SUFFIXES;

// =============================================================================
// Individual ID Generators
// =============================================================================

/**
 * Generate a deterministic spec ID from a BMAD artifact type.
 *
 * @param artifactType - The artifact type (prd, architecture, ux-spec, product-brief, project-context)
 * @param prefix - ID prefix (default: "bm")
 * @returns Deterministic spec ID (e.g., "bm-prd", "bm-arch")
 *
 * @example
 * generateSpecId("prd")              // "bm-prd"
 * generateSpecId("architecture")     // "bm-arch"
 * generateSpecId("ux-spec")          // "bm-ux"
 * generateSpecId("project-context")  // "bm-ctx"
 */
export function generateSpecId(
  artifactType: string,
  prefix: string = DEFAULT_SPEC_PREFIX,
): string {
  const normalized = artifactType.trim().toLowerCase();
  const suffix = ARTIFACT_TYPE_SUFFIXES[normalized];

  if (!suffix) {
    throw new Error(
      `Unknown BMAD artifact type: "${artifactType}". ` +
      `Valid types: ${Object.keys(ARTIFACT_TYPE_SUFFIXES).join(", ")}`,
    );
  }

  return `${prefix}-${suffix}`;
}

/**
 * Generate a deterministic epic ID from an epic number.
 *
 * @param epicNumber - The epic number (1-based)
 * @param prefix - ID prefix (default: "bme")
 * @returns Deterministic epic ID (e.g., "bme-1", "bme-2")
 *
 * @example
 * generateEpicId(1)       // "bme-1"
 * generateEpicId(3, "ep") // "ep-3"
 */
export function generateEpicId(
  epicNumber: number,
  prefix: string = DEFAULT_EPIC_PREFIX,
): string {
  if (!Number.isInteger(epicNumber) || epicNumber < 1) {
    throw new Error(`Epic number must be a positive integer, got: ${epicNumber}`);
  }

  return `${prefix}-${epicNumber}`;
}

/**
 * Generate a deterministic story ID from epic and story numbers.
 *
 * @param epicNumber - The parent epic number (1-based)
 * @param storyNumber - The story number within the epic (1-based)
 * @param prefix - ID prefix (default: "bms")
 * @returns Deterministic story ID (e.g., "bms-1-3")
 *
 * @example
 * generateStoryId(1, 3)        // "bms-1-3"
 * generateStoryId(2, 1, "st")  // "st-2-1"
 */
export function generateStoryId(
  epicNumber: number,
  storyNumber: number,
  prefix: string = DEFAULT_STORY_PREFIX,
): string {
  if (!Number.isInteger(epicNumber) || epicNumber < 1) {
    throw new Error(`Epic number must be a positive integer, got: ${epicNumber}`);
  }
  if (!Number.isInteger(storyNumber) || storyNumber < 1) {
    throw new Error(`Story number must be a positive integer, got: ${storyNumber}`);
  }

  return `${prefix}-${epicNumber}-${storyNumber}`;
}

// =============================================================================
// Parsing
// =============================================================================

/**
 * Parsed result from a BMAD ID
 */
export interface ParsedBmadId {
  /** Entity type */
  type: "spec" | "epic" | "story";
  /** The prefix portion of the ID */
  prefix: string;
  /** For specs: the artifact type suffix (prd, arch, etc.) */
  artifactSuffix?: string;
  /** For epics/stories: the epic number */
  epicNumber?: number;
  /** For stories: the story number */
  storyNumber?: number;
}

/**
 * Parse a BMAD ID to extract its components.
 *
 * @param id - The BMAD ID to parse (e.g., "bm-prd", "bme-1", "bms-1-3")
 * @param options - Plugin options for prefix matching
 * @returns Parsed ID components, or null if not a BMAD ID
 *
 * @example
 * parseBmadId("bm-prd")   // { type: "spec", prefix: "bm", artifactSuffix: "prd" }
 * parseBmadId("bme-1")    // { type: "epic", prefix: "bme", epicNumber: 1 }
 * parseBmadId("bms-1-3")  // { type: "story", prefix: "bms", epicNumber: 1, storyNumber: 3 }
 */
export function parseBmadId(
  id: string,
  options?: Partial<BmadPluginOptions>,
): ParsedBmadId | null {
  if (!id || typeof id !== "string") {
    return null;
  }

  const specPrefix = options?.spec_prefix ?? DEFAULT_SPEC_PREFIX;
  const epicPrefix = options?.epic_prefix ?? DEFAULT_EPIC_PREFIX;
  const storyPrefix = options?.story_prefix ?? DEFAULT_STORY_PREFIX;

  // Try story pattern first (most specific): prefix-N-N
  const storyMatch = id.match(new RegExp(`^(${escapeRegex(storyPrefix)})-(\\d+)-(\\d+)$`));
  if (storyMatch) {
    return {
      type: "story",
      prefix: storyMatch[1],
      epicNumber: parseInt(storyMatch[2], 10),
      storyNumber: parseInt(storyMatch[3], 10),
    };
  }

  // Try epic pattern: prefix-N
  const epicMatch = id.match(new RegExp(`^(${escapeRegex(epicPrefix)})-(\\d+)$`));
  if (epicMatch) {
    return {
      type: "epic",
      prefix: epicMatch[1],
      epicNumber: parseInt(epicMatch[2], 10),
    };
  }

  // Try spec pattern: prefix-suffix
  const specMatch = id.match(new RegExp(`^(${escapeRegex(specPrefix)})-([a-z]+)$`));
  if (specMatch) {
    const suffix = specMatch[2];
    // Verify it's a known suffix
    const isKnown = Object.values(ARTIFACT_TYPE_SUFFIXES).includes(suffix);
    if (isKnown) {
      return {
        type: "spec",
        prefix: specMatch[1],
        artifactSuffix: suffix,
      };
    }
  }

  return null;
}

/**
 * Check if a string is a valid BMAD ID format.
 */
export function isBmadId(id: string, options?: Partial<BmadPluginOptions>): boolean {
  return parseBmadId(id, options) !== null;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a set of ID generators configured with plugin options.
 *
 * @param options - Plugin options (uses prefixes from config)
 * @returns Object with bound generator and parser functions
 *
 * @example
 * const ids = createIdGenerators({ path: "_bmad-output", spec_prefix: "bm" });
 * ids.specId("prd")       // "bm-prd"
 * ids.epicId(1)           // "bme-1"
 * ids.storyId(1, 3)       // "bms-1-3"
 * ids.parse("bme-1")      // { type: "epic", ... }
 */
export function createIdGenerators(options: Partial<BmadPluginOptions> = {}) {
  const specPrefix = options.spec_prefix ?? DEFAULT_SPEC_PREFIX;
  const epicPrefix = options.epic_prefix ?? DEFAULT_EPIC_PREFIX;
  const storyPrefix = options.story_prefix ?? DEFAULT_STORY_PREFIX;

  return {
    specId: (artifactType: string) => generateSpecId(artifactType, specPrefix),
    epicId: (epicNumber: number) => generateEpicId(epicNumber, epicPrefix),
    storyId: (epicNumber: number, storyNumber: number) =>
      generateStoryId(epicNumber, storyNumber, storyPrefix),
    parse: (id: string) => parseBmadId(id, options),
    isBmadId: (id: string) => isBmadId(id, options),
  };
}

// =============================================================================
// Utilities
// =============================================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
