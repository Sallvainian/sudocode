/**
 * BMAD Integration Plugin + Provider
 *
 * Main plugin entry point implementing IntegrationPlugin and IntegrationProvider.
 * Follows the OpenSpec plugin pattern: plugin is a factory object, provider is a class.
 *
 * Plugin (factory):
 * - validateConfig(), testConnection(), createProvider()
 *
 * Provider (runtime):
 * - searchEntities(), fetchEntity(), getChangesSince(), startWatching()
 * - mapToSudocode(), mapFromSudocode()
 * - createEntity(), updateEntity()
 */

import type {
  IntegrationPlugin,
  IntegrationProvider,
  PluginValidationResult,
  PluginTestResult,
  ExternalEntity,
  ExternalChange,
  Spec,
  Issue,
} from "@sudocode-ai/types";
import { existsSync, readdirSync } from "fs";
import * as path from "path";
import { createHash } from "crypto";

import type { BmadPluginOptions, ParsedSprintStatus } from "./types.js";
import { configSchema } from "./types.js";

// Parsers
import { parseArtifact, detectArtifactType } from "./parser/artifact-parser.js";
import { scanAndParseEpics } from "./parser/epic-parser.js";
import { scanAndParseStories } from "./parser/story-parser.js";
import { parseSprintStatus } from "./parser/sprint-parser.js";

// ID generation
import {
  generateSpecId,
  generateEpicId,
  generateStoryId,
  parseBmadId,
} from "./id-generator.js";

// Entity mapping
import {
  mapToSudocode,
  mapFromSudocode,
  artifactToExternalEntity,
  epicToExternalEntity,
  storyToExternalEntity,
  applySprintStatus,
  reverseMapStoryStatus,
  reverseMapEpicStatus,
} from "./entity-mapper.js";

// Watcher
import { BmadWatcher } from "./watcher.js";

// Writer
import {
  updateStoryStatus as writeStoryStatus,
  updateEpicStatus as writeEpicStatus,
  findStoryKey,
  updateStoryFileStatus,
} from "./writer/index.js";

// =============================================================================
// Plugin (Factory)
// =============================================================================

