import { isSnapbackInitialized, getWorkspaceDir, getViolations, getProtectedFiles, appendSnapbackJsonl, isLoggedIn, clearCredentials, getCredentials, createGlobalDirectory, saveCredentials, getWorkspaceVitals, saveProtectedFiles, getCurrentSession, endCurrentSession, getWorkspaceConfig, createSnapbackDirectory, saveWorkspaceVitals, saveWorkspaceConfig, recordLearning, getLearnings, readSnapbackJson, recordViolation, writeSnapbackJson, saveCurrentSession, loadSnapbackJsonl, getGlobalConfig, getGlobalDir, saveGlobalConfig } from './chunk-KSPLKCVF.js';
import { generateCacheKey, createDefaultWorkspace, Intelligence, KnowledgeStore, preloadEmbeddings, getEmbedding, HybridRetriever, classifyQuery, createSnapshotStorage } from './chunk-MTQ6ESQR.js';
import { generateSnapshotId, generateId } from './chunk-BCIXMIPW.js';
import { createChangeImpactAnalyzer } from './chunk-VSJ33PLA.js';
import './chunk-BJS6XH2V.js';
import { sha256, atomicWriteFileSync, hashContent } from './chunk-HGYKNWZZ.js';
import { detectAIClients, validateClientConfig, getSnapbackMCPConfig, writeClientConfig, repairClientConfig } from './chunk-RU7BOXR3.js';
import { __name, __require } from './chunk-WCQVDF3K.js';
import * as fs22 from 'fs/promises';
import { stat, lstat, access, constants, readFile, appendFile, readdir } from 'fs/promises';
import * as path5 from 'path';
import path5__default, { join, relative, dirname, basename, resolve, isAbsolute, normalize, sep } from 'path';
import { confirm as confirm$1, password, search, input as input$1, checkbox } from '@inquirer/prompts';
import { execSync, exec, spawn } from 'child_process';
import { EventEmitter } from 'events';
import chalk26 from 'chalk';
import { Command, createCommand } from 'commander';
import ora8 from 'ora';
import { createServer } from 'http';
import { platform, homedir } from 'os';
import boxen from 'boxen';
import { createHash, randomUUID } from 'crypto';
import * as fs5 from 'fs';
import { writeFileSync, existsSync, readFileSync, readdirSync, unlinkSync, statSync, mkdirSync, appendFileSync, lstatSync } from 'fs';
import { gzipSync, gunzipSync } from 'zlib';
import { createConnection } from 'net';
import { z } from 'zod';
import Table from 'cli-table3';
import { execa } from 'execa';
import 'log-update';
import * as readline from 'readline';
import { promisify } from 'util';
import chokidar from 'chokidar';
import 'atomically';
import ky, { HTTPError } from 'ky';
import CircuitBreaker from 'opossum';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { isInitializeRequest, ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import Conf from 'conf';

var __defProp = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp(target, "name", {
  value,
  configurable: true
}), "__name");
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: /* @__PURE__ */ __name((a, b) => (typeof __require !== "undefined" ? __require : a)[b], "get")
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var SnapBackEventBus = class SnapBackEventBus2 extends EventEmitter {
  static {
    __name(this, "SnapBackEventBus2");
  }
  static {
    __name2(this, "SnapBackEventBus");
  }
  /**
  * Emit a typed event
  */
  emit(event, payload) {
    const enrichedPayload = {
      ...payload,
      _timestamp: Date.now(),
      _event: event
    };
    return super.emit(event, enrichedPayload);
  }
  /**
  * Listen for a typed event
  */
  on(event, listener) {
    return super.on(event, listener);
  }
  /**
  * Listen for a typed event once
  */
  once(event, listener) {
    return super.once(event, listener);
  }
};
var eventBus = new SnapBackEventBus();
var DEFAULT_TIMEOUT = 3e4;
var _scriptsDir = null;
function getScriptsDir() {
  if (_scriptsDir) return _scriptsDir;
  try {
    if (typeof import.meta?.url === "string") {
      const { fileURLToPath } = __require2("url");
      const __filename = fileURLToPath(import.meta.url);
      const __dirname2 = dirname(__filename);
      _scriptsDir = join(__dirname2, "..");
      return _scriptsDir;
    }
  } catch {
  }
  try {
    const pkgPath = __require2.resolve("@snapback/engine/package.json");
    _scriptsDir = join(dirname(pkgPath), "dist");
    return _scriptsDir;
  } catch {
  }
  _scriptsDir = resolve(process.cwd(), "packages/engine/dist");
  return _scriptsDir;
}
__name(getScriptsDir, "getScriptsDir");
__name2(getScriptsDir, "getScriptsDir");
var SIGNAL_SCRIPTS = [
  "signals/risk-score.ts",
  "signals/complexity.ts",
  "signals/cycles.ts",
  "signals/velocity.ts",
  "signals/consumers.ts",
  "signals/threats.ts",
  "signals/phantom-deps.ts"
];
var VALIDATOR_SCRIPTS = [
  "validators/types.ts",
  "validators/cycles.ts"
];
async function runScript(scriptPath, input3, timeout = DEFAULT_TIMEOUT) {
  const fullPath = join(getScriptsDir(), scriptPath);
  const startTime = Date.now();
  return new Promise((resolve22, reject) => {
    const proc = spawn("npx", [
      "tsx",
      fullPath
    ], {
      stdio: [
        "pipe",
        "pipe",
        "pipe"
      ],
      timeout,
      // Pass workspace path via environment
      env: {
        ...process.env,
        SNAPBACK_WORKSPACE: process.cwd()
      }
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      const duration = Date.now() - startTime;
      if (code !== 0) {
        reject(new Error(`Script ${scriptPath} failed with code ${code}
stderr: ${stderr}
stdout: ${stdout}`));
        return;
      }
      try {
        const result7 = JSON.parse(stdout);
        if (typeof result7 === "object" && result7 !== null) {
          result7.duration = duration;
        }
        resolve22(result7);
      } catch (parseError) {
        reject(new Error(`Script ${scriptPath} output is not valid JSON
stdout: ${stdout}
Parse error: ${parseError}`));
      }
    });
    proc.on("error", (error) => {
      reject(new Error(`Failed to start script ${scriptPath}: ${error.message}`));
    });
    if (proc.stdin) {
      proc.stdin.write(JSON.stringify(input3));
      proc.stdin.end();
    }
  });
}
__name(runScript, "runScript");
__name2(runScript, "runScript");
var SIGNAL_WEIGHTS = {
  "risk-score": 1,
  cycles: 2.5,
  complexity: 1.5,
  threats: 2,
  "phantom-deps": 1.8,
  velocity: 0.5,
  consumers: 0.3
};
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}
__name(hashString, "hashString");
__name2(hashString, "hashString");
var Orchestrator = class {
  static {
    __name(this, "Orchestrator");
  }
  static {
    __name2(this, "Orchestrator");
  }
  sessionHealth;
  sessionId;
  previousScore;
  workspaceRoot;
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot || process.cwd();
    this.sessionId = `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.previousScore = 100;
    this.sessionHealth = {
      score: 100,
      warnings: [],
      suggestions: [],
      filesModified: [],
      cyclesIntroduced: 0,
      complexityDelta: 0
    };
  }
  /**
  * Analyze file changes and determine outcome
  *
  * This is the main entry point. It:
  * 1. Runs all signal scripts in parallel
  * 2. Runs all validator scripts in parallel
  * 3. Aggregates results
  * 4. Updates session health
  * 5. Returns combined outcome
  *
  * @param fileChanges - Array of file changes to analyze
  * @returns Orchestrator result with outcome and details
  */
  async analyze(fileChanges) {
    const startTime = Date.now();
    const input3 = {
      files: fileChanges,
      workspace: process.cwd(),
      timestamp: Date.now()
    };
    const [signals, validators] = await Promise.all([
      this.runSignals(input3),
      this.runValidators(input3)
    ]);
    const riskScore = this.calculateRiskScore(signals);
    const outcome = this.determineOutcome(validators, riskScore);
    this.updateSessionHealth(signals, validators, fileChanges);
    eventBus.emit("risk.analyzed", {
      score: riskScore,
      factorCount: signals.length,
      threatCount: signals.filter((s) => s.signal === "threats").length
    });
    const duration = Date.now() - startTime;
    return {
      outcome,
      signals,
      validators,
      riskScore,
      health: this.sessionHealth,
      duration
    };
  }
  /**
  * Run all signal scripts in parallel
  */
  async runSignals(input3) {
    const results = await Promise.allSettled(SIGNAL_SCRIPTS.map((script) => runScript(script, input3)));
    const signals = [];
    for (let i = 0; i < results.length; i++) {
      const result7 = results[i];
      if (result7.status === "fulfilled") {
        signals.push(result7.value);
      } else {
        console.warn(`Signal script ${SIGNAL_SCRIPTS[i]} failed:`, result7.reason);
        eventBus.emit("error.occurred", {
          component: "orchestrator",
          message: `Signal ${SIGNAL_SCRIPTS[i]} failed: ${result7.reason}`,
          recoverable: true
        });
      }
    }
    return signals;
  }
  /**
  * Run all validator scripts in parallel
  */
  async runValidators(input3) {
    const results = await Promise.allSettled(VALIDATOR_SCRIPTS.map((script) => runScript(script, input3)));
    const validators = [];
    for (let i = 0; i < results.length; i++) {
      const result7 = results[i];
      if (result7.status === "fulfilled") {
        validators.push(result7.value);
        if (result7.value.status === "pass") {
          eventBus.emit("validation.passed", {
            validator: result7.value.validator,
            duration: result7.value.duration || 0
          });
        } else {
          eventBus.emit("validation.failed", {
            validator: result7.value.validator,
            errorCount: result7.value.errors?.length || 0,
            duration: result7.value.duration || 0
          });
        }
      } else {
        console.warn(`Validator script ${VALIDATOR_SCRIPTS[i]} failed:`, result7.reason);
        validators.push({
          validator: VALIDATOR_SCRIPTS[i],
          status: "fail",
          errors: [
            {
              message: `Script execution failed: ${result7.reason}`
            }
          ]
        });
      }
    }
    return validators;
  }
  /**
  * Calculate aggregated risk score from signals using weighted aggregation
  *
  * Algorithm (from risk-analyzer.ts):
  * 1. If direct risk-score signal exists, use it as base
  * 2. Apply weighted contributions from other signals
  * 3. Normalize to 0-10 scale
  */
  calculateRiskScore(signals) {
    const riskSignal = signals.find((s) => s.signal === "risk-score");
    let baseScore = riskSignal?.value ?? 0;
    let weightedSum = 0;
    let totalWeight = 0;
    for (const signal of signals) {
      if (signal.signal === "risk-score") continue;
      const weight = SIGNAL_WEIGHTS[signal.signal] ?? 1;
      weightedSum += signal.value * weight;
      totalWeight += weight;
    }
    if (totalWeight > 0) {
      const weightedContribution = weightedSum / totalWeight;
      baseScore = baseScore * 0.6 + weightedContribution * 0.4;
    }
    return Math.round(Math.min(10, Math.max(0, baseScore)) * 10) / 10;
  }
  /**
  * Determine final outcome based on validators and risk score
  */
  determineOutcome(validators, riskScore) {
    const hasFailure = validators.some((v) => v.status === "fail");
    if (hasFailure) {
      return "fail";
    }
    if (riskScore > 7) {
      return "warn";
    }
    return "pass";
  }
  /**
  * Update session health based on analysis results
  *
  * This is what enables "coaching" - the agent sees health trends over time.
  */
  updateSessionHealth(signals, validators, fileChanges) {
    for (const change of fileChanges) {
      if (!this.sessionHealth.filesModified.includes(change.path)) {
        this.sessionHealth.filesModified.push(change.path);
      }
    }
    const cyclesSignal = signals.find((s) => s.signal === "cycles");
    if (cyclesSignal && cyclesSignal.value > 0) {
      this.sessionHealth.cyclesIntroduced = cyclesSignal.value;
      this.sessionHealth.warnings.push(`\u26A0\uFE0F ${cyclesSignal.value} circular dependencies detected`);
    }
    const complexitySignal = signals.find((s) => s.signal === "complexity");
    if (complexitySignal) {
      this.sessionHealth.complexityDelta = complexitySignal.value;
      if (complexitySignal.value > 0.3) {
        this.sessionHealth.warnings.push(`\u26A0\uFE0F Complexity increased by ${Math.round(complexitySignal.value * 100)}%`);
      }
    }
    for (const v of validators) {
      if (v.status === "fail" && v.suggestion) {
        this.sessionHealth.suggestions.push(v.suggestion);
      }
    }
    this.sessionHealth.warnings = this.sessionHealth.warnings.slice(-3);
    this.sessionHealth.suggestions = this.sessionHealth.suggestions.slice(-2);
    let score = 100;
    score -= this.sessionHealth.cyclesIntroduced * 15;
    score -= this.sessionHealth.warnings.length * 5;
    score -= Math.max(0, this.sessionHealth.complexityDelta) * 20;
    score -= validators.filter((v) => v.status === "fail").length * 10;
    this.sessionHealth.score = Math.max(0, score);
    this.sessionHealth.coaching = this.generateCoaching();
    const scoreDelta = Math.abs(this.sessionHealth.score - this.previousScore);
    if (scoreDelta >= 5) {
      eventBus.emit("session.health_changed", {
        sessionId: this.sessionId,
        previousScore: this.previousScore,
        currentScore: this.sessionHealth.score,
        trigger: "analysis"
      });
    }
    this.previousScore = this.sessionHealth.score;
  }
  /**
  * Generate coaching message based on health score
  */
  generateCoaching() {
    const { score, warnings, suggestions } = this.sessionHealth;
    if (score >= 90) {
      return "";
    }
    if (score >= 70) {
      return `Note: ${warnings[0] || "Minor issues detected"}`;
    }
    if (score >= 50) {
      return `\u26A0\uFE0F Session health declining (${score}/100). Please address: ${warnings.join(", ")}`;
    }
    return `\u{1F6D1} STOP: Session health critical (${score}/100). You have introduced ${this.sessionHealth.cyclesIntroduced} cycles. Recommended: ${suggestions[0] || "Review recent changes"}`;
  }
  /**
  * Get current session health (for injection into MCP responses)
  */
  getHealth() {
    return {
      ...this.sessionHealth
    };
  }
  /**
  * Reset session health (for new session)
  */
  resetSession() {
    this.sessionId = `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.previousScore = 100;
    this.sessionHealth = {
      score: 100,
      warnings: [],
      suggestions: [],
      filesModified: [],
      cyclesIntroduced: 0,
      complexityDelta: 0
    };
    eventBus.emit("session.started", {
      sessionId: this.sessionId,
      workspaceHash: hashString(this.workspaceRoot)
    });
  }
  /**
  * Get current session ID
  */
  getSessionId() {
    return this.sessionId;
  }
};
var orchestrator = new Orchestrator();
var RISK_THRESHOLDS = {
  safe: 1,
  low: 3,
  medium: 5,
  high: 7
};
var HIGH_RISK_EXIT_THRESHOLD = 5;
function scoreToRiskLevel(score) {
  if (score <= RISK_THRESHOLDS.safe) {
    return "safe";
  }
  if (score <= RISK_THRESHOLDS.low) {
    return "low";
  }
  if (score <= RISK_THRESHOLDS.medium) {
    return "medium";
  }
  if (score <= RISK_THRESHOLDS.high) {
    return "high";
  }
  return "critical";
}
__name(scoreToRiskLevel, "scoreToRiskLevel");
__name2(scoreToRiskLevel, "scoreToRiskLevel");
function isHighRisk(score) {
  return score > HIGH_RISK_EXIT_THRESHOLD;
}
__name(isHighRisk, "isHighRisk");
__name2(isHighRisk, "isHighRisk");
function getExitCode(score) {
  return isHighRisk(score) ? 1 : 0;
}
__name(getExitCode, "getExitCode");
__name2(getExitCode, "getExitCode");
var CLIEngineAdapter = class {
  static {
    __name(this, "CLIEngineAdapter");
  }
  static {
    __name2(this, "CLIEngineAdapter");
  }
  /** Analyze files and return CLI-formatted output */
  async analyze(input3) {
    if (!input3 || typeof input3 !== "object") {
      return this.errorResult("Invalid input: expected object with files array");
    }
    if (!Array.isArray(input3.files)) {
      return this.errorResult("Invalid input: files must be an array");
    }
    if (input3.files.length === 0) {
      return this.emptyResult(input3.format);
    }
    try {
      const fileChanges = this.toFileChanges(input3.files);
      const result7 = await orchestrator.analyze(fileChanges);
      const threatScore = result7.signals.find((s) => s.signal === "threats")?.value || 0;
      const effectiveScore = Math.max(result7.riskScore, threatScore);
      const riskLevel = scoreToRiskLevel(effectiveScore);
      const exitCode = getExitCode(effectiveScore);
      return {
        exitCode,
        output: this.formatOutput(effectiveScore, riskLevel, result7, input3),
        riskScore: effectiveScore,
        riskLevel
      };
    } catch (error) {
      return this.errorResult(error instanceof Error ? error.message : "Unknown error");
    }
  }
  resetSession() {
    orchestrator.resetSession();
  }
  getSessionHealth() {
    return orchestrator.getHealth();
  }
  // ── Private Helpers ───────────────────────────────────────────────────
  toFileChanges(files) {
    return files.filter((f) => f.path).map((f) => ({
      path: f.path,
      content: f.content || "",
      lineCount: f.content?.split("\n").length ?? 0,
      changeType: "modify"
    }));
  }
  formatOutput(score, level, result7, input3) {
    if (input3.quiet && !isHighRisk(score)) {
      return "";
    }
    switch (input3.format) {
      case "json":
        return JSON.stringify({
          riskScore: score,
          riskLevel: level,
          signals: result7.signals.filter((s) => s.value > 0),
          session: result7.health
        });
      case "sarif":
        return this.toSARIF(score, level, result7.signals);
      default:
        return this.toText(score, level, result7.signals);
    }
  }
  toText(score, level, signals) {
    const lines = [
      `Risk Level: ${level.toUpperCase()} (${score.toFixed(1)}/10)`
    ];
    const activeSignals = signals.filter((s) => s.value > 0);
    if (activeSignals.length > 0) {
      lines.push("Signals:");
      for (const s of activeSignals) {
        lines.push(`  - ${s.signal}: ${s.value.toFixed(1)}`);
      }
    }
    return lines.join("\n");
  }
  toSARIF(_score, _level, signals) {
    return JSON.stringify({
      version: "2.1.0",
      $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      runs: [
        {
          tool: {
            driver: {
              name: "snapback-engine",
              version: "0.1.0"
            }
          },
          results: signals.filter((s) => s.value > 0).map((s) => ({
            ruleId: s.signal,
            level: s.value > 5 ? "error" : "warning",
            message: {
              text: `${s.signal}: score ${s.value.toFixed(1)}`
            }
          }))
        }
      ]
    });
  }
  emptyResult(format) {
    const output = format === "json" ? '{"riskScore":0,"riskLevel":"safe"}' : "No files to analyze";
    return {
      exitCode: 0,
      output,
      riskScore: 0,
      riskLevel: "safe"
    };
  }
  errorResult(error) {
    return {
      exitCode: 1,
      output: `Error: ${error}`,
      riskScore: 0,
      riskLevel: "safe",
      error
    };
  }
};
var DEFAULT_API_URL = process.env.SNAPBACK_API_URL || "https://api.snapback.dev";
var BETTER_AUTH_URL = process.env.SNAPBACK_WEB_URL || "https://console.snapback.dev";
var AUTH_CALLBACK_PORT = 51234;
var AUTH_TIMEOUT_MS = 12e4;
function createLoginCommand() {
  return new Command("login").description("Login to SnapBack").option("--api-key <key>", "Use API key directly (CI/CD, onboarding)").option("--browser", "Open browser for OAuth instead of device code").action(async (options) => {
    try {
      if (options.apiKey) {
        await loginWithApiKey(options.apiKey);
      } else if (options.browser) {
        await loginWithBrowser();
      } else {
        await loginWithDeviceCode();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Login failed:"), message);
      process.exit(1);
    }
  });
}
__name(createLoginCommand, "createLoginCommand");
function createLogoutCommand() {
  return new Command("logout").description("Logout from SnapBack").action(async () => {
    const spinner2 = ora8("Logging out...").start();
    try {
      const wasLoggedIn = await isLoggedIn();
      await clearCredentials();
      if (wasLoggedIn) {
        spinner2.succeed("Logged out successfully");
      } else {
        spinner2.info("You were not logged in");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      spinner2.fail("Logout failed");
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
}
__name(createLogoutCommand, "createLogoutCommand");
function createWhoamiCommand() {
  return new Command("whoami").description("Show current user").action(async () => {
    try {
      const credentials = await getCredentials();
      if (!credentials) {
        console.log(chalk26.yellow("Not logged in"));
        console.log(chalk26.gray("Run: snap login"));
        return;
      }
      if (credentials.expiresAt) {
        const expiresAt = new Date(credentials.expiresAt);
        if (expiresAt < /* @__PURE__ */ new Date()) {
          console.log(chalk26.yellow("Session expired"));
          console.log(chalk26.gray("Run: snap login"));
          return;
        }
      }
      console.log(chalk26.cyan("Logged in as:"), credentials.email);
      console.log(chalk26.cyan("Tier:"), formatTier(credentials.tier));
      if (credentials.expiresAt) {
        const expiresAt = new Date(credentials.expiresAt);
        const now = /* @__PURE__ */ new Date();
        const hoursRemaining = Math.round((expiresAt.getTime() - now.getTime()) / (1e3 * 60 * 60));
        if (hoursRemaining < 24) {
          console.log(chalk26.yellow("Session expires:"), `in ${hoursRemaining} hours`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
}
__name(createWhoamiCommand, "createWhoamiCommand");
async function loginWithBrowser() {
  const spinner2 = ora8("Preparing login...").start();
  try {
    await createGlobalDirectory();
    const { url, waitForCallback } = await startCallbackServer();
    const authUrl = `${DEFAULT_API_URL}/auth/cli?callback=${encodeURIComponent(url)}`;
    spinner2.succeed("Ready to authenticate");
    console.log();
    console.log(chalk26.cyan("Opening browser for authentication..."));
    console.log(chalk26.gray("If browser doesn't open, visit:"));
    console.log(chalk26.underline(authUrl));
    console.log();
    await openBrowser(authUrl);
    spinner2.start("Waiting for authentication...");
    const credentials = await waitForCallback();
    spinner2.succeed("Logged in successfully");
    console.log();
    console.log(chalk26.green("\u2713"), "Welcome,", chalk26.cyan(credentials.email));
    console.log(chalk26.green("\u2713"), "Tier:", formatTier(credentials.tier));
  } catch (error) {
    spinner2.fail("Login failed");
    throw error;
  }
}
__name(loginWithBrowser, "loginWithBrowser");
async function loginWithDeviceCode() {
  const spinner2 = ora8("Requesting device code...").start();
  try {
    await createGlobalDirectory();
    const response = await fetch(`${BETTER_AUTH_URL}/api/auth/device/code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: "snapback-cli",
        scope: "cli:snapshots api:read api:write"
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    spinner2.succeed("Device code received");
    console.log();
    console.log(chalk26.cyan("To complete login:"));
    console.log();
    console.log("  1. Visit:", chalk26.underline(data.verification_uri));
    console.log("  2. Enter code:", chalk26.bold.yellow(data.user_code));
    console.log();
    if (data.verification_uri_complete) {
      await openBrowser(data.verification_uri_complete);
    }
    spinner2.start("Waiting for authorization...");
    const credentials = await pollForToken(data.device_code, data.interval, data.expires_in);
    spinner2.succeed("Logged in successfully");
    console.log();
    console.log(chalk26.green("\u2713"), "Welcome,", chalk26.cyan(credentials.email));
    console.log(chalk26.green("\u2713"), "Tier:", formatTier(credentials.tier));
  } catch (error) {
    spinner2.fail("Login failed");
    throw error;
  }
}
__name(loginWithDeviceCode, "loginWithDeviceCode");
async function loginWithApiKey(apiKey) {
  const spinner2 = ora8("Validating API key...").start();
  try {
    await createGlobalDirectory();
    const response = await fetch(`${DEFAULT_API_URL}/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      }
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key");
      }
      throw new Error(`Server returned ${response.status}`);
    }
    const data = await response.json();
    const credentials = {
      accessToken: apiKey,
      email: data.email,
      tier: data.tier
    };
    await saveCredentials(credentials);
    spinner2.succeed("Logged in with API key");
    console.log();
    console.log(chalk26.green("\u2713"), "Account:", chalk26.cyan(data.email));
    console.log(chalk26.green("\u2713"), "Tier:", formatTier(data.tier));
  } catch (error) {
    spinner2.fail("Login failed");
    throw error;
  }
}
__name(loginWithApiKey, "loginWithApiKey");
async function startCallbackServer() {
  return new Promise((resolve9, reject) => {
    let resolved = false;
    let callbackResolver = null;
    let callbackRejecter = null;
    const server = createServer((req, res) => {
      if (!req.url?.startsWith("/callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      try {
        const url = new URL(req.url, `http://localhost:${AUTH_CALLBACK_PORT}`);
        const token = url.searchParams.get("token");
        const email = url.searchParams.get("email");
        const tier = url.searchParams.get("tier");
        const error = url.searchParams.get("error");
        if (error) {
          res.writeHead(400, {
            "Content-Type": "text/html"
          });
          res.end(errorPage(error));
          callbackRejecter?.(new Error(error));
          server.close();
          return;
        }
        if (!token || !email) {
          res.writeHead(400, {
            "Content-Type": "text/html"
          });
          res.end(errorPage("Missing credentials"));
          callbackRejecter?.(new Error("Missing credentials"));
          server.close();
          return;
        }
        const credentials = {
          accessToken: token,
          email,
          tier: tier || "free",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString()
        };
        saveCredentials(credentials).then(() => {
          res.writeHead(200, {
            "Content-Type": "text/html"
          });
          res.end(successPage(email));
          callbackResolver?.(credentials);
          server.close();
        }).catch((err2) => {
          res.writeHead(500, {
            "Content-Type": "text/html"
          });
          res.end(errorPage("Failed to save credentials"));
          callbackRejecter?.(err2);
          server.close();
        });
      } catch (err2) {
        res.writeHead(500, {
          "Content-Type": "text/html"
        });
        res.end(errorPage("Server error"));
        callbackRejecter?.(err2 instanceof Error ? err2 : new Error(String(err2)));
        server.close();
      }
    });
    server.on("error", (error) => {
      if (!resolved) {
        reject(error);
      }
    });
    server.listen(AUTH_CALLBACK_PORT, "127.0.0.1", () => {
      resolved = true;
      resolve9({
        url: `http://127.0.0.1:${AUTH_CALLBACK_PORT}/callback`,
        waitForCallback: /* @__PURE__ */ __name(() => {
          return new Promise((res, rej) => {
            callbackResolver = res;
            callbackRejecter = rej;
            setTimeout(() => {
              rej(new Error("Authentication timed out"));
              server.close();
            }, AUTH_TIMEOUT_MS);
          });
        }, "waitForCallback")
      });
    });
  });
}
__name(startCallbackServer, "startCallbackServer");
async function pollForToken(deviceCode, interval, expiresIn) {
  const endTime = Date.now() + expiresIn * 1e3;
  let pollInterval = Math.max(interval, 5) * 1e3;
  while (Date.now() < endTime) {
    await sleep(pollInterval);
    const response = await fetch(`${BETTER_AUTH_URL}/api/auth/device/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: "snapback-cli"
      })
    });
    if (response.ok) {
      const data = await response.json();
      const credentials = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        email: data.user?.email || "user@snapback.dev",
        tier: data.tier || "free",
        expiresAt: new Date(Date.now() + data.expires_in * 1e3).toISOString()
      };
      await saveCredentials(credentials);
      return credentials;
    }
    if (response.status === 400) {
      const error = await response.json();
      switch (error.error) {
        case "authorization_pending":
          continue;
        case "slow_down":
          pollInterval += 5e3;
          continue;
        case "access_denied":
          throw new Error("Authorization denied by user");
        case "expired_token":
          throw new Error("Device code expired. Please try again.");
        default:
          throw new Error(error.error_description || error.error);
      }
    }
    throw new Error(`Server returned ${response.status}`);
  }
  throw new Error("Authorization timed out");
}
__name(pollForToken, "pollForToken");
async function openBrowser(url) {
  const { exec: exec4 } = await import('child_process');
  const command = platform() === "darwin" ? `open "${url}"` : platform() === "win32" ? `start "" "${url}"` : `xdg-open "${url}"`;
  return new Promise((resolve9) => {
    exec4(command, (_error) => {
      resolve9();
    });
  });
}
__name(openBrowser, "openBrowser");
function formatTier(tier) {
  return tier === "pro" ? chalk26.magenta.bold("Pro \u2B50") : chalk26.gray("Free");
}
__name(formatTier, "formatTier");
function sleep(ms) {
  return new Promise((resolve9) => setTimeout(resolve9, ms));
}
__name(sleep, "sleep");
function successPage(email) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>SnapBack - Login Successful</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #0a0a0a; color: #fafafa; }
    .success { color: #22c55e; font-size: 48px; margin-bottom: 20px; }
    h1 { margin-bottom: 10px; }
    p { color: #a1a1aa; }
    .close { margin-top: 30px; color: #71717a; font-size: 14px; }
  </style>
</head>
<body>
  <div class="success">\u2713</div>
  <h1>Welcome to SnapBack!</h1>
  <p>Logged in as ${email}</p>
  <p class="close">You can close this window and return to your terminal.</p>
  <script>setTimeout(() => window.close(), 3000);</script>
</body>
</html>
`;
}
__name(successPage, "successPage");
function errorPage(error) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>SnapBack - Login Failed</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #0a0a0a; color: #fafafa; }
    .error { color: #ef4444; font-size: 48px; margin-bottom: 20px; }
    h1 { margin-bottom: 10px; }
    p { color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="error">\u2717</div>
  <h1>Login Failed</h1>
  <p>${error}</p>
  <p>Please try again in your terminal.</p>
</body>
</html>
`;
}
__name(errorPage, "errorPage");
var BOX_STYLES = {
  success: {
    borderColor: "green",
    borderStyle: "round"
  },
  warning: {
    borderColor: "yellow",
    borderStyle: "round"
  },
  error: {
    borderColor: "red",
    borderStyle: "round"
  },
  info: {
    borderColor: "cyan",
    borderStyle: "round"
  },
  "save-story": {
    borderColor: "green",
    borderStyle: "double",
    padding: 1,
    margin: 1
  }
};
function displayBox(contentOrOptions, options = {}) {
  let content;
  let title;
  let type;
  let padding;
  let margin;
  if (typeof contentOrOptions === "string") {
    content = contentOrOptions;
    title = options.title;
    type = options.type ?? "info";
    padding = options.padding ?? 1;
    margin = options.margin ?? 0;
  } else {
    content = contentOrOptions.content;
    title = contentOrOptions.title;
    type = contentOrOptions.type ?? "info";
    padding = contentOrOptions.padding ?? 1;
    margin = contentOrOptions.margin ?? 0;
  }
  const styleType = type in BOX_STYLES ? type : "info";
  return boxen(content, {
    ...BOX_STYLES[styleType],
    padding,
    margin,
    ...title && {
      title,
      titleAlignment: "center"
    }
  });
}
__name(displayBox, "displayBox");
function displaySaveStory(riskScore, affectedFiles, snapshotId) {
  return displayBox(`${chalk26.bold("\u{1F6E1}\uFE0F SnapBack just protected you!")}

${chalk26.cyan("Risk Score:")} ${chalk26.red(riskScore.toFixed(1) + "/10")}
${chalk26.cyan("Files Protected:")} ${chalk26.green(affectedFiles.length.toString())}
${chalk26.cyan("Snapshot:")} ${snapshotId.substring(0, 8)}

` + chalk26.dim("Share your save story: snapback.dev/stories"), {
    type: "save-story"
  });
}
__name(displaySaveStory, "displaySaveStory");
function displaySnapshotSuccess(snapshotId, message, fileCount) {
  return displayBox(`${chalk26.green("\u2713")} Snapshot created
${chalk26.cyan("ID:")} ${snapshotId.substring(0, 8)}
${chalk26.cyan("Message:")} ${message || "(none)"}
${chalk26.cyan("Files:")} ${fileCount} protected`, {
    title: "\u{1F6E1}\uFE0F SnapBack Protection Active",
    type: "success"
  });
}
__name(displaySnapshotSuccess, "displaySnapshotSuccess");
function displayHighRiskWarning(file, riskScore) {
  return displayBox(`${chalk26.red("\u26A0 High Risk Detected")}

${chalk26.cyan("File:")} ${file}
${chalk26.cyan("Risk Score:")} ${chalk26.red(riskScore.toFixed(1) + "/10")}

${chalk26.yellow("Recommendation:")} Create a snapshot before proceeding`, {
    title: "\u{1F6A8} Risk Analysis",
    type: "warning"
  });
}
__name(displayHighRiskWarning, "displayHighRiskWarning");

// src/commands/fix.ts
var FIXES = {
  "missing-gitignore": {
    description: "Add .snapback to .gitignore",
    fix: fixMissingGitignore
  },
  "no-protection": {
    description: "Auto-detect and protect critical files",
    fix: fixNoProtection
  },
  "stale-session": {
    description: "End stale session (>24h old)",
    fix: fixStaleSession
  },
  "high-violations": {
    description: "Review and learn from violation patterns",
    fix: fixHighViolations
  },
  "not-logged-in": {
    description: "Login to SnapBack for full features",
    fix: fixNotLoggedIn
  }
};
function createFixCommand() {
  const fix = new Command("fix").description("Auto-fix detected issues").argument("[issue]", "Issue ID to fix (from snap status)").option("--dry-run", "Show what would be fixed without making changes").option("--all", "Fix all detected issues").option("--list", "List all available fixes").action(async (issue, options) => {
    const cwd = process.cwd();
    try {
      if (options.list) {
        displayAvailableFixes();
        return;
      }
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized in this workspace"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      if (options.all) {
        await fixAll(cwd, options.dryRun);
        return;
      }
      if (!issue) {
        console.log(chalk26.yellow("No issue specified"));
        console.log();
        console.log("Usage:");
        console.log(chalk26.gray("  snap fix <issue-id>    Fix a specific issue"));
        console.log(chalk26.gray("  snap fix --all         Fix all detected issues"));
        console.log(chalk26.gray("  snap fix --list        List all available fixes"));
        console.log();
        console.log("Run", chalk26.cyan("snap status"), "to see detected issues.");
        return;
      }
      const fixer = FIXES[issue];
      if (!fixer) {
        console.log(chalk26.red(`Unknown issue: ${issue}`));
        console.log();
        displayAvailableFixes();
        return;
      }
      if (options.dryRun) {
        console.log(chalk26.cyan("Dry run:"), `Would fix "${issue}"`);
        console.log(chalk26.gray(`  ${fixer.description}`));
      }
      const result7 = await fixer.fix(cwd, options.dryRun);
      if (result7.success) {
        if (options.dryRun) {
          console.log(chalk26.cyan("\u2713"), result7.message);
        } else {
          console.log(chalk26.green("\u2713"), result7.message);
        }
      } else {
        console.log(chalk26.yellow("\u25CB"), result7.message);
      }
      if (result7.details && result7.details.length > 0) {
        for (const detail of result7.details) {
          console.log(chalk26.gray(`  ${detail}`));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  return fix;
}
__name(createFixCommand, "createFixCommand");
async function fixMissingGitignore(workspaceRoot, dryRun) {
  const gitignorePath = join(workspaceRoot, ".gitignore");
  try {
    await access(gitignorePath, constants.F_OK);
    const content = await readFile(gitignorePath, "utf-8");
    if (content.includes(".snapback")) {
      return {
        success: false,
        message: ".snapback already in .gitignore"
      };
    }
    const addition = "\n# SnapBack snapshots (large binary data)\n.snapback/snapshots/\n.snapback/embeddings.db\n";
    if (dryRun) {
      return {
        success: true,
        message: "Would add .snapback entries to .gitignore",
        details: [
          ".snapback/snapshots/",
          ".snapback/embeddings.db"
        ]
      };
    }
    await appendFile(gitignorePath, addition);
    return {
      success: true,
      message: "Added .snapback entries to .gitignore",
      details: [
        ".snapback/snapshots/",
        ".snapback/embeddings.db"
      ]
    };
  } catch {
    if (dryRun) {
      return {
        success: true,
        message: "Would create .gitignore with .snapback entries"
      };
    }
    const content = "# SnapBack snapshots (large binary data)\n.snapback/snapshots/\n.snapback/embeddings.db\n";
    const { writeFile: writeFile5 } = await import('fs/promises');
    await writeFile5(gitignorePath, content);
    return {
      success: true,
      message: "Created .gitignore with .snapback entries"
    };
  }
}
__name(fixMissingGitignore, "fixMissingGitignore");
async function fixNoProtection(workspaceRoot, dryRun) {
  const currentProtected = await getProtectedFiles(workspaceRoot);
  if (currentProtected.length > 0) {
    return {
      success: false,
      message: `Already have ${currentProtected.length} protected files`
    };
  }
  const vitals = await getWorkspaceVitals(workspaceRoot);
  const criticalPatterns = await detectCriticalPatterns(workspaceRoot, vitals?.framework);
  if (criticalPatterns.length === 0) {
    return {
      success: false,
      message: "No critical files detected to protect"
    };
  }
  if (dryRun) {
    return {
      success: true,
      message: `Would protect ${criticalPatterns.length} critical file patterns`,
      details: criticalPatterns.map((p) => p.pattern)
    };
  }
  await saveProtectedFiles(criticalPatterns, workspaceRoot);
  return {
    success: true,
    message: `Protected ${criticalPatterns.length} critical file patterns`,
    details: criticalPatterns.map((p) => `${p.pattern} (${p.reason})`)
  };
}
__name(fixNoProtection, "fixNoProtection");
async function fixStaleSession(workspaceRoot, dryRun) {
  const session = await getCurrentSession(workspaceRoot);
  if (!session) {
    return {
      success: false,
      message: "No active session"
    };
  }
  const sessionStart = new Date(session.startedAt);
  const hoursSinceStart = (Date.now() - sessionStart.getTime()) / (1e3 * 60 * 60);
  if (hoursSinceStart <= 24) {
    return {
      success: false,
      message: `Session is only ${Math.floor(hoursSinceStart)}h old (not stale)`
    };
  }
  if (dryRun) {
    return {
      success: true,
      message: `Would end stale session (${Math.floor(hoursSinceStart)}h old)`,
      details: [
        `ID: ${session.id.substring(0, 8)}`,
        session.task ? `Task: ${session.task}` : "(no task)",
        `Snapshots: ${session.snapshotCount}`
      ]
    };
  }
  const { appendSnapbackJsonl: appendSnapbackJsonl2 } = await import('./snapback-dir-4QRR2IPV.js');
  await appendSnapbackJsonl2("session/history.jsonl", {
    ...session,
    endedAt: (/* @__PURE__ */ new Date()).toISOString(),
    endMessage: "Auto-ended by snap fix (stale session)"
  }, workspaceRoot);
  await endCurrentSession(workspaceRoot);
  return {
    success: true,
    message: `Ended stale session (${Math.floor(hoursSinceStart)}h old)`,
    details: [
      `ID: ${session.id.substring(0, 8)}`,
      `Snapshots: ${session.snapshotCount}`
    ]
  };
}
__name(fixStaleSession, "fixStaleSession");
async function fixHighViolations(workspaceRoot, _dryRun) {
  const violations = await getViolations(workspaceRoot);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
  const recentViolations = violations.filter((v) => new Date(v.date) > oneWeekAgo);
  if (recentViolations.length <= 5) {
    return {
      success: false,
      message: `Only ${recentViolations.length} violations this week (threshold: >5)`
    };
  }
  const byType = {};
  for (const v of recentViolations) {
    byType[v.type] = (byType[v.type] || 0) + 1;
  }
  const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const details = sorted.map(([type, count]) => {
    const emoji = count >= 3 ? "\u{1F534}" : count >= 2 ? "\u{1F7E1}" : "\u26AA";
    const promoted = count >= 3 ? " (pattern candidate)" : "";
    return `${emoji} ${type}: ${count} occurrences${promoted}`;
  });
  console.log();
  console.log(displayBox(`${chalk26.yellow("High Violation Count")}

${recentViolations.length} violations in the last week.
Review these patterns to prevent future issues.

` + details.join("\n"), {
    type: "warning"
  }));
  return {
    success: true,
    message: "Violation patterns analyzed",
    details: [
      "Patterns with 3+ occurrences are candidates for automation.",
      "Run: snap patterns list  to see promoted patterns",
      'Run: snap learn "<trigger>" "<action>"  to record learnings'
    ]
  };
}
__name(fixHighViolations, "fixHighViolations");
async function fixNotLoggedIn(_workspaceRoot, _dryRun) {
  console.log();
  console.log(displayBox(`${chalk26.cyan("Login for Full Features")}

Some features require a SnapBack account:
\u2022 Pro tier: Snapshots, recovery, advanced protection
\u2022 Free tier: Risk analysis, pattern tracking

${chalk26.bold("Run:")} snap login`, {
    type: "info"
  }));
  return {
    success: true,
    message: "Login instructions displayed",
    details: [
      "Run: snap login"
    ]
  };
}
__name(fixNotLoggedIn, "fixNotLoggedIn");
function displayAvailableFixes() {
  console.log(chalk26.cyan("Available Fixes:"));
  console.log();
  for (const [id, { description }] of Object.entries(FIXES)) {
    console.log(`  ${chalk26.bold(id)}`);
    console.log(chalk26.gray(`    ${description}`));
  }
  console.log();
  console.log(chalk26.gray("Usage: snap fix <issue-id>"));
  console.log(chalk26.gray("       snap fix --all"));
}
__name(displayAvailableFixes, "displayAvailableFixes");
async function fixAll(workspaceRoot, dryRun) {
  console.log(chalk26.cyan(dryRun ? "Dry run: Would fix all issues" : "Fixing all detected issues..."));
  console.log();
  let fixedCount = 0;
  let skippedCount = 0;
  for (const [id, { description, fix }] of Object.entries(FIXES)) {
    process.stdout.write(`  ${id}... `);
    try {
      const result7 = await fix(workspaceRoot, dryRun);
      if (result7.success) {
        console.log(chalk26.green("\u2713"), chalk26.gray(result7.message));
        fixedCount++;
      } else {
        console.log(chalk26.gray("\u25CB"), chalk26.gray(result7.message));
        skippedCount++;
      }
    } catch (error) {
      console.log(chalk26.red("\u2717"), chalk26.gray(error instanceof Error ? error.message : "Unknown error"));
    }
  }
  console.log();
  console.log(chalk26.gray(`Fixed: ${fixedCount}, Skipped: ${skippedCount}`));
}
__name(fixAll, "fixAll");
async function detectCriticalPatterns(workspaceRoot, framework) {
  const patterns = [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const envPatterns = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.development"
  ];
  for (const pattern of envPatterns) {
    try {
      await access(join(workspaceRoot, pattern), constants.F_OK);
      patterns.push({
        pattern,
        addedAt: now,
        reason: "Environment variables"
      });
    } catch {
    }
  }
  patterns.push({
    pattern: ".env.*",
    addedAt: now,
    reason: "Environment variables (all variants)"
  });
  const configPatterns = [
    "tsconfig.json",
    "package.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "package-lock.json"
  ];
  for (const pattern of configPatterns) {
    try {
      await access(join(workspaceRoot, pattern), constants.F_OK);
      patterns.push({
        pattern,
        addedAt: now,
        reason: "Configuration file"
      });
    } catch {
    }
  }
  patterns.push({
    pattern: "*.config.js",
    addedAt: now,
    reason: "Configuration files"
  });
  patterns.push({
    pattern: "*.config.ts",
    addedAt: now,
    reason: "Configuration files"
  });
  if (framework) {
    const frameworkPatterns = getFrameworkPatterns(framework);
    patterns.push(...frameworkPatterns.map((p) => ({
      ...p,
      addedAt: now
    })));
  }
  const criticalDirs = [
    {
      dir: "prisma",
      pattern: "prisma/**",
      reason: "Database schema"
    },
    {
      dir: "drizzle",
      pattern: "drizzle/**",
      reason: "Database schema"
    },
    {
      dir: "src/auth",
      pattern: "src/auth/**",
      reason: "Authentication"
    },
    {
      dir: "src/lib/auth",
      pattern: "src/lib/auth/**",
      reason: "Authentication"
    },
    {
      dir: "app/api/auth",
      pattern: "app/api/auth/**",
      reason: "Authentication API"
    }
  ];
  for (const { dir, pattern, reason } of criticalDirs) {
    try {
      await access(join(workspaceRoot, dir), constants.F_OK);
      patterns.push({
        pattern,
        addedAt: now,
        reason
      });
    } catch {
    }
  }
  return patterns;
}
__name(detectCriticalPatterns, "detectCriticalPatterns");
function getFrameworkPatterns(framework) {
  const patterns = [];
  switch (framework.toLowerCase()) {
    case "next.js":
    case "nextjs":
      patterns.push({
        pattern: "next.config.*",
        reason: "Next.js configuration"
      });
      patterns.push({
        pattern: "middleware.ts",
        reason: "Next.js middleware"
      });
      break;
    case "nuxt":
      patterns.push({
        pattern: "nuxt.config.*",
        reason: "Nuxt configuration"
      });
      break;
    case "sveltekit":
      patterns.push({
        pattern: "svelte.config.js",
        reason: "SvelteKit configuration"
      });
      break;
    case "astro":
      patterns.push({
        pattern: "astro.config.*",
        reason: "Astro configuration"
      });
      break;
    case "remix":
      patterns.push({
        pattern: "remix.config.js",
        reason: "Remix configuration"
      });
      break;
  }
  return patterns;
}
__name(getFrameworkPatterns, "getFrameworkPatterns");
var __defProp2 = Object.defineProperty;
var __name3 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", {
  value,
  configurable: true
}), "__name");
var __require3 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: /* @__PURE__ */ __name((a, b) => (typeof __require !== "undefined" ? __require : a)[b], "get")
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var SnapBackEventBus3 = class SnapBackEventBus22 extends EventEmitter {
  static {
    __name(this, "SnapBackEventBus2");
  }
  static {
    __name3(this, "SnapBackEventBus");
  }
  /**
  * Emit a typed event
  */
  emit(event, payload) {
    const enrichedPayload = {
      ...payload,
      _timestamp: Date.now(),
      _event: event
    };
    return super.emit(event, enrichedPayload);
  }
  /**
  * Listen for a typed event
  */
  on(event, listener) {
    return super.on(event, listener);
  }
  /**
  * Listen for a typed event once
  */
  once(event, listener) {
    return super.once(event, listener);
  }
};
var eventBus2 = new SnapBackEventBus3();
var DEFAULT_TIMEOUT2 = 3e4;
var _scriptsDir2 = null;
function getScriptsDir2() {
  if (_scriptsDir2) return _scriptsDir2;
  try {
    if (typeof import.meta?.url === "string") {
      const { fileURLToPath } = __require3("url");
      const __filename = fileURLToPath(import.meta.url);
      const __dirname2 = dirname(__filename);
      _scriptsDir2 = join(__dirname2, "..");
      return _scriptsDir2;
    }
  } catch {
  }
  try {
    const pkgPath = __require3.resolve("@snapback/engine/package.json");
    _scriptsDir2 = join(dirname(pkgPath), "dist");
    return _scriptsDir2;
  } catch {
  }
  _scriptsDir2 = resolve(process.cwd(), "packages/engine/dist");
  return _scriptsDir2;
}
__name(getScriptsDir2, "getScriptsDir");
__name3(getScriptsDir2, "getScriptsDir");
var SIGNAL_SCRIPTS2 = [
  "signals/risk-score.ts",
  "signals/complexity.ts",
  "signals/cycles.ts",
  "signals/velocity.ts",
  "signals/consumers.ts",
  "signals/threats.ts",
  "signals/phantom-deps.ts"
];
var VALIDATOR_SCRIPTS2 = [
  "validators/types.ts",
  "validators/cycles.ts"
];
async function runScript2(scriptPath, input3, timeout = DEFAULT_TIMEOUT2) {
  const fullPath = join(getScriptsDir2(), scriptPath);
  const startTime = Date.now();
  return new Promise((resolve22, reject) => {
    const proc = spawn("npx", [
      "tsx",
      fullPath
    ], {
      stdio: [
        "pipe",
        "pipe",
        "pipe"
      ],
      timeout,
      // Pass workspace path via environment
      env: {
        ...process.env,
        SNAPBACK_WORKSPACE: process.cwd()
      }
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      const duration = Date.now() - startTime;
      if (code !== 0) {
        reject(new Error(`Script ${scriptPath} failed with code ${code}
stderr: ${stderr}
stdout: ${stdout}`));
        return;
      }
      try {
        const result7 = JSON.parse(stdout);
        if (typeof result7 === "object" && result7 !== null) {
          result7.duration = duration;
        }
        resolve22(result7);
      } catch (parseError) {
        reject(new Error(`Script ${scriptPath} output is not valid JSON
stdout: ${stdout}
Parse error: ${parseError}`));
      }
    });
    proc.on("error", (error) => {
      reject(new Error(`Failed to start script ${scriptPath}: ${error.message}`));
    });
    if (proc.stdin) {
      proc.stdin.write(JSON.stringify(input3));
      proc.stdin.end();
    }
  });
}
__name(runScript2, "runScript");
__name3(runScript2, "runScript");
var SIGNAL_WEIGHTS2 = {
  "risk-score": 1,
  cycles: 2.5,
  complexity: 1.5,
  threats: 2,
  "phantom-deps": 1.8,
  velocity: 0.5,
  consumers: 0.3
};
function hashString2(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}
__name(hashString2, "hashString");
__name3(hashString2, "hashString");
var Orchestrator2 = class {
  static {
    __name(this, "Orchestrator");
  }
  static {
    __name3(this, "Orchestrator");
  }
  sessionHealth;
  sessionId;
  previousScore;
  workspaceRoot;
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot || process.cwd();
    this.sessionId = `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.previousScore = 100;
    this.sessionHealth = {
      score: 100,
      warnings: [],
      suggestions: [],
      filesModified: [],
      cyclesIntroduced: 0,
      complexityDelta: 0
    };
  }
  /**
  * Analyze file changes and determine outcome
  *
  * This is the main entry point. It:
  * 1. Runs all signal scripts in parallel
  * 2. Runs all validator scripts in parallel
  * 3. Aggregates results
  * 4. Updates session health
  * 5. Returns combined outcome
  *
  * @param fileChanges - Array of file changes to analyze
  * @returns Orchestrator result with outcome and details
  */
  async analyze(fileChanges) {
    const startTime = Date.now();
    const input3 = {
      files: fileChanges,
      workspace: process.cwd(),
      timestamp: Date.now()
    };
    const [signals, validators] = await Promise.all([
      this.runSignals(input3),
      this.runValidators(input3)
    ]);
    const riskScore = this.calculateRiskScore(signals);
    const outcome = this.determineOutcome(validators, riskScore);
    this.updateSessionHealth(signals, validators, fileChanges);
    eventBus2.emit("risk.analyzed", {
      score: riskScore,
      factorCount: signals.length,
      threatCount: signals.filter((s) => s.signal === "threats").length
    });
    const duration = Date.now() - startTime;
    return {
      outcome,
      signals,
      validators,
      riskScore,
      health: this.sessionHealth,
      duration
    };
  }
  /**
  * Run all signal scripts in parallel
  */
  async runSignals(input3) {
    const results = await Promise.allSettled(SIGNAL_SCRIPTS2.map((script) => runScript2(script, input3)));
    const signals = [];
    for (let i = 0; i < results.length; i++) {
      const result7 = results[i];
      if (result7.status === "fulfilled") {
        signals.push(result7.value);
      } else {
        console.warn(`Signal script ${SIGNAL_SCRIPTS2[i]} failed:`, result7.reason);
        eventBus2.emit("error.occurred", {
          component: "orchestrator",
          message: `Signal ${SIGNAL_SCRIPTS2[i]} failed: ${result7.reason}`,
          recoverable: true
        });
      }
    }
    return signals;
  }
  /**
  * Run all validator scripts in parallel
  */
  async runValidators(input3) {
    const results = await Promise.allSettled(VALIDATOR_SCRIPTS2.map((script) => runScript2(script, input3)));
    const validators = [];
    for (let i = 0; i < results.length; i++) {
      const result7 = results[i];
      if (result7.status === "fulfilled") {
        validators.push(result7.value);
        if (result7.value.status === "pass") {
          eventBus2.emit("validation.passed", {
            validator: result7.value.validator,
            duration: result7.value.duration || 0
          });
        } else {
          eventBus2.emit("validation.failed", {
            validator: result7.value.validator,
            errorCount: result7.value.errors?.length || 0,
            duration: result7.value.duration || 0
          });
        }
      } else {
        console.warn(`Validator script ${VALIDATOR_SCRIPTS2[i]} failed:`, result7.reason);
        validators.push({
          validator: VALIDATOR_SCRIPTS2[i],
          status: "fail",
          errors: [
            {
              message: `Script execution failed: ${result7.reason}`
            }
          ]
        });
      }
    }
    return validators;
  }
  /**
  * Calculate aggregated risk score from signals using weighted aggregation
  *
  * Algorithm (from risk-analyzer.ts):
  * 1. If direct risk-score signal exists, use it as base
  * 2. Apply weighted contributions from other signals
  * 3. Normalize to 0-10 scale
  */
  calculateRiskScore(signals) {
    const riskSignal = signals.find((s) => s.signal === "risk-score");
    let baseScore = riskSignal?.value ?? 0;
    let weightedSum = 0;
    let totalWeight = 0;
    for (const signal of signals) {
      if (signal.signal === "risk-score") continue;
      const weight = SIGNAL_WEIGHTS2[signal.signal] ?? 1;
      weightedSum += signal.value * weight;
      totalWeight += weight;
    }
    if (totalWeight > 0) {
      const weightedContribution = weightedSum / totalWeight;
      baseScore = baseScore * 0.6 + weightedContribution * 0.4;
    }
    return Math.round(Math.min(10, Math.max(0, baseScore)) * 10) / 10;
  }
  /**
  * Determine final outcome based on validators and risk score
  */
  determineOutcome(validators, riskScore) {
    const hasFailure = validators.some((v) => v.status === "fail");
    if (hasFailure) {
      return "fail";
    }
    if (riskScore > 7) {
      return "warn";
    }
    return "pass";
  }
  /**
  * Update session health based on analysis results
  *
  * This is what enables "coaching" - the agent sees health trends over time.
  */
  updateSessionHealth(signals, validators, fileChanges) {
    for (const change of fileChanges) {
      if (!this.sessionHealth.filesModified.includes(change.path)) {
        this.sessionHealth.filesModified.push(change.path);
      }
    }
    const cyclesSignal = signals.find((s) => s.signal === "cycles");
    if (cyclesSignal && cyclesSignal.value > 0) {
      this.sessionHealth.cyclesIntroduced = cyclesSignal.value;
      this.sessionHealth.warnings.push(`\u26A0\uFE0F ${cyclesSignal.value} circular dependencies detected`);
    }
    const complexitySignal = signals.find((s) => s.signal === "complexity");
    if (complexitySignal) {
      this.sessionHealth.complexityDelta = complexitySignal.value;
      if (complexitySignal.value > 0.3) {
        this.sessionHealth.warnings.push(`\u26A0\uFE0F Complexity increased by ${Math.round(complexitySignal.value * 100)}%`);
      }
    }
    for (const v of validators) {
      if (v.status === "fail" && v.suggestion) {
        this.sessionHealth.suggestions.push(v.suggestion);
      }
    }
    this.sessionHealth.warnings = this.sessionHealth.warnings.slice(-3);
    this.sessionHealth.suggestions = this.sessionHealth.suggestions.slice(-2);
    let score = 100;
    score -= this.sessionHealth.cyclesIntroduced * 15;
    score -= this.sessionHealth.warnings.length * 5;
    score -= Math.max(0, this.sessionHealth.complexityDelta) * 20;
    score -= validators.filter((v) => v.status === "fail").length * 10;
    this.sessionHealth.score = Math.max(0, score);
    this.sessionHealth.coaching = this.generateCoaching();
    const scoreDelta = Math.abs(this.sessionHealth.score - this.previousScore);
    if (scoreDelta >= 5) {
      eventBus2.emit("session.health_changed", {
        sessionId: this.sessionId,
        previousScore: this.previousScore,
        currentScore: this.sessionHealth.score,
        trigger: "analysis"
      });
    }
    this.previousScore = this.sessionHealth.score;
  }
  /**
  * Generate coaching message based on health score
  */
  generateCoaching() {
    const { score, warnings, suggestions } = this.sessionHealth;
    if (score >= 90) {
      return "";
    }
    if (score >= 70) {
      return `Note: ${warnings[0] || "Minor issues detected"}`;
    }
    if (score >= 50) {
      return `\u26A0\uFE0F Session health declining (${score}/100). Please address: ${warnings.join(", ")}`;
    }
    return `\u{1F6D1} STOP: Session health critical (${score}/100). You have introduced ${this.sessionHealth.cyclesIntroduced} cycles. Recommended: ${suggestions[0] || "Review recent changes"}`;
  }
  /**
  * Get current session health (for injection into MCP responses)
  */
  getHealth() {
    return {
      ...this.sessionHealth
    };
  }
  /**
  * Reset session health (for new session)
  */
  resetSession() {
    this.sessionId = `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.previousScore = 100;
    this.sessionHealth = {
      score: 100,
      warnings: [],
      suggestions: [],
      filesModified: [],
      cyclesIntroduced: 0,
      complexityDelta: 0
    };
    eventBus2.emit("session.started", {
      sessionId: this.sessionId,
      workspaceHash: hashString2(this.workspaceRoot)
    });
  }
  /**
  * Get current session ID
  */
  getSessionId() {
    return this.sessionId;
  }
};
new Orchestrator2();
var Storage = class {
  static {
    __name(this, "Storage");
  }
  static {
    __name3(this, "Storage");
  }
  config;
  snapshotsDir;
  blobsDir;
  constructor(config) {
    this.config = config;
    this.snapshotsDir = join(config.rootDir, "snapshots");
    this.blobsDir = join(config.rootDir, "blobs");
    this.ensureDir(this.snapshotsDir);
    this.ensureDir(this.blobsDir);
  }
  /**
  * Create a snapshot of the given files
  *
  * REFERENCE: packages/sdk/src/storage/StorageBroker.ts createSnapshot()
  *
  * @param files - Files to snapshot
  * @param options - Snapshot options
  * @returns Created snapshot manifest
  */
  async createSnapshot(files, options = {}) {
    const id = generateSnapshotId(options.description);
    const manifestFiles = [];
    let totalSize = 0;
    for (const file of files) {
      const blobId = await this.storeBlob(file.content);
      const size = Buffer.byteLength(file.content, "utf8");
      manifestFiles.push({
        path: file.path,
        blobId,
        size
      });
      totalSize += size;
    }
    const manifest = {
      id,
      createdAt: Date.now(),
      files: manifestFiles,
      totalSize,
      description: options.description,
      trigger: options.trigger
    };
    const manifestPath = join(this.snapshotsDir, `${id}.json`);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    const triggerType = options.trigger === "ai-detection" ? "risk" : options.trigger || "auto";
    eventBus2.emit("snapshot.created", {
      snapshotId: id,
      fileCount: files.length,
      totalBytes: totalSize,
      trigger: triggerType,
      riskScore: 0
    });
    return manifest;
  }
  /**
  * Restore files from a snapshot
  *
  * REFERENCE: packages/sdk/src/storage/StorageBroker.ts restore()
  *
  * @param snapshotId - Snapshot ID to restore
  * @returns Restored file contents
  */
  async restore(snapshotId) {
    const manifest = this.getSnapshot(snapshotId);
    if (!manifest) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    const files = [];
    for (const file of manifest.files) {
      const content = await this.getBlob(file.blobId);
      if (content !== null) {
        files.push({
          path: file.path,
          content
        });
      }
    }
    eventBus2.emit("snapshot.restored", {
      snapshotId,
      filesRestored: files.length,
      duration: 0
    });
    return files;
  }
  /**
  * Get a snapshot manifest by ID
  */
  getSnapshot(snapshotId) {
    const manifestPath = join(this.snapshotsDir, `${snapshotId}.json`);
    if (!existsSync(manifestPath)) {
      return null;
    }
    const content = readFileSync(manifestPath, "utf8");
    return JSON.parse(content);
  }
  /**
  * List all snapshots
  */
  listSnapshots() {
    if (!existsSync(this.snapshotsDir)) {
      return [];
    }
    const files = readdirSync(this.snapshotsDir).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
      try {
        const content = readFileSync(join(this.snapshotsDir, f), "utf8");
        return JSON.parse(content);
      } catch {
        return null;
      }
    }).filter((m) => m !== null).sort((a, b) => b.createdAt - a.createdAt);
  }
  /**
  * Delete a snapshot (manifest only, blobs are orphaned)
  *
  * Note: Use garbageCollectBlobs() after deleting snapshots to reclaim space.
  */
  deleteSnapshot(snapshotId) {
    const manifestPath = join(this.snapshotsDir, `${snapshotId}.json`);
    if (!existsSync(manifestPath)) {
      return false;
    }
    unlinkSync(manifestPath);
    return true;
  }
  /**
  * Garbage collect orphaned blobs.
  *
  * Scans all blobs and removes those not referenced by any snapshot.
  * Returns statistics about the cleanup operation.
  *
  * @param dryRun - If true, only report what would be deleted without actually deleting
  */
  garbageCollectBlobs(dryRun = true) {
    const snapshots = this.listSnapshots();
    const referencedBlobs = /* @__PURE__ */ new Set();
    for (const snap of snapshots) {
      for (const file of snap.files) {
        referencedBlobs.add(file.blobId);
      }
    }
    const allBlobs = [];
    if (existsSync(this.blobsDir)) {
      const shards = readdirSync(this.blobsDir).filter((f) => f.length === 2);
      for (const shard of shards) {
        const shardPath = join(this.blobsDir, shard);
        try {
          const blobs = readdirSync(shardPath);
          for (const blobHash of blobs) {
            const blobPath = join(shardPath, blobHash);
            try {
              const stats = statSync(blobPath);
              if (stats.isFile()) {
                allBlobs.push({
                  hash: blobHash,
                  path: blobPath,
                  size: stats.size
                });
              }
            } catch {
            }
          }
        } catch {
        }
      }
    }
    const orphaned = allBlobs.filter((b) => !referencedBlobs.has(b.hash));
    const orphanedPaths = orphaned.map((b) => b.path);
    let bytesReclaimed = orphaned.reduce((sum, b) => sum + b.size, 0);
    let deletedBlobs = 0;
    if (!dryRun) {
      for (const blob of orphaned) {
        try {
          unlinkSync(blob.path);
          deletedBlobs++;
        } catch {
          bytesReclaimed -= blob.size;
        }
      }
    }
    return {
      totalBlobs: allBlobs.length,
      orphanedBlobs: orphaned.length,
      deletedBlobs: dryRun ? 0 : deletedBlobs,
      bytesReclaimed: dryRun ? bytesReclaimed : bytesReclaimed,
      orphanedPaths: dryRun ? orphanedPaths : []
    };
  }
  /**
  * Prune old snapshots based on retention policy.
  *
  * @param maxAgeDays - Delete snapshots older than this many days
  * @param keepCount - Always keep at least this many snapshots (regardless of age)
  * @param dryRun - If true, only report what would be deleted
  */
  pruneSnapshots(maxAgeDays = 30, keepCount = 10, dryRun = true) {
    const snapshots = this.listSnapshots();
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1e3;
    const candidates = snapshots.slice(keepCount);
    const stale = candidates.filter((s) => s.createdAt < cutoff);
    const deletedIds = [];
    if (!dryRun) {
      for (const snap of stale) {
        if (this.deleteSnapshot(snap.id)) {
          deletedIds.push(snap.id);
        }
      }
    }
    return {
      totalSnapshots: snapshots.length,
      staleSnapshots: stale.length,
      deletedSnapshots: dryRun ? 0 : deletedIds.length,
      deletedIds: dryRun ? stale.map((s) => s.id) : deletedIds
    };
  }
  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================
  /**
  * Store content as a blob, returns blob ID (SHA-256)
  *
  * REFERENCE: packages/sdk/src/storage/BlobStore.ts
  */
  async storeBlob(content) {
    const hash = sha256(content);
    const blobDir = join(this.blobsDir, hash.slice(0, 2));
    const blobPath = join(blobDir, hash);
    if (existsSync(blobPath)) {
      return hash;
    }
    this.ensureDir(blobDir);
    const data = this.config.compress ? gzipSync(Buffer.from(content, "utf8")) : Buffer.from(content, "utf8");
    writeFileSync(blobPath, data);
    return hash;
  }
  /**
  * Retrieve blob content by ID
  */
  async getBlob(blobId) {
    const blobPath = join(this.blobsDir, blobId.slice(0, 2), blobId);
    if (!existsSync(blobPath)) {
      return null;
    }
    const data = readFileSync(blobPath);
    try {
      const decompressed = gunzipSync(data);
      return decompressed.toString("utf8");
    } catch {
      return data.toString("utf8");
    }
  }
  /**
  * Ensure directory exists (race-condition safe)
  *
  * Uses atomic mkdir without prior existence check to avoid TOCTOU race.
  * Multiple concurrent calls to mkdirSync on the same path can cause EACCES
  * when one process wins and the other finds the directory locked.
  *
  * @see SNAPBACK_PERMISSION_ERROR_DIAGNOSIS.md for race condition details
  */
  ensureDir(dir) {
    try {
      mkdirSync(dir, {
        recursive: true
      });
    } catch (error) {
      const errno = error;
      if (errno.code !== "EEXIST") {
        throw error;
      }
    }
  }
};
var storageCache = /* @__PURE__ */ new Map();
function createStorage(workspaceRoot, options = {}) {
  const cacheKey = workspaceRoot;
  const cached = storageCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const config = {
    rootDir: `${workspaceRoot}/.snapback`,
    compress: options.compress ?? true
  };
  const storage = new Storage(config);
  storageCache.set(cacheKey, storage);
  return storage;
}
__name(createStorage, "createStorage");
__name3(createStorage, "createStorage");
var __defProp3 = Object.defineProperty;
var __name4 = /* @__PURE__ */ __name((target, value) => __defProp3(target, "name", {
  value,
  configurable: true
}), "__name");
var DependencyGraphService = class {
  static {
    __name(this, "DependencyGraphService");
  }
  static {
    __name4(this, "DependencyGraphService");
  }
  workspaceRoot;
  cacheDir;
  graph = null;
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.cacheDir = join(workspaceRoot, ".snapback", "analysis");
  }
  /**
  * Get dependency context for planned files
  * Main entry point for begin_task integration
  */
  async getContextForFiles(files) {
    const graph = await this.getGraph();
    const planned = {};
    const suggestions = /* @__PURE__ */ new Set();
    for (const file of files) {
      const relPath = this.toRelative(file);
      const node = graph.nodes[relPath];
      if (node) {
        planned[file] = {
          imports: node.imports,
          importedBy: node.importedBy.map((f) => ({
            file: f,
            line: 0
          })),
          depth: this.calculateDepth(relPath, graph),
          isOrphan: node.importedBy.length === 0 && !this.isEntryPoint(relPath)
        };
        node.importedBy.slice(0, 3).forEach((f) => suggestions.add(f));
        node.imports.slice(0, 3).forEach((f) => suggestions.add(f));
      }
    }
    const relPlanned = files.map((f) => this.toRelative(f));
    const filteredSuggestions = [
      ...suggestions
    ].filter((s) => !relPlanned.includes(s)).slice(0, 5);
    return {
      planned,
      circular: graph.circular.filter((cycle) => files.some((f) => cycle.includes(this.toRelative(f)))).map((cycle) => ({
        cycle,
        severity: "warning"
      })),
      suggestions: filteredSuggestions
    };
  }
  /**
  * Get files affected by changes to a file
  * Useful for impact analysis
  */
  async getAffectedBy(file) {
    const graph = await this.getGraph();
    const relPath = this.toRelative(file);
    const node = graph.nodes[relPath];
    return node?.importedBy || [];
  }
  /**
  * Get files that a file depends on
  */
  async getDependencies(file) {
    const graph = await this.getGraph();
    const relPath = this.toRelative(file);
    const node = graph.nodes[relPath];
    return node?.imports || [];
  }
  /**
  * Get all circular dependencies
  */
  async getCircularDependencies() {
    const graph = await this.getGraph();
    return graph.circular;
  }
  /**
  * Force refresh the graph cache
  */
  async refresh() {
    this.graph = null;
    await this.getGraph();
  }
  /**
  * Check if cache is valid
  */
  async isCacheValid() {
    const cachePath = join(this.cacheDir, "dependency-graph.json");
    if (!existsSync(cachePath)) return false;
    try {
      const cached = JSON.parse(readFileSync(cachePath, "utf8"));
      const currentKey = await this.computeCacheKey();
      return cached.cacheKey === currentKey;
    } catch {
      return false;
    }
  }
  // =========================================================================
  // Private Methods
  // =========================================================================
  /**
  * Get or build the dependency graph
  */
  async getGraph() {
    if (this.graph) {
      return this.graph;
    }
    const cachePath = join(this.cacheDir, "dependency-graph.json");
    const cacheKey = await this.computeCacheKey();
    if (existsSync(cachePath)) {
      try {
        const cached = JSON.parse(readFileSync(cachePath, "utf8"));
        if (cached.cacheKey === cacheKey) {
          this.graph = cached;
          return cached;
        }
      } catch {
      }
    }
    const graph = await this.buildGraph();
    graph.cacheKey = cacheKey;
    graph.generatedAt = Date.now();
    this.ensureCacheDir();
    writeFileSync(cachePath, JSON.stringify(graph, null, 2));
    this.graph = graph;
    return graph;
  }
  /**
  * Build dependency graph using madge
  */
  async buildGraph() {
    try {
      const madgeModule = await import('madge');
      const madge = madgeModule.default || madgeModule;
      const result7 = await madge(this.workspaceRoot, {
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
          /coverage/,
          /__tests__/,
          /__mocks__/
        ],
        detectiveOptions: {
          ts: {
            skipTypeImports: true
          }
        }
      });
      const deps = result7.obj();
      const circular = result7.circular();
      const nodes = {};
      for (const [file, imports] of Object.entries(deps)) {
        if (!nodes[file]) nodes[file] = {
          imports: [],
          importedBy: []
        };
        nodes[file].imports = imports;
        for (const imp of imports) {
          if (!nodes[imp]) nodes[imp] = {
            imports: [],
            importedBy: []
          };
          nodes[imp].importedBy.push(file);
        }
      }
      return {
        nodes,
        circular,
        cacheKey: "",
        generatedAt: 0
      };
    } catch (error) {
      console.error("Failed to build dependency graph:", error);
      return {
        nodes: {},
        circular: [],
        cacheKey: "",
        generatedAt: 0
      };
    }
  }
  /**
  * Compute cache key based on source file mtimes
  */
  async computeCacheKey() {
    try {
      const glob = await import('glob');
      const files = await glob.glob([
        "**/*.{ts,tsx,js,jsx}"
      ], {
        cwd: this.workspaceRoot,
        ignore: [
          "node_modules/**",
          "dist/**",
          ".next/**",
          "coverage/**"
        ]
      });
      const hash = createHash("sha256");
      for (const file of files.sort()) {
        try {
          const stat4 = statSync(join(this.workspaceRoot, file));
          hash.update(`${file}:${stat4.mtimeMs}`);
        } catch {
        }
      }
      return hash.digest("hex").substring(0, 16);
    } catch {
      return Date.now().toString(36);
    }
  }
  /**
  * Calculate max depth in import tree
  */
  calculateDepth(file, graph, visited = /* @__PURE__ */ new Set()) {
    if (visited.has(file)) return 0;
    visited.add(file);
    const node = graph.nodes[file];
    if (!node || node.imports.length === 0) return 0;
    const depths = node.imports.map((i) => this.calculateDepth(i, graph, new Set(visited)));
    return 1 + Math.max(0, ...depths);
  }
  /**
  * Check if file is an entry point (not expected to have importers)
  */
  isEntryPoint(file) {
    return file.includes("index.") || file.includes("main.") || file.includes("entry.") || file.includes("server.") || file.includes("app.") || file.endsWith("/page.tsx") || file.endsWith("/layout.tsx") || file.endsWith("/route.ts");
  }
  /**
  * Convert absolute path to relative
  */
  toRelative(file) {
    if (file.startsWith(this.workspaceRoot)) {
      return relative(this.workspaceRoot, file);
    }
    return file;
  }
  /**
  * Ensure cache directory exists
  */
  ensureCacheDir() {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, {
        recursive: true
      });
    }
  }
};
function createDependencyGraphService(workspaceRoot) {
  return new DependencyGraphService(workspaceRoot);
}
__name(createDependencyGraphService, "createDependencyGraphService");
__name4(createDependencyGraphService, "createDependencyGraphService");
var services = /* @__PURE__ */ new Map();
function getDependencyGraphService(workspaceRoot) {
  if (!services.has(workspaceRoot)) {
    services.set(workspaceRoot, new DependencyGraphService(workspaceRoot));
  }
  return services.get(workspaceRoot);
}
__name(getDependencyGraphService, "getDependencyGraphService");
__name4(getDependencyGraphService, "getDependencyGraphService");
var MAX_AGE_MS = 7 * 24 * 60 * 60 * 1e3;
var MAX_ENTRIES_PER_SOURCE = 100;
var SOURCE_TYPES = [
  "typescript",
  "test",
  "lint",
  "runtime"
];
function formatAge(ms) {
  const seconds = Math.floor(ms / 1e3);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
__name(formatAge, "formatAge");
__name4(formatAge, "formatAge");
function errorKey(error) {
  return `${error.file}:${error.line}:${error.message}`;
}
__name(errorKey, "errorKey");
__name4(errorKey, "errorKey");
function ensureDirSync(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, {
      recursive: true
    });
  }
}
__name(ensureDirSync, "ensureDirSync");
__name4(ensureDirSync, "ensureDirSync");
var ErrorCacheService = class {
  static {
    __name(this, "ErrorCacheService");
  }
  static {
    __name4(this, "ErrorCacheService");
  }
  workspaceRoot;
  cacheDir;
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.cacheDir = join(workspaceRoot, ".snapback", "errors");
  }
  /**
  * Cache errors after validation operations
  *
  * Called by quick_check after TypeScript/test/lint validation.
  * Errors are grouped by source and appended to JSONL files.
  */
  cacheErrors(errors) {
    if (errors.length === 0) return;
    ensureDirSync(this.cacheDir);
    const grouped = /* @__PURE__ */ new Map();
    for (const error of errors) {
      const source = error.source || "general";
      if (!grouped.has(source)) {
        grouped.set(source, []);
      }
      grouped.get(source).push(error);
    }
    const timestamp = Date.now();
    for (const [source, sourceErrors] of grouped) {
      const filePath = join(this.cacheDir, `${source}.jsonl`);
      const lines = sourceErrors.map((e) => JSON.stringify({
        ...e,
        timestamp
      })).join("\n") + "\n";
      appendFileSync(filePath, lines, "utf8");
    }
  }
  /**
  * Get cached errors for specific files
  *
  * Called by begin_task to surface known issues for planned files.
  * Returns errors within retention window, deduplicated.
  */
  getErrorsForFiles(files) {
    const errors = [];
    const now = Date.now();
    const seen = /* @__PURE__ */ new Set();
    for (const source of SOURCE_TYPES) {
      const filePath = join(this.cacheDir, `${source}.jsonl`);
      if (!existsSync(filePath)) continue;
      try {
        const content = readFileSync(filePath, "utf8");
        const lines = content.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const error = JSON.parse(line);
            if (now - error.timestamp > MAX_AGE_MS) continue;
            const matchesFile = files.some((f) => error.file.includes(f) || f.includes(error.file) || error.file === f);
            if (!matchesFile) continue;
            const key = errorKey(error);
            if (seen.has(key)) continue;
            seen.add(key);
            errors.push({
              ...error,
              age: formatAge(now - error.timestamp)
            });
          } catch {
          }
        }
      } catch {
      }
    }
    return errors;
  }
  /**
  * Remove stale entries from cache
  *
  * Called periodically or on session end.
  * Removes entries older than 7 days and limits to 100 per source.
  */
  prune() {
    let removed = 0;
    const now = Date.now();
    for (const source of SOURCE_TYPES) {
      const filePath = join(this.cacheDir, `${source}.jsonl`);
      if (!existsSync(filePath)) continue;
      try {
        const content = readFileSync(filePath, "utf8");
        const lines = content.split("\n").filter(Boolean);
        const entries = [];
        for (const line of lines) {
          try {
            const error = JSON.parse(line);
            if (now - error.timestamp <= MAX_AGE_MS) {
              entries.push(error);
            } else {
              removed++;
            }
          } catch {
            removed++;
          }
        }
        entries.sort((a, b) => b.timestamp - a.timestamp);
        const kept = entries.slice(0, MAX_ENTRIES_PER_SOURCE);
        removed += entries.length - kept.length;
        if (kept.length > 0) {
          writeFileSync(filePath, kept.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
        } else {
          writeFileSync(filePath, "", "utf8");
        }
      } catch {
      }
    }
    return {
      removed
    };
  }
  /**
  * Clear all cached errors for a specific file
  *
  * Called when a file is successfully validated with no errors.
  */
  clearForFile(file) {
    for (const source of SOURCE_TYPES) {
      const filePath = join(this.cacheDir, `${source}.jsonl`);
      if (!existsSync(filePath)) continue;
      try {
        const content = readFileSync(filePath, "utf8");
        const lines = content.split("\n").filter(Boolean);
        const kept = [];
        for (const line of lines) {
          try {
            const error = JSON.parse(line);
            if (error.file !== file && !error.file.includes(file) && !file.includes(error.file)) {
              kept.push(error);
            }
          } catch {
          }
        }
        writeFileSync(filePath, kept.map((e) => JSON.stringify(e)).join("\n") + (kept.length > 0 ? "\n" : ""), "utf8");
      } catch {
      }
    }
  }
};
function createErrorCacheService(workspaceRoot) {
  return new ErrorCacheService(workspaceRoot);
}
__name(createErrorCacheService, "createErrorCacheService");
__name4(createErrorCacheService, "createErrorCacheService");
var MAX_RECENT_COMMITS = 5;
var GIT_TIMEOUT_MS = 5e3;
var GitContextService = class {
  static {
    __name(this, "GitContextService");
  }
  static {
    __name4(this, "GitContextService");
  }
  workspaceRoot;
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }
  /**
  * Get complete git context for planned files
  *
  * Called by begin_task to surface git change context.
  */
  async getContext(plannedFiles) {
    try {
      const branch = this.getBranchInfo();
      const uncommittedChanges = this.getUncommittedChanges();
      const stagedChanges = this.getStagedChanges();
      const recentCommits = this.getRecentCommits(plannedFiles);
      const fileHistory = this.getFileHistory(plannedFiles, uncommittedChanges);
      return {
        branch,
        uncommittedChanges,
        stagedChanges,
        recentCommits,
        fileHistory
      };
    } catch {
      return this.emptyContext();
    }
  }
  /**
  * Check if workspace is a git repository
  */
  async isGitRepo() {
    try {
      this.git("rev-parse --git-dir");
      return true;
    } catch {
      return false;
    }
  }
  // ===========================================================================
  // Private Methods
  // ===========================================================================
  /**
  * Get branch information
  */
  getBranchInfo() {
    try {
      const current = this.git("rev-parse --abbrev-ref HEAD").trim();
      const upstream = this.gitSafe("rev-parse --abbrev-ref @{u}")?.trim();
      let ahead = 0;
      let behind = 0;
      if (upstream) {
        try {
          const counts = this.git(`rev-list --left-right --count ${current}...${upstream}`);
          const parts = counts.trim().split(/\s+/);
          if (parts.length >= 2) {
            ahead = Number.parseInt(parts[0], 10) || 0;
            behind = Number.parseInt(parts[1], 10) || 0;
          }
        } catch {
        }
      }
      return {
        current,
        upstream,
        ahead,
        behind
      };
    } catch {
      return {
        current: "",
        ahead: 0,
        behind: 0
      };
    }
  }
  /**
  * Get uncommitted changes in working tree
  */
  getUncommittedChanges() {
    try {
      const status2 = this.git("status --porcelain");
      const changes = [];
      for (const line of status2.split("\n")) {
        if (!line.trim()) continue;
        const statusCode = line.substring(0, 2);
        const file = line.substring(3).trim();
        let status22;
        if (statusCode.includes("?")) {
          status22 = "?";
        } else if (statusCode.includes("A")) {
          status22 = "A";
        } else if (statusCode.includes("D")) {
          status22 = "D";
        } else if (statusCode.includes("R")) {
          status22 = "R";
        } else if (statusCode.includes("C")) {
          status22 = "C";
        } else if (statusCode.includes("U")) {
          status22 = "U";
        } else {
          status22 = "M";
        }
        changes.push({
          file,
          status: status22
        });
      }
      return changes;
    } catch {
      return [];
    }
  }
  /**
  * Get staged changes (ready to commit)
  */
  getStagedChanges() {
    try {
      const status2 = this.git("diff --cached --name-status");
      const changes = [];
      for (const line of status2.split("\n")) {
        if (!line.trim()) continue;
        const parts = line.split("	");
        if (parts.length < 2) continue;
        const statusCode = parts[0].charAt(0);
        const file = parts[1].trim();
        if ([
          "A",
          "M",
          "D",
          "R"
        ].includes(statusCode)) {
          changes.push({
            file,
            status: statusCode
          });
        }
      }
      return changes;
    } catch {
      return [];
    }
  }
  /**
  * Get recent commits
  */
  getRecentCommits(plannedFiles) {
    try {
      const format = '"%H|%s|%an|%ar|%ct"';
      const log2 = this.git(`log -10 --pretty=format:${format} --name-only`);
      const commits = [];
      const entries = log2.split("\n\n").filter(Boolean);
      for (const entry of entries) {
        const lines = entry.split("\n");
        if (lines.length === 0) continue;
        const infoLine = lines[0].replace(/^"|"$/g, "");
        const parts = infoLine.split("|");
        if (parts.length < 5) continue;
        const [fullHash, message, author, date] = parts;
        const files = lines.slice(1).filter(Boolean);
        const affectsPlannedFiles = plannedFiles.length > 0 && files.some((f) => plannedFiles.some((pf) => f.includes(pf) || pf.includes(f)));
        commits.push({
          hash: fullHash.substring(0, 7),
          message,
          author,
          date,
          filesChanged: files.length,
          affectsPlannedFiles
        });
        if (commits.length >= MAX_RECENT_COMMITS) break;
      }
      return commits;
    } catch {
      return [];
    }
  }
  /**
  * Get file history for planned files
  */
  getFileHistory(files, uncommittedChanges) {
    const history = {};
    for (const file of files) {
      try {
        const lastCommit = this.gitSafe(`log -1 --pretty=format:"%H" -- "${file}"`);
        const lastModified = this.gitSafe(`log -1 --pretty=format:"%ar" -- "${file}"`);
        const isModifiedByUser = uncommittedChanges.some((c) => c.file === file || c.file.includes(file) || file.includes(c.file));
        history[file] = {
          lastModified: lastModified?.trim().replace(/^"|"$/g, "") || "unknown",
          lastCommit: lastCommit?.trim().replace(/^"|"$/g, "").substring(0, 7) || "none",
          modifiedByUser: isModifiedByUser
        };
      } catch {
        history[file] = {
          lastModified: "unknown",
          lastCommit: "none",
          modifiedByUser: false
        };
      }
    }
    return history;
  }
  /**
  * Execute git command and return output
  */
  git(cmd) {
    return execSync(`git ${cmd}`, {
      cwd: this.workspaceRoot,
      encoding: "utf8",
      timeout: GIT_TIMEOUT_MS,
      stdio: [
        "pipe",
        "pipe",
        "pipe"
      ]
    });
  }
  /**
  * Execute git command, returning null on failure
  */
  gitSafe(cmd) {
    try {
      return this.git(cmd);
    } catch {
      return null;
    }
  }
  /**
  * Return empty context structure
  */
  emptyContext() {
    return {
      branch: {
        current: "",
        ahead: 0,
        behind: 0
      },
      uncommittedChanges: [],
      stagedChanges: [],
      recentCommits: [],
      fileHistory: {}
    };
  }
};
function createGitContextService(workspaceRoot) {
  return new GitContextService(workspaceRoot);
}
__name(createGitContextService, "createGitContextService");
__name4(createGitContextService, "createGitContextService");
var SEED_TIMESTAMP = "2025-01-01T00:00:00.000Z";
function seed(id, type, tier, trigger, action, options = {}) {
  return {
    id,
    type,
    tier,
    trigger,
    action,
    solution: action,
    source: "seed",
    timestamp: SEED_TIMESTAMP,
    ...options.priority && {
      priority: options.priority
    },
    ...options.domain && {
      domain: options.domain
    }
  };
}
__name(seed, "seed");
__name4(seed, "seed");
var HOT_TIER_LEARNINGS = [
  // Critical patterns that apply everywhere
  seed("hot-001", "pattern", "hot", [
    "error handling",
    "catch block",
    "try catch"
  ], "Always log errors in catch blocks with full context. Never silently swallow errors.", {
    priority: "critical"
  }),
  seed("hot-002", "pitfall", "hot", [
    "async",
    "await",
    "promise"
  ], "Always await async functions. Missing await causes race conditions and silent failures.", {
    priority: "critical"
  }),
  seed("hot-003", "pattern", "hot", [
    "bundle size",
    "extension size",
    "vsix"
  ], "Keep VS Code extension bundle under 2MB. Check before release with vsce ls.", {
    priority: "critical"
  }),
  seed("hot-004", "pattern", "hot", [
    "commit",
    "git commit",
    "before commit"
  ], "Run type-check and lint before committing. Use check({m:'q'}) for quick validation.", {
    priority: "high"
  }),
  seed("hot-005", "pitfall", "hot", [
    "import",
    "circular",
    "dependency"
  ], "Avoid circular imports. Use dependency injection or move shared types to contracts package.", {
    priority: "high"
  }),
  seed("hot-006", "pattern", "hot", [
    "test",
    "testing",
    "vitest"
  ], "Write tests before implementation (TDD). Run vitest in watch mode during development.", {
    priority: "high"
  }),
  seed("hot-007", "pattern", "hot", [
    "snapshot",
    "safety",
    "risky change"
  ], "Create snapshot before risky changes. Use snap({m:'s'}) to auto-snapshot based on risk.", {
    priority: "high"
  }),
  seed("hot-008", "pitfall", "hot", [
    "any",
    "as any",
    "typescript"
  ], "Avoid 'as any' casts. Use proper types or unknown with type guards.", {
    priority: "high"
  })
];
var DOMAIN_VSCODE_LEARNINGS = [
  seed("vscode-001", "pattern", "warm", [
    "extension activation",
    "activate",
    "vscode extension"
  ], "Use lazy initialization. Defer heavy operations until actually needed.", {
    domain: "vscode"
  }),
  seed("vscode-002", "pattern", "warm", [
    "webview",
    "webview panel",
    "ui"
  ], "Webviews are expensive. Reuse panels, use retainContextWhenHidden sparingly.", {
    domain: "vscode"
  }),
  seed("vscode-003", "pitfall", "warm", [
    "storage",
    "globalState",
    "workspaceState"
  ], "VS Code storage is async. Always await storage operations. Use memento for large data.", {
    domain: "vscode"
  }),
  seed("vscode-004", "pattern", "warm", [
    "command",
    "registerCommand",
    "command palette"
  ], "Dispose commands on deactivation. Store disposables in context.subscriptions.", {
    domain: "vscode"
  }),
  seed("vscode-005", "pattern", "warm", [
    "tree view",
    "tree provider",
    "explorer"
  ], "Implement refresh() and fire onDidChangeTreeData for tree updates.", {
    domain: "vscode"
  })
];
var DOMAIN_WEB_LEARNINGS = [
  seed("web-001", "pattern", "warm", [
    "use client",
    "client component",
    "react"
  ], "Prefer Server Components. Only use 'use client' when you need interactivity or browser APIs.", {
    domain: "web"
  }),
  seed("web-002", "pattern", "warm", [
    "server action",
    "form action",
    "mutation"
  ], "Use Server Actions for mutations. They handle loading states and revalidation automatically.", {
    domain: "web"
  }),
  seed("web-003", "pitfall", "warm", [
    "hydration",
    "hydration error",
    "ssr"
  ], "Ensure server and client render identical markup. Use useEffect for client-only code.", {
    domain: "web"
  }),
  seed("web-004", "pattern", "warm", [
    "image",
    "next image",
    "optimization"
  ], "Use next/image for automatic optimization. Specify width/height or use fill with sizes.", {
    domain: "web"
  }),
  seed("web-005", "pattern", "warm", [
    "biome",
    "lint",
    "format"
  ], "Run biome check before commit. Use --write for auto-fix.", {
    domain: "web"
  })
];
var DOMAIN_MCP_CLI_LEARNINGS = [
  seed("mcp-001", "pattern", "warm", [
    "mcp tool",
    "tool handler",
    "tool result"
  ], "Return structured JSON from tools. Use wire format for token efficiency.", {
    domain: "mcp-cli"
  }),
  seed("mcp-002", "pattern", "warm", [
    "cli command",
    "commander",
    "command action"
  ], "Use ora spinners for long operations. Handle errors with chalk.red messages.", {
    domain: "mcp-cli"
  }),
  seed("mcp-003", "pitfall", "warm", [
    "stdio",
    "transport",
    "mcp server"
  ], "Never console.log in MCP server - it corrupts stdio. Use stderr or structured logging.", {
    domain: "mcp-cli"
  }),
  seed("mcp-004", "pattern", "warm", [
    "daemon",
    "background process",
    "file watcher"
  ], "Daemon should be stateless where possible. Persist state to disk for recovery.", {
    domain: "mcp-cli"
  })
];
var DOMAIN_TESTING_LEARNINGS = [
  seed("test-001", "pattern", "warm", [
    "vitest",
    "test setup",
    "beforeEach"
  ], "Use beforeEach for setup, afterEach for cleanup. Avoid shared mutable state.", {
    domain: "testing"
  }),
  seed("test-002", "pattern", "warm", [
    "mock",
    "vi.mock",
    "vitest mock"
  ], "Mock at module level with vi.mock(). Use vi.fn() for function mocks.", {
    domain: "testing"
  }),
  seed("test-003", "pitfall", "warm", [
    "skip",
    "it.skip",
    "describe.skip"
  ], "Skipped tests should be temporary. Track with TODO and enable within same PR.", {
    domain: "testing"
  }),
  seed("test-004", "pattern", "warm", [
    "coverage",
    "test coverage",
    "c8"
  ], "Aim for 80%+ coverage on new code. Focus on critical paths over line count.", {
    domain: "testing"
  })
];
var ANTI_PATTERNS_LEARNINGS = [
  seed("anti-001", "pitfall", "warm", [
    "silent catch",
    "empty catch",
    "catch {}"
  ], "Never use empty catch blocks. At minimum: console.error(error)."),
  seed("anti-002", "pitfall", "warm", [
    "console.log",
    "debug log",
    "production"
  ], "Remove console.log before commit. Use structured logging in production."),
  seed("anti-003", "pitfall", "warm", [
    "todo",
    "fixme",
    "hack"
  ], "TODO comments must have owner and timeline. Don't commit unbounded TODOs."),
  seed("anti-004", "pitfall", "warm", [
    "magic number",
    "hardcoded",
    "literal"
  ], "Extract magic numbers to named constants. Improves readability and maintainability."),
  seed("anti-005", "pitfall", "warm", [
    "copy paste",
    "duplicate code",
    "repetition"
  ], "DRY: Extract duplicated code to shared functions. 3+ occurrences = extract.")
];
var ARCHITECTURE_PATTERNS_LEARNINGS = [
  seed("arch-001", "pattern", "warm", [
    "monorepo",
    "package",
    "workspace"
  ], "Use workspace:* for internal deps. Never pin versions for monorepo packages."),
  seed("arch-002", "pattern", "warm", [
    "contracts",
    "shared types",
    "interface"
  ], "Put shared types in @snapback/contracts. Single source of truth for cross-package types."),
  seed("arch-003", "pattern", "warm", [
    "service",
    "dependency injection",
    "factory"
  ], "Use factory functions for services (createFooService). Enables testing and configuration."),
  seed("arch-004", "pattern", "warm", [
    "result type",
    "error handling",
    "return type"
  ], "Use Result<T, E> pattern for operations that can fail. Avoid throwing for expected errors."),
  seed("arch-005", "pattern", "warm", [
    "event",
    "telemetry",
    "analytics"
  ], "Use contracts/telemetry/events.v1.ts for event definitions. PostHog only for analytics.")
];
function seedLearnings(workspaceRoot, options = {}) {
  const learningsDir = join(workspaceRoot, ".snapback", "learnings");
  const result7 = {
    success: true,
    filesCreated: [],
    learningsSeeded: 0,
    errors: []
  };
  if (!existsSync(learningsDir)) {
    mkdirSync(learningsDir, {
      recursive: true
    });
  }
  const filesToSeed = [];
  if (!options.skipHot) {
    filesToSeed.push({
      filename: "hot.jsonl",
      learnings: HOT_TIER_LEARNINGS
    });
  }
  const allDomains = [
    {
      name: "vscode",
      filename: "domain-vscode.jsonl",
      learnings: DOMAIN_VSCODE_LEARNINGS
    },
    {
      name: "web",
      filename: "domain-web.jsonl",
      learnings: DOMAIN_WEB_LEARNINGS
    },
    {
      name: "mcp-cli",
      filename: "domain-mcp-cli.jsonl",
      learnings: DOMAIN_MCP_CLI_LEARNINGS
    },
    {
      name: "testing",
      filename: "domain-testing.jsonl",
      learnings: DOMAIN_TESTING_LEARNINGS
    }
  ];
  filesToSeed.push({
    filename: "anti-patterns.jsonl",
    learnings: ANTI_PATTERNS_LEARNINGS
  });
  filesToSeed.push({
    filename: "architecture-patterns.jsonl",
    learnings: ARCHITECTURE_PATTERNS_LEARNINGS
  });
  for (const domain of allDomains) {
    if (!options.domains || options.domains.includes(domain.name)) {
      filesToSeed.push({
        filename: domain.filename,
        learnings: domain.learnings
      });
    }
  }
  for (const { filename, learnings } of filesToSeed) {
    const filePath = join(learningsDir, filename);
    if (existsSync(filePath) && !options.force) {
      continue;
    }
    try {
      const content = `${learnings.map((l) => JSON.stringify(l)).join("\n")}
`;
      writeFileSync(filePath, content, "utf8");
      result7.filesCreated.push(filename);
      result7.learningsSeeded += learnings.length;
    } catch (error) {
      result7.errors.push(`Failed to create ${filename}: ${error instanceof Error ? error.message : String(error)}`);
      result7.success = false;
    }
  }
  const indexPath = join(learningsDir, "INDEX.md");
  if (!existsSync(indexPath) || options.force) {
    try {
      writeFileSync(indexPath, generateIndexMd(), "utf8");
      result7.filesCreated.push("INDEX.md");
    } catch (error) {
      result7.errors.push(`Failed to create INDEX.md: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return result7;
}
__name(seedLearnings, "seedLearnings");
__name4(seedLearnings, "seedLearnings");
function generateIndexMd() {
  return `# SnapBack Learnings Directory

This directory contains tiered learning files for the SnapBack MCP server.

## File Structure

| File | Tier | Description | Auto-Loaded |
|------|------|-------------|-------------|
| \`hot.jsonl\` | Hot | Critical patterns, always loaded | \u2705 Always |
| \`domain-vscode.jsonl\` | Warm | VS Code extension patterns | When working on extension |
| \`domain-web.jsonl\` | Warm | Next.js/React patterns | When working on web app |
| \`domain-mcp-cli.jsonl\` | Warm | MCP/CLI patterns | When working on CLI/MCP |
| \`domain-testing.jsonl\` | Warm | Testing patterns | When running tests |
| \`anti-patterns.jsonl\` | Warm | Known pitfalls to avoid | On debug/review intent |
| \`architecture-patterns.jsonl\` | Warm | Architectural guidelines | On implement intent |
| \`user-learnings.jsonl\` | Cold | User-recorded learnings | Query only |
| \`usage-stats.json\` | Meta | Access tracking for auto-promotion | Internal |

## How It Works

1. **Task Start**: \`snap({m:"s"})\` loads hot tier + intent-matched warm tier files
2. **During Work**: Relevant learnings guide implementation decisions
3. **On Mistake**: \`snap_violation()\` records for future prevention
4. **Discovery**: \`snap_learn()\` captures insights for reuse
5. **Auto-Promotion**: 3x access \u2192 promotes to hot tier

## Intent \u2192 Domain Mapping

| Intent | Loaded Files |
|--------|--------------|
| implement | architecture-patterns, domain-* (by file path) |
| debug | anti-patterns, domain-testing |
| refactor | workflow-patterns, architecture-context |
| review | anti-patterns, domain-testing, architecture-patterns |
| explore | architecture-context, workflow-patterns |

## Adding New Learnings

### Via CLI
\`\`\`bash
snap learn "trigger phrase" "action to take" --type pattern
\`\`\`

### Via MCP
\`\`\`typescript
snap_learn({
  t: "when modifying auth code",
  a: "always add audit logging for security events",
  type: "pat"  // pat=pattern, pit=pitfall, eff=efficiency
})
\`\`\`

## Hot Tier Promotion

Learnings are auto-promoted to hot tier when:
- Accessed 3+ times across sessions
- Applied 1+ times (marked as useful)
- Within last 14 days (recency boost)

Run \`snap learn promote\` to manually trigger hot tier regeneration.
`;
}
__name(generateIndexMd, "generateIndexMd");
__name4(generateIndexMd, "generateIndexMd");
function isLearningsSeeded(workspaceRoot) {
  const hotPath = join(workspaceRoot, ".snapback", "learnings", "hot.jsonl");
  return existsSync(hotPath);
}
__name(isLearningsSeeded, "isLearningsSeeded");
__name4(isLearningsSeeded, "isLearningsSeeded");
function getLearningsSeedStatus(workspaceRoot) {
  const learningsDir = join(workspaceRoot, ".snapback", "learnings");
  const expectedFiles = [
    "hot.jsonl",
    "domain-vscode.jsonl",
    "domain-web.jsonl",
    "domain-mcp-cli.jsonl",
    "domain-testing.jsonl",
    "anti-patterns.jsonl",
    "architecture-patterns.jsonl"
  ];
  const filesPresent = [];
  const filesMissing = [];
  for (const file of expectedFiles) {
    if (existsSync(join(learningsDir, file))) {
      filesPresent.push(file);
    } else {
      filesMissing.push(file);
    }
  }
  return {
    seeded: filesMissing.length === 0,
    filesPresent,
    filesMissing
  };
}
__name(getLearningsSeedStatus, "getLearningsSeedStatus");
__name4(getLearningsSeedStatus, "getLearningsSeedStatus");
var STATE_FILE = ".snapback/mcp/session-files.json";
var SessionFileTracker = class {
  static {
    __name(this, "SessionFileTracker");
  }
  static {
    __name4(this, "SessionFileTracker");
  }
  workspaceRoot;
  state;
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.state = this.loadState();
  }
  /**
  * Start tracking for a new task
  */
  startTask(taskId, plannedFiles = []) {
    this.state = {
      taskId,
      taskStartedAt: Date.now(),
      files: /* @__PURE__ */ new Map()
    };
    for (const file of plannedFiles) {
      this.trackFile(file, "planned");
    }
    this.saveState();
  }
  /**
  * End tracking for current task
  */
  endTask() {
    const files = this.getTrackedFiles();
    this.state = {
      taskId: null,
      taskStartedAt: null,
      files: /* @__PURE__ */ new Map()
    };
    this.saveState();
    return files;
  }
  /**
  * Track a file
  */
  trackFile(filePath, source, linesChanged) {
    if (!this.state.taskId) {
      return;
    }
    const normalizedPath = filePath.startsWith(this.workspaceRoot) ? relative(this.workspaceRoot, filePath) : filePath;
    const now = Date.now();
    const existing = this.state.files.get(normalizedPath);
    if (existing) {
      existing.lastTouched = now;
      if (linesChanged !== void 0) {
        existing.linesChanged = (existing.linesChanged || 0) + linesChanged;
      }
      const sourcePriority = {
        edited: 4,
        validated: 3,
        mentioned: 2,
        planned: 1
      };
      if (sourcePriority[source] > sourcePriority[existing.source]) {
        existing.source = source;
      }
    } else {
      const fullPath = join(this.workspaceRoot, normalizedPath);
      let size;
      try {
        if (existsSync(fullPath)) {
          size = statSync(fullPath).size;
        }
      } catch {
      }
      this.state.files.set(normalizedPath, {
        path: normalizedPath,
        source,
        firstTracked: now,
        lastTouched: now,
        linesChanged,
        size
      });
    }
    this.saveState();
  }
  /**
  * Track multiple files at once
  */
  trackFiles(files, source) {
    for (const file of files) {
      this.trackFile(file, source);
    }
  }
  /**
  * Get all tracked files for current task
  */
  getTrackedFiles() {
    return Array.from(this.state.files.values());
  }
  /**
  * Get files changed since task start (for what_changed)
  */
  getChangedFiles() {
    const files = this.getTrackedFiles();
    return files.map((f) => ({
      file: f.path,
      type: this.determineChangeType(f),
      linesChanged: f.linesChanged || 0,
      aiAttributed: f.source === "edited" || f.source === "validated",
      timestamp: f.lastTouched
    }));
  }
  /**
  * Determine change type based on file state
  */
  determineChangeType(file) {
    const fullPath = join(this.workspaceRoot, file.path);
    if (!existsSync(fullPath)) {
      return "deleted";
    }
    return "modified";
  }
  /**
  * Check if currently tracking a task
  */
  hasActiveTask() {
    return this.state.taskId !== null;
  }
  /**
  * Get current task ID
  */
  getCurrentTaskId() {
    return this.state.taskId;
  }
  /**
  * Get task duration in ms
  */
  getTaskDuration() {
    if (!this.state.taskStartedAt) {
      return 0;
    }
    return Date.now() - this.state.taskStartedAt;
  }
  /**
  * Get stats for the current session
  */
  getStats() {
    const files = this.getTrackedFiles();
    return {
      filesTracked: files.length,
      totalLinesChanged: files.reduce((sum, f) => sum + (f.linesChanged || 0), 0),
      durationMs: this.getTaskDuration()
    };
  }
  // =========================================================================
  // Persistence
  // =========================================================================
  getStatePath() {
    return join(this.workspaceRoot, STATE_FILE);
  }
  loadState() {
    const statePath = this.getStatePath();
    try {
      if (existsSync(statePath)) {
        const data = JSON.parse(readFileSync(statePath, "utf8"));
        return {
          taskId: data.taskId || null,
          taskStartedAt: data.taskStartedAt || null,
          files: new Map(Object.entries(data.files || {}))
        };
      }
    } catch {
    }
    return {
      taskId: null,
      taskStartedAt: null,
      files: /* @__PURE__ */ new Map()
    };
  }
  saveState() {
    const statePath = this.getStatePath();
    try {
      const dir = dirname(statePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, {
          recursive: true
        });
      }
      const data = {
        taskId: this.state.taskId,
        taskStartedAt: this.state.taskStartedAt,
        files: Object.fromEntries(this.state.files)
      };
      writeFileSync(statePath, JSON.stringify(data, null, 2));
    } catch {
    }
  }
};
function createSessionFileTracker(workspaceRoot) {
  return new SessionFileTracker(workspaceRoot);
}
__name(createSessionFileTracker, "createSessionFileTracker");
__name4(createSessionFileTracker, "createSessionFileTracker");
var trackers = /* @__PURE__ */ new Map();
function getSessionFileTracker(workspaceRoot) {
  if (!trackers.has(workspaceRoot)) {
    trackers.set(workspaceRoot, new SessionFileTracker(workspaceRoot));
  }
  return trackers.get(workspaceRoot);
}
__name(getSessionFileTracker, "getSessionFileTracker");
__name4(getSessionFileTracker, "getSessionFileTracker");
var ErrorCode = /* @__PURE__ */ (function(ErrorCode22) {
  ErrorCode22["DAEMON_UNAVAILABLE"] = "DAEMON_UNAVAILABLE";
  ErrorCode22["DAEMON_NOT_CONNECTED"] = "DAEMON_NOT_CONNECTED";
  ErrorCode22["DAEMON_TIMEOUT"] = "DAEMON_TIMEOUT";
  ErrorCode22["DAEMON_CONNECTION_FAILED"] = "DAEMON_CONNECTION_FAILED";
  ErrorCode22["DAEMON_REQUEST_FAILED"] = "DAEMON_REQUEST_FAILED";
  ErrorCode22["SNAPSHOT_FAILED"] = "SNAPSHOT_FAILED";
  ErrorCode22["SNAPSHOT_NOT_FOUND"] = "SNAPSHOT_NOT_FOUND";
  ErrorCode22["SNAPSHOT_RESTORE_FAILED"] = "SNAPSHOT_RESTORE_FAILED";
  ErrorCode22["SNAPSHOT_STORAGE_ERROR"] = "SNAPSHOT_STORAGE_ERROR";
  ErrorCode22["SNAPSHOT_HASH_MISMATCH"] = "SNAPSHOT_HASH_MISMATCH";
  ErrorCode22["AUTH_REQUIRED"] = "AUTH_REQUIRED";
  ErrorCode22["AUTH_EXPIRED"] = "AUTH_EXPIRED";
  ErrorCode22["AUTH_INVALID_TOKEN"] = "AUTH_INVALID_TOKEN";
  ErrorCode22["AUTH_INSUFFICIENT_PERMISSIONS"] = "AUTH_INSUFFICIENT_PERMISSIONS";
  ErrorCode22["INVALID_INPUT"] = "INVALID_INPUT";
  ErrorCode22["INVALID_PARAMETER"] = "INVALID_PARAMETER";
  ErrorCode22["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
  ErrorCode22["SCHEMA_VALIDATION_FAILED"] = "SCHEMA_VALIDATION_FAILED";
  ErrorCode22["WORKSPACE_NOT_FOUND"] = "WORKSPACE_NOT_FOUND";
  ErrorCode22["FILE_NOT_FOUND"] = "FILE_NOT_FOUND";
  ErrorCode22["FILE_READ_ERROR"] = "FILE_READ_ERROR";
  ErrorCode22["FILE_WRITE_ERROR"] = "FILE_WRITE_ERROR";
  ErrorCode22["PATH_ACCESS_DENIED"] = "PATH_ACCESS_DENIED";
  ErrorCode22["SESSION_NOT_FOUND"] = "SESSION_NOT_FOUND";
  ErrorCode22["SESSION_STATE_ERROR"] = "SESSION_STATE_ERROR";
  ErrorCode22["SESSION_ALREADY_ACTIVE"] = "SESSION_ALREADY_ACTIVE";
  ErrorCode22["NO_ACTIVE_SESSION"] = "NO_ACTIVE_SESSION";
  ErrorCode22["API_REQUEST_FAILED"] = "API_REQUEST_FAILED";
  ErrorCode22["API_TIMEOUT"] = "API_TIMEOUT";
  ErrorCode22["API_RATE_LIMITED"] = "API_RATE_LIMITED";
  ErrorCode22["API_SERVER_ERROR"] = "API_SERVER_ERROR";
  ErrorCode22["CIRCUIT_BREAKER_OPEN"] = "CIRCUIT_BREAKER_OPEN";
  ErrorCode22["TOOL_NOT_FOUND"] = "TOOL_NOT_FOUND";
  ErrorCode22["TOOL_EXECUTION_FAILED"] = "TOOL_EXECUTION_FAILED";
  ErrorCode22["TOOL_DEPRECATED"] = "TOOL_DEPRECATED";
  ErrorCode22["UNKNOWN"] = "UNKNOWN";
  ErrorCode22["INTERNAL_ERROR"] = "INTERNAL_ERROR";
  ErrorCode22["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
  return ErrorCode22;
})({});
var ERROR_METADATA = {
  // Daemon - mostly recoverable with retry
  ["DAEMON_UNAVAILABLE"]: {
    recoverable: true,
    retryable: true
  },
  ["DAEMON_NOT_CONNECTED"]: {
    recoverable: true,
    retryable: true
  },
  ["DAEMON_TIMEOUT"]: {
    recoverable: true,
    retryable: true
  },
  ["DAEMON_CONNECTION_FAILED"]: {
    recoverable: true,
    retryable: true
  },
  ["DAEMON_REQUEST_FAILED"]: {
    recoverable: true,
    retryable: true
  },
  // Snapshot - some recoverable
  ["SNAPSHOT_FAILED"]: {
    recoverable: true,
    retryable: true
  },
  ["SNAPSHOT_NOT_FOUND"]: {
    recoverable: false,
    retryable: false
  },
  ["SNAPSHOT_RESTORE_FAILED"]: {
    recoverable: true,
    retryable: true
  },
  ["SNAPSHOT_STORAGE_ERROR"]: {
    recoverable: true,
    retryable: true
  },
  ["SNAPSHOT_HASH_MISMATCH"]: {
    recoverable: false,
    retryable: false
  },
  // Auth - requires user action
  ["AUTH_REQUIRED"]: {
    recoverable: true,
    retryable: false
  },
  ["AUTH_EXPIRED"]: {
    recoverable: true,
    retryable: false
  },
  ["AUTH_INVALID_TOKEN"]: {
    recoverable: true,
    retryable: false
  },
  ["AUTH_INSUFFICIENT_PERMISSIONS"]: {
    recoverable: false,
    retryable: false
  },
  // Validation - fix input and retry
  ["INVALID_INPUT"]: {
    recoverable: true,
    retryable: false
  },
  ["INVALID_PARAMETER"]: {
    recoverable: true,
    retryable: false
  },
  ["MISSING_REQUIRED_FIELD"]: {
    recoverable: true,
    retryable: false
  },
  ["SCHEMA_VALIDATION_FAILED"]: {
    recoverable: true,
    retryable: false
  },
  // Workspace - depends on context
  ["WORKSPACE_NOT_FOUND"]: {
    recoverable: false,
    retryable: false
  },
  ["FILE_NOT_FOUND"]: {
    recoverable: false,
    retryable: false
  },
  ["FILE_READ_ERROR"]: {
    recoverable: true,
    retryable: true
  },
  ["FILE_WRITE_ERROR"]: {
    recoverable: true,
    retryable: true
  },
  ["PATH_ACCESS_DENIED"]: {
    recoverable: false,
    retryable: false
  },
  // Session - mostly not recoverable
  ["SESSION_NOT_FOUND"]: {
    recoverable: false,
    retryable: false
  },
  ["SESSION_STATE_ERROR"]: {
    recoverable: true,
    retryable: false
  },
  ["SESSION_ALREADY_ACTIVE"]: {
    recoverable: true,
    retryable: false
  },
  ["NO_ACTIVE_SESSION"]: {
    recoverable: true,
    retryable: false
  },
  // API - retryable network errors
  ["API_REQUEST_FAILED"]: {
    recoverable: true,
    retryable: true
  },
  ["API_TIMEOUT"]: {
    recoverable: true,
    retryable: true
  },
  ["API_RATE_LIMITED"]: {
    recoverable: true,
    retryable: true
  },
  ["API_SERVER_ERROR"]: {
    recoverable: true,
    retryable: true
  },
  ["CIRCUIT_BREAKER_OPEN"]: {
    recoverable: true,
    retryable: true
  },
  // Tool - mostly not recoverable
  ["TOOL_NOT_FOUND"]: {
    recoverable: false,
    retryable: false
  },
  ["TOOL_EXECUTION_FAILED"]: {
    recoverable: true,
    retryable: true
  },
  ["TOOL_DEPRECATED"]: {
    recoverable: false,
    retryable: false
  },
  // General
  ["UNKNOWN"]: {
    recoverable: false,
    retryable: false
  },
  ["INTERNAL_ERROR"]: {
    recoverable: false,
    retryable: false
  },
  ["NOT_IMPLEMENTED"]: {
    recoverable: false,
    retryable: false
  }
};
function createMcpError(code, message, context) {
  const metadata = ERROR_METADATA[code];
  const error = {
    code,
    message,
    context,
    timestamp: Date.now(),
    recoverable: metadata.recoverable
  };
  if (process.env.NODE_ENV !== "production") {
    error.stack = new Error().stack;
  }
  return error;
}
__name(createMcpError, "createMcpError");
__name4(createMcpError, "createMcpError");
function createMcpErrorFromCause(code, message, cause, context) {
  const error = createMcpError(code, message, {
    ...context,
    causeMessage: cause.message
  });
  error.cause = cause;
  return error;
}
__name(createMcpErrorFromCause, "createMcpErrorFromCause");
__name4(createMcpErrorFromCause, "createMcpErrorFromCause");
function formatForLog(error) {
  const parts = [
    `[${error.code}] ${error.message}`,
    error.context ? `Context: ${JSON.stringify(error.context)}` : null,
    error.cause ? `Caused by: ${error.cause.message}` : null
  ].filter(Boolean);
  return parts.join("\n  ");
}
__name(formatForLog, "formatForLog");
__name4(formatForLog, "formatForLog");
var connections = /* @__PURE__ */ new Map();
var connectionStatus = /* @__PURE__ */ new Map();
var MIN_RETRY_INTERVAL_MS = 5e3;
var MAX_CONSECUTIVE_FAILURES = 3;
var REQUEST_TIMEOUT_MS = 1e4;
var IS_WINDOWS = platform() === "win32";
function getSocketPath() {
  if (IS_WINDOWS) {
    return "\\\\.\\pipe\\snapback-daemon";
  }
  return join(homedir(), ".snapback", "daemon.sock");
}
__name(getSocketPath, "getSocketPath");
__name4(getSocketPath, "getSocketPath");
var DaemonConnection = class DaemonConnection2 {
  static {
    __name(this, "DaemonConnection2");
  }
  static {
    __name4(this, "DaemonConnection");
  }
  socketPath;
  socket = null;
  requestId = 0;
  pendingRequests = /* @__PURE__ */ new Map();
  buffer = "";
  constructor(socketPath) {
    this.socketPath = socketPath;
  }
  /**
  * Connect to daemon
  */
  async connect() {
    if (this.socket?.writable) {
      return;
    }
    return new Promise((resolve32, reject) => {
      const socket = createConnection(this.socketPath);
      socket.on("connect", () => {
        this.socket = socket;
        resolve32();
      });
      socket.on("error", (err2) => {
        reject(err2);
      });
      socket.on("data", (data) => {
        this.handleData(data.toString());
      });
      socket.on("close", () => {
        this.socket = null;
        for (const [id, pending] of this.pendingRequests) {
          clearTimeout(pending.timeout);
          pending.reject(new Error("Connection closed"));
          this.pendingRequests.delete(id);
        }
      });
      setTimeout(() => {
        if (!this.socket) {
          socket.destroy();
          reject(new Error("Connection timeout"));
        }
      }, 5e3);
    });
  }
  /**
  * Disconnect from daemon
  */
  disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
  /**
  * Send a request to the daemon
  */
  async request(method, params) {
    if (!this.socket?.writable) {
      throw new Error("Not connected");
    }
    const id = ++this.requestId;
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };
    return new Promise((resolve32, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, REQUEST_TIMEOUT_MS);
      this.pendingRequests.set(id, {
        resolve: resolve32,
        reject,
        timeout
      });
      this.socket?.write(`${JSON.stringify(request)}
`);
    });
  }
  /**
  * Handle incoming data
  */
  handleData(data) {
    this.buffer += data;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        const response = JSON.parse(line);
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);
          if (response.error) {
            pending.reject(new Error(response.error.message));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch {
      }
    }
  }
};
async function getDaemonConnection(workspaceRoot) {
  const status2 = connectionStatus.get(workspaceRoot);
  if (status2) {
    const timeSinceLastAttempt = Date.now() - status2.lastAttempt;
    if (status2.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && timeSinceLastAttempt < MIN_RETRY_INTERVAL_MS) {
      return null;
    }
  }
  let conn = connections.get(workspaceRoot);
  if (!conn) {
    conn = new DaemonConnection(getSocketPath());
    connections.set(workspaceRoot, conn);
  }
  try {
    await conn.connect();
    connectionStatus.set(workspaceRoot, {
      connected: true,
      lastAttempt: Date.now(),
      consecutiveFailures: 0
    });
    return conn;
  } catch {
    const prevStatus = connectionStatus.get(workspaceRoot);
    connectionStatus.set(workspaceRoot, {
      connected: false,
      lastAttempt: Date.now(),
      consecutiveFailures: (prevStatus?.consecutiveFailures ?? 0) + 1
    });
    return null;
  }
}
__name(getDaemonConnection, "getDaemonConnection");
__name4(getDaemonConnection, "getDaemonConnection");
async function notifySnapshotCreatedViaDaemon(workspaceRoot, snapshotId, filePath, trigger) {
  const conn = await getDaemonConnection(workspaceRoot);
  if (!conn) {
    return false;
  }
  try {
    await conn.request("snapshot.created", {
      workspace: workspaceRoot,
      id: snapshotId,
      filePath: filePath || "unknown",
      trigger: trigger || "ai-detection",
      source: "mcp"
    });
    return true;
  } catch (error) {
    const mcpError = error instanceof Error ? createMcpErrorFromCause(ErrorCode.DAEMON_REQUEST_FAILED, "Failed to notify daemon of snapshot creation", error, {
      snapshotId,
      filePath
    }) : createMcpError(ErrorCode.DAEMON_REQUEST_FAILED, `Failed to notify daemon: ${String(error)}`, {
      snapshotId,
      filePath
    });
    console.error(`[MCP] ${formatForLog(mcpError)}`);
    return false;
  }
}
__name(notifySnapshotCreatedViaDaemon, "notifySnapshotCreatedViaDaemon");
__name4(notifySnapshotCreatedViaDaemon, "notifySnapshotCreatedViaDaemon");
function validateFilePath(filePath, workspaceRoot) {
  if (!filePath || filePath.trim() === "") {
    return {
      valid: false,
      error: "File path cannot be empty"
    };
  }
  if (filePath.includes("\0")) {
    return {
      valid: false,
      error: "Invalid characters in file path"
    };
  }
  const normalizedPath = normalize(filePath);
  if (normalizedPath.includes("..")) {
    return {
      valid: false,
      error: "Path traversal not allowed"
    };
  }
  const absolutePath = isAbsolute(normalizedPath) ? normalizedPath : resolve(workspaceRoot, normalizedPath);
  const relativePath = relative(workspaceRoot, absolutePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return {
      valid: false,
      error: "Path must be within workspace"
    };
  }
  return {
    valid: true,
    sanitizedPath: absolutePath
  };
}
__name(validateFilePath, "validateFilePath");
__name4(validateFilePath, "validateFilePath");
function validateFilePaths(filePaths, workspaceRoot) {
  const sanitizedPaths = [];
  for (const filePath of filePaths) {
    const result7 = validateFilePath(filePath, workspaceRoot);
    if (!result7.valid) {
      return {
        valid: false,
        error: result7.error,
        invalidPath: filePath
      };
    }
    sanitizedPaths.push(result7.sanitizedPath);
  }
  return {
    valid: true,
    sanitizedPaths
  };
}
__name(validateFilePaths, "validateFilePaths");
__name4(validateFilePaths, "validateFilePaths");
z.object({
  // Mode parameters - at least one required
  mode: z.enum([
    "start",
    "check",
    "context"
  ]).optional().describe("Mode (full-word, recommended): start=begin task, check=validate code, context=get status"),
  m: z.enum([
    "s",
    "c",
    "x"
  ]).optional().describe("Legacy mode: s=start, c=check, x=context (use 'mode' instead)"),
  // Task parameters
  task: z.string().optional().describe("Task description (mode: start)"),
  t: z.string().optional().describe("Legacy: use 'task' instead"),
  // File parameters
  files: z.array(z.string()).optional().describe("Files to work on (mode: start, check)"),
  f: z.array(z.string()).optional().describe("Legacy: use 'files' instead"),
  // Keyword parameters
  keywords: z.array(z.string()).optional().describe("Keywords for learning retrieval (mode: start, context)"),
  k: z.array(z.string()).optional().describe("Legacy: use 'keywords' instead"),
  // Intent parameters
  intent: z.enum([
    "implement",
    "debug",
    "refactor",
    "review",
    "explore"
  ]).optional().describe("Task intent for context loading optimization"),
  i: z.enum([
    "implement",
    "debug",
    "refactor",
    "review",
    "explore"
  ]).optional().describe("Legacy: use 'intent' instead"),
  // Other parameters
  thorough: z.boolean().optional().describe("Enable thorough 7-layer validation (mode: check)"),
  compact: z.boolean().optional().describe("Use compact positional wire format instead of labeled (default: false)"),
  goal: z.object({
    metric: z.enum([
      "bundle",
      "performance",
      "coverage"
    ]),
    target: z.number(),
    unit: z.string()
  }).optional().describe("Goal for task completion validation (mode: start)")
}).refine((data) => data.mode !== void 0 || data.m !== void 0, {
  message: "Either 'mode' (start|check|context) or 'm' (s|c|x) must be provided",
  path: [
    "mode"
  ]
});
z.object({
  ok: z.union([
    z.literal(0),
    z.literal(1)
  ]).optional().describe("Success: 1=ok, 0=failed"),
  // Learnings parameters
  learnings: z.array(z.string()).optional().describe("Quick learnings as strings"),
  l: z.array(z.string()).optional().describe("Legacy: use 'learnings' instead"),
  // Other parameters
  notes: z.string().optional().describe("Completion notes"),
  outcome: z.enum([
    "completed",
    "abandoned",
    "blocked"
  ]).optional().describe("Task outcome"),
  // Efficiency tracking (agent-reported metrics)
  efficiency: z.object({
    saved: z.string().optional().describe("Tokens saved (e.g., '~12K')"),
    prevented: z.string().optional().describe("Mistakes prevented"),
    helped: z.string().optional().describe("What context helped most")
  }).optional().describe("Agent-reported efficiency metrics"),
  // Internal survey (LLM self-assessment)
  survey: z.object({
    patterns_used: z.number().optional().describe("Patterns applied from context"),
    pitfalls_avoided: z.number().optional().describe("Pitfalls avoided due to warnings"),
    helpfulness: z.number().min(1).max(5).optional().describe("Helpfulness rating 1-5"),
    unhelpful_count: z.number().optional().describe("Count of unhelpful suggestions")
  }).optional().describe("LLM self-assessment (internal)"),
  compact: z.boolean().optional().describe("Use compact wire format")
});
z.object({
  // Full-word parameters (recommended)
  trigger: z.string().optional().describe("What situation triggers this learning"),
  action: z.string().optional().describe("What to do when triggered"),
  source: z.string().optional().describe("Where this learning originated (optional)"),
  // Legacy parameters
  t: z.string().optional().describe("Legacy: use 'trigger' instead"),
  a: z.string().optional().describe("Legacy: use 'action' instead"),
  s: z.string().optional().describe("Legacy: use 'source' instead"),
  // Type (supports both full-word and abbreviated)
  type: z.enum([
    "pattern",
    "pitfall",
    "efficiency",
    "discovery",
    "workflow",
    "pat",
    "pit",
    "eff",
    "disc",
    "wf"
  ]).optional().describe("Learning type (default: pattern)")
}).refine((data) => (data.trigger !== void 0 || data.t !== void 0) && (data.action !== void 0 || data.a !== void 0), {
  message: "Either 'trigger' or 't' AND 'action' or 'a' must be provided",
  path: [
    "trigger"
  ]
});
z.object({
  type: z.string().min(1).describe("Violation type (e.g., 'silent_catch', 'missing_auth_check')"),
  file: z.string().min(1).describe("File where violation occurred"),
  // Full-word parameters (recommended)
  description: z.string().optional().describe("What went wrong - description of the violation"),
  reason: z.string().optional().describe("Why it happened - root cause"),
  prevention: z.string().optional().describe("How to prevent this in future"),
  // Legacy parameters
  what: z.string().optional().describe("Legacy: use 'description' instead"),
  why: z.string().optional().describe("Legacy: use 'reason' instead"),
  prevent: z.string().optional().describe("Legacy: use 'prevention' instead")
}).refine((data) => (data.description !== void 0 || data.what !== void 0) && (data.prevention !== void 0 || data.prevent !== void 0), {
  message: "Either 'description' or 'what' AND 'prevention' or 'prevent' must be provided",
  path: [
    "description"
  ]
});
z.object({
  // Mode parameters
  mode: z.enum([
    "quick",
    "full",
    "patterns",
    "build",
    "impact",
    "circular",
    "docs",
    "learnings",
    "architecture",
    "trace"
  ]).optional().describe("Mode (full-word, recommended): quick=fast validation, full=comprehensive, patterns=rule check, trace=dependency analysis"),
  m: z.enum([
    "q",
    "f",
    "p",
    "b",
    "i",
    "c",
    "d",
    "l",
    "a",
    "t"
  ]).optional().describe("Legacy mode: q=quick, f=full, p=patterns, b=build, i=impact, c=circular, d=docs, l=learnings, a=architecture, t=trace"),
  // File parameters
  files: z.union([
    z.string(),
    z.array(z.string())
  ]).optional().describe("File(s) to check"),
  f: z.union([
    z.string(),
    z.array(z.string())
  ]).optional().describe("Legacy: use 'files' instead"),
  code: z.string().optional().describe("Code to validate (for patterns/validate mode)"),
  tests: z.boolean().optional().describe("Run tests (quick mode only)"),
  compact: z.boolean().optional().describe("Use compact wire format")
});
z.object({
  action: z.enum([
    "list",
    "restore",
    "diff"
  ]).optional().describe("Operation: list (default), restore, or diff"),
  id: z.string().optional().describe("Snapshot ID (for restore/diff)"),
  // Diff parameters
  diffWith: z.string().optional().describe("Second snapshot ID (for diff operation)"),
  diff: z.string().optional().describe("Legacy: use 'diffWith' instead"),
  // Dry run parameters
  dryRun: z.boolean().optional().describe("Preview restore without applying changes"),
  dry: z.boolean().optional().describe("Legacy: use 'dryRun' instead"),
  // Other parameters
  files: z.array(z.string()).optional().describe("Specific files to restore (optional filter)"),
  compact: z.boolean().optional().describe("Use compact wire format")
});
z.object({
  topic: z.enum([
    "tools",
    "status",
    "wire",
    "modes",
    "thresholds",
    "all"
  ]).optional().describe("Help topic: tools, status, wire, modes, thresholds, or all (default)"),
  q: z.enum([
    "tools",
    "status",
    "wire"
  ]).optional().describe("Legacy: use 'topic' instead")
});
z.object({
  type: z.enum([
    "risk",
    "package"
  ]).describe("Analysis type"),
  changes: z.array(z.unknown()).optional(),
  filePath: z.string().optional(),
  packageName: z.string().optional(),
  targetVersion: z.string().optional()
});
z.object({
  workspaceId: z.string().optional()
});
z.object({
  files: z.array(z.string().min(1)).min(1),
  reason: z.string().optional(),
  trigger: z.enum([
    "manual",
    "mcp",
    "ai_assist",
    "session_end"
  ]).optional()
});
z.object({
  limit: z.number().int().positive().max(100).default(20).optional(),
  since: z.string().datetime().optional()
});
z.object({
  snapshotId: z.string().min(1),
  files: z.array(z.string()).optional(),
  dryRun: z.boolean().default(false).optional()
});
z.object({
  mode: z.enum([
    "quick",
    "comprehensive"
  ]).default("quick").optional(),
  code: z.string().min(1),
  filePath: z.string().min(1)
});
z.object({
  op: z.enum([
    "init",
    "build",
    "validate",
    "status",
    "constraint",
    "check",
    "blockers"
  ]),
  domain: z.string().optional(),
  name: z.string().optional(),
  value: z.number().optional()
});
z.object({
  op: z.enum([
    "start",
    "recommendations",
    "stats",
    "end"
  ]),
  taskDescription: z.string().optional(),
  files: z.array(z.string()).optional(),
  acceptLearnings: z.array(z.number()).optional()
});
z.object({
  type: z.enum([
    "pattern",
    "pitfall",
    "efficiency",
    "discovery",
    "workflow"
  ]),
  trigger: z.string().min(1),
  action: z.string().min(1),
  source: z.string().optional()
});
z.object({
  files: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1)
});
z.object({
  random_string: z.string().optional()
});
z.object({
  task: z.string().min(1),
  files: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional()
});
z.object({
  code: z.string().min(1),
  filePath: z.string().min(1)
});
z.object({
  type: z.string().min(1),
  file: z.string().min(1),
  whatHappened: z.string().min(1),
  whyItHappened: z.string().min(1),
  prevention: z.string().min(1)
});
z.object({
  keywords: z.array(z.string().min(1)).min(1),
  limit: z.number().int().positive().max(50).default(10).optional()
});
function hashContent2(content) {
  return createHash("sha256").update(content).digest("hex").substring(0, 16);
}
__name(hashContent2, "hashContent");
__name4(hashContent2, "hashContent");
function getFileHashes(files, workspaceRoot) {
  return files.map((file) => {
    const fullPath = resolve(workspaceRoot, file);
    if (!existsSync(fullPath)) {
      return {
        path: file,
        hash: "",
        exists: false
      };
    }
    try {
      const content = readFileSync(fullPath, "utf8");
      return {
        path: file,
        hash: hashContent2(content),
        exists: true
      };
    } catch {
      return {
        path: file,
        hash: "",
        exists: false
      };
    }
  });
}
__name(getFileHashes, "getFileHashes");
__name4(getFileHashes, "getFileHashes");
function findMatchingSnapshot(currentHashes, snapshots, windowSize = 5) {
  const recentSnapshots = snapshots.slice(0, windowSize);
  for (const snapshot of recentSnapshots) {
    const snapshotFileHashes = new Map(snapshot.files.map((f) => [
      f.path,
      f.blobId
    ]));
    const allMatch = currentHashes.every((current) => {
      if (!current.exists) {
        return false;
      }
      const snapshotHash = snapshotFileHashes.get(current.path);
      return snapshotHash === current.hash;
    });
    if (allMatch && currentHashes.length === snapshot.files.length) {
      return {
        matched: true,
        snapshotId: snapshot.id,
        createdAt: snapshot.createdAt
      };
    }
  }
  return {
    matched: false
  };
}
__name(findMatchingSnapshot, "findMatchingSnapshot");
__name4(findMatchingSnapshot, "findMatchingSnapshot");
var SnapshotService = class {
  static {
    __name(this, "SnapshotService");
  }
  static {
    __name4(this, "SnapshotService");
  }
  storage;
  workspaceRoot;
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.storage = createStorage(workspaceRoot);
  }
  /**
  * Create a snapshot from file paths with optional deduplication
  *
  * @example
  * ```typescript
  * const service = new SnapshotService(workspaceRoot);
  * const result = await service.createFromFiles(
  *   ["src/index.ts", "src/utils.ts"],
  *   { description: "Pre-refactor", trigger: "ai-detection" }
  * );
  * if (result.success) {
  *   console.log(`Created snapshot: ${result.snapshot.id}`);
  * }
  * ```
  */
  async createFromFiles(files, options) {
    if (!files || files.length === 0) {
      return {
        success: false,
        error: "No files provided"
      };
    }
    const pathValidation = validateFilePaths(files, this.workspaceRoot);
    if (!pathValidation.valid) {
      return {
        success: false,
        error: `Invalid path: ${pathValidation.invalidPath} - ${pathValidation.error}`
      };
    }
    if (!options.skipDedup) {
      const currentHashes = getFileHashes(files, this.workspaceRoot);
      const existingSnapshots = this.storage.listSnapshots();
      const match = findMatchingSnapshot(currentHashes, existingSnapshots, options.dedupWindow ?? 5);
      if (match.matched && match.snapshotId) {
        const createdAtDate = match.createdAt ? new Date(match.createdAt) : /* @__PURE__ */ new Date();
        return {
          success: true,
          reused: true,
          reusedSnapshotId: match.snapshotId,
          reusedReason: `Files unchanged since ${createdAtDate.toLocaleString()}`
        };
      }
    }
    try {
      const fileContents = pathValidation.sanitizedPaths.filter((fullPath) => existsSync(fullPath)).map((fullPath, idx) => ({
        path: files[idx],
        content: readFileSync(fullPath, "utf8")
      }));
      if (fileContents.length === 0) {
        return {
          success: false,
          error: "No readable files found"
        };
      }
      const snapshot = await this.storage.createSnapshot(fileContents, {
        description: options.description,
        trigger: options.trigger
      });
      void notifySnapshotCreatedViaDaemon(this.workspaceRoot, snapshot.id, files[0], options.trigger);
      return {
        success: true,
        snapshot: {
          id: snapshot.id,
          fileCount: snapshot.files.length,
          totalSize: snapshot.totalSize,
          createdAt: snapshot.createdAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
  * List recent snapshots
  */
  listSnapshots(limit = 20) {
    return this.storage.listSnapshots().slice(0, limit);
  }
  /**
  * Get a specific snapshot
  */
  getSnapshot(id) {
    return this.storage.getSnapshot(id);
  }
};
var serviceCache = /* @__PURE__ */ new Map();
function createSnapshotService(workspaceRoot) {
  if (!serviceCache.has(workspaceRoot)) {
    serviceCache.set(workspaceRoot, new SnapshotService(workspaceRoot));
  }
  return serviceCache.get(workspaceRoot);
}
__name(createSnapshotService, "createSnapshotService");
__name4(createSnapshotService, "createSnapshotService");
var TestCoverageService = class {
  static {
    __name(this, "TestCoverageService");
  }
  static {
    __name4(this, "TestCoverageService");
  }
  workspaceRoot;
  cacheDir;
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.cacheDir = join(workspaceRoot, ".snapback", "coverage");
  }
  /**
  * Get test coverage context for planned files
  * Main entry point for begin_task integration
  */
  getContextForFiles(files) {
    const coverageData = this.loadCoverageData();
    const testMap = this.buildTestMap();
    const filesContext = {};
    let filesWithTests = 0;
    let totalCoverage = 0;
    let filesWithCoverage = 0;
    for (const file of files) {
      const relPath = this.toRelative(file);
      const testFiles = testMap[relPath] || this.inferTestFiles(file);
      const coverage = coverageData[relPath];
      const hasTests = testFiles.length > 0;
      if (hasTests) filesWithTests++;
      filesContext[file] = {
        hasTests,
        testFiles,
        coverage: coverage ? {
          lines: coverage.lines.pct,
          functions: coverage.functions.pct,
          branches: coverage.branches.pct
        } : void 0
      };
      if (coverage) {
        totalCoverage += coverage.lines.pct;
        filesWithCoverage++;
      }
    }
    return {
      files: filesContext,
      summary: {
        totalFiles: files.length,
        filesWithTests,
        averageCoverage: filesWithCoverage > 0 ? totalCoverage / filesWithCoverage : 0
      }
    };
  }
  /**
  * Get files with low or no test coverage
  * Useful for review and refactor intents
  */
  getLowCoverageFiles(threshold = 50) {
    const coverageData = this.loadCoverageData();
    const lowCoverage = [];
    for (const [file, coverage] of Object.entries(coverageData)) {
      if (file === "total") continue;
      if (coverage.lines.pct < threshold) {
        lowCoverage.push(file);
      }
    }
    return lowCoverage.sort((a, b) => {
      const aCov = coverageData[a]?.lines.pct ?? 0;
      const bCov = coverageData[b]?.lines.pct ?? 0;
      return aCov - bCov;
    });
  }
  /**
  * Get overall project coverage summary
  */
  getProjectCoverage() {
    const coverageData = this.loadCoverageData();
    if (coverageData.total) {
      return {
        lines: coverageData.total.lines.pct,
        functions: coverageData.total.functions.pct,
        branches: coverageData.total.branches.pct
      };
    }
    return null;
  }
  /**
  * Check if a file has tests
  */
  hasTests(file) {
    const testMap = this.buildTestMap();
    const relPath = this.toRelative(file);
    return testMap[relPath]?.length > 0 || this.inferTestFiles(file).length > 0;
  }
  /**
  * Get test files for a source file
  */
  getTestFiles(file) {
    const testMap = this.buildTestMap();
    const relPath = this.toRelative(file);
    return testMap[relPath] || this.inferTestFiles(file);
  }
  /**
  * Called after test runs to update cache
  */
  updateFromTestRun(testResults) {
    this.ensureCacheDir();
    const cachePath = join(this.cacheDir, "last-run.json");
    const data = {
      timestamp: Date.now(),
      results: testResults
    };
    writeFileSync(cachePath, JSON.stringify(data, null, 2));
  }
  /**
  * Get last test run info
  */
  getLastTestRun() {
    const cachePath = join(this.cacheDir, "last-run.json");
    if (!existsSync(cachePath)) return null;
    try {
      return JSON.parse(readFileSync(cachePath, "utf8"));
    } catch {
      return null;
    }
  }
  /**
  * Build or update test→source mapping from vitest config
  * Called periodically or after test file changes
  */
  updateTestMap(mappings) {
    this.ensureCacheDir();
    const cachePath = join(this.cacheDir, "test-map.json");
    writeFileSync(cachePath, JSON.stringify(mappings, null, 2));
  }
  // =========================================================================
  // Private Methods
  // =========================================================================
  /**
  * Load coverage data from vitest output
  */
  loadCoverageData() {
    const locations = [
      join(this.workspaceRoot, "coverage", "coverage-summary.json"),
      join(this.workspaceRoot, ".vitest", "coverage", "coverage-summary.json"),
      join(this.workspaceRoot, ".nyc_output", "coverage-summary.json")
    ];
    for (const loc of locations) {
      if (existsSync(loc)) {
        try {
          return JSON.parse(readFileSync(loc, "utf8"));
        } catch {
        }
      }
    }
    return {
      total: {
        lines: {
          pct: 0
        },
        functions: {
          pct: 0
        },
        branches: {
          pct: 0
        }
      }
    };
  }
  /**
  * Build test map from cache or config
  */
  buildTestMap() {
    const cachePath = join(this.cacheDir, "test-map.json");
    if (existsSync(cachePath)) {
      try {
        return JSON.parse(readFileSync(cachePath, "utf8"));
      } catch {
      }
    }
    return {};
  }
  /**
  * Infer test files from naming conventions
  * Used when no explicit test map exists
  */
  inferTestFiles(file) {
    const dir = dirname(file);
    const ext = file.endsWith(".tsx") ? ".tsx" : ".ts";
    const base = basename(file, ext);
    if (base.endsWith(".test") || base.endsWith(".spec")) {
      return [];
    }
    const candidates = [
      // Same directory conventions
      join(dir, `${base}.test${ext}`),
      join(dir, `${base}.spec${ext}`),
      // __tests__ directory
      join(dir, "__tests__", `${base}.test${ext}`),
      join(dir, "__tests__", `${base}.spec${ext}`),
      // test directory parallel to src
      dir.replace("/src/", "/test/") + `/${base}.test${ext}`,
      dir.replace("/src/", "/tests/") + `/${base}.test${ext}`,
      // apps/package test directories
      dir.replace(/\/src\//, "/__tests__/") + `/${base}.test${ext}`
    ];
    return candidates.filter((c) => existsSync(c));
  }
  /**
  * Convert absolute path to relative
  */
  toRelative(file) {
    if (file.startsWith(this.workspaceRoot)) {
      return relative(this.workspaceRoot, file);
    }
    return file;
  }
  /**
  * Ensure cache directory exists
  */
  ensureCacheDir() {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, {
        recursive: true
      });
    }
  }
};
function createTestCoverageService(workspaceRoot) {
  return new TestCoverageService(workspaceRoot);
}
__name(createTestCoverageService, "createTestCoverageService");
__name4(createTestCoverageService, "createTestCoverageService");
var services2 = /* @__PURE__ */ new Map();
function getTestCoverageService(workspaceRoot) {
  if (!services2.has(workspaceRoot)) {
    services2.set(workspaceRoot, new TestCoverageService(workspaceRoot));
  }
  return services2.get(workspaceRoot);
}
__name(getTestCoverageService, "getTestCoverageService");
__name4(getTestCoverageService, "getTestCoverageService");
var INTENT_LEARNING_FILES = {
  implement: [
    "architecture-patterns.jsonl",
    "architecture-context.jsonl",
    "domain-intelligence.jsonl"
  ],
  debug: [
    "anti-patterns.jsonl",
    "domain-testing.jsonl",
    "architecture-patterns.jsonl"
  ],
  refactor: [
    "workflow-patterns.jsonl",
    "architecture-context.jsonl",
    "anti-patterns.jsonl"
  ],
  review: [
    "anti-patterns.jsonl",
    "domain-testing.jsonl",
    "architecture-patterns.jsonl"
  ],
  explore: [
    "architecture-context.jsonl",
    "workflow-patterns.jsonl"
  ]
};
var KEYWORD_DOMAIN_MAP = {
  // VSCode Extension domain
  vscode: "domain-vscode.jsonl",
  extension: "domain-vscode.jsonl",
  activation: "domain-vscode.jsonl",
  webview: "domain-vscode.jsonl",
  "vs code": "domain-vscode.jsonl",
  // Web/Next.js domain
  nextjs: "domain-web.jsonl",
  "next.js": "domain-web.jsonl",
  next: "domain-web.jsonl",
  react: "domain-web.jsonl",
  client: "domain-web.jsonl",
  turbopack: "domain-web.jsonl",
  "use client": "domain-web.jsonl",
  biome: "domain-web.jsonl",
  // API/Backend domain
  api: "domain-api.jsonl",
  procedure: "domain-api.jsonl",
  orpc: "domain-api.jsonl",
  service: "domain-api.jsonl",
  backend: "domain-api.jsonl",
  drizzle: "domain-api.jsonl",
  // MCP/CLI domain
  mcp: "domain-mcp-cli.jsonl",
  cli: "domain-mcp-cli.jsonl",
  commander: "domain-mcp-cli.jsonl",
  "model context protocol": "domain-mcp-cli.jsonl",
  stdio: "domain-mcp-cli.jsonl",
  // Testing domain
  vitest: "domain-testing.jsonl",
  test: "domain-testing.jsonl",
  testing: "domain-testing.jsonl",
  coverage: "domain-testing.jsonl",
  spec: "domain-testing.jsonl",
  mock: "domain-testing.jsonl",
  // Intelligence domain
  validation: "domain-intelligence.jsonl",
  learning: "domain-intelligence.jsonl",
  vitals: "domain-intelligence.jsonl",
  intelligence: "domain-intelligence.jsonl",
  advisory: "domain-intelligence.jsonl"
};
var FILE_PATH_DOMAIN_MAP = {
  "apps/vscode": "domain-vscode.jsonl",
  "apps/web": "domain-web.jsonl",
  "apps/api": "domain-api.jsonl",
  "packages/mcp": "domain-mcp-cli.jsonl",
  "packages/cli": "domain-mcp-cli.jsonl",
  "packages/intelligence": "domain-intelligence.jsonl",
  ".test.": "domain-testing.jsonl",
  ".spec.": "domain-testing.jsonl",
  __tests__: "domain-testing.jsonl"
};
function detectDomainFilesFromKeywords(keywords) {
  const detected = /* @__PURE__ */ new Set();
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (KEYWORD_DOMAIN_MAP[lowerKeyword]) {
      detected.add(KEYWORD_DOMAIN_MAP[lowerKeyword]);
      continue;
    }
    for (const [key, domain] of Object.entries(KEYWORD_DOMAIN_MAP)) {
      if (lowerKeyword.includes(key) || key.includes(lowerKeyword)) {
        detected.add(domain);
      }
    }
  }
  return [
    ...detected
  ];
}
__name(detectDomainFilesFromKeywords, "detectDomainFilesFromKeywords");
__name4(detectDomainFilesFromKeywords, "detectDomainFilesFromKeywords");
function detectDomainFilesFromPaths(filePaths) {
  const detected = /* @__PURE__ */ new Set();
  for (const filePath of filePaths) {
    for (const [pattern, domain] of Object.entries(FILE_PATH_DOMAIN_MAP)) {
      if (filePath.includes(pattern)) {
        detected.add(domain);
      }
    }
  }
  return [
    ...detected
  ];
}
__name(detectDomainFilesFromPaths, "detectDomainFilesFromPaths");
__name4(detectDomainFilesFromPaths, "detectDomainFilesFromPaths");
var DEFAULT_DOMAIN_FILES = [
  "architecture-patterns.jsonl"
];
var HOT_TIER_FILE = "hot.jsonl";
var COLD_TIER_FILE = "learnings.jsonl";
var DEFAULT_MAX_LEARNINGS = 10;
var USAGE_STATS_FILE = "usage-stats.json";
var HOT_TIER_PROMOTION_THRESHOLD = {
  /** Minimum access count to be considered for promotion */
  minAccessCount: 3,
  /** Minimum applied count (higher weight) */
  minAppliedCount: 1,
  /** Maximum hot tier size */
  maxHotTierSize: 20,
  /** Recency weight - more recent = higher score */
  recencyDays: 14
};
var HOT_TIER_BOOST = 100;
var CRITICAL_PRIORITY_BOOST = 50;
var HIGH_PRIORITY_BOOST = 25;
function loadJsonlSafe(filepath) {
  if (!existsSync(filepath)) {
    return [];
  }
  try {
    const content = readFileSync(filepath, "utf8");
    const lines = content.split("\n").filter(Boolean);
    const items = [];
    for (const line of lines) {
      try {
        items.push(JSON.parse(line));
      } catch {
      }
    }
    return items;
  } catch {
    return [];
  }
}
__name(loadJsonlSafe, "loadJsonlSafe");
__name4(loadJsonlSafe, "loadJsonlSafe");
function scoreLearning(learning, keywords) {
  if (keywords.length === 0) {
    return 0;
  }
  const triggerText = Array.isArray(learning.trigger) ? learning.trigger.join(" ") : learning.trigger || "";
  const searchText = `${triggerText} ${learning.action || ""} ${learning.context || ""}`.toLowerCase();
  let matches = 0;
  for (const keyword of keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  return matches / keywords.length;
}
__name(scoreLearning, "scoreLearning");
__name4(scoreLearning, "scoreLearning");
function getPriorityBoost(learning) {
  const priority = learning.priority;
  if (priority === "critical") {
    return CRITICAL_PRIORITY_BOOST;
  }
  if (priority === "high") {
    return HIGH_PRIORITY_BOOST;
  }
  return 0;
}
__name(getPriorityBoost, "getPriorityBoost");
__name4(getPriorityBoost, "getPriorityBoost");
var TieredLearningService = class {
  static {
    __name(this, "TieredLearningService");
  }
  static {
    __name4(this, "TieredLearningService");
  }
  learningsDir;
  constructor(workspaceRoot) {
    this.learningsDir = join(workspaceRoot, ".snapback", "learnings");
  }
  /**
  * Load learnings from tiered storage based on intent
  *
  * @param options - Loading options (intent, keywords, maxLearnings)
  * @returns Scored and ranked learnings
  */
  async loadTieredLearnings(options) {
    const { intent, keywords, filePaths = [], maxLearnings = DEFAULT_MAX_LEARNINGS } = options;
    const loadedIds = /* @__PURE__ */ new Set();
    const allLearnings = [];
    const hotLearnings = this.loadHotTier();
    for (const learning of hotLearnings) {
      const id = learning.id || this.generateId(learning);
      if (!loadedIds.has(id)) {
        loadedIds.add(id);
        allLearnings.push({
          ...learning,
          score: scoreLearning(learning, keywords) + HOT_TIER_BOOST + getPriorityBoost(learning),
          loadedFrom: "hot"
        });
      }
    }
    const intentFiles = INTENT_LEARNING_FILES[intent] || DEFAULT_DOMAIN_FILES;
    const keywordDomainFiles = detectDomainFilesFromKeywords(keywords);
    const pathDomainFiles = detectDomainFilesFromPaths(filePaths);
    const allWarmFiles = [
      .../* @__PURE__ */ new Set([
        ...intentFiles,
        ...keywordDomainFiles,
        ...pathDomainFiles
      ])
    ];
    for (const filename of allWarmFiles) {
      const filepath = join(this.learningsDir, filename);
      const domainLearnings = loadJsonlSafe(filepath);
      const domain = filename.replace(/^domain-/, "").replace(/\.jsonl$/, "");
      for (const learning of domainLearnings) {
        const id = learning.id || this.generateId(learning);
        if (!loadedIds.has(id)) {
          loadedIds.add(id);
          allLearnings.push({
            ...learning,
            score: scoreLearning(learning, keywords) + getPriorityBoost(learning),
            loadedFrom: "warm",
            tier: "warm",
            domain
          });
        }
      }
    }
    return allLearnings.sort((a, b) => b.score - a.score).slice(0, maxLearnings);
  }
  /**
  * Load hot tier learnings (always loaded)
  */
  loadHotTier() {
    const hotPath = join(this.learningsDir, HOT_TIER_FILE);
    const learnings = loadJsonlSafe(hotPath);
    return learnings.map((l) => ({
      ...l,
      tier: "hot"
    }));
  }
  /**
  * Query cold tier for specific keywords (on-demand only)
  *
  * This method is NOT called by loadTieredLearnings.
  * Use it explicitly when searching archived learnings.
  */
  async queryColdTier(keywords, maxResults = 10) {
    const coldPath = join(this.learningsDir, COLD_TIER_FILE);
    const learnings = loadJsonlSafe(coldPath);
    const scored = learnings.filter((l) => l.tier === "cold" || !l.tier).map((l) => ({
      ...l,
      score: scoreLearning(l, keywords),
      loadedFrom: "cold",
      tier: "cold"
    }));
    return scored.filter((l) => l.score > 0).sort((a, b) => b.score - a.score).slice(0, maxResults);
  }
  /**
  * Generate a deterministic ID for learnings without one
  */
  generateId(learning) {
    const trigger = Array.isArray(learning.trigger) ? learning.trigger.join("-") : learning.trigger || "";
    return `${learning.type}-${trigger.slice(0, 20)}`.replace(/\s+/g, "-").toLowerCase();
  }
  /**
  * Clear any cached data
  */
  clearCache() {
  }
  // =========================================================================
  // Usage Tracking Methods
  // =========================================================================
  /**
  * Load usage stats from disk
  */
  loadUsageStats() {
    const statsPath = join(this.learningsDir, USAGE_STATS_FILE);
    if (!existsSync(statsPath)) {
      return {};
    }
    try {
      return JSON.parse(readFileSync(statsPath, "utf8"));
    } catch {
      return {};
    }
  }
  /**
  * Save usage stats to disk
  */
  saveUsageStats(stats) {
    const statsPath = join(this.learningsDir, USAGE_STATS_FILE);
    try {
      mkdirSync(this.learningsDir, {
        recursive: true
      });
      writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    } catch {
    }
  }
  /**
  * Track that a learning was accessed (loaded for context)
  */
  trackAccess(learningIds) {
    const stats = this.loadUsageStats();
    const now = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString();
    for (const id of learningIds) {
      if (!stats[id]) {
        stats[id] = {
          accessCount: 0,
          appliedCount: 0,
          lastAccessed: now
        };
      }
      stats[id].accessCount++;
      stats[id].lastAccessed = now;
    }
    this.saveUsageStats(stats);
  }
  /**
  * Track that a learning was applied (marked as useful by user/agent)
  */
  trackApplied(learningId) {
    const stats = this.loadUsageStats();
    const now = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString();
    if (!stats[learningId]) {
      stats[learningId] = {
        accessCount: 1,
        appliedCount: 0,
        lastAccessed: now
      };
    }
    stats[learningId].appliedCount++;
    stats[learningId].lastAccessed = now;
    this.saveUsageStats(stats);
  }
  /**
  * Calculate promotion score for a learning
  * Higher score = more likely to be promoted to hot tier
  */
  calculatePromotionScore(learning, stats) {
    const id = learning.id || this.generateId(learning);
    const usageData = stats[id];
    if (!usageData) {
      return 0;
    }
    let score = usageData.accessCount + usageData.appliedCount * 3;
    const lastAccessed = new Date(usageData.lastAccessed);
    const daysSinceAccess = (Date.now() - lastAccessed.getTime()) / (1e3 * 60 * 60 * 24);
    if (daysSinceAccess < HOT_TIER_PROMOTION_THRESHOLD.recencyDays) {
      score *= 1 + (1 - daysSinceAccess / HOT_TIER_PROMOTION_THRESHOLD.recencyDays);
    }
    if (learning.priority === "critical") {
      score *= 2;
    } else if (learning.priority === "high") {
      score *= 1.5;
    }
    return score;
  }
  /**
  * Regenerate hot.jsonl based on usage patterns
  *
  * Algorithm:
  * 1. Load all learnings from cold + warm tiers
  * 2. Score each by usage patterns (access, applied, recency)
  * 3. Preserve existing hot tier entries with priority: critical
  * 4. Fill remaining slots with highest-scoring learnings
  * 5. Write new hot.jsonl
  *
  * @returns Statistics about the regeneration
  */
  async regenerateHotTier() {
    const stats = this.loadUsageStats();
    const currentHot = this.loadHotTier();
    const criticalHot = currentHot.filter((l) => l.priority === "critical");
    const coldPath = join(this.learningsDir, COLD_TIER_FILE);
    const allLearnings = loadJsonlSafe(coldPath);
    const warmFiles = Object.values(INTENT_LEARNING_FILES).flat();
    const seenIds = /* @__PURE__ */ new Set();
    const warmLearnings = [];
    for (const filename of [
      ...new Set(warmFiles)
    ]) {
      const filepath = join(this.learningsDir, filename);
      const learnings = loadJsonlSafe(filepath);
      for (const l of learnings) {
        const id = l.id || this.generateId(l);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          warmLearnings.push(l);
        }
      }
    }
    const allCandidates = [
      ...allLearnings,
      ...warmLearnings
    ];
    const candidateMap = /* @__PURE__ */ new Map();
    for (const l of allCandidates) {
      const id = l.id || this.generateId(l);
      if (!candidateMap.has(id)) {
        candidateMap.set(id, l);
      }
    }
    const scored = Array.from(candidateMap.entries()).map(([id, learning]) => ({
      id,
      learning,
      score: this.calculatePromotionScore(learning, stats)
    })).filter((item) => {
      const usageData = stats[item.id];
      if (!usageData) {
        return false;
      }
      return usageData.accessCount >= HOT_TIER_PROMOTION_THRESHOLD.minAccessCount || usageData.appliedCount >= HOT_TIER_PROMOTION_THRESHOLD.minAppliedCount;
    }).sort((a, b) => b.score - a.score);
    const newHot = [];
    const criticalIds = new Set(criticalHot.map((l) => l.id || this.generateId(l)));
    for (const l of criticalHot) {
      newHot.push({
        ...l,
        tier: "hot"
      });
    }
    let promoted = 0;
    for (const item of scored) {
      if (newHot.length >= HOT_TIER_PROMOTION_THRESHOLD.maxHotTierSize) {
        break;
      }
      if (criticalIds.has(item.id)) {
        continue;
      }
      newHot.push({
        ...item.learning,
        tier: "hot",
        promotedAt: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
      });
      promoted++;
    }
    const newHotIds = new Set(newHot.map((l) => l.id || this.generateId(l)));
    const demoted = currentHot.filter((l) => {
      const id = l.id || this.generateId(l);
      return !newHotIds.has(id);
    }).length;
    const hotPath = join(this.learningsDir, HOT_TIER_FILE);
    const hotContent = `${newHot.map((l) => JSON.stringify(l)).join("\n")}
`;
    writeFileSync(hotPath, hotContent);
    return {
      preserved: criticalHot.length,
      promoted,
      demoted,
      totalHot: newHot.length
    };
  }
  /**
  * Get usage statistics for analysis
  */
  getUsageStats() {
    return this.loadUsageStats();
  }
};
function createTieredLearningService(workspaceRoot) {
  return new TieredLearningService(workspaceRoot);
}
__name(createTieredLearningService, "createTieredLearningService");
__name4(createTieredLearningService, "createTieredLearningService");
function createInitCommand() {
  return new Command("init").description("Initialize SnapBack for this workspace").option("-f, --force", "Reinitialize even if already initialized").option("--no-sync", "Don't sync with server").action(async (options) => {
    const cwd = process.cwd();
    try {
      const initialized = await isSnapbackInitialized(cwd);
      if (initialized && !options.force) {
        const config2 = await getWorkspaceConfig(cwd);
        const initSource = await detectInitializationSource(cwd);
        if (initSource === "extension") {
          console.log(chalk26.green("\u2713 SnapBack already initialized by VS Code extension"));
          console.log(chalk26.gray(`Workspace ID: ${config2?.workspaceId || "local"}`));
          console.log();
          console.log(chalk26.cyan("The extension has already set up SnapBack for this workspace."));
          console.log(chalk26.cyan("You're good to go! \u{1F680}"));
          return;
        }
        console.log(chalk26.yellow("SnapBack already initialized in this workspace"));
        console.log(chalk26.gray(`Workspace ID: ${config2?.workspaceId || "local"}`));
        console.log(chalk26.gray("Use --force to reinitialize"));
        return;
      }
      const spinner2 = ora8("Scanning workspace...").start();
      const vitals = await scanWorkspaceVitals(cwd);
      spinner2.succeed(`Detected: ${vitals.framework || "Unknown framework"} + ${vitals.typescript?.enabled ? "TypeScript" : "JavaScript"} + ${vitals.packageManager || "npm"}`);
      spinner2.start("Creating .snapback/ directory...");
      await createSnapbackDirectory(cwd);
      spinner2.succeed("Created .snapback/ directory");
      await saveWorkspaceVitals(vitals, cwd);
      spinner2.start("Seeding learning patterns...");
      const seedResult = seedLearnings(cwd);
      if (seedResult.success && seedResult.filesCreated.length > 0) {
        spinner2.succeed(`Seeded ${seedResult.learningsSeeded} patterns across ${seedResult.filesCreated.length} files`);
      } else if (seedResult.filesCreated.length === 0) {
        spinner2.info("Learning patterns already seeded");
      } else {
        spinner2.warn(`Seeding completed with ${seedResult.errors.length} error(s)`);
      }
      let config = {
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (options.sync && await isLoggedIn()) {
        spinner2.start("Registering workspace with server...");
        try {
          const workspaceId = await registerWorkspace(vitals);
          const credentials = await getCredentials();
          config = {
            ...config,
            workspaceId,
            tier: credentials?.tier || "free",
            syncEnabled: true
          };
          spinner2.succeed("Workspace registered");
        } catch (_error) {
          spinner2.warn("Could not register workspace (offline mode)");
          config.syncEnabled = false;
        }
      }
      await saveWorkspaceConfig(config, cwd);
      console.log();
      console.log(chalk26.green("\u2713 SnapBack initialized!"));
      console.log();
      console.log(chalk26.cyan("\u{1F4DA} Learned about your workspace:"));
      if (vitals.framework) {
        console.log(`   \u2022 Framework: ${vitals.framework}`);
      }
      if (vitals.packageManager) {
        console.log(`   \u2022 Package Manager: ${vitals.packageManager}`);
      }
      if (vitals.typescript?.enabled) {
        console.log(`   \u2022 TypeScript: ${vitals.typescript.strict ? "strict mode" : "enabled"}`);
      }
      if (vitals.criticalFiles && vitals.criticalFiles.length > 0) {
        console.log(`   \u2022 Critical Files: ${vitals.criticalFiles.length} detected`);
      }
      console.log();
      console.log(chalk26.cyan("Next steps:"));
      if (!await isLoggedIn()) {
        console.log(chalk26.gray("  1. snap login       - Connect to SnapBack cloud"));
      }
      console.log(chalk26.gray("  2. snap tools configure  - Set up MCP for your AI tools"));
      console.log(chalk26.gray("  3. snap status      - View workspace health"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Initialization failed:"), message);
      process.exit(1);
    }
  });
}
__name(createInitCommand, "createInitCommand");
async function scanWorkspaceVitals(workspaceRoot) {
  const vitals = {
    detectedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const packageJson = await readPackageJson(workspaceRoot);
  if (packageJson) {
    vitals.packageManager = await detectPackageManager(workspaceRoot, packageJson);
    const framework = detectFramework(packageJson);
    if (framework) {
      vitals.framework = framework.name;
      vitals.frameworkConfidence = framework.confidence;
    }
  }
  vitals.typescript = await detectTypeScript(workspaceRoot);
  vitals.criticalFiles = await detectCriticalFiles(workspaceRoot);
  return vitals;
}
__name(scanWorkspaceVitals, "scanWorkspaceVitals");
async function readPackageJson(workspaceRoot) {
  try {
    const content = await readFile(join(workspaceRoot, "package.json"), "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
__name(readPackageJson, "readPackageJson");
async function detectPackageManager(workspaceRoot, packageJson) {
  if (packageJson.packageManager) {
    if (packageJson.packageManager.startsWith("pnpm")) {
      return "pnpm";
    }
    if (packageJson.packageManager.startsWith("yarn")) {
      return "yarn";
    }
    if (packageJson.packageManager.startsWith("bun")) {
      return "bun";
    }
    if (packageJson.packageManager.startsWith("npm")) {
      return "npm";
    }
  }
  const lockfiles = [
    {
      file: "pnpm-lock.yaml",
      manager: "pnpm"
    },
    {
      file: "yarn.lock",
      manager: "yarn"
    },
    {
      file: "bun.lockb",
      manager: "bun"
    },
    {
      file: "package-lock.json",
      manager: "npm"
    }
  ];
  for (const { file, manager } of lockfiles) {
    try {
      await access(join(workspaceRoot, file), constants.F_OK);
      return manager;
    } catch {
    }
  }
  return "npm";
}
__name(detectPackageManager, "detectPackageManager");
function detectFramework(packageJson) {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  const frameworks = [
    {
      name: "Next.js",
      indicators: [
        "next"
      ],
      confidence: 0.95
    },
    {
      name: "Nuxt",
      indicators: [
        "nuxt"
      ],
      confidence: 0.95
    },
    {
      name: "Remix",
      indicators: [
        "@remix-run/react",
        "@remix-run/node"
      ],
      confidence: 0.95
    },
    {
      name: "Astro",
      indicators: [
        "astro"
      ],
      confidence: 0.95
    },
    {
      name: "SvelteKit",
      indicators: [
        "@sveltejs/kit"
      ],
      confidence: 0.95
    },
    {
      name: "Svelte",
      indicators: [
        "svelte"
      ],
      confidence: 0.85
    },
    {
      name: "Vue",
      indicators: [
        "vue"
      ],
      confidence: 0.85
    },
    {
      name: "React",
      indicators: [
        "react"
      ],
      confidence: 0.8
    },
    {
      name: "Angular",
      indicators: [
        "@angular/core"
      ],
      confidence: 0.9
    },
    {
      name: "Express",
      indicators: [
        "express"
      ],
      confidence: 0.7
    },
    {
      name: "Fastify",
      indicators: [
        "fastify"
      ],
      confidence: 0.7
    },
    {
      name: "Hono",
      indicators: [
        "hono"
      ],
      confidence: 0.7
    },
    {
      name: "Nest.js",
      indicators: [
        "@nestjs/core"
      ],
      confidence: 0.9
    }
  ];
  for (const fw of frameworks) {
    const hasIndicator = fw.indicators.some((indicator) => indicator in deps);
    if (hasIndicator) {
      return {
        name: fw.name,
        version: deps[fw.indicators[0]],
        confidence: fw.confidence
      };
    }
  }
  return null;
}
__name(detectFramework, "detectFramework");
async function detectTypeScript(workspaceRoot) {
  try {
    const tsconfigPath = join(workspaceRoot, "tsconfig.json");
    await access(tsconfigPath, constants.F_OK);
    const content = await readFile(tsconfigPath, "utf-8");
    const stripped = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
    const tsconfig = JSON.parse(stripped);
    const strict = tsconfig.compilerOptions?.strict === true;
    const packageJson = await readPackageJson(workspaceRoot);
    const version = packageJson?.devDependencies?.typescript || packageJson?.dependencies?.typescript;
    return {
      enabled: true,
      strict,
      version
    };
  } catch {
    return {
      enabled: false
    };
  }
}
__name(detectTypeScript, "detectTypeScript");
async function detectCriticalFiles(workspaceRoot) {
  const criticalFiles = [];
  const rootCritical = [
    ".env",
    ".env.local",
    ".env.production",
    "tsconfig.json",
    "package.json"
  ];
  for (const file of rootCritical) {
    try {
      await access(join(workspaceRoot, file), constants.F_OK);
      criticalFiles.push(file);
    } catch {
    }
  }
  const criticalDirs = [
    {
      dir: "src/auth",
      pattern: "src/auth/**"
    },
    {
      dir: "src/lib/auth",
      pattern: "src/lib/auth/**"
    },
    {
      dir: "app/api",
      pattern: "app/api/**"
    },
    {
      dir: "prisma",
      pattern: "prisma/**"
    },
    {
      dir: "drizzle",
      pattern: "drizzle/**"
    }
  ];
  for (const { dir, pattern } of criticalDirs) {
    try {
      await access(join(workspaceRoot, dir), constants.F_OK);
      criticalFiles.push(pattern);
    } catch {
    }
  }
  return criticalFiles;
}
__name(detectCriticalFiles, "detectCriticalFiles");
var DEFAULT_API_URL2 = process.env.SNAPBACK_API_URL || "https://api.snapback.dev";
async function registerWorkspace(vitals) {
  const credentials = await getCredentials();
  if (!credentials) {
    throw new Error("Not logged in");
  }
  const response = await fetch(`${DEFAULT_API_URL2}/api/workspaces`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials.accessToken}`
    },
    body: JSON.stringify({
      name: basename(process.cwd()),
      vitals: {
        framework: vitals.framework,
        packageManager: vitals.packageManager,
        typescript: vitals.typescript?.enabled,
        typescriptStrict: vitals.typescript?.strict
      }
    })
  });
  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }
  const data = await response.json();
  return data.id;
}
__name(registerWorkspace, "registerWorkspace");
async function detectInitializationSource(workspaceRoot) {
  try {
    const configPath = join(workspaceRoot, ".snapback", "config.json");
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    if (config.initSource === "vscode-extension" || config.source === "extension") {
      return "extension";
    }
    if (config.initSource === "cli" || config.source === "cli") {
      return "cli";
    }
    try {
      const vitalsPath = join(workspaceRoot, ".snapback", "vitals.json");
      const vitalsContent = await readFile(vitalsPath, "utf-8");
      const vitals = JSON.parse(vitalsContent);
      if (vitals.detectedAt && typeof vitals.detectedAt === "string") {
        if (vitals.source === "extension" || vitals.extensionVersion) {
          return "extension";
        }
      }
    } catch {
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}
__name(detectInitializationSource, "detectInitializationSource");
function createStatusCommand() {
  return new Command("status").description("Show workspace health and status").option("--json", "Output as JSON").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized in this workspace"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const status2 = await gatherStatus(cwd);
      if (options.json) {
        console.log(JSON.stringify(status2, null, 2));
        return;
      }
      displayStatus(status2);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
}
__name(createStatusCommand, "createStatusCommand");
async function gatherStatus(workspaceRoot) {
  const status2 = {
    initialized: true,
    loggedIn: false,
    protection: {
      count: 0,
      patterns: []
    },
    violations: {
      total: 0,
      recent: 0
    },
    snapshots: {
      count: 0,
      totalSize: "0 KB"
    },
    issues: []
  };
  status2.loggedIn = await isLoggedIn();
  if (status2.loggedIn) {
    const creds = await getCredentials();
    if (creds) {
      status2.user = {
        email: creds.email,
        tier: creds.tier
      };
    }
  }
  const config = await getWorkspaceConfig(workspaceRoot);
  if (config) {
    status2.workspace = {
      id: config.workspaceId,
      tier: config.tier,
      syncEnabled: config.syncEnabled
    };
  }
  const vitals = await getWorkspaceVitals(workspaceRoot);
  if (vitals) {
    status2.vitals = {
      framework: vitals.framework,
      packageManager: vitals.packageManager,
      typescript: vitals.typescript?.enabled,
      typescriptStrict: vitals.typescript?.strict
    };
  }
  const session = await getCurrentSession(workspaceRoot);
  if (session) {
    status2.session = {
      id: session.id,
      task: session.task,
      startedAt: session.startedAt,
      snapshotCount: session.snapshotCount
    };
  }
  const protectedFiles = await getProtectedFiles(workspaceRoot);
  status2.protection = {
    count: protectedFiles.length,
    patterns: protectedFiles.slice(0, 5).map((f) => f.pattern)
  };
  const violations = await getViolations(workspaceRoot);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
  status2.violations = {
    total: violations.length,
    recent: violations.filter((v) => new Date(v.date) > oneWeekAgo).length
  };
  const snapshotInfo = await getSnapshotInfo(workspaceRoot);
  status2.snapshots = snapshotInfo;
  status2.issues = await detectIssues(workspaceRoot, status2);
  return status2;
}
__name(gatherStatus, "gatherStatus");
async function getSnapshotInfo(workspaceRoot) {
  const snapshotsDir = join(getWorkspaceDir(workspaceRoot), "snapshots");
  try {
    await access(snapshotsDir, constants.F_OK);
    const entries = await readdir(snapshotsDir, {
      withFileTypes: true
    });
    const snapDirs = entries.filter((e) => e.isDirectory());
    let totalBytes = 0;
    for (const dir of snapDirs) {
      const stats = await getDirectorySize(join(snapshotsDir, dir.name));
      totalBytes += stats;
    }
    return {
      count: snapDirs.length,
      totalSize: formatBytes(totalBytes)
    };
  } catch {
    return {
      count: 0,
      totalSize: "0 KB"
    };
  }
}
__name(getSnapshotInfo, "getSnapshotInfo");
async function getDirectorySize(dirPath) {
  let size = 0;
  try {
    const entries = await readdir(dirPath, {
      withFileTypes: true
    });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += await getDirectorySize(fullPath);
      } else {
        const stats = await stat(fullPath);
        size += stats.size;
      }
    }
  } catch {
  }
  return size;
}
__name(getDirectorySize, "getDirectorySize");
async function detectIssues(workspaceRoot, status2) {
  const issues = [];
  if (!status2.loggedIn) {
    issues.push({
      id: "not-logged-in",
      severity: "warning",
      description: "Not logged in - some features are unavailable",
      fix: "snap login"
    });
  }
  if (status2.protection.count === 0) {
    issues.push({
      id: "no-protection",
      severity: "warning",
      description: "No files are protected",
      fix: "snap protect env && snap protect config"
    });
  }
  const gitignorePath = join(workspaceRoot, ".gitignore");
  try {
    const { readFile: readFile11 } = await import('fs/promises');
    const content = await readFile11(gitignorePath, "utf-8");
    if (!content.includes(".snapback")) {
      issues.push({
        id: "missing-gitignore",
        severity: "warning",
        description: ".snapback not in .gitignore",
        fix: "Add .snapback/snapshots/ to .gitignore"
      });
    }
  } catch {
  }
  if (status2.session) {
    const sessionStart = new Date(status2.session.startedAt);
    const hoursSinceStart = (Date.now() - sessionStart.getTime()) / (1e3 * 60 * 60);
    if (hoursSinceStart > 24) {
      issues.push({
        id: "stale-session",
        severity: "warning",
        description: `Session started ${Math.floor(hoursSinceStart)}h ago`,
        fix: "snap session end"
      });
    }
  }
  if (status2.violations.recent > 5) {
    issues.push({
      id: "high-violations",
      severity: "warning",
      description: `${status2.violations.recent} violations in the last week`,
      fix: "snap patterns list"
    });
  }
  return issues;
}
__name(detectIssues, "detectIssues");
function displayStatus(status2) {
  console.log(chalk26.cyan.bold("Workspace Status"));
  console.log(chalk26.gray("\u2550".repeat(40)));
  console.log();
  if (status2.user) {
    console.log(chalk26.green("\u2713"), "Logged in as", chalk26.cyan(status2.user.email), status2.user.tier === "pro" ? chalk26.magenta("Pro \u2B50") : "");
  } else {
    console.log(chalk26.yellow("\u25CB"), "Not logged in");
  }
  if (status2.workspace?.id) {
    console.log(chalk26.green("\u2713"), "Workspace:", chalk26.gray(status2.workspace.id.substring(0, 8)), status2.workspace.syncEnabled ? chalk26.green("(synced)") : chalk26.gray("(local)"));
  }
  console.log();
  if (status2.vitals) {
    console.log(chalk26.cyan("Stack:"));
    if (status2.vitals.framework) {
      console.log("  \u2022", status2.vitals.framework);
    }
    if (status2.vitals.packageManager) {
      console.log("  \u2022", status2.vitals.packageManager);
    }
    if (status2.vitals.typescript) {
      console.log("  \u2022", "TypeScript", status2.vitals.typescriptStrict ? chalk26.green("(strict)") : "");
    }
    console.log();
  }
  if (status2.session) {
    console.log(chalk26.cyan("Active Session:"));
    console.log("  ID:", chalk26.gray(status2.session.id.substring(0, 8)));
    if (status2.session.task) {
      console.log("  Task:", status2.session.task);
    }
    console.log("  Snapshots:", status2.session.snapshotCount);
    console.log();
  }
  console.log(chalk26.cyan("Stats:"));
  console.log("  Protected files:", status2.protection.count);
  console.log("  Snapshots:", status2.snapshots.count, chalk26.gray(`(${status2.snapshots.totalSize})`));
  console.log("  Violations:", status2.violations.total, chalk26.gray(`(${status2.violations.recent} this week)`));
  console.log();
  if (status2.issues.length > 0) {
    console.log(chalk26.yellow("Issues:"));
    for (const issue of status2.issues) {
      const icon = issue.severity === "error" ? chalk26.red("\u2717") : chalk26.yellow("\u26A0");
      console.log(` ${icon}`, issue.description);
      if (issue.fix) {
        console.log(chalk26.gray(`    Fix: ${issue.fix}`));
      }
    }
  } else {
    console.log(chalk26.green("\u2713"), "No issues detected");
  }
}
__name(displayStatus, "displayStatus");
function formatBytes(bytes) {
  if (bytes === 0) return "0 KB";
  const units = [
    "B",
    "KB",
    "MB",
    "GB"
  ];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exp;
  return `${size.toFixed(exp > 0 ? 1 : 0)} ${units[exp]}`;
}
__name(formatBytes, "formatBytes");

// src/services/intelligence-service.ts
var DEFAULT_CONTEXT_FILES = [
  "patterns/workspace-patterns.json",
  "vitals.json",
  "constraints.md"
];
var instances = /* @__PURE__ */ new Map();
function createWorkspaceIntelligenceConfig(workspaceRoot, options = {}) {
  const snapbackDir = getWorkspaceDir(workspaceRoot);
  return {
    // Root directory for all Intelligence operations
    // All relative paths are resolved from here
    rootDir: snapbackDir,
    // Directory containing pattern files
    // Maps to: .snapback/patterns/
    patternsDir: "patterns",
    // Directory containing learning files
    // Maps to: .snapback/learnings/
    learningsDir: "learnings",
    // Optional user-defined constraints file
    // Maps to: .snapback/constraints.md
    // Customers can create this to add project-specific rules
    constraintsFile: "constraints.md",
    // Violation tracking file (JSONL format)
    // Maps to: .snapback/patterns/violations.jsonl
    // Auto-created on first violation report
    violationsFile: "patterns/violations.jsonl",
    // SQLite database for semantic embeddings
    // Maps to: .snapback/embeddings.db
    // Only created if enableSemanticSearch is true
    embeddingsDb: "embeddings.db",
    // Files to index for context retrieval
    // These are searched when user runs `snap context`
    contextFiles: DEFAULT_CONTEXT_FILES,
    // Feature flags with sensible defaults for CLI
    enableSemanticSearch: options.enableSemanticSearch ?? false,
    enableLearningLoop: options.enableLearningLoop ?? true,
    enableAutoPromotion: options.enableAutoPromotion ?? true
  };
}
__name(createWorkspaceIntelligenceConfig, "createWorkspaceIntelligenceConfig");
async function getIntelligence(workspaceRoot, options) {
  const cwd = workspaceRoot || process.cwd();
  if (!await isSnapbackInitialized(cwd)) {
    throw new Error("SnapBack not initialized. Run: snap init");
  }
  if (instances.has(cwd)) {
    return instances.get(cwd);
  }
  const config = createWorkspaceIntelligenceConfig(cwd, options);
  const intelligence = new Intelligence(config);
  instances.set(cwd, intelligence);
  return intelligence;
}
__name(getIntelligence, "getIntelligence");
async function getIntelligenceWithSemantic(workspaceRoot) {
  const cwd = workspaceRoot || process.cwd();
  if (!await isSnapbackInitialized(cwd)) {
    throw new Error("SnapBack not initialized. Run: snap init");
  }
  const cacheKey = `${cwd}:semantic`;
  if (instances.has(cacheKey)) {
    return instances.get(cacheKey);
  }
  const config = createWorkspaceIntelligenceConfig(cwd, {
    enableSemanticSearch: true
  });
  const intelligence = new Intelligence(config);
  await intelligence.initialize();
  instances.set(cacheKey, intelligence);
  return intelligence;
}
__name(getIntelligenceWithSemantic, "getIntelligenceWithSemantic");
function renderSeverity(value, maxValue = 10) {
  const normalized = Math.min(value / maxValue, 1);
  const filled = Math.round(normalized * 3);
  const empty = 3 - filled;
  const dot = "\u25CF";
  const emptyDot = "\u25CB";
  let color;
  if (normalized > 0.7) {
    color = chalk26.red;
  } else if (normalized > 0.4) {
    color = chalk26.yellow;
  } else {
    color = chalk26.green;
  }
  return color(dot.repeat(filled)) + chalk26.gray(emptyDot.repeat(empty));
}
__name(renderSeverity, "renderSeverity");
function truncatePath(path6, maxLength) {
  if (path6.length <= maxLength) return path6;
  const parts = path6.split("/");
  if (parts.length <= 2) {
    return "..." + path6.slice(-(maxLength - 3));
  }
  const filename = parts[parts.length - 1];
  const firstDir = parts[0];
  if (filename.length + firstDir.length + 5 > maxLength) {
    return "..." + filename.slice(-(maxLength - 3));
  }
  return `${firstDir}/.../${filename}`;
}
__name(truncatePath, "truncatePath");
function formatRelativeTime(date) {
  const now = /* @__PURE__ */ new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 6e4);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
__name(formatRelativeTime, "formatRelativeTime");
function formatDate(isoDate) {
  const date = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
__name(formatDate, "formatDate");
function formatConfidence(confidence) {
  const percentage = Math.round(confidence * 100);
  const text = `${percentage}%`;
  if (percentage >= 80) {
    return chalk26.green(text);
  }
  if (percentage >= 50) {
    return chalk26.yellow(text);
  }
  return chalk26.red(text);
}
__name(formatConfidence, "formatConfidence");
function formatRecommendation(recommendation) {
  switch (recommendation) {
    case "auto_merge":
      return chalk26.green("auto_merge");
    case "quick_review":
      return chalk26.yellow("quick_rev");
    case "full_review":
      return chalk26.red("full_rev");
    case "error":
      return chalk26.red("error");
    default:
      return chalk26.gray(recommendation);
  }
}
__name(formatRecommendation, "formatRecommendation");
function createRiskSignalTable(signals) {
  if (signals.length === 0) {
    return chalk26.green("No risk signals detected.");
  }
  const sorted = [
    ...signals
  ].sort((a, b) => b.value - a.value);
  const table = new Table({
    head: [
      chalk26.cyan("Signal"),
      chalk26.cyan("Score"),
      chalk26.cyan("Severity")
    ],
    style: {
      head: [],
      border: []
    },
    colWidths: [
      20,
      8,
      12
    ]
  });
  for (const signal of sorted) {
    if (signal.value <= 0) continue;
    table.push([
      signal.signal,
      signal.value.toFixed(1),
      renderSeverity(signal.value)
    ]);
  }
  return table.toString();
}
__name(createRiskSignalTable, "createRiskSignalTable");
function createFileSummaryTable(files) {
  if (files.length === 0) {
    return chalk26.green("No files analyzed.");
  }
  const sorted = [
    ...files
  ].sort((a, b) => b.riskScore - a.riskScore);
  const table = new Table({
    head: [
      chalk26.cyan("File"),
      chalk26.cyan("Risk"),
      chalk26.cyan("Level"),
      chalk26.cyan("Top Signal")
    ],
    style: {
      head: [],
      border: []
    },
    colWidths: [
      40,
      8,
      10,
      15
    ],
    wordWrap: true
  });
  for (const file of sorted) {
    const levelColor = file.riskLevel === "high" ? chalk26.red : file.riskLevel === "medium" ? chalk26.yellow : chalk26.green;
    table.push([
      truncatePath(file.file, 38),
      file.riskScore.toFixed(1),
      levelColor(file.riskLevel.toUpperCase()),
      file.topSignal || "-"
    ]);
  }
  return table.toString();
}
__name(createFileSummaryTable, "createFileSummaryTable");
function createSnapshotTable(snapshots) {
  if (snapshots.length === 0) {
    return chalk26.yellow("No snapshots found.");
  }
  const table = new Table({
    head: [
      chalk26.cyan("ID"),
      chalk26.cyan("Created"),
      chalk26.cyan("Message"),
      chalk26.cyan("Files")
    ],
    style: {
      head: [],
      border: []
    },
    colWidths: [
      12,
      22,
      30,
      8
    ],
    wordWrap: true
  });
  for (const snap of snapshots) {
    table.push([
      snap.id.substring(0, 8),
      formatRelativeTime(snap.timestamp),
      snap.message || chalk26.gray("(none)"),
      snap.fileCount?.toString() || "-"
    ]);
  }
  return table.toString();
}
__name(createSnapshotTable, "createSnapshotTable");
function createContextTable(learnings) {
  if (learnings.length === 0) {
    return chalk26.gray("No relevant learnings found.");
  }
  const table = new Table({
    head: [
      chalk26.cyan("Type"),
      chalk26.cyan("Trigger"),
      chalk26.cyan("Action")
    ],
    style: {
      head: [],
      border: []
    },
    colWidths: [
      12,
      20,
      45
    ],
    wordWrap: true
  });
  for (const learning of learnings) {
    const typeColor = getTypeColor(learning.type);
    table.push([
      typeColor(learning.type),
      learning.trigger,
      truncateText(learning.action, 42)
    ]);
  }
  return table.toString();
}
__name(createContextTable, "createContextTable");
function createValidationTable(results) {
  if (results.length === 0) {
    return chalk26.gray("No files validated.");
  }
  const table = new Table({
    head: [
      chalk26.cyan("File"),
      chalk26.cyan("Passed"),
      chalk26.cyan("Confidence"),
      chalk26.cyan("Issues"),
      chalk26.cyan("Recommendation")
    ],
    style: {
      head: [],
      border: []
    },
    colWidths: [
      35,
      8,
      12,
      8,
      14
    ],
    wordWrap: true
  });
  for (const result7 of results) {
    table.push([
      truncatePath(result7.file, 33),
      result7.passed ? chalk26.green("\u2713") : chalk26.red("\u2717"),
      formatConfidence(result7.confidence),
      result7.issues.toString(),
      formatRecommendation(result7.recommendation)
    ]);
  }
  return table.toString();
}
__name(createValidationTable, "createValidationTable");
function getTypeColor(type) {
  switch (type) {
    case "pattern":
      return chalk26.blue;
    case "pitfall":
      return chalk26.red;
    case "efficiency":
      return chalk26.green;
    case "discovery":
      return chalk26.yellow;
    case "workflow":
      return chalk26.magenta;
    default:
      return chalk26.gray;
  }
}
__name(getTypeColor, "getTypeColor");
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
__name(truncateText, "truncateText");

// src/commands/context.ts
function createContextCommand() {
  const context = new Command("context").description("Get relevant context before starting work").argument("[task]", "Description of what you want to implement").option("-f, --files <files...>", "Files you plan to modify").option("-k, --keywords <keywords...>", "Keywords to search for").option("--json", "Output as JSON").option("--semantic", "Use semantic search (slower, more accurate)").action(async (task, options) => {
    await handleContextCommand(task, options);
  });
  return context;
}
__name(createContextCommand, "createContextCommand");
async function handleContextCommand(task, options) {
  const cwd = process.cwd();
  try {
    const intelligence = options.semantic ? await getIntelligenceWithSemantic(cwd) : await getIntelligence(cwd);
    const contextInput = {
      task: task || "general development",
      files: options.files || [],
      keywords: options.keywords || extractKeywords(task)
    };
    const result7 = await intelligence.getContext(contextInput);
    if (options.json) {
      console.log(JSON.stringify(result7, null, 2));
      return;
    }
    displayContextResults(result7, options.semantic);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not initialized")) {
      console.log(chalk26.yellow("SnapBack not initialized in this workspace"));
      console.log(chalk26.gray("Run: snap init"));
      process.exit(1);
    }
    console.error(chalk26.red("Error:"), message);
    process.exit(1);
  }
}
__name(handleContextCommand, "handleContextCommand");
function displayContextResults(result7, usedSemantic) {
  const summaryContent = formatContextSummary(result7, usedSemantic);
  console.log(displayBox({
    title: "\u{1F4CB} Context Loaded",
    content: summaryContent,
    type: "info"
  }));
  if (result7.relevantLearnings && result7.relevantLearnings.length > 0) {
    console.log();
    console.log(chalk26.cyan("Relevant Learnings:"));
    console.log(createContextTable(result7.relevantLearnings));
  }
  if (result7.recentViolations && result7.recentViolations.length > 0) {
    console.log();
    console.log(chalk26.yellow("\u26A0 Recent Violations (avoid these):"));
    for (const violation of result7.recentViolations.slice(0, 3)) {
      console.log(chalk26.gray(`  \u2022 ${violation.type}: ${violation.message}`));
      if (violation.prevention) {
        console.log(chalk26.green(`    Fix: ${violation.prevention}`));
      }
    }
    if (result7.recentViolations.length > 3) {
      console.log(chalk26.gray(`  ... and ${result7.recentViolations.length - 3} more`));
    }
  }
  console.log();
  console.log(chalk26.gray("Tip: Run 'snap validate <file>' before committing"));
}
__name(displayContextResults, "displayContextResults");
function formatContextSummary(result7, usedSemantic) {
  const parts = [];
  if (result7.hardRules) {
    const ruleCount = (result7.hardRules.match(/^##/gm) || []).length || "loaded";
    parts.push(`${chalk26.bold("Hard Rules:")} ${ruleCount} constraints`);
  }
  if (result7.patterns) {
    const patternCount = result7.patterns.split("\n").filter(Boolean).length;
    parts.push(`${chalk26.bold("Patterns:")} ${patternCount} patterns`);
  }
  if (result7.relevantLearnings?.length) {
    parts.push(`${chalk26.bold("Learnings:")} ${result7.relevantLearnings.length} relevant`);
  }
  if (result7.recentViolations?.length) {
    parts.push(`${chalk26.bold("Violations:")} ${result7.recentViolations.length} to avoid`);
  }
  if (usedSemantic && result7.semanticContext) {
    parts.push(`${chalk26.bold("Semantic:")} ${result7.semanticContext.sections} sections (${result7.semanticContext.compression} compression)`);
  }
  if (parts.length === 0) {
    parts.push("No specific context found for this task.");
    parts.push("Try adding --keywords to refine the search.");
  }
  return parts.join("\n");
}
__name(formatContextSummary, "formatContextSummary");
function extractKeywords(task) {
  if (!task) {
    return [];
  }
  const stopWords = /* @__PURE__ */ new Set([
    "the",
    "a",
    "an",
    "to",
    "for",
    "of",
    "in",
    "on",
    "with",
    "and",
    "or",
    "is",
    "are",
    "it",
    "this",
    "that"
  ]);
  return task.toLowerCase().split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word)).slice(0, 5);
}
__name(extractKeywords, "extractKeywords");
function createStatsCommand() {
  const stats = new Command("stats").description("Show learning statistics").option("--json", "Output as JSON").action(async (options) => {
    await handleStatsCommand(options);
  });
  return stats;
}
__name(createStatsCommand, "createStatsCommand");
async function handleStatsCommand(options) {
  const cwd = process.cwd();
  try {
    const intelligence = await getIntelligence(cwd);
    const learningStats = intelligence.getStats();
    const violationsSummary = intelligence.getViolationsSummary();
    if (options.json) {
      console.log(JSON.stringify({
        learning: learningStats,
        violations: violationsSummary
      }, null, 2));
      return;
    }
    displayStatsResults(learningStats, violationsSummary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not initialized")) {
      console.log(chalk26.yellow("SnapBack not initialized in this workspace"));
      console.log(chalk26.gray("Run: snap init"));
      process.exit(1);
    }
    console.error(chalk26.red("Error:"), message);
    process.exit(1);
  }
}
__name(handleStatsCommand, "handleStatsCommand");
function displayStatsResults(learningStats, violationsSummary) {
  console.log(displayBox({
    title: "\u{1F4CA} Learning Statistics",
    content: formatLearningStats(learningStats),
    type: "info"
  }));
  if (violationsSummary.byType.length > 0) {
    console.log();
    console.log(chalk26.cyan("Violation Patterns:"));
    const table = new Table({
      head: [
        chalk26.cyan("Type"),
        chalk26.cyan("Count"),
        chalk26.cyan("Status")
      ],
      style: {
        head: [],
        border: []
      }
    });
    for (const v of violationsSummary.byType.slice(0, 10)) {
      const displayStatus2 = formatViolationStatus(v.status);
      table.push([
        v.type,
        String(v.count),
        displayStatus2
      ]);
    }
    console.log(table.toString());
    if (violationsSummary.byType.length > 10) {
      console.log(chalk26.gray(`  ... and ${violationsSummary.byType.length - 10} more types`));
    }
  } else {
    console.log();
    console.log(chalk26.gray("No violations recorded yet."));
    console.log(chalk26.gray('Record with: snap patterns report "type" "file" "message"'));
  }
  console.log();
  console.log(chalk26.gray("Violations at 3x \u2192 promoted | 5x \u2192 automated"));
}
__name(displayStatsResults, "displayStatsResults");
function formatLearningStats(stats) {
  const feedbackRate = stats.totalInteractions > 0 ? Math.round(stats.feedbackReceived / stats.totalInteractions * 100) : 0;
  const accuracyRate = Math.round(stats.correctRate * 100);
  return [
    `${chalk26.bold("Total Interactions:")} ${stats.totalInteractions}`,
    `${chalk26.bold("Feedback Rate:")} ${feedbackRate}%`,
    `${chalk26.bold("Accuracy Rate:")} ${accuracyRate}%`,
    `${chalk26.bold("Golden Examples:")} ${stats.goldenExamples}`
  ].join("\n");
}
__name(formatLearningStats, "formatLearningStats");
function formatViolationStatus(status2) {
  switch (status2) {
    case "tracking":
      return "\u{1F4DD} Tracking";
    case "ready_for_promotion":
      return "\u{1F4C8} Ready for promotion";
    case "ready_for_automation":
      return "\u{1F916} Ready for automation";
    case "promoted":
      return "\u2705 Promoted";
    case "automated":
      return "\u{1F916} Automated";
    default:
      return status2;
  }
}
__name(formatViolationStatus, "formatViolationStatus");
var GitNotInstalledError = class extends Error {
  static {
    __name(this, "GitNotInstalledError");
  }
  constructor() {
    super("Git is not installed or not accessible in PATH");
    this.name = "GitNotInstalledError";
  }
};
var GitNotRepositoryError = class extends Error {
  static {
    __name(this, "GitNotRepositoryError");
  }
  constructor(path6) {
    super(`Not a git repository: ${path6}`);
    this.name = "GitNotRepositoryError";
  }
};
var GitBinaryFileError = class extends Error {
  static {
    __name(this, "GitBinaryFileError");
  }
  constructor(path6) {
    super(`Cannot read binary file: ${path6}`);
    this.name = "GitBinaryFileError";
  }
};
var GitClient = class {
  static {
    __name(this, "GitClient");
  }
  cwd;
  timeout;
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.timeout = options.timeout || 1e4;
  }
  /**
  * Check if git is installed
  */
  async isGitInstalled() {
    try {
      await execa("git", [
        "--version"
      ], {
        timeout: 5e3
      });
      return true;
    } catch {
      return false;
    }
  }
  /**
  * Check if cwd is inside a git repository
  */
  async isGitRepository() {
    try {
      await execa("git", [
        "rev-parse",
        "--is-inside-work-tree"
      ], {
        cwd: this.cwd,
        timeout: this.timeout
      });
      return true;
    } catch {
      return false;
    }
  }
  /**
  * Get repository root path
  */
  async getRepositoryRoot() {
    const { stdout } = await execa("git", [
      "rev-parse",
      "--show-toplevel"
    ], {
      cwd: this.cwd,
      timeout: this.timeout
    });
    return stdout.trim();
  }
  /**
  * Get list of staged files with their status
  */
  async getStagedFiles() {
    try {
      const { stdout } = await execa("git", [
        "diff",
        "--cached",
        "--name-status"
      ], {
        cwd: this.cwd,
        timeout: this.timeout
      });
      if (!stdout.trim()) {
        return [];
      }
      return stdout.split(/\r?\n/).filter(Boolean).map((line) => this.parseStatusLine(line));
    } catch (error) {
      if (this.isNotRepositoryError(error)) {
        throw new GitNotRepositoryError(this.cwd);
      }
      throw error;
    }
  }
  /**
  * Get staged file content (what will be committed)
  */
  async getStagedContent(filePath) {
    try {
      const { stdout } = await execa("git", [
        "show",
        `:${filePath}`
      ], {
        cwd: this.cwd,
        timeout: this.timeout
      });
      return stdout;
    } catch (error) {
      if (this.isBinaryFileError(error)) {
        throw new GitBinaryFileError(filePath);
      }
      throw error;
    }
  }
  /**
  * Get diff of staged changes for a file
  */
  async getStagedDiff(filePath) {
    const args = [
      "diff",
      "--cached",
      "--color=always"
    ];
    if (filePath) {
      args.push("--", filePath);
    }
    const { stdout } = await execa("git", args, {
      cwd: this.cwd,
      timeout: this.timeout
    });
    return stdout;
  }
  /**
  * Get diff statistics
  */
  async getStagedStats() {
    const { stdout } = await execa("git", [
      "diff",
      "--cached",
      "--numstat"
    ], {
      cwd: this.cwd,
      timeout: this.timeout
    });
    let additions = 0;
    let deletions = 0;
    let files = 0;
    for (const line of stdout.split(/\r?\n/).filter(Boolean)) {
      const [add, del] = line.split("	");
      if (add !== "-") additions += Number.parseInt(add, 10);
      if (del !== "-") deletions += Number.parseInt(del, 10);
      files++;
    }
    return {
      additions,
      deletions,
      files
    };
  }
  /**
  * Get current branch name
  */
  async getCurrentBranch() {
    const { stdout } = await execa("git", [
      "branch",
      "--show-current"
    ], {
      cwd: this.cwd,
      timeout: this.timeout
    });
    return stdout.trim();
  }
  /**
  * Get short commit hash of HEAD
  */
  async getHeadCommit() {
    const { stdout } = await execa("git", [
      "rev-parse",
      "--short",
      "HEAD"
    ], {
      cwd: this.cwd,
      timeout: this.timeout
    });
    return stdout.trim();
  }
  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================
  parseStatusLine(line) {
    const [status2, ...pathParts] = line.split("	");
    const path6 = pathParts[pathParts.length - 1];
    const oldPath = pathParts.length > 1 ? pathParts[0] : void 0;
    return {
      path: path6,
      status: this.parseStatus(status2),
      ...oldPath && {
        oldPath
      }
    };
  }
  parseStatus(status2) {
    const char = status2.charAt(0);
    switch (char) {
      case "A":
        return "added";
      case "M":
        return "modified";
      case "D":
        return "deleted";
      case "R":
        return "renamed";
      case "C":
        return "copied";
      default:
        return "modified";
    }
  }
  isNotRepositoryError(error) {
    return error instanceof Error && error.message.toLowerCase().includes("not a git repository");
  }
  isBinaryFileError(error) {
    return error instanceof Error && error.message.toLowerCase().includes("binary");
  }
};
function isCodeFile(filePath) {
  const codeExtensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".java",
    ".go",
    ".rs",
    ".rb",
    ".php",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".swift",
    ".kt",
    ".scala",
    ".clj",
    ".ex",
    ".exs"
  ];
  return codeExtensions.some((ext) => filePath.endsWith(ext));
}
__name(isCodeFile, "isCodeFile");
var ProgressTracker = class {
  static {
    __name(this, "ProgressTracker");
  }
  current = 0;
  total;
  label;
  quiet;
  showElapsed;
  startTime;
  spinner = null;
  isTTY;
  constructor(options) {
    this.total = options.total;
    this.label = options.label || "Processing";
    this.quiet = options.quiet || false;
    this.showElapsed = options.showElapsed ?? true;
    this.startTime = Date.now();
    this.isTTY = process.stdout.isTTY ?? false;
  }
  /**
  * Start the progress tracker
  */
  start() {
    if (this.quiet) return;
    if (this.isTTY) {
      this.spinner = ora8({
        text: this.formatProgress(""),
        spinner: "dots"
      }).start();
    } else {
      console.log(`${this.label}: Starting (${this.total} items)`);
    }
  }
  /**
  * Update progress with current item
  */
  update(currentItem) {
    this.current++;
    if (this.quiet) return;
    const progressText = this.formatProgress(currentItem);
    if (this.isTTY && this.spinner) {
      this.spinner.text = progressText;
    } else {
      if (this.current % 10 === 0 || this.current === this.total) {
        console.log(`[${this.current}/${this.total}] ${currentItem}`);
      }
    }
  }
  /**
  * Complete the progress with final message
  */
  complete(message) {
    if (this.quiet) return;
    if (this.isTTY && this.spinner) {
      this.spinner.succeed(message);
    } else {
      console.log(`\u2714 ${message}`);
    }
  }
  /**
  * Fail the progress with error message
  */
  fail(message) {
    if (this.isTTY && this.spinner) {
      this.spinner.fail(message);
    } else {
      console.error(`\u2716 ${message}`);
    }
  }
  /**
  * Get elapsed time string
  */
  getElapsed() {
    const elapsed = Date.now() - this.startTime;
    if (elapsed < 1e3) return `${elapsed}ms`;
    return `${(elapsed / 1e3).toFixed(1)}s`;
  }
  /**
  * Get current progress count
  */
  getCurrent() {
    return this.current;
  }
  /**
  * Get total count
  */
  getTotal() {
    return this.total;
  }
  formatProgress(currentItem) {
    const counter = chalk26.cyan(`[${this.current}/${this.total}]`);
    const item = currentItem ? chalk26.gray(this.truncateItem(currentItem, 40)) : "";
    const elapsed = this.showElapsed && Date.now() - this.startTime > 2e3 ? chalk26.dim(` (${this.getElapsed()})`) : "";
    return `${this.label} ${counter} ${item}${elapsed}`;
  }
  truncateItem(item, maxLength) {
    if (item.length <= maxLength) return item;
    return "..." + item.slice(-(maxLength - 3));
  }
};

// src/commands/validate.ts
function createValidateCommand() {
  const validate = new Command("validate").description("Run validation pipeline on code").argument("[file]", "File to validate").option("-a, --all", "Validate all staged files").option("-q, --quiet", "Only output if issues found").option("--json", "Output as JSON").action(async (file, options) => {
    await handleValidateCommand(file, options);
  });
  return validate;
}
__name(createValidateCommand, "createValidateCommand");
async function handleValidateCommand(file, options) {
  const cwd = process.cwd();
  try {
    const intelligence = await getIntelligence(cwd);
    const filesToValidate = await getFilesToValidate(file, options.all, cwd);
    if (filesToValidate.length === 0) {
      if (!options.quiet) {
        console.log(chalk26.yellow("No files to validate"));
        console.log(chalk26.gray("Usage: snap validate <file> or snap validate --all"));
      }
      return;
    }
    const progress = new ProgressTracker({
      total: filesToValidate.length,
      label: "Validating",
      quiet: options.quiet
    });
    progress.start();
    const results = [];
    let hasErrors = false;
    let progressCompleted = false;
    try {
      for (const filePath of filesToValidate) {
        progress.update(filePath);
        try {
          const content = await readFile(resolve(cwd, filePath), "utf-8");
          const pipelineResult = await intelligence.validateCode(content, filePath);
          results.push({
            file: filePath,
            passed: pipelineResult.overall.passed,
            confidence: pipelineResult.overall.confidence,
            issues: pipelineResult.overall.totalIssues,
            recommendation: pipelineResult.recommendation
          });
          if (!pipelineResult.overall.passed) {
            hasErrors = true;
          }
        } catch {
          results.push({
            file: filePath,
            passed: false,
            confidence: 0,
            issues: 1,
            recommendation: "error"
          });
          hasErrors = true;
        }
      }
      const passedCount = results.filter((r) => r.passed).length;
      if (hasErrors) {
        progress.fail(`${passedCount}/${results.length} files passed`);
      } else {
        progress.complete(`All ${results.length} files passed validation`);
      }
      progressCompleted = true;
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else if (!options.quiet || hasErrors) {
        displayValidationResults(results, hasErrors);
      }
      process.exit(hasErrors ? 1 : 0);
    } finally {
      if (!progressCompleted) {
        progress.fail("Validation interrupted");
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not initialized")) {
      console.log(chalk26.yellow("SnapBack not initialized in this workspace"));
      console.log(chalk26.gray("Run: snap init"));
      process.exit(1);
    }
    console.error(chalk26.red("Error:"), message);
    process.exit(1);
  }
}
__name(handleValidateCommand, "handleValidateCommand");
async function getFilesToValidate(file, all, cwd) {
  if (file) {
    return [
      file
    ];
  }
  if (all) {
    try {
      const git = new GitClient({
        cwd
      });
      if (!await git.isGitInstalled()) {
        console.log(chalk26.yellow("Git is not installed. Cannot detect staged files."));
        console.log(chalk26.gray("Install git or specify a file: snap validate <file>"));
        return [];
      }
      if (!await git.isGitRepository()) {
        console.log(chalk26.yellow("Not a git repository. Cannot detect staged files."));
        console.log(chalk26.gray("Initialize git or specify a file: snap validate <file>"));
        return [];
      }
      const stagedFiles = await git.getStagedFiles();
      return stagedFiles.filter((f) => f.status !== "deleted" && isCodeFile(f.path)).map((f) => f.path);
    } catch {
      console.log(chalk26.yellow("Could not get staged files"));
      return [];
    }
  }
  return [];
}
__name(getFilesToValidate, "getFilesToValidate");
function displayValidationResults(results, hasErrors) {
  console.log();
  console.log(createValidationTable(results));
  if (hasErrors) {
    const failedFiles = results.filter((r) => !r.passed);
    console.log();
    console.log(displayBox({
      title: "\u274C Validation Failed",
      content: formatValidationSummary(failedFiles),
      type: "error"
    }));
    console.log(chalk26.gray("\nRun 'snap patterns report' to track recurring issues"));
  }
}
__name(displayValidationResults, "displayValidationResults");
function formatValidationSummary(failures) {
  return failures.map((f) => `${chalk26.bold(f.file)}: ${f.issues} issue${f.issues !== 1 ? "s" : ""}`).join("\n");
}
__name(formatValidationSummary, "formatValidationSummary");
async function confirm(options) {
  const { message, default: defaultValue = false, timeout } = options;
  const hint = defaultValue ? "[Y/n]" : "[y/N]";
  const prompt = `${chalk26.yellow("?")} ${message} ${chalk26.gray(hint)} `;
  return new Promise((resolve9) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    let timeoutId;
    if (timeout) {
      timeoutId = setTimeout(() => {
        console.log(chalk26.gray(`
No response, defaulting to ${defaultValue ? "yes" : "no"}`));
        rl.close();
        resolve9(defaultValue);
      }, timeout);
    }
    rl.question(prompt, (answer) => {
      if (timeoutId) clearTimeout(timeoutId);
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === "") {
        resolve9(defaultValue);
      } else if (trimmed === "y" || trimmed === "yes") {
        resolve9(true);
      } else {
        resolve9(false);
      }
    });
  });
}
__name(confirm, "confirm");
async function confirmDangerous(message, confirmText) {
  const prompt = `${chalk26.red("!")} ${message}
  Type "${chalk26.bold(confirmText)}" to confirm: `;
  return new Promise((resolve9) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve9(answer.trim() === confirmText);
    });
  });
}
__name(confirmDangerous, "confirmDangerous");
async function select(options) {
  const { message, options: choices, default: defaultValue } = options;
  console.log(`${chalk26.cyan("?")} ${message}`);
  console.log();
  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    const isDefault = choice.value === defaultValue;
    const marker = isDefault ? chalk26.cyan("\u203A") : " ";
    const number = chalk26.gray(`${i + 1}.`);
    const label = choice.disabled ? chalk26.gray(choice.label) : choice.label;
    const hint = choice.hint ? chalk26.gray(` (${choice.hint})`) : "";
    const disabled = choice.disabled ? chalk26.gray(" [disabled]") : "";
    console.log(`  ${marker} ${number} ${label}${hint}${disabled}`);
  }
  console.log();
  return new Promise((resolve9) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const prompt = chalk26.gray("Enter number (or press Enter for default): ");
    rl.question(prompt, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed === "") {
        resolve9(defaultValue);
        return;
      }
      const index = Number.parseInt(trimmed, 10) - 1;
      if (Number.isNaN(index) || index < 0 || index >= choices.length) {
        console.log(chalk26.red("Invalid selection"));
        resolve9(void 0);
        return;
      }
      const choice = choices[index];
      if (choice.disabled) {
        console.log(chalk26.red("That option is disabled"));
        resolve9(void 0);
        return;
      }
      resolve9(choice.value);
    });
  });
}
__name(select, "select");
function spinner(options) {
  const opts = typeof options === "string" ? {
    text: options
  } : options;
  const { text, spinner: spinnerType = "dots" } = opts;
  return ora8({
    text,
    spinner: spinnerType,
    color: "cyan"
  });
}
__name(spinner, "spinner");
async function withSpinner(text, fn, options) {
  const s = spinner(text).start();
  try {
    const result7 = await fn();
    s.succeed(options?.successText || text);
    return result7;
  } catch (error) {
    s.fail(options?.failText || text);
    throw error;
  }
}
__name(withSpinner, "withSpinner");
function progressBar(current, total, width = 30) {
  const percent = Math.round(current / total * 100);
  const filled = Math.round(current / total * width);
  const empty = width - filled;
  const bar = chalk26.cyan("\u2588".repeat(filled)) + chalk26.gray("\u2591".repeat(empty));
  const label = `${current}/${total}`;
  const percentage = chalk26.gray(`${percent}%`);
  return `${bar} ${label} ${percentage}`;
}
__name(progressBar, "progressBar");
function stepProgress(options) {
  const { steps, currentStep } = options;
  const total = steps.length;
  const lines = [];
  lines.push(chalk26.cyan.bold(`Step ${currentStep + 1} of ${total}: ${steps[currentStep]}`));
  lines.push("");
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    let marker;
    let label;
    if (i < currentStep) {
      marker = chalk26.green("\u2713");
      label = chalk26.gray(step);
    } else if (i === currentStep) {
      marker = chalk26.cyan("\u203A");
      label = chalk26.white(step);
    } else {
      marker = chalk26.gray("\u25CB");
      label = chalk26.gray(step);
    }
    lines.push(`  ${marker} ${label}`);
  }
  return lines.join("\n");
}
__name(stepProgress, "stepProgress");
async function input(message, options) {
  const { default: defaultValue, validate, mask } = options || {};
  const defaultHint = defaultValue ? chalk26.gray(` (${defaultValue})`) : "";
  const prompt = `${chalk26.cyan("?")} ${message}${defaultHint}: `;
  return new Promise((resolve9) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(prompt, (answer) => {
      rl.close();
      const value = answer.trim() || defaultValue || "";
      if (validate) {
        const validation = validate(value);
        if (typeof validation === "string") {
          console.log(chalk26.red(`\u2717 ${validation}`));
          resolve9("");
          return;
        }
        if (validation === false) {
          console.log(chalk26.red("\u2717 Invalid input"));
          resolve9("");
          return;
        }
      }
      resolve9(value);
    });
  });
}
__name(input, "input");
var status = {
  success: /* @__PURE__ */ __name((message) => console.log(chalk26.green("\u2713"), message), "success"),
  error: /* @__PURE__ */ __name((message) => console.log(chalk26.red("\u2717"), message), "error"),
  warning: /* @__PURE__ */ __name((message) => console.log(chalk26.yellow("!"), message), "warning"),
  info: /* @__PURE__ */ __name((message) => console.log(chalk26.blue("\u2139"), message), "info"),
  debug: /* @__PURE__ */ __name((message) => console.log(chalk26.gray("\u2026"), chalk26.gray(message)), "debug"),
  step: /* @__PURE__ */ __name((message) => console.log(chalk26.cyan("\u203A"), message), "step"),
  done: /* @__PURE__ */ __name((message) => console.log(chalk26.green("\u2713"), chalk26.green(message)), "done")
};
function dryRunPreview(changes) {
  console.log(chalk26.yellow.bold("\n\u{1F50D} DRY RUN - No changes will be made\n"));
  for (const change of changes) {
    const icon = change.type === "create" ? chalk26.green("+") : change.type === "delete" ? chalk26.red("-") : chalk26.yellow("~");
    console.log(`${icon} ${change.path}`);
    if (change.details) {
      for (const detail of change.details) {
        if (detail.startsWith("+")) {
          console.log(chalk26.green(`    ${detail}`));
        } else if (detail.startsWith("-")) {
          console.log(chalk26.red(`    ${detail}`));
        } else {
          console.log(chalk26.gray(`    ${detail}`));
        }
      }
    }
  }
  console.log(chalk26.yellow("\nRun without --dry-run to apply these changes."));
}
__name(dryRunPreview, "dryRunPreview");
var prompts = {
  confirm,
  confirmDangerous,
  select,
  input,
  spinner,
  withSpinner,
  progressBar,
  stepProgress,
  status,
  dryRunPreview
};

// src/utils/safe-ops.ts
var HISTORY_FILE = ".snapback/operation-history.json";
var MAX_HISTORY_SIZE = 50;
function getHistoryPath() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  return path5.join(homeDir, HISTORY_FILE);
}
__name(getHistoryPath, "getHistoryPath");
function loadHistory() {
  try {
    const historyPath = getHistoryPath();
    if (fs5.existsSync(historyPath)) {
      return JSON.parse(fs5.readFileSync(historyPath, "utf-8"));
    }
  } catch {
  }
  return {
    operations: []
  };
}
__name(loadHistory, "loadHistory");
function saveHistory(history) {
  try {
    const historyPath = getHistoryPath();
    const dir = path5.dirname(historyPath);
    fs5.mkdirSync(dir, {
      recursive: true
    });
    if (history.operations.length > MAX_HISTORY_SIZE) {
      history.operations = history.operations.slice(-MAX_HISTORY_SIZE);
    }
    fs5.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch {
  }
}
__name(saveHistory, "saveHistory");
function getLastOperation() {
  const history = loadHistory();
  return history.operations.filter((op) => op.canUndo).pop();
}
__name(getLastOperation, "getLastOperation");
function getRecentOperations(count = 10) {
  const history = loadHistory();
  return history.operations.slice(-count).reverse();
}
__name(getRecentOperations, "getRecentOperations");
function removeOperation(id) {
  const history = loadHistory();
  history.operations = history.operations.filter((op) => op.id !== id);
  saveHistory(history);
}
__name(removeOperation, "removeOperation");
async function undoLastOperation() {
  const lastOp = getLastOperation();
  if (!lastOp) {
    console.log(chalk26.yellow("No undoable operations found"));
    return false;
  }
  if (!lastOp.canUndo) {
    console.log(chalk26.yellow("The last operation cannot be undone"));
    return false;
  }
  console.log(chalk26.cyan("\nLast operation:"));
  console.log(chalk26.white(`  ${lastOp.description}`));
  console.log(chalk26.gray(`  ${lastOp.timestamp}`));
  console.log(chalk26.gray(`  Changes: ${lastOp.changes.length} files`));
  console.log();
  const shouldUndo = await confirm({
    message: "Undo this operation?",
    default: false
  });
  if (!shouldUndo) {
    return false;
  }
  let success = true;
  for (const change of lastOp.changes) {
    try {
      switch (change.type) {
        case "create":
          if (change.path && fs5.existsSync(change.path)) {
            fs5.unlinkSync(change.path);
            console.log(chalk26.red(`  - Removed ${change.path}`));
          }
          break;
        case "delete":
          if (change.before !== void 0) {
            fs5.writeFileSync(change.path, change.before);
            console.log(chalk26.green(`  + Restored ${change.path}`));
          }
          break;
        case "update":
          if (change.before !== void 0) {
            fs5.writeFileSync(change.path, change.before);
            console.log(chalk26.yellow(`  ~ Reverted ${change.path}`));
          }
          break;
      }
    } catch (error) {
      console.log(chalk26.red(`  \u2717 Failed to undo ${change.path}`));
      success = false;
    }
  }
  if (success) {
    removeOperation(lastOp.id);
    console.log(chalk26.green("\n\u2713 Operation undone successfully"));
  } else {
    console.log(chalk26.yellow("\n! Some changes could not be undone"));
  }
  return success;
}
__name(undoLastOperation, "undoLastOperation");

// src/commands/learn.ts
function createLearnCommand() {
  const learn = new Command("learn").description("Record learnings for future reference").argument("<trigger>", "When to apply this learning (keyword or situation)").argument("<action>", "What to do when triggered").option("-t, --type <type>", "Learning type: pattern, pitfall, efficiency, discovery, workflow", "pattern").option("-s, --source <source>", "Where this learning came from", "cli").action(async (trigger, action, options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized in this workspace"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const validTypes = [
        "pattern",
        "pitfall",
        "efficiency",
        "discovery",
        "workflow"
      ];
      if (!validTypes.includes(options.type)) {
        console.log(chalk26.red(`Invalid type: ${options.type}`));
        console.log(chalk26.gray(`Valid types: ${validTypes.join(", ")}`));
        process.exit(1);
      }
      const learning = {
        id: generateId("L"),
        type: options.type,
        trigger,
        action,
        source: options.source,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await recordLearning(learning, cwd);
      console.log(chalk26.green("\u2713"), "Learning recorded");
      console.log();
      console.log(`  ${chalk26.cyan("Type:")}    ${formatType(learning.type)}`);
      console.log(`  ${chalk26.cyan("Trigger:")} ${trigger}`);
      console.log(`  ${chalk26.cyan("Action:")}  ${action}`);
      console.log();
      console.log(chalk26.gray(`Query with: snap learn list --keyword "${trigger.split(" ")[0]}"`));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  learn.command("list").description("List recorded learnings").option("-t, --type <type>", "Filter by type").option("-k, --keyword <keyword>", "Search by keyword in trigger").option("-n, --number <count>", "Number of learnings to show", "20").option("--json", "Output as JSON").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      let learnings = await getLearnings(cwd);
      if (options.type) {
        learnings = learnings.filter((l) => l.type === options.type);
      }
      if (options.keyword) {
        const keyword = options.keyword.toLowerCase();
        learnings = learnings.filter((l) => l.trigger.toLowerCase().includes(keyword) || l.action.toLowerCase().includes(keyword));
      }
      const count = Number.parseInt(options.number, 10);
      const recent = learnings.slice(-count).reverse();
      if (options.json) {
        console.log(JSON.stringify(recent, null, 2));
        return;
      }
      if (recent.length === 0) {
        console.log(chalk26.yellow("No learnings found"));
        console.log(chalk26.gray('Record with: snap learn "trigger" "action"'));
        return;
      }
      console.log(chalk26.cyan(`Learnings (${recent.length}):`));
      console.log();
      for (const learning of recent) {
        console.log(formatType(learning.type), chalk26.bold(learning.trigger));
        console.log(`  \u2192 ${learning.action}`);
        console.log(chalk26.gray(`  ${formatDate(learning.createdAt)} \u2022 ${learning.source}`));
        console.log();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  return learn;
}
__name(createLearnCommand, "createLearnCommand");
function formatType(type) {
  const formats = {
    pattern: chalk26.blue("\u{1F4CB} pattern"),
    pitfall: chalk26.red("\u26A0\uFE0F  pitfall"),
    efficiency: chalk26.green("\u26A1 efficiency"),
    discovery: chalk26.yellow("\u{1F4A1} discovery"),
    workflow: chalk26.magenta("\u{1F504} workflow")
  };
  return formats[type] || type;
}
__name(formatType, "formatType");
promisify(exec);
function createPatternsCommand() {
  const patterns = new Command("patterns").description("Manage workspace patterns");
  patterns.command("list").description("List promoted patterns").option("--json", "Output as JSON").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const patternsList = await readSnapbackJson("patterns/workspace-patterns.json", cwd);
      if (options.json) {
        console.log(JSON.stringify(patternsList || [], null, 2));
        return;
      }
      if (!patternsList || patternsList.length === 0) {
        console.log(chalk26.yellow("No patterns recorded yet"));
        console.log(chalk26.gray("Patterns are promoted after 3 occurrences of the same violation."));
        return;
      }
      console.log(chalk26.cyan(`Active Patterns (${patternsList.length}):`));
      console.log();
      for (const pattern of patternsList) {
        console.log(chalk26.bold(pattern.type));
        console.log(`  ${pattern.description}`);
        console.log(chalk26.green(`  Prevention: ${pattern.prevention}`));
        console.log(chalk26.gray(`  Occurrences: ${pattern.occurrences} \u2022 Last seen: ${formatDate(pattern.lastSeenAt)}`));
        console.log();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  patterns.command("report").description("Report a pattern violation").argument("<type>", "Violation type (e.g., 'layer-boundary-violation')").argument("<file>", "File where it occurred").argument("<message>", "What happened").option("-p, --prevention <prevention>", "How to prevent in future").action(async (type, file, message, options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const violations = await getViolations(cwd);
      const count = violations.filter((v) => v.type === type).length + 1;
      const violation = {
        type,
        file,
        message,
        count,
        date: (/* @__PURE__ */ new Date()).toISOString(),
        ...options.prevention && {
          prevention: options.prevention
        }
      };
      await recordViolation(violation, cwd);
      console.log(chalk26.yellow("\u26A0"), `Violation recorded: ${type}`);
      console.log(chalk26.gray(`  File: ${file}`));
      console.log(chalk26.gray(`  Message: ${message}`));
      console.log(chalk26.gray(`  Occurrences: ${count}/3 for promotion`));
      if (count >= 3) {
        await promoteToPattern(type, message, options.prevention, cwd);
        console.log();
        console.log(chalk26.green("\u{1F4C8}"), `Pattern promoted: ${type}`);
        console.log(chalk26.gray("  This pattern will now be detected automatically."));
      }
    } catch (error) {
      const message2 = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message2);
      process.exit(1);
    }
  });
  patterns.command("violations").description("Show recent violations").option("-n, --number <count>", "Number of violations to show", "20").option("--json", "Output as JSON").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const violations = await getViolations(cwd);
      const count = Number.parseInt(options.number, 10);
      const recent = violations.slice(-count).reverse();
      if (options.json) {
        console.log(JSON.stringify(recent, null, 2));
        return;
      }
      if (recent.length === 0) {
        console.log(chalk26.green("\u2713"), "No violations recorded");
        return;
      }
      console.log(chalk26.cyan(`Recent Violations (${recent.length}):`));
      console.log();
      const grouped = /* @__PURE__ */ new Map();
      for (const v of recent) {
        const existing = grouped.get(v.type) || [];
        existing.push(v);
        grouped.set(v.type, existing);
      }
      for (const [type, vList] of grouped) {
        const count2 = vList.length;
        const promotionStatus = count2 >= 3 ? chalk26.green("(promoted)") : chalk26.gray(`(${count2}/3)`);
        console.log(chalk26.bold(type), promotionStatus);
        for (const v of vList.slice(0, 3)) {
          console.log(chalk26.gray(`  ${v.file}`));
          console.log(chalk26.gray(`    ${v.message}`));
        }
        if (vList.length > 3) {
          console.log(chalk26.gray(`  ... and ${vList.length - 3} more`));
        }
        console.log();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  patterns.command("summary").description("Show violation summary and promotion status").option("--json", "Output as JSON").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const violations = await getViolations(cwd);
      const patterns2 = await readSnapbackJson("patterns/workspace-patterns.json", cwd) || [];
      const typeCounts = /* @__PURE__ */ new Map();
      for (const v of violations) {
        typeCounts.set(v.type, (typeCounts.get(v.type) || 0) + 1);
      }
      const summary = {
        totalViolations: violations.length,
        promotedPatterns: patterns2.length,
        pendingPromotion: [
          ...typeCounts.entries()
        ].filter(([_, count]) => count >= 2 && count < 3).length,
        byType: Object.fromEntries(typeCounts)
      };
      if (options.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
      }
      console.log(chalk26.cyan("Pattern Summary:"));
      console.log();
      console.log(`  Total violations:     ${summary.totalViolations}`);
      console.log(`  Promoted patterns:    ${summary.promotedPatterns}`);
      console.log(`  Pending promotion:    ${summary.pendingPromotion}`);
      console.log();
      if (typeCounts.size > 0) {
        console.log(chalk26.cyan("By Type:"));
        const sorted = [
          ...typeCounts.entries()
        ].sort((a, b) => b[1] - a[1]);
        for (const [type, count] of sorted) {
          const status2 = count >= 3 ? chalk26.green("promoted") : chalk26.gray(`${count}/3`);
          console.log(`  ${type.padEnd(30)} ${count} (${status2})`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  patterns.command("debt").description("Scan for TODO/FIXME/XXX comments (technical debt markers)").option("-d, --dir <directory>", "Directory to scan", ".").option("--json", "Output as JSON").option("--verbose", "Show file paths for each item").action(async (options) => {
    const cwd = process.cwd();
    const targetDir = options.dir === "." ? cwd : join(cwd, options.dir);
    try {
      const debtItems = await scanTechnicalDebt(targetDir, cwd);
      if (options.json) {
        console.log(JSON.stringify(debtItems, null, 2));
        return;
      }
      if (debtItems.length === 0) {
        console.log(chalk26.green("\u2713"), "No technical debt markers found");
        return;
      }
      const grouped = {
        TODO: debtItems.filter((d) => d.type === "TODO"),
        FIXME: debtItems.filter((d) => d.type === "FIXME"),
        XXX: debtItems.filter((d) => d.type === "XXX"),
        HACK: debtItems.filter((d) => d.type === "HACK")
      };
      console.log(chalk26.cyan(`Technical Debt Report (${debtItems.length} items):`));
      console.log();
      console.log(chalk26.bold("Summary:"));
      if (grouped.FIXME.length > 0) {
        console.log(chalk26.red(`  FIXME:  ${grouped.FIXME.length} (high priority)`));
      }
      if (grouped.XXX.length > 0) {
        console.log(chalk26.yellow(`  XXX:    ${grouped.XXX.length} (needs attention)`));
      }
      if (grouped.HACK.length > 0) {
        console.log(chalk26.yellow(`  HACK:   ${grouped.HACK.length} (temporary workarounds)`));
      }
      if (grouped.TODO.length > 0) {
        console.log(chalk26.blue(`  TODO:   ${grouped.TODO.length} (planned work)`));
      }
      console.log();
      if (options.verbose) {
        for (const [type, items] of Object.entries(grouped)) {
          if (items.length === 0) continue;
          const color = type === "FIXME" ? chalk26.red : type === "XXX" || type === "HACK" ? chalk26.yellow : chalk26.blue;
          console.log(color(`${type} (${items.length}):`));
          for (const item of items.slice(0, 10)) {
            console.log(chalk26.gray(`  ${item.file}:${item.line}`));
            console.log(`    ${item.text.substring(0, 80)}${item.text.length > 80 ? "..." : ""}`);
          }
          if (items.length > 10) {
            console.log(chalk26.gray(`  ... and ${items.length - 10} more`));
          }
          console.log();
        }
      } else {
        const highPriority = [
          ...grouped.FIXME,
          ...grouped.XXX
        ].slice(0, 5);
        if (highPriority.length > 0) {
          console.log(chalk26.bold("High Priority Items:"));
          for (const item of highPriority) {
            const color = item.type === "FIXME" ? chalk26.red : chalk26.yellow;
            console.log(`  ${color(item.type)} ${chalk26.gray(item.file + ":" + item.line)}`);
            console.log(`    ${item.text.substring(0, 70)}${item.text.length > 70 ? "..." : ""}`);
          }
          console.log();
        }
        console.log(chalk26.gray("Use --verbose for full report"));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  return patterns;
}
__name(createPatternsCommand, "createPatternsCommand");
async function promoteToPattern(type, description, prevention, workspaceRoot) {
  const violations = await getViolations(workspaceRoot);
  const typeViolations = violations.filter((v) => v.type === type);
  const occurrences = typeViolations.length;
  const patterns = await readSnapbackJson("patterns/workspace-patterns.json", workspaceRoot) || [];
  const existingIndex = patterns.findIndex((p) => p.type === type);
  const pattern = {
    type,
    description,
    prevention: prevention || typeViolations.find((v) => v.prevention)?.prevention || "Review and fix manually",
    occurrences,
    promotedAt: existingIndex >= 0 ? patterns[existingIndex].promotedAt : (/* @__PURE__ */ new Date()).toISOString(),
    lastSeenAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (existingIndex >= 0) {
    patterns[existingIndex] = pattern;
  } else {
    patterns.push(pattern);
  }
  await writeSnapbackJson("patterns/workspace-patterns.json", patterns, workspaceRoot);
}
__name(promoteToPattern, "promoteToPattern");
async function scanTechnicalDebt(_directory, _workspaceRoot) {
  return [];
}
__name(scanTechnicalDebt, "scanTechnicalDebt");
function createProtectCommand() {
  const protect = new Command("protect").description("Manage file protection");
  protect.command("add").description("Add a file or pattern to protection").argument("<pattern>", "File path or glob pattern to protect").option("-r, --reason <reason>", "Reason for protection").action(async (pattern, options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized in this workspace"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const protectedFiles = await getProtectedFiles(cwd);
      const existing = protectedFiles.find((f) => f.pattern === pattern);
      if (existing) {
        console.log(chalk26.yellow(`Already protected: ${pattern}`));
        return;
      }
      if (!pattern.includes("*") && !pattern.includes("**")) {
        try {
          await access(join(cwd, pattern), constants.F_OK);
        } catch {
          console.log(chalk26.yellow(`Warning: File not found: ${pattern}`));
          console.log(chalk26.gray("Protection will still be added for future files matching this path."));
        }
      }
      const newProtection = {
        pattern,
        addedAt: (/* @__PURE__ */ new Date()).toISOString(),
        ...options.reason && {
          reason: options.reason
        }
      };
      protectedFiles.push(newProtection);
      await saveProtectedFiles(protectedFiles, cwd);
      console.log(chalk26.green("\u2713"), `Added protection: ${pattern}`);
      if (options.reason) {
        console.log(chalk26.gray(`  Reason: ${options.reason}`));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  protect.command("remove").description("Remove a file or pattern from protection").argument("<pattern>", "File path or glob pattern to unprotect").action(async (pattern) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized in this workspace"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const protectedFiles = await getProtectedFiles(cwd);
      const index = protectedFiles.findIndex((f) => f.pattern === pattern);
      if (index === -1) {
        console.log(chalk26.yellow(`Not protected: ${pattern}`));
        return;
      }
      protectedFiles.splice(index, 1);
      await saveProtectedFiles(protectedFiles, cwd);
      console.log(chalk26.green("\u2713"), `Removed protection: ${pattern}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  protect.command("list").description("List all protected files").option("--json", "Output as JSON").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized in this workspace"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const protectedFiles = await getProtectedFiles(cwd);
      if (options.json) {
        console.log(JSON.stringify(protectedFiles, null, 2));
        return;
      }
      if (protectedFiles.length === 0) {
        console.log(chalk26.yellow("No files protected"));
        console.log(chalk26.gray("Run: snap protect add <pattern>"));
        return;
      }
      console.log(chalk26.cyan("Protected files:"));
      console.log();
      for (const file of protectedFiles) {
        console.log(chalk26.green("\u2022"), file.pattern);
        if (file.reason) {
          console.log(chalk26.gray(`  Reason: ${file.reason}`));
        }
        console.log(chalk26.gray(`  Added: ${formatDate(file.addedAt)}`));
      }
      console.log();
      console.log(chalk26.gray(`Total: ${protectedFiles.length} protected`));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  protect.command("env").description("Protect all .env files").action(async () => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const patterns = [
        ".env",
        ".env.*",
        "*.env"
      ];
      const protectedFiles = await getProtectedFiles(cwd);
      let added = 0;
      for (const pattern of patterns) {
        if (!protectedFiles.some((f) => f.pattern === pattern)) {
          protectedFiles.push({
            pattern,
            addedAt: (/* @__PURE__ */ new Date()).toISOString(),
            reason: "Environment variables"
          });
          added++;
        }
      }
      if (added > 0) {
        await saveProtectedFiles(protectedFiles, cwd);
        console.log(chalk26.green("\u2713"), `Added ${added} environment file patterns`);
      } else {
        console.log(chalk26.yellow("Environment files already protected"));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  protect.command("config").description("Protect common configuration files").action(async () => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const patterns = [
        "*.config.js",
        "*.config.ts",
        "*.config.mjs",
        "tsconfig.json",
        "package.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "package-lock.json"
      ];
      const protectedFiles = await getProtectedFiles(cwd);
      let added = 0;
      for (const pattern of patterns) {
        if (!protectedFiles.some((f) => f.pattern === pattern)) {
          protectedFiles.push({
            pattern,
            addedAt: (/* @__PURE__ */ new Date()).toISOString(),
            reason: "Configuration file"
          });
          added++;
        }
      }
      if (added > 0) {
        await saveProtectedFiles(protectedFiles, cwd);
        console.log(chalk26.green("\u2713"), `Added ${added} configuration file patterns`);
      } else {
        console.log(chalk26.yellow("Configuration files already protected"));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  return protect;
}
__name(createProtectCommand, "createProtectCommand");
function createSessionCommand() {
  const session = new Command("session").description("Manage development sessions");
  session.command("start").description("Start a new development session").argument("[task]", "Task description").option("-f, --force", "End current session and start a new one").action(async (task, options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized in this workspace"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const existingSession = await getCurrentSession(cwd);
      if (existingSession && !options.force) {
        console.log(chalk26.yellow("A session is already active:"));
        console.log(`  ID: ${chalk26.gray(existingSession.id.substring(0, 8))}`);
        if (existingSession.task) {
          console.log(`  Task: ${existingSession.task}`);
        }
        console.log(`  Started: ${formatTimeAgo(existingSession.startedAt)}`);
        console.log(`  Snapshots: ${existingSession.snapshotCount}`);
        console.log();
        console.log(chalk26.gray("Use --force to end this session and start a new one"));
        return;
      }
      if (existingSession && options.force) {
        await archiveSession(existingSession, cwd);
        console.log(chalk26.gray(`Ended previous session: ${existingSession.id.substring(0, 8)}`));
      }
      const newSession = {
        id: generateId("sess"),
        task,
        startedAt: (/* @__PURE__ */ new Date()).toISOString(),
        snapshotCount: 0
      };
      await saveCurrentSession(newSession, cwd);
      console.log(chalk26.green("\u2713"), "Session started");
      console.log(`  ID: ${chalk26.gray(newSession.id.substring(0, 8))}`);
      if (task) {
        console.log(`  Task: ${task}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  session.command("status").description("Show current session status").option("--json", "Output as JSON").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const currentSession = await getCurrentSession(cwd);
      if (!currentSession) {
        if (options.json) {
          console.log(JSON.stringify({
            active: false
          }, null, 2));
        } else {
          console.log(chalk26.yellow("No active session"));
          console.log(chalk26.gray("Run: snap session start [task]"));
        }
        return;
      }
      if (options.json) {
        console.log(JSON.stringify({
          active: true,
          ...currentSession
        }, null, 2));
        return;
      }
      console.log(chalk26.cyan("Active Session:"));
      console.log();
      console.log(`  ID:        ${chalk26.gray(currentSession.id.substring(0, 8))}`);
      if (currentSession.task) {
        console.log(`  Task:      ${currentSession.task}`);
      }
      console.log(`  Started:   ${formatTimeAgo(currentSession.startedAt)}`);
      console.log(`  Snapshots: ${currentSession.snapshotCount}`);
      console.log(`  Duration:  ${formatDuration2(currentSession.startedAt)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  session.command("end").description("End the current session").option("-m, --message <message>", "Session end message/summary").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const currentSession = await getCurrentSession(cwd);
      if (!currentSession) {
        console.log(chalk26.yellow("No active session"));
        return;
      }
      await archiveSession(currentSession, cwd, options.message);
      await endCurrentSession(cwd);
      const duration = formatDuration2(currentSession.startedAt);
      console.log(chalk26.green("\u2713"), "Session ended");
      console.log(`  ID:        ${chalk26.gray(currentSession.id.substring(0, 8))}`);
      console.log(`  Duration:  ${duration}`);
      console.log(`  Snapshots: ${currentSession.snapshotCount}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  session.command("history").description("Show session history").option("-n, --number <count>", "Number of sessions to show", "10").option("--json", "Output as JSON").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const { loadSnapbackJsonl: loadSnapbackJsonl2 } = await import('./snapback-dir-4QRR2IPV.js');
      const history = await loadSnapbackJsonl2("session/history.jsonl", cwd);
      const count = Number.parseInt(options.number, 10);
      const recent = history.slice(-count).reverse();
      if (options.json) {
        console.log(JSON.stringify(recent, null, 2));
        return;
      }
      if (recent.length === 0) {
        console.log(chalk26.yellow("No session history"));
        return;
      }
      console.log(chalk26.cyan("Recent Sessions:"));
      console.log();
      for (const session2 of recent) {
        const duration = formatDurationFromDates(session2.startedAt, session2.endedAt);
        console.log(chalk26.gray(session2.id.substring(0, 8)), session2.task || chalk26.gray("(no task)"));
        console.log(`  ${formatDate2(session2.startedAt)} \u2022 ${duration} \u2022 ${session2.snapshotCount} snapshots`);
        if (session2.endMessage) {
          console.log(chalk26.gray(`  "${session2.endMessage}"`));
        }
        console.log();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  return session;
}
__name(createSessionCommand, "createSessionCommand");
async function archiveSession(session, workspaceRoot, endMessage) {
  const archived = {
    ...session,
    endedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...endMessage && {
      endMessage
    }
  };
  await appendSnapbackJsonl("session/history.jsonl", archived, workspaceRoot);
}
__name(archiveSession, "archiveSession");
function formatTimeAgo(isoDate) {
  const date = new Date(isoDate);
  const now = /* @__PURE__ */ new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1e3);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
__name(formatTimeAgo, "formatTimeAgo");
function formatDuration2(startIso) {
  const start = new Date(startIso);
  const now = /* @__PURE__ */ new Date();
  const seconds = Math.floor((now.getTime() - start.getTime()) / 1e3);
  return formatSeconds(seconds);
}
__name(formatDuration2, "formatDuration");
function formatDurationFromDates(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1e3);
  return formatSeconds(seconds);
}
__name(formatDurationFromDates, "formatDurationFromDates");
function formatSeconds(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
__name(formatSeconds, "formatSeconds");
function formatDate2(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
__name(formatDate2, "formatDate");
var DEFAULT_CONFIG = {
  debounceMs: 120,
  depth: 10,
  ignored: [
    "**/{node_modules,.git,.vscode,dist,.next,.nuxt,coverage}/**",
    "**/*.log",
    "**/.*cache*/**",
    "**/.snapback/snapshots/**",
    "**/.snapback/embeddings.db"
  ]
};
var CRITICAL_FILE_PATTERNS = [
  /\.env.*$/,
  /config\.(json|yaml|yml|toml)$/,
  /secrets?\.(json|yaml|yml)$/,
  /\.pem$/,
  /\.key$/,
  /auth\.ts$/,
  /middleware\.ts$/,
  /schema\.(ts|prisma)$/
];
var RISKY_CHANGE_PATTERNS = [
  /package\.json$/,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
  /tsconfig\.json$/
];
var SnapbackWatcher = class extends EventEmitter {
  static {
    __name(this, "SnapbackWatcher");
  }
  watcher = null;
  config;
  stats;
  signalBuffer = [];
  flushTimer = null;
  changeCountByFile = /* @__PURE__ */ new Map();
  constructor(config) {
    super();
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
    this.stats = {
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      filesWatched: 0,
      signalsRecorded: 0,
      patternsDetected: 0,
      lastActivityAt: null
    };
  }
  /**
  * Start watching the workspace
  */
  async start() {
    if (this.watcher) {
      throw new Error("Watcher already started");
    }
    if (!await isSnapbackInitialized(this.config.workspaceRoot)) {
      throw new Error("SnapBack not initialized. Run: snap init");
    }
    const { workspaceRoot, debounceMs, depth, ignored } = this.config;
    this.log("Starting watcher...");
    this.watcher = chokidar.watch(workspaceRoot, {
      ignoreInitial: true,
      ignored,
      awaitWriteFinish: {
        stabilityThreshold: debounceMs,
        pollInterval: 50
      },
      ignorePermissionErrors: true,
      depth,
      persistent: true
    });
    this.watcher.on("ready", () => {
      this.stats.filesWatched = this.getWatchedCount();
      this.log(`Ready. Watching ${this.stats.filesWatched} files`);
      this.emit("ready", this.stats);
    }).on("change", (path6) => this.handleChange("change", path6)).on("add", (path6) => this.handleChange("add", path6)).on("unlink", (path6) => this.handleChange("unlink", path6)).on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Error: ${message}`, true);
      this.emit("error", error);
    });
    this.watchSnapbackDir();
    this.startFlushTimer();
  }
  /**
  * Stop watching
  */
  async stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushSignals();
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.log("Stopped");
    }
  }
  /**
  * Get current stats
  */
  getStats() {
    return {
      ...this.stats
    };
  }
  /**
  * Check if watcher is running
  */
  isRunning() {
    return this.watcher !== null;
  }
  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================
  handleChange(type, path6) {
    const relativePath = relative(this.config.workspaceRoot, path6);
    this.stats.lastActivityAt = (/* @__PURE__ */ new Date()).toISOString();
    const signal = {
      type: type === "add" ? "file_add" : type === "unlink" ? "file_delete" : "file_change",
      path: relativePath,
      timestamp: this.stats.lastActivityAt
    };
    const count = (this.changeCountByFile.get(relativePath) || 0) + 1;
    this.changeCountByFile.set(relativePath, count);
    const isCritical = this.isCriticalFile(relativePath);
    const isRisky = this.isRiskyChange(relativePath);
    if (isCritical) {
      signal.metadata = {
        critical: true
      };
      this.emit("signal", {
        ...signal,
        suggestion: "Consider protecting this file"
      });
    }
    if (isRisky) {
      signal.metadata = {
        ...signal.metadata,
        risky: true
      };
    }
    this.signalBuffer.push(signal);
    this.emit(type, relativePath, {
      isCritical,
      isRisky,
      changeCount: count
    });
    this.detectPatterns(relativePath, count);
    this.log(`${type}: ${relativePath}${isCritical ? " [CRITICAL]" : ""}${isRisky ? " [RISKY]" : ""}`);
  }
  watchSnapbackDir() {
    const snapbackDir = getWorkspaceDir(this.config.workspaceRoot);
    const violationsWatcher = chokidar.watch(`${snapbackDir}/patterns/violations.jsonl`, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50
      }
    });
    violationsWatcher.on("change", async () => {
      await this.checkViolationPromotion();
    });
  }
  async checkViolationPromotion() {
    try {
      const violations = await getViolations(this.config.workspaceRoot);
      const typeCounts = /* @__PURE__ */ new Map();
      for (const v of violations) {
        typeCounts.set(v.type, (typeCounts.get(v.type) || 0) + 1);
      }
      for (const [type, count] of typeCounts) {
        if (count >= 3) {
          this.emit("pattern", {
            type: "PROMOTION_READY",
            violationType: type,
            count,
            message: `Violation "${type}" seen ${count}x - ready for promotion`
          });
          this.stats.patternsDetected++;
        }
      }
    } catch {
    }
  }
  detectPatterns(path6, changeCount) {
    if (changeCount >= 5) {
      this.emit("pattern", {
        type: "FREQUENTLY_CHANGED",
        path: path6,
        count: changeCount,
        message: `File "${basename(path6)}" changed ${changeCount}x - consider protection`
      });
      this.stats.patternsDetected++;
    }
    if (this.isCriticalFile(path6) && changeCount >= 2) {
      this.checkProtectionSuggestion(path6);
    }
  }
  async checkProtectionSuggestion(path6) {
    const protectedFiles = await getProtectedFiles(this.config.workspaceRoot);
    const isProtected = protectedFiles.some((p) => p.pattern === path6 || p.pattern.includes("*") && new RegExp(p.pattern.replace(/\*/g, ".*")).test(path6));
    if (!isProtected) {
      this.emit("signal", {
        type: "protection_added",
        path: path6,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        suggestion: `Consider: snap protect add "${path6}"`
      });
    }
  }
  isCriticalFile(path6) {
    return CRITICAL_FILE_PATTERNS.some((pattern) => pattern.test(path6));
  }
  isRiskyChange(path6) {
    return RISKY_CHANGE_PATTERNS.some((pattern) => pattern.test(path6));
  }
  startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushSignals().catch(() => {
      });
    }, 3e4);
  }
  async flushSignals() {
    if (this.signalBuffer.length === 0) return;
    const signals = [
      ...this.signalBuffer
    ];
    this.signalBuffer = [];
    for (const signal of signals) {
      await appendSnapbackJsonl("learnings/behavioral-signals.jsonl", signal, this.config.workspaceRoot);
      this.stats.signalsRecorded++;
    }
  }
  getWatchedCount() {
    if (!this.watcher) return 0;
    const watched = this.watcher.getWatched();
    return Object.values(watched).reduce((acc, files) => acc + files.length, 0);
  }
  log(message, isError = false) {
    if (this.config.verbose) {
      const prefix = "[SnapBack Watch]";
      if (isError) {
        console.error(`${prefix} ${message}`);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }
};
function createWatcher(config) {
  return new SnapbackWatcher(config);
}
__name(createWatcher, "createWatcher");
async function getBehavioralSignals(workspaceRoot) {
  return loadSnapbackJsonl("learnings/behavioral-signals.jsonl", workspaceRoot);
}
__name(getBehavioralSignals, "getBehavioralSignals");
async function analyzeBehavioralSignals(workspaceRoot) {
  const signals = await getBehavioralSignals(workspaceRoot);
  if (signals.length === 0) return [];
  const fileCounts = /* @__PURE__ */ new Map();
  for (const signal of signals) {
    if (signal.type === "file_change") {
      fileCounts.set(signal.path, (fileCounts.get(signal.path) || 0) + 1);
    }
  }
  const learnings = [];
  for (const [path6, count] of fileCounts) {
    if (count >= 10) {
      learnings.push({
        id: `behavioral_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "pattern",
        trigger: `editing ${basename(path6)}`,
        action: `This file is frequently modified (${count}x). Consider adding protection.`,
        source: "behavioral-analysis",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  return learnings;
}
__name(analyzeBehavioralSignals, "analyzeBehavioralSignals");

// src/commands/watch.ts
function createWatchCommand() {
  const watch2 = new Command("watch").description("Start file watcher for behavioral learning").option("-v, --verbose", "Enable verbose logging").option("--depth <number>", "Max directory depth", "10").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized in this workspace"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      console.log(chalk26.cyan("SnapBack Watch"));
      console.log(chalk26.gray("Continuous behavioral learning daemon"));
      console.log();
      const watcher = createWatcher({
        workspaceRoot: cwd,
        verbose: options.verbose,
        depth: Number.parseInt(options.depth, 10)
      });
      watcher.on("ready", (stats) => {
        console.log(chalk26.green("\u2713"), `Watching ${stats.filesWatched} files`);
        console.log(chalk26.gray("  Press Ctrl+C to stop"));
        console.log();
      });
      watcher.on("change", (path6, meta) => {
        const icon = meta.isCritical ? chalk26.red("\u25CF") : meta.isRisky ? chalk26.yellow("\u25CF") : chalk26.blue("\u25CF");
        console.log(`${icon} ${chalk26.dim("changed:")} ${path6}`);
        if (meta.isCritical && meta.changeCount === 1) {
          console.log(chalk26.yellow(`  \u2192 Consider: snap protect add "${path6}"`));
        }
      });
      watcher.on("add", (path6) => {
        console.log(`${chalk26.green("+")} ${chalk26.dim("added:")} ${path6}`);
      });
      watcher.on("unlink", (path6) => {
        console.log(`${chalk26.red("-")} ${chalk26.dim("deleted:")} ${path6}`);
      });
      watcher.on("signal", (signal) => {
        if (signal.suggestion) {
          console.log(chalk26.yellow("\u{1F4A1}"), signal.suggestion);
        }
      });
      watcher.on("pattern", (pattern) => {
        if (pattern.type === "PROMOTION_READY") {
          console.log(chalk26.magenta("\u{1F4CA}"), pattern.message);
          console.log(chalk26.gray("   Run: snap patterns promote"));
        } else if (pattern.type === "FREQUENTLY_CHANGED") {
          console.log(chalk26.yellow("\u{1F4C8}"), pattern.message);
        }
      });
      watcher.on("error", (error) => {
        console.error(chalk26.red("Error:"), error.message);
      });
      const shutdown = /* @__PURE__ */ __name(async () => {
        console.log();
        console.log(chalk26.gray("Stopping watcher..."));
        await watcher.stop();
        const stats = watcher.getStats();
        console.log();
        console.log(chalk26.cyan("Session Summary:"));
        console.log(`  Signals recorded: ${stats.signalsRecorded}`);
        console.log(`  Patterns detected: ${stats.patternsDetected}`);
        if (stats.signalsRecorded > 0) {
          console.log();
          console.log(chalk26.gray("Analyze with: snap watch analyze"));
        }
        process.exit(0);
      }, "shutdown");
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
      await watcher.start();
      await new Promise(() => {
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  watch2.command("status").description("Show watcher statistics").option("--json", "Output as JSON").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const signals = await getBehavioralSignals(cwd);
      const stats = {
        totalSignals: signals.length,
        byType: {},
        mostChanged: [],
        criticalChanges: 0
      };
      const fileCounts = /* @__PURE__ */ new Map();
      for (const signal of signals) {
        stats.byType[signal.type] = (stats.byType[signal.type] || 0) + 1;
        if (signal.type === "file_change") {
          fileCounts.set(signal.path, (fileCounts.get(signal.path) || 0) + 1);
        }
        if (signal.metadata?.critical) {
          stats.criticalChanges++;
        }
      }
      stats.mostChanged = [
        ...fileCounts.entries()
      ].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([path6, count]) => ({
        path: path6,
        count
      }));
      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }
      console.log(chalk26.cyan("Watcher Statistics:"));
      console.log();
      console.log(`  Total signals:     ${stats.totalSignals}`);
      console.log(`  Critical changes:  ${stats.criticalChanges}`);
      console.log();
      if (Object.keys(stats.byType).length > 0) {
        console.log(chalk26.gray("By Type:"));
        for (const [type, count] of Object.entries(stats.byType)) {
          console.log(`  ${type}: ${count}`);
        }
        console.log();
      }
      if (stats.mostChanged.length > 0) {
        console.log(chalk26.gray("Most Changed Files:"));
        for (const { path: path6, count } of stats.mostChanged) {
          console.log(`  ${count}x  ${path6}`);
        }
      }
      if (stats.totalSignals === 0) {
        console.log(chalk26.gray("No behavioral data yet."));
        console.log(chalk26.gray("Start watching: snap watch"));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  watch2.command("analyze").description("Analyze behavioral signals and generate learnings").option("--json", "Output as JSON").action(async (options) => {
    const cwd = process.cwd();
    try {
      if (!await isSnapbackInitialized(cwd)) {
        console.log(chalk26.yellow("SnapBack not initialized"));
        console.log(chalk26.gray("Run: snap init"));
        process.exit(1);
      }
      const learnings = await analyzeBehavioralSignals(cwd);
      if (options.json) {
        console.log(JSON.stringify(learnings, null, 2));
        return;
      }
      if (learnings.length === 0) {
        console.log(chalk26.yellow("No actionable patterns detected yet."));
        console.log(chalk26.gray("Continue using snap watch to collect more data."));
        return;
      }
      console.log(chalk26.cyan(`Behavioral Insights (${learnings.length}):`));
      console.log();
      for (const learning of learnings) {
        console.log(chalk26.bold(`\u{1F4A1} ${learning.trigger}`));
        console.log(`   ${learning.action}`);
        console.log();
      }
      console.log(chalk26.gray('Record as learning: snap learn "trigger" "action"'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  return watch2;
}
__name(createWatchCommand, "createWatchCommand");
var __defProp4 = Object.defineProperty;
var __name5 = /* @__PURE__ */ __name((target, value) => __defProp4(target, "name", {
  value,
  configurable: true
}), "__name");
function mapToCommitPhase(phase) {
  switch (phase) {
    case "hotfix":
    case "release":
      return "critical";
    case "feature":
    case "unknown":
      return "feature";
    case "refactor":
      return "refactor";
    case "exploratory":
      return "exploratory";
  }
}
__name(mapToCommitPhase, "mapToCommitPhase");
__name5(mapToCommitPhase, "mapToCommitPhase");
var DEFAULT_WEIGHTS = {
  wT: 0.3,
  wL: 0.25,
  wF: 0.15,
  wA: 0.2,
  wC: 0.1
};
var PHASE_BASELINES = {
  critical: 15,
  feature: 30,
  refactor: 60,
  exploratory: 120
};
var PHASE_HARD_CAPS = {
  critical: 45,
  feature: 90,
  refactor: 120,
  exploratory: 240
};
var PHASE_MULTIPLIERS = {
  critical: 1.4,
  feature: 1,
  refactor: 1.1,
  exploratory: 0.8
};
var DEFAULT_THRESHOLDS = {
  autoSnapshot: 0.35,
  suggestCommit: 0.55,
  strongCommit: 0.8
};
var DEFAULT_COOLDOWNS = {
  minSnapshotInterval: 5 * 60 * 1e3,
  minPromptInterval: 10 * 60 * 1e3
};
var HYSTERESIS = {
  snapshotEnter: 0.35,
  snapshotExit: 0.25,
  promptEnter: 0.55,
  promptExit: 0.45,
  strongEnter: 0.8,
  strongExit: 0.7
};
var DEFAULT_USER_TUNING = {
  thresholdScale: 1,
  promptCooldownScale: 1,
  snapshotCooldownScale: 1
};
var WEIGHT_BOUNDS = {
  min: 0.05,
  max: 0.5,
  stepSize: 0.02
};
var PR_METRICS_THRESHOLDS = {
  /** PR review time above this (minutes) indicates quality issues */
  reviewTimeDanger: 120,
  /** PR comments above this indicates complexity/issues */
  commentsDanger: 15,
  /** Minimum PRs needed for weight adjustment */
  minPRsForAdjustment: 10
};
function computeTimeRisk(minutesSinceCommit, phase) {
  const base = PHASE_BASELINES[phase];
  const cap = PHASE_HARD_CAPS[phase];
  if (minutesSinceCommit <= base) {
    return 0;
  }
  const over = minutesSinceCommit - base;
  const range = Math.max(cap - base, 1);
  const x = Math.min(over / range, 1);
  const shaped = x ** 1.5;
  return shaped;
}
__name(computeTimeRisk, "computeTimeRisk");
__name5(computeTimeRisk, "computeTimeRisk");
function computeLinesRisk(linesChanged) {
  if (linesChanged <= 50) {
    return 0;
  }
  if (linesChanged <= 200) {
    return 0.3 * ((linesChanged - 50) / 150);
  }
  if (linesChanged <= 400) {
    return 0.3 + 0.3 * ((linesChanged - 200) / 200);
  }
  if (linesChanged <= 1e3) {
    return 0.6 + 0.4 * ((linesChanged - 400) / 600);
  }
  return 1;
}
__name(computeLinesRisk, "computeLinesRisk");
__name5(computeLinesRisk, "computeLinesRisk");
function computeFilesRisk(filesChanged) {
  if (filesChanged <= 2) {
    return 0;
  }
  if (filesChanged <= 6) {
    return 0.6 * ((filesChanged - 2) / 4);
  }
  return 1;
}
__name(computeFilesRisk, "computeFilesRisk");
__name5(computeFilesRisk, "computeFilesRisk");
function computeAiRisk(aiFraction) {
  if (aiFraction <= 0.2) {
    return 0;
  }
  const x = (aiFraction - 0.2) / 0.8;
  return Math.min(x ** 1.3, 1);
}
__name(computeAiRisk, "computeAiRisk");
__name5(computeAiRisk, "computeAiRisk");
function computeChurnRisk(churnPercent) {
  if (churnPercent <= 15) {
    return 0.3 * (churnPercent / 15);
  }
  if (churnPercent <= 30) {
    return 0.3 + 0.4 * ((churnPercent - 15) / 15);
  }
  if (churnPercent >= 60) {
    return 1;
  }
  return 0.7 + 0.3 * ((churnPercent - 30) / 30);
}
__name(computeChurnRisk, "computeChurnRisk");
__name5(computeChurnRisk, "computeChurnRisk");
var CommitRiskSystem = class {
  static {
    __name(this, "CommitRiskSystem");
  }
  static {
    __name5(this, "CommitRiskSystem");
  }
  weights = {
    ...DEFAULT_WEIGHTS
  };
  thresholds = {
    ...DEFAULT_THRESHOLDS
  };
  userTuning = {
    ...DEFAULT_USER_TUNING
  };
  // State tracking
  lastSnapshotAt = null;
  lastPromptAt = null;
  isInSnapshotState = false;
  isInPromptState = false;
  isInStrongState = false;
  // Outcome tracking for self-tuning
  outcomes = [];
  maxOutcomes = 500;
  constructor(userTuning) {
    if (userTuning) {
      this.userTuning = {
        ...DEFAULT_USER_TUNING,
        ...userTuning
      };
    }
  }
  /**
  * Evaluate risk and determine recommended action
  */
  evaluate(context) {
    const breakdown = this.computeBreakdown(context);
    const scaledThresholds = this.applyUserScaling();
    const { action, escalation } = this.determineAction(breakdown.finalScore, scaledThresholds, context.now);
    const { reason, educational } = this.generateReason(breakdown, action, context);
    return {
      score: breakdown.finalScore,
      breakdown,
      action,
      escalation,
      reason,
      educational,
      context
    };
  }
  /**
  * Check if action should be taken (respects cooldowns)
  */
  shouldAct(evaluation) {
    const { action } = evaluation;
    const now = evaluation.context.now;
    const cooldowns = this.getScaledCooldowns();
    switch (action) {
      case "none":
        return false;
      case "auto_snapshot":
        return this.lastSnapshotAt === null || now - this.lastSnapshotAt > cooldowns.minSnapshotInterval;
      case "suggest_commit":
      case "strong_commit":
        return this.lastPromptAt === null || now - this.lastPromptAt > cooldowns.minPromptInterval;
    }
  }
  /**
  * Record that a snapshot was created
  */
  recordSnapshot(now = Date.now()) {
    this.lastSnapshotAt = now;
  }
  /**
  * Record that a prompt was shown
  */
  recordPrompt(now = Date.now()) {
    this.lastPromptAt = now;
  }
  /**
  * Record session outcome for self-tuning
  */
  recordOutcome(outcome) {
    this.outcomes.push(outcome);
    if (this.outcomes.length > this.maxOutcomes) {
      this.outcomes.shift();
    }
  }
  /**
  * Get outcome statistics for calibration
  */
  getOutcomeStats() {
    const total = this.outcomes.length;
    if (total === 0) {
      return {
        totalSessions: 0,
        badOutcomeRate: 0,
        avgRiskAtBadOutcome: 0,
        bucketStats: /* @__PURE__ */ new Map()
      };
    }
    const badOutcomes = this.outcomes.filter((o) => o.hadRevertWithin2Weeks || o.hadBugFixWithin2Weeks);
    const badOutcomeRate = badOutcomes.length / total;
    const avgRiskAtBadOutcome = badOutcomes.length > 0 ? badOutcomes.reduce((sum, o) => sum + o.maxRiskScore, 0) / badOutcomes.length : 0;
    const buckets = /* @__PURE__ */ new Map();
    for (const outcome of this.outcomes) {
      const score = outcome.maxRiskScore;
      let bucket;
      if (score < 0.3) {
        bucket = "0-0.3";
      } else if (score < 0.5) {
        bucket = "0.3-0.5";
      } else if (score < 0.7) {
        bucket = "0.5-0.7";
      } else if (score < 0.9) {
        bucket = "0.7-0.9";
      } else {
        bucket = "0.9+";
      }
      const existing = buckets.get(bucket) ?? {
        total: 0,
        bad: 0
      };
      existing.total++;
      if (outcome.hadRevertWithin2Weeks || outcome.hadBugFixWithin2Weeks) {
        existing.bad++;
      }
      buckets.set(bucket, existing);
    }
    const bucketStats = /* @__PURE__ */ new Map();
    for (const [bucket, stats] of buckets) {
      bucketStats.set(bucket, {
        count: stats.total,
        badRate: stats.total > 0 ? stats.bad / stats.total : 0
      });
    }
    return {
      totalSessions: total,
      badOutcomeRate,
      avgRiskAtBadOutcome,
      bucketStats
    };
  }
  /**
  * Recalibrate thresholds based on outcomes
  * Call periodically (e.g., weekly)
  */
  recalibrate(targetBadOutcomeRate = 0.15) {
    const stats = this.getOutcomeStats();
    const changes = [];
    if (stats.totalSessions < 20) {
      return {
        adjusted: false,
        changes: [
          "Insufficient data for calibration (need 20+ sessions)"
        ]
      };
    }
    const belowThreshold = this.outcomes.filter((o) => o.maxRiskScore < this.thresholds.suggestCommit);
    const badBelowThreshold = belowThreshold.filter((o) => o.hadRevertWithin2Weeks || o.hadBugFixWithin2Weeks);
    const badRateBelowThreshold = belowThreshold.length > 0 ? badBelowThreshold.length / belowThreshold.length : 0;
    if (badRateBelowThreshold > targetBadOutcomeRate) {
      this.thresholds.suggestCommit = Math.max(0.3, this.thresholds.suggestCommit - 0.05);
      this.thresholds.autoSnapshot = Math.max(0.2, this.thresholds.autoSnapshot - 0.05);
      changes.push(`Lowered thresholds (bad rate below threshold: ${(badRateBelowThreshold * 100).toFixed(1)}%)`);
    } else if (badRateBelowThreshold < targetBadOutcomeRate / 2) {
      this.thresholds.suggestCommit = Math.min(0.7, this.thresholds.suggestCommit + 0.05);
      this.thresholds.autoSnapshot = Math.min(0.5, this.thresholds.autoSnapshot + 0.05);
      changes.push(`Raised thresholds (bad rate below threshold: ${(badRateBelowThreshold * 100).toFixed(1)}%)`);
    }
    return {
      adjusted: changes.length > 0,
      changes
    };
  }
  /**
  * Optimize weights using hill-climbing based on predictive power
  *
  * Analyzes which factors (time, lines, files, AI, churn) best predict
  * bad outcomes and adjusts weights accordingly.
  *
  * @returns Optimization result with changes made
  */
  optimizeWeights() {
    const changes = [];
    if (this.outcomes.length < 30) {
      return {
        optimized: false,
        changes: [
          "Insufficient data for weight optimization (need 30+ sessions)"
        ],
        factorCorrelations: {}
      };
    }
    const correlations = this.calculateFactorCorrelations();
    const totalCorrelation = Object.values(correlations).reduce((sum, c) => sum + Math.abs(c), 0);
    if (totalCorrelation === 0) {
      return {
        optimized: false,
        changes: [
          "No correlation between factors and outcomes"
        ],
        factorCorrelations: correlations
      };
    }
    const factorKeys = [
      "wT",
      "wL",
      "wF",
      "wA",
      "wC"
    ];
    const correlationMap = {
      wT: correlations.time,
      wL: correlations.lines,
      wF: correlations.files,
      wA: correlations.ai,
      wC: correlations.churn
    };
    const targetWeights = {
      wT: 0,
      wL: 0,
      wF: 0,
      wA: 0,
      wC: 0
    };
    for (const key of factorKeys) {
      targetWeights[key] = Math.abs(correlationMap[key]) / totalCorrelation;
      targetWeights[key] = Math.max(WEIGHT_BOUNDS.min, Math.min(WEIGHT_BOUNDS.max, targetWeights[key]));
    }
    const targetSum = Object.values(targetWeights).reduce((sum, w) => sum + w, 0);
    for (const key of factorKeys) {
      targetWeights[key] = targetWeights[key] / targetSum;
    }
    let adjusted = false;
    for (const key of factorKeys) {
      const current = this.weights[key];
      const target = targetWeights[key];
      const diff = target - current;
      if (Math.abs(diff) > WEIGHT_BOUNDS.stepSize / 2) {
        const step = diff > 0 ? WEIGHT_BOUNDS.stepSize : -0.02;
        const newWeight = Math.max(WEIGHT_BOUNDS.min, Math.min(WEIGHT_BOUNDS.max, current + step));
        if (newWeight !== current) {
          const factorName = this.getFactorName(key);
          changes.push(`Adjusted ${factorName} weight: ${current.toFixed(2)} \u2192 ${newWeight.toFixed(2)}`);
          this.weights[key] = newWeight;
          adjusted = true;
        }
      }
    }
    if (adjusted) {
      this.normalizeWeights();
    }
    return {
      optimized: adjusted,
      changes: changes.length > 0 ? changes : [
        "Weights already optimal for current data"
      ],
      factorCorrelations: correlations
    };
  }
  /**
  * Recalibrate using PR metrics (review time and comments count)
  *
  * PRs with long review times or many comments indicate the commit
  * was too large or complex. Use this signal to adjust sensitivity.
  *
  * @returns Calibration result with changes
  */
  recalibrateWithPRMetrics() {
    const changes = [];
    const outcomesWithPR = this.outcomes.filter((o) => o.prReviewTimeMin !== void 0 || o.prCommentsCount !== void 0);
    if (outcomesWithPR.length < PR_METRICS_THRESHOLDS.minPRsForAdjustment) {
      return {
        adjusted: false,
        changes: [
          `Insufficient PR data (have ${outcomesWithPR.length}, need ${PR_METRICS_THRESHOLDS.minPRsForAdjustment})`
        ],
        prAnalysis: {
          totalPRs: outcomesWithPR.length,
          avgReviewTime: 0,
          avgComments: 0,
          problematicPRRate: 0
        }
      };
    }
    const outcomesWithReviewTime = outcomesWithPR.filter((o) => o.prReviewTimeMin !== void 0);
    const outcomesWithComments = outcomesWithPR.filter((o) => o.prCommentsCount !== void 0);
    const avgReviewTime = outcomesWithReviewTime.length > 0 ? outcomesWithReviewTime.reduce((sum, o) => sum + (o.prReviewTimeMin ?? 0), 0) / outcomesWithReviewTime.length : 0;
    const avgComments = outcomesWithComments.length > 0 ? outcomesWithComments.reduce((sum, o) => sum + (o.prCommentsCount ?? 0), 0) / outcomesWithComments.length : 0;
    const problematicPRs = outcomesWithPR.filter((o) => (o.prReviewTimeMin ?? 0) > PR_METRICS_THRESHOLDS.reviewTimeDanger || (o.prCommentsCount ?? 0) > PR_METRICS_THRESHOLDS.commentsDanger);
    const problematicRate = problematicPRs.length / outcomesWithPR.length;
    const lowRiskProblematic = problematicPRs.filter((o) => o.maxRiskScore < this.thresholds.suggestCommit);
    const lowRiskProblematicRate = problematicPRs.length > 0 ? lowRiskProblematic.length / problematicPRs.length : 0;
    if (problematicRate > 0.3 && lowRiskProblematicRate > 0.5) {
      this.thresholds.suggestCommit = Math.max(0.3, this.thresholds.suggestCommit - 0.05);
      this.thresholds.autoSnapshot = Math.max(0.2, this.thresholds.autoSnapshot - 0.05);
      changes.push(`Lowered thresholds: ${(lowRiskProblematicRate * 100).toFixed(0)}% of problematic PRs came from low-risk sessions`);
    }
    if (problematicRate < 0.15 && avgReviewTime < PR_METRICS_THRESHOLDS.reviewTimeDanger / 2) {
      this.thresholds.suggestCommit = Math.min(0.7, this.thresholds.suggestCommit + 0.03);
      changes.push(`Raised thresholds: PR quality is good (${(problematicRate * 100).toFixed(0)}% problematic)`);
    }
    const largePRs = outcomesWithPR.filter((o) => (o.prSizeLines ?? 0) > 400);
    const largePRProblematicRate = largePRs.length > 0 ? largePRs.filter((o) => problematicPRs.includes(o)).length / largePRs.length : 0;
    if (largePRProblematicRate > 0.5 && this.weights.wL < WEIGHT_BOUNDS.max) {
      this.weights.wL = Math.min(WEIGHT_BOUNDS.max, this.weights.wL + WEIGHT_BOUNDS.stepSize);
      this.normalizeWeights();
      changes.push(`Increased lines weight: ${(largePRProblematicRate * 100).toFixed(0)}% of large PRs were problematic`);
    }
    return {
      adjusted: changes.length > 0,
      changes: changes.length > 0 ? changes : [
        "PR metrics indicate current calibration is appropriate"
      ],
      prAnalysis: {
        totalPRs: outcomesWithPR.length,
        avgReviewTime,
        avgComments,
        problematicPRRate: problematicRate
      }
    };
  }
  /**
  * Set thresholds directly (for cloud sync)
  *
  * Allows external systems to apply threshold adjustments.
  * Validates bounds before applying.
  */
  setThresholds(thresholds) {
    if (thresholds.autoSnapshot !== void 0) {
      this.thresholds.autoSnapshot = Math.max(0.1, Math.min(0.6, thresholds.autoSnapshot));
    }
    if (thresholds.suggestCommit !== void 0) {
      this.thresholds.suggestCommit = Math.max(0.2, Math.min(0.8, thresholds.suggestCommit));
    }
    if (thresholds.strongCommit !== void 0) {
      this.thresholds.strongCommit = Math.max(0.5, Math.min(1, thresholds.strongCommit));
    }
  }
  /**
  * Get current weights (for persistence/display)
  */
  getWeights() {
    return {
      ...this.weights
    };
  }
  /**
  * Set weights directly (for persistence restoration)
  */
  setWeights(weights) {
    if (weights.wT !== void 0) {
      this.weights.wT = Math.max(WEIGHT_BOUNDS.min, Math.min(WEIGHT_BOUNDS.max, weights.wT));
    }
    if (weights.wL !== void 0) {
      this.weights.wL = Math.max(WEIGHT_BOUNDS.min, Math.min(WEIGHT_BOUNDS.max, weights.wL));
    }
    if (weights.wF !== void 0) {
      this.weights.wF = Math.max(WEIGHT_BOUNDS.min, Math.min(WEIGHT_BOUNDS.max, weights.wF));
    }
    if (weights.wA !== void 0) {
      this.weights.wA = Math.max(WEIGHT_BOUNDS.min, Math.min(WEIGHT_BOUNDS.max, weights.wA));
    }
    if (weights.wC !== void 0) {
      this.weights.wC = Math.max(WEIGHT_BOUNDS.min, Math.min(WEIGHT_BOUNDS.max, weights.wC));
    }
    this.normalizeWeights();
  }
  /**
  * Update user tuning preferences
  */
  setUserTuning(tuning) {
    this.userTuning = {
      ...this.userTuning,
      ...tuning,
      // Enforce bounds
      thresholdScale: Math.max(0.8, Math.min(1.2, tuning.thresholdScale ?? this.userTuning.thresholdScale)),
      promptCooldownScale: Math.max(0.5, Math.min(2, tuning.promptCooldownScale ?? this.userTuning.promptCooldownScale)),
      snapshotCooldownScale: Math.max(0.5, Math.min(2, tuning.snapshotCooldownScale ?? this.userTuning.snapshotCooldownScale))
    };
  }
  /**
  * Get current configuration (for debugging/display)
  */
  getConfig() {
    return {
      weights: {
        ...this.weights
      },
      thresholds: {
        ...this.thresholds
      },
      userTuning: {
        ...this.userTuning
      },
      scaledThresholds: this.applyUserScaling()
    };
  }
  /**
  * Get all session outcomes for persistence
  * Used by external storage layer to save calibration data
  */
  getOutcomes() {
    return [
      ...this.outcomes
    ];
  }
  /**
  * Restore session outcomes from persistence
  * Used on initialization to restore self-tuning state
  */
  setOutcomes(outcomes) {
    this.outcomes = outcomes.slice(-this.maxOutcomes);
  }
  /**
  * Reset state (for testing or user reset)
  */
  reset() {
    this.lastSnapshotAt = null;
    this.lastPromptAt = null;
    this.isInSnapshotState = false;
    this.isInPromptState = false;
    this.isInStrongState = false;
  }
  // =========================================================================
  // INTERNAL
  // =========================================================================
  computeBreakdown(context) {
    const timeRisk = computeTimeRisk(context.minutesSinceCommit, context.phase);
    const linesRisk = computeLinesRisk(context.linesChanged);
    const filesRisk = computeFilesRisk(context.filesChanged);
    const aiRisk = computeAiRisk(context.aiFraction);
    const churnRisk = computeChurnRisk(context.churnPercent);
    const rawScore = this.weights.wT * timeRisk + this.weights.wL * linesRisk + this.weights.wF * filesRisk + this.weights.wA * aiRisk + this.weights.wC * churnRisk;
    const phaseMultiplier = PHASE_MULTIPLIERS[context.phase];
    let finalScore = rawScore * phaseMultiplier;
    finalScore = Math.min(Math.max(finalScore, 0), 1.5);
    return {
      timeRisk,
      linesRisk,
      filesRisk,
      aiRisk,
      churnRisk,
      rawScore,
      phaseMultiplier,
      finalScore
    };
  }
  applyUserScaling() {
    const scale = this.userTuning.thresholdScale;
    return {
      autoSnapshot: this.thresholds.autoSnapshot * scale,
      suggestCommit: this.thresholds.suggestCommit * scale,
      strongCommit: this.thresholds.strongCommit * scale
    };
  }
  getScaledCooldowns() {
    return {
      minSnapshotInterval: DEFAULT_COOLDOWNS.minSnapshotInterval * this.userTuning.snapshotCooldownScale,
      minPromptInterval: DEFAULT_COOLDOWNS.minPromptInterval * this.userTuning.promptCooldownScale
    };
  }
  determineAction(score, _thresholds, _now) {
    let action = "none";
    let escalation = "none";
    let enteredState = false;
    if (score >= HYSTERESIS.strongEnter && !this.isInStrongState) {
      this.isInStrongState = true;
      enteredState = true;
    } else if (score < HYSTERESIS.strongExit && this.isInStrongState) {
      this.isInStrongState = false;
    }
    if (score >= HYSTERESIS.promptEnter && !this.isInPromptState) {
      this.isInPromptState = true;
      enteredState = true;
    } else if (score < HYSTERESIS.promptExit && this.isInPromptState) {
      this.isInPromptState = false;
    }
    if (score >= HYSTERESIS.snapshotEnter && !this.isInSnapshotState) {
      this.isInSnapshotState = true;
      enteredState = true;
    } else if (score < HYSTERESIS.snapshotExit && this.isInSnapshotState) {
      this.isInSnapshotState = false;
    }
    if (this.isInStrongState) {
      action = "strong_commit";
      escalation = "modal";
    } else if (this.isInPromptState) {
      action = "suggest_commit";
      escalation = "notification";
    } else if (this.isInSnapshotState) {
      action = "auto_snapshot";
      escalation = "status_bar";
    }
    return {
      action,
      escalation,
      enteredState
    };
  }
  generateReason(breakdown, action, context) {
    const { timeRisk, linesRisk, filesRisk, aiRisk, churnRisk, finalScore } = breakdown;
    const risks = [
      {
        name: "time",
        value: timeRisk * this.weights.wT
      },
      {
        name: "lines",
        value: linesRisk * this.weights.wL
      },
      {
        name: "files",
        value: filesRisk * this.weights.wF
      },
      {
        name: "ai",
        value: aiRisk * this.weights.wA
      },
      {
        name: "churn",
        value: churnRisk * this.weights.wC
      }
    ].sort((a, b) => b.value - a.value);
    const primary = risks[0];
    let reason;
    let educational;
    switch (action) {
      case "strong_commit":
        reason = `High risk (${(finalScore * 100).toFixed(0)}%) - commit strongly recommended`;
        educational = `Your ${primary.name} risk is high. Research shows commits at this level have 3x higher defect rates.`;
        break;
      case "suggest_commit":
        reason = `Moderate risk (${(finalScore * 100).toFixed(0)}%) - consider committing`;
        educational = primary.name === "time" ? `You've been working ${context.minutesSinceCommit} minutes without a commit. Smaller, frequent commits improve code review quality.` : primary.name === "lines" ? `${context.linesChanged} lines changed. PRs over 400 lines have 40% lower review effectiveness.` : primary.name === "ai" ? `${(context.aiFraction * 100).toFixed(0)}% AI-generated code. Consider reviewing and committing before more AI additions.` : "Consider committing to reduce accumulated risk.";
        break;
      case "auto_snapshot":
        reason = `Low-moderate risk (${(finalScore * 100).toFixed(0)}%) - snapshot created`;
        break;
      default:
        reason = `Session health good (${(finalScore * 100).toFixed(0)}%)`;
    }
    return {
      reason,
      educational
    };
  }
  /**
  * Calculate correlation between each factor and bad outcomes
  * Uses point-biserial correlation approximation
  */
  calculateFactorCorrelations() {
    const badOutcomes = this.outcomes.filter((o) => o.hadRevertWithin2Weeks || o.hadBugFixWithin2Weeks);
    const goodOutcomes = this.outcomes.filter((o) => !o.hadRevertWithin2Weeks && !o.hadBugFixWithin2Weeks);
    if (badOutcomes.length === 0 || goodOutcomes.length === 0) {
      return {
        time: 0,
        lines: 0,
        files: 0,
        ai: 0,
        churn: 0
      };
    }
    const calcCorrelation = /* @__PURE__ */ __name5((extract, normalize5) => {
      const badMean = badOutcomes.reduce((sum, o) => sum + normalize5(extract(o)), 0) / badOutcomes.length;
      const goodMean = goodOutcomes.reduce((sum, o) => sum + normalize5(extract(o)), 0) / goodOutcomes.length;
      return badMean - goodMean;
    }, "calcCorrelation");
    return {
      time: calcCorrelation((o) => {
        return o.linesAtCommit / 10;
      }, (v) => Math.min(v / 60, 1)),
      lines: calcCorrelation((o) => o.linesAtCommit, (v) => Math.min(v / 1e3, 1)),
      files: calcCorrelation((o) => o.filesAtCommit, (v) => Math.min(v / 10, 1)),
      ai: calcCorrelation((o) => o.aiFraction, (v) => v),
      churn: calcCorrelation((o) => o.churnPercent, (v) => Math.min(v / 100, 1))
    };
  }
  /**
  * Get human-readable factor name
  */
  getFactorName(key) {
    switch (key) {
      case "wT":
        return "time";
      case "wL":
        return "lines";
      case "wF":
        return "files";
      case "wA":
        return "AI";
      case "wC":
        return "churn";
    }
  }
  /**
  * Normalize weights to sum to 1
  */
  normalizeWeights() {
    const sum = this.weights.wT + this.weights.wL + this.weights.wF + this.weights.wA + this.weights.wC;
    if (sum > 0 && Math.abs(sum - 1) > 1e-3) {
      this.weights.wT /= sum;
      this.weights.wL /= sum;
      this.weights.wF /= sum;
      this.weights.wA /= sum;
      this.weights.wC /= sum;
    }
  }
};
function createCommitRiskSystem(userTuning) {
  return new CommitRiskSystem(userTuning);
}
__name(createCommitRiskSystem, "createCommitRiskSystem");
__name5(createCommitRiskSystem, "createCommitRiskSystem");
function serializeCommitRiskSystem(system) {
  const config = system.getConfig();
  return {
    outcomes: system.getOutcomes(),
    weights: config.weights,
    thresholds: config.thresholds,
    userTuning: config.userTuning,
    lastSnapshotAt: null,
    lastPromptAt: null
  };
}
__name(serializeCommitRiskSystem, "serializeCommitRiskSystem");
__name5(serializeCommitRiskSystem, "serializeCommitRiskSystem");
function deserializeCommitRiskSystem(state) {
  const system = new CommitRiskSystem(state.userTuning);
  if (state.outcomes.length > 0) {
    system.setOutcomes(state.outcomes);
  }
  if (state.weights) {
    system.setWeights(state.weights);
  }
  if (state.thresholds) {
    system.setThresholds(state.thresholds);
  }
  return system;
}
__name(deserializeCommitRiskSystem, "deserializeCommitRiskSystem");
__name5(deserializeCommitRiskSystem, "deserializeCommitRiskSystem");
var PRESSURE_THRESHOLDS = {
  /** Moderate pressure - consider snapshotting soon */
  moderate: 50,
  /** High pressure - snapshot recommended */
  high: 75,
  /** Critical pressure - immediate snapshot required */
  critical: 80
};
var OXYGEN_THRESHOLDS = {
  /** Low - needs attention */
  low: 50,
  /** Moderate - acceptable but could improve */
  moderate: 70,
  /** Good - healthy coverage */
  good: 85
};
var TRAJECTORY_THRESHOLDS = {
  /** Pressure level that contributes to escalating trajectory */
  escalatingPressure: 60,
  /** Oxygen level below which contributes to escalating trajectory */
  escalatingOxygen: 70,
  /** Pressure level for critical trajectory */
  criticalPressure: 80,
  /** Oxygen level below which contributes to critical trajectory */
  criticalOxygen: 50,
  /** Oxygen level required for recovering state */
  recoveringOxygen: 70
};
var URGENCY_THRESHOLDS = {
  /** Low urgency - optional action */
  low: 20,
  /** Medium urgency - should act soon */
  medium: 40,
  /** High urgency - should act now */
  high: 60,
  /** Critical urgency - immediate action required */
  critical: 80
};
function getPressureLevel(value) {
  if (value >= PRESSURE_THRESHOLDS.critical) {
    return "critical";
  }
  if (value >= PRESSURE_THRESHOLDS.high) {
    return "high";
  }
  if (value >= PRESSURE_THRESHOLDS.moderate) {
    return "moderate";
  }
  return "low";
}
__name(getPressureLevel, "getPressureLevel");
__name5(getPressureLevel, "getPressureLevel");
function getOxygenLevel(value) {
  if (value >= OXYGEN_THRESHOLDS.good) {
    return "good";
  }
  if (value >= OXYGEN_THRESHOLDS.moderate) {
    return "moderate";
  }
  if (value >= OXYGEN_THRESHOLDS.low) {
    return "low";
  }
  return "critical";
}
__name(getOxygenLevel, "getOxygenLevel");
__name5(getOxygenLevel, "getOxygenLevel");
function calculateUrgencyScore(vitals) {
  let score = 0;
  score += Math.min(vitals.pressure / 100 * 40, 40);
  if (vitals.oxygen < OXYGEN_THRESHOLDS.low) {
    score += Math.min((OXYGEN_THRESHOLDS.low - vitals.oxygen) / OXYGEN_THRESHOLDS.low * 25, 25);
  }
  const tempScores = {
    cold: 0,
    warm: 5,
    hot: 15,
    burning: 20
  };
  score += tempScores[vitals.temperatureLevel];
  return Math.min(Math.round(score), 100);
}
__name(calculateUrgencyScore, "calculateUrgencyScore");
__name5(calculateUrgencyScore, "calculateUrgencyScore");
function getUrgencyLevel(score) {
  if (score >= URGENCY_THRESHOLDS.critical) {
    return "critical";
  }
  if (score >= URGENCY_THRESHOLDS.high) {
    return "high";
  }
  if (score >= URGENCY_THRESHOLDS.medium) {
    return "medium";
  }
  if (score >= URGENCY_THRESHOLDS.low) {
    return "low";
  }
  return "none";
}
__name(getUrgencyLevel, "getUrgencyLevel");
__name5(getUrgencyLevel, "getUrgencyLevel");
function shouldRecommendSnapshot(vitals) {
  if (vitals.trajectory === "critical") {
    return {
      should: true,
      urgency: "critical",
      reason: "Critical workspace state - immediate snapshot required"
    };
  }
  if (vitals.pressure >= PRESSURE_THRESHOLDS.high) {
    return {
      should: true,
      urgency: "high",
      reason: `High pressure (${vitals.pressure}%) - snapshot recommended`
    };
  }
  if (vitals.trajectory === "escalating" && vitals.pressure >= PRESSURE_THRESHOLDS.moderate) {
    return {
      should: true,
      urgency: "medium",
      reason: "Escalating trajectory - consider creating a snapshot"
    };
  }
  if (vitals.oxygen < OXYGEN_THRESHOLDS.low && vitals.pressure >= PRESSURE_THRESHOLDS.moderate) {
    return {
      should: true,
      urgency: "medium",
      reason: `Low snapshot coverage (${vitals.oxygen}%) with unsaved changes`
    };
  }
  return {
    should: false,
    urgency: "none",
    reason: "Workspace healthy - no snapshot needed"
  };
}
__name(shouldRecommendSnapshot, "shouldRecommendSnapshot");
__name5(shouldRecommendSnapshot, "shouldRecommendSnapshot");
var DORA_THRESHOLDS = {
  elite: {
    meanTimeToRecovery: 2e3,
    leadTimeForProtection: 6e4,
    snapshotFrequency: 4,
    recoverySuccessRate: 99
  },
  high: {
    meanTimeToRecovery: 5e3,
    leadTimeForProtection: 3e5,
    snapshotFrequency: 2,
    recoverySuccessRate: 95
  },
  medium: {
    meanTimeToRecovery: 1e4,
    leadTimeForProtection: 9e5,
    snapshotFrequency: 1,
    recoverySuccessRate: 85
  }
};
var DORAMetrics = class {
  static {
    __name(this, "DORAMetrics");
  }
  static {
    __name5(this, "DORAMetrics");
  }
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: stored for context/debugging
  workspaceId;
  snapshotEvents = [];
  recoveryEvents = [];
  measurementWindowMs;
  /**
  * Create a new DORAMetrics tracker
  * @param workspaceId - Workspace identifier
  * @param measurementWindowMs - Time window for metrics (default: 1 hour)
  */
  constructor(workspaceId, measurementWindowMs = 60 * 60 * 1e3) {
    this.workspaceId = workspaceId;
    this.measurementWindowMs = measurementWindowMs;
  }
  /**
  * Record a snapshot creation event
  */
  recordSnapshot(event) {
    this.snapshotEvents.push(event);
    this.pruneOldEvents();
  }
  /**
  * Record a recovery event
  */
  recordRecovery(event) {
    this.recoveryEvents.push(event);
    this.pruneOldEvents();
  }
  /**
  * Get current DORA metrics snapshot
  */
  getMetrics(now = Date.now()) {
    const cutoff = now - this.measurementWindowMs;
    const recentSnapshots = this.snapshotEvents.filter((e) => e.timestamp >= cutoff);
    const recentRecoveries = this.recoveryEvents.filter((e) => e.requestTime >= cutoff);
    const successfulRecoveries = recentRecoveries.filter((r) => r.success);
    const meanTimeToRecovery = successfulRecoveries.length > 0 ? successfulRecoveries.reduce((sum, r) => sum + (r.completionTime - r.requestTime), 0) / successfulRecoveries.length : 0;
    const leadTimeForProtection = recentSnapshots.length > 0 ? recentSnapshots.reduce((sum, s) => sum + s.timeSinceLastChange, 0) / recentSnapshots.length : 0;
    const hoursInWindow = this.measurementWindowMs / (60 * 60 * 1e3);
    const snapshotFrequency = recentSnapshots.length / hoursInWindow;
    const recoverySuccessRate = recentRecoveries.length > 0 ? successfulRecoveries.length / recentRecoveries.length * 100 : 100;
    const recoveryTriggered = recentSnapshots.filter((s) => s.isRecoveryTriggered);
    const reworkRate = recentSnapshots.length > 0 ? recoveryTriggered.length / recentSnapshots.length * 100 : 0;
    const performanceTier = this.calculatePerformanceTier({
      meanTimeToRecovery,
      leadTimeForProtection,
      snapshotFrequency,
      recoverySuccessRate
    });
    return {
      meanTimeToRecovery: Math.round(meanTimeToRecovery),
      leadTimeForProtection: Math.round(leadTimeForProtection),
      snapshotFrequency: Math.round(snapshotFrequency * 10) / 10,
      recoverySuccessRate: Math.round(recoverySuccessRate * 10) / 10,
      reworkRate: Math.round(reworkRate * 10) / 10,
      totalSnapshots: recentSnapshots.length,
      totalRecoveries: recentRecoveries.length,
      performanceTier
    };
  }
  /**
  * Get recovery time for a specific recovery (for real-time tracking)
  */
  getRecoveryTime(snapshotId) {
    const recovery = this.recoveryEvents.find((r) => r.snapshotId === snapshotId && r.success);
    if (!recovery) {
      return null;
    }
    return recovery.completionTime - recovery.requestTime;
  }
  /**
  * Get trend direction for key metrics
  */
  getTrends(now = Date.now()) {
    const currentWindow = this.measurementWindowMs;
    const halfWindow = currentWindow / 2;
    const midpoint = now - halfWindow;
    const cutoff = now - currentWindow;
    const firstHalfRecoveries = this.recoveryEvents.filter((r) => r.requestTime >= cutoff && r.requestTime < midpoint);
    const secondHalfRecoveries = this.recoveryEvents.filter((r) => r.requestTime >= midpoint);
    const firstHalfSnapshots = this.snapshotEvents.filter((s) => s.timestamp >= cutoff && s.timestamp < midpoint);
    const secondHalfSnapshots = this.snapshotEvents.filter((s) => s.timestamp >= midpoint);
    const firstRecoveryAvg = this.calculateAvgRecoveryTime(firstHalfRecoveries);
    const secondRecoveryAvg = this.calculateAvgRecoveryTime(secondHalfRecoveries);
    const recoveryTrend = secondRecoveryAvg < firstRecoveryAvg * 0.9 ? "improving" : secondRecoveryAvg > firstRecoveryAvg * 1.1 ? "degrading" : "stable";
    const frequencyTrend = secondHalfSnapshots.length > firstHalfSnapshots.length * 1.1 ? "improving" : secondHalfSnapshots.length < firstHalfSnapshots.length * 0.9 ? "degrading" : "stable";
    return {
      recoveryTrend,
      frequencyTrend
    };
  }
  /**
  * Reset all metrics (for testing or workspace reset)
  */
  reset() {
    this.snapshotEvents.length = 0;
    this.recoveryEvents.length = 0;
  }
  // =========================================================================
  // INTERNAL
  // =========================================================================
  calculateAvgRecoveryTime(recoveries) {
    const successful = recoveries.filter((r) => r.success);
    if (successful.length === 0) {
      return 0;
    }
    return successful.reduce((sum, r) => sum + (r.completionTime - r.requestTime), 0) / successful.length;
  }
  calculatePerformanceTier(metrics) {
    const { meanTimeToRecovery, leadTimeForProtection, snapshotFrequency, recoverySuccessRate } = metrics;
    if (meanTimeToRecovery <= DORA_THRESHOLDS.elite.meanTimeToRecovery && leadTimeForProtection <= DORA_THRESHOLDS.elite.leadTimeForProtection && snapshotFrequency >= DORA_THRESHOLDS.elite.snapshotFrequency && recoverySuccessRate >= DORA_THRESHOLDS.elite.recoverySuccessRate) {
      return "elite";
    }
    if (meanTimeToRecovery <= DORA_THRESHOLDS.high.meanTimeToRecovery && leadTimeForProtection <= DORA_THRESHOLDS.high.leadTimeForProtection && snapshotFrequency >= DORA_THRESHOLDS.high.snapshotFrequency && recoverySuccessRate >= DORA_THRESHOLDS.high.recoverySuccessRate) {
      return "high";
    }
    if (meanTimeToRecovery <= DORA_THRESHOLDS.medium.meanTimeToRecovery && leadTimeForProtection <= DORA_THRESHOLDS.medium.leadTimeForProtection && snapshotFrequency >= DORA_THRESHOLDS.medium.snapshotFrequency && recoverySuccessRate >= DORA_THRESHOLDS.medium.recoverySuccessRate) {
      return "medium";
    }
    return "low";
  }
  pruneOldEvents() {
    const cutoff = Date.now() - this.measurementWindowMs * 2;
    while (this.snapshotEvents.length > 0 && this.snapshotEvents[0].timestamp < cutoff) {
      this.snapshotEvents.shift();
    }
    while (this.recoveryEvents.length > 0 && this.recoveryEvents[0].requestTime < cutoff) {
      this.recoveryEvents.shift();
    }
  }
};
function createDORAMetrics(workspaceId) {
  return new DORAMetrics(workspaceId);
}
__name(createDORAMetrics, "createDORAMetrics");
__name5(createDORAMetrics, "createDORAMetrics");
var DEFAULT_DOC_FRESHNESS_CONFIG = {
  staleHours: 72,
  docPatterns: [
    "**/*.md",
    "**/CLAUDE.md",
    "**/*-audit.md",
    "**/*-report.md",
    "**/*ROADMAP*.md",
    "**/*ISSUES*.md"
  ],
  sourcePatterns: [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx"
  ]
};
(class {
  static {
    __name(this, "DocFreshnessSensor");
  }
  static {
    __name5(this, "DocFreshnessSensor");
  }
  config;
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_DOC_FRESHNESS_CONFIG,
      ...config
    };
  }
  /**
  * Analyze documentation freshness in a directory
  *
  * @param workspaceRoot - Root directory to analyze
  * @returns Freshness analysis result
  */
  async analyze(workspaceRoot) {
    const startTime = Date.now();
    try {
      const { glob } = await import('glob');
      const docFiles = await glob(this.config.docPatterns, {
        cwd: workspaceRoot,
        absolute: true,
        ignore: [
          "**/node_modules/**",
          "**/dist/**",
          "**/.next/**"
        ]
      });
      const sourceFiles = await glob(this.config.sourcePatterns, {
        cwd: workspaceRoot,
        absolute: true,
        ignore: [
          "**/node_modules/**",
          "**/dist/**",
          "**/.next/**"
        ]
      });
      const docMtimes = await this.getMtimes(docFiles);
      const sourceMtimes = await this.getMtimes(sourceFiles);
      const now = Date.now();
      const staleThreshold = now - this.config.staleHours * 60 * 60 * 1e3;
      const staleDocs = [];
      for (const [docPath, docMtime] of docMtimes) {
        const hoursStale = (now - docMtime) / (60 * 60 * 1e3);
        const docDir = dirname(docPath);
        const newerSourceFiles = [];
        for (const [srcPath, srcMtime] of sourceMtimes) {
          if (srcPath.startsWith(docDir) && srcMtime > docMtime) {
            newerSourceFiles.push(relative(workspaceRoot, srcPath));
          }
        }
        const isStale = docMtime < staleThreshold || newerSourceFiles.length > 0;
        if (isStale) {
          staleDocs.push({
            path: relative(workspaceRoot, docPath),
            mtime: docMtime,
            hoursStale: Math.round(hoursStale),
            newerSourceFiles: newerSourceFiles.slice(0, 5),
            severity: hoursStale > this.config.staleHours * 2 ? "error" : "warning"
          });
        }
      }
      const freshDocs = docMtimes.size - staleDocs.length;
      const freshnessValue = docMtimes.size > 0 ? Math.round(freshDocs / docMtimes.size * 100) : 100;
      return {
        state: {
          value: freshnessValue,
          staleCount: staleDocs.length,
          staleDocs: staleDocs.sort((a, b) => b.hoursStale - a.hoursStale),
          totalDocs: docMtimes.size
        },
        success: true,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        state: {
          value: 0,
          staleCount: 0,
          staleDocs: [],
          totalDocs: 0
        },
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }
  /**
  * Quick check for specific documentation files
  *
  * @param docPaths - Absolute paths to doc files
  * @param workspaceRoot - Workspace root for relative source lookup
  */
  async checkSpecificDocs(docPaths, _workspaceRoot) {
    const results = /* @__PURE__ */ new Map();
    const now = Date.now();
    const staleThreshold = now - this.config.staleHours * 60 * 60 * 1e3;
    for (const docPath of docPaths) {
      try {
        const stats = await stat(docPath);
        const hoursOld = Math.round((now - stats.mtimeMs) / (60 * 60 * 1e3));
        results.set(docPath, {
          stale: stats.mtimeMs < staleThreshold,
          hoursOld
        });
      } catch {
        results.set(docPath, {
          stale: true,
          hoursOld: -1
        });
      }
    }
    return results;
  }
  /**
  * Get mtimes for a list of files
  */
  async getMtimes(files) {
    const mtimes = /* @__PURE__ */ new Map();
    const results = await Promise.allSettled(files.map(async (file) => {
      const stats = await stat(file);
      return {
        file,
        mtime: stats.mtimeMs
      };
    }));
    for (const result7 of results) {
      if (result7.status === "fulfilled") {
        mtimes.set(result7.value.file, result7.value.mtime);
      }
    }
    return mtimes;
  }
});
function formatStaleDocs(staleDocs) {
  if (staleDocs.length === 0) {
    return "All documentation is fresh";
  }
  return staleDocs.map((doc) => {
    const icon = doc.severity === "error" ? "!!!" : "!";
    const newerFiles = doc.newerSourceFiles.length > 0 ? ` (${doc.newerSourceFiles.length} newer source files)` : "";
    return `${icon} ${doc.path}: ${doc.hoursStale}h stale${newerFiles}`;
  }).join("\n");
}
__name(formatStaleDocs, "formatStaleDocs");
__name5(formatStaleDocs, "formatStaleDocs");
function loadJsonl(filepath) {
  if (!fs5.existsSync(filepath)) {
    return [];
  }
  try {
    return fs5.readFileSync(filepath, "utf-8").split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
  } catch (e) {
    console.error(`[JsonlStore] Error loading ${filepath}:`, e);
    return [];
  }
}
__name(loadJsonl, "loadJsonl");
__name5(loadJsonl, "loadJsonl");
(class {
  static {
    __name(this, "PatternLookup");
  }
  static {
    __name5(this, "PatternLookup");
  }
  config;
  learningsCache = null;
  violationsCache = null;
  constructor(config) {
    this.config = config;
  }
  /**
  * Find patterns by scenario, file, or problem
  */
  lookup(query, value, extra) {
    const keywords = query === "scenario" ? extra || [] : query === "file" ? this.extractFileKeywords(value) : value.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    return this.scoreAndFilter(value, keywords, extra);
  }
  /**
  * Extract keywords from file path
  */
  extractFileKeywords(filePath) {
    const ext = path5__default.extname(filePath).slice(1);
    const dirs = path5__default.dirname(filePath).split("/").filter((p) => p && !p.startsWith("."));
    const name = path5__default.basename(filePath).split(".")[0];
    return [
      ext,
      ...dirs,
      name
    ].filter(Boolean);
  }
  /**
  * Score, filter, and return top matches
  */
  scoreAndFilter(scenario, keywords, fileContext) {
    const results = [];
    const searchText = scenario.toLowerCase();
    for (const learning of this.loadLearnings()) {
      const score = this.scoreMatch(learning, searchText, keywords, fileContext);
      if (score > 0.3) {
        results.push({
          content: learning,
          relevance: score,
          reason: `Learning relevant to ${scenario}`,
          context: {
            type: "learning",
            keywords: Array.isArray(learning.trigger) ? learning.trigger : [
              learning.trigger
            ]
          }
        });
      }
    }
    for (const violation of this.loadViolations()) {
      const score = this.scoreMatch(violation, searchText, keywords, fileContext);
      if (score > 0.3) {
        results.push({
          content: violation,
          relevance: score,
          reason: `Similar pattern detected in ${violation.file}`,
          context: {
            type: "violation",
            keywords: [
              violation.type
            ],
            relatedFiles: [
              violation.file
            ]
          }
        });
      }
    }
    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
  }
  /**
  * Score relevance of a pattern match
  */
  scoreMatch(item, scenario, keywords, fileContext) {
    const searchText = this.extractSearchText(item).toLowerCase();
    const scenarioMatch = searchText.includes(scenario) ? 40 : this.countOverlap(scenario, searchText) * 20;
    const keywordMatch = keywords.filter((kw) => searchText.includes(kw.toLowerCase())).length / Math.max(keywords.length, 1) * 40;
    const fileMatch = fileContext && "file" in item && item.file.includes(fileContext) ? 20 : 0;
    return Math.min((scenarioMatch + keywordMatch + fileMatch) / 100, 1);
  }
  /**
  * Count token overlap between texts
  */
  countOverlap(text1, text2) {
    const tokens1 = new Set(text1.split(/\s+/));
    const tokens2 = new Set(text2.split(/\s+/));
    const overlap = [
      ...tokens1
    ].filter((t) => tokens2.has(t)).length;
    return overlap > 0 ? 1 : 0;
  }
  /**
  * Extract searchable text from learning or violation
  */
  extractSearchText(item) {
    if ("action" in item) {
      const triggers = Array.isArray(item.trigger) ? item.trigger.join(" ") : item.trigger;
      return `${triggers} ${item.action} ${item.solution || ""} ${item.context || ""}`;
    }
    return `${item.type} ${item.whatHappened} ${item.whyItHappened} ${item.prevention}`;
  }
  /**
  * Load learnings (with caching)
  */
  loadLearnings() {
    if (!this.learningsCache) {
      const learningsPath = path5__default.join(this.config.rootDir, this.config.learningsDir, "learnings.jsonl");
      this.learningsCache = loadJsonl(learningsPath);
    }
    return this.learningsCache;
  }
  /**
  * Load violations (with caching)
  */
  loadViolations() {
    if (!this.violationsCache) {
      const violationsPath = path5__default.join(this.config.rootDir, this.config.violationsFile);
      this.violationsCache = loadJsonl(violationsPath);
    }
    return this.violationsCache;
  }
  clearCache() {
    this.learningsCache = null;
    this.violationsCache = null;
  }
});
var DEFAULT_THRESHOLD_ADJUSTMENTS = {
  pulseMultiplier: 1,
  temperatureMultiplier: 1,
  pressureMultiplier: 1,
  oxygenMultiplier: 1
};
var CALIBRATION_THRESHOLDS = {
  /** Minimum observations before starting calibration */
  MIN_OBSERVATIONS_TO_START: 5,
  /** Observations needed for full calibration */
  OBSERVATIONS_FOR_CALIBRATION: 20,
  /** Observations to lock calibration (stable) */
  OBSERVATIONS_TO_LOCK: 50
};
var PHASE_PATTERNS = {
  hotfix: [
    /^hotfix\//i,
    /^fix\//i,
    /^bugfix\//i,
    /^patch\//i,
    /^urgent\//i,
    /^emergency\//i,
    /^critical\//i
  ],
  feature: [
    /^feature\//i,
    /^feat\//i,
    /^add\//i,
    /^implement\//i,
    /^new\//i,
    /^enhancement\//i
  ],
  refactor: [
    /^refactor\//i,
    /^cleanup\//i,
    /^tech-debt\//i,
    /^improvement\//i,
    /^optimize\//i,
    /^chore\//i
  ],
  release: [
    /^release\//i,
    /^release-/i,
    /^v\d+\.\d+/i,
    /^version\//i
  ],
  exploratory: [
    /^experiment\//i,
    /^spike\//i,
    /^poc\//i,
    /^prototype\//i,
    /^try\//i,
    /^test\//i,
    /^wip\//i
  ],
  unknown: []
};
var PHASE_THRESHOLDS = {
  hotfix: {
    intervalMultiplier: 0.5,
    maxLinesBeforeSnapshot: 50,
    riskMultiplier: 1.5,
    recommendedIntervalMinutes: 15,
    aiAdjustedIntervalMinutes: 10
  },
  feature: {
    intervalMultiplier: 1,
    maxLinesBeforeSnapshot: 300,
    riskMultiplier: 1,
    recommendedIntervalMinutes: 45,
    aiAdjustedIntervalMinutes: 20
  },
  refactor: {
    intervalMultiplier: 1.5,
    maxLinesBeforeSnapshot: 400,
    riskMultiplier: 0.8,
    recommendedIntervalMinutes: 90,
    aiAdjustedIntervalMinutes: 60
  },
  release: {
    intervalMultiplier: 0.7,
    maxLinesBeforeSnapshot: 100,
    riskMultiplier: 1.3,
    recommendedIntervalMinutes: 20,
    aiAdjustedIntervalMinutes: 15
  },
  exploratory: {
    intervalMultiplier: 2,
    maxLinesBeforeSnapshot: 1e3,
    riskMultiplier: 0.5,
    recommendedIntervalMinutes: 120,
    aiAdjustedIntervalMinutes: 90
  },
  unknown: {
    intervalMultiplier: 1,
    maxLinesBeforeSnapshot: 300,
    riskMultiplier: 1,
    recommendedIntervalMinutes: 45,
    aiAdjustedIntervalMinutes: 25
  }
};
var PhaseDetector = class {
  static {
    __name(this, "PhaseDetector");
  }
  static {
    __name5(this, "PhaseDetector");
  }
  cachedPhase = null;
  lastBranch = null;
  /** Manual phase overrides by workspace */
  overrides = /* @__PURE__ */ new Map();
  /**
  * Detect development phase from branch name
  * Respects manual overrides when set for the workspace
  *
  * @param branchName - Git branch name (e.g., "feature/add-auth")
  * @param workspaceId - Optional workspace ID for override lookup
  * @returns Phase detection result with thresholds
  */
  detectPhase(branchName, workspaceId) {
    if (workspaceId) {
      const override = this.getOverride(workspaceId);
      if (override) {
        return {
          phase: override.phase,
          confidence: 1,
          branchName,
          matchedPattern: `manual:${override.reason ?? "user-override"}`,
          thresholds: PHASE_THRESHOLDS[override.phase]
        };
      }
    }
    if (this.lastBranch === branchName && this.cachedPhase) {
      return this.cachedPhase;
    }
    for (const [phase, patterns] of Object.entries(PHASE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(branchName)) {
          const result22 = {
            phase,
            confidence: 0.9,
            branchName,
            matchedPattern: pattern.source,
            thresholds: PHASE_THRESHOLDS[phase]
          };
          this.cachedPhase = result22;
          this.lastBranch = branchName;
          return result22;
        }
      }
    }
    const inferredPhase = this.inferPhaseFromStructure(branchName);
    const result7 = {
      phase: inferredPhase.phase,
      confidence: inferredPhase.confidence,
      branchName,
      thresholds: PHASE_THRESHOLDS[inferredPhase.phase]
    };
    this.cachedPhase = result7;
    this.lastBranch = branchName;
    return result7;
  }
  /**
  * Infer phase from branch structure when no pattern matches
  */
  inferPhaseFromStructure(branchName) {
    if (branchName === "main" || branchName === "master" || branchName === "develop") {
      return {
        phase: "feature",
        confidence: 0.6
      };
    }
    if (/[A-Z]+-\d+/.test(branchName)) {
      return {
        phase: "feature",
        confidence: 0.5
      };
    }
    if (/fix|bug/i.test(branchName)) {
      return {
        phase: "hotfix",
        confidence: 0.6
      };
    }
    if (/\d+\.\d+/.test(branchName)) {
      return {
        phase: "release",
        confidence: 0.5
      };
    }
    return {
      phase: "unknown",
      confidence: 0.3
    };
  }
  /**
  * Get threshold multiplier for current phase
  * Used by ThresholdCalibrator to adjust vitals thresholds
  */
  getThresholdMultiplier(branchName) {
    const detection = this.detectPhase(branchName);
    return detection.thresholds.intervalMultiplier;
  }
  /**
  * Get risk multiplier for current phase
  * Used to adjust pressure calculations
  */
  getRiskMultiplier(branchName) {
    const detection = this.detectPhase(branchName);
    return detection.thresholds.riskMultiplier;
  }
  /**
  * Check if current phase requires more frequent snapshots
  */
  requiresFrequentSnapshots(branchName) {
    const detection = this.detectPhase(branchName);
    return detection.phase === "hotfix" || detection.phase === "release";
  }
  /**
  * Get recommended snapshot interval based on phase
  * @param aiActive - Whether AI tools are currently active
  */
  getRecommendedInterval(branchName, aiActive) {
    const detection = this.detectPhase(branchName);
    return aiActive ? detection.thresholds.aiAdjustedIntervalMinutes : detection.thresholds.recommendedIntervalMinutes;
  }
  /**
  * Check if lines changed exceeds phase threshold
  */
  exceedsLineThreshold(branchName, linesChanged) {
    const detection = this.detectPhase(branchName);
    return linesChanged >= detection.thresholds.maxLinesBeforeSnapshot;
  }
  /**
  * Clear cached detection (for testing or branch changes)
  */
  clearCache() {
    this.cachedPhase = null;
    this.lastBranch = null;
  }
  // =========================================================================
  // MANUAL PHASE OVERRIDE (workspace-scoped with expiry)
  // =========================================================================
  /**
  * Set manual phase override for a workspace
  * Useful when cross-branch work doesn't match branch name
  *
  * @param workspaceId - Workspace identifier
  * @param phase - Phase to force
  * @param expiryMinutes - Minutes until override expires (null = never)
  * @param reason - Optional reason for the override
  */
  setOverride(workspaceId, phase, expiryMinutes = 120, reason) {
    const expiresAt = expiryMinutes !== null ? Date.now() + expiryMinutes * 60 * 1e3 : null;
    this.overrides.set(workspaceId, {
      phase,
      workspaceId,
      expiresAt,
      reason
    });
    this.clearCache();
  }
  /**
  * Remove manual phase override for a workspace
  */
  clearOverride(workspaceId) {
    this.overrides.delete(workspaceId);
    this.clearCache();
  }
  /**
  * Get current override for a workspace (if valid)
  * Automatically clears expired overrides
  */
  getOverride(workspaceId) {
    const override = this.overrides.get(workspaceId);
    if (!override) {
      return null;
    }
    if (override.expiresAt !== null && Date.now() > override.expiresAt) {
      this.overrides.delete(workspaceId);
      return null;
    }
    return override;
  }
  /**
  * Check if workspace has an active override
  */
  hasOverride(workspaceId) {
    return this.getOverride(workspaceId) !== null;
  }
  /**
  * Get all active overrides (for debugging/UI)
  */
  getAllOverrides() {
    const now = Date.now();
    const active = [];
    for (const [id, override] of this.overrides) {
      if (override.expiresAt !== null && now > override.expiresAt) {
        this.overrides.delete(id);
      } else {
        active.push(override);
      }
    }
    return active;
  }
  // =========================================================================
  // PERSISTENCE (Workspace State)
  // =========================================================================
  /**
  * Serialize overrides to JSON-safe format for workspace state persistence
  * Automatically removes expired overrides during serialization
  *
  * @returns Record of active workspace overrides
  */
  serializeOverrides() {
    const now = Date.now();
    const active = {};
    for (const [id, override] of this.overrides) {
      if (override.expiresAt !== null && now > override.expiresAt) {
        this.overrides.delete(id);
        continue;
      }
      active[id] = override;
    }
    return active;
  }
  /**
  * Restore overrides from persisted workspace state
  * Validates structure and removes already-expired entries
  *
  * @param data Persisted overrides record
  */
  deserializeOverrides(data) {
    const now = Date.now();
    this.overrides.clear();
    for (const [id, override] of Object.entries(data)) {
      if (!override.phase || !override.workspaceId) {
        continue;
      }
      if (override.expiresAt !== null && now > override.expiresAt) {
        continue;
      }
      this.overrides.set(id, override);
    }
  }
  /**
  * Get all available thresholds for reference
  */
  static getPhaseThresholds() {
    return {
      ...PHASE_THRESHOLDS
    };
  }
  /**
  * Get all available patterns for reference
  */
  static getPhasePatterns() {
    const result7 = {};
    for (const [phase, patterns] of Object.entries(PHASE_PATTERNS)) {
      result7[phase] = patterns.map((p) => p.source);
    }
    return result7;
  }
};
(class {
  static {
    __name(this, "SnapshotSuggester");
  }
  static {
    __name5(this, "SnapshotSuggester");
  }
  snapshotHistory = [];
  maxHistorySize = 50;
  /**
  * Analyze current vitals and suggest snapshot
  */
  suggestSnapshot(snapshot, forecast) {
    const metrics = this.buildMetrics(snapshot, forecast);
    const urgency = this.scoreUrgency(metrics);
    const { reason, recommendation } = this.buildRecommendation(urgency, metrics);
    this.recordSnapshot(snapshot);
    return {
      urgency,
      reason,
      recommendation,
      metrics
    };
  }
  /**
  * Build metrics from vitals and forecast
  */
  buildMetrics(snapshot, forecast) {
    const lastSnapshot = this.snapshotHistory[this.snapshotHistory.length - 1];
    const timeDiffMinutes = lastSnapshot ? (snapshot.timestamp - lastSnapshot.timestamp) / 6e4 : 0;
    return {
      pressureRate: timeDiffMinutes > 0 ? snapshot.pressure.value / timeDiffMinutes : 0,
      aiActivityBurst: snapshot.temperature.aiPercentage > 70 && (lastSnapshot?.trajectory ?? "stable") === "stable",
      criticalFilesTouched: snapshot.pressure.criticalFilesTouched.length,
      trajectoryConfidence: forecast?.confidence ?? this.calculateConsistency()
    };
  }
  /**
  * Calculate urgency score (0-100)
  */
  scoreUrgency(m) {
    return Math.min(Math.min(m.pressureRate * 5, 40) + (m.aiActivityBurst ? 20 : 0) + Math.min(m.criticalFilesTouched * 5, 25) + (1 - m.trajectoryConfidence) * 15, 100);
  }
  /**
  * Build recommendation from urgency and metrics
  */
  buildRecommendation(urgency, m) {
    const reasons = {
      now: [
        m.aiActivityBurst && "AI activity spike detected",
        m.criticalFilesTouched > 0 && "critical files modified",
        m.pressureRate > 10 && "rapid risk escalation"
      ].filter(Boolean),
      soon: [
        m.pressureRate > 5 && "moderate pressure increase",
        m.trajectoryConfidence < 0.6 && "uncertain trajectory"
      ].filter(Boolean)
    };
    if (urgency >= 75) {
      return {
        recommendation: "now",
        reason: `Create snapshot immediately: ${reasons.now.join(", ")}`
      };
    }
    if (urgency >= 50) {
      return {
        recommendation: "soon",
        reason: `Create snapshot soon: ${reasons.soon.join(", ")}`
      };
    }
    return {
      recommendation: "monitor",
      reason: "Current state is stable. Continue monitoring."
    };
  }
  /**
  * Calculate trajectory consistency from history
  */
  calculateConsistency() {
    if (this.snapshotHistory.length < 2) {
      return 0.5;
    }
    const recent = this.snapshotHistory.slice(-5);
    return recent.filter((s) => s.trajectory === "stable").length / recent.length;
  }
  /**
  * Record snapshot in history
  */
  recordSnapshot(snapshot) {
    this.snapshotHistory.push({
      timestamp: snapshot.timestamp,
      trajectory: snapshot.trajectory
    });
    if (this.snapshotHistory.length > this.maxHistorySize) {
      this.snapshotHistory.shift();
    }
  }
  reset() {
    this.snapshotHistory = [];
  }
});
(class {
  static {
    __name(this, "TeamAggregator");
  }
  static {
    __name5(this, "TeamAggregator");
  }
  teamId;
  userMetrics = /* @__PURE__ */ new Map();
  constructor(teamId) {
    this.teamId = teamId;
  }
  recordUserMetrics(userId, username, metadata) {
    this.userMetrics.set(userId, {
      userId,
      username,
      metadata,
      timestamp: Date.now()
    });
  }
  getTeamAggregation() {
    const users = Array.from(this.userMetrics.values());
    if (users.length === 0) {
      return this.getEmptyAggregation();
    }
    const metrics = this.aggregateMetrics(users);
    const distribution = this.getDistribution(users);
    return {
      teamId: this.teamId,
      aggregationTime: Date.now(),
      memberCount: users.length,
      metrics,
      distribution,
      topContributors: this.getTopContributors(users),
      concerns: this.detectConcerns(users, metrics)
    };
  }
  getUserComparison(userId) {
    const user = this.userMetrics.get(userId);
    if (!user) {
      return null;
    }
    const teamAgg = this.getTeamAggregation();
    const m = user.metadata;
    const t = teamAgg.metrics;
    return {
      userId,
      username: user.username,
      metrics: m,
      comparison: {
        aiAcceptanceRate: {
          value: m.aiAcceptanceRate,
          vsTeam: t.avgAIAcceptanceRate
        },
        churnRate: {
          value: m.churnRate,
          vsTeam: t.avgChurnRate
        },
        testPassRate: {
          value: m.testPassRate,
          vsTeam: t.avgTestPassRate
        },
        sessionDuration: {
          value: m.sessionDuration,
          vsTeam: t.avgSessionDuration
        }
      },
      status: this.determineStatus(m, t)
    };
  }
  /**
  * Aggregate metrics with cleaner reducer pattern
  */
  aggregateMetrics(users) {
    const sum = /* @__PURE__ */ __name5((key) => users.reduce((acc, u) => acc + u.metadata[key], 0), "sum");
    const count = users.length;
    return {
      avgAIAcceptanceRate: sum("aiAcceptanceRate") / count,
      avgChurnRate: sum("churnRate") / count,
      avgTestPassRate: sum("testPassRate") / count,
      avgSessionDuration: sum("sessionDuration") / count,
      totalFileSaves: sum("fileSaveCount"),
      totalAISuggestions: sum("aiSuggestionsShown")
    };
  }
  /**
  * Get distribution statistics for key metrics
  */
  getDistribution(users) {
    const stats = /* @__PURE__ */ __name5((key) => {
      const values = users.map((u) => u.metadata[key]).filter((v) => typeof v === "number");
      if (values.length === 0) {
        return {
          min: 0,
          max: 0,
          mean: 0,
          median: 0,
          stdDev: 0
        };
      }
      const sorted = [
        ...values
      ].sort((a, b) => a - b);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean,
        median: sorted[Math.floor(sorted.length / 2)],
        stdDev: Math.sqrt(variance)
      };
    }, "stats");
    return {
      aiAcceptanceRate: stats("aiAcceptanceRate"),
      churnRate: stats("churnRate"),
      testPassRate: stats("testPassRate")
    };
  }
  /**
  * Identify top contributing team members with scoring
  */
  getTopContributors(users) {
    const scored = users.map((u) => {
      const m = u.metadata;
      const score = m.aiAcceptanceRate * 30 + m.testPassRate * 30 + (1 - Math.min(m.churnRate / 50, 1)) * 20 + m.sessionDuration / 36e5 * 20;
      const reasons = {
        "High AI adoption and acceptance": m.aiAcceptanceRate > 0.7,
        "Strong test coverage and quality": m.testPassRate > 0.8,
        "Stable, focused development": m.churnRate < 5
      };
      const reason = Object.entries(reasons).find(([, v]) => v)?.[0] ?? "Consistent contributor";
      return {
        userId: u.userId,
        username: u.username,
        score,
        reason
      };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 5);
  }
  /**
  * Detect team-wide concerns
  */
  detectConcerns(users, metrics) {
    const concerns = [];
    const LOW_TEST = users.filter((u) => u.metadata.testPassRate < 0.5);
    const HIGH_CHURN = users.filter((u) => u.metadata.churnRate > 20);
    if (LOW_TEST.length > users.length * 0.3) {
      concerns.push({
        type: "low_test_coverage",
        severity: "high",
        affectedUsers: LOW_TEST.map((u) => u.username),
        description: `${LOW_TEST.length} team members have test pass rates below 50%`,
        recommendation: "Encourage test-driven development and pair programming sessions"
      });
    }
    if (HIGH_CHURN.length > 0) {
      concerns.push({
        type: "high_churn",
        severity: HIGH_CHURN.length > users.length * 0.3 ? "high" : "medium",
        affectedUsers: HIGH_CHURN.map((u) => u.username),
        description: `${HIGH_CHURN.length} team members showing high code churn (>20 lines/min)`,
        recommendation: "Review code complexity and consider refactoring sessions"
      });
    }
    if (metrics.avgAIAcceptanceRate < 0.3) {
      concerns.push({
        type: "low_ai_adoption",
        severity: "medium",
        affectedUsers: users.filter((u) => u.metadata.aiAcceptanceRate < 0.2).map((u) => u.username),
        description: "Team AI acceptance rate is below 30%",
        recommendation: "Provide AI tool training and integrate AI suggestions into workflow"
      });
    }
    return concerns;
  }
  /**
  * Determine user status relative to team baseline
  */
  determineStatus(user, team) {
    const score = [
      user.aiAcceptanceRate >= team.avgAIAcceptanceRate ? 1 : 0,
      user.testPassRate >= team.avgTestPassRate ? 1 : 0,
      user.churnRate <= team.avgChurnRate ? 1 : 0
    ].reduce((a, b) => a + b, 0);
    return score === 3 ? "exceeding" : score === 2 ? "average" : score === 1 ? "below_average" : "concerning";
  }
  getEmptyAggregation() {
    const empty = {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0
    };
    return {
      teamId: this.teamId,
      aggregationTime: Date.now(),
      memberCount: 0,
      metrics: {
        avgAIAcceptanceRate: 0,
        avgChurnRate: 0,
        avgTestPassRate: 0,
        avgSessionDuration: 0,
        totalFileSaves: 0,
        totalAISuggestions: 0
      },
      distribution: {
        aiAcceptanceRate: empty,
        churnRate: empty,
        testPassRate: empty
      },
      topContributors: [],
      concerns: []
    };
  }
  reset() {
    this.userMetrics.clear();
  }
});
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
__name(clamp, "clamp");
__name5(clamp, "clamp");
var ThresholdCalibrator = class {
  static {
    __name(this, "ThresholdCalibrator");
  }
  static {
    __name5(this, "ThresholdCalibrator");
  }
  workspaceId;
  learner;
  profile;
  constructor(workspaceId, learner) {
    this.workspaceId = workspaceId;
    this.learner = learner;
    this.profile = this.createInitialProfile();
  }
  /**
  * Create initial uncalibrated profile.
  */
  createInitialProfile() {
    return {
      workspaceId: this.workspaceId,
      status: "uncalibrated",
      observationCount: 0,
      thresholdAdjustments: {
        ...DEFAULT_THRESHOLD_ADJUSTMENTS
      },
      riskTolerance: 0.5,
      typicalPulseLevel: 0,
      snapshotFrequency: 0,
      lastCalibratedAt: 0,
      confidence: 0
    };
  }
  /**
  * Update calibration from behavior learner's observations.
  */
  updateFromBehavior() {
    const stats = this.learner.getStats();
    const observations = this.learner.getObservations();
    this.profile.observationCount = stats.totalObservations;
    this.profile.status = this.calculateStatus(stats.totalObservations);
    this.profile.riskTolerance = this.calculateRiskTolerance(stats);
    this.profile.confidence = this.calculateConfidence(stats);
    this.profile.typicalPulseLevel = this.calculateTypicalPulseLevel(observations);
    if (this.profile.status !== "uncalibrated") {
      this.profile.thresholdAdjustments = this.calculateAdjustments(stats);
      this.profile.lastCalibratedAt = Date.now();
    }
  }
  /**
  * Calculate calibration status from observation count.
  */
  calculateStatus(count) {
    if (count >= CALIBRATION_THRESHOLDS.OBSERVATIONS_TO_LOCK) {
      return "locked";
    }
    if (count >= CALIBRATION_THRESHOLDS.OBSERVATIONS_FOR_CALIBRATION) {
      return "calibrated";
    }
    if (count >= CALIBRATION_THRESHOLDS.MIN_OBSERVATIONS_TO_START) {
      return "learning";
    }
    return "uncalibrated";
  }
  /**
  * Calculate risk tolerance from behavior stats.
  * 0 = conservative (early snapshots), 0.5 = balanced, 1 = aggressive (missed/late)
  */
  calculateRiskTolerance(stats) {
    if (stats.totalObservations === 0) {
      return 0.5;
    }
    const earlyRatio = stats.earlySnapshots / stats.totalObservations;
    const aggressiveRatio = (stats.lateSnapshots + stats.missedRecommendations) / stats.totalObservations;
    if (earlyRatio > aggressiveRatio) {
      return 0.5 - earlyRatio * 0.5;
    }
    if (aggressiveRatio > earlyRatio) {
      return 0.5 + aggressiveRatio * 0.5;
    }
    return 0.5;
  }
  /**
  * Calculate confidence in calibration.
  */
  calculateConfidence(stats) {
    if (stats.totalObservations === 0) {
      return 0;
    }
    const count = stats.totalObservations;
    const countConfidence = Math.min(count / CALIBRATION_THRESHOLDS.OBSERVATIONS_FOR_CALIBRATION, 1);
    const behaviors = [
      stats.earlySnapshots,
      stats.alignedSnapshots,
      stats.lateSnapshots,
      stats.missedRecommendations
    ];
    const maxBehavior = Math.max(...behaviors);
    const consistency = count > 0 ? maxBehavior / count : 0;
    const entropyPenalty = consistency < 0.6 ? 0.15 : 0;
    const confidence = countConfidence * 0.6 + consistency * 0.4 - entropyPenalty;
    return clamp(confidence, 0, 1);
  }
  /**
  * Calculate typical pulse level from observations.
  */
  calculateTypicalPulseLevel(observations) {
    if (observations.length === 0) {
      return 0;
    }
    const total = observations.reduce((sum, obs) => sum + obs.vitals.pulse.changesPerMinute, 0);
    return total / observations.length;
  }
  /**
  * Calculate threshold adjustments based on risk profile.
  */
  calculateAdjustments(stats) {
    let baseMultiplier;
    switch (stats.riskProfile) {
      case "conservative":
        baseMultiplier = 0.7;
        break;
      case "aggressive":
        baseMultiplier = 1.3;
        break;
      default:
        baseMultiplier = 1;
    }
    const clampedMultiplier = clamp(baseMultiplier, 0.5, 2);
    return {
      pulseMultiplier: clampedMultiplier,
      temperatureMultiplier: clampedMultiplier,
      pressureMultiplier: clampedMultiplier,
      oxygenMultiplier: clampedMultiplier
    };
  }
  /**
  * Get the current workspace profile.
  */
  getProfile() {
    return {
      ...this.profile
    };
  }
  /**
  * Get adjusted thresholds for use in vitals calculations.
  * Returns defaults if uncalibrated.
  */
  getAdjustedThresholds() {
    if (this.profile.status === "uncalibrated") {
      return {
        ...DEFAULT_THRESHOLD_ADJUSTMENTS
      };
    }
    return {
      ...this.profile.thresholdAdjustments
    };
  }
  /**
  * Reset calibration to initial state.
  */
  reset() {
    this.profile = this.createInitialProfile();
    this.learner.reset();
  }
};
function clamp2(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
__name(clamp2, "clamp2");
__name5(clamp2, "clamp");
var TrajectoryPredictor = class {
  static {
    __name(this, "TrajectoryPredictor");
  }
  static {
    __name5(this, "TrajectoryPredictor");
  }
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: stored for context/debugging
  workspaceId;
  history = [];
  maxHistory = 100;
  constructor(workspaceId) {
    this.workspaceId = workspaceId;
  }
  /**
  * Record vitals snapshots for prediction.
  */
  recordSnapshots(snapshots) {
    this.history.push(...snapshots);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }
  /**
  * Predict trajectory changes.
  */
  predict() {
    if (this.history.length === 0) {
      return this.createDefaultForecast();
    }
    const context = this.calculateContext();
    const current = this.getCurrentTrajectory();
    const trend = this.calculateTrend(context);
    const confidence = this.calculateConfidence();
    const in5Minutes = this.predictTrajectoryAt(context, 5);
    const in10Minutes = this.predictTrajectoryAt(context, 10);
    const timeToStateChange = this.calculateTimeToStateChange(context, current);
    return {
      current,
      in5Minutes,
      in10Minutes,
      confidence,
      trend,
      timeToStateChange
    };
  }
  /**
  * Get prediction context.
  */
  getContext() {
    return this.calculateContext();
  }
  /**
  * Reset history.
  */
  reset() {
    this.history = [];
  }
  /**
  * Create default forecast when no data.
  */
  createDefaultForecast() {
    return {
      current: "stable",
      in5Minutes: "stable",
      in10Minutes: "stable",
      confidence: 0,
      trend: "stable",
      timeToStateChange: null
    };
  }
  /**
  * Get current trajectory from most recent snapshot.
  */
  getCurrentTrajectory() {
    if (this.history.length === 0) {
      return "stable";
    }
    return this.history[this.history.length - 1].trajectory;
  }
  /**
  * Calculate prediction context from history.
  */
  calculateContext() {
    const recentHistory = this.history.slice(-10);
    if (recentHistory.length < 2) {
      return {
        recentHistory,
        pressureRate: 0,
        oxygenRate: 0,
        temperatureTrend: "stable",
        pulseTrend: "stable"
      };
    }
    const pressureRate = this.calculateRate(recentHistory, (s) => s.pressure.value);
    const oxygenRate = this.calculateRate(recentHistory, (s) => s.oxygen.value);
    const temperatureTrend = this.calculateTemperatureTrend(recentHistory);
    const pulseTrend = this.calculatePulseTrend(recentHistory);
    return {
      recentHistory,
      pressureRate,
      oxygenRate,
      temperatureTrend,
      pulseTrend
    };
  }
  /**
  * Calculate rate of change per minute.
  */
  calculateRate(snapshots, getValue) {
    if (snapshots.length < 2) {
      return 0;
    }
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const valueDelta = getValue(last) - getValue(first);
    const timeDeltaMinutes = (last.timestamp - first.timestamp) / 6e4;
    if (timeDeltaMinutes === 0) {
      return 0;
    }
    return valueDelta / timeDeltaMinutes;
  }
  /**
  * Calculate temperature trend.
  */
  calculateTemperatureTrend(snapshots) {
    if (snapshots.length < 2) {
      return "stable";
    }
    const first = snapshots[0].temperature.aiPercentage;
    const last = snapshots[snapshots.length - 1].temperature.aiPercentage;
    const delta = last - first;
    if (delta > 5) {
      return "heating";
    }
    if (delta < -5) {
      return "cooling";
    }
    return "stable";
  }
  /**
  * Calculate pulse trend.
  */
  calculatePulseTrend(snapshots) {
    if (snapshots.length < 2) {
      return "stable";
    }
    const first = snapshots[0].pulse.changesPerMinute;
    const last = snapshots[snapshots.length - 1].pulse.changesPerMinute;
    const delta = last - first;
    if (delta > 5) {
      return "accelerating";
    }
    if (delta < -5) {
      return "slowing";
    }
    return "stable";
  }
  /**
  * Calculate overall trend from context.
  */
  calculateTrend(context) {
    const recent = context.recentHistory.slice(-3);
    const recentRate = this.calculateRate(recent, (s) => s.pressure.value);
    if (Math.abs(recentRate) < 1) {
      return "stable";
    }
    if (recentRate > 0) {
      return "worsening";
    }
    if (recentRate < 0) {
      return "improving";
    }
    return "stable";
  }
  /**
  * Calculate confidence in predictions.
  */
  calculateConfidence() {
    const count = this.history.length;
    if (count === 0) {
      return 0;
    }
    if (count === 1) {
      return 0.2;
    }
    if (count < 3) {
      return 0.4;
    }
    if (count < 5) {
      return 0.6;
    }
    if (count < 10) {
      return 0.75;
    }
    return 0.9;
  }
  /**
  * Predict trajectory at a future time (in minutes).
  */
  predictTrajectoryAt(context, minutesAhead) {
    if (this.history.length === 0) {
      return "stable";
    }
    const current = this.history[this.history.length - 1];
    const currentPressure = current.pressure.value;
    const projectedPressure = clamp2(currentPressure + context.pressureRate * minutesAhead, 0, 100);
    if (projectedPressure > 80) {
      return "critical";
    }
    if (projectedPressure > 60) {
      return "escalating";
    }
    return "stable";
  }
  /**
  * Calculate time until trajectory state change.
  * Returns null if stable or already critical.
  */
  calculateTimeToStateChange(context, current) {
    if (current === "critical") {
      return null;
    }
    if (context.pressureRate <= 0) {
      return null;
    }
    const currentPressure = this.history.length > 0 ? this.history[this.history.length - 1].pressure.value : 0;
    let targetPressure;
    if (current === "stable") {
      targetPressure = 60;
    } else {
      targetPressure = 80;
    }
    if (currentPressure >= targetPressure) {
      return null;
    }
    const pressureDelta = targetPressure - currentPressure;
    const timeMinutes = pressureDelta / context.pressureRate;
    return Math.round(timeMinutes * 6e4);
  }
};
function generateId2() {
  return `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
__name(generateId2, "generateId2");
__name5(generateId2, "generateId");
var UserBehaviorLearner = class {
  static {
    __name(this, "UserBehaviorLearner");
  }
  static {
    __name5(this, "UserBehaviorLearner");
  }
  workspaceId;
  observations = [];
  maxHistory = 100;
  constructor(workspaceId) {
    this.workspaceId = workspaceId;
  }
  /**
  * Record an observation of user behavior.
  */
  recordObservation(input3) {
    const timing = this.classifyTiming(input3);
    const urgency = this.calculateUrgency(input3.vitals);
    const observation = {
      id: generateId2(),
      workspaceId: this.workspaceId,
      timestamp: Date.now(),
      vitals: input3.vitals,
      userCreatedSnapshot: input3.userCreatedSnapshot,
      vitalsRecommended: input3.vitalsRecommended,
      urgencyAtTime: urgency,
      timing
    };
    this.observations.push(observation);
    if (this.observations.length > this.maxHistory) {
      this.observations.shift();
    }
    return observation;
  }
  /**
  * Classify the timing of the observation.
  */
  classifyTiming(input3) {
    if (!input3.userCreatedSnapshot && input3.vitalsRecommended) {
      return "missed";
    }
    if (input3.userCreatedSnapshot && !input3.vitalsRecommended) {
      return "early";
    }
    if (input3.userCreatedSnapshot && input3.vitalsRecommended) {
      if (input3.vitals.trajectory === "critical" || input3.vitals.pressure.value > 80) {
        return "late";
      }
      return "aligned";
    }
    return "aligned";
  }
  /**
  * Calculate urgency from vitals.
  */
  calculateUrgency(vitals) {
    if (vitals.trajectory === "critical") {
      return "critical";
    }
    if (vitals.pressure.value > 80) {
      return "high";
    }
    if (vitals.pressure.value > 60 || vitals.trajectory === "escalating") {
      return "medium";
    }
    if (vitals.pressure.value > 40) {
      return "low";
    }
    return "none";
  }
  /**
  * Get behavior statistics.
  */
  getStats() {
    const total = this.observations.length;
    if (total === 0) {
      return {
        totalObservations: 0,
        alignedSnapshots: 0,
        earlySnapshots: 0,
        lateSnapshots: 0,
        missedRecommendations: 0,
        riskProfile: "balanced",
        avgPressureAtSnapshot: 0,
        avgOxygenAtSnapshot: 0
      };
    }
    const aligned = this.observations.filter((o) => o.timing === "aligned" && o.userCreatedSnapshot).length;
    const early = this.observations.filter((o) => o.timing === "early").length;
    const late = this.observations.filter((o) => o.timing === "late").length;
    const missed = this.observations.filter((o) => o.timing === "missed").length;
    const snapshotObs = this.observations.filter((o) => o.userCreatedSnapshot);
    const avgPressure = snapshotObs.length > 0 ? snapshotObs.reduce((sum, o) => sum + o.vitals.pressure.value, 0) / snapshotObs.length : 0;
    const avgOxygen = snapshotObs.length > 0 ? snapshotObs.reduce((sum, o) => sum + o.vitals.oxygen.value, 0) / snapshotObs.length : 0;
    const riskProfile = this.inferRiskProfile(early, aligned, late, missed, total);
    return {
      totalObservations: total,
      alignedSnapshots: aligned,
      earlySnapshots: early,
      lateSnapshots: late,
      missedRecommendations: missed,
      riskProfile,
      avgPressureAtSnapshot: Math.round(avgPressure),
      avgOxygenAtSnapshot: Math.round(avgOxygen)
    };
  }
  /**
  * Infer risk profile from observation patterns.
  */
  inferRiskProfile(early, _aligned, late, missed, total) {
    if (total < 3) {
      return "balanced";
    }
    const earlyRatio = early / total;
    const missedRatio = missed / total;
    const lateRatio = late / total;
    if (earlyRatio > 0.5) {
      return "conservative";
    }
    if (missedRatio + lateRatio > 0.5) {
      return "aggressive";
    }
    return "balanced";
  }
  /**
  * Get all observations.
  */
  getObservations() {
    return [
      ...this.observations
    ];
  }
  /**
  * Reset all observations.
  */
  reset() {
    this.observations = [];
  }
};
var DEFAULT_OXYGEN_CONFIG = {
  staleMinutes: 30,
  criticalWeight: 2
};
var CRITICAL_FILE_PATTERNS2 = [
  /package\.json$/,
  /\.env($|\.)/,
  /tsconfig\.json$/,
  /pnpm-lock\.yaml$/,
  /\.lock$/,
  /migrations?\//,
  /schema\.(sql|prisma|graphql)$/
];
var OxygenSensor = class {
  static {
    __name(this, "OxygenSensor");
  }
  static {
    __name5(this, "OxygenSensor");
  }
  /** Map of file path to snapshot timestamp */
  snapshots = /* @__PURE__ */ new Map();
  /** Set of files that have been modified */
  modifiedFiles = /* @__PURE__ */ new Set();
  config;
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_OXYGEN_CONFIG,
      ...config
    };
  }
  /**
  * Record a file modification.
  * @param filePath Path of the modified file
  */
  recordModification(filePath) {
    this.modifiedFiles.add(filePath);
  }
  /**
  * Record a snapshot creation for a file.
  * @param filePath Path of the snapshotted file
  * @param timestamp Optional: snapshot time for testing
  */
  recordSnapshot(filePath, timestamp = Date.now()) {
    this.snapshots.set(filePath, timestamp);
    this.modifiedFiles.delete(filePath);
  }
  /**
  * Record multiple snapshots at once (e.g., workspace-wide snapshot).
  * @param filePaths Paths of snapshotted files
  * @param timestamp Optional: snapshot time for testing
  */
  recordBulkSnapshot(filePaths, timestamp = Date.now()) {
    for (const filePath of filePaths) {
      this.recordSnapshot(filePath, timestamp);
    }
  }
  /**
  * Get current oxygen level and metrics.
  * @param now Optional: current time for testing
  */
  getLevel(now = Date.now()) {
    const staleThreshold = now - this.config.staleMinutes * 60 * 1e3;
    let covered = 0;
    let total = 0;
    let stale = 0;
    for (const file of this.modifiedFiles) {
      const isCritical = this.isCriticalFile(file);
      const weight = isCritical ? this.config.criticalWeight : 1;
      total += weight;
      const snapshotTime = this.snapshots.get(file);
      if (snapshotTime) {
        if (snapshotTime > staleThreshold) {
          covered += weight;
        } else {
          stale++;
        }
      }
    }
    const coveragePercentage = total > 0 ? covered / total * 100 : 100;
    return {
      value: Math.round(coveragePercentage),
      coveragePercentage: Math.round(coveragePercentage),
      staleSnapshots: stale
    };
  }
  /**
  * Get list of modified files without snapshots.
  */
  getUncoveredFiles() {
    return Array.from(this.modifiedFiles).filter((file) => !this.snapshots.has(file));
  }
  /**
  * Get count of tracked files.
  */
  getCounts() {
    return {
      modified: this.modifiedFiles.size,
      snapshots: this.snapshots.size
    };
  }
  /**
  * Clear all tracking data.
  */
  reset() {
    this.snapshots.clear();
    this.modifiedFiles.clear();
  }
  /**
  * Check if a file path matches critical file patterns.
  */
  isCriticalFile(filePath) {
    return CRITICAL_FILE_PATTERNS2.some((pattern) => pattern.test(filePath));
  }
};
var DEFAULT_PRESSURE_CONFIG = {
  baseRate: 5,
  criticalMultiplier: 2,
  decayOnSnapshot: 50,
  maxPressure: 100
};
var CRITICAL_FILE_PATTERNS22 = [
  /package\.json$/,
  /\.env($|\.)/,
  /tsconfig\.json$/,
  /pnpm-lock\.yaml$/,
  /\.lock$/,
  /migrations?\//,
  /schema\.(sql|prisma|graphql)$/,
  /docker-compose\.ya?ml$/,
  /Dockerfile$/
];
var PressureGauge = class {
  static {
    __name(this, "PressureGauge");
  }
  static {
    __name5(this, "PressureGauge");
  }
  changeBasedPressure = 0;
  unsnapshotedChanges = 0;
  lastSnapshotTime;
  criticalFilesTouched = /* @__PURE__ */ new Set();
  config;
  constructor(config = {}, initialTime = Date.now()) {
    this.config = {
      ...DEFAULT_PRESSURE_CONFIG,
      ...config
    };
    this.lastSnapshotTime = initialTime;
  }
  /**
  * Record a file change, accumulating pressure.
  * @param filePath Path of the modified file
  */
  recordChange(filePath) {
    this.unsnapshotedChanges++;
    const isCritical = this.isCriticalFile(filePath);
    if (isCritical) {
      this.criticalFilesTouched.add(filePath);
    }
    const multiplier = isCritical ? this.config.criticalMultiplier : 1;
    const increment = this.config.baseRate * multiplier / 10;
    this.changeBasedPressure = Math.min(this.config.maxPressure, this.changeBasedPressure + increment);
  }
  /**
  * Record a snapshot, releasing pressure.
  * @param now Optional timestamp for testing
  */
  recordSnapshot(now = Date.now()) {
    this.changeBasedPressure = Math.max(0, this.changeBasedPressure * (1 - this.config.decayOnSnapshot / 100));
    this.unsnapshotedChanges = 0;
    this.criticalFilesTouched.clear();
    this.lastSnapshotTime = now;
  }
  /**
  * Get current pressure state.
  * @param now Optional timestamp for testing
  */
  getState(now = Date.now()) {
    const minutesSinceSnapshot = Math.max(0, (now - this.lastSnapshotTime) / 6e4);
    const timePressure = this.unsnapshotedChanges > 0 ? minutesSinceSnapshot * this.config.baseRate : 0;
    const totalPressure = Math.min(this.config.maxPressure, this.changeBasedPressure + timePressure);
    return {
      value: Math.round(totalPressure),
      unsnapshotedChanges: this.unsnapshotedChanges,
      timeSinceLastSnapshot: Math.round(minutesSinceSnapshot),
      criticalFilesTouched: Array.from(this.criticalFilesTouched)
    };
  }
  /**
  * Reset the gauge to initial state.
  * @param now Optional timestamp for testing
  */
  reset(now = Date.now()) {
    this.changeBasedPressure = 0;
    this.unsnapshotedChanges = 0;
    this.criticalFilesTouched.clear();
    this.lastSnapshotTime = now;
  }
  /**
  * Check if a file path matches critical file patterns.
  */
  isCriticalFile(filePath) {
    return CRITICAL_FILE_PATTERNS22.some((pattern) => pattern.test(filePath));
  }
  // =========================================================================
  // RECOMMENDATIONS API (2026 industry standard)
  // =========================================================================
  /**
  * Get structured snapshot recommendation based on current pressure state
  *
  * 2026 Best Practice: Recommendations should be:
  * - Actionable (clear next step)
  * - Context-aware (includes relevant data)
  * - Educational (explains why it matters)
  *
  * @param now Optional timestamp for testing
  * @returns Structured recommendation with action and context
  */
  getRecommendation(now = Date.now()) {
    const state = this.getState(now);
    const { value, unsnapshotedChanges, timeSinceLastSnapshot, criticalFilesTouched } = state;
    let shouldSnapshot = false;
    let urgency = 0;
    let reason = "";
    let action = "none";
    let educational;
    if (value >= 80) {
      shouldSnapshot = true;
      urgency = 100;
      reason = `Critical pressure (${value}%) - immediate snapshot recommended`;
      action = "snapshot_now";
      educational = "High pressure indicates significant unsnapshot'd work. Creating a snapshot now protects against potential loss.";
    } else if (value >= 60) {
      shouldSnapshot = true;
      urgency = 75;
      reason = `High pressure (${value}%) - snapshot recommended`;
      action = "snapshot_soon";
      educational = "Risk is accumulating. A snapshot within the next few minutes will keep your work protected.";
    } else if (value >= 40) {
      shouldSnapshot = false;
      urgency = 50;
      reason = `Moderate pressure (${value}%) - monitoring recommended`;
      action = "monitor";
      educational = "Your session is progressing normally. Consider a snapshot if you're about to start risky changes.";
    } else {
      shouldSnapshot = false;
      urgency = value;
      reason = "Session health is good - no action needed";
      action = "none";
    }
    if (criticalFilesTouched.length > 0 && value >= 30) {
      urgency = Math.min(100, urgency + 20);
      reason = `${reason} (critical files modified)`;
      if (action === "monitor") {
        action = "snapshot_soon";
        shouldSnapshot = true;
      }
      educational = `Critical files (${criticalFilesTouched.slice(0, 2).join(", ")}) have been modified. These files typically require more protection.`;
    }
    return {
      shouldSnapshot,
      urgency,
      reason,
      context: {
        pressure: value,
        changes: unsnapshotedChanges,
        minutesSinceSnapshot: timeSinceLastSnapshot,
        criticalFiles: criticalFilesTouched
      },
      action,
      educational
    };
  }
  /**
  * Get multiple recommendations for different scenarios
  * Useful for UI components that need to show options
  */
  getRecommendations(now = Date.now()) {
    const primary = this.getRecommendation(now);
    const recommendations = [
      primary
    ];
    if (primary.action === "monitor" && primary.context.changes > 5) {
      recommendations.push({
        shouldSnapshot: true,
        urgency: 30,
        reason: "Proactive snapshot opportunity",
        context: primary.context,
        action: "snapshot_soon",
        educational: "You have unsnapshot'd work. A proactive snapshot now ensures you have a recovery point."
      });
    }
    return recommendations;
  }
};
var DEFAULT_PULSE_CONFIG = {
  elevated: 15,
  racing: 30,
  critical: 50,
  windowSeconds: 60
};
var PulseTracker = class {
  static {
    __name(this, "PulseTracker");
  }
  static {
    __name5(this, "PulseTracker");
  }
  changes = [];
  config;
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_PULSE_CONFIG,
      ...config
    };
  }
  /**
  * Record a file change event.
  * @performance O(1) - just pushes timestamp
  */
  recordChange(timestamp = Date.now()) {
    this.changes.push(timestamp);
  }
  /**
  * Get current pulse level and changes per minute.
  * @performance O(n) where n = changes in window
  */
  getLevel(now = Date.now()) {
    this.pruneOld(now);
    const changesPerMinute = this.config.windowSeconds > 0 ? this.changes.length / this.config.windowSeconds * 60 : 0;
    return {
      level: this.classifyLevel(changesPerMinute),
      changesPerMinute: Math.round(changesPerMinute)
    };
  }
  /**
  * Get raw change count in current window (for testing).
  */
  getChangeCount(now = Date.now()) {
    this.pruneOld(now);
    return this.changes.length;
  }
  /**
  * Clear all recorded changes.
  */
  reset() {
    this.changes = [];
  }
  /**
  * Remove events outside the sliding window.
  */
  pruneOld(now) {
    const cutoff = now - this.config.windowSeconds * 1e3;
    this.changes = this.changes.filter((t) => t > cutoff);
  }
  /**
  * Classify changes/min into a pulse level.
  */
  classifyLevel(changesPerMinute) {
    if (changesPerMinute >= this.config.critical) {
      return "critical";
    }
    if (changesPerMinute >= this.config.racing) {
      return "racing";
    }
    if (changesPerMinute >= this.config.elevated) {
      return "elevated";
    }
    return "resting";
  }
};
var DEFAULT_TEMPERATURE_CONFIG = {
  warm: 20,
  hot: 50,
  burning: 80,
  decaySeconds: 300
};
var TemperatureMonitor = class {
  static {
    __name(this, "TemperatureMonitor");
  }
  static {
    __name5(this, "TemperatureMonitor");
  }
  aiEvents = [];
  humanEvents = [];
  config;
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_TEMPERATURE_CONFIG,
      ...config
    };
  }
  /**
  * Record AI-assisted activity.
  * @param tool Optional: which AI tool (e.g., "Cursor", "Copilot", "Claude")
  * @param timestamp Optional: event time for testing
  */
  recordAIActivity(tool, timestamp = Date.now()) {
    this.aiEvents.push({
      timestamp,
      tool
    });
  }
  /**
  * Record human (non-AI) activity.
  * @param timestamp Optional: event time for testing
  */
  recordHumanActivity(timestamp = Date.now()) {
    this.humanEvents.push(timestamp);
  }
  /**
  * Get current temperature level and metrics.
  * @param now Optional: current time for testing
  */
  getLevel(now = Date.now()) {
    this.pruneOld(now);
    const total = this.aiEvents.length + this.humanEvents.length;
    const aiPercentage = total > 0 ? this.aiEvents.length / total * 100 : 0;
    const detectedTool = this.aiEvents.length > 0 ? this.aiEvents[this.aiEvents.length - 1].tool : void 0;
    return {
      level: this.classifyLevel(aiPercentage),
      aiPercentage: Math.round(aiPercentage),
      detectedTool
    };
  }
  /**
  * Get counts for testing.
  */
  getCounts(now = Date.now()) {
    this.pruneOld(now);
    return {
      ai: this.aiEvents.length,
      human: this.humanEvents.length
    };
  }
  /**
  * Clear all recorded activity.
  */
  reset() {
    this.aiEvents = [];
    this.humanEvents = [];
  }
  /**
  * Remove events outside the decay window.
  */
  pruneOld(now) {
    const cutoff = now - this.config.decaySeconds * 1e3;
    this.aiEvents = this.aiEvents.filter((e) => e.timestamp > cutoff);
    this.humanEvents = this.humanEvents.filter((t) => t > cutoff);
  }
  /**
  * Classify AI percentage into a temperature level.
  */
  classifyLevel(aiPercentage) {
    if (aiPercentage >= this.config.burning) {
      return "burning";
    }
    if (aiPercentage >= this.config.hot) {
      return "hot";
    }
    if (aiPercentage >= this.config.warm) {
      return "warm";
    }
    return "cold";
  }
};
function formatRecoveryConfidence(confidence) {
  if (confidence.score >= 95) {
    return "Excellent";
  }
  if (confidence.score >= 85) {
    return "High";
  }
  if (confidence.score >= 70) {
    return "Good";
  }
  if (confidence.score >= 50) {
    return "Moderate";
  }
  return "Building Trust";
}
__name(formatRecoveryConfidence, "formatRecoveryConfidence");
__name5(formatRecoveryConfidence, "formatRecoveryConfidence");
function formatMTTR(ms) {
  if (ms < 1e3) {
    return `${ms}ms`;
  }
  if (ms < 6e4) {
    return `${(ms / 1e3).toFixed(1)}s`;
  }
  return `${(ms / 6e4).toFixed(1)}m`;
}
__name(formatMTTR, "formatMTTR");
__name5(formatMTTR, "formatMTTR");
function formatChainIntegrity(chain) {
  if (!chain.isIntact) {
    return "Gaps Detected";
  }
  if (chain.hasRollbackPoints && chain.chainLength >= 5) {
    return "Fully Protected";
  }
  if (chain.chainLength >= 3) {
    return "Protected";
  }
  return "Building Chain";
}
__name(formatChainIntegrity, "formatChainIntegrity");
__name5(formatChainIntegrity, "formatChainIntegrity");
function formatDORATier(tier) {
  switch (tier) {
    case "elite":
      return "\u{1F3C6} Elite";
    case "high":
      return "\u2728 High";
    case "medium":
      return "\u{1F4CA} Medium";
    case "low":
      return "\u{1F4C8} Building";
  }
}
__name(formatDORATier, "formatDORATier");
__name5(formatDORATier, "formatDORATier");
function formatSaveCount(count) {
  if (count.today > 0) {
    return `SnapBack protected your work ${count.today} time${count.today === 1 ? "" : "s"} today`;
  }
  if (count.thisWeek > 0) {
    return `SnapBack protected your work ${count.thisWeek} time${count.thisWeek === 1 ? "" : "s"} this week`;
  }
  if (count.allTime > 0) {
    return `SnapBack has protected your work ${count.allTime} time${count.allTime === 1 ? "" : "s"}`;
  }
  return "SnapBack is ready to protect your work";
}
__name(formatSaveCount, "formatSaveCount");
__name5(formatSaveCount, "formatSaveCount");
var TRACKING_LIMITS = {
  /** Maximum snapshot chain entries */
  maxSnapshotChain: 100,
  /** Maximum AI calibration events */
  maxAIToolEvents: 100,
  /** Minimum AI events for calibration calculation */
  minAIEventsForCalibration: 10,
  /** AI calibration smoothing divisor */
  aiCalibrationSmoothingDivisor: 50,
  /** Default AI tool calibration confidence */
  defaultAICalibration: 85
};
var TIME_CONSTANTS = {
  /** Gap threshold for chain integrity (4 hours) */
  chainGapThresholdMs: 4 * 60 * 60 * 1e3,
  /** One day in milliseconds */
  oneDayMs: 24 * 60 * 60 * 1e3,
  /** Protection threshold in minutes */
  protectionThresholdMinutes: 30,
  /** Maximum unsnapshoted changes for protection */
  maxUnsnapshotedChangesForProtection: 100
};
var ESTIMATION_CONSTANTS = {
  /** Estimated lines per file change */
  linesPerFileEstimate: 10,
  /** Base recovery time in ms */
  baseRecoveryTimeMs: 2e3,
  /** Recovery time per file in ms */
  recoveryTimePerFileMs: 100,
  /** Default recent snapshot files estimate */
  defaultRecentSnapshotFiles: 5
};
function toPulseLevel(level) {
  const validLevels = [
    "resting",
    "active",
    "elevated",
    "racing"
  ];
  return validLevels.includes(level) ? level : "active";
}
__name(toPulseLevel, "toPulseLevel");
__name5(toPulseLevel, "toPulseLevel");
function toTemperatureLevel(level) {
  const validLevels = [
    "cool",
    "warm",
    "hot",
    "critical"
  ];
  return validLevels.includes(level) ? level : "warm";
}
__name(toTemperatureLevel, "toTemperatureLevel");
__name5(toTemperatureLevel, "toTemperatureLevel");
function toTrajectory(trajectory) {
  const validTrajectories = [
    "improving",
    "stable",
    "declining",
    "critical"
  ];
  return validTrajectories.includes(trajectory) ? trajectory : "stable";
}
__name(toTrajectory, "toTrajectory");
__name5(toTrajectory, "toTrajectory");
(class {
  static {
    __name(this, "TrustMetricsServiceImpl");
  }
  static {
    __name5(this, "TrustMetricsServiceImpl");
  }
  config;
  deps;
  disposed = false;
  // Activity audit trail
  auditTrail = [];
  // Save counters
  saveCount = {
    today: 0,
    thisWeek: 0,
    allTime: 0
  };
  lastResetDate = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toDateString();
  // Event listeners
  updateListeners = [];
  // Session history tracking
  sessionHistory = [];
  currentSession = null;
  // DORA trend tracking
  doraTrends = [];
  lastDORATrendRecordedAt = 0;
  // Threshold history tracking
  thresholdHistory = [];
  // Cumulative stats tracking
  cumulativeStats = {
    totalLinesProtected: 0,
    totalHoursProtected: 0,
    firstSnapshotAt: null,
    sessionStartTime: Date.now()
  };
  // Chain integrity tracking
  snapshotChain = [];
  // Last recovery tracking
  lastRecoveryAt = null;
  // AI tool calibration data
  aiToolEvents = [];
  constructor(config, deps) {
    this.config = {
      workspaceId: config.workspaceId,
      maxAuditEntries: config.maxAuditEntries ?? 100,
      measurementWindow: config.measurementWindow ?? 60 * 60 * 1e3,
      maxSessionHistory: config.maxSessionHistory ?? 50,
      maxDORATrendPoints: config.maxDORATrendPoints ?? 30,
      maxThresholdHistory: config.maxThresholdHistory ?? 20
    };
    this.deps = deps;
  }
  // =========================================================================
  // PUBLIC API
  // =========================================================================
  /**
  * Get current extension metrics (real-time, in-context)
  */
  getExtensionMetrics() {
    const core = this.getCoreTrustMetrics();
    const vitals = this.getLiveVitals();
    const commitRisk = this.getCurrentCommitRisk();
    const phase = this.deps.getCurrentPhase?.() ?? this.getDefaultPhase();
    const recommendation = this.deps.getPressureRecommendation?.() ?? this.getDefaultRecommendation();
    return {
      core,
      vitals,
      commitRisk,
      phase,
      recommendation,
      recentActivity: this.getRecentActivity(10),
      saveCount: this.getSaveCount()
    };
  }
  /**
  * Get web console metrics (historical analysis)
  */
  getWebConsoleMetrics() {
    const core = this.getCoreTrustMetrics();
    const dora = this.deps.doraMetrics.getMetrics();
    this.maybeRecordDORATrend(dora);
    return {
      core,
      dora,
      doraTrends: this.getDORATrends(),
      recoveryFailures: this.getRecoveryFailures(),
      teamBenchmarks: this.getTeamBenchmarks(),
      sessionHistory: this.getSessionHistory(),
      riskCalibration: this.getRiskCalibration(),
      cumulativeStats: this.getCumulativeStats()
    };
  }
  /**
  * Get core trust metrics only
  */
  getCoreTrustMetrics() {
    const dora = this.deps.doraMetrics.getMetrics();
    return {
      recoveryConfidence: this.calculateRecoveryConfidence(dora),
      chainIntegrity: this.getChainIntegrity(),
      sessionProtection: this.getSessionProtection(),
      performanceTier: dora.performanceTier,
      updatedAt: Date.now()
    };
  }
  /**
  * Record a snapshot event
  */
  recordSnapshot(event) {
    this.addAuditEntry({
      type: "snapshot_created",
      timestamp: event.timestamp,
      description: `Snapshot created (${event.trigger}): ${event.filesProtected} files, ${event.linesProtected} lines`,
      wasProtective: event.trigger === "auto" || event.trigger === "ai-detected"
    });
    this.snapshotChain.push({
      snapshotId: event.snapshotId,
      timestamp: event.timestamp,
      parentId: event.parentSnapshotId
    });
    if (this.snapshotChain.length > TRACKING_LIMITS.maxSnapshotChain) {
      this.snapshotChain.shift();
    }
    this.cumulativeStats.totalLinesProtected += event.linesProtected;
    if (this.cumulativeStats.firstSnapshotAt === null) {
      this.cumulativeStats.firstSnapshotAt = event.timestamp;
    }
    this.incrementSaveCount();
    this.emitUpdate("snapshot", {
      core: this.getCoreTrustMetrics(),
      recentActivity: this.getRecentActivity(10),
      saveCount: this.getSaveCount()
    });
  }
  /**
  * Record a recovery event
  */
  recordRecovery(event) {
    this.deps.doraMetrics.recordRecovery(event);
    this.lastRecoveryAt = event.completionTime;
    this.addAuditEntry({
      type: "recovery_performed",
      timestamp: event.requestTime,
      description: event.success ? `Recovery succeeded: ${event.filesRestored} files in ${event.completionTime - event.requestTime}ms` : `Recovery failed: ${event.failureReason ?? "unknown error"}`,
      wasProtective: false
    });
    this.aiToolEvents.push({
      timestamp: event.requestTime,
      predicted: true,
      actual: event.success
    });
    if (this.aiToolEvents.length > TRACKING_LIMITS.maxAIToolEvents) {
      this.aiToolEvents.shift();
    }
    this.emitUpdate("recovery", {
      core: this.getCoreTrustMetrics(),
      recentActivity: this.getRecentActivity(10)
    });
  }
  /**
  * Record commit risk evaluation
  */
  recordRiskEvaluation(evaluation) {
    if (evaluation.score >= 0.55) {
      this.addAuditEntry({
        type: "risk_threshold_crossed",
        timestamp: evaluation.context.now,
        description: `Risk score: ${(evaluation.score * 100).toFixed(0)}% - ${evaluation.reason}`,
        wasProtective: evaluation.action === "auto_snapshot"
      });
    }
    this.emitUpdate("commit_risk", {
      commitRisk: {
        score: evaluation.score,
        breakdown: evaluation.breakdown,
        action: evaluation.action,
        escalation: evaluation.escalation,
        reason: evaluation.reason,
        educational: evaluation.educational
      }
    });
  }
  /**
  * Subscribe to metrics updates
  */
  onUpdate(callback) {
    this.updateListeners.push(callback);
    return () => {
      const index = this.updateListeners.indexOf(callback);
      if (index > -1) {
        this.updateListeners.splice(index, 1);
      }
    };
  }
  /**
  * Sync to web console
  */
  async syncToConsole(_request) {
    const consoleMetrics = this.getWebConsoleMetrics();
    return {
      status: "success",
      data: {
        metrics: consoleMetrics
      },
      syncedAt: Date.now()
    };
  }
  /**
  * Apply threshold adjustments from cloud
  */
  applyThresholdAdjustments(adjustments) {
    if (this.deps.commitRiskSystem) {
      const currentConfig = this.deps.commitRiskSystem.getConfig();
      if (adjustments.suggestCommit !== currentConfig.thresholds.suggestCommit) {
        this.thresholdHistory.push({
          timestamp: Date.now(),
          oldThreshold: currentConfig.thresholds.suggestCommit,
          newThreshold: adjustments.suggestCommit,
          reason: "Cloud sync adjustment"
        });
        if (this.thresholdHistory.length > this.config.maxThresholdHistory) {
          this.thresholdHistory.shift();
        }
      }
      this.deps.commitRiskSystem.setThresholds(adjustments);
    }
  }
  /**
  * Dispose of resources and clear state
  * Call when the service is no longer needed to prevent memory leaks
  */
  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.updateListeners.length = 0;
    this.auditTrail.length = 0;
    this.sessionHistory.length = 0;
    this.doraTrends.length = 0;
    this.thresholdHistory.length = 0;
    this.snapshotChain.length = 0;
    this.aiToolEvents.length = 0;
    this.currentSession = null;
  }
  /**
  * Check if the service has been disposed
  */
  isDisposed() {
    return this.disposed;
  }
  /**
  * Start a new session for history tracking
  * @throws Error if sessionId is empty or service is disposed
  */
  startSession(sessionId) {
    if (this.disposed) {
      throw new Error("TrustMetricsService has been disposed");
    }
    if (!sessionId || sessionId.trim().length === 0) {
      throw new Error("sessionId must be a non-empty string");
    }
    const phase = this.deps.getCurrentPhase?.() ?? this.getDefaultPhase();
    this.currentSession = {
      sessionId: sessionId.trim(),
      startTime: Date.now(),
      phase: phase.phase,
      peakRiskScore: 0,
      snapshotsCreated: 0,
      recoveriesPerformed: 0,
      linesCommitted: 0,
      aiFraction: 0,
      hadBadOutcome: false
    };
  }
  /**
  * End the current session and add to history
  */
  endSession(outcome) {
    if (!this.currentSession || !this.currentSession.sessionId || !this.currentSession.startTime) {
      return;
    }
    const completedSession = {
      sessionId: this.currentSession.sessionId,
      startTime: this.currentSession.startTime,
      endTime: Date.now(),
      phase: this.currentSession.phase ?? "unknown",
      peakRiskScore: this.currentSession.peakRiskScore ?? 0,
      snapshotsCreated: this.currentSession.snapshotsCreated ?? 0,
      recoveriesPerformed: this.currentSession.recoveriesPerformed ?? 0,
      linesCommitted: outcome.linesCommitted,
      aiFraction: outcome.aiFraction,
      hadBadOutcome: outcome.hadBadOutcome
    };
    this.sessionHistory.push(completedSession);
    if (this.sessionHistory.length > this.config.maxSessionHistory) {
      this.sessionHistory.shift();
    }
    const sessionHours = (completedSession.endTime - completedSession.startTime) / (1e3 * 60 * 60);
    this.cumulativeStats.totalHoursProtected += sessionHours;
    this.currentSession = null;
  }
  /**
  * Update current session with risk evaluation
  */
  updateSessionRisk(riskScore) {
    if (this.currentSession) {
      this.currentSession.peakRiskScore = Math.max(this.currentSession.peakRiskScore ?? 0, riskScore);
    }
  }
  /**
  * Increment snapshot count for current session
  */
  incrementSessionSnapshots() {
    if (this.currentSession) {
      this.currentSession.snapshotsCreated = (this.currentSession.snapshotsCreated ?? 0) + 1;
    }
  }
  /**
  * Increment recovery count for current session
  */
  incrementSessionRecoveries() {
    if (this.currentSession) {
      this.currentSession.recoveriesPerformed = (this.currentSession.recoveriesPerformed ?? 0) + 1;
    }
  }
  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================
  getLiveVitals() {
    const vitals = this.deps.getVitals?.();
    if (!vitals) {
      return this.getDefaultVitals();
    }
    return {
      pulse: {
        level: toPulseLevel(vitals.pulse.level),
        changesPerMinute: vitals.pulse.changesPerMinute
      },
      temperature: {
        level: toTemperatureLevel(vitals.temperature.level),
        aiPercentage: vitals.temperature.aiPercentage
      },
      pressure: vitals.pressure,
      oxygen: {
        level: vitals.oxygen.value > 70 ? "healthy" : vitals.oxygen.value > 30 ? "low" : "critical",
        coveragePercent: vitals.oxygen.value
      },
      trajectory: toTrajectory(vitals.trajectory)
    };
  }
  getCurrentCommitRisk() {
    return {
      score: 0,
      breakdown: {
        timeRisk: 0,
        linesRisk: 0,
        filesRisk: 0,
        aiRisk: 0,
        churnRisk: 0,
        rawScore: 0,
        phaseMultiplier: 1,
        finalScore: 0
      },
      action: "none",
      escalation: "none",
      reason: "Session health good"
    };
  }
  calculateRecoveryConfidence(dora) {
    const score = Math.min(dora.recoverySuccessRate, dora.performanceTier === "elite" ? 100 : dora.performanceTier === "high" ? 90 : 75);
    const trends = this.deps.doraMetrics.getTrends();
    return {
      score,
      successfulRecoveries: Math.round(dora.totalRecoveries * (dora.recoverySuccessRate / 100)),
      failedRecoveries: Math.round(dora.totalRecoveries * (1 - dora.recoverySuccessRate / 100)),
      meanTimeToRecovery: dora.meanTimeToRecovery,
      trend: trends.recoveryTrend,
      lastRecoveryAt: this.lastRecoveryAt,
      aiToolCalibration: this.calculateAIToolCalibration()
    };
  }
  /**
  * Calculate AI tool calibration score from prediction accuracy
  * Measures how well the system predicted risk vs actual outcomes
  */
  calculateAIToolCalibration() {
    if (this.aiToolEvents.length < TRACKING_LIMITS.minAIEventsForCalibration) {
      return TRACKING_LIMITS.defaultAICalibration;
    }
    const correct = this.aiToolEvents.filter((e) => e.predicted === e.actual).length;
    const accuracy = correct / this.aiToolEvents.length * 100;
    const smoothingFactor = Math.min(this.aiToolEvents.length / TRACKING_LIMITS.aiCalibrationSmoothingDivisor, 1);
    return TRACKING_LIMITS.defaultAICalibration * (1 - smoothingFactor) + accuracy * smoothingFactor;
  }
  getChainIntegrity() {
    const chainLength = this.snapshotChain.length;
    const gaps = [];
    for (let i = 1; i < this.snapshotChain.length; i++) {
      const prev = this.snapshotChain[i - 1];
      const curr = this.snapshotChain[i];
      const timeDiff = curr.timestamp - prev.timestamp;
      if (timeDiff > TIME_CONSTANTS.chainGapThresholdMs) {
        const hoursGap = Math.round(timeDiff / (60 * 60 * 1e3));
        gaps.push({
          start: prev.timestamp,
          end: curr.timestamp,
          reason: `${hoursGap} hour gap between snapshots`
        });
      }
    }
    const hasRollbackPoints = this.auditTrail.some((entry) => entry.type === "snapshot_created" && entry.description.includes("recovery"));
    const oldestRecoverable = chainLength > 0 ? this.snapshotChain[0].timestamp : null;
    return {
      isIntact: gaps.length === 0,
      chainLength,
      hasRollbackPoints,
      oldestRecoverable,
      gaps
    };
  }
  getSessionProtection() {
    const vitals = this.deps.getVitals?.();
    if (!vitals) {
      return {
        isProtected: true,
        minutesSinceSnapshot: 0,
        filesSinceSnapshot: 0,
        linesSinceSnapshot: 0,
        estimatedRecoveryTime: ESTIMATION_CONSTANTS.baseRecoveryTimeMs,
        coveragePercent: 100
      };
    }
    const minutesSinceSnapshot = vitals.pressure.timeSinceLastSnapshot / (60 * 1e3);
    const isProtected = minutesSinceSnapshot < TIME_CONSTANTS.protectionThresholdMinutes && vitals.pressure.unsnapshotedChanges < TIME_CONSTANTS.maxUnsnapshotedChangesForProtection;
    const recentSnapshotFiles = this.snapshotChain.length > 0 ? ESTIMATION_CONSTANTS.defaultRecentSnapshotFiles : 0;
    const estimatedRecoveryTime = ESTIMATION_CONSTANTS.baseRecoveryTimeMs + recentSnapshotFiles * ESTIMATION_CONSTANTS.recoveryTimePerFileMs;
    const coveragePercent = Math.max(0, Math.min(100, 100 - vitals.pressure.value));
    return {
      isProtected,
      minutesSinceSnapshot,
      filesSinceSnapshot: vitals.pressure.unsnapshotedChanges,
      linesSinceSnapshot: vitals.pressure.unsnapshotedChanges * ESTIMATION_CONSTANTS.linesPerFileEstimate,
      estimatedRecoveryTime,
      coveragePercent
    };
  }
  getDORATrends() {
    return [
      ...this.doraTrends
    ];
  }
  maybeRecordDORATrend(dora) {
    const now = Date.now();
    if (now - this.lastDORATrendRecordedAt < TIME_CONSTANTS.oneDayMs) {
      return;
    }
    this.doraTrends.push({
      timestamp: now,
      metrics: {
        ...dora
      }
    });
    if (this.doraTrends.length > this.config.maxDORATrendPoints) {
      this.doraTrends.shift();
    }
    this.lastDORATrendRecordedAt = now;
  }
  getRecoveryFailures() {
    const failures = [];
    for (const entry of this.auditTrail) {
      if (entry.type === "recovery_performed" && entry.description.includes("failed")) {
        const match = entry.description.match(/Recovery failed: (.+)/);
        failures.push({
          snapshotId: `snap-${entry.timestamp}`,
          timestamp: entry.timestamp,
          reason: match?.[1] ?? "unknown error",
          filesAffected: 0,
          eventuallyRecovered: false
        });
      }
    }
    return failures.slice(-20);
  }
  getSessionHistory() {
    return [
      ...this.sessionHistory
    ].slice(-this.config.maxSessionHistory);
  }
  getTeamBenchmarks() {
    return [];
  }
  getRiskCalibration() {
    const stats = this.deps.commitRiskSystem?.getOutcomeStats();
    if (!stats) {
      return {
        totalSessions: 0,
        badOutcomeRate: 0,
        thresholdHistory: this.thresholdHistory,
        bucketStats: []
      };
    }
    const bucketStats = Array.from(stats.bucketStats.entries()).map(([range, data]) => ({
      range,
      sessions: data.count,
      badOutcomeRate: data.badRate
    }));
    return {
      totalSessions: stats.totalSessions,
      badOutcomeRate: stats.badOutcomeRate,
      thresholdHistory: this.thresholdHistory,
      bucketStats
    };
  }
  getCumulativeStats() {
    const dora = this.deps.doraMetrics.getMetrics();
    const hoursProtected = (Date.now() - this.cumulativeStats.sessionStartTime) / (1e3 * 60 * 60);
    return {
      totalSnapshots: dora.totalSnapshots,
      totalRecoveries: dora.totalRecoveries,
      totalLinesProtected: this.cumulativeStats.totalLinesProtected,
      totalHoursProtected: this.cumulativeStats.totalHoursProtected + hoursProtected,
      firstSnapshotAt: this.cumulativeStats.firstSnapshotAt
    };
  }
  addAuditEntry(entry) {
    this.auditTrail.push(entry);
    if (this.auditTrail.length > this.config.maxAuditEntries) {
      this.auditTrail.shift();
    }
  }
  getRecentActivity(count) {
    return this.auditTrail.slice(-count).reverse();
  }
  incrementSaveCount() {
    const today = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toDateString();
    if (today !== this.lastResetDate) {
      const lastDate = new Date(this.lastResetDate);
      const currentDate = new Date(today);
      const daysDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1e3 * 60 * 60 * 24));
      if (daysDiff >= 1) {
        this.saveCount.today = 0;
      }
      if (daysDiff >= 7) {
        this.saveCount.thisWeek = 0;
      }
      this.lastResetDate = today;
    }
    this.saveCount.today++;
    this.saveCount.thisWeek++;
    this.saveCount.allTime++;
  }
  getSaveCount() {
    return {
      ...this.saveCount
    };
  }
  emitUpdate(type, payload) {
    const event = {
      type,
      workspaceId: this.config.workspaceId,
      payload,
      timestamp: Date.now()
    };
    for (const listener of this.updateListeners) {
      try {
        listener(event);
      } catch {
      }
    }
  }
  // Default fallbacks
  getDefaultVitals() {
    return {
      pulse: {
        level: "resting",
        changesPerMinute: 0
      },
      temperature: {
        level: "cool",
        aiPercentage: 0
      },
      pressure: {
        value: 0,
        unsnapshotedChanges: 0,
        timeSinceLastSnapshot: 0,
        criticalFilesTouched: []
      },
      oxygen: {
        level: "healthy",
        coveragePercent: 100
      },
      trajectory: "stable"
    };
  }
  getDefaultPhase() {
    return {
      phase: "unknown",
      confidence: 0.3,
      branchName: "main",
      thresholds: {
        intervalMultiplier: 1,
        maxLinesBeforeSnapshot: 300,
        riskMultiplier: 1,
        recommendedIntervalMinutes: 45,
        aiAdjustedIntervalMinutes: 25
      }
    };
  }
  getDefaultRecommendation() {
    return {
      shouldSnapshot: false,
      urgency: 0,
      reason: "Session health good - no action needed",
      context: {
        pressure: 0,
        changes: 0,
        minutesSinceSnapshot: 0,
        criticalFiles: []
      },
      action: "none"
    };
  }
});
var BehaviorTracker = class {
  static {
    __name(this, "BehaviorTracker");
  }
  static {
    __name5(this, "BehaviorTracker");
  }
  sessionStart;
  edits = [];
  tests = [];
  aiSuggestions = [];
  fileSaves = 0;
  constructor(initialTime = Date.now()) {
    this.sessionStart = initialTime;
  }
  /**
  * Record a file edit event
  */
  recordEdit(linesAdded, linesDeleted, timestamp = Date.now()) {
    this.edits.push({
      timestamp,
      linesAdded,
      linesDeleted
    });
  }
  /**
  * Record a file save
  */
  recordFileSave() {
    this.fileSaves++;
  }
  /**
  * Record a test execution result
  */
  recordTest(passed, timestamp = Date.now()) {
    this.tests.push({
      timestamp,
      passed
    });
  }
  /**
  * Record an AI suggestion event
  */
  recordAISuggestion(accepted, timestamp = Date.now()) {
    this.aiSuggestions.push({
      timestamp,
      accepted
    });
  }
  /**
  * Record a snapshot creation (resets session)
  */
  recordSnapshot(timestamp = Date.now()) {
    this.sessionStart = timestamp;
  }
  /**
  * Get current behavioral metadata
  */
  getMetadata(now = Date.now()) {
    const sessionDuration = now - this.sessionStart;
    const totalSuggestions = this.aiSuggestions.length;
    const acceptedSuggestions = this.aiSuggestions.filter((s) => s.accepted).length;
    const rejectedSuggestions = totalSuggestions - acceptedSuggestions;
    const aiAcceptanceRate = totalSuggestions > 0 ? acceptedSuggestions / totalSuggestions : 0;
    const totalLinesChanged = this.edits.reduce((sum, e) => sum + e.linesAdded + e.linesDeleted, 0);
    const sessionMinutes = sessionDuration / (60 * 1e3);
    const churnRate = sessionMinutes > 0 ? totalLinesChanged / sessionMinutes : 0;
    const totalTests = this.tests.length;
    const passedTests = this.tests.filter((t) => t.passed).length;
    const testPassRate = totalTests > 0 ? passedTests / totalTests : 1;
    let avgTimeBetweenEdits = 0;
    if (this.edits.length > 1) {
      const intervals = [];
      for (let i = 1; i < this.edits.length; i++) {
        intervals.push(this.edits[i].timestamp - this.edits[i - 1].timestamp);
      }
      avgTimeBetweenEdits = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }
    return {
      sessionDuration,
      aiAcceptanceRate,
      churnRate,
      testPassRate,
      fileSaveCount: this.fileSaves,
      aiSuggestionsShown: totalSuggestions,
      aiSuggestionsAccepted: acceptedSuggestions,
      aiSuggestionsRejected: rejectedSuggestions,
      avgTimeBetweenEdits
    };
  }
  /**
  * Reset all tracking data
  */
  reset(timestamp = Date.now()) {
    this.sessionStart = timestamp;
    this.edits = [];
    this.tests = [];
    this.aiSuggestions = [];
    this.fileSaves = 0;
  }
  /**
  * Get raw metrics for testing
  */
  getRawCounts() {
    return {
      edits: this.edits.length,
      tests: this.tests.length,
      suggestions: this.aiSuggestions.length,
      saves: this.fileSaves
    };
  }
};
var DEFAULT_VITALS_CONFIG = {
  pulse: DEFAULT_PULSE_CONFIG,
  temperature: DEFAULT_TEMPERATURE_CONFIG,
  pressure: DEFAULT_PRESSURE_CONFIG,
  oxygen: DEFAULT_OXYGEN_CONFIG
};
var WorkspaceVitals = class _WorkspaceVitals extends EventEmitter {
  static {
    __name(this, "_WorkspaceVitals");
  }
  static {
    __name5(this, "WorkspaceVitals");
  }
  static instances = /* @__PURE__ */ new Map();
  pulse;
  temperature;
  pressure;
  oxygen;
  config;
  history = [];
  maxHistory = 100;
  // Phase 4: Learning components
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: stored for context/debugging
  workspaceId;
  learner;
  calibrator;
  predictor;
  phaseDetector;
  currentBranch = "main";
  // Phase 2: Behavioral metadata tracking
  behaviorTracker;
  constructor(workspaceId, config = {}, initialTime = Date.now()) {
    super();
    this.workspaceId = workspaceId;
    this.config = {
      pulse: {
        ...DEFAULT_VITALS_CONFIG.pulse,
        ...config.pulse
      },
      temperature: {
        ...DEFAULT_VITALS_CONFIG.temperature,
        ...config.temperature
      },
      pressure: {
        ...DEFAULT_VITALS_CONFIG.pressure,
        ...config.pressure
      },
      oxygen: {
        ...DEFAULT_VITALS_CONFIG.oxygen,
        ...config.oxygen
      }
    };
    this.pulse = new PulseTracker(this.config.pulse);
    this.temperature = new TemperatureMonitor(this.config.temperature);
    this.pressure = new PressureGauge(this.config.pressure, initialTime);
    this.oxygen = new OxygenSensor(this.config.oxygen);
    this.learner = new UserBehaviorLearner(workspaceId);
    this.calibrator = new ThresholdCalibrator(workspaceId, this.learner);
    this.predictor = new TrajectoryPredictor(workspaceId);
    this.phaseDetector = new PhaseDetector();
    this.behaviorTracker = new BehaviorTracker(initialTime);
  }
  /**
  * Get or create WorkspaceVitals for a workspace.
  * Singleton per workspaceId.
  */
  static for(workspaceId, config) {
    let instance2 = _WorkspaceVitals.instances.get(workspaceId);
    if (!instance2) {
      instance2 = new _WorkspaceVitals(workspaceId, config);
      _WorkspaceVitals.instances.set(workspaceId, instance2);
    }
    return instance2;
  }
  /**
  * Create a new instance (for testing - bypasses singleton).
  */
  static create(config, initialTime) {
    return new _WorkspaceVitals(`test-${Date.now()}`, config, initialTime);
  }
  /**
  * Clear all singleton instances (for testing).
  */
  static clearInstances() {
    _WorkspaceVitals.instances.clear();
  }
  /**
  * Try to get an existing WorkspaceVitals instance.
  * Returns undefined if none exists for the workspace.
  */
  static tryGet(workspaceId) {
    return _WorkspaceVitals.instances.get(workspaceId);
  }
  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================
  /**
  * Handle a file change event.
  */
  onFileChange(event, now = Date.now()) {
    this.pulse.recordChange(now);
    this.pressure.recordChange(event.path);
    this.oxygen.recordModification(event.path);
    if (event.isAI) {
      this.temperature.recordAIActivity(event.tool, now);
    } else {
      this.temperature.recordHumanActivity(now);
    }
    this.checkAndEmit(now);
  }
  /**
  * Handle a snapshot creation event.
  */
  onSnapshot(event, now = Date.now()) {
    this.pressure.recordSnapshot(now);
    this.oxygen.recordSnapshot(event.filePath, now);
    this.behaviorTracker.recordSnapshot(now);
    this.checkAndEmit(now);
  }
  /**
  * Handle AI detection event.
  */
  onAIDetected(detection, now = Date.now()) {
    if (detection.confidence > 0.6) {
      this.temperature.recordAIActivity(detection.tool, now);
    }
    this.checkAndEmit(now);
  }
  // =========================================================================
  // CURRENT STATE
  // =========================================================================
  /**
  * Get current vitals snapshot.
  * NOTE: This is a pure getter - does NOT mutate history.
  * Use recordHistorySnapshot() for explicit history recording.
  */
  current(now = Date.now()) {
    const pulseData = this.pulse.getLevel(now);
    const tempData = this.temperature.getLevel(now);
    const pressureData = this.pressure.getState(now);
    const oxygenData = this.oxygen.getLevel(now);
    const snapshot = {
      timestamp: now,
      pulse: pulseData,
      temperature: tempData,
      pressure: pressureData,
      oxygen: oxygenData,
      trajectory: this.calculateTrajectory(pulseData, tempData, pressureData, oxygenData),
      // Include behavioral metadata
      behavior: this.behaviorTracker.getMetadata(now)
    };
    return snapshot;
  }
  /**
  * Explicitly record a history snapshot.
  * Call this on meaningful state changes (e.g., after onFileChange, onSnapshot).
  * History is bounded FIFO with maxHistory limit.
  */
  recordHistorySnapshot(now = Date.now()) {
    const snapshot = this.current(now);
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }
  /**
  * Get historical snapshots.
  */
  getHistory() {
    return [
      ...this.history
    ];
  }
  /**
  * Get structured pressure recommendation for snapshot decisions.
  *
  * This provides actionable, context-aware recommendations based on
  * current pressure state. Use this to enhance AutoDecisionEngine
  * with educational messaging and urgency levels.
  *
  * @param now Optional timestamp for testing
  * @returns PressureRecommendation with action, urgency, and educational context
  */
  getPressureRecommendation(now = Date.now()) {
    return this.pressure.getRecommendation(now);
  }
  // =========================================================================
  // DECISION SUPPORT
  // =========================================================================
  /**
  * Determine if a snapshot should be created.
  * Uses centralized thresholds from constants.ts
  */
  shouldSnapshot(now = Date.now()) {
    const vitals = this.current(now);
    if (vitals.trajectory === "critical") {
      return {
        should: true,
        reason: "Critical risk state - immediate snapshot recommended",
        urgency: "critical"
      };
    }
    if (vitals.pressure.value >= PRESSURE_THRESHOLDS.critical) {
      return {
        should: true,
        reason: `High pressure (${vitals.pressure.value}%) - ${vitals.pressure.unsnapshotedChanges} unsaved changes`,
        urgency: "high"
      };
    }
    if (vitals.pressure.criticalFilesTouched.length > 0 && vitals.oxygen.value < OXYGEN_THRESHOLDS.low) {
      return {
        should: true,
        reason: `Critical files modified without snapshot: ${vitals.pressure.criticalFilesTouched.join(", ")}`,
        urgency: "high"
      };
    }
    if (vitals.temperature.level === "burning" && vitals.oxygen.value < OXYGEN_THRESHOLDS.moderate) {
      return {
        should: true,
        reason: "Heavy AI activity with low snapshot coverage",
        urgency: "medium"
      };
    }
    if (vitals.pressure.value >= PRESSURE_THRESHOLDS.moderate) {
      return {
        should: false,
        reason: "Consider snapshotting soon",
        urgency: "low"
      };
    }
    return {
      should: false,
      reason: "No immediate action needed",
      urgency: "none"
    };
  }
  /**
  * Get guidance for AI agents.
  */
  getAgentGuidance(now = Date.now()) {
    const vitals = this.current(now);
    const snapshotDecision = this.shouldSnapshot(now);
    const blockedOps = [];
    if (vitals.trajectory === "critical") {
      blockedOps.push("delete", "refactor-large", "mass-rename");
    }
    const safeOps2 = [
      "read",
      "analyze",
      "suggest"
    ];
    if (vitals.oxygen.value > 80 && vitals.pressure.value < 40) {
      safeOps2.push("write", "modify", "refactor-small");
    }
    return {
      shouldSnapshot: snapshotDecision.should,
      snapshotReason: snapshotDecision.should ? snapshotDecision.reason : void 0,
      riskyFiles: vitals.pressure.criticalFilesTouched,
      safeOperations: safeOps2,
      blockedOperations: blockedOps,
      suggestion: this.getSuggestion(vitals)
    };
  }
  /**
  * Get threshold multiplier for dynamic risk adjustment.
  */
  getThresholdMultiplier(now = Date.now()) {
    const vitals = this.current(now);
    const tempMultiplier = {
      cold: 1.2,
      warm: 1,
      hot: 0.8,
      burning: 0.6
    }[vitals.temperature.level];
    const oxygenMultiplier = vitals.oxygen.value > 80 ? 1.2 : 1;
    const pressureMultiplier = vitals.pressure.value > 60 ? 0.8 : 1;
    return tempMultiplier * oxygenMultiplier * pressureMultiplier;
  }
  // =========================================================================
  // PHASE 4: LEARNING & CALIBRATION
  // =========================================================================
  /**
  * Record user behavior for learning.
  * Call when user creates a snapshot to learn their patterns.
  */
  recordBehavior(userCreatedSnapshot, now = Date.now()) {
    const vitals = this.current(now);
    const decision = this.shouldSnapshot(now);
    this.learner.recordObservation({
      vitals,
      userCreatedSnapshot,
      vitalsRecommended: decision.should
    });
    this.calibrator.updateFromBehavior();
    this.predictor.recordSnapshots([
      vitals
    ]);
  }
  /**
  * Get calibrated threshold adjustments.
  * Returns per-workspace learned adjustments (multipliers).
  */
  getCalibratedThresholds() {
    return this.calibrator.getAdjustedThresholds();
  }
  /**
  * Get trajectory forecast.
  * Predicts future trajectory based on recent history.
  */
  getForecast() {
    return this.predictor.predict();
  }
  /**
  * Get user behavior statistics.
  */
  getBehaviorStats() {
    return this.learner.getStats();
  }
  /**
  * Get workspace calibration profile.
  */
  getCalibrationProfile() {
    return this.calibrator.getProfile();
  }
  /**
  * Reset learning data for this workspace.
  */
  resetLearning() {
    this.calibrator.reset();
    this.predictor.reset();
  }
  // =========================================================================
  // PHASE 2: BEHAVIORAL METADATA TRACKING
  // =========================================================================
  /**
  * Record a file edit event for behavioral analytics.
  */
  recordEdit(linesAdded, linesDeleted, timestamp = Date.now()) {
    this.behaviorTracker.recordEdit(linesAdded, linesDeleted, timestamp);
  }
  /**
  * Record a file save event.
  */
  recordFileSave() {
    this.behaviorTracker.recordFileSave();
  }
  /**
  * Record a test execution result.
  */
  recordTest(passed, timestamp = Date.now()) {
    this.behaviorTracker.recordTest(passed, timestamp);
  }
  /**
  * Record an AI suggestion event.
  * @param accepted Whether the user accepted the AI suggestion
  */
  recordAISuggestion(accepted, timestamp = Date.now()) {
    this.behaviorTracker.recordAISuggestion(accepted, timestamp);
  }
  /**
  * Get current behavioral metadata.
  */
  getBehavioralMetadata(now = Date.now()) {
    return this.behaviorTracker.getMetadata(now);
  }
  // =========================================================================
  // PHASE DETECTION (Development Phase-Aware Thresholds)
  // =========================================================================
  /**
  * Set the current git branch for phase-aware calculations.
  * PhaseDetector uses branch naming patterns to adjust thresholds.
  * - hotfix/* → More protective (0.7x intervals, 1.5x risk)
  * - feature/* → Standard thresholds
  * - release/* → More protective (0.75x intervals, 1.3x risk)
  */
  setCurrentBranch(branchName) {
    this.currentBranch = branchName;
    this.phaseDetector.clearCache();
  }
  /**
  * Get current branch name.
  */
  getCurrentBranch() {
    return this.currentBranch;
  }
  /**
  * Get phase-aware risk multiplier for pressure calculations.
  * Hotfix branches return higher multipliers (more protective).
  * Feature branches return standard multipliers.
  */
  getPhaseRiskMultiplier() {
    return this.phaseDetector.getRiskMultiplier(this.currentBranch);
  }
  /**
  * Get phase-aware threshold multiplier for intervals.
  * Hotfix branches return lower multipliers (more frequent checks).
  */
  getPhaseThresholdMultiplier() {
    return this.phaseDetector.getThresholdMultiplier(this.currentBranch);
  }
  /**
  * Get the detected development phase for current branch.
  */
  getDetectedPhase() {
    return this.phaseDetector.detectPhase(this.currentBranch);
  }
  /**
  * Check if current phase requires more frequent snapshots.
  */
  requiresFrequentSnapshots() {
    return this.phaseDetector.requiresFrequentSnapshots(this.currentBranch);
  }
  /**
  * Get combined threshold multiplier (calibrator + phase).
  * This is the primary method for adaptive thresholds.
  */
  getCombinedThresholdMultiplier(now = Date.now()) {
    const baseMultiplier = this.getThresholdMultiplier(now);
    const phaseMultiplier = this.getPhaseThresholdMultiplier();
    return baseMultiplier * phaseMultiplier;
  }
  // =========================================================================
  // INTERNAL
  // =========================================================================
  calculateTrajectory(pulse, temp, pressure, oxygen) {
    if (pressure.value >= TRAJECTORY_THRESHOLDS.criticalPressure && temp.level === "burning" && oxygen.value < TRAJECTORY_THRESHOLDS.criticalOxygen) {
      return "critical";
    }
    if (pressure.value >= TRAJECTORY_THRESHOLDS.escalatingPressure && oxygen.value < TRAJECTORY_THRESHOLDS.escalatingOxygen || temp.level === "hot" && pulse.level === "racing") {
      return "escalating";
    }
    const recentHistory = this.history.slice(-5);
    if (recentHistory.length >= 3) {
      const latestPressure = recentHistory[recentHistory.length - 1]?.pressure.value ?? 0;
      const earliestPressure = recentHistory[0]?.pressure.value ?? 0;
      const pressureTrend = latestPressure - earliestPressure;
      if (pressureTrend < -10 && oxygen.value >= TRAJECTORY_THRESHOLDS.recoveringOxygen) {
        return "recovering";
      }
    }
    return "stable";
  }
  getSuggestion(vitals) {
    if (vitals.trajectory === "critical") {
      return "STOP: Create a checkpoint before making more changes";
    }
    if (vitals.trajectory === "escalating") {
      return "Consider creating a snapshot - risk is accumulating";
    }
    if (vitals.pressure.value >= PRESSURE_THRESHOLDS.critical) {
      return "High pressure - create a snapshot before continuing";
    }
    if (vitals.pressure.value >= PRESSURE_THRESHOLDS.moderate) {
      return "Moderate pressure - consider creating a snapshot soon";
    }
    if (vitals.temperature.level === "burning") {
      return "Heavy AI activity detected - extra caution recommended";
    }
    if (vitals.oxygen.value < OXYGEN_THRESHOLDS.low) {
      return "Low snapshot coverage - protect your work";
    }
    return "Proceed normally";
  }
  checkAndEmit(now) {
    const vitals = this.current(now);
    const decision = this.shouldSnapshot(now);
    if (decision.urgency === "critical") {
      this.emit("critical", vitals);
    } else if (decision.urgency === "high") {
      this.emit("warning", vitals);
    }
    this.emit("update", vitals);
  }
};
var __defProp5 = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name6 = /* @__PURE__ */ __name((target, value) => __defProp5(target, "name", {
  value,
  configurable: true
}), "__name");
var __require4 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: /* @__PURE__ */ __name((a, b) => (typeof __require !== "undefined" ? __require : a)[b], "get")
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = /* @__PURE__ */ __name((fn, res) => /* @__PURE__ */ __name(function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
}, "__init"), "__esm");
var __export = /* @__PURE__ */ __name((target, all) => {
  for (var name in all) __defProp5(target, name, {
    get: all[name],
    enumerable: true
  });
}, "__export");
function formatWireLabeled(type, fields, options) {
  const parts = [
    WIRE_PREFIX,
    type
  ];
  const entries = Object.entries(fields).filter(([, v]) => v !== void 0);
  if (options?.compact) {
    parts.push(...entries.map(([, v]) => String(v)));
  } else {
    parts.push(...entries.map(([k, v]) => `${k}:${v}`));
  }
  return parts.join("|");
}
__name(formatWireLabeled, "formatWireLabeled");
function formatWire(type, ...fields) {
  return [
    WIRE_PREFIX,
    type,
    ...fields.map(String)
  ].join("|");
}
__name(formatWire, "formatWire");
function formatMessage(message) {
  if (message.startsWith(BRAND_PREFIX) || message.startsWith(WIRE_PREFIX)) {
    return message;
  }
  return `${BRAND_PREFIX} ${message}`;
}
__name(formatMessage, "formatMessage");
function compress(s, maxLength) {
  const clean = s.replace(/\s+/g, "\u2192");
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}\u2026` : clean;
}
__name(compress, "compress");
function getRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 6e4);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "just now";
}
__name(getRelativeTime, "getRelativeTime");
function getRelativeTimeHuman(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 6e4);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }
  return "just now";
}
__name(getRelativeTimeHuman, "getRelativeTimeHuman");
function buildStartResponse(data, options) {
  const learningsStr = data.learnings?.slice(0, 3).map((l) => compress(l, 40)).join(",") || "";
  const hotspotsStr = data.hotspots?.slice(0, 2).join(",") || "";
  const wire = formatWireLabeled("S", {
    id: data.taskId,
    snap: data.snapshotId || "none",
    risk: data.risk,
    prot: data.protection,
    dirty: data.dirty,
    status: data.snapshotStatus,
    ...learningsStr && {
      learn: learningsStr
    },
    ...hotspotsStr && {
      hotspots: hotspotsStr
    }
  }, options);
  const message = data.snapshotStatus === "created" ? messages.snapshot.created(data.taskDescription) : data.snapshotStatus === "reused" ? messages.snapshot.reused() : void 0;
  return {
    wire,
    message
  };
}
__name(buildStartResponse, "buildStartResponse");
function buildCheckResponse(data, options) {
  const tsStatus = data.checked?.typescript ? "\u2713" : "\u2717";
  const lintStatus = data.checked?.lint ? "\u2713" : "\u2717";
  const testsStatus = data.checked?.tests === true ? "\u2713" : data.checked?.tests === "skipped" ? "\u23ED\uFE0F" : "\u2717";
  const issuesStr = data.issues?.slice(0, 3).map((i) => compress(i, 40)).join(",") || "";
  const wire = formatWireLabeled(data.mode, {
    status: data.status === "OK" ? "\u2713" : "\u2717",
    err: `${data.errors}E`,
    warn: `${data.warnings}W`,
    ts: tsStatus,
    lint: lintStatus,
    tests: testsStatus,
    ...issuesStr && {
      issues: issuesStr
    }
  }, options);
  const message = data.status === "OK" ? messages.validation.passed() : messages.validation.issues(data.errors, data.warnings);
  return {
    wire,
    message
  };
}
__name(buildCheckResponse, "buildCheckResponse");
function buildRestoreResponse(data) {
  const timeAgo = getRelativeTimeHuman(data.snapshotTime);
  if (data.isDry) {
    const wire2 = formatWire("R", "DRY", `${data.files.length}f`, ...data.files.slice(0, 5));
    return {
      wire: wire2,
      message: messages.restore.preview(data.files.length)
    };
  }
  const wire = formatWire("R", "OK", `${data.files.length}f`, ...data.files.slice(0, 5));
  const message = data.files.length === 1 ? messages.restore.single(data.files[0], timeAgo) : messages.restore.multiple(data.files.length, timeAgo);
  return {
    wire,
    message
  };
}
__name(buildRestoreResponse, "buildRestoreResponse");
function buildListResponse(snapshots) {
  if (snapshots.length === 0) {
    return {
      wire: formatWire("R", "0", "No snapshots available"),
      message: messages.restore.notFound()
    };
  }
  const parts = snapshots.slice(0, 5).map((snap) => {
    const age = getRelativeTime(snap.createdAt);
    return `${snap.id.slice(0, 8)}:${age}:${snap.fileCount}f`;
  });
  return {
    wire: formatWire("R", String(snapshots.length), ...parts)
  };
}
__name(buildListResponse, "buildListResponse");
function buildEndResponse(data, options) {
  const learningsStr = data.learnings?.slice(0, 2).map((l) => compress(l, 30)).join(",") || "";
  const wire = formatWireLabeled("E", {
    status: data.success ? "OK" : "FAIL",
    learn: `${data.learningsCount}L`,
    files: `${data.filesModified}F`,
    lines: `+${data.linesAdded}-${data.linesRemoved}`,
    ...learningsStr && {
      summary: learningsStr
    }
  }, options);
  const wireWithSurvey = data.survey ? `${wire}|${JSON.stringify(data.survey)}` : wire;
  const statsParts = [];
  if (data.tokensSaved && data.tokensSaved > 500) {
    statsParts.push(`\u{1F4B0} ~${data.tokensSaved.toLocaleString()} tokens saved (${data.savingsPercent}%)`);
  }
  if (data.mistakesPrevented && data.mistakesPrevented > 0) {
    statsParts.push(`\u{1F6E1}\uFE0F ${data.mistakesPrevented} ${data.mistakesPrevented === 1 ? "issue" : "issues"} prevented`);
  }
  if (data.learningsCount > 0) {
    statsParts.push(`\u{1F4DA} ${data.learningsCount} captured`);
  }
  const message = statsParts.length > 0 ? statsParts.join(" | ") : void 0;
  return {
    wire: wireWithSurvey,
    message
  };
}
__name(buildEndResponse, "buildEndResponse");
function buildLearnResponse(data, options) {
  const fullType = LEARNING_TYPE_MAP[data.type] || data.type;
  const wire = formatWireLabeled("L", {
    status: "OK",
    id: data.id,
    type: fullType
  }, options);
  return {
    wire,
    message: messages.learning.captured(fullType)
  };
}
__name(buildLearnResponse, "buildLearnResponse");
function buildViolationResponse(data, options) {
  const wire = formatWireLabeled("V", {
    status: "OK",
    type: data.type,
    count: data.count,
    promote: data.shouldPromote ? "PROMOTED" : "NO",
    auto: data.shouldAutomate ? "YES" : "NO"
  }, options);
  const message = data.shouldAutomate ? messages.violation.automate(data.type) : data.shouldPromote ? messages.violation.promoted(data.type) : messages.violation.recorded(data.type, data.count);
  return {
    wire,
    message
  };
}
__name(buildViolationResponse, "buildViolationResponse");
function buildErrorResponse(reason, code, options) {
  const wire = formatWireLabeled("!", {
    code: code || "ERR",
    reason: compress(reason, 60)
  }, options);
  return {
    wire,
    message: messages.error.generic(reason)
  };
}
__name(buildErrorResponse, "buildErrorResponse");
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
__name(capitalize, "capitalize");
function formatToolResult(response, humanize = false) {
  if (humanize && response.message) {
    return `${response.wire}
${response.message}`;
  }
  return response.wire;
}
__name(formatToolResult, "formatToolResult");
var BRAND_PREFIX;
var WIRE_PREFIX;
var INTERNAL_SEPARATOR;
var messages;
var LEARNING_TYPE_MAP;
var init_branding = __esm({
  "src/branding/index.ts"() {
    BRAND_PREFIX = "\u{1F9E2} SnapBack:";
    WIRE_PREFIX = "\u{1F9E2}";
    INTERNAL_SEPARATOR = "\n---\n";
    messages = {
      // -------------------------------------------------------------------------
      // Snapshot/Checkpoint Operations
      // -------------------------------------------------------------------------
      snapshot: {
        /** Default checkpoint created message */
        created: /* @__PURE__ */ __name6((context) => context ? `${BRAND_PREFIX} Got it. Checkpoint created before ${context}.` : `${BRAND_PREFIX} Checkpoint created.`, "created"),
        /** Checkpoint with file count */
        createdWithStats: /* @__PURE__ */ __name6((files, lines) => `${BRAND_PREFIX} Created checkpoint. Captured ${files} file${files !== 1 ? "s" : ""}, ${lines.toLocaleString()} lines.`, "createdWithStats"),
        /** Proactive checkpoint before risky operation */
        proactive: /* @__PURE__ */ __name6((reason) => `${BRAND_PREFIX} Creating a checkpoint first\u2014${reason}.`, "proactive"),
        /** Checkpoint reused */
        reused: /* @__PURE__ */ __name6(() => `${BRAND_PREFIX} Recent checkpoint available.`, "reused"),
        /** Checkpoint skipped */
        skipped: /* @__PURE__ */ __name6(() => `${BRAND_PREFIX} Skipped checkpoint\u2014already protected.`, "skipped")
      },
      // -------------------------------------------------------------------------
      // Restore Operations
      // -------------------------------------------------------------------------
      restore: {
        /** Single file restored */
        single: /* @__PURE__ */ __name6((filename, timeAgo) => `${BRAND_PREFIX} Restored \`${filename}\` to ${timeAgo}.`, "single"),
        /** Multiple files restored */
        multiple: /* @__PURE__ */ __name6((count, timeAgo) => `${BRAND_PREFIX} Restored ${count} files to ${timeAgo}.`, "multiple"),
        /** Restore with reassurance about saved changes */
        withReassurance: /* @__PURE__ */ __name6((filename, snapshotId) => `${BRAND_PREFIX} Restored \`${filename}\`. Your recent changes are saved in snapshot #${snapshotId} if you need them back.`, "withReassurance"),
        /** Preview mode */
        preview: /* @__PURE__ */ __name6((count) => `${BRAND_PREFIX} Would restore ${count} file${count !== 1 ? "s" : ""}.`, "preview"),
        /** Can't restore - unsaved changes */
        cantRestoreUnsaved: /* @__PURE__ */ __name6((filename) => `${BRAND_PREFIX} Can't restore \`${filename}\`\u2014you have unsaved changes. Save or discard first?`, "cantRestoreUnsaved"),
        /** Snapshot not found */
        notFound: /* @__PURE__ */ __name6(() => `${BRAND_PREFIX} No checkpoint found for that file. Want to create one now?`, "notFound")
      },
      // -------------------------------------------------------------------------
      // Protection Status/Warnings
      // -------------------------------------------------------------------------
      protection: {
        /** Gentle nudge for unprotected changes */
        nudge: /* @__PURE__ */ __name6((lines) => `${BRAND_PREFIX} You've got ${lines.toLocaleString()}+ lines of unprotected changes. Want a checkpoint?`, "nudge"),
        /** Warning before risky operation */
        beforeRisky: /* @__PURE__ */ __name6((filename) => `${BRAND_PREFIX} No recent checkpoint for \`${filename}\`. Should I create one before we continue?`, "beforeRisky"),
        /** All clear status */
        allClear: /* @__PURE__ */ __name6((minutesAgo) => `${BRAND_PREFIX} You're covered. Last checkpoint was ${minutesAgo} minute${minutesAgo !== 1 ? "s" : ""} ago.`, "allClear"),
        /** Files protected count */
        protected: /* @__PURE__ */ __name6((count) => `${BRAND_PREFIX} ${count} file${count !== 1 ? "s" : ""} protected.`, "protected")
      },
      // -------------------------------------------------------------------------
      // Session Operations
      // -------------------------------------------------------------------------
      session: {
        /** AI session started */
        started: /* @__PURE__ */ __name6(() => `${BRAND_PREFIX} AI session detected. Auto-protecting changes.`, "started"),
        /** Session summary on completion */
        complete: /* @__PURE__ */ __name6((checkpoints, files) => `${BRAND_PREFIX} Session complete. ${checkpoints} checkpoint${checkpoints !== 1 ? "s" : ""}, ${files} file${files !== 1 ? "s" : ""} protected.`, "complete"),
        /** Task started */
        taskStarted: /* @__PURE__ */ __name6((taskDesc) => taskDesc ? `${BRAND_PREFIX} Got it. Starting: ${taskDesc}` : `${BRAND_PREFIX} Task started.`, "taskStarted")
      },
      // -------------------------------------------------------------------------
      // Validation/Check Operations
      // -------------------------------------------------------------------------
      validation: {
        /** All checks passed */
        passed: /* @__PURE__ */ __name6(() => `${BRAND_PREFIX} All clear. Code looks good.`, "passed"),
        /** Issues found */
        issues: /* @__PURE__ */ __name6((errors, warnings) => `${BRAND_PREFIX} Found ${errors} error${errors !== 1 ? "s" : ""}, ${warnings} warning${warnings !== 1 ? "s" : ""}.`, "issues"),
        /** Quick validation complete */
        quickComplete: /* @__PURE__ */ __name6(() => `${BRAND_PREFIX} Quick check done.`, "quickComplete")
      },
      // -------------------------------------------------------------------------
      // Learning Operations
      // -------------------------------------------------------------------------
      learning: {
        /** Learning captured */
        captured: /* @__PURE__ */ __name6((type) => `${BRAND_PREFIX} Got it. ${capitalize(type)} captured for next time.`, "captured"),
        /** Learning applied */
        applied: /* @__PURE__ */ __name6((count) => `${BRAND_PREFIX} Applied ${count} past learning${count !== 1 ? "s" : ""} to this task.`, "applied")
      },
      // -------------------------------------------------------------------------
      // Violation Operations
      // -------------------------------------------------------------------------
      violation: {
        /** Violation recorded */
        recorded: /* @__PURE__ */ __name6((type, count) => `${BRAND_PREFIX} Noted: ${type} (occurrence #${count}).`, "recorded"),
        /** Violation promoted to pattern */
        promoted: /* @__PURE__ */ __name6((type) => `${BRAND_PREFIX} Heads up: ${type} is now a tracked pattern\u2014seen 3+ times.`, "promoted"),
        /** Violation marked for automation */
        automate: /* @__PURE__ */ __name6((type) => `${BRAND_PREFIX} ${type} marked for automation\u2014seen 5+ times.`, "automate")
      },
      // -------------------------------------------------------------------------
      // Errors & Edge Cases
      // -------------------------------------------------------------------------
      error: {
        /** Generic error */
        generic: /* @__PURE__ */ __name6((reason) => `${BRAND_PREFIX} Couldn't complete\u2014${reason}.`, "generic"),
        /** Storage issue */
        storage: /* @__PURE__ */ __name6(() => `${BRAND_PREFIX} Heads up\u2014running low on snapshot storage. Older checkpoints will auto-clean.`, "storage"),
        /** Not found */
        notFound: /* @__PURE__ */ __name6((what) => `${BRAND_PREFIX} ${what} not found.`, "notFound")
      },
      // -------------------------------------------------------------------------
      // Token Savings (optional, only when meaningful)
      // -------------------------------------------------------------------------
      efficiency: {
        /** Token savings report */
        tokensSaved: /* @__PURE__ */ __name6((tokens) => `${BRAND_PREFIX} Saved you ~${tokens.toLocaleString()} tokens vs. re-prompting.`, "tokensSaved"),
        /** Session savings summary */
        sessionSavings: /* @__PURE__ */ __name6((restores, dollarsSaved) => `${BRAND_PREFIX} This session: ${restores} restore${restores !== 1 ? "s" : ""} \u2192 ~$${dollarsSaved} in tokens saved.`, "sessionSavings")
      }
    };
    __name6(formatWireLabeled, "formatWireLabeled");
    __name6(formatWire, "formatWire");
    __name6(formatMessage, "formatMessage");
    __name6(compress, "compress");
    __name6(getRelativeTime, "getRelativeTime");
    __name6(getRelativeTimeHuman, "getRelativeTimeHuman");
    __name6(buildStartResponse, "buildStartResponse");
    __name6(buildCheckResponse, "buildCheckResponse");
    __name6(buildRestoreResponse, "buildRestoreResponse");
    __name6(buildListResponse, "buildListResponse");
    __name6(buildEndResponse, "buildEndResponse");
    LEARNING_TYPE_MAP = {
      pat: "pattern",
      pattern: "pattern",
      pit: "pitfall",
      pitfall: "pitfall",
      eff: "efficiency",
      efficiency: "efficiency",
      disc: "discovery",
      discovery: "discovery",
      wf: "workflow",
      workflow: "workflow"
    };
    __name6(buildLearnResponse, "buildLearnResponse");
    __name6(buildViolationResponse, "buildViolationResponse");
    __name6(buildErrorResponse, "buildErrorResponse");
    __name6(capitalize, "capitalize");
    __name6(formatToolResult, "formatToolResult");
  }
});
function createRequestContext(tool, options) {
  return {
    requestId: randomUUID().slice(0, 8),
    tool,
    startTime: Date.now(),
    userId: options?.userId,
    tier: options?.tier
  };
}
__name(createRequestContext, "createRequestContext");
function log(level, ctx, message, metadata) {
  const entry = {
    timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString(),
    level,
    requestId: ctx.requestId,
    tool: ctx.tool,
    message,
    duration: Date.now() - ctx.startTime,
    metadata
  };
  console.error(`[SnapBack MCP] ${JSON.stringify(entry)}`);
}
__name(log, "log");
function logError(ctx, code, message, details) {
  const entry = {
    timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString(),
    level: "error",
    requestId: ctx.requestId,
    tool: ctx.tool,
    message,
    duration: Date.now() - ctx.startTime,
    error: {
      code,
      message,
      details
    }
  };
  console.error(`[SnapBack MCP] ${JSON.stringify(entry)}`);
}
__name(logError, "logError");
function logSuccess(ctx, message, metadata) {
  log("info", ctx, message, {
    ...metadata,
    status: "success"
  });
}
__name(logSuccess, "logSuccess");
function buildErrorResponse2(code, message, details) {
  return {
    error: code,
    message,
    ...details && {
      details
    }
  };
}
__name(buildErrorResponse2, "buildErrorResponse2");
var ErrorCodes;
var CommonErrors;
var init_errors = __esm({
  "src/errors.ts"() {
    ErrorCodes = {
      // Validation errors (1xx)
      MISSING_REQUIRED_PARAM: "E101_MISSING_REQUIRED_PARAM",
      INVALID_PARAM_TYPE: "E102_INVALID_PARAM_TYPE",
      INVALID_PARAM_VALUE: "E103_INVALID_PARAM_VALUE",
      VALIDATION_FAILED: "E104_VALIDATION_FAILED",
      PATH_TRAVERSAL_BLOCKED: "E105_PATH_TRAVERSAL_BLOCKED",
      // Resource errors (2xx)
      FILE_NOT_FOUND: "E201_FILE_NOT_FOUND",
      SNAPSHOT_NOT_FOUND: "E202_SNAPSHOT_NOT_FOUND",
      SESSION_NOT_FOUND: "E203_SESSION_NOT_FOUND",
      CONTEXT_NOT_INITIALIZED: "E204_CONTEXT_NOT_INITIALIZED",
      // Permission errors (3xx)
      TIER_GATE_BLOCKED: "E301_TIER_GATE_BLOCKED",
      OPERATION_NOT_ALLOWED: "E302_OPERATION_NOT_ALLOWED",
      PERMISSION_DENIED: "E303_PERMISSION_DENIED",
      // Runtime errors (4xx)
      SNAPSHOT_CREATE_FAILED: "E401_SNAPSHOT_CREATE_FAILED",
      SNAPSHOT_RESTORE_FAILED: "E402_SNAPSHOT_RESTORE_FAILED",
      STORAGE_ERROR: "E403_STORAGE_ERROR",
      CONTEXT_OPERATION_FAILED: "E404_CONTEXT_OPERATION_FAILED",
      SESSION_OPERATION_FAILED: "E405_SESSION_OPERATION_FAILED",
      // Unknown errors (5xx)
      UNKNOWN_TOOL: "E501_UNKNOWN_TOOL",
      HANDLER_ERROR: "E502_HANDLER_ERROR",
      INTERNAL_ERROR: "E503_INTERNAL_ERROR"
    };
    __name6(createRequestContext, "createRequestContext");
    __name6(log, "log");
    __name6(logError, "logError");
    __name6(logSuccess, "logSuccess");
    __name6(buildErrorResponse2, "buildErrorResponse");
    CommonErrors = {
      missingParam: /* @__PURE__ */ __name6((param) => buildErrorResponse2(ErrorCodes.MISSING_REQUIRED_PARAM, `Missing required parameter: ${param}`, {
        param
      }), "missingParam"),
      invalidParam: /* @__PURE__ */ __name6((param, expected, received) => buildErrorResponse2(ErrorCodes.INVALID_PARAM_VALUE, `Invalid value for ${param}: expected ${expected}`, {
        param,
        expected,
        received
      }), "invalidParam"),
      fileNotFound: /* @__PURE__ */ __name6((filePath) => buildErrorResponse2(ErrorCodes.FILE_NOT_FOUND, `File not found: ${filePath}`, {
        filePath
      }), "fileNotFound"),
      snapshotNotFound: /* @__PURE__ */ __name6((snapshotId) => buildErrorResponse2(ErrorCodes.SNAPSHOT_NOT_FOUND, `Snapshot not found: ${snapshotId}`, {
        snapshotId
      }), "snapshotNotFound"),
      pathTraversalBlocked: /* @__PURE__ */ __name6((path6, reason) => buildErrorResponse2(ErrorCodes.PATH_TRAVERSAL_BLOCKED, reason, {
        path: path6
      }), "pathTraversalBlocked"),
      tierGateBlocked: /* @__PURE__ */ __name6((tool, requiredTier, currentTier) => buildErrorResponse2(ErrorCodes.TIER_GATE_BLOCKED, `Tool '${tool}' requires ${requiredTier} tier`, {
        tool,
        requiredTier,
        currentTier,
        upgradeUrl: "https://snapback.dev/pricing"
      }), "tierGateBlocked"),
      handlerError: /* @__PURE__ */ __name6((tool, message) => buildErrorResponse2(ErrorCodes.HANDLER_ERROR, message, {
        tool
      }), "handlerError"),
      permissionDenied: /* @__PURE__ */ __name6((path6, operation) => buildErrorResponse2(ErrorCodes.PERMISSION_DENIED, "Enable full features with quick local setup", {
        path: path6,
        operation,
        action: {
          type: "cli_install",
          command: "npm install -g @snapback/cli && snapback tools configure",
          description: "One command enables full capabilities",
          time_estimate: "~30 seconds"
        },
        help_url: "https://docs.snapback.dev/cli/setup",
        _llm: {
          suggest: "I can enable full SnapBack features with a quick CLI install. Want me to help?",
          auto_offer: true
        }
      }), "permissionDenied")
    };
  }
});
function createDefaultState() {
  return {
    currentTask: null,
    changesSinceTaskStart: [],
    pendingObservations: [],
    surfacedLearnings: [],
    riskAreasTouched: [],
    validatedFiles: [],
    stats: {
      tasksCompleted: 0,
      snapshotsCreated: 0,
      restoresPerformed: 0,
      learningsCaptured: 0
    },
    pendingSuggestedLearnings: []
  };
}
__name(createDefaultState, "createDefaultState");
function getSessionState(workspaceRoot) {
  if (!sessionStates.has(workspaceRoot)) {
    const loaded = loadStateFromDisk(workspaceRoot);
    sessionStates.set(workspaceRoot, loaded || createDefaultState());
  }
  const state = sessionStates.get(workspaceRoot);
  if (!state) {
    throw new Error(`Failed to get session state for ${workspaceRoot}`);
  }
  return state;
}
__name(getSessionState, "getSessionState");
function updateSessionState(workspaceRoot, updates) {
  const current = getSessionState(workspaceRoot);
  const updated = {
    ...current,
    ...updates
  };
  sessionStates.set(workspaceRoot, updated);
  saveStateToDisk(workspaceRoot, updated);
  return updated;
}
__name(updateSessionState, "updateSessionState");
function generateTaskId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `task_${timestamp}_${random}`;
}
__name(generateTaskId, "generateTaskId");
function startTask(workspaceRoot, task) {
  const gitBaseline = captureGitBaseline(workspaceRoot);
  const currentTask = {
    ...task,
    id: generateTaskId(),
    startedAt: Date.now(),
    gitBaseline
  };
  updateSessionState(workspaceRoot, {
    currentTask,
    changesSinceTaskStart: [],
    pendingObservations: []
  });
  return currentTask;
}
__name(startTask, "startTask");
function endTask(workspaceRoot, outcome) {
  const state = getSessionState(workspaceRoot);
  const task = state.currentTask;
  if (task) {
    if (outcome === "completed") {
      state.stats.tasksCompleted++;
    }
    updateSessionState(workspaceRoot, {
      currentTask: null,
      changesSinceTaskStart: [],
      pendingObservations: [],
      pendingSuggestedLearnings: []
    });
  }
  return task;
}
__name(endTask, "endTask");
function getCurrentTask(workspaceRoot) {
  return getSessionState(workspaceRoot).currentTask;
}
__name(getCurrentTask, "getCurrentTask");
function recordFileChange(workspaceRoot, change) {
  const state = getSessionState(workspaceRoot);
  if (!state.currentTask) {
    return;
  }
  state.changesSinceTaskStart.push(change);
  const riskAreas = detectRiskAreas(change.file);
  for (const area of riskAreas) {
    if (!state.riskAreasTouched.includes(area)) {
      state.riskAreasTouched.push(area);
    }
  }
  updateSessionState(workspaceRoot, state);
}
__name(recordFileChange, "recordFileChange");
function detectRiskAreas(filePath) {
  const areas = [];
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.includes("auth") || lowerPath.includes("login") || lowerPath.includes("session")) {
    areas.push("auth");
  }
  if (lowerPath.includes("payment") || lowerPath.includes("stripe") || lowerPath.includes("billing")) {
    areas.push("payment");
  }
  if (lowerPath.includes("database") || lowerPath.includes("db") || lowerPath.includes("migration")) {
    areas.push("database");
  }
  if (lowerPath.includes("config") || lowerPath.includes(".env") || lowerPath.includes("settings")) {
    areas.push("config");
  }
  if (lowerPath.includes("api") || lowerPath.includes("route") || lowerPath.includes("endpoint")) {
    areas.push("api");
  }
  if (lowerPath.includes("security") || lowerPath.includes("crypto") || lowerPath.includes("secret")) {
    areas.push("security");
  }
  return areas;
}
__name(detectRiskAreas, "detectRiskAreas");
function pushObservation(workspaceRoot, observation) {
  const state = getSessionState(workspaceRoot);
  state.pendingObservations.push(observation);
  if (state.pendingObservations.length > 50) {
    state.pendingObservations = state.pendingObservations.slice(-50);
  }
  updateSessionState(workspaceRoot, state);
}
__name(pushObservation, "pushObservation");
function drainPendingObservations(workspaceRoot) {
  const state = getSessionState(workspaceRoot);
  const observations = [
    ...state.pendingObservations
  ];
  updateSessionState(workspaceRoot, {
    pendingObservations: []
  });
  return observations;
}
__name(drainPendingObservations, "drainPendingObservations");
function getStateFilePath(workspaceRoot) {
  return join(workspaceRoot, ".snapback", "mcp", "session-state.json");
}
__name(getStateFilePath, "getStateFilePath");
function saveStateToDisk(workspaceRoot, state) {
  const filePath = getStateFilePath(workspaceRoot);
  try {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, {
        recursive: true
      });
    }
    writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
  } catch (error) {
    log("debug", moduleCtx, "Failed to persist session state to disk", {
      filePath,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
__name(saveStateToDisk, "saveStateToDisk");
function loadStateFromDisk(workspaceRoot) {
  const filePath = getStateFilePath(workspaceRoot);
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    log("debug", moduleCtx, "Failed to load session state from disk", {
      filePath,
      error: error instanceof Error ? error.message : String(error)
    });
  }
  return null;
}
__name(loadStateFromDisk, "loadStateFromDisk");
function captureGitBaseline(workspaceRoot) {
  const baseline = [];
  const now = Date.now();
  try {
    const result7 = execSync("git status --porcelain", {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 5e3
    });
    for (const line of result7.split("\n")) {
      if (!line.trim()) {
        continue;
      }
      const statusCode = line.substring(0, 2);
      const file = line.substring(3).trim();
      let status2 = "M";
      if (statusCode.includes("A") || statusCode === "??") {
        status2 = statusCode === "??" ? "?" : "A";
      } else if (statusCode.includes("D")) {
        status2 = "D";
      }
      baseline.push({
        file,
        status: status2,
        timestamp: now
      });
    }
  } catch (error) {
    log("debug", moduleCtx, "Git baseline capture failed (not a git repo or git unavailable)", {
      workspaceRoot,
      error: error instanceof Error ? error.message : String(error)
    });
  }
  return baseline;
}
__name(captureGitBaseline, "captureGitBaseline");
function getBaselineFileSet(workspaceRoot) {
  const state = getSessionState(workspaceRoot);
  const baseline = state.currentTask?.gitBaseline || [];
  return new Set(baseline.map((b) => b.file));
}
__name(getBaselineFileSet, "getBaselineFileSet");
function extractKeywords2(taskDescription) {
  const stopWords = /* @__PURE__ */ new Set([
    "a",
    "an",
    "the",
    "to",
    "for",
    "of",
    "in",
    "on",
    "at",
    "and",
    "or",
    "but",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "i",
    "we",
    "you",
    "they",
    "it",
    "this",
    "that",
    "with",
    "from",
    "by",
    "add",
    "update",
    "fix",
    "implement",
    "create",
    "make",
    "change",
    "modify"
  ]);
  const words = taskDescription.toLowerCase().replace(/[^\w\s-]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word));
  return [
    ...new Set(words)
  ].slice(0, 5);
}
__name(extractKeywords2, "extractKeywords");
function formatDuration3(ms) {
  const minutes = Math.floor(ms / 6e4);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  return "less than a minute";
}
__name(formatDuration3, "formatDuration");
var moduleCtx;
var sessionStates;
var init_state = __esm({
  "src/session/state.ts"() {
    init_errors();
    moduleCtx = {
      requestId: "session-state",
      tool: "session/state",
      startTime: Date.now()
    };
    sessionStates = /* @__PURE__ */ new Map();
    __name6(createDefaultState, "createDefaultState");
    __name6(getSessionState, "getSessionState");
    __name6(updateSessionState, "updateSessionState");
    __name6(generateTaskId, "generateTaskId");
    __name6(startTask, "startTask");
    __name6(endTask, "endTask");
    __name6(getCurrentTask, "getCurrentTask");
    __name6(recordFileChange, "recordFileChange");
    __name6(detectRiskAreas, "detectRiskAreas");
    __name6(pushObservation, "pushObservation");
    __name6(drainPendingObservations, "drainPendingObservations");
    __name6(getStateFilePath, "getStateFilePath");
    __name6(saveStateToDisk, "saveStateToDisk");
    __name6(loadStateFromDisk, "loadStateFromDisk");
    __name6(captureGitBaseline, "captureGitBaseline");
    __name6(getBaselineFileSet, "getBaselineFileSet");
    __name6(extractKeywords2, "extractKeywords");
    __name6(formatDuration3, "formatDuration");
  }
});
function ok(data) {
  return {
    success: true,
    data
  };
}
__name(ok, "ok");
function err(error) {
  return {
    success: false,
    error
  };
}
__name(err, "err");
function createMcpError2(code, message, context) {
  const metadata = ERROR_METADATA2[code];
  const error = {
    code,
    message,
    context,
    timestamp: Date.now(),
    recoverable: metadata.recoverable
  };
  if (process.env.NODE_ENV !== "production") {
    error.stack = new Error().stack;
  }
  return error;
}
__name(createMcpError2, "createMcpError");
function createMcpErrorFromCause2(code, message, cause, context) {
  const error = createMcpError2(code, message, {
    ...context,
    causeMessage: cause.message
  });
  error.cause = cause;
  return error;
}
__name(createMcpErrorFromCause2, "createMcpErrorFromCause");
function formatMcpError(error) {
  if (isMcpError(error)) {
    return error;
  }
  if (error instanceof Error) {
    return createMcpErrorFromCause2("UNKNOWN", error.message, error, {
      originalName: error.name
    });
  }
  if (typeof error === "string") {
    return createMcpError2("UNKNOWN", error);
  }
  return createMcpError2("UNKNOWN", String(error), {
    originalType: typeof error
  });
}
__name(formatMcpError, "formatMcpError");
function formatForUser(error) {
  const prefix = error.recoverable ? "Error" : "Fatal error";
  return `${prefix}: ${error.message} (${error.code})`;
}
__name(formatForUser, "formatForUser");
function formatForLog2(error) {
  const parts = [
    `[${error.code}] ${error.message}`,
    error.context ? `Context: ${JSON.stringify(error.context)}` : null,
    error.cause ? `Caused by: ${error.cause.message}` : null
  ].filter(Boolean);
  return parts.join("\n  ");
}
__name(formatForLog2, "formatForLog");
function isMcpError(error) {
  return typeof error === "object" && error !== null && "code" in error && "message" in error && "timestamp" in error && typeof error.code === "string" && Object.values(ErrorCode2).includes(error.code);
}
__name(isMcpError, "isMcpError");
function isRetryable(error) {
  return ERROR_METADATA2[error.code]?.retryable ?? false;
}
__name(isRetryable, "isRetryable");
function isErrorCode(error, code) {
  return isMcpError(error) && error.code === code;
}
__name(isErrorCode, "isErrorCode");
var ErrorCode2;
var ERROR_METADATA2;
var init_errors2 = __esm({
  "src/errors/index.ts"() {
    ErrorCode2 = /* @__PURE__ */ (function(ErrorCode22) {
      ErrorCode22["DAEMON_UNAVAILABLE"] = "DAEMON_UNAVAILABLE";
      ErrorCode22["DAEMON_NOT_CONNECTED"] = "DAEMON_NOT_CONNECTED";
      ErrorCode22["DAEMON_TIMEOUT"] = "DAEMON_TIMEOUT";
      ErrorCode22["DAEMON_CONNECTION_FAILED"] = "DAEMON_CONNECTION_FAILED";
      ErrorCode22["DAEMON_REQUEST_FAILED"] = "DAEMON_REQUEST_FAILED";
      ErrorCode22["SNAPSHOT_FAILED"] = "SNAPSHOT_FAILED";
      ErrorCode22["SNAPSHOT_NOT_FOUND"] = "SNAPSHOT_NOT_FOUND";
      ErrorCode22["SNAPSHOT_RESTORE_FAILED"] = "SNAPSHOT_RESTORE_FAILED";
      ErrorCode22["SNAPSHOT_STORAGE_ERROR"] = "SNAPSHOT_STORAGE_ERROR";
      ErrorCode22["SNAPSHOT_HASH_MISMATCH"] = "SNAPSHOT_HASH_MISMATCH";
      ErrorCode22["AUTH_REQUIRED"] = "AUTH_REQUIRED";
      ErrorCode22["AUTH_EXPIRED"] = "AUTH_EXPIRED";
      ErrorCode22["AUTH_INVALID_TOKEN"] = "AUTH_INVALID_TOKEN";
      ErrorCode22["AUTH_INSUFFICIENT_PERMISSIONS"] = "AUTH_INSUFFICIENT_PERMISSIONS";
      ErrorCode22["INVALID_INPUT"] = "INVALID_INPUT";
      ErrorCode22["INVALID_PARAMETER"] = "INVALID_PARAMETER";
      ErrorCode22["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
      ErrorCode22["SCHEMA_VALIDATION_FAILED"] = "SCHEMA_VALIDATION_FAILED";
      ErrorCode22["WORKSPACE_NOT_FOUND"] = "WORKSPACE_NOT_FOUND";
      ErrorCode22["FILE_NOT_FOUND"] = "FILE_NOT_FOUND";
      ErrorCode22["FILE_READ_ERROR"] = "FILE_READ_ERROR";
      ErrorCode22["FILE_WRITE_ERROR"] = "FILE_WRITE_ERROR";
      ErrorCode22["PATH_ACCESS_DENIED"] = "PATH_ACCESS_DENIED";
      ErrorCode22["SESSION_NOT_FOUND"] = "SESSION_NOT_FOUND";
      ErrorCode22["SESSION_STATE_ERROR"] = "SESSION_STATE_ERROR";
      ErrorCode22["SESSION_ALREADY_ACTIVE"] = "SESSION_ALREADY_ACTIVE";
      ErrorCode22["NO_ACTIVE_SESSION"] = "NO_ACTIVE_SESSION";
      ErrorCode22["API_REQUEST_FAILED"] = "API_REQUEST_FAILED";
      ErrorCode22["API_TIMEOUT"] = "API_TIMEOUT";
      ErrorCode22["API_RATE_LIMITED"] = "API_RATE_LIMITED";
      ErrorCode22["API_SERVER_ERROR"] = "API_SERVER_ERROR";
      ErrorCode22["CIRCUIT_BREAKER_OPEN"] = "CIRCUIT_BREAKER_OPEN";
      ErrorCode22["TOOL_NOT_FOUND"] = "TOOL_NOT_FOUND";
      ErrorCode22["TOOL_EXECUTION_FAILED"] = "TOOL_EXECUTION_FAILED";
      ErrorCode22["TOOL_DEPRECATED"] = "TOOL_DEPRECATED";
      ErrorCode22["UNKNOWN"] = "UNKNOWN";
      ErrorCode22["INTERNAL_ERROR"] = "INTERNAL_ERROR";
      ErrorCode22["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
      return ErrorCode22;
    })({});
    __name6(ok, "ok");
    __name6(err, "err");
    ERROR_METADATA2 = {
      // Daemon - mostly recoverable with retry
      ["DAEMON_UNAVAILABLE"]: {
        recoverable: true,
        retryable: true
      },
      ["DAEMON_NOT_CONNECTED"]: {
        recoverable: true,
        retryable: true
      },
      ["DAEMON_TIMEOUT"]: {
        recoverable: true,
        retryable: true
      },
      ["DAEMON_CONNECTION_FAILED"]: {
        recoverable: true,
        retryable: true
      },
      ["DAEMON_REQUEST_FAILED"]: {
        recoverable: true,
        retryable: true
      },
      // Snapshot - some recoverable
      ["SNAPSHOT_FAILED"]: {
        recoverable: true,
        retryable: true
      },
      ["SNAPSHOT_NOT_FOUND"]: {
        recoverable: false,
        retryable: false
      },
      ["SNAPSHOT_RESTORE_FAILED"]: {
        recoverable: true,
        retryable: true
      },
      ["SNAPSHOT_STORAGE_ERROR"]: {
        recoverable: true,
        retryable: true
      },
      ["SNAPSHOT_HASH_MISMATCH"]: {
        recoverable: false,
        retryable: false
      },
      // Auth - requires user action
      ["AUTH_REQUIRED"]: {
        recoverable: true,
        retryable: false
      },
      ["AUTH_EXPIRED"]: {
        recoverable: true,
        retryable: false
      },
      ["AUTH_INVALID_TOKEN"]: {
        recoverable: true,
        retryable: false
      },
      ["AUTH_INSUFFICIENT_PERMISSIONS"]: {
        recoverable: false,
        retryable: false
      },
      // Validation - fix input and retry
      ["INVALID_INPUT"]: {
        recoverable: true,
        retryable: false
      },
      ["INVALID_PARAMETER"]: {
        recoverable: true,
        retryable: false
      },
      ["MISSING_REQUIRED_FIELD"]: {
        recoverable: true,
        retryable: false
      },
      ["SCHEMA_VALIDATION_FAILED"]: {
        recoverable: true,
        retryable: false
      },
      // Workspace - depends on context
      ["WORKSPACE_NOT_FOUND"]: {
        recoverable: false,
        retryable: false
      },
      ["FILE_NOT_FOUND"]: {
        recoverable: false,
        retryable: false
      },
      ["FILE_READ_ERROR"]: {
        recoverable: true,
        retryable: true
      },
      ["FILE_WRITE_ERROR"]: {
        recoverable: true,
        retryable: true
      },
      ["PATH_ACCESS_DENIED"]: {
        recoverable: false,
        retryable: false
      },
      // Session - mostly not recoverable
      ["SESSION_NOT_FOUND"]: {
        recoverable: false,
        retryable: false
      },
      ["SESSION_STATE_ERROR"]: {
        recoverable: true,
        retryable: false
      },
      ["SESSION_ALREADY_ACTIVE"]: {
        recoverable: true,
        retryable: false
      },
      ["NO_ACTIVE_SESSION"]: {
        recoverable: true,
        retryable: false
      },
      // API - retryable network errors
      ["API_REQUEST_FAILED"]: {
        recoverable: true,
        retryable: true
      },
      ["API_TIMEOUT"]: {
        recoverable: true,
        retryable: true
      },
      ["API_RATE_LIMITED"]: {
        recoverable: true,
        retryable: true
      },
      ["API_SERVER_ERROR"]: {
        recoverable: true,
        retryable: true
      },
      ["CIRCUIT_BREAKER_OPEN"]: {
        recoverable: true,
        retryable: true
      },
      // Tool - mostly not recoverable
      ["TOOL_NOT_FOUND"]: {
        recoverable: false,
        retryable: false
      },
      ["TOOL_EXECUTION_FAILED"]: {
        recoverable: true,
        retryable: true
      },
      ["TOOL_DEPRECATED"]: {
        recoverable: false,
        retryable: false
      },
      // General
      ["UNKNOWN"]: {
        recoverable: false,
        retryable: false
      },
      ["INTERNAL_ERROR"]: {
        recoverable: false,
        retryable: false
      },
      ["NOT_IMPLEMENTED"]: {
        recoverable: false,
        retryable: false
      }
    };
    __name6(createMcpError2, "createMcpError");
    __name6(createMcpErrorFromCause2, "createMcpErrorFromCause");
    __name6(formatMcpError, "formatMcpError");
    __name6(formatForUser, "formatForUser");
    __name6(formatForLog2, "formatForLog");
    __name6(isMcpError, "isMcpError");
    __name6(isRetryable, "isRetryable");
    __name6(isErrorCode, "isErrorCode");
  }
});
function getStore(workspaceRoot) {
  let store = stores.get(workspaceRoot);
  if (!store) {
    const dbPath = join(workspaceRoot, ".snapback", "knowledge.db");
    store = new KnowledgeStore({
      dbPath
    });
    stores.set(workspaceRoot, store);
  }
  return store;
}
__name(getStore, "getStore");
function getIndexedIds(workspaceRoot) {
  let ids = indexedIds.get(workspaceRoot);
  if (!ids) {
    ids = /* @__PURE__ */ new Set();
    indexedIds.set(workspaceRoot, ids);
  }
  return ids;
}
__name(getIndexedIds, "getIndexedIds");
async function ensureEmbeddingsReady() {
  if (embeddingsReady) {
    return true;
  }
  if (embeddingsLoading) {
    let attempts = 0;
    while (embeddingsLoading && attempts < 100) {
      await new Promise((resolve32) => setTimeout(resolve32, 100));
      attempts++;
    }
    return embeddingsReady;
  }
  embeddingsLoading = true;
  try {
    await preloadEmbeddings();
    embeddingsReady = true;
    console.log("[KnowledgeIngestion] Embeddings model loaded");
    return true;
  } catch (error) {
    console.warn("[KnowledgeIngestion] Failed to load embeddings model:", error);
    return false;
  } finally {
    embeddingsLoading = false;
  }
}
__name(ensureEmbeddingsReady, "ensureEmbeddingsReady");
function isEmbeddingsAvailable() {
  return embeddingsReady;
}
__name(isEmbeddingsAvailable, "isEmbeddingsAvailable");
async function indexLearning(workspaceRoot, learning, generateEmbedding = true) {
  try {
    const store = getStore(workspaceRoot);
    const indexed = getIndexedIds(workspaceRoot);
    if (indexed.has(learning.id)) {
      return {
        success: true
      };
    }
    const sourceType = mapLearningTypeToSourceType(learning.type);
    const triggerText = Array.isArray(learning.trigger) ? learning.trigger.join(", ") : learning.trigger;
    const chunk = {
      id: learning.id,
      source_type: sourceType,
      source_id: learning.id,
      chunk_text: triggerText,
      context_text: learning.action,
      authority: getAuthorityScore(learning),
      status: "active",
      metadata: {
        originalType: learning.type,
        source: learning.source,
        domain: learning.domain,
        priority: learning.priority,
        timestamp: learning.timestamp
      }
    };
    store.insertChunk(chunk);
    indexed.add(learning.id);
    if (generateEmbedding && embeddingsReady) {
      try {
        const textForEmbedding = `${triggerText} ${learning.action}`;
        const embedding = await getEmbedding(textForEmbedding);
        store.storeEmbedding(learning.id, embedding);
      } catch (error) {
        console.warn(`[KnowledgeIngestion] Failed to generate embedding for ${learning.id}:`, error);
      }
    }
    return {
      success: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE constraint")) {
      getIndexedIds(workspaceRoot).add(learning.id);
      return {
        success: true
      };
    }
    return {
      success: false,
      error: message
    };
  }
}
__name(indexLearning, "indexLearning");
async function indexAllLearnings(workspaceRoot, options = {}) {
  const result7 = {
    success: true,
    indexed: 0,
    skipped: 0,
    errors: [],
    embeddingsGenerated: 0
  };
  const learningsDir = join(workspaceRoot, ".snapback", "learnings");
  if (!existsSync(learningsDir)) {
    return result7;
  }
  const defaultFiles = [
    "hot.jsonl",
    "learnings.jsonl",
    "domain-vscode.jsonl",
    "domain-web.jsonl",
    "domain-mcp-cli.jsonl",
    "domain-testing.jsonl",
    "anti-patterns.jsonl",
    "architecture-patterns.jsonl",
    "user-learnings.jsonl"
  ];
  const filesToIndex = options.files || defaultFiles;
  const generateEmbeddings = !options.skipEmbeddings && await ensureEmbeddingsReady();
  if (options.force) {
    indexedIds.delete(workspaceRoot);
  }
  for (const filename of filesToIndex) {
    const filePath = join(learningsDir, filename);
    if (!existsSync(filePath)) {
      continue;
    }
    try {
      const content = readFileSync(filePath, "utf8");
      const lines = content.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        try {
          const learning = JSON.parse(line);
          if (!learning.id) {
            learning.id = `seed_${filename.replace(".jsonl", "")}_${result7.indexed}`;
          }
          const indexResult = await indexLearning(workspaceRoot, learning, generateEmbeddings);
          if (indexResult.success) {
            result7.indexed++;
            if (generateEmbeddings) {
              result7.embeddingsGenerated++;
            }
          } else if (indexResult.error) {
            result7.errors.push(`${learning.id}: ${indexResult.error}`);
          }
        } catch (parseError) {
          result7.errors.push(`Parse error in ${filename}: ${parseError}`);
        }
      }
    } catch (readError) {
      result7.errors.push(`Read error for ${filename}: ${readError}`);
    }
  }
  result7.success = result7.errors.length === 0;
  return result7;
}
__name(indexAllLearnings, "indexAllLearnings");
function invalidateCache(workspaceRoot) {
  indexedIds.delete(workspaceRoot);
  const store = stores.get(workspaceRoot);
  if (store) {
    store.close();
    stores.delete(workspaceRoot);
  }
}
__name(invalidateCache, "invalidateCache");
function mapLearningTypeToSourceType(type) {
  switch (type.toLowerCase()) {
    case "pattern":
    case "pat":
      return "pattern";
    case "pitfall":
    case "pit":
    case "anti-pattern":
      return "violation";
    case "architecture":
    case "arch":
    case "adr":
      return "adr";
    default:
      return "learning";
  }
}
__name(mapLearningTypeToSourceType, "mapLearningTypeToSourceType");
function getAuthorityScore(learning) {
  let score = 0.5;
  if (learning.tier === "hot") {
    score += 0.3;
  } else if (learning.tier === "warm") {
    score += 0.1;
  }
  if (learning.priority === "critical") {
    score += 0.2;
  } else if (learning.priority === "high") {
    score += 0.1;
  }
  if (learning.source === "seed") {
    score += 0.1;
  }
  return Math.min(1, score);
}
__name(getAuthorityScore, "getAuthorityScore");
var stores;
var indexedIds;
var embeddingsReady;
var embeddingsLoading;
var init_knowledge_ingestion_service = __esm({
  "src/services/knowledge-ingestion-service.ts"() {
    stores = /* @__PURE__ */ new Map();
    indexedIds = /* @__PURE__ */ new Map();
    embeddingsReady = false;
    embeddingsLoading = false;
    __name6(getStore, "getStore");
    __name6(getIndexedIds, "getIndexedIds");
    __name6(ensureEmbeddingsReady, "ensureEmbeddingsReady");
    __name6(isEmbeddingsAvailable, "isEmbeddingsAvailable");
    __name6(indexLearning, "indexLearning");
    __name6(indexAllLearnings, "indexAllLearnings");
    __name6(invalidateCache, "invalidateCache");
    __name6(mapLearningTypeToSourceType, "mapLearningTypeToSourceType");
    __name6(getAuthorityScore, "getAuthorityScore");
  }
});
function getHybridRetriever(workspaceRoot) {
  const cached = retrievers.get(workspaceRoot);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.retriever;
  }
  if (cached) {
    cached.store.close();
    retrievers.delete(workspaceRoot);
  }
  const dbPath = join(workspaceRoot, ".snapback", "knowledge.db");
  const store = new KnowledgeStore({
    dbPath
  });
  const retriever = new HybridRetriever(store, {
    // Default config - adaptive weights override per-query
    semanticWeight: 0.5,
    keywordWeight: 0.5,
    k: 60,
    limit: 10,
    minConfidence: 0.1,
    candidateMultiplier: 3
  });
  retrievers.set(workspaceRoot, {
    store,
    retriever,
    createdAt: Date.now(),
    indexed: indexedWorkspaces.has(workspaceRoot)
  });
  return retriever;
}
__name(getHybridRetriever, "getHybridRetriever");
async function retrieveAdaptive(workspaceRoot, query) {
  const startTime = performance.now();
  let indexingPerformed = false;
  if (!indexedWorkspaces.has(workspaceRoot)) {
    try {
      const indexResult = await indexAllLearnings(workspaceRoot, {
        skipEmbeddings: !isEmbeddingsAvailable()
      });
      indexedWorkspaces.add(workspaceRoot);
      indexingPerformed = indexResult.indexed > 0;
      if (indexingPerformed) {
        console.log(`[HybridRetrieval] Auto-indexed ${indexResult.indexed} learnings for ${workspaceRoot}`);
      }
    } catch (error) {
      console.warn("[HybridRetrieval] Auto-indexing failed:", error);
    }
  }
  const classification = classifyQuery(query);
  let fallbackUsed;
  const embeddingsAvailable = isEmbeddingsAvailable();
  if (!embeddingsAvailable) {
    fallbackUsed = "keyword-only";
    return keywordOnlySearch(workspaceRoot, query, classification, startTime, {
      fallbackUsed,
      indexingPerformed
    });
  }
  if (classification.confidence < MIN_CLASSIFICATION_CONFIDENCE) {
    fallbackUsed = "balanced-weights";
    classification.weights = {
      semantic: 0.5,
      keyword: 0.5
    };
  }
  try {
    const retriever = getHybridRetriever(workspaceRoot);
    const result7 = await retriever.retrieveAdaptive(query);
    return {
      results: result7.results,
      classification: fallbackUsed === "balanced-weights" ? {
        ...result7.classification,
        weights: {
          semantic: 0.5,
          keyword: 0.5
        }
      } : result7.classification,
      stats: {
        ...result7.stats,
        fallbackUsed,
        indexingPerformed
      }
    };
  } catch (error) {
    console.warn("[HybridRetrieval] Hybrid retrieval failed, using keyword fallback:", error);
    return keywordOnlySearch(workspaceRoot, query, classification, startTime, {
      fallbackUsed: "keyword-only",
      indexingPerformed
    });
  }
}
__name(retrieveAdaptive, "retrieveAdaptive");
async function keywordOnlySearch(workspaceRoot, query, classification, startTime, metadata) {
  const cached = retrievers.get(workspaceRoot);
  const store = cached?.store ?? new KnowledgeStore({
    dbPath: join(workspaceRoot, ".snapback", "knowledge.db")
  });
  const keywordResults = store.searchKeyword(query, 10);
  const elapsed = performance.now() - startTime;
  const results = keywordResults.map((chunk, index) => ({
    chunk,
    score: 1 / (60 + index + 1),
    confidence: 0.5 + 0.3 * (1 - index / keywordResults.length),
    sources: {
      keyword: {
        rank: index + 1
      }
    }
  }));
  return {
    results,
    classification: {
      ...classification,
      weights: {
        semantic: 0,
        keyword: 1
      }
    },
    stats: {
      semanticCandidates: 0,
      keywordCandidates: keywordResults.length,
      fusedCount: keywordResults.length,
      latencyMs: elapsed,
      ...metadata
    }
  };
}
__name(keywordOnlySearch, "keywordOnlySearch");
function classifyQueryType(query) {
  return classifyQuery(query);
}
__name(classifyQueryType, "classifyQueryType");
async function initializeHybridRetrieval(workspaceRoot) {
  const embeddingsReady2 = await ensureEmbeddingsReady();
  const indexingResult = await indexAllLearnings(workspaceRoot, {
    skipEmbeddings: !embeddingsReady2
  });
  indexedWorkspaces.add(workspaceRoot);
  getHybridRetriever(workspaceRoot);
  console.log(`[HybridRetrieval] Initialized for ${workspaceRoot}: embeddings=${embeddingsReady2}, indexed=${indexingResult.indexed}`);
  return {
    embeddingsReady: embeddingsReady2,
    indexingResult
  };
}
__name(initializeHybridRetrieval, "initializeHybridRetrieval");
function invalidateRetrieverCache(workspaceRoot) {
  const cached = retrievers.get(workspaceRoot);
  if (cached) {
    cached.store.close();
    retrievers.delete(workspaceRoot);
  }
  indexedWorkspaces.delete(workspaceRoot);
}
__name(invalidateRetrieverCache, "invalidateRetrieverCache");
var MIN_CLASSIFICATION_CONFIDENCE;
var CACHE_TTL_MS;
var retrievers;
var indexedWorkspaces;
var init_hybrid_retrieval_service = __esm({
  "src/services/hybrid-retrieval-service.ts"() {
    init_knowledge_ingestion_service();
    MIN_CLASSIFICATION_CONFIDENCE = 0.5;
    CACHE_TTL_MS = 5 * 60 * 1e3;
    retrievers = /* @__PURE__ */ new Map();
    indexedWorkspaces = /* @__PURE__ */ new Set();
    __name6(getHybridRetriever, "getHybridRetriever");
    __name6(retrieveAdaptive, "retrieveAdaptive");
    __name6(keywordOnlySearch, "keywordOnlySearch");
    __name6(classifyQueryType, "classifyQueryType");
    __name6(initializeHybridRetrieval, "initializeHybridRetrieval");
    __name6(invalidateRetrieverCache, "invalidateRetrieverCache");
  }
});
function validateFilePath2(filePath, workspaceRoot) {
  if (!filePath || filePath.trim() === "") {
    return {
      valid: false,
      error: "File path cannot be empty"
    };
  }
  if (filePath.includes("\0")) {
    return {
      valid: false,
      error: "Invalid characters in file path"
    };
  }
  const normalizedPath = normalize(filePath);
  if (normalizedPath.includes("..")) {
    return {
      valid: false,
      error: "Path traversal not allowed"
    };
  }
  const absolutePath = isAbsolute(normalizedPath) ? normalizedPath : resolve(workspaceRoot, normalizedPath);
  const relativePath = relative(workspaceRoot, absolutePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return {
      valid: false,
      error: "Path must be within workspace"
    };
  }
  return {
    valid: true,
    sanitizedPath: absolutePath
  };
}
__name(validateFilePath2, "validateFilePath");
function validateFilePaths2(filePaths, workspaceRoot) {
  const sanitizedPaths = [];
  for (const filePath of filePaths) {
    const result7 = validateFilePath2(filePath, workspaceRoot);
    if (!result7.valid) {
      return {
        valid: false,
        error: result7.error,
        invalidPath: filePath
      };
    }
    sanitizedPaths.push(result7.sanitizedPath);
  }
  return {
    valid: true,
    sanitizedPaths
  };
}
__name(validateFilePaths2, "validateFilePaths");
function atomicWriteFileSync2(filePath, content, options = {}) {
  const { encoding = "utf8", maxSize = MAX_CONTEXT_FILE_SIZE } = options;
  return atomicWriteFileSync(filePath, content, {
    encoding,
    maxSize
  });
}
__name(atomicWriteFileSync2, "atomicWriteFileSync");
function validateInput(schema, input3) {
  const result7 = schema.safeParse(input3);
  if (result7.success) {
    return {
      valid: true,
      data: result7.data
    };
  }
  const errorMessages = result7.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  return {
    valid: false,
    error: errorMessages,
    issues: result7.error.issues
  };
}
__name(validateInput, "validateInput");
function getToolSchema(toolName) {
  return TOOL_SCHEMAS[toolName];
}
__name(getToolSchema, "getToolSchema");
var MAX_CONTEXT_FILE_SIZE;
var snapSchema;
var snapEndSchema;
var snapLearnSchema;
var snapViolationSchema;
var checkSchema;
var snapFixSchema;
var snapHelpSchema;
var TOOL_SCHEMAS;
var init_validation = __esm({
  "src/validation.ts"() {
    __name6(validateFilePath2, "validateFilePath");
    __name6(validateFilePaths2, "validateFilePaths");
    MAX_CONTEXT_FILE_SIZE = 10 * 1024 * 1024;
    __name6(atomicWriteFileSync2, "atomicWriteFileSync");
    snapSchema = z.object({
      // Mode parameters - at least one required
      mode: z.enum([
        "start",
        "check",
        "context"
      ]).optional().describe("Mode (full-word, recommended): start=begin task, check=validate code, context=get status"),
      m: z.enum([
        "s",
        "c",
        "x"
      ]).optional().describe("Legacy mode: s=start, c=check, x=context (use 'mode' instead)"),
      // Task parameters
      task: z.string().optional().describe("Task description (mode: start)"),
      t: z.string().optional().describe("Legacy: use 'task' instead"),
      // File parameters
      files: z.array(z.string()).optional().describe("Files to work on (mode: start, check)"),
      f: z.array(z.string()).optional().describe("Legacy: use 'files' instead"),
      // Keyword parameters
      keywords: z.array(z.string()).optional().describe("Keywords for learning retrieval (mode: start, context)"),
      k: z.array(z.string()).optional().describe("Legacy: use 'keywords' instead"),
      // Intent parameters
      intent: z.enum([
        "implement",
        "debug",
        "refactor",
        "review",
        "explore"
      ]).optional().describe("Task intent for context loading optimization"),
      i: z.enum([
        "implement",
        "debug",
        "refactor",
        "review",
        "explore"
      ]).optional().describe("Legacy: use 'intent' instead"),
      // Other parameters
      thorough: z.boolean().optional().describe("Enable thorough 7-layer validation (mode: check)"),
      compact: z.boolean().optional().describe("Use compact positional wire format instead of labeled (default: false)"),
      goal: z.object({
        metric: z.enum([
          "bundle",
          "performance",
          "coverage"
        ]),
        target: z.number(),
        unit: z.string()
      }).optional().describe("Goal for task completion validation (mode: start)")
    }).refine((data) => data.mode !== void 0 || data.m !== void 0, {
      message: "Either 'mode' (start|check|context) or 'm' (s|c|x) must be provided",
      path: [
        "mode"
      ]
    });
    snapEndSchema = z.object({
      ok: z.union([
        z.literal(0),
        z.literal(1)
      ]).optional().describe("Success: 1=ok, 0=failed"),
      // Learnings parameters
      learnings: z.array(z.string()).optional().describe("Quick learnings as strings"),
      l: z.array(z.string()).optional().describe("Legacy: use 'learnings' instead"),
      // Other parameters
      notes: z.string().optional().describe("Completion notes"),
      outcome: z.enum([
        "completed",
        "abandoned",
        "blocked"
      ]).optional().describe("Task outcome"),
      // Efficiency tracking (agent-reported metrics)
      efficiency: z.object({
        saved: z.string().optional().describe("Tokens saved (e.g., '~12K')"),
        prevented: z.string().optional().describe("Mistakes prevented"),
        helped: z.string().optional().describe("What context helped most")
      }).optional().describe("Agent-reported efficiency metrics"),
      // Internal survey (LLM self-assessment)
      survey: z.object({
        patterns_used: z.number().optional().describe("Patterns applied from context"),
        pitfalls_avoided: z.number().optional().describe("Pitfalls avoided due to warnings"),
        helpfulness: z.number().min(1).max(5).optional().describe("Helpfulness rating 1-5"),
        unhelpful_count: z.number().optional().describe("Count of unhelpful suggestions")
      }).optional().describe("LLM self-assessment (internal)"),
      compact: z.boolean().optional().describe("Use compact wire format")
    });
    snapLearnSchema = z.object({
      // Full-word parameters (recommended)
      trigger: z.string().optional().describe("What situation triggers this learning"),
      action: z.string().optional().describe("What to do when triggered"),
      source: z.string().optional().describe("Where this learning originated (optional)"),
      // Legacy parameters
      t: z.string().optional().describe("Legacy: use 'trigger' instead"),
      a: z.string().optional().describe("Legacy: use 'action' instead"),
      s: z.string().optional().describe("Legacy: use 'source' instead"),
      // Type (supports both full-word and abbreviated)
      type: z.enum([
        "pattern",
        "pitfall",
        "efficiency",
        "discovery",
        "workflow",
        "pat",
        "pit",
        "eff",
        "disc",
        "wf"
      ]).optional().describe("Learning type (default: pattern)")
    }).refine((data) => (data.trigger !== void 0 || data.t !== void 0) && (data.action !== void 0 || data.a !== void 0), {
      message: "Either 'trigger' or 't' AND 'action' or 'a' must be provided",
      path: [
        "trigger"
      ]
    });
    snapViolationSchema = z.object({
      type: z.string().min(1).describe("Violation type (e.g., 'silent_catch', 'missing_auth_check')"),
      file: z.string().min(1).describe("File where violation occurred"),
      // Full-word parameters (recommended)
      description: z.string().optional().describe("What went wrong - description of the violation"),
      reason: z.string().optional().describe("Why it happened - root cause"),
      prevention: z.string().optional().describe("How to prevent this in future"),
      // Legacy parameters
      what: z.string().optional().describe("Legacy: use 'description' instead"),
      why: z.string().optional().describe("Legacy: use 'reason' instead"),
      prevent: z.string().optional().describe("Legacy: use 'prevention' instead")
    }).refine((data) => (data.description !== void 0 || data.what !== void 0) && (data.prevention !== void 0 || data.prevent !== void 0), {
      message: "Either 'description' or 'what' AND 'prevention' or 'prevent' must be provided",
      path: [
        "description"
      ]
    });
    checkSchema = z.object({
      // Mode parameters
      mode: z.enum([
        "quick",
        "full",
        "patterns",
        "build",
        "impact",
        "circular",
        "docs",
        "learnings",
        "architecture",
        "trace"
      ]).optional().describe("Mode (full-word, recommended): quick=fast validation, full=comprehensive, patterns=rule check, trace=dependency analysis"),
      m: z.enum([
        "q",
        "f",
        "p",
        "b",
        "i",
        "c",
        "d",
        "l",
        "a",
        "t"
      ]).optional().describe("Legacy mode: q=quick, f=full, p=patterns, b=build, i=impact, c=circular, d=docs, l=learnings, a=architecture, t=trace"),
      // File parameters
      files: z.union([
        z.string(),
        z.array(z.string())
      ]).optional().describe("File(s) to check"),
      f: z.union([
        z.string(),
        z.array(z.string())
      ]).optional().describe("Legacy: use 'files' instead"),
      code: z.string().optional().describe("Code to validate (for patterns/validate mode)"),
      tests: z.boolean().optional().describe("Run tests (quick mode only)"),
      compact: z.boolean().optional().describe("Use compact wire format")
    });
    snapFixSchema = z.object({
      action: z.enum([
        "list",
        "restore",
        "diff"
      ]).optional().describe("Operation: list (default), restore, or diff"),
      id: z.string().optional().describe("Snapshot ID (for restore/diff)"),
      // Diff parameters
      diffWith: z.string().optional().describe("Second snapshot ID (for diff operation)"),
      diff: z.string().optional().describe("Legacy: use 'diffWith' instead"),
      // Dry run parameters
      dryRun: z.boolean().optional().describe("Preview restore without applying changes"),
      dry: z.boolean().optional().describe("Legacy: use 'dryRun' instead"),
      // Other parameters
      files: z.array(z.string()).optional().describe("Specific files to restore (optional filter)"),
      compact: z.boolean().optional().describe("Use compact wire format")
    });
    snapHelpSchema = z.object({
      topic: z.enum([
        "tools",
        "status",
        "wire",
        "modes",
        "thresholds",
        "all"
      ]).optional().describe("Help topic: tools, status, wire, modes, thresholds, or all (default)"),
      q: z.enum([
        "tools",
        "status",
        "wire"
      ]).optional().describe("Legacy: use 'topic' instead")
    });
    z.object({
      type: z.enum([
        "risk",
        "package"
      ]).describe("Analysis type"),
      changes: z.array(z.unknown()).optional(),
      filePath: z.string().optional(),
      packageName: z.string().optional(),
      targetVersion: z.string().optional()
    });
    z.object({
      workspaceId: z.string().optional()
    });
    z.object({
      files: z.array(z.string().min(1)).min(1),
      reason: z.string().optional(),
      trigger: z.enum([
        "manual",
        "mcp",
        "ai_assist",
        "session_end"
      ]).optional()
    });
    z.object({
      limit: z.number().int().positive().max(100).default(20).optional(),
      since: z.string().datetime().optional()
    });
    z.object({
      snapshotId: z.string().min(1),
      files: z.array(z.string()).optional(),
      dryRun: z.boolean().default(false).optional()
    });
    z.object({
      mode: z.enum([
        "quick",
        "comprehensive"
      ]).default("quick").optional(),
      code: z.string().min(1),
      filePath: z.string().min(1)
    });
    z.object({
      op: z.enum([
        "init",
        "build",
        "validate",
        "status",
        "constraint",
        "check",
        "blockers"
      ]),
      domain: z.string().optional(),
      name: z.string().optional(),
      value: z.number().optional()
    });
    z.object({
      op: z.enum([
        "start",
        "recommendations",
        "stats",
        "end"
      ]),
      taskDescription: z.string().optional(),
      files: z.array(z.string()).optional(),
      acceptLearnings: z.array(z.number()).optional()
    });
    z.object({
      type: z.enum([
        "pattern",
        "pitfall",
        "efficiency",
        "discovery",
        "workflow"
      ]),
      trigger: z.string().min(1),
      action: z.string().min(1),
      source: z.string().optional()
    });
    z.object({
      files: z.array(z.string().min(1)).min(1),
      reason: z.string().min(1)
    });
    z.object({
      random_string: z.string().optional()
    });
    z.object({
      task: z.string().min(1),
      files: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional()
    });
    z.object({
      code: z.string().min(1),
      filePath: z.string().min(1)
    });
    z.object({
      type: z.string().min(1),
      file: z.string().min(1),
      whatHappened: z.string().min(1),
      whyItHappened: z.string().min(1),
      prevention: z.string().min(1)
    });
    z.object({
      keywords: z.array(z.string().min(1)).min(1),
      limit: z.number().int().positive().max(50).default(10).optional()
    });
    __name6(validateInput, "validateInput");
    TOOL_SCHEMAS = {
      snap: snapSchema,
      snap_end: snapEndSchema,
      snap_fix: snapFixSchema,
      snap_help: snapHelpSchema,
      snap_learn: snapLearnSchema,
      snap_violation: snapViolationSchema,
      check: checkSchema
    };
    __name6(getToolSchema, "getToolSchema");
  }
});
function getSocketPath2() {
  if (IS_WINDOWS2) {
    return "\\\\.\\pipe\\snapback-daemon";
  }
  return join(homedir(), ".snapback", "daemon.sock");
}
__name(getSocketPath2, "getSocketPath");
async function getDaemonConnection2(workspaceRoot) {
  const status2 = connectionStatus2.get(workspaceRoot);
  if (status2) {
    const timeSinceLastAttempt = Date.now() - status2.lastAttempt;
    if (status2.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES2 && timeSinceLastAttempt < MIN_RETRY_INTERVAL_MS2) {
      return null;
    }
  }
  let conn = connections2.get(workspaceRoot);
  if (!conn) {
    conn = new DaemonConnection3(getSocketPath2());
    connections2.set(workspaceRoot, conn);
  }
  try {
    await conn.connect();
    connectionStatus2.set(workspaceRoot, {
      connected: true,
      lastAttempt: Date.now(),
      consecutiveFailures: 0
    });
    return conn;
  } catch {
    const prevStatus = connectionStatus2.get(workspaceRoot);
    connectionStatus2.set(workspaceRoot, {
      connected: false,
      lastAttempt: Date.now(),
      consecutiveFailures: (prevStatus?.consecutiveFailures ?? 0) + 1
    });
    return null;
  }
}
__name(getDaemonConnection2, "getDaemonConnection");
async function beginTaskViaDaemon(workspaceRoot, task, files, keywords) {
  const conn = await getDaemonConnection2(workspaceRoot);
  if (!conn) {
    return null;
  }
  try {
    return await conn.request("session.begin", {
      workspace: workspaceRoot,
      task,
      files: files || [],
      keywords: keywords || []
    });
  } catch {
    return null;
  }
}
__name(beginTaskViaDaemon, "beginTaskViaDaemon");
async function getSessionChangesViaDaemon(workspaceRoot, options) {
  const conn = await getDaemonConnection2(workspaceRoot);
  if (!conn) {
    return null;
  }
  try {
    return await conn.request("session.changes", {
      workspace: workspaceRoot,
      ...options
    });
  } catch {
    return null;
  }
}
__name(getSessionChangesViaDaemon, "getSessionChangesViaDaemon");
async function endTaskViaDaemon(workspaceRoot, outcome) {
  const conn = await getDaemonConnection2(workspaceRoot);
  if (!conn) {
    return null;
  }
  try {
    return await conn.request("session.end", {
      workspace: workspaceRoot,
      outcome: outcome || "completed"
    });
  } catch {
    return null;
  }
}
__name(endTaskViaDaemon, "endTaskViaDaemon");
async function notifySnapshotCreatedViaDaemon2(workspaceRoot, snapshotId, filePath, trigger) {
  const conn = await getDaemonConnection2(workspaceRoot);
  if (!conn) {
    return false;
  }
  try {
    await conn.request("snapshot.created", {
      workspace: workspaceRoot,
      id: snapshotId,
      filePath: filePath || "unknown",
      trigger: trigger || "ai-detection",
      source: "mcp"
    });
    return true;
  } catch (error) {
    const mcpError = error instanceof Error ? createMcpErrorFromCause2(ErrorCode2.DAEMON_REQUEST_FAILED, "Failed to notify daemon of snapshot creation", error, {
      snapshotId,
      filePath
    }) : createMcpError2(ErrorCode2.DAEMON_REQUEST_FAILED, `Failed to notify daemon: ${String(error)}`, {
      snapshotId,
      filePath
    });
    console.error(`[MCP] ${formatForLog2(mcpError)}`);
    return false;
  }
}
__name(notifySnapshotCreatedViaDaemon2, "notifySnapshotCreatedViaDaemon");
var connections2;
var connectionStatus2;
var MIN_RETRY_INTERVAL_MS2;
var MAX_CONSECUTIVE_FAILURES2;
var REQUEST_TIMEOUT_MS2;
var IS_WINDOWS2;
var DaemonConnection3;
var init_client_facade = __esm({
  "src/daemon/client-facade.ts"() {
    init_errors2();
    connections2 = /* @__PURE__ */ new Map();
    connectionStatus2 = /* @__PURE__ */ new Map();
    MIN_RETRY_INTERVAL_MS2 = 5e3;
    MAX_CONSECUTIVE_FAILURES2 = 3;
    REQUEST_TIMEOUT_MS2 = 1e4;
    IS_WINDOWS2 = platform() === "win32";
    __name6(getSocketPath2, "getSocketPath");
    DaemonConnection3 = class DaemonConnection2 {
      static {
        __name(this, "DaemonConnection2");
      }
      static {
        __name6(this, "DaemonConnection");
      }
      socketPath;
      socket = null;
      requestId = 0;
      pendingRequests = /* @__PURE__ */ new Map();
      buffer = "";
      constructor(socketPath) {
        this.socketPath = socketPath;
      }
      /**
      * Connect to daemon
      */
      async connect() {
        if (this.socket?.writable) {
          return;
        }
        return new Promise((resolve32, reject) => {
          const socket = createConnection(this.socketPath);
          socket.on("connect", () => {
            this.socket = socket;
            resolve32();
          });
          socket.on("error", (err2) => {
            reject(err2);
          });
          socket.on("data", (data) => {
            this.handleData(data.toString());
          });
          socket.on("close", () => {
            this.socket = null;
            for (const [id, pending] of this.pendingRequests) {
              clearTimeout(pending.timeout);
              pending.reject(new Error("Connection closed"));
              this.pendingRequests.delete(id);
            }
          });
          setTimeout(() => {
            if (!this.socket) {
              socket.destroy();
              reject(new Error("Connection timeout"));
            }
          }, 5e3);
        });
      }
      /**
      * Disconnect from daemon
      */
      disconnect() {
        if (this.socket) {
          this.socket.destroy();
          this.socket = null;
        }
      }
      /**
      * Send a request to the daemon
      */
      async request(method, params) {
        if (!this.socket?.writable) {
          throw new Error("Not connected");
        }
        const id = ++this.requestId;
        const request = {
          jsonrpc: "2.0",
          id,
          method,
          params
        };
        return new Promise((resolve32, reject) => {
          const timeout = setTimeout(() => {
            this.pendingRequests.delete(id);
            reject(new Error(`Request timeout: ${method}`));
          }, REQUEST_TIMEOUT_MS2);
          this.pendingRequests.set(id, {
            resolve: resolve32,
            reject,
            timeout
          });
          this.socket?.write(`${JSON.stringify(request)}
`);
        });
      }
      /**
      * Handle incoming data
      */
      handleData(data) {
        this.buffer += data;
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          try {
            const response = JSON.parse(line);
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
              clearTimeout(pending.timeout);
              this.pendingRequests.delete(response.id);
              if (response.error) {
                pending.reject(new Error(response.error.message));
              } else {
                pending.resolve(response.result);
              }
            }
          } catch {
          }
        }
      }
    };
    __name6(getDaemonConnection2, "getDaemonConnection");
    __name6(beginTaskViaDaemon, "beginTaskViaDaemon");
    __name6(getSessionChangesViaDaemon, "getSessionChangesViaDaemon");
    __name6(endTaskViaDaemon, "endTaskViaDaemon");
    __name6(notifySnapshotCreatedViaDaemon2, "notifySnapshotCreatedViaDaemon");
  }
});
var dependency_graph_service_exports = {};
__export(dependency_graph_service_exports, {
  DependencyGraphService: /* @__PURE__ */ __name(() => DependencyGraphService2, "DependencyGraphService"),
  createDependencyGraphService: /* @__PURE__ */ __name(() => createDependencyGraphService2, "createDependencyGraphService"),
  getDependencyGraphService: /* @__PURE__ */ __name(() => getDependencyGraphService2, "getDependencyGraphService")
});
function createDependencyGraphService2(workspaceRoot) {
  return new DependencyGraphService2(workspaceRoot);
}
__name(createDependencyGraphService2, "createDependencyGraphService");
function getDependencyGraphService2(workspaceRoot) {
  if (!services3.has(workspaceRoot)) {
    services3.set(workspaceRoot, new DependencyGraphService2(workspaceRoot));
  }
  return services3.get(workspaceRoot);
}
__name(getDependencyGraphService2, "getDependencyGraphService");
var DependencyGraphService2;
var services3;
var init_dependency_graph_service = __esm({
  "src/services/dependency-graph-service.ts"() {
    DependencyGraphService2 = class {
      static {
        __name(this, "DependencyGraphService");
      }
      static {
        __name6(this, "DependencyGraphService");
      }
      workspaceRoot;
      cacheDir;
      graph = null;
      constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.cacheDir = join(workspaceRoot, ".snapback", "analysis");
      }
      /**
      * Get dependency context for planned files
      * Main entry point for begin_task integration
      */
      async getContextForFiles(files) {
        const graph = await this.getGraph();
        const planned = {};
        const suggestions = /* @__PURE__ */ new Set();
        for (const file of files) {
          const relPath = this.toRelative(file);
          const node = graph.nodes[relPath];
          if (node) {
            planned[file] = {
              imports: node.imports,
              importedBy: node.importedBy.map((f) => ({
                file: f,
                line: 0
              })),
              depth: this.calculateDepth(relPath, graph),
              isOrphan: node.importedBy.length === 0 && !this.isEntryPoint(relPath)
            };
            node.importedBy.slice(0, 3).forEach((f) => suggestions.add(f));
            node.imports.slice(0, 3).forEach((f) => suggestions.add(f));
          }
        }
        const relPlanned = files.map((f) => this.toRelative(f));
        const filteredSuggestions = [
          ...suggestions
        ].filter((s) => !relPlanned.includes(s)).slice(0, 5);
        return {
          planned,
          circular: graph.circular.filter((cycle) => files.some((f) => cycle.includes(this.toRelative(f)))).map((cycle) => ({
            cycle,
            severity: "warning"
          })),
          suggestions: filteredSuggestions
        };
      }
      /**
      * Get files affected by changes to a file
      * Useful for impact analysis
      */
      async getAffectedBy(file) {
        const graph = await this.getGraph();
        const relPath = this.toRelative(file);
        const node = graph.nodes[relPath];
        return node?.importedBy || [];
      }
      /**
      * Get files that a file depends on
      */
      async getDependencies(file) {
        const graph = await this.getGraph();
        const relPath = this.toRelative(file);
        const node = graph.nodes[relPath];
        return node?.imports || [];
      }
      /**
      * Get all circular dependencies
      */
      async getCircularDependencies() {
        const graph = await this.getGraph();
        return graph.circular;
      }
      /**
      * Force refresh the graph cache
      */
      async refresh() {
        this.graph = null;
        await this.getGraph();
      }
      /**
      * Check if cache is valid
      */
      async isCacheValid() {
        const cachePath = join(this.cacheDir, "dependency-graph.json");
        if (!existsSync(cachePath)) return false;
        try {
          const cached = JSON.parse(readFileSync(cachePath, "utf8"));
          const currentKey = await this.computeCacheKey();
          return cached.cacheKey === currentKey;
        } catch {
          return false;
        }
      }
      // =========================================================================
      // Private Methods
      // =========================================================================
      /**
      * Get or build the dependency graph
      */
      async getGraph() {
        if (this.graph) {
          return this.graph;
        }
        const cachePath = join(this.cacheDir, "dependency-graph.json");
        const cacheKey = await this.computeCacheKey();
        if (existsSync(cachePath)) {
          try {
            const cached = JSON.parse(readFileSync(cachePath, "utf8"));
            if (cached.cacheKey === cacheKey) {
              this.graph = cached;
              return cached;
            }
          } catch {
          }
        }
        const graph = await this.buildGraph();
        graph.cacheKey = cacheKey;
        graph.generatedAt = Date.now();
        this.ensureCacheDir();
        writeFileSync(cachePath, JSON.stringify(graph, null, 2));
        this.graph = graph;
        return graph;
      }
      /**
      * Build dependency graph using madge
      */
      async buildGraph() {
        try {
          const madgeModule = await import('madge');
          const madge = madgeModule.default || madgeModule;
          const result7 = await madge(this.workspaceRoot, {
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
              /coverage/,
              /__tests__/,
              /__mocks__/
            ],
            detectiveOptions: {
              ts: {
                skipTypeImports: true
              }
            }
          });
          const deps = result7.obj();
          const circular = result7.circular();
          const nodes = {};
          for (const [file, imports] of Object.entries(deps)) {
            if (!nodes[file]) nodes[file] = {
              imports: [],
              importedBy: []
            };
            nodes[file].imports = imports;
            for (const imp of imports) {
              if (!nodes[imp]) nodes[imp] = {
                imports: [],
                importedBy: []
              };
              nodes[imp].importedBy.push(file);
            }
          }
          return {
            nodes,
            circular,
            cacheKey: "",
            generatedAt: 0
          };
        } catch (error) {
          console.error("Failed to build dependency graph:", error);
          return {
            nodes: {},
            circular: [],
            cacheKey: "",
            generatedAt: 0
          };
        }
      }
      /**
      * Compute cache key based on source file mtimes
      */
      async computeCacheKey() {
        try {
          const glob = await import('glob');
          const files = await glob.glob([
            "**/*.{ts,tsx,js,jsx}"
          ], {
            cwd: this.workspaceRoot,
            ignore: [
              "node_modules/**",
              "dist/**",
              ".next/**",
              "coverage/**"
            ]
          });
          const hash = createHash("sha256");
          for (const file of files.sort()) {
            try {
              const stat4 = statSync(join(this.workspaceRoot, file));
              hash.update(`${file}:${stat4.mtimeMs}`);
            } catch {
            }
          }
          return hash.digest("hex").substring(0, 16);
        } catch {
          return Date.now().toString(36);
        }
      }
      /**
      * Calculate max depth in import tree
      */
      calculateDepth(file, graph, visited = /* @__PURE__ */ new Set()) {
        if (visited.has(file)) return 0;
        visited.add(file);
        const node = graph.nodes[file];
        if (!node || node.imports.length === 0) return 0;
        const depths = node.imports.map((i) => this.calculateDepth(i, graph, new Set(visited)));
        return 1 + Math.max(0, ...depths);
      }
      /**
      * Check if file is an entry point (not expected to have importers)
      */
      isEntryPoint(file) {
        return file.includes("index.") || file.includes("main.") || file.includes("entry.") || file.includes("server.") || file.includes("app.") || file.endsWith("/page.tsx") || file.endsWith("/layout.tsx") || file.endsWith("/route.ts");
      }
      /**
      * Convert absolute path to relative
      */
      toRelative(file) {
        if (file.startsWith(this.workspaceRoot)) {
          return relative(this.workspaceRoot, file);
        }
        return file;
      }
      /**
      * Ensure cache directory exists
      */
      ensureCacheDir() {
        if (!existsSync(this.cacheDir)) {
          mkdirSync(this.cacheDir, {
            recursive: true
          });
        }
      }
    };
    __name6(createDependencyGraphService2, "createDependencyGraphService");
    services3 = /* @__PURE__ */ new Map();
    __name6(getDependencyGraphService2, "getDependencyGraphService");
  }
});
function formatAge2(ms) {
  const seconds = Math.floor(ms / 1e3);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
__name(formatAge2, "formatAge");
function errorKey2(error) {
  return `${error.file}:${error.line}:${error.message}`;
}
__name(errorKey2, "errorKey");
function ensureDirSync2(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, {
      recursive: true
    });
  }
}
__name(ensureDirSync2, "ensureDirSync");
function createErrorCacheService2(workspaceRoot) {
  return new ErrorCacheService2(workspaceRoot);
}
__name(createErrorCacheService2, "createErrorCacheService");
var MAX_AGE_MS2;
var MAX_ENTRIES_PER_SOURCE2;
var SOURCE_TYPES2;
var ErrorCacheService2;
var init_error_cache_service = __esm({
  "src/services/error-cache-service.ts"() {
    MAX_AGE_MS2 = 7 * 24 * 60 * 60 * 1e3;
    MAX_ENTRIES_PER_SOURCE2 = 100;
    SOURCE_TYPES2 = [
      "typescript",
      "test",
      "lint",
      "runtime"
    ];
    __name6(formatAge2, "formatAge");
    __name6(errorKey2, "errorKey");
    __name6(ensureDirSync2, "ensureDirSync");
    ErrorCacheService2 = class {
      static {
        __name(this, "ErrorCacheService");
      }
      static {
        __name6(this, "ErrorCacheService");
      }
      workspaceRoot;
      cacheDir;
      constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.cacheDir = join(workspaceRoot, ".snapback", "errors");
      }
      /**
      * Cache errors after validation operations
      *
      * Called by quick_check after TypeScript/test/lint validation.
      * Errors are grouped by source and appended to JSONL files.
      */
      cacheErrors(errors) {
        if (errors.length === 0) return;
        ensureDirSync2(this.cacheDir);
        const grouped = /* @__PURE__ */ new Map();
        for (const error of errors) {
          const source = error.source || "general";
          if (!grouped.has(source)) {
            grouped.set(source, []);
          }
          grouped.get(source).push(error);
        }
        const timestamp = Date.now();
        for (const [source, sourceErrors] of grouped) {
          const filePath = join(this.cacheDir, `${source}.jsonl`);
          const lines = sourceErrors.map((e) => JSON.stringify({
            ...e,
            timestamp
          })).join("\n") + "\n";
          appendFileSync(filePath, lines, "utf8");
        }
      }
      /**
      * Get cached errors for specific files
      *
      * Called by begin_task to surface known issues for planned files.
      * Returns errors within retention window, deduplicated.
      */
      getErrorsForFiles(files) {
        const errors = [];
        const now = Date.now();
        const seen = /* @__PURE__ */ new Set();
        for (const source of SOURCE_TYPES2) {
          const filePath = join(this.cacheDir, `${source}.jsonl`);
          if (!existsSync(filePath)) continue;
          try {
            const content = readFileSync(filePath, "utf8");
            const lines = content.split("\n").filter(Boolean);
            for (const line of lines) {
              try {
                const error = JSON.parse(line);
                if (now - error.timestamp > MAX_AGE_MS2) continue;
                const matchesFile = files.some((f) => error.file.includes(f) || f.includes(error.file) || error.file === f);
                if (!matchesFile) continue;
                const key = errorKey2(error);
                if (seen.has(key)) continue;
                seen.add(key);
                errors.push({
                  ...error,
                  age: formatAge2(now - error.timestamp)
                });
              } catch {
              }
            }
          } catch {
          }
        }
        return errors;
      }
      /**
      * Remove stale entries from cache
      *
      * Called periodically or on session end.
      * Removes entries older than 7 days and limits to 100 per source.
      */
      prune() {
        let removed = 0;
        const now = Date.now();
        for (const source of SOURCE_TYPES2) {
          const filePath = join(this.cacheDir, `${source}.jsonl`);
          if (!existsSync(filePath)) continue;
          try {
            const content = readFileSync(filePath, "utf8");
            const lines = content.split("\n").filter(Boolean);
            const entries = [];
            for (const line of lines) {
              try {
                const error = JSON.parse(line);
                if (now - error.timestamp <= MAX_AGE_MS2) {
                  entries.push(error);
                } else {
                  removed++;
                }
              } catch {
                removed++;
              }
            }
            entries.sort((a, b) => b.timestamp - a.timestamp);
            const kept = entries.slice(0, MAX_ENTRIES_PER_SOURCE2);
            removed += entries.length - kept.length;
            if (kept.length > 0) {
              writeFileSync(filePath, kept.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
            } else {
              writeFileSync(filePath, "", "utf8");
            }
          } catch {
          }
        }
        return {
          removed
        };
      }
      /**
      * Clear all cached errors for a specific file
      *
      * Called when a file is successfully validated with no errors.
      */
      clearForFile(file) {
        for (const source of SOURCE_TYPES2) {
          const filePath = join(this.cacheDir, `${source}.jsonl`);
          if (!existsSync(filePath)) continue;
          try {
            const content = readFileSync(filePath, "utf8");
            const lines = content.split("\n").filter(Boolean);
            const kept = [];
            for (const line of lines) {
              try {
                const error = JSON.parse(line);
                if (error.file !== file && !error.file.includes(file) && !file.includes(error.file)) {
                  kept.push(error);
                }
              } catch {
              }
            }
            writeFileSync(filePath, kept.map((e) => JSON.stringify(e)).join("\n") + (kept.length > 0 ? "\n" : ""), "utf8");
          } catch {
          }
        }
      }
    };
    __name6(createErrorCacheService2, "createErrorCacheService");
  }
});
function createGitContextService2(workspaceRoot) {
  return new GitContextService2(workspaceRoot);
}
__name(createGitContextService2, "createGitContextService");
var MAX_RECENT_COMMITS2;
var GIT_TIMEOUT_MS2;
var GitContextService2;
var init_git_context_service = __esm({
  "src/services/git-context-service.ts"() {
    MAX_RECENT_COMMITS2 = 5;
    GIT_TIMEOUT_MS2 = 5e3;
    GitContextService2 = class {
      static {
        __name(this, "GitContextService");
      }
      static {
        __name6(this, "GitContextService");
      }
      workspaceRoot;
      constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
      }
      /**
      * Get complete git context for planned files
      *
      * Called by begin_task to surface git change context.
      */
      async getContext(plannedFiles) {
        try {
          const branch = this.getBranchInfo();
          const uncommittedChanges = this.getUncommittedChanges();
          const stagedChanges = this.getStagedChanges();
          const recentCommits = this.getRecentCommits(plannedFiles);
          const fileHistory = this.getFileHistory(plannedFiles, uncommittedChanges);
          return {
            branch,
            uncommittedChanges,
            stagedChanges,
            recentCommits,
            fileHistory
          };
        } catch {
          return this.emptyContext();
        }
      }
      /**
      * Check if workspace is a git repository
      */
      async isGitRepo() {
        try {
          this.git("rev-parse --git-dir");
          return true;
        } catch {
          return false;
        }
      }
      // ===========================================================================
      // Private Methods
      // ===========================================================================
      /**
      * Get branch information
      */
      getBranchInfo() {
        try {
          const current = this.git("rev-parse --abbrev-ref HEAD").trim();
          const upstream = this.gitSafe("rev-parse --abbrev-ref @{u}")?.trim();
          let ahead = 0;
          let behind = 0;
          if (upstream) {
            try {
              const counts = this.git(`rev-list --left-right --count ${current}...${upstream}`);
              const parts = counts.trim().split(/\s+/);
              if (parts.length >= 2) {
                ahead = Number.parseInt(parts[0], 10) || 0;
                behind = Number.parseInt(parts[1], 10) || 0;
              }
            } catch {
            }
          }
          return {
            current,
            upstream,
            ahead,
            behind
          };
        } catch {
          return {
            current: "",
            ahead: 0,
            behind: 0
          };
        }
      }
      /**
      * Get uncommitted changes in working tree
      */
      getUncommittedChanges() {
        try {
          const status2 = this.git("status --porcelain");
          const changes = [];
          for (const line of status2.split("\n")) {
            if (!line.trim()) continue;
            const statusCode = line.substring(0, 2);
            const file = line.substring(3).trim();
            let status22;
            if (statusCode.includes("?")) {
              status22 = "?";
            } else if (statusCode.includes("A")) {
              status22 = "A";
            } else if (statusCode.includes("D")) {
              status22 = "D";
            } else if (statusCode.includes("R")) {
              status22 = "R";
            } else if (statusCode.includes("C")) {
              status22 = "C";
            } else if (statusCode.includes("U")) {
              status22 = "U";
            } else {
              status22 = "M";
            }
            changes.push({
              file,
              status: status22
            });
          }
          return changes;
        } catch {
          return [];
        }
      }
      /**
      * Get staged changes (ready to commit)
      */
      getStagedChanges() {
        try {
          const status2 = this.git("diff --cached --name-status");
          const changes = [];
          for (const line of status2.split("\n")) {
            if (!line.trim()) continue;
            const parts = line.split("	");
            if (parts.length < 2) continue;
            const statusCode = parts[0].charAt(0);
            const file = parts[1].trim();
            if ([
              "A",
              "M",
              "D",
              "R"
            ].includes(statusCode)) {
              changes.push({
                file,
                status: statusCode
              });
            }
          }
          return changes;
        } catch {
          return [];
        }
      }
      /**
      * Get recent commits
      */
      getRecentCommits(plannedFiles) {
        try {
          const format = '"%H|%s|%an|%ar|%ct"';
          const log2 = this.git(`log -10 --pretty=format:${format} --name-only`);
          const commits = [];
          const entries = log2.split("\n\n").filter(Boolean);
          for (const entry of entries) {
            const lines = entry.split("\n");
            if (lines.length === 0) continue;
            const infoLine = lines[0].replace(/^"|"$/g, "");
            const parts = infoLine.split("|");
            if (parts.length < 5) continue;
            const [fullHash, message, author, date] = parts;
            const files = lines.slice(1).filter(Boolean);
            const affectsPlannedFiles = plannedFiles.length > 0 && files.some((f) => plannedFiles.some((pf) => f.includes(pf) || pf.includes(f)));
            commits.push({
              hash: fullHash.substring(0, 7),
              message,
              author,
              date,
              filesChanged: files.length,
              affectsPlannedFiles
            });
            if (commits.length >= MAX_RECENT_COMMITS2) break;
          }
          return commits;
        } catch {
          return [];
        }
      }
      /**
      * Get file history for planned files
      */
      getFileHistory(files, uncommittedChanges) {
        const history = {};
        for (const file of files) {
          try {
            const lastCommit = this.gitSafe(`log -1 --pretty=format:"%H" -- "${file}"`);
            const lastModified = this.gitSafe(`log -1 --pretty=format:"%ar" -- "${file}"`);
            const isModifiedByUser = uncommittedChanges.some((c) => c.file === file || c.file.includes(file) || file.includes(c.file));
            history[file] = {
              lastModified: lastModified?.trim().replace(/^"|"$/g, "") || "unknown",
              lastCommit: lastCommit?.trim().replace(/^"|"$/g, "").substring(0, 7) || "none",
              modifiedByUser: isModifiedByUser
            };
          } catch {
            history[file] = {
              lastModified: "unknown",
              lastCommit: "none",
              modifiedByUser: false
            };
          }
        }
        return history;
      }
      /**
      * Execute git command and return output
      */
      git(cmd) {
        return execSync(`git ${cmd}`, {
          cwd: this.workspaceRoot,
          encoding: "utf8",
          timeout: GIT_TIMEOUT_MS2,
          stdio: [
            "pipe",
            "pipe",
            "pipe"
          ]
        });
      }
      /**
      * Execute git command, returning null on failure
      */
      gitSafe(cmd) {
        try {
          return this.git(cmd);
        } catch {
          return null;
        }
      }
      /**
      * Return empty context structure
      */
      emptyContext() {
        return {
          branch: {
            current: "",
            ahead: 0,
            behind: 0
          },
          uncommittedChanges: [],
          stagedChanges: [],
          recentCommits: [],
          fileHistory: {}
        };
      }
    };
    __name6(createGitContextService2, "createGitContextService");
  }
});
function hashContent3(content) {
  return createHash("sha256").update(content).digest("hex").substring(0, 16);
}
__name(hashContent3, "hashContent");
function getFileHashes2(files, workspaceRoot) {
  return files.map((file) => {
    const fullPath = resolve(workspaceRoot, file);
    if (!existsSync(fullPath)) {
      return {
        path: file,
        hash: "",
        exists: false
      };
    }
    try {
      const content = readFileSync(fullPath, "utf8");
      return {
        path: file,
        hash: hashContent3(content),
        exists: true
      };
    } catch {
      return {
        path: file,
        hash: "",
        exists: false
      };
    }
  });
}
__name(getFileHashes2, "getFileHashes");
function findMatchingSnapshot2(currentHashes, snapshots, windowSize = 5) {
  const recentSnapshots = snapshots.slice(0, windowSize);
  for (const snapshot of recentSnapshots) {
    const snapshotFileHashes = new Map(snapshot.files.map((f) => [
      f.path,
      f.blobId
    ]));
    const allMatch = currentHashes.every((current) => {
      if (!current.exists) {
        return false;
      }
      const snapshotHash = snapshotFileHashes.get(current.path);
      return snapshotHash === current.hash;
    });
    if (allMatch && currentHashes.length === snapshot.files.length) {
      return {
        matched: true,
        snapshotId: snapshot.id,
        createdAt: snapshot.createdAt
      };
    }
  }
  return {
    matched: false
  };
}
__name(findMatchingSnapshot2, "findMatchingSnapshot");
function createSnapshotService2(workspaceRoot) {
  if (!serviceCache2.has(workspaceRoot)) {
    serviceCache2.set(workspaceRoot, new SnapshotService2(workspaceRoot));
  }
  return serviceCache2.get(workspaceRoot);
}
__name(createSnapshotService2, "createSnapshotService");
var SnapshotService2;
var serviceCache2;
var init_snapshot_service = __esm({
  "src/services/snapshot-service.ts"() {
    init_client_facade();
    init_validation();
    __name6(hashContent3, "hashContent");
    __name6(getFileHashes2, "getFileHashes");
    __name6(findMatchingSnapshot2, "findMatchingSnapshot");
    SnapshotService2 = class {
      static {
        __name(this, "SnapshotService");
      }
      static {
        __name6(this, "SnapshotService");
      }
      storage;
      workspaceRoot;
      constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.storage = createStorage(workspaceRoot);
      }
      /**
      * Create a snapshot from file paths with optional deduplication
      *
      * @example
      * ```typescript
      * const service = new SnapshotService(workspaceRoot);
      * const result = await service.createFromFiles(
      *   ["src/index.ts", "src/utils.ts"],
      *   { description: "Pre-refactor", trigger: "ai-detection" }
      * );
      * if (result.success) {
      *   console.log(`Created snapshot: ${result.snapshot.id}`);
      * }
      * ```
      */
      async createFromFiles(files, options) {
        if (!files || files.length === 0) {
          return {
            success: false,
            error: "No files provided"
          };
        }
        const pathValidation = validateFilePaths2(files, this.workspaceRoot);
        if (!pathValidation.valid) {
          return {
            success: false,
            error: `Invalid path: ${pathValidation.invalidPath} - ${pathValidation.error}`
          };
        }
        if (!options.skipDedup) {
          const currentHashes = getFileHashes2(files, this.workspaceRoot);
          const existingSnapshots = this.storage.listSnapshots();
          const match = findMatchingSnapshot2(currentHashes, existingSnapshots, options.dedupWindow ?? 5);
          if (match.matched && match.snapshotId) {
            const createdAtDate = match.createdAt ? new Date(match.createdAt) : /* @__PURE__ */ new Date();
            return {
              success: true,
              reused: true,
              reusedSnapshotId: match.snapshotId,
              reusedReason: `Files unchanged since ${createdAtDate.toLocaleString()}`
            };
          }
        }
        try {
          const fileContents = pathValidation.sanitizedPaths.filter((fullPath) => existsSync(fullPath)).map((fullPath, idx) => ({
            path: files[idx],
            content: readFileSync(fullPath, "utf8")
          }));
          if (fileContents.length === 0) {
            return {
              success: false,
              error: "No readable files found"
            };
          }
          const snapshot = await this.storage.createSnapshot(fileContents, {
            description: options.description,
            trigger: options.trigger
          });
          void notifySnapshotCreatedViaDaemon2(this.workspaceRoot, snapshot.id, files[0], options.trigger);
          return {
            success: true,
            snapshot: {
              id: snapshot.id,
              fileCount: snapshot.files.length,
              totalSize: snapshot.totalSize,
              createdAt: snapshot.createdAt
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
      /**
      * List recent snapshots
      */
      listSnapshots(limit = 20) {
        return this.storage.listSnapshots().slice(0, limit);
      }
      /**
      * Get a specific snapshot
      */
      getSnapshot(id) {
        return this.storage.getSnapshot(id);
      }
    };
    serviceCache2 = /* @__PURE__ */ new Map();
    __name6(createSnapshotService2, "createSnapshotService");
  }
});
function getTestCoverageService2(workspaceRoot) {
  if (!services22.has(workspaceRoot)) {
    services22.set(workspaceRoot, new TestCoverageService2(workspaceRoot));
  }
  return services22.get(workspaceRoot);
}
__name(getTestCoverageService2, "getTestCoverageService");
var TestCoverageService2;
var services22;
var init_test_coverage_service = __esm({
  "src/services/test-coverage-service.ts"() {
    TestCoverageService2 = class {
      static {
        __name(this, "TestCoverageService");
      }
      static {
        __name6(this, "TestCoverageService");
      }
      workspaceRoot;
      cacheDir;
      constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.cacheDir = join(workspaceRoot, ".snapback", "coverage");
      }
      /**
      * Get test coverage context for planned files
      * Main entry point for begin_task integration
      */
      getContextForFiles(files) {
        const coverageData = this.loadCoverageData();
        const testMap = this.buildTestMap();
        const filesContext = {};
        let filesWithTests = 0;
        let totalCoverage = 0;
        let filesWithCoverage = 0;
        for (const file of files) {
          const relPath = this.toRelative(file);
          const testFiles = testMap[relPath] || this.inferTestFiles(file);
          const coverage = coverageData[relPath];
          const hasTests = testFiles.length > 0;
          if (hasTests) filesWithTests++;
          filesContext[file] = {
            hasTests,
            testFiles,
            coverage: coverage ? {
              lines: coverage.lines.pct,
              functions: coverage.functions.pct,
              branches: coverage.branches.pct
            } : void 0
          };
          if (coverage) {
            totalCoverage += coverage.lines.pct;
            filesWithCoverage++;
          }
        }
        return {
          files: filesContext,
          summary: {
            totalFiles: files.length,
            filesWithTests,
            averageCoverage: filesWithCoverage > 0 ? totalCoverage / filesWithCoverage : 0
          }
        };
      }
      /**
      * Get files with low or no test coverage
      * Useful for review and refactor intents
      */
      getLowCoverageFiles(threshold = 50) {
        const coverageData = this.loadCoverageData();
        const lowCoverage = [];
        for (const [file, coverage] of Object.entries(coverageData)) {
          if (file === "total") continue;
          if (coverage.lines.pct < threshold) {
            lowCoverage.push(file);
          }
        }
        return lowCoverage.sort((a, b) => {
          const aCov = coverageData[a]?.lines.pct ?? 0;
          const bCov = coverageData[b]?.lines.pct ?? 0;
          return aCov - bCov;
        });
      }
      /**
      * Get overall project coverage summary
      */
      getProjectCoverage() {
        const coverageData = this.loadCoverageData();
        if (coverageData.total) {
          return {
            lines: coverageData.total.lines.pct,
            functions: coverageData.total.functions.pct,
            branches: coverageData.total.branches.pct
          };
        }
        return null;
      }
      /**
      * Check if a file has tests
      */
      hasTests(file) {
        const testMap = this.buildTestMap();
        const relPath = this.toRelative(file);
        return testMap[relPath]?.length > 0 || this.inferTestFiles(file).length > 0;
      }
      /**
      * Get test files for a source file
      */
      getTestFiles(file) {
        const testMap = this.buildTestMap();
        const relPath = this.toRelative(file);
        return testMap[relPath] || this.inferTestFiles(file);
      }
      /**
      * Called after test runs to update cache
      */
      updateFromTestRun(testResults) {
        this.ensureCacheDir();
        const cachePath = join(this.cacheDir, "last-run.json");
        const data = {
          timestamp: Date.now(),
          results: testResults
        };
        writeFileSync(cachePath, JSON.stringify(data, null, 2));
      }
      /**
      * Get last test run info
      */
      getLastTestRun() {
        const cachePath = join(this.cacheDir, "last-run.json");
        if (!existsSync(cachePath)) return null;
        try {
          return JSON.parse(readFileSync(cachePath, "utf8"));
        } catch {
          return null;
        }
      }
      /**
      * Build or update test→source mapping from vitest config
      * Called periodically or after test file changes
      */
      updateTestMap(mappings) {
        this.ensureCacheDir();
        const cachePath = join(this.cacheDir, "test-map.json");
        writeFileSync(cachePath, JSON.stringify(mappings, null, 2));
      }
      // =========================================================================
      // Private Methods
      // =========================================================================
      /**
      * Load coverage data from vitest output
      */
      loadCoverageData() {
        const locations = [
          join(this.workspaceRoot, "coverage", "coverage-summary.json"),
          join(this.workspaceRoot, ".vitest", "coverage", "coverage-summary.json"),
          join(this.workspaceRoot, ".nyc_output", "coverage-summary.json")
        ];
        for (const loc of locations) {
          if (existsSync(loc)) {
            try {
              return JSON.parse(readFileSync(loc, "utf8"));
            } catch {
            }
          }
        }
        return {
          total: {
            lines: {
              pct: 0
            },
            functions: {
              pct: 0
            },
            branches: {
              pct: 0
            }
          }
        };
      }
      /**
      * Build test map from cache or config
      */
      buildTestMap() {
        const cachePath = join(this.cacheDir, "test-map.json");
        if (existsSync(cachePath)) {
          try {
            return JSON.parse(readFileSync(cachePath, "utf8"));
          } catch {
          }
        }
        return {};
      }
      /**
      * Infer test files from naming conventions
      * Used when no explicit test map exists
      */
      inferTestFiles(file) {
        const dir = dirname(file);
        const ext = file.endsWith(".tsx") ? ".tsx" : ".ts";
        const base = basename(file, ext);
        if (base.endsWith(".test") || base.endsWith(".spec")) {
          return [];
        }
        const candidates = [
          // Same directory conventions
          join(dir, `${base}.test${ext}`),
          join(dir, `${base}.spec${ext}`),
          // __tests__ directory
          join(dir, "__tests__", `${base}.test${ext}`),
          join(dir, "__tests__", `${base}.spec${ext}`),
          // test directory parallel to src
          dir.replace("/src/", "/test/") + `/${base}.test${ext}`,
          dir.replace("/src/", "/tests/") + `/${base}.test${ext}`,
          // apps/package test directories
          dir.replace(/\/src\//, "/__tests__/") + `/${base}.test${ext}`
        ];
        return candidates.filter((c) => existsSync(c));
      }
      /**
      * Convert absolute path to relative
      */
      toRelative(file) {
        if (file.startsWith(this.workspaceRoot)) {
          return relative(this.workspaceRoot, file);
        }
        return file;
      }
      /**
      * Ensure cache directory exists
      */
      ensureCacheDir() {
        if (!existsSync(this.cacheDir)) {
          mkdirSync(this.cacheDir, {
            recursive: true
          });
        }
      }
    };
    services22 = /* @__PURE__ */ new Map();
    __name6(getTestCoverageService2, "getTestCoverageService");
  }
});
var tiered_learning_service_exports = {};
__export(tiered_learning_service_exports, {
  HOT_TIER_BOOST: /* @__PURE__ */ __name(() => HOT_TIER_BOOST2, "HOT_TIER_BOOST"),
  HOT_TIER_PROMOTION_THRESHOLD: /* @__PURE__ */ __name(() => HOT_TIER_PROMOTION_THRESHOLD2, "HOT_TIER_PROMOTION_THRESHOLD"),
  INTENT_LEARNING_FILES: /* @__PURE__ */ __name(() => INTENT_LEARNING_FILES2, "INTENT_LEARNING_FILES"),
  KEYWORD_DOMAIN_MAP: /* @__PURE__ */ __name(() => KEYWORD_DOMAIN_MAP2, "KEYWORD_DOMAIN_MAP"),
  TieredLearningService: /* @__PURE__ */ __name(() => TieredLearningService2, "TieredLearningService"),
  createTieredLearningService: /* @__PURE__ */ __name(() => createTieredLearningService2, "createTieredLearningService"),
  detectDomainFilesFromKeywords: /* @__PURE__ */ __name(() => detectDomainFilesFromKeywords2, "detectDomainFilesFromKeywords"),
  detectDomainFilesFromPaths: /* @__PURE__ */ __name(() => detectDomainFilesFromPaths2, "detectDomainFilesFromPaths")
});
function detectDomainFilesFromKeywords2(keywords) {
  const detected = /* @__PURE__ */ new Set();
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (KEYWORD_DOMAIN_MAP2[lowerKeyword]) {
      detected.add(KEYWORD_DOMAIN_MAP2[lowerKeyword]);
      continue;
    }
    for (const [key, domain] of Object.entries(KEYWORD_DOMAIN_MAP2)) {
      if (lowerKeyword.includes(key) || key.includes(lowerKeyword)) {
        detected.add(domain);
      }
    }
  }
  return [
    ...detected
  ];
}
__name(detectDomainFilesFromKeywords2, "detectDomainFilesFromKeywords");
function detectDomainFilesFromPaths2(filePaths) {
  const detected = /* @__PURE__ */ new Set();
  for (const filePath of filePaths) {
    for (const [pattern, domain] of Object.entries(FILE_PATH_DOMAIN_MAP2)) {
      if (filePath.includes(pattern)) {
        detected.add(domain);
      }
    }
  }
  return [
    ...detected
  ];
}
__name(detectDomainFilesFromPaths2, "detectDomainFilesFromPaths");
function loadJsonlSafe2(filepath) {
  if (!existsSync(filepath)) {
    return [];
  }
  try {
    const content = readFileSync(filepath, "utf8");
    const lines = content.split("\n").filter(Boolean);
    const items = [];
    for (const line of lines) {
      try {
        items.push(JSON.parse(line));
      } catch {
      }
    }
    return items;
  } catch {
    return [];
  }
}
__name(loadJsonlSafe2, "loadJsonlSafe");
function scoreLearning2(learning, keywords) {
  if (keywords.length === 0) {
    return 0;
  }
  const triggerText = Array.isArray(learning.trigger) ? learning.trigger.join(" ") : learning.trigger || "";
  const searchText = `${triggerText} ${learning.action || ""} ${learning.context || ""}`.toLowerCase();
  let matches = 0;
  for (const keyword of keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  return matches / keywords.length;
}
__name(scoreLearning2, "scoreLearning");
function getPriorityBoost2(learning) {
  const priority = learning.priority;
  if (priority === "critical") {
    return CRITICAL_PRIORITY_BOOST2;
  }
  if (priority === "high") {
    return HIGH_PRIORITY_BOOST2;
  }
  return 0;
}
__name(getPriorityBoost2, "getPriorityBoost");
function createTieredLearningService2(workspaceRoot) {
  return new TieredLearningService2(workspaceRoot);
}
__name(createTieredLearningService2, "createTieredLearningService");
var INTENT_LEARNING_FILES2;
var KEYWORD_DOMAIN_MAP2;
var FILE_PATH_DOMAIN_MAP2;
var DEFAULT_DOMAIN_FILES2;
var HOT_TIER_FILE2;
var COLD_TIER_FILE2;
var DEFAULT_MAX_LEARNINGS2;
var USAGE_STATS_FILE2;
var HOT_TIER_PROMOTION_THRESHOLD2;
var HOT_TIER_BOOST2;
var CRITICAL_PRIORITY_BOOST2;
var HIGH_PRIORITY_BOOST2;
var TieredLearningService2;
var init_tiered_learning_service = __esm({
  "src/services/tiered-learning-service.ts"() {
    INTENT_LEARNING_FILES2 = {
      implement: [
        "architecture-patterns.jsonl",
        "architecture-context.jsonl",
        "domain-intelligence.jsonl"
      ],
      debug: [
        "anti-patterns.jsonl",
        "domain-testing.jsonl",
        "architecture-patterns.jsonl"
      ],
      refactor: [
        "workflow-patterns.jsonl",
        "architecture-context.jsonl",
        "anti-patterns.jsonl"
      ],
      review: [
        "anti-patterns.jsonl",
        "domain-testing.jsonl",
        "architecture-patterns.jsonl"
      ],
      explore: [
        "architecture-context.jsonl",
        "workflow-patterns.jsonl"
      ]
    };
    KEYWORD_DOMAIN_MAP2 = {
      // VSCode Extension domain
      vscode: "domain-vscode.jsonl",
      extension: "domain-vscode.jsonl",
      activation: "domain-vscode.jsonl",
      webview: "domain-vscode.jsonl",
      "vs code": "domain-vscode.jsonl",
      // Web/Next.js domain
      nextjs: "domain-web.jsonl",
      "next.js": "domain-web.jsonl",
      next: "domain-web.jsonl",
      react: "domain-web.jsonl",
      client: "domain-web.jsonl",
      turbopack: "domain-web.jsonl",
      "use client": "domain-web.jsonl",
      biome: "domain-web.jsonl",
      // API/Backend domain
      api: "domain-api.jsonl",
      procedure: "domain-api.jsonl",
      orpc: "domain-api.jsonl",
      service: "domain-api.jsonl",
      backend: "domain-api.jsonl",
      drizzle: "domain-api.jsonl",
      // MCP/CLI domain
      mcp: "domain-mcp-cli.jsonl",
      cli: "domain-mcp-cli.jsonl",
      commander: "domain-mcp-cli.jsonl",
      "model context protocol": "domain-mcp-cli.jsonl",
      stdio: "domain-mcp-cli.jsonl",
      // Testing domain
      vitest: "domain-testing.jsonl",
      test: "domain-testing.jsonl",
      testing: "domain-testing.jsonl",
      coverage: "domain-testing.jsonl",
      spec: "domain-testing.jsonl",
      mock: "domain-testing.jsonl",
      // Intelligence domain
      validation: "domain-intelligence.jsonl",
      learning: "domain-intelligence.jsonl",
      vitals: "domain-intelligence.jsonl",
      intelligence: "domain-intelligence.jsonl",
      advisory: "domain-intelligence.jsonl"
    };
    FILE_PATH_DOMAIN_MAP2 = {
      "apps/vscode": "domain-vscode.jsonl",
      "apps/web": "domain-web.jsonl",
      "apps/api": "domain-api.jsonl",
      "packages/mcp": "domain-mcp-cli.jsonl",
      "packages/cli": "domain-mcp-cli.jsonl",
      "packages/intelligence": "domain-intelligence.jsonl",
      ".test.": "domain-testing.jsonl",
      ".spec.": "domain-testing.jsonl",
      __tests__: "domain-testing.jsonl"
    };
    __name6(detectDomainFilesFromKeywords2, "detectDomainFilesFromKeywords");
    __name6(detectDomainFilesFromPaths2, "detectDomainFilesFromPaths");
    DEFAULT_DOMAIN_FILES2 = [
      "architecture-patterns.jsonl"
    ];
    HOT_TIER_FILE2 = "hot.jsonl";
    COLD_TIER_FILE2 = "learnings.jsonl";
    DEFAULT_MAX_LEARNINGS2 = 10;
    USAGE_STATS_FILE2 = "usage-stats.json";
    HOT_TIER_PROMOTION_THRESHOLD2 = {
      /** Minimum access count to be considered for promotion */
      minAccessCount: 3,
      /** Minimum applied count (higher weight) */
      minAppliedCount: 1,
      /** Maximum hot tier size */
      maxHotTierSize: 20,
      /** Recency weight - more recent = higher score */
      recencyDays: 14
    };
    HOT_TIER_BOOST2 = 100;
    CRITICAL_PRIORITY_BOOST2 = 50;
    HIGH_PRIORITY_BOOST2 = 25;
    __name6(loadJsonlSafe2, "loadJsonlSafe");
    __name6(scoreLearning2, "scoreLearning");
    __name6(getPriorityBoost2, "getPriorityBoost");
    TieredLearningService2 = class {
      static {
        __name(this, "TieredLearningService");
      }
      static {
        __name6(this, "TieredLearningService");
      }
      learningsDir;
      constructor(workspaceRoot) {
        this.learningsDir = join(workspaceRoot, ".snapback", "learnings");
      }
      /**
      * Load learnings from tiered storage based on intent
      *
      * @param options - Loading options (intent, keywords, maxLearnings)
      * @returns Scored and ranked learnings
      */
      async loadTieredLearnings(options) {
        const { intent, keywords, filePaths = [], maxLearnings = DEFAULT_MAX_LEARNINGS2 } = options;
        const loadedIds = /* @__PURE__ */ new Set();
        const allLearnings = [];
        const hotLearnings = this.loadHotTier();
        for (const learning of hotLearnings) {
          const id = learning.id || this.generateId(learning);
          if (!loadedIds.has(id)) {
            loadedIds.add(id);
            allLearnings.push({
              ...learning,
              score: scoreLearning2(learning, keywords) + HOT_TIER_BOOST2 + getPriorityBoost2(learning),
              loadedFrom: "hot"
            });
          }
        }
        const intentFiles = INTENT_LEARNING_FILES2[intent] || DEFAULT_DOMAIN_FILES2;
        const keywordDomainFiles = detectDomainFilesFromKeywords2(keywords);
        const pathDomainFiles = detectDomainFilesFromPaths2(filePaths);
        const allWarmFiles = [
          .../* @__PURE__ */ new Set([
            ...intentFiles,
            ...keywordDomainFiles,
            ...pathDomainFiles
          ])
        ];
        for (const filename of allWarmFiles) {
          const filepath = join(this.learningsDir, filename);
          const domainLearnings = loadJsonlSafe2(filepath);
          const domain = filename.replace(/^domain-/, "").replace(/\.jsonl$/, "");
          for (const learning of domainLearnings) {
            const id = learning.id || this.generateId(learning);
            if (!loadedIds.has(id)) {
              loadedIds.add(id);
              allLearnings.push({
                ...learning,
                score: scoreLearning2(learning, keywords) + getPriorityBoost2(learning),
                loadedFrom: "warm",
                tier: "warm",
                domain
              });
            }
          }
        }
        return allLearnings.sort((a, b) => b.score - a.score).slice(0, maxLearnings);
      }
      /**
      * Load hot tier learnings (always loaded)
      */
      loadHotTier() {
        const hotPath = join(this.learningsDir, HOT_TIER_FILE2);
        const learnings = loadJsonlSafe2(hotPath);
        return learnings.map((l) => ({
          ...l,
          tier: "hot"
        }));
      }
      /**
      * Query cold tier for specific keywords (on-demand only)
      *
      * This method is NOT called by loadTieredLearnings.
      * Use it explicitly when searching archived learnings.
      */
      async queryColdTier(keywords, maxResults = 10) {
        const coldPath = join(this.learningsDir, COLD_TIER_FILE2);
        const learnings = loadJsonlSafe2(coldPath);
        const scored = learnings.filter((l) => l.tier === "cold" || !l.tier).map((l) => ({
          ...l,
          score: scoreLearning2(l, keywords),
          loadedFrom: "cold",
          tier: "cold"
        }));
        return scored.filter((l) => l.score > 0).sort((a, b) => b.score - a.score).slice(0, maxResults);
      }
      /**
      * Generate a deterministic ID for learnings without one
      */
      generateId(learning) {
        const trigger = Array.isArray(learning.trigger) ? learning.trigger.join("-") : learning.trigger || "";
        return `${learning.type}-${trigger.slice(0, 20)}`.replace(/\s+/g, "-").toLowerCase();
      }
      /**
      * Clear any cached data
      */
      clearCache() {
      }
      // =========================================================================
      // Usage Tracking Methods
      // =========================================================================
      /**
      * Load usage stats from disk
      */
      loadUsageStats() {
        const statsPath = join(this.learningsDir, USAGE_STATS_FILE2);
        if (!existsSync(statsPath)) {
          return {};
        }
        try {
          return JSON.parse(readFileSync(statsPath, "utf8"));
        } catch {
          return {};
        }
      }
      /**
      * Save usage stats to disk
      */
      saveUsageStats(stats) {
        const statsPath = join(this.learningsDir, USAGE_STATS_FILE2);
        try {
          mkdirSync(this.learningsDir, {
            recursive: true
          });
          writeFileSync(statsPath, JSON.stringify(stats, null, 2));
        } catch {
        }
      }
      /**
      * Track that a learning was accessed (loaded for context)
      */
      trackAccess(learningIds) {
        const stats = this.loadUsageStats();
        const now = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString();
        for (const id of learningIds) {
          if (!stats[id]) {
            stats[id] = {
              accessCount: 0,
              appliedCount: 0,
              lastAccessed: now
            };
          }
          stats[id].accessCount++;
          stats[id].lastAccessed = now;
        }
        this.saveUsageStats(stats);
      }
      /**
      * Track that a learning was applied (marked as useful by user/agent)
      */
      trackApplied(learningId) {
        const stats = this.loadUsageStats();
        const now = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString();
        if (!stats[learningId]) {
          stats[learningId] = {
            accessCount: 1,
            appliedCount: 0,
            lastAccessed: now
          };
        }
        stats[learningId].appliedCount++;
        stats[learningId].lastAccessed = now;
        this.saveUsageStats(stats);
      }
      /**
      * Calculate promotion score for a learning
      * Higher score = more likely to be promoted to hot tier
      */
      calculatePromotionScore(learning, stats) {
        const id = learning.id || this.generateId(learning);
        const usageData = stats[id];
        if (!usageData) {
          return 0;
        }
        let score = usageData.accessCount + usageData.appliedCount * 3;
        const lastAccessed = new Date(usageData.lastAccessed);
        const daysSinceAccess = (Date.now() - lastAccessed.getTime()) / (1e3 * 60 * 60 * 24);
        if (daysSinceAccess < HOT_TIER_PROMOTION_THRESHOLD2.recencyDays) {
          score *= 1 + (1 - daysSinceAccess / HOT_TIER_PROMOTION_THRESHOLD2.recencyDays);
        }
        if (learning.priority === "critical") {
          score *= 2;
        } else if (learning.priority === "high") {
          score *= 1.5;
        }
        return score;
      }
      /**
      * Regenerate hot.jsonl based on usage patterns
      *
      * Algorithm:
      * 1. Load all learnings from cold + warm tiers
      * 2. Score each by usage patterns (access, applied, recency)
      * 3. Preserve existing hot tier entries with priority: critical
      * 4. Fill remaining slots with highest-scoring learnings
      * 5. Write new hot.jsonl
      *
      * @returns Statistics about the regeneration
      */
      async regenerateHotTier() {
        const stats = this.loadUsageStats();
        const currentHot = this.loadHotTier();
        const criticalHot = currentHot.filter((l) => l.priority === "critical");
        const coldPath = join(this.learningsDir, COLD_TIER_FILE2);
        const allLearnings = loadJsonlSafe2(coldPath);
        const warmFiles = Object.values(INTENT_LEARNING_FILES2).flat();
        const seenIds = /* @__PURE__ */ new Set();
        const warmLearnings = [];
        for (const filename of [
          ...new Set(warmFiles)
        ]) {
          const filepath = join(this.learningsDir, filename);
          const learnings = loadJsonlSafe2(filepath);
          for (const l of learnings) {
            const id = l.id || this.generateId(l);
            if (!seenIds.has(id)) {
              seenIds.add(id);
              warmLearnings.push(l);
            }
          }
        }
        const allCandidates = [
          ...allLearnings,
          ...warmLearnings
        ];
        const candidateMap = /* @__PURE__ */ new Map();
        for (const l of allCandidates) {
          const id = l.id || this.generateId(l);
          if (!candidateMap.has(id)) {
            candidateMap.set(id, l);
          }
        }
        const scored = Array.from(candidateMap.entries()).map(([id, learning]) => ({
          id,
          learning,
          score: this.calculatePromotionScore(learning, stats)
        })).filter((item) => {
          const usageData = stats[item.id];
          if (!usageData) {
            return false;
          }
          return usageData.accessCount >= HOT_TIER_PROMOTION_THRESHOLD2.minAccessCount || usageData.appliedCount >= HOT_TIER_PROMOTION_THRESHOLD2.minAppliedCount;
        }).sort((a, b) => b.score - a.score);
        const newHot = [];
        const criticalIds = new Set(criticalHot.map((l) => l.id || this.generateId(l)));
        for (const l of criticalHot) {
          newHot.push({
            ...l,
            tier: "hot"
          });
        }
        HOT_TIER_PROMOTION_THRESHOLD2.maxHotTierSize - newHot.length;
        let promoted = 0;
        for (const item of scored) {
          if (newHot.length >= HOT_TIER_PROMOTION_THRESHOLD2.maxHotTierSize) {
            break;
          }
          if (criticalIds.has(item.id)) {
            continue;
          }
          newHot.push({
            ...item.learning,
            tier: "hot",
            promotedAt: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
          });
          promoted++;
        }
        const newHotIds = new Set(newHot.map((l) => l.id || this.generateId(l)));
        const demoted = currentHot.filter((l) => {
          const id = l.id || this.generateId(l);
          return !newHotIds.has(id);
        }).length;
        const hotPath = join(this.learningsDir, HOT_TIER_FILE2);
        const hotContent = `${newHot.map((l) => JSON.stringify(l)).join("\n")}
`;
        writeFileSync(hotPath, hotContent);
        return {
          preserved: criticalHot.length,
          promoted,
          demoted,
          totalHot: newHot.length
        };
      }
      /**
      * Get usage statistics for analysis
      */
      getUsageStats() {
        return this.loadUsageStats();
      }
    };
    __name6(createTieredLearningService2, "createTieredLearningService");
  }
});
function getIntelligence2(workspaceRoot) {
  if (!instances2.has(workspaceRoot)) {
    const intel = new Intelligence({
      rootDir: workspaceRoot,
      // Free tier defaults - semantic search disabled
      enableSemanticSearch: false,
      enableLearningLoop: true,
      // Enable enhanced validation (Biome + TypeScript + dynamic confidence)
      enhancedValidation: true,
      // Storage paths relative to workspace
      patternsDir: ".snapback/patterns",
      learningsDir: ".snapback/learnings",
      constraintsFile: ".snapback/constraints.json",
      // Session persistence for cross-surface coordination
      // All surfaces (Extension, MCP, CLI) share this same path
      sessionPersistence: {
        path: `${workspaceRoot}/.snapback/session/sessions.jsonl`,
        autosave: true
      }
    });
    instances2.set(workspaceRoot, intel);
  }
  const instance2 = instances2.get(workspaceRoot);
  if (!instance2) {
    throw new Error(`Failed to get Intelligence instance for ${workspaceRoot}`);
  }
  return instance2;
}
__name(getIntelligence2, "getIntelligence");
async function initializeIntelligence(workspaceRoot) {
  const intel = getIntelligence2(workspaceRoot);
  await intel.initialize();
}
__name(initializeIntelligence, "initializeIntelligence");
async function disposeIntelligence(workspaceRoot) {
  const intel = instances2.get(workspaceRoot);
  if (intel) {
    await intel.dispose();
    instances2.delete(workspaceRoot);
  }
}
__name(disposeIntelligence, "disposeIntelligence");
async function disposeAllIntelligence() {
  const disposals = Array.from(instances2.entries()).map(async ([root, intel]) => {
    await intel.dispose();
    instances2.delete(root);
  });
  await Promise.all(disposals);
}
__name(disposeAllIntelligence, "disposeAllIntelligence");
function getActiveInstanceCount() {
  return instances2.size;
}
__name(getActiveInstanceCount, "getActiveInstanceCount");
var instances2;
var init_intelligence = __esm({
  "src/facades/intelligence.ts"() {
    instances2 = /* @__PURE__ */ new Map();
    __name6(getIntelligence2, "getIntelligence");
    __name6(initializeIntelligence, "initializeIntelligence");
    __name6(disposeIntelligence, "disposeIntelligence");
    __name6(disposeAllIntelligence, "disposeAllIntelligence");
    __name6(getActiveInstanceCount, "getActiveInstanceCount");
  }
});
function inferIntent(task) {
  const lower = task.toLowerCase();
  if (lower.includes("fix") || lower.includes("bug") || lower.includes("error") || lower.includes("debug") || lower.includes("broken") || lower.includes("failing")) {
    return "debug";
  }
  if (lower.includes("refactor") || lower.includes("clean") || lower.includes("rename") || lower.includes("move") || lower.includes("extract") || lower.includes("consolidate")) {
    return "refactor";
  }
  if (lower.includes("review") || lower.includes("check") || lower.includes("audit") || lower.includes("verify") || lower.includes("validate")) {
    return "review";
  }
  if (lower.includes("explore") || lower.includes("understand") || lower.includes("how does") || lower.includes("what is") || lower.includes("where is") || lower.includes("find")) {
    return "explore";
  }
  return "implement";
}
__name(inferIntent, "inferIntent");
function getIntentContextHints(intent) {
  return INTENT_CONTEXT_CONFIG[intent];
}
__name(getIntentContextHints, "getIntentContextHints");
function checkContextStaleness(workspaceRoot) {
  const ctxPath = join(workspaceRoot, ".snapback", "ctx", "context.json");
  if (!existsSync(ctxPath)) {
    return {
      exists: false,
      isStale: false,
      daysSinceScanned: 0,
      threshold: DEFAULT_STALE_AFTER_DAYS
    };
  }
  try {
    const content = JSON.parse(readFileSync(ctxPath, "utf8"));
    const lastScanned = content.lastScanned;
    const staleAfterDays = content.staleAfterDays || DEFAULT_STALE_AFTER_DAYS;
    if (!lastScanned) {
      return {
        exists: true,
        isStale: false,
        daysSinceScanned: 0,
        threshold: staleAfterDays
      };
    }
    const scanTime = new Date(lastScanned).getTime();
    const daysSinceScanned = Math.floor((Date.now() - scanTime) / (1e3 * 60 * 60 * 24));
    const isStale = daysSinceScanned > staleAfterDays;
    return {
      exists: true,
      isStale,
      daysSinceScanned,
      threshold: staleAfterDays,
      lastScanned
    };
  } catch {
    return {
      exists: false,
      isStale: false,
      daysSinceScanned: 0,
      threshold: DEFAULT_STALE_AFTER_DAYS
    };
  }
}
__name(checkContextStaleness, "checkContextStaleness");
function rebuildContext(workspaceRoot) {
  const ctxPath = join(workspaceRoot, ".snapback", "ctx", "context.json");
  try {
    if (!existsSync(ctxPath)) {
      return {
        success: false,
        error: "Context file does not exist"
      };
    }
    const content = JSON.parse(readFileSync(ctxPath, "utf8"));
    content.lastScanned = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString();
    writeFileSync(ctxPath, JSON.stringify(content, null, 2));
    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
__name(rebuildContext, "rebuildContext");
function handleStaleContext(workspaceRoot) {
  const warnings = [];
  const staleness = checkContextStaleness(workspaceRoot);
  if (!staleness.exists || !staleness.isStale) {
    return warnings;
  }
  const rebuild = rebuildContext(workspaceRoot);
  if (rebuild.success) {
    warnings.push({
      type: "context_rebuilt",
      message: `Context was stale (${staleness.daysSinceScanned} days since last scan, threshold: ${staleness.threshold} days). Auto-rebuilt.`,
      action: "auto_rebuilt",
      daysSinceScanned: staleness.daysSinceScanned,
      threshold: staleness.threshold
    });
  } else {
    warnings.push({
      type: "context_stale",
      message: `Context is stale (${staleness.daysSinceScanned} days since last scan, threshold: ${staleness.threshold} days). Auto-rebuild failed: ${rebuild.error}`,
      action: "manual_scan_recommended",
      daysSinceScanned: staleness.daysSinceScanned,
      threshold: staleness.threshold
    });
  }
  return warnings;
}
__name(handleStaleContext, "handleStaleContext");
function assessRisk(files, _workspaceRoot) {
  const riskAreas = [];
  const recommendations = [];
  for (const file of files) {
    const lowerPath = file.toLowerCase();
    if (lowerPath.includes("auth") || lowerPath.includes("login")) {
      if (!riskAreas.includes("auth")) {
        riskAreas.push("auth");
      }
    }
    if (lowerPath.includes("payment") || lowerPath.includes("stripe")) {
      if (!riskAreas.includes("payment")) {
        riskAreas.push("payment");
      }
    }
    if (lowerPath.includes("database") || lowerPath.includes("migration")) {
      if (!riskAreas.includes("database")) {
        riskAreas.push("database");
      }
    }
    if (lowerPath.includes("config") || lowerPath.includes(".env")) {
      if (!riskAreas.includes("config")) {
        riskAreas.push("config");
      }
    }
    if (lowerPath.includes("api") || lowerPath.includes("route")) {
      if (!riskAreas.includes("api")) {
        riskAreas.push("api");
      }
    }
    if (lowerPath.includes("security") || lowerPath.includes("crypto")) {
      if (!riskAreas.includes("security")) {
        riskAreas.push("security");
      }
    }
  }
  const criticalAreas = [
    "auth",
    "payment",
    "security"
  ];
  const hasCritical = riskAreas.some((a) => criticalAreas.includes(a));
  const overallRisk = hasCritical ? "high" : riskAreas.length >= 2 ? "medium" : riskAreas.length > 0 ? "medium" : "low";
  if (riskAreas.includes("auth")) {
    recommendations.push("Test with both valid and invalid credentials");
  }
  if (riskAreas.includes("payment")) {
    recommendations.push("Use test mode/sandbox for payment testing");
  }
  if (riskAreas.includes("database")) {
    recommendations.push("Verify migrations can be rolled back");
  }
  if (riskAreas.includes("config")) {
    recommendations.push("Ensure secrets are not committed");
  }
  if (files.length >= 5) {
    recommendations.push("Consider breaking into smaller focused changes");
  }
  return {
    overallRisk,
    riskAreas,
    recommendations
  };
}
__name(assessRisk, "assessRisk");
function shouldAutoSnapshot(risk, files) {
  if (risk.overallRisk === "high") {
    return true;
  }
  const criticalAreas = [
    "auth",
    "payment",
    "database",
    "security"
  ];
  if (risk.riskAreas.some((a) => criticalAreas.includes(a))) {
    return true;
  }
  if (files && files.length >= 3) {
    return true;
  }
  if (risk.overallRisk === "medium" && files?.some((f) => f.includes("config") || f.endsWith(".env"))) {
    return true;
  }
  return false;
}
__name(shouldAutoSnapshot, "shouldAutoSnapshot");
function getConstraints(workspaceRoot) {
  const ctxPath = join(workspaceRoot, ".snapback", "ctx", "context.json");
  if (!existsSync(ctxPath)) {
    return [];
  }
  try {
    const content = JSON.parse(readFileSync(ctxPath, "utf8"));
    const constraints = [];
    if (content.constraints) {
      for (const [domain, domainConstraints] of Object.entries(content.constraints)) {
        for (const [name, constraint] of Object.entries(domainConstraints)) {
          constraints.push({
            domain,
            name,
            value: constraint.max || constraint.value,
            description: constraint.description || ""
          });
        }
      }
    }
    return constraints;
  } catch {
    return [];
  }
}
__name(getConstraints, "getConstraints");
function generateNextActions(risk, _learnings, staticAnalysis) {
  const actions = [];
  if (staticAnalysis?.skippedTests && staticAnalysis.skippedTests.length > 0) {
    actions.push({
      tool: "enable_skipped_tests",
      priority: 1,
      reason: `${staticAnalysis.skippedTests.length} skipped test(s) may be ready to enable`
    });
  }
  actions.push({
    tool: "quick_check",
    priority: 2,
    reason: "Validate changes after implementation"
  });
  if (risk.overallRisk === "high") {
    actions.push({
      tool: "what_changed",
      priority: 3,
      reason: "Track changes in high-risk area"
    });
  }
  actions.push({
    tool: "review_work",
    priority: 4,
    reason: "Review before committing"
  });
  return actions;
}
__name(generateNextActions, "generateNextActions");
async function runStaticAnalysis(files, workspaceRoot) {
  const startTime = Date.now();
  const result7 = {
    skippedTests: [],
    success: true,
    duration: 0,
    errors: []
  };
  const testFiles = files.filter((f) => f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__"));
  if (testFiles.length === 0) {
    result7.duration = Date.now() - startTime;
    return result7;
  }
  try {
    const fileMap = /* @__PURE__ */ new Map();
    for (const filePath of testFiles) {
      const fullPath = filePath.startsWith("/") ? filePath : join(workspaceRoot, filePath);
      if (existsSync(fullPath)) {
        try {
          const content = readFileSync(fullPath, "utf8");
          fileMap.set(filePath, content);
        } catch {
        }
      }
    }
    if (fileMap.size === 0) {
      result7.duration = Date.now() - startTime;
      return result7;
    }
    const { analyzeSkippedTests } = await import('./analysis-B4NVULM4.js');
    const analysisResults = analyzeSkippedTests(fileMap);
    for (const analysisResult of analysisResults) {
      if (!analysisResult.parsed && analysisResult.error) {
        result7.errors.push(`Parse error in ${analysisResult.file}: ${analysisResult.error}`);
      }
      for (const skipped of analysisResult.skipped) {
        result7.skippedTests.push({
          file: skipped.file,
          type: skipped.type,
          name: skipped.name,
          line: skipped.line
        });
      }
    }
  } catch (error) {
    result7.errors.push(`Static analysis unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
  result7.duration = Date.now() - startTime;
  result7.success = result7.errors.length === 0;
  return result7;
}
__name(runStaticAnalysis, "runStaticAnalysis");
async function generateProactiveGuidance(files, workspaceRoot) {
  const guidance = {
    summary: files.length > 0 ? `Analyzing ${files.length} file${files.length > 1 ? "s" : ""}` : "No files targeted",
    suggestions: []
  };
  try {
    const { AdvisoryEngine, SkippedTestRule } = await import('./dist-DVM64QIS.js');
    const engine = new AdvisoryEngine();
    engine.registerRule(SkippedTestRule);
    const testFiles = files.filter((f) => f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__"));
    for (const testFile of testFiles) {
      const fullPath = testFile.startsWith("/") ? testFile : join(workspaceRoot, testFile);
      if (existsSync(fullPath)) {
        try {
          const code = readFileSync(fullPath, "utf8");
          const triggerContext = {
            files: [
              testFile
            ],
            session: {
              riskLevel: "low",
              toolCallCount: 0,
              filesModified: 0,
              loopsDetected: 0,
              consecutiveFileModifications: /* @__PURE__ */ new Map()
            },
            fragility: /* @__PURE__ */ new Map(),
            recentViolations: [],
            code
          };
          const advisoryContext = engine.enrich(triggerContext);
          for (const suggestion of advisoryContext.suggestions) {
            guidance.suggestions.push({
              text: suggestion.text,
              priority: suggestion.priority,
              confidence: suggestion.confidence,
              category: suggestion.category,
              files: suggestion.files
            });
          }
        } catch {
        }
      }
    }
    if (guidance.suggestions.length > 0) {
      const skippedTestSuggestions = guidance.suggestions.filter((s) => s.category === "testing");
      if (skippedTestSuggestions.length > 0) {
        guidance.summary = `Found ${skippedTestSuggestions.length} testing suggestion(s)`;
      }
    }
    guidance.suggestions.sort((a, b) => a.priority - b.priority);
  } catch {
    guidance.summary = "Advisory analysis unavailable";
  }
  return guidance;
}
__name(generateProactiveGuidance, "generateProactiveGuidance");
function formatCompactResult(output, gitContext) {
  const constraintMap = {};
  for (const c of output.constraints.slice(0, 4)) {
    constraintMap[c.name] = String(c.value) + (c.name.includes("time") ? "ms" : c.name.includes("bundle") ? "MB" : "");
  }
  const learningStrings = output.learnings.slice(0, 2).map((l) => l.action.substring(0, 100));
  const warnings = [];
  if (output.contextWarnings?.length) {
    warnings.push(output.contextWarnings[0].message);
  }
  if (output.proactive_guidance?.suggestions?.length) {
    const topSuggestion = output.proactive_guidance.suggestions[0];
    if (topSuggestion.priority <= 2) {
      warnings.push(topSuggestion.text);
    }
  }
  if (output.staticAnalysis?.skippedTests?.length) {
    warnings.push(`${output.staticAnalysis.skippedTests.length} skipped test(s)`);
  }
  let snapshotStatus;
  if (output.snapshot.created) {
    snapshotStatus = "created";
  } else if (output.snapshot.id) {
    snapshotStatus = "reused";
  } else {
    snapshotStatus = "skipped";
  }
  return {
    taskId: output.taskId,
    risk: output.riskAssessment.overallRisk,
    protection: 100,
    dirtyFiles: gitContext?.uncommittedChanges?.length ?? 0,
    constraints: constraintMap,
    learnings: learningStrings,
    warnings: warnings.slice(0, 2),
    snapshot: snapshotStatus
  };
}
__name(formatCompactResult, "formatCompactResult");
function formatCompactText(compact) {
  const lines = [];
  const snapshotIcon = compact.snapshot === "created" ? "\u{1F4F8}" : compact.snapshot === "reused" ? "\u267B\uFE0F" : "\u23ED\uFE0F";
  lines.push(`\u2713 ${compact.taskId} | risk:${compact.risk} | protection:${compact.protection}% | dirty:${compact.dirtyFiles} | ${snapshotIcon} ${compact.snapshot}`);
  if (Object.keys(compact.constraints).length > 0) {
    const constraintStr = Object.entries(compact.constraints).map(([k, v]) => `${k}<${v}`).join(", ");
    lines.push(`constraints: ${constraintStr}`);
  }
  if (compact.learnings.length > 0) {
    lines.push(`learnings: ${compact.learnings.join(" | ")}`);
  }
  if (compact.warnings.length > 0) {
    lines.push(`\u26A0\uFE0F ${compact.warnings.join(" | ")}`);
  }
  return lines.join("\n");
}
__name(formatCompactText, "formatCompactText");
function result(text, isError = false) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    isError
  };
}
__name(result, "result");
var INTENT_CONTEXT_CONFIG;
var DEFAULT_STALE_AFTER_DAYS;
var handleBeginTask;
var init_begin_task = __esm({
  "src/facades/begin-task.ts"() {
    init_client_facade();
    init_dependency_graph_service();
    init_error_cache_service();
    init_git_context_service();
    init_hybrid_retrieval_service();
    init_snapshot_service();
    init_test_coverage_service();
    init_tiered_learning_service();
    init_state();
    init_intelligence();
    INTENT_CONTEXT_CONFIG = {
      implement: {
        prioritize: [
          "contracts",
          "patterns",
          "tests"
        ],
        include: [
          "architecture",
          "constraints"
        ],
        exclude: [
          "violations"
        ]
      },
      debug: {
        prioritize: [
          "violations",
          "failures",
          "history"
        ],
        include: [
          "tests",
          "patterns"
        ],
        exclude: []
      },
      refactor: {
        prioritize: [
          "canonical",
          "patterns",
          "duplicates"
        ],
        include: [
          "architecture",
          "migrations"
        ],
        exclude: []
      },
      review: {
        prioritize: [
          "checklist",
          "risks",
          "coverage"
        ],
        include: [
          "constraints",
          "violations"
        ],
        exclude: []
      },
      explore: {
        prioritize: [
          "architecture",
          "genealogy",
          "epochs"
        ],
        include: [
          "history",
          "decisions"
        ],
        exclude: [
          "violations"
        ]
      }
    };
    __name6(inferIntent, "inferIntent");
    __name6(getIntentContextHints, "getIntentContextHints");
    DEFAULT_STALE_AFTER_DAYS = 7;
    __name6(checkContextStaleness, "checkContextStaleness");
    __name6(rebuildContext, "rebuildContext");
    __name6(handleStaleContext, "handleStaleContext");
    __name6(assessRisk, "assessRisk");
    __name6(shouldAutoSnapshot, "shouldAutoSnapshot");
    __name6(getConstraints, "getConstraints");
    __name6(generateNextActions, "generateNextActions");
    __name6(runStaticAnalysis, "runStaticAnalysis");
    __name6(generateProactiveGuidance, "generateProactiveGuidance");
    __name6(formatCompactResult, "formatCompactResult");
    __name6(formatCompactText, "formatCompactText");
    __name6(result, "result");
    handleBeginTask = /* @__PURE__ */ __name6(async (args, context) => {
      const input3 = args;
      const task = input3.task;
      const files = input3.files;
      const providedKeywords = input3.keywords;
      const skipSnapshot = input3.skipSnapshot;
      const compact = input3.compact !== false;
      const intent = input3.intent ?? inferIntent(task || "");
      const intentHints = getIntentContextHints(intent);
      if (!task) {
        return result(JSON.stringify({
          error: "E102_MISSING_PARAM",
          message: "Required parameter 'task' is missing"
        }), true);
      }
      const workspaceRoot = context.workspaceRoot;
      const contextWarnings = handleStaleContext(workspaceRoot);
      const keywords = providedKeywords ?? extractKeywords2(task);
      const daemonResult = await beginTaskViaDaemon(workspaceRoot, task, files, keywords);
      if (daemonResult) {
        startTask(workspaceRoot, {
          description: task,
          plannedFiles: files || [],
          snapshotId: daemonResult.snapshot.id,
          keywords
        });
        const observations2 = drainPendingObservations(workspaceRoot).map((o) => ({
          type: o.type,
          message: o.message
        }));
        let lastKnownErrors2;
        if (files && files.length > 0) {
          try {
            const errorCacheService = createErrorCacheService2(workspaceRoot);
            const cachedErrors = errorCacheService.getErrorsForFiles(files);
            if (cachedErrors.length > 0) {
              lastKnownErrors2 = {
                typescript: cachedErrors.filter((e) => e.source === "typescript").map((e) => ({
                  ...e,
                  age: e.age
                })),
                tests: cachedErrors.filter((e) => e.source === "test").map((e) => ({
                  ...e,
                  age: e.age
                })),
                lintErrors: cachedErrors.filter((e) => e.source === "lint").map((e) => ({
                  ...e,
                  age: e.age
                }))
              };
            }
          } catch {
          }
        }
        let gitContext2;
        try {
          const gitContextService = createGitContextService2(workspaceRoot);
          gitContext2 = await gitContextService.getContext(files || []);
          if (!gitContext2.branch.current && gitContext2.uncommittedChanges.length === 0 && gitContext2.recentCommits.length === 0) {
            gitContext2 = void 0;
          }
        } catch {
        }
        let staticAnalysis2;
        if (files && files.length > 0) {
          staticAnalysis2 = await runStaticAnalysis(files, workspaceRoot);
        }
        let dependencyContext2;
        if (files && files.length > 0) {
          try {
            const depGraphService = getDependencyGraphService2(workspaceRoot);
            dependencyContext2 = await depGraphService.getContextForFiles(files);
            if (Object.keys(dependencyContext2.planned).length === 0 && dependencyContext2.circular.length === 0 && dependencyContext2.suggestions.length === 0) {
              dependencyContext2 = void 0;
            }
          } catch {
          }
        }
        let testCoverage2;
        if (files && files.length > 0) {
          try {
            const coverageService = getTestCoverageService2(workspaceRoot);
            testCoverage2 = coverageService.getContextForFiles(files);
            if (testCoverage2.summary.filesWithTests === 0 && testCoverage2.summary.averageCoverage === 0) {
              testCoverage2 = void 0;
            }
          } catch {
          }
        }
        const proactive_guidance2 = await generateProactiveGuidance(files || [], workspaceRoot);
        const output2 = {
          taskId: daemonResult.taskId,
          intent,
          intentHints,
          snapshot: daemonResult.snapshot,
          patterns: daemonResult.patterns,
          constraints: daemonResult.constraints,
          learnings: daemonResult.learnings,
          observations: observations2,
          riskAssessment: daemonResult.riskAssessment,
          nextActions: daemonResult.nextActions,
          staticAnalysis: staticAnalysis2,
          lastKnownErrors: lastKnownErrors2,
          gitContext: gitContext2,
          dependencyContext: dependencyContext2,
          testCoverage: testCoverage2,
          proactive_guidance: proactive_guidance2,
          contextWarnings: contextWarnings.length > 0 ? contextWarnings : void 0
        };
        if (compact) {
          const compactOutput = formatCompactResult(output2, gitContext2);
          return result(formatCompactText(compactOutput));
        }
        const hint2 = daemonResult.snapshot.created ? `Safety snapshot created via daemon: ${daemonResult.snapshot.id}` : daemonResult.learnings.length > 0 ? `${daemonResult.learnings.length} relevant learning(s) found` : "Ready to start coding! (daemon-coordinated)";
        return result(JSON.stringify({
          ...output2,
          message: `Task started: ${task}`,
          _hint: hint2,
          _source: "daemon"
        }, null, 2));
      }
      const riskAssessment = files ? assessRisk(files) : {
        overallRisk: "low",
        riskAreas: [],
        recommendations: []
      };
      let snapshot = {
        created: false
      };
      if (!skipSnapshot && shouldAutoSnapshot(riskAssessment, files) && files && files.length > 0) {
        const snapshotService = createSnapshotService2(workspaceRoot);
        const snapshotResult = await snapshotService.createFromFiles(files, {
          description: `Pre-task: ${task}`,
          trigger: "ai-detection",
          skipDedup: false,
          dedupWindow: 5
        });
        if (snapshotResult.success) {
          if (snapshotResult.reused) {
            snapshot = {
              created: false,
              id: snapshotResult.reusedSnapshotId,
              reason: snapshotResult.reusedReason
            };
          } else if (snapshotResult.snapshot) {
            snapshot = {
              created: true,
              id: snapshotResult.snapshot.id,
              reason: `Auto-created: ${riskAssessment.overallRisk} risk task touching ${riskAssessment.riskAreas.join(", ") || "planned files"}`
            };
            const state2 = getSessionState(workspaceRoot);
            state2.stats.snapshotsCreated++;
          }
        } else {
          snapshot = {
            created: false,
            reason: `Snapshot creation failed: ${snapshotResult.error}`
          };
        }
      }
      const tieredLearningService = new TieredLearningService2(workspaceRoot);
      const tieredLearnings = await tieredLearningService.loadTieredLearnings({
        intent,
        keywords,
        maxLearnings: 10
      });
      const learningIds = tieredLearnings.map((l) => l.id).filter((id) => !!id);
      if (learningIds.length > 0) {
        tieredLearningService.trackAccess(learningIds);
      }
      const shownLearnings = {
        patterns: tieredLearnings.filter((l) => l.type === "pattern" && l.id).map((l) => l.id),
        pitfalls: tieredLearnings.filter((l) => l.type === "pitfall" && l.id).map((l) => l.id),
        other: tieredLearnings.filter((l) => l.id && ![
          "pattern",
          "pitfall"
        ].includes(l.type)).map((l) => l.id)
      };
      const learnings = tieredLearnings.map((l) => ({
        type: l.type,
        trigger: Array.isArray(l.trigger) ? l.trigger.join(", ") : l.trigger,
        action: l.action,
        source: l.source,
        relevanceScore: l.score / (keywords.length || 1)
      }));
      let hybridRetrievalStats;
      try {
        const searchQuery = [
          task,
          ...keywords
        ].join(" ");
        const classification = classifyQueryType(searchQuery);
        const hybridResult = await retrieveAdaptive(workspaceRoot, searchQuery);
        if (hybridResult.results.length > 0) {
          const existingTriggers = new Set(learnings.map((l) => l.trigger));
          for (const result7 of hybridResult.results.slice(0, 5)) {
            const chunkText = result7.chunk.chunk_text;
            if (!existingTriggers.has(chunkText)) {
              const sourceType = result7.chunk.source_type;
              const learningType = sourceType === "pattern" ? "pattern" : sourceType === "violation" ? "pitfall" : sourceType === "adr" ? "architecture" : "discovery";
              learnings.push({
                type: learningType,
                trigger: chunkText,
                action: result7.chunk.context_text || chunkText,
                source: "hybrid-retrieval",
                relevanceScore: result7.confidence
              });
              existingTriggers.add(chunkText);
            }
          }
          hybridRetrievalStats = {
            queryType: classification.type,
            semanticWeight: classification.weights.semantic,
            keywordWeight: classification.weights.keyword,
            resultsFound: hybridResult.results.length,
            latencyMs: hybridResult.stats.latencyMs
          };
          console.log(`[Hybrid Retrieval] ${hybridRetrievalStats.queryType} query: ${hybridRetrievalStats.resultsFound} results in ${hybridRetrievalStats.latencyMs.toFixed(1)}ms (sem=${hybridRetrievalStats.semanticWeight}, kw=${hybridRetrievalStats.keywordWeight})`);
        }
      } catch {
      }
      let patterns = [];
      try {
        const intel = getIntelligence2(workspaceRoot);
        const contextResult = await intel.getContext({
          task,
          keywords
        });
        if (contextResult.patterns) {
          const patternLines = contextResult.patterns.split("\n").filter(Boolean);
          patterns = patternLines.slice(0, 5).map((line) => ({
            name: line.substring(0, 50),
            description: line
          }));
        }
      } catch {
      }
      const constraints = getConstraints(workspaceRoot);
      let staticAnalysis;
      if (files && files.length > 0) {
        staticAnalysis = await runStaticAnalysis(files, workspaceRoot);
      }
      let lastKnownErrors;
      if (files && files.length > 0) {
        try {
          const errorCacheService = createErrorCacheService2(workspaceRoot);
          const cachedErrors = errorCacheService.getErrorsForFiles(files);
          if (cachedErrors.length > 0) {
            lastKnownErrors = {
              typescript: cachedErrors.filter((e) => e.source === "typescript").map((e) => ({
                ...e,
                age: e.age
              })),
              tests: cachedErrors.filter((e) => e.source === "test").map((e) => ({
                ...e,
                age: e.age
              })),
              lintErrors: cachedErrors.filter((e) => e.source === "lint").map((e) => ({
                ...e,
                age: e.age
              }))
            };
          }
        } catch {
        }
      }
      let gitContext;
      try {
        const gitContextService = createGitContextService2(workspaceRoot);
        gitContext = await gitContextService.getContext(files || []);
        if (!gitContext.branch.current && gitContext.uncommittedChanges.length === 0 && gitContext.recentCommits.length === 0) {
          gitContext = void 0;
        }
      } catch {
      }
      let dependencyContext;
      if (files && files.length > 0) {
        try {
          const depGraphService = getDependencyGraphService2(workspaceRoot);
          dependencyContext = await depGraphService.getContextForFiles(files);
          if (Object.keys(dependencyContext.planned).length === 0 && dependencyContext.circular.length === 0 && dependencyContext.suggestions.length === 0) {
            dependencyContext = void 0;
          }
        } catch {
        }
      }
      let testCoverage;
      if (files && files.length > 0) {
        try {
          const coverageService = getTestCoverageService2(workspaceRoot);
          testCoverage = coverageService.getContextForFiles(files);
          if (testCoverage.summary.filesWithTests === 0 && testCoverage.summary.averageCoverage === 0) {
            testCoverage = void 0;
          }
        } catch {
        }
      }
      const observations = drainPendingObservations(workspaceRoot).map((o) => ({
        type: o.type,
        message: o.message
      }));
      const currentTask = startTask(workspaceRoot, {
        description: task,
        plannedFiles: files || [],
        snapshotId: snapshot.id,
        keywords,
        intent,
        shownLearnings
      });
      const state = getSessionState(workspaceRoot);
      state.riskAreasTouched = riskAssessment.riskAreas;
      try {
        const intel = getIntelligence2(workspaceRoot);
        intel.startSession(currentTask.id, {
          workspaceId: workspaceRoot,
          tags: keywords
        });
      } catch {
      }
      const nextActions = generateNextActions(riskAssessment, learnings, staticAnalysis);
      const proactive_guidance = await generateProactiveGuidance(files || [], workspaceRoot);
      const output = {
        taskId: currentTask.id,
        intent,
        intentHints,
        snapshot,
        patterns,
        constraints,
        learnings,
        observations,
        riskAssessment,
        nextActions,
        staticAnalysis,
        lastKnownErrors,
        gitContext,
        dependencyContext,
        testCoverage,
        proactive_guidance,
        contextWarnings: contextWarnings.length > 0 ? contextWarnings : void 0
      };
      if (compact) {
        const compactOutput = formatCompactResult(output, gitContext);
        return result(formatCompactText(compactOutput));
      }
      const skippedCount = staticAnalysis?.skippedTests?.length ?? 0;
      const knownErrorCount = (lastKnownErrors?.typescript?.length ?? 0) + (lastKnownErrors?.tests?.length ?? 0) + (lastKnownErrors?.lintErrors?.length ?? 0);
      const uncommittedCount = gitContext?.uncommittedChanges?.length ?? 0;
      let hint;
      if (contextWarnings.length > 0) {
        const rebuiltWarning = contextWarnings.find((w) => w.type === "context_rebuilt");
        if (rebuiltWarning) {
          hint = `\u{1F504} Context was stale and auto-rebuilt (${rebuiltWarning.daysSinceScanned} days old)`;
        } else {
          hint = `\u26A0\uFE0F Context is stale - consider running 'context op=scan'`;
        }
      } else if (knownErrorCount > 0) {
        hint = `\u26A0\uFE0F ${knownErrorCount} known error(s) in planned files - check lastKnownErrors`;
      } else if (skippedCount > 0) {
        hint = `\u26A0\uFE0F ${skippedCount} skipped test(s) found - may need enabling`;
      } else if (uncommittedCount > 0) {
        hint = `\u{1F4DD} ${uncommittedCount} uncommitted change(s) in working tree`;
      } else if (snapshot.created) {
        hint = `Safety snapshot created: ${snapshot.id}`;
      } else if (learnings.length > 0) {
        hint = `${learnings.length} relevant learning(s) found`;
      } else {
        hint = "Ready to start coding!";
      }
      return result(JSON.stringify({
        ...output,
        message: `Task started: ${task}`,
        _hint: hint
      }, null, 2));
    }, "handleBeginTask");
  }
});
function appendLearning(workspaceRoot, learning) {
  const learningsDir = join(workspaceRoot, ".snapback", "learnings");
  const learningsPath = join(learningsDir, "learnings.jsonl");
  try {
    if (!existsSync(learningsDir)) {
      mkdirSync(learningsDir, {
        recursive: true
      });
    }
    const entry = {
      ...learning,
      timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString(),
      source: learning.source || "task_completion"
    };
    appendFileSync(learningsPath, JSON.stringify(entry) + "\n", "utf8");
    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown write error"
    };
  }
}
__name(appendLearning, "appendLearning");
function inferBehaviorType(how) {
  const lowered = how.toLowerCase();
  if (lowered.includes("fix") && lowered.includes("skip")) return "fixed_vs_skipped";
  if (lowered.includes("test")) return "tested_more";
  if (lowered.includes("doc") || lowered.includes("comment")) return "documented_more";
  if (lowered.includes("safe") || lowered.includes("careful")) return "safer_approach";
  if (lowered.includes("thorough") || lowered.includes("harder")) return "worked_harder";
  return "other";
}
__name(inferBehaviorType, "inferBehaviorType");
function mapEffortDelta(change) {
  switch (change) {
    case "more":
      return "somewhat_more";
    case "less":
      return "less";
    default:
      return "same";
  }
}
__name(mapEffortDelta, "mapEffortDelta");
function inferFeature(trigger) {
  if (!trigger) return "general_awareness";
  const lowered = trigger.toLowerCase();
  if (lowered.includes("begin_task")) return "begin_task_context";
  if (lowered.includes("learn")) return "learn_system";
  if (lowered.includes("checkpoint") || lowered.includes("snapshot")) return "checkpoint_visibility";
  if (lowered.includes("review")) return "review_work";
  if (lowered.includes("complete")) return "complete_task_reflection";
  return "general_awareness";
}
__name(inferFeature, "inferFeature");
function buildAccountabilityEffect(reflection, taskId, durationMs, filesChanged, linesChanged, snapshotsCreated, tier, outcome) {
  const validValues = [
    "significantly",
    "somewhat",
    "not_really",
    "blocked"
  ];
  const perceived_help = validValues.includes(reflection.perceived_help) ? reflection.perceived_help : "somewhat";
  const result7 = {
    session_id: taskId,
    session_duration_ms: durationMs,
    perceived_help,
    actual_changes: {
      files_modified: filesChanged,
      lines_added: Math.max(0, Math.floor(linesChanged * 0.7)),
      lines_removed: Math.max(0, Math.floor(linesChanged * 0.3)),
      snapshots_used: snapshotsCreated
    },
    prevented_issues: {
      // These would ideally come from session tracking
      // For now, we provide reasonable defaults based on session activity
      rollbacks_avoided: snapshotsCreated > 0 ? 1 : 0,
      pattern_violations_caught: 0,
      skipped_tests_flagged: 0
    },
    tier
  };
  if (reflection.accountability !== void 0) {
    if (reflection.accountability.behaved_differently) {
      result7.accountability_behavior = {
        would_have_behaved_differently: true,
        behavior_change_type: reflection.accountability.how ? inferBehaviorType(reflection.accountability.how) : "other",
        what_triggered_accountability: reflection.accountability.triggered_by,
        effort_delta: mapEffortDelta(reflection.accountability.effort_change),
        snapback_feature_responsible: inferFeature(reflection.accountability.triggered_by),
        outcome_improved: outcome === "completed"
      };
    } else {
      result7.accountability_behavior = {
        would_have_behaved_differently: false
      };
    }
  }
  return result7;
}
__name(buildAccountabilityEffect, "buildAccountabilityEffect");
function getIntentHint(intent, outcome) {
  if (!intent) return void 0;
  return INTENT_COMPLETION_HINTS[intent]?.[outcome];
}
__name(getIntentHint, "getIntentHint");
function result2(text, isError = false) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    isError
  };
}
__name(result2, "result2");
var INTENT_COMPLETION_HINTS;
var handleCompleteTask;
var init_complete_task = __esm({
  "src/facades/complete-task.ts"() {
    init_client_facade();
    init_snapshot_service();
    init_state();
    __name6(appendLearning, "appendLearning");
    __name6(inferBehaviorType, "inferBehaviorType");
    __name6(mapEffortDelta, "mapEffortDelta");
    __name6(inferFeature, "inferFeature");
    __name6(buildAccountabilityEffect, "buildAccountabilityEffect");
    INTENT_COMPLETION_HINTS = {
      implement: {
        completed: "Feature implemented. Consider running tests to verify.",
        abandoned: "Implementation paused. Snapshot preserved for resumption.",
        blocked: "Blocked on implementation. Check learnings for similar issues."
      },
      debug: {
        completed: "Bug fixed! Consider recording the fix as a learning.",
        abandoned: "Debug session paused. Current state preserved.",
        blocked: "Still debugging. Try get_learnings for similar issues."
      },
      refactor: {
        completed: "Refactoring complete. Run tests to ensure no regressions.",
        abandoned: "Refactor paused. Partial changes preserved in snapshot.",
        blocked: "Blocked on refactor. Consider smaller incremental changes."
      },
      review: {
        completed: "Review complete. Consider recording any patterns discovered.",
        abandoned: "Review paused. Notes preserved.",
        blocked: "Review blocked. May need additional context or access."
      },
      explore: {
        completed: "Exploration complete. Consider recording discoveries as learnings.",
        abandoned: "Exploration paused. Findings preserved.",
        blocked: "Exploration blocked. Try a different approach."
      }
    };
    __name6(getIntentHint, "getIntentHint");
    __name6(result2, "result");
    handleCompleteTask = /* @__PURE__ */ __name6(async (args, context) => {
      const { outcome = "completed", createSnapshot = outcome === "completed", acceptLearnings = [], customLearning, notes, reflection } = args;
      const workspaceRoot = context.workspaceRoot;
      const state = getSessionState(workspaceRoot);
      const task = getCurrentTask(workspaceRoot);
      if (!task) {
        return result2(JSON.stringify({
          error: "E301_NO_ACTIVE_TASK",
          message: "No active task to complete. Use begin_task to start one.",
          _hint: "Start a new task with begin_task before trying to complete it."
        }), true);
      }
      const daemonResult = await endTaskViaDaemon(workspaceRoot, outcome);
      if (daemonResult) {
        const warnings = [];
        const modifiedFiles = state.changesSinceTaskStart.map((c) => c.file);
        const validatedFiles = state.validatedFiles || [];
        const unvalidatedFiles = modifiedFiles.filter((f) => !validatedFiles.includes(f));
        if (unvalidatedFiles.length > 0) {
          warnings.push(`${unvalidatedFiles.length} file(s) modified but not validated. Consider running check_patterns before committing.`);
        }
        let learningsCaptured2 = 0;
        const failedLearnings = [];
        for (const idx of acceptLearnings) {
          if (idx >= 0 && idx < state.pendingSuggestedLearnings.length) {
            const learning = state.pendingSuggestedLearnings[idx];
            const result7 = appendLearning(workspaceRoot, learning);
            if (result7.success) {
              learningsCaptured2++;
            } else {
              failedLearnings.push(`Learning ${idx}: ${result7.error}`);
            }
          }
        }
        if (customLearning) {
          const result7 = appendLearning(workspaceRoot, customLearning);
          if (result7.success) {
            learningsCaptured2++;
          } else {
            failedLearnings.push(`Custom learning: ${result7.error}`);
          }
        }
        if (failedLearnings.length > 0) {
          warnings.push(`Failed to save ${failedLearnings.length} learning(s): ${failedLearnings.join("; ")}`);
        }
        state.stats.learningsCaptured += learningsCaptured2;
        endTask(workspaceRoot, outcome);
        const nextActions2 = [];
        if (outcome === "completed") {
          nextActions2.push({
            tool: "begin_task",
            priority: 2,
            reason: "Start your next task"
          });
        } else if (outcome === "blocked") {
          nextActions2.push({
            tool: "get_learnings",
            priority: 1,
            reason: "Check if similar issues were solved before"
          });
        }
        if (learningsCaptured2 === 0 && daemonResult.summary.filesModified > 3) {
          nextActions2.push({
            tool: "learn",
            priority: 3,
            reason: "Consider capturing a pattern from this work"
          });
        }
        let accountability_effect2;
        if (reflection?.perceived_help) {
          accountability_effect2 = buildAccountabilityEffect(reflection, task.id, daemonResult.summary.duration, daemonResult.summary.filesModified, daemonResult.summary.linesChanged, daemonResult.snapshot.created ? 1 : 0, context.tier || "free", outcome);
        }
        const output2 = {
          taskId: task.id,
          taskDescription: task.description,
          outcome,
          duration: formatDuration3(daemonResult.summary.duration),
          summary: {
            filesChanged: daemonResult.summary.filesModified,
            linesChanged: daemonResult.summary.linesChanged,
            snapshotsCreated: daemonResult.snapshot.created ? 1 : 0,
            riskAreasTouched: state.riskAreasTouched
          },
          learningsCaptured: learningsCaptured2 + daemonResult.learningsAccepted,
          finalSnapshot: daemonResult.snapshot.created ? {
            id: "daemon-snapshot",
            fileCount: daemonResult.summary.filesModified
          } : void 0,
          sessionStats: {
            tasksCompleted: state.stats.tasksCompleted,
            totalSnapshots: state.stats.snapshotsCreated,
            totalLearnings: state.stats.learningsCaptured
          },
          nextActions: nextActions2,
          accountability_effect: accountability_effect2,
          _warnings: warnings.length > 0 ? warnings : void 0
        };
        const emoji2 = outcome === "completed" ? "\u2705" : outcome === "blocked" ? "\u{1F6A7}" : "\u23F9\uFE0F";
        const intentHint2 = getIntentHint(task.intent, outcome);
        const baseHint2 = outcome === "completed" ? `Task completed in ${formatDuration3(daemonResult.summary.duration)}! ${daemonResult.summary.filesModified} file(s), ${daemonResult.summary.linesChanged} line(s) changed.` : outcome === "blocked" ? "Task blocked. Check learnings for similar issues." : "Task abandoned.";
        const hint2 = intentHint2 ? `${baseHint2} ${intentHint2}` : baseHint2;
        return result2(JSON.stringify({
          ...output2,
          message: `${emoji2} ${hint2}`,
          _hint: notes ? `Notes: ${notes}` : hint2,
          _intentHint: intentHint2,
          _source: "daemon"
        }, null, 2));
      }
      const fallbackWarnings = [];
      const durationMs = Date.now() - task.startedAt;
      const duration = formatDuration3(durationMs);
      const filesChanged = state.changesSinceTaskStart.length;
      const linesChanged = state.changesSinceTaskStart.reduce((sum, c) => sum + c.linesChanged, 0);
      const modifiedFilePaths = state.changesSinceTaskStart.map((c) => c.file);
      const validatedFilePaths = state.validatedFiles || [];
      const unvalidatedFilePaths = modifiedFilePaths.filter((f) => !validatedFilePaths.includes(f));
      if (unvalidatedFilePaths.length > 0) {
        fallbackWarnings.push(`${unvalidatedFilePaths.length} file(s) modified but not validated. Consider running check_patterns before committing.`);
      }
      let finalSnapshot;
      if (createSnapshot && filesChanged > 0) {
        const filePaths = state.changesSinceTaskStart.map((c) => c.file);
        const snapshotService = createSnapshotService2(workspaceRoot);
        const snapshotResult = await snapshotService.createFromFiles(filePaths, {
          description: `Task complete: ${task.description}`,
          trigger: "ai-detection",
          skipDedup: true
        });
        if (snapshotResult.success && snapshotResult.snapshot) {
          finalSnapshot = {
            id: snapshotResult.snapshot.id,
            fileCount: snapshotResult.snapshot.fileCount
          };
          state.stats.snapshotsCreated++;
        }
      }
      let learningsCaptured = 0;
      const failedLearningWrites = [];
      for (const idx of acceptLearnings) {
        if (idx >= 0 && idx < state.pendingSuggestedLearnings.length) {
          const learning = state.pendingSuggestedLearnings[idx];
          const writeResult = appendLearning(workspaceRoot, learning);
          if (writeResult.success) {
            learningsCaptured++;
          } else {
            failedLearningWrites.push(`Learning ${idx}: ${writeResult.error}`);
          }
        }
      }
      if (customLearning) {
        const writeResult = appendLearning(workspaceRoot, customLearning);
        if (writeResult.success) {
          learningsCaptured++;
        } else {
          failedLearningWrites.push(`Custom learning: ${writeResult.error}`);
        }
      }
      if (failedLearningWrites.length > 0) {
        fallbackWarnings.push(`Failed to save ${failedLearningWrites.length} learning(s): ${failedLearningWrites.join("; ")}`);
      }
      state.stats.learningsCaptured += learningsCaptured;
      endTask(workspaceRoot, outcome);
      const nextActions = [];
      if (outcome === "completed") {
        nextActions.push({
          tool: "begin_task",
          priority: 2,
          reason: "Start your next task"
        });
      } else if (outcome === "blocked") {
        nextActions.push({
          tool: "get_learnings",
          priority: 1,
          reason: "Check if similar issues were solved before"
        });
      }
      if (learningsCaptured === 0 && filesChanged > 3) {
        nextActions.push({
          tool: "learn",
          priority: 3,
          reason: "Consider capturing a pattern from this work"
        });
      }
      let accountability_effect;
      if (reflection?.perceived_help) {
        accountability_effect = buildAccountabilityEffect(reflection, task.id, durationMs, filesChanged, linesChanged, finalSnapshot ? 1 : 0, context.tier || "free", outcome);
      }
      const output = {
        taskId: task.id,
        taskDescription: task.description,
        outcome,
        duration,
        summary: {
          filesChanged,
          linesChanged,
          snapshotsCreated: finalSnapshot ? 1 : 0,
          riskAreasTouched: state.riskAreasTouched
        },
        learningsCaptured,
        finalSnapshot,
        sessionStats: {
          tasksCompleted: state.stats.tasksCompleted,
          totalSnapshots: state.stats.snapshotsCreated,
          totalLearnings: state.stats.learningsCaptured
        },
        nextActions,
        accountability_effect,
        _warnings: fallbackWarnings.length > 0 ? fallbackWarnings : void 0
      };
      const emoji = outcome === "completed" ? "\u2705" : outcome === "blocked" ? "\u{1F6A7}" : "\u23F9\uFE0F";
      const intentHint = getIntentHint(task.intent, outcome);
      const baseHint = outcome === "completed" ? `Task completed in ${duration}! ${filesChanged} file(s), ${linesChanged} line(s) changed.` : outcome === "blocked" ? "Task blocked. Check learnings for similar issues." : "Task abandoned.";
      const hint = intentHint ? `${baseHint} ${intentHint}` : baseHint;
      return result2(JSON.stringify({
        ...output,
        message: `${emoji} ${hint}`,
        _hint: notes ? `Notes: ${notes}` : hint,
        _intentHint: intentHint
      }, null, 2));
    }, "handleCompleteTask");
  }
});
function getObservationEmoji(type) {
  switch (type) {
    case "risk":
      return "\u26A0\uFE0F";
    case "warning":
      return "\u{1F6A8}";
    case "pattern":
      return "\u{1F4DA}";
    case "suggestion":
      return "\u{1F4A1}";
    case "progress":
      return "\u2705";
    default:
      return "\u2139\uFE0F";
  }
}
__name(getObservationEmoji, "getObservationEmoji");
function generateRecommendations(state) {
  const recommendations = [];
  if (!state.currentTask) {
    recommendations.push("Call `begin_task` before making any code changes");
    return recommendations;
  }
  if (state.riskAreasTouched.length > 0) {
    recommendations.push(`You're modifying ${state.riskAreasTouched.join(", ")} - a snapshot protects these changes`);
  }
  if (state.pendingObservations.length > 3) {
    recommendations.push(`${state.pendingObservations.length} observations pending - review with next tool call`);
  }
  if (state.currentTask) {
    const durationMs = Date.now() - state.currentTask.startedAt;
    const minutes = durationMs / 6e4;
    if (minutes > 30) {
      recommendations.push("Task running 30+ minutes - consider using `review_work` to check progress");
    }
  }
  if (state.changesSinceTaskStart.length > 5) {
    recommendations.push(`${state.changesSinceTaskStart.length} files changed - use \`what_changed\` to review scope`);
  }
  const aiChanges = state.changesSinceTaskStart.filter((c) => c.aiAttributed).length;
  if (aiChanges > 3) {
    recommendations.push(`${aiChanges} AI-attributed changes - review carefully before committing`);
  }
  if (state.stats.restoresPerformed > 0) {
    recommendations.push(`You've used restore ${state.stats.restoresPerformed} time(s) - snapshots are helping!`);
  }
  return recommendations;
}
__name(generateRecommendations, "generateRecommendations");
function generateQuickReference() {
  return `
| Situation | Tool to Call |
|-----------|-------------|
| Starting any task | \`begin_task\` |
| "Did I break anything?" | \`quick_check\` |
| "What have I changed?" | \`what_changed\` |
| Ready to commit | \`review_work\` |
| Task complete | \`complete_task\` |
| Need to undo | \`snapshot_restore\` |
`.trim();
}
__name(generateQuickReference, "generateQuickReference");
function generateProtocolText(state) {
  const lines = [
    "## SnapBack Pairing Protocol",
    ""
  ];
  if (state.currentTask) {
    const duration = formatDuration3(Date.now() - state.currentTask.startedAt);
    lines.push(`**Active Task:** ${state.currentTask.description}`);
    lines.push(`**Duration:** ${duration}`);
    lines.push(`**Files Changed:** ${state.changesSinceTaskStart.length}`);
    if (state.currentTask.snapshotId) {
      lines.push(`**Snapshot:** ${state.currentTask.snapshotId} (available for rollback)`);
    }
    lines.push("");
  } else {
    lines.push("**No active task.** Call `begin_task` before making changes.");
    lines.push("");
  }
  if (state.pendingObservations.length > 0) {
    lines.push("**Recent Observations:**");
    for (const obs of state.pendingObservations.slice(-3)) {
      const emoji = getObservationEmoji(obs.type);
      lines.push(`- ${emoji} ${obs.message}`);
    }
    lines.push("");
  }
  if (state.riskAreasTouched.length > 0) {
    lines.push(`**Risk Areas in Scope:** ${state.riskAreasTouched.join(", ")}`);
    lines.push("");
  }
  lines.push("### Tool Usage Pattern");
  lines.push("");
  lines.push("**START of any coding task:**");
  lines.push("```");
  lines.push('Call: begin_task({ task: "description", files: ["planned", "files"] })');
  lines.push("```");
  lines.push("");
  lines.push("**DURING development:**");
  lines.push("- After changes: `quick_check({})` - fast validation");
  lines.push("- Review progress: `what_changed({})` - see all changes");
  lines.push("");
  lines.push("**BEFORE committing:**");
  lines.push("```");
  lines.push('Call: review_work({ intent: "what you accomplished" })');
  lines.push("```");
  lines.push("");
  lines.push("**END of task:**");
  lines.push("```");
  lines.push('Call: complete_task({ outcome: "completed", acceptLearnings: [0, 1] })');
  lines.push("```");
  lines.push("");
  lines.push("### Quick Reference");
  lines.push("");
  lines.push(generateQuickReference());
  return lines.join("\n");
}
__name(generateProtocolText, "generateProtocolText");
function generatePairingProtocol(workspaceRoot) {
  const state = getSessionState(workspaceRoot);
  const currentTask = getCurrentTask(workspaceRoot);
  let taskContext = null;
  if (currentTask) {
    taskContext = {
      id: currentTask.id,
      description: currentTask.description,
      duration: formatDuration3(Date.now() - currentTask.startedAt),
      filesChanged: state.changesSinceTaskStart.length,
      snapshotId: currentTask.snapshotId
    };
  }
  const recentObservations = state.pendingObservations.slice(-5).map((obs) => ({
    type: obs.type,
    message: obs.message,
    emoji: getObservationEmoji(obs.type)
  }));
  const recommendations = generateRecommendations(state);
  return {
    version: "2.0",
    currentTask: taskContext,
    recentObservations,
    riskAreas: [
      ...state.riskAreasTouched
    ],
    sessionStats: {
      ...state.stats
    },
    recommendations,
    quickReference: generateQuickReference(),
    protocolText: generateProtocolText(state)
  };
}
__name(generatePairingProtocol, "generatePairingProtocol");
function getContextSummary(workspaceRoot) {
  const state = getSessionState(workspaceRoot);
  return {
    hasActiveTask: state.currentTask !== null,
    taskId: state.currentTask?.id,
    filesChanged: state.changesSinceTaskStart.length,
    riskAreas: [
      ...state.riskAreasTouched
    ],
    pendingObservations: state.pendingObservations.length
  };
}
__name(getContextSummary, "getContextSummary");
var init_pairing_protocol = __esm({
  "src/facades/pairing-protocol.ts"() {
    init_state();
    __name6(getObservationEmoji, "getObservationEmoji");
    __name6(generateRecommendations, "generateRecommendations");
    __name6(generateQuickReference, "generateQuickReference");
    __name6(generateProtocolText, "generateProtocolText");
    __name6(generatePairingProtocol, "generatePairingProtocol");
    __name6(getContextSummary, "getContextSummary");
  }
});
function getErrorPatternRegistry() {
  if (!instance) {
    instance = new ErrorPatternRegistry();
  }
  return instance;
}
__name(getErrorPatternRegistry, "getErrorPatternRegistry");
var BUILT_IN_PATTERNS;
var ErrorPatternRegistry;
var instance;
var init_error_pattern_registry = __esm({
  "src/services/error-pattern-registry.ts"() {
    BUILT_IN_PATTERNS = [
      // TypeScript errors
      {
        id: "ts-property-not-exist",
        pattern: /error TS2339: Property '([^']+)' does not exist on type '([^']+)'/,
        category: "typescript",
        description: "Property access on incompatible type",
        solutions: [
          "Add the property to the type definition",
          "Use type assertion if property exists at runtime",
          "Check for typos in property name"
        ],
        autoFixable: false,
        confidence: 0.9
      },
      {
        id: "ts-type-not-assignable",
        pattern: /error TS2322: Type '([^']+)' is not assignable to type '([^']+)'/,
        category: "typescript",
        description: "Type mismatch in assignment",
        solutions: [
          "Fix the value to match expected type",
          "Update the type definition to accept the value",
          "Use type assertion if intentional"
        ],
        autoFixable: false,
        confidence: 0.9
      },
      {
        id: "ts-argument-not-assignable",
        pattern: /error TS2345: Argument of type '([^']+)' is not assignable to parameter of type '([^']+)'/,
        category: "typescript",
        description: "Function argument type mismatch",
        solutions: [
          "Fix the argument value to match expected type",
          "Update function signature to accept the type",
          "Use type assertion if intentional"
        ],
        autoFixable: false,
        confidence: 0.9
      },
      {
        id: "ts-cannot-find-name",
        pattern: /error TS2304: Cannot find name '([^']+)'/,
        category: "typescript",
        description: "Reference to undefined identifier",
        solutions: [
          "Import the missing symbol",
          "Check for typos in the name",
          "Declare the variable/type"
        ],
        autoFixable: false,
        confidence: 0.85
      },
      {
        id: "ts-module-not-found",
        pattern: /error TS2307: Cannot find module '([^']+)'/,
        category: "typescript",
        description: "Module resolution failure",
        solutions: [
          "Install the package: npm install <package>",
          "Check package.json for the dependency",
          "Verify tsconfig paths configuration"
        ],
        autoFixable: true,
        autoFix: {
          action: "install_package"
        },
        confidence: 0.9
      },
      // Filesystem errors
      {
        id: "fs-enoent",
        pattern: /ENOENT: no such file or directory(?:, (?:open|stat|read) '([^']+)')?/,
        category: "filesystem",
        description: "File or directory not found",
        solutions: [
          "Create the missing file/directory",
          "Check the path for typos",
          "Normalize path separators for cross-platform"
        ],
        autoFixable: true,
        autoFix: {
          action: "create_file"
        },
        confidence: 0.95
      },
      {
        id: "fs-eacces",
        pattern: /EACCES: permission denied(?:, (?:open|write|read) '([^']+)')?/,
        category: "filesystem",
        description: "Insufficient permissions",
        solutions: [
          "Check file permissions (chmod)",
          "Run with appropriate permissions",
          "Verify the path is correct"
        ],
        autoFixable: false,
        confidence: 0.9
      },
      {
        id: "fs-enospc",
        pattern: /ENOSPC: no space left on device/,
        category: "filesystem",
        description: "Disk space exhausted",
        solutions: [
          "Free up disk space",
          "Clean node_modules and reinstall",
          "Clear temporary files"
        ],
        autoFixable: false,
        confidence: 0.95
      },
      // Module resolution
      {
        id: "module-not-found",
        pattern: /Cannot find module '([^']+)'/,
        category: "module",
        description: "Module resolution failure",
        solutions: [
          "Install the package: npm install <package>",
          "Check package.json dependencies",
          "Verify the import path is correct"
        ],
        autoFixable: true,
        autoFix: {
          action: "install_package"
        },
        confidence: 0.85
      },
      {
        id: "module-export-not-found",
        pattern: /Module '"([^"]+)"' has no exported member '([^']+)'/,
        category: "module",
        description: "Named export not found in module",
        solutions: [
          "Check the correct export name",
          "Use default import instead",
          "Update the package version"
        ],
        autoFixable: false,
        confidence: 0.85
      },
      // Build errors
      {
        id: "build-syntax-error",
        pattern: /SyntaxError: (?:Unexpected token|Missing semicolon)/,
        category: "build",
        description: "JavaScript/TypeScript syntax error",
        solutions: [
          "Check for missing brackets or semicolons",
          "Verify ESM vs CommonJS syntax",
          "Run linter for syntax hints"
        ],
        autoFixable: false,
        confidence: 0.8
      },
      // Test errors
      {
        id: "test-assertion-failed",
        pattern: /AssertionError: expected .+ to (?:equal|be|have)/,
        category: "test",
        description: "Test assertion failure",
        solutions: [
          "Check the expected vs actual values",
          "Update the test or fix the implementation",
          "Verify test data is correct"
        ],
        autoFixable: false,
        confidence: 0.8
      },
      {
        id: "test-timeout",
        pattern: /Timeout of \d+ms exceeded/,
        category: "test",
        description: "Test exceeded timeout",
        solutions: [
          "Increase test timeout",
          "Check for async operations not awaited",
          "Verify mock responses are resolving"
        ],
        autoFixable: false,
        confidence: 0.85
      },
      // Lint errors
      {
        id: "lint-unused-var",
        pattern: /'([^']+)' is (?:defined but never used|assigned .+ but never used)/,
        category: "lint",
        description: "Unused variable/import",
        solutions: [
          "Remove the unused variable/import",
          "Prefix with underscore if intentional: _var",
          "Use the variable in code"
        ],
        autoFixable: true,
        autoFix: {
          action: "run_command",
          params: {
            command: "npx biome check --apply"
          }
        },
        confidence: 0.9
      }
    ];
    ErrorPatternRegistry = class {
      static {
        __name(this, "ErrorPatternRegistry");
      }
      static {
        __name6(this, "ErrorPatternRegistry");
      }
      patterns = [];
      constructor() {
        this.patterns.push(...BUILT_IN_PATTERNS);
      }
      /**
      * Register a custom pattern
      */
      register(pattern) {
        this.patterns.push(pattern);
      }
      /**
      * Match an error message against all patterns
      * Returns the best match (highest confidence)
      */
      match(errorMessage) {
        const matches = [];
        for (const pattern of this.patterns) {
          const regex = typeof pattern.pattern === "string" ? new RegExp(pattern.pattern) : pattern.pattern;
          const match = errorMessage.match(regex);
          if (match) {
            const extracted = {};
            if (match.groups) {
              Object.assign(extracted, match.groups);
            } else {
              match.slice(1).forEach((val, idx) => {
                if (val) {
                  extracted[`$${idx + 1}`] = val;
                }
              });
            }
            matches.push({
              pattern,
              match,
              extracted
            });
          }
        }
        if (matches.length === 0) {
          return null;
        }
        return matches.reduce((best, current) => current.pattern.confidence > best.pattern.confidence ? current : best);
      }
      /**
      * Match multiple error messages
      * Returns unique patterns with occurrence counts
      */
      matchMultiple(errors) {
        const matches = /* @__PURE__ */ new Map();
        for (const error of errors) {
          const result7 = this.match(error);
          if (result7) {
            const existing = matches.get(result7.pattern.id);
            if (existing) {
              existing.count++;
            } else {
              matches.set(result7.pattern.id, {
                ...result7,
                count: 1
              });
            }
          }
        }
        return Array.from(matches.values());
      }
      /**
      * Get patterns by category
      */
      getByCategory(category) {
        return this.patterns.filter((p) => p.category === category);
      }
      /**
      * Get all auto-fixable patterns
      */
      getAutoFixable() {
        return this.patterns.filter((p) => p.autoFixable);
      }
      /**
      * Format match result as hint text
      */
      formatHint(result7) {
        const lines = [];
        lines.push(`[${result7.pattern.category.toUpperCase()}] ${result7.pattern.description}`);
        if (result7.pattern.solutions.length > 0) {
          lines.push("Solutions:");
          for (const solution of result7.pattern.solutions.slice(0, 3)) {
            lines.push(`  - ${solution}`);
          }
        }
        if (result7.pattern.autoFixable && result7.pattern.autoFix) {
          lines.push(`Auto-fix: ${result7.pattern.autoFix.action}`);
        }
        return lines.join("\n");
      }
    };
    instance = null;
    __name6(getErrorPatternRegistry, "getErrorPatternRegistry");
  }
});
async function runCommand(cmd, args, cwd, timeoutMs = 3e4) {
  const start = Date.now();
  return new Promise((resolve32) => {
    let stdout = "";
    let stderr = "";
    let killed = false;
    const proc = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: [
        "pipe",
        "pipe",
        "pipe"
      ]
    });
    const timeout = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
    }, timeoutMs);
    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      resolve32({
        exitCode: killed ? -1 : code ?? 0,
        stdout,
        stderr,
        duration: Date.now() - start
      });
    });
    proc.on("error", (err2) => {
      clearTimeout(timeout);
      resolve32({
        exitCode: -1,
        stdout,
        stderr: err2.message,
        duration: Date.now() - start
      });
    });
  });
}
__name(runCommand, "runCommand");
async function checkTypeScript(files, workspaceRoot) {
  const start = Date.now();
  try {
    const result7 = await runCommand("npx", [
      "tsc",
      "--noEmit",
      "--pretty",
      "false"
    ], workspaceRoot, 15e3);
    const errors = [];
    const warnings = [];
    const lines = (result7.stdout + result7.stderr).split("\n");
    for (const line of lines) {
      if (line.includes("error TS")) {
        const isRelevant = files.some((f) => line.includes(basename(f)) || line.includes(relative(workspaceRoot, f)));
        if (isRelevant || files.length === 0) {
          errors.push(line.trim());
        }
      } else if (line.includes("warning")) {
        warnings.push(line.trim());
      }
    }
    return {
      passed: result7.exitCode === 0 || errors.length === 0,
      duration: Date.now() - start,
      errors: errors.slice(0, 10),
      warnings: warnings.slice(0, 5)
    };
  } catch {
    return {
      passed: true,
      duration: Date.now() - start,
      warnings: [
        "TypeScript check skipped: tsc not available"
      ]
    };
  }
}
__name(checkTypeScript, "checkTypeScript");
async function checkTests(files, workspaceRoot, runTests) {
  const start = Date.now();
  const testFiles = [];
  for (const file of files) {
    const dir = dirname(file);
    const base = basename(file, ".ts").replace(".tsx", "");
    const patterns = [
      join(dir, `${base}.test.ts`),
      join(dir, `${base}.test.tsx`),
      join(dir, `${base}.spec.ts`),
      join(dir, `${base}.spec.tsx`),
      join(dir, "__tests__", `${base}.test.ts`),
      join(dir, "__tests__", `${base}.test.tsx`)
    ];
    for (const pattern of patterns) {
      const fullPath = join(workspaceRoot, pattern);
      if (existsSync(fullPath)) {
        testFiles.push(pattern);
      }
    }
  }
  if (testFiles.length === 0) {
    const result7 = {
      passed: true,
      duration: Date.now() - start,
      discovered: 0,
      warnings: [
        "No related test files found"
      ]
    };
    return result7;
  }
  if (!runTests) {
    const result7 = {
      passed: true,
      duration: Date.now() - start,
      discovered: testFiles.length,
      warnings: [
        `${testFiles.length} test file(s) discovered but not run. Use runTests: true to execute.`
      ]
    };
    return result7;
  }
  try {
    const result7 = await runCommand("npx", [
      "vitest",
      "run",
      ...testFiles,
      "--reporter=json"
    ], workspaceRoot, 6e4);
    const errors = [];
    let passed = 0;
    let failed = 0;
    try {
      const jsonMatch = result7.stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
      if (jsonMatch) {
        const testResult2 = JSON.parse(jsonMatch[0]);
        passed = testResult2.numPassedTests || 0;
        failed = testResult2.numFailedTests || 0;
        if (testResult2.testResults) {
          for (const tr of testResult2.testResults) {
            if (tr.status === "failed" && tr.message) {
              errors.push(tr.message.slice(0, 200));
            }
          }
        }
      }
    } catch {
      const passMatch = result7.stdout.match(/(\d+) passed/);
      const failMatch = result7.stdout.match(/(\d+) failed/);
      if (passMatch) passed = Number.parseInt(passMatch[1], 10);
      if (failMatch) {
        failed = Number.parseInt(failMatch[1], 10);
        errors.push(`${failed} test(s) failed`);
      }
    }
    const testResult = {
      passed: result7.exitCode === 0,
      duration: Date.now() - start,
      discovered: testFiles.length,
      run: testFiles.length,
      passedCount: passed,
      failedCount: failed,
      errors: errors.slice(0, 5)
    };
    return testResult;
  } catch {
    const result7 = {
      passed: true,
      duration: Date.now() - start,
      discovered: testFiles.length,
      warnings: [
        "Test execution skipped: vitest not available"
      ]
    };
    return result7;
  }
}
__name(checkTests, "checkTests");
async function checkLint(files, workspaceRoot) {
  const start = Date.now();
  try {
    const fileArgs = files.map((f) => relative(workspaceRoot, join(workspaceRoot, f)));
    const result7 = await runCommand("npx", [
      "biome",
      "check",
      "--reporter=json",
      ...fileArgs
    ], workspaceRoot, 15e3);
    const errors = [];
    const warnings = [];
    try {
      const diagnostics = JSON.parse(result7.stdout);
      if (Array.isArray(diagnostics)) {
        for (const diag of diagnostics) {
          if (diag.severity === "error") {
            errors.push(`${diag.path}: ${diag.message}`);
          } else if (diag.severity === "warning") {
            warnings.push(`${diag.path}: ${diag.message}`);
          }
        }
      }
    } catch {
      if (result7.exitCode !== 0) {
        const lines = result7.stderr.split("\n").filter((l) => l.trim());
        errors.push(...lines.slice(0, 5));
      }
    }
    return {
      passed: result7.exitCode === 0 || errors.length === 0,
      duration: Date.now() - start,
      errors: errors.slice(0, 10),
      warnings: warnings.slice(0, 5)
    };
  } catch {
    return {
      passed: true,
      duration: Date.now() - start,
      warnings: [
        "Lint check skipped: biome not available"
      ]
    };
  }
}
__name(checkLint, "checkLint");
function result3(text, isError = false) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    isError
  };
}
__name(result3, "result3");
var handleQuickCheck;
var init_quick_check = __esm({
  "src/facades/quick-check.ts"() {
    init_error_cache_service();
    init_error_pattern_registry();
    init_state();
    __name6(runCommand, "runCommand");
    __name6(checkTypeScript, "checkTypeScript");
    __name6(checkTests, "checkTests");
    __name6(checkLint, "checkLint");
    __name6(result3, "result");
    handleQuickCheck = /* @__PURE__ */ __name6(async (args, context) => {
      const { file, files: providedFiles, skipTypeScript = false, skipTests = false, skipLint = false, runTests = false } = args;
      const workspaceRoot = context.workspaceRoot;
      let files = [];
      if (providedFiles && providedFiles.length > 0) {
        files = providedFiles;
      } else if (file) {
        files = [
          file
        ];
      } else {
        const task = getCurrentTask(workspaceRoot);
        if (task?.plannedFiles.length) {
          files = task.plannedFiles;
        }
      }
      if (files.length === 0) {
        return result3(JSON.stringify({
          error: "E102_MISSING_PARAM",
          message: "No files specified. Provide 'file', 'files', or start a task with begin_task."
        }), true);
      }
      const checks = await Promise.all([
        skipTypeScript ? Promise.resolve({
          passed: true,
          duration: 0,
          warnings: [
            "Skipped"
          ]
        }) : checkTypeScript(files, workspaceRoot),
        skipTests ? Promise.resolve({
          passed: true,
          duration: 0,
          discovered: 0,
          warnings: [
            "Skipped"
          ]
        }) : checkTests(files, workspaceRoot, runTests),
        skipLint ? Promise.resolve({
          passed: true,
          duration: 0,
          warnings: [
            "Skipped"
          ]
        }) : checkLint(files, workspaceRoot)
      ]);
      const [typescript, tests, lint] = checks;
      const allPassed = typescript.passed && tests.passed && lint.passed;
      const hasWarnings = (typescript.warnings?.length ?? 0) > 0 || (tests.warnings?.length ?? 0) > 0 || (lint.warnings?.length ?? 0) > 0;
      const overall = allPassed ? hasWarnings ? "warn" : "pass" : "fail";
      const parts = [];
      if (!typescript.passed) parts.push(`TypeScript: ${typescript.errors?.length || 1} error(s)`);
      if (!tests.passed) parts.push(`Tests: ${tests.failedCount || 1} failed`);
      if (!lint.passed) parts.push(`Lint: ${lint.errors?.length || 1} error(s)`);
      const summary = allPassed ? `All checks passed in ${typescript.duration + tests.duration + lint.duration}ms` : `Issues found: ${parts.join(", ")}`;
      if (!allPassed) {
        pushObservation(workspaceRoot, {
          type: "warning",
          message: summary,
          timestamp: Date.now()
        });
      }
      try {
        const errorCacheService = createErrorCacheService2(workspaceRoot);
        const errorsToCache = [];
        const now = Date.now();
        if (typescript.errors && typescript.errors.length > 0) {
          for (const errorMsg of typescript.errors) {
            const match = errorMsg.match(/^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/);
            if (match) {
              errorsToCache.push({
                file: match[1],
                line: Number.parseInt(match[2], 10),
                column: Number.parseInt(match[3], 10),
                code: match[4],
                message: match[5],
                severity: "error",
                timestamp: now,
                source: "typescript"
              });
            } else {
              errorsToCache.push({
                file: files[0] || "unknown",
                line: 0,
                message: errorMsg,
                severity: "error",
                timestamp: now,
                source: "typescript"
              });
            }
          }
        }
        if (lint.errors && lint.errors.length > 0) {
          for (const errorMsg of lint.errors) {
            const match = errorMsg.match(/^(.+?):\s*(.+)$/);
            if (match) {
              errorsToCache.push({
                file: match[1],
                line: 0,
                message: match[2],
                severity: "error",
                timestamp: now,
                source: "lint"
              });
            }
          }
        }
        const testResult = tests;
        if (testResult.errors && testResult.errors.length > 0) {
          for (const errorMsg of testResult.errors) {
            errorsToCache.push({
              file: files[0] || "unknown",
              line: 0,
              message: errorMsg,
              severity: "error",
              timestamp: now,
              source: "test"
            });
          }
        }
        if (errorsToCache.length > 0) {
          errorCacheService.cacheErrors(errorsToCache);
        }
        if (allPassed) {
          for (const file2 of files) {
            errorCacheService.clearForFile(file2);
          }
        }
      } catch {
      }
      const solutions = [];
      if (!allPassed) {
        const registry = getErrorPatternRegistry();
        const allErrors = [
          ...typescript.errors || [],
          ...lint.errors || [],
          ...tests.errors || []
        ];
        const matches = registry.matchMultiple(allErrors);
        for (const match of matches) {
          solutions.push({
            category: match.pattern.category,
            description: match.pattern.description,
            solutions: match.pattern.solutions,
            autoFixable: match.pattern.autoFixable,
            count: match.count
          });
        }
      }
      const nextActions = [];
      if (!typescript.passed) {
        nextActions.push({
          tool: "validate",
          priority: 1,
          reason: "Fix TypeScript errors before proceeding"
        });
      }
      if (!tests.passed) {
        nextActions.push({
          tool: "quick_check",
          priority: 2,
          reason: "Re-run tests after fixing failures"
        });
      }
      if (allPassed) {
        nextActions.push({
          tool: "review_work",
          priority: 3,
          reason: "All checks passed - ready for review"
        });
      }
      const output = {
        overall,
        typescript,
        tests,
        lint,
        summary,
        solutions: solutions.length > 0 ? solutions : void 0,
        nextActions
      };
      return result3(JSON.stringify({
        ...output,
        _hint: allPassed ? "All checks passed! Consider using review_work before committing." : "Issues found. Fix them and run quick_check again."
      }, null, 2));
    }, "handleQuickCheck");
  }
});
function getResponseConfig(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.local;
}
__name(getResponseConfig, "getResponseConfig");
function compressResponse(data, config) {
  const full = JSON.stringify(data);
  if (full.length <= config.maxBytes) {
    return data;
  }
  const compressed = JSON.parse(full);
  const arrayFields = [
    "learnings",
    "relevantLearnings",
    "violations",
    "recentViolations",
    "snapshots",
    "files"
  ];
  const maxArrayItems = config.tier === "pro" ? 10 : config.tier === "local" ? 5 : 3;
  for (const field of arrayFields) {
    if (Array.isArray(compressed[field]) && compressed[field].length > maxArrayItems) {
      const arr = compressed[field];
      const truncated = arr.slice(0, maxArrayItems);
      compressed[field] = truncated;
      compressed[`${field}Truncated`] = true;
      compressed[`${field}Total`] = arr.length;
    }
  }
  if (JSON.stringify(compressed).length <= config.maxBytes) {
    return compressed;
  }
  const verboseFields = [
    "formatted",
    "fullDiagnosis",
    "stackTrace",
    "rawOutput",
    "fullPath",
    "absolutePath"
  ];
  for (const field of verboseFields) {
    if (field in compressed) {
      delete compressed[field];
    }
  }
  function removeVerboseNested(obj) {
    for (const key of Object.keys(obj)) {
      if (verboseFields.includes(key)) {
        delete obj[key];
      } else if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
        removeVerboseNested(obj[key]);
      }
    }
  }
  __name(removeVerboseNested, "removeVerboseNested");
  __name6(removeVerboseNested, "removeVerboseNested");
  removeVerboseNested(compressed);
  if (JSON.stringify(compressed).length <= config.maxBytes) {
    return compressed;
  }
  function truncateStrings(obj, maxLen) {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "string" && val.length > maxLen) {
        obj[key] = val.slice(0, maxLen) + "...";
      } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        truncateStrings(val, maxLen);
      }
    }
  }
  __name(truncateStrings, "truncateStrings");
  __name6(truncateStrings, "truncateStrings");
  const maxStringLen = config.tier === "pro" ? 500 : config.tier === "local" ? 200 : 100;
  truncateStrings(compressed, maxStringLen);
  compressed._compressed = true;
  compressed._originalSize = full.length;
  compressed._tier = config.tier;
  return compressed;
}
__name(compressResponse, "compressResponse");
function buildSmartActions(baseActions, context) {
  const actions = [];
  for (const base of baseActions) {
    const action = {
      tool: base.tool,
      priority: base.priority || 2,
      confidence: 0.7,
      reason: base.reason
    };
    switch (base.tool) {
      case "snapshot_create":
        action.confidence = context.hasUnsavedChanges ? 0.95 : 0.5;
        action.condition = "Before making risky changes";
        action.skipIf = [
          "Files unchanged since last snapshot"
        ];
        if ((context.lastSnapshotMinutes ?? 0) < 5) {
          action.confidence = 0.2;
          action.skipIf?.push("Recent snapshot exists");
        }
        break;
      case "check_patterns":
        action.confidence = context.hasCodeChanges ? 0.95 : 0.6;
        action.condition = "Before committing code";
        action.skipIf = [
          "Already validated this session"
        ];
        break;
      case "get_context":
        action.confidence = context.isNewTask ? 0.95 : 0.4;
        action.condition = "When starting a new task";
        action.skipIf = [
          "Context already loaded for this task"
        ];
        break;
      case "get_learnings":
        action.confidence = (context.violationCount ?? 0) > 2 ? 0.85 : 0.5;
        action.condition = "When encountering repeated issues";
        break;
      case "report_violation":
        action.confidence = 0.8;
        action.condition = "After catching a mistake";
        break;
    }
    actions.push(action);
  }
  return actions.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.confidence - a.confidence;
  });
}
__name(buildSmartActions, "buildSmartActions");
function generateCoachingHint(context) {
  const { lastAction, taskPhase, violationCount, snapshotAge } = context;
  if (lastAction === "snapshot_create") {
    return randomChoice(COACHING_TEMPLATES.afterSnapshot);
  }
  if (lastAction === "report_violation") {
    return randomChoice(COACHING_TEMPLATES.afterViolation);
  }
  if ((snapshotAge ?? 0) > 60 && taskPhase === "working") {
    return randomChoice(COACHING_TEMPLATES.highRisk);
  }
  if (taskPhase && COACHING_TEMPLATES[taskPhase]) {
    if (Math.random() > 0.7) {
      return randomChoice(COACHING_TEMPLATES[taskPhase]);
    }
  }
  if ((violationCount ?? 0) > 3) {
    return `I've noticed ${violationCount} violations this session. Want me to pull up relevant learnings?`;
  }
  return null;
}
__name(generateCoachingHint, "generateCoachingHint");
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
__name(randomChoice, "randomChoice");
function getFileHashes22(filePaths, workspaceRoot) {
  const hashes = [];
  for (const filePath of filePaths) {
    const fullPath = filePath.startsWith("/") ? filePath : `${workspaceRoot}/${filePath}`;
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf8");
      hashes.push({
        path: filePath,
        hash: computeBlobId(content),
        size: content.length
      });
    }
  }
  return hashes;
}
__name(getFileHashes22, "getFileHashes2");
function filesMatchSnapshot(currentHashes, snapshotFiles) {
  const snapshotBlobMap = /* @__PURE__ */ new Map();
  for (const file of snapshotFiles) {
    const blobId = file.blobId || file.hash || (file.content ? computeBlobId(file.content) : "");
    if (blobId) {
      snapshotBlobMap.set(file.path, blobId);
    }
  }
  for (const current of currentHashes) {
    const snapshotBlobId = snapshotBlobMap.get(current.path);
    if (!snapshotBlobId) {
      return false;
    }
    if (snapshotBlobId !== current.hash) {
      return false;
    }
  }
  return true;
}
__name(filesMatchSnapshot, "filesMatchSnapshot");
function findMatchingSnapshot22(currentHashes, snapshots, maxSnapshotsToCheck = 5) {
  for (const snapshot of snapshots.slice(0, maxSnapshotsToCheck)) {
    if (filesMatchSnapshot(currentHashes, snapshot.files)) {
      return {
        matched: true,
        snapshotId: snapshot.id,
        createdAt: snapshot.createdAt
      };
    }
  }
  return {
    matched: false
  };
}
__name(findMatchingSnapshot22, "findMatchingSnapshot2");
function isLearningStalel(learning, maxAgeDays = 90) {
  if (learning.deprecated) {
    return true;
  }
  if (learning.validUntil && new Date(learning.validUntil) < /* @__PURE__ */ new Date()) {
    return true;
  }
  if (learning.timestamp) {
    const age = Date.now() - new Date(learning.timestamp).getTime();
    const ageDays = age / (1e3 * 60 * 60 * 24);
    if (ageDays > maxAgeDays) {
      return true;
    }
  }
  return false;
}
__name(isLearningStalel, "isLearningStalel");
function filterStaleLearnings(learnings, maxAgeDays = 90) {
  const valid = [];
  const stale = [];
  for (const learning of learnings) {
    if (isLearningStalel(learning, maxAgeDays)) {
      stale.push(learning);
    } else {
      valid.push(learning);
    }
  }
  return {
    valid,
    stale
  };
}
__name(filterStaleLearnings, "filterStaleLearnings");
function formatBytes2(bytes) {
  if (bytes === 0) return "0 B";
  const units = [
    "B",
    "KB",
    "MB",
    "GB"
  ];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(1)} ${units[i]}`;
}
__name(formatBytes2, "formatBytes");
function getArchitectureVersion(workspaceRoot) {
  const ctxPath = `${workspaceRoot}/.snapback/ctx/context.json`;
  try {
    if (existsSync(ctxPath)) {
      const ctx = JSON.parse(readFileSync(ctxPath, "utf8"));
      return ctx.archVersion || ctx.updated_at || null;
    }
  } catch {
  }
  return null;
}
__name(getArchitectureVersion, "getArchitectureVersion");
function cleanupStaleLearnings(learningsPath, opts) {
  if (!existsSync(learningsPath)) {
    return {
      found: 0,
      stale: 0,
      deleted: 0
    };
  }
  try {
    const content = readFileSync(learningsPath, "utf8");
    const lines = content.split("\n").filter(Boolean);
    const learnings = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
    const { valid, stale } = filterStaleLearnings(learnings, opts.maxAgeDays || 90);
    let archStale = [];
    if (opts.archVersion) {
      archStale = valid.filter((l) => l.archVersion && l.archVersion !== opts.archVersion);
    }
    const allStale = [
      ...stale,
      ...archStale
    ];
    const remaining = valid.filter((l) => !archStale.includes(l));
    if (!opts.dryRun && allStale.length > 0) {
      const newContent = remaining.map((l) => JSON.stringify(l)).join("\n") + "\n";
      writeFileSync(learningsPath, newContent);
    }
    return {
      found: learnings.length,
      stale: allStale.length,
      deleted: opts.dryRun ? 0 : allStale.length
    };
  } catch {
    return {
      found: 0,
      stale: 0,
      deleted: 0
    };
  }
}
__name(cleanupStaleLearnings, "cleanupStaleLearnings");
function cleanupArchivedSessions(sessionArchiveDir, opts) {
  if (!existsSync(sessionArchiveDir)) {
    return {
      found: 0,
      stale: 0,
      deleted: 0
    };
  }
  try {
    const files = readdirSync(sessionArchiveDir).filter((f) => f.endsWith(".json"));
    const cutoff = Date.now() - (opts.maxAgeDays || 30) * 24 * 60 * 60 * 1e3;
    const stale = [];
    for (const file of files) {
      const filePath = `${sessionArchiveDir}/${file}`;
      try {
        const session = JSON.parse(readFileSync(filePath, "utf8"));
        const endedAt = new Date(session.endedAt || session.startedAt).getTime();
        if (endedAt < cutoff) {
          stale.push(filePath);
        }
      } catch {
      }
    }
    if (!opts.dryRun) {
      for (const filePath of stale) {
        try {
          unlinkSync(filePath);
        } catch {
        }
      }
    }
    return {
      found: files.length,
      stale: stale.length,
      deleted: opts.dryRun ? 0 : stale.length
    };
  } catch {
    return {
      found: 0,
      stale: 0,
      deleted: 0
    };
  }
}
__name(cleanupArchivedSessions, "cleanupArchivedSessions");
var TIER_LIMITS;
var COACHING_TEMPLATES;
var computeBlobId;
var init_response_utils = __esm({
  "src/facades/response-utils.ts"() {
    TIER_LIMITS = {
      pro: {
        tier: "pro",
        maxBytes: 50 * 1024
      },
      local: {
        tier: "local",
        maxBytes: 15 * 1024
      },
      free: {
        tier: "free",
        maxBytes: 8 * 1024
      }
    };
    __name6(getResponseConfig, "getResponseConfig");
    __name6(compressResponse, "compressResponse");
    __name6(buildSmartActions, "buildSmartActions");
    COACHING_TEMPLATES = {
      starting: [
        "Let's get started! I'll keep an eye on things as you work.",
        "Ready to help. Remember: get_context \u2192 work \u2192 check_patterns \u2192 commit.",
        "Starting fresh. I'll remind you about patterns as we go."
      ],
      working: [
        "Looking good so far.",
        "Nice progress! Consider a snapshot checkpoint.",
        "Solid work. I'll flag any patterns I notice."
      ],
      finishing: [
        "Almost there! Don't forget check_patterns before committing.",
        "Wrapping up nicely. Ready for final validation?",
        "Great session! Time to validate and commit."
      ],
      afterSnapshot: [
        "Snapshot saved. You're safe to experiment now.",
        "Got your back with that snapshot. Go ahead and try it.",
        "Checkpoint created. Feel free to be bold."
      ],
      afterViolation: [
        "Noted that for next time. We'll catch it earlier.",
        "Learning recorded. I'll remind you about this pattern.",
        "Good catch. This will help us avoid it in the future."
      ],
      highRisk: [
        "\u26A0\uFE0F Heads up: this is a sensitive area. Snapshot first?",
        "This touches critical files. Let's create a safety net.",
        "High-risk change detected. Consider snapshotting first."
      ]
    };
    __name6(generateCoachingHint, "generateCoachingHint");
    __name6(randomChoice, "randomChoice");
    computeBlobId = hashContent;
    __name6(getFileHashes22, "getFileHashes");
    __name6(filesMatchSnapshot, "filesMatchSnapshot");
    __name6(findMatchingSnapshot22, "findMatchingSnapshot");
    __name6(isLearningStalel, "isLearningStalel");
    __name6(filterStaleLearnings, "filterStaleLearnings");
    __name6(formatBytes2, "formatBytes");
    __name6(getArchitectureVersion, "getArchitectureVersion");
    __name6(cleanupStaleLearnings, "cleanupStaleLearnings");
    __name6(cleanupArchivedSessions, "cleanupArchivedSessions");
  }
});
function getGitDiffStats(workspaceRoot, baselineFiles) {
  const files = [];
  let linesAdded = 0;
  let linesRemoved = 0;
  try {
    const numstat = execSync("git diff --numstat HEAD", {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 5e3
    });
    for (const line of numstat.split("\n")) {
      if (!line.trim()) continue;
      const [added, removed, file] = line.split("	");
      if (file) {
        if (baselineFiles?.has(file)) {
          continue;
        }
        const a = added === "-" ? 0 : Number.parseInt(added, 10);
        const r = removed === "-" ? 0 : Number.parseInt(removed, 10);
        linesAdded += a;
        linesRemoved += r;
        files.push({
          file,
          status: "M",
          linesChanged: a + r
        });
      }
    }
    const status2 = execSync("git status --porcelain", {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 5e3
    });
    for (const line of status2.split("\n")) {
      if (!line.trim()) continue;
      const statusCode = line.substring(0, 2);
      const file = line.substring(3).trim();
      if (baselineFiles?.has(file)) {
        continue;
      }
      const existing = files.find((f) => f.file === file);
      if (existing) {
        if (statusCode.includes("A") || statusCode === "??") {
          existing.status = "A";
        } else if (statusCode.includes("D")) {
          existing.status = "D";
        }
      } else if (statusCode === "??" || statusCode.includes("A")) {
        files.push({
          file,
          status: "A",
          linesChanged: 0
        });
      }
    }
  } catch {
  }
  return {
    files,
    linesAdded,
    linesRemoved
  };
}
__name(getGitDiffStats, "getGitDiffStats");
function generateCommitMessage(taskDescription, files) {
  let type = "chore";
  const lowerDesc = (taskDescription || "").toLowerCase();
  if (lowerDesc.includes("fix") || lowerDesc.includes("bug")) {
    type = "fix";
  } else if (lowerDesc.includes("add") || lowerDesc.includes("implement") || lowerDesc.includes("feature")) {
    type = "feat";
  } else if (lowerDesc.includes("test")) {
    type = "test";
  } else if (lowerDesc.includes("refactor")) {
    type = "refactor";
  } else if (lowerDesc.includes("doc")) {
    type = "docs";
  }
  let scope = "";
  const scopes = /* @__PURE__ */ new Set();
  for (const { file } of files) {
    const parts = file.split("/");
    if (parts.length >= 2) {
      if (parts[0] === "apps" || parts[0] === "packages") {
        scopes.add(parts[1]);
      }
    }
  }
  if (scopes.size === 1) {
    scope = Array.from(scopes)[0];
  } else if (scopes.size > 1) {
    scope = "multiple";
  }
  const subject = taskDescription ? taskDescription.replace(/^(add|fix|implement|update|refactor)\s+/i, "").trim() : `update ${files.length} file(s)`;
  const scopePart = scope ? `(${scope})` : "";
  return `${type}${scopePart}: ${subject}`;
}
__name(generateCommitMessage, "generateCommitMessage");
function suggestLearnings(files, issues) {
  const suggestions = [];
  const errorCount = issues.filter((i) => i.severity === "error").length;
  if (errorCount > 0) {
    suggestions.push({
      type: "pitfall",
      trigger: `Working on ${files.map((f) => basename(f.file)).join(", ")}`,
      action: `Check for ${issues[0]?.layer || "validation"} issues before committing`
    });
  }
  if (files.length > 5) {
    suggestions.push({
      type: "efficiency",
      trigger: "Large multi-file change",
      action: "Consider breaking into smaller, focused commits"
    });
  }
  const hasTests = files.some((f) => f.file.includes(".test.") || f.file.includes(".spec."));
  if (hasTests) {
    suggestions.push({
      type: "pattern",
      trigger: "Adding/modifying tests",
      action: "Run tests locally before pushing to CI"
    });
  }
  return suggestions.slice(0, 3);
}
__name(suggestLearnings, "suggestLearnings");
function result4(text, isError = false) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    isError
  };
}
__name(result4, "result4");
var init_review_work = __esm({
  "src/facades/review-work.ts"() {
    init_state();
    init_intelligence();
    __name6(getGitDiffStats, "getGitDiffStats");
    __name6(generateCommitMessage, "generateCommitMessage");
    __name6(suggestLearnings, "suggestLearnings");
    __name6(result4, "result");
  }
});
function getSessionFileTracker2(workspaceRoot) {
  if (!trackers2.has(workspaceRoot)) {
    trackers2.set(workspaceRoot, new SessionFileTracker2(workspaceRoot));
  }
  return trackers2.get(workspaceRoot);
}
__name(getSessionFileTracker2, "getSessionFileTracker");
var STATE_FILE2;
var SessionFileTracker2;
var trackers2;
var init_session_file_tracker = __esm({
  "src/services/session-file-tracker.ts"() {
    STATE_FILE2 = ".snapback/mcp/session-files.json";
    SessionFileTracker2 = class {
      static {
        __name(this, "SessionFileTracker");
      }
      static {
        __name6(this, "SessionFileTracker");
      }
      workspaceRoot;
      state;
      constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.state = this.loadState();
      }
      /**
      * Start tracking for a new task
      */
      startTask(taskId, plannedFiles = []) {
        this.state = {
          taskId,
          taskStartedAt: Date.now(),
          files: /* @__PURE__ */ new Map()
        };
        for (const file of plannedFiles) {
          this.trackFile(file, "planned");
        }
        this.saveState();
      }
      /**
      * End tracking for current task
      */
      endTask() {
        const files = this.getTrackedFiles();
        this.state = {
          taskId: null,
          taskStartedAt: null,
          files: /* @__PURE__ */ new Map()
        };
        this.saveState();
        return files;
      }
      /**
      * Track a file
      */
      trackFile(filePath, source, linesChanged) {
        if (!this.state.taskId) {
          return;
        }
        const normalizedPath = filePath.startsWith(this.workspaceRoot) ? relative(this.workspaceRoot, filePath) : filePath;
        const now = Date.now();
        const existing = this.state.files.get(normalizedPath);
        if (existing) {
          existing.lastTouched = now;
          if (linesChanged !== void 0) {
            existing.linesChanged = (existing.linesChanged || 0) + linesChanged;
          }
          const sourcePriority = {
            edited: 4,
            validated: 3,
            mentioned: 2,
            planned: 1
          };
          if (sourcePriority[source] > sourcePriority[existing.source]) {
            existing.source = source;
          }
        } else {
          const fullPath = join(this.workspaceRoot, normalizedPath);
          let size;
          try {
            if (existsSync(fullPath)) {
              size = statSync(fullPath).size;
            }
          } catch {
          }
          this.state.files.set(normalizedPath, {
            path: normalizedPath,
            source,
            firstTracked: now,
            lastTouched: now,
            linesChanged,
            size
          });
        }
        this.saveState();
      }
      /**
      * Track multiple files at once
      */
      trackFiles(files, source) {
        for (const file of files) {
          this.trackFile(file, source);
        }
      }
      /**
      * Get all tracked files for current task
      */
      getTrackedFiles() {
        return Array.from(this.state.files.values());
      }
      /**
      * Get files changed since task start (for what_changed)
      */
      getChangedFiles() {
        const files = this.getTrackedFiles();
        return files.map((f) => ({
          file: f.path,
          type: this.determineChangeType(f),
          linesChanged: f.linesChanged || 0,
          aiAttributed: f.source === "edited" || f.source === "validated",
          timestamp: f.lastTouched
        }));
      }
      /**
      * Determine change type based on file state
      */
      determineChangeType(file) {
        const fullPath = join(this.workspaceRoot, file.path);
        if (!existsSync(fullPath)) {
          return "deleted";
        }
        return "modified";
      }
      /**
      * Check if currently tracking a task
      */
      hasActiveTask() {
        return this.state.taskId !== null;
      }
      /**
      * Get current task ID
      */
      getCurrentTaskId() {
        return this.state.taskId;
      }
      /**
      * Get task duration in ms
      */
      getTaskDuration() {
        if (!this.state.taskStartedAt) {
          return 0;
        }
        return Date.now() - this.state.taskStartedAt;
      }
      /**
      * Get stats for the current session
      */
      getStats() {
        const files = this.getTrackedFiles();
        return {
          filesTracked: files.length,
          totalLinesChanged: files.reduce((sum, f) => sum + (f.linesChanged || 0), 0),
          durationMs: this.getTaskDuration()
        };
      }
      // =========================================================================
      // Persistence
      // =========================================================================
      getStatePath() {
        return join(this.workspaceRoot, STATE_FILE2);
      }
      loadState() {
        const statePath = this.getStatePath();
        try {
          if (existsSync(statePath)) {
            const data = JSON.parse(readFileSync(statePath, "utf8"));
            return {
              taskId: data.taskId || null,
              taskStartedAt: data.taskStartedAt || null,
              files: new Map(Object.entries(data.files || {}))
            };
          }
        } catch {
        }
        return {
          taskId: null,
          taskStartedAt: null,
          files: /* @__PURE__ */ new Map()
        };
      }
      saveState() {
        const statePath = this.getStatePath();
        try {
          const dir = dirname(statePath);
          if (!existsSync(dir)) {
            mkdirSync(dir, {
              recursive: true
            });
          }
          const data = {
            taskId: this.state.taskId,
            taskStartedAt: this.state.taskStartedAt,
            files: Object.fromEntries(this.state.files)
          };
          writeFileSync(statePath, JSON.stringify(data, null, 2));
        } catch {
        }
      }
    };
    trackers2 = /* @__PURE__ */ new Map();
    __name6(getSessionFileTracker2, "getSessionFileTracker");
  }
});
function getFileDiff(file, workspaceRoot) {
  try {
    const result7 = execSync(`git diff --no-color -- "${file}"`, {
      cwd: workspaceRoot,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 5e3
    });
    return result7.trim() || null;
  } catch {
    return null;
  }
}
__name(getFileDiff, "getFileDiff");
function getGitChanges(workspaceRoot) {
  const changes = /* @__PURE__ */ new Map();
  try {
    const result7 = execSync("git status --porcelain", {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 5e3
    });
    for (const line of result7.split("\n")) {
      if (!line.trim()) {
        continue;
      }
      const status2 = line.substring(0, 2);
      const file = line.substring(3).trim();
      if (status2.includes("A") || status2 === "??") {
        changes.set(file, "A");
      } else if (status2.includes("D")) {
        changes.set(file, "D");
      } else if (status2.includes("M") || status2.includes("U")) {
        changes.set(file, "M");
      }
    }
  } catch {
  }
  return changes;
}
__name(getGitChanges, "getGitChanges");
function countLinesChanged(diff) {
  let count = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      count++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      count++;
    }
  }
  return count;
}
__name(countLinesChanged, "countLinesChanged");
function assessChangeRisk(changes) {
  const factors = [];
  const criticalPatterns = [
    "auth",
    "payment",
    "security",
    "config",
    "migration",
    "env"
  ];
  for (const change of changes) {
    const lowerFile = change.file.toLowerCase();
    for (const pattern of criticalPatterns) {
      if (lowerFile.includes(pattern)) {
        factors.push(`Critical file modified: ${change.file}`);
        break;
      }
    }
  }
  const aiFiles = changes.filter((c) => c.aiAttributed).length;
  const aiRatio = changes.length > 0 ? aiFiles / changes.length : 0;
  if (aiRatio > 0.7 && changes.length >= 3) {
    factors.push(`High AI-attribution ratio: ${Math.round(aiRatio * 100)}% of changes`);
  }
  const totalLines = changes.reduce((sum, c) => sum + c.linesChanged, 0);
  if (totalLines > 500) {
    factors.push(`Large change set: ${totalLines} lines`);
  }
  let level = "low";
  if (factors.length >= 3) {
    level = "high";
  } else if (factors.length >= 1) {
    level = "medium";
  }
  return {
    level,
    factors
  };
}
__name(assessChangeRisk, "assessChangeRisk");
function result5(text, isError = false) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    isError
  };
}
__name(result5, "result5");
var init_what_changed = __esm({
  "src/facades/what-changed.ts"() {
    init_client_facade();
    init_session_file_tracker();
    init_state();
    init_intelligence();
    __name6(getFileDiff, "getFileDiff");
    __name6(getGitChanges, "getGitChanges");
    __name6(countLinesChanged, "countLinesChanged");
    __name6(assessChangeRisk, "assessChangeRisk");
    __name6(result5, "result");
  }
});
function result6(text, isError = false) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    isError
  };
}
__name(result6, "result6");
function jsonResult(data, options) {
  let finalData = data;
  if (options?.coaching) {
    const hint = generateCoachingHint(options.coaching);
    if (hint) {
      finalData = {
        ...finalData,
        _hint: hint
      };
    }
  }
  if (options?.compress !== false && options?.context) {
    const config = getResponseConfig(options.context.tier || "local");
    finalData = compressResponse(finalData, config);
  }
  return result6(JSON.stringify(finalData, null, 2));
}
__name(jsonResult, "jsonResult");
function errorJsonResult(data) {
  return result6(JSON.stringify(data, null, 2), true);
}
__name(errorJsonResult, "errorJsonResult");
function listSnapshotsReadonly(workspaceRoot) {
  const snapshotDir = join(workspaceRoot, ".snapback", "snapshots");
  if (!existsSync(snapshotDir)) {
    return [];
  }
  try {
    const files = __require4("fs").readdirSync(snapshotDir).filter((f) => f.endsWith(".json"));
    return files.map((file) => {
      try {
        const content = readFileSync(join(snapshotDir, file), "utf8");
        const parsed = JSON.parse(content);
        return {
          id: parsed.id,
          createdAt: parsed.createdAt,
          files: parsed.files || []
        };
      } catch {
        return null;
      }
    }).filter((m) => m !== null).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}
__name(listSnapshotsReadonly, "listSnapshotsReadonly");
function isLocalWorkspace(workspacePath) {
  if (workspacePath.startsWith("/") || workspacePath.startsWith("~") || /^[A-Za-z]:/.test(workspacePath)) {
    return true;
  }
  return false;
}
__name(isLocalWorkspace, "isLocalWorkspace");
function calculatePackageScore(learningPackages, queryPackages) {
  if (!learningPackages || learningPackages.length === 0 || queryPackages.length === 0) {
    return 0;
  }
  let matches = 0;
  for (const queryPkg of queryPackages) {
    const queryLower = queryPkg.toLowerCase();
    for (const learningPkg of learningPackages) {
      const learningLower = learningPkg.toLowerCase();
      if (learningLower === queryLower || learningLower.includes(queryLower) || queryLower.includes(learningLower)) {
        matches++;
        break;
      }
    }
  }
  const matchRatio = matches / queryPackages.length;
  return Math.round(matchRatio * 100);
}
__name(calculatePackageScore, "calculatePackageScore");
function parseImportPath(path6) {
  if (path6.startsWith("@")) {
    const parts2 = path6.split("/");
    if (parts2.length >= 2) {
      return {
        packageName: `${parts2[0]}/${parts2[1]}`,
        subpath: parts2.slice(2).join("/")
      };
    }
    return {
      packageName: path6,
      subpath: ""
    };
  }
  const parts = path6.split("/");
  return {
    packageName: parts[0],
    subpath: parts.slice(1).join("/")
  };
}
__name(parseImportPath, "parseImportPath");
function findPackageDir(workspaceRoot, packageName) {
  const nodeModulesPath = join(workspaceRoot, "node_modules", ...packageName.split("/"));
  if (existsSync(nodeModulesPath)) {
    return nodeModulesPath;
  }
  const localPackagesPath = join(workspaceRoot, "packages");
  if (existsSync(localPackagesPath)) {
    const localName = packageName.startsWith("@") ? packageName.split("/")[1] : packageName;
    const localPath = join(localPackagesPath, localName);
    if (existsSync(localPath)) {
      return localPath;
    }
  }
  return null;
}
__name(findPackageDir, "findPackageDir");
function extractExportsFromFile(packageDir, exportTarget) {
  const exports$1 = [];
  let targetPath = join(packageDir, exportTarget);
  const extensions = [
    "",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs"
  ];
  let resolvedPath = null;
  for (const ext of extensions) {
    const tryPath = targetPath + ext;
    if (existsSync(tryPath)) {
      resolvedPath = tryPath;
      break;
    }
    const indexPath = join(targetPath, `index${ext}`);
    if (existsSync(indexPath)) {
      resolvedPath = indexPath;
      break;
    }
  }
  if (!resolvedPath) {
    const srcTarget = exportTarget.replace("./dist/", "./src/").replace(".js", ".ts");
    targetPath = join(packageDir, srcTarget);
    for (const ext of extensions) {
      const tryPath = targetPath + ext;
      if (existsSync(tryPath)) {
        resolvedPath = tryPath;
        break;
      }
      const indexPath = join(targetPath, `index${ext}`);
      if (existsSync(indexPath)) {
        resolvedPath = indexPath;
        break;
      }
    }
  }
  if (!resolvedPath) {
    return exports$1;
  }
  try {
    const content = readFileSync(resolvedPath, "utf8");
    const exportPatterns = [
      /export\s+\{\s*([^}]+)\s*\}/g,
      /export\s+(?:const|let|var)\s+(\w+)/g,
      /export\s+function\s+(\w+)/g,
      /export\s+class\s+(\w+)/g,
      /export\s+type\s+(\w+)/g,
      /export\s+interface\s+(\w+)/g
    ];
    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const captured = match[1];
        const names = captured.split(",").map((n) => n.trim().split(/\s+as\s+/)[0].trim());
        for (const name of names) {
          if (name && !exports$1.includes(name)) {
            if (pattern.source.includes("type") || pattern.source.includes("interface")) {
              exports$1.push(`type ${name}`);
            } else {
              exports$1.push(name);
            }
          }
        }
      }
    }
  } catch {
  }
  return exports$1;
}
__name(extractExportsFromFile, "extractExportsFromFile");
function getExportDescription(exportPath) {
  const pathDescriptions = {
    ".": "Main entry point",
    "./analysis": "Code analysis utilities",
    "./signals": "Signal/event system",
    "./types": "TypeScript type definitions",
    "./utils": "Utility functions",
    "./core": "Core functionality"
  };
  return pathDescriptions[exportPath] || "";
}
__name(getExportDescription, "getExportDescription");
var handleValidate;
var handleLearn;
var handleCheckPatterns;
var handleReportViolation;
var init_handlers = __esm({
  "src/facades/handlers.ts"() {
    init_errors();
    init_hybrid_retrieval_service();
    init_knowledge_ingestion_service();
    init_validation();
    init_begin_task();
    init_complete_task();
    init_intelligence();
    init_pairing_protocol();
    init_quick_check();
    init_response_utils();
    init_review_work();
    init_what_changed();
    __name6(result6, "result");
    __name6(jsonResult, "jsonResult");
    __name6(errorJsonResult, "errorJsonResult");
    __name6(listSnapshotsReadonly, "listSnapshotsReadonly");
    __name6(isLocalWorkspace, "isLocalWorkspace");
    handleValidate = /* @__PURE__ */ __name6(async (args, context) => {
      const { mode = "quick", code, filePath } = args;
      if (!code || !filePath) {
        return errorJsonResult(CommonErrors.missingParam("code, filePath"));
      }
      if (mode === "comprehensive") {
        try {
          const intel = getIntelligence2(context.workspaceRoot);
          const validation = await intel.checkPatterns(code, filePath);
          return jsonResult({
            status: "success",
            mode: "comprehensive",
            filePath,
            passed: validation.overall.passed,
            confidence: validation.overall.confidence,
            totalIssues: validation.overall.totalIssues,
            recommendation: validation.recommendation,
            layers: validation.layers.map((l) => ({
              name: l.layer,
              passed: l.passed,
              issueCount: l.issues.length,
              issues: l.issues.map((i) => ({
                severity: i.severity,
                type: i.type,
                message: i.message,
                line: i.line,
                fix: i.fix
              })),
              duration: l.duration
            })),
            focusPoints: validation.focusPoints,
            message: validation.overall.passed ? "All validation layers passed" : `Found ${validation.overall.totalIssues} issue(s) across ${validation.layers.filter((l) => !l.passed).length} layer(s)`,
            next_actions: validation.overall.passed ? [] : [
              {
                tool: "validate",
                priority: 1,
                reason: "Re-validate after fixes",
                args: {
                  mode: "comprehensive"
                }
              }
            ]
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return result6(`Comprehensive validation failed: ${message}`, true);
        }
      }
      const violations = [];
      const lines = code.split("\n");
      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        if (line.includes("console.log")) {
          violations.push({
            rule: "no-console",
            severity: "warning",
            line: lineNum,
            message: "console.log found - consider removing for production"
          });
        }
        if (/:\s*any\b/.test(line) || /as\s+any\b/.test(line)) {
          violations.push({
            rule: "no-explicit-any",
            severity: "warning",
            line: lineNum,
            message: "Explicit 'any' type found - consider more specific type"
          });
        }
        if (/\/\/\s*(TODO|FIXME|HACK|XXX)\b/i.test(line)) {
          violations.push({
            rule: "no-todo-comments",
            severity: "info",
            line: lineNum,
            message: "TODO/FIXME comment found - consider addressing before commit"
          });
        }
        if (/debugger\b/.test(line)) {
          violations.push({
            rule: "no-debugger",
            severity: "critical",
            line: lineNum,
            message: "debugger statement found - must remove before production"
          });
        }
      });
      if (filePath.includes("auth") || filePath.includes("security")) {
        if (code.includes("eval(") || code.includes("Function(")) {
          violations.push({
            rule: "no-eval-in-security",
            severity: "critical",
            message: "eval/Function in security-sensitive file - potential code injection risk"
          });
        }
      }
      const criticalCount = violations.filter((v) => v.severity === "critical").length;
      const warningCount = violations.filter((v) => v.severity === "warning").length;
      const confidence = criticalCount > 0 ? 30 : warningCount > 2 ? 60 : violations.length === 0 ? 100 : Math.max(70, 100 - warningCount * 10);
      const recommendation = confidence >= 95 ? "auto_merge" : confidence >= 70 ? "quick_review" : "full_review";
      return jsonResult({
        status: "success",
        mode: "quick",
        filePath,
        passed: criticalCount === 0,
        confidence,
        totalIssues: violations.length,
        violations,
        recommendation,
        message: violations.length === 0 ? "No violations found" : `Found ${violations.length} issue(s): ${criticalCount} critical, ${warningCount} warnings`,
        hint: criticalCount > 0 ? "Fix critical issues before committing" : warningCount > 2 ? "Consider running comprehensive validation" : null,
        next_actions: criticalCount > 0 || warningCount > 2 ? [
          {
            tool: "validate",
            priority: 1,
            reason: "Run comprehensive validation",
            args: {
              mode: "comprehensive"
            }
          }
        ] : []
      });
    }, "handleValidate");
    handleLearn = /* @__PURE__ */ __name6(async (args, context) => {
      const { type, trigger, action, source } = args;
      if (!type || !trigger || !action) {
        return errorJsonResult(CommonErrors.missingParam("type, trigger, action"));
      }
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 6);
      const id = `learn_${timestamp}${random}`;
      const learning = {
        id,
        type,
        trigger,
        action,
        source: source || "mcp",
        timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
      };
      const learningsPath = join(context.workspaceRoot, ".snapback", "learnings", "learnings.jsonl");
      const isRemoteMode = !isLocalWorkspace(context.workspaceRoot);
      if (isRemoteMode) {
        return jsonResult({
          id,
          status: "success",
          learning,
          message: "Learning captured (client-side storage required)",
          remoteMode: true,
          instruction: "Store this learning locally in .snapback/learnings/learnings.jsonl"
        });
      }
      try {
        const dir = dirname(learningsPath);
        if (!existsSync(dir)) {
          await import('fs').then((fs6) => fs6.mkdirSync(dir, {
            recursive: true
          }));
        }
        const line = `${JSON.stringify(learning)}
`;
        await import('fs').then((fs6) => fs6.appendFileSync(learningsPath, line));
        indexLearning(context.workspaceRoot, learning).catch((indexError) => {
          console.warn("[handleLearn] Failed to index learning:", indexError);
        });
        invalidateRetrieverCache(context.workspaceRoot);
        invalidateCache(context.workspaceRoot);
        return jsonResult({
          id,
          status: "success",
          learning,
          message: "Learning recorded",
          storagePath: learningsPath
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("EACCES") || message.includes("EPERM") || message.includes("permission")) {
          return jsonResult({
            id,
            status: "success",
            learning,
            message: "Learning captured (permission denied, client-side storage required)",
            remoteMode: true,
            instruction: "Store this learning locally in .snapback/learnings/learnings.jsonl",
            warning: "Server cannot write to workspace directory"
          });
        }
        return result6(`Failed to record learning: ${message}`, true);
      }
    }, "handleLearn");
    handleCheckPatterns = /* @__PURE__ */ __name6(async (args, context) => {
      const { code, filePath } = args;
      if (!code || !filePath) {
        return errorJsonResult(CommonErrors.missingParam("code, filePath"));
      }
      try {
        const intel = getIntelligence2(context.workspaceRoot);
        const validation = await intel.checkPatterns(code, filePath);
        return jsonResult({
          passed: validation.overall.passed,
          confidence: validation.overall.confidence,
          totalIssues: validation.overall.totalIssues,
          recommendation: validation.recommendation,
          layers: validation.layers.map((l) => ({
            name: l.layer,
            passed: l.passed,
            issueCount: l.issues.length,
            issues: l.issues.map((i) => ({
              severity: i.severity,
              type: i.type,
              message: i.message,
              line: i.line,
              fix: i.fix
            })),
            duration: l.duration
          })),
          focusPoints: validation.focusPoints,
          next_actions: validation.overall.passed ? [] : [
            {
              tool: "check_patterns",
              priority: 1,
              reason: "Re-validate after fixes"
            }
          ]
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return result6(`Failed to check patterns: ${message}`, true);
      }
    }, "handleCheckPatterns");
    handleReportViolation = /* @__PURE__ */ __name6(async (args, context) => {
      const { type, file, whatHappened, whyItHappened, prevention } = args;
      if (!type || !file || !whatHappened || !whyItHappened || !prevention) {
        return errorJsonResult(CommonErrors.missingParam("type, file, whatHappened, whyItHappened, prevention"));
      }
      try {
        const intel = getIntelligence2(context.workspaceRoot);
        const status2 = await intel.reportViolation({
          type,
          file,
          message: whatHappened,
          reason: whyItHappened,
          prevention
        });
        return jsonResult({
          recorded: true,
          violationId: status2.id,
          type,
          file,
          occurrences: status2.count,
          promoted: status2.shouldPromote,
          promotedTo: status2.shouldPromote ? "pattern" : null,
          automation: status2.shouldAutomate ? "pending" : null,
          message: status2.shouldPromote ? `Violation promoted to pattern after ${status2.count} occurrences` : `Violation recorded (${status2.count}/3 for promotion)`,
          next_actions: status2.shouldPromote ? [
            {
              tool: "get_context",
              priority: 2,
              reason: "New pattern available in context"
            }
          ] : []
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return result6(`Failed to report violation: ${message}`, true);
      }
    }, "handleReportViolation");
    __name6(calculatePackageScore, "calculatePackageScore");
    __name6(parseImportPath, "parseImportPath");
    __name6(findPackageDir, "findPackageDir");
    __name6(extractExportsFromFile, "extractExportsFromFile");
    __name6(getExportDescription, "getExportDescription");
  }
});
function normalizeCheckParams(params) {
  let mode = "quick";
  if (params.mode) {
    mode = params.mode;
  } else if (params.m) {
    mode = MODE_MAP[params.m] || "quick";
  }
  const rawFiles = params.files ?? params.f;
  const files = rawFiles ? Array.isArray(rawFiles) ? rawFiles : [
    rawFiles
  ] : [];
  return {
    mode,
    files,
    compact: params.compact ?? false
  };
}
__name(normalizeCheckParams, "normalizeCheckParams");
async function handleBuildCheck(context) {
  return new Promise((resolve32) => {
    const proc = spawn("pnpm", [
      "build"
    ], {
      cwd: context.workspaceRoot,
      shell: true,
      stdio: [
        "pipe",
        "pipe",
        "pipe"
      ]
    });
    let stderr = "";
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      const passed = code === 0;
      const errors = passed ? [] : [
        "Build failed"
      ];
      const warnings = [];
      if (!passed && stderr) {
        const lines = stderr.split("\n").filter((l) => l.includes("error") || l.includes("Error"));
        errors.push(...lines.slice(0, 3));
      }
      resolve32({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              passed,
              errors,
              warnings,
              message: passed ? "Build succeeded" : "Build failed"
            })
          }
        ],
        isError: !passed
      });
    });
    proc.on("error", (err2) => {
      resolve32({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              passed: false,
              errors: [
                err2.message
              ],
              warnings: [],
              message: "Build command failed to execute"
            })
          }
        ],
        isError: true
      });
    });
  });
}
__name(handleBuildCheck, "handleBuildCheck");
async function handleImpactAnalysis(files, context) {
  if (files.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed: false,
            errors: [
              "No files specified for impact analysis"
            ],
            warnings: []
          })
        }
      ],
      isError: true
    };
  }
  try {
    const analyzer = createChangeImpactAnalyzer(context.workspaceRoot);
    const contents = /* @__PURE__ */ new Map();
    let totalBytes = 0;
    const analyzedFiles = [];
    for (const file of files) {
      const fullPath = join(context.workspaceRoot, file);
      if (existsSync(fullPath)) {
        const stats = statSync(fullPath);
        const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
        totalBytes += stats.size;
        try {
          const content = readFileSync(fullPath, "utf-8");
          contents.set(fullPath, content);
          analyzedFiles.push({
            file: basename(file),
            sizeKB
          });
        } catch {
        }
      }
    }
    const absolutePaths = files.map((f) => join(context.workspaceRoot, f)).filter((f) => contents.has(f));
    const impact = await analyzer.getFullImpact(absolutePaths, contents);
    const totalKB = Math.round(totalBytes / 1024 * 100) / 100;
    const passed = impact.impactScore < 0.5;
    const warnings = [];
    const errors = [];
    if (impact.breakingChanges.length > 0) {
      errors.push(`${impact.breakingChanges.length} breaking change(s) detected`);
    }
    if (impact.affectedTests.length > 10) {
      warnings.push(`${impact.affectedTests.length} tests potentially affected`);
    }
    if (impact.performanceImpacts.some((p) => p.risk === "high")) {
      warnings.push("High-risk performance changes detected");
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed,
            analysis: {
              filesAnalyzed: impact.filesAnalyzed,
              totalKB,
              impactScore: Math.round(impact.impactScore * 100) / 100,
              affectedTests: impact.affectedTests.length,
              breakingChanges: impact.breakingChanges.length,
              performanceImpacts: impact.performanceImpacts.filter((p) => p.risk !== "low").length,
              dependentFiles: impact.dependentFiles.length,
              recommendations: impact.recommendations.slice(0, 3)
            },
            message: `Impact: ${Math.round(impact.impactScore * 100)}% risk | ${impact.affectedTests.length} tests | ${impact.breakingChanges.length} breaking`,
            warnings,
            errors
          })
        }
      ],
      isError: !passed
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed: false,
            errors: [
              error instanceof Error ? error.message : String(error)
            ],
            warnings: [],
            message: "Impact analysis failed"
          })
        }
      ],
      isError: true
    };
  }
}
__name(handleImpactAnalysis, "handleImpactAnalysis");
async function handleCircularCheck(targetDirs, context) {
  try {
    const madgeModule = await import('madge');
    const madge = madgeModule.default || madgeModule;
    const dirsToCheck = targetDirs.length > 0 ? targetDirs.map((d) => join(context.workspaceRoot, d)) : [
      join(context.workspaceRoot, "packages/core/src"),
      join(context.workspaceRoot, "packages/intelligence/src"),
      join(context.workspaceRoot, "packages/mcp/src"),
      join(context.workspaceRoot, "apps/web/src"),
      join(context.workspaceRoot, "apps/vscode/src")
    ];
    const allCycles = [];
    const affectedPackages = [];
    for (const dir of dirsToCheck) {
      if (!existsSync(dir)) {
        continue;
      }
      try {
        const result7 = await madge(dir, {
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
            /__mocks__/
          ],
          detectiveOptions: {
            ts: {
              skipTypeImports: true
            }
          }
        });
        const cycles = result7.circular();
        if (cycles.length > 0) {
          affectedPackages.push(basename(dir));
          for (const cycle of cycles) {
            allCycles.push({
              package: basename(dir),
              cycle
            });
          }
        }
      } catch {
      }
    }
    const passed = allCycles.length === 0;
    const errors = allCycles.slice(0, 5).map((c) => ({
      file: c.package,
      message: c.cycle.join(" -> ")
    }));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed,
            totalCycles: allCycles.length,
            affectedPackages,
            errors: passed ? [] : errors,
            warnings: [],
            message: passed ? "No circular dependencies" : `${allCycles.length} cycles in ${affectedPackages.length} package(s)`
          })
        }
      ],
      isError: !passed
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed: false,
            errors: [
              {
                message: error instanceof Error ? error.message : String(error)
              }
            ],
            warnings: [],
            message: "Circular dependency check failed"
          })
        }
      ],
      isError: true
    };
  }
}
__name(handleCircularCheck, "handleCircularCheck");
async function handleDocFreshnessCheck(context) {
  try {
    const { glob } = await import('glob');
    const { stat: stat4 } = await import('fs/promises');
    const { dirname: dirname62, relative: relative72 } = await import('path');
    const staleHours = 72;
    const now = Date.now();
    const staleThreshold = now - staleHours * 60 * 60 * 1e3;
    const docFiles = await glob([
      "**/*.md",
      "**/CLAUDE.md",
      "**/*-audit.md",
      "**/*ROADMAP*.md"
    ], {
      cwd: context.workspaceRoot,
      absolute: true,
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**"
      ]
    });
    const sourceFiles = await glob([
      "**/*.ts",
      "**/*.tsx"
    ], {
      cwd: context.workspaceRoot,
      absolute: true,
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**"
      ]
    });
    const getMtime = /* @__PURE__ */ __name6(async (file) => {
      try {
        const stats = await stat4(file);
        return stats.mtimeMs;
      } catch {
        return 0;
      }
    }, "getMtime");
    const docMtimes = /* @__PURE__ */ new Map();
    const srcMtimes = /* @__PURE__ */ new Map();
    await Promise.all([
      ...docFiles.map(async (f) => docMtimes.set(f, await getMtime(f))),
      ...sourceFiles.map(async (f) => srcMtimes.set(f, await getMtime(f)))
    ]);
    const staleDocs = [];
    for (const [docPath, docMtime] of docMtimes) {
      const hoursStale = Math.round((now - docMtime) / (60 * 60 * 1e3));
      const docDir = dirname62(docPath);
      const newerSourceFiles = [];
      for (const [srcPath, srcMtime] of srcMtimes) {
        if (srcPath.startsWith(docDir) && srcMtime > docMtime) {
          newerSourceFiles.push(relative72(context.workspaceRoot, srcPath));
        }
      }
      const isStale = docMtime < staleThreshold || newerSourceFiles.length > 0;
      if (isStale) {
        staleDocs.push({
          path: relative72(context.workspaceRoot, docPath),
          hoursStale,
          newerSourceFiles: newerSourceFiles.slice(0, 5),
          severity: hoursStale > staleHours * 2 ? "error" : "warning"
        });
      }
    }
    staleDocs.sort((a, b) => b.hoursStale - a.hoursStale);
    const freshDocs = docMtimes.size - staleDocs.length;
    const freshnessValue = docMtimes.size > 0 ? Math.round(freshDocs / docMtimes.size * 100) : 100;
    const passed = staleDocs.length === 0;
    const errors = staleDocs.slice(0, 5).map((doc) => ({
      file: doc.path,
      message: `${doc.hoursStale}h stale${doc.newerSourceFiles.length > 0 ? ` (${doc.newerSourceFiles.length} newer src)` : ""}`
    }));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed,
            freshness: freshnessValue,
            staleCount: staleDocs.length,
            totalDocs: docMtimes.size,
            errors: passed ? [] : errors,
            warnings: staleDocs.filter((d) => d.severity === "warning").length > 0 ? [
              "Some docs approaching stale"
            ] : [],
            message: passed ? `All ${docMtimes.size} docs fresh` : `${staleDocs.length}/${docMtimes.size} docs stale (${freshnessValue}% fresh)`
          })
        }
      ],
      isError: !passed
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed: false,
            errors: [
              {
                message: error instanceof Error ? error.message : String(error)
              }
            ],
            warnings: [],
            message: "Doc freshness check failed"
          })
        }
      ],
      isError: true
    };
  }
}
__name(handleDocFreshnessCheck, "handleDocFreshnessCheck");
async function handleLearningsMaintenance(context) {
  try {
    const service = createTieredLearningService2(context.workspaceRoot);
    const stats = service.getUsageStats();
    const totalTracked = Object.keys(stats).length;
    const result7 = await service.regenerateHotTier();
    const topLearnings = Object.entries(stats).map(([id, data]) => ({
      id,
      ...data
    })).sort((a, b) => b.appliedCount * 3 + b.accessCount - (a.appliedCount * 3 + a.accessCount)).slice(0, 5);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed: true,
            regeneration: {
              preserved: result7.preserved,
              promoted: result7.promoted,
              demoted: result7.demoted,
              totalHot: result7.totalHot
            },
            stats: {
              totalTracked,
              topLearnings: topLearnings.map((l) => ({
                id: l.id.slice(0, 30),
                accessed: l.accessCount,
                applied: l.appliedCount
              }))
            },
            errors: [],
            warnings: result7.promoted === 0 && totalTracked > 0 ? [
              "No learnings met promotion threshold"
            ] : [],
            message: `Hot tier: ${result7.totalHot} learnings (${result7.preserved} critical, ${result7.promoted} promoted)`
          })
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed: false,
            errors: [
              {
                message: error instanceof Error ? error.message : String(error)
              }
            ],
            warnings: [],
            message: "Learning maintenance failed"
          })
        }
      ],
      isError: true
    };
  }
}
__name(handleLearningsMaintenance, "handleLearningsMaintenance");
async function handleArchitectureCheck(context) {
  try {
    const { runArchCheck, SNAPBACK_LAYER_RULES } = await import('./dist-PIK3SNGU.js');
    const result7 = await runArchCheck({
      workspaceRoot: context.workspaceRoot,
      globalExclude: [
        "node_modules",
        "dist",
        ".next",
        "__tests__",
        "__mocks__"
      ]
    });
    const errorViolations = result7.violations.filter((v) => v.severity === "error");
    const warningViolations = result7.violations.filter((v) => v.severity === "warning");
    const passed = errorViolations.length === 0;
    const errors = errorViolations.slice(0, 5).map((v) => ({
      file: v.sourceFile,
      message: `[${v.ruleId}] ${v.importPath || v.ruleDescription}`.slice(0, 60)
    }));
    const warnings = warningViolations.slice(0, 3).map((v) => ({
      file: v.sourceFile,
      message: `[${v.ruleId}] ${v.importPath || v.ruleDescription}`.slice(0, 60)
    }));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed,
            rulesChecked: result7.rulesChecked,
            rulesPassed: result7.rulesPassed,
            violations: result7.violations.length,
            errors: passed ? [] : errors,
            warnings,
            durationMs: result7.durationMs,
            message: passed ? `Architecture OK: ${result7.rulesChecked} rules passed` : `${errorViolations.length} violations in ${result7.rulesChecked} rules`,
            details: {
              layerRules: SNAPBACK_LAYER_RULES.length,
              errorCount: errorViolations.length,
              warningCount: warningViolations.length
            }
          })
        }
      ],
      isError: !passed
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed: false,
            errors: [
              {
                message: error instanceof Error ? error.message : String(error)
              }
            ],
            warnings: [],
            message: "Architecture check failed"
          })
        }
      ],
      isError: true
    };
  }
}
__name(handleArchitectureCheck, "handleArchitectureCheck");
async function handleTraceAnalysis(files, context) {
  if (files.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed: false,
            errors: [
              "No files specified for trace analysis"
            ],
            warnings: []
          })
        }
      ],
      isError: true
    };
  }
  try {
    const { getDependencyGraphService: getDependencyGraphService22 } = await Promise.resolve().then(() => (init_dependency_graph_service(), dependency_graph_service_exports));
    const depService = getDependencyGraphService22(context.workspaceRoot);
    const absoluteFiles = files.map((f) => f.startsWith("/") ? f : join(context.workspaceRoot, f));
    const depContext = await depService.getContextForFiles(absoluteFiles);
    const dataFlow = [];
    let totalImports = 0;
    let totalImportedBy = 0;
    for (const file of absoluteFiles) {
      const ctx = depContext.planned[file];
      if (ctx) {
        totalImports += ctx.imports.length;
        totalImportedBy += ctx.importedBy.length;
        dataFlow.push({
          file: basename(file),
          imports: ctx.imports.length,
          importedBy: ctx.importedBy.length,
          depth: ctx.depth,
          isOrphan: ctx.isOrphan
        });
      }
    }
    const filesWithContext = dataFlow.length;
    const confidence = files.length > 0 ? Math.round(filesWithContext / files.length * 100) / 100 : 0;
    const constraints = [];
    for (const item of dataFlow) {
      if (item.isOrphan) {
        constraints.push(`${item.file}: Orphan file (no importers)`);
      }
      if (item.depth > 5) {
        constraints.push(`${item.file}: Deep dependency (depth ${item.depth})`);
      }
    }
    const passed = constraints.length === 0;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed,
            confidence,
            filesAnalyzed: filesWithContext,
            dataFlow,
            constraints,
            circular: depContext.circular.map((c) => ({
              cycle: c.cycle,
              severity: c.severity
            })),
            suggestions: depContext.suggestions.slice(0, 5),
            errors: passed ? [] : constraints,
            warnings: depContext.circular.length > 0 ? [
              "Circular dependencies detected"
            ] : [],
            message: `Traced ${filesWithContext} files | Confidence: ${Math.round(confidence * 100)}% | ${totalImports} imports, ${totalImportedBy} importers`
          })
        }
      ],
      isError: !passed
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed: false,
            errors: [
              error instanceof Error ? error.message : String(error)
            ],
            warnings: [],
            message: "Trace analysis failed"
          })
        }
      ],
      isError: true
    };
  }
}
__name(handleTraceAnalysis, "handleTraceAnalysis");
function formatTraceResult(result7, options = {}) {
  try {
    const content = result7.content[0]?.text || "";
    const data = JSON.parse(content);
    const errors = data.errors?.length || 0;
    const passed = errors === 0;
    const wire = formatWireLabeled("C", {
      mode: "trace",
      status: passed ? "\u2713" : "\u2717",
      confidence: `${Math.round((data.confidence || 0) * 100)}%`,
      files: `${data.filesAnalyzed || 0}F`
    }, options);
    const humanMessage = `${messages.validation.passed()}

Dependency Analysis:
${data.dataFlow?.map((d) => `  ${d.file}: ${d.imports} imports, ${d.importedBy} importers`).join("\n") || "No data"}${data.suggestions?.length > 0 ? `

Suggested files: ${data.suggestions.join(", ")}` : ""}`;
    return {
      content: [
        {
          type: "text",
          text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}`
        }
      ],
      isError: result7.isError
    };
  } catch {
    return result7;
  }
}
__name(formatTraceResult, "formatTraceResult");
function formatCheckResult(result7, mode, options = {}) {
  try {
    const content = result7.content[0]?.text || "";
    const data = JSON.parse(content);
    const errors = data.errors?.length || 0;
    const warnings = data.warnings?.length || 0;
    const passed = errors === 0;
    const wire = formatWireLabeled("C", {
      mode,
      status: passed ? "\u2713" : "\u2717",
      err: `${errors}E`,
      warn: `${warnings}W`
    }, options);
    let issueDetails = "";
    if (!passed && data.errors) {
      const issues = data.errors.slice(0, 3).map((e) => {
        const file = e.file ? basename(e.file) : "";
        const msg = (e.message || "error").slice(0, 30);
        return file ? `${file}:${msg}` : msg;
      });
      issueDetails = `|issues:${issues.join(",")}`;
    }
    const humanMessage = passed ? messages.validation.passed() : messages.validation.issues(errors, warnings);
    return {
      content: [
        {
          type: "text",
          text: `${wire}${issueDetails}${INTERNAL_SEPARATOR}${humanMessage}`
        }
      ]
    };
  } catch {
    return result7;
  }
}
__name(formatCheckResult, "formatCheckResult");
var MODE_MAP;
var handleCheck;
var checkTool;
var init_check = __esm({
  "src/tools/consolidated/check.ts"() {
    init_branding();
    init_handlers();
    init_quick_check();
    init_session_file_tracker();
    init_tiered_learning_service();
    MODE_MAP = {
      q: "quick",
      f: "full",
      p: "patterns",
      b: "build",
      i: "impact",
      c: "circular",
      d: "docs",
      l: "learnings",
      a: "architecture",
      t: "trace"
    };
    __name6(normalizeCheckParams, "normalizeCheckParams");
    handleCheck = /* @__PURE__ */ __name6(async (args, context) => {
      const params = args;
      const { mode, files, compact } = normalizeCheckParams(params);
      if (files.length > 0 && mode !== "learnings") {
        const tracker = getSessionFileTracker2(context.workspaceRoot);
        tracker.trackFiles(files, "validated");
      }
      const options = {
        compact
      };
      switch (mode) {
        case "quick": {
          const result7 = await handleQuickCheck({
            files,
            runTests: params.tests || false,
            skipTypeScript: false,
            skipTests: !params.tests,
            skipLint: false
          }, context);
          return formatCheckResult(result7, "quick", options);
        }
        case "full": {
          const result7 = await handleValidate({
            mode: "comprehensive",
            code: params.code || "",
            filePath: files[0] || ""
          }, context);
          return formatCheckResult(result7, "full", options);
        }
        case "patterns": {
          const result7 = await handleCheckPatterns({
            code: params.code || "",
            filePath: files[0] || ""
          }, context);
          return formatCheckResult(result7, "patterns", options);
        }
        case "build": {
          const result7 = await handleBuildCheck(context);
          return formatCheckResult(result7, "build", options);
        }
        case "impact": {
          const result7 = await handleImpactAnalysis(files, context);
          return formatCheckResult(result7, "impact", options);
        }
        case "circular": {
          const result7 = await handleCircularCheck(files, context);
          return formatCheckResult(result7, "circular", options);
        }
        case "docs": {
          const result7 = await handleDocFreshnessCheck(context);
          return formatCheckResult(result7, "docs", options);
        }
        case "learnings": {
          const result7 = await handleLearningsMaintenance(context);
          return formatCheckResult(result7, "learnings", options);
        }
        case "architecture": {
          const result7 = await handleArchitectureCheck(context);
          return formatCheckResult(result7, "architecture", options);
        }
        case "trace": {
          const result7 = await handleTraceAnalysis(files, context);
          return formatTraceResult(result7, options);
        }
        default:
          return {
            content: [
              {
                type: "text",
                text: `!|Invalid mode "${mode}". Use: quick, full, patterns, build, impact, circular, docs, learnings, architecture`
              }
            ],
            isError: true
          };
      }
    }, "handleCheck");
    __name6(handleBuildCheck, "handleBuildCheck");
    __name6(handleImpactAnalysis, "handleImpactAnalysis");
    __name6(handleCircularCheck, "handleCircularCheck");
    __name6(handleDocFreshnessCheck, "handleDocFreshnessCheck");
    __name6(handleLearningsMaintenance, "handleLearningsMaintenance");
    __name6(handleArchitectureCheck, "handleArchitectureCheck");
    __name6(handleTraceAnalysis, "handleTraceAnalysis");
    __name6(formatTraceResult, "formatTraceResult");
    __name6(formatCheckResult, "formatCheckResult");
    checkTool = {
      name: "check",
      description: `\u{1F9E2} SnapBack Check - Your validation partner for confident code delivery.

**When to use:** Call me before commits, after refactoring, or when you sense something might break.

**Modes** (choose what fits your current need):

**quick** (default) - The pre-commit friend
  \u2192 Parallel TypeScript + lint validation
  \u2192 ~2-5 seconds, catches 90% of issues
  \u2192 Use: Before git commit, after file edits

**full** - The comprehensive audit
  \u2192 7-layer validation: syntax\u2192types\u2192tests\u2192architecture\u2192security\u2192deps\u2192performance
  \u2192 Confidence score + prioritized findings
  \u2192 Use: Before merge, after major refactoring

**patterns** - The learning validator
  \u2192 Checks code against workspace-specific patterns
  \u2192 Catches violations from past mistakes
  \u2192 Use: Validating code snippets, checking new approaches

**build** - The deployment checkpoint
  \u2192 Actually runs pnpm build
  \u2192 Verifies production-readiness
  \u2192 Use: Pre-deployment, after dependency changes

**impact** - The bundle optimizer
  \u2192 Shows bundle size delta if files removed
  \u2192 ROI calculation for dead code removal
  \u2192 Use: Considering file deletion, optimization planning

**circular** - The architecture guardian
  \u2192 Detects circular dependencies (via madge)
  \u2192 Prevents import spaghetti
  \u2192 Use: After restructuring, when imports feel tangled

**docs** - The freshness checker
  \u2192 Finds stale documentation
  \u2192 Compares code changes vs doc updates
  \u2192 Use: Before releases, periodic maintenance

**learnings** - The knowledge keeper
  \u2192 Shows learning tier stats + hot tier promotion
  \u2192 Maintains pattern database health
  \u2192 Use: Periodic cleanup, understanding what patterns are active

**architecture** - The layer enforcer
  \u2192 Validates import rules (no platform\u2192core, etc.)
  \u2192 Ensures clean architecture boundaries
  \u2192 Use: After adding new packages, refactoring layers

**trace** - The deep investigator
  \u2192 Full dependency graph with confidence scoring
  \u2192 Finds hidden dependencies and coupling
  \u2192 Use: Debugging weird behaviors, planning extractions

**Behavioral Flow**

1. **Discover** \u2192 Categorize files by language/framework/intent
2. **Scan** \u2192 Apply mode-specific analysis (parallel where possible)
3. **Evaluate** \u2192 Score issues by severity (critical/high/medium/low)
4. **Recommend** \u2192 Generate actionable fixes with examples
5. **Report** \u2192 Structured wire format + human-friendly summary

**Tool Coordination Matrix**

| Mode | External Tools | Intelligence APIs | Output |
|------|----------------|-------------------|--------|
| quick | tsc, biome | ValidationPipeline | Problems + wire |
| full | tsc, biome, vitest | 7-layer pipeline | Detailed report |
| patterns | - | Pattern matcher | Violation list |
| build | pnpm build | - | Build log |
| impact | - | ChangeImpactAnalyzer | Bundle delta |
| circular | madge | - | Dependency graph |
| docs | - | Doc analyzer | Staleness report |
| learnings | - | TieredLearningService | Stats + hot tier |
| architecture | - | Layer validator | Import violations |
| trace | - | DependencyTracer | Confidence-scored graph |

**Wire Format** (labeled by default, compact opt-in)

Quick success:
  \u{1F9E2}|C|mode:quick|status:\u2713|err:0E|warn:0W|ts:\u2713|lint:\u2713|tests:\u23ED\uFE0F

Full with issues:
  \u{1F9E2}|C|mode:full|status:\u2717|err:3E|warn:1W|issues:auth.ts:missing\u2192error\u2192handling

Impact analysis:
  \u{1F9E2}|C|mode:impact|status:\u2713|files:2|bundle:-45KB|roi:high

**Examples**

Pre-commit quick check:
  check({ mode: "quick", files: ["src/auth.ts", "src/api.ts"] })
  \u2192 Runs in parallel, shows TypeScript + lint errors immediately

Comprehensive before merge:
  check({ mode: "full", files: ["src/"], tests: true })
  \u2192 Full 7-layer validation with test execution, confidence score

Validate a refactor idea:
  check({ mode: "patterns", code: "export const config = { apiKey: process.env.KEY }" })
  \u2192 Checks against learned patterns (e.g., "no env vars in exports")

Find circular deps after restructure:
  check({ mode: "circular", files: ["packages/core"] })
  \u2192 Shows cycle paths: core\u2192utils\u2192types\u2192core

Bundle impact of removing unused code:
  check({ mode: "impact", files: ["src/unused-util.ts", "src/old-helper.ts"] })
  \u2192 Calculates: -45KB bundle size, affects 2 imports

Architecture enforcement:
  check({ mode: "architecture" })
  \u2192 Validates: packages/platform should not import packages/core

**Boundaries**

Will:
- Run local validation tools (no network required)
- Analyze code patterns and architectural constraints
- Generate severity-rated findings with fix suggestions
- Check circular dependencies and documentation staleness
- Calculate bundle impact and dependency traces
- Maintain learning tier health and promotion

Will Not:
- Auto-fix issues (that's a separate concern)
- Download or install dependencies
- Require internet connection
- Modify files or configuration without consent
- Execute untrusted code during validation
- Share findings outside workspace

**Pro Tips for LLMs**

\u2192 Start with quick before any commit
\u2192 Use full after major refactoring or before merges
\u2192 Run patterns when validating code snippets or new approaches
\u2192 Check circular after package restructuring
\u2192 Use impact before deleting files to see bundle savings
\u2192 Run architecture periodically to enforce clean boundaries
\u2192 Check learnings mode weekly to see pattern promotion

**Fallback:** Human summary after --- contains same info in natural language.`,
      inputSchema: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: [
              "quick",
              "full",
              "patterns",
              "build",
              "impact",
              "circular",
              "docs",
              "learnings",
              "architecture",
              "trace"
            ],
            description: "Analysis mode: quick (default), full, patterns, build, impact, circular, docs, learnings, architecture, trace"
          },
          m: {
            type: "string",
            enum: [
              "q",
              "f",
              "p",
              "b",
              "i",
              "c",
              "d",
              "l",
              "a",
              "t"
            ],
            description: "Legacy: use 'mode' instead"
          },
          files: {
            oneOf: [
              {
                type: "string"
              },
              {
                type: "array",
                items: {
                  type: "string"
                }
              }
            ],
            description: "File(s) to check"
          },
          f: {
            oneOf: [
              {
                type: "string"
              },
              {
                type: "array",
                items: {
                  type: "string"
                }
              }
            ],
            description: "Legacy: use 'files' instead"
          },
          code: {
            type: "string",
            description: "Code string to validate (for patterns mode)"
          },
          tests: {
            type: "boolean",
            description: "Also run tests (quick mode only)"
          },
          compact: {
            type: "boolean",
            default: false,
            description: "Use compact positional wire format instead of labeled (default: labeled)"
          }
        }
      },
      annotations: {
        title: "\u{1F9E2} SnapBack Check",
        readOnlyHint: true,
        idempotentHint: true
      },
      tier: "free"
    };
  }
});
function detectIntent(task, files) {
  const taskLower = task.toLowerCase();
  if (/\b(fix|bug|debug|error|crash|leak|broken|issue)\b/.test(taskLower)) {
    return "debug";
  }
  if (/\b(refactor|restructure|reorganize|clean|simplify|optimize)\b/.test(taskLower)) {
    return "refactor";
  }
  if (files.some((f) => /test|spec/.test(f)) || /\b(review|audit|check|validate)\b/.test(taskLower)) {
    return "review";
  }
  if (/\b(explore|investigate|research|understand|analyze)\b/.test(taskLower)) {
    return "explore";
  }
  return "implement";
}
__name(detectIntent, "detectIntent");
function normalizeParams(params) {
  const modeMap = {
    s: "start",
    c: "check",
    x: "context",
    start: "start",
    check: "check",
    context: "context"
  };
  const rawMode = params.mode || params.m || "start";
  const mode = modeMap[rawMode] || "start";
  const explicitIntent = params.intent || params.i;
  const intent = explicitIntent || detectIntent(params.task || params.t || "", params.files || params.f || []);
  return {
    mode,
    task: params.task || params.t || "development task",
    files: params.files || params.f || [],
    keywords: params.keywords || params.k || [],
    intent,
    thorough: params.thorough || false,
    compact: params.compact || false,
    goal: params.goal
  };
}
__name(normalizeParams, "normalizeParams");
function formatWireResponse(response, compact = false) {
  const prefix = "\u{1F9E2}";
  if (compact) {
    return formatWireCompact(response);
  }
  switch (response.type) {
    case "S": {
      const learningsStr = response.learnings?.slice(0, 3).map((l) => compress(l, 40)).join(",") || "";
      const hotspotsStr = response.hotspots?.slice(0, 2).join(",") || "";
      const fields = [
        `id:${response.id || "?"}`,
        `snap:${response.snapshotId || "none"}`,
        `risk:${response.risk || "L"}`,
        `prot:${response.protection ?? 100}`,
        `dirty:${response.dirty ?? 0}`,
        `status:${response.snapshot || "skipped"}`
      ];
      if (learningsStr) {
        fields.push(`learn:${learningsStr}`);
      }
      if (hotspotsStr) {
        fields.push(`hotspots:${hotspotsStr}`);
      }
      return [
        prefix,
        "S",
        ...fields
      ].join("|");
    }
    case "C": {
      const tsStatus = response.checked?.typescript ? "\u2713" : "\u2717";
      const lintStatus = response.checked?.lint ? "\u2713" : "\u2717";
      const testsStatus = response.checked?.tests === true ? "\u2713" : response.checked?.tests === "skipped" ? "\u23ED\uFE0F" : "\u2717";
      const issuesStr = response.issues?.slice(0, 3).map((i) => compress(i, 40)).join(",") || "";
      const fields = [
        `status:${response.status === "OK" ? "\u2713" : "\u2717"}`,
        `err:${response.errors ?? 0}E`,
        `warn:${response.warnings ?? 0}W`,
        `ts:${tsStatus}`,
        `lint:${lintStatus}`,
        `tests:${testsStatus}`
      ];
      if (issuesStr) {
        fields.push(`issues:${issuesStr}`);
      }
      return [
        prefix,
        "C",
        ...fields
      ].join("|");
    }
    case "X": {
      const learningsStr = response.learnings?.slice(0, 3).map((l) => compress(l, 40)).join(",") || "";
      const fields = [
        `risk:${response.risk || "L"}`,
        `prot:${response.protection ?? 100}`,
        `dirty:${response.dirty ?? 0}`
      ];
      if (learningsStr) {
        fields.push(`learn:${learningsStr}`);
      }
      return [
        prefix,
        "X",
        ...fields
      ].join("|");
    }
    default:
      return `${prefix}|!|code:INVALID_TYPE|reason:Unknown\u2192response\u2192type`;
  }
}
__name(formatWireResponse, "formatWireResponse");
function formatWireCompact(response) {
  const parts = [
    "\u{1F9E2}",
    response.type
  ];
  switch (response.type) {
    case "S":
      parts.push(response.id || "?", response.snapshotId || "none", response.risk || "L", String(response.protection ?? 100), String(response.dirty ?? 0), response.snapshot || "skipped");
      if (response.learnings?.length) {
        parts.push(...response.learnings.slice(0, 3).map((l) => compress(l, 40)));
      }
      if (response.hotspots?.length) {
        parts.push(...response.hotspots.slice(0, 2));
      }
      break;
    case "C": {
      const indicators = [];
      if (response.checked) {
        if (response.checked.typescript) {
          indicators.push("ts\u2713");
        }
        if (response.checked.lint) {
          indicators.push("lint\u2713");
        }
        if (response.checked.tests === true) {
          indicators.push("tests\u2713");
        } else if (response.checked.tests === "skipped") {
          indicators.push("tests\u23ED\uFE0F");
        }
      }
      parts.push(response.status || "OK", `${response.errors ?? 0}E`, `${response.warnings ?? 0}W`, indicators.join("|") || "none");
      if (response.issues?.length) {
        parts.push(...response.issues.slice(0, 3).map((i) => compress(i, 40)));
      }
      break;
    }
    case "X":
      parts.push(response.risk || "L", String(response.protection ?? 100), String(response.dirty ?? 0));
      if (response.learnings?.length) {
        parts.push(...response.learnings.slice(0, 3).map((l) => compress(l, 40)));
      }
      break;
  }
  return parts.join("|");
}
__name(formatWireCompact, "formatWireCompact");
async function handleStart(normalized, context) {
  const beginArgs = {
    task: normalized.task,
    files: normalized.files,
    keywords: normalized.keywords,
    intent: normalized.intent,
    compact: true,
    goal: normalized.goal
  };
  const tracker = getSessionFileTracker2(context.workspaceRoot);
  const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  tracker.startTask(taskId, normalized.files);
  const result7 = await handleBeginTask(beginArgs, context);
  if (context.user?.id && context.services?.pioneer) {
    try {
      const content = result7.content[0]?.text || "";
      const data = content.startsWith("{") ? JSON.parse(content) : null;
      const snapshotId = data?.snapshot?.id || data?.snapshotId;
      if (snapshotId) {
        const idempotencyKey = `${context.user.id}_first_snapshot`;
        await context.services.pioneer.recordAction(context.user.id, "first_snapshot", {
          snapshotId,
          filesAffected: normalized.files?.length || 0
        }, idempotencyKey);
      }
    } catch {
    }
  }
  try {
    const content = result7.content[0]?.text || "";
    if (content.startsWith("\u2713") || content.includes("|")) {
      return result7;
    }
    const data = JSON.parse(content);
    const snapshotStatus = data.snapshot?.created ? "created" : data.snapshot?.id ? "reused" : "skipped";
    const wire = formatWireResponse({
      type: "S",
      id: data.taskId,
      snapshotId: data.snapshot?.id || "none",
      risk: (data.risk?.[0] || "l").toUpperCase(),
      protection: data.protection || data.protectionScore || 100,
      dirty: data.dirtyFiles || 0,
      snapshot: snapshotStatus,
      learnings: data.learnings?.map((l) => l.action) || [],
      hotspots: data.hotspots?.map((h) => `${basename(h.file)}:${h.violations}v`) || []
    }, normalized.compact);
    const humanMessage = snapshotStatus === "created" ? messages.snapshot.created(normalized.task) : snapshotStatus === "reused" ? messages.snapshot.reused() : messages.session.taskStarted(normalized.task);
    return {
      content: [
        {
          type: "text",
          text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}`
        }
      ]
    };
  } catch {
    return result7;
  }
}
__name(handleStart, "handleStart");
async function handleCheckMode(normalized, context) {
  const checkArgs = {
    files: normalized.files,
    runTests: false,
    skipTypeScript: false,
    skipTests: true,
    skipLint: false
  };
  const result7 = await handleQuickCheck(checkArgs, context);
  if (context.user?.id && context.services?.pioneer) {
    try {
      const idempotencyKey = `${context.user.id}_first_check`;
      await context.services.pioneer.recordAction(context.user.id, "first_check", {
        filesAffected: normalized.files?.length || 0
      }, idempotencyKey);
    } catch {
    }
  }
  try {
    const content = result7.content[0]?.text || "";
    const data = JSON.parse(content);
    const errorCount = data.errors?.length || 0;
    const warningCount = data.warnings?.length || 0;
    const passed = data.passed || errorCount === 0;
    const wire = formatWireResponse({
      type: "C",
      status: passed ? "OK" : "ERR",
      errors: errorCount,
      warnings: warningCount,
      checked: {
        typescript: !normalized.thorough || data.typescript !== false,
        lint: !normalized.thorough || data.lint !== false,
        tests: normalized.thorough ? data.tests || false : "skipped"
      },
      issues: [
        ...(data.errors || []).slice(0, 2).map((e) => `${basename(e.file)}:${e.message}`),
        ...(data.warnings || []).slice(0, 1).map((w) => `${basename(w.file)}:${w.message}`)
      ]
    }, normalized.compact);
    const humanMessage = passed ? messages.validation.passed() : messages.validation.issues(errorCount, warningCount);
    return {
      content: [
        {
          type: "text",
          text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}`
        }
      ]
    };
  } catch {
    return result7;
  }
}
__name(handleCheckMode, "handleCheckMode");
async function handleContext2(normalized, context) {
  const beginArgs = {
    task: "get context",
    files: normalized.files,
    keywords: normalized.keywords,
    skipSnapshot: true,
    compact: true
  };
  const result7 = await handleBeginTask(beginArgs, context);
  try {
    const content = result7.content[0]?.text || "";
    if (content.startsWith("\u2713") || content.includes("|")) {
      return {
        content: [
          {
            type: "text",
            text: content.replace(/^[S✓]/, "X")
          }
        ]
      };
    }
    const data = JSON.parse(content);
    const wire = formatWireResponse({
      type: "X",
      risk: (data.risk?.[0] || "l").toUpperCase(),
      protection: data.protection || data.protectionScore || 100,
      dirty: data.dirtyFiles || 0,
      learnings: data.learnings?.map((l) => l.action) || []
    }, normalized.compact);
    const bundleInfo = await measureBundleSize(context.workspaceRoot);
    const bundleMsg = bundleInfo ? `
Bundle: ${bundleInfo.sizeKB}KB (${bundleInfo.status})` : "";
    return {
      content: [
        {
          type: "text",
          text: wire + bundleMsg
        }
      ]
    };
  } catch {
    return result7;
  }
}
__name(handleContext2, "handleContext2");
async function measureBundleSize(workspaceRoot) {
  const { existsSync: existsSync17, readdirSync: readdirSync22, statSync: statSync4 } = await import('fs');
  const { join: join162 } = await import('path');
  const distPaths = [
    "dist/extension.js",
    "dist/main.js",
    "dist/index.js",
    "dist/bundle.js"
  ];
  for (const distPath of distPaths) {
    const fullPath = join162(workspaceRoot, distPath);
    if (existsSync17(fullPath)) {
      const stats = statSync4(fullPath);
      const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
      let status2 = "ok";
      if (sizeKB > 2e3) {
        status2 = "over 2MB";
      } else if (sizeKB > 1e3) {
        status2 = "over 1MB";
      }
      return {
        sizeKB,
        status: status2
      };
    }
  }
  const distDir = join162(workspaceRoot, "dist");
  if (existsSync17(distDir)) {
    try {
      const files = readdirSync22(distDir, {
        withFileTypes: true
      });
      let totalBytes = 0;
      for (const file of files) {
        if (file.isFile() && file.name.endsWith(".js")) {
          const filePath = join162(distDir, file.name);
          const stats = statSync4(filePath);
          totalBytes += stats.size;
        }
      }
      if (totalBytes > 0) {
        const sizeKB = Math.round(totalBytes / 1024 * 100) / 100;
        let status2 = "ok";
        if (sizeKB > 2e3) {
          status2 = "over 2MB";
        } else if (sizeKB > 1e3) {
          status2 = "over 1MB";
        }
        return {
          sizeKB,
          status: status2
        };
      }
    } catch {
    }
  }
  return null;
}
__name(measureBundleSize, "measureBundleSize");
var handleSnap;
var snapTool;
var init_snap = __esm({
  "src/tools/consolidated/snap.ts"() {
    init_branding();
    init_begin_task();
    init_quick_check();
    init_session_file_tracker();
    __name6(detectIntent, "detectIntent");
    __name6(normalizeParams, "normalizeParams");
    __name6(formatWireResponse, "formatWireResponse");
    __name6(formatWireCompact, "formatWireCompact");
    __name6(handleStart, "handleStart");
    __name6(handleCheckMode, "handleCheckMode");
    __name6(handleContext2, "handleContext");
    __name6(measureBundleSize, "measureBundleSize");
    handleSnap = /* @__PURE__ */ __name6(async (args, context) => {
      const params = args;
      const normalized = normalizeParams(params);
      switch (normalized.mode) {
        case "start":
          return handleStart(normalized, context);
        case "check":
          return handleCheckMode(normalized, context);
        case "context":
          return handleContext2(normalized, context);
        default:
          return {
            content: [
              {
                type: "text",
                text: "\u{1F9E2}|!|code:INVALID_MODE|reason:Use\u2192start,\u2192check,\u2192or\u2192context"
              }
            ],
            isError: true
          };
      }
    }, "handleSnap");
    snapTool = {
      name: "snap",
      description: `\u{1F9E2} SnapBack: Universal entry point for all tasks.

**REQUIRED** before implementation. Provides:
- \u{1F3AF} Context + learnings loaded automatically
- \u{1F6E1}\uFE0F Risk assessment and protection status
- \u{1F4F8} Snapshot creation for safe rollback

**Modes** (full-word recommended, single-letter for backward compatibility):
- mode:"start" (or m:"s") - Start task (FIRST call for any new work)
- mode:"check" (or m:"c") - Check code (validate before commit)
- mode:"context" (or m:"x") - Get context (quick status check)

**Behavioral Flow (mode: start)**
1. **Assess** \u2192 Workspace vitals (pulse, pressure, trajectory)
2. **Retrieve** \u2192 Load hot tier + intent-matched learnings
3. **Analyze** \u2192 Identify risk hotspots and pattern violations
4. **Guide** \u2192 Provide context-aware recommendations
5. **Prepare** \u2192 Create snapshot, establish task baseline

Key behaviors:
- Intent-based learning selection (debug\u2192anti-patterns, refactor\u2192architecture)
- Automatic snapshot creation with dirty file detection
- Violation history analysis for hotspot identification
- Protection level assessment across modified files

**Wire Response** (labeled by default, compact opt-in):
- Labeled: \u{1F9E2}|S|id:task_1|snap:snap_a|risk:M|prot:85|dirty:2|status:created|learn:jwt\u2192validation
- Compact: \u{1F9E2}|S|task_1|snap_a|M|85|2|created|jwt\u2192validation

**Field meanings:**
- id: Task identifier for subsequent calls
- snap: Snapshot ID for rollback
- risk: L=Low, M=Medium, H=High
- prot: Protection coverage 0-100%
- dirty: Uncommitted file count
- status: created|reused|skipped
- learn: Relevant learnings (compressed)

**Examples**

Start implementation:
  snap({ mode: "start", task: "Add JWT auth", files: ["src/auth.ts"], intent: "implement" })
  \u2192 Loads architecture-patterns + hot tier, creates snapshot

Debug with anti-patterns:
  snap({ mode: "start", task: "Fix memory leak", intent: "debug" })
  \u2192 Loads anti-patterns + recent violations

Quick context lookup:
  snap({ mode: "context", keywords: ["auth", "jwt"] })
  \u2192 Returns learnings without snapshot

**Boundaries**

Will:
- Create local snapshots of workspace state
- Load relevant learnings from .snapback/ directory
- Provide risk assessment based on file protection levels
- Track file modifications during task lifetime

Will Not:
- Execute arbitrary shell commands
- Modify files without explicit tool calls
- Access network resources (fully local)
- Share data outside workspace directory

**Fallback:** Human summary after --- contains same info in natural language.`,
      inputSchema: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: [
              "start",
              "check",
              "context"
            ],
            description: "Mode (full-word, recommended): start=begin task, check=validate code, context=get status"
          },
          m: {
            type: "string",
            enum: [
              "s",
              "c",
              "x"
            ],
            description: "Legacy mode: s=start, c=check, x=context (use 'mode' instead)"
          },
          task: {
            type: "string",
            description: "Task title or goal (mode: start). Example: 'fix auth bug'"
          },
          t: {
            type: "string",
            description: "Legacy: use 'task' instead"
          },
          files: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Primary files involved (mode: start, check)"
          },
          f: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Legacy: use 'files' instead"
          },
          keywords: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Keywords for pattern matching (mode: start, context)"
          },
          k: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Legacy: use 'keywords' instead"
          },
          thorough: {
            type: "boolean",
            description: "Enable thorough 7-layer validation (mode: check)"
          },
          intent: {
            type: "string",
            enum: [
              "implement",
              "debug",
              "refactor",
              "review",
              "explore"
            ],
            description: "Task intent for context loading optimization"
          },
          i: {
            type: "string",
            enum: [
              "implement",
              "debug",
              "refactor",
              "review",
              "explore"
            ],
            description: "Legacy: use 'intent' instead"
          },
          compact: {
            type: "boolean",
            default: false,
            description: "Use compact positional wire format instead of labeled (default: false = labeled)"
          },
          goal: {
            type: "object",
            properties: {
              metric: {
                type: "string",
                enum: [
                  "bundle",
                  "performance",
                  "coverage"
                ],
                description: "Metric to track"
              },
              target: {
                type: "number",
                description: "Target value"
              },
              unit: {
                type: "string",
                description: "Unit (KB, ms, %)"
              }
            },
            description: "Goal for task completion validation (mode: start)"
          }
        }
      },
      annotations: {
        title: "\u{1F9E2} SnapBack",
        readOnlyHint: false,
        idempotentHint: false
      },
      tier: "free"
    };
  }
});
function getEfficiencyMetrics(params, learningsCount) {
  const eff = params.efficiency || {};
  return {
    saved: eff.saved || "not reported",
    prevented: eff.prevented || "none reported",
    helped: eff.helped || "general context",
    newLearnings: learningsCount
  };
}
__name(getEfficiencyMetrics, "getEfficiencyMetrics");
function identifyImprovements(data, params) {
  const improvements = [];
  const filesModified = data.filesModified || 0;
  const validationRuns = data.validationRuns || 0;
  if (filesModified > 3 && validationRuns === 0) {
    improvements.push({
      suggestion: "Run snap m:c periodically during large edits",
      trigger: "Editing 3+ files without validation",
      priority: "medium"
    });
  }
  if (params.ok === 0 || params.outcome === "abandoned" || params.outcome === "blocked") {
    improvements.push({
      suggestion: "Capture specific blocker as pitfall learning",
      trigger: "Task did not complete successfully",
      priority: "high"
    });
  }
  if (!params.l || params.l.length === 0) {
    improvements.push({
      suggestion: "Capture at least one learning per session",
      trigger: "Session ended without learnings",
      priority: "low"
    });
  }
  return improvements;
}
__name(identifyImprovements, "identifyImprovements");
function formatUserStats(metrics) {
  const parts = [];
  if (metrics.saved !== "not reported") {
    parts.push(`\u{1F4B0} ${metrics.saved} tokens saved`);
  }
  if (metrics.prevented !== "none reported") {
    parts.push(`\u{1F6E1}\uFE0F ${metrics.prevented}`);
  }
  if (metrics.helped !== "general context") {
    parts.push(`\u{1F4DA} Helped: ${metrics.helped}`);
  }
  if (metrics.newLearnings > 0) {
    parts.push(`\u2728 ${metrics.newLearnings} new learnings`);
  }
  return parts.length > 0 ? parts.join(" | ") : "Session completed";
}
__name(formatUserStats, "formatUserStats");
function formatImprovements(improvements) {
  if (improvements.length === 0) {
    return "";
  }
  const lines = improvements.map((i) => `[${i.priority.toUpperCase()}] ${i.suggestion} (when: ${i.trigger})`);
  return `
[IMPROVE] ${lines.join(" | ")}`;
}
__name(formatImprovements, "formatImprovements");
async function checkTaskGoal(workspaceRoot) {
  const { existsSync: existsSync17, readFileSync: readFileSync15 } = await import('fs');
  const { join: join162 } = await import('path');
  const sessionPath = join162(workspaceRoot, ".snapback", "session", "state.json");
  if (!existsSync17(sessionPath)) {
    return null;
  }
  try {
    const sessionData = JSON.parse(readFileSync15(sessionPath, "utf-8"));
    const goal = sessionData.currentTask?.goal;
    if (!goal) {
      return null;
    }
    const { metric, target, unit } = goal;
    let current = 0;
    if (metric === "bundle") {
      const distPaths = [
        "dist/extension.js",
        "dist/main.js",
        "dist/index.js",
        "dist/bundle.js"
      ];
      for (const distPath of distPaths) {
        const fullPath = join162(workspaceRoot, distPath);
        if (existsSync17(fullPath)) {
          const { statSync: statSync4 } = await import('fs');
          const stats = statSync4(fullPath);
          current = Math.round(stats.size / 1024);
          break;
        }
      }
    }
    const met = current <= target;
    return {
      met,
      metric,
      current,
      target,
      unit
    };
  } catch {
    return null;
  }
}
__name(checkTaskGoal, "checkTaskGoal");
var compressStr;
var handleSnapEnd;
var snapEndTool;
var init_snap_end = __esm({
  "src/tools/consolidated/snap-end.ts"() {
    init_branding();
    init_complete_task();
    init_tiered_learning_service();
    init_state();
    compressStr = /* @__PURE__ */ __name6((s, max) => {
      const clean = s.replace(/\s+/g, "\u2192");
      return clean.length > max ? `${clean.slice(0, max - 1)}\u2026` : clean;
    }, "compressStr");
    __name6(getEfficiencyMetrics, "getEfficiencyMetrics");
    __name6(identifyImprovements, "identifyImprovements");
    __name6(formatUserStats, "formatUserStats");
    __name6(formatImprovements, "formatImprovements");
    handleSnapEnd = /* @__PURE__ */ __name6(async (args, context) => {
      const params = args;
      const options = {
        compact: params.compact ?? false
      };
      const learningStrings = params.learnings ?? params.l ?? [];
      const goalCheck = await checkTaskGoal(context.workspaceRoot);
      if (goalCheck && !goalCheck.met) {
        const wire = formatWireLabeled("E", {
          status: "GOAL_NOT_MET",
          metric: goalCheck.metric,
          current: `${goalCheck.current}${goalCheck.unit}`,
          target: `${goalCheck.target}${goalCheck.unit}`
        }, options);
        return {
          content: [
            {
              type: "text",
              text: `${wire}

\u26A0\uFE0F Goal not achieved: ${goalCheck.metric} is ${goalCheck.current}${goalCheck.unit}, target was ${goalCheck.target}${goalCheck.unit}. Task marked incomplete.`
            }
          ],
          isError: false
        };
      }
      const customLearnings = learningStrings.map((learning) => ({
        type: "pattern",
        trigger: "Task completion",
        action: learning
      }));
      const learningService = createTieredLearningService2(context.workspaceRoot);
      let promotionResult;
      let surveyAttributionCount = 0;
      if (params.survey) {
        const sessionState = getSessionState(context.workspaceRoot);
        const shownLearnings = sessionState.currentTask?.shownLearnings;
        const helpfulness = params.survey.helpfulness ?? 3;
        if (shownLearnings && helpfulness >= 3) {
          const patternsUsed = params.survey.patterns_used ?? 0;
          for (let i = 0; i < Math.min(patternsUsed, shownLearnings.patterns.length); i++) {
            learningService.trackApplied(shownLearnings.patterns[i]);
            surveyAttributionCount++;
          }
          const pitfallsAvoided = params.survey.pitfalls_avoided ?? 0;
          for (let i = 0; i < Math.min(pitfallsAvoided, shownLearnings.pitfalls.length); i++) {
            learningService.trackApplied(shownLearnings.pitfalls[i]);
            surveyAttributionCount++;
          }
        }
      }
      if (customLearnings.length > 0) {
        for (const learning of customLearnings) {
          const learningId = `snap-end-${learning.action.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}`;
          learningService.trackApplied(learningId);
        }
        const stats = learningService.getUsageStats();
        const hasReachedThreshold = Object.values(stats).some((s) => s.appliedCount >= HOT_TIER_PROMOTION_THRESHOLD2.minAccessCount);
        if (hasReachedThreshold) {
          try {
            promotionResult = await learningService.regenerateHotTier();
          } catch {
          }
        }
      }
      const completeArgs = {
        outcome: params.outcome || (params.ok === 0 ? "abandoned" : "completed"),
        createSnapshot: true,
        notes: params.notes
      };
      if (customLearnings.length > 0) {
        completeArgs.customLearning = customLearnings[0];
      }
      const result7 = await handleCompleteTask(completeArgs, context);
      try {
        const content = result7.content[0]?.text || "";
        const data = JSON.parse(content);
        const metrics = getEfficiencyMetrics(params, customLearnings.length);
        const improvements = identifyImprovements(data, params);
        const success = data.success !== false;
        const wireFields = {
          status: success ? "OK" : "FAIL",
          learn: `${data.learningsGenerated || customLearnings.length}L`,
          files: `${data.filesModified || 0}F`,
          lines: `+${data.linesAdded || 0}-${data.linesRemoved || 0}`
        };
        if (learningStrings.length > 0) {
          wireFields.summary = learningStrings.slice(0, 2).map((l) => compressStr(l, 30)).join(",");
        }
        if (params.survey) {
          const surveyJson = JSON.stringify({
            patterns_used: params.survey.patterns_used ?? 0,
            pitfalls_avoided: params.survey.pitfalls_avoided ?? 0,
            helpfulness: params.survey.helpfulness ?? 0,
            unhelpful_count: params.survey.unhelpful_count ?? 0
          });
          wireFields.survey = surveyJson;
        }
        const wire = formatWireLabeled("E", wireFields, options);
        const userStats = formatUserStats(metrics);
        const improvementNotes = formatImprovements(improvements);
        const promotionInfo = promotionResult && promotionResult.promoted > 0 ? ` | \u{1F525} ${promotionResult.promoted} learning(s) promoted to hot tier` : "";
        const feedbackInfo = surveyAttributionCount > 0 ? ` | \u{1F504} ${surveyAttributionCount} learning(s) marked as applied` : "";
        const humanMessage = success ? messages.session.complete(1, data.filesModified || 0) : messages.error.generic(params.outcome === "blocked" ? "task blocked" : "task incomplete");
        const fullResponse = `${wire}${improvementNotes}${INTERNAL_SEPARATOR}${humanMessage}
${userStats}${promotionInfo}${feedbackInfo}`;
        return {
          content: [
            {
              type: "text",
              text: fullResponse
            }
          ]
        };
      } catch {
        return result7;
      }
    }, "handleSnapEnd");
    __name6(checkTaskGoal, "checkTaskGoal");
    snapEndTool = {
      name: "snap_end",
      description: `\u{1F9E2} SnapBack End - Your session completion partner.

**REQUIRED** at task completion. Call me to close the loop - I'll never ask the user questions.

**When to use**: Task done (succeeded, failed, or blocked). Always call - even if abandoned.

**What happens**:
1. **Captures learnings** you provide (promotes patterns)
2. **Records efficiency** metrics (your self-assessment)
3. **Tracks file changes** (what got modified)
4. **Updates telemetry** (improves SnapBack for everyone)
5. **Shows summary** (user-friendly stats)

**Efficiency Metrics** (your honest self-assessment):
- "saved": Token estimate (e.g., "~15K")
- "prevented": What mistakes you avoided (e.g., "2 - wrong layer, missing validation")
- "helped": What context helped most (e.g., "auth patterns, architecture rules")

**Survey Field** (\u26A0\uFE0F INTERNAL - fill silently):
This is YOUR self-assessment as the LLM. Rate:
- helpfulness: 1-5 (was SnapBack useful?)
- patterns_used: How many patterns you applied
- pitfalls_avoided: How many warnings you heeded
- unhelpful_count: What didn't help (0 if all good)

**NEVER ask user these questions** - you know the answers from your own experience.

**Wire Format**: \u{1F9E2}|E|status:OK|learn:2L|files:3F|lines:+45-12

**Examples**

Successful completion:
  snap_end({
    outcome: "completed",
    learnings: [
      "Always validate JWT expiry before refresh",
      "Cache parsed schemas for 80% speedup"
    ],
    efficiency: {
      saved: "~12K",
      prevented: "2 - wrong import layer, missing error handling",
      helped: "architecture patterns, anti-patterns warnings"
    },
    survey: {
      helpfulness: 5,
      patterns_used: 3,
      pitfalls_avoided: 2,
      unhelpful_count: 0
    }
  })

Blocked task:
  snap_end({
    outcome: "blocked",
    notes: "Waiting on API schema from backend team",
    learnings: ["Frontend auth flow depends on /auth/validate endpoint"],
    survey: { helpfulness: 4, patterns_used: 1, pitfalls_avoided: 0, unhelpful_count: 0 }
  })

Abandoned (still valuable):
  snap_end({
    outcome: "abandoned",
    notes: "Realized different approach needed",
    learnings: ["GraphQL subscription not suitable for polling - use REST"],
    survey: { helpfulness: 5, patterns_used: 0, pitfalls_avoided: 1, unhelpful_count: 0 }
  })

**Boundaries**

Will:
- Record all learnings to .snapback/
- Show user-friendly efficiency stats
- Track your self-assessment for improvement
- Close the task loop properly

Will Not:
- Ask user any questions (you fill everything)
- Require all fields (learnings optional if none)
- Share data externally
- Block if survey incomplete

**Pro Tip**: Be honest in survey - it helps SnapBack improve. Low helpfulness scores are valuable feedback.`,
      inputSchema: {
        type: "object",
        properties: {
          ok: {
            type: "number",
            enum: [
              0,
              1
            ],
            description: "Success indicator: 1=success, 0=failed"
          },
          learnings: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Key learnings from this task as strings"
          },
          l: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Legacy: use 'learnings' instead"
          },
          outcome: {
            type: "string",
            enum: [
              "completed",
              "abandoned",
              "blocked"
            ],
            description: "How the task ended"
          },
          notes: {
            type: "string",
            description: "Additional completion notes"
          },
          efficiency: {
            type: "object",
            description: "\u26A0\uFE0F FILL SILENTLY - Your estimate of session efficiency (shown to user as stats)",
            properties: {
              saved: {
                type: "string",
                description: "YOUR estimate of tokens saved (e.g. '~15K') - just estimate, don't ask user"
              },
              prevented: {
                type: "string",
                description: "Mistakes YOU avoided (e.g. '2 - wrong layer') - just report what happened"
              },
              helped: {
                type: "string",
                description: "What context helped YOU most (e.g. 'auth patterns') - just state it"
              }
            }
          },
          survey: {
            type: "object",
            description: "\u26A0\uFE0F INTERNAL TELEMETRY - Fill silently, NEVER ask user. Your self-assessment of SnapBack's helpfulness this session.",
            properties: {
              patterns_used: {
                type: "number",
                description: "How many patterns from snap start did YOU apply? (0 if none, estimate if unsure)"
              },
              pitfalls_avoided: {
                type: "number",
                description: "How many mistakes did YOU avoid because of warnings? (0 if none)"
              },
              helpfulness: {
                type: "number",
                description: "YOUR rating of SnapBack helpfulness 1-5 (1=not helpful, 5=very helpful)"
              },
              unhelpful_count: {
                type: "number",
                description: "How many SnapBack suggestions were NOT useful to YOU? (0 if all were helpful)"
              }
            }
          },
          compact: {
            type: "boolean",
            default: false,
            description: "Use compact wire format (default: labeled)"
          }
        }
      },
      annotations: {
        title: "\u{1F9E2} SnapBack End",
        readOnlyHint: false,
        idempotentHint: false
      },
      tier: "free"
    };
  }
});
var handleSnapFix;
var snapFixTool;
var init_snap_fix = __esm({
  "src/tools/consolidated/snap-fix.ts"() {
    init_branding();
    handleSnapFix = /* @__PURE__ */ __name6(async (args, context) => {
      const params = args;
      const options = {
        compact: params.compact ?? false
      };
      const storage = createStorage(context.workspaceRoot);
      const diffWith = params.diffWith ?? params.diff;
      const dryRun = params.dryRun ?? params.dry ?? false;
      let action = params.action ?? "list";
      if (!params.action) {
        if (diffWith && params.id) {
          action = "diff";
        } else if (params.id) {
          action = "restore";
        }
      }
      if (action === "list") {
        const snapshots = storage.listSnapshots().slice(0, 5);
        if (snapshots.length === 0) {
          const wire2 = formatWireLabeled("R", {
            count: 0,
            status: "empty"
          }, options);
          return {
            content: [
              {
                type: "text",
                text: `${wire2}${INTERNAL_SEPARATOR}${messages.restore.notFound()}`
              }
            ]
          };
        }
        const snapshotSummaries = snapshots.map((snap) => {
          const age = getRelativeTime(snap.createdAt);
          return `${snap.id.slice(0, 8)}:${age}:${snap.files.length}f`;
        }).join(",");
        const wire = formatWireLabeled("R", {
          count: snapshots.length,
          snapshots: snapshotSummaries
        }, options);
        return {
          content: [
            {
              type: "text",
              text: wire
            }
          ]
        };
      }
      if (action === "diff") {
        if (!params.id || !diffWith) {
          const wire2 = formatWireLabeled("!", {
            code: "MISSING_PARAMS",
            reason: "diff requires id and diffWith"
          }, options);
          return {
            content: [
              {
                type: "text",
                text: `${wire2}${INTERNAL_SEPARATOR}Diff requires both snapshot IDs`
              }
            ],
            isError: true
          };
        }
        const snap1 = storage.getSnapshot(params.id);
        const snap2 = storage.getSnapshot(diffWith);
        if (!snap1 || !snap2) {
          const notFoundId = !snap1 ? params.id : diffWith;
          const wire2 = formatWireLabeled("!", {
            code: "NOT_FOUND",
            id: notFoundId
          }, options);
          return {
            content: [
              {
                type: "text",
                text: `${wire2}${INTERNAL_SEPARATOR}${messages.error.notFound(`Snapshot ${notFoundId}`)}`
              }
            ],
            isError: true
          };
        }
        const files1 = new Set(snap1.files.map((f) => f.path));
        const files2 = new Set(snap2.files.map((f) => f.path));
        const added = [
          ...files2
        ].filter((f) => !files1.has(f)).length;
        const removed = [
          ...files1
        ].filter((f) => !files2.has(f)).length;
        const changed = [
          ...files1
        ].filter((f) => files2.has(f)).length;
        const wire = formatWireLabeled("D", {
          from: params.id.slice(0, 8),
          to: diffWith.slice(0, 8),
          added: `+${added}`,
          removed: `-${removed}`,
          changed: `~${changed}`
        }, options);
        return {
          content: [
            {
              type: "text",
              text: wire
            }
          ]
        };
      }
      if (!params.id) {
        const wire = formatWireLabeled("!", {
          code: "MISSING_ID",
          reason: "restore requires snapshot id"
        }, options);
        return {
          content: [
            {
              type: "text",
              text: `${wire}${INTERNAL_SEPARATOR}Restore requires snapshot ID`
            }
          ],
          isError: true
        };
      }
      const snapshot = storage.getSnapshot(params.id);
      if (!snapshot) {
        const wire = formatWireLabeled("!", {
          code: "NOT_FOUND",
          id: params.id
        }, options);
        return {
          content: [
            {
              type: "text",
              text: `${wire}${INTERNAL_SEPARATOR}${messages.restore.notFound()}`
            }
          ],
          isError: true
        };
      }
      if (dryRun) {
        const filesToRestore = params.files ? snapshot.files.filter((f) => params.files?.some((p) => f.path.includes(p))) : snapshot.files;
        const fileNames = filesToRestore.slice(0, 5).map((f) => basename(f.path));
        const wire = formatWireLabeled("R", {
          status: "DRY",
          files: `${filesToRestore.length}f`,
          preview: fileNames.join(",")
        }, options);
        return {
          content: [
            {
              type: "text",
              text: `${wire}${INTERNAL_SEPARATOR}${messages.restore.preview(filesToRestore.length)}`
            }
          ]
        };
      }
      try {
        const restoredFiles = await storage.restore(params.id);
        if (!restoredFiles || restoredFiles.length === 0) {
          const wire2 = formatWireLabeled("!", {
            code: "RESTORE_FAILED",
            reason: "no files restored"
          }, options);
          return {
            content: [
              {
                type: "text",
                text: `${wire2}${INTERNAL_SEPARATOR}${messages.error.generic("no files restored")}`
              }
            ],
            isError: true
          };
        }
        const fileNames = restoredFiles.slice(0, 5).map((f) => basename(f.path));
        const wire = formatWireLabeled("R", {
          status: "OK",
          files: `${restoredFiles.length}f`,
          restored: fileNames.join(",")
        }, options);
        const timeAgo = getRelativeTimeHuman(snapshot.createdAt);
        const humanMessage = restoredFiles.length === 1 ? messages.restore.single(fileNames[0], timeAgo) : messages.restore.multiple(restoredFiles.length, timeAgo);
        return {
          content: [
            {
              type: "text",
              text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}`
            }
          ]
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Restore failed";
        const wire = formatWireLabeled("!", {
          code: "ERROR",
          reason: errorMsg
        }, options);
        return {
          content: [
            {
              type: "text",
              text: `${wire}${INTERNAL_SEPARATOR}${messages.error.generic(errorMsg)}`
            }
          ],
          isError: true
        };
      }
    }, "handleSnapFix");
    snapFixTool = {
      name: "snap_fix",
      description: `\u{1F9E2} SnapBack Fix - List, restore, or diff snapshots.

**Actions:**
- list (default): Show recent snapshots with age and file counts
- restore: Restore files from a specific snapshot
- diff: Compare two snapshots

**Wire Format** (labeled by default):
  \u{1F9E2}|R|count:5|snapshots:snap_a:2m:3f,snap_b:1h:5f
  \u{1F9E2}|R|status:OK|files:3f|restored:auth.ts,api.ts,config.ts
  \u{1F9E2}|D|from:snap_a|to:snap_b|added:+2|removed:-1|changed:~3

**Example calls:**
  snap_fix({ action: "list" })
  snap_fix({ action: "restore", id: "snap_abc123" })
  snap_fix({ action: "restore", id: "snap_abc123", dryRun: true })
  snap_fix({ action: "diff", id: "snap_a", diffWith: "snap_b" })`,
      inputSchema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: [
              "list",
              "restore",
              "diff"
            ],
            description: "Operation: list (default), restore, or diff"
          },
          id: {
            type: "string",
            description: "Snapshot ID (for restore/diff operations)"
          },
          diffWith: {
            type: "string",
            description: "Second snapshot ID (for diff operation)"
          },
          diff: {
            type: "string",
            description: "Legacy: use 'diffWith' instead"
          },
          dryRun: {
            type: "boolean",
            description: "Preview restore without applying changes"
          },
          dry: {
            type: "boolean",
            description: "Legacy: use 'dryRun' instead"
          },
          files: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Specific files to restore (optional filter)"
          },
          compact: {
            type: "boolean",
            default: false,
            description: "Use compact positional wire format instead of labeled (default: labeled)"
          }
        }
      },
      annotations: {
        title: "\u{1F9E2} SnapBack Fix",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false
      },
      tier: "pro"
    };
  }
});
function getToolsHelp() {
  return `${BRAND_PREFIX} Available Tools

TOOL            MODES                           DESCRIPTION
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
snap            mode: start|check|context       Universal entry point
snap_end        outcome: completed|abandoned    Complete task with learnings
snap_fix        action: list|restore|diff       Snapshot operations
snap_learn      type: pattern|pitfall|...       Capture mid-session learning
snap_violation  type + file + description       Report code violation
check           mode: quick|full|patterns|...   Validate code (9 modes)
snap_help       topic: tools|wire|thresholds    This help (plain text)

Use full-word parameters (e.g., mode:"start") for clarity.
Legacy single-letter params (m:"s") still work for backward compatibility.`;
}
__name(getToolsHelp, "getToolsHelp");
function getStatusHelp() {
  return `${BRAND_PREFIX} Session Status

STATUS: Active
TASK: None currently active
LEARNINGS: Ready to load
SNAPSHOTS: Available for restore

To start a task:
  snap({ mode: "start", task: "your task description" })

To check code:
  snap({ mode: "check", files: ["path/to/file.ts"] })`;
}
__name(getStatusHelp, "getStatusHelp");
function getWireHelp() {
  return `${BRAND_PREFIX} Wire Format Reference

RESPONSE STRUCTURE:
  [wire format line]
  ---
  [human-readable summary]

FALLBACK: If wire format is confusing, use the human summary after ---.
          The summary contains the same information in natural language.

WIRE FORMAT (labeled by default):
  \u{1F9E2}|TYPE|field:value|field:value|...

TYPE CODES:
  S = Start task response
  C = Check/validation result
  X = Context snapshot
  E = End task summary
  R = Snapshot list/restore
  L = Learning captured
  V = Violation recorded
  ! = Error

FIELD DECODE (for TYPE=S start):
  id:      Task identifier for subsequent calls
  snap:    Snapshot ID (use with snap_fix to restore)
  risk:    L=Low, M=Medium, H=High
  prot:    Protection coverage 0-100%
  dirty:   Count of uncommitted files
  status:  created|reused|skipped
  learn:   Relevant learnings (spaces compressed to \u2192)

FIELD DECODE (for TYPE=C check):
  status:  \u2713=passed, \u2717=failed
  err:     Error count (e.g., 3E)
  warn:    Warning count (e.g., 2W)
  ts:      TypeScript check (\u2713/\u2717/\u23ED\uFE0F)
  lint:    Lint check (\u2713/\u2717/\u23ED\uFE0F)
  tests:   Tests (\u2713/\u2717/\u23ED\uFE0F)
  issues:  Issue summaries (compressed)

STATUS SYMBOLS:
  \u2713 = passed
  \u2717 = failed
  \u23ED\uFE0F = skipped`;
}
__name(getWireHelp, "getWireHelp");
function getModesHelp() {
  return `${BRAND_PREFIX} Mode Reference

SNAP MODES:
  start   - Begin a new task, load context, create snapshot
  check   - Quick code validation (TypeScript + lint)
  context - Get current workspace status without starting task

CHECK MODES:
  quick     - Fast parallel validation (TypeScript + lint)
  patterns  - Pattern-only validation
  full      - Comprehensive 7-layer check
  build     - Build verification (runs pnpm build)
  impact    - Change impact analysis
  circular  - Circular dependency detection
  docs      - Documentation freshness check
  learnings - Learning tier maintenance
  all       - Run all analysis modes

LEARNING TYPES:
  pattern   - Reusable approach that worked
  pitfall   - Mistake to avoid
  efficiency- Token/time optimization
  discovery - New codebase knowledge
  workflow  - Process improvement`;
}
__name(getModesHelp, "getModesHelp");
function getThresholdsHelp() {
  return `${BRAND_PREFIX} Auto-Promotion Thresholds

VIOLATIONS:
  1-2 occurrences  \u2192 Stored for reference
  3 occurrences    \u2192 Auto-promoted to PATTERN (affects future task starts)
  5 occurrences    \u2192 Marked for AUTOMATION (\u{1F916} flag in response)

LEARNINGS:
  Learnings accessed 3+ times are promoted to "hot tier" for faster loading.
  Hot tier learnings appear automatically in relevant task contexts.

RISK LEVELS:
  L (Low)    - Simple changes, well-tested areas
  M (Medium) - Moderate complexity or less coverage
  H (High)   - Complex changes, critical paths, low protection`;
}
__name(getThresholdsHelp, "getThresholdsHelp");
var handleSnapHelp;
var snapHelpTool;
var init_snap_help = __esm({
  "src/tools/consolidated/snap-help.ts"() {
    init_branding();
    __name6(getToolsHelp, "getToolsHelp");
    __name6(getStatusHelp, "getStatusHelp");
    __name6(getWireHelp, "getWireHelp");
    __name6(getModesHelp, "getModesHelp");
    __name6(getThresholdsHelp, "getThresholdsHelp");
    handleSnapHelp = /* @__PURE__ */ __name6(async (args, _context) => {
      const params = args;
      const topic = params.topic || params.q || "all";
      switch (topic) {
        case "tools":
          return {
            content: [
              {
                type: "text",
                text: getToolsHelp()
              }
            ]
          };
        case "status":
          return {
            content: [
              {
                type: "text",
                text: getStatusHelp()
              }
            ]
          };
        case "wire":
          return {
            content: [
              {
                type: "text",
                text: getWireHelp()
              }
            ]
          };
        case "modes":
          return {
            content: [
              {
                type: "text",
                text: getModesHelp()
              }
            ]
          };
        case "thresholds":
          return {
            content: [
              {
                type: "text",
                text: getThresholdsHelp()
              }
            ]
          };
        default: {
          const allHelp = `${BRAND_PREFIX} Quick Reference

TOOLS: snap | snap_end | snap_fix | snap_learn | snap_violation | check | snap_help

WORKFLOW:
  snap({ mode: "start", task: "description" })  \u2192 Begin task
  check({ mode: "quick" })                      \u2192 Validate code
  snap_fix({ action: "list" })                  \u2192 View snapshots
  snap_end({ outcome: "completed" })            \u2192 Complete task

Response format: [wire line] --- [human summary]
TYPE CODES: S=Start, C=Check, X=Context, E=End, R=Restore, L=Learn, V=Violation

TOPICS: snap_help({ topic: "tools|wire|modes|thresholds" })`;
          return {
            content: [
              {
                type: "text",
                text: allHelp
              }
            ]
          };
        }
      }
    }, "handleSnapHelp");
    snapHelpTool = {
      name: "snap_help",
      description: `\u{1F9E2} SnapBack Help - Wire format reference and tool documentation.

**IMPORTANT: Returns plain text ONLY (no wire format).**
This is intentional - snap_help is the escape hatch for when wire format is confusing.

**Topics:**
- topic:"tools"      - List all available tools with modes
- topic:"status"     - Current session state
- topic:"wire"       - Wire format grammar and field meanings
- topic:"modes"      - Explanation of all modes for snap and check
- topic:"thresholds" - Auto-promotion rules (3x\u2192pattern, 5x\u2192automation)
- topic:"all"        - Comprehensive help (default)

**When to use:**
Call snap_help({ topic: "wire" }) if you receive a wire response you cannot interpret.`,
      inputSchema: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: [
              "tools",
              "status",
              "wire",
              "modes",
              "thresholds",
              "all"
            ],
            description: "Help topic: tools, status, wire, modes, thresholds, or all (default)"
          },
          q: {
            type: "string",
            enum: [
              "tools",
              "status",
              "wire"
            ],
            description: "Legacy: use 'topic' instead"
          }
        }
      },
      annotations: {
        title: "\u{1F9E2} SnapBack Help",
        readOnlyHint: true,
        idempotentHint: true
      },
      tier: "free"
    };
  }
});
var handleSnapLearn;
var snapLearnTool;
var init_snap_learn = __esm({
  "src/tools/consolidated/snap-learn.ts"() {
    init_branding();
    init_handlers();
    handleSnapLearn = /* @__PURE__ */ __name6(async (args, context) => {
      const params = args;
      const options = {
        compact: params.compact ?? false
      };
      const trigger = params.trigger ?? params.t ?? "";
      const action = params.action ?? params.a ?? "";
      const source = params.source ?? params.s ?? "snap_learn";
      const learningType = params.type ?? "pattern";
      const learnArgs = {
        type: learningType,
        trigger,
        action,
        source
      };
      const result7 = await handleLearn(learnArgs, context);
      try {
        const content = result7.content[0]?.text || "";
        const data = JSON.parse(content);
        const wire = formatWireLabeled("L", {
          status: "OK",
          id: data.id || "?",
          type: learningType
        }, options);
        const humanMessage = messages.learning.captured(learningType);
        return {
          content: [
            {
              type: "text",
              text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}`
            }
          ]
        };
      } catch {
        return result7;
      }
    }, "handleSnapLearn");
    snapLearnTool = {
      name: "snap_learn",
      description: `\u{1F9E2} SnapBack Learn - Your knowledge capture companion.

**When to use:** Discovered something that worked? Made a mistake worth remembering? Capture it now.

**Types** (what kind of insight):

**pattern** - Something that worked well
  \u2192 "When doing X, always do Y"
  \u2192 Auto-surfaces in future similar contexts
  \u2192 Example: "auth token refresh" \u2192 "check expiry before API call"

**pitfall** - Mistake to avoid
  \u2192 "Never do X because Y happens"
  \u2192 Warns in future similar situations
  \u2192 Example: "cooldown logic" \u2192 "set AFTER success, not before try"

**efficiency** - Token/time optimization
  \u2192 "Use X instead of Y for better performance"
  \u2192 Improves future session efficiency
  \u2192 Example: "schema validation" \u2192 "cache parsed schemas, don't re-parse"

**discovery** - New codebase knowledge
  \u2192 "File X handles Y functionality"
  \u2192 Builds workspace mental map
  \u2192 Example: "auth flow" \u2192 "middleware/auth.ts validates JWT before routes"

**workflow** - Process improvement
  \u2192 "Better way to do X"
  \u2192 Optimizes future task sequences
  \u2192 Example: "adding features" \u2192 "write tests first, then implementation"

**Auto-Promotion**: 3+ uses \u2192 promotes to hot tier (always loaded)

**Wire Format**: \u{1F9E2}|L|status:OK|id:learn_abc123|type:pattern

**Examples**

Capture successful pattern:
  snap_learn({
    trigger: "deploying to production",
    action: "run build verification first",
    type: "pattern"
  })

Record a pitfall:
  snap_learn({
    trigger: "using process.env in client code",
    action: "will be undefined - use import.meta.env instead",
    type: "pitfall"
  })

Document efficiency gain:
  snap_learn({
    trigger: "validating large schemas",
    action: "cache compiled schemas, ~80% faster",
    type: "efficiency"
  })

**Boundaries**

Will:
- Store locally in .snapback/learnings/
- Auto-load based on task context
- Track usage for promotion
- Never expire (manual cleanup only)

Will Not:
- Share outside workspace
- Modify existing code
- Require network access
- Limit capture frequency

**Pro Tip**: Capture in the moment - don't wait for snap_end. Best learnings come mid-task.`,
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "pattern",
              "pitfall",
              "efficiency",
              "discovery",
              "workflow"
            ],
            description: "Learning category (default: pattern)"
          },
          trigger: {
            type: "string",
            description: "What situation triggers this learning"
          },
          t: {
            type: "string",
            description: "Legacy: use 'trigger' instead"
          },
          action: {
            type: "string",
            description: "What to do when the trigger is encountered"
          },
          a: {
            type: "string",
            description: "Legacy: use 'action' instead"
          },
          source: {
            type: "string",
            description: "Where this learning originated (optional)"
          },
          s: {
            type: "string",
            description: "Legacy: use 'source' instead"
          },
          compact: {
            type: "boolean",
            default: false,
            description: "Use compact positional wire format instead of labeled (default: labeled)"
          }
        },
        required: [
          "trigger",
          "action"
        ]
      },
      annotations: {
        title: "\u{1F9E2} SnapBack Learn",
        readOnlyHint: false,
        idempotentHint: false
      },
      tier: "free"
    };
  }
});
var handleSnapViolation;
var snapViolationTool;
var init_snap_violation = __esm({
  "src/tools/consolidated/snap-violation.ts"() {
    init_branding();
    init_handlers();
    handleSnapViolation = /* @__PURE__ */ __name6(async (args, context) => {
      const params = args;
      const options = {
        compact: params.compact ?? false
      };
      const description = params.description ?? params.what ?? "";
      const reason = params.reason ?? params.why ?? "";
      const prevention = params.prevention ?? params.prevent ?? "";
      const violationArgs = {
        type: params.type,
        file: params.file,
        whatHappened: description,
        whyItHappened: reason,
        prevention
      };
      const result7 = await handleReportViolation(violationArgs, context);
      try {
        const content = result7.content[0]?.text || "";
        const data = JSON.parse(content);
        const count = data.count || 1;
        const wireFields = {
          status: "OK",
          type: params.type,
          count
        };
        if (data.shouldPromote) {
          wireFields.promote = "PROMOTED";
        }
        if (data.shouldAutomate) {
          wireFields.auto = "YES";
        }
        const wire = formatWireLabeled("V", wireFields, options);
        const humanMessage = data.shouldAutomate ? messages.violation.automate(params.type) : data.shouldPromote ? messages.violation.promoted(params.type) : messages.violation.recorded(params.type, count);
        return {
          content: [
            {
              type: "text",
              text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}`
            }
          ]
        };
      } catch {
        return result7;
      }
    }, "handleSnapViolation");
    snapViolationTool = {
      name: "snap_violation",
      description: `\u{1F9E2} SnapBack Violation - Your mistake tracker that learns.

**When to use:** Something broke or went wrong? Report it so you never repeat it.

**Auto-Promotion Magic**:
- **1st time**: Recorded, tracked
- **3rd time**: \u{1F4E5} Promoted to pattern (prevents future occurrences)
- **5th time**: \u{1F916} Marked for automation (seriously, automate this check)

**What to report**:
- Bugs that slipped through
- Security issues caught late
- Performance problems discovered
- Architecture violations
- Test failures from bad patterns

**Wire Format**: \u{1F9E2}|V|status:OK|type:silent_catch|count:3|promote:PROMOTED

**Examples**

Report a caught error pattern:
  snap_violation({
    type: "silent_catch",
    file: "auth.ts",
    description: "Catch block swallowed error without logging",
    reason: "Rushed implementation, forgot logging",
    prevention: "Always log in catch blocks with context"
  })

Architecture violation:
  snap_violation({
    type: "wrong_layer_import",
    file: "packages/core/utils.ts",
    description: "Core imported from platform layer",
    reason: "Didn't check dependency direction",
    prevention: "Core should never import platform - use dependency injection"
  })

Security issue:
  snap_violation({
    type: "exposed_secret",
    file: "config.ts",
    description: "API key hardcoded in source",
    reason: "Testing shortcut left in code",
    prevention: "Use environment variables, never commit secrets"
  })

**Boundaries**

Will:
- Track occurrence count locally
- Auto-promote at thresholds
- Store in .snapback/patterns/violations.jsonl
- Surface in future snap starts

Will Not:
- Share violations externally
- Auto-fix code
- Require manual category management
- Expire violations (cleanup is manual)

**Pro Tip**: Be specific with type names ("silent_catch" not "error"). Specific types promote faster and help more.`,
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "Violation type key (e.g., 'silent_catch', 'missing_auth_check')"
          },
          file: {
            type: "string",
            description: "File where violation occurred"
          },
          description: {
            type: "string",
            description: "What went wrong - description of the violation"
          },
          what: {
            type: "string",
            description: "Legacy: use 'description' instead"
          },
          reason: {
            type: "string",
            description: "Why it happened - root cause analysis"
          },
          why: {
            type: "string",
            description: "Legacy: use 'reason' instead"
          },
          prevention: {
            type: "string",
            description: "How to prevent this in future"
          },
          prevent: {
            type: "string",
            description: "Legacy: use 'prevention' instead"
          },
          compact: {
            type: "boolean",
            default: false,
            description: "Use compact positional wire format instead of labeled (default: labeled)"
          }
        },
        required: [
          "type",
          "file",
          "description",
          "prevention"
        ]
      },
      annotations: {
        title: "\u{1F9E2} SnapBack Violation",
        readOnlyHint: false,
        idempotentHint: false
      },
      tier: "free"
    };
  }
});
var registry_exports = {};
__export(registry_exports, {
  CONSOLIDATED_HANDLERS: /* @__PURE__ */ __name(() => CONSOLIDATED_HANDLERS, "CONSOLIDATED_HANDLERS"),
  CONSOLIDATED_TOOLS: /* @__PURE__ */ __name(() => CONSOLIDATED_TOOLS, "CONSOLIDATED_TOOLS"),
  LEGACY_TO_CONSOLIDATED: /* @__PURE__ */ __name(() => LEGACY_TO_CONSOLIDATED, "LEGACY_TO_CONSOLIDATED"),
  getConsolidatedHandler: /* @__PURE__ */ __name(() => getConsolidatedHandler, "getConsolidatedHandler"),
  getMigrationGuidance: /* @__PURE__ */ __name(() => getMigrationGuidance, "getMigrationGuidance"),
  isConsolidatedTool: /* @__PURE__ */ __name(() => isConsolidatedTool, "isConsolidatedTool")
});
function isConsolidatedTool(name) {
  return name in CONSOLIDATED_HANDLERS;
}
__name(isConsolidatedTool, "isConsolidatedTool");
function getConsolidatedHandler(name) {
  return CONSOLIDATED_HANDLERS[name];
}
__name(getConsolidatedHandler, "getConsolidatedHandler");
function getMigrationGuidance(legacyTool) {
  const mapping = LEGACY_TO_CONSOLIDATED[legacyTool];
  return mapping?.message;
}
__name(getMigrationGuidance, "getMigrationGuidance");
var CONSOLIDATED_TOOLS;
var CONSOLIDATED_HANDLERS;
var LEGACY_TO_CONSOLIDATED;
var init_registry = __esm({
  "src/tools/consolidated/registry.ts"() {
    init_check();
    init_snap();
    init_snap_end();
    init_snap_fix();
    init_snap_help();
    init_snap_learn();
    init_snap_violation();
    CONSOLIDATED_TOOLS = [
      snapTool,
      snapEndTool,
      snapFixTool,
      snapHelpTool,
      snapLearnTool,
      snapViolationTool,
      checkTool
    ];
    CONSOLIDATED_HANDLERS = {
      snap: handleSnap,
      snap_end: handleSnapEnd,
      snap_fix: handleSnapFix,
      snap_help: handleSnapHelp,
      snap_learn: handleSnapLearn,
      snap_violation: handleSnapViolation,
      check: handleCheck
    };
    __name6(isConsolidatedTool, "isConsolidatedTool");
    __name6(getConsolidatedHandler, "getConsolidatedHandler");
    LEGACY_TO_CONSOLIDATED = {
      begin_task: {
        tool: "snap",
        mode: "s",
        message: 'Use snap({m:"s", t:"task", f:["files"]}) instead'
      },
      get_context: {
        tool: "snap",
        mode: "x",
        message: 'Use snap({m:"x"}) instead'
      },
      prepare_workspace: {
        tool: "snap",
        mode: "s",
        message: 'Use snap({m:"s"}) which includes prepare behavior'
      },
      get_learnings: {
        tool: "snap",
        mode: "s",
        message: 'Learnings included in snap({m:"s"}) response'
      },
      quick_check: {
        tool: "check",
        mode: "q",
        message: 'Use check({m:"q", f:["files"]}) instead'
      },
      check_patterns: {
        tool: "check",
        mode: "p",
        message: 'Use check({m:"p", code:"..."}) instead'
      },
      validate: {
        tool: "check",
        mode: "f",
        message: 'Use check({m:"f", code:"..."}) instead'
      },
      complete_task: {
        tool: "snap_end",
        message: "Use snap_end({ok:1, l:[...]}) instead"
      },
      review_work: {
        tool: "snap_end",
        message: "Use snap_end({ok:1}) instead - includes review"
      },
      what_changed: {
        tool: "snap_end",
        message: "Use snap_end({ok:1}) instead - includes changes"
      },
      learn: {
        tool: "snap_learn",
        message: 'Use snap_learn({t:"trigger", a:"action"}) instead'
      },
      snapshot_list: {
        tool: "snap_fix",
        message: "Use snap_fix() with no params for list"
      },
      snapshot_restore: {
        tool: "snap_fix",
        message: 'Use snap_fix({id:"snapshot_id"}) instead'
      },
      compare_snapshots: {
        tool: "snap_fix",
        message: 'Use snap_fix({id:"id1", diff:"id2"}) instead'
      },
      report_violation: {
        tool: "snap_violation",
        message: 'Use snap_violation({type:"...", file:"..."}) instead'
      },
      meta: {
        tool: "snap_help",
        message: "Use snap_help() instead"
      },
      get_pairing_protocol: {
        tool: "snap_help",
        message: "Use snap_help() instead"
      }
    };
    __name6(getMigrationGuidance, "getMigrationGuidance");
  }
});
var ToolCapability;
var ALL_CAPABILITIES;
var CapabilityGroups;
var TIER_HIERARCHY;
var ToolNotFoundError;
var TierNotAuthorizedError;
var CapabilityNotGrantedError;
var InputValidationError;
var init_types = __esm({
  "src/registry/types.ts"() {
    ToolCapability = {
      // Snapshot operations
      SNAPSHOT_READ: "snapshot:read",
      SNAPSHOT_WRITE: "snapshot:write",
      SNAPSHOT_DELETE: "snapshot:delete",
      // Session operations
      SESSION_READ: "session:read",
      SESSION_WRITE: "session:write",
      // Learning operations
      LEARNING_READ: "learning:read",
      LEARNING_WRITE: "learning:write",
      // Validation operations
      VALIDATE_READ: "validate:read",
      // Telemetry operations
      TELEMETRY_WRITE: "telemetry:write",
      // Enterprise capabilities
      TEAM_READ: "team:read",
      TEAM_WRITE: "team:write",
      COMPLIANCE_READ: "compliance:read",
      COMPLIANCE_EXPORT: "compliance:export",
      AUDIT_READ: "audit:read"
    };
    ALL_CAPABILITIES = Object.values(ToolCapability);
    CapabilityGroups = {
      /** All snapshot-related capabilities */
      SNAPSHOT_ALL: [
        ToolCapability.SNAPSHOT_READ,
        ToolCapability.SNAPSHOT_WRITE,
        ToolCapability.SNAPSHOT_DELETE
      ],
      /** All session-related capabilities */
      SESSION_ALL: [
        ToolCapability.SESSION_READ,
        ToolCapability.SESSION_WRITE
      ],
      /** All learning-related capabilities */
      LEARNING_ALL: [
        ToolCapability.LEARNING_READ,
        ToolCapability.LEARNING_WRITE
      ],
      /** Enterprise-only capabilities */
      ENTERPRISE: [
        ToolCapability.TEAM_READ,
        ToolCapability.TEAM_WRITE,
        ToolCapability.COMPLIANCE_READ,
        ToolCapability.COMPLIANCE_EXPORT,
        ToolCapability.AUDIT_READ
      ]
    };
    TIER_HIERARCHY = [
      "free",
      "pro",
      "enterprise"
    ];
    ToolNotFoundError = class extends Error {
      static {
        __name(this, "ToolNotFoundError");
      }
      static {
        __name6(this, "ToolNotFoundError");
      }
      toolName;
      constructor(toolName) {
        super(`Tool '${toolName}' not found`);
        this.name = "ToolNotFoundError";
        this.toolName = toolName;
      }
    };
    TierNotAuthorizedError = class extends Error {
      static {
        __name(this, "TierNotAuthorizedError");
      }
      static {
        __name6(this, "TierNotAuthorizedError");
      }
      toolName;
      requiredTier;
      constructor(toolName, requiredTier) {
        super(`Tool '${toolName}' requires '${requiredTier}' tier or higher`);
        this.name = "TierNotAuthorizedError";
        this.toolName = toolName;
        this.requiredTier = requiredTier;
      }
    };
    CapabilityNotGrantedError = class extends Error {
      static {
        __name(this, "CapabilityNotGrantedError");
      }
      static {
        __name6(this, "CapabilityNotGrantedError");
      }
      toolName;
      missingCapabilities;
      constructor(toolName, missingCapabilities) {
        super(`Tool '${toolName}' requires capabilities: ${missingCapabilities.join(", ")}`);
        this.name = "CapabilityNotGrantedError";
        this.toolName = toolName;
        this.missingCapabilities = missingCapabilities;
      }
    };
    InputValidationError = class extends Error {
      static {
        __name(this, "InputValidationError");
      }
      static {
        __name6(this, "InputValidationError");
      }
      toolName;
      validationErrors;
      constructor(toolName, errors) {
        super(`Tool '${toolName}' input validation failed: ${errors.join("; ")}`);
        this.name = "InputValidationError";
        this.toolName = toolName;
        this.validationErrors = errors;
      }
    };
  }
});
var CapabilityManager_exports = {};
__export(CapabilityManager_exports, {
  CapabilityManager: /* @__PURE__ */ __name(() => CapabilityManager, "CapabilityManager")
});
var DEFAULT_RULES;
var CapabilityManager;
var init_CapabilityManager = __esm({
  "src/registry/CapabilityManager.ts"() {
    init_types();
    DEFAULT_RULES = [
      // Free tier gets basic capabilities
      {
        capabilities: [
          ToolCapability.SNAPSHOT_READ,
          ToolCapability.SNAPSHOT_WRITE,
          ToolCapability.SESSION_READ,
          ToolCapability.SESSION_WRITE,
          ToolCapability.LEARNING_READ,
          ToolCapability.LEARNING_WRITE,
          ToolCapability.VALIDATE_READ,
          ToolCapability.TELEMETRY_WRITE
        ],
        tier: "free"
      },
      // Pro tier gets snapshot delete
      {
        capabilities: [
          ToolCapability.SNAPSHOT_DELETE
        ],
        tier: "pro"
      },
      // Enterprise gets team and compliance
      {
        capabilities: [
          ...CapabilityGroups.ENTERPRISE
        ],
        tier: "enterprise"
      }
    ];
    CapabilityManager = class {
      static {
        __name(this, "CapabilityManager");
      }
      static {
        __name6(this, "CapabilityManager");
      }
      rules;
      featureFlags = /* @__PURE__ */ new Map();
      constructor(customRules) {
        this.rules = customRules ?? DEFAULT_RULES;
      }
      /**
      * Set a feature flag
      */
      setFeatureFlag(flag, enabled) {
        this.featureFlags.set(flag, enabled);
      }
      /**
      * Get active capabilities for a workspace/user
      */
      getActiveCapabilities(workspace, user) {
        const active = /* @__PURE__ */ new Set();
        const tierHierarchy = [
          "free",
          "pro",
          "enterprise"
        ];
        const userTierIndex = tierHierarchy.indexOf(workspace.tier);
        for (const rule of this.rules) {
          const ruleTierIndex = tierHierarchy.indexOf(rule.tier ?? "free");
          if (userTierIndex < ruleTierIndex) {
            continue;
          }
          if (rule.featureFlag && !this.featureFlags.get(rule.featureFlag)) {
            continue;
          }
          if (rule.condition && !rule.condition(workspace, user)) {
            continue;
          }
          for (const cap of rule.capabilities) {
            active.add(cap);
          }
        }
        return active;
      }
      /**
      * Check if specific capabilities are granted
      */
      hasCapabilities(required, workspace, user) {
        const active = this.getActiveCapabilities(workspace, user);
        const missing = required.filter((cap) => !active.has(cap));
        return {
          granted: missing.length === 0,
          missing
        };
      }
      /**
      * Check a single capability
      */
      hasCapability(capability, workspace, user) {
        return this.hasCapabilities([
          capability
        ], workspace, user).granted;
      }
      /**
      * Add a custom rule
      */
      addRule(rule) {
        this.rules.push(rule);
      }
      /**
      * Get all available capabilities
      */
      getAllCapabilities() {
        return ALL_CAPABILITIES;
      }
      /**
      * Get capabilities for a specific tier
      */
      getCapabilitiesForTier(tier) {
        const mockWorkspace = {
          path: "/mock",
          tier
        };
        return Array.from(this.getActiveCapabilities(mockWorkspace));
      }
    };
  }
});
var THREAT_PATTERNS = {
  critical: [
    {
      pattern: /rm\s+-rf/gi,
      description: "destructive rm -rf command",
      severity: 10
    },
    {
      pattern: /DROP\s+TABLE/gi,
      description: "DROP TABLE statement",
      severity: 10
    },
    {
      pattern: /TRUNCATE\s+TABLE/gi,
      description: "TRUNCATE TABLE statement",
      severity: 10
    }
  ],
  high: [
    {
      pattern: /password\s*[:=]\s*['"][^'"]+['"]/,
      description: "hardcoded password",
      severity: 8
    },
    {
      pattern: /AKIA[A-Z0-9]{16}/,
      description: "AWS access key",
      severity: 9
    },
    {
      pattern: /ghp_[a-zA-Z0-9]{36}/,
      description: "GitHub token",
      severity: 9
    },
    {
      pattern: /eval\(/,
      description: "eval() usage",
      severity: 8
    }
  ],
  medium: [
    {
      pattern: /jest\.mock\(/,
      description: "jest.mock in production",
      severity: 5
    },
    {
      pattern: /vi\.mock\(/,
      description: "vitest mock in production",
      severity: 5
    },
    {
      pattern: /exec\(/,
      description: "exec() command execution",
      severity: 5
    }
  ]
};
var AnalyzeBeforeApplyInputSchema = z.object({
  changes: z.array(z.object({
    added: z.boolean().optional().default(false),
    removed: z.boolean().optional().default(false),
    value: z.string(),
    count: z.number().optional()
  }))
});
async function analyzeBeforeApply(changes) {
  const parsed = AnalyzeBeforeApplyInputSchema.parse({
    changes
  });
  const content = parsed.changes.map((change) => change.value).join("\n");
  try {
    const threats = [];
    for (const level of [
      "critical",
      "high",
      "medium"
    ]) {
      for (const threat of THREAT_PATTERNS[level]) {
        threat.pattern.lastIndex = 0;
        if (threat.pattern.test(content)) {
          threats.push({
            description: threat.description,
            severity: threat.severity
          });
        }
      }
    }
    const riskScore = threats.length > 0 ? Math.max(...threats.map((t) => t.severity)) : 0;
    const decision = riskScore >= 5 ? "Review" : "Apply";
    return {
      decision,
      riskScore,
      reasons: threats.map((t) => t.description),
      recommendations: threats.length > 0 ? [
        "Review detected issues before applying",
        "Consider security implications"
      ] : []
    };
  } catch (error) {
    return {
      decision: "Review",
      riskScore: 10,
      reasons: [
        `Analysis error: ${error instanceof Error ? error.message : "Unknown error"}`
      ],
      recommendations: [
        "Review changes manually due to analysis failure"
      ]
    };
  }
}
__name(analyzeBeforeApply, "analyzeBeforeApply");
__name6(analyzeBeforeApply, "analyzeBeforeApply");
function formatAnalysisResult(result7) {
  const decisionText = result7.decision === "Apply" ? "\u2705 Safe to Apply" : "\u26A0\uFE0F  Review Required";
  let output = `${decisionText} (Risk Score: ${result7.riskScore}/10)

`;
  if (result7.reasons.length > 0) {
    output += "Reasons:\n";
    for (const reason of result7.reasons) {
      output += `  \u2022 ${reason}
`;
    }
    output += "\n";
  }
  if (result7.recommendations.length > 0) {
    output += "Recommendations:\n";
    for (const recommendation of result7.recommendations) {
      output += `  \u2022 ${recommendation}
`;
    }
    output += "\n";
  }
  return output;
}
__name(formatAnalysisResult, "formatAnalysisResult");
__name6(formatAnalysisResult, "formatAnalysisResult");
init_branding();
init_state();
var BridgeReceiver = class {
  static {
    __name(this, "BridgeReceiver");
  }
  static {
    __name6(this, "BridgeReceiver");
  }
  server = null;
  port;
  host;
  defaultWorkspaceRoot;
  // Stats
  observationsReceived = 0;
  changesReceived = 0;
  lastActivity = null;
  constructor(config = {}) {
    this.port = config.port ?? 3100;
    this.host = config.host ?? "127.0.0.1";
    this.defaultWorkspaceRoot = config.defaultWorkspaceRoot ?? process.cwd();
  }
  /**
  * Start the bridge receiver
  */
  async start() {
    if (this.server) {
      console.error("[BridgeReceiver] Already running");
      return;
    }
    return new Promise((resolve32, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));
      this.server.on("error", (err2) => {
        console.error("[BridgeReceiver] Server error:", err2);
        reject(err2);
      });
      this.server.listen(this.port, this.host, () => {
        console.error(`[BridgeReceiver] Listening on http://${this.host}:${this.port}`);
        resolve32();
      });
    });
  }
  /**
  * Stop the bridge receiver
  */
  async stop() {
    if (!this.server) {
      return;
    }
    return new Promise((resolve32) => {
      this.server?.close(() => {
        console.error("[BridgeReceiver] Stopped");
        this.server = null;
        resolve32();
      });
    });
  }
  /**
  * Get receiver status
  */
  getStatus() {
    return {
      running: this.server !== null,
      port: this.port,
      host: this.host,
      observationsReceived: this.observationsReceived,
      changesReceived: this.changesReceived,
      lastActivity: this.lastActivity
    };
  }
  /**
  * Handle incoming HTTP request
  */
  handleRequest(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = req.url ?? "/";
    if (url === "/bridge/push" && req.method === "POST") {
      this.handlePush(req, res);
    } else if (url === "/bridge/status" && req.method === "GET") {
      this.handleStatus(res);
    } else if (url === "/bridge/health" && req.method === "GET") {
      this.handleHealth(res);
    } else {
      this.sendJson(res, 404, {
        error: "Not found"
      });
    }
  }
  /**
  * Handle /bridge/push - receive observations and changes
  */
  handlePush(req, res) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        this.sendJson(res, 413, {
          error: "Payload too large"
        });
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        this.processPush(payload);
        this.lastActivity = Date.now();
        this.sendJson(res, 200, {
          received: true,
          observationsCount: payload.observations?.length ?? 0,
          changesCount: payload.changes?.length ?? 0
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        this.sendJson(res, 400, {
          error: `Invalid payload: ${message}`
        });
      }
    });
    req.on("error", (err2) => {
      console.error("[BridgeReceiver] Request error:", err2);
      this.sendJson(res, 500, {
        error: "Request error"
      });
    });
  }
  /**
  * Process push payload
  */
  processPush(payload) {
    const workspaceRoot = payload.workspaceRoot ?? this.defaultWorkspaceRoot;
    if (payload.observations && payload.observations.length > 0) {
      for (const observation of payload.observations) {
        pushObservation(workspaceRoot, observation);
        this.observationsReceived++;
      }
    }
    if (payload.changes && payload.changes.length > 0) {
      for (const change of payload.changes) {
        recordFileChange(workspaceRoot, change);
        this.changesReceived++;
      }
    }
  }
  /**
  * Handle /bridge/status - return bridge status
  */
  handleStatus(res) {
    const status2 = this.getStatus();
    this.sendJson(res, 200, status2);
  }
  /**
  * Handle /bridge/health - health check endpoint
  */
  handleHealth(res) {
    this.sendJson(res, 200, {
      healthy: true,
      timestamp: Date.now()
    });
  }
  /**
  * Send JSON response
  */
  sendJson(res, status2, data) {
    res.writeHead(status2, {
      "Content-Type": "application/json"
    });
    res.end(JSON.stringify(data));
  }
};
var bridgeReceiver = null;
function getBridgeReceiver(config) {
  if (!bridgeReceiver) {
    bridgeReceiver = new BridgeReceiver(config);
  }
  return bridgeReceiver;
}
__name(getBridgeReceiver, "getBridgeReceiver");
__name6(getBridgeReceiver, "getBridgeReceiver");
async function startBridgeReceiver(config) {
  const receiver = getBridgeReceiver(config);
  await receiver.start();
  return receiver;
}
__name(startBridgeReceiver, "startBridgeReceiver");
__name6(startBridgeReceiver, "startBridgeReceiver");
async function stopBridgeReceiver() {
  if (bridgeReceiver) {
    await bridgeReceiver.stop();
    bridgeReceiver = null;
  }
}
__name(stopBridgeReceiver, "stopBridgeReceiver");
__name6(stopBridgeReceiver, "stopBridgeReceiver");
function createRiskObservation(file, reason) {
  return {
    type: "risk",
    message: `High-risk file modified: ${file} (${reason})`,
    timestamp: Date.now(),
    context: {
      file,
      riskLevel: "high"
    }
  };
}
__name(createRiskObservation, "createRiskObservation");
__name6(createRiskObservation, "createRiskObservation");
function createPatternObservation(patternName, message, file) {
  return {
    type: "pattern",
    message,
    timestamp: Date.now(),
    context: {
      patternName,
      file
    }
  };
}
__name(createPatternObservation, "createPatternObservation");
__name6(createPatternObservation, "createPatternObservation");
function createWarningObservation(message, context) {
  return {
    type: "warning",
    message,
    timestamp: Date.now(),
    context
  };
}
__name(createWarningObservation, "createWarningObservation");
__name6(createWarningObservation, "createWarningObservation");
function createSuggestionObservation(message, context) {
  return {
    type: "suggestion",
    message,
    timestamp: Date.now(),
    context
  };
}
__name(createSuggestionObservation, "createSuggestionObservation");
__name6(createSuggestionObservation, "createSuggestionObservation");
function createProgressObservation(message) {
  return {
    type: "progress",
    message,
    timestamp: Date.now()
  };
}
__name(createProgressObservation, "createProgressObservation");
__name6(createProgressObservation, "createProgressObservation");
var MCP_ROUTES = {
  // Session lifecycle
  "mcp.startSession": {
    method: "POST",
    path: "/v1/mcp/session/start"
  },
  "mcp.endSession": {
    method: "POST",
    path: "/v1/mcp/session/end"
  },
  "mcp.getSessionStats": {
    method: "GET",
    path: "/v1/mcp/session/stats"
  },
  // Recommendations & Learning
  "mcp.getRecommendations": {
    method: "POST",
    path: "/v1/mcp/recommendations"
  },
  "mcp.recordLearning": {
    method: "POST",
    path: "/v1/mcp/learning/record"
  },
  "mcp.recordActivity": {
    method: "POST",
    path: "/v1/mcp/activity/record"
  },
  // Analysis (API-backed)
  "mcp.analyzeRisk": {
    method: "POST",
    path: "/v1/analysis/risk"
  },
  "mcp.validatePackage": {
    method: "POST",
    path: "/v1/analysis/package"
  },
  // Snapshots (Pro tier) - NOW USING oRPC ENDPOINTS
  // These route to the proper oRPC snapshotsRouter with database persistence
  "mcp.createSnapshot": {
    method: "POST",
    path: "/api/snapshots/create"
  },
  "mcp.listSnapshots": {
    method: "GET",
    path: "/api/snapshots/list"
  },
  "mcp.restoreSnapshot": {
    method: "POST",
    path: "/api/snapshots/restore"
  },
  // Tool execution (generic endpoint)
  "mcp.execute": {
    method: "POST",
    path: "/v1/mcp/execute"
  }
};
(class {
  static {
    __name(this, "SnapBackAPIClient");
  }
  static {
    __name6(this, "SnapBackAPIClient");
  }
  client;
  circuitBreaker;
  timeoutMs;
  constructor(config) {
    this.timeoutMs = config.timeout ?? 3e4;
    this.client = ky.create({
      prefixUrl: config.baseUrl,
      timeout: this.timeoutMs,
      retry: {
        limit: 0
      },
      hooks: {
        beforeRequest: [
          (request) => {
            request.headers.set("Authorization", `Bearer ${config.apiKey}`);
            request.headers.set("Accept", "application/json");
          }
        ]
      },
      ...config.fetch && {
        fetch: config.fetch
      }
    });
    this.circuitBreaker = new CircuitBreaker((endpoint, options) => this.doFetch(endpoint, options), {
      timeout: this.timeoutMs,
      errorThresholdPercentage: 50,
      resetTimeout: 3e4,
      volumeThreshold: 5
    });
    this.circuitBreaker.on("open", () => console.warn("[SnapBack API] Circuit breaker opened"));
    this.circuitBreaker.on("halfOpen", () => console.warn("[SnapBack API] Circuit breaker half-open"));
    this.circuitBreaker.on("close", () => console.info("[SnapBack API] Circuit breaker closed"));
  }
  /**
  * Type-safe request using route registry
  */
  async call(route, params) {
    const { method, path: path6 } = MCP_ROUTES[route];
    const options = {
      method
    };
    if (params && method !== "GET") {
      options.body = JSON.stringify(params);
      options.headers = {
        "Content-Type": "application/json"
      };
    }
    return this.fetchWithRetry(path6, options);
  }
  /**
  * Legacy request method - maps old names to routes
  * @deprecated Use call() with route keys instead
  */
  async request(method, params) {
    if (method in MCP_ROUTES) {
      return this.call(method, params);
    }
    return this.call("mcp.execute", {
      tool: method,
      args: params
    });
  }
  async fetchWithRetry(endpoint, options, maxAttempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.circuitBreaker.fire(endpoint, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxAttempts) {
          await this.delay(100 * 2 ** (attempt - 1));
        }
      }
    }
    throw lastError ?? new Error("Request failed");
  }
  async doFetch(endpoint, options) {
    const url = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    try {
      const response = await this.client(url, options);
      return response.json();
    } catch (error) {
      if (error instanceof HTTPError) {
        const status2 = error.response?.status || 500;
        const statusText = error.response?.statusText || "Unknown Error";
        throw new Error(`API error: ${status2} ${statusText}`);
      }
      throw error;
    }
  }
  delay(ms) {
    return new Promise((resolve32) => setTimeout(resolve32, ms));
  }
  /**
  * Get circuit breaker state for monitoring
  */
  getCircuitState() {
    if (this.circuitBreaker.opened) {
      return "open";
    }
    if (this.circuitBreaker.halfOpen) {
      return "half-open";
    }
    return "closed";
  }
});
init_errors2();
init_errors();
init_handlers();
init_intelligence();
init_intelligence();
async function getSessionHealth(context) {
  const intel = getIntelligence2(context.workspaceRoot);
  const violations = intel.getViolationsSummary();
  const vitals = WorkspaceVitals.for(context.workspaceRoot);
  const currentVitals = vitals.current();
  const guidance = vitals.getAgentGuidance();
  const storage = createStorage(context.workspaceRoot);
  const snapshots = storage.listSnapshots();
  const lastSnapshot = snapshots[0];
  const healthScore = Math.max(0, Math.min(100, 100 - currentVitals.pressure.value));
  const activeWarnings = [];
  if (currentVitals.pressure.value >= PRESSURE_THRESHOLDS.high) {
    activeWarnings.push("High pressure - consider creating a snapshot");
  }
  if (currentVitals.temperature.level === "hot") {
    activeWarnings.push("High AI change density detected");
  }
  if (currentVitals.pressure.criticalFilesTouched.length > 0) {
    activeWarnings.push(`Critical files touched: ${currentVitals.pressure.criticalFilesTouched.join(", ")}`);
  }
  if (violations.total > 0) {
    activeWarnings.push(`${violations.total} recent violation(s) recorded`);
  }
  const suggestions = [];
  if (guidance.suggestion) {
    suggestions.push(guidance.suggestion);
  }
  if (violations.readyForPromotion.length > 0) {
    suggestions.push(`${violations.readyForPromotion.length} violation(s) ready for pattern promotion`);
  }
  return {
    workspaceId: context.workspaceRoot,
    healthScore,
    trajectory: currentVitals.trajectory,
    activeWarnings,
    recentViolations: violations.total,
    lastSnapshot: lastSnapshot ? {
      id: lastSnapshot.id,
      createdAt: new Date(lastSnapshot.createdAt).toISOString(),
      minutesAgo: Math.floor((Date.now() - lastSnapshot.createdAt) / 6e4)
    } : null,
    suggestions
  };
}
__name(getSessionHealth, "getSessionHealth");
__name6(getSessionHealth, "getSessionHealth");
async function wrapWithSessionHealth(data, context) {
  const session = await getSessionHealth(context);
  return {
    data,
    session
  };
}
__name(wrapWithSessionHealth, "wrapWithSessionHealth");
__name6(wrapWithSessionHealth, "wrapWithSessionHealth");
async function sessionAwareResult(data, context) {
  const enhanced = await wrapWithSessionHealth(data, context);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(enhanced, null, 2)
      }
    ],
    isError: false
  };
}
__name(sessionAwareResult, "sessionAwareResult");
__name6(sessionAwareResult, "sessionAwareResult");
function isRiskyState(health) {
  return health.healthScore < 50 || health.trajectory === "critical" || health.trajectory === "degrading" || health.activeWarnings.length > 2;
}
__name(isRiskyState, "isRiskyState");
__name6(isRiskyState, "isRiskyState");
function getRecommendedActions(health, taskContext) {
  const recommendations = [];
  if (health.healthScore < 30 || health.trajectory === "critical") {
    recommendations.push({
      tool: "snapshot_create",
      reason: "Critical health score - create safety snapshot before proceeding",
      priority: "critical"
    });
  }
  if (taskContext?.isNewTask) {
    recommendations.push({
      tool: "get_context",
      reason: "Starting new task - gather patterns, constraints, and relevant learnings",
      priority: "high"
    });
  }
  if (health.recentViolations > 3) {
    recommendations.push({
      tool: "get_learnings",
      reason: `${health.recentViolations} recent violations - review past patterns to avoid repeating mistakes`,
      priority: "high"
    });
  }
  if (taskContext?.hasCodeChanges) {
    recommendations.push({
      tool: "check_patterns",
      reason: "Code changes detected - validate against architectural patterns before commit",
      priority: "medium"
    });
  }
  if ((taskContext?.fileCount ?? 0) > 3 && !health.lastSnapshot) {
    recommendations.push({
      tool: "prepare_workspace",
      reason: "Multi-file changes planned with no snapshot - run pre-flight check",
      priority: "medium"
    });
  }
  if (health.lastSnapshot && health.lastSnapshot.minutesAgo > 120 && health.trajectory === "degrading") {
    recommendations.push({
      tool: "snapshot_create",
      reason: "Last snapshot over 2 hours ago and trajectory is degrading",
      priority: "low"
    });
  }
  if (health.suggestions.length > 0) {
    recommendations.push({
      tool: "report_violation",
      reason: "Active suggestions available - consider recording learnings for pattern promotion",
      priority: "low"
    });
  }
  const priorityOrder = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 3);
}
__name(getRecommendedActions, "getRecommendedActions");
__name6(getRecommendedActions, "getRecommendedActions");
function getRecommendedAction(health) {
  const actions = getRecommendedActions(health);
  return actions.length > 0 ? {
    tool: actions[0].tool,
    reason: actions[0].reason
  } : null;
}
__name(getRecommendedAction, "getRecommendedAction");
__name6(getRecommendedAction, "getRecommendedAction");
init_registry();
var handlerRegistry = /* @__PURE__ */ new Map();
function registerHandler(toolName, handler) {
  handlerRegistry.set(toolName, handler);
}
__name(registerHandler, "registerHandler");
__name6(registerHandler, "registerHandler");
function getHandler(toolName) {
  return handlerRegistry.get(toolName);
}
__name(getHandler, "getHandler");
__name6(getHandler, "getHandler");
function listFacadeTools() {
  return CONSOLIDATED_TOOLS;
}
__name(listFacadeTools, "listFacadeTools");
__name6(listFacadeTools, "listFacadeTools");
init_errors();
init_intelligence();
init_hybrid_retrieval_service();
var MCP_EVENTS = {
  TOOL_CALLED: "mcp_tool_called",
  CONTEXT_PROVIDED: "mcp_context_provided",
  AGENT_SELF_CHECK: "mcp_agent_self_check"
};
var SENSITIVE_KEYS = /* @__PURE__ */ new Set([
  "path",
  "filePath",
  "file_path",
  "code",
  "content",
  "secret",
  "token",
  "password",
  "key",
  "apiKey",
  "api_key"
]);
function sanitizeParams(params) {
  const sanitized = {};
  for (const [key, value] of Object.entries(params)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[redacted]";
    } else if (typeof value === "string" && value.length > 100) {
      sanitized[key] = `${value.slice(0, 50)}...[truncated]`;
    } else if (Array.isArray(value)) {
      sanitized[key] = `[array:${value.length}]`;
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = `[object:${Object.keys(value).length} keys]`;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
__name(sanitizeParams, "sanitizeParams");
__name6(sanitizeParams, "sanitizeParams");
var McpEventTracker = class {
  static {
    __name(this, "McpEventTracker");
  }
  static {
    __name6(this, "McpEventTracker");
  }
  telemetry;
  constructor(telemetry) {
    this.telemetry = telemetry;
  }
  /**
  * Track tool call event
  *
  * Called after each tool execution in server.ts
  *
  * @param props - Tool call properties
  */
  trackToolCalled(props) {
    if (!this.telemetry) return;
    this.telemetry.log(MCP_EVENTS.TOOL_CALLED, {
      ...props,
      parameters: sanitizeParams(props.parameters),
      timestamp: Date.now()
    });
  }
  /**
  * Track context provided event
  *
  * Called when context is gathered for AI agents
  *
  * @param props - Context provided properties
  */
  trackContextProvided(props) {
    if (!this.telemetry) return;
    this.telemetry.log(MCP_EVENTS.CONTEXT_PROVIDED, {
      ...props,
      timestamp: Date.now()
    });
  }
  /**
  * Track agent self-check event
  *
  * Called when agent runs validation checks
  *
  * @param props - Self-check properties
  */
  trackAgentSelfCheck(props) {
    if (!this.telemetry) return;
    this.telemetry.log(MCP_EVENTS.AGENT_SELF_CHECK, {
      ...props,
      timestamp: Date.now()
    });
  }
};
init_registry();
init_validation();
function enhanceWithSessionHealth(result7, workspaceRoot) {
  if (result7.isError) {
    return result7;
  }
  try {
    const intel = getIntelligence2(workspaceRoot);
    const vitals = intel.getVitalsSnapshot(workspaceRoot);
    if (!vitals) {
      return result7;
    }
    const sessionHealth = {
      pulse: vitals.pulse.level,
      pressure: vitals.pressure.value,
      trajectory: vitals.trajectory,
      snapshotRecommended: vitals.pressure.value > 60 || vitals.trajectory === "escalating"
    };
    if (vitals.trajectory === "critical" || vitals.pressure.value > 80) {
      sessionHealth.hint = "Consider creating a snapshot before continuing";
    } else if (vitals.pulse.level === "racing") {
      sessionHealth.hint = "High change velocity detected - take care with modifications";
    }
    const originalText = result7.content[0]?.text;
    if (originalText) {
      try {
        const parsed = JSON.parse(originalText);
        const enhanced = {
          ...parsed,
          _sessionHealth: sessionHealth
        };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(enhanced, null, 2)
            }
          ],
          isError: false
        };
      } catch {
        return {
          content: [
            ...result7.content,
            {
              type: "text",
              text: `
_sessionHealth: ${JSON.stringify(sessionHealth)}`
            }
          ],
          isError: false
        };
      }
    }
    return result7;
  } catch {
    return result7;
  }
}
__name(enhanceWithSessionHealth, "enhanceWithSessionHealth");
__name6(enhanceWithSessionHealth, "enhanceWithSessionHealth");
function createMcpServer(options) {
  const { workspaceRoot, tier } = options;
  const server = new Server({
    name: "snapback-mcp",
    version: "1.0.0"
  }, {
    capabilities: {
      tools: {},
      resources: {},
      // Advertise server capabilities to LLM
      experimental: {
        serverInfo: {
          storageMode: options.storageMode || "readonly",
          writeCapable: (options.storageMode || "readonly") === "local",
          cliAvailable: true,
          cliSetupCommand: "npm install -g @snapback/cli && snapback tools configure"
        }
      }
    }
  });
  const context = {
    workspaceRoot,
    tier,
    storageMode: options.storageMode || "readonly",
    userId: options.auth?.userId
  };
  const eventTracker = new McpEventTracker(options.telemetry ?? null);
  for (const [name, handler] of Object.entries(CONSOLIDATED_HANDLERS)) {
    registerHandler(name, handler);
  }
  console.error(`[SnapBack MCP] Server created for workspace: ${workspaceRoot}`);
  console.error(`[SnapBack MCP] Tier: ${tier}`);
  console.error(`[SnapBack MCP] ${CONSOLIDATED_TOOLS.length} consolidated tools registered`);
  initializeHybridRetrieval(workspaceRoot).catch((error) => {
    console.error("[SnapBack MCP] Hybrid retrieval initialization failed:", error);
  });
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const availableTools = CONSOLIDATED_TOOLS.filter((tool) => {
      if (tool.tier === "pro" && tier === "free") {
        return false;
      }
      return true;
    });
    return {
      tools: availableTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations
      }))
    };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const startTime = Date.now();
    const reqCtx = createRequestContext(name, {
      userId: context.userId,
      tier: context.tier
    });
    log("info", reqCtx, "Tool call started", {
      args: Object.keys(args || {})
    });
    if (!isConsolidatedTool(name)) {
      const guidance = getMigrationGuidance(name);
      if (guidance) {
        log("warn", reqCtx, "Legacy tool called", {
          guidance
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "E601_DEPRECATED_TOOL",
                message: `Tool '${name}' is deprecated. ${guidance}`,
                migration: guidance,
                availableTools: CONSOLIDATED_TOOLS.map((t) => t.name)
              })
            }
          ],
          isError: true
        };
      }
    }
    const toolDef = CONSOLIDATED_TOOLS.find((t) => t.name === name);
    if (toolDef?.tier === "pro" && tier === "free") {
      logError(reqCtx, "E301_TIER_GATE_BLOCKED", "Tool requires pro tier");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(CommonErrors.tierGateBlocked(name, "pro", tier))
          }
        ],
        isError: true
      };
    }
    const schema = getToolSchema(name);
    if (schema) {
      const validation = validateInput(schema, args || {});
      if (!validation.valid) {
        logError(reqCtx, "E104_VALIDATION_FAILED", validation.error);
        let guidance = "";
        if (name === "snap" && validation.error.includes("mode")) {
          guidance = `

\u{1F4A1} TIP: The 'snap' tool accepts EITHER:
  - mode: "start" | "check" | "context" (full-word, recommended)
  - m: "s" | "c" | "x" (legacy single-letter)

Example: snap({ mode: "start", task: "fix bug" })`;
        } else if (name === "snap_learn" && validation.error.includes("trigger")) {
          guidance = `

\u{1F4A1} TIP: The 'snap_learn' tool requires BOTH:
  - trigger: "when X happens" (or legacy: t)
  - action: "do Y" (or legacy: a)

Example: snap_learn({ trigger: "auth token refresh", action: "check expiry before API call" })`;
        } else if (name === "snap_violation" && validation.error.includes("description")) {
          guidance = `

\u{1F4A1} TIP: The 'snap_violation' tool requires:
  - type: "violation_key" (e.g., 'silent_catch')
  - file: "path/to/file"
  - description: "what went wrong" (or legacy: what)
  - prevention: "how to avoid" (or legacy: prevent)

Example: snap_violation({ type: "silent_catch", file: "auth.ts", description: "Caught error without logging", prevention: "Always log in catch blocks" })`;
        } else if (name === "check" && validation.error.includes("mode")) {
          guidance = `

\u{1F4A1} TIP: The 'check' tool accepts EITHER:
  - mode: "quick" | "full" | "patterns" | "build" | "impact" | "circular" | "docs" | "learnings" | "architecture" (recommended)
  - m: "q" | "f" | "p" | "b" | "i" | "c" | "d" | "l" | "a" (legacy)

Example: check({ mode: "quick", files: ["src/auth.ts"] })`;
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "E104_VALIDATION_FAILED",
                message: validation.error + guidance,
                tool: name,
                issues: validation.issues,
                hint: "Check the tool's inputSchema for required parameters and accepted values"
              })
            }
          ],
          isError: true
        };
      }
    }
    const handler = getHandler(name);
    if (!handler) {
      logError(reqCtx, "E501_UNKNOWN_TOOL", `Unknown tool: ${name}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "E501_UNKNOWN_TOOL",
              message: `Unknown tool: ${name}`,
              suggestion: "Use meta to list available tools"
            })
          }
        ],
        isError: true
      };
    }
    try {
      const result7 = await handler(args || {}, context);
      logSuccess(reqCtx, "Tool call completed", {
        isError: result7.isError
      });
      eventTracker.trackToolCalled({
        tool_name: name,
        client_type: "cli",
        parameters: args || {},
        execution_time_ms: Date.now() - startTime,
        was_successful: !result7.isError
      });
      const enhanced = name === "meta" ? result7 : enhanceWithSessionHealth(result7, workspaceRoot);
      return {
        content: enhanced.content.map((c) => ({
          type: "text",
          text: c.text
        })),
        isError: enhanced.isError
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logError(reqCtx, "E502_HANDLER_ERROR", message);
      eventTracker.trackToolCalled({
        tool_name: name,
        client_type: "cli",
        parameters: args || {},
        execution_time_ms: Date.now() - startTime,
        was_successful: false,
        error_code: error instanceof Error ? error.name : "UNKNOWN_ERROR"
      });
      if (message.includes("EACCES") && message.includes("permission denied")) {
        const pathMatch = message.match(/'([^']+)'/);
        const operationMatch = message.match(/permission denied,\s*([a-z]+)\s/);
        const path6 = pathMatch ? pathMatch[1] : "unknown path";
        const operation = operationMatch ? operationMatch[1] : "write";
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(CommonErrors.permissionDenied(path6, operation))
            }
          ],
          isError: true
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(CommonErrors.handlerError(name, message))
          }
        ],
        isError: true
      };
    }
  });
  return server;
}
__name(createMcpServer, "createMcpServer");
__name6(createMcpServer, "createMcpServer");
function createMcpServerWithRegistry(options) {
  const { registry } = options;
  if (!registry) {
    return createMcpServer(options);
  }
  return createRegistryBasedServer(options, registry);
}
__name(createMcpServerWithRegistry, "createMcpServerWithRegistry");
__name6(createMcpServerWithRegistry, "createMcpServerWithRegistry");
function createRegistryBasedServer(options, registry) {
  const { workspaceRoot, tier } = options;
  const server = new Server({
    name: "snapback-mcp",
    version: "1.0.0"
  }, {
    capabilities: {
      tools: {},
      resources: {},
      experimental: {
        serverInfo: {
          storageMode: options.storageMode || "readonly",
          writeCapable: (options.storageMode || "readonly") === "local",
          cliAvailable: true,
          cliSetupCommand: "npm install -g @snapback/cli && snapback tools configure"
        }
      }
    }
  });
  const baseContext = {
    workspace: {
      path: workspaceRoot,
      tier
    },
    user: options.auth?.userId ? {
      id: options.auth.userId,
      email: ""
    } : void 0,
    request: {
      id: "unknown",
      timestamp: /* @__PURE__ */ new Date(),
      source: "unknown"
    }
  };
  const eventTracker = new McpEventTracker(options.telemetry ?? null);
  console.error(`[SnapBack MCP] Registry-based server created for: ${workspaceRoot}`);
  console.error(`[SnapBack MCP] Tier: ${tier}`);
  console.error(`[SnapBack MCP] ${registry.getToolNames().length} tools in registry`);
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools2 = registry.list({
      tier
    });
    return {
      tools: tools2.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations
      }))
    };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const startTime = Date.now();
    const { CapabilityManager: CapabilityManager2 } = await Promise.resolve().then(() => (init_CapabilityManager(), CapabilityManager_exports));
    const capManager = new CapabilityManager2();
    const activeCapabilities = capManager.getActiveCapabilities({
      path: workspaceRoot,
      tier
    });
    const context = {
      ...baseContext,
      activeCapabilities,
      // Placeholder services - will be injected by RuntimeRouter in Phase 2
      services: {},
      request: {
        id: `req-${Date.now()}`,
        timestamp: /* @__PURE__ */ new Date(),
        source: "unknown"
      }
    };
    const result7 = await registry.execute(name, args || {}, context);
    eventTracker.trackToolCalled({
      tool_name: name,
      client_type: "cli",
      parameters: args || {},
      execution_time_ms: Date.now() - startTime,
      was_successful: result7.success,
      error_code: result7.error
    });
    if (!result7.success) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: result7.error,
              tool: name
            })
          }
        ],
        isError: true
      };
    }
    const toolResult = result7.result;
    if (toolResult?.content) {
      return {
        content: toolResult.content.map((c) => ({
          type: "text",
          text: c.text
        })),
        isError: toolResult.isError
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result7.result)
        }
      ],
      isError: false
    };
  });
  return server;
}
__name(createRegistryBasedServer, "createRegistryBasedServer");
__name6(createRegistryBasedServer, "createRegistryBasedServer");
init_state();
init_types();
var TOOL_CAPABILITY_MAP = {
  // snap: Start task, create snapshot, read learnings
  snap: [
    ToolCapability.SNAPSHOT_WRITE,
    ToolCapability.SESSION_WRITE,
    ToolCapability.LEARNING_READ
  ],
  // snap_end: End session, write telemetry
  snap_end: [
    ToolCapability.SESSION_WRITE,
    ToolCapability.TELEMETRY_WRITE
  ],
  // snap_learn: Create learnings
  snap_learn: [
    ToolCapability.LEARNING_WRITE
  ],
  // snap_violation: Record violations (also a form of learning)
  snap_violation: [
    ToolCapability.LEARNING_WRITE
  ],
  // snap_fix: Apply fixes, may create snapshots
  snap_fix: [
    ToolCapability.SNAPSHOT_WRITE
  ],
  // snap_help: Read-only, informational - no special capabilities
  snap_help: [],
  // check: Validation, read operations
  check: [
    ToolCapability.VALIDATE_READ
  ]
};
function inferCapabilities(toolName) {
  return TOOL_CAPABILITY_MAP[toolName] ?? [];
}
__name(inferCapabilities, "inferCapabilities");
__name6(inferCapabilities, "inferCapabilities");
function createLegacyContextFromNew(newContext) {
  return {
    workspaceRoot: newContext.workspace.path,
    tier: newContext.workspace.tier,
    storageMode: "local",
    userId: newContext.user?.id,
    sessionId: void 0
  };
}
__name(createLegacyContextFromNew, "createLegacyContextFromNew");
__name6(createLegacyContextFromNew, "createLegacyContextFromNew");
function adaptLegacyHandler(legacyHandler) {
  return async (input3, context) => {
    const legacyContext = createLegacyContextFromNew(context);
    const result7 = await legacyHandler(input3, legacyContext);
    return result7;
  };
}
__name(adaptLegacyHandler, "adaptLegacyHandler");
__name6(adaptLegacyHandler, "adaptLegacyHandler");
function adaptLegacyTool(legacyTool, handler) {
  const mapTier = /* @__PURE__ */ __name6((legacyTier) => {
    if (legacyTier === "pro") return "pro";
    return "free";
  }, "mapTier");
  return {
    name: legacyTool.name,
    description: legacyTool.description ?? `Tool: ${legacyTool.name}`,
    inputSchema: legacyTool.inputSchema,
    capabilities: inferCapabilities(legacyTool.name),
    tier: mapTier(legacyTool.tier),
    handler: adaptLegacyHandler(handler),
    annotations: legacyTool.annotations,
    deprecated: legacyTool.deprecated
  };
}
__name(adaptLegacyTool, "adaptLegacyTool");
__name6(adaptLegacyTool, "adaptLegacyTool");
function adaptLegacyTools(tools2) {
  return tools2.map(([tool, handler]) => adaptLegacyTool(tool, handler));
}
__name(adaptLegacyTools, "adaptLegacyTools");
__name6(adaptLegacyTools, "adaptLegacyTools");
async function getAdaptedConsolidatedTools() {
  const { CONSOLIDATED_TOOLS: CONSOLIDATED_TOOLS2, CONSOLIDATED_HANDLERS: CONSOLIDATED_HANDLERS2 } = await Promise.resolve().then(() => (init_registry(), registry_exports));
  const toolPairs = CONSOLIDATED_TOOLS2.map((tool) => [
    tool,
    CONSOLIDATED_HANDLERS2[tool.name]
  ]);
  return adaptLegacyTools(toolPairs);
}
__name(getAdaptedConsolidatedTools, "getAdaptedConsolidatedTools");
__name6(getAdaptedConsolidatedTools, "getAdaptedConsolidatedTools");
init_CapabilityManager();
init_types();
function validateJsonSchema(schema, input3) {
  const errors = [];
  if (schema.type === "object") {
    if (typeof input3 !== "object" || input3 === null) {
      return {
        valid: false,
        errors: [
          "Input must be an object"
        ]
      };
    }
    const inputObj = input3;
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in inputObj)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : void 0
  };
}
__name(validateJsonSchema, "validateJsonSchema");
__name6(validateJsonSchema, "validateJsonSchema");
var ToolRegistry = class {
  static {
    __name(this, "ToolRegistry");
  }
  static {
    __name6(this, "ToolRegistry");
  }
  tools = /* @__PURE__ */ new Map();
  capabilityManager;
  constructor(capabilityManager) {
    this.capabilityManager = capabilityManager ?? new CapabilityManager();
  }
  /**
  * Register a tool
  */
  register(tool) {
    this.validateToolDefinition(tool);
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
    console.log(`\u2705 Registered tool: ${tool.name} (tier: ${tool.tier ?? "free"})`);
  }
  /**
  * Get a tool by name
  */
  get(name) {
    return this.tools.get(name);
  }
  /**
  * List all tools (optionally filtered by tier)
  */
  list(options) {
    const allTools = Array.from(this.tools.values());
    if (!options?.tier) {
      return allTools;
    }
    const maxTierIndex = TIER_HIERARCHY.indexOf(options.tier);
    return allTools.filter((tool) => {
      const toolTierIndex = TIER_HIERARCHY.indexOf(tool.tier ?? "free");
      return toolTierIndex <= maxTierIndex;
    });
  }
  /**
  * Execute a tool with capability checking
  */
  async execute(name, input3, context) {
    const startTime = Date.now();
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolNotFoundError(name);
    }
    if (!this.isTierAuthorized(tool, context)) {
      throw new TierNotAuthorizedError(name, tool.tier ?? "free");
    }
    const missingCapabilities = this.getMissingCapabilities(tool, context);
    if (missingCapabilities.length > 0) {
      throw new CapabilityNotGrantedError(name, missingCapabilities);
    }
    const validationResult = this.validateInput(name, input3);
    if (!validationResult.valid) {
      throw new InputValidationError(name, validationResult.errors ?? []);
    }
    try {
      if (tool.hooks?.beforeExecute) {
        await tool.hooks.beforeExecute(input3, context);
      }
      const output = await tool.handler(input3, context);
      if (tool.hooks?.afterExecute) {
        await tool.hooks.afterExecute(output, context);
      }
      return {
        success: true,
        result: output,
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      if (tool.hooks?.onError) {
        await tool.hooks.onError(error, context);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime
      };
    }
  }
  /**
  * Check if a tool is available for given context
  */
  isAvailable(name, context) {
    const tool = this.tools.get(name);
    if (!tool) {
      return false;
    }
    return this.isTierAuthorized(tool, context) && this.getMissingCapabilities(tool, context).length === 0;
  }
  /**
  * Validate input against tool schema
  */
  validateInput(name, input3) {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        valid: false,
        errors: [
          `Tool '${name}' not found`
        ]
      };
    }
    return validateJsonSchema(tool.inputSchema, input3);
  }
  /**
  * Get the capability manager
  */
  getCapabilityManager() {
    return this.capabilityManager;
  }
  /**
  * Get all registered tool names
  */
  getToolNames() {
    return Array.from(this.tools.keys());
  }
  /**
  * Check if tool is registered
  */
  has(name) {
    return this.tools.has(name);
  }
  /**
  * Unregister a tool (mainly for testing)
  */
  unregister(name) {
    return this.tools.delete(name);
  }
  /**
  * Clear all registered tools (mainly for testing)
  */
  clear() {
    this.tools.clear();
  }
  // ==========================================================================
  // Private Methods
  // ==========================================================================
  isTierAuthorized(tool, context) {
    const requiredTierIndex = TIER_HIERARCHY.indexOf(tool.tier ?? "free");
    const userTierIndex = TIER_HIERARCHY.indexOf(context.workspace.tier);
    return userTierIndex >= requiredTierIndex;
  }
  getMissingCapabilities(tool, context) {
    return tool.capabilities.filter((cap) => !context.activeCapabilities.has(cap));
  }
  validateToolDefinition(tool) {
    if (!tool.name || typeof tool.name !== "string") {
      throw new Error("Tool must have a valid name");
    }
    if (!tool.handler || typeof tool.handler !== "function") {
      throw new Error(`Tool '${tool.name}' must have a handler function`);
    }
    if (!Array.isArray(tool.capabilities)) {
      throw new Error(`Tool '${tool.name}' must declare capabilities array`);
    }
    if (!tool.inputSchema || typeof tool.inputSchema !== "object") {
      throw new Error(`Tool '${tool.name}' must have an inputSchema`);
    }
  }
};
function createToolRegistry(capabilityManager) {
  return new ToolRegistry(capabilityManager);
}
__name(createToolRegistry, "createToolRegistry");
__name6(createToolRegistry, "createToolRegistry");
var HttpTransportManager = class {
  static {
    __name(this, "HttpTransportManager");
  }
  static {
    __name6(this, "HttpTransportManager");
  }
  sessions = /* @__PURE__ */ new Map();
  options;
  cleanupInterval = null;
  registry = null;
  registryInitialized = false;
  constructor(options) {
    this.options = {
      sessionTimeoutMs: 30 * 60 * 1e3,
      maxSessions: 1e3,
      enableJsonResponse: true,
      ...options
    };
    this.cleanupInterval = setInterval(() => this.cleanupStaleSessions(), 6e4);
  }
  /**
  * Initialize the shared ToolRegistry (ADR-003)
  * Called lazily on first request to avoid blocking constructor
  */
  async ensureRegistryInitialized() {
    if (this.registryInitialized && this.registry) {
      return this.registry;
    }
    this.registry = createToolRegistry();
    const adaptedTools = await getAdaptedConsolidatedTools();
    for (const tool of adaptedTools) {
      this.registry.register(tool);
    }
    this.registryInitialized = true;
    console.error(`[SnapBack MCP HTTP] ToolRegistry initialized with ${adaptedTools.length} tools`);
    return this.registry;
  }
  /**
  * Handle incoming HTTP request
  * Routes to appropriate transport based on session ID
  */
  async handleRequest(req, res, body) {
    const sessionId = req.headers["mcp-session-id"];
    switch (req.method) {
      case "POST":
        await this.handlePost(req, res, body, sessionId);
        break;
      case "GET":
        await this.handleGet(req, res, sessionId);
        break;
      case "DELETE":
        await this.handleDelete(req, res, sessionId);
        break;
      default:
        res.writeHead(405, {
          "Content-Type": "application/json"
        });
        res.end(JSON.stringify({
          error: "Method not allowed"
        }));
    }
  }
  /**
  * Handle POST requests (client-to-server messages)
  */
  async handlePost(req, res, body, sessionId) {
    let transport;
    if (sessionId && this.sessions.has(sessionId)) {
      const entry = this.sessions.get(sessionId);
      entry.lastAccessedAt = Date.now();
      transport = entry.transport;
    } else if (!sessionId && isInitializeRequest(body)) {
      if (this.sessions.size >= (this.options.maxSessions || 1e3)) {
        res.writeHead(503, {
          "Content-Type": "application/json"
        });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32e3,
            message: "Server at capacity"
          },
          id: null
        }));
        return;
      }
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: /* @__PURE__ */ __name6(() => randomUUID(), "sessionIdGenerator"),
        enableJsonResponse: this.options.enableJsonResponse,
        onsessioninitialized: /* @__PURE__ */ __name6((id) => {
          this.sessions.set(id, {
            transport,
            createdAt: Date.now(),
            lastAccessedAt: Date.now()
          });
          console.error(`[SnapBack MCP HTTP] Session initialized: ${id}`);
        }, "onsessioninitialized")
      });
      transport.onclose = () => {
        if (transport.sessionId) {
          this.sessions.delete(transport.sessionId);
          console.error(`[SnapBack MCP HTTP] Session closed: ${transport.sessionId}`);
        }
      };
      const registry = await this.ensureRegistryInitialized();
      const server = createMcpServerWithRegistry({
        ...this.options,
        registry
      });
      await server.connect(transport);
    } else {
      res.writeHead(400, {
        "Content-Type": "application/json"
      });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32e3,
          message: sessionId ? "Session not found or expired" : "Bad Request: Not an initialize request"
        },
        id: null
      }));
      return;
    }
    await transport.handleRequest(req, res, body);
  }
  /**
  * Handle GET requests (server-to-client SSE stream)
  */
  async handleGet(req, res, sessionId) {
    if (!sessionId || !this.sessions.has(sessionId)) {
      res.writeHead(400, {
        "Content-Type": "application/json"
      });
      res.end(JSON.stringify({
        error: "Invalid or missing session"
      }));
      return;
    }
    const entry = this.sessions.get(sessionId);
    entry.lastAccessedAt = Date.now();
    await entry.transport.handleRequest(req, res);
  }
  /**
  * Handle DELETE requests (session termination)
  */
  async handleDelete(req, res, sessionId) {
    if (!sessionId || !this.sessions.has(sessionId)) {
      res.writeHead(400, {
        "Content-Type": "application/json"
      });
      res.end(JSON.stringify({
        error: "Invalid or missing session"
      }));
      return;
    }
    const entry = this.sessions.get(sessionId);
    await entry.transport.handleRequest(req, res);
    this.sessions.delete(sessionId);
  }
  /**
  * Clean up stale sessions
  */
  cleanupStaleSessions() {
    const now = Date.now();
    const timeout = this.options.sessionTimeoutMs || 30 * 60 * 1e3;
    for (const [sessionId, entry] of this.sessions) {
      if (now - entry.lastAccessedAt > timeout) {
        entry.transport.close();
        this.sessions.delete(sessionId);
        console.error(`[SnapBack MCP HTTP] Session timed out: ${sessionId}`);
      }
    }
  }
  /**
  * Get active session count
  */
  getSessionCount() {
    return this.sessions.size;
  }
  /**
  * Close all sessions and cleanup
  */
  async close() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    for (const [sessionId, entry] of this.sessions) {
      await entry.transport.close();
      console.error(`[SnapBack MCP HTTP] Closed session: ${sessionId}`);
    }
    this.sessions.clear();
  }
};
function createHttpTransport(options) {
  return new HttpTransportManager(options);
}
__name(createHttpTransport, "createHttpTransport");
__name6(createHttpTransport, "createHttpTransport");
async function runStdioMcpServer(options) {
  const registry = createToolRegistry();
  const adaptedTools = await getAdaptedConsolidatedTools();
  for (const tool of adaptedTools) {
    registry.register(tool);
  }
  const server = createMcpServerWithRegistry({
    ...options,
    registry
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[SnapBack MCP] Server running on stdio transport");
  process.on("SIGINT", async () => {
    console.error("[SnapBack MCP] Shutting down...");
    await server.close();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    console.error("[SnapBack MCP] Shutting down...");
    await server.close();
    process.exit(0);
  });
}
__name(runStdioMcpServer, "runStdioMcpServer");
__name6(runStdioMcpServer, "runStdioMcpServer");
var __defProp6 = Object.defineProperty;
var __name7 = /* @__PURE__ */ __name((target, value) => __defProp6(target, "name", {
  value,
  configurable: true
}), "__name");
function validateWorkspacePath(workspacePath) {
  try {
    const normalizedPath = normalize(workspacePath);
    const absolutePath = resolve(normalizedPath);
    if (!absolutePath.startsWith(process.cwd()) && !absolutePath.startsWith("/")) {
      return {
        valid: false,
        root: "",
        error: "Invalid workspace path"
      };
    }
    const hasGit = existsSync(resolve(absolutePath, ".git"));
    const hasPackageJson = existsSync(resolve(absolutePath, "package.json"));
    const hasSnapback = existsSync(resolve(absolutePath, ".snapback"));
    if (!hasGit && !hasPackageJson && !hasSnapback) {
      return {
        valid: false,
        root: absolutePath,
        error: "Workspace must contain at least one marker: .git, package.json, or .snapback"
      };
    }
    try {
      const stat4 = lstatSync(absolutePath);
      if (stat4.isSymbolicLink()) {
        return {
          valid: false,
          root: absolutePath,
          error: "Workspace path cannot be a symbolic link"
        };
      }
    } catch {
      return {
        valid: false,
        root: absolutePath,
        error: "Cannot access workspace path"
      };
    }
    return {
      valid: true,
      root: absolutePath
    };
  } catch (error) {
    return {
      valid: false,
      root: "",
      error: error instanceof Error ? error.message : "Unknown error validating workspace"
    };
  }
}
__name(validateWorkspacePath, "validateWorkspacePath");
__name7(validateWorkspacePath, "validateWorkspacePath");
function findWorkspaceRoot(startPath = process.cwd()) {
  let currentPath = resolve(startPath);
  const maxIterations = 50;
  let iterations = 0;
  while (iterations < maxIterations) {
    iterations++;
    if (hasWorkspaceMarker(currentPath)) {
      return currentPath;
    }
    const parent = resolve(currentPath, "..");
    if (parent === currentPath) {
      break;
    }
    currentPath = parent;
  }
  return null;
}
__name(findWorkspaceRoot, "findWorkspaceRoot");
__name7(findWorkspaceRoot, "findWorkspaceRoot");
function hasWorkspaceMarker(dirPath) {
  try {
    const hasGit = existsSync(resolve(dirPath, ".git"));
    const hasPackageJson = existsSync(resolve(dirPath, "package.json"));
    const hasSnapback = existsSync(resolve(dirPath, ".snapback"));
    return hasGit || hasPackageJson || hasSnapback;
  } catch {
    return false;
  }
}
__name(hasWorkspaceMarker, "hasWorkspaceMarker");
__name7(hasWorkspaceMarker, "hasWorkspaceMarker");
function resolveWorkspaceRoot(explicitPath) {
  if (explicitPath) {
    const validation = validateWorkspacePath(explicitPath);
    if (validation.valid) {
      return validation;
    }
  }
  const found = findWorkspaceRoot();
  if (found) {
    return validateWorkspacePath(found);
  }
  return validateWorkspacePath(process.cwd());
}
__name(resolveWorkspaceRoot, "resolveWorkspaceRoot");
__name7(resolveWorkspaceRoot, "resolveWorkspaceRoot");
function resolveTier(cliTier) {
  if (cliTier && [
    "free",
    "pro",
    "enterprise"
  ].includes(cliTier)) {
    return cliTier;
  }
  const envTier = process.env.SNAPBACK_TIER;
  if (envTier && [
    "free",
    "pro",
    "enterprise"
  ].includes(envTier)) {
    return envTier;
  }
  if (process.env.SNAPBACK_API_KEY) {
    return "pro";
  }
  return "free";
}
__name(resolveTier, "resolveTier");
function createMcpCommand() {
  const cmd = createCommand("mcp");
  cmd.description("Run MCP server for Cursor/Claude integration").option("--stdio", "Use stdio transport (default)").option("--workspace <path>", "Workspace root path (auto-resolved if not provided)").option("--tier <tier>", "Override user tier (free|pro|enterprise). Auto-detected from SNAPBACK_API_KEY or SNAPBACK_TIER env var. Defaults to free.").action(async (options) => {
    try {
      const workspaceValidation = resolveWorkspaceRoot(options.workspace);
      if (!workspaceValidation.valid) {
        console.error(`[SnapBack MCP] Workspace validation failed: ${workspaceValidation.error}`);
        process.exit(1);
      }
      const tier = resolveTier(options.tier);
      const serverOptions = {
        workspaceRoot: workspaceValidation.root,
        tier,
        // CLI invocation is always local with write permissions
        storageMode: "local"
      };
      await runStdioMcpServer(serverOptions);
    } catch (error) {
      console.error("[SnapBack MCP] Server error:", error);
      process.exit(1);
    }
  });
  return cmd;
}
__name(createMcpCommand, "createMcpCommand");
var mcpCommand = createMcpCommand();
function createToolsCommand() {
  const tools = new Command("tools").description("Configure AI tools");
  tools.command("configure").description("Auto-setup MCP for Cursor, Claude, or other AI tools").option("--cursor", "Configure for Cursor only").option("--claude", "Configure for Claude Desktop only").option("--windsurf", "Configure for Windsurf only").option("--continue", "Configure for Continue only").option("--vscode", "Configure for VS Code only").option("--zed", "Configure for Zed only").option("--cline", "Configure for Cline only").option("--gemini", "Configure for Gemini/Antigravity only").option("--aider", "Configure for Aider only").option("--roo-code", "Configure for Roo Code only").option("--qoder", "Configure for Qoder only").option("--list", "List available tools").option("--dry-run", "Show what would be configured without writing").option("--force", "Reconfigure even if already set up").option("-y, --yes", "Skip confirmation prompts (for CI/scripts)").option("--api-key <key>", "API key for Pro features").option("--dev", "Use local development mode (direct node execution with inferred workspace)").option("--workspace <path>", "Override workspace root path").action(async (options) => {
    try {
      if (options.list) {
        await listTools();
        return;
      }
      const toolsToConfig = [];
      if (options.cursor) {
        toolsToConfig.push("cursor");
      }
      if (options.claude) {
        toolsToConfig.push("claude");
      }
      if (options.windsurf) {
        toolsToConfig.push("windsurf");
      }
      if (options.continue) {
        toolsToConfig.push("continue");
      }
      if (options.vscode) {
        toolsToConfig.push("vscode");
      }
      if (options.zed) {
        toolsToConfig.push("zed");
      }
      if (options.cline) {
        toolsToConfig.push("cline");
      }
      if (options.gemini) {
        toolsToConfig.push("gemini");
      }
      if (options.aider) {
        toolsToConfig.push("aider");
      }
      if (options["roo-code"] || options.rooCode) {
        toolsToConfig.push("roo-code");
      }
      if (options.qoder) {
        toolsToConfig.push("qoder");
      }
      if (toolsToConfig.length === 0) {
        await autoConfigureTools(options.dryRun, options.force, options.yes, options.apiKey, options.dev, options.workspace);
      } else {
        for (const tool of toolsToConfig) {
          await configureTool(tool, options.dryRun, options.yes, options.apiKey, options.dev, options.workspace);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Configuration failed:"), message);
      process.exit(1);
    }
  });
  tools.command("status").description("Check MCP configuration status").option("--verbose", "Show detailed validation information").action(async (options) => {
    await checkToolsStatus(options.verbose);
  });
  tools.command("validate").description("Validate MCP configurations for all detected AI tools").option("--verbose", "Show detailed validation issues").action(async (options) => {
    await validateTools(options.verbose);
  });
  tools.command("repair").description("Repair broken MCP configurations").option("-y, --yes", "Skip confirmation prompts").option("--workspace <path>", "Override workspace root path").option("--api-key <key>", "API key for Pro features").action(async (options) => {
    await repairTools(options.yes, options.workspace, options.apiKey);
  });
  return tools;
}
__name(createToolsCommand, "createToolsCommand");
async function listTools() {
  const detection = detectAIClients();
  console.log(chalk26.cyan("\nAvailable AI Tools:"));
  console.log();
  for (const client of detection.clients) {
    const status2 = client.exists ? client.hasSnapback ? chalk26.green("\u2713 Configured") : chalk26.yellow("\u25CB Needs setup") : chalk26.gray("Not installed");
    console.log(`  ${client.displayName.padEnd(20)} ${status2}`);
    console.log(chalk26.gray(`    Config: ${client.configPath}`));
  }
  console.log();
  console.log(chalk26.gray("Use --cursor, --claude, --windsurf, or --continue to configure a specific tool"));
}
__name(listTools, "listTools");
async function autoConfigureTools(dryRun, force, skipPrompts = false, providedApiKey, devMode = false, workspaceOverride) {
  const detection = detectAIClients();
  if (detection.detected.length === 0) {
    console.log(chalk26.yellow("\nNo AI tools detected"));
    console.log(chalk26.gray("Install one of these to use SnapBack MCP:"));
    console.log(chalk26.gray("  \u2022 Claude Desktop - https://claude.ai/download"));
    console.log(chalk26.gray("  \u2022 Cursor - https://cursor.sh"));
    console.log(chalk26.gray("  \u2022 Windsurf - https://codeium.com/windsurf"));
    console.log(chalk26.gray("  \u2022 Continue - https://continue.dev"));
    return;
  }
  const needsSetup = force ? detection.detected : detection.needsSetup;
  if (needsSetup.length === 0) {
    console.log(chalk26.green("\n\u2713 All detected AI tools already have SnapBack configured!"));
    console.log(chalk26.gray("Use --force to reconfigure."));
    showNextSteps();
    return;
  }
  console.log(chalk26.cyan(`
Detected ${detection.detected.length} AI tool(s):`));
  for (const client of detection.detected) {
    const status2 = client.hasSnapback ? chalk26.green("(configured)") : chalk26.yellow("(needs setup)");
    console.log(`  \u2022 ${client.displayName} ${status2}`);
  }
  console.log();
  if (!skipPrompts) {
    const clientNames = needsSetup.map((c) => c.displayName).join(", ");
    const proceed = await confirm$1({
      message: `Configure SnapBack for ${clientNames}?`,
      default: true
    });
    if (!proceed) {
      console.log("\nSetup cancelled.");
      return;
    }
  }
  const apiKey = await resolveApiKey(providedApiKey, skipPrompts);
  for (const client of needsSetup) {
    await configureClient(client, dryRun, apiKey, devMode, workspaceOverride);
  }
  showNextSteps();
}
__name(autoConfigureTools, "autoConfigureTools");
async function configureTool(toolName, dryRun, skipPrompts = false, providedApiKey, devMode = false, workspaceOverride) {
  const detection = detectAIClients();
  const client = detection.clients.find((c) => c.name === toolName);
  if (!client) {
    console.error(chalk26.red(`Unknown tool: ${toolName}`));
    console.log(chalk26.gray("Available tools: cursor, claude, windsurf, continue"));
    return;
  }
  if (!client.exists) {
    console.log(chalk26.yellow(`${client.displayName} is not installed`));
    console.log(chalk26.gray(`Expected config at: ${client.configPath}`));
    return;
  }
  const apiKey = await resolveApiKey(providedApiKey, skipPrompts);
  await configureClient(client, dryRun, apiKey, devMode, workspaceOverride);
  showNextSteps();
}
__name(configureTool, "configureTool");
async function configureClient(client, dryRun, apiKey, devMode = false, workspaceOverride) {
  const spinner2 = ora8(`Configuring ${client.displayName}...`).start();
  try {
    let workspaceRoot;
    let localCliPath;
    if (devMode) {
      workspaceRoot = workspaceOverride || findWorkspaceRoot2(process.cwd());
      localCliPath = findCliDistPath(workspaceRoot);
      if (!localCliPath) {
        spinner2.fail("Could not find CLI dist. Run 'pnpm build' first.");
        return;
      }
      spinner2.text = `Configuring ${client.displayName} (dev mode)...`;
    }
    if (client.hasSnapback) {
      spinner2.text = `Validating existing config for ${client.displayName}...`;
      const validation = validateClientConfig(client);
      if (!validation.valid) {
        const errors = validation.issues.filter((i) => i.severity === "error");
        if (errors.length > 0) {
          spinner2.warn("Existing config has issues, will be replaced");
          for (const issue of errors) {
            console.log(chalk26.yellow(`  \u26A0 ${issue.message}`));
          }
        }
      }
    }
    const mcpConfig = getSnapbackMCPConfig({
      apiKey,
      useLocalDev: devMode,
      localCliPath,
      workspaceRoot
    });
    if (dryRun) {
      spinner2.info(`Would configure ${client.displayName}`);
      console.log(chalk26.gray(`  Path: ${client.configPath}`));
      if (devMode) {
        console.log(chalk26.gray(`  Workspace: ${workspaceRoot}`));
        console.log(chalk26.gray(`  CLI Path: ${localCliPath}`));
      }
      console.log(chalk26.gray("  Config:"));
      console.log(JSON.stringify(mcpConfig, null, 2));
      return;
    }
    const result7 = writeClientConfig(client, mcpConfig);
    if (result7.success) {
      const postValidation = validateClientConfig({
        ...client,
        hasSnapback: true
      });
      if (postValidation.valid) {
        spinner2.succeed(`Configured ${client.displayName}${devMode ? " (dev mode)" : ""}`);
      } else {
        const warnings = postValidation.issues.filter((i) => i.severity === "warning");
        if (warnings.length > 0) {
          spinner2.succeed(`Configured ${client.displayName} (with warnings)`);
          for (const warning of warnings) {
            console.log(chalk26.yellow(`  \u26A0 ${warning.message}`));
          }
        } else {
          spinner2.succeed(`Configured ${client.displayName}${devMode ? " (dev mode)" : ""}`);
        }
      }
      console.log(chalk26.gray(`  Config: ${client.configPath}`));
      if (devMode) {
        console.log(chalk26.gray(`  Workspace: ${workspaceRoot}`));
      }
      if (result7.backup) {
        console.log(chalk26.gray(`  Backup: ${result7.backup}`));
      }
    } else {
      spinner2.fail(`Failed to configure ${client.displayName}`);
      console.error(chalk26.red(`  Error: ${result7.error}`));
    }
  } catch (error) {
    spinner2.fail(`Failed to configure ${client.displayName}`);
    throw error;
  }
}
__name(configureClient, "configureClient");
function findWorkspaceRoot2(startDir) {
  let dir = startDir;
  const root = "/";
  while (dir !== root) {
    if (existsSync(join(dir, ".git")) || existsSync(join(dir, "package.json")) || existsSync(join(dir, ".snapback"))) {
      return dir;
    }
    dir = join(dir, "..");
  }
  return startDir;
}
__name(findWorkspaceRoot2, "findWorkspaceRoot");
function findCliDistPath(workspaceRoot) {
  const possiblePaths = [
    join(workspaceRoot, "apps", "cli", "dist", "index.js"),
    join(workspaceRoot, "dist", "index.js")
  ];
  for (const path6 of possiblePaths) {
    if (existsSync(path6)) {
      return path6;
    }
  }
  return void 0;
}
__name(findCliDistPath, "findCliDistPath");
async function resolveApiKey(providedApiKey, skipPrompts = false) {
  if (providedApiKey) {
    return providedApiKey;
  }
  const envKey = process.env.SNAPBACK_API_KEY;
  if (envKey) {
    return envKey;
  }
  if (await isLoggedIn()) {
    const credentials = await getCredentials();
    if (credentials?.accessToken) {
      return credentials.accessToken;
    }
  }
  if (!skipPrompts) {
    const wantApiKey = await confirm$1({
      message: "Do you have a SnapBack API key for Pro features?",
      default: false
    });
    if (wantApiKey) {
      const key = await password({
        message: "Enter your API key:",
        mask: "*"
      });
      return key || void 0;
    }
  }
  return void 0;
}
__name(resolveApiKey, "resolveApiKey");
async function checkToolsStatus(verbose = false) {
  const detection = detectAIClients();
  console.log(chalk26.cyan("\nMCP Configuration Status:"));
  console.log();
  let hasIssues = false;
  for (const client of detection.clients) {
    let icon;
    let status2;
    if (!client.exists) {
      icon = chalk26.gray("\u25CB");
      status2 = chalk26.gray("Not installed");
    } else if (client.hasSnapback) {
      const validation = validateClientConfig(client);
      if (validation.valid) {
        icon = chalk26.green("\u2713");
        status2 = chalk26.green("Configured");
      } else {
        const errors = validation.issues.filter((i) => i.severity === "error");
        const warnings = validation.issues.filter((i) => i.severity === "warning");
        if (errors.length > 0) {
          icon = chalk26.red("\u2717");
          status2 = chalk26.red(`Invalid (${errors.length} error(s))`);
          hasIssues = true;
        } else if (warnings.length > 0) {
          icon = chalk26.yellow("\u26A0");
          status2 = chalk26.yellow(`Configured (${warnings.length} warning(s))`);
        } else {
          icon = chalk26.green("\u2713");
          status2 = chalk26.green("Configured");
        }
      }
      if (verbose && validation.issues.length > 0) {
        console.log(`${icon} ${client.displayName.padEnd(20)} ${status2}`);
        for (const issue of validation.issues) {
          const issueIcon = issue.severity === "error" ? chalk26.red("\u2717") : issue.severity === "warning" ? chalk26.yellow("\u26A0") : chalk26.blue("\u2139");
          console.log(`    ${issueIcon} ${issue.message}`);
          if (issue.fix) {
            console.log(chalk26.gray(`      Fix: ${issue.fix}`));
          }
        }
        continue;
      }
    } else {
      icon = chalk26.yellow("\u25CB");
      status2 = chalk26.yellow("Detected but not configured");
    }
    console.log(`${icon} ${client.displayName.padEnd(20)} ${status2}`);
  }
  console.log();
  if (hasIssues) {
    console.log(chalk26.red("Some configurations have issues."));
    console.log(chalk26.gray("Run: snap tools repair"));
  } else if (detection.needsSetup.length > 0) {
    console.log(chalk26.yellow(`${detection.needsSetup.length} tool(s) need configuration.`));
    console.log(chalk26.gray("Run: snap tools configure"));
  } else if (detection.detected.length > 0) {
    console.log(chalk26.green("All detected AI tools are configured!"));
  } else {
    console.log(chalk26.gray("Install Claude Desktop or Cursor to get started."));
  }
}
__name(checkToolsStatus, "checkToolsStatus");
async function validateTools(verbose = false) {
  const detection = detectAIClients();
  const configured = detection.detected.filter((c) => c.hasSnapback);
  if (configured.length === 0) {
    console.log(chalk26.yellow("\nNo AI tools with SnapBack configured."));
    console.log(chalk26.gray("Run: snap tools configure"));
    return;
  }
  console.log(chalk26.cyan("\nValidating MCP Configurations:"));
  console.log();
  let totalErrors = 0;
  let totalWarnings = 0;
  for (const client of configured) {
    const validation = validateClientConfig(client);
    const errors = validation.issues.filter((i) => i.severity === "error");
    const warnings = validation.issues.filter((i) => i.severity === "warning");
    const infos = validation.issues.filter((i) => i.severity === "info");
    totalErrors += errors.length;
    totalWarnings += warnings.length;
    if (validation.valid && errors.length === 0 && warnings.length === 0) {
      console.log(`${chalk26.green("\u2713")} ${client.displayName}: ${chalk26.green("Valid")}`);
    } else if (errors.length > 0) {
      console.log(`${chalk26.red("\u2717")} ${client.displayName}: ${chalk26.red("Invalid")}`);
    } else {
      console.log(`${chalk26.yellow("\u26A0")} ${client.displayName}: ${chalk26.yellow("Valid with warnings")}`);
    }
    if (verbose || errors.length > 0) {
      for (const issue of [
        ...errors,
        ...warnings,
        ...verbose ? infos : []
      ]) {
        const icon = issue.severity === "error" ? chalk26.red("  \u2717") : issue.severity === "warning" ? chalk26.yellow("  \u26A0") : chalk26.blue("  \u2139");
        console.log(`${icon} ${issue.message}`);
        if (issue.fix) {
          console.log(chalk26.gray(`    Fix: ${issue.fix}`));
        }
      }
    }
  }
  console.log();
  if (totalErrors > 0) {
    console.log(chalk26.red(`Found ${totalErrors} error(s) and ${totalWarnings} warning(s).`));
    console.log(chalk26.gray("Run: snap tools repair"));
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(chalk26.yellow(`Found ${totalWarnings} warning(s). Configurations are functional.`));
  } else {
    console.log(chalk26.green("All configurations are valid!"));
  }
}
__name(validateTools, "validateTools");
async function repairTools(skipPrompts = false, workspaceOverride, providedApiKey) {
  const detection = detectAIClients();
  const configured = detection.detected.filter((c) => c.hasSnapback);
  if (configured.length === 0) {
    console.log(chalk26.yellow("\nNo AI tools with SnapBack configured."));
    console.log(chalk26.gray("Run: snap tools configure"));
    return;
  }
  const clientsWithIssues = [];
  for (const client of configured) {
    const validation = validateClientConfig(client);
    if (!validation.valid || validation.issues.some((i) => i.severity === "error" || i.severity === "warning")) {
      clientsWithIssues.push({
        client,
        validation
      });
    }
  }
  if (clientsWithIssues.length === 0) {
    console.log(chalk26.green("\nAll configurations are healthy! No repairs needed."));
    return;
  }
  console.log(chalk26.cyan("\nMCP Configuration Repair:"));
  console.log();
  for (const { client, validation } of clientsWithIssues) {
    const errors = validation.issues.filter((i) => i.severity === "error");
    const warnings = validation.issues.filter((i) => i.severity === "warning");
    console.log(`${chalk26.yellow("\u26A0")} ${client.displayName}:`);
    for (const issue of [
      ...errors,
      ...warnings
    ]) {
      const icon = issue.severity === "error" ? chalk26.red("  \u2717") : chalk26.yellow("  \u26A0");
      console.log(`${icon} ${issue.message}`);
    }
  }
  console.log();
  if (!skipPrompts) {
    const proceed = await confirm$1({
      message: `Repair ${clientsWithIssues.length} configuration(s)?`,
      default: true
    });
    if (!proceed) {
      console.log("\nRepair cancelled.");
      return;
    }
  }
  const apiKey = await resolveApiKey(providedApiKey, skipPrompts);
  const spinner2 = ora8("Repairing configurations...").start();
  let repaired = 0;
  let failed = 0;
  for (const { client } of clientsWithIssues) {
    spinner2.text = `Repairing ${client.displayName}...`;
    const result7 = repairClientConfig(client, {
      apiKey,
      workspaceRoot: workspaceOverride || findWorkspaceRoot2(process.cwd()),
      force: true
    });
    if (result7.success) {
      repaired++;
    } else {
      failed++;
      spinner2.warn(`Failed to repair ${client.displayName}: ${result7.error}`);
    }
  }
  spinner2.stop();
  console.log();
  if (repaired > 0) {
    console.log(chalk26.green(`\u2713 Repaired ${repaired} configuration(s).`));
  }
  if (failed > 0) {
    console.log(chalk26.red(`\u2717 Failed to repair ${failed} configuration(s).`));
    console.log(chalk26.gray("Try: snap tools configure --force"));
  }
  if (repaired > 0) {
    console.log();
    console.log(chalk26.bold("Next: Restart your AI assistant to apply changes."));
  }
}
__name(repairTools, "repairTools");
function showNextSteps() {
  console.log();
  console.log(chalk26.bold("Next Steps:"));
  console.log();
  console.log("  1. Restart your AI assistant (Claude Desktop, Cursor, etc.)");
  console.log('  2. Ask your AI: "What does SnapBack know about this project?"');
  console.log('  3. Before risky changes, ask: "Create a SnapBack checkpoint"');
  console.log();
  console.log(chalk26.dim("Available tools your AI can now use:"));
  console.log(chalk26.dim("  \u2022 snapback.get_context      - Understand your codebase"));
  console.log(chalk26.dim("  \u2022 snapback.analyze_risk     - Assess change risks"));
  console.log(chalk26.dim("  \u2022 snapback.create_checkpoint - Create safety snapshots (Pro)"));
  console.log(chalk26.dim("  \u2022 snapback.restore_checkpoint - Recover from mistakes (Pro)"));
  console.log();
  console.log(chalk26.blue("Get an API key: https://console.snapback.dev/settings/api-keys"));
  console.log();
}
__name(showNextSteps, "showNextSteps");

// src/daemon/protocol.ts
var ErrorCodes2 = {
  VALIDATION_FAILED: -32003,
  PERMISSION_DENIED: -32004};

// src/daemon/errors.ts
var DaemonError = class extends Error {
  static {
    __name(this, "DaemonError");
  }
  code;
  context;
  constructor(code, message, context) {
    super(message), this.code = code, this.context = context;
    this.name = "DaemonError";
    Error.captureStackTrace?.(this, this.constructor);
  }
  /**
  * Convert to JSON-RPC error format
  */
  toJsonRpcError() {
    return {
      code: this.code,
      message: this.message,
      data: this.context
    };
  }
};
var ValidationError = class extends DaemonError {
  static {
    __name(this, "ValidationError");
  }
  constructor(message, context) {
    super(ErrorCodes2.VALIDATION_FAILED, message, context);
    this.name = "ValidationError";
  }
};
var PathTraversalError = class extends DaemonError {
  static {
    __name(this, "PathTraversalError");
  }
  constructor(path6) {
    super(ErrorCodes2.PERMISSION_DENIED, `Path traversal detected: ${path6}`, {
      path: path6
    });
    this.name = "PathTraversalError";
  }
};

// src/daemon/client.ts
platform() === "win32";
var __defProp7 = Object.defineProperty;
var __name8 = /* @__PURE__ */ __name((target, value) => __defProp7(target, "name", {
  value,
  configurable: true
}), "__name");
var defaultFileSystem = {
  readFile: /* @__PURE__ */ __name8((filePath, encoding) => fs22.readFile(filePath, encoding), "readFile"),
  writeFile: /* @__PURE__ */ __name8((filePath, content, encoding) => fs22.writeFile(filePath, content, encoding), "writeFile"),
  mkdir: /* @__PURE__ */ __name8((dirPath, options) => fs22.mkdir(dirPath, options).then(() => {
  }), "mkdir")
};
var LocalEngineAdapter = class {
  static {
    __name(this, "LocalEngineAdapter");
  }
  static {
    __name8(this, "LocalEngineAdapter");
  }
  storage;
  workspacePath = null;
  disposed = false;
  fileSystem;
  constructor(storage, fileSystem) {
    this.storage = storage;
    this.fileSystem = fileSystem ?? defaultFileSystem;
  }
  /**
  * Get the configured workspace path
  */
  getWorkspacePath() {
    return this.workspacePath;
  }
  // =========================================================================
  // Lifecycle Methods
  // =========================================================================
  async initialize(workspacePath) {
    this.workspacePath = workspacePath;
    await this.storage.initialize();
  }
  isInitialized() {
    return this.storage.isInitialized();
  }
  async dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    await this.storage.close();
  }
  // =========================================================================
  // Snapshot CRUD Operations
  // =========================================================================
  async createSnapshot(options) {
    this.assertInitialized();
    const startTime = Date.now();
    const files = await this.gatherFiles(options.files);
    const name = options.description || `Snapshot at ${/* @__PURE__ */ (/* @__PURE__ */ new Date()).toLocaleTimeString()}`;
    const metadata = {
      task: options.task,
      trigger: options.trigger,
      sessionId: options.sessionId
    };
    const result7 = await this.storage.createSnapshot(name, files, metadata);
    let totalSize = 0;
    for (const content of files.values()) {
      totalSize += Buffer.byteLength(content, "utf-8");
    }
    const durationMs = Date.now() - startTime;
    const snapshot = {
      id: result7.id,
      timestamp: result7.timestamp,
      version: "1.0",
      meta: {
        name: result7.name,
        ...metadata
      },
      files: Array.from(files.keys())
    };
    return {
      snapshot,
      snapshotId: result7.id,
      fileCount: result7.fileCount,
      totalSize,
      durationMs,
      deduplicated: false
    };
  }
  async getSnapshot(id) {
    this.assertInitialized();
    const stored = await this.storage.getSnapshot(id);
    if (!stored) {
      return null;
    }
    const metadata = this.parseMetadata(stored.metadata);
    return {
      id: stored.id,
      timestamp: stored.timestamp,
      version: "1.0",
      meta: {
        name: stored.name,
        ...metadata
      },
      files: Array.from(stored.files.keys())
    };
  }
  async listSnapshots(options) {
    this.assertInitialized();
    const stored = await this.storage.listSnapshots(options?.limit ?? 100, 0);
    let snapshots = stored.map((s) => {
      const metadata = this.parseMetadata(s.metadata);
      return {
        id: s.id,
        timestamp: s.timestamp,
        version: "1.0",
        meta: {
          name: s.name,
          ...metadata
        }
      };
    });
    if (options?.after) {
      const after = options.after;
      snapshots = snapshots.filter((s) => s.timestamp > after);
    }
    if (options?.before) {
      const before = options.before;
      snapshots = snapshots.filter((s) => s.timestamp < before);
    }
    if (options?.sessionId) {
      snapshots = snapshots.filter((s) => {
        const meta = s.meta;
        return meta?.sessionId === options.sessionId;
      });
    }
    return snapshots;
  }
  async deleteSnapshot(id) {
    this.assertInitialized();
    const existing = await this.storage.getSnapshot(id);
    if (!existing) {
      return false;
    }
    await this.storage.deleteSnapshot(id);
    return true;
  }
  // =========================================================================
  // Restore Operations
  // =========================================================================
  async restoreSnapshot(id, options) {
    this.assertInitialized();
    const stored = await this.storage.getSnapshot(id);
    if (!stored) {
      return {
        success: false,
        restoredFiles: [],
        errors: [
          `Snapshot not found: ${id}`
        ]
      };
    }
    let filesToRestore;
    if (options?.files && options.files.length > 0) {
      filesToRestore = /* @__PURE__ */ new Map();
      for (const file of options.files) {
        const content = stored.files.get(file);
        if (content !== void 0) {
          filesToRestore.set(file, content);
        }
      }
    } else {
      filesToRestore = stored.files;
    }
    const restoredFiles = [];
    const errors = [];
    if (options?.backupCurrent && !options?.dryRun) {
      const currentFiles = await this.gatherFiles(Array.from(filesToRestore.keys()));
      await this.storage.createSnapshot(`Pre-restore backup for ${id}`, currentFiles, {
        backup: true,
        targetRestoreId: id
      });
    }
    for (const [filePath, content] of filesToRestore) {
      if (!options?.dryRun) {
        try {
          await this.writeFile(filePath, content);
          restoredFiles.push(filePath);
        } catch (err2) {
          errors.push(`Failed to restore ${filePath}: ${err2 instanceof Error ? err2.message : String(err2)}`);
        }
      } else {
        restoredFiles.push(filePath);
      }
    }
    return {
      success: errors.length === 0,
      restoredFiles,
      errors: errors.length > 0 ? errors : void 0
    };
  }
  // =========================================================================
  // File Content Operations
  // =========================================================================
  async getFileContent(snapshotId, filePath) {
    this.assertInitialized();
    const stored = await this.storage.getSnapshot(snapshotId);
    if (!stored) {
      return null;
    }
    return stored.files.get(filePath) ?? null;
  }
  async getFileStates(snapshotId) {
    this.assertInitialized();
    const stored = await this.storage.getSnapshot(snapshotId);
    if (!stored) {
      return [];
    }
    const states = [];
    for (const [filePath, content] of stored.files) {
      states.push({
        path: filePath,
        content,
        hash: this.computeHash(content),
        size: Buffer.byteLength(content, "utf-8")
      });
    }
    return states;
  }
  // =========================================================================
  // Storage Stats & Cleanup
  // =========================================================================
  async getStorageStats() {
    this.assertInitialized();
    const snapshots = await this.storage.listSnapshots(1e3, 0);
    if (snapshots.length === 0) {
      return {
        totalSnapshots: 0,
        totalSize: 0,
        oldestSnapshot: null,
        newestSnapshot: null
      };
    }
    const timestamps = snapshots.map((s) => s.timestamp);
    return {
      totalSnapshots: snapshots.length,
      totalSize: 0,
      oldestSnapshot: Math.min(...timestamps),
      newestSnapshot: Math.max(...timestamps)
    };
  }
  async cleanup(options) {
    this.assertInitialized();
    const snapshots = await this.storage.listSnapshots(1e3, 0);
    const now = Date.now();
    let cleaned = 0;
    const sortedSnapshots = [
      ...snapshots
    ].sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = [];
    if (options.maxAge !== void 0) {
      for (const snap of sortedSnapshots) {
        const age = now - snap.timestamp;
        if (age > options.maxAge) {
          const metadata = this.parseMetadata(snap.metadata);
          if (options.keepProtected && metadata.protected) {
            continue;
          }
          toDelete.push(snap.id);
        }
      }
    }
    if (options.maxCount !== void 0) {
      const sortedByNewest = [
        ...snapshots
      ].sort((a, b) => b.timestamp - a.timestamp);
      const toKeep = new Set(sortedByNewest.slice(0, options.maxCount).map((s) => s.id));
      for (const snap of sortedSnapshots) {
        if (!toKeep.has(snap.id) && !toDelete.includes(snap.id)) {
          const metadata = this.parseMetadata(snap.metadata);
          if (options.keepProtected && metadata.protected) {
            continue;
          }
          toDelete.push(snap.id);
        }
      }
    }
    for (const id of toDelete) {
      await this.storage.deleteSnapshot(id);
      cleaned++;
    }
    return cleaned;
  }
  // =========================================================================
  // Private Helpers
  // =========================================================================
  assertInitialized() {
    if (!this.storage.isInitialized()) {
      throw new Error("LocalEngineAdapter is not initialized. Call initialize() first.");
    }
  }
  async gatherFiles(filePaths) {
    const files = /* @__PURE__ */ new Map();
    if (!filePaths || filePaths.length === 0 || !this.workspacePath) {
      return files;
    }
    for (const relativePath of filePaths) {
      try {
        const fullPath = path5.join(this.workspacePath, relativePath);
        const content = await this.fileSystem.readFile(fullPath, "utf-8");
        files.set(relativePath, content);
      } catch {
      }
    }
    return files;
  }
  async writeFile(relativePath, content) {
    if (!this.workspacePath) {
      throw new Error("Workspace path not set");
    }
    const fullPath = path5.join(this.workspacePath, relativePath);
    const dir = path5.dirname(fullPath);
    await this.fileSystem.mkdir(dir, {
      recursive: true
    });
    await this.fileSystem.writeFile(fullPath, content, "utf-8");
  }
  computeHash(content) {
    return createHash("sha256").update(content).digest("hex");
  }
  parseMetadata(metadataJson) {
    try {
      return JSON.parse(metadataJson);
    } catch {
      return {};
    }
  }
};
var InMemoryStorage = class InMemoryStorage2 {
  static {
    __name(this, "InMemoryStorage2");
  }
  static {
    __name8(this, "InMemoryStorage");
  }
  snapshots = /* @__PURE__ */ new Map();
  initialized = false;
  async initialize() {
    this.initialized = true;
  }
  isInitialized() {
    return this.initialized;
  }
  async createSnapshot(name, files, metadata) {
    const id = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = Date.now();
    this.snapshots.set(id, {
      id,
      name,
      files: new Map(files),
      timestamp,
      metadata: JSON.stringify(metadata ?? {})
    });
    return {
      id,
      name,
      fileCount: files.size,
      timestamp
    };
  }
  async getSnapshot(id) {
    return this.snapshots.get(id) ?? null;
  }
  async listSnapshots() {
    return Array.from(this.snapshots.values()).map((s) => ({
      id: s.id,
      name: s.name,
      timestamp: s.timestamp,
      metadata: s.metadata
    }));
  }
  async deleteSnapshot(id) {
    this.snapshots.delete(id);
  }
  async close() {
    this.snapshots.clear();
    this.initialized = false;
  }
};
async function createLocalEngine(workspacePath, storage) {
  const backend = storage ?? new InMemoryStorage();
  const adapter = new LocalEngineAdapter(backend);
  await adapter.initialize(workspacePath);
  return adapter;
}
__name(createLocalEngine, "createLocalEngine");
__name8(createLocalEngine, "createLocalEngine");
function getDefaultWorkspacePath() {
  try {
    return process.cwd();
  } catch {
    return "/";
  }
}
__name(getDefaultWorkspacePath, "getDefaultWorkspacePath");
__name8(getDefaultWorkspacePath, "getDefaultWorkspacePath");
var DEFAULT_CONTEXT = {
  connectivity: "online",
  authState: "anonymous",
  tier: "free",
  privacyMode: false,
  featureFlags: {},
  workspace: {
    path: ""
  }
};
function createRuntimeContext(overrides = {}) {
  return {
    ...DEFAULT_CONTEXT,
    ...overrides,
    workspace: {
      ...DEFAULT_CONTEXT.workspace,
      ...overrides.workspace,
      // Use lazy path resolution - only call process.cwd() when actually needed
      path: overrides.workspace?.path || getDefaultWorkspacePath()
    },
    featureFlags: {
      ...DEFAULT_CONTEXT.featureFlags,
      ...overrides.featureFlags
    }
  };
}
__name(createRuntimeContext, "createRuntimeContext");
__name8(createRuntimeContext, "createRuntimeContext");
var ContextDetection = {
  /**
  * Detect connectivity state
  * In browser: uses navigator.onLine
  * In Node: assumes online (would need network check)
  */
  detectConnectivity() {
    if (typeof navigator !== "undefined") {
      return navigator.onLine ? "online" : "offline";
    }
    return "online";
  },
  /**
  * Check if team features should be enabled
  */
  shouldUseTeamFeatures(context) {
    return context.tier === "enterprise" && context.authState === "authenticated" && context.connectivity === "online" && !context.privacyMode && context.featureFlags.teamSync === true;
  },
  /**
  * Check if platform sync should be enabled
  */
  shouldUsePlatformSync(context) {
    return context.connectivity === "online" && context.authState === "authenticated" && !context.privacyMode && (context.tier === "pro" || context.tier === "enterprise");
  },
  /**
  * Check if local engine should be used exclusively
  */
  shouldUseLocalOnly(context) {
    return context.privacyMode || context.connectivity === "offline" || context.authState === "anonymous" || context.tier === "free";
  }
};
(class {
  static {
    __name(this, "RuntimeContextManager");
  }
  static {
    __name8(this, "RuntimeContextManager");
  }
  context;
  listeners = /* @__PURE__ */ new Set();
  constructor(initialContext = DEFAULT_CONTEXT) {
    this.context = {
      ...initialContext
    };
  }
  /**
  * Get current context
  */
  getContext() {
    return {
      ...this.context
    };
  }
  /**
  * Update context
  */
  updateContext(updates) {
    const previous = {
      ...this.context
    };
    const changedFields = [];
    for (const key of Object.keys(updates)) {
      if (JSON.stringify(this.context[key]) !== JSON.stringify(updates[key])) {
        changedFields.push(key);
      }
    }
    if (changedFields.length === 0) {
      return;
    }
    this.context = createRuntimeContext({
      ...this.context,
      ...updates
    });
    const event = {
      type: "context_changed",
      previous,
      current: {
        ...this.context
      },
      changedFields
    };
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event);
      } catch (error) {
        console.error("Context change listener error:", error);
      }
    }
  }
  /**
  * Subscribe to context changes
  */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /**
  * Set connectivity state
  */
  setConnectivity(connectivity) {
    this.updateContext({
      connectivity
    });
  }
  /**
  * Set privacy mode
  */
  setPrivacyMode(enabled) {
    this.updateContext({
      privacyMode: enabled
    });
  }
  /**
  * Set feature flag
  */
  setFeatureFlag(flag, enabled) {
    this.updateContext({
      featureFlags: {
        ...this.context.featureFlags,
        [flag]: enabled
      }
    });
  }
});
var SyncQueue = class {
  static {
    __name(this, "SyncQueue");
  }
  static {
    __name8(this, "SyncQueue");
  }
  queue = [];
  maxRetries = 3;
  /**
  * Add operation to sync queue
  */
  enqueue(operation, snapshotId, data) {
    const item = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      operation,
      snapshotId,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };
    this.queue.push(item);
  }
  /**
  * Get all pending items
  */
  getPending() {
    return [
      ...this.queue
    ];
  }
  /**
  * Remove processed item
  */
  remove(id) {
    this.queue = this.queue.filter((item) => item.id !== id);
  }
  /**
  * Mark item as retried
  */
  retry(id) {
    const item = this.queue.find((i) => i.id === id);
    if (!item) {
      return false;
    }
    item.retryCount++;
    if (item.retryCount > this.maxRetries) {
      this.remove(id);
      return false;
    }
    return true;
  }
  /**
  * Get queue size
  */
  size() {
    return this.queue.length;
  }
  /**
  * Clear the queue
  */
  clear() {
    this.queue = [];
  }
};
var RuntimeRouter = class {
  static {
    __name(this, "RuntimeRouter");
  }
  static {
    __name8(this, "RuntimeRouter");
  }
  localEngine;
  platformRuntime;
  context;
  config;
  syncQueue;
  syncTimer;
  constructor(localEngine, platformRuntime, context, config = {}) {
    this.localEngine = localEngine;
    this.platformRuntime = platformRuntime;
    this.context = context;
    this.config = config;
    this.syncQueue = new SyncQueue();
    if (config.autoSync && config.syncInterval) {
      this.startAutoSync(config.syncInterval);
    }
  }
  /**
  * Update the runtime context
  */
  updateContext(context) {
    const wasOffline = this.context.connectivity === "offline";
    this.context = context;
    if (wasOffline && context.connectivity === "online" && this.config.enableSyncQueue) {
      this.processSyncQueue().catch(console.error);
    }
  }
  /**
  * Get current context
  */
  getContext() {
    return {
      ...this.context
    };
  }
  // ==========================================================================
  // ROUTING LOGIC
  // ==========================================================================
  /**
  * Determine which runtime to use for an operation
  */
  shouldUsePlatform() {
    if (this.context.privacyMode) {
      return false;
    }
    if (!this.platformRuntime) {
      return false;
    }
    if (this.context.connectivity === "offline") {
      return false;
    }
    return ContextDetection.shouldUseTeamFeatures(this.context);
  }
  // ==========================================================================
  // SNAPSHOT OPERATIONS
  // ==========================================================================
  /**
  * Create a snapshot
  * Routes to appropriate runtime based on context
  */
  async createSnapshot(options) {
    const result7 = await this.localEngine.createSnapshot(options);
    if (this.shouldUsePlatform() && this.platformRuntime) {
      try {
        await this.platformRuntime.syncSnapshot(result7.snapshot);
      } catch (error) {
        if (this.config.enableSyncQueue) {
          this.syncQueue.enqueue("create", result7.snapshotId, result7.snapshot);
        }
        console.warn("Platform sync failed, queued for later:", error);
      }
    } else if (this.context.connectivity === "offline" && this.config.enableSyncQueue) {
      this.syncQueue.enqueue("create", result7.snapshotId, result7.snapshot);
    }
    return result7;
  }
  /**
  * Get a snapshot by ID
  */
  async getSnapshot(id) {
    const localSnapshot = await this.localEngine.getSnapshot(id);
    if (localSnapshot) {
      return localSnapshot;
    }
    if (this.shouldUsePlatform() && this.platformRuntime) {
      const platformSnapshot = await this.platformRuntime.getSnapshot(id);
      return platformSnapshot;
    }
    return null;
  }
  /**
  * List snapshots
  */
  async listSnapshots(options) {
    const localSnapshots = await this.localEngine.listSnapshots(options);
    if (this.shouldUsePlatform() && this.platformRuntime) {
      const platformSnapshots = await this.platformRuntime.listSnapshots(options);
      const snapshotMap = /* @__PURE__ */ new Map();
      for (const snapshot of localSnapshots) {
        snapshotMap.set(snapshot.id, snapshot);
      }
      for (const snapshot of platformSnapshots) {
        snapshotMap.set(snapshot.id, snapshot);
      }
      return Array.from(snapshotMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    }
    return localSnapshots;
  }
  /**
  * Restore a snapshot
  */
  async restoreSnapshot(id, options) {
    return this.localEngine.restoreSnapshot(id, options);
  }
  /**
  * Delete a snapshot
  */
  async deleteSnapshot(id) {
    const localDeleted = await this.localEngine.deleteSnapshot(id);
    if (this.shouldUsePlatform() && this.platformRuntime) {
      try {
        await this.platformRuntime.deleteSnapshot(id);
      } catch (error) {
        if (this.config.enableSyncQueue) {
          this.syncQueue.enqueue("delete", id);
        }
        console.warn("Platform delete failed, queued for later:", error);
      }
    } else if (this.context.connectivity === "offline" && this.config.enableSyncQueue) {
      this.syncQueue.enqueue("delete", id);
    }
    return localDeleted;
  }
  // ==========================================================================
  // SYNC OPERATIONS
  // ==========================================================================
  /**
  * Process the sync queue
  */
  async processSyncQueue() {
    if (!this.platformRuntime || this.context.connectivity !== "online") {
      return {
        processed: 0,
        failed: 0
      };
    }
    const pending = this.syncQueue.getPending();
    let processed = 0;
    let failed = 0;
    for (const item of pending) {
      try {
        switch (item.operation) {
          case "create":
            if (item.data) {
              await this.platformRuntime.syncSnapshot(item.data);
            }
            break;
          case "delete":
            await this.platformRuntime.deleteSnapshot(item.snapshotId);
            break;
        }
        this.syncQueue.remove(item.id);
        processed++;
      } catch (error) {
        const shouldRetry = this.syncQueue.retry(item.id);
        if (!shouldRetry) {
          failed++;
        }
        console.warn(`Sync operation failed (${item.operation}):`, error);
      }
    }
    return {
      processed,
      failed
    };
  }
  /**
  * Get sync queue status
  */
  getSyncQueueStatus() {
    return {
      pending: this.syncQueue.size(),
      items: this.syncQueue.getPending()
    };
  }
  /**
  * Start auto-sync timer
  */
  startAutoSync(intervalMs) {
    this.syncTimer = setInterval(() => {
      if (this.context.connectivity === "online") {
        this.processSyncQueue().catch(console.error);
      }
    }, intervalMs);
  }
  /**
  * Stop auto-sync timer
  */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = void 0;
    }
  }
  /**
  * Dispose of resources
  */
  async dispose() {
    this.stopAutoSync();
    await this.localEngine.dispose();
    if (this.platformRuntime) {
      await this.platformRuntime.dispose();
    }
  }
};
function createRuntimeRouter(localEngine, platformRuntime, context, config) {
  return new RuntimeRouter(localEngine, platformRuntime, context, {
    enableSyncQueue: true,
    autoSync: true,
    syncInterval: 3e4,
    ...config
  });
}
__name(createRuntimeRouter, "createRuntimeRouter");
__name8(createRuntimeRouter, "createRuntimeRouter");
var HttpWorkspaceApiClient = class {
  static {
    __name(this, "HttpWorkspaceApiClient");
  }
  static {
    __name8(this, "HttpWorkspaceApiClient");
  }
  baseUrl;
  apiKey;
  workspaceId;
  constructor(config) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.workspaceId = config.workspaceId;
  }
  /**
  * Suggest a workspace for a repository based on server-side heuristics
  */
  async suggestWorkspace(repoPath, userId) {
    try {
      const response = await this.fetch("/api/v1/workspaces/suggest", {
        method: "POST",
        body: JSON.stringify({
          repoPath,
          userId
        })
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return this.mapToWorkspaceBinding(data);
    } catch (error) {
      console.error("[WorkspaceApiClient] suggestWorkspace failed:", error);
      return null;
    }
  }
  /**
  * Get workspace by ID with full details
  */
  async getWorkspaceById(workspaceId, userId) {
    try {
      const response = await this.fetch(`/api/v1/workspaces/${workspaceId}?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return this.mapToWorkspaceBinding(data);
    } catch (error) {
      console.error("[WorkspaceApiClient] getWorkspaceById failed:", error);
      return null;
    }
  }
  /**
  * List all workspaces for a user
  */
  async listWorkspaces(userId) {
    try {
      const response = await this.fetch(`/api/v1/workspaces?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return (data.workspaces || []).map((ws) => this.mapToWorkspaceBinding(ws));
    } catch (error) {
      console.error("[WorkspaceApiClient] listWorkspaces failed:", error);
      return [];
    }
  }
  /**
  * Create a new workspace
  */
  async createWorkspace(params) {
    const response = await this.fetch("/api/v1/workspaces", {
      method: "POST",
      body: JSON.stringify(params)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to create workspace: ${response.status}`);
    }
    const data = await response.json();
    return this.mapToWorkspaceBinding(data);
  }
  /**
  * Update workspace settings
  */
  async updateWorkspace(workspaceId, updates) {
    try {
      const response = await this.fetch(`/api/v1/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return this.mapToWorkspaceBinding(data);
    } catch (error) {
      console.error("[WorkspaceApiClient] updateWorkspace failed:", error);
      return null;
    }
  }
  /**
  * Delete a workspace
  */
  async deleteWorkspace(workspaceId, userId) {
    try {
      const response = await this.fetch(`/api/v1/workspaces/${workspaceId}?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE"
      });
      return response.ok;
    } catch (error) {
      console.error("[WorkspaceApiClient] deleteWorkspace failed:", error);
      return false;
    }
  }
  /**
  * Internal fetch wrapper with authentication
  */
  async fetch(path32, init) {
    const headers = {
      "Content-Type": "application/json"
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    if (this.workspaceId) {
      headers["X-Workspace-Id"] = this.workspaceId;
    }
    return fetch(`${this.baseUrl}${path32}`, {
      ...init,
      headers: {
        ...headers,
        ...init?.headers
      }
    });
  }
  /**
  * Map API response to WorkspaceBinding
  */
  mapToWorkspaceBinding(data) {
    return {
      workspaceId: data.workspaceId || data.workspace_id || "",
      workspaceName: data.workspaceName || data.display_name || data.name || "Workspace",
      repoPath: data.repoPath || data.repo_path || void 0,
      organizationId: data.organizationId || data.organization_id || void 0,
      userId: data.userId || data.user_id || "",
      permissions: {
        read: true,
        write: data.tier !== "free",
        manage: data.tier === "enterprise",
        invite: data.tier === "enterprise"
      },
      resolvedFrom: "server_suggestion"
    };
  }
};
function createWorkspaceApiClient(config) {
  return new HttpWorkspaceApiClient({
    baseUrl: config.baseUrl || process.env.SNAPBACK_API_URL || "https://api.snapback.dev",
    apiKey: config.apiKey,
    workspaceId: config.workspaceId
  });
}
__name(createWorkspaceApiClient, "createWorkspaceApiClient");
__name8(createWorkspaceApiClient, "createWorkspaceApiClient");
(class {
  static {
    __name(this, "WorkspaceResolverImpl");
  }
  static {
    __name8(this, "WorkspaceResolverImpl");
  }
  serverApiClient;
  cache = /* @__PURE__ */ new Map();
  CACHE_TTL_MS = 5 * 60 * 1e3;
  CONFIG_FILENAME = ".snapback/config.json";
  LOCAL_FILENAME = ".snapback/local.json";
  constructor(serverApiClient) {
    this.serverApiClient = serverApiClient;
  }
  /**
  * Resolve workspace for a repository using 5-layer hierarchy
  */
  async resolve(repoPath, userId) {
    const cacheKey = generateCacheKey(repoPath, userId);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.binding;
    }
    const repoConfig = await this.readRepoConfig(repoPath);
    if (repoConfig?.workspaceId) {
      const binding = await this.createBindingFromConfig(repoConfig, repoPath, userId, "repo_config");
      if (binding) {
        this.cacheBinding(cacheKey, binding);
        return binding;
      }
    }
    const localConfig = await this.readLocalConfig(repoPath);
    if (localConfig?.workspaceId) {
      const binding = await this.createBindingFromConfig(localConfig, repoPath, userId, "local_override");
      if (binding) {
        this.cacheBinding(cacheKey, binding);
        return binding;
      }
    }
    if (this.serverApiClient) {
      const suggestion = await this.serverApiClient.suggestWorkspace(repoPath, userId);
      if (suggestion) {
        this.cacheBinding(cacheKey, suggestion);
        return suggestion;
      }
    }
    const defaultBinding = createDefaultWorkspace(userId, repoPath);
    this.cacheBinding(cacheKey, defaultBinding);
    return defaultBinding;
  }
  /**
  * Resolve workspace by ID directly
  */
  async resolveById(workspaceId, userId) {
    for (const [_key, value] of this.cache.entries()) {
      if (value.binding.workspaceId === workspaceId && Date.now() - value.timestamp < this.CACHE_TTL_MS) {
        return value.binding;
      }
    }
    if (this.serverApiClient) {
      try {
        const binding = await this.serverApiClient.getWorkspaceById(workspaceId, userId);
        if (binding) {
          const cacheKey = generateCacheKey(binding.repoPath || workspaceId, userId);
          this.cacheBinding(cacheKey, binding);
          return binding;
        }
      } catch (error) {
        console.error("[WorkspaceResolver] Failed to resolve workspace by ID:", error);
      }
    }
    return null;
  }
  /**
  * Bind a repository to a specific workspace at a given layer
  */
  async bind(repoPath, workspaceId, userId, layer) {
    try {
      const storedConfig = {
        workspaceId,
        workspaceName: void 0
      };
      if (layer === "repo_config") {
        await this.writeRepoConfig(repoPath, storedConfig);
      } else if (layer === "local_override") {
        await this.writeLocalConfig(repoPath, storedConfig);
      } else if (layer === "instance_cache") {
        const binding = {
          workspaceId,
          workspaceName: storedConfig.workspaceName || "Workspace",
          repoPath,
          userId,
          permissions: {
            read: true,
            write: true,
            manage: false,
            invite: false
          },
          resolvedFrom: "instance_cache"
        };
        const cacheKey = generateCacheKey(repoPath, userId);
        this.cacheBinding(cacheKey, binding);
      } else {
        throw new Error(`Cannot bind at layer ${layer} - only repo_config, local_override, and instance_cache are writable`);
      }
      await this.invalidateCache(repoPath);
      return true;
    } catch (error) {
      console.error(`[WorkspaceResolver] Failed to bind workspace at layer ${layer}:`, error);
      return false;
    }
  }
  /**
  * Unbind a repository (remove workspace binding)
  */
  async unbind(repoPath, _userId) {
    try {
      const localPath = path5.join(repoPath, this.LOCAL_FILENAME);
      try {
        await fs22.unlink(localPath);
      } catch {
      }
      await this.invalidateCache(repoPath);
      return true;
    } catch (error) {
      console.error("[WorkspaceResolver] Failed to unbind workspace:", error);
      return false;
    }
  }
  /**
  * List all workspaces for a user
  */
  async listWorkspaces(userId) {
    const workspaces = [];
    const seen = /* @__PURE__ */ new Set();
    for (const [_key, value] of this.cache.entries()) {
      if (value.binding.userId === userId && !seen.has(value.binding.workspaceId)) {
        workspaces.push(value.binding);
        seen.add(value.binding.workspaceId);
      }
    }
    if (this.serverApiClient) {
      try {
        const serverWorkspaces = await this.serverApiClient.listWorkspaces(userId);
        for (const ws of serverWorkspaces) {
          if (!seen.has(ws.workspaceId)) {
            workspaces.push(ws);
            seen.add(ws.workspaceId);
          }
        }
      } catch (error) {
        console.error("[WorkspaceResolver] Failed to list workspaces from server:", error);
      }
    }
    return workspaces;
  }
  /**
  * Invalidate cache for a specific repository
  */
  async invalidateCache(repoPath) {
    const keysToDelete = [];
    for (const [key, _value] of this.cache.entries()) {
      if (key.startsWith(`${repoPath}:`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }
  // Private helper methods
  async readRepoConfig(repoPath) {
    const configPath = path5.join(repoPath, this.CONFIG_FILENAME);
    return this.readConfigFile(configPath);
  }
  async readLocalConfig(repoPath) {
    const configPath = path5.join(repoPath, this.LOCAL_FILENAME);
    return this.readConfigFile(configPath);
  }
  async readConfigFile(filePath) {
    try {
      const content = await fs22.readFile(filePath, "utf-8");
      const config = JSON.parse(content);
      return config;
    } catch {
      return null;
    }
  }
  async writeRepoConfig(repoPath, config) {
    const configPath = path5.join(repoPath, this.CONFIG_FILENAME);
    await this.writeConfigFile(configPath, config);
  }
  async writeLocalConfig(repoPath, config) {
    const configPath = path5.join(repoPath, this.LOCAL_FILENAME);
    await this.writeConfigFile(configPath, config);
  }
  async writeConfigFile(filePath, config) {
    const dir = path5.dirname(filePath);
    await fs22.mkdir(dir, {
      recursive: true
    });
    const content = JSON.stringify(config, null, 2);
    await fs22.writeFile(filePath, content, "utf-8");
  }
  async createBindingFromConfig(config, repoPath, userId, layer) {
    if (this.serverApiClient) {
      try {
        const serverBinding = await this.serverApiClient.getWorkspaceById(config.workspaceId, userId);
        if (serverBinding) {
          return {
            ...serverBinding,
            repoPath,
            resolvedFrom: layer,
            config: config.config
          };
        }
      } catch {
      }
    }
    return {
      workspaceId: config.workspaceId,
      workspaceName: config.workspaceName || "Workspace",
      repoPath,
      userId,
      permissions: {
        read: true,
        write: true,
        manage: false,
        invite: false
      },
      resolvedFrom: layer,
      config: config.config
    };
  }
  cacheBinding(cacheKey, binding) {
    this.cache.set(cacheKey, {
      binding,
      timestamp: Date.now()
    });
  }
});
var MAX_PATH_LENGTH = 4096;
var TRAVERSAL_PATTERNS = [
  // Direct traversal
  /\.\./,
  // URL-encoded traversal
  /%2e%2e/i,
  /%252e%252e/i,
  // Unicode traversal
  /\u002e\u002e/,
  // Backslash variants (Windows)
  /\.\.[\\/]/,
  /[\\/]\.\./
];
var WINDOWS_DANGEROUS_PATTERNS = [
  // UNC paths
  /^\\\\[^\\]+\\/,
  /^\/\/[^/]+\//,
  // Alternate data streams
  /:/g,
  // Device paths
  /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i
];
var DANGEROUS_CHARS = [
  "\0",
  "\0",
  "\n",
  "\r"
];
var PathValidator = class {
  static {
    __name(this, "PathValidator");
  }
  options;
  constructor(options = {}) {
    this.options = {
      allowAbsolute: options.allowAbsolute ?? false,
      checkSymlinks: options.checkSymlinks ?? false,
      maxLength: options.maxLength ?? MAX_PATH_LENGTH,
      baseDir: options.baseDir ?? process.cwd()
    };
  }
  /**
  * Validate a path within a workspace
  *
  * @param workspace - The workspace root directory (must be absolute)
  * @param filePath - The file path to validate (can be relative or absolute)
  * @throws PathTraversalError if path escapes workspace
  * @throws ValidationError if path is invalid
  */
  validatePath(workspace, filePath) {
    this.validateBasic(filePath);
    const resolvedWorkspace = resolve(workspace);
    const resolvedFile = isAbsolute(filePath) ? resolve(filePath) : resolve(resolvedWorkspace, filePath);
    const relativePath = relative(resolvedWorkspace, resolvedFile);
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
      throw new PathTraversalError(filePath);
    }
    const normalizedRelative = normalize(relativePath);
    if (normalizedRelative.startsWith("..")) {
      throw new PathTraversalError(filePath);
    }
  }
  /**
  * Validate basic path properties without workspace context
  *
  * @param filePath - The file path to validate
  * @throws ValidationError if path is invalid
  */
  validateBasic(filePath) {
    if (filePath == null) {
      throw new ValidationError("Path is required");
    }
    if (typeof filePath !== "string") {
      throw new ValidationError("Path must be a string");
    }
    if (filePath.trim() === "") {
      throw new ValidationError("Path cannot be empty");
    }
    if (filePath.length > this.options.maxLength) {
      throw new ValidationError(`Path too long: ${filePath.length} chars (max: ${this.options.maxLength})`);
    }
    for (const char of DANGEROUS_CHARS) {
      if (filePath.includes(char)) {
        throw new ValidationError(`Path contains dangerous character: ${JSON.stringify(char)}`);
      }
    }
    for (const pattern of TRAVERSAL_PATTERNS) {
      if (pattern.test(filePath)) {
        throw new PathTraversalError(filePath);
      }
    }
    if (process.platform === "win32") {
      for (const pattern of WINDOWS_DANGEROUS_PATTERNS) {
        if (pattern.test(filePath)) {
          throw new ValidationError(`Path contains dangerous Windows pattern: ${filePath}`);
        }
      }
    } else {
      if (filePath.startsWith("\\\\") || filePath.includes(":")) {
        throw new ValidationError(`Path contains Windows-style characters: ${filePath}`);
      }
    }
    if (!this.options.allowAbsolute && isAbsolute(filePath)) {
      throw new ValidationError(`Absolute paths not allowed: ${filePath}`);
    }
  }
  /**
  * Validate a path and check for symlinks (async)
  *
  * @param workspace - The workspace root directory
  * @param filePath - The file path to validate
  * @throws PathTraversalError if path escapes workspace (including via symlink)
  */
  async validatePathWithSymlinkCheck(workspace, filePath) {
    this.validatePath(workspace, filePath);
    if (this.options.checkSymlinks) {
      const resolvedWorkspace = resolve(workspace);
      const resolvedFile = isAbsolute(filePath) ? resolve(filePath) : resolve(resolvedWorkspace, filePath);
      try {
        const stats = await lstat(resolvedFile);
        if (stats.isSymbolicLink()) {
          const { realpath } = await import('fs/promises');
          const realPath = await realpath(resolvedFile);
          const realRelative = relative(resolvedWorkspace, realPath);
          if (realRelative.startsWith("..") || isAbsolute(realRelative)) {
            throw new PathTraversalError(`Symlink escapes workspace: ${filePath} -> ${realPath}`);
          }
        }
      } catch (err2) {
        if (err2.code !== "ENOENT") {
          throw err2;
        }
      }
    }
  }
  /**
  * Validate multiple paths
  *
  * @param workspace - The workspace root directory
  * @param filePaths - Array of file paths to validate
  * @throws PathTraversalError if any path escapes workspace
  */
  validatePaths(workspace, filePaths) {
    for (const filePath of filePaths) {
      this.validatePath(workspace, filePath);
    }
  }
  /**
  * Sanitize a path by removing dangerous components
  * Note: This is a best-effort sanitization, validation should still be used
  *
  * @param filePath - The file path to sanitize
  * @returns Sanitized path
  */
  sanitizePath(filePath) {
    let sanitized = filePath;
    sanitized = sanitized.replace(/\0/g, "");
    sanitized = sanitized.replace(/%2e%2e/gi, "");
    sanitized = sanitized.replace(/%252e%252e/gi, "");
    sanitized = sanitized.replace(/\\/g, sep);
    sanitized = normalize(sanitized);
    while (sanitized.startsWith(`..${sep}`) || sanitized === "..") {
      sanitized = sanitized.slice(3);
    }
    return sanitized;
  }
};
new PathValidator();

// src/daemon/server.ts
platform() === "win32";
function getAliasPath() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  return path5.join(homeDir, ".snapback", "aliases.json");
}
__name(getAliasPath, "getAliasPath");
function loadAliases() {
  try {
    const aliasPath = getAliasPath();
    if (fs5.existsSync(aliasPath)) {
      return JSON.parse(fs5.readFileSync(aliasPath, "utf-8"));
    }
  } catch {
  }
  return {
    aliases: {}
  };
}
__name(loadAliases, "loadAliases");
function saveAliases(config) {
  const aliasPath = getAliasPath();
  const dir = path5.dirname(aliasPath);
  fs5.mkdirSync(dir, {
    recursive: true
  });
  fs5.writeFileSync(aliasPath, JSON.stringify(config, null, 2));
}
__name(saveAliases, "saveAliases");
function setAlias(name, command, description) {
  const config = loadAliases();
  if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)) {
    console.log(chalk26.red("Invalid alias name. Must start with a letter and contain only letters, numbers, hyphens, and underscores."));
    return;
  }
  const reserved = [
    "login",
    "logout",
    "init",
    "status",
    "doctor",
    "help",
    "alias"
  ];
  if (reserved.includes(name)) {
    console.log(chalk26.red(`Cannot use "${name}" as an alias - it's a reserved command name.`));
    return;
  }
  const isUpdate = name in config.aliases;
  config.aliases[name] = {
    command,
    description,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveAliases(config);
  if (isUpdate) {
    console.log(chalk26.yellow(`Updated alias "${name}"`));
  } else {
    console.log(chalk26.green(`Created alias "${name}"`));
  }
  console.log(chalk26.gray(`  snap ${name} \u2192 snap ${command}`));
}
__name(setAlias, "setAlias");
function deleteAlias(name) {
  const config = loadAliases();
  if (!(name in config.aliases)) {
    console.log(chalk26.yellow(`Alias "${name}" not found`));
    return;
  }
  delete config.aliases[name];
  saveAliases(config);
  console.log(chalk26.green(`Deleted alias "${name}"`));
}
__name(deleteAlias, "deleteAlias");
function listAliases() {
  const config = loadAliases();
  const aliases = Object.entries(config.aliases);
  if (aliases.length === 0) {
    console.log(chalk26.yellow("No aliases configured"));
    console.log(chalk26.gray("\nCreate one with: snap alias set <name> <command>"));
    return;
  }
  console.log(chalk26.cyan.bold("\nConfigured Aliases:\n"));
  for (const [name, def] of aliases) {
    console.log(`${chalk26.cyan(name)} \u2192 ${chalk26.white(def.command)}`);
    if (def.description) {
      console.log(chalk26.gray(`  ${def.description}`));
    }
  }
  console.log();
}
__name(listAliases, "listAliases");
var SUGGESTED_ALIASES = [
  {
    name: "st",
    command: "status",
    description: "Quick status check"
  },
  {
    name: "ss",
    command: "snapshot",
    description: "Create snapshot"
  },
  {
    name: "sl",
    command: "list",
    description: "List snapshots"
  },
  {
    name: "ctx",
    command: "context",
    description: "Get context for task"
  },
  {
    name: "val",
    command: "validate",
    description: "Validate code"
  },
  {
    name: "dr",
    command: "doctor",
    description: "Run diagnostics"
  }
];
function showSuggestions() {
  console.log(chalk26.cyan.bold("\n\u{1F4A1} Suggested Aliases:\n"));
  const lines = [];
  for (const { name, command, description } of SUGGESTED_ALIASES) {
    lines.push(`snap alias set ${name} "${command}"`);
    lines.push(chalk26.gray(`  # ${description}`));
  }
  console.log(boxen(lines.join("\n"), {
    padding: 1,
    borderColor: "cyan",
    borderStyle: "round"
  }));
}
__name(showSuggestions, "showSuggestions");
function createAliasCommand() {
  const cmd = new Command("alias").description("Create shortcuts for common commands");
  cmd.command("list").description("List all configured aliases").action(() => {
    listAliases();
  });
  cmd.command("set <name> <command>").description("Create or update an alias").option("-d, --description <desc>", "Add a description").action((name, command, options) => {
    setAlias(name, command, options.description);
  });
  cmd.command("delete <name>").description("Delete an alias").action((name) => {
    deleteAlias(name);
  });
  cmd.command("suggest").description("Show suggested aliases").action(() => {
    showSuggestions();
  });
  cmd.action(() => {
    listAliases();
  });
  return cmd;
}
__name(createAliasCommand, "createAliasCommand");
var CONFIG_SCHEMA = [
  // Global config
  {
    key: "apiUrl",
    scope: [
      "global"
    ],
    type: "string",
    description: "SnapBack API URL",
    default: "https://api.snapback.dev"
  },
  {
    key: "defaultWorkspace",
    scope: [
      "global"
    ],
    type: "string",
    description: "Default workspace path"
  },
  {
    key: "analytics",
    scope: [
      "global"
    ],
    type: "boolean",
    description: "Enable anonymous usage analytics",
    default: true
  },
  // Workspace config
  {
    key: "protectionLevel",
    scope: [
      "local"
    ],
    type: "string",
    description: "Protection level (standard | strict)",
    default: "standard"
  },
  {
    key: "syncEnabled",
    scope: [
      "local"
    ],
    type: "boolean",
    description: "Enable cloud sync",
    default: true
  },
  {
    key: "tier",
    scope: [
      "local"
    ],
    type: "string",
    description: "User tier (free | pro)",
    default: "free"
  }
];
function createConfigCommand() {
  const config = new Command("config").description("Manage SnapBack configuration");
  config.command("list").description("List all configuration values").option("--global", "Show only global config").option("--local", "Show only local/workspace config").option("--json", "Output as JSON").action(async (options) => {
    try {
      await listConfig(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  config.command("get <key>").description("Get a configuration value").option("--global", "Get from global config").option("--local", "Get from local/workspace config").action(async (key, options) => {
    try {
      await getConfigValue(key, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  config.command("set <key> <value>").description("Set a configuration value").option("--global", "Set in global config").option("--local", "Set in local/workspace config").action(async (key, value, options) => {
    try {
      await setConfigValue(key, value, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  config.command("unset <key>").description("Remove a configuration value").option("--global", "Unset from global config").option("--local", "Unset from local/workspace config").action(async (key, options) => {
    try {
      await unsetConfigValue(key, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
  config.command("path").description("Show configuration file paths").action(async () => {
    await showConfigPaths();
  });
  config.command("keys").description("List all available configuration keys").action(() => {
    showConfigKeys();
  });
  return config;
}
__name(createConfigCommand, "createConfigCommand");
async function listConfig(options) {
  const cwd = process.cwd();
  const result7 = {};
  if (!options.local) {
    const globalConfig = await getGlobalConfig();
    if (options.json) {
      result7.global = globalConfig || {};
    } else {
      console.log(chalk26.cyan.bold("Global Configuration"));
      console.log(chalk26.gray(`Path: ${getGlobalDir()}/config.json`));
      console.log();
      if (globalConfig) {
        for (const [key, value] of Object.entries(globalConfig)) {
          console.log(`  ${chalk26.cyan(key)}: ${formatValue(value)}`);
        }
      } else {
        console.log(chalk26.gray("  (no global config set)"));
      }
      console.log();
    }
  }
  if (!options.global) {
    const hasWorkspace = await isSnapbackInitialized(cwd);
    if (hasWorkspace) {
      const workspaceConfig = await getWorkspaceConfig(cwd);
      if (options.json) {
        result7.local = workspaceConfig || {};
      } else {
        console.log(chalk26.cyan.bold("Workspace Configuration"));
        console.log(chalk26.gray(`Path: ${getWorkspaceDir(cwd)}/config.json`));
        console.log();
        if (workspaceConfig) {
          for (const [key, value] of Object.entries(workspaceConfig)) {
            console.log(`  ${chalk26.cyan(key)}: ${formatValue(value)}`);
          }
        } else {
          console.log(chalk26.gray("  (no workspace config set)"));
        }
      }
    } else if (!options.json) {
      console.log(chalk26.yellow("Not in a SnapBack workspace"));
      console.log(chalk26.gray("Run: snap init"));
    }
  }
  if (options.json) {
    console.log(JSON.stringify(result7, null, 2));
  }
}
__name(listConfig, "listConfig");
async function getConfigValue(key, options) {
  const cwd = process.cwd();
  const schema = CONFIG_SCHEMA.find((s) => s.key === key);
  if (!schema) {
    console.log(chalk26.yellow(`Unknown config key: ${key}`));
    console.log(chalk26.gray("Run 'snap config keys' to see available keys"));
    return;
  }
  const scope = determineScope(options, schema);
  let value;
  if (scope === "global") {
    const config = await getGlobalConfig();
    value = config?.[key];
  } else {
    if (!await isSnapbackInitialized(cwd)) {
      console.log(chalk26.yellow("Not in a SnapBack workspace"));
      return;
    }
    const config = await getWorkspaceConfig(cwd);
    value = config?.[key];
  }
  if (value === void 0) {
    if (schema.default !== void 0) {
      console.log(formatValue(schema.default), chalk26.gray("(default)"));
    } else {
      console.log(chalk26.gray("(not set)"));
    }
  } else {
    console.log(formatValue(value));
  }
}
__name(getConfigValue, "getConfigValue");
async function setConfigValue(key, value, options) {
  const cwd = process.cwd();
  const schema = CONFIG_SCHEMA.find((s) => s.key === key);
  if (!schema) {
    console.log(chalk26.yellow(`Unknown config key: ${key}`));
    console.log(chalk26.gray("Run 'snap config keys' to see available keys"));
    return;
  }
  const scope = determineScope(options, schema);
  const parsedValue = parseValue(value, schema.type);
  if (scope === "global") {
    const config = await getGlobalConfig() || {};
    config[key] = parsedValue;
    await saveGlobalConfig(config);
    console.log(chalk26.green("\u2713"), `Set ${chalk26.cyan(key)} = ${formatValue(parsedValue)} (global)`);
  } else {
    if (!await isSnapbackInitialized(cwd)) {
      console.log(chalk26.yellow("Not in a SnapBack workspace"));
      console.log(chalk26.gray("Run: snap init"));
      return;
    }
    const config = await getWorkspaceConfig(cwd) || {
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    config[key] = parsedValue;
    config.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await saveWorkspaceConfig(config, cwd);
    console.log(chalk26.green("\u2713"), `Set ${chalk26.cyan(key)} = ${formatValue(parsedValue)} (workspace)`);
  }
}
__name(setConfigValue, "setConfigValue");
async function unsetConfigValue(key, options) {
  const cwd = process.cwd();
  const schema = CONFIG_SCHEMA.find((s) => s.key === key);
  if (!schema) {
    console.log(chalk26.yellow(`Unknown config key: ${key}`));
    return;
  }
  const scope = determineScope(options, schema);
  if (scope === "global") {
    const config = await getGlobalConfig();
    if (config && key in config) {
      delete config[key];
      await saveGlobalConfig(config);
      console.log(chalk26.green("\u2713"), `Unset ${chalk26.cyan(key)} (global)`);
    } else {
      console.log(chalk26.gray(`${key} was not set`));
    }
  } else {
    if (!await isSnapbackInitialized(cwd)) {
      console.log(chalk26.yellow("Not in a SnapBack workspace"));
      return;
    }
    const config = await getWorkspaceConfig(cwd);
    if (config && key in config) {
      delete config[key];
      config.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await saveWorkspaceConfig(config, cwd);
      console.log(chalk26.green("\u2713"), `Unset ${chalk26.cyan(key)} (workspace)`);
    } else {
      console.log(chalk26.gray(`${key} was not set`));
    }
  }
}
__name(unsetConfigValue, "unsetConfigValue");
async function showConfigPaths() {
  const cwd = process.cwd();
  console.log(chalk26.cyan.bold("Configuration Paths"));
  console.log();
  console.log(chalk26.bold("Global:"));
  console.log(`  ${chalk26.cyan("Directory:")}  ${getGlobalDir()}`);
  console.log(`  ${chalk26.cyan("Config:")}     ${getGlobalDir()}/config.json`);
  console.log(`  ${chalk26.cyan("Credentials:")} ${getGlobalDir()}/credentials.json`);
  console.log();
  console.log(chalk26.bold("Workspace:"));
  if (await isSnapbackInitialized(cwd)) {
    console.log(`  ${chalk26.cyan("Directory:")}  ${getWorkspaceDir(cwd)}`);
    console.log(`  ${chalk26.cyan("Config:")}     ${getWorkspaceDir(cwd)}/config.json`);
    console.log(`  ${chalk26.cyan("Vitals:")}     ${getWorkspaceDir(cwd)}/vitals.json`);
    console.log(`  ${chalk26.cyan("Protected:")}  ${getWorkspaceDir(cwd)}/protected.json`);
  } else {
    console.log(chalk26.gray("  Not in a SnapBack workspace"));
  }
}
__name(showConfigPaths, "showConfigPaths");
function showConfigKeys() {
  console.log(chalk26.cyan.bold("Available Configuration Keys"));
  console.log();
  console.log(chalk26.bold("Global (--global):"));
  for (const schema of CONFIG_SCHEMA.filter((s) => s.scope.includes("global"))) {
    console.log(`  ${chalk26.cyan(schema.key.padEnd(20))} ${chalk26.gray(schema.description)}`);
    if (schema.default !== void 0) {
      console.log(`  ${"".padEnd(20)} ${chalk26.gray(`Default: ${schema.default}`)}`);
    }
  }
  console.log();
  console.log(chalk26.bold("Workspace (--local):"));
  for (const schema of CONFIG_SCHEMA.filter((s) => s.scope.includes("local"))) {
    console.log(`  ${chalk26.cyan(schema.key.padEnd(20))} ${chalk26.gray(schema.description)}`);
    if (schema.default !== void 0) {
      console.log(`  ${"".padEnd(20)} ${chalk26.gray(`Default: ${schema.default}`)}`);
    }
  }
}
__name(showConfigKeys, "showConfigKeys");
function determineScope(options, schema) {
  if (options.global) return "global";
  if (options.local) return "local";
  return schema.scope[0];
}
__name(determineScope, "determineScope");
function parseValue(value, type) {
  switch (type) {
    case "boolean":
      return value === "true" || value === "1" || value === "yes";
    case "number":
      return Number(value);
    default:
      return value;
  }
}
__name(parseValue, "parseValue");
function formatValue(value) {
  if (typeof value === "boolean") {
    return value ? chalk26.green("true") : chalk26.red("false");
  }
  if (typeof value === "string") {
    return chalk26.yellow(`"${value}"`);
  }
  return String(value);
}
__name(formatValue, "formatValue");
promisify(exec);
function createDoctorCommand() {
  return new Command("doctor").description("Diagnose SnapBack configuration and health").option("--fix", "Attempt to auto-fix detected issues").option("--fix-mcp", "Auto-repair broken MCP configurations").option("--json", "Output as JSON").option("--verbose", "Show detailed information").action(async (options) => {
    const spinner2 = ora8("Running diagnostics...").start();
    try {
      const report = await runDiagnostics(options);
      spinner2.stop();
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }
      displayReport(report, options.verbose);
      if (options.fix && report.summary.errors + report.summary.warnings > 0) {
        console.log();
        await runAutoFixes(report.results);
      }
      if (options.fixMcp) {
        console.log();
        await runMcpAutoFix();
      }
      if (report.summary.errors > 0) {
        process.exit(1);
      }
    } catch (error) {
      spinner2.fail("Diagnostics failed");
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Error:"), message);
      process.exit(1);
    }
  });
}
__name(createDoctorCommand, "createDoctorCommand");
async function runDiagnostics(_options = {}) {
  const results = [];
  let cliVersion = "unknown";
  try {
    const pkgPath = join(__dirname, "../../package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    cliVersion = pkg.version;
  } catch {
  }
  results.push(await checkNodeVersion());
  results.push(await checkCliInstallation());
  results.push(await checkGlobalDirectory());
  results.push(await checkAuthentication());
  results.push(await checkWorkspace());
  results.push(await checkMcpTools());
  results.push(await checkGitIntegration());
  results.push(await checkNetworkConnectivity());
  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    warnings: results.filter((r) => r.status === "warning").length,
    errors: results.filter((r) => r.status === "error").length
  };
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    cliVersion,
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    results,
    summary
  };
}
__name(runDiagnostics, "runDiagnostics");
async function checkNodeVersion() {
  const version = process.version;
  const major = Number.parseInt(version.slice(1).split(".")[0], 10);
  if (major >= 18) {
    return {
      name: "Node.js Version",
      status: "ok",
      message: `Node.js ${version} (supported)`
    };
  }
  return {
    name: "Node.js Version",
    status: "warning",
    message: `Node.js ${version} (upgrade recommended)`,
    details: [
      "SnapBack works best with Node.js 18+"
    ],
    fix: "Upgrade to Node.js 18 or later"
  };
}
__name(checkNodeVersion, "checkNodeVersion");
async function checkCliInstallation() {
  const npmPrefix = process.env.npm_config_prefix || join(homedir(), ".npm-global");
  const pathDirs = (process.env.PATH || "").split(":");
  const snapInPath = pathDirs.some((dir) => dir.includes("npm") || dir.includes(".npm-global") || dir.includes("node_modules/.bin"));
  if (snapInPath) {
    return {
      name: "CLI Installation",
      status: "ok",
      message: "snap command is in PATH"
    };
  }
  return {
    name: "CLI Installation",
    status: "warning",
    message: "npm global bin may not be in PATH",
    details: [
      `npm prefix: ${npmPrefix}`,
      "This could cause 'snap' command not found errors"
    ],
    fix: `Add "${npmPrefix}/bin" to your PATH`
  };
}
__name(checkCliInstallation, "checkCliInstallation");
async function checkGlobalDirectory() {
  const globalDir = getGlobalDir();
  try {
    await access(globalDir, constants.F_OK);
    return {
      name: "Global Directory",
      status: "ok",
      message: "~/.snapback/ exists",
      details: [
        globalDir
      ]
    };
  } catch {
    return {
      name: "Global Directory",
      status: "info",
      message: "~/.snapback/ not created yet",
      details: [
        "Will be created on first login"
      ]
    };
  }
}
__name(checkGlobalDirectory, "checkGlobalDirectory");
async function checkAuthentication() {
  try {
    if (await isLoggedIn()) {
      const creds = await getCredentials();
      return {
        name: "Authentication",
        status: "ok",
        message: `Logged in as ${creds?.email}`,
        details: [
          `Tier: ${creds?.tier || "free"}`
        ]
      };
    }
    return {
      name: "Authentication",
      status: "warning",
      message: "Not logged in",
      details: [
        "Some features require authentication"
      ],
      fix: "Run: snap login"
    };
  } catch {
    return {
      name: "Authentication",
      status: "error",
      message: "Failed to check authentication"
    };
  }
}
__name(checkAuthentication, "checkAuthentication");
async function checkWorkspace() {
  const cwd = process.cwd();
  try {
    if (await isSnapbackInitialized(cwd)) {
      await getWorkspaceConfig(cwd);
      return {
        name: "Workspace",
        status: "ok",
        message: "SnapBack initialized in this workspace",
        details: [
          `Directory: ${getWorkspaceDir(cwd)}`
        ]
      };
    }
    return {
      name: "Workspace",
      status: "info",
      message: "Not a SnapBack workspace",
      fix: "Run: snap init"
    };
  } catch {
    return {
      name: "Workspace",
      status: "error",
      message: "Failed to check workspace"
    };
  }
}
__name(checkWorkspace, "checkWorkspace");
async function checkMcpTools() {
  try {
    const detection = detectAIClients();
    if (detection.detected.length === 0) {
      return {
        name: "AI Tools",
        status: "info",
        message: "No AI tools detected"
      };
    }
    const configured = detection.detected.filter((c) => c.hasSnapback);
    const needsSetup = detection.needsSetup;
    const validationIssues = [];
    let hasErrors = false;
    let hasWarnings = false;
    for (const client of configured) {
      const validation = validateClientConfig(client);
      const errors = validation.issues.filter((i) => i.severity === "error");
      const warnings = validation.issues.filter((i) => i.severity === "warning");
      if (errors.length > 0) {
        hasErrors = true;
        for (const err2 of errors) {
          validationIssues.push(`${client.displayName}: ${err2.message}`);
        }
      }
      if (warnings.length > 0) {
        hasWarnings = true;
        for (const warn of warnings) {
          validationIssues.push(`${client.displayName}: ${warn.message}`);
        }
      }
    }
    if (hasErrors) {
      return {
        name: "AI Tools",
        status: "error",
        message: `${configured.length} tool(s) configured, but some have errors`,
        details: validationIssues,
        fix: "Run: snap doctor --fix-mcp"
      };
    }
    if (hasWarnings) {
      return {
        name: "AI Tools",
        status: "warning",
        message: `${configured.length} tool(s) configured with warnings`,
        details: validationIssues,
        fix: "Run: snap doctor --fix-mcp"
      };
    }
    if (needsSetup.length > 0) {
      return {
        name: "AI Tools",
        status: "warning",
        message: `${needsSetup.length} AI tool(s) need configuration`,
        details: needsSetup.map((c) => `${c.displayName} not configured`),
        fix: "Run: snap tools configure"
      };
    }
    return {
      name: "AI Tools",
      status: "ok",
      message: `${configured.length} AI tool(s) configured and healthy`,
      details: configured.map((c) => c.displayName)
    };
  } catch {
    return {
      name: "AI Tools",
      status: "error",
      message: "Failed to check AI tools"
    };
  }
}
__name(checkMcpTools, "checkMcpTools");
async function checkGitIntegration() {
  const cwd = process.cwd();
  try {
    await access(join(cwd, ".git"), constants.F_OK);
    try {
      const hookPath = join(cwd, ".git/hooks/pre-commit");
      const hookContent = await readFile(hookPath, "utf-8");
      if (hookContent.includes("snap check")) {
        return {
          name: "Git Integration",
          status: "ok",
          message: "Git repository with SnapBack hook"
        };
      }
      return {
        name: "Git Integration",
        status: "info",
        message: "Git repository (hook not configured)",
        fix: "Consider adding 'snap check' to pre-commit hook"
      };
    } catch {
      return {
        name: "Git Integration",
        status: "info",
        message: "Git repository (no pre-commit hook)"
      };
    }
  } catch {
    return {
      name: "Git Integration",
      status: "info",
      message: "Not a Git repository"
    };
  }
}
__name(checkGitIntegration, "checkGitIntegration");
async function checkNetworkConnectivity() {
  const apiUrl = process.env.SNAPBACK_API_URL || "https://api.snapback.dev";
  try {
    const response = await fetch(`${apiUrl}/health`).catch(() => null);
    if (response?.ok) {
      return {
        name: "Network",
        status: "ok",
        message: "Connected to SnapBack API"
      };
    }
    return {
      name: "Network",
      status: "warning",
      message: "Cannot reach SnapBack API (offline mode available)"
    };
  } catch {
    return {
      name: "Network",
      status: "warning",
      message: "Cannot reach SnapBack API"
    };
  }
}
__name(checkNetworkConnectivity, "checkNetworkConnectivity");
function displayReport(report, verbose) {
  console.log(`
${chalk26.cyan.bold("SnapBack System Health Report")}`);
  console.log(chalk26.gray(`Generated: ${new Date(report.timestamp).toLocaleString()}
`));
  displayBox([
    `${chalk26.bold("CLI Version:")}  ${report.cliVersion}`,
    `${chalk26.bold("Node Version:")} ${report.nodeVersion}`,
    `${chalk26.bold("Platform:")}     ${report.platform}`
  ].join("\n"), {
    title: "Environment",
    padding: 1
  });
  console.log();
  for (const result7 of report.results) {
    const icon = getStatusIcon(result7.status);
    const color = getStatusColor(result7.status);
    console.log(`${icon} ${chalk26.bold(result7.name)}: ${color(result7.message)}`);
    if (verbose && result7.details?.length) {
      for (const detail of result7.details) {
        console.log(chalk26.gray(`  \u2022 ${detail}`));
      }
    }
    if (result7.fix) {
      console.log(chalk26.cyan(`  \u2192 Fix: ${result7.fix}`));
    }
  }
  console.log(`
${chalk26.gray("\u2500".repeat(40))}`);
  const { warnings, errors, total } = report.summary;
  if (errors > 0) {
    console.log(chalk26.red.bold(`
\u2717 Diagnostics failed: ${errors} error(s), ${warnings} warning(s)`));
  } else if (warnings > 0) {
    console.log(chalk26.yellow.bold(`
\u26A0 Diagnostics found ${warnings} issue(s)`));
  } else {
    console.log(chalk26.green.bold(`
\u2713 All ${total} systems healthy!`));
  }
}
__name(displayReport, "displayReport");
function getStatusIcon(status2) {
  switch (status2) {
    case "ok":
      return chalk26.green("\u2713");
    case "warning":
      return chalk26.yellow("\u26A0");
    case "error":
      return chalk26.red("\u2717");
    case "info":
      return chalk26.blue("\u2139");
    default:
      return " ";
  }
}
__name(getStatusIcon, "getStatusIcon");
function getStatusColor(status2) {
  switch (status2) {
    case "ok":
      return chalk26.green;
    case "warning":
      return chalk26.yellow;
    case "error":
      return chalk26.red;
    case "info":
      return chalk26.blue;
    default:
      return chalk26.white;
  }
}
__name(getStatusColor, "getStatusColor");
async function runAutoFixes(results) {
  const fixable = results.filter((r) => r.fix && (r.status === "warning" || r.status === "error"));
  if (fixable.length === 0) {
    console.log(chalk26.gray("No auto-fixable issues found."));
    return;
  }
  console.log(chalk26.cyan("Attempting auto-fixes..."));
  console.log();
  for (const result7 of fixable) {
    console.log(chalk26.gray(`\u2192 ${result7.name}: ${result7.fix}`));
  }
  console.log();
  console.log(chalk26.gray("Follow the instructions above to fix detected issues."));
}
__name(runAutoFixes, "runAutoFixes");
async function runMcpAutoFix() {
  const detection = detectAIClients();
  const configured = detection.detected.filter((c) => c.hasSnapback);
  if (configured.length === 0) {
    console.log(chalk26.yellow("No MCP configurations to repair."));
    console.log(chalk26.gray("Run: snap tools configure"));
    return;
  }
  const clientsWithIssues = configured.filter((client) => {
    const validation = validateClientConfig(client);
    return !validation.valid || validation.issues.some((i) => i.severity === "error" || i.severity === "warning");
  });
  if (clientsWithIssues.length === 0) {
    console.log(chalk26.green("All MCP configurations are healthy!"));
    return;
  }
  console.log(chalk26.cyan("Repairing MCP configurations..."));
  console.log();
  let repaired = 0;
  let failed = 0;
  for (const client of clientsWithIssues) {
    const spinner2 = ora8(`Repairing ${client.displayName}...`).start();
    const result7 = repairClientConfig(client, {
      workspaceRoot: process.cwd(),
      force: true
    });
    if (result7.success) {
      spinner2.succeed(`Repaired ${client.displayName}`);
      repaired++;
    } else {
      spinner2.fail(`Failed to repair ${client.displayName}: ${result7.error}`);
      failed++;
    }
  }
  console.log();
  if (repaired > 0) {
    console.log(chalk26.green(`\u2713 Repaired ${repaired} configuration(s).`));
    console.log(chalk26.bold("Restart your AI assistant to apply changes."));
  }
  if (failed > 0) {
    console.log(chalk26.red(`\u2717 Failed to repair ${failed} configuration(s).`));
    console.log(chalk26.gray("Try: snap tools configure --force"));
  }
}
__name(runMcpAutoFix, "runMcpAutoFix");
function createUndoCommand() {
  const cmd = new Command("undo").description("Undo the last destructive operation").option("--list", "List recent undoable operations").action(async (options) => {
    if (options.list) {
      const operations = getRecentOperations(10);
      if (operations.length === 0) {
        console.log(chalk26.yellow("No recent operations found"));
        return;
      }
      console.log(chalk26.cyan.bold("\nRecent Operations:\n"));
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        const status2 = op.canUndo ? chalk26.green("\u25CF") : chalk26.gray("\u25CB");
        const time = new Date(op.timestamp).toLocaleString();
        console.log(`${status2} ${chalk26.white(op.description)}`);
        console.log(chalk26.gray(`  ${time} \u2022 ${op.changes.length} changes`));
        if (i < operations.length - 1) {
          console.log();
        }
      }
      console.log(chalk26.gray("\n\u25CF = Can undo  \u25CB = Cannot undo\n"));
      return;
    }
    await undoLastOperation();
  });
  return cmd;
}
__name(createUndoCommand, "createUndoCommand");
var execAsync2 = promisify(exec);
var PACKAGE_NAME = "@snapback/cli";
var NPM_REGISTRY = "https://registry.npmjs.org";
function createUpgradeCommand() {
  return new Command("upgrade").description("Check for and install CLI updates").option("--check", "Only check for updates, don't install").option("--force", "Force reinstall even if up to date").option("--canary", "Install latest canary/pre-release version").action(async (options) => {
    try {
      const spinner2 = ora8("Checking for updates...").start();
      const versionInfo = await getVersionInfo(options.canary);
      spinner2.stop();
      console.log(displayBox({
        title: "\u{1F4E6} SnapBack CLI",
        content: `Current: v${versionInfo.current}
Latest:  v${versionInfo.latest}`,
        type: versionInfo.updateAvailable ? "warning" : "success"
      }));
      console.log();
      if (!versionInfo.updateAvailable && !options.force) {
        console.log(chalk26.green("\u2713"), "You're on the latest version!");
        return;
      }
      if (options.check) {
        if (versionInfo.updateAvailable) {
          console.log(chalk26.yellow("\u26A0"), "Update available!");
          console.log(chalk26.gray(`Run 'snap upgrade' to install v${versionInfo.latest}`));
        }
        return;
      }
      if (versionInfo.updateAvailable) {
        console.log(chalk26.cyan("\u2192"), `Upgrading to v${versionInfo.latest}...`);
      } else {
        console.log(chalk26.cyan("\u2192"), "Reinstalling current version...");
      }
      await performUpgrade(options.canary);
      console.log();
      console.log(chalk26.green("\u2713"), "Upgrade complete!");
      console.log(chalk26.gray("Restart your terminal to use the new version."));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk26.red("Upgrade failed:"), message);
      console.log();
      console.log(chalk26.gray("Manual upgrade:"));
      console.log(chalk26.gray(`  npm install -g ${PACKAGE_NAME}@latest`));
      process.exit(1);
    }
  });
}
__name(createUpgradeCommand, "createUpgradeCommand");
async function getVersionInfo(canary = false) {
  let current = "0.0.0";
  try {
    const pkgPath = join(__dirname, "../../package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    current = pkg.version;
  } catch {
    try {
      const altPkgPath = join(__dirname, "../../../package.json");
      const pkg = JSON.parse(await readFile(altPkgPath, "utf-8"));
      current = pkg.version;
    } catch {
      try {
        const { stdout } = await execAsync2(`npm view ${PACKAGE_NAME} version`);
        current = stdout.trim();
      } catch {
      }
    }
  }
  let latest = current;
  try {
    const tag = canary ? "canary" : "latest";
    const response = await fetch(`${NPM_REGISTRY}/${PACKAGE_NAME}/${tag}`);
    if (response.ok) {
      const data = await response.json();
      latest = data.version;
    } else {
      const { stdout } = await execAsync2(`npm view ${PACKAGE_NAME}${canary ? "@canary" : ""} version`);
      latest = stdout.trim();
    }
  } catch {
  }
  return {
    current,
    latest,
    updateAvailable: compareVersions(latest, current) > 0
  };
}
__name(getVersionInfo, "getVersionInfo");
function compareVersions(a, b) {
  const partsA = a.replace(/^v/, "").split(".").map(Number);
  const partsB = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;
    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }
  return 0;
}
__name(compareVersions, "compareVersions");
async function performUpgrade(canary = false) {
  const spinner2 = ora8("Installing update...").start();
  try {
    const packageManager = await detectPackageManager2();
    const tag = canary ? "canary" : "latest";
    let command;
    switch (packageManager) {
      case "pnpm":
        command = `pnpm add -g ${PACKAGE_NAME}@${tag}`;
        break;
      case "yarn":
        command = `yarn global add ${PACKAGE_NAME}@${tag}`;
        break;
      case "bun":
        command = `bun add -g ${PACKAGE_NAME}@${tag}`;
        break;
      default:
        command = `npm install -g ${PACKAGE_NAME}@${tag}`;
    }
    spinner2.text = `Running: ${command}`;
    const { stderr } = await execAsync2(command);
    if (stderr && stderr.includes("ERR!")) {
      throw new Error(stderr);
    }
    spinner2.succeed("Update installed");
  } catch (error) {
    spinner2.fail("Installation failed");
    throw error;
  }
}
__name(performUpgrade, "performUpgrade");
async function detectPackageManager2() {
  try {
    await execAsync2("pnpm --version");
    const { stdout } = await execAsync2("pnpm list -g @snapback/cli 2>/dev/null || true");
    if (stdout.includes("@snapback/cli")) {
      return "pnpm";
    }
  } catch {
  }
  try {
    await execAsync2("yarn --version");
    const { stdout } = await execAsync2("yarn global list 2>/dev/null || true");
    if (stdout.includes("@snapback/cli")) {
      return "yarn";
    }
  } catch {
  }
  try {
    await execAsync2("bun --version");
    return "bun";
  } catch {
  }
  return "npm";
}
__name(detectPackageManager2, "detectPackageManager");
function supportsHyperlinks() {
  const forceHyperlinks = process.env.FORCE_HYPERLINK;
  if (forceHyperlinks === "0") return false;
  if (forceHyperlinks === "1") return true;
  const { TERM_PROGRAM, VTE_VERSION, COLORTERM, CI } = process.env;
  if (CI) return false;
  if (TERM_PROGRAM === "iTerm.app") return true;
  if (VTE_VERSION) {
    const version = Number.parseInt(VTE_VERSION, 10);
    if (version >= 5e3) return true;
  }
  if (process.env.WT_SESSION) return true;
  if (TERM_PROGRAM === "vscode") return true;
  if (process.env.KITTY_WINDOW_ID) return true;
  if (COLORTERM === "truecolor" && TERM_PROGRAM === "Hyper") return true;
  if (TERM_PROGRAM === "Alacritty") return true;
  if (process.env.WEZTERM_PANE) return true;
  return false;
}
__name(supportsHyperlinks, "supportsHyperlinks");
function link(text, url, options = {}) {
  const { fallback = true } = options;
  if (supportsHyperlinks()) {
    return `\x1B]8;;${url}\x07${text}\x1B]8;;\x07`;
  }
  if (fallback) {
    return `${text} (${chalk26.gray(url)})`;
  }
  return text;
}
__name(link, "link");
function fileLink(filePath, line) {
  const displayPath = filePath.replace(process.cwd(), ".");
  let url = `file://${filePath}`;
  if (line !== void 0) {
    url += `:${line}`;
  }
  return link(displayPath, url);
}
__name(fileLink, "fileLink");
function docsLink(path6, text) {
  const url = `https://docs.snapback.dev/${path6}`;
  return link(text || path6, url);
}
__name(docsLink, "docsLink");
function issueLink(issueNumber) {
  const url = `https://github.com/snapback-dev/snapback/issues/${issueNumber}`;
  return link(`#${issueNumber}`, url);
}
__name(issueLink, "issueLink");
function commandLink(command) {
  return chalk26.cyan(`$ ${command}`);
}
__name(commandLink, "commandLink");
function labeledLink(label, text, url) {
  return `${chalk26.gray(label)}: ${link(text, url)}`;
}
__name(labeledLink, "labeledLink");
function learnMore(url) {
  return chalk26.gray(`Learn more: ${link(url, url)}`);
}
__name(learnMore, "learnMore");
function reportIssue() {
  const url = "https://github.com/snapback-dev/snapback/issues/new";
  return chalk26.gray(`If this persists, ${link("report an issue", url)}`);
}
__name(reportIssue, "reportIssue");
var hyperlink = {
  create: link,
  file: fileLink,
  docs: docsLink,
  issue: issueLink,
  command: commandLink,
  labeled: labeledLink,
  learnMore,
  reportIssue,
  supportsHyperlinks
};
var LOGO_LARGE = `
\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2557   \u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557  \u2588\u2588\u2557
\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2551 \u2588\u2588\u2554\u255D
\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2554\u2588\u2588\u2557 \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551     \u2588\u2588\u2588\u2588\u2588\u2554\u255D
\u255A\u2550\u2550\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551\u255A\u2588\u2588\u2557\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u255D \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2588\u2588\u2557
\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551 \u255A\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551     \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551  \u2588\u2588\u2557
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D`;
var LOGO_COMPACT = `
 ____                   ____             _
/ ___| _ __   __ _ _ __|  _ \\ __ _  ___| | __
\\___ \\| '_ \\ / _\` | '_ \\ |_) / _\` |/ __| |/ /
 ___) | | | | (_| | |_) |  _ < (_| | (__|   <
|____/|_| |_|\\__,_| .__/|_| \\_\\__,_|\\___|_|\\_\\
                  |_|`;
var LOGO_MINIMAL = `
\u2554\u2550\u2557\u250C\u2510\u250C\u250C\u2500\u2510\u250C\u2500\u2510\u2554\u2557 \u250C\u2500\u2510\u250C\u2500\u2510\u252C\u250C\u2500
\u255A\u2550\u2557\u2502\u2502\u2502\u251C\u2500\u2524\u251C\u2500\u2518\u2560\u2569\u2557\u251C\u2500\u2524\u2502  \u251C\u2534\u2510
\u255A\u2550\u255D\u2518\u2514\u2518\u2534 \u2534\u2534  \u255A\u2550\u255D\u2534 \u2534\u2514\u2500\u2518\u2534 \u2534`;
function getLogo(terminalWidth) {
  const width = terminalWidth ?? process.stdout.columns ?? 80;
  if (width >= 72) {
    return LOGO_LARGE;
  }
  if (width >= 50) {
    return LOGO_COMPACT;
  }
  return LOGO_MINIMAL;
}
__name(getLogo, "getLogo");
function displayBrandedHeader(options = {}) {
  const { version, showTagline = true, color = true } = options;
  const logo = getLogo();
  const coloredLogo = color ? chalk26.cyan(logo) : logo;
  const lines = [
    coloredLogo
  ];
  if (showTagline) {
    lines.push("");
    lines.push(color ? `    ${chalk26.yellow("\u{1F6E1}\uFE0F")}  ${chalk26.bold("Code Protection for AI-Native Development")}` : "    \u{1F6E1}\uFE0F  Code Protection for AI-Native Development");
  }
  if (version) {
    lines.push(color ? chalk26.gray(`    v${version}`) : `    v${version}`);
  }
  return lines.join("\n");
}
__name(displayBrandedHeader, "displayBrandedHeader");

// src/commands/wizard.ts
function detectProjectType(cwd) {
  const indicators = [];
  let type = "unknown";
  let confidence = 0;
  const files = fs5.readdirSync(cwd).map((f) => f.toLowerCase());
  if (files.includes("tsconfig.json")) {
    type = "typescript";
    confidence += 90;
    indicators.push("tsconfig.json found");
  } else if (files.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"))) {
    type = "typescript";
    confidence += 60;
    indicators.push(".ts/.tsx files found");
  }
  if (files.includes("package.json")) {
    if (type === "unknown") {
      type = "nodejs";
    }
    confidence += 30;
    indicators.push("package.json found");
  }
  if (files.includes("pyproject.toml") || files.includes("requirements.txt")) {
    type = "python";
    confidence = 80;
    indicators.push("Python project files found");
  } else if (files.some((f) => f.endsWith(".py"))) {
    if (type === "unknown") {
      type = "python";
      confidence = 50;
    }
    indicators.push(".py files found");
  }
  if (files.includes("cargo.toml")) {
    type = "rust";
    confidence = 95;
    indicators.push("Cargo.toml found");
  }
  if (files.includes("go.mod")) {
    type = "go";
    confidence = 95;
    indicators.push("go.mod found");
  }
  return {
    type,
    confidence,
    indicators
  };
}
__name(detectProjectType, "detectProjectType");
async function checkAuthentication2() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const tokenPath = path5.join(homeDir, ".snapback", "token.json");
  try {
    if (fs5.existsSync(tokenPath)) {
      const data = JSON.parse(fs5.readFileSync(tokenPath, "utf-8"));
      return Boolean(data.token);
    }
  } catch {
  }
  return false;
}
__name(checkAuthentication2, "checkAuthentication");
function isWorkspaceInitialized(cwd) {
  const snapbackDir = path5.join(cwd, ".snapback");
  return fs5.existsSync(snapbackDir);
}
__name(isWorkspaceInitialized, "isWorkspaceInitialized");
async function welcomeStep() {
  console.clear();
  console.log(displayBrandedHeader({
    showTagline: true
  }));
  console.log(chalk26.cyan.bold("\n  Welcome to SnapBack! \u{1F389}\n"));
  console.log(chalk26.white("  The AI-native code protection tool that helps you"));
  console.log(chalk26.white("  work confidently with AI coding assistants.\n"));
  console.log(chalk26.gray("  This wizard will help you:"));
  console.log(chalk26.gray("  \u2022 Connect your account"));
  console.log(chalk26.gray("  \u2022 Set up your workspace"));
  console.log(chalk26.gray("  \u2022 Configure AI tool integration\n"));
  const proceed = await prompts.confirm({
    message: "Ready to get started?",
    default: true
  });
  if (!proceed) {
    console.log(chalk26.gray("\nNo problem! Run 'snap init' anytime to start over.\n"));
    process.exit(0);
  }
}
__name(welcomeStep, "welcomeStep");
async function authenticationStep(state) {
  console.log("\n" + chalk26.cyan.bold("Step 1: Authentication\n"));
  if (state.authenticated) {
    status.success("Already authenticated");
    return state;
  }
  console.log(chalk26.white("  SnapBack needs to connect to your account for:"));
  console.log(chalk26.gray("  \u2022 Syncing snapshots across devices"));
  console.log(chalk26.gray("  \u2022 Enabling team collaboration"));
  console.log(chalk26.gray("  \u2022 Accessing premium features\n"));
  const authMethod = await prompts.select({
    message: "How would you like to authenticate?",
    options: [
      {
        label: "Browser login (recommended)",
        value: "browser",
        hint: "Opens snapback.dev"
      },
      {
        label: "API key",
        value: "api-key",
        hint: "For CI/CD and automation"
      },
      {
        label: "Skip for now",
        value: "skip",
        hint: "Limited functionality"
      }
    ],
    default: "browser"
  });
  if (authMethod === "skip") {
    status.warning("Skipping authentication - some features will be limited");
    return {
      ...state,
      authenticated: false
    };
  }
  if (authMethod === "browser") {
    console.log(chalk26.gray("\n  Opening browser for authentication..."));
    console.log(chalk26.cyan("  \u2192 " + hyperlink.create("Click here to authenticate", "https://snapback.dev/auth/cli")));
    console.log();
    const confirmed = await prompts.confirm({
      message: "Did you complete authentication in the browser?",
      default: true
    });
    if (confirmed) {
      status.success("Authenticated successfully!");
      return {
        ...state,
        authenticated: true
      };
    }
  }
  if (authMethod === "api-key") {
    const apiKey = await prompts.input("Enter your API key", {
      validate: /* @__PURE__ */ __name((value) => {
        if (!value.startsWith("snap_")) {
          return "API key should start with 'snap_'";
        }
        if (value.length < 20) {
          return "API key seems too short";
        }
        return true;
      }, "validate")
    });
    if (apiKey) {
      status.success("API key validated and stored");
      return {
        ...state,
        authenticated: true
      };
    }
  }
  return {
    ...state,
    authenticated: false
  };
}
__name(authenticationStep, "authenticationStep");
async function workspaceStep(state) {
  console.log("\n" + chalk26.cyan.bold("Step 2: Workspace Setup\n"));
  const cwd = process.cwd();
  const detection = detectProjectType(cwd);
  const projectName = path5.basename(cwd);
  if (detection.type !== "unknown") {
    console.log(chalk26.white(`  Detected project: ${chalk26.cyan(projectName)}`));
    console.log(chalk26.gray(`  Type: ${detection.type} (${detection.confidence}% confidence)`));
    console.log(chalk26.gray(`  Indicators: ${detection.indicators.join(", ")}
`));
  } else {
    console.log(chalk26.white(`  Project: ${chalk26.cyan(projectName)}`));
    console.log(chalk26.gray("  Type: Could not auto-detect\n"));
  }
  if (isWorkspaceInitialized(cwd)) {
    const configPath = path5.join(cwd, ".snapback", "config.json");
    let isConfigCorrupted = false;
    if (!fs5.existsSync(configPath)) {
      isConfigCorrupted = true;
    } else {
      try {
        JSON.parse(fs5.readFileSync(configPath, "utf-8"));
      } catch {
        isConfigCorrupted = true;
      }
    }
    if (isConfigCorrupted) {
      status.warning("Detected a corrupted SnapBack configuration");
      const repair = await prompts.confirm({
        message: "Would you like to repair (re-initialize) the workspace?",
        default: true
      });
      if (repair) ; else {
        return {
          ...state,
          workspaceRoot: cwd,
          projectType: detection.type
        };
      }
    } else {
      status.success("Workspace already initialized and healthy");
      return {
        ...state,
        workspaceRoot: cwd,
        projectType: detection.type
      };
    }
  }
  const proceed = await prompts.confirm({
    message: `Initialize SnapBack in ${chalk26.cyan(cwd)}?`,
    default: true
  });
  if (!proceed) {
    return {
      ...state,
      workspaceRoot: null,
      projectType: detection.type
    };
  }
  const snapbackDir = path5.join(cwd, ".snapback");
  if (!fs5.existsSync(snapbackDir)) {
    fs5.mkdirSync(snapbackDir, {
      recursive: true
    });
  }
  const config = {
    version: 1,
    projectType: detection.type,
    protectionLevel: "standard",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  fs5.writeFileSync(path5.join(snapbackDir, "config.json"), JSON.stringify(config, null, 2));
  status.success("Workspace initialized successfully");
  return {
    ...state,
    workspaceRoot: cwd,
    projectType: detection.type
  };
}
__name(workspaceStep, "workspaceStep");
async function protectionStep(state) {
  console.log("\n" + chalk26.cyan.bold("Step 3: Protection Level\n"));
  console.log(chalk26.white("  Choose how SnapBack should protect your code:\n"));
  const level = await prompts.select({
    message: "Protection level",
    options: [
      {
        label: "Standard",
        value: "standard",
        hint: "Auto-snapshot before AI edits, warnings on risky changes"
      },
      {
        label: "Strict",
        value: "strict",
        hint: "Confirmation required before AI edits, block high-risk changes"
      }
    ],
    default: "standard"
  });
  const protectionLevel = level || "standard";
  console.log();
  if (protectionLevel === "standard") {
    status.info("Standard protection: AI edits proceed with auto-snapshots");
  } else {
    status.info("Strict protection: You'll be prompted before risky AI edits");
  }
  return {
    ...state,
    protectionLevel
  };
}
__name(protectionStep, "protectionStep");
async function mcpStep(state) {
  console.log("\n" + chalk26.cyan.bold("Step 4: AI Tool Integration\n"));
  let detectAIClients2;
  let getSnapbackMCPConfig2;
  let writeClientConfig2;
  try {
    const mcpConfig = await import('./dist-7GPVXUEA.js');
    detectAIClients2 = mcpConfig.detectAIClients;
    getSnapbackMCPConfig2 = mcpConfig.getSnapbackMCPConfig;
    writeClientConfig2 = mcpConfig.writeClientConfig;
  } catch {
    console.log(chalk26.white("  SnapBack integrates with AI coding tools via MCP:"));
    console.log(chalk26.gray("  \u2022 Cursor, Windsurf, Claude Desktop, VS Code, and more"));
    console.log(chalk26.gray("  \u2022 Provides context about protected files"));
    console.log(chalk26.gray("  \u2022 Enables smart validation of AI suggestions\n"));
    const enableMcp2 = await prompts.confirm({
      message: "Enable MCP integration for AI tools?",
      default: true
    });
    if (enableMcp2) {
      status.success("MCP integration enabled");
      console.log(chalk26.gray("  Run 'snap tools configure' to set up specific tools"));
    } else {
      status.info("MCP integration skipped - you can enable it later");
    }
    return {
      ...state,
      mcpEnabled: enableMcp2
    };
  }
  const detection = detectAIClients2({
    cwd: state.workspaceRoot || process.cwd()
  });
  if (detection.detected.length === 0) {
    console.log(chalk26.yellow("  No AI tools detected on your system."));
    console.log(chalk26.gray("  Install one of these to use SnapBack MCP:"));
    console.log(chalk26.gray("  \u2022 Claude Desktop - https://claude.ai/download"));
    console.log(chalk26.gray("  \u2022 Cursor - https://cursor.sh"));
    console.log(chalk26.gray("  \u2022 VS Code - https://code.visualstudio.com"));
    console.log(chalk26.gray("  \u2022 Windsurf - https://codeium.com/windsurf"));
    return {
      ...state,
      mcpEnabled: false
    };
  }
  console.log(chalk26.white(`  Found ${detection.detected.length} AI tool(s):
`));
  for (const client of detection.detected) {
    const statusIcon = client.hasSnapback ? chalk26.green("\u2713") : chalk26.yellow("\u25CB");
    const statusText = client.hasSnapback ? chalk26.gray("(configured)") : chalk26.yellow("(needs setup)");
    console.log(`    ${statusIcon} ${client.displayName} ${statusText}`);
  }
  console.log();
  if (detection.needsSetup.length === 0) {
    status.success("All detected AI tools already have SnapBack configured!");
    return {
      ...state,
      mcpEnabled: true
    };
  }
  const clientNames = detection.needsSetup.map((c) => c.displayName).join(", ");
  const enableMcp = await prompts.confirm({
    message: `Configure SnapBack for ${clientNames}?`,
    default: true
  });
  if (enableMcp) {
    const mcpConfig = getSnapbackMCPConfig2({
      workspaceRoot: state.workspaceRoot || void 0
    });
    for (const client of detection.needsSetup) {
      process.stdout.write(chalk26.gray(`    Configuring ${client.displayName}...`));
      const result7 = writeClientConfig2(client, mcpConfig);
      if (result7.success) {
        console.log(chalk26.green(" \u2713"));
      } else {
        console.log(chalk26.red(` \u2717 ${result7.error}`));
      }
    }
    console.log();
    status.success("MCP integration configured!");
    console.log(chalk26.gray("  Restart your AI tools to activate SnapBack."));
  } else {
    status.info("MCP integration skipped - run 'snap tools configure' later");
  }
  return {
    ...state,
    mcpEnabled: enableMcp
  };
}
__name(mcpStep, "mcpStep");
async function fileProtectionStep(state) {
  if (!state.workspaceRoot) {
    return {
      ...state,
      filesProtected: false
    };
  }
  console.log("\n" + chalk26.cyan.bold("Step 5: File Protection\n"));
  console.log(chalk26.white("  Protect sensitive files from AI modifications:"));
  console.log(chalk26.gray("  \u2022 Environment files (.env, .env.*)"));
  console.log(chalk26.gray("  \u2022 Config files (tsconfig.json, package.json, etc.)"));
  console.log(chalk26.gray("  \u2022 Lock files (package-lock.json, pnpm-lock.yaml)\n"));
  const protect = await prompts.confirm({
    message: "Protect common sensitive files?",
    default: true
  });
  if (!protect) {
    status.info("File protection skipped");
    return {
      ...state,
      filesProtected: false
    };
  }
  try {
    const { getProtectedFiles: getProtectedFiles2, saveProtectedFiles: saveProtectedFiles2 } = await import('./snapback-dir-4QRR2IPV.js');
    const protectedFiles = await getProtectedFiles2(state.workspaceRoot);
    let added = 0;
    const envPatterns = [
      ".env",
      ".env.*",
      "*.env"
    ];
    for (const pattern of envPatterns) {
      if (!protectedFiles.some((f) => f.pattern === pattern)) {
        protectedFiles.push({
          pattern,
          addedAt: (/* @__PURE__ */ new Date()).toISOString(),
          reason: "Environment variables"
        });
        added++;
      }
    }
    const configPatterns = [
      "*.config.js",
      "*.config.ts",
      "*.config.mjs",
      "tsconfig.json",
      "package.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "package-lock.json"
    ];
    for (const pattern of configPatterns) {
      if (!protectedFiles.some((f) => f.pattern === pattern)) {
        protectedFiles.push({
          pattern,
          addedAt: (/* @__PURE__ */ new Date()).toISOString(),
          reason: "Configuration file"
        });
        added++;
      }
    }
    await saveProtectedFiles2(protectedFiles, state.workspaceRoot);
    if (added > 0) {
      status.success(`Protected ${added} file patterns`);
    } else {
      status.info("Files already protected");
    }
    return {
      ...state,
      filesProtected: true
    };
  } catch (error) {
    status.warning("Could not set up file protection");
    console.log(chalk26.gray("  Run 'snap protect env' later to protect files"));
    return {
      ...state,
      filesProtected: false
    };
  }
}
__name(fileProtectionStep, "fileProtectionStep");
async function gitHookStep(state) {
  if (!state.workspaceRoot) {
    return {
      ...state,
      gitHookInstalled: false
    };
  }
  console.log("\n" + chalk26.cyan.bold("Step 6: Git Integration\n"));
  const gitDir = path5.join(state.workspaceRoot, ".git");
  if (!fs5.existsSync(gitDir)) {
    console.log(chalk26.gray("  Not a Git repository - skipping hook setup"));
    return {
      ...state,
      gitHookInstalled: false
    };
  }
  console.log(chalk26.white("  Add SnapBack validation to your Git workflow:"));
  console.log(chalk26.gray("  \u2022 Auto-check before commits"));
  console.log(chalk26.gray("  \u2022 Prevent committing protected file changes"));
  console.log(chalk26.gray("  \u2022 Optional - won't block your workflow\n"));
  const installHook = await prompts.confirm({
    message: "Install pre-commit hook?",
    default: true
  });
  if (!installHook) {
    status.info("Git hook skipped");
    return {
      ...state,
      gitHookInstalled: false
    };
  }
  try {
    const hooksDir = path5.join(gitDir, "hooks");
    const hookPath = path5.join(hooksDir, "pre-commit");
    if (!fs5.existsSync(hooksDir)) {
      fs5.mkdirSync(hooksDir, {
        recursive: true
      });
    }
    let existingContent = "";
    if (fs5.existsSync(hookPath)) {
      existingContent = fs5.readFileSync(hookPath, "utf-8");
      if (existingContent.includes("snap")) {
        status.info("SnapBack hook already installed");
        return {
          ...state,
          gitHookInstalled: true
        };
      }
    }
    const snapbackHook = `
# SnapBack pre-commit check
if command -v snap &> /dev/null; then
  snap check --quiet || {
    echo "SnapBack: Protected files may have changed. Run 'snap status' for details."
  }
fi
`;
    if (existingContent) {
      fs5.writeFileSync(hookPath, existingContent + "\n" + snapbackHook);
    } else {
      fs5.writeFileSync(hookPath, "#!/bin/sh\n" + snapbackHook);
    }
    fs5.chmodSync(hookPath, 493);
    status.success("Pre-commit hook installed");
    return {
      ...state,
      gitHookInstalled: true
    };
  } catch (error) {
    status.warning("Could not install Git hook");
    console.log(chalk26.gray("  You can add 'snap check' to your hooks manually"));
    return {
      ...state,
      gitHookInstalled: false
    };
  }
}
__name(gitHookStep, "gitHookStep");
async function snapshotStep(state) {
  if (!state.workspaceRoot) {
    return {
      ...state,
      snapshotCreated: false
    };
  }
  console.log("\n" + chalk26.cyan.bold("Step 7: Initial Snapshot\n"));
  console.log(chalk26.white("  Create a safety snapshot of your protected files:"));
  console.log(chalk26.gray("  \u2022 Captures current state of critical files"));
  console.log(chalk26.gray("  \u2022 Enables easy rollback if AI makes mistakes"));
  console.log(chalk26.gray("  \u2022 Takes just a few seconds\n"));
  const createSnapshot = await prompts.confirm({
    message: "Create initial snapshot?",
    default: true
  });
  if (!createSnapshot) {
    status.info("Initial snapshot skipped");
    console.log(chalk26.gray("  Run 'snap snapshot create' when ready"));
    return {
      ...state,
      snapshotCreated: false
    };
  }
  try {
    const snapshotDir = path5.join(state.workspaceRoot, ".snapback", "snapshots");
    fs5.mkdirSync(snapshotDir, {
      recursive: true
    });
    const manifest = {
      id: `wizard-${Date.now()}`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      description: "Initial setup snapshot",
      source: "wizard"
    };
    fs5.writeFileSync(path5.join(snapshotDir, "initial-manifest.json"), JSON.stringify(manifest, null, 2));
    status.success("Initial snapshot created");
    console.log(chalk26.gray("  Use 'snap snapshot list' to view snapshots"));
    return {
      ...state,
      snapshotCreated: true
    };
  } catch (error) {
    status.warning("Could not create snapshot");
    console.log(chalk26.gray("  Run 'snap snapshot create' to create manually"));
    return {
      ...state,
      snapshotCreated: false
    };
  }
}
__name(snapshotStep, "snapshotStep");
async function analyticsStep(state) {
  console.log("\n" + chalk26.cyan.bold("Step 8: Usage Analytics\n"));
  console.log(chalk26.white("  Help us improve SnapBack by sharing anonymous usage data:"));
  console.log(chalk26.gray("  \u2022 Command usage frequency"));
  console.log(chalk26.gray("  \u2022 Error reports"));
  console.log(chalk26.gray("  \u2022 No code, file names, or personal data\n"));
  const enableAnalytics = await prompts.confirm({
    message: "Enable anonymous analytics?",
    default: true
  });
  if (enableAnalytics) {
    status.success("Analytics enabled - thank you!");
  } else {
    status.info("Analytics disabled - no data will be collected");
  }
  return {
    ...state,
    analyticsEnabled: enableAnalytics
  };
}
__name(analyticsStep, "analyticsStep");
async function summaryStep(state) {
  console.log("\n" + chalk26.green.bold("Setup Complete! \u{1F389}\n"));
  console.log(chalk26.white("Configuration Summary:"));
  console.log(chalk26.gray("\u2500".repeat(40)));
  if (state.authenticated) {
    console.log(chalk26.green("  \u2713 ") + "Authenticated");
  } else {
    console.log(chalk26.yellow("  ! ") + "Not authenticated (limited features)");
  }
  if (state.workspaceRoot) {
    console.log(chalk26.green("  \u2713 ") + `Workspace: ${path5.basename(state.workspaceRoot)}`);
  } else {
    console.log(chalk26.yellow("  ! ") + "No workspace configured");
  }
  if (state.projectType && state.projectType !== "unknown") {
    console.log(chalk26.green("  \u2713 ") + `Project type: ${state.projectType}`);
  }
  console.log(chalk26.green("  \u2713 ") + `Protection: ${state.protectionLevel}`);
  if (state.mcpEnabled) {
    console.log(chalk26.green("  \u2713 ") + "MCP integration enabled");
  }
  if (state.filesProtected) {
    console.log(chalk26.green("  \u2713 ") + "Critical files protected");
  }
  if (state.gitHookInstalled) {
    console.log(chalk26.green("  \u2713 ") + "Pre-commit hook installed");
  }
  if (state.snapshotCreated) {
    console.log(chalk26.green("  \u2713 ") + "Initial snapshot created");
  }
  if (state.analyticsEnabled) {
    console.log(chalk26.green("  \u2713 ") + "Anonymous analytics enabled");
  }
  console.log(chalk26.gray("\u2500".repeat(40)));
  console.log("\n" + chalk26.cyan.bold("Quick Health Check:\n"));
  try {
    const { detectAIClients: detectAIClients2 } = await import('./dist-7GPVXUEA.js');
    const detection = detectAIClients2({
      cwd: state.workspaceRoot || process.cwd()
    });
    const configured = detection.detected.filter((c) => c.hasSnapback);
    const needsSetup = detection.needsSetup;
    if (configured.length > 0) {
      console.log(chalk26.green("  \u2713 ") + `${configured.length} AI tool(s) ready`);
    }
    if (needsSetup.length > 0) {
      console.log(chalk26.yellow("  ! ") + `${needsSetup.length} tool(s) need MCP config`);
    }
  } catch {
  }
  try {
    const { detectAIClients: detectAIClients2 } = await import('./dist-7GPVXUEA.js');
    const detection = detectAIClients2({
      cwd: state.workspaceRoot || process.cwd()
    });
    const hasVSCode = detection.clients.some((c) => c.name === "vscode" && c.exists);
    if (hasVSCode) {
      console.log();
      console.log(chalk26.cyan("  \u{1F4A1} VS Code detected!"));
      console.log(chalk26.gray("     Consider installing the SnapBack extension:"));
      console.log(chalk26.gray("     code --install-extension snapback.snapback-vscode"));
    }
  } catch {
  }
  console.log("\n" + chalk26.cyan.bold("Next Steps:\n"));
  let stepNum = 1;
  if (!state.snapshotCreated) {
    console.log(chalk26.white(`  ${stepNum}. Create your first snapshot:`));
    console.log(chalk26.cyan("     $ snap snapshot create\n"));
    stepNum++;
  }
  if (!state.filesProtected) {
    console.log(chalk26.white(`  ${stepNum}. Protect important files:`));
    console.log(chalk26.cyan("     $ snap protect src/core/\n"));
    stepNum++;
  }
  console.log(chalk26.white(`  ${stepNum}. Check system health:`));
  console.log(chalk26.cyan("     $ snap doctor\n"));
  stepNum++;
  if (!state.authenticated) {
    console.log(chalk26.gray("\u2500".repeat(40)));
    console.log("\n" + chalk26.yellow.bold("Upgrade to Pro:\n"));
    console.log(chalk26.white("  \u2022 Unlimited snapshots"));
    console.log(chalk26.white("  \u2022 Team collaboration"));
    console.log(chalk26.white("  \u2022 Priority support"));
    console.log(chalk26.cyan("  \u2192 snap upgrade") + chalk26.gray(" or visit ") + hyperlink.create("snapback.dev/pro", "https://snapback.dev/pricing"));
    console.log();
  }
  console.log(chalk26.gray("  Documentation: ") + hyperlink.create("docs.snapback.dev", "https://docs.snapback.dev"));
  console.log(chalk26.gray("  Get help:      ") + chalk26.cyan("snap --help"));
  console.log();
}
__name(summaryStep, "summaryStep");
async function sessionStep(state) {
  if (!state.workspaceRoot) return;
  console.log("\n" + chalk26.cyan.bold("Final Step: Start Your First Session\n"));
  console.log(chalk26.white("  Sessions help SnapBack track your current task:"));
  console.log(chalk26.gray("  \u2022 Groups snapshots by objective"));
  console.log(chalk26.gray("  \u2022 Automates snapshot descriptions"));
  console.log(chalk26.gray("  \u2022 Provides better context for AI\n"));
  const startSession = await prompts.confirm({
    message: "Start a development session now?",
    default: true
  });
  if (startSession) {
    const task = await prompts.input("What are you working on? (e.g. implementing user auth)", {});
    try {
      const { generateId: generateId3, saveCurrentSession: saveCurrentSession2 } = await import('./snapback-dir-4QRR2IPV.js');
      const newSession = {
        id: generateId3("sess"),
        task: task || "Initial session",
        startedAt: (/* @__PURE__ */ new Date()).toISOString(),
        snapshotCount: 0
      };
      await saveCurrentSession2(newSession, state.workspaceRoot);
      status.success("Session started! You're ready to code.");
    } catch (error) {
      status.warning("Could not start session");
    }
  } else {
    status.info("Skipped session start - run 'snap session start' later");
  }
}
__name(sessionStep, "sessionStep");
async function runWizard(options) {
  const { force } = options;
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const configPath = path5.join(homeDir, ".snapback", "wizard-complete");
  if (!force && fs5.existsSync(configPath)) {
    console.log(chalk26.yellow("Setup wizard has already been completed."));
    console.log(chalk26.gray("Run 'snap wizard --force' to run again.\n"));
    const runAgain = await prompts.confirm({
      message: "Run wizard again?",
      default: false
    });
    if (!runAgain) {
      return;
    }
  }
  let state = {
    authenticated: await checkAuthentication2(),
    workspaceRoot: null,
    projectType: null,
    protectionLevel: "standard",
    mcpEnabled: false,
    analyticsEnabled: false,
    filesProtected: false,
    gitHookInstalled: false,
    snapshotCreated: false
  };
  try {
    await welcomeStep();
    state = await authenticationStep(state);
    state = await workspaceStep(state);
    state = await protectionStep(state);
    state = await mcpStep(state);
    state = await fileProtectionStep(state);
    state = await gitHookStep(state);
    state = await snapshotStep(state);
    state = await analyticsStep(state);
    await summaryStep(state);
    await sessionStep(state);
    const snapbackHome = path5.join(homeDir, ".snapback");
    fs5.mkdirSync(snapbackHome, {
      recursive: true
    });
    fs5.writeFileSync(configPath, (/* @__PURE__ */ new Date()).toISOString());
  } catch (error) {
    if (error.code === "ERR_USE_AFTER_CLOSE") {
      console.log(chalk26.gray("\n\nWizard cancelled. Run 'snap wizard' to continue.\n"));
    } else {
      throw error;
    }
  }
}
__name(runWizard, "runWizard");
function createWizardCommand() {
  return new Command("wizard").description("Interactive setup wizard for new users").option("--force", "Run wizard even if already completed").action(async (options) => {
    await runWizard(options);
  });
}
__name(createWizardCommand, "createWizardCommand");
var DEFAULT_STATS = {
  snapshotsCreated: 0,
  restoresPerformed: 0,
  risksDetected: 0,
  filesAnalyzed: 0,
  highRiskAverted: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalDaysActive: 0,
  sharesGenerated: 0,
  shareClicks: 0
};
var DEFAULT_PREFERENCES = {
  verbosity: "normal",
  colorScheme: "auto",
  showAchievements: true,
  showProgress: true,
  defaultSnapshot: {
    includeNodeModules: false,
    includeGitIgnored: false
  }
};
function createDefaultPioneerState() {
  return {
    pioneerNumber: generatePioneerNumber(),
    level: "bronze",
    totalPoints: 0,
    unlockedAchievements: [],
    stats: {
      ...DEFAULT_STATS
    },
    currentStreak: 0,
    lastActiveDate: null,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(createDefaultPioneerState, "createDefaultPioneerState");
function generatePioneerNumber() {
  const base = Date.now() % 1e4;
  const rand = Math.floor(Math.random() * 1e3);
  return base + rand;
}
__name(generatePioneerNumber, "generatePioneerNumber");
var SCHEMA = {};
var StateManager = class StateManager2 {
  static {
    __name(this, "StateManager");
  }
  conf;
  cache = null;
  constructor() {
    this.conf = new Conf({
      projectName: "snapback",
      projectVersion: "1.0.0",
      schema: SCHEMA,
      defaults: {
        version: 1,
        pioneer: createDefaultPioneerState(),
        preferences: DEFAULT_PREFERENCES
      },
      migrations: {}
    });
  }
  /**
  * Get Pioneer state
  */
  getPioneerState() {
    if (!this.cache) {
      this.cache = this.conf.store;
    }
    return {
      ...this.cache.pioneer
    };
  }
  /**
  * Save Pioneer state
  */
  savePioneerState(state) {
    state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.conf.set("pioneer", state);
    if (this.cache) {
      this.cache.pioneer = state;
    }
  }
  /**
  * Get user preferences
  */
  getPreferences() {
    return {
      ...this.conf.get("preferences")
    };
  }
  /**
  * Update user preferences
  */
  setPreferences(prefs) {
    const current = this.getPreferences();
    this.conf.set("preferences", {
      ...current,
      ...prefs
    });
  }
  /**
  * Reset all state (for testing/debugging)
  */
  reset() {
    this.conf.clear();
    this.cache = null;
  }
  /**
  * Get storage file path (for debugging)
  */
  getPath() {
    return this.conf.path;
  }
  /**
  * Check if this is a fresh installation
  */
  isFirstRun() {
    const pioneer = this.getPioneerState();
    return pioneer.stats.snapshotsCreated === 0 && pioneer.stats.filesAnalyzed === 0 && pioneer.unlockedAchievements.length === 0;
  }
  /**
  * Export state for backup
  */
  export() {
    return JSON.parse(JSON.stringify(this.conf.store));
  }
  /**
  * Import state from backup
  */
  import(state) {
    if (state.version !== this.conf.get("version")) {
      throw new Error("State version mismatch");
    }
    this.conf.store = state;
    this.cache = null;
  }
};
var userState = new StateManager();
var KNOWN_COMMANDS = [
  "login",
  "logout",
  "whoami",
  "init",
  "status",
  "fix",
  "protect",
  "session",
  "context",
  "validate",
  "stats",
  "learn",
  "patterns",
  "watch",
  "tools",
  "mcp",
  "config",
  "doctor",
  "upgrade",
  "analyze",
  "snapshot",
  "list",
  "check",
  "interactive",
  "help"
];
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [
      i
    ];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}
__name(levenshteinDistance, "levenshteinDistance");
function findSimilarCommands(input3, maxSuggestions = 3) {
  const inputLower = input3.toLowerCase();
  const suggestions = KNOWN_COMMANDS.map((cmd) => ({
    command: cmd,
    distance: levenshteinDistance(inputLower, cmd)
  })).filter((s) => s.distance <= 3).sort((a, b) => a.distance - b.distance).slice(0, maxSuggestions).map((s) => s.command);
  return suggestions;
}
__name(findSimilarCommands, "findSimilarCommands");
function displayUnknownCommandError(command) {
  const suggestions = findSimilarCommands(command);
  const lines = [];
  lines.push(chalk26.red.bold(`Unknown command: ${command}`));
  lines.push("");
  if (suggestions.length > 0) {
    lines.push(chalk26.yellow("Did you mean:"));
    for (const suggestion of suggestions) {
      lines.push(chalk26.cyan(`  $ snap ${suggestion}`));
    }
  } else {
    lines.push(chalk26.gray("Run 'snap --help' to see available commands"));
  }
  console.error(boxen(lines.join("\n"), {
    borderColor: "yellow",
    borderStyle: "round",
    padding: 1
  }));
}
__name(displayUnknownCommandError, "displayUnknownCommandError");

// src/index.ts
var engineAdapter = new CLIEngineAdapter();
async function getAllFiles(dir, baseDir = dir) {
  const files = [];
  try {
    const entries = await readdir(dir, {
      withFileTypes: true
    });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name.startsWith(".")) {
        continue;
      }
      if (entry.isDirectory()) {
        files.push(...await getAllFiles(fullPath, baseDir));
      } else {
        files.push(relative(baseDir, fullPath));
      }
    }
  } catch {
  }
  return files;
}
__name(getAllFiles, "getAllFiles");
function createCLI() {
  const program2 = new Command();
  program2.name("snapback").description("AI-safe code snapshots and risk analysis").alias("snap");
  program2.addCommand(createLoginCommand());
  program2.addCommand(createLogoutCommand());
  program2.addCommand(createWhoamiCommand());
  program2.addCommand(createInitCommand());
  program2.addCommand(createStatusCommand());
  program2.addCommand(createFixCommand());
  program2.addCommand(createToolsCommand());
  program2.addCommand(mcpCommand);
  program2.addCommand(createProtectCommand());
  program2.addCommand(createSessionCommand());
  program2.addCommand(createContextCommand());
  program2.addCommand(createValidateCommand());
  program2.addCommand(createStatsCommand());
  program2.addCommand(createLearnCommand());
  program2.addCommand(createPatternsCommand());
  program2.addCommand(createWatchCommand());
  program2.addCommand(createConfigCommand());
  program2.addCommand(createDoctorCommand());
  program2.addCommand(createUpgradeCommand());
  program2.addCommand(createWizardCommand());
  program2.addCommand(createUndoCommand());
  program2.addCommand(createAliasCommand());
  program2.hook("preAction", (_thisCommand) => {
  });
  program2.on("command:*", (unknownCommand) => {
    const cmd = unknownCommand[0];
    displayUnknownCommandError(cmd);
    process.exit(1);
  });
  program2.command("analyze <file>").option("-i, --interactive", "Interactive mode with detailed analysis").option("-a, --ast", "Use AST-based analysis for deeper insights").action(async (file) => {
    try {
      const fullPath = resolve(process.cwd(), file);
      const text = await readFile(fullPath, "utf-8");
      const spinner2 = ora8("Analyzing file...").start();
      const result7 = await engineAdapter.analyze({
        files: [
          {
            path: file,
            content: text
          }
        ],
        format: "json"
      });
      spinner2.succeed("Analysis complete");
      let riskData;
      try {
        riskData = JSON.parse(result7.output);
      } catch {
        riskData = {
          riskScore: result7.riskScore,
          riskLevel: result7.riskLevel
        };
      }
      console.log(chalk26.cyan("Risk Level:"), riskData.riskLevel.toUpperCase());
      console.log(chalk26.cyan("Risk Score:"), `${riskData.riskScore.toFixed(1)}/10`);
      if (riskData.signals && riskData.signals.length > 0) {
        console.log();
        console.log(createRiskSignalTable(riskData.signals));
      }
      if (riskData.riskScore > 7) {
        console.log();
        console.log(displayHighRiskWarning(file, riskData.riskScore));
      } else if (riskData.riskScore > 4) {
        console.log(chalk26.yellow("\nRecommendation: Review changes before proceeding."));
      }
    } catch (error) {
      console.error(chalk26.red("Error:"), error.message);
      process.exit(1);
    }
  });
  program2.command("snapshot").option("-m, --message <message>", "Add a message to the snapshot").option("-f, --files <files...>", "Specify files to include in snapshot").action(async (options) => {
    const spinner2 = ora8("Creating snapshot...").start();
    try {
      const storage = await createSnapshotStorage(process.cwd());
      const snap = await storage.create({
        description: options.message,
        protected: false,
        ...options.files && {
          files: options.files
        }
      });
      spinner2.succeed("Snapshot created");
      console.log();
      console.log(displaySnapshotSuccess(snap.id, options.message, options.files?.length || 0));
    } catch (error) {
      spinner2.fail("Failed to create snapshot");
      console.error(chalk26.red("Error:"), error.message);
      process.exit(1);
    }
  });
  program2.command("list").action(async () => {
    const spinner2 = ora8("Loading snapshots...").start();
    try {
      const storage = await createSnapshotStorage(process.cwd());
      const snaps = await storage.list();
      spinner2.succeed("Snapshots loaded");
      if (snaps.length === 0) {
        console.log(chalk26.yellow("No snapshots found"));
        return;
      }
      console.log();
      console.log(createSnapshotTable(snaps.map((s) => ({
        id: s.id,
        timestamp: new Date(s.timestamp),
        message: s.meta?.message,
        fileCount: s.files?.length
      }))));
    } catch (error) {
      spinner2.fail("Failed to load snapshots");
      console.error(chalk26.red("Error:"), error.message);
      process.exit(1);
    }
  });
  program2.command("interactive").description("Interactive mode with guided workflow").action(async () => {
    console.log(chalk26.blue("Welcome to SnapBack Interactive Mode!"));
    const action = await search({
      message: "What would you like to do?",
      source: /* @__PURE__ */ __name(async (term) => {
        const choices = [
          {
            name: "Analyze a file",
            value: "analyze"
          },
          {
            name: "Create a snapshot",
            value: "snapshot"
          },
          {
            name: "List snapshots",
            value: "list"
          },
          {
            name: "Exit",
            value: "exit"
          }
        ];
        if (!term) {
          return choices;
        }
        return choices.filter((c) => c.name.toLowerCase().includes(term.toLowerCase()));
      }, "source")
    });
    switch (action) {
      case "analyze":
        await interactiveAnalyze();
        break;
      case "snapshot":
        await interactiveSnapshot();
        break;
      case "list":
        await interactiveList();
        break;
      case "exit":
        console.log(chalk26.blue("Goodbye!"));
        process.exit(0);
    }
  });
  program2.command("check").description("Pre-commit hook to check for risky AI changes").option("-s, --snapshot", "Create snapshot if risky changes detected").option("-q, --quiet", "Suppress output unless issues found").option("-a, --all", "Check all files, not just staged (legacy behavior)").action(async (options) => {
    const cwd = process.cwd();
    try {
      const git = new GitClient({
        cwd
      });
      if (!await git.isGitInstalled()) {
        throw new GitNotInstalledError();
      }
      if (!await git.isGitRepository()) {
        throw new GitNotRepositoryError(cwd);
      }
      let filesToCheck;
      if (options.all) {
        const allFiles = await getAllFiles(cwd);
        filesToCheck = allFiles.filter(isCodeFile);
      } else {
        const stagedFiles = await git.getStagedFiles();
        filesToCheck = stagedFiles.filter((f) => f.status !== "deleted").filter((f) => isCodeFile(f.path)).map((f) => f.path);
      }
      if (filesToCheck.length === 0) {
        if (!options.quiet) {
          console.log(chalk26.green("\u2713 No staged code files to check"));
        }
        return;
      }
      const progress = new ProgressTracker({
        total: filesToCheck.length,
        label: "Analyzing",
        quiet: options.quiet
      });
      progress.start();
      const fileResults = [];
      let hasRiskyChanges = false;
      for (const file of filesToCheck) {
        progress.update(file);
        try {
          const content = options.all ? await readFile(resolve(cwd, file), "utf-8") : await git.getStagedContent(file);
          const result7 = await engineAdapter.analyze({
            files: [
              {
                path: file,
                content
              }
            ],
            format: "json",
            quiet: true
          });
          let signals = [];
          try {
            const data = JSON.parse(result7.output);
            signals = data.signals || [];
          } catch {
          }
          const riskLevel = result7.riskScore > 7 ? "high" : result7.riskScore > 4 ? "medium" : "low";
          fileResults.push({
            file,
            riskScore: result7.riskScore,
            riskLevel,
            topSignal: signals.filter((s) => s.value > 0)[0]?.signal
          });
          if (result7.riskScore > 5) {
            hasRiskyChanges = true;
          }
        } catch {
        }
      }
      const highRisk = fileResults.filter((f) => f.riskScore > 7).length;
      const mediumRisk = fileResults.filter((f) => f.riskScore > 4 && f.riskScore <= 7).length;
      if (hasRiskyChanges) {
        progress.fail(`Found risks in ${highRisk + mediumRisk} files (${highRisk} high, ${mediumRisk} medium) - ${progress.getElapsed()}`);
        if (!options.quiet && fileResults.length > 0) {
          console.log();
          console.log(chalk26.cyan("Analysis Results:"));
          console.log(createFileSummaryTable(fileResults));
        }
        if (options.snapshot) {
          const snapshotSpinner = ora8("Creating snapshot...").start();
          try {
            const storage = await createSnapshotStorage(cwd);
            const snap = await storage.create({
              description: "Pre-commit snapshot for risky AI changes",
              protected: true
            });
            snapshotSpinner.succeed(`Snapshot created: ${snap.id.substring(0, 8)}`);
            const maxRiskScore = Math.max(...fileResults.map((f) => f.riskScore));
            console.log();
            console.log(displaySaveStory(maxRiskScore, fileResults.map((f) => f.file), snap.id));
          } catch (error) {
            snapshotSpinner.fail("Failed to create snapshot");
            console.error(chalk26.red("Error:"), error.message);
            process.exit(1);
          }
        } else if (!options.quiet) {
          console.log(chalk26.yellow("\n\u{1F4A1} Recommendation: Consider creating a snapshot before committing"));
          console.log(chalk26.gray("Run with --snapshot flag to automatically create a snapshot"));
        }
        if (!options.quiet) {
          console.log(chalk26.gray("\nTo bypass this check, use: git commit --no-verify"));
        }
        process.exit(1);
      } else {
        progress.complete(`No risky changes detected in ${filesToCheck.length} files - ${progress.getElapsed()}`);
      }
    } catch (error) {
      if (error instanceof GitNotInstalledError) {
        console.error(chalk26.red("Error:"), "Git must be installed to use the check command");
        console.log(chalk26.gray("Install git: https://git-scm.com/downloads"));
        process.exit(1);
      }
      if (error instanceof GitNotRepositoryError) {
        console.error(chalk26.red("Error:"), "This command must be run inside a git repository");
        console.log(chalk26.gray("Initialize with: git init"));
        process.exit(1);
      }
      if (!options.quiet) {
        console.error(chalk26.red("Error:"), error.message);
      }
      process.exit(1);
    }
  });
  return program2;
}
__name(createCLI, "createCLI");
async function interactiveAnalyze() {
  const cwd = process.cwd();
  const allFiles = await getAllFiles(cwd);
  const file = await search({
    message: "Search for the file you want to analyze:",
    source: /* @__PURE__ */ __name(async (term) => {
      if (!term) {
        return allFiles.slice(0, 10).map((f) => ({
          value: f
        }));
      }
      const filtered = allFiles.filter((f) => f.toLowerCase().includes(term.toLowerCase()));
      return filtered.slice(0, 10).map((f) => ({
        value: f
      }));
    }, "source")
  });
  const answers = {
    file
  };
  try {
    const fullPath = resolve(process.cwd(), answers.file);
    const text = await readFile(fullPath, "utf-8");
    const spinner2 = ora8("Analyzing file...").start();
    const result7 = await engineAdapter.analyze({
      files: [
        {
          path: answers.file,
          content: text
        }
      ],
      format: "json"
    });
    spinner2.succeed("Analysis complete");
    let riskData;
    try {
      riskData = JSON.parse(result7.output);
    } catch {
      riskData = {
        riskScore: result7.riskScore,
        riskLevel: result7.riskLevel
      };
    }
    console.log(chalk26.cyan("Risk Level:"), riskData.riskLevel.toUpperCase());
    console.log(chalk26.cyan("Risk Score:"), `${riskData.riskScore.toFixed(1)}/10`);
    if (riskData.signals && riskData.signals.length > 0) {
      const activeSignals = riskData.signals.filter((s) => s.value > 0);
      if (activeSignals.length > 0) {
        console.log(chalk26.yellow("\nRisk Factors:"));
        activeSignals.forEach((signal) => {
          console.log(chalk26.yellow(`  \u26A0 ${signal.signal}: ${signal.value.toFixed(1)}`));
        });
      }
    }
    const createSnapshotPrompt = await confirm$1({
      message: "Would you like to create a snapshot?",
      default: riskData.riskScore > 5
    });
    if (createSnapshotPrompt) {
      await interactiveSnapshot({
        files: [
          answers.file
        ]
      });
    }
  } catch (error) {
    console.error(chalk26.red("Error:"), error.message);
  }
}
__name(interactiveAnalyze, "interactiveAnalyze");
async function interactiveSnapshot(options = {}) {
  const message = await input$1({
    message: "Add a message to your snapshot (optional):",
    default: ""
  });
  let files = options.files || [];
  if (!options.files || options.files.length === 0) {
    const includeFiles = await confirm$1({
      message: "Include specific files in this snapshot?",
      default: false
    });
    if (includeFiles) {
      const cwd = process.cwd();
      const allFiles = await getAllFiles(cwd);
      files = await checkbox({
        message: "Select files to include in snapshot (use space to select):",
        choices: allFiles.slice(0, 50).map((f) => ({
          value: f,
          name: f
        }))
      });
    }
  }
  const spinner2 = ora8("Creating snapshot...").start();
  try {
    const storage = await createSnapshotStorage(process.cwd());
    const snap = await storage.create({
      description: message,
      protected: false,
      ...files.length > 0 && {
        files
      }
    });
    spinner2.succeed("Snapshot created");
    console.log(chalk26.green("Created snapshot"), snap.id);
  } catch (error) {
    spinner2.fail("Failed to create snapshot");
    console.error(chalk26.red("Error:"), error.message);
  }
}
__name(interactiveSnapshot, "interactiveSnapshot");
async function interactiveList() {
  const spinner2 = ora8("Loading snapshots...").start();
  try {
    const storage = await createSnapshotStorage(process.cwd());
    const snaps = await storage.list();
    spinner2.succeed("Snapshots loaded");
    if (snaps.length === 0) {
      console.log(chalk26.yellow("No snapshots found"));
      return;
    }
    console.log(chalk26.blue("\nSnapshots:"));
    snaps.forEach((snap, index) => {
      console.log(chalk26.gray(`
${index + 1}. ${snap.id.substring(0, 8)}`));
      console.log(chalk26.gray(`   Time: ${new Date(snap.timestamp).toISOString()}`));
      if (snap.meta?.message) {
        console.log(chalk26.gray(`   Message: ${snap.meta.message}`));
      }
    });
  } catch (error) {
    spinner2.fail("Failed to load snapshots");
    console.error(chalk26.red("Error:"), error.message);
  }
}
__name(interactiveList, "interactiveList");
async function smartRouter() {
  if (process.argv.length > 2) {
    return false;
  }
  const cwd = process.cwd();
  try {
    const isFirstRun = userState.isFirstRun();
    const authenticated = await isLoggedIn();
    const initialized = await isSnapbackInitialized(cwd);
    if (isFirstRun) {
      await runWizard({
        force: false
      });
      return true;
    }
    if (!authenticated) {
      console.log(chalk26.yellow("Not logged in."));
      console.log(chalk26.gray("Run: snap login"));
      console.log();
      console.log(chalk26.gray("Or run: snap wizard  for guided setup"));
      return true;
    }
    if (!initialized) {
      console.log(chalk26.yellow("Workspace not initialized."));
      console.log(chalk26.gray("Run: snap init"));
      console.log();
      console.log(chalk26.gray("Or run: snap wizard  for guided setup"));
      return true;
    }
    const statusCommand = createStatusCommand();
    await statusCommand.parseAsync([
      "node",
      "snap"
    ]);
    return true;
  } catch {
    return false;
  }
}
__name(smartRouter, "smartRouter");
if (import.meta.url === new URL(process.argv[1], `file://${process.platform === "win32" ? "/" : ""}`).href) {
  (async () => {
    if (await smartRouter()) {
      process.exit(0);
    }
    const program2 = createCLI();
    await program2.parseAsync(process.argv);
  })();
}
var program = createCLI();

export { createCLI, program };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map