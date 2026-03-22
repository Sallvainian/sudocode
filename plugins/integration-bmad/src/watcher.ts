/**
 * File Watcher for BMAD Integration
 *
 * Watches the _bmad-output/ directory for changes to BMAD artifacts.
 * Uses content hashing to detect actual changes vs file touches.
 *
 * Watch patterns:
 * - planning-artifacts/*.md — Planning artifact changes
 * - planning-artifacts/epics/*.md — Epic file changes
 * - implementation-artifacts/story-*.md — Story file changes
 * - implementation-artifacts/sprint-status.yaml — Sprint status changes
 * - project-context.md — Project context changes
 *
 * Follows the OpenSpec/Beads watcher pattern:
 * - chokidar for file system events
 * - Content hash comparison to detect real changes
 * - Debounced batch notifications
 * - Anti-oscillation via hash cache updates after writes
 */

import chokidar, { type FSWatcher } from "chokidar";
import * as path from "path";
import { createHash } from "crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import type { ExternalChange, ExternalEntity } from "@sudocode-ai/types";

// =============================================================================
// Types
// =============================================================================

export type ChangeCallback = (changes: ExternalChange[]) => void;

export interface BmadWatcherOptions {
  /** Path to _bmad-output/ directory */
  bmadOutputPath: string;
  /** Debounce interval in milliseconds (default: 150) */
  debounceMs?: number;
}

// =============================================================================
// Watcher
// =============================================================================

/**
 * BmadWatcher monitors the _bmad-output/ directory for changes.
 *
 * Uses content hashing to detect actual changes vs file touches.
 * Prevents false positives from atomic writes and bidirectional sync.
 */
export class BmadWatcher {
  private watcher: FSWatcher | null = null;
  private fileHashes: Map<string, string> = new Map();
  private callback: ChangeCallback | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingChangedFiles: Set<string> = new Set();
  private readonly bmadOutputPath: string;
  private readonly debounceMs: number;

  constructor(options: BmadWatcherOptions) {
    this.bmadOutputPath = options.bmadOutputPath;
    this.debounceMs = options.debounceMs ?? 150;
  }

  /**
   * Start watching for file changes.
   *
   * @param callback - Called with batched changes after debounce
   */
  start(callback: ChangeCallback): void {
    if (this.watcher) {
      console.warn("[bmad] Watcher already started");
      return;
    }

    this.callback = callback;

    // Capture initial file state
    this.captureInitialState();

    // Watch patterns
    const watchPaths = [
      path.join(this.bmadOutputPath, "planning-artifacts", "**", "*.md"),
      path.join(this.bmadOutputPath, "implementation-artifacts", "**", "*.md"),
      path.join(this.bmadOutputPath, "implementation-artifacts", "sprint-status.yaml"),
      path.join(this.bmadOutputPath, "project-context.md"),
    ];

    this.watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
      ignored: [
        /(^|[/\\])\../, // Dotfiles
        /node_modules/,
      ],
    });

    this.watcher
      .on("add", (filePath: string) => this.onFileChanged(filePath))
      .on("change", (filePath: string) => this.onFileChanged(filePath))
      .on("unlink", (filePath: string) => this.onFileDeleted(filePath));

    console.log(`[bmad] Watcher started for ${this.bmadOutputPath}`);
  }

  /**
   * Stop watching.
   */
  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.callback = null;
    this.pendingChangedFiles.clear();
    console.log("[bmad] Watcher stopped");
  }

  /**
   * Update the hash cache for an entity after a write operation.
   * Prevents our own writes from being detected as external changes.
   *
   * @param filePath - The file that was written
   */
  updateFileHash(filePath: string): void {
    if (!existsSync(filePath)) {
      this.fileHashes.delete(filePath);
      return;
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      this.fileHashes.set(filePath, this.computeHash(content));
    } catch {
      // Ignore read errors
    }
  }

  // ===========================================================================
  // Internal
  // ===========================================================================

  private captureInitialState(): void {
    // Scan all files matching our watch patterns
    const dirs = [
      path.join(this.bmadOutputPath, "planning-artifacts"),
      path.join(this.bmadOutputPath, "implementation-artifacts"),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) continue;
      this.scanDirectory(dir);
    }

    // Project context
    const ctxPath = path.join(this.bmadOutputPath, "project-context.md");
    if (existsSync(ctxPath)) {
      try {
        const content = readFileSync(ctxPath, "utf-8");
        this.fileHashes.set(ctxPath, this.computeHash(content));
      } catch {
        // Ignore
      }
    }

    console.log(`[bmad] Captured initial state: ${this.fileHashes.size} files`);
  }

  private scanDirectory(dir: string): void {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.scanDirectory(fullPath);
      } else if (this.isRelevantFile(entry.name)) {
        try {
          const content = readFileSync(fullPath, "utf-8");
          this.fileHashes.set(fullPath, this.computeHash(content));
        } catch {
          // Ignore
        }
      }
    }
  }

  private onFileChanged(filePath: string): void {
    if (!this.isRelevantFile(path.basename(filePath))) return;

    // Check if content actually changed
    try {
      const content = readFileSync(filePath, "utf-8");
      const newHash = this.computeHash(content);
      const oldHash = this.fileHashes.get(filePath);

      if (oldHash === newHash) {
        return; // Content unchanged — skip
      }

      this.fileHashes.set(filePath, newHash);
    } catch {
      return; // File unreadable — skip
    }

    this.pendingChangedFiles.add(filePath);
    this.scheduleBatchNotify();
  }

  private onFileDeleted(filePath: string): void {
    if (!this.isRelevantFile(path.basename(filePath))) return;

    this.fileHashes.delete(filePath);
    this.pendingChangedFiles.add(filePath);
    this.scheduleBatchNotify();
  }

  private scheduleBatchNotify(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.emitChanges();
    }, this.debounceMs);
  }

  private emitChanges(): void {
    if (!this.callback || this.pendingChangedFiles.size === 0) return;

    const changes: ExternalChange[] = [];
    const now = new Date().toISOString();

    for (const filePath of this.pendingChangedFiles) {
      const exists = existsSync(filePath);
      const entityType = this.classifyFile(filePath);

      changes.push({
        entity_id: filePath, // Provider will resolve to actual entity ID
        entity_type: entityType,
        change_type: exists ? "updated" : "deleted",
        timestamp: now,
      });
    }

    this.pendingChangedFiles.clear();

    if (changes.length > 0) {
      console.log(`[bmad] Watcher emitting ${changes.length} change(s)`);
      this.callback(changes);
    }
  }

  private isRelevantFile(filename: string): boolean {
    return (
      filename.endsWith(".md") ||
      filename === "sprint-status.yaml"
    );
  }

  private classifyFile(filePath: string): "spec" | "issue" {
    const rel = path.relative(this.bmadOutputPath, filePath);

    // Stories and epics are issues
    if (rel.match(/story[- ]/i)) return "issue";
    if (rel.match(/epic[- ]?\d/i)) return "issue";

    // Everything else (PRD, architecture, ux-spec, etc.) are specs
    return "spec";
  }

  private computeHash(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }
}
