/**
 * BMAD Method Integration Plugin for sudocode
 *
 * Provides integration with the BMAD 4-phase AI-driven development methodology.
 * Syncs BMAD artifacts (PRD, architecture, epics, stories) into sudocode's
 * spec/issue system with bidirectional status sync via sprint-status.yaml.
 */

export {
  type BmadPluginOptions,
  type ParsedArtifact,
  type ParsedSection,
  type ParsedEpic,
  type ParsedInlineStory,
  type ParsedStory,
  type AcceptanceCriterion,
  type StoryTask,
  type BmadStoryStatus,
  type BmadEpicStatus,
  type ParsedSprintStatus,
  type SprintEpic,
  type SprintStory,
  type BmadPhase,
  configSchema,
} from "./types.js";

export {
  mapToSudocode,
  mapFromSudocode,
  mapStoryStatus,
  mapEpicStatus,
  reverseMapStoryStatus,
  reverseMapEpicStatus,
  artifactToExternalEntity,
  epicToExternalEntity,
  storyToExternalEntity,
  applySprintStatus,
} from "./entity-mapper.js";

export {
  generateSpecId,
  generateEpicId,
  generateStoryId,
  parseBmadId,
  isBmadId,
  createIdGenerators,
  DEFAULT_SPEC_PREFIX,
  DEFAULT_EPIC_PREFIX,
  DEFAULT_STORY_PREFIX,
  type BmadArtifactType,
  type ParsedBmadId,
} from "./id-generator.js";

// Parsers
export { parseArtifact, detectArtifactType } from "./parser/artifact-parser.js";
export { parsePrd } from "./parser/prd-parser.js";
export { parseArchitecture } from "./parser/architecture-parser.js";
export {
  parseEpicFile,
  parseCombinedEpicsFile,
  scanAndParseEpics,
} from "./parser/epic-parser.js";
export {
  parseStoryFile,
  scanAndParseStories,
} from "./parser/story-parser.js";
export {
  parseSprintStatus,
  parseSprintStatusContent,
} from "./parser/sprint-parser.js";

// Parser utilities
export {
  readMarkdownFile,
  parseMarkdownContent,
  extractTitle,
  extractSections,
  extractSectionByName,
  extractSectionsAtLevel,
  extractStatus,
  extractCheckboxes,
  type MarkdownDocument,
  type MarkdownSection,
} from "./parser/markdown-utils.js";

// Relationship mapping
export {
  mapProjectRelationships,
  mapEpicToPrd,
  mapStoryToEpic,
  mapArchToPrd,
  mapUxToPrd,
  mapStoryDependencies,
  type MappedRelationship,
} from "./relationship-mapper.js";

// Watcher
export {
  BmadWatcher,
  type BmadWatcherOptions,
  type ChangeCallback,
} from "./watcher.js";

// Writers (bidirectional sync)
export {
  updateStoryStatus,
  updateEpicStatus,
  findStoryKey,
  updateStoryFileStatus,
  updateAllTasksCompletion,
} from "./writer/index.js";

// Persona prompts
export {
  BMAD_PERSONAS,
  getPersonaSystemPrompt,
  getPersonaConfig,
  type BmadPersona,
  type BmadPersonaSkill,
} from "./persona-prompts.js";

// Plugin (default export)
export { default } from "./plugin.js";
