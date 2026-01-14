import { __name } from './chunk-WCQVDF3K.js';
import * as eslintParser from '@typescript-eslint/parser';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { dirname, relative, basename } from 'path';

var SyntaxAnalyzer = class {
  static {
    __name(this, "SyntaxAnalyzer");
  }
  id = "syntax";
  name = "Syntax Analysis";
  filePatterns = [
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx"
  ];
  async analyze(context) {
    const startTime = performance.now();
    const issues = [];
    let filesAnalyzed = 0;
    let nodesVisited = 0;
    const parseErrors = [];
    for (const [file, content] of context.contents) {
      if (!this.shouldAnalyzeFile(file)) continue;
      filesAnalyzed++;
      try {
        const ast = eslintParser.parse(content, {
          sourceType: "module",
          ecmaFeatures: {
            jsx: file.endsWith(".tsx") || file.endsWith(".jsx")
          },
          ecmaVersion: "latest",
          // Error recovery mode to get partial AST even with errors
          errorOnUnknownASTType: false
        });
        nodesVisited += this.countNodes(ast);
        this.checkSyntaxPatterns(content, file, issues);
      } catch (error) {
        const parseError = this.extractParseError(error);
        parseErrors.push(`${file}: ${parseError.message}`);
        issues.push({
          id: `syntax/parse-error/${file}/${parseError.line}`,
          severity: "critical",
          type: "SYNTAX_ERROR",
          message: parseError.message,
          file,
          line: parseError.line,
          column: parseError.column,
          fix: "Fix the syntax error to allow parsing"
        });
      }
    }
    return {
      analyzer: this.id,
      success: true,
      issues,
      coverage: filesAnalyzed / Math.max(context.files.length, 1),
      duration: performance.now() - startTime,
      metadata: {
        filesAnalyzed,
        nodesVisited,
        parseErrors
      }
    };
  }
  shouldRun(context) {
    return context.files.some((f) => this.shouldAnalyzeFile(f));
  }
  shouldAnalyzeFile(file) {
    const ext = file.split(".").pop()?.toLowerCase();
    return [
      "ts",
      "tsx",
      "js",
      "jsx"
    ].includes(ext || "");
  }
  /**
   * Extract parse error information from parser exception
   */
  extractParseError(error) {
    if (error instanceof Error) {
      const match = error.message.match(/\((\d+):(\d+)\)/);
      if (match) {
        return {
          message: error.message,
          line: Number.parseInt(match[1], 10),
          column: Number.parseInt(match[2], 10)
        };
      }
      return {
        message: error.message,
        line: 1,
        column: 1
      };
    }
    return {
      message: String(error),
      line: 1,
      column: 1
    };
  }
  /**
   * Count AST nodes for coverage metrics
   */
  countNodes(node) {
    if (!node || typeof node !== "object") return 0;
    let count = 1;
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          count += this.countNodes(item);
        }
      } else if (value && typeof value === "object" && "type" in value) {
        count += this.countNodes(value);
      }
    }
    return count;
  }
  /**
   * Check for additional syntax patterns that may indicate issues
   */
  checkSyntaxPatterns(content, file, issues) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      if (line.includes(";;")) {
        issues.push({
          id: `syntax/double-semicolon/${file}/${lineNum}`,
          severity: "low",
          type: "SYNTAX_WARNING",
          message: "Double semicolon detected",
          file,
          line: lineNum,
          column: line.indexOf(";;") + 1,
          fix: "Remove extra semicolon",
          snippet: line.trim()
        });
      }
      if (/console\.assert\([^,]+,\s*\)/.test(line)) {
        issues.push({
          id: `syntax/empty-assert/${file}/${lineNum}`,
          severity: "medium",
          type: "SYNTAX_WARNING",
          message: "console.assert with empty message",
          file,
          line: lineNum,
          fix: "Add assertion message for debugging",
          snippet: line.trim()
        });
      }
      if (/if\s*\([^=]*=\s*[^=]/.test(line) && !/if\s*\([^=]*[=!]==/.test(line)) {
        const assignMatch = line.match(/if\s*\(\s*(\w+)\s*=\s*[^=]/);
        if (assignMatch) {
          issues.push({
            id: `syntax/assignment-in-condition/${file}/${lineNum}`,
            severity: "medium",
            type: "SYNTAX_WARNING",
            message: "Possible assignment in condition (did you mean ===?)",
            file,
            line: lineNum,
            fix: "Use === for comparison, or wrap in extra parentheses if intentional",
            snippet: line.trim()
          });
        }
      }
    }
  }
};
var CompletenessAnalyzer = class {
  static {
    __name(this, "CompletenessAnalyzer");
  }
  id = "completeness";
  name = "Completeness Detection";
  filePatterns = [
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx"
  ];
  todoPatterns = [
    /\/\/\s*TODO\b/gi,
    /\/\/\s*FIXME\b/gi,
    /\/\/\s*XXX\b/gi,
    /\/\/\s*HACK\b/gi,
    /\/\*\s*TODO\b/gi,
    /\/\*\s*FIXME\b/gi
  ];
  placeholderPatterns = [
    /throw\s+new\s+Error\s*\(\s*['"`].*not\s*implemented.*['"`]\s*\)/gi,
    /throw\s+new\s+Error\s*\(\s*['"`]TODO.*['"`]\s*\)/gi,
    /NotImplementedError/gi,
    /throw\s+new\s+Error\s*\(\s*['"`]STUB['"`]\s*\)/gi
  ];
  parserOptions = {
    sourceType: "module",
    plugins: [
      "typescript",
      "jsx"
    ],
    errorRecovery: true
  };
  async analyze(context) {
    const startTime = performance.now();
    const issues = [];
    let filesAnalyzed = 0;
    let nodesVisited = 0;
    const parseErrors = [];
    for (const [file, content] of context.contents) {
      if (!this.shouldAnalyzeFile(file)) continue;
      filesAnalyzed++;
      this.checkTodoComments(content, file, issues);
      this.checkPlaceholderPatterns(content, file, issues);
      try {
        const ast = parse(content, {
          ...this.parserOptions,
          plugins: this.getPluginsForFile(file)
        });
        const result = this.analyzeAST(ast, content, file);
        issues.push(...result.issues);
        nodesVisited += result.nodesVisited;
      } catch (error) {
        parseErrors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return {
      analyzer: this.id,
      success: true,
      issues,
      coverage: filesAnalyzed / Math.max(context.files.length, 1),
      duration: performance.now() - startTime,
      metadata: {
        filesAnalyzed,
        nodesVisited,
        patternsChecked: [
          "TODO",
          "FIXME",
          "EMPTY_CATCH",
          "EMPTY_FUNCTION",
          "NOT_IMPLEMENTED",
          "PLACEHOLDER"
        ],
        parseErrors
      }
    };
  }
  shouldRun(context) {
    return context.files.some((f) => this.shouldAnalyzeFile(f));
  }
  shouldAnalyzeFile(file) {
    const ext = file.split(".").pop()?.toLowerCase();
    return [
      "ts",
      "tsx",
      "js",
      "jsx"
    ].includes(ext || "");
  }
  getPluginsForFile(file) {
    const plugins = [
      "typescript"
    ];
    if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
      plugins.push("jsx");
    }
    return plugins;
  }
  /**
   * Check for TODO/FIXME comments
   */
  checkTodoComments(content, file, issues) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      for (const pattern of this.todoPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          const todoContent = line.trim().slice(0, 100);
          issues.push({
            id: `completeness/todo/${file}/${lineNum}`,
            severity: "medium",
            type: "INCOMPLETE_IMPLEMENTATION",
            message: `TODO/FIXME: ${todoContent}`,
            file,
            line: lineNum,
            snippet: todoContent
          });
          break;
        }
      }
    }
  }
  /**
   * Check for placeholder/stub patterns
   */
  checkPlaceholderPatterns(content, file, issues) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      for (const pattern of this.placeholderPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          issues.push({
            id: `completeness/placeholder/${file}/${lineNum}`,
            severity: "high",
            type: "INCOMPLETE_IMPLEMENTATION",
            message: 'Placeholder implementation: "not implemented" or similar',
            file,
            line: lineNum,
            fix: "Implement the functionality or remove the placeholder",
            snippet: line.trim().slice(0, 100)
          });
          break;
        }
      }
    }
  }
  /**
   * AST-based detection of empty/incomplete code
   */
  analyzeAST(ast, _content, file) {
    const issues = [];
    let nodesVisited = 0;
    traverse(ast, {
      enter() {
        nodesVisited++;
      },
      // Empty catch blocks
      CatchClause: /* @__PURE__ */ __name((path) => {
        const body = path.node.body;
        if (body.body.length === 0) {
          issues.push({
            id: `completeness/empty-catch/${file}/${path.node.loc?.start.line}`,
            severity: "medium",
            type: "INCOMPLETE_IMPLEMENTATION",
            message: "Empty catch block - errors silently swallowed",
            file,
            line: path.node.loc?.start.line,
            fix: "Add error handling, rethrow, or log the error"
          });
        } else if (body.body.length === 1) {
          const stmt = body.body[0];
          if (stmt.type === "EmptyStatement") {
            issues.push({
              id: `completeness/empty-catch/${file}/${path.node.loc?.start.line}`,
              severity: "medium",
              type: "INCOMPLETE_IMPLEMENTATION",
              message: "Catch block contains only empty statement",
              file,
              line: path.node.loc?.start.line,
              fix: "Add proper error handling"
            });
          }
        }
      }, "CatchClause"),
      // Empty function bodies (excluding type declarations and interface methods)
      FunctionDeclaration: /* @__PURE__ */ __name((path) => {
        if (path.node.body.body.length === 0) {
          const funcName = path.node.id?.name || "anonymous";
          {
            issues.push({
              id: `completeness/empty-fn/${file}/${path.node.loc?.start.line}`,
              severity: "medium",
              type: "INCOMPLETE_IMPLEMENTATION",
              message: `Empty function body: ${funcName}()`,
              file,
              line: path.node.loc?.start.line,
              fix: "Implement the function or mark as abstract/stub if intentional"
            });
          }
        }
      }, "FunctionDeclaration"),
      // Empty method bodies
      ClassMethod: /* @__PURE__ */ __name((path) => {
        if (path.node.abstract) return;
        if (path.node.kind === "get" || path.node.kind === "set") return;
        const body = path.node.body;
        if (body && body.body.length === 0) {
          const methodName = path.node.key.type === "Identifier" ? path.node.key.name : "anonymous";
          if (methodName === "constructor") return;
          issues.push({
            id: `completeness/empty-method/${file}/${path.node.loc?.start.line}`,
            severity: "medium",
            type: "INCOMPLETE_IMPLEMENTATION",
            message: `Empty method body: ${methodName}()`,
            file,
            line: path.node.loc?.start.line,
            fix: "Implement the method or mark as abstract if intentional"
          });
        }
      }, "ClassMethod"),
      // Arrow functions that just throw or are empty (might be intentional)
      ArrowFunctionExpression: /* @__PURE__ */ __name((path) => {
        const body = path.node.body;
        if (body.type === "BlockStatement" && body.body.length === 0) {
          const parent = path.parent;
          if (parent.type === "VariableDeclarator") {
            const varName = parent.id.type === "Identifier" ? parent.id.name : "anonymous";
            issues.push({
              id: `completeness/empty-arrow/${file}/${path.node.loc?.start.line}`,
              severity: "low",
              type: "INCOMPLETE_IMPLEMENTATION",
              message: `Empty arrow function: ${varName}`,
              file,
              line: path.node.loc?.start.line,
              fix: "Implement the function or use () => {} if intentionally empty"
            });
          }
        }
      }, "ArrowFunctionExpression"),
      // Check for console.log that might be debug code
      CallExpression: /* @__PURE__ */ __name((path) => {
        const callee = path.node.callee;
        if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "console" && callee.property.type === "Identifier" && callee.property.name === "log") {
          const firstArg = path.node.arguments[0];
          if (firstArg && firstArg.type === "StringLiteral") {
            const msg = firstArg.value.toLowerCase();
            if (msg.includes("debug") || msg.includes("test") || msg.includes("todo") || msg.includes("remove")) {
              issues.push({
                id: `completeness/debug-log/${file}/${path.node.loc?.start.line}`,
                severity: "low",
                type: "DEBUG_CODE",
                message: `Debug console.log left in code: "${firstArg.value.slice(0, 50)}"`,
                file,
                line: path.node.loc?.start.line,
                fix: "Remove debug logging before commit"
              });
            }
          }
        }
      }, "CallExpression")
    });
    return {
      issues,
      nodesVisited
    };
  }
};
var EXPORT_PATTERNS = [
  /export\s+(const|function|class|interface|type|enum)\s+(\w+)/g,
  /export\s+default\s+(function|class)?\s*(\w+)?/g,
  /export\s+\{([^}]+)\}/g
];
var PERFORMANCE_PATTERNS = [
  {
    pattern: /\.forEach\s*\(/g,
    type: "computation",
    risk: "low"
  },
  {
    pattern: /for\s*\(\s*let\s+\w+\s*=\s*0/g,
    type: "computation",
    risk: "low"
  },
  {
    pattern: /while\s*\(/g,
    type: "computation",
    risk: "medium"
  },
  {
    pattern: /async\s+function|await\s+/g,
    type: "io",
    risk: "medium"
  },
  {
    pattern: /new\s+(Map|Set|Array)\s*\(/g,
    type: "memory",
    risk: "low"
  },
  {
    pattern: /JSON\.(parse|stringify)/g,
    type: "computation",
    risk: "medium"
  },
  {
    pattern: /readFileSync|writeFileSync/g,
    type: "io",
    risk: "high"
  },
  {
    pattern: /spawn|exec\s*\(/g,
    type: "io",
    risk: "high"
  },
  {
    pattern: /import\s*\(/g,
    type: "bundle",
    risk: "low"
  },
  {
    pattern: /require\s*\(/g,
    type: "bundle",
    risk: "medium"
  }
];
var TEST_FILE_PATTERNS = [
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /__tests__\//,
  /test\//,
  /tests\//
];
var ChangeImpactAnalyzer = class {
  static {
    __name(this, "ChangeImpactAnalyzer");
  }
  id = "change-impact";
  name = "Change Impact Analyzer";
  filePatterns = [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx"
  ];
  workspaceRoot;
  dependencyGraph = /* @__PURE__ */ new Map();
  reverseDependencyGraph = /* @__PURE__ */ new Map();
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }
  /**
   * Check if this analyzer should run
   */
  shouldRun(context) {
    return context.files.some((f) => this.filePatterns.some((p) => new RegExp(p.replace(/\*/g, ".*")).test(f)));
  }
  /**
   * Run impact analysis
   */
  async analyze(context) {
    const start = Date.now();
    const issues = [];
    try {
      await this.buildDependencyGraph(context);
      for (const file of context.files) {
        const content = context.contents.get(file);
        if (!content) {
          continue;
        }
        const breakingChanges = this.detectBreakingChanges(content, file);
        for (const bc of breakingChanges) {
          issues.push({
            id: `impact/breaking/${bc.type}/${file}/${bc.symbol}`,
            severity: bc.severity,
            type: `BREAKING_${bc.type.toUpperCase()}`,
            message: bc.description,
            file,
            fix: bc.migration
          });
        }
        const perfImpacts = this.detectPerformanceImpacts(content, file);
        for (const pi of perfImpacts) {
          if (pi.risk === "high" || pi.risk === "critical") {
            issues.push({
              id: `impact/perf/${pi.type}/${file}/${pi.component}`,
              severity: pi.risk === "critical" ? "critical" : "high",
              type: `PERF_${pi.type.toUpperCase()}`,
              message: pi.description,
              file,
              fix: pi.recommendation
            });
          }
        }
        const affectedTests = this.findAffectedTests(file);
        if (affectedTests.length > 5) {
          issues.push({
            id: `impact/tests/${file}`,
            severity: "medium",
            type: "HIGH_TEST_IMPACT",
            message: `Change affects ${affectedTests.length} test files - consider running full test suite`,
            file
          });
        }
      }
      return {
        analyzer: this.id,
        success: true,
        issues,
        coverage: 1,
        duration: Date.now() - start,
        metadata: {
          filesAnalyzed: context.files.length
        }
      };
    } catch (error) {
      return {
        analyzer: this.id,
        success: false,
        issues: [
          {
            id: "impact/error",
            severity: "high",
            type: "ANALYSIS_ERROR",
            message: error instanceof Error ? error.message : String(error)
          }
        ],
        coverage: 0,
        duration: Date.now() - start
      };
    }
  }
  /**
   * Get full impact analysis (more detailed than standard analyze)
   */
  async getFullImpact(files, contents) {
    const start = Date.now();
    const context = {
      workspaceRoot: this.workspaceRoot,
      files,
      contents
    };
    await this.buildDependencyGraph(context);
    const affectedTests = [];
    const breakingChanges = [];
    const performanceImpacts = [];
    const dependentFiles = [];
    const recommendations = [];
    for (const file of files) {
      const content = contents.get(file) || "";
      const tests = this.findAffectedTests(file);
      affectedTests.push(...tests);
      const breaks = this.detectBreakingChanges(content, file);
      breakingChanges.push(...breaks);
      const perfs = this.detectPerformanceImpacts(content, file);
      performanceImpacts.push(...perfs);
      const deps = this.findDependentFiles(file);
      dependentFiles.push(...deps);
    }
    const impactScore = this.calculateImpactScore(affectedTests, breakingChanges, performanceImpacts, dependentFiles);
    if (breakingChanges.length > 0) {
      recommendations.push(`\u26A0\uFE0F ${breakingChanges.length} breaking change(s) detected - update dependent code`);
    }
    if (affectedTests.length > 10) {
      recommendations.push(`\u{1F9EA} Run full test suite - ${affectedTests.length} tests potentially affected`);
    }
    if (performanceImpacts.some((p) => p.risk === "high" || p.risk === "critical")) {
      recommendations.push("\u26A1 Performance-sensitive code modified - run benchmarks");
    }
    if (dependentFiles.length > 20) {
      recommendations.push("\u{1F517} High ripple effect - consider incremental rollout");
    }
    return {
      filesAnalyzed: files.length,
      affectedTests: this.dedupeItems(affectedTests),
      breakingChanges,
      performanceImpacts,
      dependentFiles: this.dedupeItems(dependentFiles),
      impactScore,
      recommendations,
      duration: Date.now() - start
    };
  }
  // =========================================================================
  // Private Methods
  // =========================================================================
  /**
   * Build dependency graph from file contents
   */
  async buildDependencyGraph(context) {
    this.dependencyGraph.clear();
    this.reverseDependencyGraph.clear();
    for (const file of context.files) {
      const content = context.contents.get(file);
      if (!content) {
        continue;
      }
      const imports = this.extractImports(content, file);
      this.dependencyGraph.set(file, imports);
      for (const imp of imports) {
        const existing = this.reverseDependencyGraph.get(imp) || [];
        existing.push(file);
        this.reverseDependencyGraph.set(imp, existing);
      }
    }
  }
  /**
   * Extract import statements from file content
   */
  extractImports(content, fromFile) {
    const imports = [];
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
    const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = this.resolveImportPath(match[1], fromFile);
      if (importPath) {
        imports.push(importPath);
      }
    }
    while ((match = requireRegex.exec(content)) !== null) {
      const importPath = this.resolveImportPath(match[1], fromFile);
      if (importPath) {
        imports.push(importPath);
      }
    }
    return imports;
  }
  /**
   * Resolve import path to absolute file path
   */
  resolveImportPath(importPath, fromFile) {
    if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
      return null;
    }
    const dir = dirname(fromFile);
    const extensions = [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      "/index.ts",
      "/index.tsx",
      "/index.js"
    ];
    for (const ext of extensions) {
      const resolved = `${dir}/${importPath}${ext}`.replace(/\/\.\//g, "/");
      return resolved;
    }
    return null;
  }
  /**
   * Find test files that might be affected by a change
   */
  findAffectedTests(file) {
    const tests = [];
    const relPath = relative(this.workspaceRoot, file);
    const fileName = basename(file).replace(/\.[tj]sx?$/, "");
    const directTestPatterns = [
      `${fileName}.test.ts`,
      `${fileName}.test.tsx`,
      `${fileName}.spec.ts`,
      `${fileName}.spec.tsx`,
      `__tests__/${fileName}.test.ts`,
      `__tests__/${fileName}.test.tsx`
    ];
    for (const pattern of directTestPatterns) {
      tests.push({
        path: pattern,
        reason: "Direct test file for changed source",
        level: "high"
      });
    }
    const importers = this.reverseDependencyGraph.get(file) || [];
    for (const importer of importers) {
      if (this.isTestFile(importer)) {
        tests.push({
          path: relative(this.workspaceRoot, importer),
          reason: "Test file imports changed module",
          level: "medium"
        });
      }
    }
    if (relPath.includes("/core/") || relPath.includes("/services/")) {
      tests.push({
        path: "**/*.integration.test.ts",
        reason: "Core module change may affect integration tests",
        level: "low"
      });
    }
    return tests;
  }
  /**
   * Check if a file is a test file
   */
  isTestFile(file) {
    return TEST_FILE_PATTERNS.some((p) => p.test(file));
  }
  /**
   * Detect breaking changes in content
   */
  detectBreakingChanges(content, file) {
    const breaks = [];
    for (const pattern of EXPORT_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match2;
      while ((match2 = regex.exec(content)) !== null) {
        const symbolName = match2[2] || match2[1];
        if (symbolName) {
          breaks.push({
            type: "export",
            symbol: symbolName,
            file,
            description: `Exported symbol '${symbolName}' may have changed`,
            severity: "medium",
            migration: `Verify consumers of '${symbolName}' are updated`
          });
        }
      }
    }
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)\s*\{([^}]+)\}/g;
    let match;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceName = match[1];
      const body = match[2];
      if (body.includes("?:") || body.includes(": ")) {
        breaks.push({
          type: "type",
          symbol: interfaceName,
          file,
          description: `Interface '${interfaceName}' definition changed`,
          severity: "medium"
        });
      }
    }
    return breaks;
  }
  /**
   * Detect performance-sensitive code changes
   */
  detectPerformanceImpacts(content, file) {
    const impacts = [];
    for (const { pattern, type, risk } of PERFORMANCE_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(content)) !== null) {
        impacts.push({
          type,
          description: `${type} operation detected: ${match[0]}`,
          risk,
          component: basename(file),
          recommendation: this.getPerformanceRecommendation(type)
        });
      }
    }
    return impacts;
  }
  /**
   * Get recommendation for performance issue type
   */
  getPerformanceRecommendation(type) {
    switch (type) {
      case "hotpath":
        return "Consider memoization or caching for hot paths";
      case "memory":
        return "Monitor memory usage, consider object pooling";
      case "io":
        return "Use async operations, consider batching";
      case "computation":
        return "Profile for bottlenecks, consider Web Workers";
      case "bundle":
        return "Use dynamic imports for code splitting";
      default:
        return "Profile before optimizing";
    }
  }
  /**
   * Find files that depend on changed file
   */
  findDependentFiles(file) {
    const dependents = [];
    const visited = /* @__PURE__ */ new Set();
    const traverse3 = /* @__PURE__ */ __name((current, depth) => {
      if (visited.has(current) || depth > 3) {
        return;
      }
      visited.add(current);
      const importers = this.reverseDependencyGraph.get(current) || [];
      for (const importer of importers) {
        dependents.push({
          path: relative(this.workspaceRoot, importer),
          reason: depth === 0 ? "Directly imports changed file" : `Transitive dependency (depth ${depth})`,
          level: depth === 0 ? "high" : depth === 1 ? "medium" : "low"
        });
        traverse3(importer, depth + 1);
      }
    }, "traverse");
    traverse3(file, 0);
    return dependents;
  }
  /**
   * Calculate overall impact score
   */
  calculateImpactScore(tests, breaks, perfs, deps) {
    let score = 0;
    score += Math.min(tests.length * 0.05, 0.25);
    score += Math.min(breaks.length * 0.15, 0.35);
    score += Math.min(perfs.filter((p) => p.risk === "high").length * 0.1, 0.2);
    score += Math.min(deps.length * 0.02, 0.2);
    return Math.min(score, 1);
  }
  /**
   * Deduplicate impact items
   */
  dedupeItems(items) {
    const seen = /* @__PURE__ */ new Set();
    return items.filter((item) => {
      if (seen.has(item.path)) {
        return false;
      }
      seen.add(item.path);
      return true;
    });
  }
};
function createChangeImpactAnalyzer(workspaceRoot) {
  return new ChangeImpactAnalyzer(workspaceRoot);
}
__name(createChangeImpactAnalyzer, "createChangeImpactAnalyzer");
var SecurityAnalyzer = class {
  static {
    __name(this, "SecurityAnalyzer");
  }
  id = "security";
  name = "Security Analysis";
  filePatterns = [
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx"
  ];
  parserOptions = {
    sourceType: "module",
    plugins: [
      "typescript",
      "jsx"
    ],
    errorRecovery: true
  };
  async analyze(context) {
    const startTime = performance.now();
    const issues = [];
    let filesAnalyzed = 0;
    let nodesVisited = 0;
    const parseErrors = [];
    for (const [file, content] of context.contents) {
      if (!this.shouldAnalyzeFile(file)) continue;
      filesAnalyzed++;
      try {
        const ast = parse(content, {
          ...this.parserOptions,
          plugins: this.getPluginsForFile(file)
        });
        const fileIssues = this.analyzeAST(ast, content, file);
        issues.push(...fileIssues.issues);
        nodesVisited += fileIssues.nodesVisited;
      } catch (error) {
        parseErrors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
        issues.push({
          id: `security/parse-error/${file}`,
          severity: "info",
          type: "PARSE_ERROR",
          message: `Could not parse for security analysis: ${error instanceof Error ? error.message : String(error)}`,
          file
        });
      }
    }
    return {
      analyzer: this.id,
      success: true,
      issues,
      coverage: filesAnalyzed / Math.max(context.files.length, 1),
      duration: performance.now() - startTime,
      metadata: {
        filesAnalyzed,
        nodesVisited,
        patternsChecked: [
          "UNSAFE_EVAL",
          "PATH_TRAVERSAL",
          "MISSING_SIGNAL_HANDLER",
          "COMMAND_INJECTION",
          "SQL_INJECTION",
          "XSS_RISK",
          "HARDCODED_SECRET",
          "UNSAFE_REGEX"
        ],
        parseErrors
      }
    };
  }
  shouldRun(context) {
    return context.files.some((f) => this.shouldAnalyzeFile(f));
  }
  shouldAnalyzeFile(file) {
    const ext = file.split(".").pop()?.toLowerCase();
    return [
      "ts",
      "tsx",
      "js",
      "jsx"
    ].includes(ext || "");
  }
  getPluginsForFile(file) {
    const plugins = [
      "typescript"
    ];
    if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
      plugins.push("jsx");
    }
    return plugins;
  }
  /**
   * Analyze AST for security issues
   */
  analyzeAST(ast, content, file) {
    const issues = [];
    let nodesVisited = 0;
    const fileContext = {
      isDaemon: false,
      hasSignalHandler: false};
    fileContext.isDaemon = content.includes(".listen(") || file.includes("daemon") || file.includes("server") || file.includes("worker");
    traverse(ast, {
      enter() {
        nodesVisited++;
      },
      // Detect eval()
      CallExpression: /* @__PURE__ */ __name((path) => {
        const callee = path.node.callee;
        if (callee.type === "Identifier" && callee.name === "eval") {
          issues.push({
            id: `security/eval/${file}/${path.node.loc?.start.line}`,
            severity: "critical",
            type: "UNSAFE_EVAL",
            message: "eval() allows arbitrary code execution",
            file,
            line: path.node.loc?.start.line,
            column: path.node.loc?.start.column,
            fix: "Use JSON.parse() for data or refactor logic to avoid eval"
          });
        }
        if (callee.type === "Identifier" && callee.name === "Function") {
          issues.push({
            id: `security/function-constructor/${file}/${path.node.loc?.start.line}`,
            severity: "critical",
            type: "UNSAFE_EVAL",
            message: "new Function() is equivalent to eval() and allows arbitrary code execution",
            file,
            line: path.node.loc?.start.line,
            column: path.node.loc?.start.column,
            fix: "Refactor to avoid dynamic code generation"
          });
        }
        if (callee.type === "Identifier" && (callee.name === "setTimeout" || callee.name === "setInterval")) {
          const firstArg = path.node.arguments[0];
          if (firstArg && firstArg.type === "StringLiteral") {
            issues.push({
              id: `security/string-timer/${file}/${path.node.loc?.start.line}`,
              severity: "high",
              type: "UNSAFE_EVAL",
              message: `${callee.name} with string argument executes code like eval()`,
              file,
              line: path.node.loc?.start.line,
              fix: "Pass a function instead of a string"
            });
          }
        }
        if (callee.type === "Identifier" && (callee.name === "exec" || callee.name === "execSync")) {
          const firstArg = path.node.arguments[0];
          if (firstArg && !this.isStaticString(firstArg)) {
            issues.push({
              id: `security/command-injection/${file}/${path.node.loc?.start.line}`,
              severity: "high",
              type: "COMMAND_INJECTION",
              message: "exec with dynamic command - potential command injection",
              file,
              line: path.node.loc?.start.line,
              fix: "Validate/sanitize input or use execFile with explicit arguments"
            });
          }
        }
        if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "process" && callee.property.type === "Identifier" && callee.property.name === "on") {
          const firstArg = path.node.arguments[0];
          if (firstArg && firstArg.type === "StringLiteral") {
            if (firstArg.value === "SIGTERM" || firstArg.value === "SIGINT") {
              fileContext.hasSignalHandler = true;
            }
          }
        }
      }, "CallExpression"),
      // Detect fs operations with dynamic paths
      MemberExpression: /* @__PURE__ */ __name((path) => {
        const node = path.node;
        if (node.object.type === "Identifier" && (node.object.name === "fs" || node.object.name === "fsp")) {
          const parent = path.parentPath;
          if (parent.isCallExpression()) {
            const methodName = node.property.type === "Identifier" ? node.property.name : node.property.value;
            const pathMethods = [
              "readFile",
              "readFileSync",
              "writeFile",
              "writeFileSync",
              "readdir",
              "readdirSync",
              "stat",
              "statSync",
              "unlink",
              "unlinkSync",
              "mkdir",
              "mkdirSync",
              "rmdir",
              "rmdirSync",
              "access",
              "accessSync"
            ];
            if (pathMethods.includes(methodName)) {
              const firstArg = parent.node.arguments[0];
              if (firstArg && !this.isStaticPath(firstArg)) {
                issues.push({
                  id: `security/path-traversal/${file}/${path.node.loc?.start.line}`,
                  severity: "high",
                  type: "PATH_TRAVERSAL",
                  message: `fs.${methodName} with dynamic path - potential path traversal`,
                  file,
                  line: path.node.loc?.start.line,
                  fix: "Validate paths against workspace root before use"
                });
              }
            }
          }
        }
      }, "MemberExpression"),
      // Check for dangerous regex patterns
      NewExpression: /* @__PURE__ */ __name((path) => {
        if (path.node.callee.type === "Identifier" && path.node.callee.name === "RegExp") {
          const firstArg = path.node.arguments[0];
          if (firstArg && !this.isStaticString(firstArg)) {
            issues.push({
              id: `security/unsafe-regex/${file}/${path.node.loc?.start.line}`,
              severity: "medium",
              type: "UNSAFE_REGEX",
              message: "Dynamic RegExp - potential ReDoS or injection vulnerability",
              file,
              line: path.node.loc?.start.line,
              fix: "Use static regex patterns or validate input"
            });
          }
        }
      }, "NewExpression"),
      // Check for innerHTML/dangerouslySetInnerHTML (XSS)
      JSXAttribute: /* @__PURE__ */ __name((path) => {
        const name = path.node.name;
        if (name.type === "JSXIdentifier" && name.name === "dangerouslySetInnerHTML") {
          issues.push({
            id: `security/xss-risk/${file}/${path.node.loc?.start.line}`,
            severity: "high",
            type: "XSS_RISK",
            message: "dangerouslySetInnerHTML can lead to XSS if content is not sanitized",
            file,
            line: path.node.loc?.start.line,
            fix: "Sanitize HTML content before rendering or avoid using dangerouslySetInnerHTML"
          });
        }
      }, "JSXAttribute"),
      // Check for hardcoded secrets in variable declarations
      VariableDeclarator: /* @__PURE__ */ __name((path) => {
        const id = path.node.id;
        const init = path.node.init;
        if (id.type === "Identifier" && init) {
          this.checkForHardcodedSecret(id.name, init, file, path.node.loc?.start.line, issues);
        }
      }, "VariableDeclarator"),
      // Check for hardcoded secrets in class properties
      ClassProperty: /* @__PURE__ */ __name((path) => {
        const key = path.node.key;
        const value = path.node.value;
        if (key.type === "Identifier" && value) {
          this.checkForHardcodedSecret(key.name, value, file, path.node.loc?.start.line, issues);
        }
      }, "ClassProperty"),
      // After traversal is complete, check daemon-specific patterns
      Program: {
        exit: /* @__PURE__ */ __name(() => {
          if (fileContext.isDaemon && !fileContext.hasSignalHandler) {
            issues.push({
              id: `security/signal-handler/${file}`,
              severity: "high",
              type: "MISSING_SIGNAL_HANDLER",
              message: "Daemon/server missing signal handlers (SIGTERM/SIGINT)",
              file,
              fix: "Add process.on('SIGTERM', gracefulShutdown) for clean shutdown"
            });
          }
        }, "exit")
      }
    });
    return {
      issues,
      nodesVisited
    };
  }
  /**
   * Check if expression is a static string (safe)
   */
  isStaticString(node) {
    if (node.type === "StringLiteral") return true;
    if (node.type === "TemplateLiteral" && node.expressions.length === 0) return true;
    return false;
  }
  /**
   * Check if expression is a static path (safe)
   */
  isStaticPath(node) {
    if (node.type === "StringLiteral") return true;
    if (node.type === "TemplateLiteral" && node.expressions.length === 0) return true;
    if (node.type === "CallExpression") {
      const callee = node.callee;
      if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "path" && callee.property.type === "Identifier" && callee.property.name === "join") {
        return node.arguments.every((arg) => {
          if (arg.type === "StringLiteral") return true;
          if (arg.type === "Identifier" && (arg.name === "__dirname" || arg.name === "__filename")) return true;
          return false;
        });
      }
    }
    return false;
  }
  /**
   * Check if a value looks like a hardcoded secret
   */
  checkForHardcodedSecret(name, value, file, line, issues) {
    if (!value) {
      return;
    }
    const varName = name.toLowerCase();
    const secretIndicators = [
      "apikey",
      "api_key",
      "secret",
      "password",
      "token",
      "credential",
      "auth",
      "key"
    ];
    if (secretIndicators.some((s) => varName.includes(s))) {
      if (value.type === "StringLiteral" && value.value.length > 8) {
        const valueStr = value.value.toLowerCase();
        if (!valueStr.includes("placeholder") && !valueStr.includes("example") && !valueStr.includes("xxx") && !valueStr.includes("todo") && !valueStr.includes("your_") && !valueStr.includes("env.")) {
          issues.push({
            id: `security/hardcoded-secret/${file}/${line}`,
            severity: "critical",
            type: "HARDCODED_SECRET",
            message: `Possible hardcoded secret in "${name}"`,
            file,
            line,
            fix: "Use environment variables for secrets"
          });
        }
      }
    }
  }
};

