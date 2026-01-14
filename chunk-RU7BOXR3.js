import { __name } from './chunk-WCQVDF3K.js';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { homedir, platform } from 'os';
import { resolve, dirname, join } from 'path';

var __defProp = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp(target, "name", {
  value,
  configurable: true
}), "__name");
var CLIENT_CONFIGS = {
  claude: /* @__PURE__ */ __name2((home) => {
    switch (platform()) {
      case "darwin":
        return [
          join(home, "Library/Application Support/Claude/claude_desktop_config.json")
        ];
      case "win32":
        return [
          join(process.env.APPDATA || "", "Claude/claude_desktop_config.json")
        ];
      default:
        return [
          join(home, ".config/Claude/claude_desktop_config.json")
        ];
    }
  }, "claude"),
  // Project-level first (user preference), then global fallback
  cursor: /* @__PURE__ */ __name2((_home, cwd) => [
    ...cwd ? [
      join(cwd, ".cursor/mcp.json")
    ] : [],
    join(_home, ".cursor/mcp.json")
  ], "cursor"),
  windsurf: /* @__PURE__ */ __name2((home) => [
    join(home, ".codeium/windsurf/mcp_config.json")
  ], "windsurf"),
  continue: /* @__PURE__ */ __name2((home) => [
    join(home, ".continue/config.json")
  ], "continue"),
  // New clients
  vscode: /* @__PURE__ */ __name2((_home, cwd) => [
    ...cwd ? [
      join(cwd, ".vscode/mcp.json")
    ] : []
  ], "vscode"),
  zed: /* @__PURE__ */ __name2((home) => [
    join(home, ".config/zed/settings.json")
  ], "zed"),
  cline: /* @__PURE__ */ __name2((home) => [
    join(home, ".cline/mcp.json")
  ], "cline"),
  gemini: /* @__PURE__ */ __name2((home) => [
    join(home, ".gemini/settings.json")
  ], "gemini"),
  aider: /* @__PURE__ */ __name2((home) => [
    join(home, ".aider/mcp.yaml")
  ], "aider"),
  "roo-code": /* @__PURE__ */ __name2((home) => [
    join(home, ".roo-code/mcp.json")
  ], "roo-code"),
  // Qoder (VS Code fork) - supports both project-level and global configs
  qoder: /* @__PURE__ */ __name2((home) => {
    switch (platform()) {
      case "darwin":
        return [
          join(home, "Library/Application Support/Qoder/SharedClientCache/extension/local/mcp.json")
        ];
      case "win32":
        return [
          join(process.env.APPDATA || "", "Qoder/mcp.json")
        ];
      default:
        return [
          join(home, ".config/Qoder/mcp.json")
        ];
    }
  }, "qoder")
};
var CLIENT_DISPLAY_NAMES = {
  claude: "Claude Desktop",
  cursor: "Cursor",
  windsurf: "Windsurf",
  continue: "Continue",
  vscode: "VS Code",
  zed: "Zed",
  cline: "Cline",
  gemini: "Gemini/Antigravity",
  aider: "Aider",
  "roo-code": "Roo Code",
  qoder: "Qoder"
};
function detectAIClients(options = {}) {
  const home = homedir();
  const cwd = options.cwd || process.cwd();
  const clients = [];
  const seenPaths = /* @__PURE__ */ new Set();
  for (const [name, getPaths] of Object.entries(CLIENT_CONFIGS)) {
    const paths = getPaths(home, cwd);
    for (const configPath of paths) {
      if (seenPaths.has(configPath)) {
        continue;
      }
      seenPaths.add(configPath);
      const exists = existsSync(configPath);
      let hasSnapback = false;
      if (exists) {
        try {
          const content = readFileSync(configPath, "utf-8");
          if (configPath.endsWith(".yaml") || configPath.endsWith(".yml")) {
            hasSnapback = content.includes("snapback");
          } else {
            const parsed = JSON.parse(content);
            hasSnapback = checkForSnapback(parsed, name);
          }
        } catch {
        }
      }
      clients.push({
        name,
        displayName: CLIENT_DISPLAY_NAMES[name] || name,
        configPath,
        exists,
        hasSnapback,
        format: name
      });
    }
  }
  const detected = clients.filter((c) => c.exists);
  const needsSetup = detected.filter((c) => !c.hasSnapback);
  return {
    clients,
    detected,
    needsSetup
  };
}
__name(detectAIClients, "detectAIClients");
__name2(detectAIClients, "detectAIClients");
function getClient(clientName) {
  const result = detectAIClients();
  return result.clients.find((c) => c.name === clientName && c.exists);
}
__name(getClient, "getClient");
__name2(getClient, "getClient");
function getConfiguredClients() {
  const result = detectAIClients();
  return result.detected.filter((c) => c.hasSnapback);
}
__name(getConfiguredClients, "getConfiguredClients");
__name2(getConfiguredClients, "getConfiguredClients");
function checkForSnapback(config, format) {
  if (!config || typeof config !== "object") {
    return false;
  }
  const configObj = config;
  switch (format) {
    case "claude":
    case "cursor":
    case "windsurf":
    case "vscode":
    case "cline":
    case "roo-code":
    case "qoder":
      if ("mcpServers" in configObj && typeof configObj.mcpServers === "object" && configObj.mcpServers !== null) {
        const servers = configObj.mcpServers;
        return "snapback" in servers;
      }
      return false;
    case "gemini":
    case "zed":
      if ("mcpServers" in configObj && typeof configObj.mcpServers === "object" && configObj.mcpServers !== null) {
        const servers = configObj.mcpServers;
        return "snapback" in servers;
      }
      return false;
    case "continue":
      if ("experimental" in configObj && typeof configObj.experimental === "object" && configObj.experimental !== null) {
        const experimental = configObj.experimental;
        if ("modelContextProtocolServers" in experimental && Array.isArray(experimental.modelContextProtocolServers)) {
          return experimental.modelContextProtocolServers.some((server) => typeof server === "object" && server !== null && server.name === "snapback");
        }
      }
      return false;
    case "aider":
      return false;
    default:
      return false;
  }
}
__name(checkForSnapback, "checkForSnapback");
__name2(checkForSnapback, "checkForSnapback");
function getClientConfigPath(clientName) {
  const getPaths = CLIENT_CONFIGS[clientName];
  if (!getPaths) {
    return void 0;
  }
  const paths = getPaths(homedir());
  return paths[0];
}
__name(getClientConfigPath, "getClientConfigPath");
__name2(getClientConfigPath, "getClientConfigPath");
function readClientConfig(client) {
  try {
    const content = readFileSync(client.configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return void 0;
  }
}
__name(readClientConfig, "readClientConfig");
__name2(readClientConfig, "readClientConfig");
function validateClientConfig(client) {
  const issues = [];
  if (!existsSync(client.configPath)) {
    issues.push({
      severity: "error",
      code: "CONFIG_NOT_FOUND",
      message: `Config file not found: ${client.configPath}`,
      fix: `Run: snap tools configure --${client.name}`
    });
    return {
      valid: false,
      issues
    };
  }
  let configContent;
  let parsedConfig;
  try {
    configContent = readFileSync(client.configPath, "utf-8");
  } catch (error) {
    issues.push({
      severity: "error",
      code: "CONFIG_READ_ERROR",
      message: `Cannot read config file: ${error instanceof Error ? error.message : "Unknown error"}`,
      fix: "Check file permissions"
    });
    return {
      valid: false,
      issues
    };
  }
  try {
    parsedConfig = JSON.parse(configContent);
  } catch (error) {
    issues.push({
      severity: "error",
      code: "CONFIG_PARSE_ERROR",
      message: `Invalid JSON in config file: ${error instanceof Error ? error.message : "Unknown error"}`,
      fix: `Edit ${client.configPath} to fix JSON syntax, or run: snap tools configure --${client.name} --force`
    });
    return {
      valid: false,
      issues
    };
  }
  if (!client.hasSnapback) {
    issues.push({
      severity: "warning",
      code: "SNAPBACK_NOT_CONFIGURED",
      message: "SnapBack MCP server not found in config",
      fix: `Run: snap tools configure --${client.name}`
    });
    return {
      valid: false,
      issues
    };
  }
  const snapbackConfig = extractSnapbackConfig(parsedConfig, client.format);
  if (!snapbackConfig) {
    issues.push({
      severity: "error",
      code: "SNAPBACK_CONFIG_INVALID",
      message: "SnapBack config found but cannot be parsed"
    });
    return {
      valid: false,
      issues
    };
  }
  validateSnapbackConfig(snapbackConfig, issues);
  if (snapbackConfig.command && snapbackConfig.args) {
    const workspaceIdx = snapbackConfig.args.indexOf("--workspace");
    if (workspaceIdx !== -1 && workspaceIdx + 1 < snapbackConfig.args.length) {
      const workspacePath = snapbackConfig.args[workspaceIdx + 1];
      const wsValidation = validateWorkspacePath(workspacePath);
      if (!wsValidation.exists) {
        issues.push({
          severity: "error",
          code: "WORKSPACE_NOT_FOUND",
          message: `Workspace path does not exist: ${workspacePath}`,
          fix: "Update workspace path or run: snap tools configure --force"
        });
      } else if (!wsValidation.hasMarkers) {
        issues.push({
          severity: "warning",
          code: "WORKSPACE_NO_MARKERS",
          message: `Workspace path has no markers (.git, package.json, .snapback): ${workspacePath}`,
          fix: "Run: snap init"
        });
      }
    }
  }
  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    config: snapbackConfig
  };
}
__name(validateClientConfig, "validateClientConfig");
__name2(validateClientConfig, "validateClientConfig");
function validateWorkspacePath(workspacePath) {
  const absPath = resolve(workspacePath);
  if (!existsSync(absPath)) {
    return {
      exists: false,
      hasMarkers: false,
      path: absPath
    };
  }
  const hasGit = existsSync(resolve(absPath, ".git"));
  const hasPackageJson = existsSync(resolve(absPath, "package.json"));
  const hasSnapback = existsSync(resolve(absPath, ".snapback"));
  return {
    exists: true,
    hasMarkers: hasGit || hasPackageJson || hasSnapback,
    path: absPath
  };
}
__name(validateWorkspacePath, "validateWorkspacePath");
__name2(validateWorkspacePath, "validateWorkspacePath");
function extractSnapbackConfig(parsed, format) {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const config = parsed;
  switch (format) {
    case "claude":
    case "cursor":
    case "windsurf":
    case "vscode":
    case "cline":
    case "roo-code":
    case "qoder":
    case "gemini":
    case "zed":
      if ("mcpServers" in config && typeof config.mcpServers === "object" && config.mcpServers !== null) {
        const servers = config.mcpServers;
        if ("snapback" in servers) {
          return servers.snapback;
        }
      }
      return null;
    case "continue":
      if ("experimental" in config && typeof config.experimental === "object" && config.experimental !== null) {
        const experimental = config.experimental;
        if ("modelContextProtocolServers" in experimental && Array.isArray(experimental.modelContextProtocolServers)) {
          const server = experimental.modelContextProtocolServers.find((s) => typeof s === "object" && s !== null && s.name === "snapback");
          return server ? server : null;
        }
      }
      return null;
    default:
      return null;
  }
}
__name(extractSnapbackConfig, "extractSnapbackConfig");
__name2(extractSnapbackConfig, "extractSnapbackConfig");
function validateSnapbackConfig(config, issues) {
  if (!config.command && !config.url) {
    issues.push({
      severity: "error",
      code: "MISSING_COMMAND_OR_URL",
      message: "Config must have either 'command' (stdio) or 'url' (HTTP)",
      fix: "Run: snap tools configure --force"
    });
    return;
  }
  if (config.command) {
    if (!config.args || !Array.isArray(config.args)) {
      issues.push({
        severity: "error",
        code: "MISSING_ARGS",
        message: "Command-based config must have 'args' array",
        fix: "Run: snap tools configure --force"
      });
    } else {
      if (!config.args.includes("mcp")) {
        issues.push({
          severity: "error",
          code: "MISSING_MCP_ARG",
          message: "Args must include 'mcp' command",
          fix: "Run: snap tools configure --force"
        });
      }
      if (!config.args.includes("--stdio")) {
        issues.push({
          severity: "error",
          code: "MISSING_STDIO_ARG",
          message: "Args must include '--stdio' flag",
          fix: "Run: snap tools configure --force"
        });
      }
      if (!config.args.includes("--workspace")) {
        issues.push({
          severity: "warning",
          code: "MISSING_WORKSPACE_ARG",
          message: "Args should include '--workspace' path for reliability",
          fix: "Run: snap tools configure --force"
        });
      }
    }
  }
  if (config.url) {
    try {
      new URL(config.url);
    } catch {
      issues.push({
        severity: "error",
        code: "INVALID_URL",
        message: `Invalid server URL: ${config.url}`,
        fix: "Run: snap tools configure --force"
      });
    }
  }
  if (config.env) {
    if (!config.env.SNAPBACK_API_KEY && !config.env.SNAPBACK_WORKSPACE_ID) {
      issues.push({
        severity: "info",
        code: "NO_AUTH",
        message: "No API key or workspace ID found (free tier will be used)"
      });
    }
  }
}
__name(validateSnapbackConfig, "validateSnapbackConfig");
__name2(validateSnapbackConfig, "validateSnapbackConfig");
function getSnapbackMCPConfig(options = {}) {
  const { apiKey, workspaceId, serverUrl, useBinary = false, customCommand, additionalEnv, workspaceRoot, useLocalDev = false, localCliPath } = options;
  const env = {
    ...additionalEnv
  };
  if (workspaceId) {
    env.SNAPBACK_WORKSPACE_ID = workspaceId;
  }
  if (apiKey) {
    env.SNAPBACK_API_KEY = apiKey;
  }
  if (customCommand) {
    return {
      command: customCommand,
      args: [],
      ...Object.keys(env).length > 0 && {
        env
      }
    };
  }
  if (serverUrl || !useLocalDev && !useBinary) {
    const url = serverUrl || "https://snapback-mcp.fly.dev";
    return {
      url,
      ...Object.keys(env).length > 0 && {
        env
      }
    };
  }
  if (useLocalDev && localCliPath) {
    const tier = apiKey ? "pro" : "free";
    const args = [
      localCliPath,
      "mcp",
      "--stdio",
      "--tier",
      tier
    ];
    if (workspaceRoot) {
      args.push("--workspace", workspaceRoot);
    }
    return {
      command: "node",
      args,
      ...Object.keys(env).length > 0 && {
        env
      }
    };
  }
  if (useBinary) {
    const tier = apiKey ? "pro" : "free";
    const args = [
      "mcp",
      "--stdio",
      "--tier",
      tier
    ];
    if (workspaceRoot) {
      args.push("--workspace", workspaceRoot);
    }
    return {
      command: "snapback",
      args,
      ...Object.keys(env).length > 0 && {
        env
      }
    };
  }
  return {
    url: "https://snapback-mcp.fly.dev",
    ...Object.keys(env).length > 0 && {
      env
    }
  };
}
__name(getSnapbackMCPConfig, "getSnapbackMCPConfig");
__name2(getSnapbackMCPConfig, "getSnapbackMCPConfig");
function writeClientConfig(client, mcpConfig) {
  try {
    const configDir = dirname(client.configPath);
    mkdirSync(configDir, {
      recursive: true
    });
    let existingConfig = {
      mcpServers: {}
    };
    let hasExistingConfig = false;
    if (existsSync(client.configPath)) {
      try {
        const content = readFileSync(client.configPath, "utf-8");
        existingConfig = JSON.parse(content);
        hasExistingConfig = Object.keys(existingConfig).length > 0;
      } catch {
      }
    }
    let backup;
    if (hasExistingConfig) {
      backup = `${client.configPath}.backup.${Date.now()}`;
      writeFileSync(backup, JSON.stringify(existingConfig, null, 2));
    }
    const newConfig = mergeConfig(existingConfig, mcpConfig, client.format);
    writeFileSync(client.configPath, JSON.stringify(newConfig, null, 2));
    return {
      success: true,
      backup
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
__name(writeClientConfig, "writeClientConfig");
__name2(writeClientConfig, "writeClientConfig");
function removeSnapbackConfig(client) {
  try {
    if (!existsSync(client.configPath)) {
      return {
        success: true
      };
    }
    const content = readFileSync(client.configPath, "utf-8");
    const config = JSON.parse(content);
    switch (client.format) {
      case "claude":
      case "cursor":
      case "windsurf":
        if (config.mcpServers?.snapback) {
          delete config.mcpServers.snapback;
        }
        break;
      case "continue": {
        const experimental = config.experimental;
        if (experimental?.modelContextProtocolServers) {
          const servers = experimental.modelContextProtocolServers;
          experimental.modelContextProtocolServers = servers.filter((s) => s.name !== "snapback");
        }
        break;
      }
    }
    writeFileSync(client.configPath, JSON.stringify(config, null, 2));
    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
__name(removeSnapbackConfig, "removeSnapbackConfig");
__name2(removeSnapbackConfig, "removeSnapbackConfig");
function mergeConfig(existing, snapbackConfig, format) {
  switch (format) {
    case "claude":
    case "cursor":
    case "windsurf":
    case "vscode":
    case "cline":
    case "roo-code":
    case "gemini":
    case "zed":
    case "qoder":
      return {
        ...existing,
        mcpServers: {
          ...existing.mcpServers || {},
          snapback: snapbackConfig
        }
      };
    case "continue": {
      const continueConfig = existing;
      const experimental = continueConfig.experimental || {};
      const servers = experimental.modelContextProtocolServers || [];
      const filteredServers = servers.filter((s) => s.name !== "snapback");
      filteredServers.push({
        name: "snapback",
        ...snapbackConfig
      });
      return {
        ...continueConfig,
        experimental: {
          ...experimental,
          modelContextProtocolServers: filteredServers
        }
      };
    }
    case "aider":
      return existing;
    default:
      return {
        ...existing,
        mcpServers: {
          ...existing.mcpServers || {},
          snapback: snapbackConfig
        }
      };
  }
}
__name(mergeConfig, "mergeConfig");
__name2(mergeConfig, "mergeConfig");
function validateConfig(client) {
  try {
    const content = readFileSync(client.configPath, "utf-8");
    const config = JSON.parse(content);
    switch (client.format) {
      case "claude":
      case "cursor":
      case "windsurf":
      case "vscode":
      case "cline":
      case "roo-code":
      case "gemini":
      case "zed":
      case "qoder":
        return Boolean(config.mcpServers?.snapback?.command || config.mcpServers?.snapback?.url);
      case "continue": {
        const expCfg = config.experimental;
        const srvs = expCfg?.modelContextProtocolServers;
        return Boolean(srvs?.some((s) => s.name === "snapback" && (s.command || s.url)));
      }
      case "aider":
        return false;
      default:
        return false;
    }
  } catch {
    return false;
  }
}
__name(validateConfig, "validateConfig");
__name2(validateConfig, "validateConfig");
function repairClientConfig(client, options = {}) {
  const fixed = [];
  const remaining = [];
  const validation = validateClientConfig(client);
  if (options.force) {
    return performFullReconfiguration(client, options);
  }
  if (validation.valid && validation.issues.length === 0) {
    return {
      success: true,
      fixed: [],
      remaining: []
    };
  }
  for (const issue of validation.issues) {
    const fixResult = attemptFix(client, issue, validation, options);
    if (fixResult.success) {
      fixed.push(issue.message);
    } else {
      remaining.push(issue.message);
    }
  }
  const hasCriticalErrors = remaining.some((msg) => validation.issues.find((i) => i.message === msg && i.severity === "error"));
  if (hasCriticalErrors) {
    return performFullReconfiguration(client, options);
  }
  return {
    success: remaining.length === 0,
    fixed,
    remaining
  };
}
__name(repairClientConfig, "repairClientConfig");
__name2(repairClientConfig, "repairClientConfig");
function injectWorkspacePath(client, workspaceRoot) {
  const fixed = [];
  const remaining = [];
  const detectedWorkspace = workspaceRoot || detectWorkspaceRoot(process.cwd());
  if (!detectedWorkspace) {
    return {
      success: false,
      fixed,
      remaining: [
        "Could not auto-detect workspace root"
      ],
      error: "No workspace markers found (.git, package.json, .snapback)"
    };
  }
  if (!existsSync(detectedWorkspace)) {
    return {
      success: false,
      fixed,
      remaining: [
        `Workspace path does not exist: ${detectedWorkspace}`
      ],
      error: "Invalid workspace path"
    };
  }
  const validation = validateClientConfig(client);
  if (!validation.config) {
    return {
      success: false,
      fixed,
      remaining: [
        "No existing SnapBack config found"
      ],
      error: "Must run initial configuration first"
    };
  }
  if (!validation.config.command) {
    return {
      success: true,
      fixed: [
        "Config uses HTTP transport - no workspace path needed"
      ],
      remaining: []
    };
  }
  const hasWorkspace = validation.config.args?.includes("--workspace");
  if (hasWorkspace) {
    fixed.push("Workspace path already configured");
    return {
      success: true,
      fixed,
      remaining
    };
  }
  const result = performFullReconfiguration(client, {
    workspaceRoot: detectedWorkspace
  });
  if (result.success) {
    fixed.push(`Injected workspace path: ${detectedWorkspace}`);
  }
  return {
    success: result.success,
    fixed,
    remaining
  };
}
__name(injectWorkspacePath, "injectWorkspacePath");
__name2(injectWorkspacePath, "injectWorkspacePath");
function attemptFix(client, issue, _validation, options) {
  switch (issue.code) {
    case "CONFIG_NOT_FOUND":
    case "CONFIG_PARSE_ERROR":
    case "SNAPBACK_NOT_CONFIGURED":
    case "MISSING_COMMAND_OR_URL":
    case "MISSING_ARGS":
    case "MISSING_MCP_ARG":
    case "MISSING_STDIO_ARG":
    case "INVALID_URL":
      return performFullReconfiguration(client, options);
    case "MISSING_WORKSPACE_ARG": {
      const workspace = options.workspaceRoot || detectWorkspaceRoot(process.cwd());
      if (workspace) {
        return performFullReconfiguration(client, {
          ...options,
          workspaceRoot: workspace
        });
      }
      return {
        success: false
      };
    }
    case "WORKSPACE_NOT_FOUND": {
      const detected = detectWorkspaceRoot(process.cwd());
      if (detected) {
        return performFullReconfiguration(client, {
          ...options,
          workspaceRoot: detected
        });
      }
      return {
        success: false
      };
    }
    case "WORKSPACE_NO_MARKERS":
      return {
        success: true
      };
    case "NO_AUTH":
      return {
        success: true
      };
    default:
      return {
        success: false
      };
  }
}
__name(attemptFix, "attemptFix");
__name2(attemptFix, "attemptFix");
function performFullReconfiguration(client, options) {
  try {
    const workspaceRoot = options.workspaceRoot || detectWorkspaceRoot(process.cwd());
    const mcpConfig = getSnapbackMCPConfig({
      apiKey: options.apiKey,
      workspaceId: options.workspaceId,
      workspaceRoot: workspaceRoot || void 0,
      useLocalDev: true,
      localCliPath: findCliPath()
    });
    const writeResult = writeClientConfig(client, mcpConfig);
    if (writeResult.success) {
      return {
        success: true,
        fixed: [
          "Full reconfiguration completed"
        ],
        remaining: []
      };
    }
    return {
      success: false,
      fixed: [],
      remaining: [
        "Write failed"
      ],
      error: writeResult.error
    };
  } catch (error) {
    return {
      success: false,
      fixed: [],
      remaining: [
        "Reconfiguration failed"
      ],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
__name(performFullReconfiguration, "performFullReconfiguration");
__name2(performFullReconfiguration, "performFullReconfiguration");
function detectWorkspaceRoot(startPath) {
  let currentPath = resolve(startPath);
  const maxIterations = 50;
  let iterations = 0;
  while (iterations < maxIterations) {
    iterations++;
    const hasGit = existsSync(resolve(currentPath, ".git"));
    const hasPackageJson = existsSync(resolve(currentPath, "package.json"));
    const hasSnapback = existsSync(resolve(currentPath, ".snapback"));
    if (hasGit || hasPackageJson || hasSnapback) {
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
__name(detectWorkspaceRoot, "detectWorkspaceRoot");
__name2(detectWorkspaceRoot, "detectWorkspaceRoot");
function findCliPath() {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "apps/cli/dist/index.js"),
    resolve(cwd, "dist/index.js"),
    resolve(cwd, "../cli/dist/index.js"),
    resolve(cwd, "../../apps/cli/dist/index.js")
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }
  return void 0;
}
__name(findCliPath, "findCliPath");
__name2(findCliPath, "findCliPath");

export { detectAIClients, getClient, getClientConfigPath, getConfiguredClients, getSnapbackMCPConfig, injectWorkspacePath, readClientConfig, removeSnapbackConfig, repairClientConfig, validateClientConfig, validateConfig, validateWorkspacePath, writeClientConfig };
//# sourceMappingURL=chunk-RU7BOXR3.js.map
//# sourceMappingURL=chunk-RU7BOXR3.js.map