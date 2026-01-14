import { __name } from './chunk-WCQVDF3K.js';
import { mkdir, writeFile, access, constants, readFile, appendFile, stat } from 'fs/promises';
import { homedir } from 'os';
import { join, dirname } from 'path';

var SNAPBACK_DIR = ".snapback";
var GLOBAL_SNAPBACK_DIR = ".snapback";
function getGlobalDir() {
  return join(homedir(), GLOBAL_SNAPBACK_DIR);
}
__name(getGlobalDir, "getGlobalDir");
function getWorkspaceDir(workspaceRoot) {
  return join(workspaceRoot || process.cwd(), SNAPBACK_DIR);
}
__name(getWorkspaceDir, "getWorkspaceDir");
function getGlobalPath(relativePath) {
  return join(getGlobalDir(), relativePath);
}
__name(getGlobalPath, "getGlobalPath");
function getWorkspacePath(relativePath, workspaceRoot) {
  return join(getWorkspaceDir(workspaceRoot), relativePath);
}
__name(getWorkspacePath, "getWorkspacePath");
async function createSnapbackDirectory(workspaceRoot) {
  const baseDir = getWorkspaceDir(workspaceRoot);
  const dirs = [
    "",
    "patterns",
    "learnings",
    "session",
    "snapshots"
  ];
  for (const dir of dirs) {
    await mkdir(join(baseDir, dir), {
      recursive: true
    });
  }
  const gitignore = `# SnapBack Directory
# Ignore snapshot content (large binary data)
snapshots/
embeddings.db

# Keep these for team sharing
!patterns/
!learnings/
!vitals.json
!config.json
!protected.json
`.trim();
  await writeFile(join(baseDir, ".gitignore"), gitignore);
}
__name(createSnapbackDirectory, "createSnapbackDirectory");
async function createGlobalDirectory() {
  const baseDir = getGlobalDir();
  const dirs = [
    "",
    "cache",
    "mcp-configs"
  ];
  for (const dir of dirs) {
    await mkdir(join(baseDir, dir), {
      recursive: true
    });
  }
}
__name(createGlobalDirectory, "createGlobalDirectory");
async function isSnapbackInitialized(workspaceRoot) {
  try {
    const configPath = getWorkspacePath("config.json", workspaceRoot);
    await access(configPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
__name(isSnapbackInitialized, "isSnapbackInitialized");
async function isLoggedIn() {
  try {
    const credentials = await readGlobalJson("credentials.json");
    if (!credentials?.accessToken) {
      return false;
    }
    if (credentials.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt);
      if (expiresAt < /* @__PURE__ */ new Date()) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
__name(isLoggedIn, "isLoggedIn");
async function readSnapbackJson(relativePath, workspaceRoot) {
  try {
    const content = await readFile(getWorkspacePath(relativePath, workspaceRoot), "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
__name(readSnapbackJson, "readSnapbackJson");
async function writeSnapbackJson(relativePath, data, workspaceRoot) {
  const fullPath = getWorkspacePath(relativePath, workspaceRoot);
  await mkdir(dirname(fullPath), {
    recursive: true
  });
  await writeFile(fullPath, JSON.stringify(data, null, 2));
}
__name(writeSnapbackJson, "writeSnapbackJson");
async function appendSnapbackJsonl(relativePath, data, workspaceRoot) {
  const fullPath = getWorkspacePath(relativePath, workspaceRoot);
  await mkdir(dirname(fullPath), {
    recursive: true
  });
  await appendFile(fullPath, `${JSON.stringify(data)}
`);
}
__name(appendSnapbackJsonl, "appendSnapbackJsonl");
async function loadSnapbackJsonl(relativePath, workspaceRoot) {
  try {
    const content = await readFile(getWorkspacePath(relativePath, workspaceRoot), "utf-8");
    return content.split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}
__name(loadSnapbackJsonl, "loadSnapbackJsonl");
async function readGlobalJson(relativePath) {
  try {
    const content = await readFile(getGlobalPath(relativePath), "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
__name(readGlobalJson, "readGlobalJson");
async function writeGlobalJson(relativePath, data) {
  const fullPath = getGlobalPath(relativePath);
  await mkdir(dirname(fullPath), {
    recursive: true
  });
  await writeFile(fullPath, JSON.stringify(data, null, 2));
}
__name(writeGlobalJson, "writeGlobalJson");
async function deleteGlobalJson(relativePath) {
  const fullPath = getGlobalPath(relativePath);
  try {
    const { unlink } = await import('fs/promises');
    await unlink(fullPath);
  } catch {
  }
}
__name(deleteGlobalJson, "deleteGlobalJson");
async function getWorkspaceConfig(workspaceRoot) {
  return readSnapbackJson("config.json", workspaceRoot);
}
__name(getWorkspaceConfig, "getWorkspaceConfig");
async function saveWorkspaceConfig(config, workspaceRoot) {
  await writeSnapbackJson("config.json", config, workspaceRoot);
}
__name(saveWorkspaceConfig, "saveWorkspaceConfig");
async function getWorkspaceVitals(workspaceRoot) {
  return readSnapbackJson("vitals.json", workspaceRoot);
}
__name(getWorkspaceVitals, "getWorkspaceVitals");
async function saveWorkspaceVitals(vitals, workspaceRoot) {
  await writeSnapbackJson("vitals.json", vitals, workspaceRoot);
}
__name(saveWorkspaceVitals, "saveWorkspaceVitals");
async function getProtectedFiles(workspaceRoot) {
  return await readSnapbackJson("protected.json", workspaceRoot) ?? [];
}
__name(getProtectedFiles, "getProtectedFiles");
async function saveProtectedFiles(files, workspaceRoot) {
  await writeSnapbackJson("protected.json", files, workspaceRoot);
}
__name(saveProtectedFiles, "saveProtectedFiles");
async function getCurrentSession(workspaceRoot) {
  return readSnapbackJson("session/current.json", workspaceRoot);
}
__name(getCurrentSession, "getCurrentSession");
async function saveCurrentSession(session, workspaceRoot) {
  await writeSnapbackJson("session/current.json", session, workspaceRoot);
}
__name(saveCurrentSession, "saveCurrentSession");
async function endCurrentSession(workspaceRoot) {
  const fullPath = getWorkspacePath("session/current.json", workspaceRoot);
  try {
    const { unlink } = await import('fs/promises');
    await unlink(fullPath);
  } catch {
  }
}
__name(endCurrentSession, "endCurrentSession");
async function recordLearning(learning, workspaceRoot) {
  await appendSnapbackJsonl("learnings/user-learnings.jsonl", learning, workspaceRoot);
}
__name(recordLearning, "recordLearning");
async function getLearnings(workspaceRoot) {
  return loadSnapbackJsonl("learnings/user-learnings.jsonl", workspaceRoot);
}
__name(getLearnings, "getLearnings");
async function recordViolation(violation, workspaceRoot) {
  await appendSnapbackJsonl("patterns/violations.jsonl", violation, workspaceRoot);
}
__name(recordViolation, "recordViolation");
async function getViolations(workspaceRoot) {
  return loadSnapbackJsonl("patterns/violations.jsonl", workspaceRoot);
}
__name(getViolations, "getViolations");
async function getCredentials() {
  try {
    const { getCredentialsSecure } = await import('./secure-credentials-YKZHAZNB.js');
    return await getCredentialsSecure();
  } catch {
    return readGlobalJson("credentials.json");
  }
}
__name(getCredentials, "getCredentials");
async function saveCredentials(credentials) {
  try {
    const { saveCredentialsSecure } = await import('./secure-credentials-YKZHAZNB.js');
    return await saveCredentialsSecure(credentials);
  } catch {
    await createGlobalDirectory();
    await writeGlobalJson("credentials.json", credentials);
  }
}
__name(saveCredentials, "saveCredentials");
async function clearCredentials() {
  try {
    const { clearCredentialsSecure } = await import('./secure-credentials-YKZHAZNB.js');
    return await clearCredentialsSecure();
  } catch {
    await deleteGlobalJson("credentials.json");
  }
}
__name(clearCredentials, "clearCredentials");
async function getGlobalConfig() {
  return readGlobalJson("config.json");
}
__name(getGlobalConfig, "getGlobalConfig");
async function saveGlobalConfig(config) {
  await createGlobalDirectory();
  await writeGlobalJson("config.json", config);
}
__name(saveGlobalConfig, "saveGlobalConfig");
async function findWorkspaceRoot(startDir) {
  let currentDir = startDir || process.cwd();
  const maxDepth = 10;
  let depth = 0;
  while (depth < maxDepth) {
    try {
      await access(join(currentDir, SNAPBACK_DIR), constants.F_OK);
      return currentDir;
    } catch {
    }
    try {
      await access(join(currentDir, "package.json"), constants.F_OK);
      return currentDir;
    } catch {
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
    depth++;
  }
  return null;
}
__name(findWorkspaceRoot, "findWorkspaceRoot");
async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
__name(pathExists, "pathExists");
async function getStats(path) {
  try {
    const stats = await stat(path);
    return {
      size: stats.size,
      modifiedAt: stats.mtime
    };
  } catch {
    return null;
  }
}
__name(getStats, "getStats");

export { appendSnapbackJsonl, clearCredentials, createGlobalDirectory, createSnapbackDirectory, deleteGlobalJson, endCurrentSession, findWorkspaceRoot, getCredentials, getCurrentSession, getGlobalConfig, getGlobalDir, getGlobalPath, getLearnings, getProtectedFiles, getStats, getViolations, getWorkspaceConfig, getWorkspaceDir, getWorkspacePath, getWorkspaceVitals, isLoggedIn, isSnapbackInitialized, loadSnapbackJsonl, pathExists, readGlobalJson, readSnapbackJson, recordLearning, recordViolation, saveCredentials, saveCurrentSession, saveGlobalConfig, saveProtectedFiles, saveWorkspaceConfig, saveWorkspaceVitals, writeGlobalJson, writeSnapbackJson };
//# sourceMappingURL=chunk-KSPLKCVF.js.map
//# sourceMappingURL=chunk-KSPLKCVF.js.map