// ../../packages/core/dist/analysis/static/OrphanDetector.js
var DEFAULT_OPTIONS = {
  fileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx"
  ],
  excludePatterns: [
    "node_modules",
    "dist",
    ".next",
    "coverage",
    "**/*.test.*",
    "**/*.spec.*",
    "**/__tests__/**",
    "**/__mocks__/**"
  ]
};
async function detectOrphans(entryPoint, options = {}) {
  const startTime = Date.now();
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  try {
    const madgeModule = await import('madge');
    const madge = madgeModule.default || madgeModule;
    const result = await madge(entryPoint, {
      fileExtensions: mergedOptions.fileExtensions,
      excludeRegExp: mergedOptions.excludePatterns.map((p) => {
        const regexPattern = p.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\./g, "\\.");
        return new RegExp(regexPattern);
      }),
      tsConfig: mergedOptions.tsConfigPath,
      detectiveOptions: {
        ts: {
          skipTypeImports: true
        }
      }
    });
    const orphans = result.orphans();
    const allFiles = Object.keys(result.obj());
    return {
      orphans,
      totalFiles: allFiles.length,
      success: true,
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      orphans: [],
      totalFiles: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime
    };
  }
}
__name(detectOrphans, "detectOrphans");
function filterOrphansToFiles(orphanResult, targetFiles) {
  if (!orphanResult.success) {
    return [];
  }
  const targetSet = new Set(targetFiles.map((f) => f.replace(/\\/g, "/")));
  return orphanResult.orphans.filter((orphan) => {
    const normalizedOrphan = orphan.replace(/\\/g, "/");
    return targetSet.has(normalizedOrphan) || targetFiles.some((t) => normalizedOrphan.endsWith(t));
  });
}
__name(filterOrphansToFiles, "filterOrphansToFiles");
async function checkFilesForOrphanStatus(files, workspaceRoot) {
  const result = await detectOrphans(workspaceRoot, {
    baseDir: workspaceRoot
  });
  if (!result.success) {
    return {
      orphans: [],
      success: false,
      error: result.error
    };
  }
  const orphans = filterOrphansToFiles(result, files);
  return {
    orphans,
    success: true
  };
}
__name(checkFilesForOrphanStatus, "checkFilesForOrphanStatus");

