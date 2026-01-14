import { __name, __require } from './chunk-WCQVDF3K.js';
import * as fs6 from 'fs';
import { existsSync, promises, writeFileSync, renameSync, unlinkSync } from 'fs';
import * as fs3 from 'fs/promises';
import { writeFile, rename, unlink } from 'fs/promises';
import * as path10 from 'path';
import path10__default from 'path';
import * as crypto2__default from 'crypto';
import crypto2__default__default, { createHash, randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import ky from 'ky';
import QuickLRU from 'quick-lru';
import { logger } from '@snapback-oss/infrastructure';
import pRetry, { AbortError } from 'p-retry';
import { z } from 'zod';
import { createSilentLogger, generateSnapshotId as generateSnapshotId$1, generateId as generateId$1 } from '@snapback-oss/contracts';
import { minimatch } from 'minimatch';
import { nanoid } from 'nanoid';
import { exec } from 'child_process';
import { promisify } from 'util';
import { gunzipSync, gzipSync } from 'zlib';

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp(target, "name", {
  value,
  configurable: true
}), "__name");
var __esm = /* @__PURE__ */ __name((fn, res) => /* @__PURE__ */ __name(function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
}, "__init"), "__esm");
var __export = /* @__PURE__ */ __name((target, all2) => {
  for (var name in all2) __defProp(target, name, {
    get: all2[name],
    enumerable: true
  });
}, "__export");
var SessionRecovery_exports = {};
__export(SessionRecovery_exports, {
  SessionRecovery: /* @__PURE__ */ __name(() => SessionRecovery, "SessionRecovery")
});
var SessionRecovery;
var init_SessionRecovery = __esm({
  "src/session/SessionRecovery.ts"() {
    SessionRecovery = class {
      static {
        __name(this, "SessionRecovery");
      }
      static {
        __name2(this, "SessionRecovery");
      }
      workspaceRoot;
      journalDir;
      constructor(workspaceRoot, journalDir = path10.join(workspaceRoot, ".sb_journal")) {
        this.workspaceRoot = workspaceRoot;
        this.journalDir = journalDir;
      }
      /**
      * Recover all pending transactions
      *
      * Call this on startup to ensure workspace consistency after crashes
      */
      async recoverAll() {
        const results = [];
        try {
          const pendingDir = path10.join(this.journalDir, "pending");
          if (!existsSync(pendingDir)) {
            return results;
          }
          const files = await fs3.readdir(pendingDir);
          for (const file of files) {
            if (!file.endsWith(".json")) {
              continue;
            }
            const filePath = path10.join(pendingDir, file);
            try {
              const content = await fs3.readFile(filePath, "utf-8");
              const journal = JSON.parse(content);
              const result = await this.recoverJournal(journal, filePath);
              results.push(result);
            } catch (error) {
              results.push({
                sessionId: path10.basename(file, ".json"),
                status: "failed",
                filesRestored: 0,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
          await this.cleanupOldJournals();
          return results;
        } catch (error) {
          console.error("[SessionRecovery] Failed to recover transactions:", error);
          return results;
        }
      }
      /**
      * Recover a single journal entry
      */
      async recoverJournal(journal, journalPath) {
        const result = {
          sessionId: journal.sessionId,
          status: "cleaned",
          filesRestored: 0
        };
        try {
          const backupExists = await this.checkBackupsExist(journal.backups);
          if (!backupExists) {
            await fs3.unlink(journalPath);
            result.status = "cleaned";
            return result;
          }
          const restoredCount = await this.rollbackFromBackups(journal.backups);
          result.filesRestored = restoredCount;
          result.status = "recovered";
          await fs3.unlink(journalPath);
          this.emitRecoveryTelemetry(journal.sessionId, restoredCount);
          return result;
        } catch (error) {
          result.status = "failed";
          result.error = error instanceof Error ? error.message : String(error);
          console.error(`[SessionRecovery] Failed to recover ${journal.sessionId}:`, error);
          return result;
        }
      }
      /**
      * Check if any backup files exist
      */
      async checkBackupsExist(backups) {
        for (const backup of backups) {
          if (existsSync(backup.backup)) {
            return true;
          }
        }
        return false;
      }
      /**
      * Rollback from per-file backups
      */
      async rollbackFromBackups(backups) {
        let restoredCount = 0;
        for (const { original, backup } of backups) {
          try {
            if (!existsSync(backup)) {
              continue;
            }
            await this.safeRename(backup, original);
            restoredCount++;
            if (existsSync(backup)) {
              await fs3.unlink(backup);
            }
          } catch (error) {
            console.error(`[SessionRecovery] Failed to restore ${original}:`, error);
          }
        }
        return restoredCount;
      }
      /**
      * Safe file rename with EXDEV fallback (cross-device support for Windows)
      */
      async safeRename(src, dst) {
        try {
          await fs3.rename(src, dst);
        } catch (error) {
          if (error.code === "EXDEV") {
            await fs3.copyFile(src, dst);
            await fs3.unlink(src);
          } else {
            throw error;
          }
        }
      }
      /**
      * Cleanup old committed journals (older than 7 days)
      */
      async cleanupOldJournals() {
        try {
          const committedDir = path10.join(this.journalDir, "committed");
          if (!existsSync(committedDir)) {
            return;
          }
          const files = await fs3.readdir(committedDir);
          const now = Date.now();
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1e3;
          for (const file of files) {
            if (!file.endsWith(".json")) {
              continue;
            }
            const filePath = path10.join(committedDir, file);
            try {
              const content = await fs3.readFile(filePath, "utf-8");
              const journal = JSON.parse(content);
              if (now - journal.timestamp > sevenDaysMs) {
                await fs3.unlink(filePath);
              }
            } catch {
            }
          }
        } catch {
        }
      }
      /**
      * Emit recovery telemetry (privacy-safe: no file paths)
      */
      emitRecoveryTelemetry(_sessionId, _filesRestored) {
      }
      /**
      * Manual recovery: Get list of pending journals
      */
      async listPendingJournals() {
        const pendingDir = path10.join(this.journalDir, "pending");
        try {
          if (!existsSync(pendingDir)) {
            return [];
          }
          const files = await fs3.readdir(pendingDir);
          const journals = [];
          for (const file of files) {
            if (!file.endsWith(".json")) {
              continue;
            }
            const filePath = path10.join(pendingDir, file);
            const content = await fs3.readFile(filePath, "utf-8");
            const journal = JSON.parse(content);
            journals.push(journal);
          }
          return journals;
        } catch {
          return [];
        }
      }
      /**
      * Manual recovery: Force recover a specific journal
      */
      async recoverJournalById(sessionId) {
        const journalPath = path10.join(this.journalDir, "pending", `${sessionId}.json`);
        if (!existsSync(journalPath)) {
          return {
            sessionId,
            status: "failed",
            filesRestored: 0,
            error: "Journal not found"
          };
        }
        const content = await fs3.readFile(journalPath, "utf-8");
        const journal = JSON.parse(content);
        return this.recoverJournal(journal, journalPath);
      }
      /**
      * Manual recovery: Delete a specific journal without recovery
      */
      async deleteJournal(sessionId) {
        const pendingPath = path10.join(this.journalDir, "pending", `${sessionId}.json`);
        const committedPath = path10.join(this.journalDir, "committed", `${sessionId}.json`);
        if (existsSync(pendingPath)) {
          await fs3.unlink(pendingPath);
        }
        if (existsSync(committedPath)) {
          await fs3.unlink(committedPath);
        }
      }
      /**
      * Cleanup all orphaned backup files (.bak-* files)
      */
      async cleanupOrphanedBackups() {
        let cleanedCount = 0;
        try {
          const orphanedBackups = await this.findOrphanedBackups(this.workspaceRoot);
          for (const backupPath of orphanedBackups) {
            try {
              await fs3.unlink(backupPath);
              cleanedCount++;
            } catch {
            }
          }
          return cleanedCount;
        } catch {
          return cleanedCount;
        }
      }
      /**
      * Find orphaned backup files (*.bak-* pattern)
      */
      async findOrphanedBackups(dir) {
        const backups = [];
        try {
          const entries = await fs3.readdir(dir, {
            withFileTypes: true
          });
          for (const entry of entries) {
            const fullPath = path10.join(dir, entry.name);
            if (entry.isDirectory()) {
              if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist" || entry.name === "build") {
                continue;
              }
              const subBackups = await this.findOrphanedBackups(fullPath);
              backups.push(...subBackups);
            } else if (entry.name.includes(".bak-")) {
              backups.push(fullPath);
            }
          }
        } catch {
        }
        return backups;
      }
    };
  }
});
var SessionRollback_exports = {};
__export(SessionRollback_exports, {
  SessionRollback: /* @__PURE__ */ __name(() => SessionRollback, "SessionRollback")
});
var SessionRollback;
var init_SessionRollback = __esm({
  "src/session/SessionRollback.ts"() {
    SessionRollback = class {
      static {
        __name(this, "SessionRollback");
      }
      static {
        __name2(this, "SessionRollback");
      }
      workspaceRoot;
      blobStore;
      journalDir;
      constructor(workspaceRoot, blobStore, journalDir) {
        this.workspaceRoot = workspaceRoot;
        this.blobStore = blobStore;
        this.journalDir = journalDir ?? path10.join(workspaceRoot, ".sb_journal");
      }
      /**
      * Rollback a session to its starting state
      */
      async rollback(manifest, options) {
        const startTime = performance.now();
        const result = {
          success: false,
          filesReverted: [],
          filesSkipped: [],
          errors: []
        };
        try {
          await fs3.mkdir(path10.join(this.journalDir, "pending"), {
            recursive: true
          });
          await fs3.mkdir(path10.join(this.journalDir, "committed"), {
            recursive: true
          });
          const journalPath = path10.join(this.journalDir, "pending", `${manifest.sessionId}.json`);
          const journal = {
            sessionId: manifest.sessionId,
            timestamp: Date.now(),
            workspaceRoot: this.workspaceRoot,
            changes: manifest.filesChanged,
            backups: [],
            status: "pending"
          };
          await fs3.writeFile(journalPath, JSON.stringify(journal, null, 2));
          result.journalPath = journalPath;
          options?.onProgress?.(10);
          const reversedChanges = this.reverseChanges(manifest.filesChanged);
          const stagingDir = path10.join(this.workspaceRoot, `.snapback-rollback-${manifest.sessionId}`);
          await fs3.mkdir(stagingDir, {
            recursive: true
          });
          const deletedDir = path10.join(stagingDir, ".deleted");
          await fs3.mkdir(deletedDir, {
            recursive: true
          });
          const stagedFiles = /* @__PURE__ */ new Map();
          const filesToDelete = /* @__PURE__ */ new Set();
          for (let i = 0; i < reversedChanges.length; i++) {
            const change = reversedChanges[i];
            options?.onProgress?.(10 + i / reversedChanges.length * 40);
            try {
              await this.stageChange(change, stagingDir, stagedFiles, filesToDelete, result);
            } catch (error) {
              result.filesSkipped.push(change.p);
              result.errors.push({
                path: change.p,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
          options?.onProgress?.(50);
          if (!options?.skipVerification) {
            const validationErrors = await this.validateStaging(stagedFiles);
            if (validationErrors.length > 0) {
              for (const error of validationErrors) {
                result.errors.push(error);
                result.filesSkipped.push(error.path);
              }
              await this.cleanupStaging(stagingDir);
              journal.status = "rolled-back";
              await fs3.writeFile(journalPath, JSON.stringify(journal, null, 2));
              return result;
            }
          }
          options?.onProgress?.(60);
          if (options?.dryRun) {
            result.success = true;
            result.filesReverted = Array.from(stagedFiles.keys());
            await this.cleanupStaging(stagingDir);
            await fs3.unlink(journalPath);
            return result;
          }
          const swapResult = await this.atomicSwap(stagedFiles, filesToDelete, journal, manifest.sessionId, options);
          result.filesReverted = swapResult.reverted;
          result.filesSkipped.push(...swapResult.skipped);
          result.errors.push(...swapResult.errors);
          result.success = swapResult.success;
          options?.onProgress?.(90);
          if (swapResult.success) {
            journal.status = "committed";
            await fs3.writeFile(path10.join(this.journalDir, "committed", `${manifest.sessionId}.json`), JSON.stringify(journal, null, 2));
            await fs3.unlink(journalPath);
            for (const backup of journal.backups) {
              if (existsSync(backup.backup)) {
                await fs3.unlink(backup.backup);
              }
            }
          } else {
            journal.status = "pending";
            await fs3.writeFile(journalPath, JSON.stringify(journal, null, 2));
          }
          await this.cleanupStaging(stagingDir);
          options?.onProgress?.(100);
          const duration = performance.now() - startTime;
          console.log(`[SessionRollback] rollback() took ${duration.toFixed(0)}ms (sessionId=${manifest.sessionId}, reverted=${result.filesReverted.length}, skipped=${result.filesSkipped.length})`);
          return result;
        } catch (error) {
          result.errors.push({
            path: "<session>",
            error: `Rollback failed: ${error instanceof Error ? error.message : String(error)}`
          });
          return result;
        }
      }
      /**
      * Reverse changes to get inverse operations
      */
      reverseChanges(changes) {
        const reversed = [
          ...changes
        ].reverse();
        return reversed.map((change) => {
          const inversed = {
            ...change
          };
          switch (change.op) {
            case "created":
              inversed.op = "deleted";
              inversed.hOld = change.hNew;
              inversed.hNew = void 0;
              break;
            case "modified":
              inversed.hOld = change.hNew;
              inversed.hNew = change.hOld;
              inversed.sizeBefore = change.sizeAfter;
              inversed.sizeAfter = change.sizeBefore;
              inversed.mtimeBefore = change.mtimeAfter;
              inversed.mtimeAfter = change.mtimeBefore;
              inversed.modeBefore = change.modeAfter;
              inversed.modeAfter = change.modeBefore;
              inversed.eolBefore = change.eolAfter;
              inversed.eolAfter = change.eolBefore;
              break;
            case "deleted":
              inversed.op = "created";
              inversed.hNew = change.hOld;
              inversed.hOld = void 0;
              break;
            case "renamed": {
              const temp = inversed.p;
              inversed.p = change.from || change.p;
              inversed.from = temp;
              inversed.hOld = change.hNew;
              inversed.hNew = change.hOld;
              break;
            }
          }
          return inversed;
        });
      }
      /**
      * Stage a change for rollback
      */
      async stageChange(change, stagingDir, stagedFiles, filesToDelete, _result) {
        path10.join(this.workspaceRoot, change.p);
        const stagingPath = path10.join(stagingDir, change.p);
        if (change.op === "deleted") {
          filesToDelete.add(change.p);
          return;
        }
        const hash = change.hNew;
        if (!hash) {
          throw new Error(`Missing hash for ${change.op} operation on ${change.p}`);
        }
        const blobResult = await this.blobStore.get(hash);
        if (!blobResult.ok) {
          throw new Error(`Failed to retrieve blob ${hash}: ${blobResult.error.message}`);
        }
        const content = blobResult.value;
        if (!content) {
          throw new Error(`Blob not found: ${hash}`);
        }
        await fs3.mkdir(path10.dirname(stagingPath), {
          recursive: true
        });
        await fs3.writeFile(stagingPath, content);
        if (change.mtimeAfter) {
          const mtimeDate = new Date(change.mtimeAfter);
          await fs3.utimes(stagingPath, mtimeDate, mtimeDate);
        }
        if (change.modeAfter && process.platform !== "win32") {
          await fs3.chmod(stagingPath, change.modeAfter);
        }
        stagedFiles.set(change.p, {
          hash,
          content
        });
      }
      /**
      * Validate staging directory (verify hashes)
      */
      async validateStaging(stagedFiles) {
        const errors = [];
        for (const [filePath, { hash, content }] of stagedFiles.entries()) {
          const computedHash = createHash("sha256").update(content).digest("hex");
          if (computedHash !== hash) {
            errors.push({
              path: filePath,
              error: `Hash mismatch: expected ${hash}, got ${computedHash}`
            });
          }
        }
        return errors;
      }
      /**
      * Perform per-file atomic swap
      */
      async atomicSwap(stagedFiles, filesToDelete, journal, sessionId, options) {
        const reverted = [];
        const skipped = [];
        const errors = [];
        try {
          let processed = 0;
          const total = stagedFiles.size + filesToDelete.size;
          for (const [relPath] of stagedFiles.entries()) {
            processed++;
            options?.onProgress?.(60 + processed / total * 30);
            const absPath = path10.join(this.workspaceRoot, relPath);
            const stagingPath = path10.join(this.workspaceRoot, `.snapback-rollback-${sessionId}`, relPath);
            const backupPath = `${absPath}.bak-${sessionId}`;
            try {
              if (existsSync(absPath)) {
                await this.safeRename(absPath, backupPath);
                journal.backups.push({
                  original: absPath,
                  backup: backupPath
                });
              }
              await this.safeRename(stagingPath, absPath);
              reverted.push(relPath);
            } catch (error) {
              skipped.push(relPath);
              errors.push({
                path: relPath,
                error: error instanceof Error ? error.message : String(error)
              });
              if (existsSync(backupPath)) {
                await this.safeRename(backupPath, absPath);
              }
            }
          }
          for (const relPath of filesToDelete) {
            processed++;
            options?.onProgress?.(60 + processed / total * 30);
            const absPath = path10.join(this.workspaceRoot, relPath);
            const backupPath = `${absPath}.bak-${sessionId}`;
            try {
              if (existsSync(absPath)) {
                await this.safeRename(absPath, backupPath);
                journal.backups.push({
                  original: absPath,
                  backup: backupPath
                });
                reverted.push(relPath);
              } else {
                skipped.push(relPath);
              }
            } catch (error) {
              skipped.push(relPath);
              errors.push({
                path: relPath,
                error: error instanceof Error ? error.message : String(error)
              });
              if (existsSync(backupPath)) {
                await this.safeRename(backupPath, absPath);
              }
            }
          }
          return {
            success: errors.length === 0,
            reverted,
            skipped,
            errors
          };
        } catch (error) {
          for (const backup of journal.backups) {
            if (existsSync(backup.backup)) {
              try {
                await this.safeRename(backup.backup, backup.original);
              } catch {
              }
            }
          }
          return {
            success: false,
            reverted,
            skipped,
            errors: [
              {
                path: "<session>",
                error: `Fatal error during swap: ${error instanceof Error ? error.message : String(error)}`
              },
              ...errors
            ]
          };
        }
      }
      /**
      * Safe file rename with EXDEV fallback (cross-device support for Windows)
      */
      async safeRename(src, dst) {
        try {
          await fs3.rename(src, dst);
        } catch (error) {
          if (error.code === "EXDEV") {
            await fs3.copyFile(src, dst);
            await fs3.unlink(src);
          } else {
            throw error;
          }
        }
      }
      /**
      * Clean up staging directory
      */
      async cleanupStaging(stagingDir) {
        try {
          if (existsSync(stagingDir)) {
            await fs3.rm(stagingDir, {
              recursive: true,
              force: true
            });
          }
        } catch {
        }
      }
      /**
      * Get pending journal entries (for recovery)
      */
      async getPendingJournals() {
        const pendingDir = path10.join(this.journalDir, "pending");
        try {
          if (!existsSync(pendingDir)) {
            return [];
          }
          const files = await fs3.readdir(pendingDir);
          const journals = [];
          for (const file of files) {
            if (!file.endsWith(".json")) {
              continue;
            }
            const filePath = path10.join(pendingDir, file);
            const content = await fs3.readFile(filePath, "utf-8");
            const journal = JSON.parse(content);
            journals.push(journal);
          }
          return journals;
        } catch {
          return [];
        }
      }
    };
  }
});
var FileChangeAnalyzer = class {
  static {
    __name(this, "FileChangeAnalyzer");
  }
  static {
    __name2(this, "FileChangeAnalyzer");
  }
  workspaceRoot;
  fileSystem;
  /**
  * Creates a new FileChangeAnalyzer
  *
  * @param workspaceRoot - Root directory of the workspace
  * @param fileSystem - File system provider for platform-specific operations
  */
  constructor(workspaceRoot, fileSystem) {
    this.workspaceRoot = workspaceRoot;
    this.fileSystem = fileSystem;
  }
  /**
  * Analyzes all files in a snapshot and compares with current state
  *
  * @param snapshotFiles - Map of relative file paths to snapshot content
  * @returns Promise that resolves to array of file changes with detailed analysis
  */
  async analyzeSnapshot(snapshotFiles) {
    const changes = [];
    for (const [relativePath, snapshotContent] of Object.entries(snapshotFiles)) {
      try {
        const absolutePath = `${this.workspaceRoot}/${relativePath}`;
        const change = await this.analyzeFile(absolutePath, snapshotContent);
        changes.push(change);
      } catch (_error) {
        changes.push({
          filePath: `${this.workspaceRoot}/${relativePath}`,
          relativePath,
          fileName: this.getFileName(relativePath),
          changeType: "unchanged",
          linesAdded: 0,
          linesDeleted: 0,
          snapshotContent,
          icon: "error",
          changeSummary: "Error analyzing changes"
        });
      }
    }
    const typePriority = {
      modified: 0,
      deleted: 1,
      added: 2,
      unchanged: 3
    };
    return changes.sort((a, b) => {
      const priorityDiff = typePriority[a.changeType] - typePriority[b.changeType];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return a.fileName.localeCompare(b.fileName);
    });
  }
  /**
  * Analyzes a single file's changes
  *
  * @param absoluteFilePath - Absolute file path
  * @param snapshotContent - Content from snapshot
  * @returns Promise that resolves to detailed file change information
  */
  async analyzeFile(absoluteFilePath, snapshotContent) {
    const relativePath = this.fileSystem.getRelativePath(this.workspaceRoot, absoluteFilePath);
    const fileName = this.getFileName(relativePath);
    const fileExists = await this.fileSystem.fileExists(absoluteFilePath);
    let currentContent;
    if (fileExists) {
      currentContent = await this.fileSystem.readFile(absoluteFilePath);
    }
    let changeType;
    let icon;
    let changeSummary;
    let linesAdded = 0;
    let linesDeleted = 0;
    if (!fileExists) {
      changeType = "deleted";
      icon = "diff-removed";
      const lineCount = snapshotContent.split("\n").length;
      linesDeleted = lineCount;
      changeSummary = `Deleted (${lineCount} lines)`;
    } else if (currentContent === snapshotContent) {
      changeType = "unchanged";
      icon = "circle-outline";
      changeSummary = "No changes";
    } else {
      if (!currentContent) {
        throw new Error("Unexpected: currentContent is undefined for existing file");
      }
      changeType = "modified";
      icon = "diff-modified";
      const stats = this.calculateDiffStats(snapshotContent, currentContent);
      linesAdded = stats.added;
      linesDeleted = stats.deleted;
      if (linesAdded === 0 && linesDeleted === 0) {
        changeSummary = "Modified (whitespace only)";
      } else if (linesAdded > 0 && linesDeleted > 0) {
        changeSummary = `+${linesAdded} -${linesDeleted}`;
      } else if (linesAdded > 0) {
        changeSummary = `+${linesAdded}`;
      } else {
        changeSummary = `-${linesDeleted}`;
      }
    }
    return {
      filePath: absoluteFilePath,
      relativePath,
      fileName,
      changeType,
      linesAdded,
      linesDeleted,
      snapshotContent,
      currentContent,
      icon,
      changeSummary
    };
  }
  /**
  * Calculates simple diff statistics between two file contents
  *
  * Uses line-based comparison to estimate additions and deletions.
  * This is a simplified diff algorithm suitable for UI display.
  *
  * @param oldContent - Original content (snapshot)
  * @param newContent - Current content
  * @returns Object with added and deleted line counts
  */
  calculateDiffStats(oldContent, newContent) {
    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");
    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);
    let added = 0;
    let deleted = 0;
    for (const line of newLines) {
      if (!oldSet.has(line)) {
        added++;
      }
    }
    for (const line of oldLines) {
      if (!newSet.has(line)) {
        deleted++;
      }
    }
    return {
      added,
      deleted
    };
  }
  /**
  * Extract file name from path
  *
  * @param filePath - File path
  * @returns File name only
  */
  getFileName(filePath) {
    const parts = filePath.split("/");
    return parts[parts.length - 1] || filePath;
  }
};
function createChangeSummary(changes) {
  const modifiedCount = changes.filter((c) => c.changeType === "modified").length;
  const addedCount = changes.filter((c) => c.changeType === "added").length;
  const deletedCount = changes.filter((c) => c.changeType === "deleted").length;
  const unchangedCount = changes.filter((c) => c.changeType === "unchanged").length;
  const parts = [];
  if (modifiedCount > 0) {
    parts.push(`${modifiedCount} modified`);
  }
  if (deletedCount > 0) {
    parts.push(`${deletedCount} deleted`);
  }
  if (addedCount > 0) {
    parts.push(`${addedCount} added`);
  }
  if (unchangedCount > 0 && parts.length === 0) {
    parts.push(`${unchangedCount} unchanged`);
  }
  return parts.join(", ");
}
__name(createChangeSummary, "createChangeSummary");
__name2(createChangeSummary, "createChangeSummary");
var DEFAULT_THRESHOLDS_FROZEN = Object.freeze({
  /**
  * Session lifecycle thresholds
  */
  session: Object.freeze({
    idleTimeout: 105e3,
    minSessionDuration: 5e3,
    maxSessionDuration: 36e5
  }),
  /**
  * Burst detection thresholds
  */
  burst: Object.freeze({
    timeWindow: 5e3,
    minCharsInserted: 100,
    maxKeystrokeInterval: 200,
    minLinesAffected: 3,
    minInsertDeleteRatio: 3
  }),
  /**
  * Experience tier thresholds
  */
  experience: Object.freeze({
    explorer: Object.freeze({
      snapshotsCreated: 5,
      sessionsRecorded: 3,
      protectedFiles: 2,
      manualRestores: 1,
      aiAssistedSessions: 0,
      daysSinceFirstUse: 7,
      commandDiversity: 0.3
    }),
    intermediate: Object.freeze({
      snapshotsCreated: 20,
      sessionsRecorded: 10,
      protectedFiles: 5,
      manualRestores: 5,
      aiAssistedSessions: 2,
      daysSinceFirstUse: 30,
      commandDiversity: 0.6
    }),
    power: Object.freeze({
      snapshotsCreated: 100,
      sessionsRecorded: 50,
      protectedFiles: 20,
      manualRestores: 20,
      aiAssistedSessions: 10,
      daysSinceFirstUse: 90,
      commandDiversity: 0.9
    })
  }),
  /**
  * Session tagging thresholds
  */
  tagging: Object.freeze({
    minBurstConfidence: 0.7,
    minLongSessionDuration: 18e5,
    maxShortSessionDuration: 3e4,
    minLargeEditLines: 1e3,
    normalization: Object.freeze({
      multiFileThreshold: 5,
      multiFileNormalization: 10,
      longSessionNormalization: 72e5,
      largeEditsNormalization: 5e3
    })
  }),
  /**
  * Risk analysis thresholds
  */
  risk: Object.freeze({
    blockingThreshold: 8,
    criticalThreshold: 7,
    highThreshold: 5,
    mediumThreshold: 3
  }),
  /**
  * Security pattern scores (0-10 scale)
  */
  securityScores: Object.freeze({
    evalUsage: 4,
    functionConstructor: 4,
    dangerousHtml: 3,
    execCommand: 5,
    sqlConcat: 6,
    hardcodedSecrets: 4,
    weakCrypto: 3
  }),
  /**
  * Detection thresholds
  */
  detection: Object.freeze({
    entropyThreshold: 2.5,
    typosquattingDistance: 3
  }),
  /**
  * Protection level thresholds
  */
  protection: Object.freeze({
    protectedCooldown: 6e5,
    otherCooldown: 3e5,
    debounceWindow: 5e3
  }),
  /**
  * Resource limits
  */
  resources: Object.freeze({
    dedupCacheSize: 500,
    snapshotMaxFiles: 1e4,
    snapshotMaxFileSize: 10 * 1024 * 1024,
    snapshotMaxTotalSize: 500 * 1024 * 1024,
    diffHaloSize: 3,
    trialSnapshotLimit: 50,
    freeMonthlyLimit: 100
  }),
  /**
  * Quality of Service thresholds
  */
  qos: Object.freeze({
    rateLimitCapacity: 100,
    rateLimitRefill: 6e4,
    eventBusTimeout: 5e3,
    eventBusMaxRetries: 3,
    errorBudgetHard: 0.01,
    errorBudgetWarn: 5e-3,
    batchMax: 10,
    batchIntervalMs: 1e3,
    retryBaseMs: 100,
    retryMaxMs: 5e3,
    maxQueueSize: 1e3,
    httpTimeout: 3e4
  }),
  /**
  * Documentation for threshold values
  */
  docs: Object.freeze({
    session: Object.freeze({
      idleTimeout: "Duration of inactivity before automatically finalizing a session",
      minSessionDuration: "Minimum duration required for a session to be considered valid",
      maxSessionDuration: "Maximum duration before automatically finalizing a long-running session"
    }),
    burst: Object.freeze({
      timeWindow: "Time window to analyze for burst patterns (rapid insertions)",
      minCharsInserted: "Minimum characters inserted within time window to qualify as burst",
      maxKeystrokeInterval: "Maximum time between consecutive keystrokes to qualify as burst",
      minLinesAffected: "Minimum number of lines changed to qualify as burst",
      minInsertDeleteRatio: "Minimum ratio of inserted to deleted characters (e.g., 3:1 means 3x more insertions)"
    }),
    experience: Object.freeze({
      description: "Thresholds for classifying users into experience tiers based on usage patterns. Users must meet ALL thresholds within a tier to qualify.",
      explorer: "New users getting started with SnapBack (low activity)",
      intermediate: "Regular users with moderate experience (consistent usage)",
      power: "Advanced users who leverage many features (high engagement)"
    }),
    tagging: Object.freeze({
      description: "Thresholds for automatically tagging sessions based on detected patterns and characteristics",
      minBurstConfidence: "Minimum confidence level (0-1) required to tag session as having burst patterns",
      minLongSessionDuration: "Minimum duration to classify and tag a session as 'long-session'",
      maxShortSessionDuration: "Maximum duration to classify and tag a session as 'short-session'",
      minLargeEditLines: "Minimum lines added to classify and tag a session as having 'large-edits'"
    }),
    risk: Object.freeze({
      description: "Risk thresholds for security analysis and blocking operations",
      blockingThreshold: "Score above which operations are blocked (0-10 scale)",
      criticalThreshold: "Threshold for critical severity classification",
      highThreshold: "Threshold for high severity classification",
      mediumThreshold: "Threshold for medium severity classification"
    }),
    detection: Object.freeze({
      entropyThreshold: "Shannon entropy threshold (bits per symbol) for detecting potential secrets and high-entropy strings",
      typosquattingDistance: "Maximum Levenshtein distance for detecting potential typosquatting in dependency names"
    }),
    protection: Object.freeze({
      protectedCooldown: "Cooldown period after saving protected files before next protection check",
      otherCooldown: "Cooldown period for warn and watch protection levels",
      debounceWindow: "Debounce window to prevent rapid-fire protection checks"
    }),
    resources: Object.freeze({
      dedupCacheSize: "Maximum number of entries in the deduplication cache (FIFO eviction)",
      snapshotMaxFiles: "Maximum number of files allowed in a single snapshot operation",
      diffHaloSize: "Number of context lines to include around changed regions in diffs"
    }),
    qos: Object.freeze({
      rateLimitCapacity: "Token bucket capacity for rate limiting API requests",
      errorBudgetHard: "Hard error rate threshold triggering alerts and degradation (1% = 0.01)",
      batchMax: "Maximum number of items to batch together before flushing",
      batchIntervalMs: "Time interval to wait before auto-flushing a batch (milliseconds)",
      retryBaseMs: "Base delay for exponential backoff retry logic (milliseconds)",
      retryMaxMs: "Maximum delay cap for exponential backoff retries (milliseconds)",
      maxQueueSize: "Maximum queue size before dropping new items to prevent memory overflow",
      httpTimeout: "HTTP request timeout for QoS API calls (milliseconds)"
    })
  })
});
var DEFAULT_THRESHOLDS = DEFAULT_THRESHOLDS_FROZEN;
var THRESHOLDS = structuredClone(DEFAULT_THRESHOLDS_FROZEN);
function createThresholds(overrides) {
  return {
    session: {
      ...THRESHOLDS.session,
      ...overrides?.session
    },
    burst: {
      ...THRESHOLDS.burst,
      ...overrides?.burst
    },
    experience: {
      explorer: {
        ...THRESHOLDS.experience.explorer,
        ...overrides?.experience?.explorer
      },
      intermediate: {
        ...THRESHOLDS.experience.intermediate,
        ...overrides?.experience?.intermediate
      },
      power: {
        ...THRESHOLDS.experience.power,
        ...overrides?.experience?.power
      }
    },
    tagging: {
      ...THRESHOLDS.tagging,
      ...overrides?.tagging,
      normalization: {
        ...THRESHOLDS.tagging.normalization,
        ...overrides?.tagging?.normalization
      }
    },
    risk: {
      ...THRESHOLDS.risk,
      ...overrides?.risk
    },
    securityScores: {
      ...THRESHOLDS.securityScores,
      ...overrides?.securityScores
    },
    detection: {
      ...THRESHOLDS.detection,
      ...overrides?.detection
    },
    protection: {
      ...THRESHOLDS.protection,
      ...overrides?.protection
    },
    resources: {
      ...THRESHOLDS.resources,
      ...overrides?.resources
    },
    qos: {
      ...THRESHOLDS.qos,
      ...overrides?.qos
    },
    docs: THRESHOLDS.docs
  };
}
__name(createThresholds, "createThresholds");
__name2(createThresholds, "createThresholds");
function updateThresholds(overrides) {
  const updated = createThresholds(overrides);
  Object.assign(THRESHOLDS, updated);
}
__name(updateThresholds, "updateThresholds");
__name2(updateThresholds, "updateThresholds");
function resetThresholds() {
  Object.assign(THRESHOLDS, DEFAULT_THRESHOLDS);
}
__name(resetThresholds, "resetThresholds");
__name2(resetThresholds, "resetThresholds");
var DEFAULT_RISK_THRESHOLDS = {
  blockingThreshold: THRESHOLDS.risk.blockingThreshold,
  criticalThreshold: THRESHOLDS.risk.criticalThreshold,
  highThreshold: THRESHOLDS.risk.highThreshold,
  mediumThreshold: THRESHOLDS.risk.mediumThreshold
};
var SECURITY_PATTERNS = [
  {
    name: "eval_usage",
    pattern: /\beval\s*\(/g,
    score: THRESHOLDS.securityScores.evalUsage,
    message: "eval() usage detected - high security risk",
    recommendation: "Avoid using eval() as it can execute arbitrary code. Use safer alternatives like JSON.parse() for data or explicit function calls."
  },
  {
    name: "function_constructor",
    pattern: /\bnew\s+Function\s*\(/g,
    score: THRESHOLDS.securityScores.functionConstructor,
    message: "Function constructor usage detected - high security risk",
    recommendation: "Avoid using Function constructor as it can execute arbitrary code. Use regular function declarations instead."
  },
  {
    name: "dangerous_html",
    pattern: /\binnerHTML\s*=/g,
    score: THRESHOLDS.securityScores.dangerousHtml,
    message: "innerHTML usage detected - XSS risk",
    recommendation: "Use textContent or safer DOM manipulation methods to prevent XSS attacks. If HTML is necessary, sanitize it first."
  },
  {
    name: "exec_command",
    pattern: /\bexec\s*\(/g,
    score: THRESHOLDS.securityScores.execCommand,
    message: "exec() usage detected - command injection risk",
    recommendation: "Avoid using exec(). If shell commands are necessary, use execFile() with hardcoded command paths and validate all inputs."
  },
  {
    name: "sql_concat",
    pattern: /SELECT\s+.+\+\s*['"]/gi,
    score: THRESHOLDS.securityScores.sqlConcat,
    message: "Potential SQL injection through string concatenation",
    recommendation: "Use parameterized queries or prepared statements to prevent SQL injection attacks."
  },
  {
    name: "hardcoded_secrets",
    pattern: /(password|secret|api[_-]?key|token)\s*=\s*['"][^'"]+['"]/gi,
    score: THRESHOLDS.securityScores.hardcodedSecrets,
    message: "Potential hardcoded secret detected",
    recommendation: "Store secrets in environment variables or secure secret management systems, never in source code."
  },
  {
    name: "weak_crypto",
    pattern: /\b(MD5|SHA1)\b/gi,
    score: THRESHOLDS.securityScores.weakCrypto,
    message: "Weak cryptographic algorithm detected",
    recommendation: "Use modern algorithms like SHA-256 or bcrypt for hashing, and AES-256 for encryption."
  }
];
var RiskAnalyzer = class {
  static {
    __name(this, "RiskAnalyzer");
  }
  static {
    __name2(this, "RiskAnalyzer");
  }
  thresholds;
  customPatterns = [];
  /**
  * Creates a new RiskAnalyzer
  *
  * @param thresholds - Custom threshold configuration (optional)
  */
  constructor(thresholds) {
    this.thresholds = {
      ...DEFAULT_RISK_THRESHOLDS,
      ...thresholds
    };
  }
  /**
  * Add a custom security pattern for detection
  *
  * @param pattern - Security pattern to add
  */
  addPattern(pattern) {
    this.customPatterns.push(pattern);
  }
  /**
  * Analyze content for security risks
  *
  * @param content - Code content to analyze
  * @param filePath - Path to the file (for context, optional)
  * @returns Analysis result with risk score and factors
  */
  analyze(content, _filePath) {
    const factors = [];
    const recommendations = [];
    let totalScore = 0;
    const allPatterns = [
      ...SECURITY_PATTERNS,
      ...this.customPatterns
    ];
    for (const pattern of allPatterns) {
      const matches = content.matchAll(pattern.pattern);
      for (const match2 of matches) {
        factors.push({
          type: pattern.name,
          message: pattern.message,
          line: this.getLineNumber(content, match2.index || 0)
        });
        if (!recommendations.includes(pattern.recommendation)) {
          recommendations.push(pattern.recommendation);
        }
        totalScore += pattern.score;
      }
    }
    const cappedScore = Math.min(totalScore, 10);
    const severity = this.calculateSeverity(cappedScore);
    return {
      score: cappedScore,
      severity,
      factors,
      recommendations
    };
  }
  /**
  * Check if a risk score should block a save operation
  *
  * @param score - Risk score to check
  * @returns True if score exceeds blocking threshold
  */
  shouldBlock(score) {
    return score > this.thresholds.blockingThreshold;
  }
  /**
  * Calculate severity based on risk score
  *
  * @param score - Risk score (0-10)
  * @returns Severity classification
  */
  calculateSeverity(score) {
    if (score >= this.thresholds.criticalThreshold) {
      return "critical";
    }
    if (score >= this.thresholds.highThreshold) {
      return "high";
    }
    if (score >= this.thresholds.mediumThreshold) {
      return "medium";
    }
    return "low";
  }
  /**
  * Get line number from character index
  *
  * @param content - Full content string
  * @param index - Character index
  * @returns Line number (1-indexed)
  */
  getLineNumber(content, index) {
    const lines = content.substring(0, index).split("\n");
    return lines.length;
  }
  /**
  * Get current thresholds
  *
  * @returns Current threshold configuration
  */
  getThresholds() {
    return {
      ...this.thresholds
    };
  }
  /**
  * Update thresholds
  *
  * @param thresholds - New threshold values
  */
  setThresholds(thresholds) {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds
    };
  }
};
var globalConfig = {
  env: process.env.NODE_ENV || "development",
  includeStack: true
};
var violationCounts = /* @__PURE__ */ new Map();
var consoleReporter = {
  report(violation) {
    console.error(`[INVARIANT VIOLATION] ${violation.invariantId}: ${violation.message}`);
    if (violation.file) {
      console.error(`  at ${violation.file}${violation.line ? `:${violation.line}` : ""}`);
    }
    if (violation.context) {
      console.error("  context:", violation.context);
    }
  }
};
function configureInvariant(config) {
  globalConfig = {
    ...globalConfig,
    ...config
  };
}
__name(configureInvariant, "configureInvariant");
__name2(configureInvariant, "configureInvariant");
function getInvariantConfig() {
  return {
    ...globalConfig
  };
}
__name(getInvariantConfig, "getInvariantConfig");
__name2(getInvariantConfig, "getInvariantConfig");
function resetViolationCounts() {
  violationCounts.clear();
}
__name(resetViolationCounts, "resetViolationCounts");
__name2(resetViolationCounts, "resetViolationCounts");
function getViolationCounts() {
  return new Map(violationCounts);
}
__name(getViolationCounts, "getViolationCounts");
__name2(getViolationCounts, "getViolationCounts");
function invariant(condition, invariantId, message, context) {
  if (condition) {
    return;
  }
  const count = (violationCounts.get(invariantId) || 0) + 1;
  violationCounts.set(invariantId, count);
  const violation = {
    invariantId,
    message,
    context,
    timestamp: Date.now()
  };
  if (globalConfig.includeStack) {
    const err2 = new Error();
    violation.stack = err2.stack;
    const stackLines = err2.stack?.split("\n") || [];
    const callerLine = stackLines[2];
    const match2 = callerLine?.match(/at\s+(?:.+?\s+)?\(?(.+?):(\d+):\d+\)?/);
    if (match2) {
      violation.file = match2[1];
      violation.line = Number.parseInt(match2[2], 10);
    }
  }
  const reporter = globalConfig.reporter || consoleReporter;
  reporter.report(violation);
  if (globalConfig.env === "development" || globalConfig.env === "test") {
    const err2 = new Error(`Invariant violation [${invariantId}]: ${message}`);
    err2.name = "InvariantError";
    throw err2;
  }
}
__name(invariant, "invariant");
__name2(invariant, "invariant");
function softInvariant(condition, invariantId, message, context) {
  if (condition) {
    return true;
  }
  const count = (violationCounts.get(invariantId) || 0) + 1;
  violationCounts.set(invariantId, count);
  const violation = {
    invariantId,
    message: `[SOFT] ${message}`,
    context,
    timestamp: Date.now()
  };
  const reporter = globalConfig.reporter || consoleReporter;
  reporter.report(violation);
  return false;
}
__name(softInvariant, "softInvariant");
__name2(softInvariant, "softInvariant");
function typeInvariant(value, guard, invariantId, message, context) {
  invariant(guard(value), invariantId, message, {
    ...context,
    actualType: typeof value,
    actualValue: value
  });
}
__name(typeInvariant, "typeInvariant");
__name2(typeInvariant, "typeInvariant");
function createScopedInvariant(scope) {
  return /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function scopedInvariant(condition, id, message, context) {
    invariant(condition, `${scope}:${id}`, message, context);
  }, "scopedInvariant"), "scopedInvariant");
}
__name(createScopedInvariant, "createScopedInvariant");
__name2(createScopedInvariant, "createScopedInvariant");
function assertDefined(value, invariantId, message) {
  invariant(value != null, invariantId, message, {
    value
  });
}
__name(assertDefined, "assertDefined");
__name2(assertDefined, "assertDefined");
function assertNonEmptyString(value, invariantId, message) {
  invariant(typeof value === "string" && value.length > 0, invariantId, message, {
    actualType: typeof value,
    length: typeof value === "string" ? value.length : "N/A"
  });
}
__name(assertNonEmptyString, "assertNonEmptyString");
__name2(assertNonEmptyString, "assertNonEmptyString");
function assertPositiveNumber(value, invariantId, message) {
  invariant(typeof value === "number" && value > 0 && !Number.isNaN(value), invariantId, message, {
    actualType: typeof value,
    value
  });
}
__name(assertPositiveNumber, "assertPositiveNumber");
__name2(assertPositiveNumber, "assertPositiveNumber");
function assertNonEmptyArray(value, invariantId, message) {
  invariant(Array.isArray(value) && value.length > 0, invariantId, message, {
    isArray: Array.isArray(value),
    length: Array.isArray(value) ? value.length : "N/A"
  });
}
__name(assertNonEmptyArray, "assertNonEmptyArray");
__name2(assertNonEmptyArray, "assertNonEmptyArray");
function assertPathWithinRoot(path11, root, invariantId) {
  const normalizedPath = path11.replace(/\\/g, "/");
  const normalizedRoot = root.replace(/\\/g, "/");
  invariant(normalizedPath.startsWith(normalizedRoot) && !normalizedPath.includes(".."), invariantId, "Path must be within allowed root directory", {
    path: path11,
    root
  });
}
__name(assertPathWithinRoot, "assertPathWithinRoot");
__name2(assertPathWithinRoot, "assertPathWithinRoot");
var SNAPBACK_LAYER_RULES = [
  {
    id: "presentation-no-infrastructure",
    description: "Presentation layer (apps/) cannot import @snapback/infrastructure directly",
    source: [
      "apps/vscode",
      "apps/web",
      "apps/cli"
    ],
    target: [
      "@snapback/infrastructure",
      "packages/infrastructure"
    ],
    type: "no-dependency",
    severity: "error"
  },
  {
    id: "core-no-presentation",
    description: "Core packages cannot import presentation layer",
    source: [
      "packages/core",
      "packages/intelligence"
    ],
    target: [
      "apps/vscode",
      "apps/web",
      "apps/cli"
    ],
    type: "no-dependency",
    severity: "error"
  },
  {
    id: "sdk-no-vscode",
    description: "SDK cannot import VS Code specific modules",
    source: [
      "packages/sdk",
      "packages-oss/sdk"
    ],
    target: [
      "vscode",
      "apps/vscode"
    ],
    type: "no-dependency",
    severity: "error"
  },
  {
    id: "contracts-standalone",
    description: "Contracts package should have no internal dependencies",
    source: [
      "packages/contracts"
    ],
    target: [
      "packages/core",
      "packages/infrastructure",
      "packages/intelligence",
      "packages/sdk",
      "apps/"
    ],
    type: "no-dependency",
    severity: "error"
  },
  {
    id: "storage-workspace-only",
    description: "Storage operations must use workspace paths, not global paths",
    source: [
      "**/storage/**",
      "**/snapshot/**"
    ],
    target: [
      "globalStorageUri",
      "globalState"
    ],
    type: "no-dependency",
    severity: "warning"
  },
  {
    id: "no-circular-core",
    description: "Core packages must be free of circular dependencies",
    source: [
      "packages/core/src"
    ],
    target: [],
    type: "cycle-free",
    severity: "error"
  },
  {
    id: "no-circular-intelligence",
    description: "Intelligence package must be free of circular dependencies",
    source: [
      "packages/intelligence/src"
    ],
    target: [],
    type: "cycle-free",
    severity: "error"
  }
];
async function runArchCheck(config) {
  const startTime = Date.now();
  const rules = config.overrideDefaultRules ? config.customRules || [] : [
    ...SNAPBACK_LAYER_RULES,
    ...config.customRules || []
  ];
  const violations = [];
  const ruleResults = [];
  for (const rule of rules) {
    const ruleViolations = await checkRule(rule, config);
    ruleResults.push({
      ruleId: rule.id,
      passed: ruleViolations.length === 0,
      violations: ruleViolations
    });
    violations.push(...ruleViolations);
  }
  const errorCount = violations.filter((v) => v.severity === "error").length;
  return {
    passed: errorCount === 0,
    rulesChecked: rules.length,
    rulesPassed: ruleResults.filter((r) => r.passed).length,
    violations,
    durationMs: Date.now() - startTime,
    ruleResults
  };
}
__name(runArchCheck, "runArchCheck");
__name2(runArchCheck, "runArchCheck");
async function checkRule(rule, config) {
  const violations = [];
  switch (rule.type) {
    case "no-dependency":
      violations.push(...await checkNoDependency(rule, config));
      break;
    case "cycle-free":
      violations.push(...await checkCycleFree(rule, config));
      break;
  }
  return violations;
}
__name(checkRule, "checkRule");
__name2(checkRule, "checkRule");
async function checkNoDependency(rule, config) {
  const violations = [];
  const { join: join6, relative: relative4 } = await import('path');
  const sources = Array.isArray(rule.source) ? rule.source : [
    rule.source
  ];
  const targets = Array.isArray(rule.target) ? rule.target : [
    rule.target
  ];
  for (const source of sources) {
    const sourceDir = join6(config.workspaceRoot, source);
    for (const target of targets) {
      const patterns = [
        `from ['"]${escapeRegex(target)}`,
        `from ['"]${escapeRegex(target)}/`,
        `require\\(['"]${escapeRegex(target)}`,
        `require\\(['"]${escapeRegex(target)}/`,
        `import\\(['"]${escapeRegex(target)}`
      ];
      const pattern = patterns.join("|");
      try {
        const result = await runGrep(sourceDir, pattern, config.globalExclude);
        for (const match2 of result) {
          if (rule.exclude?.some((ex) => match2.file.includes(ex))) {
            continue;
          }
          violations.push({
            ruleId: rule.id,
            ruleDescription: rule.description,
            severity: rule.severity,
            sourceFile: relative4(config.workspaceRoot, match2.file),
            targetFile: target,
            importPath: match2.match,
            line: match2.line
          });
        }
      } catch {
      }
    }
  }
  return violations;
}
__name(checkNoDependency, "checkNoDependency");
__name2(checkNoDependency, "checkNoDependency");
async function checkCycleFree(rule, config) {
  const violations = [];
  const { existsSync: existsSync5 } = await import('fs');
  const { join: join6, relative: relative4 } = await import('path');
  const sources = Array.isArray(rule.source) ? rule.source : [
    rule.source
  ];
  for (const source of sources) {
    const sourceDir = join6(config.workspaceRoot, source);
    if (!existsSync5(sourceDir)) {
      continue;
    }
    try {
      const madgeModule = await import('madge');
      const madge = madgeModule.default || madgeModule;
      const result = await madge(sourceDir, {
        fileExtensions: [
          "ts",
          "tsx",
          "js",
          "jsx"
        ],
        excludeRegExp: [
          /node_modules/,
          /dist/,
          /\.next/,
          /\.test\./,
          /\.spec\./,
          /__tests__/,
          /__mocks__/,
          ...config.globalExclude?.map((p) => new RegExp(p)) || []
        ],
        detectiveOptions: {
          ts: {
            skipTypeImports: true
          }
        }
      });
      const cycles = result.circular();
      for (const cycle of cycles) {
        violations.push({
          ruleId: rule.id,
          ruleDescription: rule.description,
          severity: rule.severity,
          sourceFile: relative4(config.workspaceRoot, join6(sourceDir, cycle[0])),
          importPath: cycle.join(" -> ")
        });
      }
    } catch {
    }
  }
  return violations;
}
__name(checkCycleFree, "checkCycleFree");
__name2(checkCycleFree, "checkCycleFree");
async function runGrep(dir, pattern, exclude) {
  const { spawn } = await import('child_process');
  const { existsSync: existsSync5 } = await import('fs');
  if (!existsSync5(dir)) {
    return [];
  }
  return new Promise((resolve2) => {
    const args = [
      "-r",
      "-n",
      "-E",
      "--include=*.ts",
      "--include=*.tsx",
      "--include=*.js",
      "--include=*.jsx"
    ];
    for (const ex of exclude || []) {
      args.push(`--exclude-dir=${ex}`);
    }
    args.push("--exclude-dir=node_modules");
    args.push("--exclude-dir=dist");
    args.push("--exclude-dir=.next");
    args.push(pattern);
    args.push(dir);
    const proc = spawn("grep", args, {
      cwd: dir,
      stdio: [
        "pipe",
        "pipe",
        "pipe"
      ]
    });
    let stdout = "";
    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    proc.on("close", () => {
      const matches = [];
      const lines = stdout.split("\n").filter(Boolean);
      for (const line of lines) {
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) {
          continue;
        }
        const file = line.slice(0, colonIdx);
        const rest = line.slice(colonIdx + 1);
        const lineNumIdx = rest.indexOf(":");
        if (lineNumIdx === -1) {
          continue;
        }
        const lineNum = Number.parseInt(rest.slice(0, lineNumIdx), 10);
        const content = rest.slice(lineNumIdx + 1);
        matches.push({
          file,
          line: lineNum,
          match: content.trim()
        });
      }
      resolve2(matches);
    });
    proc.on("error", () => {
      resolve2([]);
    });
  });
}
__name(runGrep, "runGrep");
__name2(runGrep, "runGrep");
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
__name(escapeRegex, "escapeRegex");
__name2(escapeRegex, "escapeRegex");
function createRule(id, description) {
  const rule = {
    id,
    description,
    severity: "error"
  };
  return {
    filesIn(pattern) {
      rule.source = pattern;
      return this;
    },
    shouldNotDependOn(pattern) {
      rule.target = pattern;
      rule.type = "no-dependency";
      return this;
    },
    shouldBeCycleFree() {
      rule.type = "cycle-free";
      rule.target = [];
      return this;
    },
    withSeverity(severity) {
      rule.severity = severity;
      return this;
    },
    excluding(patterns) {
      rule.exclude = patterns;
      return this;
    },
    build() {
      if (!rule.source) {
        throw new Error(`Rule ${id} must specify source with filesIn()`);
      }
      if (!rule.type) {
        throw new Error(`Rule ${id} must specify constraint type`);
      }
      return rule;
    }
  };
}
__name(createRule, "createRule");
__name2(createRule, "createRule");
var DeviceAuthClient = class {
  static {
    __name(this, "DeviceAuthClient");
  }
  static {
    __name2(this, "DeviceAuthClient");
  }
  http;
  config;
  state = "idle";
  abortController = null;
  currentInterval = 5e3;
  constructor(config) {
    this.config = config;
    this.http = config.httpClient ?? ky.create({
      prefixUrl: config.baseUrl,
      timeout: 3e4
    });
  }
  /**
  * Get current flow state
  */
  getState() {
    return this.state;
  }
  /**
  * Cancel the authentication flow
  */
  cancel() {
    this.abortController?.abort();
    this.state = "cancelled";
  }
  /**
  * Start device authorization flow
  *
  * @param callbacks - Event callbacks for tracking progress
  * @returns AuthResult on success
  * @throws Error on failure or cancellation
  */
  async authenticate(callbacks) {
    if (this.state === "requesting_code" || this.state === "waiting_for_approval") {
      throw new Error("Authentication already in progress");
    }
    this.abortController = new AbortController();
    this.state = "requesting_code";
    try {
      const deviceCodeResponse = await this.requestDeviceCode();
      callbacks?.onDeviceCode?.(deviceCodeResponse);
      this.currentInterval = deviceCodeResponse.interval * 1e3;
      this.state = "waiting_for_approval";
      const result = await this.pollForToken(deviceCodeResponse, callbacks);
      this.state = "approved";
      callbacks?.onApproved?.(result);
      return result;
    } catch (error) {
      const currentState = this.state;
      if (currentState !== "cancelled") {
        this.state = "error";
      }
      const err2 = error instanceof Error ? error : new Error(String(error));
      if (currentState === "cancelled") {
        callbacks?.onCancelled?.();
      } else {
        callbacks?.onError?.(err2);
      }
      throw err2;
    }
  }
  /**
  * Request device code from authorization server (RFC 8628 Section 3.1)
  */
  async requestDeviceCode() {
    const signal = this.mergeSignals();
    try {
      const response = await this.http.post("deviceAuth/requestCode", {
        json: {
          client_id: this.config.clientId,
          scope: this.config.scope
        },
        signal
      }).json();
      if (!response.device_code) {
        throw new Error("Invalid device code response: missing device_code");
      }
      return response;
    } catch (error) {
      this.handleAbortError(error);
      throw new Error(`Device code request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
  * Poll for token with RFC 8628 compliant error handling
  */
  async pollForToken(deviceCodeResponse, callbacks) {
    const { device_code, expires_in } = deviceCodeResponse;
    const startTime = Date.now();
    const timeoutMs = expires_in * 1e3;
    let attempt = 0;
    while (true) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error("Device code expired - authentication timeout");
      }
      if (this.abortController?.signal.aborted) {
        this.state = "cancelled";
        throw new Error("Authentication cancelled");
      }
      await this.delay(this.currentInterval);
      attempt++;
      callbacks?.onPoll?.(attempt, this.currentInterval);
      try {
        const signal = this.mergeSignals();
        const response = await this.http.post("deviceAuth/pollToken", {
          json: {
            device_code,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            client_id: this.config.clientId
          },
          signal
        }).json();
        if ("access_token" in response) {
          return this.mapTokenToAuthResult(response);
        }
        if ("error" in response) {
          switch (response.error) {
            case "authorization_pending":
              break;
            case "slow_down":
              this.currentInterval += 5e3;
              callbacks?.onSlowDown?.(this.currentInterval);
              break;
            case "access_denied":
              callbacks?.onError?.(new Error("Authorization denied by user"), "access_denied");
              throw new Error("Authorization denied by user");
            case "expired_token":
              callbacks?.onError?.(new Error("Device code expired"), "expired_token");
              throw new Error("Device code expired on server");
            case "invalid_request":
              callbacks?.onError?.(new Error("Invalid device code"), "invalid_request");
              throw new Error("Invalid device code format");
            default:
              throw new Error(`Unknown error: ${response.error}`);
          }
        }
      } catch (error) {
        this.handleAbortError(error);
        if (error instanceof Error) {
          if (error.message.includes("cancelled") || error.message.includes("denied") || error.message.includes("expired") || error.message.includes("Invalid")) {
            throw error;
          }
        }
      }
    }
  }
  /**
  * Map token response to AuthResult
  */
  mapTokenToAuthResult(token) {
    return {
      api_key: token.access_token,
      user_id: "user-from-token",
      tier: "free",
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_in: token.expires_in
    };
  }
  /**
  * Delay execution with cancellation support
  */
  delay(ms) {
    return new Promise((resolve2) => {
      const timeout = setTimeout(resolve2, ms);
      this.abortController?.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        resolve2();
      }, {
        once: true
      });
    });
  }
  /**
  * Merge configured signal with internal abort controller
  */
  mergeSignals() {
    const signals = [];
    if (this.abortController?.signal) {
      signals.push(this.abortController.signal);
    }
    if (this.config.signal) {
      signals.push(this.config.signal);
    }
    if (signals.length === 0) {
      return void 0;
    }
    if (signals.length === 1) {
      return signals[0];
    }
    const combined = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        combined.abort();
        break;
      }
      signal.addEventListener("abort", () => combined.abort(), {
        once: true
      });
    }
    return combined.signal;
  }
  /**
  * Handle abort errors consistently
  */
  handleAbortError(error) {
    if (error instanceof Error && error.name === "AbortError") {
      this.state = "cancelled";
      throw new Error("Authentication cancelled");
    }
  }
};
function createDeviceAuthClient(baseUrl, clientId, options) {
  return new DeviceAuthClient({
    baseUrl,
    clientId,
    ...options
  });
}
__name(createDeviceAuthClient, "createDeviceAuthClient");
__name2(createDeviceAuthClient, "createDeviceAuthClient");
var LRUCache = class {
  static {
    __name(this, "LRUCache");
  }
  static {
    __name2(this, "LRUCache");
  }
  cache;
  config;
  constructor(config) {
    this.config = {
      maxSize: 1e3,
      ...config
    };
    this.cache = new QuickLRU({
      maxSize: this.config.maxSize || 1e3
    });
  }
  /**
  * Get a value from the cache
  * @returns The cached value or null if not found/expired
  */
  get(key) {
    if (!this.config.enabled) {
      return null;
    }
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    const now = Date.now();
    if (now > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
  /**
  * Set a value in the cache
  * @param key - Cache key
  * @param value - Value to cache
  * @param ttlSeconds - Time to live in seconds (default: 300)
  */
  set(key, value, ttlSeconds = 300) {
    if (!this.config.enabled) {
      return;
    }
    const expiry = Date.now() + ttlSeconds * 1e3;
    this.cache.set(key, {
      value,
      expiry
    });
  }
  /**
  * Check if a key exists in the cache and is not expired
  */
  has(key) {
    if (!this.config.enabled) {
      return false;
    }
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }
    const now = Date.now();
    if (now > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  /**
  * Delete a key from the cache
  */
  delete(key) {
    return this.cache.delete(key);
  }
  /**
  * Clear all items from the cache
  */
  clear() {
    this.cache.clear();
  }
  /**
  * Get the number of items in the cache
  */
  size() {
    return this.cache.size;
  }
};
var CODE_EXTENSIONS = [
  "ts",
  "js",
  "jsx",
  "tsx",
  "py",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "rb",
  "go",
  "php",
  "pl",
  "rs",
  "swift",
  "kt",
  "dart",
  "scala",
  "sql"
];
var CONFIG_EXTENSIONS = [
  "json",
  "env",
  "yml",
  "yaml",
  "xml",
  "html",
  "css",
  "scss",
  "less",
  "map",
  "lock",
  "conf",
  "ini",
  "bat",
  "ps1"
];
var DOCUMENT_EXTENSIONS = [
  "md",
  "txt",
  "csv",
  "log",
  "pdf",
  "docx",
  "doc",
  "xlsx",
  "xls",
  "pptx",
  "ppt"
];
var IMAGE_EXTENSIONS = [
  "svg",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "ico",
  "webp",
  "avif"
];
var MEDIA_EXTENSIONS = [
  "mp4",
  "mov",
  "avi",
  "mkv",
  "mp3",
  "wav",
  "ogg",
  "flac",
  "aac",
  "m4a",
  "webm"
];
var ARCHIVE_EXTENSIONS = [
  "zip",
  "tar",
  "gz",
  "tgz",
  "rar",
  "7z"
];
var DATABASE_EXTENSIONS = [
  "db",
  "db3",
  "sqlite",
  "dbf",
  "bak"
];
var BINARY_EXTENSIONS = [
  "wasm"
];
var ALL_EXTENSIONS = [
  ...CODE_EXTENSIONS,
  ...CONFIG_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  ...MEDIA_EXTENSIONS,
  ...ARCHIVE_EXTENSIONS,
  ...DATABASE_EXTENSIONS,
  ...BINARY_EXTENSIONS
];
var FILE_EXTENSION_REGEX = new RegExp(`\\b\\w+\\.(${ALL_EXTENSIONS.join("|")})\\b`, "gi");
var PrivacySanitizer = class {
  static {
    __name(this, "PrivacySanitizer");
  }
  static {
    __name2(this, "PrivacySanitizer");
  }
  config;
  constructor(config) {
    this.config = config;
  }
  /**
  * Sanitize file metadata to ensure privacy
  * Removes any potentially sensitive data
  */
  sanitize(metadata) {
    const copy = structuredClone(metadata);
    if (this.config.hashFilePaths && "path" in copy) {
      const filePath = copy.path;
      const hashedPath = this.hashFilePath(filePath);
      copy.pathHash = hashedPath;
      copy.path = hashedPath;
    }
    if (copy.risk?.factors) {
      copy.risk.factors = copy.risk.factors.map((factor) => ({
        ...factor,
        type: this.sanitizeString(factor.type)
      }));
    }
    return copy;
  }
  /**
  * Validate that metadata contains no sensitive data
  */
  isPrivacySafe(metadata) {
    const forbiddenProps = [
      "content",
      "sourceCode",
      "fileContent",
      "code",
      "text",
      "body",
      "fullPath"
    ];
    for (const prop of forbiddenProps) {
      if (prop in metadata) {
        return false;
      }
    }
    if ("path" in metadata && "pathHash" in metadata) {
      if (metadata.path !== metadata.pathHash) {
        return false;
      }
    } else if ("path" in metadata && !("pathHash" in metadata)) {
      return false;
    }
    for (const [_key, value] of Object.entries(metadata)) {
      if (typeof value === "object" && value !== null) {
        if (!this.isPrivacySafe(value)) {
          return false;
        }
      }
      if (typeof value === "string" && value.length > 1e3) {
        return false;
      }
    }
    return true;
  }
  /**
  * Hash file path with workspace salt
  */
  hashFilePath(filePath) {
    return crypto2__default__default.createHash("sha256").update(filePath).digest("hex");
  }
  /**
  * Sanitize string to remove specific identifiers
  */
  sanitizeString(str) {
    if (!str) {
      return "";
    }
    if (str.length > 1e4) {
      throw new Error("Input too large for sanitization");
    }
    return str.replace(/"[^"]*"/g, '"<redacted>"').replace(FILE_EXTENSION_REGEX, "<file>").replace(/\/[\w/]+/g, "<path>");
  }
  /**
  * Public method to sanitize individual risk factors
  * @param factor - Risk factor string to sanitize
  * @returns Sanitized risk factor string
  */
  sanitizeFactor(factor) {
    return this.sanitizeString(factor);
  }
};
var SDKConfigSchema = z.object({
  endpoint: z.string().url(),
  apiKey: z.string().min(1, "API key is required"),
  privacy: z.object({
    hashFilePaths: z.boolean(),
    anonymizeWorkspace: z.boolean()
  }),
  cache: z.object({
    enabled: z.boolean(),
    ttl: z.record(z.string(), z.number())
  }),
  retry: z.object({
    maxRetries: z.number().min(0),
    backoffMs: z.number().min(0)
  })
});
var WorkspaceIdSchema = z.string().min(1, "Workspace ID is required");
var FilesArraySchema = z.array(z.any()).min(1, "At least one file is required");
var LocalFallback = class LocalFallback2 {
  static {
    __name(this, "LocalFallback2");
  }
  static {
    __name2(this, "LocalFallback");
  }
  generateRecommendations() {
    return {
      shouldCreateSnapshot: false,
      reason: "Using local fallback - API unavailable",
      urgency: "low",
      suggestedTiming: "24h"
    };
  }
};
var SnapbackClient = class {
  static {
    __name(this, "SnapbackClient");
  }
  static {
    __name2(this, "SnapbackClient");
  }
  sanitizer;
  cache;
  config;
  httpClient;
  localFallback;
  constructor(config) {
    this.config = SDKConfigSchema.parse(config);
    this.sanitizer = new PrivacySanitizer(config.privacy);
    this.cache = new LRUCache(config.cache);
    this.localFallback = new LocalFallback();
    this.httpClient = ky.extend({
      prefixUrl: config.endpoint,
      headers: {
        "X-API-Key": config.apiKey,
        "X-SnapBack-SDK": "1.0.0"
      },
      retry: {
        limit: config.retry.maxRetries,
        methods: [
          "get",
          "post",
          "put",
          "delete",
          "patch"
        ],
        statusCodes: [
          408,
          413,
          429,
          500,
          502,
          503,
          504
        ],
        // Add exponential backoff configuration
        backoffLimit: config.retry.backoffMs * 10
      },
      timeout: 3e4
    });
  }
  /**
  * Get the HTTP client instance
  * @returns The ky HTTP client instance
  */
  getHttpClient() {
    return this.httpClient;
  }
  /**
  * Parse Retry-After header and return delay in milliseconds
  * @param retryAfter Retry-After header value
  * @returns Delay in milliseconds
  */
  parseRetryAfter(retryAfter) {
    if (/^\d+$/.test(retryAfter)) {
      return Number.parseInt(retryAfter, 10) * 1e3;
    }
    const date = new Date(retryAfter);
    if (!Number.isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }
    return 1e3;
  }
  /**
  * Enhanced HTTP request with custom retry logic including Retry-After handling
  */
  async httpRequest(requestFn, options) {
    const retryLimit = options?.retryLimit ?? this.config.retry.maxRetries;
    return pRetry(async () => {
      try {
        return await requestFn();
      } catch (error) {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers.get("Retry-After");
          if (retryAfter) {
            const delay = this.parseRetryAfter(retryAfter);
            await new Promise((resolve2) => setTimeout(resolve2, delay));
          }
          throw error;
        }
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
          throw new AbortError(error);
        }
        throw error;
      }
    }, {
      retries: retryLimit,
      factor: 2,
      minTimeout: this.config.retry.backoffMs,
      maxTimeout: this.config.retry.backoffMs * 2 ** retryLimit,
      randomize: true,
      onFailedAttempt: /* @__PURE__ */ __name2((error) => {
        if (options?.onRetry) {
          options.onRetry(error, error.attemptNumber);
        }
      }, "onFailedAttempt")
    });
  }
  /**
  * Send file metadata batch to API
  * Automatically sanitizes metadata to ensure privacy
  */
  async sendMetadata(workspaceId, files) {
    WorkspaceIdSchema.parse(workspaceId);
    FilesArraySchema.parse(files);
    const sanitized = files.map((f) => this.sanitizer.sanitize(f));
    for (const file of sanitized) {
      if (!this.sanitizer.isPrivacySafe(file)) {
        throw new Error("Privacy validation failed: file contains sensitive data");
      }
    }
    try {
      const response = await this.httpRequest(() => this.httpClient.post("v1/metadata/files/batch", {
        json: {
          workspaceId,
          files: sanitized
        },
        timeout: 3e4
      }).json(), {
        onRetry: /* @__PURE__ */ __name2((error, attempt) => {
          logger.warn(`Attempt ${attempt} failed. Retrying...`, {
            error: error.message
          });
        }, "onRetry")
      });
      return response;
    } catch (error) {
      logger.warn("API metadata upload failed, continuing with local operation", {
        error: error.message
      });
      return {
        accepted: 0,
        rejected: files.length
      };
    }
  }
  /**
  * Get analytics for workspace
  * Uses cache when available
  */
  async getAnalytics(workspaceId, options) {
    WorkspaceIdSchema.parse(workspaceId);
    const cacheKey = `analytics:${workspaceId}`;
    if (!options?.forceRefresh && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    try {
      const response = await this.httpRequest(() => this.httpClient.get(`v1/analytics/workspace/${workspaceId}`, {
        timeout: 3e4
      }).json(), {
        onRetry: /* @__PURE__ */ __name2((error, attempt) => {
          logger.warn(`Analytics API attempt ${attempt} failed. Retrying...`, {
            error: error.message
          });
        }, "onRetry")
      });
      const ttl = this.config.cache.ttl.analytics || 3600;
      this.cache.set(cacheKey, response, ttl);
      return response;
    } catch (error) {
      if (this.cache.has(cacheKey)) {
        logger.warn("API unavailable, using stale cached analytics");
        return this.cache.get(cacheKey);
      }
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }
  }
  /**
  * Get smart recommendations
  */
  async getRecommendations(workspaceId) {
    WorkspaceIdSchema.parse(workspaceId);
    try {
      const response = await this.httpRequest(() => this.httpClient.get("v1/intelligence/recommendations", {
        searchParams: {
          workspaceId
        },
        timeout: 3e4
      }).json(), {
        onRetry: /* @__PURE__ */ __name2((error, attempt) => {
          logger.warn(`Recommendations API attempt ${attempt} failed. Retrying...`, {
            error: error.message
          });
        }, "onRetry")
      });
      return response.snapshotRecommendations;
    } catch (error) {
      logger.warn("API unavailable, using local fallback for recommendations", {
        error: error.message
      });
      return this.localFallback.generateRecommendations();
    }
  }
  /**
  * Health check endpoint
  */
  async healthCheck() {
    try {
      const response = await this.httpClient.get("health").json();
      return response;
    } catch (_error) {
      return {
        status: "error",
        version: "unknown"
      };
    }
  }
};
var ProtectionClient = class {
  static {
    __name(this, "ProtectionClient");
  }
  static {
    __name2(this, "ProtectionClient");
  }
  http;
  cache;
  constructor(http, cache) {
    this.http = http;
    this.cache = cache;
  }
  async protect(path11, level, reason) {
    const response = await this.http.post("protection", {
      json: {
        path: path11,
        level,
        reason
      }
    }).json();
    this.cache.delete(`protection:${path11}`);
    this.invalidateListCache();
    return response;
  }
  async unprotect(path11) {
    await this.http.delete("protection", {
      json: {
        path: path11
      }
    });
    this.cache.delete(`protection:${path11}`);
    this.invalidateListCache();
  }
  async get(path11) {
    const cacheKey = `protection:${path11}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== void 0) {
      return cached === null ? null : cached;
    }
    try {
      const response = await this.http.get("protection", {
        searchParams: {
          path: path11
        }
      }).json();
      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      if (error.response?.status === 404) {
        this.cache.set(cacheKey, null);
        return null;
      }
      throw error;
    }
  }
  async list(filters) {
    const cacheKey = `protection:list:${JSON.stringify(filters || {})}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const searchParams = {};
    if (filters?.level) {
      searchParams.level = String(filters.level);
    }
    const response = await this.http.get("protection/list", {
      searchParams: Object.keys(searchParams).length > 0 ? searchParams : void 0
    }).json();
    this.cache.set(cacheKey, response);
    return response;
  }
  async update(path11, level, reason) {
    const response = await this.http.put("protection", {
      json: {
        path: path11,
        level,
        reason
      }
    }).json();
    this.cache.delete(`protection:${path11}`);
    this.invalidateListCache();
    return response;
  }
  /**
  * Invalidate all protection list caches (including filtered lists)
  */
  invalidateListCache() {
    for (const key of this.cache.keys()) {
      if (key.startsWith("protection:list")) {
        this.cache.delete(key);
      }
    }
  }
};
var SnapshotClient = class {
  static {
    __name(this, "SnapshotClient");
  }
  static {
    __name2(this, "SnapshotClient");
  }
  http;
  cache;
  constructor(http, cache) {
    this.http = http;
    this.cache = cache;
  }
  async create(data) {
    const response = await this.http.post("snapshots", {
      json: {
        filePath: data.filePath,
        content: data.content,
        message: data.message,
        protected: data.protected
      }
    }).json();
    this.invalidateListCache();
    return response;
  }
  async list(filters) {
    const cacheKey = `snapshots:list:${JSON.stringify(filters || {})}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const searchParams = {};
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== void 0) {
          if (value instanceof Date) {
            searchParams[key] = value.toISOString();
          } else {
            searchParams[key] = value;
          }
        }
      });
    }
    const response = await this.http.get("snapshots", {
      searchParams: Object.keys(searchParams).length > 0 ? searchParams : void 0
    }).json();
    this.cache.set(cacheKey, response);
    return response;
  }
  async get(id) {
    const cacheKey = `snapshot:${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const response = await this.http.get(`snapshots/${id}`).json();
    this.cache.set(cacheKey, response);
    return response;
  }
  async delete(id) {
    await this.http.delete(`snapshots/${id}`);
    this.cache.delete(`snapshot:${id}`);
    this.invalidateListCache();
  }
  async restore(id) {
    const response = await this.http.post(`snapshots/${id}/restore`).json();
    return response;
  }
  async update(id, data) {
    const response = await this.http.put(`snapshots/${id}`, {
      json: data
    }).json();
    this.cache.delete(`snapshot:${id}`);
    this.invalidateListCache();
    return response;
  }
  /**
  * Invalidate all snapshot list caches (including filtered lists)
  */
  invalidateListCache() {
    for (const key of this.cache.keys()) {
      if (key.startsWith("snapshots:list")) {
        this.cache.delete(key);
      }
    }
  }
};
var defaultConfig = {
  endpoint: "https://api.snapback.dev",
  apiKey: "",
  privacy: {
    hashFilePaths: true,
    anonymizeWorkspace: false
  },
  cache: {
    enabled: true,
    ttl: {
      analytics: 3600,
      recommendations: 1800,
      patterns: 7200
    }
  },
  retry: {
    maxRetries: 3,
    backoffMs: 1e3
  }
};
function createConfig(overrides = {}) {
  return {
    ...defaultConfig,
    ...overrides,
    privacy: {
      ...defaultConfig.privacy,
      ...overrides.privacy
    },
    cache: {
      ...defaultConfig.cache,
      ...overrides.cache,
      ttl: {
        ...defaultConfig.cache.ttl,
        ...overrides.cache?.ttl
      }
    },
    retry: {
      ...defaultConfig.retry,
      ...overrides.retry
    }
  };
}
__name(createConfig, "createConfig");
__name2(createConfig, "createConfig");
var ConfigDetector = class {
  static {
    __name(this, "ConfigDetector");
  }
  static {
    __name2(this, "ConfigDetector");
  }
  workspaceRoot;
  fileSystem;
  excludePatterns;
  configFiles = /* @__PURE__ */ new Map();
  changeHandlers = [];
  /**
  * Creates a new ConfigDetector
  *
  * @param workspaceRoot - Root directory to search for configuration files
  * @param fileSystem - File system provider for platform-specific operations
  * @param options - Configuration options
  */
  constructor(workspaceRoot, fileSystem, options) {
    this.workspaceRoot = workspaceRoot;
    this.fileSystem = fileSystem;
    this.excludePatterns = options?.exclude || [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**"
    ];
  }
  /**
  * Detect all configuration files in the workspace
  *
  * @returns Promise that resolves to array of detected configuration files
  */
  async detectConfigFiles() {
    const patterns = [
      "package.json",
      "tsconfig.json",
      ".env*",
      ".eslintrc*",
      ".prettierrc*",
      "jest.config.*",
      "vitest.config.*",
      "webpack.config.*",
      "next.config.*",
      "vite.config.*"
    ];
    const globPatterns = patterns.map((pattern) => `**/${pattern}`);
    try {
      const files = await this.fileSystem.glob(globPatterns, this.workspaceRoot, {
        ignore: this.excludePatterns
      });
      const configFiles = files.map((file) => {
        const fullPath = `${this.workspaceRoot}/${file}`;
        const type = this.determineConfigType(file);
        const name = file.split("/").pop() || file;
        return {
          type,
          path: fullPath,
          name
        };
      });
      this.configFiles.clear();
      for (const config of configFiles) {
        this.configFiles.set(config.path, config);
      }
      return configFiles;
    } catch (_error) {
      return [];
    }
  }
  /**
  * Determine configuration file type from filename
  *
  * @param fileName - The file name to analyze
  * @returns The configuration type
  */
  determineConfigType(fileName) {
    if (fileName.includes(".env")) {
      return "env";
    }
    if (fileName.includes("package.json")) {
      return "package.json";
    }
    if (fileName.includes("tsconfig")) {
      return "tsconfig";
    }
    if (fileName.includes(".eslintrc")) {
      return "eslint";
    }
    if (fileName.includes(".prettierrc")) {
      return "prettier";
    }
    if (fileName.includes("jest.config")) {
      return "jest";
    }
    if (fileName.includes("vitest.config")) {
      return "vitest";
    }
    if (fileName.includes("webpack.config")) {
      return "webpack";
    }
    if (fileName.includes("next.config")) {
      return "next";
    }
    if (fileName.includes("vite.config")) {
      return "vite";
    }
    return "unknown";
  }
  /**
  * Parse a configuration file
  *
  * @param filePath - Path to the configuration file
  * @returns Promise that resolves to parse result
  */
  async parseConfigFile(filePath) {
    try {
      const content = await this.fileSystem.readFile(filePath);
      if (filePath.endsWith(".json") || filePath.includes("package.json") || filePath.includes("tsconfig")) {
        try {
          const parsed = JSON.parse(content);
          return {
            content: parsed,
            valid: true,
            metadata: this.extractMetadata(parsed, filePath)
          };
        } catch (jsonError) {
          return {
            content: null,
            valid: false,
            error: `Invalid JSON: ${jsonError.message}`
          };
        }
      }
      return {
        content,
        valid: true
      };
    } catch (error) {
      return {
        content: null,
        valid: false,
        error: `Failed to read file: ${error.message}`
      };
    }
  }
  /**
  * Extract metadata from configuration content
  *
  * @param content - Parsed configuration content
  * @param filePath - Path to the file (used to determine type)
  * @returns Extracted metadata or undefined
  */
  extractMetadata(content, filePath) {
    if (!content || typeof content !== "object") {
      return void 0;
    }
    const metadata = {};
    if (filePath.includes("package.json")) {
      const pkg = content;
      if (pkg.dependencies) {
        metadata.dependencies = Object.keys(pkg.dependencies);
      }
      if (pkg.devDependencies) {
        metadata.devDependencies = Object.keys(pkg.devDependencies);
      }
      if (pkg.scripts) {
        metadata.scripts = Object.keys(pkg.scripts);
      }
    }
    return Object.keys(metadata).length > 0 ? metadata : void 0;
  }
  /**
  * Validate a configuration file
  *
  * @param filePath - Path to the configuration file
  * @returns Promise that resolves to validation result
  */
  async validateConfig(filePath) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };
    try {
      const parseResult = await this.parseConfigFile(filePath);
      if (!parseResult.valid) {
        result.valid = false;
        result.errors.push(parseResult.error || "Failed to parse config file");
        return result;
      }
      if (filePath.includes("package.json")) {
        this.validatePackageJson(parseResult.content, result);
      } else if (filePath.includes("tsconfig")) {
        this.validateTsConfig(parseResult.content, result);
      }
      return result;
    } catch (error) {
      result.valid = false;
      result.errors.push(`Validation error: ${error.message}`);
      return result;
    }
  }
  /**
  * Validate package.json content
  *
  * @param content - Parsed package.json content
  * @param result - Validation result to update
  */
  validatePackageJson(content, result) {
    const pkg = content;
    if (!pkg.name) {
      result.errors.push("Missing required field: name");
      result.valid = false;
    }
    if (!pkg.version) {
      result.errors.push("Missing required field: version");
      result.valid = false;
    }
  }
  /**
  * Validate tsconfig.json content
  *
  * @param content - Parsed tsconfig.json content
  * @param result - Validation result to update
  */
  validateTsConfig(content, result) {
    const tsconfig = content;
    if (tsconfig && typeof tsconfig === "object" && tsconfig.compilerOptions) {
      if (tsconfig.compilerOptions.target && typeof tsconfig.compilerOptions.target !== "string") {
        result.warnings.push("compilerOptions.target should be a string");
      }
      if (tsconfig.compilerOptions.module && typeof tsconfig.compilerOptions.module !== "string") {
        result.warnings.push("compilerOptions.module should be a string");
      }
    }
  }
  /**
  * Register a handler for configuration changes
  *
  * @param handler - Function to call when configuration changes
  */
  onConfigChange(handler) {
    this.changeHandlers.push(handler);
  }
};
var VALID_PROTECTION_LEVELS = [
  "Watched",
  "Warning",
  "Protected"
];
var SnapBackRCParser = class {
  static {
    __name(this, "SnapBackRCParser");
  }
  static {
    __name2(this, "SnapBackRCParser");
  }
  /**
  * Parse a .snapbackrc configuration string
  *
  * @param content - The configuration file content as a string
  * @returns Parse result with validation status and errors
  */
  parse(content) {
    const errors = [];
    const warnings = [];
    let config;
    try {
      config = JSON.parse(content);
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
        ]
      };
    }
    const validationErrors = this.validate(config);
    errors.push(...validationErrors);
    return {
      isValid: errors.length === 0,
      config: errors.length === 0 ? config : void 0,
      errors: errors.length > 0 ? errors : void 0,
      warnings: warnings.length > 0 ? warnings : void 0
    };
  }
  /**
  * Validate a configuration object
  *
  * @param config - The configuration to validate
  * @returns Array of validation error messages
  */
  validate(config) {
    const errors = [];
    if (config.protection !== void 0) {
      if (!Array.isArray(config.protection)) {
        errors.push("protection must be an array");
      } else {
        for (let i = 0; i < config.protection.length; i++) {
          const rule = config.protection[i];
          const ruleErrors = this.validateProtectionRule(rule, i);
          errors.push(...ruleErrors);
        }
      }
    }
    if (config.ignore !== void 0 && !Array.isArray(config.ignore)) {
      errors.push("ignore must be an array of strings");
    }
    if (config.settings !== void 0) {
      const settingsErrors = this.validateSettings(config.settings);
      errors.push(...settingsErrors);
    }
    if (config.policies !== void 0) {
      const policyErrors = this.validatePolicies(config.policies);
      errors.push(...policyErrors);
    }
    return errors;
  }
  /**
  * Validate a single protection rule
  *
  * @param rule - The protection rule to validate
  * @param index - The index of the rule in the array
  * @returns Array of validation error messages
  */
  validateProtectionRule(rule, index) {
    const errors = [];
    const prefix = `protection[${index}]`;
    if (!rule.pattern) {
      errors.push(`${prefix}: pattern is required`);
    }
    if (!rule.level) {
      errors.push(`${prefix}: level is required`);
    } else if (!VALID_PROTECTION_LEVELS.includes(rule.level)) {
      errors.push(`${prefix}: level must be one of ${VALID_PROTECTION_LEVELS.join(", ")} (got "${rule.level}")`);
    }
    if (rule.debounce !== void 0 && (typeof rule.debounce !== "number" || rule.debounce < 0)) {
      errors.push(`${prefix}: debounce must be a non-negative number`);
    }
    if (rule.excludeFrom !== void 0 && !Array.isArray(rule.excludeFrom)) {
      errors.push(`${prefix}: excludeFrom must be an array of strings`);
    }
    if (rule.autoSnapshot !== void 0 && typeof rule.autoSnapshot !== "boolean") {
      errors.push(`${prefix}: autoSnapshot must be a boolean`);
    }
    return errors;
  }
  /**
  * Validate settings
  *
  * @param settings - The settings to validate
  * @returns Array of validation error messages
  */
  validateSettings(settings) {
    const errors = [];
    if (settings.maxSnapshots !== void 0) {
      if (typeof settings.maxSnapshots !== "number" || settings.maxSnapshots < 1) {
        errors.push("settings.maxSnapshots must be a positive number");
      }
    }
    if (settings.defaultProtectionLevel !== void 0 && !VALID_PROTECTION_LEVELS.includes(settings.defaultProtectionLevel)) {
      errors.push(`settings.defaultProtectionLevel must be one of ${VALID_PROTECTION_LEVELS.join(", ")}`);
    }
    if (settings.protectionDebounce !== void 0 && (typeof settings.protectionDebounce !== "number" || settings.protectionDebounce < 0)) {
      errors.push("settings.protectionDebounce must be a non-negative number");
    }
    if (settings.maxStorageSize !== void 0 && (typeof settings.maxStorageSize !== "number" || settings.maxStorageSize < 0)) {
      errors.push("settings.maxStorageSize must be a non-negative number");
    }
    if (settings.parallelOperations !== void 0 && (typeof settings.parallelOperations !== "number" || settings.parallelOperations < 1)) {
      errors.push("settings.parallelOperations must be a positive number");
    }
    return errors;
  }
  /**
  * Validate policies
  *
  * @param policies - The policies to validate
  * @returns Array of validation error messages
  */
  validatePolicies(policies) {
    const errors = [];
    if (policies.minimumProtectionLevel !== void 0 && !VALID_PROTECTION_LEVELS.includes(policies.minimumProtectionLevel)) {
      errors.push(`policies.minimumProtectionLevel must be one of ${VALID_PROTECTION_LEVELS.join(", ")}`);
    }
    return errors;
  }
  /**
  * Merge two configurations
  *
  * Combines two configurations with the override taking precedence.
  * Arrays are concatenated, objects are deeply merged.
  *
  * @param base - The base configuration
  * @param override - The override configuration
  * @param options - Merge options including provenance tracking
  * @returns Merged configuration
  */
  merge(base, override, options) {
    const result = {};
    if (base.protection || override.protection) {
      result.protection = [];
      if (base.protection) {
        result.protection.push(...base.protection.map((rule) => ({
          ...rule,
          _provenance: options?.baseProvenance
        })));
      }
      if (override.protection) {
        result.protection.push(...override.protection.map((rule) => ({
          ...rule,
          _provenance: options?.overrideProvenance
        })));
      }
    }
    if (base.ignore || override.ignore) {
      const ignoreSet = /* @__PURE__ */ new Set();
      if (base.ignore) {
        for (const pattern of base.ignore) {
          ignoreSet.add(pattern);
        }
      }
      if (override.ignore) {
        for (const pattern of override.ignore) {
          ignoreSet.add(pattern);
        }
      }
      result.ignore = Array.from(ignoreSet);
    }
    if (base.settings || override.settings) {
      result.settings = {
        ...base.settings,
        ...override.settings
      };
    }
    if (base.policies || override.policies) {
      result.policies = {
        ...base.policies,
        ...override.policies
      };
    }
    if (base.hooks || override.hooks) {
      result.hooks = {
        ...base.hooks,
        ...override.hooks
      };
    }
    if (base.templates || override.templates) {
      result.templates = [
        ...base.templates || [],
        ...override.templates || []
      ];
    }
    return result;
  }
  /**
  * Filter configuration by pattern
  *
  * Returns a new configuration containing only protection rules
  * that match the given pattern.
  *
  * @param config - The configuration to filter
  * @param pattern - The pattern to match
  * @returns Filtered configuration
  */
  filterByPattern(config, pattern) {
    const result = {
      ...config
    };
    if (config.protection) {
      result.protection = config.protection.filter((rule) => rule.pattern === pattern);
    }
    return result;
  }
};
var AI_EXTENSION_IDS = {
  GITHUB_COPILOT: "github.copilot",
  GITHUB_COPILOT_CHAT: "github.copilot-chat",
  CLAUDE: "claude.claude",
  TABNINE: "tabnine.tabnine-vscode",
  CODEIUM: "codeium.codeium",
  AMAZON_Q: "amazonwebservices.aws-toolkit-vscode",
  CONTINUE: "continue.continue",
  BLACKBOX: "blackboxapp.blackbox",
  WINDSURF: "windsurf.windsurf"
};
var ASSISTANT_DISPLAY_NAMES = {
  GITHUB_COPILOT: "GitHub Copilot",
  GITHUB_COPILOT_CHAT: "GitHub Copilot Chat",
  CLAUDE: "Claude",
  TABNINE: "Tabnine",
  CODEIUM: "Codeium",
  AMAZON_Q: "Amazon Q",
  CONTINUE: "Continue",
  BLACKBOX: "Blackbox",
  WINDSURF: "Windsurf"
};
var AIPresenceDetector = class {
  static {
    __name(this, "AIPresenceDetector");
  }
  static {
    __name2(this, "AIPresenceDetector");
  }
  extensionProvider;
  /**
  * Creates a new AIPresenceDetector
  *
  * @param extensionProvider - Platform-specific extension provider
  */
  constructor(extensionProvider) {
    this.extensionProvider = extensionProvider;
  }
  /**
  * Detects the presence of AI coding assistants
  *
  * Queries the extension provider and matches against known AI assistant
  * identifiers to determine which assistants are currently installed.
  *
  * @returns Information about detected AI assistants
  */
  detectAIPresence() {
    const installedExtensionIds = this.extensionProvider.getAllExtensionIds();
    const detectedAssistants = [];
    for (const [name, id] of Object.entries(AI_EXTENSION_IDS)) {
      if (installedExtensionIds.includes(id)) {
        if (!detectedAssistants.includes(name)) {
          detectedAssistants.push(name);
        }
      }
    }
    return {
      hasAI: detectedAssistants.length > 0,
      detectedAssistants,
      assistantDetails: ASSISTANT_DISPLAY_NAMES
    };
  }
  /**
  * Checks if a specific AI assistant is installed
  *
  * @param assistantName - Name of the AI assistant to check
  * @returns True if the assistant is installed
  */
  isAIAssistantInstalled(assistantName) {
    const extensionId = AI_EXTENSION_IDS[assistantName];
    const installedExtensionIds = this.extensionProvider.getAllExtensionIds();
    return installedExtensionIds.includes(extensionId);
  }
  /**
  * Gets a list of all installed AI assistants
  *
  * @returns Array of installed AI assistant names
  */
  getInstalledAIAssistants() {
    const installedExtensionIds = this.extensionProvider.getAllExtensionIds();
    const installed = [];
    for (const [name, id] of Object.entries(AI_EXTENSION_IDS)) {
      if (installedExtensionIds.includes(id)) {
        installed.push(name);
      }
    }
    return installed;
  }
};
var DEFAULT_BURST_CONFIG = {
  /** Time window in milliseconds to consider for burst detection */
  timeWindow: THRESHOLDS.burst.timeWindow,
  /** Minimum number of characters inserted to qualify as burst */
  minCharsInserted: THRESHOLDS.burst.minCharsInserted,
  /** Maximum time between keystrokes to qualify as burst */
  maxKeystrokeInterval: THRESHOLDS.burst.maxKeystrokeInterval,
  /** Minimum number of lines affected to qualify as burst */
  minLinesAffected: THRESHOLDS.burst.minLinesAffected,
  /** Minimum ratio of inserted to deleted chars to qualify as burst */
  minInsertDeleteRatio: THRESHOLDS.burst.minInsertDeleteRatio
};
var BurstHeuristicsDetector = class {
  static {
    __name(this, "BurstHeuristicsDetector");
  }
  static {
    __name2(this, "BurstHeuristicsDetector");
  }
  /** Recent text changes for analysis */
  recentChanges = [];
  /** Timestamp of last change */
  lastChangeTime = 0;
  /** Configuration for burst detection */
  config;
  /**
  * Creates a new BurstHeuristicsDetector
  *
  * @param config Optional configuration to override defaults
  */
  constructor(config) {
    this.config = {
      timeWindow: config?.timeWindow ?? DEFAULT_BURST_CONFIG.timeWindow,
      minCharsInserted: config?.minCharsInserted ?? DEFAULT_BURST_CONFIG.minCharsInserted,
      maxKeystrokeInterval: config?.maxKeystrokeInterval ?? DEFAULT_BURST_CONFIG.maxKeystrokeInterval,
      minLinesAffected: config?.minLinesAffected ?? DEFAULT_BURST_CONFIG.minLinesAffected,
      minInsertDeleteRatio: config?.minInsertDeleteRatio ?? DEFAULT_BURST_CONFIG.minInsertDeleteRatio
    };
  }
  /**
  * Records a text change event for burst analysis
  *
  * @param charsInserted Number of characters inserted
  * @param charsDeleted Number of characters deleted
  * @param linesAffected Number of lines affected
  */
  recordChange(charsInserted, charsDeleted, linesAffected) {
    const now = Date.now();
    const interval = this.lastChangeTime > 0 ? now - this.lastChangeTime : 0;
    const changeInfo = {
      timestamp: now,
      charsInserted,
      charsDeleted,
      linesAffected,
      interval
    };
    this.recentChanges.push(changeInfo);
    this.lastChangeTime = now;
    this.trimOldChanges();
  }
  /**
  * Analyzes recent changes to detect burst patterns
  *
  * @returns Burst detection result
  */
  analyzeBurst() {
    if (this.recentChanges.length < 2) {
      return {
        isBurst: false,
        confidence: 0
      };
    }
    const now = Date.now();
    const windowChanges = this.recentChanges.filter((change) => now - change.timestamp <= this.config.timeWindow);
    if (windowChanges.length < 2) {
      return {
        isBurst: false,
        confidence: 0
      };
    }
    const totalInserted = windowChanges.reduce((sum, change) => sum + change.charsInserted, 0);
    const totalDeleted = windowChanges.reduce((sum, change) => sum + change.charsDeleted, 0);
    const totalLines = windowChanges.reduce((sum, change) => sum + change.linesAffected, 0);
    const duration = windowChanges.length > 1 ? windowChanges[windowChanges.length - 1].timestamp - windowChanges[0].timestamp : 0;
    const meetsCharThreshold = totalInserted >= this.config.minCharsInserted;
    const meetsLineThreshold = totalLines >= this.config.minLinesAffected;
    const ratio = totalDeleted > 0 ? totalInserted / totalDeleted : totalInserted;
    const meetsRatioThreshold = ratio >= this.config.minInsertDeleteRatio;
    const intervals = windowChanges.slice(1).map((change, i) => change.timestamp - windowChanges[i].timestamp);
    const avgInterval = intervals.length > 0 ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : 0;
    const meetsTimingThreshold = avgInterval <= this.config.maxKeystrokeInterval;
    const isBurst = meetsCharThreshold && meetsLineThreshold && meetsRatioThreshold && meetsTimingThreshold;
    let confidence = 0;
    if (isBurst) {
      const charConfidence = Math.min(1, totalInserted / (this.config.minCharsInserted * 2));
      const lineConfidence = Math.min(1, totalLines / (this.config.minLinesAffected * 2));
      const ratioConfidence = Math.min(1, ratio / (this.config.minInsertDeleteRatio * 2));
      const timingConfidence = avgInterval > 0 ? Math.min(1, this.config.maxKeystrokeInterval / (avgInterval * 2)) : 1;
      confidence = (charConfidence + lineConfidence + ratioConfidence + timingConfidence) / 4;
    }
    return {
      isBurst,
      confidence,
      details: isBurst ? {
        totalInserted,
        totalDeleted,
        ratio,
        changeCount: windowChanges.length,
        duration
      } : void 0
    };
  }
  /**
  * Trims old changes outside the analysis time window
  */
  trimOldChanges() {
    const cutoffTime = Date.now() - this.config.timeWindow;
    this.recentChanges = this.recentChanges.filter((change) => change.timestamp >= cutoffTime);
  }
  /**
  * Clears all recorded changes
  */
  clear() {
    this.recentChanges = [];
    this.lastChangeTime = 0;
  }
};
var CursorDetector = class {
  static {
    __name(this, "CursorDetector");
  }
  static {
    __name2(this, "CursorDetector");
  }
  env;
  constructor(env) {
    this.env = env;
  }
  /**
  * Detects Cursor IDE presence via appName heuristic
  */
  detect() {
    const appName = this.env.getAppName().toLowerCase();
    if (appName.includes("cursor")) {
      return {
        hasCursor: true,
        confidence: 7
      };
    }
    return {
      hasCursor: false,
      confidence: 8.5
    };
  }
};
var NoOpLogger = class {
  static {
    __name(this, "NoOpLogger");
  }
  static {
    __name2(this, "NoOpLogger");
  }
  debug() {
  }
  info() {
  }
  error() {
  }
};
var NodeTimerService = class {
  static {
    __name(this, "NodeTimerService");
  }
  static {
    __name2(this, "NodeTimerService");
  }
  timeouts = /* @__PURE__ */ new Map();
  intervals = /* @__PURE__ */ new Map();
  nextId = 0;
  setTimeout(callback, ms) {
    const id = `timeout_${this.nextId++}`;
    const timeout = globalThis.setTimeout(callback, ms);
    this.timeouts.set(id, timeout);
    return id;
  }
  clearTimeout(id) {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      globalThis.clearTimeout(timeout);
      this.timeouts.delete(id);
    }
  }
  setInterval(callback, ms) {
    const id = `interval_${this.nextId++}`;
    const interval = globalThis.setInterval(callback, ms);
    this.intervals.set(id, interval);
    return id;
  }
  clearInterval(id) {
    const interval = this.intervals.get(id);
    if (interval) {
      globalThis.clearInterval(interval);
      this.intervals.delete(id);
    }
  }
  /**
  * Dispose all active timers
  */
  dispose() {
    for (const timeout of this.timeouts.values()) {
      globalThis.clearTimeout(timeout);
    }
    for (const interval of this.intervals.values()) {
      globalThis.clearInterval(interval);
    }
    this.timeouts.clear();
    this.intervals.clear();
  }
};
var DEFAULT_EXPERIENCE_THRESHOLDS = THRESHOLDS.experience;
var ExperienceClassifier = class {
  static {
    __name(this, "ExperienceClassifier");
  }
  static {
    __name2(this, "ExperienceClassifier");
  }
  storage;
  logger;
  thresholds;
  /**
  * Creates a new Experience Classifier
  *
  * @param options - Configuration options
  */
  constructor(options) {
    this.storage = options.storage;
    this.logger = options.logger || new NoOpLogger();
    this.thresholds = options.thresholds || DEFAULT_EXPERIENCE_THRESHOLDS;
  }
  /**
  * Gets the current experience tier for the user
  *
  * @returns The user's experience tier
  */
  async getExperienceTier() {
    const manualTier = await this.storage.get("experienceTier");
    if (manualTier && manualTier !== "unknown") {
      return manualTier;
    }
    const metrics = await this.getExperienceMetrics();
    if (this.meetsThreshold(metrics, "power")) {
      return "power";
    }
    if (this.meetsThreshold(metrics, "intermediate")) {
      return "intermediate";
    }
    if (this.meetsThreshold(metrics, "explorer")) {
      return "explorer";
    }
    return "unknown";
  }
  /**
  * Checks if metrics meet or exceed a threshold tier
  *
  * @param metrics - Experience metrics
  * @param tier - Tier to check against
  * @returns True if metrics meet or exceed the tier
  */
  meetsThreshold(metrics, tier) {
    const threshold = this.thresholds[tier];
    return metrics.snapshotsCreated >= threshold.snapshotsCreated && metrics.sessionsRecorded >= threshold.sessionsRecorded && metrics.protectedFiles >= threshold.protectedFiles && metrics.manualRestores >= threshold.manualRestores && metrics.aiAssistedSessions >= threshold.aiAssistedSessions && metrics.daysSinceFirstUse >= threshold.daysSinceFirstUse && metrics.commandDiversity >= threshold.commandDiversity;
  }
  /**
  * Gets experience metrics for the current user
  *
  * @returns Experience metrics
  */
  async getExperienceMetrics() {
    const snapshotsCreated = await this.storage.get("snapshotsCreated", 0);
    const sessionsRecorded = await this.storage.get("sessionsRecorded", 0);
    const protectedFiles = await this.storage.get("protectedFiles", 0);
    const manualRestores = await this.storage.get("manualRestores", 0);
    const aiAssistedSessions = await this.storage.get("aiAssistedSessions", 0);
    const firstUseTimestamp = await this.storage.get("firstUseTimestamp", Date.now());
    const commandsUsed = await this.storage.get("commandsUsed", {});
    const daysSinceFirstUse = Math.floor((Date.now() - (firstUseTimestamp || Date.now())) / (1e3 * 60 * 60 * 24));
    const commandsUsedRecord = commandsUsed || {};
    const totalCommands = Object.values(commandsUsedRecord).reduce((sum, count) => sum + count, 0);
    const uniqueCommands = Object.keys(commandsUsedRecord).length;
    const commandDiversity = totalCommands > 0 ? uniqueCommands / Math.min(totalCommands, 20) : 0;
    return {
      snapshotsCreated: snapshotsCreated || 0,
      sessionsRecorded: sessionsRecorded || 0,
      protectedFiles: protectedFiles || 0,
      manualRestores: manualRestores || 0,
      aiAssistedSessions: aiAssistedSessions || 0,
      daysSinceFirstUse,
      commandDiversity
    };
  }
  /**
  * Updates experience metrics based on user activity
  *
  * @param activity - Type of activity to record
  * @param count - Number of activities to record (default: 1)
  */
  async updateExperienceMetrics(activity, count = 1) {
    const current = await this.storage.get(activity, 0);
    await this.storage.set(activity, (current || 0) + count);
    const firstUseTimestamp = await this.storage.get("firstUseTimestamp");
    if (!firstUseTimestamp) {
      await this.storage.set("firstUseTimestamp", Date.now());
    }
    this.logger.debug("Experience metrics updated", {
      activity,
      count,
      newValue: (current || 0) + count
    });
  }
  /**
  * Records command usage for diversity calculation
  *
  * @param command - Command that was used
  */
  async recordCommandUsage(command) {
    const commandsUsed = await this.storage.get("commandsUsed", {});
    const commandsUsedRecord = commandsUsed || {};
    commandsUsedRecord[command] = (commandsUsedRecord[command] || 0) + 1;
    await this.storage.set("commandsUsed", commandsUsedRecord);
    this.logger.debug("Command usage recorded", {
      command,
      count: commandsUsedRecord[command]
    });
  }
  /**
  * Sets experience tier manually (for testing)
  *
  * @param tier - Experience tier to set
  */
  async setExperienceTier(tier) {
    await this.storage.set("experienceTier", tier);
    this.logger.info("Experience tier manually set", {
      tier
    });
  }
  /**
  * Resets experience tier (for testing)
  */
  async resetExperienceTier() {
    await this.storage.set("experienceTier", void 0);
    this.logger.info("Experience tier reset");
  }
  /**
  * Gets a description of the user's experience tier
  *
  * @returns Description of the experience tier
  */
  async getExperienceTierDescription() {
    const tier = await this.getExperienceTier();
    switch (tier) {
      case "explorer":
        return "Welcome to SnapBack! You're just getting started with file protection.";
      case "intermediate":
        return "You're becoming a SnapBack pro! You're using multiple protection levels effectively.";
      case "power":
        return "You're a SnapBack expert! You're using the full power of the extension.";
      default:
        return "We're still learning about how you use SnapBack.";
    }
  }
};
var DEFAULT_CONFIG = {
  idleTimeout: THRESHOLDS.session.idleTimeout,
  minSessionDuration: THRESHOLDS.session.minSessionDuration,
  maxSessionDuration: THRESHOLDS.session.maxSessionDuration,
  longSessionCheckInterval: 3e5
};
var SessionCoordinator = class {
  static {
    __name(this, "SessionCoordinator");
  }
  static {
    __name2(this, "SessionCoordinator");
  }
  /** Map of active session candidates by file URI */
  candidates = /* @__PURE__ */ new Map();
  /** Timeout ID for idle detection */
  idleTimeoutId = null;
  /** Interval ID for long session checking */
  longSessionIntervalId = null;
  /** Current session start time */
  sessionStart = Date.now();
  /** Storage adapter */
  storage;
  /** Timer service */
  timers;
  /** Logger */
  logger;
  /** Event emitter (optional) */
  eventEmitter;
  /** Configuration */
  config;
  /**
  * Creates a new SessionCoordinator
  *
  * @param options - Configuration options
  */
  constructor(options) {
    this.storage = options.storage;
    this.timers = options.timers || new NodeTimerService();
    this.logger = options.logger || new NoOpLogger();
    this.eventEmitter = options.eventEmitter;
    this.config = {
      ...DEFAULT_CONFIG,
      ...options.config
    };
    this.sessionStart = Date.now();
    this.resetIdleTimer();
    this.startLongSessionMonitoring();
  }
  /**
  * Add or update a file candidate in the current session
  *
  * @param uri - URI of the file
  * @param snapshotId - ID of the snapshot for this file
  * @param stats - Optional change statistics
  */
  addCandidate(uri, snapshotId, stats) {
    const candidate = {
      uri,
      snapshotId,
      stats,
      updatedAt: Date.now()
    };
    this.candidates.set(uri, candidate);
    this.resetIdleTimer();
    this.logger.debug("Added session candidate", {
      uri,
      snapshotId
    });
  }
  /**
  * Finalize the current session with a specific reason
  *
  * @param reason - Reason for finalizing the session
  * @returns Session ID if finalized, null if skipped
  */
  async finalizeSession(reason) {
    try {
      const now = Date.now();
      const sessionDuration = now - this.sessionStart;
      if (sessionDuration < this.config.minSessionDuration || this.candidates.size === 0) {
        this.logger.debug("Skipping session finalization - session too short or no candidates", {
          duration: sessionDuration,
          candidateCount: this.candidates.size
        });
        this.resetSession();
        return null;
      }
      const sessionId = `session-${randomUUID()}`;
      const manifest = {
        id: sessionId,
        startedAt: this.sessionStart,
        endedAt: now,
        reason,
        files: Array.from(this.candidates.values()).map((candidate) => ({
          uri: candidate.uri,
          snapshotId: candidate.snapshotId,
          changeStats: candidate.stats
        })),
        tags: []
      };
      try {
        await this.storeSessionManifest(manifest);
        if (this.eventEmitter) {
          this.eventEmitter.fire(manifest);
        }
        this.logger.info("Session finalized", {
          sessionId,
          reason,
          fileCount: manifest.files.length,
          duration: sessionDuration
        });
        this.resetSession();
        return sessionId;
      } catch (error) {
        this.logger.error(`Failed to finalize session: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : void 0, {
          sessionId
        });
        return null;
      }
    } catch (error) {
      this.logger.error("Unexpected error in finalizeSession", error instanceof Error ? error : void 0);
      return null;
    }
  }
  /**
  * Handle window blur event - finalize session due to window focus change
  */
  handleWindowBlur() {
    this.finalizeSession("blur");
  }
  /**
  * Handle git commit event - finalize session due to git commit
  */
  handleGitCommit() {
    this.finalizeSession("commit");
  }
  /**
  * Handle task completion event - finalize session due to task completion
  */
  handleTaskCompletion() {
    this.finalizeSession("task");
  }
  /**
  * Handle manual session finalization
  */
  handleManualFinalization() {
    this.finalizeSession("manual");
  }
  /**
  * Handle idle timeout - finalize session due to inactivity
  */
  handleIdleTimeout() {
    if (this.candidates.size > 0) {
      this.finalizeSession("idle-break");
    } else {
      this.sessionStart = Date.now();
    }
  }
  /**
  * Check for long-running sessions and finalize them if needed
  */
  checkLongSession() {
    const now = Date.now();
    const sessionDuration = now - this.sessionStart;
    if (sessionDuration > this.config.maxSessionDuration && this.candidates.size > 0) {
      this.logger.info("Finalizing long-running session", {
        duration: sessionDuration,
        maxDuration: this.config.maxSessionDuration,
        candidateCount: this.candidates.size
      });
      this.finalizeSession("max-duration");
    }
  }
  /**
  * Reset the idle timer
  */
  resetIdleTimer() {
    if (this.idleTimeoutId) {
      this.timers.clearTimeout(this.idleTimeoutId);
    }
    this.idleTimeoutId = this.timers.setTimeout(() => {
      this.handleIdleTimeout();
    }, this.config.idleTimeout);
  }
  /**
  * Start monitoring for long sessions
  */
  startLongSessionMonitoring() {
    this.longSessionIntervalId = this.timers.setInterval(() => {
      this.checkLongSession();
    }, this.config.longSessionCheckInterval);
  }
  /**
  * Reset session state for the next session
  */
  resetSession() {
    this.candidates.clear();
    this.sessionStart = Date.now();
    if (this.idleTimeoutId) {
      this.timers.clearTimeout(this.idleTimeoutId);
    }
    this.resetIdleTimer();
  }
  /**
  * Store session manifest in persistent storage
  *
  * @param manifest - Session manifest to store
  */
  async storeSessionManifest(manifest) {
    try {
      await this.storage.storeSessionManifest(manifest);
      this.logger.debug("Stored session manifest", {
        sessionId: manifest.id,
        fileCount: manifest.files.length
      });
    } catch (error) {
      this.logger.error("Failed to store session manifest", error instanceof Error ? error : new Error(String(error)), {
        sessionId: manifest.id
      });
      throw error;
    }
  }
  /**
  * Get the number of active candidates (for testing)
  */
  getCandidateCount() {
    return this.candidates.size;
  }
  /**
  * Get the session start time (for testing)
  */
  getSessionStart() {
    return this.sessionStart;
  }
  /**
  * Dispose of the session coordinator and clean up resources
  */
  dispose() {
    if (this.idleTimeoutId) {
      this.timers.clearTimeout(this.idleTimeoutId);
    }
    if (this.longSessionIntervalId) {
      this.timers.clearInterval(this.longSessionIntervalId);
    }
    if (this.eventEmitter) {
      this.eventEmitter.dispose();
    }
  }
};
var SessionSummaryGenerator = class {
  static {
    __name(this, "SessionSummaryGenerator");
  }
  static {
    __name2(this, "SessionSummaryGenerator");
  }
  snapshotProvider;
  logger;
  /**
  * Creates a new SessionSummaryGenerator
  *
  * @param options - Configuration options (optional)
  */
  constructor(options) {
    this.snapshotProvider = options?.snapshotProvider;
    this.logger = options?.logger || createSilentLogger();
  }
  /**
  * Generates a deterministic summary for a session
  *
  * Creates a human-readable summary that describes the changes in a session
  * without including any sensitive content or file paths.
  *
  * @param session - Session manifest to summarize
  * @returns Promise that resolves to a session summary
  */
  async generateSummary(session) {
    try {
      if (this.snapshotProvider) {
        return await this.generateDetailedSummary(session);
      }
      return this.generateMetadataSummary(session);
    } catch (error) {
      this.logger.error("Failed to generate session summary", error instanceof Error ? error : void 0, {
        error
      });
      return "Session summary unavailable";
    }
  }
  /**
  * Generates a detailed summary by analyzing actual file changes
  *
  * @param session - Session manifest to summarize
  * @returns Promise that resolves to a detailed session summary
  */
  async generateDetailedSummary(session) {
    try {
      const allIdentifiers = /* @__PURE__ */ new Set();
      for (const fileEntry of session.files) {
        try {
          const snapshot = await this.snapshotProvider?.get(fileEntry.snapshotId);
          if (snapshot?.fileContents) {
            for (const [filePath, content] of Object.entries(snapshot.fileContents)) {
              const identifiers = await this.extractTopIdentifiers(content, filePath);
              for (const identifier of identifiers) {
                allIdentifiers.add(identifier);
              }
            }
          }
        } catch (error) {
          this.logger.error(`Failed to process file ${fileEntry.uri} for summary`, void 0, {
            error
          });
        }
      }
      const fileCount = session.files.length;
      const duration = Math.round((session.endedAt - session.startedAt) / 1e3);
      let summary = "";
      if (fileCount === 0) {
        summary = "Empty session";
      } else if (fileCount === 1) {
        summary = `Modified 1 file over ${duration}s`;
      } else {
        summary = `Modified ${fileCount} files over ${duration}s`;
      }
      const aiTags = session.tags?.filter((tag) => tag.includes("ai") || tag.includes("copilot") || tag.includes("claude"));
      if (aiTags && aiTags.length > 0) {
        summary = `[AI] ${summary}`;
      }
      if (allIdentifiers.size > 0) {
        const topIdentifiers = Array.from(allIdentifiers).slice(0, 3);
        summary += ` - ${topIdentifiers.join(", ")}`;
      }
      return summary;
    } catch (error) {
      this.logger.error("Failed to generate detailed session summary", error instanceof Error ? error : void 0, {
        error
      });
      return this.generateMetadataSummary(session);
    }
  }
  /**
  * Generates a summary based on session metadata only
  *
  * @param session - Session manifest to summarize
  * @returns Session summary based on metadata
  */
  generateMetadataSummary(session) {
    const fileCount = session.files.length;
    const duration = Math.round((session.endedAt - session.startedAt) / 1e3);
    if (fileCount === 0) {
      return "Empty session";
    }
    const aiTags = session.tags?.filter((tag) => tag.includes("ai") || tag.includes("copilot") || tag.includes("claude"));
    const aiPrefix = aiTags && aiTags.length > 0 ? "[AI] " : "";
    if (fileCount === 1) {
      return `${aiPrefix}Modified 1 file over ${duration}s`;
    }
    return `${aiPrefix}Modified ${fileCount} files over ${duration}s`;
  }
  /**
  * Extracts top identifiers from file content for use in summaries
  *
  * Uses regex-based extraction to identify the most important identifiers
  * (functions, classes, variables) in the file content.
  *
  * @param content - File content to analyze
  * @param filePath - Path to the file (used to determine language)
  * @returns Promise that resolves to array of top identifiers
  */
  async extractTopIdentifiers(content, filePath) {
    try {
      const extension = path10.extname(filePath).toLowerCase();
      if (extension === ".ts" || extension === ".js" || extension === ".tsx" || extension === ".jsx") {
        return this.extractIdentifiersWithRegex(content);
      }
      return this.extractIdentifiersWithRegex(content);
    } catch (error) {
      this.logger.error(`Failed to extract identifiers from ${filePath}`, void 0, {
        error
      });
      return this.extractIdentifiersWithRegex(content);
    }
  }
  /**
  * Extracts identifiers using regex patterns
  *
  * @param content - File content
  * @returns Array of identifiers
  */
  extractIdentifiersWithRegex(content) {
    const patterns = [
      /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g
    ];
    const identifiers = /* @__PURE__ */ new Set();
    for (const pattern of patterns) {
      let match2 = pattern.exec(content);
      while (match2 !== null) {
        const identifier = match2[1];
        if (identifier.length > 2 && !this.isCommonKeyword(identifier)) {
          identifiers.add(identifier);
        }
        match2 = pattern.exec(content);
      }
    }
    return Array.from(identifiers).slice(0, 5);
  }
  /**
  * Checks if an identifier is a common keyword that should be excluded
  *
  * @param identifier - Identifier to check
  * @returns True if it's a common keyword
  */
  isCommonKeyword(identifier) {
    const commonKeywords = /* @__PURE__ */ new Set([
      "if",
      "else",
      "for",
      "while",
      "do",
      "switch",
      "case",
      "break",
      "continue",
      "try",
      "catch",
      "finally",
      "throw",
      "return",
      "yield",
      "await",
      "async",
      "function",
      "const",
      "let",
      "var",
      "class",
      "interface",
      "type",
      "enum",
      "import",
      "export",
      "from",
      "as",
      "default",
      "extends",
      "implements",
      "static",
      "public",
      "private",
      "protected",
      "readonly",
      "abstract",
      "get",
      "set",
      "constructor",
      "super",
      "this",
      "new",
      "delete",
      "typeof",
      "instanceof",
      "in",
      "of",
      "void",
      "null",
      "undefined",
      "true",
      "false",
      "boolean",
      "number",
      "string",
      "object",
      "symbol",
      "bigint",
      "any",
      "unknown",
      "never",
      "void",
      "undefined",
      "null",
      "Promise",
      "Array",
      "String",
      "Number",
      "Boolean",
      "Object",
      "Function",
      "RegExp",
      "Date",
      "Error",
      "Map",
      "Set",
      "WeakMap",
      "WeakSet",
      "Proxy",
      "Reflect"
    ]);
    return commonKeywords.has(identifier);
  }
};
var DEFAULT_CONFIG2 = {
  minBurstConfidence: THRESHOLDS.tagging.minBurstConfidence,
  minLongSessionDuration: THRESHOLDS.tagging.minLongSessionDuration,
  maxShortSessionDuration: THRESHOLDS.tagging.maxShortSessionDuration,
  minLargeEditLines: THRESHOLDS.tagging.minLargeEditLines,
  normalization: {
    multiFileThreshold: THRESHOLDS.tagging.normalization.multiFileThreshold,
    multiFileNormalization: THRESHOLDS.tagging.normalization.multiFileNormalization,
    longSessionNormalization: THRESHOLDS.tagging.normalization.longSessionNormalization,
    largeEditsNormalization: THRESHOLDS.tagging.normalization.largeEditsNormalization
  }
};
var SessionTagger = class {
  static {
    __name(this, "SessionTagger");
  }
  static {
    __name2(this, "SessionTagger");
  }
  aiPresenceDetector;
  config;
  /**
  * Creates a new SessionTagger
  *
  * @param options Optional configuration and dependencies
  */
  constructor(options) {
    this.aiPresenceDetector = options?.aiPresenceDetector;
    this.config = {
      ...DEFAULT_CONFIG2,
      ...options?.config,
      normalization: {
        ...DEFAULT_CONFIG2.normalization,
        ...options?.config?.normalization
      }
    };
  }
  /**
  * Analyzes a session and generates appropriate tags
  *
  * @param manifest Session manifest to analyze
  * @param burstResult Optional burst detection result
  * @returns Session tagging result with tags and confidence levels
  */
  tagSession(manifest, burstResult) {
    const tags = [
      ...manifest.tags || []
    ];
    const confidence = {};
    const reasons = {};
    this.addReasonTags(manifest.reason, tags, confidence, reasons);
    const multiFileThreshold = this.config.normalization?.multiFileThreshold;
    if (multiFileThreshold && manifest.files.length > multiFileThreshold) {
      tags.push("multi-file");
      confidence["multi-file"] = Math.min(1, manifest.files.length / (this.config.normalization?.multiFileNormalization || 1));
      reasons["multi-file"] = `Session involved ${manifest.files.length} files`;
    }
    const duration = manifest.endedAt - manifest.startedAt;
    if (duration > this.config.minLongSessionDuration) {
      tags.push("long-session");
      confidence["long-session"] = Math.min(1, duration / (this.config.normalization?.longSessionNormalization || 1));
      reasons["long-session"] = `Session lasted ${Math.round(duration / 6e4)} minutes`;
    } else if (duration < this.config.maxShortSessionDuration) {
      tags.push("short-session");
      confidence["short-session"] = Math.min(1, this.config.maxShortSessionDuration / duration);
      reasons["short-session"] = `Session lasted ${Math.round(duration / 1e3)} seconds`;
    }
    const totalAdded = manifest.files.reduce((sum, file) => {
      return sum + (file.changeStats?.added || 0);
    }, 0);
    if (totalAdded > this.config.minLargeEditLines) {
      tags.push("large-edits");
      confidence["large-edits"] = Math.min(1, totalAdded / (this.config.normalization?.largeEditsNormalization || 1));
      reasons["large-edits"] = `Session involved ${totalAdded} lines added`;
    }
    if (this.aiPresenceDetector) {
      const aiPresence = this.aiPresenceDetector();
      if (aiPresence.hasAI) {
        tags.push("ai-assisted");
        confidence["ai-assisted"] = 0.9;
        reasons["ai-assisted"] = `AI assistants detected: ${aiPresence.detectedAssistants.join(", ")}`;
        for (const assistant of aiPresence.detectedAssistants) {
          const assistantName = assistant.toLowerCase().replace(/_/g, "-").replace("github-", "");
          const tag = `${assistantName}-like`;
          tags.push(tag);
          confidence[tag] = 0.8;
          reasons[tag] = `Detected ${aiPresence.assistantDetails[assistant]} presence`;
        }
      }
    }
    if (burstResult?.isBurst) {
      tags.push("burst");
      confidence.burst = burstResult.confidence;
      reasons.burst = "Session contained rapid, large insertions characteristic of AI assistance";
    }
    const uniqueTags = Array.from(new Set(tags));
    return {
      tags: uniqueTags,
      confidence,
      reasons
    };
  }
  /**
  * Updates a session manifest with appropriate tags
  *
  * @param manifest Session manifest to update
  * @param burstResult Optional burst detection result
  * @returns Updated session manifest with tags
  */
  updateSessionWithTags(manifest, burstResult) {
    const taggingResult = this.tagSession(manifest, burstResult);
    return {
      ...manifest,
      tags: taggingResult.tags
    };
  }
  /**
  * Adds tags based on session finalization reason
  */
  addReasonTags(reason, tags, confidence, reasons) {
    switch (reason) {
      case "manual":
        tags.push("manual");
        confidence.manual = 1;
        reasons.manual = "Session was manually finalized";
        break;
      case "idle-break":
        tags.push("manual");
        confidence.manual = 0.8;
        reasons.manual = "Session ended due to idle timeout";
        break;
      case "blur":
        tags.push("manual");
        confidence.manual = 0.8;
        reasons.manual = "Session ended when window lost focus";
        break;
      case "task":
        tags.push("manual");
        confidence.manual = 0.9;
        reasons.manual = "Session ended due to task boundary";
        break;
      case "commit":
        tags.push("manual");
        confidence.manual = 0.95;
        reasons.manual = "Session ended with git commit";
        break;
    }
  }
};
var EncryptionService = class {
  static {
    __name(this, "EncryptionService");
  }
  static {
    __name2(this, "EncryptionService");
  }
  PBKDF2_ITERATIONS = 1e5;
  KEY_LENGTH = 256;
  ALGORITHM = "aes-256-gcm";
  IV_LENGTH = 12;
  /**
  * Derive encryption key from user secret using PBKDF2
  */
  async deriveKey(userSecret, salt) {
    const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(userSecret), {
      name: "PBKDF2"
    }, false, [
      "deriveKey"
    ]);
    return crypto.subtle.deriveKey({
      name: "PBKDF2",
      salt,
      iterations: this.PBKDF2_ITERATIONS,
      hash: "SHA-256"
    }, keyMaterial, {
      name: this.ALGORITHM,
      length: this.KEY_LENGTH
    }, false, [
      "encrypt",
      "decrypt"
    ]);
  }
  /**
  * Generate SHA-256 checksum of data for integrity verification
  */
  async generateChecksum(data) {
    const buffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  /**
  * Encrypt a snapshot with user secret
  * @param snapshot - Snapshot object to encrypt
  * @param userSecret - User's encryption secret (from auth session or user input)
  * @returns Encrypted blob ready for upload
  */
  async encryptSnapshot(snapshot, userSecret) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(userSecret, salt);
    const plaintext = JSON.stringify(snapshot);
    const checksum = await this.generateChecksum(plaintext);
    const plaintextBuffer = new TextEncoder().encode(plaintext);
    const ciphertextBuffer = await crypto.subtle.encrypt({
      name: this.ALGORITHM,
      iv
    }, key, plaintextBuffer);
    return {
      version: 1,
      salt: Array.from(salt),
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(ciphertextBuffer)),
      timestamp: Date.now(),
      checksum
    };
  }
  /**
  * Decrypt an encrypted blob
  * @param blob - Encrypted blob from cloud
  * @param userSecret - User's encryption secret
  * @returns Original snapshot object
  * @throws Error if decryption fails or checksum mismatch
  */
  async decryptSnapshot(blob, userSecret) {
    const salt = new Uint8Array(blob.salt);
    const iv = new Uint8Array(blob.iv);
    const ciphertext = new Uint8Array(blob.ciphertext);
    const key = await this.deriveKey(userSecret, salt);
    let plaintextBuffer;
    try {
      plaintextBuffer = await crypto.subtle.decrypt({
        name: this.ALGORITHM,
        iv
      }, key, ciphertext);
    } catch (_error) {
      throw new Error("Decryption failed. Wrong password or corrupted data.");
    }
    const plaintext = new TextDecoder().decode(plaintextBuffer);
    const checksum = await this.generateChecksum(plaintext);
    if (checksum !== blob.checksum) {
      throw new Error("Checksum mismatch. Data may be corrupted.");
    }
    return JSON.parse(plaintext);
  }
  /**
  * Verify if a user secret can decrypt a blob without full decryption
  * (Faster than full decrypt for password verification)
  */
  async verifySecret(blob, userSecret) {
    try {
      await this.decryptSnapshot(blob, userSecret);
      return true;
    } catch {
      return false;
    }
  }
  /**
  * Encrypt plaintext data using AES-256-GCM (legacy method for backward compatibility)
  *
  * @param plaintext Data to encrypt
  * @returns Encrypted data with IV and authentication tag
  */
  encrypt(plaintext) {
    const key = Buffer.from("0123456789abcdef0123456789abcdef", "hex");
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    return {
      ciphertext: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      algorithm: this.ALGORITHM
    };
  }
  /**
  * Decrypt encrypted data using AES-256-GCM (legacy method for backward compatibility)
  *
  * @param encrypted Encrypted data with IV and auth tag
  * @returns Decrypted plaintext
  */
  decrypt(encrypted) {
    if (encrypted.algorithm !== this.ALGORITHM) {
      throw new Error(`Unsupported algorithm: ${encrypted.algorithm}`);
    }
    const key = Buffer.from("0123456789abcdef0123456789abcdef", "hex");
    const decipher = createDecipheriv(this.ALGORITHM, key, Buffer.from(encrypted.iv, "base64"));
    decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
      decipher.final()
    ]);
    return decrypted.toString("utf8");
  }
  /**
  * Compute content hash for deduplication (post-encryption)
  *
  * @param content Original plaintext content
  * @returns SHA-256 hash for deduplication
  */
  computeContentHash(content) {
    return createHash("sha256").update(content).digest("hex");
  }
};
var SnapBackError = class extends Error {
  static {
    __name(this, "SnapBackError");
  }
  static {
    __name2(this, "SnapBackError");
  }
  code;
  context;
  cause;
  timestamp;
  constructor(message, code, context, cause) {
    super(message), this.code = code, this.context = context, this.cause = cause;
    this.name = this.constructor.name;
    this.timestamp = Date.now();
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  /**
  * Serialize error to JSON for logging/API responses
  */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : void 0
    };
  }
};
var SnapshotError = class extends SnapBackError {
  static {
    __name(this, "SnapshotError");
  }
  static {
    __name2(this, "SnapshotError");
  }
};
var SnapshotNotFoundError = class extends SnapshotError {
  static {
    __name(this, "SnapshotNotFoundError");
  }
  static {
    __name2(this, "SnapshotNotFoundError");
  }
  snapshotId;
  constructor(snapshotId, cause) {
    super(`Snapshot not found: ${snapshotId}`, "SNAPSHOT_NOT_FOUND", {
      snapshotId
    }, cause), this.snapshotId = snapshotId;
  }
};
var SnapshotCreationError = class extends SnapshotError {
  static {
    __name(this, "SnapshotCreationError");
  }
  static {
    __name2(this, "SnapshotCreationError");
  }
  constructor(message, context, cause) {
    super(message, "SNAPSHOT_CREATION_ERROR", context, cause);
  }
};
var SnapshotDuplicateError = class extends SnapshotError {
  static {
    __name(this, "SnapshotDuplicateError");
  }
  static {
    __name2(this, "SnapshotDuplicateError");
  }
  existingId;
  constructor(existingId, context) {
    super(existingId ? `Duplicate snapshot detected (existing: ${existingId})` : "Duplicate snapshot detected", "SNAPSHOT_DUPLICATE", {
      existingId,
      ...context
    }), this.existingId = existingId;
  }
};
var SnapshotProtectedError = class extends SnapshotError {
  static {
    __name(this, "SnapshotProtectedError");
  }
  static {
    __name2(this, "SnapshotProtectedError");
  }
  snapshotId;
  constructor(snapshotId) {
    super(`Cannot modify protected snapshot: ${snapshotId}`, "SNAPSHOT_PROTECTED", {
      snapshotId
    }), this.snapshotId = snapshotId;
  }
};
var SnapshotRestoreError = class extends SnapshotError {
  static {
    __name(this, "SnapshotRestoreError");
  }
  static {
    __name2(this, "SnapshotRestoreError");
  }
  snapshotId;
  constructor(message, snapshotId, context, cause) {
    super(message, "SNAPSHOT_RESTORE_ERROR", {
      snapshotId,
      ...context
    }, cause), this.snapshotId = snapshotId;
  }
};
var SnapshotVersionError = class extends SnapshotError {
  static {
    __name(this, "SnapshotVersionError");
  }
  static {
    __name2(this, "SnapshotVersionError");
  }
  version;
  supportedVersions;
  constructor(version, supportedVersions) {
    super(`Incompatible snapshot version: ${version}. Supported: ${supportedVersions.join(", ")}`, "SNAPSHOT_VERSION_INCOMPATIBLE", {
      version,
      supportedVersions
    }), this.version = version, this.supportedVersions = supportedVersions;
  }
};
var SnapshotVerificationError = class extends SnapshotError {
  static {
    __name(this, "SnapshotVerificationError");
  }
  static {
    __name2(this, "SnapshotVerificationError");
  }
  filePath;
  expected;
  actual;
  constructor(filePath, expected, actual) {
    super(`Verification failed for ${filePath}: checksum mismatch`, "SNAPSHOT_VERIFICATION_FAILED", {
      filePath,
      expected,
      actual
    }), this.filePath = filePath, this.expected = expected, this.actual = actual;
  }
};
var StorageError = class extends SnapBackError {
  static {
    __name(this, "StorageError");
  }
  static {
    __name2(this, "StorageError");
  }
};
var StorageFullError = class extends StorageError {
  static {
    __name(this, "StorageFullError");
  }
  static {
    __name2(this, "StorageFullError");
  }
  required;
  available;
  constructor(required, available, cause) {
    super(`Storage full: ${required}MB required, ${available}MB available`, "STORAGE_FULL", {
      required,
      available,
      retryable: false
    }, cause), this.required = required, this.available = available;
  }
};
var StorageLockError = class extends StorageError {
  static {
    __name(this, "StorageLockError");
  }
  static {
    __name2(this, "StorageLockError");
  }
  resource;
  constructor(resource, cause) {
    super(`Resource locked: ${resource}`, "STORAGE_LOCK", {
      resource,
      retryable: true
    }, cause), this.resource = resource;
  }
};
var StorageIOError = class extends StorageError {
  static {
    __name(this, "StorageIOError");
  }
  static {
    __name2(this, "StorageIOError");
  }
  path;
  constructor(message, path11, cause) {
    super(message, "STORAGE_IO_ERROR", {
      path: path11
    }, cause), this.path = path11;
  }
};
var ValidationError = class extends SnapBackError {
  static {
    __name(this, "ValidationError");
  }
  static {
    __name2(this, "ValidationError");
  }
  constructor(message, code = "VALIDATION_ERROR", context, cause) {
    super(message, code, context, cause);
  }
};
var InputValidationError = class extends ValidationError {
  static {
    __name(this, "InputValidationError");
  }
  static {
    __name2(this, "InputValidationError");
  }
  field;
  value;
  constructor(message, field, value) {
    super(message, "INPUT_VALIDATION_ERROR", {
      field,
      value
    }), this.field = field, this.value = value;
  }
};
var PathValidationError = class extends ValidationError {
  static {
    __name(this, "PathValidationError");
  }
  static {
    __name2(this, "PathValidationError");
  }
  path;
  constructor(message, path11) {
    super(message, "PATH_VALIDATION_ERROR", {
      path: path11
    }), this.path = path11;
  }
};
var MissingContentError = class extends ValidationError {
  static {
    __name(this, "MissingContentError");
  }
  static {
    __name2(this, "MissingContentError");
  }
  filePath;
  constructor(filePath) {
    super(`Missing content for file: ${filePath}`, "MISSING_CONTENT", {
      filePath
    }), this.filePath = filePath;
  }
};
var ApiError = class extends SnapBackError {
  static {
    __name(this, "ApiError");
  }
  static {
    __name2(this, "ApiError");
  }
  status;
  constructor(message, code, status, context, cause) {
    super(message, code, {
      status,
      ...context
    }, cause), this.status = status;
  }
};
var RateLimitError = class extends ApiError {
  static {
    __name(this, "RateLimitError");
  }
  static {
    __name2(this, "RateLimitError");
  }
  retryAfter;
  constructor(retryAfter, cause) {
    super(`Rate limit exceeded. Retry after ${retryAfter}ms`, "RATE_LIMIT_EXCEEDED", 429, {
      retryAfter,
      retryable: true
    }, cause), this.retryAfter = retryAfter;
  }
};
var AuthenticationError = class extends ApiError {
  static {
    __name(this, "AuthenticationError");
  }
  static {
    __name2(this, "AuthenticationError");
  }
  constructor(message = "Authentication required", cause) {
    super(message, "AUTHENTICATION_REQUIRED", 401, void 0, cause);
  }
};
var AuthorizationError = class extends ApiError {
  static {
    __name(this, "AuthorizationError");
  }
  static {
    __name2(this, "AuthorizationError");
  }
  constructor(message = "Access denied", cause) {
    super(message, "ACCESS_DENIED", 403, void 0, cause);
  }
};
function isSnapBackError(error) {
  return error instanceof SnapBackError;
}
__name(isSnapBackError, "isSnapBackError");
__name2(isSnapBackError, "isSnapBackError");
function isSnapshotError(error) {
  return error instanceof SnapshotError;
}
__name(isSnapshotError, "isSnapshotError");
__name2(isSnapshotError, "isSnapshotError");
function isStorageError(error) {
  return error instanceof StorageError;
}
__name(isStorageError, "isStorageError");
__name2(isStorageError, "isStorageError");
function isValidationError(error) {
  return error instanceof ValidationError;
}
__name(isValidationError, "isValidationError");
__name2(isValidationError, "isValidationError");
function isApiError(error) {
  return error instanceof ApiError;
}
__name(isApiError, "isApiError");
__name2(isApiError, "isApiError");
function isRetryableError(error) {
  if (isSnapBackError(error)) {
    return error.context?.retryable === true;
  }
  return false;
}
__name(isRetryableError, "isRetryableError");
__name2(isRetryableError, "isRetryableError");
function toError(error) {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof error.message === "string") {
      return new Error(error.message);
    }
    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error(String(error));
    }
  }
  return new Error(String(error));
}
__name(toError, "toError");
__name2(toError, "toError");
function ensureSnapBackError(error, code = "UNKNOWN_ERROR", context) {
  if (error instanceof SnapBackError) {
    return error;
  }
  const baseError = toError(error);
  return new SnapBackError(baseError.message, code, context, baseError);
}
__name(ensureSnapBackError, "ensureSnapBackError");
__name2(ensureSnapBackError, "ensureSnapBackError");
function toError2(error) {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof error.message === "string") {
      return new Error(error.message);
    }
    try {
      return new Error(JSON.stringify(error));
    } catch (_stringifyError) {
      return new Error(String(error));
    }
  }
  return new Error(String(error));
}
__name(toError2, "toError2");
__name2(toError2, "toError");
function ok(value) {
  return {
    success: true,
    value
  };
}
__name(ok, "ok");
__name2(ok, "ok");
function err(error) {
  return {
    success: false,
    error
  };
}
__name(err, "err");
__name2(err, "err");
function isOk(result) {
  return result.success === true;
}
__name(isOk, "isOk");
__name2(isOk, "isOk");
function isErr(result) {
  return result.success === false;
}
__name(isErr, "isErr");
__name2(isErr, "isErr");
function map(result, fn) {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}
__name(map, "map");
__name2(map, "map");
function mapErr(result, fn) {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
}
__name(mapErr, "mapErr");
__name2(mapErr, "mapErr");
function andThen(result, fn) {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}
__name(andThen, "andThen");
__name2(andThen, "andThen");
function unwrap(result) {
  if (isOk(result)) {
    return result.value;
  }
  if (result.error instanceof Error) {
    throw result.error;
  }
  throw new Error(String(result.error));
}
__name(unwrap, "unwrap");
__name2(unwrap, "unwrap");
function unwrapOr(result, defaultValue) {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}
__name(unwrapOr, "unwrapOr");
__name2(unwrapOr, "unwrapOr");
function unwrapOrElse(result, fn) {
  if (isOk(result)) {
    return result.value;
  }
  return fn(result.error);
}
__name(unwrapOrElse, "unwrapOrElse");
__name2(unwrapOrElse, "unwrapOrElse");
async function fromPromise(promise) {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(toError2(error));
  }
}
__name(fromPromise, "fromPromise");
__name2(fromPromise, "fromPromise");
async function fromPromiseWith(promise, errorMapper) {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(errorMapper(error));
  }
}
__name(fromPromiseWith, "fromPromiseWith");
__name2(fromPromiseWith, "fromPromiseWith");
function sequence(results) {
  const values = [];
  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.value);
  }
  return ok(values);
}
__name(sequence, "sequence");
__name2(sequence, "sequence");
function tryAll(operations) {
  const errors = [];
  for (const op of operations) {
    const result = op();
    if (isOk(result)) {
      return result;
    }
    errors.push(result.error);
  }
  return err(errors);
}
__name(tryAll, "tryAll");
__name2(tryAll, "tryAll");
function tap(result, fn) {
  if (isOk(result)) {
    fn(result.value);
  }
  return result;
}
__name(tap, "tap");
__name2(tap, "tap");
function tapErr(result, fn) {
  if (isErr(result)) {
    fn(result.error);
  }
  return result;
}
__name(tapErr, "tapErr");
__name2(tapErr, "tapErr");
function match(result, handlers) {
  if (isOk(result)) {
    return handlers.ok(result.value);
  }
  return handlers.err(result.error);
}
__name(match, "match");
__name2(match, "match");
function toPromise(result) {
  if (isOk(result)) {
    return Promise.resolve(result.value);
  }
  if (result.error instanceof Error) {
    return Promise.reject(result.error);
  }
  return Promise.reject(new Error(String(result.error)));
}
__name(toPromise, "toPromise");
__name2(toPromise, "toPromise");
function all(results) {
  return sequence(results);
}
__name(all, "all");
__name2(all, "all");
function allOrErrors(results) {
  const values = [];
  const errors = [];
  for (const result of results) {
    if (isOk(result)) {
      values.push(result.value);
    } else {
      errors.push(result.error);
    }
  }
  if (errors.length > 0) {
    return err(errors);
  }
  return ok(values);
}
__name(allOrErrors, "allOrErrors");
__name2(allOrErrors, "allOrErrors");
function tryCatch(fn) {
  return (...args) => {
    try {
      return ok(fn(...args));
    } catch (error) {
      return err(toError2(error));
    }
  };
}
__name(tryCatch, "tryCatch");
__name2(tryCatch, "tryCatch");
function tryCatchAsync(fn) {
  return async (...args) => {
    try {
      const value = await fn(...args);
      return ok(value);
    } catch (error) {
      return err(toError2(error));
    }
  };
}
__name(tryCatchAsync, "tryCatchAsync");
__name2(tryCatchAsync, "tryCatchAsync");
var DEFAULT_MAX_SIZE = 10 * 1024 * 1024;
async function atomicWriteFile(path11, content, options = {}) {
  const { encoding = "utf8", maxSize = DEFAULT_MAX_SIZE, mode } = options;
  try {
    const buffer = typeof content === "string" ? Buffer.from(content, encoding) : content;
    if (buffer.length > maxSize) {
      return err(new Error(`Content size (${buffer.length} bytes) exceeds maximum allowed (${maxSize} bytes)`));
    }
    const tempSuffix = randomBytes(8).toString("hex");
    const tempPath = `${path11}.${tempSuffix}.tmp`;
    try {
      await writeFile(tempPath, buffer, {
        mode
      });
      await rename(tempPath, path11);
      return ok(void 0);
    } catch (error) {
      try {
        await unlink(tempPath);
      } catch {
      }
      throw error;
    }
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
__name(atomicWriteFile, "atomicWriteFile");
__name2(atomicWriteFile, "atomicWriteFile");
function atomicWriteFileSync(path11, content, options = {}) {
  const { encoding = "utf8", maxSize = DEFAULT_MAX_SIZE, mode } = options;
  try {
    const contentSize = Buffer.byteLength(content, encoding);
    if (contentSize > maxSize) {
      return {
        success: false,
        error: `Content size (${contentSize} bytes) exceeds maximum allowed (${maxSize} bytes)`
      };
    }
    const tempSuffix = randomBytes(8).toString("hex");
    const tempPath = `${path11}.${tempSuffix}.tmp`;
    try {
      writeFileSync(tempPath, content, {
        encoding,
        mode
      });
      renameSync(tempPath, path11);
      return {
        success: true
      };
    } catch (error) {
      try {
        unlinkSync(tempPath);
      } catch {
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Atomic write failed: ${message}`
    };
  }
}
__name(atomicWriteFileSync, "atomicWriteFileSync");
__name2(atomicWriteFileSync, "atomicWriteFileSync");
async function analyze(client, envelope, request) {
  const idempotentEnvelope = ensureIdempotentRequestId(envelope);
  try {
    const response = await client.getHttpClient().post("v1/analyze", {
      json: {
        ...request,
        envelope: idempotentEnvelope
      },
      timeout: 3e4
    }).json();
    return response;
  } catch (error) {
    logger.error("Analysis failed", {
      error
    });
    throw new Error(`Analysis failed: ${error.message}`);
  }
}
__name(analyze, "analyze");
__name2(analyze, "analyze");
async function evaluatePolicy(client, envelope, request) {
  const idempotentEnvelope = ensureIdempotentRequestId(envelope);
  try {
    const response = await client.getHttpClient().post("v1/policy/evaluate", {
      json: {
        ...request,
        envelope: idempotentEnvelope
      },
      timeout: 3e4
    }).json();
    return response;
  } catch (error) {
    logger.error("Policy evaluation failed", {
      error
    });
    throw new Error(`Policy evaluation failed: ${error.message}`);
  }
}
__name(evaluatePolicy, "evaluatePolicy");
__name2(evaluatePolicy, "evaluatePolicy");
async function ingestTelemetry(client, envelope, data) {
  const idempotentEnvelope = ensureIdempotentRequestId(envelope);
  try {
    const response = await client.getHttpClient().post("v1/telemetry", {
      json: {
        ...data,
        envelope: idempotentEnvelope
      },
      timeout: 3e4
    }).json();
    return response;
  } catch (error) {
    logger.error("Telemetry ingestion failed", {
      error
    });
    throw new Error(`Telemetry ingestion failed: ${error.message}`);
  }
}
__name(ingestTelemetry, "ingestTelemetry");
__name2(ingestTelemetry, "ingestTelemetry");
function ensureIdempotentRequestId(envelope) {
  if (!envelope.request_id) {
    return {
      ...envelope,
      request_id: generateRequestId()
    };
  }
  return envelope;
}
__name(ensureIdempotentRequestId, "ensureIdempotentRequestId");
__name2(ensureIdempotentRequestId, "ensureIdempotentRequestId");
function generateRequestId() {
  return `${Date.now()}-${crypto2__default__default.randomUUID().substring(0, 10)}`;
}
__name(generateRequestId, "generateRequestId");
__name2(generateRequestId, "generateRequestId");
function sha256(input) {
  return crypto2__default__default.createHash("sha256").update(input, "utf-8").digest("hex");
}
__name(sha256, "sha256");
__name2(sha256, "sha256");
function hashContent(content) {
  return sha256(content);
}
__name(hashContent, "hashContent");
__name2(hashContent, "hashContent");
function hashFilePath(filePath) {
  return sha256(filePath);
}
__name(hashFilePath, "hashFilePath");
__name2(hashFilePath, "hashFilePath");
function hashWorkspaceId(workspaceId) {
  return sha256(workspaceId);
}
__name(hashWorkspaceId, "hashWorkspaceId");
__name2(hashWorkspaceId, "hashWorkspaceId");
function getBlobPath(hash, levels = 2) {
  const segments = [];
  for (let i = 0; i < levels; i++) {
    segments.push(hash.slice(i * 2, (i + 1) * 2));
  }
  segments.push(hash);
  return segments.join("/");
}
__name(getBlobPath, "getBlobPath");
__name2(getBlobPath, "getBlobPath");
var PrivacyValidator = class {
  static {
    __name(this, "PrivacyValidator");
  }
  static {
    __name2(this, "PrivacyValidator");
  }
  /**
  * Check that payload contains only metadata
  */
  isMetadataOnly(data) {
    const forbidden = [
      "content",
      "sourceCode",
      "fileContent",
      "code",
      "text",
      "body",
      "filePath",
      "fullPath",
      "absolutePath"
    ];
    const props = this.getAllProps(data);
    for (const prop of forbidden) {
      if (props.includes(prop)) {
        console.warn(`Privacy violation: forbidden property '${prop}' in request`);
        return false;
      }
    }
    const strings = this.getAllStrings(data);
    for (const str of strings) {
      if (str.length > 1e3) {
        console.warn(`Privacy violation: string too large (${str.length} chars)`);
        return false;
      }
      if (this.looksLikeCode(str)) {
        console.warn("Privacy violation: string contains code-like patterns");
        return false;
      }
    }
    return true;
  }
  /**
  * Get all property names recursively
  */
  getAllProps(obj, prefix = "") {
    let props = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      props.push(fullKey);
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        props = props.concat(this.getAllProps(value, fullKey));
      }
    }
    return props;
  }
  /**
  * Get all string values recursively
  */
  getAllStrings(obj) {
    let strings = [];
    for (const value of Object.values(obj)) {
      if (typeof value === "string") {
        strings.push(value);
      } else if (typeof value === "object" && value !== null) {
        strings = strings.concat(this.getAllStrings(value));
      }
    }
    return strings;
  }
  /**
  * Heuristic to detect code-like strings
  */
  looksLikeCode(str) {
    const codePatterns = [
      /function\s+\w+/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /class\s+\w+/,
      /import\s+.*from/,
      /export\s+(default\s+)?/,
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/
    ];
    return codePatterns.some((pattern) => pattern.test(str));
  }
};
var ProtectionManager = class {
  static {
    __name(this, "ProtectionManager");
  }
  static {
    __name2(this, "ProtectionManager");
  }
  registry = /* @__PURE__ */ new Map();
  config;
  constructor(config) {
    this.config = config;
  }
  protect(filePath, level, reason) {
    const protectedFile = {
      path: filePath,
      level,
      reason,
      addedAt: /* @__PURE__ */ new Date()
    };
    this.registry.set(filePath, protectedFile);
  }
  unprotect(filePath) {
    this.registry.delete(filePath);
  }
  getProtection(filePath) {
    const directProtection = this.registry.get(filePath);
    if (directProtection) {
      return directProtection;
    }
    if (!this.config.enabled) {
      return null;
    }
    for (const rule of this.config.patterns) {
      if (!rule.enabled) {
        continue;
      }
      if (minimatch(filePath, rule.pattern)) {
        return {
          path: filePath,
          level: rule.level,
          reason: rule.reason || `Matches pattern: ${rule.pattern}`,
          addedAt: /* @__PURE__ */ new Date(),
          pattern: rule.pattern
        };
      }
    }
    return null;
  }
  isProtected(filePath) {
    return this.getProtection(filePath) !== null;
  }
  getLevel(filePath) {
    const protection = this.getProtection(filePath);
    return protection ? protection.level : null;
  }
  listProtected() {
    return Array.from(this.registry.values());
  }
  updateLevel(filePath, level) {
    const existing = this.registry.get(filePath);
    if (!existing) {
      throw new Error(`File ${filePath} is not protected`);
    }
    this.registry.set(filePath, {
      ...existing,
      level
    });
  }
  getConfig() {
    return {
      ...this.config
    };
  }
  updateConfig(config) {
    this.config = {
      ...this.config,
      ...config
    };
  }
};
var SecurityError = class extends Error {
  static {
    __name(this, "SecurityError");
  }
  static {
    __name2(this, "SecurityError");
  }
  constructor(message) {
    super(message);
    this.name = "SecurityError";
  }
};
function validatePath(filePath) {
  if (filePath.includes("\0")) {
    throw new SecurityError("Null bytes in path not allowed");
  }
  const normalized = path10__default.normalize(filePath);
  if (path10__default.isAbsolute(normalized)) {
    throw new SecurityError("Absolute paths not allowed");
  }
  const segments = normalized.split(path10__default.sep);
  if (segments.some((seg) => seg === "..")) {
    throw new SecurityError("Path traversal not allowed");
  }
}
__name(validatePath, "validatePath");
__name2(validatePath, "validatePath");
function sanitizeForJSON(obj) {
  const str = JSON.stringify(obj);
  return JSON.parse(str);
}
__name(sanitizeForJSON, "sanitizeForJSON");
__name2(sanitizeForJSON, "sanitizeForJSON");
var SnapshotDeduplication = class {
  static {
    __name(this, "SnapshotDeduplication");
  }
  static {
    __name2(this, "SnapshotDeduplication");
  }
  cacheSize;
  hashCache;
  constructor(cacheSize = THRESHOLDS.resources.dedupCacheSize) {
    this.cacheSize = cacheSize;
    this.hashCache = new QuickLRU({
      maxSize: this.cacheSize
    });
  }
  /**
  * Hash file content using SHA-256
  */
  hashContent(content) {
    return createHash("sha256").update(content).digest("hex");
  }
  /**
  * Hash multiple files content
  */
  hashFiles(files) {
    const sorted = [
      ...files
    ].sort((a, b) => a.path.localeCompare(b.path));
    const content = sorted.map((f) => `${f.path}:${f.action}:${f.content}`).join("|");
    return this.hashContent(content);
  }
  /**
  * Check if content is already stored (deduplication)
  */
  async isDuplicate(files, storage) {
    const hash = this.hashFiles(files);
    const cachedId = this.hashCache.get(hash);
    if (cachedId) {
      return {
        isDuplicate: true,
        existingId: cachedId
      };
    }
    if (this.supportsHashLookup(storage)) {
      const existing = await this.getByContentHash(storage, hash);
      if (existing) {
        this.hashCache.set(hash, existing.id);
        return {
          isDuplicate: true,
          existingId: existing.id
        };
      }
    } else {
      const allSnapshots = await storage.list();
      for (const snapshot of allSnapshots) {
        if (snapshot.files?.length === files.length) {
          const isMatch = files.every((file) => snapshot.fileContents?.[file.path] === file.content);
          if (isMatch) {
            this.hashCache.set(hash, snapshot.id);
            return {
              isDuplicate: true,
              existingId: snapshot.id
            };
          }
        }
      }
    }
    return {
      isDuplicate: false
    };
  }
  /**
  * Check if storage adapter supports hash-based lookup
  */
  supportsHashLookup(storage) {
    return "getByContentHash" in storage;
  }
  /**
  * Get snapshot by content hash (if supported by storage)
  */
  async getByContentHash(storage, hash) {
    if (storage.getByContentHash) {
      return await storage.getByContentHash(hash);
    }
    return null;
  }
  /**
  * Record hash for future deduplication checks
  */
  recordHash(snapshotId, files) {
    const hash = this.hashFiles(files);
    this.hashCache.set(hash, snapshotId);
  }
  /**
  * Clear hash from cache for a deleted snapshot
  * This prevents the dedup cache from referencing non-existent snapshots
  */
  clearHash(snapshotId) {
    for (const [hash, cachedId] of this.hashCache.entries()) {
      if (cachedId === snapshotId) {
        this.hashCache.delete(hash);
      }
    }
  }
};
var SnapshotNaming = class {
  static {
    __name(this, "SnapshotNaming");
  }
  static {
    __name2(this, "SnapshotNaming");
  }
  /**
  * Generate snapshot name based on naming strategy
  */
  generateName(files, strategy = "semantic") {
    switch (strategy) {
      case "git":
        return this.gitStrategy(files);
      case "semantic":
        return this.semanticStrategy(files);
      case "timestamp":
        return this.timestampStrategy();
      default:
        return this.semanticStrategy(files);
    }
  }
  /**
  * Git strategy - would parse git commit message (simplified implementation)
  */
  gitStrategy(files) {
    return this.semanticStrategy(files);
  }
  /**
  * Semantic strategy - analyze file operations
  */
  semanticStrategy(files) {
    if (files.length === 1) {
      const file = files[0];
      const fileName = file.path.split("/").pop() || "file";
      return `${this.capitalize(file.action)} ${fileName}`;
    }
    const actionCounts = files.reduce((acc, f) => {
      acc[f.action] = (acc[f.action] || 0) + 1;
      return acc;
    }, {});
    const primaryAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];
    if (primaryAction) {
      return `${this.capitalize(String(primaryAction[0]))} ${files.length} files`;
    }
    return `Snapshot of ${files.length} files`;
  }
  /**
  * Timestamp strategy - use current timestamp
  */
  timestampStrategy() {
    return `Snapshot ${/* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()}`;
  }
  /**
  * Capitalize first letter of string
  */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};
var SnapshotManager = class {
  static {
    __name(this, "SnapshotManager");
  }
  static {
    __name2(this, "SnapshotManager");
  }
  storage;
  options;
  deduplication;
  naming;
  constructor(storage, options = {}) {
    this.storage = storage;
    this.options = options;
    this.deduplication = new SnapshotDeduplication();
    this.naming = new SnapshotNaming();
  }
  async create(files, options) {
    return this.createSnapshot(files, options);
  }
  /**
  * Convenience method for creating a snapshot with a single file
  * @param params - Object containing filePath and content
  * @param options - Snapshot options
  * @returns Created snapshot
  */
  async createTest(params, options) {
    const fileInput = {
      path: params.filePath,
      content: params.content,
      action: "modify"
    };
    return this.createSnapshot([
      fileInput
    ], options);
  }
  async createSnapshot(files, options) {
    await Promise.all(files.map((file) => Promise.resolve(validatePath(file.path))));
    if (this.options.enableDeduplication) {
      const { isDuplicate, existingId } = await this.deduplication.isDuplicate(files, this.storage);
      if (isDuplicate && existingId) {
        throw new Error("Duplicate snapshot detected");
      }
    }
    const name = options?.description || this.naming.generateName(files, this.options.namingStrategy);
    const snapshot = {
      id: randomUUID(),
      timestamp: Date.now(),
      version: "1.0",
      meta: {
        name,
        protected: options?.protected || this.options.autoProtect || false
      },
      files: files.map((f) => f.path),
      fileContents: files.reduce((acc, f) => {
        acc[f.path] = f.content;
        return acc;
      }, {})
    };
    const contentHash = this.options.enableDeduplication ? this.deduplication.hashFiles(files) : void 0;
    await this.storage.save(snapshot, contentHash);
    if (this.options.enableDeduplication && contentHash) {
      this.deduplication.recordHash(snapshot.id, files);
    }
    return snapshot;
  }
  async list(filters) {
    return this.storage.list(filters);
  }
  async get(id) {
    return this.storage.get(id);
  }
  async delete(id) {
    const snapshot = await this.storage.get(id);
    if (!snapshot) {
      throw new Error(`Snapshot ${id} not found`);
    }
    if (snapshot.meta?.protected) {
      throw new Error(`Cannot delete protected snapshot ${id}`);
    }
    await this.storage.delete(id);
    if (this.options.enableDeduplication) {
      this.deduplication.clearHash(id);
    }
  }
  /**
  * Restore snapshot to target directory with atomic guarantees
  * @param id Snapshot ID to restore
  * @param targetPath Target directory path (optional, for actual file system restore)
  * @param options Restore options
  * @returns Restore result with list of restored files and any errors
  */
  async restore(id, targetPath, options) {
    const snapshot = await this.storage.get(id);
    if (!snapshot) {
      throw new Error(`Snapshot ${id} not found`);
    }
    if (!targetPath) {
      return {
        success: true,
        restoredFiles: snapshot.files || [],
        errors: []
      };
    }
    if (options?.dryRun) {
      const errors = [];
      const fileContents = snapshot.fileContents || {};
      for (const filePath of snapshot.files || []) {
        if (!fileContents[filePath]) {
          errors.push(`Missing content for file: ${filePath}`);
        }
      }
      return {
        success: errors.length === 0,
        restoredFiles: snapshot.files || [],
        errors
      };
    }
    return await this.restoreAtomic(snapshot, targetPath, options);
  }
  /**
  * Atomic restore implementation with staging and rollback
  */
  async restoreAtomic(snapshot, targetPath, options) {
    const errors = [];
    const restoredFiles = [];
    const stagingDir = `${targetPath}.staging`;
    const backupDir = `${targetPath}.backup`;
    let targetBackedUp = false;
    try {
      const fileContents = snapshot.fileContents || {};
      const files = snapshot.files || [];
      const totalFiles = files.length;
      if (existsSync(stagingDir)) {
        await fs3.rm(stagingDir, {
          recursive: true,
          force: true
        });
      }
      await fs3.mkdir(stagingDir, {
        recursive: true
      });
      for (let i = 0; i < totalFiles; i++) {
        const filePath = files[i];
        const content = fileContents[filePath];
        if (!content) {
          throw new Error(`Missing content for file: ${filePath}`);
        }
        const targetFilePath = path10.join(stagingDir, filePath);
        await fs3.mkdir(path10.dirname(targetFilePath), {
          recursive: true
        });
        await fs3.writeFile(targetFilePath, content, "utf-8");
        restoredFiles.push(filePath);
        if (options?.onProgress) {
          const progress = Math.round((i + 1) / totalFiles * 90);
          options.onProgress(progress);
        }
      }
      if (existsSync(targetPath)) {
        if (existsSync(backupDir)) {
          await fs3.rm(backupDir, {
            recursive: true,
            force: true
          });
        }
        await fs3.rename(targetPath, backupDir);
        targetBackedUp = true;
      }
      if (options?.onProgress) {
        options.onProgress(95);
      }
      await fs3.rename(stagingDir, targetPath);
      if (options?.onProgress) {
        options.onProgress(100);
      }
      if (existsSync(backupDir)) {
        await fs3.rm(backupDir, {
          recursive: true,
          force: true
        });
      }
      return {
        success: true,
        restoredFiles,
        errors: []
      };
    } catch (error) {
      if (targetBackedUp && existsSync(backupDir)) {
        try {
          if (existsSync(targetPath)) {
            await fs3.rm(targetPath, {
              recursive: true,
              force: true
            });
          }
          await fs3.rename(backupDir, targetPath);
        } catch (rollbackError) {
          errors.push(`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
        }
      }
      if (existsSync(stagingDir)) {
        try {
          await fs3.rm(stagingDir, {
            recursive: true,
            force: true
          });
        } catch {
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      return {
        success: false,
        restoredFiles,
        errors
      };
    }
  }
  async protect(id) {
    const snapshot = await this.storage.get(id);
    if (!snapshot) {
      throw new Error(`Snapshot ${id} not found`);
    }
    const updated = {
      ...snapshot,
      meta: {
        ...snapshot.meta,
        protected: true
      }
    };
    const contentHash = this.options.enableDeduplication && "getStoredContentHash" in this.storage ? await this.storage.getStoredContentHash(id) : void 0;
    await this.storage.save(updated, contentHash);
  }
  async unprotect(id) {
    const snapshot = await this.storage.get(id);
    if (!snapshot) {
      throw new Error(`Snapshot ${id} not found`);
    }
    const updated = {
      ...snapshot,
      meta: {
        ...snapshot.meta,
        protected: false
      }
    };
    const contentHash = this.options.enableDeduplication && "getStoredContentHash" in this.storage ? await this.storage.getStoredContentHash(id) : void 0;
    await this.storage.save(updated, contentHash);
  }
  async search(criteria) {
    if (this.supportsOptimizedSearch(this.storage)) {
      return await this.optimizedSearch(this.storage, criteria);
    }
    const all2 = await this.storage.list();
    return all2.filter((snapshot) => {
      if (criteria.content) {
        const hasContent = Object.values(snapshot.fileContents || {}).some((content) => content != null && criteria.content && String(content).includes(criteria.content));
        if (!hasContent) {
          return false;
        }
      }
      if (criteria.message) {
        snapshot.meta?.name || "";
        if (criteria.message) {
          const name = snapshot.meta?.name || "";
          if (criteria.message && typeof name === "string" && !name.includes(criteria.message)) {
            return false;
          }
        }
      }
      return true;
    });
  }
  /**
  * Check if storage adapter supports optimized search
  */
  supportsOptimizedSearch(storage) {
    return "search" in storage && typeof storage.search === "function";
  }
  /**
  * Perform optimized search using storage adapter capabilities
  */
  async optimizedSearch(storage, criteria) {
    const all2 = await storage.list();
    return all2.filter((snapshot) => {
      if (criteria.content) {
        const hasContent = Object.values(snapshot.fileContents || {}).some((content) => content != null && String(content).includes(criteria.content ?? ""));
        if (!hasContent) {
          return false;
        }
      }
      if (criteria.message) {
        const name = snapshot.meta?.name || "";
        if (criteria.message && typeof name === "string" && !name.includes(criteria.message)) {
          return false;
        }
      }
      return true;
    });
  }
};
var StorageError2 = class extends Error {
  static {
    __name(this, "StorageError2");
  }
  static {
    __name2(this, "StorageError");
  }
  code;
  details;
  constructor(message, code, details) {
    super(message), this.code = code, this.details = details;
    this.name = "StorageError";
  }
};
var StorageConnectionError = class extends StorageError2 {
  static {
    __name(this, "StorageConnectionError");
  }
  static {
    __name2(this, "StorageConnectionError");
  }
  constructor(message, details) {
    super(message, "STORAGE_CONNECTION_ERROR", details);
    this.name = "StorageConnectionError";
  }
};
var StorageTransactionError = class extends StorageError2 {
  static {
    __name(this, "StorageTransactionError");
  }
  static {
    __name2(this, "StorageTransactionError");
  }
  constructor(message, details) {
    super(message, "STORAGE_TRANSACTION_ERROR", details);
    this.name = "StorageTransactionError";
  }
};
var StorageFullError2 = class extends StorageError2 {
  static {
    __name(this, "StorageFullError2");
  }
  static {
    __name2(this, "StorageFullError");
  }
  constructor(message, details) {
    super(message, "STORAGE_FULL_ERROR", details);
    this.name = "StorageFullError";
  }
};
var StorageLockError2 = class extends StorageError2 {
  static {
    __name(this, "StorageLockError2");
  }
  static {
    __name2(this, "StorageLockError");
  }
  constructor(message, details) {
    super(message, "STORAGE_LOCK_ERROR", details);
    this.name = "StorageLockError";
  }
};
var CorruptedDataError = class extends StorageError2 {
  static {
    __name(this, "CorruptedDataError");
  }
  static {
    __name2(this, "CorruptedDataError");
  }
  constructor(message, details) {
    super(message, "CORRUPTED_DATA_ERROR", details);
    this.name = "CorruptedDataError";
  }
};
var DatabaseConstructor = null;
var loadError = null;
async function loadBetterSqlite3() {
  if (DatabaseConstructor) {
    return DatabaseConstructor;
  }
  if (loadError) {
    throw loadError;
  }
  try {
    const module = await import('better-sqlite3');
    DatabaseConstructor = module.default;
    return DatabaseConstructor;
  } catch (error) {
    loadError = error instanceof Error ? error : new Error(String(error));
    throw new StorageConnectionError("Failed to load better-sqlite3", {
      cause: loadError
    });
  }
}
__name(loadBetterSqlite3, "loadBetterSqlite3");
__name2(loadBetterSqlite3, "loadBetterSqlite3");
var LocalStorage = class {
  static {
    __name(this, "LocalStorage");
  }
  static {
    __name2(this, "LocalStorage");
  }
  db = null;
  dbPath;
  constructor(dbPath) {
    this.dbPath = dbPath;
  }
  async ensureInitialized() {
    if (this.db) {
      return;
    }
    const DB = await loadBetterSqlite3();
    this.db = new DB(this.dbPath);
    this.initSchema();
  }
  initSchema() {
    if (!this.db) {
      throw new StorageError2("Database not initialized", "DB_NOT_INITIALIZED");
    }
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        name TEXT,
        protected INTEGER DEFAULT 0,
        files TEXT,
        file_contents TEXT,
        metadata TEXT,
        content_hash TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON snapshots(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_protected ON snapshots(protected);
      CREATE INDEX IF NOT EXISTS idx_created_at ON snapshots(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_name ON snapshots(name);
      CREATE INDEX IF NOT EXISTS idx_content_hash ON snapshots(content_hash);
    `);
  }
  async save(snapshot, contentHash) {
    await this.ensureInitialized();
    try {
      const sanitizedFiles = sanitizeForJSON(snapshot.files || []);
      const sanitizedFileContents = sanitizeForJSON(snapshot.fileContents || {});
      const sanitizedMeta = sanitizeForJSON(snapshot.meta || {});
      const stmt = this.db?.prepare(`
        INSERT OR REPLACE INTO snapshots (
          id, timestamp, name, protected, files, file_contents, metadata, content_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      if (!stmt) {
        throw new StorageError2("Failed to prepare save statement", "DB_PREPARE_ERROR");
      }
      stmt.run(snapshot.id, snapshot.timestamp, snapshot.meta?.name || null, snapshot.meta?.protected ? 1 : 0, JSON.stringify(sanitizedFiles), JSON.stringify(sanitizedFileContents), JSON.stringify(sanitizedMeta), contentHash || null);
    } catch (error) {
      if (error.code === "SQLITE_BUSY") {
        throw new StorageLockError2("Database locked", {
          retryable: true,
          cause: error
        });
      }
      if (error.code === "SQLITE_FULL") {
        throw new StorageFullError2("Disk full", {
          retryable: false,
          cause: error
        });
      }
      if (error.code === "SQLITE_CANTOPEN") {
        throw new StorageConnectionError("Cannot open database", {
          cause: error
        });
      }
      throw new StorageError2("Save failed", error.code, {
        cause: error
      });
    }
  }
  async get(id) {
    await this.ensureInitialized();
    try {
      const stmt = this.db?.prepare("SELECT * FROM snapshots WHERE id = ?");
      if (!stmt) {
        throw new StorageError2("Failed to prepare get statement", "DB_PREPARE_ERROR");
      }
      const row = stmt.get(id);
      if (!row) {
        return null;
      }
      return this.deserializeSnapshot(row);
    } catch (error) {
      if (error.code === "SQLITE_BUSY") {
        throw new StorageLockError2("Database locked", {
          retryable: true,
          cause: error
        });
      }
      if (error.code === "SQLITE_CANTOPEN") {
        throw new StorageConnectionError("Cannot open database", {
          cause: error
        });
      }
      throw new StorageError2("Get failed", error.code, {
        cause: error
      });
    }
  }
  async getByContentHash(hash) {
    await this.ensureInitialized();
    try {
      const stmt = this.db?.prepare("SELECT * FROM snapshots WHERE content_hash = ? LIMIT 1");
      if (!stmt) {
        throw new StorageError2("Failed to prepare getByContentHash statement", "DB_PREPARE_ERROR");
      }
      const row = stmt.get(hash);
      if (!row) {
        return null;
      }
      return this.deserializeSnapshot(row);
    } catch (error) {
      if (error.code === "SQLITE_BUSY") {
        throw new StorageLockError2("Database locked", {
          retryable: true,
          cause: error
        });
      }
      if (error.code === "SQLITE_CANTOPEN") {
        throw new StorageConnectionError("Cannot open database", {
          cause: error
        });
      }
      throw new StorageError2("GetByContentHash failed", error.code, {
        cause: error
      });
    }
  }
  /**
  * Get the stored content hash for a snapshot (for preserving hash on updates)
  */
  async getStoredContentHash(id) {
    await this.ensureInitialized();
    try {
      const stmt = this.db?.prepare("SELECT content_hash FROM snapshots WHERE id = ?");
      if (!stmt) {
        throw new StorageError2("Failed to prepare getStoredContentHash statement", "DB_PREPARE_ERROR");
      }
      const row = stmt.get(id);
      return row?.content_hash || null;
    } catch (error) {
      if (error.code === "SQLITE_BUSY") {
        throw new StorageLockError2("Database locked", {
          retryable: true,
          cause: error
        });
      }
      if (error.code === "SQLITE_CANTOPEN") {
        throw new StorageConnectionError("Cannot open database", {
          cause: error
        });
      }
      throw new StorageError2("GetStoredContentHash failed", error.code, {
        cause: error
      });
    }
  }
  async list(filters) {
    await this.ensureInitialized();
    try {
      let query = "SELECT * FROM snapshots WHERE 1=1";
      const params = [];
      if (filters?.protected !== void 0) {
        query += " AND protected = ?";
        params.push(filters.protected ? 1 : 0);
      }
      if (filters?.after) {
        query += " AND timestamp >= ?";
        params.push(filters.after.getTime());
      }
      if (filters?.before) {
        query += " AND timestamp < ?";
        params.push(filters.before.getTime());
      }
      query += " ORDER BY timestamp DESC";
      if (filters?.offset && !filters?.limit) {
        logger.warn("Using OFFSET without LIMIT can lead to inefficient queries. Consider setting a limit for better performance.");
      }
      if (filters?.limit) {
        query += " LIMIT ?";
        params.push(filters.limit);
      }
      if (filters?.offset) {
        query += " OFFSET ?";
        params.push(filters.offset);
      }
      const stmt = this.db?.prepare(query);
      if (!stmt) {
        throw new StorageError2("Failed to prepare list statement", "DB_PREPARE_ERROR");
      }
      const rows = stmt.all(...params);
      let snapshots = rows.map((row) => this.deserializeSnapshot(row));
      if (filters?.filePath) {
        snapshots = snapshots.filter((snapshot) => snapshot.files?.includes(filters.filePath ?? ""));
      }
      return snapshots;
    } catch (error) {
      if (error.code === "SQLITE_BUSY") {
        throw new StorageLockError2("Database locked", {
          retryable: true,
          cause: error
        });
      }
      if (error.code === "SQLITE_CANTOPEN") {
        throw new StorageConnectionError("Cannot open database", {
          cause: error
        });
      }
      throw new StorageError2("List failed", error.code, {
        cause: error
      });
    }
  }
  async delete(id) {
    await this.ensureInitialized();
    try {
      const stmt = this.db?.prepare("DELETE FROM snapshots WHERE id = ?");
      if (!stmt) {
        throw new StorageError2("Failed to prepare delete statement", "DB_PREPARE_ERROR");
      }
      stmt.run(id);
    } catch (error) {
      if (error.code === "SQLITE_BUSY") {
        throw new StorageLockError2("Database locked", {
          retryable: true,
          cause: error
        });
      }
      if (error.code === "SQLITE_CANTOPEN") {
        throw new StorageConnectionError("Cannot open database", {
          cause: error
        });
      }
      throw new StorageError2("Delete failed", error.code, {
        cause: error
      });
    }
  }
  async close() {
    if (!this.db) {
      return;
    }
    try {
      this.db.close();
      this.db = null;
    } catch (error) {
      if (error.code === "SQLITE_BUSY") {
        throw new StorageLockError2("Database locked", {
          retryable: true,
          cause: error
        });
      }
      throw new StorageError2("Close failed", error.code, {
        cause: error
      });
    }
  }
  deserializeSnapshot(row) {
    try {
      return {
        id: row.id,
        timestamp: row.timestamp,
        version: row.version || "1.0",
        meta: JSON.parse(row.metadata || "{}"),
        files: JSON.parse(row.files || "[]"),
        fileContents: JSON.parse(row.file_contents || "{}")
      };
    } catch (error) {
      throw new CorruptedDataError(`Failed to deserialize snapshot ${row.id}`, {
        cause: error,
        snapshotId: row.id
      });
    }
  }
};
var MemoryStorage = class {
  static {
    __name(this, "MemoryStorage");
  }
  static {
    __name2(this, "MemoryStorage");
  }
  snapshots = /* @__PURE__ */ new Map();
  async save(snapshot, _contentHash) {
    this.snapshots.set(snapshot.id, this.cloneSnapshot(snapshot));
  }
  async get(id) {
    const snapshot = this.snapshots.get(id);
    return snapshot ? this.cloneSnapshot(snapshot) : null;
  }
  async list(filters) {
    let snapshots = Array.from(this.snapshots.values());
    if (filters?.filePath) {
      snapshots = snapshots.filter((s) => s.files?.some((f) => f === filters.filePath || filters.filePath && f.includes(filters.filePath)));
    }
    if (filters?.before) {
      const beforeMs = filters.before.getTime();
      snapshots = snapshots.filter((s) => s.timestamp < beforeMs);
    }
    if (filters?.after) {
      const afterMs = filters.after.getTime();
      snapshots = snapshots.filter((s) => s.timestamp >= afterMs);
    }
    if (filters?.protected !== void 0) {
      snapshots = snapshots.filter((s) => (s.meta?.protected ?? false) === filters.protected);
    }
    snapshots.sort((a, b) => b.timestamp - a.timestamp);
    if (filters?.limit) {
      snapshots = snapshots.slice(0, filters.limit);
    }
    return snapshots.map((s) => this.cloneSnapshot(s));
  }
  async delete(id) {
    this.snapshots.delete(id);
  }
  async close() {
    this.snapshots.clear();
  }
  /**
  * Deep clone snapshot while preserving type information
  */
  cloneSnapshot(snapshot) {
    if (typeof structuredClone !== "undefined") {
      return structuredClone(snapshot);
    }
    return structuredClone(snapshot);
  }
  /**
  * Get total count of snapshots (for testing)
  */
  get size() {
    return this.snapshots.size;
  }
};
var Snapback = class {
  static {
    __name(this, "Snapback");
  }
  static {
    __name2(this, "Snapback");
  }
  storage;
  snapshotManager;
  protectionManager;
  cloudClient;
  analyticsClient;
  constructor(options) {
    if (typeof options.storage === "string") {
      if (options.storage === ":memory:") {
        this.storage = new MemoryStorage();
      } else {
        this.storage = new LocalStorage(options.storage);
      }
    } else if (options.storage) {
      this.storage = options.storage;
    } else {
      this.storage = new MemoryStorage();
    }
    const protectionConfig = {
      patterns: options.protection?.patterns || [],
      defaultLevel: options.protection?.defaultLevel || "watch",
      enabled: options.protection?.enabled !== false,
      autoProtectConfigs: options.autoProtectConfigs !== false
    };
    this.protectionManager = new ProtectionManager(protectionConfig);
    this.snapshotManager = new SnapshotManager(this.storage, {
      enableDeduplication: options.enableDeduplication,
      autoProtect: options.autoProtectConfigs
    });
    if (options.cloud) {
      const sdkConfig = {
        endpoint: options.cloud.baseUrl,
        apiKey: options.cloud.apiKey,
        privacy: {
          hashFilePaths: true,
          anonymizeWorkspace: false
        },
        cache: {
          enabled: true,
          ttl: {
            analytics: 3600
          }
        },
        retry: {
          maxRetries: options.cloud.retries || 3,
          backoffMs: options.cloud.timeout || 1e3
        }
      };
      this.cloudClient = new SnapbackClient(sdkConfig);
      this.analyticsClient = new SnapbackClient(sdkConfig);
    }
  }
  /**
  * Create a snapshot of files
  * @param files - Files to snapshot
  * @param options - Snapshot options
  * @returns Created snapshot
  */
  async createSnapshot(files, options) {
    const fileInputs = files.map((file) => ({
      path: file.path,
      content: file.content,
      action: file.action || "modify"
    }));
    return this.snapshotManager.create(fileInputs, options);
  }
  /**
  * Save a single file snapshot
  * @param path - File path
  * @param content - File content
  * @param description - Optional description
  * @returns Created snapshot
  */
  async save(path11, content, description) {
    return this.snapshotManager.create([
      {
        path: path11,
        content,
        action: "modify"
      }
    ], {
      description
    });
  }
  /**
  * List snapshots with optional filters
  * @param filters - Filter options
  * @returns Array of snapshots
  */
  async listSnapshots(filters) {
    return this.snapshotManager.list(filters);
  }
  /**
  * Get a specific snapshot by ID
  * @param id - Snapshot ID
  * @returns Snapshot or null if not found
  */
  async getSnapshot(id) {
    return this.snapshotManager.get(id);
  }
  /**
  * Delete a snapshot by ID
  * @param id - Snapshot ID
  */
  async deleteSnapshot(id) {
    return this.snapshotManager.delete(id);
  }
  /**
  * Restore a snapshot
  * @param id - Snapshot ID
  * @returns Restore result
  */
  async restoreSnapshot(id) {
    return this.snapshotManager.restore(id);
  }
  /**
  * Protect a snapshot
  * @param id - Snapshot ID
  */
  async protectSnapshot(id) {
    return this.snapshotManager.protect(id);
  }
  /**
  * Unprotect a snapshot
  * @param id - Snapshot ID
  */
  async unprotectSnapshot(id) {
    return this.snapshotManager.unprotect(id);
  }
  /**
  * Protect a file path
  * @param filePath - File path to protect
  * @param level - Protection level
  * @param reason - Optional reason
  */
  protectFile(filePath, level, reason) {
    this.protectionManager.protect(filePath, level, reason);
  }
  /**
  * Check if a file is protected
  * @param filePath - File path to check
  * @returns Protection level or null if not protected
  */
  getProtectionLevel(filePath) {
    return this.protectionManager.getLevel(filePath);
  }
  /**
  * Close the storage connection
  */
  async close() {
    if ("close" in this.storage && typeof this.storage.close === "function") {
      await this.storage.close();
    }
  }
  /**
  * Get the underlying snapshot manager for advanced operations
  */
  get snapshots() {
    return this.snapshotManager;
  }
  /**
  * Get the underlying protection manager for advanced operations
  */
  get protection() {
    return this.protectionManager;
  }
  /**
  * Get the cloud client if configured
  */
  get cloud() {
    return this.cloudClient;
  }
  /**
  * Get the analytics client if configured
  */
  get analytics() {
    return this.analyticsClient;
  }
};
var SessionDeduplication = class {
  static {
    __name(this, "SessionDeduplication");
  }
  static {
    __name2(this, "SessionDeduplication");
  }
  timeDeltaMs;
  minFilesForDedup;
  fingerprintCache;
  constructor(options = {}) {
    this.timeDeltaMs = options.timeDeltaMs ?? 5 * 60 * 1e3;
    this.minFilesForDedup = options.minFilesForDedup ?? 5;
    this.fingerprintCache = new QuickLRU({
      maxSize: options.cacheSize ?? 100
    });
  }
  /**
  * Compute session fingerprint from file changes
  */
  computeFingerprint(changes) {
    if (changes.length === 0) {
      return "";
    }
    const items = changes.map((change) => {
      const path11 = change.p;
      const op = change.op;
      const hNew = change.hNew || "";
      const hOld = change.hOld || "";
      return `${path11}:${op}:${hOld}:${hNew}`;
    });
    items.sort();
    const hash = crypto2__default.createHash("sha256");
    for (const item of items) {
      hash.update(item);
    }
    return hash.digest("hex");
  }
  /**
  * Check if session is a duplicate
  */
  checkDuplicate(changes, timestamp) {
    if (changes.length < this.minFilesForDedup) {
      const fingerprint2 = this.computeFingerprint(changes);
      return {
        isDuplicate: false,
        reason: "Session too small for deduplication",
        fingerprint: fingerprint2
      };
    }
    const fingerprint = this.computeFingerprint(changes);
    const existing = this.fingerprintCache.get(fingerprint);
    if (!existing) {
      return {
        isDuplicate: false,
        fingerprint
      };
    }
    const timeDelta = timestamp - existing.timestamp;
    if (timeDelta > this.timeDeltaMs) {
      return {
        isDuplicate: false,
        reason: `Time delta ${timeDelta}ms exceeds threshold ${this.timeDeltaMs}ms`,
        fingerprint
      };
    }
    return {
      isDuplicate: true,
      reason: `Duplicate of session ${existing.sessionId} (time delta: ${timeDelta}ms)`,
      existingSessionId: existing.sessionId,
      fingerprint
    };
  }
  /**
  * Register a session fingerprint
  */
  register(sessionId, changes, timestamp) {
    const fingerprint = this.computeFingerprint(changes);
    this.fingerprintCache.set(fingerprint, {
      fingerprint,
      timestamp,
      sessionId,
      changeCount: changes.length
    });
  }
  /**
  * Remove a session fingerprint
  */
  unregister(sessionId) {
    for (const [fingerprint, data] of this.fingerprintCache.entries()) {
      if (data.sessionId === sessionId) {
        this.fingerprintCache.delete(fingerprint);
      }
    }
  }
  /**
  * Clear all fingerprints
  */
  clear() {
    this.fingerprintCache.clear();
  }
  /**
  * Get cache statistics
  */
  getStats() {
    return {
      size: this.fingerprintCache.size,
      maxSize: this.fingerprintCache.maxSize
    };
  }
};
var LARGE_INSERT_THRESHOLD = {
  minChars: 100,
  minLines: 5
};
var SimpleChangeTracker = class {
  static {
    __name(this, "SimpleChangeTracker");
  }
  static {
    __name2(this, "SimpleChangeTracker");
  }
  totalChars = 0;
  totalLines = 0;
  largeInsertCount = 0;
  multiLineInsertCount = 0;
  /**
  * Records a change event and updates aggregate metrics
  */
  recordChange(event) {
    this.totalChars += event.chars;
    this.totalLines += event.lines;
    if (event.isInsert && event.isMultiLine) {
      this.multiLineInsertCount++;
    }
    if (this.isLargeInsert(event)) {
      this.largeInsertCount++;
    }
  }
  /**
  * Determines if a change qualifies as a "large insert"
  */
  isLargeInsert(event) {
    if (!event.isInsert || !event.isMultiLine) {
      return false;
    }
    return event.chars >= LARGE_INSERT_THRESHOLD.minChars || event.lines >= LARGE_INSERT_THRESHOLD.minLines;
  }
  /**
  * Returns current aggregate metrics snapshot
  */
  snapshot() {
    return {
      totalChars: this.totalChars,
      totalLines: this.totalLines,
      largeInsertCount: this.largeInsertCount,
      multiLineInsertCount: this.multiLineInsertCount
    };
  }
  /**
  * Clears all accumulated metrics
  */
  reset() {
    this.totalChars = 0;
    this.totalLines = 0;
    this.largeInsertCount = 0;
    this.multiLineInsertCount = 0;
  }
};
var THRESHOLDS2 = {
  // Light: 1 large insert with modest total chars
  light: {
    maxTotalChars: 800
  },
  // Medium: 2+ large inserts OR higher volume
  medium: {
    minLargeInserts: 2,
    minTotalChars: 400
  },
  // Heavy: 3+ large inserts AND high total volume
  heavy: {
    minLargeInserts: 3,
    minTotalChars: 2e3
  },
  // Anti-paste guard: if only 1 large insert, cap at medium regardless of size
  maxLargeInsertsForSinglePaste: 1
};
var CONFIDENCE = {
  unknown: 0,
  noneWithNoProvider: 8.5,
  noneWithProvider: 7.5,
  inferenceOnlyCap: 7.5
};
var AiSessionTracker = class {
  static {
    __name(this, "AiSessionTracker");
  }
  static {
    __name2(this, "AiSessionTracker");
  }
  detectEnv;
  changeTracker;
  isEnabled;
  sessionId = null;
  constructor(detectEnv, changeTracker, isEnabled = true) {
    this.detectEnv = detectEnv;
    this.changeTracker = changeTracker;
    this.isEnabled = isEnabled;
  }
  /**
  * Starts a new session
  */
  startSession(sessionId) {
    this.sessionId = sessionId;
  }
  /**
  * Records a change event
  */
  recordChange(event) {
    if (!this.isEnabled) {
      return;
    }
    this.changeTracker.recordChange(event);
  }
  /**
  * Finalizes the session and returns classification result
  */
  finalizeSession() {
    if (!this.isEnabled) {
      return {
        level: "unknown",
        confidence: 0,
        provider: "none",
        reasoning: "AI detection disabled",
        metrics: this.changeTracker.snapshot()
      };
    }
    if (!this.sessionId) {
      return {
        level: "unknown",
        confidence: CONFIDENCE.unknown,
        provider: "none",
        reasoning: "No session started",
        metrics: this.changeTracker.snapshot()
      };
    }
    const provider = this.detectEnv();
    const metrics = this.changeTracker.snapshot();
    const level = this.classifyLevel(metrics, provider);
    const confidence = this.calculateConfidence(level, provider, metrics);
    const reasoning = this.generateReasoning(level, provider, metrics);
    return {
      level,
      confidence,
      provider: provider.provider,
      reasoning,
      metrics
    };
  }
  /**
  * Resets session state
  */
  reset() {
    this.sessionId = null;
    this.changeTracker.reset();
  }
  classifyLevel(metrics, _provider) {
    const { largeInsertCount, totalChars } = metrics;
    if (largeInsertCount === 0) {
      return "none";
    }
    if (largeInsertCount === THRESHOLDS2.maxLargeInsertsForSinglePaste) {
      if (totalChars <= THRESHOLDS2.light.maxTotalChars) {
        return "light";
      }
      return "medium";
    }
    if (largeInsertCount >= THRESHOLDS2.heavy.minLargeInserts && totalChars >= THRESHOLDS2.heavy.minTotalChars) {
      return "heavy";
    }
    if (largeInsertCount >= THRESHOLDS2.medium.minLargeInserts || totalChars >= THRESHOLDS2.medium.minTotalChars) {
      return "medium";
    }
    return "light";
  }
  /**
  * Calculates confidence score based on signals available
  */
  calculateConfidence(level, provider, _metrics) {
    if (level === "unknown") {
      return CONFIDENCE.unknown;
    }
    if (level === "none") {
      return provider.hasAI ? CONFIDENCE.noneWithProvider : CONFIDENCE.noneWithNoProvider;
    }
    if (provider.hasAI && provider.provider !== "unknown" && provider.provider !== "none") {
      return Math.min(provider.confidence, CONFIDENCE.inferenceOnlyCap);
    }
    return CONFIDENCE.inferenceOnlyCap;
  }
  /**
  * Generates human-readable reasoning
  */
  generateReasoning(level, provider, metrics) {
    if (level === "unknown") {
      return "No session started";
    }
    const providerName = provider.provider === "cursor" ? "Cursor" : provider.provider === "claude" ? "Claude" : null;
    if (level === "none") {
      if (providerName) {
        return `${providerName} detected but no large inserts observed`;
      }
      return "No AI provider detected, no large inserts";
    }
    const parts = [];
    if (providerName) {
      parts.push(`${providerName} detected`);
    } else if (provider.provider === "unknown") {
      parts.push("No AI provider detected");
    }
    const { largeInsertCount, totalChars } = metrics;
    if (largeInsertCount === 1) {
      parts.push("single large insert");
    } else {
      parts.push(`${largeInsertCount} large inserts`);
    }
    parts.push(`(${totalChars} chars total)`);
    if (level === "heavy") {
      parts.push("- heavy AI-like usage inferred from change patterns");
    } else if (level === "medium") {
      parts.push("- multiple large inserts inferred from change patterns");
    } else {
      parts.push("- inferred from change patterns");
    }
    return parts.join(", ");
  }
};
function makeSafeSessionStartedEvent(tier) {
  return {
    changeCount: 0,
    tier
  };
}
__name(makeSafeSessionStartedEvent, "makeSafeSessionStartedEvent");
__name2(makeSafeSessionStartedEvent, "makeSafeSessionStartedEvent");
function makeSafeSessionFinalizedEvent(changeCount, durationMs, tier, consent, changes) {
  const base = {
    changeCount,
    durationMs,
    tier
  };
  if (tier === "solo" && consent && changeCount >= 3 && changes) {
    const extCounts = computeExtensionHistogram(changes);
    if (Object.keys(extCounts).length > 0) {
      base.ext_counts = extCounts;
    }
  }
  return base;
}
__name(makeSafeSessionFinalizedEvent, "makeSafeSessionFinalizedEvent");
__name2(makeSafeSessionFinalizedEvent, "makeSafeSessionFinalizedEvent");
function computeExtensionHistogram(changes) {
  const counts = {};
  for (const change of changes) {
    const ext = getFileExtension(change.p);
    if (ext) {
      counts[ext] = (counts[ext] || 0) + 1;
    }
  }
  return counts;
}
__name(computeExtensionHistogram, "computeExtensionHistogram");
__name2(computeExtensionHistogram, "computeExtensionHistogram");
function getFileExtension(path11) {
  const lastDot = path11.lastIndexOf(".");
  const lastSlash = path11.lastIndexOf("/");
  if (lastDot === -1 || lastDot < lastSlash) {
    return null;
  }
  const ext = path11.slice(lastDot);
  if (ext.includes("-") || ext.length > 8) {
    return null;
  }
  return ext.toLowerCase();
}
__name(getFileExtension, "getFileExtension");
__name2(getFileExtension, "getFileExtension");
function createAiTracker(options) {
  const cursorDetector = new CursorDetector({
    getAppName: /* @__PURE__ */ __name2(() => {
      return process.env.VSCODE_APP_NAME || process.env.APP_NAME || "unknown";
    }, "getAppName"),
    getEnvVar: /* @__PURE__ */ __name2((key) => process.env[key], "getEnvVar")
  });
  const detectEnv = /* @__PURE__ */ __name2(() => {
    const cursorResult = cursorDetector.detect();
    return {
      provider: cursorResult.hasCursor ? "cursor" : "none",
      hasAI: cursorResult.hasCursor,
      confidence: cursorResult.confidence
    };
  }, "detectEnv");
  const changeTracker = new SimpleChangeTracker();
  const tracker = new AiSessionTracker(detectEnv, changeTracker, options.aiDetectionEnabled ?? true);
  return tracker;
}
__name(createAiTracker, "createAiTracker");
__name2(createAiTracker, "createAiTracker");
var SessionManager = class {
  static {
    __name(this, "SessionManager");
  }
  static {
    __name2(this, "SessionManager");
  }
  options;
  activeSession = null;
  idleTimer = null;
  flushTimer = null;
  aiTracker;
  idleMs;
  flushBatchSize;
  flushIntervalMs;
  ignorePatterns;
  tier;
  consent;
  constructor(options) {
    this.options = options;
    this.idleMs = options.idleMs ?? 15 * 6e4;
    this.flushBatchSize = options.flushBatchSize ?? 50;
    this.flushIntervalMs = options.flushIntervalMs ?? 5e3;
    this.tier = options.tier ?? "free";
    this.consent = options.consent ?? false;
    this.aiTracker = createAiTracker(options);
    this.ignorePatterns = options.ignorePatterns ?? [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".git/**",
      "*.log",
      "*.tmp",
      "*.swp",
      ".DS_Store"
    ];
    this.runCrashRecovery().catch((err2) => {
      console.error("[SessionManager] Crash recovery failed:", err2);
    });
  }
  /**
  * Run crash recovery on startup
  * Recovers any pending rollback transactions that were interrupted
  */
  async runCrashRecovery() {
    const startTime = performance.now();
    const { SessionRecovery: SessionRecovery2 } = await Promise.resolve().then(() => (init_SessionRecovery(), SessionRecovery_exports));
    const recovery = new SessionRecovery2(this.options.workspaceRoot);
    const results = await recovery.recoverAll();
    const duration = performance.now() - startTime;
    if (results.length > 0) {
      const recovered = results.filter((r) => r.status === "recovered").length;
      const failed = results.filter((r) => r.status === "failed").length;
      const totalFilesRestored = results.reduce((sum, r) => sum + r.filesRestored, 0);
      console.log(`[SessionManager] Recovery complete: ${recovered} recovered, ${failed} failed, ${totalFilesRestored} files restored (${duration.toFixed(0)}ms)`);
    }
  }
  /**
  * Start a new session
  */
  async start() {
    if (this.activeSession) {
      await this.finalize();
    }
    const sessionId = nanoid();
    const startedAt = Date.now();
    this.activeSession = {
      sessionId,
      startedAt,
      triggers: /* @__PURE__ */ new Set([
        "filewatch"
      ]),
      changeBuffer: []
    };
    if (this.options.db) {
      const triggerBitmask = this.encodeTriggers(this.activeSession.triggers);
      await this.options.db.run(`INSERT INTO sessions (session_id, workspace_uri, started_at, triggers, change_count)
         VALUES (?, ?, ?, ?, 0)`, [
        sessionId,
        this.options.workspaceUri,
        startedAt,
        triggerBitmask
      ]);
    }
    this.startIdleTimer();
    this.startFlushTimer();
    this.aiTracker.startSession(sessionId);
    this.emitSessionStarted();
    return {
      sessionId
    };
  }
  /**
  * Track a file change
  */
  track(absolutePath, op, meta) {
    const startTime = performance.now();
    if (!this.activeSession) {
      return;
    }
    const relPath = this.normalizePath(absolutePath);
    if (this.shouldIgnore(relPath)) {
      return;
    }
    let fromPath;
    if (op === "renamed" && meta) {
      if (meta.fromPath) {
        fromPath = this.normalizePath(meta.fromPath);
      } else if (meta.oldUri) {
        const oldAbsPath = meta.oldUri.replace("file://", "");
        fromPath = this.normalizePath(oldAbsPath);
      }
    }
    const change = {
      p: relPath,
      op,
      from: fromPath,
      // Metadata captured immediately
      sizeAfter: meta?.size,
      mtimeAfter: meta?.mtime,
      modeAfter: meta?.mode
    };
    this.activeSession.changeBuffer.push(change);
    this.aiTracker.recordChange({
      chars: change.sizeAfter ?? 0,
      lines: 1,
      isInsert: change.op === "created",
      isMultiLine: false
    });
    this.resetIdleTimer();
    if (this.activeSession.changeBuffer.length >= this.flushBatchSize) {
      this.scheduleFlush();
    }
    const duration = performance.now() - startTime;
    if (duration > 10) {
      console.log(`[SessionManager] track() took ${duration.toFixed(1)}ms (op=${op})`);
    }
  }
  /**
  * Finalize the active session
  */
  async finalize() {
    const startTime = performance.now();
    if (!this.activeSession) {
      throw new Error("No active session to finalize");
    }
    const { sessionId, startedAt, triggers, changeBuffer } = this.activeSession;
    const changeCount = changeBuffer.length;
    const endedAt = Date.now();
    const durationMs = endedAt - startedAt;
    this.cancelTimers();
    triggers.add("manual");
    await this.computeDeferredHashes(changeBuffer);
    if (this.options.db && changeBuffer.length > 0) {
      const stmt = this.options.db.prepare(`INSERT INTO session_changes
         (session_id, rel_path, op, from_path, size_after, mtime_after, mode_after, h_old, h_new, eol_after)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const change of changeBuffer) {
        stmt.run(sessionId, change.p, change.op, change.from ?? null, change.sizeAfter ?? null, change.mtimeAfter ?? null, change.modeAfter ?? null, change.hOld ?? null, change.hNew ?? null, change.eolAfter ?? null);
      }
    }
    if (this.options.db) {
      const triggerBitmask = this.encodeTriggers(triggers);
      const aiResult = this.aiTracker.finalizeSession();
      await this.options.db.run(`UPDATE sessions
         SET ended_at = ?, change_count = ?, triggers = ?,
         ai_assist_level = ?, ai_confidence_score = ?, ai_provider = ?, ai_metadata = ?
         WHERE session_id = ?`, [
        endedAt,
        changeCount,
        triggerBitmask,
        aiResult.level,
        aiResult.confidence,
        aiResult.provider,
        JSON.stringify({
          reasoning: aiResult.reasoning,
          metrics: aiResult.metrics
        }),
        sessionId
      ]);
      const name = this.generateOfflineName(changeBuffer);
      await this.options.db.run("UPDATE sessions SET name = ? WHERE session_id = ?", [
        name,
        sessionId
      ]);
    }
    this.emitSessionFinalized(changeCount, durationMs, changeBuffer);
    this.activeSession = null;
    const totalDuration = performance.now() - startTime;
    console.log(`[SessionManager] finalize() took ${totalDuration.toFixed(0)}ms (sessionId=${sessionId}, changes=${changeCount})`);
    return {
      sessionId,
      changeCount
    };
  }
  /**
  * Get current session status
  */
  current() {
    if (!this.activeSession) {
      return {
        sessionId: null,
        changeCount: 0
      };
    }
    return {
      sessionId: this.activeSession.sessionId,
      changeCount: this.activeSession.changeBuffer.length
    };
  }
  /**
  * List recent sessions
  */
  async list(limit = 20) {
    if (!this.options.db) {
      return [];
    }
    const rows = await this.options.db.all(`SELECT session_id, workspace_uri, started_at, ended_at, name, triggers, change_count
       FROM sessions
       WHERE workspace_uri = ?
       ORDER BY started_at DESC
       LIMIT ?`, [
      this.options.workspaceUri,
      limit
    ]);
    return rows.map((row) => ({
      sessionId: row.session_id,
      startedAt: new Date(row.started_at).toISOString(),
      endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : void 0,
      name: row.name,
      changeCount: row.change_count,
      triggers: this.decodeTriggers(row.triggers)
    }));
  }
  /**
  * Get session manifest
  */
  async getManifest(sessionId) {
    if (!this.options.db) {
      throw new Error("Database not available");
    }
    const session = await this.options.db.get("SELECT * FROM sessions WHERE session_id = ?", [
      sessionId
    ]);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const changes = await this.options.db.all("SELECT * FROM session_changes WHERE session_id = ? ORDER BY id", [
      sessionId
    ]);
    const snapshots = await this.options.db.all("SELECT snapshot_id FROM session_snapshots WHERE session_id = ?", [
      sessionId
    ]);
    return {
      schema: "sb.session.v1",
      sessionId: session.session_id,
      startedAt: new Date(session.started_at).toISOString(),
      endedAt: session.ended_at ? new Date(session.ended_at).toISOString() : void 0,
      workspaceUri: session.workspace_uri,
      name: session.name,
      triggers: this.decodeTriggers(session.triggers),
      changeCount: session.change_count,
      filesChanged: changes.map((c) => this.dbRowToSessionChange(c)),
      snapshots: snapshots.map((s) => s.snapshot_id)
    };
  }
  /**
  * Rollback a session to its starting state
  *
  * This is a wrapper that delegates to SessionRollback for the actual rollback logic.
  * Returns a Result type for safe error handling.
  */
  async rollback(sessionId, options) {
    const manifest = await this.getManifest(sessionId);
    const { SessionRollback: SessionRollback2 } = await Promise.resolve().then(() => (init_SessionRollback(), SessionRollback_exports));
    const rollback = new SessionRollback2(this.options.workspaceRoot, this.options.blobStore);
    return rollback.rollback(manifest, options);
  }
  // =========================================================================
  // Private Helper Methods
  // =========================================================================
  /**
  * Normalize path to POSIX-style relative path
  */
  normalizePath(absolutePath) {
    const relPath = path10.relative(this.options.workspaceRoot, absolutePath);
    return relPath.split(path10.sep).join("/");
  }
  /**
  * Check if path should be ignored
  */
  shouldIgnore(relPath) {
    return this.ignorePatterns.some((pattern) => minimatch(relPath, pattern, {
      dot: true
    }));
  }
  /**
  * Compute deferred SHA-256 hashes
  */
  async computeDeferredHashes(changes) {
    for (const change of changes) {
      const absPath = path10.join(this.options.workspaceRoot, change.p);
      try {
        if (change.op !== "deleted") {
          const content = await fs3.readFile(absPath);
          const result = await this.options.blobStore.put(content);
          if (result.ok) {
            change.hNew = result.value;
          }
        }
      } catch (error) {
        console.warn(`Failed to hash ${change.p}:`, error);
      }
    }
  }
  /**
  * Generate offline session name from file changes
  */
  generateOfflineName(changes) {
    if (changes.length === 0) {
      return "Empty session";
    }
    const stems = /* @__PURE__ */ new Set();
    for (const change of changes.slice(0, 10)) {
      const basename6 = path10.basename(change.p, path10.extname(change.p));
      stems.add(basename6);
    }
    const stemList = Array.from(stems).slice(0, 3);
    if (stemList.length === 0) {
      return `Updated ${changes.length} files`;
    }
    return `Updated ${stemList.join(", ")}`;
  }
  /**
  * Encode trigger set to bitmask
  */
  encodeTriggers(triggers) {
    let mask = 0;
    for (const trigger of triggers) {
      if (trigger === "filewatch") {
        mask |= 1;
      }
      if (trigger === "pre-commit") {
        mask |= 2;
      }
      if (trigger === "manual") {
        mask |= 4;
      }
      if (trigger === "idle-finalize") {
        mask |= 8;
      }
    }
    return mask;
  }
  /**
  * Decode bitmask to trigger array
  */
  decodeTriggers(mask) {
    const triggers = [];
    if (mask & 1) {
      triggers.push("filewatch");
    }
    if (mask & 2) {
      triggers.push("pre-commit");
    }
    if (mask & 4) {
      triggers.push("manual");
    }
    if (mask & 8) {
      triggers.push("idle-finalize");
    }
    return triggers;
  }
  /**
  * Convert database row to SessionChange
  */
  dbRowToSessionChange(row) {
    return {
      p: row.rel_path,
      op: row.op,
      from: row.from_path ?? void 0,
      hOld: row.h_old ?? void 0,
      hNew: row.h_new ?? void 0,
      sizeBefore: row.size_before ?? void 0,
      sizeAfter: row.size_after ?? void 0,
      mtimeBefore: row.mtime_before ?? void 0,
      mtimeAfter: row.mtime_after ?? void 0,
      modeBefore: row.mode_before ?? void 0,
      modeAfter: row.mode_after ?? void 0,
      eolBefore: row.eol_before,
      eolAfter: row.eol_after
    };
  }
  /**
  * Start idle timer
  */
  startIdleTimer() {
    this.idleTimer = setTimeout(() => {
      this.autoFinalize();
    }, this.idleMs);
  }
  /**
  * Reset idle timer (activity detected)
  */
  resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.startIdleTimer();
  }
  /**
  * Start flush timer
  */
  startFlushTimer() {
    this.flushTimer = setTimeout(() => {
      this.scheduleFlush();
    }, this.flushIntervalMs);
  }
  /**
  * Schedule a flush operation
  */
  scheduleFlush() {
  }
  /**
  * Cancel all timers
  */
  cancelTimers() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
  /**
  * Auto-finalize on idle timeout
  */
  async autoFinalize() {
    if (!this.activeSession) {
      return;
    }
    this.activeSession.triggers.add("idle-finalize");
    await this.finalize();
  }
  /**
  * Emit SESSION_STARTED analytics event
  */
  emitSessionStarted() {
    const event = makeSafeSessionStartedEvent(this.tier);
    console.log("[SessionManager] SESSION_STARTED:", event);
  }
  /**
  * Emit SESSION_FINALIZED analytics event
  */
  emitSessionFinalized(changeCount, durationMs, changes) {
    const event = makeSafeSessionFinalizedEvent(changeCount, durationMs, this.tier, this.consent, changes);
    console.log("[SessionManager] SESSION_FINALIZED:", event);
  }
};
init_SessionRecovery();
init_SessionRollback();
var FileConflictResolver = class {
  static {
    __name(this, "FileConflictResolver");
  }
  static {
    __name2(this, "FileConflictResolver");
  }
  logger;
  fileSearchProvider;
  workspaceRoot;
  constructor(options = {}) {
    this.logger = options.logger ?? new NoOpLogger();
    this.fileSearchProvider = options.fileSearchProvider;
    this.workspaceRoot = options.workspaceRoot;
  }
  /**
  * Attempt to restore a file, handling conflicts.
  * Uses atomic write pattern: write to temp file, then rename.
  *
  * @param targetPath - Path where the file should be restored
  * @param content - File content to write
  * @param _originalMetadata - Original file metadata (for future use)
  * @returns Conflict resolution result
  *
  * @performance < 100ms for typical files
  */
  async resolveAndWrite(targetPath, content, _originalMetadata) {
    try {
      const hasPermission = await this.checkPermissions(targetPath);
      if (!hasPermission) {
        this.logger.debug("No write permission for target path", {
          targetPath
        });
        return {
          resolved: false,
          action: "skipped",
          path: targetPath,
          error: new Error(`No write permission for ${targetPath}`)
        };
      }
      const parentDir = path10.dirname(targetPath);
      await fs3.mkdir(parentDir, {
        recursive: true
      });
      const tempPath = `${targetPath}.snapback-tmp-${Date.now()}`;
      try {
        await fs3.writeFile(tempPath, content, "utf8");
        await fs3.rename(tempPath, targetPath);
      } catch (writeError) {
        try {
          await fs3.unlink(tempPath);
        } catch {
        }
        throw writeError;
      }
      this.logger.debug("File restored successfully", {
        targetPath
      });
      return {
        resolved: true,
        action: "restored",
        path: targetPath
      };
    } catch (error) {
      this.logger.error("Failed to restore file", error instanceof Error ? error : void 0, {
        targetPath
      });
      return {
        resolved: false,
        action: "skipped",
        path: targetPath,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  /**
  * Detect if a file was renamed/moved since snapshot.
  * Uses content hash matching to find moved files.
  *
  * Requires a fileSearchProvider to be configured.
  *
  * @param originalPath - Original file path from snapshot
  * @param contentHash - SHA-256 hash of the original content
  * @returns New file path if found, null otherwise
  */
  async findRenamedFile(originalPath, contentHash) {
    if (!this.fileSearchProvider || !this.workspaceRoot) {
      this.logger.debug("File search not available - no provider or workspace root configured");
      return null;
    }
    const originalFileName = path10.basename(originalPath);
    const originalExt = path10.extname(originalPath);
    try {
      const files = await this.fileSearchProvider.findFiles(this.workspaceRoot, originalExt, "**/node_modules/**", 100);
      for (const filePath of files) {
        try {
          const content = await this.fileSearchProvider.readFile(filePath);
          const hash = this.hashContent(content);
          if (hash === contentHash) {
            this.logger.debug("Found renamed file by content hash", {
              originalPath,
              newPath: filePath
            });
            return filePath;
          }
          const fileName = path10.basename(filePath);
          if (this.isSimilarFileName(originalFileName, fileName)) {
            const similarity = this.calculateSimilarity(contentHash, hash);
            if (similarity > 0.8) {
              this.logger.debug("Found renamed file by similarity", {
                originalPath,
                newPath: filePath,
                similarity
              });
              return filePath;
            }
          }
        } catch {
        }
      }
    } catch (error) {
      this.logger.debug("Error searching for renamed file", {
        originalPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return null;
  }
  /**
  * Verify write permissions before attempting restore.
  *
  * @param targetPath - Path to check permissions for
  * @returns True if write permission is available
  */
  async checkPermissions(targetPath) {
    try {
      try {
        await fs3.access(targetPath, fs3.constants.W_OK);
        return true;
      } catch {
        const parentDir = path10.dirname(targetPath);
        try {
          await fs3.access(parentDir, fs3.constants.W_OK);
          return true;
        } catch {
          const rootDir = this.findExistingAncestor(parentDir);
          if (rootDir) {
            await fs3.access(rootDir, fs3.constants.W_OK);
            return true;
          }
          return false;
        }
      }
    } catch {
      return false;
    }
  }
  /**
  * Hash file content using SHA-256
  *
  * @param content - Content to hash
  * @returns SHA-256 hash as hex string
  */
  hashContent(content) {
    return crypto2__default.createHash("sha256").update(content).digest("hex");
  }
  /**
  * Find the nearest existing ancestor directory.
  *
  * @param dirPath - Starting directory path
  * @returns Nearest existing ancestor path, or null
  */
  findExistingAncestor(dirPath) {
    let current = dirPath;
    const root = path10.parse(current).root;
    while (current !== root) {
      try {
        fs6.accessSync(current);
        return current;
      } catch {
        current = path10.dirname(current);
      }
    }
    return root;
  }
  /**
  * Check if two filenames are similar (for rename detection).
  *
  * Uses multiple heuristics:
  * - Exact base name match
  * - One name contains the other
  * - Levenshtein distance < 30% of max length
  *
  * @param name1 - First filename
  * @param name2 - Second filename
  * @returns True if filenames are considered similar
  */
  isSimilarFileName(name1, name2) {
    const base1 = path10.basename(name1, path10.extname(name1)).toLowerCase();
    const base2 = path10.basename(name2, path10.extname(name2)).toLowerCase();
    if (base1 === base2) {
      return true;
    }
    if (base1.includes(base2) || base2.includes(base1)) {
      return true;
    }
    const distance = this.levenshteinDistance(base1, base2);
    const maxLen = Math.max(base1.length, base2.length);
    return distance / maxLen < 0.3;
  }
  /**
  * Calculate Levenshtein distance between two strings.
  *
  * @param str1 - First string
  * @param str2 - Second string
  * @returns Edit distance as integer
  */
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array.from({
      length: m + 1
    }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[m][n];
  }
  /**
  * Calculate similarity between two hashes.
  *
  * Note: SHA-256 hashes are cryptographic - different content produces
  * completely different hashes. This returns 1.0 for exact match, 0.0 otherwise.
  * For actual content similarity, compare the content directly.
  *
  * @param hash1 - First hash
  * @param hash2 - Second hash
  * @returns Similarity score (1.0 = exact match, 0.0 = different)
  */
  calculateSimilarity(hash1, hash2) {
    return hash1 === hash2 ? 1 : 0;
  }
};
async function withRetry(operation, options) {
  const { maxAttempts, baseDelayMs, maxDelayMs = 3e4, jitter = false, onRetry } = options;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs, jitter);
      if (onRetry) {
        onRetry(attempt, error instanceof Error ? error : new Error(String(error)));
      }
      await new Promise((resolve2) => setTimeout(resolve2, delay));
    }
  }
  throw new Error("Retry failed - should never reach");
}
__name(withRetry, "withRetry");
__name2(withRetry, "withRetry");
function calculateBackoff(attempt, baseMs, maxMs, jitter) {
  const exponential = baseMs * 2 ** (attempt - 1);
  const capped = Math.min(exponential, maxMs);
  if (jitter) {
    const jitterAmount = Math.random() * capped;
    return capped + jitterAmount;
  }
  return capped;
}
__name(calculateBackoff, "calculateBackoff");
__name2(calculateBackoff, "calculateBackoff");
var RetryPresets = {
  /** Fast retries for network requests (max 5s delay) */
  network: {
    maxAttempts: 3,
    baseDelayMs: 1e3,
    maxDelayMs: 5e3,
    jitter: true
  },
  /** Medium retries for API calls (max 30s delay) */
  api: {
    maxAttempts: 5,
    baseDelayMs: 2e3,
    maxDelayMs: 3e4,
    jitter: true
  },
  /** Aggressive retries for critical operations (max 1min delay) */
  critical: {
    maxAttempts: 10,
    baseDelayMs: 1e3,
    maxDelayMs: 6e4,
    jitter: true
  },
  /** Quick retries for fast operations (max 2s delay) */
  fast: {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 2e3,
    jitter: false
  }
};
function diagnoseSnapshotFailure(error, files, workspaceRoot) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes("ENOENT") || errorMessage.includes("no such file") || errorMessage.toLowerCase().includes("file not found")) {
    const missingFiles = files.filter((f) => {
      const fullPath = path10.isAbsolute(f) ? f : path10.join(workspaceRoot, f);
      return !fs6.existsSync(fullPath);
    });
    return {
      type: "FILE_NOT_FOUND",
      message: "One or more files do not exist",
      cause: "The specified file paths could not be found on disk",
      suggestedFix: "Check file paths and ensure files exist",
      userAction: missingFiles.length > 0 ? `Create missing files: ${missingFiles.join(", ")}` : "Verify file paths are correct",
      canAutoFix: false,
      confidence: 0.95,
      affectedFiles: missingFiles.length > 0 ? missingFiles : void 0
    };
  }
  if (errorMessage.includes("absolute") || errorMessage.includes("Absolute paths not allowed")) {
    const absolutePaths = files.filter((f) => path10.isAbsolute(f));
    return {
      type: "ABSOLUTE_PATH_REJECTED",
      message: "Snapshot tool requires relative paths",
      cause: "Absolute paths were provided instead of relative paths",
      suggestedFix: "Convert absolute paths to relative paths from workspace root",
      userAction: "Automatic: Converting to relative paths",
      canAutoFix: true,
      confidence: 1,
      affectedFiles: absolutePaths
    };
  }
  if (errorMessage.includes("EACCES") || errorMessage.includes("permission denied")) {
    return {
      type: "PERMISSION_DENIED",
      message: "Permission denied when accessing files",
      cause: "The current user does not have read permission for one or more files",
      suggestedFix: "Check file permissions or run with appropriate privileges",
      userAction: "Run: chmod +r <file> or check file ownership",
      canAutoFix: false,
      confidence: 0.9
    };
  }
  if (errorMessage.includes("workspace") || errorMessage.includes("outside workspace")) {
    return {
      type: "WORKSPACE_MISMATCH",
      message: "Files are outside the workspace root",
      cause: "The workspace root does not contain all specified files",
      suggestedFix: "Ensure all files are within the workspace directory",
      userAction: "Automatic: Resolving paths from correct workspace root",
      canAutoFix: true,
      confidence: 0.85
    };
  }
  if (errorMessage.includes("cwd") || errorMessage.includes("working directory")) {
    return {
      type: "WORKING_DIRECTORY_MISMATCH",
      message: "Current working directory mismatch",
      cause: "The process is not running from the expected workspace root",
      suggestedFix: "Change to the correct working directory",
      userAction: "Automatic: Adjusting paths for current directory",
      canAutoFix: true,
      confidence: 0.8
    };
  }
  if (errorMessage.includes("ENOSPC") || errorMessage.includes("no space")) {
    return {
      type: "STORAGE_FULL",
      message: "Insufficient disk space",
      cause: "The disk does not have enough free space for the snapshot",
      suggestedFix: "Free up disk space and try again",
      userAction: "Clear temporary files or expand disk storage",
      canAutoFix: false,
      confidence: 0.95
    };
  }
  return {
    type: "UNKNOWN",
    message: "Unknown error during snapshot creation",
    cause: errorMessage,
    suggestedFix: "Check the error message and logs for details",
    userAction: "Review error details and try again",
    canAutoFix: false,
    confidence: 0.3
  };
}
__name(diagnoseSnapshotFailure, "diagnoseSnapshotFailure");
__name2(diagnoseSnapshotFailure, "diagnoseSnapshotFailure");
async function applyAutomaticFix(diagnosis, context) {
  switch (diagnosis.type) {
    case "ABSOLUTE_PATH_REJECTED": {
      context.files = context.files.map((f) => {
        if (path10.isAbsolute(f)) {
          return path10.relative(context.workspaceRoot, f);
        }
        return f;
      });
      return true;
    }
    case "WORKSPACE_MISMATCH":
    case "WORKING_DIRECTORY_MISMATCH": {
      context.files = context.files.map((f) => {
        if (path10.isAbsolute(f)) {
          return path10.relative(context.workspaceRoot, f);
        }
        const fromCwd = path10.resolve(process.cwd(), f);
        if (fs6.existsSync(fromCwd)) {
          return path10.relative(context.workspaceRoot, fromCwd);
        }
        return f;
      });
      return true;
    }
    default:
      return false;
  }
}
__name(applyAutomaticFix, "applyAutomaticFix");
__name2(applyAutomaticFix, "applyAutomaticFix");
var DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  delayMs: 100,
  exponentialBackoff: true,
  autoFix: true,
  verbose: false
};
async function createSnapshotWithRetry(params, snapshotFn, config = {}) {
  const cfg = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  };
  const { workspaceRoot = process.cwd() } = params;
  let lastError = null;
  let lastDiagnosis = null;
  const context = {
    files: [
      ...params.files
    ],
    workspaceRoot
  };
  for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
    try {
      if (cfg.verbose && attempt > 1) {
        console.error(`[SnapBack Retry] Attempt ${attempt}/${cfg.maxRetries}`);
      }
      if (attempt > 1) {
        const delay = cfg.exponentialBackoff ? calculateBackoff(attempt - 1, cfg.delayMs, 3e4, false) : cfg.delayMs;
        await new Promise((resolve2) => setTimeout(resolve2, delay));
      }
      const snapshot = await snapshotFn({
        ...params,
        files: context.files
      });
      if (cfg.verbose && attempt > 1) {
        console.error(`[SnapBack Retry] \u2705 Succeeded on attempt ${attempt}`);
      }
      return {
        success: true,
        snapshot,
        attempt,
        totalAttempts: attempt
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const diagnosis = diagnoseSnapshotFailure(error, context.files, context.workspaceRoot);
      lastDiagnosis = diagnosis;
      if (cfg.verbose) {
        console.error(`[SnapBack Retry] \u274C Attempt ${attempt}/${cfg.maxRetries} failed`);
        console.error(`[SnapBack Retry] \u{1F50D} Diagnosis: ${diagnosis.type}`);
        console.error(`[SnapBack Retry] \u{1F4CB} ${diagnosis.message}`);
        console.error(`[SnapBack Retry] \u{1F4A1} ${diagnosis.suggestedFix}`);
      }
      if (cfg.autoFix && diagnosis.canAutoFix && attempt < cfg.maxRetries) {
        const fixApplied = await applyAutomaticFix(diagnosis, context);
        if (fixApplied) {
          if (cfg.verbose) {
            console.error(`[SnapBack Retry] \u{1F527} Applied automatic fix: ${diagnosis.userAction}`);
          }
          continue;
        }
      }
      if (attempt === cfg.maxRetries) {
        break;
      }
      if (cfg.verbose && !diagnosis.canAutoFix) {
        console.error("[SnapBack Retry] \u26A0\uFE0F  No automatic fix available, retrying anyway...");
      }
    }
  }
  return {
    success: false,
    error: lastError?.message || "Unknown error",
    suggestion: lastDiagnosis?.userAction || "Check logs for details",
    diagnostics: lastDiagnosis || void 0,
    attempt: cfg.maxRetries,
    totalAttempts: cfg.maxRetries
  };
}
__name(createSnapshotWithRetry, "createSnapshotWithRetry");
__name2(createSnapshotWithRetry, "createSnapshotWithRetry");
async function createSnapshotWithRetrySafe(params, snapshotFn, config = {}) {
  const result = await createSnapshotWithRetry(params, snapshotFn, config);
  if (result.success && result.snapshot) {
    return ok(result.snapshot);
  }
  return err(result.diagnostics || {
    type: "UNKNOWN",
    message: result.error || "Unknown error",
    cause: "Snapshot creation failed after all retries",
    suggestedFix: result.suggestion || "Check logs for details",
    userAction: "Review error and try again",
    canAutoFix: false,
    confidence: 0.1
  });
}
__name(createSnapshotWithRetrySafe, "createSnapshotWithRetrySafe");
__name2(createSnapshotWithRetrySafe, "createSnapshotWithRetrySafe");
function formatDiagnosis(diagnosis) {
  const confidencePercent = Math.round(diagnosis.confidence * 100);
  const autoFixBadge = diagnosis.canAutoFix ? "\u2705 Auto-fixable" : "\u274C Manual fix required";
  return `
\u{1F50D} Snapshot Failure Diagnosis
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

Type: ${diagnosis.type}
Confidence: ${confidencePercent}%
${autoFixBadge}

\u{1F4CB} Issue:
  ${diagnosis.message}

\u{1F50E} Root Cause:
  ${diagnosis.cause}

\u{1F4A1} Suggested Fix:
  ${diagnosis.suggestedFix}

\u{1F464} Action Required:
  ${diagnosis.userAction}
${diagnosis.affectedFiles ? `
\u{1F4C1} Affected Files:
${diagnosis.affectedFiles.map((f) => `  - ${f}`).join("\n")}` : ""}
`.trim();
}
__name(formatDiagnosis, "formatDiagnosis");
__name2(formatDiagnosis, "formatDiagnosis");
var SnapshotDeletionService = class {
  static {
    __name(this, "SnapshotDeletionService");
  }
  static {
    __name2(this, "SnapshotDeletionService");
  }
  snapshotManager;
  confirmationService;
  logger;
  constructor(snapshotManager, confirmationService, options = {}) {
    this.snapshotManager = snapshotManager;
    this.confirmationService = confirmationService;
    this.logger = options.logger ?? new NoOpLogger();
  }
  /**
  * Delete a single snapshot with safety checks
  *
  * @param snapshotId - ID of snapshot to delete
  * @param options - Deletion options
  * @returns Deletion result with success status and count
  * @throws Error if snapshot is protected and unprotectFirst is false
  * @throws Error if snapshot does not exist
  *
  * @performance < 50ms including confirmation dialog
  */
  async deleteSnapshot(snapshotId, options = {}) {
    const snapshot = await this.snapshotManager.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    if (snapshot.isProtected && !options.unprotectFirst) {
      throw new Error("Cannot delete protected snapshot. Set unprotectFirst=true to override.");
    }
    if (options.unprotectFirst && snapshot.isProtected) {
      await this.snapshotManager.unprotect(snapshotId);
    }
    if (!options.skipConfirmation) {
      const confirmed = await this.confirmationService.confirm(`Delete snapshot "${snapshot.name}"?`, "This action cannot be undone.");
      if (!confirmed) {
        return {
          success: false,
          deletedCount: 0,
          error: "User cancelled deletion"
        };
      }
    }
    await this.snapshotManager.delete(snapshotId);
    return {
      success: true,
      deletedCount: 1
    };
  }
  /**
  * Delete all snapshots older than the specified timestamp
  *
  * @param timestamp - Cutoff timestamp (milliseconds since epoch)
  * @param keepProtected - If true, skip protected snapshots
  * @returns Deletion result with count of deleted snapshots
  *
  * @performance < 500ms for 100 snapshots
  */
  async deleteOlderThan(timestamp, keepProtected = true) {
    const allSnapshots = await this.snapshotManager.getAll();
    const toDelete = allSnapshots.filter((snapshot) => {
      if (snapshot.timestamp >= timestamp) {
        return false;
      }
      if (keepProtected && snapshot.isProtected) {
        return false;
      }
      return true;
    });
    let deletedCount = 0;
    for (const snapshot of toDelete) {
      try {
        if (snapshot.isProtected) {
          await this.snapshotManager.unprotect(snapshot.id);
        }
        await this.snapshotManager.delete(snapshot.id);
        deletedCount++;
      } catch (error) {
        this.logger.error(`Failed to delete snapshot ${snapshot.id}:`, toError2(error));
      }
    }
    return {
      success: true,
      deletedCount
    };
  }
  /**
  * Perform automatic cleanup based on configuration
  *
  * @param config - Auto-cleanup configuration
  * @returns Deletion result with count of deleted snapshots
  */
  async autoCleanup(config) {
    if (!config.enabled) {
      return {
        success: true,
        deletedCount: 0
      };
    }
    const allSnapshots = await this.snapshotManager.getAll();
    if (allSnapshots.length <= config.minimumSnapshots) {
      return {
        success: true,
        deletedCount: 0
      };
    }
    const cutoffTime = Date.now() - config.olderThanDays * 24 * 60 * 60 * 1e3;
    const eligibleForDeletion = allSnapshots.filter((snapshot) => {
      if (snapshot.timestamp >= cutoffTime) {
        return false;
      }
      if (config.keepProtected && snapshot.isProtected) {
        return false;
      }
      return true;
    });
    eligibleForDeletion.sort((a, b) => a.timestamp - b.timestamp);
    const maxToDelete = allSnapshots.length - config.minimumSnapshots;
    const toDelete = eligibleForDeletion.slice(0, Math.max(0, maxToDelete));
    let deletedCount = 0;
    for (const snapshot of toDelete) {
      try {
        if (snapshot.isProtected) {
          await this.snapshotManager.unprotect(snapshot.id);
        }
        await this.snapshotManager.delete(snapshot.id);
        deletedCount++;
      } catch (error) {
        this.logger.error(`Auto-cleanup failed for ${snapshot.id}:`, toError2(error));
      }
    }
    return {
      success: true,
      deletedCount
    };
  }
  /**
  * Check if a snapshot can be safely deleted
  *
  * @param snapshot - Snapshot to check
  * @returns True if snapshot can be deleted without unprotectFirst
  *
  * @performance < 1ms
  */
  canDelete(snapshot) {
    return !snapshot.isProtected;
  }
};
var SnapshotIconStrategy = class _SnapshotIconStrategy {
  static {
    __name(this, "_SnapshotIconStrategy");
  }
  static {
    __name2(this, "SnapshotIconStrategy");
  }
  /**
  * Icon mapping configuration with codicon names and theme colors
  */
  static ICON_MAP = {
    "file-add": {
      icon: "file-add",
      color: "charts.green"
    },
    "file-delete": {
      icon: "trash",
      color: "charts.red"
    },
    "test-changes": {
      icon: "beaker",
      color: "charts.purple"
    },
    "update-deps": {
      icon: "package",
      color: "charts.yellow"
    },
    "config-change": {
      icon: "settings-gear",
      color: "debugConsole.warningForeground"
    },
    refactor: {
      icon: "symbol-class",
      color: "charts.blue"
    },
    "fix-bug": {
      icon: "bug",
      color: "charts.red"
    },
    "docs-update": {
      icon: "book",
      color: "charts.blue"
    },
    "style-changes": {
      icon: "paintcan",
      color: "charts.pink"
    },
    "api-changes": {
      icon: "server",
      color: "charts.yellow"
    },
    database: {
      icon: "database",
      color: "charts.orange"
    },
    protected: {
      icon: "lock",
      color: "charts.red"
    },
    default: {
      icon: "file-code",
      color: "foreground"
    }
  };
  /**
  * Pre-compiled regex patterns for performance optimization
  */
  static TEST_FILE_REGEX = /\.(test|spec)\.(ts|js|tsx|jsx)$/i;
  static CONFIG_FILE_REGEX = /\.(config\.(ts|js)|eslintrc|prettierrc|env)/i;
  static STYLE_FILE_REGEX = /\.(css|scss|less|sass)$/i;
  static DOC_FILE_REGEX = /\.(md|mdx)$/i;
  static SQL_FILE_REGEX = /\.sql$/i;
  static SCHEMA_FILE_REGEX = /schema\.(sql|prisma|ts|js)/i;
  static API_FILE_REGEX = /\.api\./i;
  /**
  * Package lock file patterns
  */
  static PACKAGE_FILES = /* @__PURE__ */ new Set([
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml"
  ]);
  /**
  * Config file patterns
  */
  static CONFIG_FILES = /* @__PURE__ */ new Set([
    "tsconfig.json",
    ".eslintrc.json",
    ".prettierrc"
  ]);
  /**
  * Keyword sets for name-based classification
  */
  static BUG_FIX_KEYWORDS = [
    "fix",
    "bugfix"
  ];
  static REFACTOR_KEYWORDS = [
    "refactor",
    "refactored"
  ];
  static ADDITION_KEYWORDS = [
    "added",
    "created",
    "file-add"
  ];
  static DELETION_KEYWORDS = [
    "deleted",
    "removed",
    "file-delete"
  ];
  static DOC_KEYWORDS = [
    "docs",
    "documentation",
    "docs-update"
  ];
  static STYLE_KEYWORDS = [
    "style",
    "styling",
    "style-changes"
  ];
  static API_KEYWORDS = [
    "api-changes",
    "endpoint"
  ];
  static DATABASE_KEYWORDS = [
    "database",
    "db",
    "migration",
    "schema"
  ];
  static PACKAGE_KEYWORDS = [
    "update-deps",
    "dependencies"
  ];
  static CONFIG_KEYWORDS = [
    "config-change"
  ];
  /**
  * Classifies a snapshot into an appropriate icon based on its metadata.
  *
  * Detection logic priority order:
  * 1. Protected status (highest priority)
  * 2. Name keywords (bug fix, deletion, refactor, etc.)
  * 3. File extensions (test files, package files, config files, etc.)
  * 4. Fallback to default icon
  *
  * @param metadata - The snapshot metadata to classify
  * @returns IconResult containing the codicon name and theme color
  */
  classifyIcon(metadata) {
    if (metadata.isProtected) {
      return _SnapshotIconStrategy.ICON_MAP.protected;
    }
    const nameResult = this.classifyByName(metadata.name);
    if (nameResult) {
      return nameResult;
    }
    const fileResult = this.classifyByFiles(metadata.files);
    if (fileResult) {
      return fileResult;
    }
    return _SnapshotIconStrategy.ICON_MAP.default;
  }
  /**
  * Get the icon mapping for a specific category
  *
  * @param category - The category key (e.g., 'protected', 'test-changes')
  * @returns IconMapping or undefined if not found
  */
  getIconMapping(category) {
    return _SnapshotIconStrategy.ICON_MAP[category];
  }
  /**
  * Get all available icon mappings
  *
  * @returns Record of all icon mappings
  */
  getAllIconMappings() {
    return {
      ..._SnapshotIconStrategy.ICON_MAP
    };
  }
  /**
  * Classifies based on name keywords with priority ordering.
  *
  * @param name - The snapshot name
  * @returns IconResult if keyword matched, null otherwise
  */
  classifyByName(name) {
    const lowerName = name.toLowerCase();
    if (this.matchesPrefixKeyword(lowerName, _SnapshotIconStrategy.ADDITION_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["file-add"];
    }
    if (this.matchesPrefixKeyword(lowerName, _SnapshotIconStrategy.BUG_FIX_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["fix-bug"];
    }
    if (this.matchesPrefixKeyword(lowerName, _SnapshotIconStrategy.DELETION_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["file-delete"];
    }
    if (this.matchesPrefixKeyword(lowerName, _SnapshotIconStrategy.REFACTOR_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP.refactor;
    }
    if (this.matchesPrefixKeyword(lowerName, _SnapshotIconStrategy.DOC_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["docs-update"];
    }
    if (this.matchesPrefixKeyword(lowerName, _SnapshotIconStrategy.STYLE_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["style-changes"];
    }
    if (this.matchesPrefixKeyword(lowerName, _SnapshotIconStrategy.CONFIG_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["config-change"];
    }
    if (this.matchesKeyword(lowerName, _SnapshotIconStrategy.BUG_FIX_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["fix-bug"];
    }
    if (this.matchesKeyword(lowerName, _SnapshotIconStrategy.DELETION_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["file-delete"];
    }
    if (this.matchesKeyword(lowerName, _SnapshotIconStrategy.REFACTOR_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP.refactor;
    }
    if (this.matchesKeyword(lowerName, _SnapshotIconStrategy.API_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["api-changes"];
    }
    if (this.matchesKeyword(lowerName, _SnapshotIconStrategy.DATABASE_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP.database;
    }
    if (this.matchesKeyword(lowerName, _SnapshotIconStrategy.DOC_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["docs-update"];
    }
    if (this.matchesKeyword(lowerName, _SnapshotIconStrategy.STYLE_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["style-changes"];
    }
    if (this.matchesKeyword(lowerName, _SnapshotIconStrategy.ADDITION_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["file-add"];
    }
    if (this.matchesKeyword(lowerName, _SnapshotIconStrategy.PACKAGE_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["update-deps"];
    }
    if (this.matchesKeyword(lowerName, _SnapshotIconStrategy.CONFIG_KEYWORDS)) {
      return _SnapshotIconStrategy.ICON_MAP["config-change"];
    }
    return null;
  }
  /**
  * Classifies based on file extensions and paths.
  *
  * @param files - The list of file paths
  * @returns IconResult if file pattern matched, null otherwise
  */
  classifyByFiles(files) {
    if (!files || files.length === 0) {
      return null;
    }
    if (this.containsTestFiles(files)) {
      return _SnapshotIconStrategy.ICON_MAP["test-changes"];
    }
    if (this.containsPackageFiles(files)) {
      return _SnapshotIconStrategy.ICON_MAP["update-deps"];
    }
    if (this.containsConfigFiles(files)) {
      return _SnapshotIconStrategy.ICON_MAP["config-change"];
    }
    if (this.containsDocFiles(files)) {
      return _SnapshotIconStrategy.ICON_MAP["docs-update"];
    }
    if (this.containsStyleFiles(files)) {
      return _SnapshotIconStrategy.ICON_MAP["style-changes"];
    }
    if (this.containsDatabaseFiles(files)) {
      return _SnapshotIconStrategy.ICON_MAP.database;
    }
    if (this.containsApiFiles(files)) {
      return _SnapshotIconStrategy.ICON_MAP["api-changes"];
    }
    return null;
  }
  /**
  * Checks if name matches any keyword (case-insensitive).
  */
  matchesKeyword(name, keywords) {
    return keywords.some((k) => name.includes(k));
  }
  /**
  * Checks if name starts with keyword followed by colon (conventional commit format).
  */
  matchesPrefixKeyword(name, keywords) {
    return keywords.some((k) => name.startsWith(`${k}:`));
  }
  /**
  * Checks if files contain test files.
  */
  containsTestFiles(files) {
    return files.some((file) => {
      const fileName = path10.basename(file);
      const lowerFile = file.toLowerCase();
      return _SnapshotIconStrategy.TEST_FILE_REGEX.test(fileName) || lowerFile.includes("__tests__");
    });
  }
  /**
  * Checks if files contain package lock files.
  */
  containsPackageFiles(files) {
    return files.some((file) => {
      const fileName = path10.basename(file);
      return _SnapshotIconStrategy.PACKAGE_FILES.has(fileName);
    });
  }
  /**
  * Checks if files contain configuration files.
  */
  containsConfigFiles(files) {
    return files.some((file) => {
      const fileName = path10.basename(file);
      const lowerFile = file.toLowerCase();
      return _SnapshotIconStrategy.CONFIG_FILE_REGEX.test(fileName) || _SnapshotIconStrategy.CONFIG_FILES.has(fileName) || lowerFile.includes(".env");
    });
  }
  /**
  * Checks if files contain documentation files.
  */
  containsDocFiles(files) {
    return files.some((file) => {
      const fileName = path10.basename(file);
      const lowerFile = file.toLowerCase();
      return _SnapshotIconStrategy.DOC_FILE_REGEX.test(fileName) || lowerFile.includes("/docs/") || lowerFile.startsWith("docs/");
    });
  }
  /**
  * Checks if files contain style files.
  */
  containsStyleFiles(files) {
    return files.some((file) => {
      const fileName = path10.basename(file);
      return _SnapshotIconStrategy.STYLE_FILE_REGEX.test(fileName);
    });
  }
  /**
  * Checks if files contain database files.
  */
  containsDatabaseFiles(files) {
    return files.some((file) => {
      const fileName = path10.basename(file);
      const lowerFile = file.toLowerCase();
      return _SnapshotIconStrategy.SQL_FILE_REGEX.test(fileName) || _SnapshotIconStrategy.SCHEMA_FILE_REGEX.test(fileName) || lowerFile.includes("/migrations/") || lowerFile.startsWith("migrations/") || lowerFile.includes("/schema/") || lowerFile.startsWith("schema/");
    });
  }
  /**
  * Checks if files contain API files.
  */
  containsApiFiles(files) {
    return files.some((file) => {
      const fileName = path10.basename(file);
      const lowerFile = file.toLowerCase();
      return _SnapshotIconStrategy.API_FILE_REGEX.test(fileName) || lowerFile.includes("/api/") || lowerFile.startsWith("api/");
    });
  }
};
var execAsync = promisify(exec);
var SnapshotNamingStrategy = class {
  static {
    __name(this, "SnapshotNamingStrategy");
  }
  static {
    __name2(this, "SnapshotNamingStrategy");
  }
  workspaceRoot;
  gitTimeoutMs;
  maxNameLength;
  logger;
  constructor(workspaceRoot, options = {}) {
    this.workspaceRoot = workspaceRoot;
    this.logger = options.logger ?? new NoOpLogger();
    this.gitTimeoutMs = options.gitTimeoutMs ?? 5e3;
    this.maxNameLength = options.maxNameLength ?? 60;
  }
  /**
  * Generates a snapshot name using multi-tier fallback strategy
  *
  * @param info - Snapshot information containing file changes
  * @returns Promise resolving to a descriptive snapshot name
  */
  async generateName(info) {
    if (info.files.length === 0) {
      return "No changes";
    }
    let baseName;
    const gitName = await this.tryGitNaming(info);
    if (gitName) {
      baseName = gitName;
    } else {
      const fileOpName = this.tryFileOperationNaming(info);
      if (fileOpName) {
        baseName = fileOpName;
      } else {
        const contentName = await this.tryContentAnalysisNaming(info);
        if (contentName) {
          baseName = contentName;
        } else {
          baseName = this.fallbackNaming(info);
        }
      }
    }
    if (info.userContext) {
      const prefix = this.formatUserContext(info.userContext);
      return `${prefix}: ${baseName}`;
    }
    return baseName;
  }
  /**
  * Tier 1: Git-based naming
  * Attempts to use actual git commands to generate names.
  * Returns null if git is unavailable or no git repo exists.
  */
  async tryGitNaming(info) {
    try {
      const isGitRepo = await this.execGit([
        "rev-parse",
        "--git-dir"
      ]);
      if (!isGitRepo) {
        return null;
      }
      const gitStatus = await this.execGit([
        "status",
        "--porcelain"
      ]);
      if (!gitStatus) {
        return null;
      }
      if (info.files.length === 1) {
        const file = info.files[0];
        return this.generateSingleFileGitName(file.status, file.path);
      }
      return this.generateMultiFileGitName(info.files);
    } catch (_error) {
      return null;
    }
  }
  /**
  * Tier 2: File operation pattern detection
  * Detects test files, configs, dependencies with priority ordering
  */
  tryFileOperationNaming(info) {
    const files = info.files;
    const testFiles = files.filter((f) => this.isTestFile(f.path));
    if (testFiles.length > 0 && testFiles.length === files.length) {
      return `Updated ${testFiles.length} test${testFiles.length > 1 ? "s" : ""}`;
    }
    const dependencyFiles = files.filter((f) => this.isDependencyFile(f.path));
    if (dependencyFiles.length > 0) {
      return "Updated dependencies";
    }
    const configFiles = files.filter((f) => this.isConfigFile(f.path));
    if (configFiles.length > 0 && configFiles.length === files.length) {
      return `Modified ${configFiles.length} config${configFiles.length > 1 ? "s" : ""}`;
    }
    if (testFiles.length > 0 && testFiles.length < files.length) {
      return `Updated ${testFiles.length} test${testFiles.length > 1 ? "s" : ""}`;
    }
    return null;
  }
  /**
  * Tier 3: Content analysis
  * Detects refactoring patterns, structure changes, and import modifications
  */
  async tryContentAnalysisNaming(info) {
    try {
      const importCount = await this.countImportChanges(info.files);
      const structureCount = await this.countStructureChanges(info.files);
      if (importCount > 0 && structureCount === 0) {
        return `Updated ${importCount} import${importCount > 1 ? "s" : ""}`;
      }
      if (structureCount > 3 && info.files.length > 1) {
        const commonDir = this.findCommonDirectory(info.files);
        const moduleName = this.extractModuleName(commonDir, info.files);
        return `Refactored ${moduleName} module (${info.files.length} files)`;
      }
      if (structureCount >= 3 && info.files.length === 1) {
        const dir = path10.dirname(info.files[0].path);
        const moduleName = this.extractModuleName(dir, info.files);
        return `Refactored ${moduleName} (${structureCount} changes)`;
      }
      if (importCount > 0) {
        return `Updated ${importCount} import${importCount > 1 ? "s" : ""}`;
      }
      return null;
    } catch (_error) {
      return null;
    }
  }
  /**
  * Tier 4: Fallback naming
  * Uses git-style format for code files, line count for unknown/non-code files
  */
  fallbackNaming(info) {
    const totalLines = info.files.reduce((sum, file) => sum + file.linesAdded + file.linesDeleted, 0);
    const fileCount = info.files.length;
    const allCodeFiles = info.files.every((f) => this.isCodeFile(f.path));
    if (info.files.length === 1) {
      const file = info.files[0];
      if (!this.isCodeFile(file.path)) {
        return `Modified 1 file (${totalLines} lines)`;
      }
      return this.generateSingleFileGitName(file.status, file.path);
    }
    if (!allCodeFiles) {
      return `Modified ${fileCount} files (${totalLines} lines)`;
    }
    const hasAdditions = info.files.some((f) => f.status === "added");
    const hasModifications = info.files.some((f) => f.status === "modified");
    const hasDeletions = info.files.some((f) => f.status === "deleted");
    if (hasAdditions || hasModifications || hasDeletions) {
      return this.generateMultiFileGitName(info.files);
    }
    return `Modified ${fileCount} files (${totalLines} lines)`;
  }
  /**
  * Execute git command with error handling
  */
  async execGit(args) {
    try {
      const { stdout } = await execAsync(`git ${args.join(" ")}`, {
        cwd: this.workspaceRoot,
        timeout: this.gitTimeoutMs
      });
      return stdout.trim();
    } catch (_error) {
      return null;
    }
  }
  /**
  * Generate single-file git-style name
  */
  generateSingleFileGitName(status, filePath) {
    const basename6 = path10.basename(filePath);
    const sanitizedName = this.sanitizeFilename(basename6);
    const truncatedName = this.truncatePath(sanitizedName, this.maxNameLength - 20);
    switch (status) {
      case "added":
        return `Added ${truncatedName}`;
      case "modified":
        return `Modified ${truncatedName}`;
      case "deleted":
        return `Deleted ${truncatedName}`;
    }
  }
  /**
  * Generate multi-file git-style name (e.g., "3A 2M 1D in src/auth")
  */
  generateMultiFileGitName(files) {
    const added = files.filter((f) => f.status === "added").length;
    const modified = files.filter((f) => f.status === "modified").length;
    const deleted = files.filter((f) => f.status === "deleted").length;
    const parts = [];
    if (added > 0) {
      parts.push(`${added}A`);
    }
    if (modified > 0) {
      parts.push(`${modified}M`);
    }
    if (deleted > 0) {
      parts.push(`${deleted}D`);
    }
    const statusSummary = parts.join(" ");
    const commonDir = this.findCommonDirectory(files);
    const dirName = commonDir ? this.getRelativeDirectory(commonDir) : "workspace";
    return `${statusSummary} in ${dirName}`;
  }
  /**
  * Find common directory path for multiple files
  */
  findCommonDirectory(files) {
    if (files.length === 0) {
      return "";
    }
    if (files.length === 1) {
      return path10.dirname(files[0].path);
    }
    const dirPaths = files.map((f) => path10.dirname(f.path));
    const segmentArrays = dirPaths.map((dir) => dir.split(path10.sep));
    const firstSegments = segmentArrays[0];
    const commonSegments = [];
    for (let i = 0; i < firstSegments.length; i++) {
      const segment = firstSegments[i];
      const allMatch = segmentArrays.every((segments) => segments[i] === segment);
      if (allMatch) {
        commonSegments.push(segment);
      } else {
        break;
      }
    }
    return commonSegments.length === 0 ? "" : commonSegments.join(path10.sep);
  }
  /**
  * Get relative directory name from absolute path
  */
  getRelativeDirectory(absolutePath) {
    let relative4 = path10.relative(this.workspaceRoot, absolutePath);
    if (relative4) {
      relative4 = relative4.split(path10.sep).join("/");
      if (relative4.startsWith("./")) {
        relative4 = relative4.substring(2);
      }
      if (relative4 && relative4 !== "." && !relative4.startsWith("..")) {
        return relative4;
      }
    }
    return ".";
  }
  /**
  * Extract meaningful module name from directory path
  */
  extractModuleName(dirPath, files) {
    if (!dirPath) {
      return "module";
    }
    const basename6 = path10.basename(dirPath);
    if (basename6.includes("tmp") || basename6.includes("test-") || basename6.startsWith(".")) {
      if (files.length > 0) {
        const firstFile = files[0].path;
        const parts = firstFile.split(path10.sep).filter((p) => p && p !== ".");
        for (let i = parts.length - 2; i >= 0; i--) {
          const part = parts[i];
          if (!part.includes("tmp") && !part.includes("test-") && !part.startsWith(".") && part.length > 2) {
            return part;
          }
        }
      }
      return "module";
    }
    return basename6;
  }
  /**
  * Detect if file is a code file (has known code extension)
  */
  isCodeFile(filePath) {
    const basename6 = path10.basename(filePath);
    const ext = path10.extname(filePath).toLowerCase();
    const knownCodeFiles = [
      "Dockerfile",
      "Makefile",
      "README.md",
      ".gitignore"
    ];
    if (knownCodeFiles.some((known) => basename6 === known || basename6.endsWith(known))) {
      return true;
    }
    if (ext && !this.isKnownCodeExtension(ext)) {
      return false;
    }
    return true;
  }
  /**
  * Check if extension is a known code file extension
  */
  isKnownCodeExtension(ext) {
    const codeExtensions = [
      ".ts",
      ".js",
      ".tsx",
      ".jsx",
      ".py",
      ".java",
      ".c",
      ".cpp",
      ".h",
      ".hpp",
      ".go",
      ".rs",
      ".rb",
      ".php",
      ".cs",
      ".swift",
      ".kt",
      ".scala",
      ".html",
      ".css",
      ".scss",
      ".sass",
      ".less",
      ".json",
      ".xml",
      ".yaml",
      ".yml",
      ".md",
      ".config"
    ];
    return codeExtensions.includes(ext);
  }
  /**
  * Detect if file is a test file
  */
  isTestFile(filePath) {
    const basename6 = path10.basename(filePath);
    const dirname5 = path10.dirname(filePath);
    if (basename6.endsWith(".test.ts") || basename6.endsWith(".test.js")) {
      return true;
    }
    if (basename6.endsWith(".spec.ts") || basename6.endsWith(".spec.js")) {
      return true;
    }
    if (dirname5.includes("__tests__")) {
      return true;
    }
    return false;
  }
  /**
  * Detect if file is package.json or dependency-related
  */
  isDependencyFile(filePath) {
    const basename6 = path10.basename(filePath);
    return basename6 === "package.json" || basename6 === "package-lock.json" || basename6 === "pnpm-lock.yaml" || basename6 === "yarn.lock";
  }
  /**
  * Detect if file is configuration
  */
  isConfigFile(filePath) {
    const basename6 = path10.basename(filePath);
    if (basename6.includes(".config.")) {
      return true;
    }
    if (basename6.includes("rc")) {
      return true;
    }
    if (basename6.startsWith(".env")) {
      return true;
    }
    const configFiles = [
      "tsconfig.json",
      "jsconfig.json"
    ];
    return configFiles.includes(basename6);
  }
  /**
  * Count import changes via regex
  */
  async countImportChanges(files) {
    let importCount = 0;
    const importRegex = /import\s+.*from|require\(/g;
    for (const file of files) {
      try {
        const content = await promises.readFile(file.path, "utf-8");
        const matches = content.match(importRegex);
        if (matches) {
          importCount += matches.length;
        }
      } catch (error) {
        this.logger.debug("Failed to read file for import analysis", {
          path: file.path,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return importCount;
  }
  /**
  * Count function/class changes via regex
  */
  async countStructureChanges(files) {
    let structureCount = 0;
    const structureRegex = /function\s+\w+|class\s+\w+|const\s+\w+\s*=\s*\(/g;
    for (const file of files) {
      try {
        const content = await promises.readFile(file.path, "utf-8");
        const matches = content.match(structureRegex);
        if (matches) {
          structureCount += matches.length;
        }
      } catch (error) {
        this.logger.debug("Failed to read file for structure analysis", {
          path: file.path,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return structureCount;
  }
  /**
  * Truncate long file paths for display
  */
  truncatePath(filePath, maxLength) {
    if (filePath.length <= maxLength) {
      return filePath;
    }
    const ellipsis = "...";
    return filePath.substring(0, maxLength - ellipsis.length) + ellipsis;
  }
  /**
  * Sanitize filenames with special characters
  */
  sanitizeFilename(filename) {
    return filename.replace(/[@#$]+/g, " ").replace(/\s+/g, " ").trim();
  }
  /**
  * Format user-provided context into a snapshot name prefix
  */
  formatUserContext(context) {
    const presetMap = {
      "bug-fix": "fix",
      credentials: "chore",
      refactor: "refactor",
      testing: "test"
    };
    if (presetMap[context]) {
      return presetMap[context];
    }
    const cleaned = context.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").trim();
    const maxLength = 20;
    if (cleaned.length > maxLength) {
      return cleaned.substring(0, maxLength);
    }
    return cleaned || "update";
  }
};
function compress(content) {
  return gzipSync(Buffer.from(content, "utf-8"), {
    level: 9
  });
}
__name(compress, "compress");
__name2(compress, "compress");
function generateId() {
  const timestampPart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 7).toLowerCase();
  return `snapshot_${timestampPart}_${randomPart}`;
}
__name(generateId, "generateId");
__name2(generateId, "generateId");
var ConnectionPool = class ConnectionPool2 {
  static {
    __name(this, "ConnectionPool2");
  }
  static {
    __name2(this, "ConnectionPool");
  }
  dbPath;
  dbOptions;
  connections = [];
  availableConnections = [];
  maxConnections;
  constructor(dbPath, dbOptions, size = 4) {
    this.dbPath = dbPath;
    this.dbOptions = dbOptions;
    this.maxConnections = size;
  }
  // Get a connection from the pool
  async getConnection() {
    if (this.availableConnections.length > 0) {
      const connection = this.availableConnections.pop();
      if (connection) {
        return connection;
      }
    }
    if (this.connections.length < this.maxConnections) {
      const db2 = await createDatabaseInstance(this.dbPath, this.dbOptions);
      db2.pragma("journal_mode = WAL");
      this.connections.push(db2);
      return db2;
    }
    const db = this.connections.shift();
    if (db) {
      this.connections.push(db);
      return db;
    }
    return await createDatabaseInstance(this.dbPath, this.dbOptions);
  }
  // Return a connection to the pool
  releaseConnection(_db) {
  }
  // Close all connections in the pool
  close() {
    for (const db of this.connections) {
      try {
        db.close();
      } catch (_error) {
      }
    }
    this.connections = [];
    this.availableConnections = [];
  }
};
var cachedDatabaseConstructor = null;
var cachedDatabaseError = null;
var tryLoadBetterSqlite3 = /* @__PURE__ */ __name2(async () => {
  if (cachedDatabaseConstructor) {
    return cachedDatabaseConstructor;
  }
  if (cachedDatabaseError) {
    return null;
  }
  try {
    const requiredModule = await import('better-sqlite3');
    const ctor = requiredModule.default;
    try {
      const probe = new ctor(":memory:");
      probe.close();
    } catch (instantiationError) {
      cachedDatabaseError = instantiationError instanceof Error ? instantiationError : new Error(String(instantiationError));
      return null;
    }
    cachedDatabaseConstructor = ctor;
    return cachedDatabaseConstructor;
  } catch (error) {
    cachedDatabaseError = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error loading better-sqlite3");
    return null;
  }
}, "tryLoadBetterSqlite3");
var isBetterSqlite3Available = /* @__PURE__ */ __name2(async () => await tryLoadBetterSqlite3() !== null, "isBetterSqlite3Available");
var getBetterSqlite3LoadError = /* @__PURE__ */ __name2(() => cachedDatabaseError, "getBetterSqlite3LoadError");
var requireDatabaseConstructor = /* @__PURE__ */ __name2(async () => {
  const betterSqlite3 = await tryLoadBetterSqlite3();
  if (betterSqlite3) {
    return betterSqlite3;
  }
  const errorMessage = cachedDatabaseError ? `better-sqlite3: ${cachedDatabaseError.message}` : "better-sqlite3: not installed or not compatible";
  const detailedMessage = `No SQLite implementation available. ${errorMessage}`;
  const error = new StorageConnectionError(detailedMessage);
  error.details = {
    betterSqlite3Error: cachedDatabaseError?.message
  };
  throw error;
}, "requireDatabaseConstructor");
var createDatabaseInstance = /* @__PURE__ */ __name2(async (pathToDatabase, options) => {
  const DatabaseCtor = await requireDatabaseConstructor();
  return new DatabaseCtor(pathToDatabase, options);
}, "createDatabaseInstance");
var StorageBroker = class {
  static {
    __name(this, "StorageBroker");
  }
  static {
    __name2(this, "StorageBroker");
  }
  dbPath;
  db = null;
  readConnectionPool = null;
  initialized = false;
  operationQueue = [];
  isProcessingQueue = false;
  writerId;
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.writerId = `writer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
  * Initialize the storage broker and database connection
  */
  async initialize() {
    if (this.initialized) {
      return;
    }
    try {
      this.db = await createDatabaseInstance(this.dbPath);
      if (this.db && typeof this.db.pragma === "function") {
        this.db.pragma("journal_mode = WAL");
      }
      this.readConnectionPool = new ConnectionPool(this.dbPath, void 0, 4);
      this.runMigrations();
      this.initialized = true;
    } catch (error) {
      if (error instanceof StorageConnectionError) {
        throw error;
      }
      if (error instanceof Error) {
        const message = error.message;
        let specificError = "Failed to initialize storage broker";
        if (message.includes("sqlite")) {
          specificError = `Database initialization failed: ${message}`;
        }
        throw new StorageError2(specificError, "STORAGE_BROKER_INIT_ERROR", {
          cause: error
        });
      }
      throw new StorageError2("Failed to initialize storage broker", "STORAGE_BROKER_INIT_ERROR", {
        cause: error
      });
    }
  }
  /**
  * Get the database instance
  * @returns The database instance, or null if not initialized
  * @public This is intentionally public to allow direct database access for advanced operations
  */
  getDatabase() {
    return this.db;
  }
  /**
  * Run database migrations to ensure schema is up to date
  */
  runMigrations() {
    if (!this.db) {
      throw new StorageError2("Database not initialized", "STORAGE_NOT_INITIALIZED");
    }
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        parent_id TEXT,
        metadata TEXT,
        FOREIGN KEY (parent_id) REFERENCES snapshots(id)
      );

      CREATE TABLE IF NOT EXISTS file_changes (
        snapshot_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        action TEXT CHECK(action IN ('add','modify','delete')),
        diff BLOB,
        storage_type TEXT DEFAULT 'diff',
        content_size INTEGER,
        PRIMARY KEY (snapshot_id, file_path),
        FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
      );

      -- Add sessions table for session-aware snapshots
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        started_at INTEGER NOT NULL,
        ended_at INTEGER NOT NULL,
        reason TEXT NOT NULL,
        summary TEXT,
        tags TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS session_files (
        session_id TEXT NOT NULL,
        snapshot_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        added_count INTEGER DEFAULT 0,
        deleted_count INTEGER DEFAULT 0,
        PRIMARY KEY (session_id, file_path),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
      );

      -- Add queue persistence table for operation queuing
      CREATE TABLE IF NOT EXISTS queued_operations (
        id TEXT PRIMARY KEY,
        operation_name TEXT NOT NULL,
        priority INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        data BLOB,
        status TEXT CHECK(status IN ('pending','processing','completed','failed')) DEFAULT 'pending'
      );

      -- Single-column indexes
      CREATE INDEX IF NOT EXISTS idx_snapshot_timestamp ON snapshots(timestamp);
      CREATE INDEX IF NOT EXISTS idx_snapshot_parent ON snapshots(parent_id);
      CREATE INDEX IF NOT EXISTS idx_file_path ON file_changes(file_path);
      CREATE INDEX IF NOT EXISTS idx_session_started_at ON sessions(started_at);
      CREATE INDEX IF NOT EXISTS idx_session_ended_at ON sessions(ended_at);
      CREATE INDEX IF NOT EXISTS idx_session_reason ON sessions(reason);
      CREATE INDEX IF NOT EXISTS idx_queued_operations_priority ON queued_operations(priority);
      CREATE INDEX IF NOT EXISTS idx_queued_operations_status ON queued_operations(status);
      CREATE INDEX IF NOT EXISTS idx_queued_operations_created_at ON queued_operations(created_at);

      -- Covering indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_snapshots_list
        ON snapshots(timestamp DESC, id, name);

      CREATE INDEX IF NOT EXISTS idx_file_changes_snapshot
        ON file_changes(snapshot_id, file_path, action);

      CREATE INDEX IF NOT EXISTS idx_file_changes_file_covering
        ON file_changes(file_path, snapshot_id)
        WHERE action != 'delete';

      -- Covering indexes for session queries
      CREATE INDEX IF NOT EXISTS idx_sessions_list
        ON sessions(ended_at DESC, id, reason);

      CREATE INDEX IF NOT EXISTS idx_session_files_session
        ON session_files(session_id, file_path);

      -- Covering index for queued operations
      CREATE INDEX IF NOT EXISTS idx_queued_operations_list
        ON queued_operations(priority ASC, created_at ASC, id, status)
        WHERE status = 'pending';

      -- Add writers_lock table for single-writer discipline across processes
      CREATE TABLE IF NOT EXISTS writers_lock (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        writer_id TEXT,
        acquired_at INTEGER,
        expires_at INTEGER
      );

      -- Initialize the lock row if it doesn't exist
      INSERT OR IGNORE INTO writers_lock (id, writer_id, acquired_at, expires_at)
      VALUES (1, NULL, 0, 0);
    `);
  }
  /**
  * Close the storage broker and database connection
  */
  async close() {
    try {
      await this.processQueue();
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      if (this.readConnectionPool) {
        this.readConnectionPool.close();
        this.readConnectionPool = null;
      }
      this.initialized = false;
    } catch (error) {
      throw new StorageError2("Failed to close storage broker", "STORAGE_BROKER_CLOSE_ERROR", {
        cause: error
      });
    }
  }
  /**
  * Get a read connection from the pool for concurrent read operations
  */
  async getReadConnection() {
    if (!this.readConnectionPool) {
      throw new StorageError2("Read connection pool not initialized", "STORAGE_NOT_INITIALIZED");
    }
    return await this.readConnectionPool.getConnection();
  }
  /**
  * Check if better-sqlite3 is available
  */
  static async isAvailable() {
    return await isBetterSqlite3Available();
  }
  /**
  * Get the error that occurred when loading better-sqlite3, if any
  */
  static getLoadError() {
    return getBetterSqlite3LoadError();
  }
  /**
  * Attempt to acquire a distributed lock for writing
  * @param writerId Unique identifier for this writer process
  * @param timeoutMs Maximum time to wait for the lock in milliseconds
  * @returns True if lock was acquired, false otherwise
  */
  async acquireLock(writerId, timeoutMs = 5e3) {
    if (!this.db) {
      throw new StorageError2("Database not initialized", "STORAGE_NOT_INITIALIZED");
    }
    const startTime = Date.now();
    const maxWaitTime = timeoutMs;
    let waitTime = 10;
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const result = this.db.prepare(`
					UPDATE writers_lock
					SET writer_id = ?, acquired_at = ?, expires_at = ?
					WHERE (writer_id IS NULL OR expires_at < ?) AND id = 1
				`).run(writerId, Date.now(), Date.now() + 3e4, Date.now());
        if (result.changes === 1) {
          return true;
        }
        await new Promise((resolve2) => setTimeout(resolve2, Math.min(waitTime, maxWaitTime - (Date.now() - startTime))));
        waitTime = Math.min(waitTime * 2, 1e3);
      } catch (error) {
        console.warn("Failed to acquire lock:", error);
        await new Promise((resolve2) => setTimeout(resolve2, Math.min(waitTime, maxWaitTime - (Date.now() - startTime))));
        waitTime = Math.min(waitTime * 2, 1e3);
      }
    }
    return false;
  }
  /**
  * Release the distributed lock
  * @param writerId Unique identifier for this writer process
  */
  async releaseLock(writerId) {
    if (!this.db) {
      throw new StorageError2("Database not initialized", "STORAGE_NOT_INITIALIZED");
    }
    try {
      this.db.prepare(`
				UPDATE writers_lock
				SET writer_id = NULL, acquired_at = 0, expires_at = 0
				WHERE writer_id = ? AND id = 1
			`).run(writerId);
    } catch (error) {
      console.warn("Failed to release lock:", error);
    }
  }
  /**
  * Create a snapshot through the queued operation system to ensure single-writer discipline
  * @param name The snapshot name
  * @param files Map of file paths to content
  * @param metadata Optional metadata
  * @param parentId Optional parent snapshot ID
  * @param id Optional snapshot ID (if not provided, one will be generated)
  * @returns Snapshot information
  */
  async createSnapshot(name, files, metadata, parentId, id) {
    return this.queueOperation("createSnapshot", async () => {
      if (!this.db) {
        throw new StorageError2("Database not initialized", "STORAGE_NOT_INITIALIZED");
      }
      const snapshotId = id || generateId();
      const timestamp = Date.now();
      const preCompressedFiles = /* @__PURE__ */ new Map();
      Array.from(files.entries()).forEach(([filePath, content]) => {
        const contentSize = Buffer.byteLength(content, "utf-8");
        const compressed = compress(content);
        preCompressedFiles.set(filePath, {
          compressed,
          storageType: "full",
          contentSize
        });
      });
      try {
        const insert = this.db.transaction(() => {
          try {
            if (this.db) {
              this.db.prepare(`
					INSERT INTO snapshots (id, name, timestamp, parent_id, metadata)
					VALUES (?, ?, ?, ?, ?)
				`).run(snapshotId, name, timestamp, parentId || null, JSON.stringify({
                fileCount: files.size,
                createdBy: "snapback",
                ...metadata
              }));
              if (this.db) {
                const stmt = this.db.prepare(`
					INSERT INTO file_changes (snapshot_id, file_path, action, diff, storage_type, content_size)
					VALUES (?, ?, ?, ?, ?, ?)
				`);
                preCompressedFiles.forEach((preCompressed, filePath) => {
                  const { compressed, storageType, contentSize } = preCompressed;
                  const action = "add";
                  stmt.run(snapshotId, filePath, action, compressed, storageType, contentSize);
                });
              }
            }
          } catch (queryError) {
            const message = queryError instanceof Error ? queryError.message : String(queryError);
            throw new StorageError2(`Failed to create snapshot: ${message}`, "STORAGE_QUERY_ERROR", {
              cause: queryError
            });
          }
        });
        insert();
        return {
          id: snapshotId,
          name,
          fileCount: files.size,
          timestamp
        };
      } catch (error) {
        if (error instanceof StorageError2 || error instanceof StorageTransactionError) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new StorageError2(`Failed to create snapshot: ${message}`, "STORAGE_CREATE_SNAPSHOT_ERROR", {
          cause: error
        });
      }
    });
  }
  /**
  * Queue an operation for execution
  * @param operationName Name of the operation for logging
  * @param operation Function to execute
  * @param priority Priority of the operation (lower number = higher priority)
  * @returns Promise that resolves when the operation completes
  */
  async queueOperation(operationName, operation, priority = 0) {
    if (!this.db) {
      throw new StorageError2("Database not initialized", "STORAGE_NOT_INITIALIZED");
    }
    return new Promise((resolve2, reject) => {
      const id = generateId();
      const timestamp = Date.now();
      const queuedOp = {
        id,
        operationName,
        priority,
        operation,
        resolve: resolve2,
        reject,
        timestamp
      };
      try {
        if (this.db) {
          const stmt = this.db.prepare(`
            INSERT INTO queued_operations (id, operation_name, priority, created_at, status)
            VALUES (?, ?, ?, ?, ?)
          `);
          stmt.run(id, operationName, priority, timestamp, "pending");
        }
        this.operationQueue.push(queuedOp);
        this.operationQueue.sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.timestamp - b.timestamp;
        });
        if (!this.isProcessingQueue) {
          this.processQueue();
        }
      } catch (error) {
        reject(error);
      }
    });
  }
  /**
  * Process the operation queue with single-writer discipline
  */
  async processQueue() {
    if (this.isProcessingQueue) {
      return;
    }
    this.isProcessingQueue = true;
    try {
      if (this.operationQueue.length > 0) {
        const lockAcquired = await this.acquireLock(this.writerId, 1e4);
        if (!lockAcquired) {
          setTimeout(() => {
            this.isProcessingQueue = false;
            if (this.operationQueue.length > 0) {
              this.processQueue();
            }
          }, 100);
          return;
        }
        try {
          this.operationQueue.sort((a, b) => {
            if (a.priority !== b.priority) {
              return a.priority - b.priority;
            }
            return a.timestamp - b.timestamp;
          });
          if (this.operationQueue.length > 0) {
            const queuedOp = this.operationQueue.shift();
            if (queuedOp) {
              try {
                const result = await queuedOp.operation();
                queuedOp.resolve(result);
              } catch (error) {
                queuedOp.reject(error);
              }
            }
          }
        } finally {
          await this.releaseLock(this.writerId);
        }
        await new Promise((resolve2) => setTimeout(resolve2, 1));
      }
    } catch (error) {
      console.error("Error processing queue:", error);
    } finally {
      this.isProcessingQueue = false;
      if (this.operationQueue.length > 0) {
        setTimeout(() => {
          this.processQueue();
        }, 1);
      }
    }
  }
  /**
  * Get a snapshot by ID
  * @param id The snapshot ID
  * @returns Snapshot information or null if not found
  */
  async getSnapshot(id) {
    if (!this.db) {
      throw new StorageError2("Database not initialized", "STORAGE_NOT_INITIALIZED");
    }
    const db = await this.getReadConnection();
    try {
      const row = db.prepare(`
				SELECT id, name, timestamp, metadata
				FROM snapshots
				WHERE id = ?
			`).get(id);
      if (!row) {
        return null;
      }
      const fileRows = db.prepare(`
				SELECT file_path, diff, storage_type
				FROM file_changes
				WHERE snapshot_id = ?
			`).all(id);
      const files = /* @__PURE__ */ new Map();
      for (const fileRow of fileRows) {
        try {
          const typedFileRow = fileRow;
          const decompressed = gunzipSync(typedFileRow.diff);
          const content = decompressed.toString("utf-8");
          files.set(typedFileRow.file_path, content);
        } catch (error) {
          const typedFileRow = fileRow;
          console.warn(`Failed to decompress file ${typedFileRow.file_path}:`, error);
        }
      }
      return {
        id: row.id,
        name: row.name,
        files,
        timestamp: row.timestamp,
        metadata: row.metadata
      };
    } catch (error) {
      throw new StorageError2(`Failed to get snapshot: ${error instanceof Error ? error.message : String(error)}`, "STORAGE_GET_SNAPSHOT_ERROR", {
        cause: error
      });
    }
  }
  /**
  * List snapshots with optional filters
  * @param limit Maximum number of snapshots to return
  * @param offset Offset for pagination
  * @param sortBy Field to sort by
  * @param sortOrder Sort order (ASC or DESC)
  * @returns List of snapshots
  */
  async listSnapshots(limit = 50, offset = 0, sortBy = "timestamp", sortOrder = "DESC") {
    if (!this.db) {
      throw new StorageError2("Database not initialized", "STORAGE_NOT_INITIALIZED");
    }
    const db = await this.getReadConnection();
    let validatedSortBy = sortBy;
    let validatedSortOrder = sortOrder;
    try {
      const validSortColumns = [
        "timestamp",
        "name",
        "id"
      ];
      if (!validSortColumns.includes(validatedSortBy)) {
        validatedSortBy = "timestamp";
      }
      if (validatedSortOrder !== "ASC" && validatedSortOrder !== "DESC") {
        validatedSortOrder = "DESC";
      }
      const rows = db.prepare(`
				SELECT id, name, timestamp, metadata
				FROM snapshots
				ORDER BY ${validatedSortBy} ${validatedSortOrder}
				LIMIT ? OFFSET ?
			`).all(limit, offset);
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        timestamp: row.timestamp,
        metadata: row.metadata
      }));
    } catch (error) {
      throw new StorageError2(`Failed to list snapshots: ${error instanceof Error ? error.message : String(error)}`, "STORAGE_LIST_SNAPSHOTS_ERROR", {
        cause: error
      });
    }
  }
  /**
  * Delete a snapshot by ID
  * @param id The snapshot ID
  */
  async deleteSnapshot(id) {
    return this.queueOperation(`deleteSnapshot-${id}`, async () => {
      if (!this.db) {
        throw new StorageError2("Database not initialized", "STORAGE_NOT_INITIALIZED");
      }
      try {
        this.db.prepare(`
					DELETE FROM snapshots
					WHERE id = ?
				`).run(id);
      } catch (error) {
        throw new StorageError2(`Failed to delete snapshot: ${error instanceof Error ? error.message : String(error)}`, "STORAGE_DELETE_SNAPSHOT_ERROR", {
          cause: error
        });
      }
    });
  }
};
var StorageBrokerAdapter = class {
  static {
    __name(this, "StorageBrokerAdapter");
  }
  static {
    __name2(this, "StorageBrokerAdapter");
  }
  broker;
  constructor(dbPath) {
    this.broker = new StorageBroker(dbPath);
  }
  async initialize() {
    await this.broker.initialize();
  }
  async save(snapshot, contentHash) {
    const filesMap = /* @__PURE__ */ new Map();
    if (snapshot.fileContents) {
      for (const [filePath, content] of Object.entries(snapshot.fileContents)) {
        filesMap.set(filePath, content);
      }
    }
    const name = snapshot.meta?.name || snapshot.meta?.trigger || "snapshot";
    const metadata = {
      ...snapshot.meta,
      contentHash
    };
    await this.broker.createSnapshot(name, filesMap, metadata, void 0, snapshot.id);
  }
  async get(id) {
    try {
      const result = await this.broker.getSnapshot(id);
      if (!result) {
        return null;
      }
      let metadata = {};
      try {
        metadata = JSON.parse(result.metadata);
      } catch (_error) {
      }
      const fileContents = {};
      for (const [filePath, content] of result.files) {
        fileContents[filePath] = content;
      }
      return {
        id: result.id,
        timestamp: result.timestamp,
        version: "1.0",
        meta: metadata,
        files: Array.from(result.files.keys()),
        fileContents
      };
    } catch (error) {
      console.error(`Error retrieving snapshot ${id}:`, error);
      return null;
    }
  }
  async list(filters) {
    try {
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      const snapshots = await this.broker.listSnapshots(limit, offset, "timestamp", "DESC");
      const result = [];
      for (const snapshot of snapshots) {
        let metadata = {};
        try {
          metadata = JSON.parse(snapshot.metadata);
        } catch (_error) {
        }
        result.push({
          id: snapshot.id,
          timestamp: snapshot.timestamp,
          version: "1.0",
          meta: metadata,
          files: [],
          fileContents: {}
        });
      }
      return result;
    } catch (error) {
      console.error("Error listing snapshots:", error);
      return [];
    }
  }
  async delete(id) {
    try {
      await this.broker.deleteSnapshot(id);
    } catch (error) {
      console.error(`Error deleting snapshot ${id}:`, error);
    }
  }
  async close() {
    try {
      await this.broker.close();
    } catch (error) {
      console.error("Error closing storage:", error);
    }
  }
};
var ID_PREFIX = {
  SESSION: "sess",
  SNAPSHOT: "snap",
  AUDIT: "audit",
  CHECKPOINT: "cp"
};
function randomSuffix(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
__name(randomSuffix, "randomSuffix");
__name2(randomSuffix, "randomSuffix");
function generateSessionId() {
  return `${ID_PREFIX.SESSION}-${Date.now()}-${randomSuffix()}`;
}
__name(generateSessionId, "generateSessionId");
__name2(generateSessionId, "generateSessionId");
function generateSnapshotId(description) {
  return generateSnapshotId$1(description);
}
__name(generateSnapshotId, "generateSnapshotId");
__name2(generateSnapshotId, "generateSnapshotId");
function generateId2(prefix) {
  return generateId$1(prefix);
}
__name(generateId2, "generateId2");
__name2(generateId2, "generateId");
function generateAuditId() {
  return `${ID_PREFIX.AUDIT}-${Date.now()}-${randomSuffix()}`;
}
__name(generateAuditId, "generateAuditId");
__name2(generateAuditId, "generateAuditId");
function generateCheckpointId() {
  return `${ID_PREFIX.CHECKPOINT}-${Date.now()}-${randomSuffix()}`;
}
__name(generateCheckpointId, "generateCheckpointId");
__name2(generateCheckpointId, "generateCheckpointId");
function randomId(length = 6) {
  return randomSuffix(length);
}
__name(randomId, "randomId");
__name2(randomId, "randomId");
function parseIdTimestamp(id) {
  if (!id.match(/^(?:sess|snap|snapshot|audit|cp)-/)) {
    return null;
  }
  const match2 = id.match(/-(\d{13})-[a-zA-Z0-9_-]+$/);
  if (!match2) {
    return null;
  }
  const timestamp = Number.parseInt(match2[1], 10);
  return Number.isNaN(timestamp) ? null : timestamp;
}
__name(parseIdTimestamp, "parseIdTimestamp");
__name2(parseIdTimestamp, "parseIdTimestamp");
function parseIdPrefix(id) {
  if (id.startsWith("snapshot-")) {
    return "snap";
  }
  const match2 = id.match(/^(sess|snap|audit|cp)-/);
  return match2 ? match2[1] : null;
}
__name(parseIdPrefix, "parseIdPrefix");
__name2(parseIdPrefix, "parseIdPrefix");
function isValidId(id, expectedPrefix) {
  const isSnapshotId = id.startsWith("snap-") || id.startsWith("snapshot-");
  if (expectedPrefix === "snap" || !expectedPrefix && isSnapshotId) {
    return /^(?:snap|snapshot)-(?:[a-z0-9]+-)?(\d{13})-[a-zA-Z0-9_-]{9}$/.test(id);
  }
  if (expectedPrefix) {
    const regex = new RegExp(`^${expectedPrefix}-\\d{13}-[a-z0-9]{6}$`);
    return regex.test(id);
  }
  return /^(?:sess|audit|cp)-\d{13}-[a-z0-9]{6}$/.test(id);
}
__name(isValidId, "isValidId");
__name2(isValidId, "isValidId");
function normalize(path11) {
  let normalized = path11.replace(/\\/g, "/");
  normalized = normalized.replace(/\/+/g, "/");
  normalized = normalized.replace(/\/+$/, "");
  return normalized === "" && path11.startsWith("/") ? "/" : normalized;
}
__name(normalize, "normalize");
__name2(normalize, "normalize");
function isWithin(childPath, parentPath) {
  const normalizedChild = normalize(childPath);
  const normalizedParent = normalize(parentPath);
  return normalizedChild.startsWith(`${normalizedParent}/`) || normalizedChild === normalizedParent;
}
__name(isWithin, "isWithin");
__name2(isWithin, "isWithin");
function getDepth(path11) {
  const normalized = normalize(path11);
  if (normalized === "/") {
    return 1;
  }
  const segments = normalized.split("/").filter((segment) => segment.length > 0);
  const isUnixPath = path11.startsWith("/");
  return isUnixPath ? segments.length + 1 : segments.length;
}
__name(getDepth, "getDepth");
__name2(getDepth, "getDepth");
function areEqual(path1, path22) {
  const norm1 = normalize(path1);
  const norm2 = normalize(path22);
  const isWindows = /^[a-zA-Z]:/.test(norm1) || /^[a-zA-Z]:/.test(norm2);
  if (isWindows) {
    return norm1.toLowerCase() === norm2.toLowerCase();
  }
  return norm1 === norm2;
}
__name(areEqual, "areEqual");
__name2(areEqual, "areEqual");

// ../../packages/sdk/dist/index.js
var __defProp2 = Object.defineProperty;
var __name3 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", {
  value,
  configurable: true
}), "__name");
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: /* @__PURE__ */ __name((a, b) => (typeof __require !== "undefined" ? __require : a)[b], "get")
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var RISK_FACTOR_DESCRIPTIONS = {
  "eval execution": "Dynamic code execution detected - eval() allows runtime code execution",
  "sql injection": "SQL injection vulnerability pattern - concatenated user input in queries",
  "command execution": "Dangerous shell command usage - potential OS command injection",
  "hardcoded secret": "Potential secret/credential found in code - API keys, tokens exposed",
  "auth bypass": "Authentication bypass pattern - insufficient access control checks",
  "path traversal": "Directory traversal vulnerability - unrestricted path access",
  "xss pattern": "Cross-site scripting vulnerability - unsanitized user input in DOM",
  deserialization: "Unsafe deserialization detected - potential object injection",
  cryptography: "Weak cryptography usage - deprecated algorithms or insufficient key length",
  "dependency change": "Dependency version change - verify no breaking changes or vulnerabilities"
};
function describeRiskFactors(factors) {
  return factors.map((factor) => RISK_FACTOR_DESCRIPTIONS[factor.toLowerCase()] || factor);
}
__name(describeRiskFactors, "describeRiskFactors");
__name3(describeRiskFactors, "describeRiskFactors");
function describeRiskFactor(factor) {
  return RISK_FACTOR_DESCRIPTIONS[factor.toLowerCase()] || factor;
}
__name(describeRiskFactor, "describeRiskFactor");
__name3(describeRiskFactor, "describeRiskFactor");
function isKnownRiskFactor(factor) {
  return factor.toLowerCase() in RISK_FACTOR_DESCRIPTIONS;
}
__name(isKnownRiskFactor, "isKnownRiskFactor");
__name3(isKnownRiskFactor, "isKnownRiskFactor");
function getStandardRiskFactors() {
  return Object.keys(RISK_FACTOR_DESCRIPTIONS);
}
__name(getStandardRiskFactors, "getStandardRiskFactors");
__name3(getStandardRiskFactors, "getStandardRiskFactors");
function createDashboardMetricsClient(orpcClient) {
  return {
    async getDashboardMetrics() {
      return orpcClient.dashboard.getMetrics();
    }
  };
}
__name(createDashboardMetricsClient, "createDashboardMetricsClient");
__name3(createDashboardMetricsClient, "createDashboardMetricsClient");
var DefaultRiskAnalyzer = class {
  static {
    __name(this, "DefaultRiskAnalyzer");
  }
  static {
    __name3(this, "DefaultRiskAnalyzer");
  }
  analyze(context) {
    let riskScore = 0;
    if (context.aiContext?.detected) {
      riskScore += 3;
      if (context.aiContext.burstPattern) {
        riskScore += 2;
      }
    }
    if (context.changeMetrics) {
      const totalLines = context.changeMetrics.linesAdded + context.changeMetrics.linesDeleted;
      if (totalLines > 100) {
        riskScore += 2;
      } else if (totalLines > 50) {
        riskScore += 1;
      }
      if (context.changeMetrics.affectedFunctions && context.changeMetrics.affectedFunctions > 3) {
        riskScore += 1.5;
      }
    }
    return Math.min(riskScore, 10);
  }
};
var ProtectionDecisionEngine = class {
  static {
    __name(this, "ProtectionDecisionEngine");
  }
  static {
    __name3(this, "ProtectionDecisionEngine");
  }
  protectionManager;
  riskAnalyzer;
  constructor(protectionManager, riskAnalyzer = new DefaultRiskAnalyzer()) {
    this.protectionManager = protectionManager;
    this.riskAnalyzer = riskAnalyzer;
  }
  /**
  * Evaluate protection decision for a file operation.
  *
  * This is THE decision point. Consumers should:
  * 1. Call this method to get the decision
  * 2. Execute the decision (create snapshot if shouldSnapshot)
  * 3. Proceed or block based on shouldProceed
  *
  * @param context - The evaluation context
  * @returns Protection decision with shouldSnapshot, shouldProceed, and reason
  */
  evaluate(context) {
    const protectionLevel = this.protectionManager.getLevel(context.filePath);
    const riskScore = this.riskAnalyzer.analyze(context);
    if (context.inCooldown) {
      return {
        shouldSnapshot: false,
        shouldProceed: true,
        reason: "cooldown_bypass",
        riskScore,
        recommendations: [],
        protectionLevel
      };
    }
    if (context.hasTemporaryAllowance) {
      return {
        shouldSnapshot: true,
        shouldProceed: true,
        reason: "temporary_allowance",
        riskScore,
        recommendations: [],
        protectionLevel
      };
    }
    const shouldSnapshot = this.determineShouldSnapshot(protectionLevel, riskScore, context);
    const shouldProceed = this.determineShouldProceed(protectionLevel, riskScore);
    return {
      shouldSnapshot,
      shouldProceed,
      reason: this.buildReason(protectionLevel, riskScore, context),
      riskScore,
      recommendations: this.buildRecommendations(protectionLevel, riskScore),
      protectionLevel
    };
  }
  /**
  * Determine if a snapshot should be created.
  * ALL snapshot decision logic lives HERE.
  */
  determineShouldSnapshot(level, riskScore, context) {
    if (!level) {
      return false;
    }
    if (context.trigger === "ai-detected") {
      return true;
    }
    if (level === "block") {
      return true;
    }
    if (riskScore >= THRESHOLDS.risk.highThreshold) {
      return true;
    }
    if (level === "warn") {
      return riskScore >= THRESHOLDS.risk.highThreshold * 0.6;
    }
    if (level === "watch") {
      return true;
    }
    return false;
  }
  /**
  * Determine if the save operation should proceed.
  */
  determineShouldProceed(level, riskScore) {
    if (!level) {
      return true;
    }
    if (level === "block" && riskScore >= THRESHOLDS.risk.criticalThreshold) {
      return false;
    }
    return true;
  }
  /**
  * Build a human-readable reason for the decision.
  */
  buildReason(level, riskScore, context) {
    if (!level) {
      return "unprotected_file";
    }
    if (context.trigger === "ai-detected") {
      return "ai_detected_changes";
    }
    if (riskScore >= THRESHOLDS.risk.criticalThreshold) {
      return "critical_risk_level";
    }
    if (riskScore >= THRESHOLDS.risk.highThreshold) {
      return "high_risk_level";
    }
    switch (level) {
      case "block":
        return "block_mode_protection";
      case "warn":
        return "warn_mode_protection";
      case "watch":
        return "watch_mode_protection";
      default:
        return "standard_protection";
    }
  }
  /**
  * Build recommendations based on protection level and risk.
  */
  buildRecommendations(level, riskScore) {
    const recommendations = [];
    if (riskScore >= THRESHOLDS.risk.highThreshold) {
      recommendations.push("Review changes carefully before proceeding");
    }
    if (level === "block") {
      recommendations.push("This file requires explicit confirmation to save");
    }
    if (riskScore >= THRESHOLDS.risk.criticalThreshold) {
      recommendations.push("Consider breaking this change into smaller commits");
    }
    return recommendations;
  }
};
var DiffCalculator = class {
  static {
    __name(this, "DiffCalculator");
  }
  static {
    __name3(this, "DiffCalculator");
  }
  /**
  * Calculate diff between current file and snapshot content
  */
  calculateFileDiff(filePath, currentContent, snapshotContent) {
    let operation;
    if (currentContent === null && snapshotContent !== null) {
      operation = "create";
    } else if (currentContent !== null && snapshotContent === null) {
      operation = "delete";
    } else {
      operation = "modify";
    }
    const currentLines = currentContent ? currentContent.split("\n") : [];
    const snapshotLines = snapshotContent ? snapshotContent.split("\n") : [];
    const { added, removed, preview } = this.computeLineDiff(currentLines, snapshotLines);
    const currentChecksum = currentContent ? this.calculateChecksum(currentContent) : void 0;
    const snapshotChecksum = snapshotContent ? this.calculateChecksum(snapshotContent) : void 0;
    return {
      path: filePath,
      operation,
      linesAdded: added,
      linesRemoved: removed,
      preview,
      currentChecksum,
      snapshotChecksum
    };
  }
  /**
  * Compute line-by-line diff with preview
  * Uses simple LCS algorithm for readable diffs
  */
  computeLineDiff(currentLines, snapshotLines) {
    const lcs = this.longestCommonSubsequence(currentLines, snapshotLines);
    const previewLines = [];
    let added = 0;
    let removed = 0;
    let i = 0;
    let j = 0;
    let previewLineCount = 0;
    const maxPreviewLines = 20;
    for (let k = 0; k < lcs.length && previewLineCount < maxPreviewLines; k++) {
      while (i < currentLines.length && currentLines[i] !== lcs[k]) {
        previewLines.push(`- ${currentLines[i]}`);
        removed++;
        i++;
        previewLineCount++;
        if (previewLineCount >= maxPreviewLines) break;
      }
      while (j < snapshotLines.length && snapshotLines[j] !== lcs[k] && previewLineCount < maxPreviewLines) {
        previewLines.push(`+ ${snapshotLines[j]}`);
        added++;
        j++;
        previewLineCount++;
        if (previewLineCount >= maxPreviewLines) break;
      }
      if (previewLineCount < maxPreviewLines) {
        previewLines.push(`  ${lcs[k]}`);
        previewLineCount++;
      }
      i++;
      j++;
    }
    while (i < currentLines.length && previewLineCount < maxPreviewLines) {
      previewLines.push(`- ${currentLines[i]}`);
      removed++;
      i++;
      previewLineCount++;
    }
    while (j < snapshotLines.length && previewLineCount < maxPreviewLines) {
      previewLines.push(`+ ${snapshotLines[j]}`);
      added++;
      j++;
      previewLineCount++;
    }
    added += snapshotLines.length - j;
    removed += currentLines.length - i;
    if (previewLineCount >= maxPreviewLines && (i < currentLines.length || j < snapshotLines.length)) {
      previewLines.push("... (preview truncated)");
    }
    return {
      added,
      removed,
      preview: previewLines.join("\n")
    };
  }
  /**
  * Longest Common Subsequence for diff calculation
  */
  longestCommonSubsequence(arr1, arr2) {
    const m = arr1.length;
    const n = arr2.length;
    const dp = Array.from({
      length: m + 1
    }, () => Array(n + 1).fill(0));
    for (let i2 = 1; i2 <= m; i2++) {
      for (let j2 = 1; j2 <= n; j2++) {
        if (arr1[i2 - 1] === arr2[j2 - 1]) {
          dp[i2][j2] = dp[i2 - 1][j2 - 1] + 1;
        } else {
          dp[i2][j2] = Math.max(dp[i2 - 1][j2], dp[i2][j2 - 1]);
        }
      }
    }
    const lcs = [];
    let i = m;
    let j = n;
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    return lcs;
  }
  /**
  * Calculate SHA-256 checksum for content
  */
  calculateChecksum(content) {
    const crypto3 = __require2("crypto");
    return crypto3.createHash("sha256").update(content).digest("hex");
  }
  /**
  * Generate full diff preview for multiple files
  */
  generateDiffPreview(diffs) {
    let filesCreated = 0;
    let filesModified = 0;
    let filesDeleted = 0;
    let totalLinesAdded = 0;
    let totalLinesRemoved = 0;
    for (const diff of diffs) {
      switch (diff.operation) {
        case "create":
          filesCreated++;
          break;
        case "modify":
          filesModified++;
          break;
        case "delete":
          filesDeleted++;
          break;
      }
      totalLinesAdded += diff.linesAdded;
      totalLinesRemoved += diff.linesRemoved;
    }
    return {
      totalFiles: diffs.length,
      filesCreated,
      filesModified,
      filesDeleted,
      totalLinesAdded,
      totalLinesRemoved,
      diffs
    };
  }
};
function isConsumptionAllowed(result) {
  return result.allowed === true;
}
__name(isConsumptionAllowed, "isConsumptionAllowed");
__name3(isConsumptionAllowed, "isConsumptionAllowed");
function isConsumptionDenied(result) {
  return result.allowed === false;
}
__name(isConsumptionDenied, "isConsumptionDenied");
__name3(isConsumptionDenied, "isConsumptionDenied");
var TokenBucket = class {
  static {
    __name(this, "TokenBucket");
  }
  static {
    __name3(this, "TokenBucket");
  }
  state;
  constructor(config) {
    if (config.capacity <= 0) {
      throw new Error("Capacity must be greater than 0");
    }
    if (config.refillRate <= 0) {
      throw new Error("Refill rate must be greater than 0");
    }
    this.state = {
      tokens: config.capacity,
      capacity: config.capacity,
      refillRate: config.refillRate,
      lastRefill: Date.now()
    };
  }
  /**
  * Attempt to consume tokens from the bucket
  *
  * @param amount - Number of tokens to consume
  * @returns Result indicating if consumption was allowed
  *
  * @throws If amount is not positive
  */
  tryConsume(amount) {
    if (amount <= 0) {
      throw new Error("Token amount must be greater than 0");
    }
    this.refill();
    if (this.state.tokens >= amount) {
      this.state.tokens -= amount;
      return {
        allowed: true,
        tokensRemaining: this.state.tokens,
        resetAt: this.calculateResetTime()
      };
    }
    return {
      allowed: false,
      tokensRemaining: this.state.tokens,
      resetAt: this.calculateResetTime()
    };
  }
  /**
  * Refill tokens based on time elapsed since last refill
  */
  refill() {
    const now = Date.now();
    const timePassed = (now - this.state.lastRefill) / 1e3;
    const tokensToAdd = timePassed * this.state.refillRate;
    this.state.tokens = Math.min(this.state.capacity, this.state.tokens + tokensToAdd);
    this.state.lastRefill = now;
  }
  /**
  * Get the current state of the bucket
  */
  getState() {
    this.refill();
    return {
      ...this.state
    };
  }
  /**
  * Reset bucket to full capacity
  */
  reset() {
    this.state.tokens = this.state.capacity;
    this.state.lastRefill = Date.now();
  }
  /**
  * Get consumption information
  */
  getConsumptionInfo() {
    this.refill();
    const consumed = this.state.capacity - this.state.tokens;
    const percentageUsed = consumed / this.state.capacity * 100;
    return {
      consumed,
      remaining: this.state.tokens,
      percentageUsed
    };
  }
  /**
  * Calculate when the bucket will be full again
  */
  calculateResetTime() {
    const tokensNeeded = this.state.capacity - this.state.tokens;
    const secondsToReset = tokensNeeded / this.state.refillRate;
    return new Date(Date.now() + secondsToReset * 1e3);
  }
};
function createTokenBucket(config) {
  return new TokenBucket(config);
}
__name(createTokenBucket, "createTokenBucket");
__name3(createTokenBucket, "createTokenBucket");
function isRateLimitAllowed(result) {
  return result.allowed === true;
}
__name(isRateLimitAllowed, "isRateLimitAllowed");
__name3(isRateLimitAllowed, "isRateLimitAllowed");
function isRateLimitDenied(result) {
  return result.allowed === false;
}
__name(isRateLimitDenied, "isRateLimitDenied");
__name3(isRateLimitDenied, "isRateLimitDenied");
var RateLimiter = class {
  static {
    __name(this, "RateLimiter");
  }
  static {
    __name3(this, "RateLimiter");
  }
  plans;
  buckets = /* @__PURE__ */ new Map();
  constructor(plans) {
    if (!plans || Object.keys(plans).length === 0) {
      throw new Error("At least one plan must be configured");
    }
    for (const [planName, config] of Object.entries(plans)) {
      if (config.capacity <= 0) {
        throw new Error(`Plan "${planName}" has invalid capacity: ${config.capacity}`);
      }
      if (config.refillRate <= 0) {
        throw new Error(`Plan "${planName}" has invalid refill rate: ${config.refillRate}`);
      }
    }
    this.plans = plans;
  }
  /**
  * Check rate limit for a user and plan tier
  *
  * @param userId - Unique user identifier
  * @param planName - Plan tier name (e.g., "free", "pro")
  * @returns Rate limit result (discriminated union)
  *
  * @throws If plan doesn't exist
  *
  * @example
  * ```typescript
  * const result = await limiter.checkLimit('user1', 'free');
  *
  * if (isRateLimitAllowed(result)) {
  *   // TypeScript knows result.remaining exists
  *   console.log(`${result.remaining} requests remaining`);
  * } else {
  *   // TypeScript knows result.retryAfter exists
  *   console.log(`Retry in ${result.retryAfter} seconds`);
  * }
  * ```
  */
  async checkLimit(userId, planName) {
    const plan = this.plans[planName];
    if (!plan) {
      throw new Error(`Unknown plan: ${planName}`);
    }
    const bucketKey = `${userId}:${planName}`;
    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      bucket = new TokenBucket(plan);
      this.buckets.set(bucketKey, bucket);
    }
    const consumeResult = bucket.tryConsume(1);
    if (isConsumptionAllowed(consumeResult)) {
      return {
        allowed: true,
        remaining: Math.floor(consumeResult.tokensRemaining),
        limit: plan.capacity,
        resetAt: consumeResult.resetAt
      };
    }
    const now = Date.now();
    const resetTime = consumeResult.resetAt.getTime();
    const retryAfter = Math.ceil((resetTime - now) / 1e3);
    return {
      allowed: false,
      remaining: Math.floor(consumeResult.tokensRemaining),
      limit: plan.capacity,
      resetAt: consumeResult.resetAt,
      retryAfter: Math.max(1, retryAfter)
    };
  }
  /**
  * Get current state of a user's bucket for a plan
  *
  * @param userId - User identifier
  * @param planName - Plan name
  * @returns Current bucket state or undefined if not created yet
  */
  getBucketState(userId, planName) {
    const bucketKey = `${userId}:${planName}`;
    const bucket = this.buckets.get(bucketKey);
    return bucket?.getState();
  }
  /**
  * Reset a user's bucket for a plan
  *
  * @param userId - User identifier
  * @param planName - Plan name
  */
  resetBucket(userId, planName) {
    const bucketKey = `${userId}:${planName}`;
    const bucket = this.buckets.get(bucketKey);
    if (bucket) {
      bucket.reset();
    }
  }
  /**
  * Clear all buckets (use cautiously)
  */
  clearAll() {
    this.buckets.clear();
  }
  /**
  * Get total number of active buckets
  */
  getActiveBucketCount() {
    return this.buckets.size;
  }
};
var DistributedTokenManager = class {
  static {
    __name(this, "DistributedTokenManager");
  }
  static {
    __name3(this, "DistributedTokenManager");
  }
  redis;
  plans;
  keyPrefix;
  ttlSeconds;
  fallbackToInMemory;
  fallbackLimiter = null;
  constructor(options) {
    if (!options.redisClient) {
      throw new Error("Redis client is required");
    }
    if (!options.plans || Object.keys(options.plans).length === 0) {
      throw new Error("At least one plan must be configured");
    }
    this.redis = options.redisClient;
    this.plans = options.plans;
    this.keyPrefix = options.keyPrefix || "ratelimit:";
    this.ttlSeconds = options.ttlSeconds || 3600;
    this.fallbackToInMemory = options.fallbackToInMemory !== false;
    if (this.fallbackToInMemory) {
      this.fallbackLimiter = new RateLimiter(this.plans);
    }
  }
  /**
  * Check rate limit using Redis with fallback to in-memory
  *
  * @param userId - User identifier
  * @param planName - Plan name
  * @returns Rate limit result with backend info
  */
  async checkLimit(userId, planName) {
    const plan = this.plans[planName];
    if (!plan) {
      throw new Error(`Unknown plan: ${planName}`);
    }
    try {
      return await this.checkLimitViaRedis(userId, planName, plan);
    } catch (error) {
      if (this.fallbackToInMemory) {
        return await this.checkLimitViaFallback(userId, planName);
      }
      throw error;
    }
  }
  /**
  * Check limit using Redis backend
  */
  async checkLimitViaRedis(userId, planName, plan) {
    const key = this.getRedisKey(userId, planName);
    const bucket = await this.getOrCreateBucket(key, plan);
    const consumeResult = bucket.tryConsume(1);
    try {
      await this.redis.set(key, JSON.stringify(bucket.getState()));
      await this.redis.expire(key, this.ttlSeconds);
    } catch (error) {
      if (this.fallbackToInMemory) {
        return await this.checkLimitViaFallback(userId, planName);
      }
      throw error;
    }
    if (consumeResult.allowed) {
      return {
        allowed: true,
        remaining: Math.floor(consumeResult.tokensRemaining),
        limit: plan.capacity,
        resetAt: consumeResult.resetAt,
        reason: "redis"
      };
    }
    const now = Date.now();
    const resetTime = consumeResult.resetAt.getTime();
    const retryAfter = Math.ceil((resetTime - now) / 1e3);
    return {
      allowed: false,
      remaining: Math.floor(consumeResult.tokensRemaining),
      limit: plan.capacity,
      resetAt: consumeResult.resetAt,
      reason: "redis",
      retryAfter: Math.max(1, retryAfter)
    };
  }
  /**
  * Check limit using in-memory fallback
  */
  async checkLimitViaFallback(userId, planName) {
    if (!this.fallbackLimiter) {
      throw new Error("Fallback limiter not initialized");
    }
    const result = await this.fallbackLimiter.checkLimit(userId, planName);
    return {
      ...result,
      reason: "fallback"
    };
  }
  /**
  * Get or create bucket from Redis
  */
  async getOrCreateBucket(key, plan) {
    const bucketData = await this.redis.get(key);
    if (bucketData) {
      try {
        const state = JSON.parse(bucketData);
        const bucket = new TokenBucket(plan);
        Object.assign(bucket.state || {}, state);
        return bucket;
      } catch (_error) {
        return new TokenBucket(plan);
      }
    }
    return new TokenBucket(plan);
  }
  /**
  * Get Redis key for user + plan
  */
  getRedisKey(userId, planName) {
    return `${this.keyPrefix}${userId}:${planName}`;
  }
  /**
  * Cleanup expired buckets (optional maintenance operation)
  */
  async cleanup() {
  }
};

export { AIPresenceDetector, AI_EXTENSION_IDS, ApiError, AuthenticationError, AuthorizationError, BurstHeuristicsDetector, ConfigDetector, CorruptedDataError, CursorDetector, DEFAULT_EXPERIENCE_THRESHOLDS, DEFAULT_MAX_SIZE, DEFAULT_RISK_THRESHOLDS, DEFAULT_THRESHOLDS, DefaultRiskAnalyzer, DeviceAuthClient, DiffCalculator, DistributedTokenManager, EncryptionService, ExperienceClassifier, FileChangeAnalyzer, FileConflictResolver, ID_PREFIX, InputValidationError, LRUCache, LocalStorage, MemoryStorage, MissingContentError, NoOpLogger, NodeTimerService, PathValidationError, PrivacySanitizer, PrivacyValidator, ProtectionClient, ProtectionDecisionEngine, ProtectionManager, RISK_FACTOR_DESCRIPTIONS, RateLimitError, RateLimiter, RetryPresets, RiskAnalyzer, SNAPBACK_LAYER_RULES, SessionCoordinator, SessionDeduplication, SessionManager, SessionRecovery, SessionRollback, SessionSummaryGenerator, SessionTagger, SnapBackError, SnapBackRCParser, Snapback, SnapbackClient, SnapshotClient, SnapshotCreationError, SnapshotDeletionService, SnapshotDuplicateError, SnapshotError, SnapshotIconStrategy, SnapshotManager, SnapshotNamingStrategy, SnapshotNotFoundError, SnapshotProtectedError, SnapshotRestoreError, SnapshotVerificationError, SnapshotVersionError, StorageBroker, StorageBrokerAdapter, StorageConnectionError, StorageError, StorageError2, StorageFullError, StorageFullError2, StorageIOError, StorageLockError, StorageLockError2, THRESHOLDS, TokenBucket, ValidationError, all, allOrErrors, analyze, andThen, applyAutomaticFix, areEqual, assertDefined, assertNonEmptyArray, assertNonEmptyString, assertPathWithinRoot, assertPositiveNumber, atomicWriteFile, atomicWriteFileSync, calculateBackoff, configureInvariant, createChangeSummary, createConfig, createDashboardMetricsClient, createDeviceAuthClient, createRule, createScopedInvariant, createSnapshotWithRetry, createSnapshotWithRetrySafe, createThresholds, createTokenBucket, defaultConfig, describeRiskFactor, describeRiskFactors, diagnoseSnapshotFailure, ensureSnapBackError, err, evaluatePolicy, formatDiagnosis, fromPromise, fromPromiseWith, generateAuditId, generateCheckpointId, generateId2, generateSessionId, generateSnapshotId, getBlobPath, getDepth, getInvariantConfig, getStandardRiskFactors, getViolationCounts, hashContent, hashFilePath, hashWorkspaceId, ingestTelemetry, invariant, isApiError, isConsumptionAllowed, isConsumptionDenied, isErr, isKnownRiskFactor, isOk, isRateLimitAllowed, isRateLimitDenied, isRetryableError, isSnapBackError, isSnapshotError, isStorageError, isValidId, isValidationError, isWithin, makeSafeSessionFinalizedEvent, makeSafeSessionStartedEvent, map, mapErr, match, normalize, ok, parseIdPrefix, parseIdTimestamp, randomId, resetThresholds, resetViolationCounts, runArchCheck, sequence, sha256, softInvariant, tap, tapErr, toError, toError2, toPromise, tryAll, tryCatch, tryCatchAsync, typeInvariant, unwrap, unwrapOr, unwrapOrElse, updateThresholds, withRetry };
//# sourceMappingURL=chunk-HGYKNWZZ.js.map
//# sourceMappingURL=chunk-HGYKNWZZ.js.map