const bmadPlugin: IntegrationPlugin = {
  name: "bmad",
  displayName: "BMAD Method",
  version: "0.1.0",
  description:
    "Integration with BMAD 4-phase AI-driven development methodology",

  configSchema,

  validateConfig(options: Record<string, unknown>): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!options.path || typeof options.path !== "string") {
      errors.push("bmad.options.path is required");
    }

    for (const field of ["spec_prefix", "epic_prefix", "story_prefix"]) {
      if (options[field] !== undefined) {
        if (typeof options[field] !== "string") {
          errors.push(`bmad.options.${field} must be a string`);
        } else if (!/^[a-z]{1,4}$/i.test(options[field] as string)) {
          warnings.push(
            `bmad.options.${field} should be 1-4 alphabetic characters`,
          );
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  async testConnection(
    options: Record<string, unknown>,
    projectPath: string,
  ): Promise<PluginTestResult> {
    const bmadPath = options.path as string;
    if (!bmadPath) {
      return {
        success: false,
        configured: true,
        enabled: true,
        error: "BMAD output path is not configured",
      };
    }

    const resolvedPath = path.resolve(projectPath, bmadPath);
    if (!existsSync(resolvedPath)) {
      return {
        success: false,
        configured: true,
        enabled: true,
        error: `BMAD output directory not found: ${resolvedPath}`,
        details: { path: bmadPath, resolvedPath },
      };
    }

    // Check for key artifacts
    const planningDir = path.join(resolvedPath, "planning-artifacts");
    const implDir = path.join(resolvedPath, "implementation-artifacts");
    const hasPlanningDir = existsSync(planningDir);
    const hasImplDir = existsSync(implDir);

    return {
      success: true,
      configured: true,
      enabled: true,
      details: {
        path: bmadPath,
        resolvedPath,
        hasPlanningDir,
        hasImplDir,
      },
    };
  },

  createProvider(
    options: Record<string, unknown>,
    projectPath: string,
  ): IntegrationProvider {
    return new BmadProvider(
      options as unknown as BmadPluginOptions,
      projectPath,
    );
  },
};

// =============================================================================
// Provider (Runtime)
// =============================================================================

class BmadProvider implements IntegrationProvider {
  readonly name = "bmad";
  readonly supportsWatch = true;
  readonly supportsPolling = true;
  readonly supportsOnDemandImport = false;
  readonly supportsSearch = false;
  readonly supportsPush = true;

  private options: BmadPluginOptions;
  private projectPath: string;
  private resolvedPath: string;

  // Change detection
  private entityHashes: Map<string, string> = new Map();

  // Watcher
  private watcher: BmadWatcher | null = null;

  constructor(options: BmadPluginOptions, projectPath: string) {
    this.options = options;
    this.projectPath = projectPath;
    this.resolvedPath = path.resolve(projectPath, options.path);
  }

  async initialize(): Promise<void> {
    console.log(`[bmad] Initializing provider for path: ${this.resolvedPath}`);

    if (!existsSync(this.resolvedPath)) {
      throw new Error(`BMAD output directory not found: ${this.resolvedPath}`);
    }

    console.log("[bmad] Provider initialized successfully");
  }

  async dispose(): Promise<void> {
    console.log("[bmad] Disposing provider");
    this.stopWatching();
    this.entityHashes.clear();
  }

  // ===========================================================================
  // Entity Operations
  // ===========================================================================

  async fetchEntity(externalId: string): Promise<ExternalEntity | null> {
    const entities = await this.searchEntities();
    return entities.find((e) => e.id === externalId) ?? null;
  }

  async searchEntities(): Promise<ExternalEntity[]> {
    // Return specs FIRST, then epics, then stories
    // This ensures specs exist before issues that reference them
    const specEntities: ExternalEntity[] = [];
    const epicEntities: ExternalEntity[] = [];
    const storyEntities: ExternalEntity[] = [];

    const specPrefix = this.options.spec_prefix ?? "bm";
    const epicPrefix = this.options.epic_prefix ?? "bme";
    const storyPrefix = this.options.story_prefix ?? "bms";

    // 1. Scan planning artifacts → specs
    const planningDir = path.join(this.resolvedPath, "planning-artifacts");
    if (existsSync(planningDir)) {
      const entries = readdirSync(planningDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

        const artifactType = detectArtifactType(entry.name);
        if (!artifactType) continue;

        try {
          const filePath = path.join(planningDir, entry.name);
          const artifact = parseArtifact(filePath, artifactType);
          const id = generateSpecId(artifactType, specPrefix);
          specEntities.push(artifactToExternalEntity(artifact, id));
        } catch (error) {
          console.error(`[bmad] Error parsing artifact ${entry.name}:`, error);
        }
      }
    }

    // 2. Project context → spec (if enabled)
    if (this.options.import_project_context !== false) {
      const ctxPath = path.join(this.resolvedPath, "project-context.md");
      if (existsSync(ctxPath)) {
        try {
          const artifact = parseArtifact(ctxPath, "project-context");
          const id = generateSpecId("project-context", specPrefix);
          specEntities.push(artifactToExternalEntity(artifact, id));
        } catch (error) {
          console.error("[bmad] Error parsing project-context.md:", error);
        }
      }
    }

    // 3. Epic files → issues
    const epicsDir = path.join(planningDir, "epics");
    const epics = scanAndParseEpics(epicsDir);

    // Also check for epics.md at planning-artifacts level
    const combinedEpicsPath = path.join(planningDir, "epics.md");
    if (epics.length === 0 && existsSync(combinedEpicsPath)) {
      const combined = scanAndParseEpics(combinedEpicsPath);
      epics.push(...combined);
    }

    const prdId = specEntities.find(
      (e) => (e.raw as Record<string, unknown>)?.artifactType === "prd",
    )?.id;

    for (const epic of epics) {
      const epicId = generateEpicId(epic.number, epicPrefix);
      epicEntities.push(epicToExternalEntity(epic, epicId, prdId));

      // 4. Inline stories from epics → create story entities
      for (const inlineStory of epic.stories) {
        const storyId = generateStoryId(
          epic.number,
          inlineStory.number,
          storyPrefix,
        );

        // Convert inline story to a minimal ExternalEntity
        storyEntities.push({
          id: storyId,
          type: "issue",
          title: inlineStory.title,
          description: inlineStory.description,
          status: "open",
          priority: 2,
          relationships: [
            {
              targetId: epicId,
              targetType: "issue",
              relationshipType: "implements",
            },
          ],
          raw: {
            entityKind: "story",
            epicNumber: epic.number,
            storyNumber: inlineStory.number,
            source: "inline", // From epic file, not standalone story file
          },
        });
      }
    }

    // 5. Standalone story files → override inline story entities
    const implDir = path.join(this.resolvedPath, "implementation-artifacts");
    const stories = scanAndParseStories(implDir);

    for (const story of stories) {
      const storyId = generateStoryId(
        story.epicNumber,
        story.storyNumber,
        storyPrefix,
      );
      const epicId = generateEpicId(story.epicNumber, epicPrefix);

      // Replace inline story entity if it exists
      const existingIdx = storyEntities.findIndex((e) => e.id === storyId);
      const entity = storyToExternalEntity(story, storyId, epicId);

      if (existingIdx >= 0) {
        storyEntities[existingIdx] = entity;
      } else {
        storyEntities.push(entity);
      }
    }

    // 6. Apply sprint status overlay
    if (this.options.sync_sprint_status !== false) {
      const sprintPath = path.join(implDir, "sprint-status.yaml");
      if (existsSync(sprintPath)) {
        try {
          const sprintStatus = parseSprintStatus(sprintPath);
          const allIssues = [...epicEntities, ...storyEntities];
          applySprintStatus(allIssues, sprintStatus, this.options);
        } catch (error) {
          console.error("[bmad] Error parsing sprint-status.yaml:", error);
        }
      }
    }

    const entities = [...specEntities, ...epicEntities, ...storyEntities];
    console.log(
      `[bmad] searchEntities found ${entities.length} entities ` +
        `(${specEntities.length} specs, ${epicEntities.length} epics, ` +
        `${storyEntities.length} stories)`,
    );
    return entities;
  }

  async createEntity(_entity: Partial<Spec | Issue>): Promise<string> {
    throw new Error(
      "createEntity not supported: BMAD entities are created by BMAD workflows",
    );
  }

  async updateEntity(
    externalId: string,
    entity: Partial<Spec | Issue>,
  ): Promise<void> {
    console.log(`[bmad] updateEntity called for ${externalId}`);

    const parsed = parseBmadId(externalId, this.options);
    if (!parsed) {
      console.warn(`[bmad] Unknown ID format: ${externalId}`);
      return;
    }

    const issueEntity = entity as Partial<Issue>;

    if (parsed.type === "story" && issueEntity.status !== undefined) {
      const bmadStatus = reverseMapStoryStatus(
        issueEntity.status as "open" | "in_progress" | "blocked" | "needs_review" | "closed",
      );

      // Update sprint-status.yaml
      const sprintPath = path.join(
        this.resolvedPath,
        "implementation-artifacts",
        "sprint-status.yaml",
      );
      if (existsSync(sprintPath) && parsed.epicNumber && parsed.storyNumber) {
        const storyKey = findStoryKey(
          sprintPath,
          parsed.epicNumber,
          parsed.storyNumber,
        );
        if (storyKey) {
          writeStoryStatus(sprintPath, storyKey, bmadStatus);

          // Update watcher hash to prevent echo
          if (this.watcher) {
            this.watcher.updateFileHash(sprintPath);
          }
        }
      }

      // Update story file Status line
      const currentEntities = await this.searchEntities();
      const storyEntity = currentEntities.find((e) => e.id === externalId);
      const rawData = storyEntity?.raw as Record<string, unknown> | undefined;
      const filePath = rawData?.filePath as string | undefined;
      if (filePath && existsSync(filePath)) {
        updateStoryFileStatus(filePath, bmadStatus);
        if (this.watcher) {
          this.watcher.updateFileHash(filePath);
        }
      }
    }

    if (parsed.type === "epic" && issueEntity.status !== undefined) {
      const bmadStatus = reverseMapEpicStatus(
        issueEntity.status as "open" | "in_progress" | "blocked" | "needs_review" | "closed",
      );

      const sprintPath = path.join(
        this.resolvedPath,
        "implementation-artifacts",
        "sprint-status.yaml",
      );
      if (existsSync(sprintPath) && parsed.epicNumber) {
        writeEpicStatus(sprintPath, parsed.epicNumber, bmadStatus);
        if (this.watcher) {
          this.watcher.updateFileHash(sprintPath);
        }
      }
    }

    // Refresh entity hashes
    const refreshed = await this.searchEntities();
    for (const e of refreshed) {
      this.entityHashes.set(e.id, this.computeEntityHash(e));
    }
  }

  // ===========================================================================
  // Change Detection
  // ===========================================================================

  async getChangesSince(_timestamp: Date): Promise<ExternalChange[]> {
    const changes: ExternalChange[] = [];
    const currentEntities = await this.searchEntities();
    const currentIds = new Set<string>();

    for (const entity of currentEntities) {
      currentIds.add(entity.id);
      const newHash = this.computeEntityHash(entity);
      const cachedHash = this.entityHashes.get(entity.id);

      if (!cachedHash) {
        changes.push({
          entity_id: entity.id,
          entity_type: entity.type,
          change_type: "created",
          timestamp: entity.created_at ?? new Date().toISOString(),
          data: entity,
        });
        this.entityHashes.set(entity.id, newHash);
      } else if (newHash !== cachedHash) {
        changes.push({
          entity_id: entity.id,
          entity_type: entity.type,
          change_type: "updated",
          timestamp: entity.updated_at ?? new Date().toISOString(),
          data: entity,
        });
        this.entityHashes.set(entity.id, newHash);
      }
    }

    // Check for deleted entities
    const now = new Date().toISOString();
    for (const [id] of this.entityHashes) {
      if (!currentIds.has(id)) {
        const parsed = parseBmadId(id, this.options);
        changes.push({
          entity_id: id,
          entity_type: parsed?.type === "spec" ? "spec" : "issue",
          change_type: "deleted",
          timestamp: now,
        });
        this.entityHashes.delete(id);
      }
    }

    console.log(`[bmad] getChangesSince found ${changes.length} changes`);
    return changes;
  }

  startWatching(callback: (changes: ExternalChange[]) => void): void {
    if (this.watcher) {
      console.warn("[bmad] Already watching");
      return;
    }

    this.watcher = new BmadWatcher({
      bmadOutputPath: this.resolvedPath,
      debounceMs: 150,
    });

    // Wrap callback to re-scan and compute proper changes
    this.watcher.start(async () => {
      try {
        const changes = await this.getChangesSince(new Date(0));
        if (changes.length > 0) {
          callback(changes);
        }
      } catch (error) {
        console.error("[bmad] Error processing watcher changes:", error);
      }
    });

    console.log(`[bmad] File watching started for ${this.resolvedPath}`);
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
      console.log("[bmad] File watching stopped");
    }
  }

  // ===========================================================================
  // Field Mapping
  // ===========================================================================

  mapToSudocode(external: ExternalEntity): {
    spec?: Partial<Spec>;
    issue?: Partial<Issue>;
    relationships?: NonNullable<ExternalEntity["relationships"]>;
  } {
    return mapToSudocode(external);
  }

  mapFromSudocode(entity: Spec | Issue): Partial<ExternalEntity> {
    return mapFromSudocode(entity);
  }

  // ===========================================================================
  // Internal
  // ===========================================================================

  private computeEntityHash(entity: ExternalEntity): string {
    const canonical = JSON.stringify({
      id: entity.id,
      type: entity.type,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
    });
    return createHash("sha256").update(canonical).digest("hex");
  }
}

export default bmadPlugin;