// ../../packages/core/dist/analysis/static/index.js
async function runStaticAnalysis(files, _workspaceRoot, options = {}) {
  const startTime = Date.now();
  const result = {
    skippedTests: [],
    orphanedFiles: [],
    duration: 0,
    success: true,
    errors: []
  };
  if (!options.skipTestDetection) {
    try {
      const { analyzeSkippedTests: analyzeSkippedTests2 } = await import('./SkippedTestDetector-JY4EF5BN.js');
      const testResults = analyzeSkippedTests2(files);
      for (const testResult of testResults) {
        if (!testResult.parsed && testResult.error) {
          result.errors.push(`Parse error in ${testResult.file}: ${testResult.error}`);
        }
        for (const skipped of testResult.skipped) {
          result.skippedTests.push({
            file: skipped.file,
            type: skipped.type,
            name: skipped.name,
            line: skipped.line
          });
        }
      }
    } catch (error) {
      result.errors.push(`Skipped test detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!options.skipOrphanDetection) ;
  result.duration = Date.now() - startTime;
  result.success = result.errors.length === 0;
  return result;
}
__name(runStaticAnalysis, "runStaticAnalysis");

export { ChangeImpactAnalyzer, CompletenessAnalyzer, SecurityAnalyzer, SyntaxAnalyzer, checkFilesForOrphanStatus, createChangeImpactAnalyzer, detectOrphans, filterOrphansToFiles, runStaticAnalysis };
//# sourceMappingURL=chunk-VSJ33PLA.js.map
//# sourceMappingURL=chunk-VSJ33PLA.js.map