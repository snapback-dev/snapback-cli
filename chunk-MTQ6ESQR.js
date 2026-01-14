import { generateId } from './chunk-BCIXMIPW.js';
import { detectSkippedTests } from './chunk-BJS6XH2V.js';
import { __name, __require } from './chunk-WCQVDF3K.js';
import { z } from 'zod';
import { createHash, randomUUID } from 'crypto';
import 'eventemitter2';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import * as path3 from 'path';
import path3__default, { relative, join, extname, dirname } from 'path';
import * as fs from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { writeFile, readFile as readFile$1 } from 'atomically';
import { readFile, stat, access, constants, mkdir, mkdtemp, writeFile as writeFile$1, rm } from 'fs/promises';
import fastGlob2 from 'fast-glob';
import { spawn } from 'child_process';
import { tmpdir, homedir } from 'os';
import { EventEmitter } from 'events';
import { pipeline } from '@xenova/transformers';
import Database from 'better-sqlite3';

var AuthErrorCodeSchema = z.enum([
  "INVALID_CREDENTIALS",
  "USER_NOT_FOUND",
  "EMAIL_NOT_VERIFIED",
  "SESSION_EXPIRED",
  "UNAUTHORIZED",
  "RATE_LIMITED",
  "INVALID_TOKEN",
  "USER_ALREADY_EXISTS",
  "WEAK_PASSWORD",
  "INVALID_EMAIL",
  "OAUTH_ERROR",
  "NETWORK_ERROR",
  "UNKNOWN_ERROR"
]);
var AuthErrorSchema = z.object({
  code: AuthErrorCodeSchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional()
});
var UserRoleSchema = z.enum([
  "admin",
  "user",
  "viewer"
]).nullable();
var AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().url().nullable().optional(),
  emailVerified: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // Role field from database - nullable as not all users have a role assigned
  role: UserRoleSchema.optional()
});
var SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // Better Auth session metadata
  userAgent: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional()
});
var SessionWithUserSchema = z.object({
  session: SessionSchema,
  user: AuthUserSchema
});
z.discriminatedUnion("status", [
  z.object({
    status: z.literal("authenticated"),
    user: AuthUserSchema,
    session: SessionSchema
  }),
  z.object({
    status: z.literal("unauthenticated")
  }),
  z.object({
    status: z.literal("loading")
  })
]);

// ../../packages/contracts/dist/auth/api.js
var PasswordSchema = z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number");
var EmailSchema = z.string().email("Invalid email address").toLowerCase().trim();
z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().min(1, "Name is required").max(100, "Name is too long").trim()
});
z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    user: AuthUserSchema
  }),
  z.object({
    success: z.literal(false),
    error: AuthErrorSchema
  })
]);
z.object({
  email: EmailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false)
});
z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    user: AuthUserSchema,
    session: z.object({
      id: z.string(),
      expiresAt: z.coerce.date()
    })
  }),
  z.object({
    success: z.literal(false),
    error: AuthErrorSchema
  })
]);
z.union([
  SessionWithUserSchema,
  z.null()
]);
z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true)
  }),
  z.object({
    success: z.literal(false),
    error: AuthErrorSchema
  })
]);
z.object({
  name: z.string().min(1).max(100).trim().optional(),
  image: z.string().url().optional()
});
z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    user: AuthUserSchema
  }),
  z.object({
    success: z.literal(false),
    error: AuthErrorSchema
  })
]);
z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: PasswordSchema
});
z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true)
  }),
  z.object({
    success: z.literal(false),
    error: AuthErrorSchema
  })
]);
z.object({
  provider: z.enum([
    "github",
    "google"
  ]),
  callbackURL: z.string().url().optional()
});
var SnapBackEvent;
(function(SnapBackEvent2) {
  SnapBackEvent2["SNAPSHOT_CREATED"] = "snapshot:created";
  SnapBackEvent2["SNAPSHOT_DELETED"] = "snapshot:deleted";
  SnapBackEvent2["SNAPSHOT_RESTORED"] = "snapshot:restored";
  SnapBackEvent2["RESTORE_STARTED"] = "snapshot:restore_started";
  SnapBackEvent2["PROTECTION_CHANGED"] = "protection:changed";
  SnapBackEvent2["FILE_PROTECTED"] = "file:protected";
  SnapBackEvent2["FILE_UNPROTECTED"] = "file:unprotected";
  SnapBackEvent2["ANALYSIS_REQUESTED"] = "analysis:requested";
  SnapBackEvent2["ANALYSIS_COMPLETED"] = "analysis:completed";
})(SnapBackEvent || (SnapBackEvent = {}));
var QoSLevel;
(function(QoSLevel2) {
  QoSLevel2[QoSLevel2["BEST_EFFORT"] = 0] = "BEST_EFFORT";
  QoSLevel2[QoSLevel2["AT_LEAST_ONCE"] = 1] = "AT_LEAST_ONCE";
  QoSLevel2[QoSLevel2["EXACTLY_ONCE"] = 2] = "EXACTLY_ONCE";
})(QoSLevel || (QoSLevel = {}));
process.env.MCP_QUIET === "1" || process.env.MCP_QUIET === "true";
var SeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info"
]);
var RiskSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low"
]);
var ValidationSeveritySchema = z.enum([
  "critical",
  "warning",
  "info"
]);
var BaseIssueSchema = z.object({
  /** Severity level */
  severity: z.union([
    SeveritySchema,
    ValidationSeveritySchema
  ]),
  /** Issue type code (e.g., UNSAFE_EVAL, PATH_TRAVERSAL) */
  type: z.string(),
  /** Human-readable message */
  message: z.string(),
  /** Line number (1-indexed) */
  line: z.number().optional(),
  /** Suggested fix */
  fix: z.string().optional()
});
BaseIssueSchema.extend({
  severity: ValidationSeveritySchema
});
BaseIssueSchema.extend({
  /** Unique identifier for deduplication: analyzer/type/file/line */
  id: z.string(),
  /** Severity level */
  severity: SeveritySchema,
  /** File path where issue was found */
  file: z.string().optional(),
  /** Column number (1-indexed) */
  column: z.number().optional(),
  /** Code snippet showing the issue */
  snippet: z.string().optional(),
  /** Rule ID if from a lint tool */
  rule: z.string().optional()
});
z.object({
  /** Whether validation passed */
  passed: z.boolean(),
  /** Issues found */
  issues: z.array(BaseIssueSchema),
  /** Duration in milliseconds */
  duration: z.number().optional()
});
var CircuitBreakerStateEnumSchema = z.enum([
  "closed",
  "open",
  "half-open"
]);
z.object({
  /** Current state */
  state: CircuitBreakerStateEnumSchema,
  /** Failure count */
  failures: z.number(),
  /** Failure threshold */
  threshold: z.number(),
  /** Last failure timestamp */
  lastFailure: z.number().optional(),
  /** Cooldown period in ms */
  cooldownMs: z.number()
});

// ../../packages/contracts/dist/events/core.js
extendZodWithOpenApi(z);
var EVENT_VERSION = "1.0.0";
var BaseEventSchema = z.object({
  event_version: z.string().default(EVENT_VERSION).openapi({
    example: "1.0.0"
  }),
  timestamp: z.number().default(() => Date.now()).openapi({
    example: 162e10
  })
});
var SaveAttemptSchema = BaseEventSchema.extend({
  event: z.literal("save_attempt"),
  properties: z.object({
    protection: z.enum([
      "watch",
      "warn",
      "block"
    ]).openapi({
      description: "Protection level applied to the file"
    }),
    severity: z.enum([
      "low",
      "medium",
      "high",
      "critical"
    ]).openapi({
      description: "Severity of the risk detected"
    }),
    file_kind: z.string().openapi({
      description: "Type of file being protected",
      example: "typescript"
    }),
    reason: z.string().openapi({
      description: "Reason for the save attempt",
      example: "User tried to save a file with a secret"
    }),
    ai_present: z.boolean().openapi({
      description: "Whether AI was involved in the decision"
    }),
    ai_burst: z.boolean().openapi({
      description: "Whether this was part of an AI burst operation"
    }),
    outcome: z.enum([
      "saved",
      "canceled",
      "blocked"
    ]).openapi({
      description: "Outcome of the save attempt"
    })
  })
}).openapi("SaveAttemptEvent");
var SnapshotCreatedSchema = BaseEventSchema.extend({
  event: z.literal("snapshot_created"),
  properties: z.object({
    session_id: z.string().openapi({
      description: "Unique identifier for the session",
      example: "sess_12345"
    }),
    snapshot_id: z.string().openapi({
      description: "Unique identifier for the snapshot",
      example: "snap_67890"
    }),
    bytes_original: z.number().openapi({
      description: "Original size of the file in bytes",
      example: 1024
    }),
    bytes_stored: z.number().openapi({
      description: "Size of the stored snapshot in bytes",
      example: 512
    }),
    dedup_hit: z.boolean().openapi({
      description: "Whether deduplication was applied"
    }),
    latency_ms: z.number().openapi({
      description: "Time taken to create the snapshot in milliseconds",
      example: 45
    })
  })
}).openapi("SnapshotCreatedEvent");
var SessionFinalizedSchema = BaseEventSchema.extend({
  event: z.literal("session_finalized"),
  properties: z.object({
    session_id: z.string().openapi({
      description: "Unique identifier for the session",
      example: "sess_12345"
    }),
    files: z.array(z.string()).openapi({
      description: "List of files in the session",
      example: [
        "src/index.ts",
        "package.json"
      ]
    }),
    triggers: z.array(z.string()).openapi({
      description: "List of triggers that activated during the session",
      example: [
        "save_attempt",
        "risk_detected"
      ]
    }),
    duration_ms: z.number().openapi({
      description: "Duration of the session in milliseconds",
      example: 12e4
    }),
    ai_present: z.boolean().openapi({
      description: "Whether AI was involved in the session"
    }),
    ai_burst: z.boolean().openapi({
      description: "Whether this was part of an AI burst operation"
    }),
    highest_severity: z.enum([
      "info",
      "low",
      "medium",
      "high",
      "critical"
    ]).openapi({
      description: "Highest severity of issues in the session"
    }),
    // AI detection v1 fields
    ai_assist_level: z.enum([
      "none",
      "light",
      "medium",
      "heavy",
      "unknown"
    ]).optional().openapi({
      description: "AI assistance level inferred from change patterns",
      example: "medium"
    }),
    ai_confidence_score: z.number().min(0).max(10).optional().openapi({
      description: "Confidence score for AI detection (0-10)",
      example: 7.5
    }),
    ai_provider: z.enum([
      "cursor",
      "claude",
      "unknown",
      "none"
    ]).optional().openapi({
      description: "Detected AI tool/provider",
      example: "cursor"
    }),
    ai_large_insert_count: z.number().int().min(0).optional().openapi({
      description: "Count of large insertions detected",
      example: 5
    }),
    ai_total_chars: z.number().int().min(0).optional().openapi({
      description: "Total characters in large insertions",
      example: 2e3
    }),
    context: z.record(z.string(), z.any()).optional().openapi({
      description: "Additional context for the session"
    })
  })
}).openapi("SessionFinalizedEvent");
var IssueCreatedSchema = BaseEventSchema.extend({
  event: z.literal("issue_created"),
  properties: z.object({
    issue_id: z.string().openapi({
      description: "Unique identifier for the issue",
      example: "issue_12345"
    }),
    session_id: z.string().openapi({
      description: "Unique identifier for the session",
      example: "sess_12345"
    }),
    file_kind: z.string().openapi({
      description: "Type of file where the issue was detected",
      example: "typescript"
    }),
    type: z.enum([
      "secret",
      "mock",
      "phantom"
    ]).openapi({
      description: "Type of issue detected"
    }),
    severity: RiskSeveritySchema.openapi({
      description: "Severity of the issue"
    }),
    recommendation: z.string().openapi({
      description: "Recommendation for resolving the issue",
      example: "Remove the secret from the file"
    }),
    context: z.record(z.string(), z.any()).optional().openapi({
      description: "Additional context for the issue"
    })
  })
}).openapi("IssueCreatedEvent");
var IssueResolvedSchema = BaseEventSchema.extend({
  event: z.literal("issue_resolved"),
  properties: z.object({
    issue_id: z.string().openapi({
      description: "Unique identifier for the issue",
      example: "issue_12345"
    }),
    resolution: z.enum([
      "fixed",
      "ignored",
      "allowlisted"
    ]).openapi({
      description: "How the issue was resolved"
    })
  })
}).openapi("IssueResolvedEvent");
var SessionRestoredSchema = BaseEventSchema.extend({
  event: z.literal("session_restored"),
  properties: z.object({
    session_id: z.string().openapi({
      description: "Unique identifier for the session",
      example: "sess_12345"
    }),
    files_restored: z.array(z.string()).openapi({
      description: "List of files that were restored",
      example: [
        "src/index.ts",
        "package.json"
      ]
    }),
    time_to_restore_ms: z.number().openapi({
      description: "Time taken to restore the session in milliseconds",
      example: 2500
    }),
    reason: z.string().openapi({
      description: "Reason for the session restoration",
      example: "User requested rollback"
    })
  })
}).openapi("SessionRestoredEvent");
var PolicyChangedSchema = BaseEventSchema.extend({
  event: z.literal("policy_changed"),
  properties: z.object({
    pattern: z.string().openapi({
      description: "File pattern that the policy applies to",
      example: "*.env"
    }),
    from: z.enum([
      "watch",
      "warn",
      "block",
      "unprotected",
      "unauthenticated",
      "unaware"
    ]).openapi({
      description: "Previous protection level"
    }),
    to: z.enum([
      "watch",
      "warn",
      "block",
      "unprotected",
      "authenticated",
      "aware"
    ]).openapi({
      description: "New protection level"
    }),
    source: z.string().openapi({
      description: "Source of the policy change",
      example: "cli"
    }),
    context: z.record(z.string(), z.any()).optional().openapi({
      description: "Additional context for the policy change"
    })
  })
}).openapi("PolicyChangedEvent");
var AuthProviderSelectedSchema = BaseEventSchema.extend({
  event: z.literal("auth.provider.selected"),
  properties: z.object({
    provider: z.enum([
      "oauth",
      "device_flow"
    ]).openapi({
      description: "Authentication provider selected"
    }),
    trigger: z.enum([
      "user_selected",
      "fallback",
      "auto"
    ]).openapi({
      description: "How the provider was selected"
    })
  })
}).openapi("AuthProviderSelectedEvent");
var AuthBrowserOpenedSchema = BaseEventSchema.extend({
  event: z.literal("auth.browser.opened"),
  properties: z.object({
    method: z.enum([
      "external_command",
      "clipboard",
      "error"
    ]).openapi({
      description: "Method used to open browser"
    }),
    success: z.boolean().openapi({
      description: "Whether browser was successfully opened"
    }),
    error: z.string().optional().openapi({
      description: "Error message if browser opening failed"
    })
  })
}).openapi("AuthBrowserOpenedEvent");
var AuthCodeEntrySchema = BaseEventSchema.extend({
  event: z.literal("auth.code.entry"),
  properties: z.object({
    code_format: z.enum([
      "valid",
      "invalid_chars",
      "wrong_length"
    ]).openapi({
      description: "Validity of the entered code format"
    }),
    time_to_enter_ms: z.number().openapi({
      description: "Time taken to enter the code in milliseconds"
    }),
    attempts: z.number().int().min(1).openapi({
      description: "Number of attempts to enter the code correctly"
    }),
    code_length: z.number().int().optional().openapi({
      description: "Length of the entered code"
    })
  })
}).openapi("AuthCodeEntryEvent");
var AuthApprovalReceivedSchema = BaseEventSchema.extend({
  event: z.literal("auth.approval.received"),
  properties: z.object({
    polling_attempts: z.number().int().min(1).openapi({
      description: "Number of polling attempts before approval"
    }),
    total_wait_ms: z.number().openapi({
      description: "Total time waited for approval in milliseconds"
    }),
    device_code_expired: z.boolean().openapi({
      description: "Whether the device code had expired"
    })
  })
}).openapi("AuthApprovalReceivedEvent");
var WelcomeFeatureViewedSchema = BaseEventSchema.extend({
  event: z.literal("welcome.feature.viewed"),
  properties: z.object({
    feature: z.string().openapi({
      description: "Feature name shown in welcome panel",
      example: "ai_detection"
    }),
    position: z.number().int().min(0).openapi({
      description: "Position in feature carousel",
      example: 0
    }),
    trigger: z.enum([
      "onboarding",
      "nudge",
      "manual"
    ]).openapi({
      description: "How the welcome panel was triggered"
    })
  })
}).openapi("WelcomeFeatureViewedEvent");
var WelcomeActionTriggeredSchema = BaseEventSchema.extend({
  event: z.literal("welcome.action.triggered"),
  properties: z.object({
    action: z.string().openapi({
      description: "Action triggered by user",
      example: "try_now"
    }),
    feature: z.string().openapi({
      description: "Feature associated with the action",
      example: "ai_detection"
    }),
    time_viewed_ms: z.number().openapi({
      description: "How long the feature was viewed before action",
      example: 2500
    })
  })
}).openapi("WelcomeActionTriggeredEvent");
z.discriminatedUnion("event", [
  SaveAttemptSchema,
  SnapshotCreatedSchema,
  SessionFinalizedSchema,
  IssueCreatedSchema,
  IssueResolvedSchema,
  SessionRestoredSchema,
  PolicyChangedSchema,
  AuthProviderSelectedSchema,
  AuthBrowserOpenedSchema,
  AuthCodeEntrySchema,
  AuthApprovalReceivedSchema,
  WelcomeFeatureViewedSchema,
  WelcomeActionTriggeredSchema
]);

// ../../packages/contracts/dist/events/accountability.js
extendZodWithOpenApi(z);
var PerceivedHelpSchema = z.enum([
  "significantly",
  "somewhat",
  "not_really",
  "blocked"
]).openapi({
  description: "User's perception of how much SnapBack helped"
});
var ActualChangesSchema = z.object({
  files_modified: z.number().int().min(0).openapi({
    description: "Number of files modified during session",
    example: 5
  }),
  lines_added: z.number().int().min(0).openapi({
    description: "Total lines added",
    example: 150
  }),
  lines_removed: z.number().int().min(0).openapi({
    description: "Total lines removed",
    example: 30
  }),
  snapshots_used: z.number().int().min(0).openapi({
    description: "Number of snapshots created or restored",
    example: 2
  })
}).openapi("ActualChanges");
var PreventedIssuesSchema = z.object({
  rollbacks_avoided: z.number().int().min(0).openapi({
    description: "Rollbacks avoided due to snapshots",
    example: 1
  }),
  pattern_violations_caught: z.number().int().min(0).openapi({
    description: "Pattern violations caught before commit",
    example: 3
  }),
  skipped_tests_flagged: z.number().int().min(0).openapi({
    description: "Skipped tests flagged for attention",
    example: 2
  })
}).openapi("PreventedIssues");
var TierSchema = z.enum([
  "free",
  "solo",
  "team",
  "enterprise"
]).openapi({
  description: "User's subscription tier"
});
BaseEventSchema.extend({
  event: z.literal("session:feedback_submitted"),
  properties: z.object({
    // Session identification
    session_id: z.string().openapi({
      description: "Unique session identifier",
      example: "sess_12345"
    }),
    session_duration_ms: z.number().int().min(0).openapi({
      description: "Session duration in milliseconds",
      example: 36e5
    }),
    // User perception
    perceived_help: PerceivedHelpSchema,
    // Reality metrics (counts only, no PII)
    actual_changes: ActualChangesSchema,
    prevented_issues: PreventedIssuesSchema,
    // Tier for consent checking
    tier: TierSchema
  })
}).openapi("AccountabilityEffectEvent");

// ../../packages/contracts/dist/logger.js
var _loggerFactory = null;
function getLoggerFactory() {
  return _loggerFactory;
}
__name(getLoggerFactory, "getLoggerFactory");
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
  LogLevel2[LogLevel2["SILENT"] = 4] = "SILENT";
})(LogLevel || (LogLevel = {}));
function createLogger(options) {
  const { name, level = LogLevel.INFO, timestamps = false } = options;
  const formatMessage = /* @__PURE__ */ __name((levelStr, message) => {
    const prefix = timestamps ? `[${(/* @__PURE__ */ new Date()).toISOString()}] ` : "";
    return `${prefix}[${name}] ${levelStr}: ${message}`;
  }, "formatMessage");
  const formatMeta = /* @__PURE__ */ __name((meta) => {
    if (!meta) {
      return "";
    }
    if (meta instanceof Error) {
      return `
  Error: ${meta.message}
  Stack: ${meta.stack}`;
    }
    try {
      return `
  ${JSON.stringify(meta, null, 2)}`;
    } catch {
      return "\n  [Circular or non-serializable metadata]";
    }
  }, "formatMeta");
  return {
    debug(message, meta) {
      if (level <= LogLevel.DEBUG) {
        console.debug(formatMessage("DEBUG", message) + formatMeta(meta));
      }
    },
    info(message, meta) {
      if (level <= LogLevel.INFO) {
        console.info(formatMessage("INFO", message) + formatMeta(meta));
      }
    },
    warn(message, meta) {
      if (level <= LogLevel.WARN) {
        console.warn(formatMessage("WARN", message) + formatMeta(meta));
      }
    },
    error(message, meta) {
      if (level <= LogLevel.ERROR) {
        console.error(formatMessage("ERROR", message) + formatMeta(meta));
      }
    }
  };
}
__name(createLogger, "createLogger");

// ../../packages/contracts/dist/feature-manager.js
createLogger({
  name: "feature-manager",
  level: LogLevel.INFO
});

// ../../packages/contracts/dist/observability/types.js
var SpanStatusCode;
(function(SpanStatusCode2) {
  SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
  SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
  SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
})(SpanStatusCode || (SpanStatusCode = {}));
var SpanKind;
(function(SpanKind2) {
  SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
  SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
  SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
  SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
  SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
})(SpanKind || (SpanKind = {}));
var DiffChangeSchema = z.object({
  added: z.boolean().optional().default(false),
  removed: z.boolean().optional().default(false),
  value: z.string(),
  count: z.number().optional()
});
var RiskScoreSchema = z.object({
  score: z.number().min(0).max(10),
  factors: z.array(z.string()),
  severity: RiskSeveritySchema
});
z.object({
  metrics: z.record(z.string(), z.number()),
  trends: z.record(z.string(), z.array(z.number())),
  insights: z.array(z.string()),
  timestamp: z.number(),
  snapshotRecommendations: z.object({
    shouldCreateSnapshot: z.boolean(),
    reason: z.string(),
    urgency: RiskSeveritySchema,
    suggestedTiming: z.string()
  }).optional()
});
z.object({
  trigger: z.string().default("manual"),
  risk: z.number().min(0).max(10).optional(),
  content: z.string().optional(),
  files: z.array(z.string()).optional()
});
z.object({
  trigger: z.string().default("manual"),
  risk: z.number().min(0).max(10).optional(),
  content: z.string().optional()
});
z.object({
  id: z.string(),
  timestamp: z.number(),
  meta: z.object({
    trigger: z.string().optional(),
    risk: z.number().optional()
  }).optional()
});
z.object({
  changes: z.array(DiffChangeSchema)
});
z.object({
  before: z.record(z.string(), z.any()),
  after: z.record(z.string(), z.any())
});
z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.any().optional()
});
var RetrySchema = z.object({
  retries: z.number().int().min(0).default(2),
  factor: z.number().min(1).default(2),
  min: z.number().int().default(250),
  max: z.number().int().default(1500),
  jitter: z.boolean().default(true)
});
var CircuitSchema = z.object({
  enabled: z.boolean().default(true),
  errorThresholdPercentage: z.number().int().min(1).max(100).default(50),
  volumeThreshold: z.number().int().min(1).default(10),
  timeoutMs: z.number().int().default(5e3),
  resetMs: z.number().int().default(3e4),
  rollingCountMs: z.number().int().default(6e4),
  rollingCountBuckets: z.number().int().default(6)
});
z.object({
  timeoutMs: z.number().int().default(5e3),
  maxConcurrent: z.number().int().min(1).default(4),
  retry: RetrySchema,
  circuit: CircuitSchema,
  batch: z.object({
    size: z.number().int().min(1).default(5),
    maxWaitMs: z.number().int().default(150)
  })
});
z.object({
  debounceMs: z.number().int().default(120),
  awaitWriteFinish: z.object({
    stabilityThreshold: z.number().int().default(200),
    pollInterval: z.number().int().default(50)
  }),
  ignored: z.array(z.string()).default([
    "**/{node_modules,.git,.vscode,dist,.next,.nuxt,coverage}/**"
  ])
});

// ../../packages/contracts/dist/workspace/workspace-resolution.js
function createDefaultWorkspace(userId, repoPath) {
  return {
    workspaceId: `ws_default_${userId}`,
    workspaceName: "Personal Workspace",
    repoPath,
    userId,
    permissions: {
      read: true,
      write: true,
      manage: true,
      invite: false
    },
    resolvedFrom: "default_workspace"
  };
}
__name(createDefaultWorkspace, "createDefaultWorkspace");
function generateCacheKey(repoPath, userId) {
  return `workspace_resolution:${userId}:${repoPath}`;
}
__name(generateCacheKey, "generateCacheKey");
var SessionSchemaVersion = "sb.session.v1";
var ChangeOpSchema = z.enum([
  "created",
  "modified",
  "deleted",
  "renamed"
]);
var EOLTypeSchema = z.enum([
  "lf",
  "crlf"
]);
var SessionTriggerSchema = z.enum([
  "filewatch",
  "pre-commit",
  "manual",
  "idle-finalize"
]);
var SessionChangeSchema = z.object({
  /** Relative POSIX path from workspace root */
  p: z.string(),
  /** Operation type */
  op: ChangeOpSchema,
  /** Prior relative path (for rename operations only) */
  from: z.string().optional(),
  /** SHA-256 hash before change (CAS reference) - computed on finalize */
  hOld: z.string().optional(),
  /** SHA-256 hash after change (CAS reference) - computed on finalize */
  hNew: z.string().optional(),
  /** File size before change (bytes) */
  sizeBefore: z.number().int().nonnegative().optional(),
  /** File size after change (bytes) */
  sizeAfter: z.number().int().nonnegative().optional(),
  /** Modification time before change (Unix epoch ms) */
  mtimeBefore: z.number().int().nonnegative().optional(),
  /** Modification time after change (Unix epoch ms) */
  mtimeAfter: z.number().int().nonnegative().optional(),
  /** File permissions before change (Unix mode) */
  modeBefore: z.number().int().nonnegative().optional(),
  /** File permissions after change (Unix mode) */
  modeAfter: z.number().int().nonnegative().optional(),
  /** Line ending style before change */
  eolBefore: EOLTypeSchema.optional(),
  /** Line ending style after change */
  eolAfter: EOLTypeSchema.optional()
});
z.object({
  /** Schema version for backward compatibility */
  schema: z.literal(SessionSchemaVersion),
  /** Unique session identifier (CUID) */
  sessionId: z.string(),
  /** Session start timestamp (ISO 8601) */
  startedAt: z.string().datetime(),
  /** Session end timestamp (ISO 8601) - undefined if active */
  endedAt: z.string().datetime().optional(),
  /** VS Code workspace folder URI (multi-root workspace safe) */
  workspaceUri: z.string(),
  /** Offline-generated semantic label (never transmitted) */
  name: z.string().optional(),
  /** Trigger sources for this session */
  triggers: z.array(SessionTriggerSchema),
  /** Total number of file changes in this session */
  changeCount: z.number().int().nonnegative(),
  /** Chronological list of file changes */
  filesChanged: z.array(SessionChangeSchema),
  /** Array of snapshot IDs created during this session */
  snapshots: z.array(z.string()).optional()
});
z.object({
  sessionId: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  name: z.string().optional(),
  changeCount: z.number().int().nonnegative(),
  triggers: z.array(SessionTriggerSchema)
});
z.object({
  /** Only return sessions for this workspace URI */
  workspaceUri: z.string().optional(),
  /** Only return active sessions (endedAt is null) */
  activeOnly: z.boolean().optional(),
  /** Only return finalized sessions (endedAt is not null) */
  finalizedOnly: z.boolean().optional(),
  /** Return sessions that started after this timestamp */
  after: z.date().optional(),
  /** Return sessions that started before this timestamp */
  before: z.date().optional(),
  /** Maximum number of results */
  limit: z.number().int().positive().optional(),
  /** Offset for pagination */
  offset: z.number().int().nonnegative().optional()
});
z.object({
  /** VS Code workspace folder URI */
  workspaceUri: z.string(),
  /** Initial trigger sources */
  triggers: z.array(SessionTriggerSchema).default([
    "filewatch"
  ]),
  /** Optional semantic name (generated offline) */
  name: z.string().optional()
});
z.object({
  /** VS Code workspace folder URI (multi-root safe) */
  workspaceUri: z.string(),
  /** Idle timeout in milliseconds (default: 15 minutes) */
  idleMs: z.number().int().positive().default(15 * 6e4),
  /** Batch size for flushing changes to database (default: 50) */
  flushBatchSize: z.number().int().positive().default(50),
  /** Flush interval in milliseconds (default: 5 seconds) */
  flushIntervalMs: z.number().int().positive().default(5e3),
  /** Use VS Code file system watcher (default: true) */
  useVSCodeWatcher: z.boolean().default(true),
  /** Patterns to ignore (.snapbackignore) */
  ignorePatterns: z.array(z.string()).default([
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
  ]),
  /** @enterprise User tier (for analytics) */
  tier: z.enum([
    "free",
    "solo"
  ]).default("free"),
  /** @enterprise Analytics consent (Solo tier only) */
  consent: z.boolean().default(false)
});
var ModificationSourceSchema = z.enum([
  "extension",
  "mcp",
  "daemon",
  "cli"
]);
var ModificationTypeSchema = z.enum([
  "create",
  "update",
  "delete"
]);
z.object({
  /** Absolute path to the modified file */
  path: z.string().min(1, "Path cannot be empty"),
  /** Modification timestamp (ms since epoch) */
  timestamp: z.number().positive("Timestamp must be positive"),
  /** Type of modification */
  type: ModificationTypeSchema,
  /** Lines changed (0 if unknown or delete) */
  linesChanged: z.number().int().nonnegative().default(0),
  /** Whether this change was AI-attributed (detected by AIPresenceDetector) */
  aiAttributed: z.boolean().default(false),
  /** Which AI tool made the change, if detected (e.g., 'copilot', 'cursor', 'claude') */
  aiTool: z.string().nullable().default(null),
  /** Source surface that recorded this modification */
  source: ModificationSourceSchema
});
function fromIntelligenceFileModification(mod, source = "extension") {
  return {
    path: mod.path,
    timestamp: mod.timestamp,
    type: mod.type,
    linesChanged: mod.linesChanged ?? 0,
    aiAttributed: false,
    aiTool: null,
    source
  };
}
__name(fromIntelligenceFileModification, "fromIntelligenceFileModification");
z.object({
  /** Active extension IDs in the IDE environment */
  extensionIds: z.array(z.string()).default([]),
  /** Optional file content to analyze for AI signatures */
  content: z.string().optional(),
  /** Character velocity (chars/ms) from burst detection */
  velocity: z.number().nonnegative().optional(),
  /** Total characters changed in the operation */
  charCount: z.number().int().nonnegative().optional()
});
var AiDetectionOutputSchema = z.object({
  /** Detected AI tool name, or null if none detected */
  tool: z.string().nullable(),
  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1),
  /** Detection method that triggered */
  method: z.enum([
    "extension",
    "velocity",
    "pattern",
    "combined"
  ]).nullable(),
  /** Indicators that contributed to detection */
  indicators: z.array(z.string()).optional()
});
z.object({
  /** Code content to scan for threats */
  content: z.string()
});
var ThreatPatternSchema = z.object({
  /** Description of the threat pattern */
  description: z.string(),
  /** Severity score (0-1), where 1 is most critical */
  severity: z.number().min(0).max(1)
});
var ThreatDetectionOutputSchema = z.object({
  /** Total number of threats detected */
  threatCount: z.number().int().nonnegative(),
  /** List of detected threat patterns */
  patterns: z.array(ThreatPatternSchema),
  /** Overall severity level */
  severity: z.enum([
    "none",
    "low",
    "medium",
    "high",
    "critical"
  ]),
  /** Aggregated threat score (0-10) */
  score: z.number().min(0).max(10)
});
z.object({
  /** File path being analyzed */
  filePath: z.string(),
  /** Number of characters changed */
  charCount: z.number().int().nonnegative(),
  /** Timestamp of the change (ms since epoch) */
  timestamp: z.number().int().positive().optional()
});
var BurstDetectionOutputSchema = z.object({
  /** Whether a burst was detected */
  isBurst: z.boolean(),
  /** Character velocity (chars/ms) */
  velocity: z.number().nonnegative(),
  /** File path analyzed */
  filePath: z.string(),
  /** Total characters in the change */
  charCount: z.number().int().nonnegative(),
  /** Timestamp of detection */
  timestamp: z.number().int().positive()
});
var ComplexityFileInputSchema = z.object({
  /** File path */
  path: z.string(),
  /** File content */
  content: z.string(),
  /** Line count of the file */
  lineCount: z.number().int().nonnegative()
});
z.object({
  /** Files to analyze */
  files: z.array(ComplexityFileInputSchema)
});
var ComplexityAnalysisOutputSchema = z.object({
  /** Average complexity score across all files (0-1) */
  avgComplexity: z.number().min(0).max(1),
  /** Maximum complexity score of any single file (0-1) */
  maxComplexity: z.number().min(0).max(1),
  /** List of files with complexity > 0.7 */
  highComplexityFiles: z.array(z.string()),
  /** Number of files analyzed */
  fileCount: z.number().int().nonnegative(),
  /** Overall complexity value (same as avgComplexity) */
  value: z.number().min(0).max(1)
});
z.object({
  /** Extension IDs for AI detection */
  extensionIds: z.array(z.string()).default([]),
  /** Content to analyze (for threats, AI patterns, complexity) */
  content: z.string(),
  /** File path being analyzed */
  filePath: z.string(),
  /** Line count (for complexity calculation) */
  lineCount: z.number().int().nonnegative().optional(),
  /** Character count (for burst detection) */
  charCount: z.number().int().nonnegative().optional(),
  /** Velocity (for AI detection) */
  velocity: z.number().nonnegative().optional(),
  /** Timestamp (for burst detection) */
  timestamp: z.number().int().positive().optional()
});
z.object({
  /** Signal name */
  signal: z.enum([
    "ai",
    "threats",
    "burst",
    "complexity"
  ]),
  /** Signal-specific score/value */
  value: z.number(),
  /** Whether this signal is considered "triggered" */
  triggered: z.boolean()
});
z.object({
  /** Individual signal results */
  signals: z.object({
    ai: AiDetectionOutputSchema,
    threats: ThreatDetectionOutputSchema,
    burst: BurstDetectionOutputSchema.optional(),
    complexity: ComplexityAnalysisOutputSchema
  }),
  /** Overall risk score (0-1), weighted combination of all signals */
  overallRisk: z.number().min(0).max(1),
  /** Risk level classification */
  riskLevel: z.enum([
    "low",
    "medium",
    "high",
    "critical"
  ]),
  /** Summary of triggered signals */
  triggeredSignals: z.array(z.enum([
    "ai",
    "threats",
    "burst",
    "complexity"
  ])),
  /** Processing time in milliseconds */
  processingTimeMs: z.number().nonnegative()
});
var SignalTypeSchema = z.enum([
  "ai",
  "threats",
  "burst",
  "complexity",
  "comprehensive"
]);
z.object({
  /** Error code */
  code: z.string(),
  /** Human-readable error message */
  message: z.string(),
  /** Signal type that failed */
  signal: SignalTypeSchema.optional()
});
var ConfigFileTypeSchema = z.enum([
  "package",
  "typescript",
  "linting",
  "build",
  "environment",
  "testing",
  "framework",
  "database",
  "ci"
]);
var SupportedLanguageSchema = z.enum([
  "javascript",
  "typescript",
  "python",
  "universal"
]);
var FileBaselineSchema = z.object({
  path: z.string(),
  hash: z.string(),
  timestamp: z.number(),
  size: z.number()
});
z.object({
  path: z.string(),
  type: ConfigFileTypeSchema,
  language: SupportedLanguageSchema,
  critical: z.boolean().default(false),
  baseline: FileBaselineSchema.optional()
});
z.object({
  type: z.string(),
  path: z.string(),
  name: z.string(),
  critical: z.boolean().default(false)
});
z.object({
  content: z.any(),
  valid: z.boolean(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});
z.object({
  valid: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});
z.object({
  type: z.enum([
    "added",
    "modified",
    "deleted"
  ]),
  file: z.string(),
  timestamp: z.number(),
  baseline: FileBaselineSchema.optional()
});
z.object({
  autoDetect: z.boolean().default(true),
  watchChanges: z.boolean().default(true),
  autoProtect: z.boolean().default(true),
  customPatterns: z.array(z.any()).optional()
});
z.object({
  enabled: z.boolean(),
  patterns: z.array(z.string()).optional(),
  threshold: z.number().optional(),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional()
});
var ProtectionLevelSchema = z.enum([
  "watch",
  "warn",
  "block"
]);
z.object({
  level: ProtectionLevelSchema,
  icon: z.string(),
  label: z.string(),
  description: z.string(),
  color: z.string(),
  themeColor: z.string().optional()
});
var ProtectedFileSchema = z.object({
  path: z.string(),
  level: ProtectionLevelSchema,
  reason: z.string().optional(),
  addedAt: z.date(),
  pattern: z.string().optional()
});
var PatternRuleSchema = z.object({
  pattern: z.string(),
  level: ProtectionLevelSchema,
  reason: z.string().optional(),
  enabled: z.boolean().default(true)
});
var ProtectionConfigSchema = z.object({
  patterns: z.array(PatternRuleSchema).default([]),
  defaultLevel: ProtectionLevelSchema.default("watch"),
  enabled: z.boolean().default(true),
  autoProtectConfigs: z.boolean().default(true)
});
z.object({
  config: ProtectionConfigSchema.optional(),
  persistRegistry: z.boolean().default(true),
  registryPath: z.string().optional()
});
z.object({
  isProtected: z.boolean(),
  level: ProtectionLevelSchema.optional(),
  reason: z.string().optional(),
  file: ProtectedFileSchema.optional()
});
var __rewriteRelativeImportExtension = function(path, preserveJsx) {
  if (/^\.\.?\//.test(path)) {
    return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
      return tsx ? ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
    });
  }
  return path;
};
var SnapshotTriggerSchema = z.enum([
  "manual",
  "auto",
  "auto_save",
  "ai_detected",
  "ai-detected",
  "pre_save",
  "pre-save",
  "session_start",
  "session_end",
  "mcp_snap_start",
  "cli_protect",
  "api_request",
  "engine_internal",
  "recovery"
]);
var SnapshotOriginSchema = z.enum([
  "manual",
  "auto",
  "ai-detected",
  "recovery",
  "INTERACTIVE",
  "AUTOMATED"
]);
var SnapshotReasonCodeSchema = z.enum([
  "AI_DETECTED",
  "MANUAL_CHECKPOINT",
  "CRITICAL_FILE",
  "HIGH_RISK",
  "SESSION_START",
  "SESSION_END",
  "PRE_ROLLBACK",
  "BURST_MODE",
  "IDLE_FINALIZE"
]);
var CheckpointTypeSchema = z.enum([
  "PRE",
  "POST",
  "PRE_ROLLBACK"
]);
var SnapshotSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  version: z.string().optional().default("1.0"),
  meta: z.record(z.string(), z.any()).optional(),
  files: z.array(z.string()).optional(),
  fileContents: z.record(z.string(), z.string()).optional()
});
var FileStateSchema = z.object({
  path: z.string(),
  content: z.string(),
  /** SHA-256 hash of content (optional, computed for dedup) */
  hash: z.string().optional(),
  /** File size in bytes */
  size: z.number().optional(),
  /** Encrypted data (for sensitive files - VSCode format) */
  encrypted: z.object({
    /** Initialization vector */
    iv: z.string(),
    /** Authentication tag */
    tag: z.string(),
    /** Optional: algorithm used (default: aes-256-gcm) */
    algorithm: z.string().optional()
  }).optional()
});
var SnapshotFileRefV2Schema = z.object({
  /** SHA-256 hash of file content (CAS reference) */
  blobHash: z.string(),
  /** File size in bytes */
  size: z.number()
});
z.object({
  id: z.string(),
  timestamp: z.number(),
  files: z.array(FileStateSchema)
});
SnapshotSchema.extend({
  name: z.string(),
  fileStates: z.array(FileStateSchema).optional(),
  isProtected: z.boolean(),
  icon: z.string().optional(),
  iconColor: z.string().optional()
});
z.object({
  id: z.string(),
  name: z.string(),
  timestamp: z.number(),
  isProtected: z.boolean()
});
z.object({
  path: z.string(),
  content: z.string(),
  action: z.enum([
    "add",
    "modify",
    "delete"
  ])
});
z.object({
  /** Description/reason for the snapshot */
  description: z.string().optional(),
  /** Whether to protect from auto-deletion */
  protected: z.boolean().optional(),
  /** What triggered the snapshot */
  trigger: SnapshotTriggerSchema.optional(),
  /** Origin classification for DORA metrics */
  origin: SnapshotOriginSchema.optional(),
  /** Time since last file change in ms (DORA lead time metric) */
  timeSinceLastChangeMs: z.number().optional()
});
z.object({
  filePath: z.string().optional(),
  before: z.date().optional(),
  after: z.date().optional(),
  protected: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});
var FileDiffSchema = z.object({
  path: z.string(),
  operation: z.enum([
    "create",
    "modify",
    "delete"
  ]),
  linesAdded: z.number(),
  linesRemoved: z.number(),
  preview: z.string(),
  currentChecksum: z.string().optional(),
  snapshotChecksum: z.string().optional()
});
var DiffPreviewSchema = z.object({
  totalFiles: z.number(),
  filesCreated: z.number(),
  filesModified: z.number(),
  filesDeleted: z.number(),
  totalLinesAdded: z.number(),
  totalLinesRemoved: z.number(),
  diffs: z.array(FileDiffSchema)
});
var ConflictReportSchema = z.object({
  path: z.string(),
  reason: z.string(),
  currentChecksum: z.string(),
  snapshotChecksum: z.string()
});
z.object({
  success: z.boolean(),
  restoredFiles: z.array(z.string()),
  errors: z.array(z.string()).optional(),
  diffPreview: DiffPreviewSchema.optional(),
  conflicts: z.array(ConflictReportSchema).optional(),
  verification: z.object({
    allVerified: z.boolean(),
    results: z.array(z.object({
      path: z.string(),
      verified: z.boolean(),
      checksum: z.string(),
      expected: z.string()
    }))
  }).optional()
});
z.object({
  enableDeduplication: z.boolean().default(true),
  namingStrategy: z.enum([
    "git",
    "semantic",
    "timestamp",
    "custom"
  ]).default("semantic"),
  autoProtect: z.boolean().default(false),
  maxSnapshots: z.number().int().positive().optional()
});
z.object({
  id: z.string(),
  path: z.string(),
  hash: z.string().optional(),
  size: z.number().optional(),
  language: z.string().optional(),
  risk: RiskScoreSchema.optional(),
  lastModified: z.number().optional(),
  createdAt: z.number().optional()
});
z.object({
  // Core fields (required)
  id: z.string(),
  timestamp: z.number(),
  fileCount: z.number(),
  // Analytics fields (optional)
  totalSize: z.number().optional(),
  riskScore: RiskScoreSchema.optional(),
  tags: z.array(z.string()).optional(),
  // V2 Hierarchy fields (from VSCode ManifestV2)
  /** Sequential snapshot number (1-based, monotonic) */
  seq: z.number().int().positive().optional(),
  /** Parent snapshot seq (null for root) */
  parentSeq: z.number().int().positive().nullable().optional(),
  /** Parent snapshot ID */
  parentId: z.string().nullable().optional(),
  /** Checkpoint type */
  type: CheckpointTypeSchema.optional(),
  /** Main file that triggered this snapshot */
  anchorFile: z.string().optional(),
  // DORA Metrics fields
  /** Time since last file change in ms (for lead time metric) */
  timeSinceLastChangeMs: z.number().optional(),
  /** Compression ratio achieved (for storage efficiency) */
  compressionRatio: z.number().optional(),
  /** Storage size in bytes (after compression) */
  storageSizeBytes: z.number().optional(),
  // Origin & Classification
  /** Origin classification for analytics */
  origin: SnapshotOriginSchema.optional(),
  /** Reason codes for explainability */
  reasons: z.array(SnapshotReasonCodeSchema).optional(),
  // AI Detection
  aiDetection: z.object({
    detected: z.boolean(),
    tool: z.string().optional(),
    confidence: z.number().min(0).max(1).optional()
  }).optional(),
  // Session linkage
  /** SnapBack session ID */
  sessionId: z.string().optional(),
  /** External task ID (from LLM agent) */
  taskId: z.string().optional(),
  // UI fields
  name: z.string().optional(),
  icon: z.string().optional()
});
z.object({
  /** Schema version - always 2 for V2 */
  schemaVersion: z.literal(2),
  /** Unique ID: snap-{timestamp}-{random} */
  id: z.string(),
  /** Sequential snapshot number (1-based, monotonic) */
  seq: z.number().int().positive(),
  /** Parent snapshot seq (null for root) */
  parentSeq: z.number().int().positive().nullable(),
  /** Parent snapshot ID (null for root) */
  parentId: z.string().nullable(),
  /** Unix timestamp (ms) */
  timestamp: z.number(),
  /** Human-readable name */
  name: z.string(),
  /** Checkpoint type */
  type: CheckpointTypeSchema,
  /** The main file that triggered this snapshot */
  anchorFile: z.string(),
  /** Files in snapshot (path → ref). Empty for PRE checkpoints. */
  files: z.record(z.string(), SnapshotFileRefV2Schema),
  /** Optional metadata */
  metadata: z.object({
    /** Risk score 0-1 */
    riskScore: z.number().min(0).max(1).optional(),
    /** Origin classification */
    origin: SnapshotOriginSchema.optional(),
    /** Stable reason codes */
    reasons: z.array(SnapshotReasonCodeSchema).optional(),
    /** AI detection info */
    aiDetection: z.object({
      detected: z.boolean(),
      tool: z.string().optional(),
      confidence: z.number().optional()
    }).optional(),
    /** SnapBack session ID */
    sessionId: z.string().optional(),
    /** External task ID */
    taskId: z.string().optional(),
    /** DORA: Time since last change */
    timeSinceLastChangeMs: z.number().optional()
  }).optional()
});
z.object({
  /** Unique ID */
  id: z.string(),
  /** Unix timestamp (ms) */
  timestamp: z.number(),
  /** Human-readable name */
  name: z.string(),
  /** Trigger reason */
  trigger: z.enum([
    "auto",
    "manual",
    "ai-detected",
    "pre-save"
  ]),
  /** Main file that triggered snapshot */
  anchorFile: z.string(),
  /** Files in snapshot (path → ref) */
  files: z.record(z.string(), z.object({
    blob: z.string(),
    size: z.number()
  })),
  /** Optional metadata */
  metadata: z.object({
    riskScore: z.number().optional(),
    aiDetection: z.object({
      detected: z.boolean(),
      tool: z.string().optional(),
      confidence: z.number().optional()
    }).optional(),
    sessionId: z.string().optional(),
    taskId: z.string().optional()
  }).optional()
});
z.object({
  workspaceId: z.string(),
  period: z.object({
    start: z.number(),
    end: z.number()
  }),
  risk: RiskScoreSchema,
  fileStats: z.object({
    total: z.number(),
    byLanguage: z.record(z.string(), z.number()),
    byRisk: z.record(z.string(), z.number())
  }),
  snapshotStats: z.object({
    total: z.number(),
    frequency: z.number(),
    averageSize: z.number().optional()
  }),
  snapshotRecommendations: z.object({
    shouldCreateSnapshot: z.boolean(),
    reason: z.string(),
    urgency: RiskSeveritySchema,
    suggestedTiming: z.string()
  }),
  trends: z.object({
    risk: z.array(z.object({
      timestamp: z.number(),
      score: z.number()
    })),
    activity: z.array(z.object({
      timestamp: z.number(),
      count: z.number()
    }))
  })
});
async function createSnapshotStorage(basePath) {
  try {
    const { StorageBrokerAdapter } = await import(__rewriteRelativeImportExtension("@snapback/sdk/storage"));
    const storage = new StorageBrokerAdapter(`${basePath}/.snapback/snapback.db`);
    await storage.initialize();
    return {
      create: /* @__PURE__ */ __name(async (data) => {
        const snapshot = {
          id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
          version: "1.0",
          meta: {
            ...data,
            protected: data.protected || false,
            description: data.description || ""
          }
        };
        await storage.save(snapshot);
        return snapshot;
      }, "create"),
      retrieve: /* @__PURE__ */ __name(async (id) => {
        return await storage.get(id);
      }, "retrieve"),
      list: /* @__PURE__ */ __name(async () => {
        return await storage.list();
      }, "list"),
      restore: /* @__PURE__ */ __name(async (id, _targetPath, options) => {
        const snapshot = await storage.get(id);
        if (!snapshot) {
          return {
            success: false,
            restoredFiles: [],
            errors: [
              `Snapshot ${id} not found`
            ]
          };
        }
        if (options?.dryRun) {
          return {
            success: true,
            restoredFiles: snapshot.files || [],
            errors: []
          };
        }
        return {
          success: true,
          restoredFiles: snapshot.files || [],
          errors: []
        };
      }, "restore")
    };
  } catch (error) {
    throw new Error(`Failed to initialize snapshot storage: ${error instanceof Error ? error.message : String(error)}. Ensure @snapback/sdk is installed and storage path is writable.`);
  }
}
__name(createSnapshotStorage, "createSnapshotStorage");
var PROTECTION_STATUSES = [
  "active",
  "inactive"
];
var RECENT_ACTIVITY_ACTIONS = [
  "snapshot_created",
  "recovery_performed",
  "ai_detected"
];
var AI_TOOLS = [
  "copilot",
  "cursor",
  "claude",
  "windsurf"
];
var RecentActivitySchema = z.object({
  timestamp: z.number().int().positive(),
  action: z.enum(RECENT_ACTIVITY_ACTIONS),
  file: z.string().min(1),
  ai_tool: z.enum(AI_TOOLS).optional()
});
var AIActivityBreakdownSchema = z.object({
  copilot: z.number().int().nonnegative(),
  cursor: z.number().int().nonnegative(),
  claude: z.number().int().nonnegative(),
  windsurf: z.number().int().nonnegative().optional()
});
var DashboardMetricsSchema = z.object({
  protection_status: z.enum(PROTECTION_STATUSES),
  total_snapshots: z.number().int().nonnegative(),
  total_recoveries: z.number().int().nonnegative(),
  files_protected: z.number().int().nonnegative(),
  ai_detection_rate: z.number().min(0).max(100),
  recent_activity: z.array(RecentActivitySchema).max(10),
  ai_breakdown: AIActivityBreakdownSchema
});
var DashboardMetricsErrorSchema = z.object({
  error: z.literal(true),
  code: z.enum([
    "UNAUTHORIZED",
    "NOT_FOUND",
    "INTERNAL_ERROR"
  ]),
  message: z.string()
});
z.union([
  DashboardMetricsSchema,
  DashboardMetricsErrorSchema
]);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __esm = /* @__PURE__ */ __name((fn, res) => /* @__PURE__ */ __name(function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
}, "__init"), "__esm");
var __export = /* @__PURE__ */ __name((target, all) => {
  for (var name in all) __defProp(target, name, {
    get: all[name],
    enumerable: true
  });
}, "__export");
var query_classifier_exports = {};
__export(query_classifier_exports, {
  CODE_SYNONYMS: /* @__PURE__ */ __name(() => CODE_SYNONYMS, "CODE_SYNONYMS"),
  calculateComplexity: /* @__PURE__ */ __name(() => calculateComplexity, "calculateComplexity"),
  classifyQuery: /* @__PURE__ */ __name(() => classifyQuery, "classifyQuery"),
  expandQuery: /* @__PURE__ */ __name(() => expandQuery, "expandQuery"),
  getRetrievalStrategy: /* @__PURE__ */ __name(() => getRetrievalStrategy, "getRetrievalStrategy"),
  getWeightsForType: /* @__PURE__ */ __name(() => getWeightsForType, "getWeightsForType"),
  validateWeights: /* @__PURE__ */ __name(() => validateWeights, "validateWeights")
});
function classifyQuery(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return {
      type: "exploratory",
      complexity: "simple",
      confidence: 0.5,
      weights: WEIGHT_CONFIGS.exploratory,
      reason: "Empty query, defaulting to exploratory [simple]"
    };
  }
  const scores = {
    factual: calculateFactualScore(normalizedQuery),
    conceptual: calculateConceptualScore(normalizedQuery),
    exploratory: calculateExploratoryScore(normalizedQuery)
  };
  const entries = Object.entries(scores);
  entries.sort((a, b) => b[1] - a[1]);
  const [winningType, winningScore] = entries[0];
  const [, secondScore] = entries[1];
  const margin = winningScore - secondScore;
  const confidence = Math.min(0.95, 0.5 + margin * 0.5);
  const complexity = calculateComplexity(normalizedQuery);
  const reason = buildReason(winningType, normalizedQuery, scores, complexity);
  return {
    type: winningType,
    complexity,
    confidence,
    weights: WEIGHT_CONFIGS[winningType],
    reason
  };
}
__name(classifyQuery, "classifyQuery");
function calculateFactualScore(query) {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  for (const pattern of PATTERNS.factual.prefixes) {
    if (pattern.test(query)) {
      score += 0.45;
      break;
    }
  }
  let indicatorCount = 0;
  for (const pattern of PATTERNS.factual.indicators) {
    if (pattern.test(query)) {
      indicatorCount++;
    }
  }
  if (indicatorCount > 0) {
    score += 0.25 + Math.min(indicatorCount - 1, 3) * 0.1;
  }
  for (const pattern of PATTERNS.factual.exactMatchBoost) {
    if (pattern.test(query)) {
      score += 0.12;
    }
  }
  const words = query.split(/\s+/);
  if (words.length >= 2 && words.length <= 5 && score > 0) {
    score += 0.15;
  }
  const acronymCount = (query.match(/\b[A-Z]{2,}\b/g) || []).length;
  const hasComparison = lowerQuery.includes("vs") || lowerQuery.includes("versus") || lowerQuery.includes("between") || lowerQuery.includes("trade-off") || lowerQuery.includes("tradeoff") || lowerQuery.includes("compare");
  score += acronymCount * (hasComparison ? 0.05 : 0.15);
  if (/^(?:const|let|var|function|class|import|export|async|await)\s/.test(query)) {
    score += 0.3;
  }
  return Math.min(1, score);
}
__name(calculateFactualScore, "calculateFactualScore");
function calculateConceptualScore(query) {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  for (const pattern of PATTERNS.conceptual.prefixes) {
    if (pattern.test(query)) {
      score += 0.55;
      break;
    }
  }
  let indicatorCount = 0;
  for (const pattern of PATTERNS.conceptual.indicators) {
    if (pattern.test(query)) {
      indicatorCount++;
    }
  }
  if (indicatorCount > 0) {
    score += 0.25 + Math.min(indicatorCount - 1, 2) * 0.15;
  }
  const words = query.split(/\s+/);
  if (words.length > 8) {
    score += 0.15;
  }
  if (/what\s+is\s+the\s+purpose/i.test(query)) {
    score += 0.4;
  }
  if (/how\s+does\s+.*\s+work/i.test(query)) {
    score += 0.35;
  }
  if (/\bWHY\b/.test(query)) {
    score += 0.3;
  }
  if (/^why\s+does\s+/i.test(query)) {
    const hasCodeIdentifier = /\b[A-Z][a-z]+[A-Z]\w+\b/.test(query) || /\b[a-z]+_[a-z]+\b/.test(query);
    if (hasCodeIdentifier) {
      score += 0.35;
    }
  }
  if (lowerQuery.includes("best practice")) {
    score += 0.3;
  }
  if (lowerQuery.includes("trade-off") || lowerQuery.includes("tradeoff") || lowerQuery.includes("trade off")) {
    score += 0.55;
  }
  const hasComparison = lowerQuery.includes(" vs ") || lowerQuery.includes(" versus ") || lowerQuery.includes("difference between") || lowerQuery.includes("compare ");
  const acronymCount = (query.match(/\b[A-Z]{2,}\b/g) || []).length;
  if (hasComparison && acronymCount > 0) {
    score += 0.4;
  }
  if (/what\s+is\s+the\s+difference/i.test(query)) {
    score += 0.45;
  }
  return Math.min(1, score);
}
__name(calculateConceptualScore, "calculateConceptualScore");
function calculateExploratoryScore(query) {
  let score = 0.15;
  for (const pattern of PATTERNS.exploratory.prefixes) {
    if (pattern.test(query)) {
      score += 0.25;
      break;
    }
  }
  for (const pattern of PATTERNS.exploratory.indicators) {
    if (pattern.test(query)) {
      score += 0.15;
    }
  }
  const words = query.split(/\s+/);
  if (words.length >= 4 && words.length <= 8) {
    score += 0.1;
  }
  if (/\?$/.test(query) && words.length <= 6) {
    score += 0.1;
  }
  return Math.min(1, score);
}
__name(calculateExploratoryScore, "calculateExploratoryScore");
function buildReason(type, query, scores, complexity) {
  const scoreStr = Object.entries(scores).map(([t, s]) => `${t}=${s.toFixed(2)}`).join(", ");
  const complexityStr = `[${complexity}]`;
  switch (type) {
    case "factual":
      if (/\b[A-Z][a-z]+[A-Z]\w+\b/.test(query)) {
        return `CamelCase identifier detected ${complexityStr} (${scoreStr})`;
      }
      if (/^(?:what|where|which|how\s+to)\s+/i.test(query)) {
        return `Factual prefix pattern ${complexityStr} (${scoreStr})`;
      }
      return `Technical term patterns ${complexityStr} (${scoreStr})`;
    case "conceptual":
      if (/^why\s+/i.test(query)) {
        return `"Why" question ${complexityStr} (${scoreStr})`;
      }
      if (/^explain\s+/i.test(query)) {
        return `Explanation request ${complexityStr} (${scoreStr})`;
      }
      return `Conceptual indicators ${complexityStr} (${scoreStr})`;
    case "exploratory":
      return `General exploration ${complexityStr} (${scoreStr})`;
  }
}
__name(buildReason, "buildReason");
function getWeightsForType(type) {
  return {
    ...WEIGHT_CONFIGS[type]
  };
}
__name(getWeightsForType, "getWeightsForType");
function validateWeights(weights) {
  const sum = weights.semantic + weights.keyword;
  return Math.abs(sum - 1) < 0.01;
}
__name(validateWeights, "validateWeights");
function calculateComplexity(query) {
  const words = query.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  let complexityScore = 0;
  if (wordCount < 4) {
    complexityScore -= 0.3;
  } else if (wordCount >= 5 && wordCount <= 10) {
    complexityScore += 0.1;
  } else if (wordCount > 15) {
    complexityScore += 0.4;
  } else if (wordCount > 10) {
    complexityScore += 0.2;
  }
  const hasMultipleClauses = /\b(and|or|but|while|whereas|although)\b/i.test(query);
  if (hasMultipleClauses) {
    complexityScore += 0.25;
  }
  const hasComparison = /\b(compare|vs\.?|versus|difference\s+between|better\s+than|worse\s+than)\b/i.test(query);
  if (hasComparison) {
    complexityScore += 0.25;
  }
  const hasConditional = /\b(if|when|unless|whether|in\s+case|depending)\b/i.test(query);
  if (hasConditional) {
    complexityScore += 0.2;
  }
  const questionCount = (query.match(/\?/g) || []).length;
  if (questionCount > 1) {
    complexityScore += 0.3;
  }
  const hasSequence = /\b(first|then|next|finally|also|additionally|furthermore)\b/i.test(query);
  if (hasSequence) {
    complexityScore += 0.15;
  }
  const hasPossessive = /'s\s+\w+/.test(query) || /\bof\s+the\s+\w+/.test(query);
  if (hasPossessive && wordCount > 6) {
    complexityScore += 0.1;
  }
  const isSimpleLookup = /^(?:what\s+is|where\s+is|show\s+me|find|get)\s+\w+$/i.test(query);
  if (isSimpleLookup) {
    complexityScore -= 0.4;
  }
  const isSingleEntity = wordCount <= 3 && /^[A-Z]\w+$/.test(words[0] || "");
  if (isSingleEntity) {
    complexityScore -= 0.3;
  }
  if (complexityScore < 0.1) {
    return "simple";
  }
  if (complexityScore <= 0.35) {
    return "moderate";
  }
  return "complex";
}
__name(calculateComplexity, "calculateComplexity");
function getRetrievalStrategy(complexity, type, confidence) {
  if (complexity === "simple" && confidence > 0.85) {
    return {
      shouldRetrieve: false,
      topK: 0,
      useReranking: false,
      useExpansion: false
    };
  }
  if (complexity === "simple") {
    return {
      shouldRetrieve: true,
      topK: 3,
      useReranking: false,
      useExpansion: false
    };
  }
  if (complexity === "moderate") {
    return {
      shouldRetrieve: true,
      topK: 10,
      useReranking: true,
      useExpansion: type === "factual"
    };
  }
  return {
    shouldRetrieve: true,
    topK: 20,
    useReranking: true,
    useExpansion: true
  };
}
__name(getRetrievalStrategy, "getRetrievalStrategy");
function expandQuery(query, type) {
  if (type !== "factual") {
    return [
      query
    ];
  }
  const expanded = [
    query
  ];
  const lowerQuery = query.toLowerCase();
  for (const [term, synonyms] of Object.entries(CODE_SYNONYMS)) {
    if (lowerQuery.includes(term)) {
      const synonym = synonyms[0];
      if (synonym) {
        expanded.push(query.replace(new RegExp(`\\b${term}\\b`, "gi"), synonym));
      }
    }
  }
  return expanded.slice(0, 3);
}
__name(expandQuery, "expandQuery");
var WEIGHT_CONFIGS;
var PATTERNS;
var CODE_SYNONYMS;
var init_query_classifier = __esm({
  "src/knowledge/query-classifier.ts"() {
    WEIGHT_CONFIGS = {
      factual: {
        semantic: 0.3,
        keyword: 0.7
      },
      conceptual: {
        semantic: 0.7,
        keyword: 0.3
      },
      exploratory: {
        semantic: 0.5,
        keyword: 0.5
      }
    };
    PATTERNS = {
      // Factual: specific lookups, exact terms, "what is", "how to"
      factual: {
        prefixes: [
          /^what\s+is\s+/i,
          /^what's\s+/i,
          /^where\s+is\s+/i,
          /^where\s+/i,
          /^which\s+/i,
          /^how\s+to\s+/i,
          /^how\s+do\s+(?:i|you|we)\s+/i,
          /^show\s+me\s+/i,
          /^find\s+/i,
          /^get\s+/i,
          /^list\s+/i
        ],
        // Specific technical terms, paths, function names
        indicators: [
          /\b[A-Z][a-z]+[A-Z]\w+\b/,
          /\b[a-z]+_[a-z]+\b/,
          /\b\w+\.\w+\b/,
          /\b(?:import|export|from|require)\b/,
          /['"`][\w./]+['"`]/,
          /\b(?:function|class|const|let|var|type|interface)\s+\w+/,
          /\b\d+\.\d+(?:\.\d+)?\b/,
          /\b[A-Z_]{2,}\b/,
          /\b\w+\/\w+/,
          /\.(?:ts|tsx|js|jsx|py|go|rs|java|cpp|c|h)(?:\b|$)/i,
          /=>|->|\(\)|{}|\[\]/,
          /\b(?:TypeError|Error|Exception|undefined|null)\b/
        ],
        // Weight boost for exact match signals
        exactMatchBoost: [
          /\bexact\b/i,
          /\bspecific\b/i,
          /\bpath\b/i,
          /\bfile\b/i,
          /\bfunction\b/i,
          /\bclass\b/i,
          /\bimport\b/i,
          /\berror\b/i,
          /\bfix\b/i,
          /\bbug\b/i,
          /\bdefined\b/i,
          /\blocated\b/i,
          /\bmiddleware\b/i,
          /\bsocket\b/i,
          /\bIPC\b/i,
          /\bdaemon\b/i,
          /\btrigger\b/i,
          /\btest(?:s|ing)?\b/i
        ]
      },
      // Conceptual: understanding, reasoning, "why", "explain"
      conceptual: {
        prefixes: [
          /^why\s+/i,
          /^explain\s+/i,
          /^what\s+(?:does|do|is\s+the\s+purpose|is\s+the\s+difference|are\s+the\s+best)\s+/i,
          /^how\s+does\s+/i,
          /^understand\s+/i,
          /^describe\s+/i,
          /^compare\s+/i,
          /^when\s+should\s+/i
        ],
        indicators: [
          /\b(?:concept|pattern|principle|approach|strategy|architecture)\b/i,
          /\b(?:best\s+practice|trade-?off|pros?\s+and\s+cons?)\b/i,
          /\b(?:difference\s+between|versus|vs\.?)\b/i,
          /\b(?:should\s+i|when\s+to|when\s+should)\b/i,
          /\b(?:better|worse|prefer|recommend)\b/i,
          /\b(?:design|philosophy|reasoning|rationale)\b/i,
          /\b(?:purpose\s+of|purpose)\b/i,
          /\b(?:authentication|authorization)\s+work/i,
          /\bSSR\b.*\bCSR\b|\bCSR\b.*\bSSR\b/i
        ]
      },
      // Exploratory: open-ended, general browsing (NOT "how does X work")
      exploratory: {
        prefixes: [
          /^tell\s+me\s+about\s+/i,
          /^can\s+(?:i|you|we)\s+/i,
          /^is\s+(?:it|there)\s+/i
        ],
        indicators: [
          /\b(?:overview|general|introduction|getting\s+started)\b/i,
          /\b(?:example|sample|demo|tutorial)\b/i,
          /\?$/
        ]
      }
    };
    __name2(classifyQuery, "classifyQuery");
    __name2(calculateFactualScore, "calculateFactualScore");
    __name2(calculateConceptualScore, "calculateConceptualScore");
    __name2(calculateExploratoryScore, "calculateExploratoryScore");
    __name2(buildReason, "buildReason");
    __name2(getWeightsForType, "getWeightsForType");
    __name2(validateWeights, "validateWeights");
    __name2(calculateComplexity, "calculateComplexity");
    __name2(getRetrievalStrategy, "getRetrievalStrategy");
    CODE_SYNONYMS = {
      function: [
        "method",
        "fn",
        "func",
        "handler",
        "callback"
      ],
      class: [
        "type",
        "interface",
        "struct",
        "model"
      ],
      error: [
        "exception",
        "bug",
        "issue",
        "failure",
        "fault"
      ],
      import: [
        "require",
        "include",
        "use",
        "dependency"
      ],
      config: [
        "configuration",
        "settings",
        "options",
        "prefs"
      ],
      api: [
        "endpoint",
        "route",
        "service",
        "handler"
      ],
      database: [
        "db",
        "store",
        "persistence",
        "repository"
      ],
      test: [
        "spec",
        "unit test",
        "assertion",
        "check"
      ],
      component: [
        "widget",
        "element",
        "module",
        "part"
      ],
      state: [
        "data",
        "store",
        "context",
        "props"
      ]
    };
    __name2(expandQuery, "expandQuery");
  }
});
var DEFAULT_ADVISORY_CONFIG = {
  enabled: true,
  maxWarnings: 5,
  maxSuggestions: 3,
  maxRelatedFiles: 5,
  includeSessionContext: true,
  includeFileHistory: true
};
var logger2 = createLogger({
  name: "intelligence",
  timestamps: process.env.NODE_ENV !== "test"
});
var ConsecutiveModificationRule = {
  id: "consecutive-modification-warning",
  priority: 1,
  trigger: /* @__PURE__ */ __name2((ctx) => {
    for (const [_file, count] of ctx.session.consecutiveFileModifications.entries()) {
      if (count >= 3) {
        return true;
      }
    }
    return false;
  }, "trigger"),
  generate: /* @__PURE__ */ __name2((ctx) => {
    const warnings = [];
    for (const [file, count] of ctx.session.consecutiveFileModifications.entries()) {
      if (count >= 3) {
        warnings.push({
          level: "warning",
          code: "CONSECUTIVE_MODIFICATIONS",
          message: `File modified ${count} times this session`,
          file,
          suggestion: "Consider creating a snapshot before further modifications"
        });
      }
    }
    return {
      warnings
    };
  }, "generate")
};
var FRAGILITY_THRESHOLDS = {
  /** Critical fragility - file very prone to rollbacks */
  HIGH: 0.7,
  /** Moderate fragility - file somewhat prone to issues */
  MODERATE: 0.5
};
var FragileFileRule = {
  id: "fragile-file-warning",
  priority: 2,
  trigger: /* @__PURE__ */ __name2((ctx) => {
    for (const [_file, score] of ctx.fragility.entries()) {
      if (score > FRAGILITY_THRESHOLDS.MODERATE) {
        return true;
      }
    }
    return false;
  }, "trigger"),
  generate: /* @__PURE__ */ __name2((ctx) => {
    const warnings = [];
    for (const [file, score] of ctx.fragility.entries()) {
      if (score > FRAGILITY_THRESHOLDS.HIGH) {
        warnings.push({
          level: "error",
          code: "FRAGILE_FILE",
          message: `File has high fragility score (${(score * 100).toFixed(0)}%)`,
          file,
          suggestion: "Create snapshot before modifying - high rollback risk"
        });
      } else if (score > FRAGILITY_THRESHOLDS.MODERATE) {
        warnings.push({
          level: "warning",
          code: "FRAGILE_FILE",
          message: `File has moderate fragility score (${(score * 100).toFixed(0)}%)`,
          file,
          suggestion: "Proceed with caution - potential rollback risk"
        });
      }
    }
    return {
      warnings
    };
  }, "generate")
};
var HIGH_TOOL_CALL_THRESHOLD = 20;
var isTestFile = /* @__PURE__ */ __name2((file) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file), "isTestFile");
var isCodeFile = /* @__PURE__ */ __name2((file) => /\.(ts|tsx|js|jsx)$/.test(file), "isCodeFile");
var GenericSuggestionsRule = {
  id: "generic-suggestions",
  priority: 10,
  trigger: /* @__PURE__ */ __name2(() => true, "trigger"),
  generate: /* @__PURE__ */ __name2((ctx) => {
    const suggestions = [];
    if (ctx.session.riskLevel === "medium" || ctx.session.riskLevel === "high") {
      suggestions.push({
        text: "Create snapshot before continuing",
        priority: 1,
        confidence: 0.8,
        category: "snapshot",
        files: ctx.files
      });
    }
    if (ctx.files.some((f) => isCodeFile(f) && !isTestFile(f))) {
      suggestions.push({
        text: "Run tests before committing",
        priority: 2,
        confidence: 0.9,
        category: "testing"
      });
    }
    if (ctx.session.toolCallCount > HIGH_TOOL_CALL_THRESHOLD) {
      suggestions.push({
        text: "Review changes - high tool call count may indicate complexity",
        priority: 3,
        confidence: 0.7,
        category: "validation"
      });
    }
    return {
      suggestions
    };
  }, "generate")
};
var LoopDetectionRule = {
  id: "loop-detection-warning",
  priority: 1,
  trigger: /* @__PURE__ */ __name2((ctx) => {
    return ctx.session.loopsDetected > 0;
  }, "trigger"),
  generate: /* @__PURE__ */ __name2((ctx) => {
    const warnings = [];
    if (ctx.session.loopsDetected > 0) {
      warnings.push({
        level: "error",
        code: "LOOP_DETECTED",
        message: `${ctx.session.loopsDetected} loop${ctx.session.loopsDetected > 1 ? "s" : ""} detected in session`,
        suggestion: "Review recent tool calls - may be repeating same operations"
      });
    }
    return {
      warnings
    };
  }, "generate")
};
function isTestFile2(filePath) {
  return filePath.includes(".test.") || filePath.includes(".spec.") || filePath.includes("__tests__");
}
__name(isTestFile2, "isTestFile2");
__name2(isTestFile2, "isTestFile");
var SkippedTestRule = {
  id: "skipped-vitest-tests",
  priority: 2,
  /**
  * Trigger when any test file is in the target files
  */
  trigger: /* @__PURE__ */ __name2((ctx) => {
    return ctx.files.some(isTestFile2);
  }, "trigger"),
  /**
  * Generate suggestions based on skipped tests detected
  */
  generate: /* @__PURE__ */ __name2((ctx) => {
    const suggestions = [];
    const allSkipped = [];
    const filesWithSkipped = [];
    for (const file of ctx.files) {
      if (!isTestFile2(file)) {
        continue;
      }
      try {
        const code = ctx.code;
        if (!code) {
          continue;
        }
        const result = detectSkippedTests(code, file);
        if (result.parsed && result.skipped.length > 0) {
          allSkipped.push(result);
          filesWithSkipped.push(file);
        }
      } catch {
      }
    }
    const totalSkipped = allSkipped.reduce((sum, r) => sum + r.skipped.length, 0);
    if (totalSkipped === 0) {
      return {
        suggestions: []
      };
    }
    let priority;
    if (totalSkipped >= 6) {
      priority = 1;
    } else if (totalSkipped >= 3) {
      priority = 2;
    } else {
      priority = 3;
    }
    const filesList = filesWithSkipped.length <= 3 ? filesWithSkipped.join(", ") : `${filesWithSkipped.length} files`;
    suggestions.push({
      text: `Found ${totalSkipped} skipped test${totalSkipped > 1 ? "s" : ""} in ${filesList}. Consider re-enabling these tests or removing if obsolete.`,
      priority,
      confidence: 0.9,
      category: "testing",
      files: filesWithSkipped
    });
    return {
      suggestions
    };
  }, "generate")
};
var ViolationHistoryRule = {
  id: "violation-history-warning",
  priority: 3,
  trigger: /* @__PURE__ */ __name2((ctx) => {
    return ctx.recentViolations.length > 0;
  }, "trigger"),
  generate: /* @__PURE__ */ __name2((ctx) => {
    const warnings = [];
    const violationsByFile = /* @__PURE__ */ new Map();
    for (const violation of ctx.recentViolations) {
      const existing = violationsByFile.get(violation.file) ?? [];
      existing.push(violation.type);
      violationsByFile.set(violation.file, existing);
    }
    for (const [file, types] of violationsByFile.entries()) {
      const uniqueTypes = [
        ...new Set(types)
      ];
      warnings.push({
        level: "warning",
        code: "VIOLATION_HISTORY",
        message: `${uniqueTypes.length} past violation type${uniqueTypes.length > 1 ? "s" : ""}: ${uniqueTypes.join(", ")}`,
        file,
        suggestion: "Review past mistakes before modifying"
      });
    }
    return {
      warnings
    };
  }, "generate")
};
var AdvisoryEngine = class {
  static {
    __name(this, "AdvisoryEngine");
  }
  static {
    __name2(this, "AdvisoryEngine");
  }
  config;
  rules = [];
  constructor(config = {}) {
    if (config.maxWarnings !== void 0 && config.maxWarnings < 0) {
      throw new Error("AdvisoryConfig.maxWarnings must be non-negative");
    }
    if (config.maxSuggestions !== void 0 && config.maxSuggestions < 0) {
      throw new Error("AdvisoryConfig.maxSuggestions must be non-negative");
    }
    if (config.maxRelatedFiles !== void 0 && config.maxRelatedFiles < 0) {
      throw new Error("AdvisoryConfig.maxRelatedFiles must be non-negative");
    }
    this.config = {
      ...DEFAULT_ADVISORY_CONFIG,
      ...config
    };
    this.initializeBuiltInRules();
  }
  /**
  * Initialize built-in advisory rules
  */
  initializeBuiltInRules() {
    this.registerRule(ConsecutiveModificationRule);
    this.registerRule(FragileFileRule);
    this.registerRule(LoopDetectionRule);
    this.registerRule(ViolationHistoryRule);
    this.registerRule(GenericSuggestionsRule);
  }
  /**
  * Register a custom advisory rule
  * Uses insertion sort for O(n) performance with small rule counts
  */
  registerRule(rule) {
    let left = 0;
    let right = this.rules.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.rules[mid].priority < rule.priority) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    this.rules.splice(left, 0, rule);
  }
  /**
  * Enrich context with advisory guidance
  */
  enrich(context) {
    if (!this.config.enabled) {
      return {
        summary: "Advisory system disabled",
        warnings: [],
        suggestions: [],
        relatedFiles: [],
        fileHistory: []
      };
    }
    const warnings = [];
    const suggestions = [];
    const relatedFiles = [];
    for (const rule of this.rules) {
      try {
        if (rule.trigger(context)) {
          const result = rule.generate(context);
          if (result.warnings) {
            warnings.push(...result.warnings);
          }
          if (result.suggestions) {
            suggestions.push(...result.suggestions);
          }
          if (result.relatedFiles) {
            relatedFiles.push(...result.relatedFiles);
          }
        }
      } catch (error) {
        logger2.error("Advisory rule failed", {
          ruleId: rule.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    const limitedWarnings = warnings.slice(0, this.config.maxWarnings);
    const limitedSuggestions = suggestions.sort((a, b) => a.priority - b.priority).slice(0, this.config.maxSuggestions);
    const limitedRelatedFiles = relatedFiles.slice(0, this.config.maxRelatedFiles);
    const fileHistory = this.config.includeFileHistory ? this.generateFileHistory(context) : [];
    const summary = this.generateSummary(context);
    const sessionContext = this.config.includeSessionContext ? {
      riskLevel: context.session.riskLevel,
      toolCallCount: context.session.toolCallCount,
      filesModified: context.session.filesModified,
      loopsDetected: context.session.loopsDetected
    } : void 0;
    return {
      summary,
      warnings: limitedWarnings,
      suggestions: limitedSuggestions,
      relatedFiles: limitedRelatedFiles,
      fileHistory,
      session: sessionContext
    };
  }
  /**
  * Generate file history for target files
  */
  generateFileHistory(context) {
    return context.files.map((file) => {
      const modificationsThisSession = context.session.consecutiveFileModifications.get(file) ?? 0;
      const fragilityScore = context.fragility.get(file) ?? 0;
      return {
        path: file,
        // Phase 2 Enhancement (INT-010): Add persistent file modification tracking
        // TODO: Would need persistent tracking across sessions
        modificationsToday: 0,
        modificationsThisSession,
        // Phase 2 Enhancement (INT-011): Integrate with FragilityTracker
        // TODO: Would need fragility tracker with rollback event history
        rollbacksThisWeek: 0,
        // Phase 2 Enhancement (INT-012): Add git integration for author tracking
        // TODO: Would need git blame/log integration
        lastModifiedBy: "unknown",
        lastModified: Date.now(),
        fragilityScore
      };
    });
  }
  /**
  * Generate summary text
  */
  generateSummary(context) {
    if (context.files.length === 0) {
      return "No specific files targeted";
    }
    let maxMods = 0;
    let maxModFile = "";
    for (const [file, count] of context.session.consecutiveFileModifications.entries()) {
      if (count > maxMods) {
        maxMods = count;
        maxModFile = file;
      }
    }
    if (maxMods > 0) {
      const fragility = context.fragility.get(maxModFile) ?? 0;
      const fragilityLevel = fragility > 0.7 ? "HIGH" : fragility > 0.5 ? "MODERATE" : fragility > 0.3 ? "LOW" : "STABLE";
      return `${maxModFile} has been modified ${maxMods} times this session (fragility: ${fragilityLevel})`;
    }
    return `Analyzing ${context.files.length} file${context.files.length > 1 ? "s" : ""}`;
  }
  /**
  * Get file history (stub for future implementation)
  */
  getFileHistory(file) {
    return {
      path: file,
      modificationsToday: 0,
      modificationsThisSession: 0,
      rollbacksThisWeek: 0,
      lastModifiedBy: "unknown",
      lastModified: Date.now(),
      fragilityScore: 0
    };
  }
};
var LANE_PRIORITIES = {
  policy: 0,
  rules: 1,
  local: 2,
  structure: 3,
  retrieved: 4,
  history: 5
};
var LANES_BY_PRIORITY = [
  "policy",
  "rules",
  "local",
  "structure",
  "retrieved",
  "history"
];
var KIND_PRIORITIES = {
  constraint: 0,
  rule_doc: 1,
  local_diff: 2,
  recent_edit: 3,
  symbol_context: 4,
  dependency_graph: 5,
  test_context: 6,
  semantic_match: 7,
  session_history: 8,
  violation: 9,
  learning: 10
};
function defaultTokenCounter(text) {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}
__name(defaultTokenCounter, "defaultTokenCounter");
__name2(defaultTokenCounter, "defaultTokenCounter");
var DEFAULT_BUDGET_CONFIG = {
  totalTokens: 8e3,
  lanes: {
    policy: {
      min: 200,
      max: 500,
      priority: 0
    },
    rules: {
      min: 500,
      max: 2e3,
      priority: 1
    },
    local: {
      min: 1e3,
      max: 3e3,
      priority: 2
    },
    structure: {
      min: 0,
      max: 1500,
      priority: 3
    },
    retrieved: {
      min: 0,
      max: 2e3,
      priority: 4
    },
    history: {
      min: 0,
      max: 1e3,
      priority: 5
    }
  }
};
function validateBudgetConfig(config) {
  if (!config) {
    throw new Error("Budget config is required");
  }
  if (!Number.isFinite(config.totalTokens) || config.totalTokens <= 0) {
    throw new Error(`Invalid totalTokens: ${config.totalTokens}. Must be positive.`);
  }
  for (const lane of LANES_BY_PRIORITY) {
    if (!config.lanes[lane]) {
      throw new Error(`Missing lane configuration: ${lane}`);
    }
  }
  const sumMins = Object.values(config.lanes).reduce((sum, lane) => sum + lane.min, 0);
  if (sumMins > config.totalTokens) {
    throw new Error(`Invalid budget: sum of lane mins (${sumMins}) exceeds total (${config.totalTokens}). Reduce mins or increase totalTokens.`);
  }
  for (const [name, lane] of Object.entries(config.lanes)) {
    if (lane.min > lane.max) {
      throw new Error(`Lane ${name}: min (${lane.min}) > max (${lane.max})`);
    }
    if (lane.min < 0) {
      throw new Error(`Lane ${name}: negative min (${lane.min})`);
    }
    if (lane.max < 0) {
      throw new Error(`Lane ${name}: negative max (${lane.max})`);
    }
    if (!Number.isFinite(lane.priority)) {
      throw new Error(`Lane ${name}: invalid priority (${lane.priority})`);
    }
  }
}
__name(validateBudgetConfig, "validateBudgetConfig");
__name2(validateBudgetConfig, "validateBudgetConfig");
function getLanesByPriority(config) {
  return Object.entries(config.lanes).sort((a, b) => a[1].priority - b[1].priority).map(([lane]) => lane);
}
__name(getLanesByPriority, "getLanesByPriority");
__name2(getLanesByPriority, "getLanesByPriority");
function groupByLane(candidates) {
  const byLane = /* @__PURE__ */ new Map();
  for (const candidate of candidates) {
    const list = byLane.get(candidate.lane) ?? [];
    list.push(candidate);
    byLane.set(candidate.lane, list);
  }
  return byLane;
}
__name(groupByLane, "groupByLane");
__name2(groupByLane, "groupByLane");
function sumTokenEstimates(candidates) {
  return candidates.reduce((sum, c) => sum + c.tokenEstimate, 0);
}
__name(sumTokenEstimates, "sumTokenEstimates");
__name2(sumTokenEstimates, "sumTokenEstimates");
function allocateMinBudgets(candidates, config) {
  const allocation = {};
  const shortfalls = [];
  let pool = config.totalTokens;
  const byLane = groupByLane(candidates);
  const lanes = getLanesByPriority(config);
  for (const lane of lanes) {
    const laneCandidates = byLane.get(lane) ?? [];
    const available = sumTokenEstimates(laneCandidates);
    const laneMin = config.lanes[lane].min;
    const allocated = Math.min(laneMin, available, pool);
    allocation[lane] = allocated;
    pool -= allocated;
    if (allocated < laneMin) {
      shortfalls.push({
        lane,
        requested: laneMin,
        available
      });
    }
  }
  return {
    allocation,
    pool,
    shortfalls
  };
}
__name(allocateMinBudgets, "allocateMinBudgets");
__name2(allocateMinBudgets, "allocateMinBudgets");
function selectWithinBudget(scored, alreadySelected, config) {
  const selected = [];
  const rejected = [];
  const usage = {};
  for (const lane of Object.keys(config.lanes)) {
    usage[lane] = 0;
  }
  let totalUsed = 0;
  for (const s of alreadySelected) {
    usage[s.lane] += s.tokenEstimate;
    totalUsed += s.tokenEstimate;
  }
  for (const candidate of scored) {
    const lane = candidate.lane;
    const tokens = candidate.tokenEstimate;
    const laneMax = config.lanes[lane].max;
    if (usage[lane] + tokens > laneMax) {
      rejected.push({
        candidate,
        reason: "lane_max_reached"
      });
      continue;
    }
    if (totalUsed + tokens > config.totalTokens) {
      rejected.push({
        candidate,
        reason: "budget_exceeded"
      });
      continue;
    }
    selected.push(candidate);
    usage[lane] += tokens;
    totalUsed += tokens;
  }
  return {
    selected,
    rejected,
    usage,
    totalUsed
  };
}
__name(selectWithinBudget, "selectWithinBudget");
__name2(selectWithinBudget, "selectWithinBudget");
var COMPOSER_VERSION = "1.0.0";
var CACHE_TTL_MS = 5 * 60 * 1e3;
function computeCacheKey(inputs) {
  const normalized = JSON.stringify(inputs, Object.keys(inputs).sort());
  return createHash("sha256").update(normalized).digest("base64url").slice(0, 32);
}
__name(computeCacheKey, "computeCacheKey");
__name2(computeCacheKey, "computeCacheKey");
function computeCandidateDigest(candidates) {
  const sorted = [
    ...candidates
  ].sort((a, b) => a.id.localeCompare(b.id));
  const data = sorted.map((c) => `${c.id}:${c.lane}:${c.kind}:${c.tokenEstimate}`);
  return createHash("sha256").update(data.join("|")).digest("base64url").slice(0, 16);
}
__name(computeCandidateDigest, "computeCandidateDigest");
__name2(computeCandidateDigest, "computeCandidateDigest");
function computeConstraintsDigest(constraints) {
  const data = {
    mustInclude: constraints.mustInclude.map((c) => JSON.stringify(c.match)).sort(),
    mustExclude: constraints.mustExclude.map((c) => JSON.stringify(c.match)).sort(),
    pinned: constraints.pinned.map((c) => JSON.stringify(c.match)).sort(),
    laneRequirements: constraints.laneRequirements.map((r) => `${r.lane}:${r.minTokens}`).sort()
  };
  return createHash("sha256").update(JSON.stringify(data)).digest("base64url").slice(0, 16);
}
__name(computeConstraintsDigest, "computeConstraintsDigest");
__name2(computeConstraintsDigest, "computeConstraintsDigest");
function computeBudgetConfigDigest(config) {
  const normalized = JSON.stringify(config, Object.keys(config).sort());
  return createHash("sha256").update(normalized).digest("base64url").slice(0, 16);
}
__name(computeBudgetConfigDigest, "computeBudgetConfigDigest");
__name2(computeBudgetConfigDigest, "computeBudgetConfigDigest");
var SelectionCache = class {
  static {
    __name(this, "SelectionCache");
  }
  static {
    __name2(this, "SelectionCache");
  }
  cache = /* @__PURE__ */ new Map();
  ttlMs;
  constructor(ttlMs = CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }
  /**
  * Get a cached value
  *
  * @param key - Cache key
  * @returns Cached value or undefined if not found/expired
  */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return void 0;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return void 0;
    }
    return entry.value;
  }
  /**
  * Set a cached value
  *
  * @param key - Cache key
  * @param value - Value to cache
  */
  set(key, value) {
    const now = Date.now();
    this.cache.set(key, {
      value,
      key,
      createdAt: now,
      expiresAt: now + this.ttlMs
    });
  }
  /**
  * Invalidate entries matching a trigger
  *
  * @param trigger - Invalidation trigger
  */
  invalidate(_trigger) {
    this.cache.clear();
  }
  /**
  * Clear all cached entries
  */
  clear() {
    this.cache.clear();
  }
  /**
  * Get cache statistics
  */
  getStats() {
    return {
      size: this.cache.size,
      hitRate: 0
    };
  }
  /**
  * Check if key exists and is valid
  */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  /**
  * Prune expired entries
  */
  prune() {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }
    return pruned;
  }
};
function buildCacheKeyInputs(candidates, constraints, budgetConfig, context) {
  return {
    workspaceFingerprint: context.workspaceFingerprint,
    triggerEvent: context.triggerEvent,
    commitish: context.commitish,
    candidateDigest: computeCandidateDigest(candidates),
    rulesDigest: context.rulesDigest,
    budgetConfigDigest: computeBudgetConfigDigest(budgetConfig),
    constraintsDigest: computeConstraintsDigest(constraints),
    composerVersion: COMPOSER_VERSION
  };
}
__name(buildCacheKeyInputs, "buildCacheKeyInputs");
__name2(buildCacheKeyInputs, "buildCacheKeyInputs");
var EMPTY_CONSTRAINTS = {
  mustInclude: [],
  mustExclude: [],
  pinned: [],
  laneRequirements: []
};
function matchGlob(pattern, text) {
  const regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  const regex = new RegExp(`^${regexPattern}$`, "i");
  return regex.test(text);
}
__name(matchGlob, "matchGlob");
__name2(matchGlob, "matchGlob");
function matches(artifact, matcher, getPath) {
  switch (matcher.type) {
    case "id":
      return artifact.id === matcher.id;
    case "kind":
      return artifact.kind === matcher.kind;
    case "lane":
      return artifact.lane === matcher.lane;
    case "pattern": {
      if (!getPath) {
        return false;
      }
      const path9 = getPath(artifact);
      if (!path9) {
        return false;
      }
      return matchGlob(matcher.pattern, path9);
    }
  }
}
__name(matches, "matches");
__name2(matches, "matches");
function findMatchingConstraint(artifact, constraints, getPath) {
  return constraints.find((c) => matches(artifact, c.match, getPath));
}
__name(findMatchingConstraint, "findMatchingConstraint");
__name2(findMatchingConstraint, "findMatchingConstraint");
function isExcluded(artifact, constraints, getPath) {
  return findMatchingConstraint(artifact, constraints.mustExclude, getPath);
}
__name(isExcluded, "isExcluded");
__name2(isExcluded, "isExcluded");
function isPinned(artifact, constraints, getPath) {
  return findMatchingConstraint(artifact, constraints.pinned, getPath);
}
__name(isPinned, "isPinned");
__name2(isPinned, "isPinned");
function isMustInclude(artifact, constraints, getPath) {
  return findMatchingConstraint(artifact, constraints.mustInclude, getPath);
}
__name(isMustInclude, "isMustInclude");
__name2(isMustInclude, "isMustInclude");
var RELEVANCE_PRECISION = 1e-3;
function quantizeRelevance(score) {
  if (!Number.isFinite(score)) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(1, score));
  return Math.round(clamped / RELEVANCE_PRECISION) * RELEVANCE_PRECISION;
}
__name(quantizeRelevance, "quantizeRelevance");
__name2(quantizeRelevance, "quantizeRelevance");
function tieBreaker(a, b) {
  const lanePriorityA = LANE_PRIORITIES[a.lane];
  const lanePriorityB = LANE_PRIORITIES[b.lane];
  if (lanePriorityA !== lanePriorityB) {
    return lanePriorityA - lanePriorityB;
  }
  const kindPriorityA = KIND_PRIORITIES[a.kind] ?? 99;
  const kindPriorityB = KIND_PRIORITIES[b.kind] ?? 99;
  if (kindPriorityA !== kindPriorityB) {
    return kindPriorityA - kindPriorityB;
  }
  return a.id.localeCompare(b.id);
}
__name(tieBreaker, "tieBreaker");
__name2(tieBreaker, "tieBreaker");
var SCORING_WEIGHTS = {
  /** How recently the artifact was modified */
  recency: 0.3,
  /** How well it matches the current context */
  relevance: 0.35,
  /** How targeted it is to the specific task */
  specificity: 0.2,
  /** How well it relates to current risk factors */
  riskAlignment: 0.15
};
var MAX_RECENCY_BUCKET2 = 5;
function computeScore(candidate) {
  const normalizedRecency = candidate.recencyBucket / MAX_RECENCY_BUCKET2;
  const score = SCORING_WEIGHTS.recency * normalizedRecency + SCORING_WEIGHTS.relevance * candidate.relevanceScore + SCORING_WEIGHTS.specificity * candidate.specificityScore + SCORING_WEIGHTS.riskAlignment * candidate.riskAlignment;
  return quantizeRelevance(score);
}
__name(computeScore, "computeScore");
__name2(computeScore, "computeScore");
function scoreAndSort(candidates) {
  const scored = candidates.map((candidate) => ({
    candidate,
    score: computeScore(candidate)
  }));
  scored.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    return tieBreaker(a.candidate, b.candidate);
  });
  return scored;
}
__name(scoreAndSort, "scoreAndSort");
__name2(scoreAndSort, "scoreAndSort");
function validateScoringWeights() {
  const sum = SCORING_WEIGHTS.recency + SCORING_WEIGHTS.relevance + SCORING_WEIGHTS.specificity + SCORING_WEIGHTS.riskAlignment;
  if (Math.abs(sum - 1) > 1e-3) {
    throw new Error(`Scoring weights must sum to 1.0, got ${sum}`);
  }
}
__name(validateScoringWeights, "validateScoringWeights");
__name2(validateScoringWeights, "validateScoringWeights");
validateScoringWeights();
function buildExplanation(selected, rejections, laneUsage, config, shortfalls, constraintCounts) {
  const lanes = Object.keys(config.lanes);
  const laneBreakdown = lanes.map((lane) => {
    const laneSelected = selected.filter((s) => s.lane === lane);
    const laneConfig = config.lanes[lane];
    return {
      lane,
      selectedCount: laneSelected.length,
      budgetUsed: laneUsage[lane] ?? 0,
      budgetMax: laneConfig.max,
      topArtifacts: laneSelected.slice(0, 3).map((s) => ({
        id: s.id,
        kind: s.kind,
        score: computeScore(s)
      }))
    };
  });
  const totalUsed = Object.values(laneUsage).reduce((a, b) => a + b, 0);
  const totalCandidates = selected.length + rejections.length;
  const summaryParts = [
    `Selected ${selected.length} artifacts`,
    `using ${totalUsed}/${config.totalTokens} tokens`
  ];
  if (shortfalls.length > 0) {
    summaryParts.push(`(${shortfalls.length} lanes under-filled)`);
  }
  const summary = summaryParts.join(" ");
  const topRejections = rejections.slice(0, 5).map((r) => ({
    artifact: r.artifact,
    reason: r.reason,
    detail: r.detail
  }));
  return {
    summary,
    laneBreakdown,
    topRejections,
    constraints: {
      pinnedCount: constraintCounts?.pinned ?? 0,
      mustIncludeCount: constraintCounts?.mustInclude ?? 0,
      excludedCount: constraintCounts?.excluded ?? rejections.filter((r) => r.reason === "excluded_by_policy").length
    },
    performance: {
      candidateCount: totalCandidates,
      selectedCount: selected.length,
      compressionRatio: totalCandidates > 0 ? Math.round(selected.length / totalCandidates * 100) / 100 : 0,
      cacheHit: false
    }
  };
}
__name(buildExplanation, "buildExplanation");
__name2(buildExplanation, "buildExplanation");
function withCacheHit(exp, cacheHit) {
  return {
    ...exp,
    performance: {
      ...exp.performance,
      cacheHit
    }
  };
}
__name(withCacheHit, "withCacheHit");
__name2(withCacheHit, "withCacheHit");
function generateWorkspaceSecret() {
  return createHash("sha256").update(randomUUID()).update(Date.now().toString()).update(Math.random().toString()).digest("base64url");
}
__name(generateWorkspaceSecret, "generateWorkspaceSecret");
__name2(generateWorkspaceSecret, "generateWorkspaceSecret");
function hashObject(obj) {
  const normalized = JSON.stringify(obj, Object.keys(obj).sort());
  return createHash("sha256").update(normalized).digest("base64url").slice(0, 16);
}
__name(hashObject, "hashObject");
__name2(hashObject, "hashObject");
var SHRINK_STRATEGIES = {
  constraint: "never",
  rule_doc: "never",
  local_diff: "truncate_oldest",
  recent_edit: "truncate_oldest",
  symbol_context: "keep_signatures",
  dependency_graph: "collapse_summary",
  test_context: "keep_signatures",
  semantic_match: "truncate_oldest",
  session_history: "drop_entries",
  violation: "drop_entries",
  learning: "drop_entries"
};
var MIN_SHRUNK_SIZE = 50;
function renderArtifact(ref, candidates, countTokens = defaultTokenCounter) {
  const candidate = candidates.find((c) => c.id === ref.id);
  if (!candidate) {
    throw new Error(`Candidate not found: ${ref.id}`);
  }
  const content = candidate.getContent();
  const exactTokenCount = countTokens(content);
  return {
    id: ref.id,
    kind: ref.kind,
    lane: ref.lane,
    content,
    exactTokenCount,
    shrunk: false
  };
}
__name(renderArtifact, "renderArtifact");
__name2(renderArtifact, "renderArtifact");
function renderArtifacts(refs, candidates, countTokens = defaultTokenCounter) {
  return refs.map((ref) => renderArtifact(ref, candidates, countTokens));
}
__name(renderArtifacts, "renderArtifacts");
__name2(renderArtifacts, "renderArtifacts");
function getTotalTokens(rendered) {
  return rendered.reduce((sum, r) => sum + r.exactTokenCount, 0);
}
__name(getTotalTokens, "getTotalTokens");
__name2(getTotalTokens, "getTotalTokens");
function shrinkToFit(rendered, targetTokens, countTokens = defaultTokenCounter) {
  const current = getTotalTokens(rendered);
  if (current <= targetTokens) {
    return rendered;
  }
  const ordered = [
    ...rendered
  ].sort((a, b) => {
    const stratA = SHRINK_STRATEGIES[a.kind];
    const stratB = SHRINK_STRATEGIES[b.kind];
    if (stratA === "never" && stratB !== "never") {
      return 1;
    }
    if (stratB === "never" && stratA !== "never") {
      return -1;
    }
    return LANE_PRIORITIES[b.lane] - LANE_PRIORITIES[a.lane];
  });
  const result = [];
  const overflow = current - targetTokens;
  let shrunk = 0;
  for (const artifact of ordered) {
    if (shrunk >= overflow || SHRINK_STRATEGIES[artifact.kind] === "never") {
      result.push(artifact);
      continue;
    }
    const tokensToShrink = overflow - shrunk;
    const newTarget = Math.max(artifact.exactTokenCount - tokensToShrink, MIN_SHRUNK_SIZE);
    if (artifact.exactTokenCount <= newTarget) {
      result.push(artifact);
      continue;
    }
    const shrunkArtifact = applyShrinkStrategy(artifact, newTarget, countTokens);
    const saved = artifact.exactTokenCount - shrunkArtifact.exactTokenCount;
    shrunk += saved;
    result.push(shrunkArtifact);
  }
  return result;
}
__name(shrinkToFit, "shrinkToFit");
__name2(shrinkToFit, "shrinkToFit");
function applyShrinkStrategy(artifact, targetTokens, countTokens = defaultTokenCounter) {
  const strategy = SHRINK_STRATEGIES[artifact.kind];
  switch (strategy) {
    case "truncate_oldest":
      return truncateOldest(artifact, targetTokens, countTokens);
    case "keep_signatures":
      return keepSignatures(artifact, targetTokens, countTokens);
    case "collapse_summary":
      return collapseSummary(artifact, targetTokens, countTokens);
    case "drop_entries":
      return dropEntries(artifact, targetTokens, countTokens);
    default:
      return artifact;
  }
}
__name(applyShrinkStrategy, "applyShrinkStrategy");
__name2(applyShrinkStrategy, "applyShrinkStrategy");
function truncateOldest(artifact, targetTokens, countTokens = defaultTokenCounter) {
  const lines = artifact.content.split("\n");
  let startIndex = 0;
  while (startIndex < lines.length - 1) {
    const remaining = lines.slice(startIndex).join("\n");
    const tokens = countTokens(remaining);
    if (tokens <= targetTokens) {
      break;
    }
    startIndex++;
  }
  const newContent = (startIndex > 0 ? "... (truncated)\n" : "") + lines.slice(startIndex).join("\n");
  const exactTokenCount = countTokens(newContent);
  return {
    ...artifact,
    content: newContent,
    exactTokenCount,
    shrunk: true,
    originalTokenCount: artifact.exactTokenCount,
    shrinkStrategy: "truncate_oldest"
  };
}
__name(truncateOldest, "truncateOldest");
__name2(truncateOldest, "truncateOldest");
function keepSignatures(artifact, targetTokens, countTokens = defaultTokenCounter) {
  const lines = artifact.content.split("\n");
  const signatures = [];
  let inBody = false;
  let braceDepth = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    if (!inBody) {
      if (trimmed.match(/^(export\s+)?(async\s+)?function\s+\w+/) || trimmed.match(/^(export\s+)?(class|interface|type|enum)\s+\w+/) || trimmed.match(/^\w+\s*\([^)]*\)\s*[:{]/) || trimmed.match(/^(public|private|protected|static|async)\s+\w+/)) {
        signatures.push(line);
        if (openBraces > closeBraces) {
          inBody = true;
          braceDepth = openBraces - closeBraces;
          signatures.push("  // ... body omitted");
        }
      } else if (!trimmed.startsWith("//") && !trimmed.startsWith("/*") && !trimmed.startsWith("*")) {
        if (trimmed !== "" && !trimmed.startsWith("import") && !trimmed.startsWith("require")) {
          signatures.push(line);
        }
      }
    } else {
      braceDepth += openBraces - closeBraces;
      if (braceDepth <= 0) {
        inBody = false;
        braceDepth = 0;
        signatures.push(line);
      }
    }
    const current = signatures.join("\n");
    if (countTokens(current) >= targetTokens) {
      break;
    }
  }
  const newContent = signatures.join("\n");
  const exactTokenCount = countTokens(newContent);
  return {
    ...artifact,
    content: newContent,
    exactTokenCount,
    shrunk: true,
    originalTokenCount: artifact.exactTokenCount,
    shrinkStrategy: "keep_signatures"
  };
}
__name(keepSignatures, "keepSignatures");
__name2(keepSignatures, "keepSignatures");
function collapseSummary(artifact, targetTokens, countTokens = defaultTokenCounter) {
  const lines = artifact.content.split("\n");
  const summary = [];
  let itemCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed.startsWith("##") || trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.match(/^\d+\./)) {
      summary.push(line);
      itemCount++;
    }
    const current = summary.join("\n");
    if (countTokens(current) >= targetTokens - 20) {
      break;
    }
  }
  const totalItems = lines.filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("* ")).length;
  const summaryNote = itemCount < totalItems ? `
... and ${totalItems - itemCount} more items (collapsed)` : "";
  const newContent = summary.join("\n") + summaryNote;
  const exactTokenCount = countTokens(newContent);
  return {
    ...artifact,
    content: newContent,
    exactTokenCount,
    shrunk: true,
    originalTokenCount: artifact.exactTokenCount,
    shrinkStrategy: "collapse_summary"
  };
}
__name(collapseSummary, "collapseSummary");
__name2(collapseSummary, "collapseSummary");
function dropEntries(artifact, targetTokens, countTokens = defaultTokenCounter) {
  const lines = artifact.content.split("\n");
  const entries = [];
  let currentEntry = [];
  for (const line of lines) {
    if (line.trim() === "" && currentEntry.length > 0) {
      entries.push(currentEntry);
      currentEntry = [];
    } else {
      currentEntry.push(line);
    }
  }
  if (currentEntry.length > 0) {
    entries.push(currentEntry);
  }
  const kept = [];
  let totalTokens = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const entryContent = entry.join("\n");
    const entryTokens = countTokens(entryContent);
    if (totalTokens + entryTokens <= targetTokens - 30) {
      kept.unshift(entry);
      totalTokens += entryTokens;
    } else if (kept.length === 0) {
      kept.unshift(entry);
      break;
    } else {
      break;
    }
  }
  const droppedCount = entries.length - kept.length;
  const droppedNote = droppedCount > 0 ? `... ${droppedCount} older entries dropped

` : "";
  const newContent = droppedNote + kept.map((e) => e.join("\n")).join("\n\n");
  const exactTokenCount = countTokens(newContent);
  return {
    ...artifact,
    content: newContent,
    exactTokenCount,
    shrunk: true,
    originalTokenCount: artifact.exactTokenCount,
    shrinkStrategy: "drop_entries"
  };
}
__name(dropEntries, "dropEntries");
__name2(dropEntries, "dropEntries");
function generateLogId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `log_${timestamp}_${random}`;
}
__name(generateLogId, "generateLogId");
__name2(generateLogId, "generateLogId");
function emitDecisionLog(params) {
  const { result, trigger, constraints, candidates, budgetConfig, rankings, startTime } = params;
  return {
    id: generateLogId(),
    timestamp: Date.now(),
    composerVersion: COMPOSER_VERSION,
    workspaceFingerprint: trigger.workspaceFingerprint,
    triggerEvent: trigger.event,
    commitish: trigger.commitish ?? "HEAD",
    candidateCount: candidates.length,
    candidateDigest: computeCandidateDigest(candidates),
    constraintsDigest: hashObject(constraints),
    budgetConfigDigest: hashObject(budgetConfig),
    selectedArtifacts: result.selected,
    budgetAllocation: result.allocation,
    totalTokensUsed: result.actualTokens,
    rankings,
    cacheKey: result.cacheKey,
    cacheHit: result.cacheHit,
    durationMs: Date.now() - startTime
  };
}
__name(emitDecisionLog, "emitDecisionLog");
__name2(emitDecisionLog, "emitDecisionLog");
function toRef(candidate) {
  return {
    id: candidate.id,
    kind: candidate.kind,
    lane: candidate.lane,
    tokenEstimate: candidate.tokenEstimate
  };
}
__name(toRef, "toRef");
__name2(toRef, "toRef");
function selectArtifacts(candidates, config, constraints, context, getPath) {
  const selectedIds = /* @__PURE__ */ new Set();
  const selected = [];
  const rejections = [];
  const afterExclude = candidates.filter((c) => {
    const exclusion = isExcluded(c, constraints, getPath);
    if (exclusion) {
      rejections.push({
        artifact: toRef(c),
        reason: "excluded_by_policy",
        detail: exclusion.reason
      });
      return false;
    }
    return true;
  });
  for (const candidate of afterExclude) {
    const pinConstraint = isPinned(candidate, constraints, getPath);
    if (pinConstraint && !selectedIds.has(candidate.id)) {
      selectedIds.add(candidate.id);
      selected.push(candidate);
    }
  }
  for (const candidate of afterExclude) {
    if (selectedIds.has(candidate.id)) {
      continue;
    }
    const mustIncludeConstraint = isMustInclude(candidate, constraints, getPath);
    if (mustIncludeConstraint) {
      selectedIds.add(candidate.id);
      selected.push(candidate);
    }
  }
  const eligible = afterExclude.filter((c) => !selectedIds.has(c.id));
  const allocationDetails = allocateMinBudgets(eligible, config);
  const scored = scoreAndSort(eligible);
  const budgetResult = selectWithinBudget(scored.map((s) => s.candidate), selected, config);
  for (const s of budgetResult.selected) {
    if (!selectedIds.has(s.id)) {
      selectedIds.add(s.id);
      selected.push(s);
    }
  }
  for (const r of budgetResult.rejected) {
    rejections.push({
      artifact: toRef(r.candidate),
      reason: r.reason,
      detail: r.reason === "lane_max_reached" ? `${r.candidate.lane} lane at max` : "Total budget exhausted"
    });
  }
  const cacheKey = computeSelectionCacheKey(candidates, config, constraints, context);
  return {
    selected: selected.map(toRef),
    allocation: budgetResult.usage,
    rejections,
    cacheKey,
    cacheHit: false,
    allocationDetails,
    rendered: []
  };
}
__name(selectArtifacts, "selectArtifacts");
__name2(selectArtifacts, "selectArtifacts");
function computeSelectionCacheKey(candidates, config, constraints, context) {
  const components = [
    context.workspaceFingerprint,
    context.triggerEvent,
    context.commitish,
    context.rulesDigest,
    config.totalTokens.toString(),
    candidates.length.toString(),
    // Include candidate IDs (sorted for determinism)
    ...candidates.map((c) => c.id).sort(),
    // Include constraint counts
    constraints.mustInclude.length.toString(),
    constraints.mustExclude.length.toString(),
    constraints.pinned.length.toString()
  ];
  let hash = 0;
  const str = components.join("|");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char | 0;
  }
  return `sel_${Math.abs(hash).toString(36)}`;
}
__name(computeSelectionCacheKey, "computeSelectionCacheKey");
__name2(computeSelectionCacheKey, "computeSelectionCacheKey");
var Composer = class {
  static {
    __name(this, "Composer");
  }
  static {
    __name2(this, "Composer");
  }
  config;
  cache;
  rulesDigest = "";
  constructor(options = {}) {
    this.config = this.resolveConfig(options);
    validateBudgetConfig(this.config.budgetConfig);
    this.cache = new SelectionCache(this.config.cacheTtlMs);
  }
  /**
  * Main entry point: compose context for a trigger.
  *
  * @param trigger - What triggered this composition
  * @param constraints - Policy constraints (optional)
  * @returns Composition result with selected artifacts
  */
  async compose(trigger, constraints = EMPTY_CONSTRAINTS) {
    const startTime = Date.now();
    const candidates = await this.gatherCandidates(trigger);
    const context = {
      workspaceFingerprint: trigger.workspaceFingerprint,
      triggerEvent: trigger.event,
      commitish: trigger.commitish ?? "HEAD",
      rulesDigest: this.rulesDigest
    };
    const cacheKeyInputs = buildCacheKeyInputs(candidates, constraints, this.config.budgetConfig, context);
    const cacheKey = computeCacheKey(cacheKeyInputs);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        cacheHit: true,
        explanation: withCacheHit(cached.explanation, true)
      };
    }
    const selection = selectArtifacts(candidates, this.config.budgetConfig, constraints, context);
    const rendered = renderArtifacts(selection.selected, candidates, this.config.tokenCounter);
    let actualTotal = getTotalTokens(rendered);
    let finalRendered = rendered;
    if (actualTotal > this.config.budgetConfig.totalTokens) {
      finalRendered = shrinkToFit(rendered, this.config.budgetConfig.totalTokens, this.config.tokenCounter);
      actualTotal = getTotalTokens(finalRendered);
    }
    const selectedCandidates = candidates.filter((c) => selection.selected.some((s) => s.id === c.id));
    const explanation = buildExplanation(selectedCandidates, selection.rejections, selection.allocation, this.config.budgetConfig, selection.allocationDetails.shortfalls, {
      pinned: constraints.pinned.length,
      mustInclude: constraints.mustInclude.length,
      excluded: constraints.mustExclude.length
    });
    const result = {
      selected: selection.selected,
      allocation: selection.allocation,
      explanation,
      cacheKey,
      cacheHit: false,
      actualTokens: actualTotal,
      rendered: finalRendered
    };
    if (this.config.emitDecisionLogs) {
      const rankings = scoreAndSort(candidates).map((sc) => ({
        artifact: toRef(sc.candidate),
        score: sc.score,
        selected: selection.selected.some((s) => s.id === sc.candidate.id),
        rejectionReason: selection.rejections.find((r) => r.artifact.id === sc.candidate.id)?.reason
      }));
      result.decisionLog = emitDecisionLog({
        result: {
          selected: result.selected,
          allocation: result.allocation,
          cacheKey: result.cacheKey,
          cacheHit: result.cacheHit,
          actualTokens: result.actualTokens
        },
        trigger,
        constraints,
        candidates,
        budgetConfig: this.config.budgetConfig,
        rankings,
        startTime
      });
    }
    this.cache.set(cacheKey, result);
    return result;
  }
  /**
  * Compose with explicit candidates (for testing)
  */
  async composeWithCandidates(candidates, trigger, constraints = EMPTY_CONSTRAINTS) {
    const tempSource = {
      generateCandidates: /* @__PURE__ */ __name2(async () => candidates, "generateCandidates")
    };
    const originalSources = this.config.sources;
    this.config.sources = [
      tempSource
    ];
    try {
      return await this.compose(trigger, constraints);
    } finally {
      this.config.sources = originalSources;
    }
  }
  /**
  * Get the current configuration
  */
  getConfig() {
    return this.config.budgetConfig;
  }
  /**
  * Update the rules digest (invalidates cache)
  */
  setRulesDigest(digest) {
    this.rulesDigest = digest;
    this.cache.clear();
  }
  /**
  * Clear the cache
  */
  clearCache() {
    this.cache.clear();
  }
  /**
  * Get cache statistics
  */
  getCacheStats() {
    return this.cache.getStats();
  }
  /**
  * Get the workspace secret
  */
  getWorkspaceSecret() {
    return this.config.workspaceSecret;
  }
  /**
  * Gather candidates from all configured sources
  */
  async gatherCandidates(trigger) {
    const allCandidates = [];
    for (const source of this.config.sources) {
      const candidates = await source.generateCandidates(trigger, this.config.workspaceSecret);
      allCandidates.push(...candidates);
    }
    return allCandidates;
  }
  /**
  * Resolve configuration with defaults
  */
  resolveConfig(options) {
    return {
      budgetConfig: options.budgetConfig ?? DEFAULT_BUDGET_CONFIG,
      sources: options.sources ?? [],
      cacheTtlMs: options.cacheTtlMs ?? CACHE_TTL_MS,
      tokenCounter: options.tokenCounter ?? defaultTokenCounter,
      workspaceSecret: options.workspaceSecret ?? generateWorkspaceSecret(),
      emitDecisionLogs: options.emitDecisionLogs ?? false
    };
  }
};
function createComposer(options) {
  return new Composer(options);
}
__name(createComposer, "createComposer");
__name2(createComposer, "createComposer");
var ANALYZER_WEIGHTS = {
  syntax: 0.15,
  types: 0.05,
  security: 0.25,
  "eslint-security": 0.1,
  biome: 0.1,
  "circular-deps": 0.05,
  "duplicate-code": 0.05,
  completeness: 0.1,
  dependencies: 0.1,
  "domain-patterns": 0.05
};
var SEVERITY_PENALTIES = {
  critical: 0.25,
  high: 0.1,
  medium: 0.02,
  low: 5e-3,
  info: 0
};
var COVERAGE_CAPS = {
  noAST: 0.2,
  noSecurity: 0.5,
  noCompleteness: 0.7,
  noArchitecture: 0.8,
  full: 1
};
var RECOMMENDATION_THRESHOLDS = {
  autoMerge: 0.6,
  quickReview: 0.3
};
var ConfidenceCalculator = class {
  static {
    __name(this, "ConfidenceCalculator");
  }
  static {
    __name2(this, "ConfidenceCalculator");
  }
  /**
  * Calculate confidence from analyzer results
  */
  calculate(analyzerResults, coverage) {
    let totalWeight = 0;
    let weightedScore = 0;
    const breakdown = {};
    for (const result of analyzerResults) {
      const weight = ANALYZER_WEIGHTS[result.analyzer] ?? 0.05;
      totalWeight += weight;
      const score = result.success ? result.coverage : 0;
      weightedScore += weight * score;
      breakdown[result.analyzer] = score;
    }
    let confidence = totalWeight > 0 ? weightedScore / totalWeight : 0;
    for (const result of analyzerResults) {
      for (const issue of result.issues) {
        const penalty = SEVERITY_PENALTIES[issue.severity] ?? 0;
        confidence = Math.max(0, confidence - penalty);
      }
    }
    const maxPossibleConfidence = this.calculateMaxConfidence(coverage);
    confidence = Math.min(confidence, maxPossibleConfidence);
    confidence = Math.round(confidence * 100) / 100;
    return {
      confidence,
      breakdown,
      explanation: this.generateExplanation(confidence, coverage, analyzerResults),
      maxPossibleConfidence
    };
  }
  /**
  * Get review recommendation based on confidence
  */
  getRecommendation(confidenceResult, hasCriticalIssues) {
    if (hasCriticalIssues) {
      return "manual_review_required";
    }
    const { confidence } = confidenceResult;
    if (confidence >= RECOMMENDATION_THRESHOLDS.autoMerge) {
      return "auto_merge_candidate";
    }
    if (confidence >= RECOMMENDATION_THRESHOLDS.quickReview) {
      return "review_recommended";
    }
    return "manual_review_required";
  }
  /**
  * Calculate maximum possible confidence based on coverage
  */
  calculateMaxConfidence(coverage) {
    let maxConfidence = COVERAGE_CAPS.full;
    if (!coverage.astParsed) {
      maxConfidence = Math.min(maxConfidence, COVERAGE_CAPS.noAST);
    }
    if (!coverage.securityChecked) {
      maxConfidence = Math.min(maxConfidence, COVERAGE_CAPS.noSecurity);
    }
    if (!coverage.completenessChecked) {
      maxConfidence = Math.min(maxConfidence, COVERAGE_CAPS.noCompleteness);
    }
    if (!coverage.architectureChecked) {
      maxConfidence = Math.min(maxConfidence, COVERAGE_CAPS.noArchitecture);
    }
    maxConfidence = Math.min(maxConfidence, coverage.filesCoverage);
    return maxConfidence;
  }
  /**
  * Generate human-readable explanation
  */
  generateExplanation(confidence, coverage, results) {
    const parts = [];
    if (confidence < 0.3) {
      parts.push(`Low confidence (${Math.round(confidence * 100)}%): Manual review required.`);
    } else if (confidence < 0.6) {
      parts.push(`Moderate confidence (${Math.round(confidence * 100)}%): Review recommended.`);
    } else {
      parts.push(`Good confidence (${Math.round(confidence * 100)}%): Auto-merge candidate.`);
    }
    const gaps = [];
    if (!coverage.astParsed) {
      gaps.push("AST parsing failed");
    }
    if (!coverage.securityChecked) {
      gaps.push("security not analyzed");
    }
    if (!coverage.completenessChecked) {
      gaps.push("completeness not checked");
    }
    if (!coverage.architectureChecked) {
      gaps.push("architecture not validated");
    }
    if (gaps.length > 0) {
      parts.push(`Coverage gaps: ${gaps.join(", ")}.`);
    }
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalIssues = results.flatMap((r) => r.issues).filter((i) => i.severity === "critical").length;
    const highIssues = results.flatMap((r) => r.issues).filter((i) => i.severity === "high").length;
    if (criticalIssues > 0 || highIssues > 0) {
      parts.push(`Issues: ${criticalIssues} critical, ${highIssues} high, ${totalIssues} total.`);
    } else if (totalIssues > 0) {
      parts.push(`Found ${totalIssues} issues (none critical).`);
    } else {
      parts.push("No issues detected.");
    }
    return parts.join(" ");
  }
  /**
  * Build coverage info from analyzer results
  */
  static buildCoverageInfo(results) {
    const analyzerIds = new Set(results.map((r) => r.analyzer));
    const avgCoverage = results.length > 0 ? results.reduce((sum, r) => sum + r.coverage, 0) / results.length : 0;
    return {
      astParsed: analyzerIds.has("syntax") && results.find((r) => r.analyzer === "syntax")?.success === true,
      securityChecked: analyzerIds.has("security") && results.find((r) => r.analyzer === "security")?.success === true,
      completenessChecked: analyzerIds.has("completeness") && results.find((r) => r.analyzer === "completeness")?.success === true,
      architectureChecked: analyzerIds.has("architecture") && results.find((r) => r.analyzer === "architecture")?.success === true,
      filesCoverage: avgCoverage
    };
  }
};
function loadJsonl(filepath) {
  if (!fs.existsSync(filepath)) {
    return [];
  }
  try {
    return fs.readFileSync(filepath, "utf-8").split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
  } catch (e) {
    console.error(`[JsonlStore] Error loading ${filepath}:`, e);
    return [];
  }
}
__name(loadJsonl, "loadJsonl");
__name2(loadJsonl, "loadJsonl");
function appendJsonl(filepath, data) {
  const dir = path3.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true
    });
  }
  fs.appendFileSync(filepath, `${JSON.stringify(data)}
`);
}
__name(appendJsonl, "appendJsonl");
__name2(appendJsonl, "appendJsonl");
async function appendJsonlAsync(filepath, data) {
  const dir = path3.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true
    });
  }
  try {
    const existing = fs.existsSync(filepath) ? fs.readFileSync(filepath, "utf-8") : "";
    await writeFile(filepath, `${existing + JSON.stringify(data)}
`);
  } catch {
    fs.appendFileSync(filepath, `${JSON.stringify(data)}
`);
  }
}
__name(appendJsonlAsync, "appendJsonlAsync");
__name2(appendJsonlAsync, "appendJsonlAsync");
async function writeJsonl(filepath, records) {
  const dir = path3.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true
    });
  }
  const content = `${records.map((r) => JSON.stringify(r)).join("\n")}
`;
  try {
    await writeFile(filepath, content);
  } catch {
    fs.writeFileSync(filepath, content);
  }
}
__name(writeJsonl, "writeJsonl");
__name2(writeJsonl, "writeJsonl");
function generateId2(prefix = "ID") {
  return generateId(prefix);
}
__name(generateId2, "generateId");
__name2(generateId2, "generateId");
var ContextEngine = class {
  static {
    __name(this, "ContextEngine");
  }
  static {
    __name2(this, "ContextEngine");
  }
  config;
  configStore;
  initialized = false;
  constructor(config, configStore) {
    this.config = config;
    this.configStore = configStore;
  }
  /**
  * Initialize async resources (embeddings, database)
  * Only needed when semantic search is enabled
  */
  async initialize() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
  }
  /**
  * Get relevant context for a task
  * Primary entry point - used before implementing anything
  */
  async getContext(params) {
    const { task, files = [], keywords = [] } = params;
    const effectiveKeywords = keywords.length > 0 ? keywords : this.extractKeywords(task);
    const architecture = this.configStore.loadArchitecture();
    const constraints = this.configStore.loadConstraints();
    const patterns3 = this.configStore.loadPatterns();
    const contextSections = this.filterRelevantSections([
      architecture,
      patterns3
    ].join("\n\n"), effectiveKeywords);
    const hardRules = this.extractHardRules(constraints);
    const recentViolations = this.getRecentViolations(effectiveKeywords, files);
    const relevantLearnings = this.getRelevantLearnings(effectiveKeywords);
    return {
      task,
      contextSections,
      hardRules,
      patterns: patterns3,
      recentViolations,
      relevantLearnings,
      hint: this.generateHint(recentViolations.length, relevantLearnings.length)
    };
  }
  /**
  * Extract keywords from a task description
  */
  extractKeywords(task) {
    const stopWords = /* @__PURE__ */ new Set([
      "the",
      "a",
      "an",
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
      "must",
      "shall",
      "can",
      "need",
      "to",
      "of",
      "in",
      "for",
      "on",
      "with",
      "at",
      "by",
      "from",
      "as",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "under",
      "again",
      "further",
      "then",
      "once",
      "here",
      "there",
      "when",
      "where",
      "why",
      "how",
      "all",
      "each",
      "few",
      "more",
      "most",
      "other",
      "some",
      "such",
      "no",
      "nor",
      "not",
      "only",
      "own",
      "same",
      "so",
      "than",
      "too",
      "very",
      "just",
      "and",
      "but",
      "if",
      "or",
      "because",
      "until",
      "while",
      "this",
      "that",
      "these",
      "those",
      "i",
      "me",
      "my",
      "we",
      "our",
      "you",
      "your",
      "it",
      "its"
    ]);
    return task.toLowerCase().split(/\W+/).filter((word) => word.length > 2 && !stopWords.has(word)).slice(0, 10);
  }
  /**
  * Filter content to relevant sections based on keywords
  */
  filterRelevantSections(content, keywords) {
    const sections = content.split(/(?=## )/);
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    const relevantSections = sections.filter((section) => {
      const lowerSection = section.toLowerCase();
      return lowerKeywords.some((kw) => lowerSection.includes(kw));
    });
    if (relevantSections.length === 0) {
      return sections.slice(0, 3).join("\n");
    }
    return relevantSections.join("\n");
  }
  /**
  * Extract hard rules from constraints
  */
  extractHardRules(constraints) {
    const hardRulesMatch = constraints.match(/## Hard Rules[\s\S]*?(?=## |$)/i);
    return hardRulesMatch ? hardRulesMatch[0] : "";
  }
  /**
  * Get recent violations relevant to keywords/files
  */
  getRecentViolations(keywords, files) {
    const violationsPath = path3.join(this.config.rootDir, this.config.violationsFile);
    const violations = loadJsonl(violationsPath);
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    return violations.filter((v) => {
      if (files.some((f) => v.file.includes(f))) {
        return true;
      }
      const text = `${v.type} ${v.whatHappened}`.toLowerCase();
      return lowerKeywords.some((kw) => text.includes(kw));
    }).slice(-5).map((v) => ({
      type: v.type,
      file: v.file,
      message: v.whatHappened,
      timestamp: v.timestamp,
      prevention: v.prevention
    }));
  }
  /**
  * Get learnings relevant to keywords
  */
  getRelevantLearnings(keywords) {
    const learningsPath = path3.join(this.config.rootDir, this.config.learningsDir, "learnings.jsonl");
    const learnings = loadJsonl(learningsPath);
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    return learnings.filter((l) => {
      const triggers = Array.isArray(l.trigger) ? l.trigger : [
        l.trigger
      ];
      const text = [
        ...triggers,
        l.action
      ].join(" ").toLowerCase();
      return lowerKeywords.some((kw) => text.includes(kw));
    }).slice(-5).map((l) => ({
      trigger: Array.isArray(l.trigger) ? l.trigger.join(", ") : l.trigger,
      action: l.action,
      type: l.type
    }));
  }
  /**
  * Generate a contextual hint based on findings
  */
  generateHint(violationCount, learningCount) {
    if (violationCount > 0 && learningCount > 0) {
      return "Review violations and learnings before implementing. These are patterns learned from past mistakes.";
    }
    if (violationCount > 0) {
      return "Recent violations found for this area. Review before proceeding.";
    }
    if (learningCount > 0) {
      return "Relevant learnings found. Apply these patterns.";
    }
    return "No specific patterns found. Check CONSTRAINTS.md for rules.";
  }
  /**
  * Dispose resources
  */
  async dispose() {
    this.initialized = false;
  }
};
var DEFAULT_CONTEXT_FILES = [
  "ARCHITECTURE.md",
  "CONSTRAINTS.md",
  "ROUTER.md",
  "patterns/codebase-patterns.md"
];
var SemanticRetriever = class {
  static {
    __name(this, "SemanticRetriever");
  }
  static {
    __name2(this, "SemanticRetriever");
  }
  embedder = null;
  db = null;
  initialized = false;
  available = true;
  rootDir;
  dbPath;
  contextFiles;
  constructor(config) {
    this.rootDir = config.rootDir;
    this.dbPath = config.dbPath ? path3.isAbsolute(config.dbPath) ? config.dbPath : path3.join(config.rootDir, config.dbPath) : path3.join(config.rootDir, "embeddings.db");
    this.contextFiles = config.contextFiles || DEFAULT_CONTEXT_FILES;
  }
  /**
  * Check if semantic retrieval is available (deps installed)
  */
  isAvailable() {
    return this.available;
  }
  /**
  * Ensure database is loaded and schema exists
  */
  async ensureDb() {
    if (this.db) {
      return this.db;
    }
    try {
      const initSqlJs = await import('sql.js').then((m) => m.default);
      const SQL = await initSqlJs();
      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
      } else {
        this.db = new SQL.Database();
      }
      this.db.run(`
        CREATE TABLE IF NOT EXISTS sections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file TEXT NOT NULL,
          section TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding BLOB,
          tokens INTEGER,
          indexed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(file, section)
        )
      `);
      return this.db;
    } catch (_err) {
      this.available = false;
      throw new Error("SemanticRetriever requires sql.js as optional peer dependency. Install with: pnpm add sql.js");
    }
  }
  /**
  * Save database to disk
  */
  saveDb() {
    if (!this.db) {
      return;
    }
    const data = this.db.export();
    const buffer = Buffer.from(data);
    const dir = path3.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true
      });
    }
    fs.writeFileSync(this.dbPath, buffer);
  }
  /**
  * Initialize the embedder and database (lazy loading)
  */
  async initialize() {
    if (this.initialized) {
      return;
    }
    await this.ensureDb();
    try {
      const { pipeline: pipeline2 } = await import('@huggingface/transformers');
      this.embedder = await pipeline2("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      this.initialized = true;
    } catch (_err) {
      this.available = false;
      throw new Error("SemanticRetriever requires @huggingface/transformers as optional peer dependency. Install with: pnpm add @huggingface/transformers");
    }
  }
  /**
  * Index all context files (run on startup or after changes)
  */
  async indexContextFiles() {
    await this.initialize();
    let indexed = 0;
    let skipped = 0;
    for (const file of this.contextFiles) {
      const fullPath = path3.join(this.rootDir, file);
      if (!fs.existsSync(fullPath)) {
        skipped++;
        continue;
      }
      const content = fs.readFileSync(fullPath, "utf-8");
      const sections = this.splitIntoSections(content);
      for (const section of sections) {
        const stmt = this.db?.prepare("SELECT id, content FROM sections WHERE file = ? AND section = ?");
        stmt.bind([
          file,
          section.header
        ]);
        let existingContent = null;
        if (stmt.step()) {
          const row = stmt.getAsObject();
          existingContent = row.content;
        }
        stmt.free();
        if (existingContent === section.content) {
          skipped++;
          continue;
        }
        const embedding = await this.embed(section.content);
        const tokens = this.estimateTokens(section.content);
        const embeddingBlob = new Uint8Array(new Float32Array(embedding).buffer);
        this.db?.run(`INSERT OR REPLACE INTO sections (file, section, content, embedding, tokens, indexed_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`, [
          file,
          section.header,
          section.content,
          embeddingBlob,
          tokens
        ]);
        indexed++;
      }
    }
    this.saveDb();
    return {
      indexed,
      skipped
    };
  }
  /**
  * Get relevant context for a query within token budget
  */
  async getRelevantContext(query, maxTokens = 2e3) {
    await this.initialize();
    const sections = [];
    const stmt = this.db?.prepare("SELECT id, file, section, content, embedding, tokens FROM sections WHERE embedding IS NOT NULL");
    while (stmt.step()) {
      const row = stmt.getAsObject();
      sections.push({
        id: row.id,
        file: row.file,
        section: row.section,
        content: row.content,
        embedding: row.embedding,
        tokens: row.tokens
      });
    }
    stmt.free();
    if (sections.length === 0) {
      return {
        context: "",
        tokensUsed: 0,
        sectionsIncluded: 0,
        compressionRatio: 0
      };
    }
    const queryEmbedding = await this.embed(query);
    const scored = sections.filter((s) => s.embedding !== void 0 && s.embedding !== null).map((s) => {
      const embeddingArray = new Float32Array(s.embedding.buffer, s.embedding.byteOffset, s.embedding.byteLength / 4);
      return {
        ...s,
        score: this.cosineSimilarity(queryEmbedding, embeddingArray)
      };
    }).sort((a, b) => b.score - a.score);
    let totalTokens = 0;
    const selected = [];
    for (const section of scored) {
      if (totalTokens + section.tokens <= maxTokens) {
        selected.push(section);
        totalTokens += section.tokens;
      } else if (selected.length >= 3) {
        break;
      }
    }
    const totalDbTokens = sections.reduce((sum, s) => sum + s.tokens, 0);
    const context = selected.map((s) => `## ${s.file} - ${s.section}
${s.content}`).join("\n\n---\n\n");
    return {
      context,
      tokensUsed: totalTokens,
      sectionsIncluded: selected.length,
      compressionRatio: totalDbTokens > 0 ? 1 - totalTokens / totalDbTokens : 0
    };
  }
  /**
  * Embed text using local model
  */
  async embed(text) {
    if (!this.embedder) {
      throw new Error("Embedder not initialized. Call initialize() first.");
    }
    const result = await this.embedder(text, {
      pooling: "mean",
      normalize: true
    });
    return Array.from(result.data);
  }
  /**
  * Calculate cosine similarity between two vectors
  */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
  /**
  * Split markdown content into sections by ## headers
  */
  splitIntoSections(content) {
    const sections = [];
    const lines = content.split("\n");
    let currentHeader = "Introduction";
    let currentContent = [];
    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (currentContent.length > 0) {
          const sectionContent = currentContent.join("\n").trim();
          if (sectionContent.length > 50) {
            sections.push({
              header: currentHeader,
              content: sectionContent
            });
          }
        }
        currentHeader = line.replace("## ", "").trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    if (currentContent.length > 0) {
      const sectionContent = currentContent.join("\n").trim();
      if (sectionContent.length > 50) {
        sections.push({
          header: currentHeader,
          content: sectionContent
        });
      }
    }
    return sections;
  }
  /**
  * Estimate token count (~4 chars per token)
  */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
  /**
  * Get statistics about indexed content
  */
  getStats() {
    if (!this.db) {
      return {
        totalSections: 0,
        totalTokens: 0,
        files: []
      };
    }
    const countStmt = this.db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(tokens), 0) as total FROM sections");
    let totalSections = 0;
    let totalTokens = 0;
    if (countStmt.step()) {
      const row = countStmt.getAsObject();
      totalSections = row.cnt;
      totalTokens = row.total;
    }
    countStmt.free();
    const files = [];
    const filesStmt = this.db.prepare("SELECT DISTINCT file FROM sections");
    while (filesStmt.step()) {
      const row = filesStmt.getAsObject();
      files.push(row.file);
    }
    filesStmt.free();
    return {
      totalSections,
      totalTokens,
      files
    };
  }
  /**
  * Close database connection and save
  */
  close() {
    if (this.db) {
      this.saveDb();
      this.db.close();
      this.db = null;
    }
  }
};
var patterns = [
  {
    id: "api-input-validation",
    name: "Input Validation",
    description: "All API inputs must be validated using a schema validator (zod, joi, yup)",
    required: true,
    severity: "critical",
    detectWith: {
      astPattern: "zod.parse || schema.validate || yup.validate",
      keywords: [
        "zod",
        "joi",
        "yup",
        "validate",
        "parse",
        "schema"
      ]
    },
    failureMessage: "API endpoint accepts input without schema validation",
    fixSuggestion: "Add input validation: const input = schema.parse(req.body)"
  },
  {
    id: "api-error-handling",
    name: "Structured Error Handling",
    description: "API errors should be caught and returned in a consistent format",
    required: true,
    severity: "high",
    detectWith: {
      astPattern: "try-catch && (res.status || throw)",
      keywords: [
        "try",
        "catch",
        "error",
        "status",
        "errorHandler"
      ]
    },
    failureMessage: "API endpoint missing structured error handling",
    fixSuggestion: "Wrap handler in try-catch with consistent error response format"
  },
  {
    id: "api-no-stack-traces",
    name: "No Stack Traces in Production",
    description: "API error responses should not expose stack traces in production",
    required: true,
    severity: "high",
    detectWith: {
      astPattern: "!error.stack in response || process.env.NODE_ENV check",
      keywords: [
        "stack",
        "NODE_ENV",
        "production",
        "development"
      ]
    },
    failureMessage: "API may expose stack traces in error responses",
    fixSuggestion: "Only include stack traces when NODE_ENV !== 'production'"
  },
  {
    id: "api-content-type",
    name: "Content-Type Headers",
    description: "API responses should set appropriate Content-Type headers",
    required: true,
    severity: "medium",
    detectWith: {
      astPattern: "res.json || res.setHeader('Content-Type')",
      keywords: [
        "Content-Type",
        "application/json",
        "json"
      ]
    },
    failureMessage: "API response missing Content-Type header",
    fixSuggestion: "Use res.json() or explicitly set Content-Type header"
  },
  {
    id: "api-cors-config",
    name: "CORS Configuration",
    description: "Cross-origin requests should be explicitly configured, not use wildcard",
    required: true,
    severity: "high",
    detectWith: {
      astPattern: "cors && origin !== '*'",
      keywords: [
        "cors",
        "origin",
        "Access-Control"
      ]
    },
    failureMessage: "CORS configured with wildcard origin (*)",
    fixSuggestion: "Specify allowed origins explicitly: cors({ origin: ['https://app.example.com'] })"
  },
  {
    id: "api-response-sanitization",
    name: "Response Data Sanitization",
    description: "Sensitive fields should be excluded from API responses",
    required: true,
    severity: "critical",
    detectWith: {
      astPattern: "select || omit || pick || exclude password/token/secret",
      keywords: [
        "select",
        "omit",
        "pick",
        "exclude",
        "sanitize"
      ]
    },
    failureMessage: "API response may include sensitive fields (password, tokens, secrets)",
    fixSuggestion: "Use omit() or select() to exclude sensitive fields from responses"
  },
  {
    id: "api-method-validation",
    name: "HTTP Method Validation",
    description: "Endpoints should only accept intended HTTP methods",
    required: true,
    severity: "medium",
    detectWith: {
      astPattern: "app.get || app.post || app.put || router.method",
      keywords: [
        "get",
        "post",
        "put",
        "delete",
        "patch",
        "method"
      ]
    },
    failureMessage: "Endpoint may accept unintended HTTP methods",
    fixSuggestion: "Use specific method handlers: app.post('/users', handler) not app.use('/users', handler)"
  },
  {
    id: "api-pagination",
    name: "Pagination for List Endpoints",
    description: "List endpoints should implement pagination to prevent memory issues",
    required: true,
    severity: "high",
    detectWith: {
      astPattern: "limit && (offset || page || cursor)",
      keywords: [
        "limit",
        "offset",
        "page",
        "cursor",
        "pagination",
        "take",
        "skip"
      ]
    },
    failureMessage: "List endpoint without pagination (potential memory/performance issue)",
    fixSuggestion: "Add pagination: query.limit(pageSize).offset(page * pageSize)"
  },
  {
    id: "api-request-size-limit",
    name: "Request Size Limit",
    description: "API should limit request body size to prevent DoS attacks",
    required: true,
    severity: "high",
    detectWith: {
      astPattern: "bodyParser.json({ limit }) || express.json({ limit })",
      keywords: [
        "limit",
        "bodyParser",
        "json",
        "urlencoded"
      ]
    },
    failureMessage: "API accepts unlimited request body size",
    fixSuggestion: "Add body size limit: express.json({ limit: '1mb' })"
  }
];
var apiPatterns = {
  id: "api",
  name: "API Endpoints",
  description: "Patterns for secure and robust API endpoint implementation",
  patterns,
  applicableTo: [
    "api",
    "endpoint",
    "route",
    "handler",
    "controller",
    "rest",
    "graphql"
  ]
};
var patterns2 = [
  {
    id: "auth-session-expiry",
    name: "Session Expiry Configuration",
    description: "Sessions should have explicit expiry times to prevent session hijacking",
    required: true,
    severity: "high",
    detectWith: {
      astPattern: "session && (maxAge || expires || expiresIn)",
      keywords: [
        "session",
        "maxAge",
        "expires",
        "expiresIn",
        "ttl"
      ]
    },
    failureMessage: "Session created without explicit expiry time",
    fixSuggestion: "Add session expiry: { maxAge: 3600000 } or similar"
  },
  {
    id: "auth-password-hashing",
    name: "Password Hashing",
    description: "Passwords must be hashed using bcrypt, argon2, or scrypt",
    required: true,
    severity: "critical",
    detectWith: {
      astPattern: "password && (bcrypt || argon2 || scrypt)",
      keywords: [
        "bcrypt",
        "argon2",
        "scrypt",
        "hash",
        "password"
      ]
    },
    failureMessage: "Password storage without proper hashing detected",
    fixSuggestion: "Use bcrypt.hash() or argon2.hash() for password storage"
  },
  {
    id: "auth-token-validation",
    name: "JWT Token Validation",
    description: "JWT tokens must be validated with signature verification",
    required: true,
    severity: "critical",
    detectWith: {
      astPattern: "jwt.verify || jsonwebtoken.verify",
      keywords: [
        "jwt",
        "verify",
        "jsonwebtoken",
        "token"
      ]
    },
    failureMessage: "JWT used without proper verification",
    fixSuggestion: "Use jwt.verify(token, secret) with a strong secret"
  },
  {
    id: "auth-csrf-protection",
    name: "CSRF Protection",
    description: "State-changing endpoints should have CSRF protection",
    required: true,
    severity: "high",
    detectWith: {
      astPattern: "csrf || csrfToken || _csrf",
      keywords: [
        "csrf",
        "csrfToken",
        "xsrf",
        "csurf"
      ]
    },
    failureMessage: "State-changing endpoint without CSRF protection",
    fixSuggestion: "Add CSRF token validation using csurf or similar middleware"
  },
  {
    id: "auth-rate-limiting",
    name: "Rate Limiting on Auth Endpoints",
    description: "Authentication endpoints should be rate-limited to prevent brute force",
    required: true,
    severity: "high",
    detectWith: {
      astPattern: "rateLimit || rateLimiter || express-rate-limit",
      keywords: [
        "rateLimit",
        "rateLimiter",
        "throttle",
        "brute"
      ]
    },
    failureMessage: "Authentication endpoint without rate limiting",
    fixSuggestion: "Add rate limiting: app.use('/login', rateLimit({ max: 5, windowMs: 15*60*1000 }))"
  },
  {
    id: "auth-secure-cookies",
    name: "Secure Cookie Configuration",
    description: "Authentication cookies must have secure, httpOnly, and sameSite flags",
    required: true,
    severity: "high",
    detectWith: {
      astPattern: "cookie && (secure && httpOnly && sameSite)",
      keywords: [
        "secure",
        "httpOnly",
        "sameSite",
        "cookie"
      ]
    },
    failureMessage: "Authentication cookie missing security flags",
    fixSuggestion: "Set cookie options: { secure: true, httpOnly: true, sameSite: 'strict' }"
  },
  {
    id: "auth-constant-time-compare",
    name: "Constant-Time Comparison",
    description: "Secret comparisons should use timing-safe comparison to prevent timing attacks",
    required: true,
    severity: "high",
    detectWith: {
      astPattern: "timingSafeEqual || crypto.timingSafeEqual",
      keywords: [
        "timingSafeEqual",
        "constantTimeCompare",
        "safeCompare"
      ]
    },
    failureMessage: "Secret comparison using non-constant-time method (vulnerable to timing attacks)",
    fixSuggestion: "Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))"
  }
];
var authPatterns = {
  id: "auth",
  name: "Authentication & Authorization",
  description: "Patterns for secure authentication and authorization implementation",
  patterns: patterns2,
  applicableTo: [
    "auth",
    "login",
    "session",
    "jwt",
    "oauth",
    "passport"
  ]
};
function createIssueId(pattern, file, line) {
  return `domain/daemon/${pattern}/${file}${line ? `/${line}` : ""}`;
}
__name(createIssueId, "createIssueId");
__name2(createIssueId, "createIssueId");
function findLine(content, search) {
  const lines = content.split("\n");
  const idx = lines.findIndex((l) => l.includes(search));
  return idx >= 0 ? idx + 1 : void 0;
}
__name(findLine, "findLine");
__name2(findLine, "findLine");
var daemonPatterns = {
  id: "daemon",
  name: "Daemon/Server Patterns",
  keywords: [
    "daemon",
    "server",
    "socket",
    "ipc",
    "listen",
    "spawn",
    "worker",
    "process"
  ],
  patterns: [
    {
      id: "daemon/signal-handlers",
      name: "Missing Signal Handlers",
      detect: /* @__PURE__ */ __name2((content, file) => {
        const issues = [];
        const isDaemon = content.includes(".listen(") || file.includes("daemon") || file.includes("server") || file.includes("worker") || content.includes("net.createServer") || content.includes("http.createServer");
        if (!isDaemon) {
          return issues;
        }
        const hasSIGTERM = content.includes("process.on('SIGTERM'") || content.includes('process.on("SIGTERM"');
        const hasSIGINT = content.includes("process.on('SIGINT'") || content.includes('process.on("SIGINT"');
        if (!hasSIGTERM && !hasSIGINT) {
          issues.push({
            id: createIssueId("signal-handlers", file),
            severity: "high",
            type: "MISSING_PATTERN",
            message: "Daemon/server missing signal handlers (SIGTERM/SIGINT)",
            file,
            fix: "Add process.on('SIGTERM', gracefulShutdown) for clean shutdown"
          });
        }
        return issues;
      }, "detect")
    },
    {
      id: "daemon/socket-permissions",
      name: "Socket Permissions",
      detect: /* @__PURE__ */ __name2((content, file) => {
        const issues = [];
        const hasUnixSocket = content.includes(".listen(") && content.includes(".sock") || content.includes("createServer") && content.includes(".sock");
        if (!hasUnixSocket) {
          return issues;
        }
        const setsPermissions = content.includes("chmod") || content.includes("0o600") || content.includes("0o700") || content.includes("chmodSync");
        if (!setsPermissions) {
          const line = findLine(content, ".sock");
          issues.push({
            id: createIssueId("socket-permissions", file, line),
            severity: "high",
            type: "MISSING_PATTERN",
            message: "Unix socket without explicit permissions",
            file,
            line,
            fix: "Add fs.chmodSync(socketPath, 0o600) after listen() to restrict access"
          });
        }
        return issues;
      }, "detect")
    },
    {
      id: "daemon/buffer-limits",
      name: "Buffer Limits",
      detect: /* @__PURE__ */ __name2((content, file) => {
        const issues = [];
        const readsData = content.includes(".on('data'") || content.includes('.on("data"') || content.includes("socket.read") || content.includes("stream.read");
        if (!readsData) {
          return issues;
        }
        const hasLimit = content.includes("MAX_BUFFER") || content.includes("maxSize") || content.includes("maxLength") || /\.length\s*[<>]/.test(content) || content.includes("Buffer.allocUnsafe") || content.includes("highWaterMark");
        if (!hasLimit) {
          const line = findLine(content, ".on('data'") || findLine(content, '.on("data"');
          issues.push({
            id: createIssueId("buffer-limits", file, line),
            severity: "high",
            type: "BUFFER_OVERFLOW",
            message: "Reading data without buffer limits (potential DoS vulnerability)",
            file,
            line,
            fix: "Add buffer size limit check before processing data"
          });
        }
        return issues;
      }, "detect")
    },
    {
      id: "daemon/lock-acquisition",
      name: "Lock Acquisition",
      detect: /* @__PURE__ */ __name2((content, file) => {
        const issues = [];
        const isDaemonStart = content.includes("daemon.start") || content.includes("startDaemon") || content.includes("spawnDaemon") || file.includes("daemon") && content.includes(".start(");
        if (!isDaemonStart) {
          return issues;
        }
        const hasLock = content.includes("acquireLock") || content.includes(".pid") || content.includes("pidFile") || content.includes("lockFile") || content.includes("proper-lockfile") || content.includes("fs.writeFileSync") && content.includes("process.pid");
        if (!hasLock) {
          issues.push({
            id: createIssueId("lock-acquisition", file),
            severity: "medium",
            type: "MISSING_PATTERN",
            message: "Daemon starts without lock file (may allow multiple instances)",
            file,
            fix: "Acquire lock via PID file before starting daemon to prevent duplicates"
          });
        }
        return issues;
      }, "detect")
    },
    {
      id: "daemon/error-recovery",
      name: "Error Recovery",
      detect: /* @__PURE__ */ __name2((content, file) => {
        const issues = [];
        const isDaemon = content.includes(".listen(") || file.includes("daemon") || file.includes("server") || content.includes("net.createServer");
        if (!isDaemon) {
          return issues;
        }
        const hasUncaughtHandler = content.includes("process.on('uncaughtException'") || content.includes('process.on("uncaughtException"') || content.includes("process.on('unhandledRejection'") || content.includes('process.on("unhandledRejection"');
        if (!hasUncaughtHandler) {
          issues.push({
            id: createIssueId("error-recovery", file),
            severity: "medium",
            type: "MISSING_PATTERN",
            message: "Daemon missing uncaughtException/unhandledRejection handlers",
            file,
            fix: "Add handlers to log errors and optionally restart gracefully"
          });
        }
        return issues;
      }, "detect")
    },
    {
      id: "daemon/health-check",
      name: "Health Check Endpoint",
      detect: /* @__PURE__ */ __name2((content, file) => {
        const issues = [];
        const isHttpServer = content.includes("http.createServer") || content.includes("express()") || content.includes("fastify") || content.includes("Hono") || content.includes("koa");
        if (!isHttpServer) {
          return issues;
        }
        const hasHealthEndpoint = content.includes("/health") || content.includes("/healthz") || content.includes("/ready") || content.includes("/live") || content.includes("healthCheck");
        if (!hasHealthEndpoint) {
          issues.push({
            id: createIssueId("health-check", file),
            severity: "low",
            type: "MISSING_PATTERN",
            message: "HTTP server missing health check endpoint",
            file,
            fix: "Add /health or /healthz endpoint for monitoring and orchestration"
          });
        }
        return issues;
      }, "detect")
    },
    {
      id: "daemon/graceful-shutdown",
      name: "Graceful Shutdown",
      detect: /* @__PURE__ */ __name2((content, file) => {
        const issues = [];
        const hasServer = content.includes(".listen(") || content.includes("server.close") || content.includes("createServer");
        if (!hasServer) {
          return issues;
        }
        const hasGracefulShutdown = content.includes("server.close") || content.includes("gracefulShutdown") || content.includes("drainConnections") || content.includes("closeAllConnections") || content.includes("SIGTERM") && content.includes(".close(");
        if (!hasGracefulShutdown) {
          issues.push({
            id: createIssueId("graceful-shutdown", file),
            severity: "medium",
            type: "MISSING_PATTERN",
            message: "Server may not shut down gracefully (in-flight requests may be dropped)",
            file,
            fix: "Implement graceful shutdown: stop accepting new connections, drain existing ones"
          });
        }
        return issues;
      }, "detect")
    }
  ]
};
var astroConfig = {
  id: "astro",
  name: "Astro",
  category: "static",
  indicators: [
    {
      type: "dependency",
      pattern: "astro",
      weight: 0.95
    },
    {
      type: "file",
      pattern: "astro.config.{js,ts,mjs}",
      weight: 0.95
    },
    {
      type: "file",
      pattern: "src/pages/**/*.astro",
      weight: 0.9
    },
    {
      type: "file",
      pattern: "src/layouts/*.astro",
      weight: 0.85
    }
  ],
  expectedPatterns: [
    // Error Handling
    {
      id: "astro-error-page",
      name: "Error Page",
      description: "Custom 404 and 500 error pages",
      category: "error-handling",
      importance: "recommended",
      detection: {
        method: "file-exists",
        pattern: "src/pages/404.astro"
      },
      docs: "https://docs.astro.build/en/core-concepts/astro-pages/#custom-404-error-page"
    },
    {
      id: "astro-error-boundary",
      name: "Island Error Boundaries",
      description: "Error handling for interactive islands",
      category: "error-handling",
      importance: "recommended",
      detection: {
        method: "content-match",
        pattern: "client:only|client:load|client:visible",
        files: [
          "src/**/*.astro"
        ]
      }
    },
    // Data Fetching
    {
      id: "astro-content-collections",
      name: "Content Collections",
      description: "Type-safe content with collections",
      category: "data-fetching",
      importance: "recommended",
      detection: {
        method: "file-exists",
        pattern: "src/content/config.ts"
      }
    },
    {
      id: "astro-data-fetching",
      name: "Data Fetching",
      description: "Server-side data fetching in frontmatter",
      category: "data-fetching",
      importance: "optional",
      detection: {
        method: "content-match",
        pattern: "await fetch|Astro\\.glob",
        files: [
          "src/**/*.astro"
        ]
      }
    },
    // Routing
    {
      id: "astro-dynamic-routes",
      name: "Dynamic Routes",
      description: "Dynamic routing with getStaticPaths",
      category: "routing",
      importance: "optional",
      detection: {
        method: "content-match",
        pattern: "getStaticPaths",
        files: [
          "src/pages/**/*.astro"
        ]
      }
    },
    // Performance
    {
      id: "astro-image-optimization",
      name: "Image Optimization",
      description: "Using astro:assets for optimized images",
      category: "performance",
      importance: "recommended",
      detection: {
        method: "content-match",
        pattern: "astro:assets|<Image",
        files: [
          "src/**/*.astro"
        ]
      }
    },
    {
      id: "astro-view-transitions",
      name: "View Transitions",
      description: "SPA-like navigation with View Transitions",
      category: "performance",
      importance: "optional",
      detection: {
        method: "content-match",
        pattern: "ViewTransitions|view-transitions",
        files: [
          "src/**/*.astro"
        ]
      }
    },
    // Security
    {
      id: "astro-csp",
      name: "Content Security Policy",
      description: "CSP headers configuration",
      category: "security",
      importance: "recommended",
      detection: {
        method: "content-match",
        pattern: "Content-Security-Policy",
        files: [
          "astro.config.*",
          "src/middleware.*"
        ]
      }
    },
    // Testing
    {
      id: "astro-testing",
      name: "Testing Setup",
      description: "Playwright or other testing framework",
      category: "testing",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "@playwright/test|vitest"
      }
    },
    // Configuration
    {
      id: "astro-integrations",
      name: "Integrations",
      description: "Astro integrations for extended functionality",
      category: "configuration",
      importance: "optional",
      detection: {
        method: "content-match",
        pattern: "integrations:",
        files: [
          "astro.config.*"
        ]
      }
    },
    // State Management (for islands)
    {
      id: "astro-islands-state",
      name: "Island State Management",
      description: "State sharing between islands",
      category: "state-management",
      importance: "optional",
      detection: {
        method: "dependency",
        pattern: "nanostores|@nanostores"
      }
    }
  ],
  riskZones: [
    {
      id: "api-endpoints",
      name: "API Endpoints",
      reason: "Server-side logic in SSR mode",
      patterns: [
        "src/pages/api/**"
      ],
      severity: "high",
      requiredDocumentation: [
        "Endpoint contracts",
        "Authentication",
        "Error handling"
      ]
    },
    {
      id: "middleware",
      name: "Middleware",
      reason: "Request processing, auth, redirects",
      patterns: [
        "src/middleware.*"
      ],
      severity: "high",
      requiredDocumentation: [
        "Middleware logic",
        "Auth flow",
        "Redirects"
      ]
    },
    {
      id: "content-config",
      name: "Content Configuration",
      reason: "Schema definitions for content",
      patterns: [
        "src/content/config.ts"
      ],
      severity: "medium",
      requiredDocumentation: [
        "Collection schemas",
        "Validation rules"
      ]
    },
    {
      id: "islands",
      name: "Interactive Islands",
      reason: "Client-side JavaScript components",
      patterns: [
        "src/components/**/*.{tsx,jsx,vue,svelte}"
      ],
      severity: "medium",
      requiredDocumentation: [
        "Hydration strategy",
        "State management"
      ]
    }
  ],
  contextFiles: [
    {
      path: ".llm-context/ARCHITECTURE.md",
      purpose: "Site architecture and content structure",
      required: true,
      expectedSections: [
        "Overview",
        "Directory Structure",
        "Content Collections",
        "Islands Architecture"
      ]
    },
    {
      path: ".llm-context/PATTERNS.md",
      purpose: "Astro patterns and conventions",
      required: true,
      expectedSections: [
        "Component Patterns",
        "Data Fetching",
        "Island Hydration"
      ]
    },
    {
      path: ".llm-context/CONSTRAINTS.md",
      purpose: "Technical constraints",
      required: true,
      expectedSections: [
        "Performance Budgets",
        "Browser Support",
        "Build Configuration"
      ]
    }
  ],
  recommendedStructure: {
    root: ".llm-context",
    directories: [
      "patterns"
    ],
    files: [
      {
        path: ".llm-context/ARCHITECTURE.md",
        purpose: "Astro architecture",
        required: true,
        template: `# Architecture

## Overview
[Brief description of the site]

## Directory Structure
\`\`\`
src/
\u251C\u2500\u2500 pages/           # File-based routing
\u251C\u2500\u2500 layouts/         # Page layouts
\u251C\u2500\u2500 components/      # Astro + framework components
\u251C\u2500\u2500 content/         # Content collections
\u251C\u2500\u2500 styles/          # Global styles
\u2514\u2500\u2500 assets/          # Static assets
\`\`\`

## Content Collections
[Describe content structure]

## Islands Architecture
[Describe interactive components and hydration strategy]
`
      },
      {
        path: ".llm-context/PATTERNS.md",
        purpose: "Astro patterns",
        required: true,
        template: `# Patterns

## Component Patterns
- .astro for static components
- Framework components for interactivity
- Slots for composition

## Data Fetching
- Content collections for typed content
- fetch() in frontmatter for external data
- getStaticPaths for dynamic routes

## Island Hydration
- client:load for immediate interactivity
- client:visible for lazy loading
- client:only for client-only components
`
      }
    ]
  }
};
var expressConfig = {
  id: "express",
  name: "Express",
  category: "backend",
  indicators: [
    {
      type: "dependency",
      pattern: "express",
      weight: 0.95
    },
    {
      type: "file",
      pattern: "app.{js,ts}",
      weight: 0.5
    }
  ],
  expectedPatterns: [
    // Error Handling
    {
      id: "express-error-middleware",
      name: "Error Middleware",
      description: "Centralized error handling middleware",
      category: "error-handling",
      importance: "critical",
      detection: {
        method: "content-match",
        pattern: "err.*req.*res.*next|error.*request.*response.*next",
        files: [
          "**/*.{js,ts}"
        ]
      },
      docs: "https://expressjs.com/en/guide/error-handling.html"
    },
    {
      id: "express-async-errors",
      name: "Async Error Handling",
      description: "Proper async/await error handling with express-async-errors or wrapper",
      category: "error-handling",
      importance: "critical",
      detection: {
        method: "dependency",
        pattern: "express-async-errors|express-async-handler"
      }
    },
    {
      id: "express-not-found",
      name: "404 Handler",
      description: "Catch-all 404 handler for unmatched routes",
      category: "error-handling",
      importance: "recommended",
      detection: {
        method: "content-match",
        pattern: "404|Not Found",
        files: [
          "**/*.{js,ts}"
        ]
      }
    },
    // Security
    {
      id: "express-helmet",
      name: "Helmet Security",
      description: "Security headers with Helmet",
      category: "security",
      importance: "critical",
      detection: {
        method: "dependency",
        pattern: "helmet"
      }
    },
    {
      id: "express-cors",
      name: "CORS Configuration",
      description: "Cross-origin resource sharing setup",
      category: "security",
      importance: "critical",
      detection: {
        method: "dependency",
        pattern: "cors"
      }
    },
    {
      id: "express-rate-limiting",
      name: "Rate Limiting",
      description: "Request rate limiting to prevent abuse",
      category: "security",
      importance: "critical",
      detection: {
        method: "dependency",
        pattern: "express-rate-limit|rate-limiter-flexible"
      }
    },
    // Validation
    {
      id: "express-input-validation",
      name: "Input Validation",
      description: "Request body/params validation",
      category: "validation",
      importance: "critical",
      detection: {
        method: "dependency",
        pattern: "express-validator|joi|zod|yup"
      }
    },
    // Logging
    {
      id: "express-request-logging",
      name: "Request Logging",
      description: "HTTP request logging middleware",
      category: "logging",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "morgan|pino-http|express-winston"
      }
    },
    // Authentication
    {
      id: "express-auth-middleware",
      name: "Auth Middleware",
      description: "Authentication middleware for protected routes",
      category: "authentication",
      importance: "critical",
      detection: {
        method: "content-match",
        pattern: "passport|jwt|authenticate|isAuthenticated",
        files: [
          "**/middleware/**/*.{js,ts}",
          "**/auth/**/*.{js,ts}"
        ]
      }
    },
    // Testing
    {
      id: "express-testing",
      name: "API Testing",
      description: "Integration tests with supertest or similar",
      category: "testing",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "supertest"
      }
    },
    // Performance
    {
      id: "express-compression",
      name: "Response Compression",
      description: "Gzip/brotli compression middleware",
      category: "performance",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "compression"
      }
    },
    // Configuration
    {
      id: "express-env-config",
      name: "Environment Configuration",
      description: "Environment-based configuration management",
      category: "configuration",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "dotenv|config"
      }
    }
  ],
  riskZones: [
    {
      id: "route-handlers",
      name: "Route Handlers",
      reason: "Business logic, data access, response formatting",
      patterns: [
        "routes/**",
        "controllers/**",
        "**/router.*"
      ],
      severity: "high",
      requiredDocumentation: [
        "Endpoint contracts",
        "Request/response schemas",
        "Error responses"
      ]
    },
    {
      id: "middleware",
      name: "Middleware Chain",
      reason: "Request processing, auth, validation",
      patterns: [
        "middleware/**",
        "**/middleware.*"
      ],
      severity: "critical",
      requiredDocumentation: [
        "Middleware order",
        "Auth flow",
        "Error propagation"
      ]
    },
    {
      id: "database-layer",
      name: "Database Layer",
      reason: "Data persistence, queries, transactions",
      patterns: [
        "models/**",
        "db/**",
        "repositories/**"
      ],
      severity: "critical",
      requiredDocumentation: [
        "Schema definitions",
        "Query patterns",
        "Transaction handling"
      ]
    },
    {
      id: "auth-module",
      name: "Authentication Module",
      reason: "User identity, sessions, tokens",
      patterns: [
        "auth/**",
        "**/passport.*",
        "**/jwt.*"
      ],
      severity: "critical",
      requiredDocumentation: [
        "Auth strategies",
        "Token lifecycle",
        "Session management"
      ]
    }
  ],
  contextFiles: [
    {
      path: ".llm-context/ARCHITECTURE.md",
      purpose: "API architecture and component relationships",
      required: true,
      expectedSections: [
        "Overview",
        "Directory Structure",
        "Middleware Chain",
        "Route Structure"
      ]
    },
    {
      path: ".llm-context/PATTERNS.md",
      purpose: "Coding patterns for Express development",
      required: true,
      expectedSections: [
        "Error Handling",
        "Validation",
        "Authentication",
        "Response Format"
      ]
    },
    {
      path: ".llm-context/API.md",
      purpose: "API endpoint documentation",
      required: true,
      expectedSections: [
        "Endpoints",
        "Authentication",
        "Error Codes",
        "Rate Limits"
      ]
    },
    {
      path: ".llm-context/CONSTRAINTS.md",
      purpose: "Technical constraints and requirements",
      required: true,
      expectedSections: [
        "Security Requirements",
        "Performance Targets",
        "Dependencies"
      ]
    }
  ],
  recommendedStructure: {
    root: ".llm-context",
    directories: [
      "patterns",
      "constraints"
    ],
    files: [
      {
        path: ".llm-context/ARCHITECTURE.md",
        purpose: "API architecture",
        required: true,
        template: `# Architecture

## Overview
[Brief description of the API]

## Directory Structure
\`\`\`
src/
\u251C\u2500\u2500 routes/          # Route definitions
\u251C\u2500\u2500 controllers/     # Request handlers
\u251C\u2500\u2500 middleware/      # Express middleware
\u251C\u2500\u2500 models/          # Data models
\u251C\u2500\u2500 services/        # Business logic
\u2514\u2500\u2500 utils/           # Utilities
\`\`\`

## Middleware Chain
1. Helmet (security headers)
2. CORS
3. Body parser
4. Request logging
5. Authentication
6. Route handlers
7. Error handler

## Route Structure
[Describe route organization]
`
      },
      {
        path: ".llm-context/PATTERNS.md",
        purpose: "Express patterns",
        required: true,
        template: `# Patterns

## Error Handling
- All async handlers wrapped with asyncHandler
- Centralized error middleware at end of chain
- Structured error responses

## Validation
- Request validation using [library]
- Schema-first approach

## Authentication
- [Describe auth approach]

## Response Format
\`\`\`json
{
  "success": true,
  "data": {},
  "meta": {}
}
\`\`\`
`
      },
      {
        path: ".llm-context/API.md",
        purpose: "API documentation",
        required: true,
        template: `# API Documentation

## Base URL
\`/api/v1\`

## Authentication
[Describe auth mechanism]

## Endpoints

### GET /endpoint
[Description]

## Error Codes
| Code | Description |
|------|-------------|
| 400  | Bad Request |
| 401  | Unauthorized |
| 404  | Not Found |
| 500  | Internal Error |
`
      }
    ]
  }
};
var nestjsConfig = {
  id: "nestjs",
  name: "NestJS",
  category: "backend",
  indicators: [
    {
      type: "dependency",
      pattern: "@nestjs/core",
      weight: 0.95
    },
    {
      type: "dependency",
      pattern: "@nestjs/common",
      weight: 0.9
    },
    {
      type: "file",
      pattern: "nest-cli.json",
      weight: 0.95
    },
    {
      type: "file",
      pattern: "src/main.ts",
      weight: 0.5
    }
  ],
  expectedPatterns: [
    // Error Handling
    {
      id: "nestjs-exception-filter",
      name: "Exception Filters",
      description: "Global and local exception filters",
      category: "error-handling",
      importance: "critical",
      detection: {
        method: "content-match",
        pattern: "@Catch|ExceptionFilter|HttpException",
        files: [
          "src/**/*.ts"
        ]
      },
      docs: "https://docs.nestjs.com/exception-filters"
    },
    {
      id: "nestjs-http-exceptions",
      name: "HTTP Exceptions",
      description: "Proper use of built-in HTTP exceptions",
      category: "error-handling",
      importance: "recommended",
      detection: {
        method: "content-match",
        pattern: "throw new (Http|Bad|Unauthorized|Forbidden|NotFound)Exception",
        files: [
          "src/**/*.ts"
        ]
      }
    },
    // Validation
    {
      id: "nestjs-validation-pipe",
      name: "Validation Pipe",
      description: "Global validation with class-validator",
      category: "validation",
      importance: "critical",
      detection: {
        method: "dependency",
        pattern: "class-validator"
      }
    },
    {
      id: "nestjs-dto-validation",
      name: "DTO Validation",
      description: "DTOs with validation decorators",
      category: "validation",
      importance: "critical",
      detection: {
        method: "content-match",
        pattern: "@IsString|@IsNumber|@IsEmail|@IsNotEmpty",
        files: [
          "src/**/*.dto.ts",
          "src/**/dto/*.ts"
        ]
      }
    },
    // Authentication
    {
      id: "nestjs-guards",
      name: "Authentication Guards",
      description: "Route protection with Guards",
      category: "authentication",
      importance: "critical",
      detection: {
        method: "content-match",
        pattern: "@UseGuards|CanActivate|AuthGuard",
        files: [
          "src/**/*.ts"
        ]
      }
    },
    {
      id: "nestjs-passport",
      name: "Passport Integration",
      description: "Passport strategies for auth",
      category: "authentication",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "@nestjs/passport"
      }
    },
    // Security
    {
      id: "nestjs-helmet",
      name: "Helmet Security",
      description: "Security headers with Helmet",
      category: "security",
      importance: "critical",
      detection: {
        method: "dependency",
        pattern: "helmet"
      }
    },
    {
      id: "nestjs-throttler",
      name: "Rate Limiting",
      description: "Rate limiting with @nestjs/throttler",
      category: "security",
      importance: "critical",
      detection: {
        method: "dependency",
        pattern: "@nestjs/throttler"
      }
    },
    // Testing
    {
      id: "nestjs-testing-module",
      name: "Testing Module",
      description: "NestJS testing utilities",
      category: "testing",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "@nestjs/testing"
      }
    },
    {
      id: "nestjs-e2e-tests",
      name: "E2E Tests",
      description: "End-to-end API tests",
      category: "testing",
      importance: "recommended",
      detection: {
        method: "file-exists",
        pattern: "test/**/*.e2e-spec.ts"
      }
    },
    // Logging
    {
      id: "nestjs-logger",
      name: "Logger Service",
      description: "Structured logging with NestJS Logger",
      category: "logging",
      importance: "recommended",
      detection: {
        method: "content-match",
        pattern: "Logger|@nestjs/common.*Logger",
        files: [
          "src/**/*.ts"
        ]
      }
    },
    // Configuration
    {
      id: "nestjs-config-module",
      name: "Config Module",
      description: "Environment configuration with @nestjs/config",
      category: "configuration",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "@nestjs/config"
      }
    },
    // Performance
    {
      id: "nestjs-caching",
      name: "Caching",
      description: "Cache manager integration",
      category: "performance",
      importance: "optional",
      detection: {
        method: "dependency",
        pattern: "@nestjs/cache-manager|cache-manager"
      }
    }
  ],
  riskZones: [
    {
      id: "controllers",
      name: "Controllers",
      reason: "Request handling, input processing, response formatting",
      patterns: [
        "src/**/*.controller.ts"
      ],
      severity: "high",
      requiredDocumentation: [
        "Endpoint documentation",
        "Request/response DTOs",
        "Error responses"
      ]
    },
    {
      id: "services",
      name: "Services",
      reason: "Business logic, data access, external integrations",
      patterns: [
        "src/**/*.service.ts"
      ],
      severity: "high",
      requiredDocumentation: [
        "Service responsibilities",
        "Dependencies",
        "Error handling"
      ]
    },
    {
      id: "guards",
      name: "Guards",
      reason: "Authentication, authorization, access control",
      patterns: [
        "src/**/*.guard.ts",
        "src/auth/**"
      ],
      severity: "critical",
      requiredDocumentation: [
        "Guard logic",
        "Protected routes",
        "Role requirements"
      ]
    },
    {
      id: "entities",
      name: "Entities/Models",
      reason: "Database schema, relationships",
      patterns: [
        "src/**/*.entity.ts",
        "src/**/*.model.ts"
      ],
      severity: "critical",
      requiredDocumentation: [
        "Schema design",
        "Relationships",
        "Constraints"
      ]
    },
    {
      id: "modules",
      name: "Module Definitions",
      reason: "Dependency injection, module boundaries",
      patterns: [
        "src/**/*.module.ts"
      ],
      severity: "medium",
      requiredDocumentation: [
        "Module responsibilities",
        "Exports",
        "Dependencies"
      ]
    }
  ],
  contextFiles: [
    {
      path: ".llm-context/ARCHITECTURE.md",
      purpose: "NestJS module architecture",
      required: true,
      expectedSections: [
        "Overview",
        "Module Structure",
        "Dependency Injection",
        "Data Flow"
      ]
    },
    {
      path: ".llm-context/PATTERNS.md",
      purpose: "NestJS patterns and conventions",
      required: true,
      expectedSections: [
        "Error Handling",
        "Validation",
        "Authentication",
        "Testing"
      ]
    },
    {
      path: ".llm-context/API.md",
      purpose: "API endpoint documentation",
      required: true,
      expectedSections: [
        "Endpoints",
        "DTOs",
        "Error Codes"
      ]
    },
    {
      path: ".llm-context/CONSTRAINTS.md",
      purpose: "Technical constraints",
      required: true,
      expectedSections: [
        "Security",
        "Performance",
        "Dependencies"
      ]
    }
  ],
  recommendedStructure: {
    root: ".llm-context",
    directories: [
      "patterns",
      "modules"
    ],
    files: [
      {
        path: ".llm-context/ARCHITECTURE.md",
        purpose: "NestJS architecture",
        required: true,
        template: `# Architecture

## Overview
[Brief description of the API]

## Module Structure
\`\`\`
src/
\u251C\u2500\u2500 app.module.ts        # Root module
\u251C\u2500\u2500 auth/                # Auth module
\u2502   \u251C\u2500\u2500 auth.module.ts
\u2502   \u251C\u2500\u2500 auth.controller.ts
\u2502   \u251C\u2500\u2500 auth.service.ts
\u2502   \u2514\u2500\u2500 guards/
\u251C\u2500\u2500 users/               # Users module
\u251C\u2500\u2500 common/              # Shared utilities
\u2502   \u251C\u2500\u2500 filters/
\u2502   \u251C\u2500\u2500 guards/
\u2502   \u251C\u2500\u2500 interceptors/
\u2502   \u2514\u2500\u2500 pipes/
\u2514\u2500\u2500 config/              # Configuration
\`\`\`

## Dependency Injection
[Describe DI patterns]

## Data Flow
Request \u2192 Guards \u2192 Interceptors \u2192 Pipes \u2192 Controller \u2192 Service \u2192 Repository
`
      },
      {
        path: ".llm-context/PATTERNS.md",
        purpose: "NestJS patterns",
        required: true,
        template: `# Patterns

## Error Handling
- Global exception filter for HTTP exceptions
- Custom exceptions extend HttpException
- Structured error responses

## Validation
- Global ValidationPipe with whitelist
- DTOs with class-validator decorators
- Transform enabled for type coercion

## Authentication
- JWT strategy with Passport
- Guards on controllers/routes
- Role-based access control

## Testing
- Unit tests for services
- E2E tests for controllers
- Test database for integration tests
`
      }
    ]
  }
};
var nextjsConfig = {
  id: "nextjs",
  name: "Next.js",
  category: "fullstack",
  indicators: [
    {
      type: "dependency",
      pattern: "next",
      weight: 0.95
    },
    {
      type: "file",
      pattern: "next.config.{js,mjs,ts}",
      weight: 0.9
    },
    {
      type: "file",
      pattern: "app/layout.{tsx,jsx,js,ts}",
      weight: 0.85
    },
    {
      type: "file",
      pattern: "pages/_app.{tsx,jsx,js,ts}",
      weight: 0.8
    },
    {
      type: "script",
      pattern: "next dev",
      weight: 0.7
    }
  ],
  expectedPatterns: [
    // Error Handling
    {
      id: "nextjs-error-boundary",
      name: "Error Boundary",
      description: "App-level error boundary using error.tsx",
      category: "error-handling",
      importance: "critical",
      detection: {
        method: "file-exists",
        pattern: "app/error.tsx",
        files: [
          "app/**/error.tsx"
        ]
      },
      docs: "https://nextjs.org/docs/app/building-your-application/routing/error-handling"
    },
    {
      id: "nextjs-not-found",
      name: "Not Found Handler",
      description: "Custom 404 page using not-found.tsx",
      category: "error-handling",
      importance: "recommended",
      detection: {
        method: "file-exists",
        pattern: "app/not-found.tsx"
      }
    },
    {
      id: "nextjs-global-error",
      name: "Global Error Handler",
      description: "Root error boundary in app/global-error.tsx",
      category: "error-handling",
      importance: "critical",
      detection: {
        method: "file-exists",
        pattern: "app/global-error.tsx"
      }
    },
    // Data Fetching
    {
      id: "nextjs-server-actions",
      name: "Server Actions",
      description: "Form handling with 'use server' directive",
      category: "data-fetching",
      importance: "recommended",
      detection: {
        method: "content-match",
        pattern: '"use server"',
        files: [
          "app/**/*.{ts,tsx}",
          "actions/**/*.ts"
        ]
      }
    },
    {
      id: "nextjs-loading-state",
      name: "Loading States",
      description: "Suspense-based loading with loading.tsx",
      category: "data-fetching",
      importance: "recommended",
      detection: {
        method: "file-exists",
        pattern: "app/**/loading.tsx"
      }
    },
    // Routing
    {
      id: "nextjs-middleware",
      name: "Middleware",
      description: "Edge middleware for auth/redirects",
      category: "routing",
      importance: "recommended",
      detection: {
        method: "file-exists",
        pattern: "middleware.ts"
      }
    },
    {
      id: "nextjs-parallel-routes",
      name: "Parallel Routes",
      description: "Simultaneous route rendering with @folder convention",
      category: "routing",
      importance: "optional",
      detection: {
        method: "file-exists",
        pattern: "app/**/@*"
      }
    },
    // Authentication
    {
      id: "nextjs-auth-middleware",
      name: "Auth Middleware",
      description: "Protected routes via middleware",
      category: "authentication",
      importance: "critical",
      detection: {
        method: "content-match",
        pattern: "getToken|getSession|auth\\(",
        files: [
          "middleware.ts"
        ]
      }
    },
    // Validation
    {
      id: "nextjs-zod-validation",
      name: "Zod Validation",
      description: "Schema validation with Zod",
      category: "validation",
      importance: "recommended",
      detection: {
        method: "ast",
        pattern: "import.*zod|z\\.object",
        files: [
          "**/*.{ts,tsx}"
        ]
      }
    },
    // Security
    {
      id: "nextjs-csp-headers",
      name: "CSP Headers",
      description: "Content Security Policy configuration",
      category: "security",
      importance: "recommended",
      detection: {
        method: "content-match",
        pattern: "Content-Security-Policy|contentSecurityPolicy",
        files: [
          "next.config.*",
          "middleware.ts"
        ]
      }
    },
    // Testing
    {
      id: "nextjs-testing-setup",
      name: "Testing Setup",
      description: "Jest or Vitest configuration for Next.js",
      category: "testing",
      importance: "recommended",
      detection: {
        method: "file-exists",
        pattern: "{jest,vitest}.config.{js,ts,mjs}"
      }
    },
    // Performance
    {
      id: "nextjs-image-optimization",
      name: "Image Optimization",
      description: "Using next/image for optimized images",
      category: "performance",
      importance: "recommended",
      detection: {
        method: "content-match",
        pattern: `import.*Image.*from ['"]next/image['"]`,
        files: [
          "**/*.{tsx,jsx}"
        ]
      }
    },
    // Logging
    {
      id: "nextjs-structured-logging",
      name: "Structured Logging",
      description: "Consistent logging with pino or similar",
      category: "logging",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "pino|winston|bunyan"
      }
    }
  ],
  riskZones: [
    {
      id: "api-routes",
      name: "API Routes",
      reason: "Direct database access, authentication, authorization logic",
      patterns: [
        "app/api/**",
        "pages/api/**"
      ],
      severity: "critical",
      requiredDocumentation: [
        "Authentication requirements",
        "Rate limiting configuration",
        "Input validation schemas",
        "Error response formats"
      ]
    },
    {
      id: "middleware",
      name: "Middleware",
      reason: "Request interception, auth checks, redirects",
      patterns: [
        "middleware.ts",
        "middleware.js"
      ],
      severity: "critical",
      requiredDocumentation: [
        "Protected routes list",
        "Auth token handling",
        "Redirect logic"
      ]
    },
    {
      id: "server-actions",
      name: "Server Actions",
      reason: "Direct server mutations, data modifications",
      patterns: [
        "app/**/actions.*",
        "actions/**"
      ],
      severity: "high",
      requiredDocumentation: [
        "Action permissions",
        "Validation requirements",
        "Error handling strategy"
      ]
    },
    {
      id: "env-config",
      name: "Environment Configuration",
      reason: "Secrets and environment-specific settings",
      patterns: [
        ".env*",
        "next.config.*"
      ],
      severity: "high",
      requiredDocumentation: [
        "Required environment variables",
        "Default values",
        "Production vs development differences"
      ]
    },
    {
      id: "database-layer",
      name: "Database Layer",
      reason: "Data persistence, migrations, schema",
      patterns: [
        "prisma/**",
        "drizzle/**",
        "db/**",
        "lib/db*"
      ],
      severity: "critical",
      requiredDocumentation: [
        "Schema overview",
        "Migration strategy",
        "Connection pooling",
        "Query patterns"
      ]
    }
  ],
  contextFiles: [
    {
      path: ".llm-context/ARCHITECTURE.md",
      purpose: "High-level system architecture and component relationships",
      required: true,
      expectedSections: [
        "Overview",
        "Directory Structure",
        "Data Flow",
        "Key Components"
      ]
    },
    {
      path: ".llm-context/PATTERNS.md",
      purpose: "Coding patterns and conventions",
      required: true,
      expectedSections: [
        "Error Handling",
        "Data Fetching",
        "Authentication",
        "Validation"
      ]
    },
    {
      path: ".llm-context/CONSTRAINTS.md",
      purpose: "Technical constraints and non-negotiables",
      required: true,
      expectedSections: [
        "Performance Budgets",
        "Security Requirements",
        "Dependencies"
      ]
    },
    {
      path: ".llm-context/API.md",
      purpose: "API routes documentation",
      required: false,
      expectedSections: [
        "Endpoints",
        "Authentication",
        "Error Codes"
      ]
    },
    {
      path: ".llm-context/DATABASE.md",
      purpose: "Database schema and patterns",
      required: false,
      expectedSections: [
        "Schema",
        "Relationships",
        "Migrations"
      ]
    }
  ],
  recommendedStructure: {
    root: ".llm-context",
    directories: [
      "patterns",
      "constraints",
      "examples"
    ],
    files: [
      {
        path: ".llm-context/ARCHITECTURE.md",
        purpose: "System architecture documentation",
        required: true,
        template: `# Architecture

## Overview
[Brief description of the application]

## Directory Structure
\`\`\`
app/
\u251C\u2500\u2500 (auth)/          # Auth-related routes
\u251C\u2500\u2500 (dashboard)/     # Dashboard routes
\u251C\u2500\u2500 api/             # API routes
\u2514\u2500\u2500 layout.tsx       # Root layout
\`\`\`

## Data Flow
[Describe how data flows through the application]

## Key Components
[List and describe major components]
`
      },
      {
        path: ".llm-context/PATTERNS.md",
        purpose: "Coding patterns and conventions",
        required: true,
        template: `# Patterns

## Error Handling
[Describe error handling approach]

## Data Fetching
[Describe data fetching patterns]

## Authentication
[Describe auth patterns]

## Validation
[Describe validation approach]
`
      },
      {
        path: ".llm-context/CONSTRAINTS.md",
        purpose: "Technical constraints",
        required: true,
        template: `# Constraints

## Performance Budgets
- FCP < 1.8s
- LCP < 2.5s
- Bundle < 500KB initial

## Security Requirements
- [List security requirements]

## Dependencies
- [List dependency constraints]
`
      }
    ]
  }
};
var reactViteConfig = {
  id: "react-vite",
  name: "React (Vite)",
  category: "frontend",
  indicators: [
    {
      type: "dependency",
      pattern: "vite",
      weight: 0.5
    },
    {
      type: "dependency",
      pattern: "react",
      weight: 0.5
    },
    {
      type: "dependency",
      pattern: "@vitejs/plugin-react",
      weight: 0.9
    },
    {
      type: "file",
      pattern: "vite.config.{js,ts,mjs}",
      weight: 0.85
    },
    {
      type: "file",
      pattern: "index.html",
      weight: 0.3
    }
  ],
  expectedPatterns: [
    // Error Handling
    {
      id: "react-error-boundary",
      name: "Error Boundary",
      description: "React Error Boundary for graceful error handling",
      category: "error-handling",
      importance: "critical",
      detection: {
        method: "ast",
        pattern: "componentDidCatch|ErrorBoundary|react-error-boundary",
        files: [
          "src/**/*.{tsx,jsx}"
        ]
      },
      docs: "https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary"
    },
    {
      id: "react-suspense",
      name: "Suspense Boundaries",
      description: "Suspense for async component loading",
      category: "error-handling",
      importance: "recommended",
      detection: {
        method: "content-match",
        pattern: "<Suspense",
        files: [
          "src/**/*.{tsx,jsx}"
        ]
      }
    },
    // State Management
    {
      id: "react-state-management",
      name: "State Management",
      description: "Consistent state management approach",
      category: "state-management",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "zustand|jotai|recoil|redux|@tanstack/react-query"
      }
    },
    {
      id: "react-query",
      name: "Server State Management",
      description: "TanStack Query for server state",
      category: "data-fetching",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "@tanstack/react-query"
      }
    },
    // Routing
    {
      id: "react-router",
      name: "Client Routing",
      description: "React Router for navigation",
      category: "routing",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "react-router-dom|@tanstack/react-router"
      }
    },
    // Validation
    {
      id: "react-form-validation",
      name: "Form Validation",
      description: "Form handling with validation",
      category: "validation",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "react-hook-form|formik"
      }
    },
    // Testing
    {
      id: "react-testing-library",
      name: "Testing Library",
      description: "React Testing Library setup",
      category: "testing",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "@testing-library/react"
      }
    },
    {
      id: "react-vitest",
      name: "Vitest Configuration",
      description: "Vitest for unit testing",
      category: "testing",
      importance: "recommended",
      detection: {
        method: "dependency",
        pattern: "vitest"
      }
    },
    // Performance
    {
      id: "react-lazy-loading",
      name: "Lazy Loading",
      description: "Code splitting with React.lazy",
      category: "performance",
      importance: "recommended",
      detection: {
        method: "content-match",
        pattern: "React\\.lazy|lazy\\(",
        files: [
          "src/**/*.{tsx,jsx}"
        ]
      }
    },
    {
      id: "react-memo",
      name: "Memoization",
      description: "Performance optimization with memo/useMemo/useCallback",
      category: "performance",
      importance: "optional",
      detection: {
        method: "content-match",
        pattern: "React\\.memo|useMemo|useCallback",
        files: [
          "src/**/*.{tsx,jsx}"
        ]
      }
    },
    // Security
    {
      id: "react-xss-prevention",
      name: "XSS Prevention",
      description: "Avoiding dangerouslySetInnerHTML or sanitizing",
      category: "security",
      importance: "critical",
      detection: {
        method: "content-match",
        pattern: "dangerouslySetInnerHTML",
        files: [
          "src/**/*.{tsx,jsx}"
        ]
      }
    },
    // Configuration
    {
      id: "vite-env-types",
      name: "Environment Types",
      description: "Typed environment variables",
      category: "configuration",
      importance: "recommended",
      detection: {
        method: "file-exists",
        pattern: "src/vite-env.d.ts"
      }
    }
  ],
  riskZones: [
    {
      id: "api-calls",
      name: "API Integration",
      reason: "Data fetching, error handling, auth headers",
      patterns: [
        "src/api/**",
        "src/services/**",
        "src/lib/api*"
      ],
      severity: "high",
      requiredDocumentation: [
        "API client setup",
        "Error handling strategy",
        "Authentication flow"
      ]
    },
    {
      id: "auth-context",
      name: "Authentication Context",
      reason: "User state, tokens, permissions",
      patterns: [
        "src/context/auth*",
        "src/providers/auth*",
        "src/hooks/useAuth*"
      ],
      severity: "critical",
      requiredDocumentation: [
        "Auth flow",
        "Token storage",
        "Protected routes"
      ]
    },
    {
      id: "global-state",
      name: "Global State",
      reason: "Shared application state",
      patterns: [
        "src/store/**",
        "src/state/**",
        "src/atoms/**"
      ],
      severity: "high",
      requiredDocumentation: [
        "State structure",
        "Update patterns",
        "Persistence"
      ]
    },
    {
      id: "env-config",
      name: "Environment Configuration",
      reason: "API URLs, feature flags",
      patterns: [
        ".env*",
        "vite.config.*"
      ],
      severity: "medium",
      requiredDocumentation: [
        "Required variables",
        "Build-time vs runtime"
      ]
    }
  ],
  contextFiles: [
    {
      path: ".llm-context/ARCHITECTURE.md",
      purpose: "Component architecture and data flow",
      required: true,
      expectedSections: [
        "Overview",
        "Directory Structure",
        "Component Hierarchy",
        "Data Flow"
      ]
    },
    {
      path: ".llm-context/PATTERNS.md",
      purpose: "React patterns and conventions",
      required: true,
      expectedSections: [
        "Component Patterns",
        "Hook Patterns",
        "State Management",
        "Error Handling"
      ]
    },
    {
      path: ".llm-context/CONSTRAINTS.md",
      purpose: "Technical constraints",
      required: true,
      expectedSections: [
        "Performance Budgets",
        "Browser Support",
        "Dependencies"
      ]
    }
  ],
  recommendedStructure: {
    root: ".llm-context",
    directories: [
      "patterns",
      "constraints"
    ],
    files: [
      {
        path: ".llm-context/ARCHITECTURE.md",
        purpose: "React architecture",
        required: true,
        template: `# Architecture

## Overview
[Brief description of the application]

## Directory Structure
\`\`\`
src/
\u251C\u2500\u2500 components/      # Reusable UI components
\u251C\u2500\u2500 pages/           # Route pages
\u251C\u2500\u2500 hooks/           # Custom hooks
\u251C\u2500\u2500 context/         # React context providers
\u251C\u2500\u2500 services/        # API services
\u251C\u2500\u2500 store/           # State management
\u2514\u2500\u2500 utils/           # Utilities
\`\`\`

## Component Hierarchy
[Describe component organization]

## Data Flow
[Describe data flow patterns]
`
      },
      {
        path: ".llm-context/PATTERNS.md",
        purpose: "React patterns",
        required: true,
        template: `# Patterns

## Component Patterns
- Composition over inheritance
- Container/Presentational split
- Custom hooks for logic

## Hook Patterns
[Describe hook conventions]

## State Management
[Describe state approach]

## Error Handling
- Error boundaries for UI errors
- Try-catch for async operations
- User-friendly error messages
`
      }
    ]
  }
};
var FRAMEWORK_CONFIGS = [
  nextjsConfig,
  reactViteConfig,
  expressConfig,
  nestjsConfig,
  astroConfig
];
var FRAMEWORK_MAP = new Map(FRAMEWORK_CONFIGS.map((config) => [
  config.id,
  config
]));
function getAllFrameworks() {
  return [
    ...FRAMEWORK_CONFIGS
  ];
}
__name(getAllFrameworks, "getAllFrameworks");
__name2(getAllFrameworks, "getAllFrameworks");
function getFramework(id) {
  return FRAMEWORK_MAP.get(id);
}
__name(getFramework, "getFramework");
__name2(getFramework, "getFramework");
function getFrameworksByCategory(category) {
  return FRAMEWORK_CONFIGS.filter((config) => config.category === category);
}
__name(getFrameworksByCategory, "getFrameworksByCategory");
__name2(getFrameworksByCategory, "getFrameworksByCategory");
function isValidFramework(id) {
  return FRAMEWORK_MAP.has(id);
}
__name(isValidFramework, "isValidFramework");
__name2(isValidFramework, "isValidFramework");
async function detectFrameworks(context) {
  const detectedFrameworks = [];
  for (const config of FRAMEWORK_CONFIGS) {
    const detection = await evaluateFramework(config, context);
    if (detection.confidence > 0.3) {
      detectedFrameworks.push(detection);
    }
  }
  return detectedFrameworks.sort((a, b) => b.confidence - a.confidence);
}
__name(detectFrameworks, "detectFrameworks");
__name2(detectFrameworks, "detectFrameworks");
async function detectPrimaryFramework(context) {
  const frameworks = await detectFrameworks(context);
  if (frameworks.length === 0) {
    return {
      id: "unknown",
      name: "Unknown",
      confidence: 0,
      indicators: []
    };
  }
  return frameworks[0];
}
__name(detectPrimaryFramework, "detectPrimaryFramework");
__name2(detectPrimaryFramework, "detectPrimaryFramework");
async function evaluateFramework(config, context) {
  let totalWeight = 0;
  let matchedWeight = 0;
  const matchedIndicators = [];
  let detectedVersion;
  for (const indicator of config.indicators) {
    totalWeight += indicator.weight;
    const matched = await checkIndicator(indicator, context);
    if (matched.match) {
      matchedWeight += indicator.weight;
      matchedIndicators.push(indicator.pattern);
      if (matched.version) {
        detectedVersion = matched.version;
      }
    }
  }
  const confidence = totalWeight > 0 ? matchedWeight / totalWeight : 0;
  return {
    id: config.id,
    name: config.name,
    confidence,
    version: detectedVersion,
    indicators: matchedIndicators
  };
}
__name(evaluateFramework, "evaluateFramework");
__name2(evaluateFramework, "evaluateFramework");
async function checkIndicator(indicator, context) {
  switch (indicator.type) {
    case "dependency": {
      const deps = {
        ...context.packageJson?.dependencies,
        ...context.packageJson?.devDependencies
      };
      const version = deps[indicator.pattern];
      return {
        match: Boolean(version),
        version: version?.replace(/^[\^~]/, "")
      };
    }
    case "file": {
      const regex = new RegExp(`^${indicator.pattern.replace(/\./g, "\\.").replace(/\{([^}]+)\}/g, "($1)").replace(/,/g, "|").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*")}$`);
      const match = context.filePaths.some((path9) => regex.test(path9));
      return {
        match
      };
    }
    case "script": {
      const scripts = context.packageJson?.scripts || {};
      const match = Object.values(scripts).some((script) => script.includes(indicator.pattern));
      return {
        match
      };
    }
    case "config": {
      if (context.checkFileContent) {
        const match = await context.checkFileContent(indicator.pattern, [
          "*.config.*"
        ]);
        return {
          match
        };
      }
      return {
        match: false
      };
    }
    default:
      return {
        match: false
      };
  }
}
__name(checkIndicator, "checkIndicator");
__name2(checkIndicator, "checkIndicator");
var GapAnalyzer = class {
  static {
    __name(this, "GapAnalyzer");
  }
  static {
    __name2(this, "GapAnalyzer");
  }
  config;
  constructor(config = {}) {
    this.config = {
      coverageThreshold: config.coverageThreshold ?? 0.3,
      includeOptional: config.includeOptional ?? false,
      frameworkConfig: config.frameworkConfig
    };
  }
  /**
  * Analyze gaps between detected and expected patterns
  */
  analyze(detectionResult, expectedPatterns) {
    const expected = expectedPatterns || this.config.frameworkConfig?.expectedPatterns || [];
    const relevantExpected = this.config.includeOptional ? expected : expected.filter((p) => p.importance !== "optional");
    const gaps = this.identifyGaps(detectionResult, relevantExpected);
    const strengths = detectionResult.foundPatterns.filter((p) => p.isPositive && p.strength >= this.config.coverageThreshold);
    const antiPatterns = detectionResult.foundPatterns.filter((p) => !p.isPositive);
    const score = this.calculateScore(relevantExpected, strengths, gaps, antiPatterns);
    const recommendations = this.generateRecommendations(gaps, antiPatterns);
    const summary = {
      totalExpected: relevantExpected.length,
      patternsFound: strengths.length,
      patternsMissing: gaps.length,
      antiPatternsFound: antiPatterns.length,
      criticalGaps: gaps.filter((g) => g.severity === "critical").length,
      recommendedGaps: gaps.filter((g) => g.severity === "high").length,
      optionalGaps: gaps.filter((g) => g.severity === "medium" || g.severity === "low").length
    };
    return {
      gaps,
      strengths,
      antiPatterns,
      score,
      recommendations,
      summary
    };
  }
  /**
  * Analyze a workspace profile for gaps
  */
  analyzeWorkspace(profile, frameworkConfig) {
    const config = frameworkConfig || this.config.frameworkConfig;
    if (!config) {
      return {
        gaps: [],
        strengths: [],
        antiPatterns: [],
        score: 0,
        recommendations: [],
        summary: {
          totalExpected: 0,
          patternsFound: 0,
          patternsMissing: 0,
          antiPatternsFound: 0,
          criticalGaps: 0,
          recommendedGaps: 0,
          optionalGaps: 0
        }
      };
    }
    const detectionResult = {
      foundPatterns: profile.detectedPatterns.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        locations: p.locations.map((loc) => ({
          file: loc.file,
          line: loc.line ?? 0,
          column: loc.column,
          snippet: loc.snippet ?? "",
          confidence: 1
        })),
        strength: p.strength,
        isPositive: true
      })),
      missingPatterns: [],
      scannedFiles: profile.structure.totalFiles,
      duration: 0,
      errors: []
    };
    return this.analyze(detectionResult, config.expectedPatterns);
  }
  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================
  identifyGaps(detection, expected) {
    const gaps = [];
    for (const pattern of expected) {
      const found = detection.foundPatterns.find((p) => p.id === pattern.id);
      if (!found) {
        gaps.push({
          patternId: pattern.id,
          patternName: pattern.name,
          type: "missing",
          severity: this.importanceToSeverity(pattern.importance),
          description: `Missing ${pattern.name}: ${pattern.description}`,
          recommendation: this.getRecommendation(pattern),
          effort: this.estimateEffort(pattern),
          autoFixable: false
        });
      } else if (found.strength < this.config.coverageThreshold) {
        gaps.push({
          patternId: pattern.id,
          patternName: pattern.name,
          type: "incomplete",
          severity: this.importanceToSeverity(pattern.importance),
          description: `Incomplete ${pattern.name}: Only ${Math.round(found.strength * 100)}% coverage`,
          recommendation: `Improve coverage of ${pattern.name}`,
          effort: "small",
          affectedFiles: found.locations.map((l) => l.file),
          autoFixable: false
        });
      }
    }
    return gaps;
  }
  importanceToSeverity(importance) {
    switch (importance) {
      case "critical":
        return "critical";
      case "recommended":
        return "high";
      case "optional":
        return "low";
    }
  }
  getRecommendation(pattern) {
    switch (pattern.category) {
      case "error-handling":
        return `Add ${pattern.name} to handle errors gracefully`;
      case "security":
        return `Implement ${pattern.name} to improve security`;
      case "testing":
        return `Add ${pattern.name} for better test coverage`;
      case "performance":
        return `Optimize with ${pattern.name}`;
      default:
        return `Implement ${pattern.name}`;
    }
  }
  estimateEffort(pattern) {
    switch (pattern.importance) {
      case "critical":
        return "medium";
      case "recommended":
        return "small";
      case "optional":
        return "trivial";
    }
  }
  calculateScore(expected, strengths, gaps, antiPatterns) {
    if (expected.length === 0) {
      return 100;
    }
    const coverageScore = strengths.length / expected.length * 100;
    const criticalPenalty = gaps.filter((g) => g.severity === "critical").length * 10;
    const highPenalty = gaps.filter((g) => g.severity === "high").length * 5;
    const antiPatternPenalty = antiPatterns.length * 8;
    const score = Math.max(0, Math.min(100, coverageScore - criticalPenalty - highPenalty - antiPatternPenalty));
    return Math.round(score);
  }
  generateRecommendations(gaps, antiPatterns) {
    const recommendations = [];
    let priority = 1;
    for (const gap of gaps.filter((g) => g.severity === "critical")) {
      recommendations.push({
        id: `gap-${gap.patternId}`,
        category: this.patternCategoryToRecommendationCategory(gap),
        priority: priority++,
        title: `Add ${gap.patternName}`,
        description: gap.description,
        actions: [
          {
            type: "add-pattern",
            target: gap.patternId,
            description: gap.recommendation,
            autoApply: gap.autoFixable
          }
        ],
        estimatedTime: this.effortToTime(gap.effort),
        healthImpact: 15
      });
    }
    for (const antiPattern of antiPatterns) {
      recommendations.push({
        id: `fix-${antiPattern.id}`,
        category: "pattern",
        priority: priority++,
        title: `Fix ${antiPattern.name}`,
        description: `Found ${antiPattern.locations.length} instances of ${antiPattern.name}`,
        actions: antiPattern.locations.slice(0, 5).map((loc) => ({
          type: "update-file",
          target: loc.file,
          description: `Fix at line ${loc.line}`,
          autoApply: false
        })),
        estimatedTime: `${antiPattern.locations.length * 5} minutes`,
        healthImpact: 10
      });
    }
    for (const gap of gaps.filter((g) => g.severity === "high")) {
      recommendations.push({
        id: `gap-${gap.patternId}`,
        category: this.patternCategoryToRecommendationCategory(gap),
        priority: priority++,
        title: `Add ${gap.patternName}`,
        description: gap.description,
        actions: [
          {
            type: "add-pattern",
            target: gap.patternId,
            description: gap.recommendation,
            autoApply: gap.autoFixable
          }
        ],
        estimatedTime: this.effortToTime(gap.effort),
        healthImpact: 8
      });
    }
    return recommendations;
  }
  patternCategoryToRecommendationCategory(_gap) {
    return "pattern";
  }
  effortToTime(effort) {
    switch (effort) {
      case "trivial":
        return "5 minutes";
      case "small":
        return "15 minutes";
      case "medium":
        return "1 hour";
      case "large":
        return "4 hours";
    }
  }
};
function createMatch(content, filePath, regexMatch, confidence = 0.9) {
  const beforeMatch = content.slice(0, regexMatch.index);
  const line = (beforeMatch.match(/\n/g) || []).length + 1;
  const lines = content.split("\n");
  const snippet = lines[line - 1]?.trim() || regexMatch[0];
  return {
    file: filePath,
    line,
    snippet: snippet.slice(0, 100),
    confidence
  };
}
__name(createMatch, "createMatch");
__name2(createMatch, "createMatch");
var errorBoundaryMatcher = {
  id: "error-boundary",
  name: "Error Boundary",
  category: "error-handling",
  files: [
    "**/*.{tsx,jsx}"
  ],
  isPositive: true,
  importance: "critical",
  description: "React Error Boundary for graceful error handling",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /class\s+\w+\s+extends\s+\w*Error.*\{[\s\S]*?componentDidCatch/g,
      /ErrorBoundary/g,
      /react-error-boundary/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var tryCatchMatcher = {
  id: "try-catch",
  name: "Try-Catch Error Handling",
  category: "error-handling",
  files: [
    "**/*.{ts,tsx,js,jsx}"
  ],
  isPositive: true,
  importance: "recommended",
  description: "Proper try-catch error handling for async operations",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const pattern = /try\s*\{[\s\S]*?\}\s*catch\s*\(/g;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches2.push(createMatch(content, filePath, match, 0.85));
    }
    return matches2;
  }, "match")
};
var expressErrorMiddlewareMatcher = {
  id: "express-error-middleware",
  name: "Express Error Middleware",
  category: "error-handling",
  files: [
    "**/*.{ts,js}"
  ],
  isPositive: true,
  importance: "critical",
  description: "Centralized error handling middleware for Express",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /\(\s*err\s*,\s*req\s*,\s*res\s*,\s*next\s*\)/g,
      /\(\s*error\s*:\s*\w+\s*,\s*req\s*:\s*\w+\s*,\s*res\s*:\s*\w+\s*,\s*next\s*:\s*\w+\s*\)/g,
      /errorHandler|ErrorHandler/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var nestjsExceptionFilterMatcher = {
  id: "nestjs-exception-filter",
  name: "NestJS Exception Filter",
  category: "error-handling",
  files: [
    "**/*.ts"
  ],
  isPositive: true,
  importance: "critical",
  description: "NestJS exception filters for error handling",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /@Catch\s*\(/g,
      /ExceptionFilter/g,
      /HttpException/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var unhandledPromiseMatcher = {
  id: "unhandled-promise",
  name: "Unhandled Promise",
  category: "error-handling",
  files: [
    "**/*.{ts,tsx,js,jsx}"
  ],
  isPositive: false,
  importance: "critical",
  description: "Promises without .catch() or try-catch (potential unhandled rejection)",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const thenPattern = /\.then\s*\([^)]+\)(?!\s*\.catch)/g;
    let match;
    while ((match = thenPattern.exec(content)) !== null) {
      const afterMatch = content.slice(match.index);
      if (!afterMatch.slice(0, 200).includes(".catch")) {
        matches2.push(createMatch(content, filePath, match, 0.6));
      }
    }
    return matches2;
  }, "match")
};
var globalErrorHandlerMatcher = {
  id: "global-error-handler",
  name: "Global Error Handler",
  category: "error-handling",
  files: [
    "**/*.{ts,tsx,js,jsx}"
  ],
  isPositive: true,
  importance: "recommended",
  description: "Global error handler for uncaught exceptions",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /process\.on\s*\(\s*['"]uncaughtException['"]/g,
      /process\.on\s*\(\s*['"]unhandledRejection['"]/g,
      /window\.onerror/g,
      /window\.addEventListener\s*\(\s*['"]error['"]/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var errorHandlingMatchers = [
  errorBoundaryMatcher,
  tryCatchMatcher,
  expressErrorMiddlewareMatcher,
  nestjsExceptionFilterMatcher,
  unhandledPromiseMatcher,
  globalErrorHandlerMatcher
];
function createMatch2(content, filePath, regexMatch, confidence = 0.9) {
  const beforeMatch = content.slice(0, regexMatch.index);
  const line = (beforeMatch.match(/\n/g) || []).length + 1;
  const lines = content.split("\n");
  const snippet = lines[line - 1]?.trim() || regexMatch[0];
  return {
    file: filePath,
    line,
    snippet: snippet.slice(0, 100),
    confidence
  };
}
__name(createMatch2, "createMatch2");
__name2(createMatch2, "createMatch");
var reactMemoMatcher = {
  id: "react-memo",
  name: "React Memoization",
  category: "performance",
  files: [
    "**/*.{tsx,jsx}"
  ],
  isPositive: true,
  importance: "optional",
  description: "Performance optimization with React.memo, useMemo, useCallback",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /React\.memo\s*\(/g,
      /memo\s*\(/g,
      /useMemo\s*\(/g,
      /useCallback\s*\(/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch2(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var lazyLoadingMatcher = {
  id: "lazy-loading",
  name: "Lazy Loading",
  category: "performance",
  files: [
    "**/*.{tsx,jsx,ts,js}"
  ],
  isPositive: true,
  importance: "recommended",
  description: "Code splitting with lazy loading",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /React\.lazy\s*\(/g,
      /lazy\s*\(/g,
      /dynamic\s*\(\s*\(\s*\)\s*=>/g,
      /import\s*\(\s*['"][^'"]+['"]\s*\)/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch2(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var imageOptimizationMatcher = {
  id: "image-optimization",
  name: "Image Optimization",
  category: "performance",
  files: [
    "**/*.{tsx,jsx}"
  ],
  isPositive: true,
  importance: "recommended",
  description: "Optimized images with next/image or similar",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /import.*Image.*from ['"]next\/image['"]/g,
      /import.*Image.*from ['"]@astro\/assets['"]/g,
      /<Image[^>]+/g,
      /loading\s*=\s*['"]lazy['"]/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch2(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var largeBundleMatcher = {
  id: "large-bundle-imports",
  name: "Large Bundle Imports",
  category: "performance",
  files: [
    "**/*.{tsx,jsx,ts,js}"
  ],
  isPositive: false,
  importance: "recommended",
  description: "Imports that may cause large bundle sizes",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    if (filePath.includes("config") || filePath.includes(".config.")) {
      return [];
    }
    const matches2 = [];
    const patterns3 = [
      /import\s+\*\s+as\s+\w+\s+from\s+['"]lodash['"]/g,
      /import\s+\{\s*\}\s+from\s+['"]moment['"]/g,
      /import\s+moment\s+from\s+['"]moment['"]/g,
      /import\s+\*\s+as\s+\w+\s+from\s+['"]rxjs['"]/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch2(content, filePath, match, 0.7));
      }
    }
    return matches2;
  }, "match")
};
var cachingMatcher = {
  id: "caching",
  name: "Data Caching",
  category: "performance",
  files: [
    "**/*.{ts,js}"
  ],
  isPositive: true,
  importance: "recommended",
  description: "Caching for improved performance",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /cache-manager/g,
      /@nestjs\/cache-manager/g,
      /redis/g,
      /lru-cache/g,
      /quick-lru/g,
      /unstable_cache/g,
      /revalidate\s*:/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch2(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var asyncInLoopMatcher = {
  id: "async-in-loop",
  name: "Async Operations in Loop",
  category: "performance",
  files: [
    "**/*.{ts,tsx,js,jsx}"
  ],
  isPositive: false,
  importance: "recommended",
  description: "Sequential async operations that could be parallelized",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /for\s*\([^)]+\)\s*\{[^}]*await\s+/g,
      /\.forEach\s*\(\s*async/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch2(content, filePath, match, 0.6));
      }
    }
    return matches2;
  }, "match")
};
var compressionMatcher = {
  id: "compression",
  name: "Response Compression",
  category: "performance",
  files: [
    "**/*.{ts,js}"
  ],
  isPositive: true,
  importance: "recommended",
  description: "Gzip/Brotli compression for responses",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /compression/g,
      /brotli/g,
      /gzip/g,
      /Content-Encoding/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch2(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var performanceMatchers = [
  reactMemoMatcher,
  lazyLoadingMatcher,
  imageOptimizationMatcher,
  largeBundleMatcher,
  cachingMatcher,
  asyncInLoopMatcher,
  compressionMatcher
];
function createMatch3(content, filePath, regexMatch, confidence = 0.9) {
  const beforeMatch = content.slice(0, regexMatch.index);
  const line = (beforeMatch.match(/\n/g) || []).length + 1;
  const lines = content.split("\n");
  const snippet = lines[line - 1]?.trim() || regexMatch[0];
  return {
    file: filePath,
    line,
    snippet: snippet.slice(0, 100),
    confidence
  };
}
__name(createMatch3, "createMatch3");
__name2(createMatch3, "createMatch");
var helmetMatcher = {
  id: "helmet-security",
  name: "Helmet Security Headers",
  category: "security",
  files: [
    "**/*.{ts,js}"
  ],
  isPositive: true,
  importance: "critical",
  description: "Security headers with Helmet middleware",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /import.*helmet/g,
      /require\s*\(\s*['"]helmet['"]\s*\)/g,
      /app\.use\s*\(\s*helmet\s*\(/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch3(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var corsMatcher = {
  id: "cors-config",
  name: "CORS Configuration",
  category: "security",
  files: [
    "**/*.{ts,js}"
  ],
  isPositive: true,
  importance: "critical",
  description: "Cross-origin resource sharing configuration",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /import.*cors/g,
      /require\s*\(\s*['"]cors['"]\s*\)/g,
      /app\.use\s*\(\s*cors\s*\(/g,
      /Access-Control-Allow-Origin/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch3(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var rateLimitMatcher = {
  id: "rate-limiting",
  name: "Rate Limiting",
  category: "security",
  files: [
    "**/*.{ts,js}"
  ],
  isPositive: true,
  importance: "critical",
  description: "Request rate limiting to prevent abuse",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /express-rate-limit/g,
      /rate-limiter-flexible/g,
      /rateLimit/g,
      /@nestjs\/throttler/g,
      /ThrottlerModule/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch3(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var sqlInjectionMatcher = {
  id: "sql-injection-risk",
  name: "SQL Injection Risk",
  category: "security",
  files: [
    "**/*.{ts,js}"
  ],
  isPositive: false,
  importance: "critical",
  description: "Potential SQL injection vulnerability (string concatenation in queries)",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /query\s*\(\s*[`'"].*\$\{/g,
      /execute\s*\(\s*[`'"].*\+/g,
      /SELECT.*\+.*WHERE/gi,
      /INSERT.*\+.*VALUES/gi
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch3(content, filePath, match, 0.7));
      }
    }
    return matches2;
  }, "match")
};
var xssMatcher = {
  id: "xss-risk",
  name: "XSS Risk",
  category: "security",
  files: [
    "**/*.{tsx,jsx}"
  ],
  isPositive: false,
  importance: "critical",
  description: "Potential XSS vulnerability (dangerouslySetInnerHTML usage)",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const pattern = /dangerouslySetInnerHTML/g;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches2.push(createMatch3(content, filePath, match, 0.8));
    }
    return matches2;
  }, "match")
};
var hardcodedSecretsMatcher = {
  id: "hardcoded-secrets",
  name: "Hardcoded Secrets",
  category: "security",
  files: [
    "**/*.{ts,tsx,js,jsx}"
  ],
  isPositive: false,
  importance: "critical",
  description: "Potential hardcoded secrets or API keys",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    if (filePath.includes("test") || filePath.includes("fixture") || filePath.includes("mock")) {
      return [];
    }
    const matches2 = [];
    const patterns3 = [
      /(api_key|apiKey|API_KEY)\s*[:=]\s*['"][^'"]{20,}['"]/gi,
      /(secret|SECRET)\s*[:=]\s*['"][^'"]{16,}['"]/gi,
      /(password|PASSWORD)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
      /sk-[a-zA-Z0-9]{24,}/g,
      /ghp_[a-zA-Z0-9]{36}/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch3(content, filePath, match, 0.75));
      }
    }
    return matches2;
  }, "match")
};
var inputValidationMatcher = {
  id: "input-validation",
  name: "Input Validation",
  category: "security",
  files: [
    "**/*.{ts,js}"
  ],
  isPositive: true,
  importance: "critical",
  description: "Request input validation with Zod, Yup, or similar",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /z\.(object|string|number|array)/g,
      /yup\.(object|string|number|array)/g,
      /@IsString|@IsNumber|@IsEmail/g,
      /Joi\.(object|string|number|array)/g,
      /express-validator/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch3(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var authGuardMatcher = {
  id: "auth-guard",
  name: "Authentication Guard",
  category: "security",
  files: [
    "**/*.{ts,tsx,js,jsx}"
  ],
  isPositive: true,
  importance: "critical",
  description: "Authentication middleware or guards for protected routes",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /@UseGuards/g,
      /AuthGuard/g,
      /isAuthenticated/g,
      /requireAuth/g,
      /withAuth/g,
      /useAuth/g,
      /getServerSession/g,
      /getToken/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch3(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var securityMatchers = [
  helmetMatcher,
  corsMatcher,
  rateLimitMatcher,
  sqlInjectionMatcher,
  xssMatcher,
  hardcodedSecretsMatcher,
  inputValidationMatcher,
  authGuardMatcher
];
function createMatch4(content, filePath, regexMatch, confidence = 0.9) {
  const beforeMatch = content.slice(0, regexMatch.index);
  const line = (beforeMatch.match(/\n/g) || []).length + 1;
  const lines = content.split("\n");
  const snippet = lines[line - 1]?.trim() || regexMatch[0];
  return {
    file: filePath,
    line,
    snippet: snippet.slice(0, 100),
    confidence
  };
}
__name(createMatch4, "createMatch4");
__name2(createMatch4, "createMatch");
var unitTestMatcher = {
  id: "unit-tests",
  name: "Unit Tests",
  category: "testing",
  files: [
    "**/*.{test,spec}.{ts,tsx,js,jsx}",
    "**/__tests__/**/*.{ts,tsx,js,jsx}"
  ],
  isPositive: true,
  importance: "recommended",
  description: "Unit test files with test assertions",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /describe\s*\(/g,
      /it\s*\(/g,
      /test\s*\(/g,
      /expect\s*\(/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch4(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var vagueAssertionMatcher = {
  id: "vague-assertions",
  name: "Vague Assertions",
  category: "testing",
  files: [
    "**/*.{test,spec}.{ts,tsx,js,jsx}",
    "**/__tests__/**/*.{ts,tsx,js,jsx}"
  ],
  isPositive: false,
  importance: "recommended",
  description: "Vague test assertions that don't provide meaningful validation",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /\.toBeTruthy\s*\(\s*\)/g,
      /\.toBeFalsy\s*\(\s*\)/g,
      /\.toBeDefined\s*\(\s*\)/g,
      /\.not\.toBeUndefined\s*\(\s*\)/g,
      /expect\s*\(\s*true\s*\)/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch4(content, filePath, match, 0.8));
      }
    }
    return matches2;
  }, "match")
};
var integrationTestMatcher = {
  id: "integration-tests",
  name: "Integration Tests",
  category: "testing",
  files: [
    "**/*.{test,spec}.{ts,tsx,js,jsx}",
    "**/e2e/**/*.{ts,tsx,js,jsx}"
  ],
  isPositive: true,
  importance: "recommended",
  description: "Integration tests with API or database interactions",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /supertest/g,
      /request\s*\(\s*app\s*\)/g,
      /createTestClient/g,
      /TestingModule/g,
      /@nestjs\/testing/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch4(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var reactTestingLibraryMatcher = {
  id: "react-testing-library",
  name: "React Testing Library",
  category: "testing",
  files: [
    "**/*.{test,spec}.{tsx,jsx}",
    "**/__tests__/**/*.{tsx,jsx}"
  ],
  isPositive: true,
  importance: "recommended",
  description: "React component testing with Testing Library",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /@testing-library\/react/g,
      /render\s*\(/g,
      /screen\./g,
      /userEvent\./g,
      /fireEvent\./g,
      /waitFor\s*\(/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch4(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var e2eTestMatcher = {
  id: "e2e-tests",
  name: "E2E Tests",
  category: "testing",
  files: [
    "**/e2e/**/*.{ts,js}",
    "**/*.e2e-spec.{ts,js}",
    "**/playwright/**/*.{ts,js}"
  ],
  isPositive: true,
  importance: "recommended",
  description: "End-to-end tests with Playwright or Cypress",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /@playwright\/test/g,
      /cypress/g,
      /page\.(goto|click|fill)/g,
      /cy\.(visit|get|click)/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch4(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var mockingMatcher = {
  id: "mocking",
  name: "Test Mocking",
  category: "testing",
  files: [
    "**/*.{test,spec}.{ts,tsx,js,jsx}",
    "**/__tests__/**/*.{ts,tsx,js,jsx}"
  ],
  isPositive: true,
  importance: "optional",
  description: "Mocking dependencies in tests",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /vi\.mock\s*\(/g,
      /jest\.mock\s*\(/g,
      /vi\.spyOn\s*\(/g,
      /jest\.spyOn\s*\(/g,
      /mockResolvedValue/g,
      /mockReturnValue/g,
      /msw/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch4(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var coverageConfigMatcher = {
  id: "coverage-config",
  name: "Test Coverage Configuration",
  category: "testing",
  files: [
    "**/vitest.config.{ts,js,mjs}",
    "**/jest.config.{ts,js,mjs}",
    "package.json"
  ],
  isPositive: true,
  importance: "recommended",
  description: "Test coverage thresholds and configuration",
  match: /* @__PURE__ */ __name2((content, filePath) => {
    const matches2 = [];
    const patterns3 = [
      /coverage/g,
      /coverageThreshold/g,
      /@vitest\/coverage/g,
      /collectCoverage/g
    ];
    for (const pattern of patterns3) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches2.push(createMatch4(content, filePath, match));
      }
    }
    return matches2;
  }, "match")
};
var testingMatchers = [
  unitTestMatcher,
  vagueAssertionMatcher,
  integrationTestMatcher,
  reactTestingLibraryMatcher,
  e2eTestMatcher,
  mockingMatcher,
  coverageConfigMatcher
];
function createBuiltInMatchers() {
  return [
    ...errorHandlingMatchers,
    ...securityMatchers,
    ...testingMatchers,
    ...performanceMatchers
  ];
}
__name(createBuiltInMatchers, "createBuiltInMatchers");
__name2(createBuiltInMatchers, "createBuiltInMatchers");
var PatternDetector = class {
  static {
    __name(this, "PatternDetector");
  }
  static {
    __name2(this, "PatternDetector");
  }
  config;
  matchers;
  constructor(config) {
    this.config = {
      workspaceRoot: config.workspaceRoot,
      include: config.include ?? [
        "**/*.{ts,tsx,js,jsx}"
      ],
      exclude: config.exclude ?? [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
        "**/*.min.js",
        "**/*.d.ts"
      ],
      maxFiles: config.maxFiles ?? 1e3,
      useAst: config.useAst ?? false,
      fileTimeout: config.fileTimeout ?? 5e3
    };
    this.matchers = createBuiltInMatchers();
  }
  /**
  * Add a custom pattern matcher
  */
  addMatcher(matcher) {
    this.matchers.push(matcher);
  }
  /**
  * Detect patterns in the workspace
  */
  async detect(matcherIds) {
    const startTime = Date.now();
    const errors = [];
    const files = await this.getFilesToScan();
    const matchersToRun = matcherIds ? this.matchers.filter((m) => matcherIds.includes(m.id)) : this.matchers;
    const fileContents = /* @__PURE__ */ new Map();
    for (const file of files.slice(0, this.config.maxFiles)) {
      try {
        const content = await this.readFileWithTimeout(file);
        fileContents.set(file, content);
      } catch (error) {
        errors.push({
          file: relative(this.config.workspaceRoot, file),
          message: error instanceof Error ? error.message : String(error),
          type: "read"
        });
      }
    }
    const foundPatterns = [];
    const checkedPatterns = /* @__PURE__ */ new Set();
    for (const matcher of matchersToRun) {
      checkedPatterns.add(matcher.id);
      try {
        const matches2 = await this.runMatcher(matcher, fileContents);
        if (matches2.length > 0) {
          foundPatterns.push({
            id: matcher.id,
            name: matcher.name,
            category: matcher.category,
            locations: matches2,
            strength: this.calculateStrength(matches2, fileContents.size),
            isPositive: matcher.isPositive
          });
        }
      } catch (error) {
        errors.push({
          file: "N/A",
          message: `Matcher ${matcher.id} failed: ${error instanceof Error ? error.message : String(error)}`,
          type: "unknown"
        });
      }
    }
    const missingPatterns = this.findMissingPatterns(foundPatterns, matchersToRun);
    return {
      foundPatterns,
      missingPatterns,
      scannedFiles: fileContents.size,
      duration: Date.now() - startTime,
      errors
    };
  }
  /**
  * Detect patterns in a single file
  */
  async detectInFile(filePath, matcherIds) {
    const startTime = Date.now();
    const errors = [];
    const matchersToRun = matcherIds ? this.matchers.filter((m) => matcherIds.includes(m.id)) : this.matchers;
    let content;
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      return {
        foundPatterns: [],
        missingPatterns: [],
        scannedFiles: 0,
        duration: Date.now() - startTime,
        errors: [
          {
            file: filePath,
            message: error instanceof Error ? error.message : String(error),
            type: "read"
          }
        ]
      };
    }
    const fileContents = /* @__PURE__ */ new Map([
      [
        filePath,
        content
      ]
    ]);
    const foundPatterns = [];
    for (const matcher of matchersToRun) {
      if (!this.matcherAppliesToFile(matcher, filePath)) {
        continue;
      }
      try {
        const matches2 = await this.runMatcher(matcher, fileContents);
        if (matches2.length > 0) {
          foundPatterns.push({
            id: matcher.id,
            name: matcher.name,
            category: matcher.category,
            locations: matches2,
            strength: 1,
            isPositive: matcher.isPositive
          });
        }
      } catch (error) {
        errors.push({
          file: filePath,
          message: `Matcher ${matcher.id} failed: ${error instanceof Error ? error.message : String(error)}`,
          type: "unknown"
        });
      }
    }
    const missingPatterns = this.findMissingPatterns(foundPatterns, matchersToRun.filter((m) => this.matcherAppliesToFile(m, filePath)));
    return {
      foundPatterns,
      missingPatterns,
      scannedFiles: 1,
      duration: Date.now() - startTime,
      errors
    };
  }
  /**
  * Get all registered matchers
  */
  getMatchers() {
    return [
      ...this.matchers
    ];
  }
  /**
  * Get matcher by ID
  */
  getMatcher(id) {
    return this.matchers.find((m) => m.id === id);
  }
  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================
  async getFilesToScan() {
    const patterns3 = this.config.include.map((p) => join(this.config.workspaceRoot, p));
    const files = await fastGlob2(patterns3, {
      ignore: this.config.exclude,
      absolute: true,
      onlyFiles: true
    });
    return files;
  }
  async readFileWithTimeout(filePath) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.fileTimeout);
    try {
      const stats = await stat(filePath);
      if (stats.size > 1024 * 1024) {
        throw new Error("File too large");
      }
      const content = await readFile(filePath, {
        encoding: "utf-8"
      });
      return content;
    } finally {
      clearTimeout(timeout);
    }
  }
  async runMatcher(matcher, fileContents) {
    const allMatches = [];
    for (const [filePath, content] of fileContents) {
      if (!this.matcherAppliesToFile(matcher, filePath)) {
        continue;
      }
      const matches2 = await matcher.match(content, filePath);
      allMatches.push(...matches2);
    }
    return allMatches;
  }
  matcherAppliesToFile(matcher, filePath) {
    const relativePath = relative(this.config.workspaceRoot, filePath);
    return matcher.files.some((pattern) => {
      const regex = this.globToRegex(pattern);
      return regex.test(relativePath);
    });
  }
  globToRegex(pattern) {
    const escaped = pattern.replace(/\./g, "\\.").replace(/\{([^}]+)\}/g, "($1)").replace(/,/g, "|").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
    return new RegExp(`^${escaped}$`);
  }
  calculateStrength(matches2, totalFiles) {
    if (totalFiles === 0) {
      return 0;
    }
    const uniqueFiles = new Set(matches2.map((m) => m.file)).size;
    const coverage = Math.min(uniqueFiles / totalFiles, 1);
    const avgConfidence = matches2.reduce((sum, m) => sum + m.confidence, 0) / matches2.length;
    return coverage * 0.6 + avgConfidence * 0.4;
  }
  findMissingPatterns(found, matchers) {
    const foundIds = new Set(found.map((f) => f.id));
    return matchers.filter((m) => !foundIds.has(m.id) && m.isPositive).map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      importance: m.importance,
      reason: m.description
    }));
  }
};
var WorkspaceProfiler = class {
  static {
    __name(this, "WorkspaceProfiler");
  }
  static {
    __name2(this, "WorkspaceProfiler");
  }
  config;
  constructor(config) {
    this.config = {
      workspaceRoot: config.workspaceRoot,
      detectPatterns: config.detectPatterns ?? true,
      maxFilesForLanguageDetection: config.maxFilesForLanguageDetection ?? 5e3,
      skipDirectories: config.skipDirectories ?? [
        "node_modules",
        ".git",
        "dist",
        "build",
        ".next",
        ".nuxt",
        "coverage",
        ".cache"
      ],
      includeHidden: config.includeHidden ?? false
    };
  }
  /**
  * Analyze the workspace and create a complete profile
  */
  async analyze() {
    const [packageJson, filePaths, packageManager, existingContext] = await Promise.all([
      this.readPackageJson(),
      this.getFilePaths(),
      this.detectPackageManager(),
      this.analyzeExistingContext()
    ]);
    const framework = await this.detectFramework(packageJson, filePaths);
    const languages = await this.analyzeLanguages(filePaths);
    const structure = await this.analyzeStructure(filePaths);
    let detectedPatterns = [];
    if (this.config.detectPatterns) {
      detectedPatterns = await this.detectPatterns();
    }
    const frameworkConfig = getFramework(framework.id);
    const gaps = frameworkConfig ? new GapAnalyzer({
      frameworkConfig
    }).analyzeWorkspace({
      root: this.config.workspaceRoot,
      framework,
      languages,
      packageManager,
      structure,
      existingContext,
      detectedPatterns,
      gaps: [],
      healthScore: 0,
      createdAt: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
    }).gaps : [];
    const healthScore = this.calculateHealthScore(existingContext, detectedPatterns, gaps, framework);
    return {
      root: this.config.workspaceRoot,
      framework,
      languages,
      packageManager,
      structure,
      existingContext,
      detectedPatterns,
      gaps,
      healthScore,
      createdAt: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
  * Quick scan for framework and basic info only
  */
  async quickScan() {
    const [packageJson, filePaths, packageManager] = await Promise.all([
      this.readPackageJson(),
      this.getFilePaths(),
      this.detectPackageManager()
    ]);
    const framework = await this.detectFramework(packageJson, filePaths);
    const languages = await this.analyzeLanguages(filePaths);
    return {
      framework,
      packageManager,
      languages
    };
  }
  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================
  async readPackageJson() {
    const packageJsonPath = join(this.config.workspaceRoot, "package.json");
    try {
      const content = await readFile(packageJsonPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  async getFilePaths() {
    const ignorePatterns = this.config.skipDirectories.map((dir) => `**/${dir}/**`);
    const files = await fastGlob2("**/*", {
      cwd: this.config.workspaceRoot,
      ignore: ignorePatterns,
      onlyFiles: true,
      dot: this.config.includeHidden
    });
    return files.slice(0, this.config.maxFilesForLanguageDetection);
  }
  async detectFramework(packageJson, filePaths) {
    const context = {
      packageJson,
      filePaths,
      checkFileContent: /* @__PURE__ */ __name2(async (pattern, files) => {
        for (const file of filePaths) {
          if (files.some((f) => file.match(new RegExp(f.replace("*", ".*"))))) {
            try {
              const content = await readFile(join(this.config.workspaceRoot, file), "utf-8");
              if (content.includes(pattern)) {
                return true;
              }
            } catch {
            }
          }
        }
        return false;
      }, "checkFileContent")
    };
    return detectPrimaryFramework(context);
  }
  async detectPackageManager() {
    const checks = [
      {
        file: "pnpm-lock.yaml",
        name: "pnpm"
      },
      {
        file: "yarn.lock",
        name: "yarn"
      },
      {
        file: "bun.lockb",
        name: "bun"
      },
      {
        file: "package-lock.json",
        name: "npm"
      }
    ];
    for (const { file, name } of checks) {
      try {
        await access(join(this.config.workspaceRoot, file), constants.F_OK);
        return {
          name,
          lockfile: file
        };
      } catch {
      }
    }
    return {
      name: "unknown"
    };
  }
  async analyzeLanguages(filePaths) {
    const languageMap = {};
    const extensionToLanguage = {
      ".ts": "TypeScript",
      ".tsx": "TypeScript",
      ".js": "JavaScript",
      ".jsx": "JavaScript",
      ".mjs": "JavaScript",
      ".cjs": "JavaScript",
      ".py": "Python",
      ".rb": "Ruby",
      ".go": "Go",
      ".rs": "Rust",
      ".java": "Java",
      ".kt": "Kotlin",
      ".swift": "Swift",
      ".php": "PHP",
      ".cs": "C#",
      ".cpp": "C++",
      ".c": "C",
      ".vue": "Vue",
      ".svelte": "Svelte",
      ".astro": "Astro",
      ".md": "Markdown",
      ".mdx": "MDX",
      ".css": "CSS",
      ".scss": "SCSS",
      ".less": "LESS",
      ".html": "HTML",
      ".json": "JSON",
      ".yaml": "YAML",
      ".yml": "YAML"
    };
    for (const file of filePaths) {
      const ext = extname(file).toLowerCase();
      const language = extensionToLanguage[ext];
      if (language) {
        if (!languageMap[language]) {
          languageMap[language] = {
            extensions: /* @__PURE__ */ new Set(),
            count: 0
          };
        }
        languageMap[language].extensions.add(ext);
        languageMap[language].count++;
      }
    }
    const totalFiles = filePaths.length;
    const languages = Object.entries(languageMap).map(([name, data]) => ({
      name,
      percentage: Math.round(data.count / totalFiles * 100),
      fileCount: data.count,
      extensions: Array.from(data.extensions)
    })).sort((a, b) => b.fileCount - a.fileCount);
    return languages;
  }
  async analyzeStructure(filePaths) {
    const sourceDirectories = /* @__PURE__ */ new Set();
    const testDirectories = /* @__PURE__ */ new Set();
    const configFiles = [];
    let isMonorepo = false;
    let monorepoTool;
    const monorepoChecks = [
      {
        file: "turbo.json",
        tool: "turborepo"
      },
      {
        file: "nx.json",
        tool: "nx"
      },
      {
        file: "lerna.json",
        tool: "lerna"
      },
      {
        file: "pnpm-workspace.yaml",
        tool: "pnpm-workspaces"
      }
    ];
    for (const { file, tool } of monorepoChecks) {
      try {
        await access(join(this.config.workspaceRoot, file), constants.F_OK);
        isMonorepo = true;
        monorepoTool = tool;
        break;
      } catch {
      }
    }
    for (const file of filePaths) {
      const parts = file.split("/");
      const firstDir = parts[0];
      if ([
        "src",
        "lib",
        "app",
        "apps",
        "packages",
        "components"
      ].includes(firstDir)) {
        sourceDirectories.add(firstDir);
      }
      if ([
        "test",
        "tests",
        "__tests__",
        "e2e",
        "spec"
      ].includes(firstDir)) {
        testDirectories.add(firstDir);
      }
      if (parts.length === 1 && (file.includes("config") || file.includes("rc") || file.startsWith("."))) {
        configFiles.push(file);
      }
    }
    const codeExtensions = [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".py",
      ".go",
      ".rs"
    ];
    const codeFiles = filePaths.filter((f) => codeExtensions.includes(extname(f).toLowerCase()));
    const totalLinesEstimate = codeFiles.length * 100;
    return {
      isMonorepo,
      monorepoTool,
      sourceDirectories: Array.from(sourceDirectories),
      testDirectories: Array.from(testDirectories),
      configFiles: configFiles.slice(0, 20),
      totalFiles: filePaths.length,
      totalLinesEstimate
    };
  }
  async analyzeExistingContext() {
    const contextDirs = [
      ".llm-context",
      ".ai-context",
      "ai_dev_utils",
      "docs/llm"
    ];
    let contextPath;
    let hasContextDirectory = false;
    for (const dir of contextDirs) {
      try {
        await access(join(this.config.workspaceRoot, dir), constants.F_OK);
        hasContextDirectory = true;
        contextPath = dir;
        break;
      } catch {
      }
    }
    if (!hasContextDirectory || !contextPath) {
      return {
        hasContextDirectory: false,
        files: [],
        qualityScore: 0
      };
    }
    const contextFiles = [];
    const fullContextPath = join(this.config.workspaceRoot, contextPath);
    try {
      const files = await fastGlob2("**/*.md", {
        cwd: fullContextPath,
        onlyFiles: true
      });
      for (const file of files) {
        const filePath = join(fullContextPath, file);
        try {
          const [stats, content] = await Promise.all([
            stat(filePath),
            readFile(filePath, "utf-8")
          ]);
          const sections = this.extractSections(content);
          const quality = this.assessFileQuality(content, sections);
          contextFiles.push({
            path: join(contextPath, file),
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            sections,
            quality
          });
        } catch {
        }
      }
    } catch {
    }
    const qualityScore = this.calculateContextQuality(contextFiles);
    return {
      hasContextDirectory,
      contextPath,
      files: contextFiles,
      qualityScore
    };
  }
  extractSections(content) {
    const headingPattern = /^#{1,3}\s+(.+)$/gm;
    const sections = [];
    let match;
    while ((match = headingPattern.exec(content)) !== null) {
      sections.push(match[1].trim());
    }
    return sections;
  }
  assessFileQuality(content, sections) {
    if (content.trim().length === 0) {
      return "empty";
    }
    if (content.length < 100 || sections.length < 2) {
      return "needs-improvement";
    }
    const placeholderPatterns = [
      /TODO/i,
      /FIXME/i,
      /\[.*\]/,
      /<.*>/
    ];
    const hasPlaceholders = placeholderPatterns.some((p) => p.test(content));
    if (hasPlaceholders && content.length < 500) {
      return "needs-improvement";
    }
    return "good";
  }
  calculateContextQuality(files) {
    if (files.length === 0) {
      return 0;
    }
    const qualityScores = {
      good: 100,
      "needs-improvement": 50,
      outdated: 30,
      empty: 0
    };
    const total = files.reduce((sum, file) => sum + qualityScores[file.quality], 0);
    return Math.round(total / files.length);
  }
  async detectPatterns() {
    const detector = new PatternDetector({
      workspaceRoot: this.config.workspaceRoot,
      useAst: false,
      maxFiles: 500
    });
    const result = await detector.detect();
    return result.foundPatterns.filter((p) => p.isPositive).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      locations: p.locations,
      strength: p.strength
    }));
  }
  calculateHealthScore(context, patterns3, gaps, framework) {
    let score = 50;
    if (context.hasContextDirectory) {
      score += 10;
      score += Math.min(10, context.qualityScore / 10);
    }
    const patternScore = patterns3.length * 2;
    score += Math.min(20, patternScore);
    const criticalGaps = gaps.filter((g) => g.severity === "critical").length;
    const highGaps = gaps.filter((g) => g.severity === "high").length;
    score -= criticalGaps * 10;
    score -= highGaps * 5;
    if (framework.confidence > 0.8) {
      score += 5;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  }
};
var QUERY_TYPE_KEYWORDS = {
  authentication: [
    "auth",
    "login",
    "session",
    "token",
    "api-key",
    "verify"
  ],
  testing: [
    "test",
    "vitest",
    "coverage",
    "mock",
    "spec",
    "assertion"
  ],
  api: [
    "endpoint",
    "route",
    "handler",
    "request",
    "response",
    "http"
  ],
  database: [
    "db",
    "query",
    "sql",
    "drizzle",
    "migration",
    "schema"
  ],
  ui: [
    "component",
    "react",
    "css",
    "style",
    "layout",
    "render"
  ],
  vscode: [
    "extension",
    "command",
    "webview",
    "activation",
    "disposable"
  ],
  mcp: [
    "mcp",
    "tool",
    "server",
    "protocol",
    "context"
  ],
  performance: [
    "perf",
    "slow",
    "timeout",
    "budget",
    "latency",
    "optimize"
  ],
  architecture: [
    "layer",
    "pattern",
    "structure",
    "boundary",
    "module"
  ],
  general: []
};
var PROMOTION_THRESHOLDS = {
  PROMOTE_TO_PATTERN: 3,
  ADD_AUTOMATION: 5
};
var LearningEngine = class {
  static {
    __name(this, "LearningEngine");
  }
  static {
    __name2(this, "LearningEngine");
  }
  interactionsPath;
  goldenPath;
  learningsPath;
  constructor(config) {
    this.interactionsPath = path3.join(config.rootDir, config.learningsDir, "interactions.jsonl");
    this.goldenPath = path3.join(config.rootDir, config.learningsDir, "golden.jsonl");
    this.learningsPath = path3.join(config.rootDir, config.learningsDir, "learnings.jsonl");
  }
  /**
  * Log an interaction for analysis
  */
  async logInteraction(data) {
    const interaction = {
      id: generateId2("INT"),
      timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString(),
      ...data
    };
    appendJsonl(this.interactionsPath, interaction);
    return interaction;
  }
  /**
  * Record human feedback on an interaction
  */
  async recordFeedback(interactionId, feedback) {
    const interactions = loadJsonl(this.interactionsPath);
    const interaction = interactions.find((i) => i.id === interactionId);
    if (!interaction) {
      return {
        updated: false,
        addedToGolden: false
      };
    }
    interaction.humanFeedback = {
      ...feedback,
      timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
    };
    await writeJsonl(this.interactionsPath, interactions);
    let addedToGolden = false;
    if (feedback.correct && feedback.confidence >= 0.9) {
      await this.addToGoldenDataset(interaction);
      addedToGolden = true;
    }
    return {
      updated: true,
      addedToGolden
    };
  }
  /**
  * Add a perfect interaction to golden dataset
  */
  async addToGoldenDataset(interaction) {
    const queryType = this.classifyQueryType(interaction.query);
    const goldenExample = {
      id: interaction.id,
      queryType,
      query: interaction.query,
      output: interaction.output,
      contextUsed: interaction.contextUsed,
      addedAt: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
    };
    appendJsonl(this.goldenPath, goldenExample);
    await this.checkGoldenPromotion(queryType);
  }
  /**
  * Check if query type has enough golden examples to promote
  * Returns true if promotion threshold (5+) is reached
  */
  async checkGoldenPromotion(queryType) {
    const golden = loadJsonl(this.goldenPath);
    const forType = golden.filter((g) => g.queryType === queryType);
    return forType.length >= 5;
  }
  /**
  * Classify query into category for pattern matching
  */
  classifyQueryType(query) {
    const q = query.toLowerCase();
    for (const [type, keywords] of Object.entries(QUERY_TYPE_KEYWORDS)) {
      if (type === "general") {
        continue;
      }
      if (keywords.some((kw) => q.includes(kw))) {
        return type;
      }
    }
    return "general";
  }
  /**
  * Get golden examples for a query type
  */
  getGoldenExamples(queryType, limit = 3) {
    const golden = loadJsonl(this.goldenPath);
    return golden.filter((g) => g.queryType === queryType).slice(-limit);
  }
  /**
  * Query learnings by keywords
  */
  query(keywords) {
    const learnings = loadJsonl(this.learningsPath);
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    return learnings.filter((learning) => {
      const triggers = Array.isArray(learning.trigger) ? learning.trigger : [
        learning.trigger
      ];
      const allText = [
        ...triggers,
        learning.action,
        learning.solution || ""
      ].join(" ").toLowerCase();
      return lowerKeywords.some((kw) => allText.includes(kw));
    });
  }
  /**
  * Record a new learning
  */
  async record(input) {
    const learning = {
      id: generateId2("L"),
      type: input.type,
      trigger: input.trigger,
      action: input.action,
      solution: input.action,
      source: input.source,
      timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
    };
    appendJsonl(this.learningsPath, learning);
    return {
      id: learning.id
    };
  }
  /**
  * Get learning statistics
  */
  getStats() {
    const interactions = loadJsonl(this.interactionsPath);
    const golden = loadJsonl(this.goldenPath);
    const withFeedback = interactions.filter((i) => i.humanFeedback);
    const correct = withFeedback.filter((i) => i.humanFeedback?.correct);
    const queryTypeBreakdown = {};
    for (const i of interactions) {
      const type = this.classifyQueryType(i.query);
      queryTypeBreakdown[type] = (queryTypeBreakdown[type] || 0) + 1;
    }
    return {
      totalInteractions: interactions.length,
      feedbackReceived: withFeedback.length,
      correctRate: withFeedback.length > 0 ? correct.length / withFeedback.length : 0,
      goldenExamples: golden.length,
      queryTypeBreakdown
    };
  }
  /**
  * Get recent interactions for review
  */
  getRecentInteractions(limit = 10) {
    const interactions = loadJsonl(this.interactionsPath);
    return interactions.slice(-limit);
  }
  /**
  * Get interactions needing feedback
  */
  getPendingFeedback(limit = 5) {
    const interactions = loadJsonl(this.interactionsPath);
    return interactions.filter((i) => !i.humanFeedback).slice(-limit);
  }
};
var ViolationTracker = class {
  static {
    __name(this, "ViolationTracker");
  }
  static {
    __name2(this, "ViolationTracker");
  }
  violationsPath;
  constructor(config) {
    this.violationsPath = path3.join(config.rootDir, config.violationsFile);
  }
  /**
  * Report a violation and update count
  */
  async report(input) {
    const violations = loadJsonl(this.violationsPath);
    const existing = violations.find((v) => v.type === input.type);
    if (existing) {
      existing.count += 1;
      existing.timestamp = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString();
      let shouldPromote = false;
      let shouldAutomate = false;
      if (existing.count >= PROMOTION_THRESHOLDS.ADD_AUTOMATION && !existing.automatedAt) {
        shouldAutomate = true;
        existing.automatedAt = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString();
      } else if (existing.count >= PROMOTION_THRESHOLDS.PROMOTE_TO_PATTERN && !existing.promotedAt) {
        shouldPromote = true;
        existing.promotedAt = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString();
      }
      await writeJsonl(this.violationsPath, violations);
      return {
        id: existing.id,
        count: existing.count,
        shouldPromote,
        shouldAutomate
      };
    }
    const violation = {
      id: generateId2("V"),
      type: input.type,
      file: input.file,
      whatHappened: input.message,
      whyItHappened: input.reason,
      prevention: input.prevention,
      wrongExample: input.wrongExample,
      correctExample: input.correctExample,
      timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString(),
      count: 1,
      promotedAt: null,
      automatedAt: null
    };
    await appendJsonlAsync(this.violationsPath, violation);
    return {
      id: violation.id,
      count: 1,
      shouldPromote: false,
      shouldAutomate: false
    };
  }
  /**
  * Get summary of all violations
  */
  getSummary() {
    const violations = loadJsonl(this.violationsPath);
    const byType = violations.map((v) => ({
      type: v.type,
      count: v.count,
      status: this.getViolationStatus(v)
    }));
    const readyForPromotion = violations.filter((v) => v.count >= PROMOTION_THRESHOLDS.PROMOTE_TO_PATTERN && !v.promotedAt).map((v) => v.type);
    const readyForAutomation = violations.filter((v) => v.count >= PROMOTION_THRESHOLDS.ADD_AUTOMATION && !v.automatedAt).map((v) => v.type);
    return {
      total: violations.length,
      byType,
      readyForPromotion,
      readyForAutomation
    };
  }
  /**
  * Get violation status based on count and flags
  */
  getViolationStatus(violation) {
    if (violation.automatedAt) {
      return "automated";
    }
    if (violation.promotedAt) {
      return "promoted";
    }
    if (violation.count >= PROMOTION_THRESHOLDS.ADD_AUTOMATION) {
      return "ready_for_automation";
    }
    if (violation.count >= PROMOTION_THRESHOLDS.PROMOTE_TO_PATTERN) {
      return "ready_for_promotion";
    }
    return "tracking";
  }
  /**
  * Get violations by type
  */
  getByType(type) {
    const violations = loadJsonl(this.violationsPath);
    return violations.find((v) => v.type === type);
  }
  /**
  * Get recent violations
  */
  getRecent(limit = 10) {
    const violations = loadJsonl(this.violationsPath);
    return violations.slice(-limit);
  }
  /**
  * Get violations for a specific file
  */
  getByFile(file) {
    const violations = loadJsonl(this.violationsPath);
    return violations.filter((v) => v.file.includes(file));
  }
};
var DEFAULT_SESSION_LIMITS = {
  maxToolCalls: 100,
  maxConsecutiveSameTool: 3,
  maxFileModifications: 50,
  maxConsecutiveSameFile: 5,
  sessionTimeoutMs: 36e5,
  maxTurns: 50,
  circuitBreakerThreshold: 3,
  circuitBreakerCooldownMs: 6e4
};
var LoopDetector = class {
  static {
    __name(this, "LoopDetector");
  }
  static {
    __name2(this, "LoopDetector");
  }
  // Thresholds from research (arXiv:2511.10650)
  STRUCTURAL_THRESHOLD = 3;
  SEMANTIC_THRESHOLD = 0.9;
  CONFIDENCE_THRESHOLD_HALT = 0.8;
  CONFIDENCE_THRESHOLD_WARN = 0.5;
  /**
  * Detect loops in session
  */
  detect(session) {
    if (!session || !session.loopDetection) {
      return {
        detected: false,
        confidence: 0,
        evidence: [],
        action: "continue"
      };
    }
    const structuralResult = this.detectStructuralLoop(session);
    const semanticResult = this.detectSemanticLoop(session);
    const detected = structuralResult.detected || semanticResult.detected;
    const type = structuralResult.detected && semanticResult.detected ? "both" : structuralResult.detected ? "structural" : semanticResult.detected ? "semantic" : void 0;
    const evidence = [
      ...structuralResult.evidence,
      ...semanticResult.evidence
    ];
    const confidence = Math.max(structuralResult.confidence, semanticResult.confidence);
    let action;
    if (confidence >= this.CONFIDENCE_THRESHOLD_HALT) {
      action = "halt";
    } else if (confidence >= this.CONFIDENCE_THRESHOLD_WARN) {
      action = "warn";
    } else {
      action = "continue";
    }
    return {
      detected,
      type,
      confidence,
      evidence,
      action
    };
  }
  /**
  * Structural loop detection
  * Detects: same tool called 3+ times in sequence
  */
  detectStructuralLoop(session) {
    const evidence = [];
    let maxConsecutive = 0;
    let maxTool = "";
    for (const [tool, count] of session.loopDetection.consecutiveSameTool.entries()) {
      if (count > maxConsecutive) {
        maxConsecutive = count;
        maxTool = tool;
      }
    }
    const sequence = session.loopDetection.sequence;
    if (sequence.length >= 3) {
      const isAlternating = sequence.length >= 4 && sequence[sequence.length - 1] === sequence[sequence.length - 3] && sequence[sequence.length - 2] === sequence[sequence.length - 4];
      if (isAlternating) {
        evidence.push(`Alternating pattern detected: ${sequence.slice(-4).join(" \u2192 ")}`);
      }
    }
    const detected = maxConsecutive >= this.STRUCTURAL_THRESHOLD;
    if (detected) {
      evidence.push(`Tool '${maxTool}' called ${maxConsecutive} times consecutively`);
    }
    const confidence = detected ? Math.min(0.6 + (maxConsecutive - this.STRUCTURAL_THRESHOLD) * 0.1, 1) : 0;
    return {
      detected,
      confidence,
      evidence
    };
  }
  /**
  * Semantic loop detection
  * Detects: similar args (cosine similarity > 90%)
  */
  detectSemanticLoop(session) {
    const evidence = [];
    if (session.toolCalls.length < 2) {
      return {
        detected: false,
        confidence: 0,
        evidence: []
      };
    }
    const recentCalls = session.toolCalls.slice(-5);
    let maxSimilarity = 0;
    for (let i = 0; i < recentCalls.length - 1; i++) {
      for (let j = i + 1; j < recentCalls.length; j++) {
        const call1 = recentCalls[i];
        const call2 = recentCalls[j];
        if (call1.name !== call2.name) {
          continue;
        }
        const similarity = this.calculateArgsSimilarity(call1.args, call2.args);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }
        if (similarity >= this.SEMANTIC_THRESHOLD) {
          evidence.push(`Tool '${call1.name}' calls ${i} and ${j} are ${(similarity * 100).toFixed(1)}% similar`);
        }
      }
    }
    const detected = maxSimilarity >= this.SEMANTIC_THRESHOLD;
    const confidence = detected ? Math.min(0.5 + (maxSimilarity - this.SEMANTIC_THRESHOLD) * 2, 1) : 0;
    return {
      detected,
      confidence,
      evidence
    };
  }
  /**
  * Calculate similarity between tool arguments
  * Uses simple string-based similarity (could be enhanced with embeddings)
  */
  calculateArgsSimilarity(args1, args2) {
    const str1 = JSON.stringify(args1, Object.keys(args1).sort());
    const str2 = JSON.stringify(args2, Object.keys(args2).sort());
    if (str1 === str2) {
      return 1;
    }
    const tokens1 = new Set(str1.split(/\W+/));
    const tokens2 = new Set(str2.split(/\W+/));
    const intersection = new Set([
      ...tokens1
    ].filter((x) => tokens2.has(x)));
    const union = /* @__PURE__ */ new Set([
      ...tokens1,
      ...tokens2
    ]);
    return intersection.size / union.size;
  }
};
var ToolCallSchema = z.object({
  id: z.string().min(1, "Tool call ID required"),
  name: z.string().min(1, "Tool name required"),
  args: z.record(z.unknown()),
  timestamp: z.number().positive("Timestamp must be positive"),
  result: z.object({
    success: z.boolean(),
    output: z.unknown().optional(),
    error: z.string().optional()
  }).optional(),
  embedding: z.array(z.number()).optional()
});
var FileModificationSchema2 = z.object({
  path: z.string().min(1, "File path required"),
  timestamp: z.number().positive("Timestamp must be positive"),
  type: z.enum([
    "create",
    "update",
    "delete"
  ]),
  linesChanged: z.number().nonnegative().optional()
});
var SessionManager = class {
  static {
    __name(this, "SessionManager");
  }
  static {
    __name2(this, "SessionManager");
  }
  sessions = /* @__PURE__ */ new Map();
  limits;
  loopDetector;
  persistencePath;
  autosaveEnabled;
  constructor(limits = {}, options) {
    this.limits = {
      ...DEFAULT_SESSION_LIMITS,
      ...limits
    };
    this.loopDetector = new LoopDetector();
    this.persistencePath = options?.persistencePath;
    this.autosaveEnabled = options?.autosave ?? false;
    if (this.persistencePath) {
      this.loadSessions().catch((error) => {
        logger2.error("Failed to load sessions on startup", {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }
  }
  /**
  * Start a new session
  */
  startSession(sessionId, metadata) {
    if (!sessionId) {
      throw new Error("SessionManager.startSession: sessionId is required");
    }
    if (this.sessions.has(sessionId)) {
      logger2.warn("Session already exists", {
        sessionId,
        action: "rejected"
      });
      throw new Error(`SessionManager.startSession: Session ${sessionId} already exists`);
    }
    const now = Date.now();
    logger2.info("Session started", {
      sessionId,
      workspaceId: metadata?.workspaceId,
      userId: metadata?.userId,
      timestamp: now
    });
    this.sessions.set(sessionId, {
      sessionId,
      startedAt: now,
      lastActivity: now,
      turnCount: 0,
      toolCalls: [],
      fileModifications: [],
      consecutiveModifications: /* @__PURE__ */ new Map(),
      loopDetection: {
        sequence: [],
        dedupKeys: /* @__PURE__ */ new Set(),
        consecutiveSameTool: /* @__PURE__ */ new Map(),
        semanticCache: /* @__PURE__ */ new Map(),
        circuitBreakers: /* @__PURE__ */ new Map()
      },
      riskLevel: "low",
      riskReasons: [],
      metadata: metadata ?? {}
    });
    void this.autoSave();
  }
  /**
  * Record a tool call
  * Returns true if call is allowed, false if blocked (circuit breaker/loop)
  */
  recordToolCall(sessionId, call) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`SessionManager.recordToolCall: Session ${sessionId} not found`);
    }
    try {
      ToolCallSchema.parse(call);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`SessionManager.recordToolCall: Invalid tool call - ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`);
      }
      throw error;
    }
    if (session.loopDetection.dedupKeys.has(call.id)) {
      return false;
    }
    const breaker = this.getOrCreateCircuitBreaker(session, call.name);
    if (breaker.state === "open") {
      const cooldownExpired = Date.now() - breaker.lastFailure > breaker.cooldownMs;
      if (!cooldownExpired) {
        logger2.warn("Circuit breaker tripped", {
          sessionId,
          tool: call.name,
          state: breaker.state,
          failures: breaker.failures,
          cooldownRemaining: breaker.cooldownMs - (Date.now() - breaker.lastFailure)
        });
        return false;
      }
      breaker.state = "half-open";
      logger2.info("Circuit breaker half-open", {
        sessionId,
        tool: call.name,
        state: breaker.state
      });
    }
    const consecutive = (session.loopDetection.consecutiveSameTool.get(call.name) ?? 0) + 1;
    if (consecutive > this.limits.maxConsecutiveSameTool) {
      return false;
    }
    session.toolCalls.push(call);
    session.loopDetection.dedupKeys.add(call.id);
    session.loopDetection.consecutiveSameTool.set(call.name, consecutive);
    session.loopDetection.sequence.push(call.name);
    if (session.loopDetection.sequence.length > 5) {
      session.loopDetection.sequence.shift();
    }
    session.turnCount++;
    session.lastActivity = Date.now();
    if (call.result) {
      if (call.result.success) {
        breaker.failures = 0;
        if (breaker.state === "half-open") {
          breaker.state = "closed";
          logger2.info("Circuit breaker closed (recovered)", {
            sessionId,
            tool: call.name,
            state: breaker.state
          });
        }
      } else {
        breaker.failures++;
        breaker.lastFailure = Date.now();
        if (breaker.failures >= breaker.threshold) {
          breaker.state = "open";
          logger2.error("Circuit breaker opened", {
            sessionId,
            tool: call.name,
            state: breaker.state,
            failures: breaker.failures,
            threshold: breaker.threshold
          });
        }
      }
    }
    if (session.loopDetection.consecutiveSameTool.size > 10) {
      const toolNames = Array.from(session.loopDetection.consecutiveSameTool.keys());
      for (let i = 0; i < toolNames.length - 10; i++) {
        session.loopDetection.consecutiveSameTool.delete(toolNames[i]);
      }
    }
    this.updateRiskLevel(session);
    void this.autoSave();
    return true;
  }
  /**
  * Record a file modification
  */
  recordFileModification(sessionId, mod) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`SessionManager.recordFileModification: Session ${sessionId} not found`);
    }
    try {
      FileModificationSchema2.parse(mod);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`SessionManager.recordFileModification: Invalid modification - ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`);
      }
      throw error;
    }
    session.fileModifications.push(mod);
    const consecutiveCount = (session.consecutiveModifications.get(mod.path) ?? 0) + 1;
    session.consecutiveModifications.set(mod.path, consecutiveCount);
    session.lastActivity = Date.now();
    this.updateRiskLevel(session);
    void this.autoSave();
  }
  /**
  * Detect loops in session
  */
  detectLoop(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      return {
        detected: false,
        confidence: 0,
        evidence: [],
        action: "continue"
      };
    }
    return this.loopDetector.detect(session);
  }
  /**
  * Calculate and update session risk level
  */
  updateRiskLevel(session) {
    const reasons = [];
    let riskScore = 0;
    const toolCallRate = session.toolCalls.length / Math.max((Date.now() - session.startedAt) / 6e4, 1);
    if (toolCallRate > 10) {
      riskScore += 30;
      reasons.push(`High tool call rate: ${toolCallRate.toFixed(1)}/min`);
    } else if (toolCallRate > 5) {
      riskScore += 15;
      reasons.push(`Moderate tool call rate: ${toolCallRate.toFixed(1)}/min`);
    }
    const fileModCount = session.fileModifications.length;
    if (fileModCount > this.limits.maxFileModifications * 0.8) {
      riskScore += 20;
      reasons.push(`High file modification count: ${fileModCount}`);
    }
    for (const [file, count] of session.consecutiveModifications.entries()) {
      if (count > this.limits.maxConsecutiveSameFile * 0.8) {
        riskScore += 25;
        reasons.push(`File modified ${count} times: ${file}`);
      }
    }
    const loopResult = this.loopDetector.detect(session);
    if (loopResult.detected) {
      riskScore += 40;
      reasons.push(`Loop detected: ${loopResult.type}`);
    }
    const circuitBreakerTrips = Array.from(session.loopDetection.circuitBreakers.values()).filter((cb) => cb.state === "open").length;
    if (circuitBreakerTrips > 0) {
      riskScore += 20 * circuitBreakerTrips;
      reasons.push(`${circuitBreakerTrips} circuit breaker(s) tripped`);
    }
    riskScore = Math.min(Math.max(riskScore, 0), 100);
    let riskLevel;
    if (riskScore >= 80) {
      riskLevel = "critical";
    } else if (riskScore >= 50) {
      riskLevel = "high";
    } else if (riskScore >= 25) {
      riskLevel = "medium";
    } else {
      riskLevel = "low";
    }
    if (riskLevel !== session.riskLevel && riskLevel !== "low") {
      logger2.warn("Risk level escalated", {
        sessionId: session.sessionId,
        previousLevel: session.riskLevel,
        newLevel: riskLevel,
        riskScore,
        reasons
      });
    }
    session.riskLevel = riskLevel;
    session.riskReasons = reasons;
  }
  /**
  * Get session analytics
  */
  getAnalytics(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    const toolCounts = /* @__PURE__ */ new Map();
    for (const call of session.toolCalls) {
      toolCounts.set(call.name, (toolCounts.get(call.name) ?? 0) + 1);
    }
    const uniqueTools = Array.from(toolCounts.keys());
    const mostCalledTool = uniqueTools.length > 0 ? Array.from(toolCounts.entries()).reduce((max, [name, count]) => count > max.count ? {
      name,
      count
    } : max, {
      name: "",
      count: 0
    }) : null;
    const filesTouched = Array.from(new Set(session.fileModifications.map((m) => m.path)));
    const currentLoopResult = this.loopDetector.detect(session);
    const loopsDetected = currentLoopResult.detected ? 1 : 0;
    const circuitBreakerTrips = Array.from(session.loopDetection.circuitBreakers.values()).filter((cb) => cb.state === "open").length;
    const now = Date.now();
    const duration = now - session.startedAt;
    const timedOut = duration > this.limits.sessionTimeoutMs;
    const halted = session.riskLevel === "critical";
    let outcome;
    if (halted) {
      outcome = "halted";
    } else if (timedOut) {
      outcome = "timeout";
    } else {
      outcome = "completed";
    }
    return {
      sessionId: session.sessionId,
      duration,
      totalToolCalls: session.toolCalls.length,
      uniqueTools,
      mostCalledTool,
      filesTouched,
      peakRiskLevel: session.riskLevel,
      loopsDetected,
      circuitBreakerTrips,
      outcome
    };
  }
  /**
  * End a session and clean up
  */
  endSession(sessionId) {
    const analytics = this.getAnalytics(sessionId);
    this.sessions.delete(sessionId);
    return analytics;
  }
  /**
  * Get session state (for debugging)
  */
  getSessionState(sessionId) {
    return this.sessions.get(sessionId) ?? null;
  }
  /**
  * Get file modifications for a session
  * @param sessionId - Session to query
  * @param since - Optional timestamp filter (return modifications >= since)
  * @returns File modifications array (empty if session not found)
  */
  getFileModifications(sessionId, since) {
    const session = this.getSession(sessionId);
    if (!session) {
      return [];
    }
    if (since !== void 0 && since > 0) {
      return session.fileModifications.filter((m) => m.timestamp >= since);
    }
    return [
      ...session.fileModifications
    ];
  }
  /**
  * Prune stale sessions (older than timeout)
  */
  pruneStale() {
    const now = Date.now();
    let pruned = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.lastActivity;
      if (age > this.limits.sessionTimeoutMs) {
        this.sessions.delete(sessionId);
        pruned++;
      }
    }
    return pruned;
  }
  /**
  * Get or create circuit breaker for tool
  */
  getOrCreateCircuitBreaker(session, toolName) {
    let breaker = session.loopDetection.circuitBreakers.get(toolName);
    if (!breaker) {
      breaker = {
        tool: toolName,
        state: "closed",
        failures: 0,
        threshold: this.limits.circuitBreakerThreshold,
        lastFailure: 0,
        cooldownMs: this.limits.circuitBreakerCooldownMs
      };
      session.loopDetection.circuitBreakers.set(toolName, breaker);
    }
    return breaker;
  }
  /**
  * Get session (null-safe)
  */
  getSession(sessionId) {
    return this.sessions.get(sessionId) ?? null;
  }
  /**
  * Get active session count
  */
  getActiveSessionCount() {
    return this.sessions.size;
  }
  // =========================================================================
  // PERSISTENCE (JSONL + Atomic Writes)
  // =========================================================================
  /**
  * Save all sessions to disk (atomic writes)
  * Based on web research best practices (GitHub jsonl-db, Claude Skills)
  */
  async saveSessions() {
    if (!this.persistencePath) {
      logger2.warn("saveSessions called but no persistencePath configured");
      return;
    }
    try {
      const dir = dirname(this.persistencePath);
      if (!existsSync(dir)) {
        await mkdir(dir, {
          recursive: true
        });
      }
      const serializable = Array.from(this.sessions.entries()).map(([_id, session]) => ({
        ...session,
        consecutiveModifications: Object.fromEntries(session.consecutiveModifications),
        loopDetection: {
          sequence: session.loopDetection.sequence,
          dedupKeys: Array.from(session.loopDetection.dedupKeys),
          consecutiveSameTool: Object.fromEntries(session.loopDetection.consecutiveSameTool),
          semanticCache: Object.fromEntries(session.loopDetection.semanticCache),
          circuitBreakers: Object.fromEntries(session.loopDetection.circuitBreakers)
        }
      }));
      const jsonl = serializable.map((s) => JSON.stringify(s)).join("\n");
      await writeFile(this.persistencePath, jsonl);
      logger2.debug("Sessions saved", {
        count: this.sessions.size,
        path: this.persistencePath
      });
    } catch (error) {
      logger2.error("Failed to save sessions", {
        error: error instanceof Error ? error.message : String(error),
        path: this.persistencePath
      });
      throw error;
    }
  }
  /**
  * Load sessions from disk
  */
  async loadSessions() {
    if (!this.persistencePath) {
      return;
    }
    if (!existsSync(this.persistencePath)) {
      logger2.debug("No sessions file found, starting fresh", {
        path: this.persistencePath
      });
      return;
    }
    try {
      const content = await readFile$1(this.persistencePath, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      let loaded = 0;
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const session = {
            ...data,
            consecutiveModifications: new Map(Object.entries(data.consecutiveModifications || {})),
            loopDetection: {
              sequence: data.loopDetection.sequence || [],
              dedupKeys: new Set(data.loopDetection.dedupKeys || []),
              consecutiveSameTool: new Map(Object.entries(data.loopDetection.consecutiveSameTool || {})),
              semanticCache: new Map(Object.entries(data.loopDetection.semanticCache || {})),
              circuitBreakers: new Map(Object.entries(data.loopDetection.circuitBreakers || {}))
            }
          };
          this.sessions.set(session.sessionId, session);
          loaded++;
        } catch (error) {
          logger2.warn("Failed to parse session line, skipping", {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      logger2.info("Sessions loaded", {
        count: loaded,
        path: this.persistencePath
      });
    } catch (error) {
      logger2.error("Failed to load sessions", {
        error: error instanceof Error ? error.message : String(error),
        path: this.persistencePath
      });
      throw error;
    }
  }
  /**
  * Auto-save session after modifications (if enabled)
  */
  async autoSave() {
    if (this.autosaveEnabled && this.persistencePath) {
      await this.saveSessions().catch((error) => {
        logger2.error("Autosave failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }
  }
};
var ConfigStore = class {
  static {
    __name(this, "ConfigStore");
  }
  static {
    __name2(this, "ConfigStore");
  }
  config;
  cache = {};
  constructor(config) {
    this.config = config;
  }
  /**
  * Get the root directory for intelligence data
  */
  get rootDir() {
    return this.config.rootDir;
  }
  /**
  * Resolve a path relative to rootDir
  */
  resolvePath(relativePath) {
    return path3.join(this.config.rootDir, relativePath);
  }
  /**
  * Load architecture documentation
  */
  loadArchitecture() {
    if (this.cache.architecture) {
      return this.cache.architecture;
    }
    const archPath = this.resolvePath("ARCHITECTURE.md");
    if (fs.existsSync(archPath)) {
      this.cache.architecture = fs.readFileSync(archPath, "utf-8");
    } else {
      this.cache.architecture = "";
    }
    return this.cache.architecture;
  }
  /**
  * Load constraints/rules
  */
  loadConstraints() {
    if (this.cache.constraints) {
      return this.cache.constraints;
    }
    const constraintsPath = this.resolvePath(this.config.constraintsFile);
    if (fs.existsSync(constraintsPath)) {
      this.cache.constraints = fs.readFileSync(constraintsPath, "utf-8");
    } else {
      this.cache.constraints = "";
    }
    return this.cache.constraints;
  }
  /**
  * Load codebase patterns
  */
  loadPatterns() {
    if (this.cache.patterns) {
      return this.cache.patterns;
    }
    const patternsPath = this.resolvePath(path3.join(this.config.patternsDir, "codebase-patterns.md"));
    if (fs.existsSync(patternsPath)) {
      this.cache.patterns = fs.readFileSync(patternsPath, "utf-8");
    } else {
      this.cache.patterns = "";
    }
    return this.cache.patterns;
  }
  /**
  * Load any context file by name
  */
  loadContextFile(filename) {
    const filePath = this.resolvePath(filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
    return "";
  }
  /**
  * Get static context suitable for prompt caching
  * Content changes rarely - cache for 5+ minutes
  */
  getStaticContext() {
    return {
      architecture: this.loadArchitecture(),
      constraints: this.loadConstraints(),
      patterns: this.loadPatterns(),
      timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
  * Clear the cache (for testing or after file changes)
  */
  clearCache() {
    this.cache = {};
  }
  /**
  * Check if a context file exists
  */
  contextFileExists(filename) {
    return fs.existsSync(this.resolvePath(filename));
  }
  /**
  * List all context files that exist
  */
  listAvailableContextFiles() {
    return this.config.contextFiles.filter((f) => this.contextFileExists(f));
  }
};
var IntelligenceConfigSchema = z.object({
  /**
  * Root directory for all intelligence data
  * Internal: 'ai_dev_utils'
  * Product: workspace root or .snapback/
  */
  rootDir: z.string(),
  /**
  * Directory containing pattern definitions
  * @default 'patterns'
  */
  patternsDir: z.string().optional().default("patterns"),
  /**
  * Directory for learnings and feedback
  * @default 'feedback'
  */
  learningsDir: z.string().optional().default("feedback"),
  /**
  * File containing constraints/rules
  * @default 'CONSTRAINTS.md'
  */
  constraintsFile: z.string().optional().default("CONSTRAINTS.md"),
  /**
  * JSONL file for violation tracking
  * @default 'violations.jsonl'
  */
  violationsFile: z.string().optional().default("patterns/violations.jsonl"),
  /**
  * SQLite database for embeddings
  * @default 'embeddings.db'
  */
  embeddingsDb: z.string().optional().default("embeddings.db"),
  /**
  * Files to index for semantic search
  */
  contextFiles: z.array(z.string()).optional().default([
    "ARCHITECTURE.md",
    "CONSTRAINTS.md",
    "ROUTER.md",
    "patterns/codebase-patterns.md"
  ]),
  /**
  * Enable semantic search with embeddings
  * Requires @huggingface/transformers
  * @default false
  */
  enableSemanticSearch: z.boolean().optional().default(false),
  /**
  * Enable enhanced validation layers (Biome + TypeScript compiler + dynamic confidence)
  * Requires pnpm build to have completed successfully
  * @default false
  */
  enhancedValidation: z.boolean().optional().default(false),
  /**
  * Enable learning loop (violation tracking, feedback)
  * @default true
  */
  enableLearningLoop: z.boolean().optional().default(true),
  /**
  * Auto-promote patterns at 3x violations
  * @default true
  */
  enableAutoPromotion: z.boolean().optional().default(true),
  /**
  * Session limits configuration (Phase 1)
  */
  sessionLimits: z.object({
    maxToolCalls: z.number().optional(),
    maxConsecutiveSameTool: z.number().optional(),
    maxFileModifications: z.number().optional(),
    maxConsecutiveSameFile: z.number().optional(),
    sessionTimeoutMs: z.number().optional(),
    maxTurns: z.number().optional(),
    circuitBreakerThreshold: z.number().optional(),
    circuitBreakerCooldownMs: z.number().optional()
  }).optional(),
  /**
  * Session persistence configuration
  * Enables cross-surface session sharing (Extension, MCP, CLI)
  */
  sessionPersistence: z.object({
    /**
    * Path for session persistence (JSONL format)
    * @default '.snapback/session/sessions.jsonl'
    */
    path: z.string().optional(),
    /**
    * Enable autosave on session changes
    * @default true
    */
    autosave: z.boolean().optional().default(true)
  }).optional(),
  /**
  * Advisory system configuration (Phase 2)
  */
  advisoryConfig: z.object({
    enabled: z.boolean().optional(),
    maxWarnings: z.number().optional(),
    maxSuggestions: z.number().optional(),
    maxRelatedFiles: z.number().optional(),
    includeSessionContext: z.boolean().optional(),
    includeFileHistory: z.boolean().optional()
  }).optional()
});
var CONFIDENCE_THRESHOLDS = {
  AUTO_MERGE: 0.95,
  QUICK_REVIEW: 0.7,
  FULL_REVIEW: 0.5
};
var ISSUE_THRESHOLDS = {
  QUICK_REVIEW: 2,
  FULL_REVIEW: 5
};
var DEFAULT_WEIGHTS = {
  // Core code quality
  syntax: {
    critical: 0.25,
    warning: 0.05,
    info: 0.01
  },
  types: {
    critical: 0.2,
    warning: 0.03,
    info: 0.01
  },
  "typescript-compiler": {
    critical: 0.2,
    warning: 0.03,
    info: 0.01
  },
  // Security is paramount
  security: {
    critical: 0.3,
    warning: 0.1,
    info: 0.02
  },
  // Architecture matters for maintainability
  architecture: {
    critical: 0.15,
    warning: 0.05,
    info: 0.01
  },
  // Test issues are less critical to production
  tests: {
    critical: 0.05,
    warning: 0.02,
    info: 5e-3
  },
  // Dependencies and performance are informational
  dependencies: {
    critical: 0.03,
    warning: 0.01,
    info: 5e-3
  },
  performance: {
    critical: 0.02,
    warning: 0.01,
    info: 5e-3
  },
  // Biome catches style/lint issues - moderate weight
  biome: {
    critical: 0.1,
    warning: 0.03,
    info: 0.01
  }
};
var UNKNOWN_LAYER_WEIGHT = {
  critical: 0.05,
  warning: 0.02,
  info: 0.01
};
var DynamicConfidenceCalculator = class {
  static {
    __name(this, "DynamicConfidenceCalculator");
  }
  static {
    __name2(this, "DynamicConfidenceCalculator");
  }
  weights;
  constructor(customWeights) {
    this.weights = {
      ...DEFAULT_WEIGHTS,
      ...customWeights
    };
  }
  /**
  * Calculate confidence score from validation results
  *
  * @param layers - Validation results from each layer
  * @returns Confidence score between 0.10 and 0.95
  */
  calculate(layers) {
    if (layers.length === 0) {
      return 0.95;
    }
    let totalPenalty = 0;
    for (const layer of layers) {
      const layerWeight = this.weights[layer.layer] || UNKNOWN_LAYER_WEIGHT;
      for (const issue of layer.issues) {
        const severityWeight = this.getSeverityWeight(layerWeight, issue.severity);
        totalPenalty += severityWeight;
      }
    }
    const rawConfidence = 1 - totalPenalty;
    return Math.max(0.1, Math.min(0.95, rawConfidence));
  }
  /**
  * Get weight for a severity level in a layer
  */
  getSeverityWeight(layerWeight, severity) {
    switch (severity) {
      case "critical":
        return layerWeight.critical;
      case "warning":
        return layerWeight.warning;
      case "info":
        return layerWeight.info;
      default:
        return layerWeight.info;
    }
  }
  /**
  * Get weight for a specific layer
  */
  getLayerWeight(layerName) {
    return this.weights[layerName] || UNKNOWN_LAYER_WEIGHT;
  }
  /**
  * Update weights for a layer
  */
  setLayerWeight(layerName, weight) {
    this.weights[layerName] = weight;
  }
  /**
  * Get all configured weights
  */
  getWeights() {
    return {
      ...this.weights
    };
  }
};
new DynamicConfidenceCalculator();
var SECRET_PATTERNS = [
  {
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: "critical"
  },
  {
    name: "AWS Secret Key",
    pattern: /aws_secret_access_key\s*=\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    severity: "critical"
  },
  {
    name: "GitHub Token",
    pattern: /gh[ps]_[a-zA-Z0-9]{36}/g,
    severity: "critical"
  },
  {
    name: "Stripe API Key",
    pattern: /sk_(?:live|test)_[a-zA-Z0-9]{24}/g,
    severity: "critical"
  },
  {
    name: "Generic API Key",
    pattern: /["']?api[_-]?key["']?\s*[=:]\s*["']([a-zA-Z0-9_-]{20,})["']/gi,
    severity: "high"
  },
  {
    name: "Private Key Header",
    pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    severity: "critical"
  },
  {
    name: "Bearer Token",
    pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
    severity: "high"
  },
  {
    name: "Password Assignment",
    pattern: /password\s*[=:]\s*["']([^"']{8,})["']/gi,
    severity: "medium"
  },
  {
    name: "OAuth Token",
    pattern: /oauth[_-]?token\s*[=:]\s*["']([a-zA-Z0-9_-]{20,})["']/gi,
    severity: "high"
  }
];
var SecretDetector = class {
  static {
    __name(this, "SecretDetector");
  }
  static {
    __name2(this, "SecretDetector");
  }
  /**
  * Detect secrets in file content
  */
  detect(content, filePath) {
    const findings = [];
    if (this.isTestFile(filePath)) {
      return {
        findings: [],
        riskScore: 0
      };
    }
    const lines = content.split("\n");
    const cleanedLines = this.removeMultiLineComments(lines);
    for (const pattern of SECRET_PATTERNS) {
      for (let lineNum = 0; lineNum < cleanedLines.length; lineNum++) {
        const line = cleanedLines[lineNum];
        const originalLine = lines[lineNum];
        const matches2 = line.matchAll(pattern.pattern);
        for (const match of matches2) {
          if (this.isInSingleLineComment(originalLine, match.index || 0)) {
            continue;
          }
          const snippet = match[0].substring(0, 50);
          const entropy = this.calculateEntropy(match[1] || match[0]);
          findings.push({
            type: pattern.name,
            line: lineNum + 1,
            column: (match.index || 0) + 1,
            snippet,
            severity: pattern.severity,
            entropy,
            ruleId: `secret-detection/${pattern.name.toLowerCase().replace(/\s+/g, "-")}`
          });
        }
      }
    }
    this.detectHighEntropyStrings(cleanedLines, lines, findings);
    const riskScore = this.calculateRiskScore(findings);
    return {
      findings,
      riskScore
    };
  }
  /**
  * Calculate Shannon entropy of a string
  */
  calculateEntropy(str) {
    if (str.length === 0) {
      return 0;
    }
    const freq = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    let entropy = 0;
    const len = str.length;
    for (const char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }
  /**
  * Detect high-entropy strings that might be secrets
  */
  detectHighEntropyStrings(cleanedLines, _originalLines, findings) {
    const stringPattern = /["']([a-zA-Z0-9+/=_-]{20,})["']/g;
    for (let lineNum = 0; lineNum < cleanedLines.length; lineNum++) {
      const line = cleanedLines[lineNum];
      const matches2 = line.matchAll(stringPattern);
      for (const match of matches2) {
        const str = match[1];
        const entropy = this.calculateEntropy(str);
        if (entropy > 4.5 && str.length >= 20) {
          findings.push({
            type: "High-Entropy String",
            line: lineNum + 1,
            column: (match.index || 0) + 1,
            snippet: str.substring(0, 50),
            severity: "medium",
            entropy,
            ruleId: "secret-detection/high-entropy-string"
          });
        }
      }
    }
  }
  /**
  * Check if file is a test file
  */
  isTestFile(filePath) {
    const testPatterns = [
      /\.test\.[jt]sx?$/,
      /\.spec\.[jt]sx?$/,
      /__tests__\//,
      /\/test\//,
      /\/tests\//,
      /\.fixture\.[jt]sx?$/
    ];
    return testPatterns.some((pattern) => pattern.test(filePath));
  }
  /**
  * Remove multi-line comments from lines
  */
  removeMultiLineComments(lines) {
    const result = [];
    let inComment = false;
    for (const line of lines) {
      let cleanedLine = line;
      if (inComment) {
        const endIndex = line.indexOf("*/");
        if (endIndex !== -1) {
          cleanedLine = line.substring(endIndex + 2);
          inComment = false;
        } else {
          cleanedLine = "";
        }
      }
      const startIndex = cleanedLine.indexOf("/*");
      if (startIndex !== -1) {
        const endIndex = cleanedLine.indexOf("*/", startIndex);
        if (endIndex !== -1) {
          cleanedLine = cleanedLine.substring(0, startIndex) + cleanedLine.substring(endIndex + 2);
        } else {
          cleanedLine = cleanedLine.substring(0, startIndex);
          inComment = true;
        }
      }
      result.push(cleanedLine);
    }
    return result;
  }
  /**
  * Check if position is in a single-line comment
  */
  isInSingleLineComment(line, position) {
    const beforePosition = line.substring(0, position);
    if (beforePosition.includes("//")) {
      return true;
    }
    return false;
  }
  /**
  * Calculate overall risk score (0-10)
  */
  calculateRiskScore(findings) {
    if (findings.length === 0) {
      return 0;
    }
    const severityWeights = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 2
    };
    let totalScore = 0;
    for (const finding of findings) {
      totalScore += severityWeights[finding.severity];
      if (finding.entropy && finding.entropy > 5) {
        totalScore += 1;
      }
    }
    return Math.min(10, totalScore);
  }
};
var BiomeLayer = class {
  static {
    __name(this, "BiomeLayer");
  }
  static {
    __name2(this, "BiomeLayer");
  }
  workspaceRoot;
  name = "biome";
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }
  async validate(code, filePath) {
    const issues = [];
    if (!code || code.trim() === "") {
      return {
        issues
      };
    }
    try {
      const result = await this.runBiome(code, filePath);
      return {
        issues: result
      };
    } catch {
      return {
        issues
      };
    }
  }
  /**
  * Run Biome on the provided code
  */
  async runBiome(code, filePath) {
    const tempDir = await mkdtemp(join(tmpdir(), "biome-validation-"));
    const tempFile = join(tempDir, filePath.replace(/^.*[\\/]/, ""));
    try {
      await writeFile$1(tempFile, code, "utf8");
      const result = await this.execBiome(tempFile);
      return this.parseBiomeOutput(result, code);
    } finally {
      await rm(tempDir, {
        recursive: true,
        force: true
      }).catch(() => {
      });
    }
  }
  /**
  * Execute biome check command
  */
  execBiome(filePath) {
    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      const proc = spawn("npx", [
        "biome",
        "check",
        "--reporter=json",
        filePath
      ], {
        cwd: this.workspaceRoot,
        shell: true,
        stdio: [
          "pipe",
          "pipe",
          "pipe"
        ]
      });
      const timeout = setTimeout(() => {
        proc.kill("SIGTERM");
        reject(new Error("Biome check timed out"));
      }, 15e3);
      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });
      proc.on("close", (_code) => {
        clearTimeout(timeout);
        resolve(stdout || stderr);
      });
      proc.on("error", (err2) => {
        clearTimeout(timeout);
        reject(err2);
      });
    });
  }
  /**
  * Parse Biome JSON output into Issue array
  */
  parseBiomeOutput(output, code) {
    const issues = [];
    if (!output) {
      return issues;
    }
    try {
      const parsed = JSON.parse(output);
      if (parsed.diagnostics && Array.isArray(parsed.diagnostics)) {
        for (const diag of parsed.diagnostics) {
          issues.push(this.diagnosticToIssue(diag, code));
        }
      }
    } catch {
      const lines = output.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        if (line.includes("error") || line.includes("warning")) {
          issues.push({
            severity: line.includes("error") ? "critical" : "warning",
            type: "BIOME_ISSUE",
            message: line.trim().slice(0, 200)
          });
        }
      }
    }
    return issues;
  }
  /**
  * Convert Biome diagnostic to Issue format
  */
  diagnosticToIssue(diag, code) {
    const severity = this.mapSeverity(diag.severity);
    const type = diag.category || "BIOME_ISSUE";
    const message = diag.message || diag.description || "Unknown issue";
    let line;
    if (diag.location?.span?.start !== void 0) {
      const offset = diag.location.span.start;
      const beforeOffset = code.slice(0, offset);
      line = (beforeOffset.match(/\n/g) || []).length + 1;
    }
    return {
      severity,
      type: this.normalizeType(type),
      message: message.slice(0, 300),
      line,
      fix: this.getSuggestedFix(type)
    };
  }
  /**
  * Map Biome severity to Issue severity
  */
  mapSeverity(severity) {
    switch (severity?.toLowerCase()) {
      case "error":
        return "critical";
      case "warning":
        return "warning";
      default:
        return "info";
    }
  }
  /**
  * Normalize Biome rule name to type
  */
  normalizeType(category) {
    const parts = category.split("/");
    return parts[parts.length - 1] || category;
  }
  /**
  * Get suggested fix for common issues
  */
  getSuggestedFix(type) {
    const fixes = {
      noUnusedImports: "Remove the unused import",
      noUnusedVariables: "Remove or use the variable",
      noNonNullAssertion: "Use proper null check instead of !",
      noExplicitAny: "Use a specific type instead of any",
      useBlockStatements: "Add braces around the statement",
      noConsole: "Use a logger instead of console"
    };
    return fixes[type];
  }
};
var TypeScriptCompilerLayer = class {
  static {
    __name(this, "TypeScriptCompilerLayer");
  }
  static {
    __name2(this, "TypeScriptCompilerLayer");
  }
  workspaceRoot;
  name = "typescript-compiler";
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }
  async validate(code, filePath) {
    if (!code || code.trim() === "") {
      return {
        issues: []
      };
    }
    try {
      const result = await this.runTsc(code, filePath);
      return {
        issues: result
      };
    } catch {
      return {
        issues: []
      };
    }
  }
  /**
  * Run TypeScript compiler on the provided code
  */
  async runTsc(code, filePath) {
    const tempDir = await mkdtemp(join(tmpdir(), "tsc-validation-"));
    const fileName = filePath.replace(/^.*[\\/]/, "") || "temp.ts";
    const tempFile = join(tempDir, fileName);
    try {
      await writeFile$1(tempFile, code, "utf8");
      const result = await this.execTsc(tempFile);
      return this.parseTscOutput(result, code);
    } finally {
      await rm(tempDir, {
        recursive: true,
        force: true
      }).catch(() => {
      });
    }
  }
  /**
  * Execute tsc command
  */
  execTsc(filePath) {
    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      const proc = spawn("npx", [
        "tsc",
        "--noEmit",
        "--pretty",
        "false",
        "--skipLibCheck",
        filePath
      ], {
        cwd: this.workspaceRoot,
        shell: true,
        stdio: [
          "pipe",
          "pipe",
          "pipe"
        ]
      });
      const timeout = setTimeout(() => {
        proc.kill("SIGTERM");
        reject(new Error("TypeScript check timed out"));
      }, 15e3);
      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });
      proc.on("close", (_code) => {
        clearTimeout(timeout);
        resolve(stdout + stderr);
      });
      proc.on("error", (err2) => {
        clearTimeout(timeout);
        reject(err2);
      });
    });
  }
  /**
  * Parse tsc output into Issue array
  */
  parseTscOutput(output, _code) {
    const issues = [];
    if (!output) {
      return issues;
    }
    const lines = output.split("\n");
    for (const line of lines) {
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/);
      if (match) {
        const [, , lineNum, , severity, tsCode, message] = match;
        issues.push({
          severity: severity === "error" ? "critical" : "warning",
          type: tsCode,
          message: message.trim(),
          line: Number.parseInt(lineNum, 10),
          fix: this.getSuggestedFix(tsCode)
        });
      } else if (line.includes("error TS")) {
        const codeMatch = line.match(/TS(\d+)/);
        issues.push({
          severity: "critical",
          type: codeMatch ? `TS${codeMatch[1]}` : "TS_ERROR",
          message: line.trim().slice(0, 200)
        });
      }
    }
    return issues;
  }
  /**
  * Get suggested fix for common TypeScript errors
  */
  getSuggestedFix(tsCode) {
    const fixes = {
      TS2322: "Check type compatibility between the assigned value and variable type",
      TS2339: "Property does not exist - add it to the type or interface",
      TS2345: "Argument type mismatch - ensure function is called with correct types",
      TS2304: "Cannot find name - check import or variable declaration",
      TS2531: "Object is possibly null - add null check",
      TS2532: "Object is possibly undefined - add undefined check",
      TS7006: "Parameter implicitly has any type - add type annotation",
      TS2307: "Cannot find module - check import path or install package",
      TS2341: "Property is private - use public accessor or friend pattern",
      TS2551: "Property does not exist - did you mean a similar property?",
      TS2769: "No overload matches this call - check function signature"
    };
    return fixes[tsCode];
  }
};
function findLine2(code, search) {
  if (!code) {
    return 0;
  }
  const lines = code.split("\n");
  return lines.findIndex((l) => l.includes(search)) + 1;
}
__name(findLine2, "findLine2");
__name2(findLine2, "findLine");
function isTestFile3(filePath) {
  if (!filePath) {
    return false;
  }
  return filePath.includes(".test.") || filePath.includes(".spec.") || filePath.includes("__tests__") || filePath.includes("/test/") || filePath.includes("/tests/");
}
__name(isTestFile3, "isTestFile3");
__name2(isTestFile3, "isTestFile");
var SyntaxLayer = class {
  static {
    __name(this, "SyntaxLayer");
  }
  static {
    __name2(this, "SyntaxLayer");
  }
  name = "syntax";
  async validate(code, _filePath) {
    const issues = [];
    if (!code) {
      return {
        issues
      };
    }
    const openBrackets = (code.match(/\{/g) || []).length;
    const closeBrackets = (code.match(/\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
      issues.push({
        severity: "critical",
        type: "SYNTAX_ERROR",
        message: `Mismatched braces: ${openBrackets} open, ${closeBrackets} close`,
        fix: "Balance opening and closing braces"
      });
    }
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push({
        severity: "critical",
        type: "SYNTAX_ERROR",
        message: `Mismatched parentheses: ${openParens} open, ${closeParens} close`,
        fix: "Balance opening and closing parentheses"
      });
    }
    if (code.includes(";;")) {
      issues.push({
        severity: "warning",
        type: "SYNTAX_WARNING",
        message: "Double semicolon detected",
        line: findLine2(code, ";;"),
        fix: "Remove extra semicolon"
      });
    }
    return {
      issues
    };
  }
};
var TypeLayer = class {
  static {
    __name(this, "TypeLayer");
  }
  static {
    __name2(this, "TypeLayer");
  }
  name = "types";
  async validate(code, _filePath) {
    const issues = [];
    if (!code) {
      return {
        issues
      };
    }
    const anyMatches = code.match(/:\s*any\b/g) || [];
    if (anyMatches.length > 0) {
      issues.push({
        severity: "warning",
        type: "TYPE_SAFETY_BYPASS",
        message: `Found ${anyMatches.length} uses of 'any' type`,
        fix: "Use specific types or generics instead of 'any'"
      });
    }
    if (code.includes("@ts-ignore") && !code.includes("@ts-ignore -")) {
      issues.push({
        severity: "warning",
        type: "TS_IGNORE_NO_REASON",
        message: "@ts-ignore used without explanation",
        line: findLine2(code, "@ts-ignore"),
        fix: "Add reason: // @ts-ignore - <reason>"
      });
    }
    const nonNullMatches = code.match(/\w+!/g) || [];
    if (nonNullMatches.length > 3) {
      issues.push({
        severity: "info",
        type: "EXCESSIVE_NON_NULL",
        message: `Found ${nonNullMatches.length} non-null assertions (!)`,
        fix: "Consider proper null checks instead"
      });
    }
    return {
      issues
    };
  }
};
var TestLayer = class {
  static {
    __name(this, "TestLayer");
  }
  static {
    __name2(this, "TestLayer");
  }
  name = "tests";
  async validate(code, filePath) {
    const issues = [];
    if (!code || !filePath) {
      return {
        issues
      };
    }
    if (!filePath.includes(".test.") && !filePath.includes("/test/")) {
      return {
        issues
      };
    }
    const vaguePatterns = [
      ".toBeTruthy()",
      ".toBeDefined()",
      ".toBeFalsy()"
    ];
    for (const pattern of vaguePatterns) {
      if (code.includes(pattern)) {
        issues.push({
          severity: "warning",
          type: "VAGUE_ASSERTION",
          message: `Found vague assertion: ${pattern}`,
          line: findLine2(code, pattern),
          fix: "Use specific assertions: .toEqual(), .toBe(), .toMatchObject()"
        });
      }
    }
    const hasHappyPath = code.includes("should") && (code.includes("success") || code.includes("correct"));
    const hasSadPath = code.includes("fail") || code.includes("error") || code.includes("invalid");
    const hasEdgeCase = code.includes("edge") || code.includes("empty") || code.includes("null");
    const hasErrorCase = code.includes("throw") || code.includes("reject");
    const paths = [
      hasHappyPath,
      hasSadPath,
      hasEdgeCase,
      hasErrorCase
    ].filter(Boolean).length;
    if (paths < 3) {
      issues.push({
        severity: "info",
        type: "INCOMPLETE_COVERAGE",
        message: `Only ${paths}/4 test paths covered (happy, sad, edge, error)`,
        fix: "Add tests for missing paths"
      });
    }
    return {
      issues
    };
  }
};
var ArchitectureLayer = class {
  static {
    __name(this, "ArchitectureLayer");
  }
  static {
    __name2(this, "ArchitectureLayer");
  }
  name = "architecture";
  async validate(code, filePath) {
    const issues = [];
    if (!code || !filePath) {
      return {
        issues
      };
    }
    if ((filePath.includes("apps/vscode/") || filePath.includes("apps/web/") || filePath.includes("apps/cli/")) && code.includes("@snapback/infrastructure")) {
      issues.push({
        severity: "critical",
        type: "LAYER_BOUNDARY_VIOLATION",
        message: "Presentation layer cannot import @snapback/infrastructure",
        line: findLine2(code, "@snapback/infrastructure"),
        fix: "Use @snapback/core instead"
      });
    }
    if (filePath.includes("procedures/") && (code.includes("db.query") || code.includes("db.select"))) {
      issues.push({
        severity: "critical",
        type: "SERVICE_BYPASS",
        message: "Direct database access in procedure file",
        line: findLine2(code, "db."),
        fix: "Move business logic to apps/api/src/services/"
      });
    }
    if (code.includes("from '../../../packages/.js") || code.includes("from '../../packages/.js")) {
      issues.push({
        severity: "warning",
        type: "WRONG_IMPORT_PATTERN",
        message: "Relative imports across package boundaries",
        line: findLine2(code, "../packages/"),
        fix: "Use @snapback/* package imports"
      });
    }
    return {
      issues
    };
  }
};
var SecurityLayer = class _SecurityLayer {
  static {
    __name(this, "_SecurityLayer");
  }
  static {
    __name2(this, "SecurityLayer");
  }
  name = "security";
  secretDetector = new SecretDetector();
  // Additional secret patterns not in SecretDetector
  static ADDITIONAL_SECRET_PATTERNS = [
    // GitHub Fine-Grained Token (github_pat_) - format: github_pat_{chars}_{rest}
    {
      name: "GitHub Fine-Grained Token",
      pattern: /github_pat_[A-Za-z0-9]+_[A-Za-z0-9_]{20,}/g,
      severity: "critical"
    },
    // JWT tokens
    {
      name: "JWT Token",
      pattern: /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*/g,
      severity: "critical"
    },
    // Database connection strings
    {
      name: "PostgreSQL Connection String",
      pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^/]+/gi,
      severity: "critical"
    },
    {
      name: "MongoDB Connection String",
      pattern: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^/]+/gi,
      severity: "critical"
    },
    // EC Private Key (in addition to RSA)
    {
      name: "EC Private Key",
      pattern: /-----BEGIN EC PRIVATE KEY-----/g,
      severity: "critical"
    },
    // Stripe restricted key
    {
      name: "Stripe Restricted Key",
      pattern: /rk_(?:live|test)_[a-zA-Z0-9]{24}/g,
      severity: "critical"
    }
  ];
  // Unsafe function patterns
  static UNSAFE_FUNCTION_PATTERNS = [
    {
      pattern: /child_process\.exec\s*\(/,
      type: "COMMAND_INJECTION",
      severity: "critical",
      message: "child_process.exec() enables shell command injection",
      fix: "Use execFile() or spawn() with arguments array instead"
    },
    {
      pattern: /\bexec\s*\(\s*`/,
      type: "COMMAND_INJECTION",
      severity: "critical",
      message: "exec() with template literal enables command injection",
      fix: "Use execFile() with arguments array"
    },
    {
      pattern: /\.innerHTML\s*=/,
      type: "XSS_RISK",
      severity: "warning",
      message: "innerHTML assignment enables XSS attacks",
      fix: "Use textContent, createTextNode(), or sanitize with DOMPurify"
    },
    {
      pattern: /dangerouslySetInnerHTML/,
      type: "XSS_RISK",
      severity: "warning",
      message: "dangerouslySetInnerHTML is a React XSS vector",
      fix: "Sanitize content with DOMPurify before rendering"
    },
    {
      pattern: /spawn\s*\(\s*['"](?:sh|bash|cmd)['"]/,
      type: "SHELL_INJECTION",
      severity: "critical",
      message: "Shell spawning enables command injection",
      fix: "Use direct program spawn: spawn('program', [args])"
    },
    {
      pattern: /spawn\s*\([^)]+,\s*\[[^\]]*\]\s*,\s*\{[^}]*shell\s*:\s*true/,
      type: "SHELL_INJECTION",
      severity: "critical",
      message: "spawn with shell:true enables command injection",
      fix: "Remove shell:true option and use arguments array"
    }
  ];
  async validate(code, filePath) {
    const issues = [];
    if (!code) {
      return {
        issues
      };
    }
    this.checkSecrets(code, filePath, issues);
    this.checkUnsafeFunctions(code, filePath, issues);
    this.checkPrivacyViolations(code, issues);
    this.checkEvalUsage(code, issues);
    return {
      issues
    };
  }
  /**
  * Integrate SecretDetector + additional patterns
  */
  checkSecrets(code, filePath, issues) {
    const secretResult = this.secretDetector.detect(code, filePath);
    for (const finding of secretResult.findings) {
      issues.push(this.adaptSecretFinding(finding));
    }
    if (isTestFile3(filePath)) {
      return;
    }
    for (const pattern of _SecurityLayer.ADDITIONAL_SECRET_PATTERNS) {
      const matches2 = code.matchAll(pattern.pattern);
      for (const match of matches2) {
        issues.push({
          severity: pattern.severity,
          type: `SECRET_${pattern.name.toUpperCase().replace(/\s+/g, "_")}`,
          message: `${pattern.name} detected: ${match[0].substring(0, 20)}...`,
          line: this.findLineForMatch(code, match.index || 0),
          fix: "Use environment variables for secrets"
        });
      }
    }
  }
  /**
  * Check for unsafe function calls
  */
  checkUnsafeFunctions(code, _filePath, issues) {
    for (const unsafe of _SecurityLayer.UNSAFE_FUNCTION_PATTERNS) {
      if (unsafe.pattern.test(code)) {
        unsafe.pattern.lastIndex = 0;
        const match = unsafe.pattern.exec(code);
        issues.push({
          severity: unsafe.severity,
          type: unsafe.type,
          message: unsafe.message,
          line: match ? this.findLineForMatch(code, match.index) : void 0,
          fix: unsafe.fix
        });
      }
    }
  }
  /**
  * C-006: Privacy-First Telemetry
  */
  checkPrivacyViolations(code, issues) {
    if (code.includes("posthog") && (code.includes("fileContent") || code.includes("sourceCode"))) {
      issues.push({
        severity: "critical",
        type: "PRIVACY_VIOLATION",
        message: "File content must never be sent to external services",
        fix: "Only send metadata: file paths, timestamps, counts, hashes"
      });
    }
  }
  /**
  * Check for eval usage
  */
  checkEvalUsage(code, issues) {
    if (code.includes("eval(") || code.includes("new Function(")) {
      issues.push({
        severity: "critical",
        type: "UNSAFE_EVAL",
        message: "eval() or new Function() detected - security risk",
        line: findLine2(code, "eval(") || findLine2(code, "new Function("),
        fix: "Avoid eval - use safer alternatives"
      });
    }
  }
  /**
  * Convert SecretDetector finding to Issue format
  */
  adaptSecretFinding(finding) {
    return {
      severity: finding.severity === "critical" || finding.severity === "high" ? "critical" : "warning",
      type: `SECRET_${finding.type.toUpperCase().replace(/[\s-]+/g, "_")}`,
      message: `${finding.type}: ${finding.snippet}...`,
      line: finding.line,
      fix: "Use environment variables for secrets"
    };
  }
  /**
  * Find line number for a match index
  */
  findLineForMatch(code, index) {
    const beforeMatch = code.substring(0, index);
    return (beforeMatch.match(/\n/g) || []).length + 1;
  }
};
var DependencyLayer = class {
  static {
    __name(this, "DependencyLayer");
  }
  static {
    __name2(this, "DependencyLayer");
  }
  name = "dependencies";
  async validate(code, _filePath) {
    const issues = [];
    if (!code) {
      return {
        issues
      };
    }
    const deprecatedImports = [
      "moment",
      "request",
      "node-fetch@2"
    ];
    for (const pkg of deprecatedImports) {
      if (code.includes(`from "${pkg}"`) || code.includes(`from '${pkg}'`)) {
        issues.push({
          severity: "warning",
          type: "DEPRECATED_DEPENDENCY",
          message: `Deprecated package: ${pkg}`,
          line: findLine2(code, pkg),
          fix: "Use modern alternatives (dayjs, fetch, node-fetch@3)"
        });
      }
    }
    return {
      issues
    };
  }
};
var PerformanceLayer = class _PerformanceLayer {
  static {
    __name(this, "_PerformanceLayer");
  }
  static {
    __name2(this, "PerformanceLayer");
  }
  name = "performance";
  // ReDoS patterns - regex with nested quantifiers
  static REDOS_PATTERNS = [
    // (a+)+ pattern - catastrophic backtracking
    /\/[^/]*\([^)]*[+*]\)[^/]*[+*][^/]*\//,
    // Nested groups with quantifiers
    /\/[^/]*\(\?:[^)]*[+*]\)[^/]*[+*][^/]*\//,
    // Multiple adjacent quantifiers on groups
    /\/[^/]*\([^)]+\)[+*]{2,}[^/]*\//
  ];
  async validate(code, filePath) {
    const issues = [];
    if (!code || !filePath) {
      return {
        issues
      };
    }
    this.checkConsoleLog(code, filePath, issues);
    this.checkSyncFileIO(code, filePath, issues);
    this.checkAwaitInLoop(code, issues);
    this.checkNestedLoops(code, issues);
    this.checkMemoryLeaks(code, issues);
    this.checkReDoS(code, issues);
    this.checkSpawnShellOption(code, issues);
    return {
      issues
    };
  }
  /**
  * C-007: Console.log in Production
  */
  checkConsoleLog(code, filePath, issues) {
    if (!filePath.includes(".test.") && !filePath.includes("/test/") && !filePath.includes("scripts/") && code.includes("console.log")) {
      issues.push({
        severity: "warning",
        type: "NO_CONSOLE",
        message: "console.log in production code",
        line: findLine2(code, "console.log"),
        fix: "Use logger from @snapback/core"
      });
    }
  }
  /**
  * Check for synchronous file operations
  */
  checkSyncFileIO(code, filePath, issues) {
    if (code.includes("fs.readFileSync") || code.includes("fs.writeFileSync")) {
      if (!filePath.includes("scripts/") && !filePath.includes(".test.")) {
        issues.push({
          severity: "info",
          type: "SYNC_FILE_IO",
          message: "Synchronous file operation may block event loop",
          line: findLine2(code, "Sync("),
          fix: "Use async file operations or defer to background"
        });
      }
    }
  }
  /**
  * Check for await in loops (potential N+1)
  */
  checkAwaitInLoop(code, issues) {
    if (code.includes("for") && code.includes("await ")) {
      const forAwaitPattern = /for\s*\([^)]+\)\s*\{[^}]*await\s+/s;
      if (forAwaitPattern.test(code)) {
        issues.push({
          severity: "info",
          type: "AWAIT_IN_LOOP",
          message: "Await in loop may cause N+1 performance issue",
          fix: "Consider Promise.all() for parallel execution"
        });
      }
    }
  }
  /**
  * Check for O(n²) nested loops
  */
  checkNestedLoops(code, issues) {
    const nestedForPattern = /for\s*\([^)]*\)\s*\{[^{}]*for\s*\([^)]*\)\s*\{/s;
    if (nestedForPattern.test(code)) {
      issues.push({
        severity: "warning",
        type: "O_N2_ALGORITHM",
        message: "Nested for loops detected - potential O(n\xB2) complexity",
        fix: "Consider using Map/Set for O(1) lookups or merge algorithm"
      });
    }
    const forWithForEachPattern = /for\s*\([^)]*\)\s*\{[^{}]*\.forEach\s*\(/s;
    if (forWithForEachPattern.test(code)) {
      issues.push({
        severity: "warning",
        type: "O_N2_ALGORITHM",
        message: "forEach inside for loop - potential O(n\xB2) complexity",
        fix: "Consider using Map/Set for O(1) lookups"
      });
    }
    const nestedForEachPattern = /\.forEach\s*\([^)]*\)\s*\{[^{}]*\.forEach\s*\(/s;
    if (nestedForEachPattern.test(code)) {
      issues.push({
        severity: "warning",
        type: "O_N2_ALGORITHM",
        message: "Nested forEach detected - potential O(n\xB2) complexity",
        fix: "Consider using Map/Set for O(1) lookups"
      });
    }
  }
  /**
  * Check for memory leaks - addEventListener without cleanup
  */
  checkMemoryLeaks(code, issues) {
    if (code.includes("addEventListener")) {
      if (!code.includes("removeEventListener")) {
        issues.push({
          severity: "warning",
          type: "MEMORY_LEAK",
          message: "addEventListener without corresponding removeEventListener - potential memory leak",
          line: findLine2(code, "addEventListener"),
          fix: "Add cleanup: useEffect(() => { ...; return () => element.removeEventListener(...) })"
        });
      }
    }
  }
  /**
  * Check for ReDoS vulnerabilities
  */
  checkReDoS(code, issues) {
    for (const pattern of _PerformanceLayer.REDOS_PATTERNS) {
      if (pattern.test(code)) {
        issues.push({
          severity: "critical",
          type: "REDOS",
          message: "Regex with nested quantifiers - ReDoS vulnerability (catastrophic backtracking)",
          fix: "Simplify regex or use safe-regex library to validate patterns"
        });
        break;
      }
    }
  }
  /**
  * Check for spawn with shell option
  */
  checkSpawnShellOption(code, issues) {
    const spawnShellPattern = /spawn\s*\([^)]+,\s*\[[^\]]*\]\s*,\s*\{[^}]*shell\s*:\s*true/;
    if (spawnShellPattern.test(code)) {
      issues.push({
        severity: "warning",
        type: "SPAWN_SHELL",
        message: "spawn with shell:true may cause performance issues and security risks",
        line: findLine2(code, "shell: true"),
        fix: "Remove shell:true and use arguments array directly"
      });
    }
  }
};
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
var ValidationError = class extends Error {
  static {
    __name(this, "ValidationError");
  }
  static {
    __name2(this, "ValidationError");
  }
  code;
  layer;
  issues;
  constructor(message, code, layer, issues) {
    super(message), this.code = code, this.layer = layer, this.issues = issues;
    this.name = "ValidationError";
  }
};
var CriticalValidationError = class extends ValidationError {
  static {
    __name(this, "CriticalValidationError");
  }
  static {
    __name2(this, "CriticalValidationError");
  }
  criticalIssues;
  constructor(message, criticalIssues) {
    super(message, "CRITICAL_ISSUES", void 0, criticalIssues), this.criticalIssues = criticalIssues;
    this.name = "CriticalValidationError";
  }
};
var ValidationPipeline = class _ValidationPipeline {
  static {
    __name(this, "_ValidationPipeline");
  }
  static {
    __name2(this, "ValidationPipeline");
  }
  layers = [];
  confidenceCalculator = null;
  useDynamicConfidence;
  constructor(options) {
    const opts = Array.isArray(options) ? {
      customLayers: options
    } : options || {};
    this.useDynamicConfidence = opts.useDynamicConfidence ?? false;
    if (this.useDynamicConfidence) {
      this.confidenceCalculator = new DynamicConfidenceCalculator();
    }
    this.layers = [
      new SyntaxLayer(),
      new TypeLayer(),
      new TestLayer(),
      new ArchitectureLayer(),
      new SecurityLayer(),
      new DependencyLayer(),
      new PerformanceLayer()
    ];
    if (opts.enhanced && opts.workspaceRoot) {
      this.layers.push(new BiomeLayer(opts.workspaceRoot));
      this.layers.push(new TypeScriptCompilerLayer(opts.workspaceRoot));
    }
    if (opts.customLayers) {
      this.layers.push(...opts.customLayers);
    }
  }
  /**
  * Validate code through all layers
  */
  async validate(code, filePath) {
    const layerResults = await Promise.all(this.layers.map(async (layer) => {
      const start = Date.now();
      const result = await layer.validate(code, filePath);
      return {
        layer: layer.name,
        passed: result.issues.length === 0,
        issues: result.issues,
        duration: Date.now() - start
      };
    }));
    const totalIssues = layerResults.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalIssues = layerResults.flatMap((r) => r.issues).filter((i) => i.severity === "critical");
    const confidence = this.calculateConfidence(totalIssues, criticalIssues.length, layerResults);
    const recommendation = this.getRecommendation(confidence, criticalIssues);
    return {
      overall: {
        passed: criticalIssues.length === 0,
        confidence,
        totalIssues
      },
      layers: layerResults,
      recommendation,
      focusPoints: criticalIssues.map((i) => i.message)
    };
  }
  /**
  * Quick check - returns true if code passes all critical checks
  */
  async quickCheck(code, filePath) {
    const result = await this.validate(code, filePath);
    return result.overall.passed;
  }
  /**
  * Result-based validation - returns Result<PipelineResult, CriticalValidationError>
  *
  * This is the recommended API for new code. Use validateSafe() when you want
  * to handle validation failures without exceptions.
  *
  * @example
  * ```typescript
  * const result = await pipeline.validateSafe(code, filePath);
  * if (!result.success) {
  *   console.error('Critical issues:', result.error.criticalIssues);
  *   return;
  * }
  * console.log('Confidence:', result.value.overall.confidence);
  * ```
  */
  async validateSafe(code, filePath, options) {
    const result = await this.validate(code, filePath);
    if (options?.failFast) {
      const criticalIssues = _ValidationPipeline.getIssuesBySeverity(result, "critical");
      if (criticalIssues.length > 0) {
        return err(new CriticalValidationError(`Validation failed: ${criticalIssues.length} critical issues`, criticalIssues));
      }
    }
    return ok(result);
  }
  /**
  * Validate with fail-fast on critical issues
  *
  * Runs layers in sequence and stops immediately when a critical issue is found.
  * Use this for pre-commit hooks where early failure is desired.
  */
  async validateFailFast(code, filePath) {
    const layerResults = [];
    for (const layer of this.layers) {
      const start = Date.now();
      const result = await layer.validate(code, filePath);
      const layerResult = {
        layer: layer.name,
        passed: result.issues.length === 0,
        issues: result.issues,
        duration: Date.now() - start
      };
      layerResults.push(layerResult);
      const criticalIssues = result.issues.filter((i) => i.severity === "critical");
      if (criticalIssues.length > 0) {
        return err(new CriticalValidationError(`Validation failed in ${layer.name}: ${criticalIssues.length} critical issues`, criticalIssues));
      }
    }
    const totalIssues = layerResults.reduce((sum, r) => sum + r.issues.length, 0);
    const confidence = this.calculateConfidence(totalIssues, 0, layerResults);
    const recommendation = this.getRecommendation(confidence, []);
    return ok({
      overall: {
        passed: true,
        confidence,
        totalIssues
      },
      layers: layerResults,
      recommendation,
      focusPoints: []
    });
  }
  /**
  * Validate multiple files with aggregated results
  */
  async validateFiles(files) {
    const results = [];
    const allCriticalIssues = [];
    for (const file of files) {
      const result = await this.validate(file.content, file.path);
      results.push(result);
      const criticalIssues = _ValidationPipeline.getIssuesBySeverity(result, "critical");
      if (criticalIssues.length > 0) {
        allCriticalIssues.push(...criticalIssues.map((issue) => ({
          ...issue,
          message: `[${file.path}] ${issue.message}`
        })));
      }
    }
    if (allCriticalIssues.length > 0) {
      return err(new CriticalValidationError(`Validation failed: ${allCriticalIssues.length} critical issues across ${files.length} files`, allCriticalIssues));
    }
    return ok(results);
  }
  /**
  * Calculate confidence score based on issues
  *
  * When useDynamicConfidence is enabled, uses weighted scoring per layer.
  * Otherwise falls back to hardcoded thresholds for backward compatibility.
  */
  calculateConfidence(totalIssues, criticalIssues, layerResults) {
    if (this.confidenceCalculator && layerResults) {
      return this.confidenceCalculator.calculate(layerResults);
    }
    if (criticalIssues > 0) {
      return 0.1;
    }
    if (totalIssues === 0) {
      return CONFIDENCE_THRESHOLDS.AUTO_MERGE;
    }
    if (totalIssues <= ISSUE_THRESHOLDS.QUICK_REVIEW) {
      return CONFIDENCE_THRESHOLDS.QUICK_REVIEW;
    }
    if (totalIssues <= ISSUE_THRESHOLDS.FULL_REVIEW) {
      return CONFIDENCE_THRESHOLDS.FULL_REVIEW;
    }
    return 0.2;
  }
  /**
  * Determine review recommendation based on confidence
  */
  getRecommendation(confidence, criticalIssues) {
    if (criticalIssues.length > 0) {
      return "full_review";
    }
    if (confidence >= 0.85) {
      return "auto_merge";
    }
    if (confidence >= CONFIDENCE_THRESHOLDS.FULL_REVIEW) {
      return "quick_review";
    }
    return "full_review";
  }
  /**
  * Get layer names
  */
  getLayerNames() {
    return this.layers.map((l) => l.name);
  }
  /**
  * Add a custom validation layer
  */
  addLayer(layer) {
    this.layers.push(layer);
  }
  /**
  * Get all issues from a result, flattened
  */
  static flattenIssues(result) {
    return result.layers.flatMap((l) => l.issues);
  }
  /**
  * Get issues by severity
  */
  static getIssuesBySeverity(result, severity) {
    return _ValidationPipeline.flattenIssues(result).filter((i) => i.severity === severity);
  }
};
var BehaviorTracker = class {
  static {
    __name(this, "BehaviorTracker");
  }
  static {
    __name2(this, "BehaviorTracker");
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
var PRESSURE_THRESHOLDS = {
  /** Moderate pressure - consider snapshotting soon */
  moderate: 50,
  /** Critical pressure - immediate snapshot required */
  critical: 80
};
var OXYGEN_THRESHOLDS = {
  /** Low - needs attention */
  low: 50,
  /** Moderate - acceptable but could improve */
  moderate: 70
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
    __name2(this, "PhaseDetector");
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
    for (const [phase, patterns3] of Object.entries(PHASE_PATTERNS)) {
      for (const pattern of patterns3) {
        if (pattern.test(branchName)) {
          const result2 = {
            phase,
            confidence: 0.9,
            branchName,
            matchedPattern: pattern.source,
            thresholds: PHASE_THRESHOLDS[phase]
          };
          this.cachedPhase = result2;
          this.lastBranch = branchName;
          return result2;
        }
      }
    }
    const inferredPhase = this.inferPhaseFromStructure(branchName);
    const result = {
      phase: inferredPhase.phase,
      confidence: inferredPhase.confidence,
      branchName,
      thresholds: PHASE_THRESHOLDS[inferredPhase.phase]
    };
    this.cachedPhase = result;
    this.lastBranch = branchName;
    return result;
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
    const result = {};
    for (const [phase, patterns3] of Object.entries(PHASE_PATTERNS)) {
      result[phase] = patterns3.map((p) => p.source);
    }
    return result;
  }
};
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
  OBSERVATIONS_TO_LOCK: 50,
  /** Confidence threshold to apply adjustments */
  CONFIDENCE_THRESHOLD: 0.7
};
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
__name(clamp, "clamp");
__name2(clamp, "clamp");
var ThresholdCalibrator = class {
  static {
    __name(this, "ThresholdCalibrator");
  }
  static {
    __name2(this, "ThresholdCalibrator");
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
__name2(clamp2, "clamp");
var TrajectoryPredictor = class {
  static {
    __name(this, "TrajectoryPredictor");
  }
  static {
    __name2(this, "TrajectoryPredictor");
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
function generateId22() {
  return `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
__name(generateId22, "generateId2");
__name2(generateId22, "generateId");
var UserBehaviorLearner = class {
  static {
    __name(this, "UserBehaviorLearner");
  }
  static {
    __name2(this, "UserBehaviorLearner");
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
  recordObservation(input) {
    const timing = this.classifyTiming(input);
    const urgency = this.calculateUrgency(input.vitals);
    const observation = {
      id: generateId22(),
      workspaceId: this.workspaceId,
      timestamp: Date.now(),
      vitals: input.vitals,
      userCreatedSnapshot: input.userCreatedSnapshot,
      vitalsRecommended: input.vitalsRecommended,
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
  classifyTiming(input) {
    if (!input.userCreatedSnapshot && input.vitalsRecommended) {
      return "missed";
    }
    if (input.userCreatedSnapshot && !input.vitalsRecommended) {
      return "early";
    }
    if (input.userCreatedSnapshot && input.vitalsRecommended) {
      if (input.vitals.trajectory === "critical" || input.vitals.pressure.value > 80) {
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
var CRITICAL_FILE_PATTERNS = [
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
    __name2(this, "OxygenSensor");
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
    return CRITICAL_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
  }
};
var DEFAULT_PRESSURE_CONFIG = {
  baseRate: 5,
  criticalMultiplier: 2,
  decayOnSnapshot: 50,
  maxPressure: 100
};
var CRITICAL_FILE_PATTERNS2 = [
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
    __name2(this, "PressureGauge");
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
    return CRITICAL_FILE_PATTERNS2.some((pattern) => pattern.test(filePath));
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
    __name2(this, "PulseTracker");
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
    __name2(this, "TemperatureMonitor");
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
    __name2(this, "WorkspaceVitals");
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
    let instance = _WorkspaceVitals.instances.get(workspaceId);
    if (!instance) {
      instance = new _WorkspaceVitals(workspaceId, config);
      _WorkspaceVitals.instances.set(workspaceId, instance);
    }
    return instance;
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
    const safeOps = [
      "read",
      "analyze",
      "suggest"
    ];
    if (vitals.oxygen.value > 80 && vitals.pressure.value < 40) {
      safeOps.push("write", "modify", "refactor-small");
    }
    return {
      shouldSnapshot: snapshotDecision.should,
      snapshotReason: snapshotDecision.should ? snapshotDecision.reason : void 0,
      riskyFiles: vitals.pressure.criticalFilesTouched,
      safeOperations: safeOps,
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
var Intelligence = class {
  static {
    __name(this, "Intelligence");
  }
  static {
    __name2(this, "Intelligence");
  }
  config;
  configStore;
  contextEngine;
  validationPipeline;
  learningEngine;
  violationTracker;
  sessionManager;
  advisoryEngine;
  initialized = false;
  constructor(config) {
    this.config = this.resolveConfig(config);
    this.configStore = new ConfigStore(this.config);
    this.contextEngine = new ContextEngine(this.config, this.configStore);
    this.validationPipeline = new ValidationPipeline({
      enhanced: config.enhancedValidation ?? false,
      useDynamicConfidence: config.enhancedValidation ?? false,
      workspaceRoot: config.rootDir
    });
    this.learningEngine = new LearningEngine(this.config);
    this.violationTracker = new ViolationTracker(this.config);
    this.sessionManager = new SessionManager(config.sessionLimits, {
      persistencePath: config.sessionPersistence?.path,
      autosave: config.sessionPersistence?.autosave ?? true
    });
    this.advisoryEngine = new AdvisoryEngine(config.advisoryConfig);
  }
  /**
  * Initialize async resources (embeddings, database)
  * Call once before using semantic features
  */
  async initialize() {
    if (this.initialized) {
      return;
    }
    if (this.config.enableSemanticSearch) {
      await this.contextEngine.initialize();
    }
    this.initialized = true;
  }
  // =========================================================================
  // CONTEXT RETRIEVAL
  // =========================================================================
  /**
  * Get relevant context for a task
  * Primary entry point - used before implementing anything
  */
  async getContext(params) {
    return this.contextEngine.getContext(params);
  }
  /**
  * Semantic search across indexed content
  * Requires initialization with enableSemanticSearch: true
  */
  async semanticSearch(_query, _maxTokens) {
    if (!this.config.enableSemanticSearch) {
      throw new Error("Semantic search not enabled. Set enableSemanticSearch: true");
    }
    return {
      context: "",
      tokensUsed: 0,
      sectionsIncluded: 0,
      compressionRatio: 0
    };
  }
  // =========================================================================
  // VALIDATION
  // =========================================================================
  /**
  * Validate code against patterns and constraints
  * Used before committing
  */
  async checkPatterns(code, filePath) {
    return this.validationPipeline.validate(code, filePath);
  }
  /**
  * Full 7-layer validation with confidence score
  * Alias for checkPatterns
  */
  async validateCode(code, filePath) {
    return this.validationPipeline.validate(code, filePath);
  }
  /**
  * Quick check - returns true if code passes all critical checks
  */
  async quickCheck(code, filePath) {
    return this.validationPipeline.quickCheck(code, filePath);
  }
  // =========================================================================
  // LEARNING
  // =========================================================================
  /**
  * Report a violation for tracking
  * Auto-promotes at 3x, auto-marks for automation at 5x
  */
  async reportViolation(violation) {
    return this.violationTracker.report(violation);
  }
  /**
  * Search learnings database
  */
  queryLearnings(keywords) {
    return this.learningEngine.query(keywords);
  }
  /**
  * Record a new learning
  */
  async recordLearning(learning) {
    return this.learningEngine.record(learning);
  }
  /**
  * Log an AI interaction for analysis
  */
  async logInteraction(data) {
    return this.learningEngine.logInteraction(data);
  }
  /**
  * Record human feedback on an interaction
  */
  async recordFeedback(interactionId, feedback) {
    return this.learningEngine.recordFeedback(interactionId, feedback);
  }
  /**
  * Get learning statistics
  */
  getStats() {
    return this.learningEngine.getStats();
  }
  /**
  * Get violations summary with promotion status
  */
  getViolationsSummary() {
    return this.violationTracker.getSummary();
  }
  // =========================================================================
  // VITALS (Adaptive Risk Sensing)
  // =========================================================================
  /**
  * Get or create WorkspaceVitals instance for a workspace
  * Singleton per workspaceId
  */
  getVitals(workspaceId, config) {
    return WorkspaceVitals.for(workspaceId, config);
  }
  /**
  * Get current vitals snapshot for a workspace
  */
  getVitalsSnapshot(workspaceId) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    return vitals?.current() ?? null;
  }
  /**
  * Get snapshot decision based on current vitals
  */
  shouldSnapshot(workspaceId) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    return vitals?.shouldSnapshot() ?? null;
  }
  /**
  * Get agent guidance based on current vitals
  */
  getAgentGuidance(workspaceId) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    return vitals?.getAgentGuidance() ?? null;
  }
  // =========================================================================
  // VITALS PHASE 4: Learning & Calibration
  // =========================================================================
  /**
  * Record user behavior for learning
  * Call when user creates/acknowledges a snapshot
  */
  recordBehavior(workspaceId, userCreatedSnapshot) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    vitals?.recordBehavior(userCreatedSnapshot);
  }
  /**
  * Get calibrated thresholds based on learned user behavior
  */
  getCalibratedThresholds(workspaceId) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    return vitals?.getCalibratedThresholds() ?? null;
  }
  /**
  * Get trajectory forecast (5/10 minute predictions)
  */
  getForecast(workspaceId) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    return vitals?.getForecast() ?? null;
  }
  /**
  * Get user behavior statistics
  */
  getBehaviorStats(workspaceId) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    return vitals?.getBehaviorStats() ?? null;
  }
  /**
  * Get calibration profile for workspace
  */
  getCalibrationProfile(workspaceId) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    return vitals?.getCalibrationProfile() ?? null;
  }
  /**
  * Reset learning data for workspace
  */
  resetLearning(workspaceId) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    vitals?.resetLearning();
  }
  // =========================================================================
  // VITALS PHASE 2: Behavioral Metadata
  // =========================================================================
  /**
  * Record a file edit event
  * @param workspaceId Workspace identifier
  * @param linesAdded Number of lines added
  * @param linesDeleted Number of lines deleted
  */
  recordEdit(workspaceId, linesAdded, linesDeleted) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    vitals?.recordEdit(linesAdded, linesDeleted);
  }
  /**
  * Record a file save event
  */
  recordFileSave(workspaceId) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    vitals?.recordFileSave();
  }
  /**
  * Record a test execution result
  * @param workspaceId Workspace identifier
  * @param passed Whether the test passed
  */
  recordTestResult(workspaceId, passed) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    vitals?.recordTest(passed);
  }
  /**
  * Record an AI suggestion event
  * @param workspaceId Workspace identifier
  * @param accepted Whether the user accepted the suggestion
  */
  recordAISuggestionResponse(workspaceId, accepted) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    vitals?.recordAISuggestion(accepted);
  }
  /**
  * Get current behavioral metadata for a workspace
  */
  getBehavioralMetadata(workspaceId) {
    const vitals = WorkspaceVitals.tryGet(workspaceId);
    return vitals?.getBehavioralMetadata() ?? null;
  }
  // =========================================================================
  // SESSION MANAGEMENT (Phase 1)
  // =========================================================================
  /**
  * Start a new LLM session
  */
  startSession(sessionId, metadata) {
    this.sessionManager.startSession(sessionId, metadata);
  }
  /**
  * Record a tool call in the session
  * Returns true if allowed, false if blocked (circuit breaker/loop)
  */
  recordToolCall(sessionId, call) {
    return this.sessionManager.recordToolCall(sessionId, call);
  }
  /**
  * Record a file modification
  */
  recordFileModification(sessionId, mod) {
    this.sessionManager.recordFileModification(sessionId, mod);
  }
  /**
  * Detect loops in session behavior
  */
  detectLoop(sessionId) {
    return this.sessionManager.detectLoop(sessionId);
  }
  /**
  * Get session analytics
  */
  getSessionAnalytics(sessionId) {
    return this.sessionManager.getAnalytics(sessionId);
  }
  /**
  * End a session and get analytics
  */
  endSession(sessionId) {
    return this.sessionManager.endSession(sessionId);
  }
  /**
  * Get file modifications for a session
  * Returns canonical FileModification type from @snapback/contracts
  * @param sessionId - Session to query
  * @param since - Optional timestamp filter (return modifications >= since)
  */
  getFileModifications(sessionId, since) {
    const mods = this.sessionManager.getFileModifications(sessionId, since);
    return mods.map((mod) => fromIntelligenceFileModification(mod, "extension"));
  }
  // =========================================================================
  // ADVISORY CONTEXT
  // =========================================================================
  /**
  * Enrich context with advisory guidance
  * Used to add warnings/suggestions to tool responses
  */
  enrichAdvisory(context) {
    return this.advisoryEngine.enrich(context);
  }
  /**
  * Get file history for a specific file
  */
  getFileHistory(file) {
    return this.advisoryEngine.getFileHistory(file);
  }
  // =========================================================================
  // CACHING (for Anthropic prompt caching)
  // =========================================================================
  /**
  * Get static context suitable for prompt caching
  * Content changes rarely - cache for 5+ minutes
  */
  getStaticContext() {
    return this.configStore.getStaticContext();
  }
  // =========================================================================
  // UTILITIES
  // =========================================================================
  /**
  * Resolve config with defaults using Zod schema
  */
  resolveConfig(config) {
    return IntelligenceConfigSchema.parse(config);
  }
  /**
  * Get the resolved configuration
  */
  getConfig() {
    return this.config;
  }
  /**
  * Dispose resources
  */
  async dispose() {
    await this.contextEngine.dispose();
    this.initialized = false;
  }
};
var ConfidenceCalculator2 = class {
  static {
    __name(this, "ConfidenceCalculator2");
  }
  static {
    __name2(this, "ConfidenceCalculator");
  }
  store;
  constructor(store) {
    this.store = store;
  }
  /**
  * Calculate confidence for a retrieval result
  */
  calculate(chunk, retrievalFactors, context) {
    const retrieval = this.calculateRetrievalConfidence(retrievalFactors);
    const historical = this.calculateHistoricalConfidence(chunk.id);
    const action = this.calculateActionConfidence(chunk, context);
    const overall = retrieval.score * 0.4 + historical.score * 0.35 + action.score * 0.25;
    return {
      overall: Math.min(1, Math.max(0, overall)),
      layers: {
        retrieval: retrieval.score,
        historical: historical.score,
        action: action.score
      },
      factors: {
        crossAgreement: retrieval.crossAgreement,
        semanticSimilarity: retrievalFactors.semanticSimilarity || 0,
        successRate: historical.successRate,
        recentUsage: historical.recentUsage,
        contextMatch: action.contextMatch
      }
    };
  }
  /**
  * Layer 1: Retrieval Confidence
  */
  calculateRetrievalConfidence(factors) {
    let score = 0.5;
    const crossAgreement = factors.semanticRank !== void 0 && factors.keywordRank !== void 0;
    if (crossAgreement) {
      score += 0.2;
    }
    if (factors.semanticSimilarity) {
      if (factors.semanticSimilarity > 0.8) {
        score += 0.2;
      } else if (factors.semanticSimilarity > 0.6) {
        score += 0.1;
      } else if (factors.semanticSimilarity > 0.4) {
        score += 0.05;
      }
    }
    const bestRank = Math.min(factors.semanticRank || Number.POSITIVE_INFINITY, factors.keywordRank || Number.POSITIVE_INFINITY);
    if (bestRank === 1) {
      score += 0.1;
    } else if (bestRank <= 3) {
      score += 0.05;
    }
    if (factors.totalResults <= 3) {
      score += 0.05;
    }
    return {
      score: Math.min(1, score),
      crossAgreement
    };
  }
  /**
  * Layer 2: Historical Confidence
  */
  calculateHistoricalConfidence(chunkId) {
    const stats = this.getOutcomeStats(chunkId);
    if (stats.total < 3) {
      return {
        score: 0.5,
        successRate: 0.5,
        recentUsage: false
      };
    }
    const successes = stats.accepted + stats.testPass + stats.violationPrevented;
    const failures = stats.ignored + stats.testFail;
    const successRate = successes / (successes + failures) || 0.5;
    const recentUsage = this.hasRecentOutcome(chunkId, 7);
    let score = 0.3 + successRate * 0.5;
    if (recentUsage) {
      score += 0.1;
    }
    if (stats.testFail > stats.testPass) {
      score -= 0.2;
    }
    return {
      score: Math.min(1, Math.max(0, score)),
      successRate,
      recentUsage
    };
  }
  /**
  * Layer 3: Action Confidence
  */
  calculateActionConfidence(chunk, context) {
    let score = 0.5;
    let contextMatch = 0;
    if (chunk.status !== "active") {
      score -= 0.3;
    }
    score += chunk.authority * 0.2;
    if (context) {
      const chunkText = `${chunk.chunk_text} ${chunk.context_text || ""}`.toLowerCase();
      if (context.taskType && chunkText.includes(context.taskType.toLowerCase())) {
        contextMatch += 0.3;
      }
      if (context.fileTypes) {
        const fileMatches = context.fileTypes.filter((ft) => chunkText.includes(ft.toLowerCase()));
        contextMatch += Math.min(0.3, fileMatches.length * 0.1);
      }
      if (context.recentViolations) {
        const violationMatches = context.recentViolations.filter((v) => chunkText.includes(v.toLowerCase()));
        contextMatch += Math.min(0.4, violationMatches.length * 0.2);
      }
      score += contextMatch;
    }
    return {
      score: Math.min(1, Math.max(0, score)),
      contextMatch
    };
  }
  /**
  * Get outcome statistics for a chunk
  */
  getOutcomeStats(chunkId) {
    const stmt = this.store.db.prepare(`
      SELECT
        outcome_type,
        COUNT(*) as count,
        MAX(created_at) as last_at
      FROM outcomes
      WHERE chunk_id = ?
      GROUP BY outcome_type
    `);
    const rows = stmt.all(chunkId);
    const stats = {
      total: 0,
      accepted: 0,
      ignored: 0,
      testPass: 0,
      testFail: 0,
      violationPrevented: 0,
      successRate: 0.5,
      lastOutcome: null
    };
    let latestDate = "";
    for (const row of rows) {
      stats.total += row.count;
      switch (row.outcome_type) {
        case "accepted":
          stats.accepted = row.count;
          break;
        case "ignored":
          stats.ignored = row.count;
          break;
        case "test_pass":
          stats.testPass = row.count;
          break;
        case "test_fail":
          stats.testFail = row.count;
          break;
        case "violation_prevented":
          stats.violationPrevented = row.count;
          break;
      }
      if (row.last_at > latestDate) {
        latestDate = row.last_at;
        stats.lastOutcome = row.outcome_type;
      }
    }
    if (stats.total > 0) {
      const successes = stats.accepted + stats.testPass + stats.violationPrevented;
      stats.successRate = successes / stats.total;
    }
    return stats;
  }
  /**
  * Check if chunk has recent outcome
  */
  hasRecentOutcome(chunkId, days) {
    const stmt = this.store.db.prepare(`
      SELECT 1 FROM outcomes
      WHERE chunk_id = ?
      AND created_at > datetime('now', '-' || ? || ' days')
      LIMIT 1
    `);
    return stmt.get(chunkId, days) !== void 0;
  }
  /**
  * Record an outcome for a chunk
  */
  recordOutcome(chunkId, outcomeType, context) {
    const stmt = this.store.db.prepare(`
      INSERT INTO outcomes (id, chunk_id, outcome_type, context, session_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const id = `out_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    stmt.run(id, chunkId, outcomeType, context ? JSON.stringify(context) : null, context?.sessionId || null);
  }
};
var SOURCE_TYPE_WEIGHTS = {
  adr: 1,
  pattern: 0.85,
  learning: 0.7,
  violation: 0.5
};
var STATUS_PENALTIES = {
  active: 0,
  deprecated: 0.3,
  superseded: 0.5
};
var RECENCY_HALF_LIFE_DAYS = 30;
function calculateMetadataBoost(chunk) {
  const sourceWeight = SOURCE_TYPE_WEIGHTS[chunk.source_type] ?? 0.5;
  const authorityScore = (chunk.authority + sourceWeight) / 2;
  const statusPenalty = STATUS_PENALTIES[chunk.status] ?? 0;
  const statusFactor = 1 - statusPenalty;
  const updatedDate = new Date(chunk.updated_at);
  const daysSinceUpdate = (Date.now() - updatedDate.getTime()) / (1e3 * 60 * 60 * 24);
  const recencyFactor = Math.exp(-Math.LN2 * daysSinceUpdate / RECENCY_HALF_LIFE_DAYS);
  const boost = authorityScore * 0.6 * statusFactor + statusFactor * 0.2 + recencyFactor * 0.2;
  return Math.max(0.1, Math.min(1, boost));
}
__name(calculateMetadataBoost, "calculateMetadataBoost");
__name2(calculateMetadataBoost, "calculateMetadataBoost");
function calculateHistoricalBoost(signals) {
  let boost = signals.successRate;
  if (signals.violationCount > 0) {
    boost += Math.min(0.15, signals.violationCount * 0.05);
  }
  const usageBonus = Math.min(0.1, Math.log10(signals.accessCount + 1) * 0.05);
  boost += usageBonus;
  if (signals.recentOutcomes.length > 0) {
    const recentSuccess = signals.recentOutcomes.filter((o) => o === "accepted" || o === "test_pass" || o === "violation_prevented").length;
    const recentRatio = recentSuccess / signals.recentOutcomes.length;
    boost = boost * 0.7 + recentRatio * 0.3;
  }
  return Math.max(0, Math.min(1, boost));
}
__name(calculateHistoricalBoost, "calculateHistoricalBoost");
__name2(calculateHistoricalBoost, "calculateHistoricalBoost");
function calculateRerankingScore(baseScore, chunk, historicalSignals) {
  const retrievalComponent = baseScore * 0.4;
  const historicalComponent = historicalSignals ? calculateHistoricalBoost(historicalSignals) * 0.35 : 0.5 * 0.35;
  const metadataComponent = calculateMetadataBoost(chunk) * 0.25;
  const combined = retrievalComponent + historicalComponent + metadataComponent;
  return Math.max(0.1, Math.min(1, combined));
}
__name(calculateRerankingScore, "calculateRerankingScore");
__name2(calculateRerankingScore, "calculateRerankingScore");
function batchRerankingScores(items) {
  return items.map((item) => ({
    chunk: item.chunk,
    originalScore: item.baseScore,
    rerankScore: calculateRerankingScore(item.baseScore, item.chunk, item.historicalSignals)
  })).sort((a, b) => b.rerankScore - a.rerankScore);
}
__name(batchRerankingScores, "batchRerankingScores");
__name2(batchRerankingScores, "batchRerankingScores");
function getConfidenceLevel(score) {
  if (score >= 0.7) {
    return "high";
  }
  if (score >= 0.4) {
    return "medium";
  }
  return "low";
}
__name(getConfidenceLevel, "getConfidenceLevel");
__name2(getConfidenceLevel, "getConfidenceLevel");
var embeddingPipeline = null;
var isLoading2 = false;
var loadPromise = null;
var MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
var EMBEDDING_DIM = 384;
async function getEmbeddingPipeline() {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }
  if (loadPromise) {
    return loadPromise;
  }
  if (isLoading2) {
    while (isLoading2 && !embeddingPipeline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!embeddingPipeline) {
      throw new Error("Embedding pipeline failed to load");
    }
    return embeddingPipeline;
  }
  isLoading2 = true;
  try {
    loadPromise = pipeline("feature-extraction", MODEL_NAME, {
      quantized: true,
      progress_callback: /* @__PURE__ */ __name2((progress) => {
        if (progress.progress) {
          console.log(`Loading embedding model: ${(progress.progress * 100).toFixed(1)}%`);
        }
      }, "progress_callback")
    });
    embeddingPipeline = await loadPromise;
    console.log("\u2705 Embedding model loaded");
    return embeddingPipeline;
  } finally {
    isLoading2 = false;
    loadPromise = null;
  }
}
__name(getEmbeddingPipeline, "getEmbeddingPipeline");
__name2(getEmbeddingPipeline, "getEmbeddingPipeline");
async function getEmbedding(text) {
  const pipe = await getEmbeddingPipeline();
  const truncated = text.slice(0, 1e3);
  const output = await pipe(truncated, {
    pooling: "mean",
    normalize: true
  });
  const embedding = output.data;
  if (embedding.length !== EMBEDDING_DIM) {
    throw new Error(`Unexpected embedding dimension: ${embedding.length}, expected ${EMBEDDING_DIM}`);
  }
  return embedding;
}
__name(getEmbedding, "getEmbedding");
__name2(getEmbedding, "getEmbedding");
function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error("Embedding dimensions must match");
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
__name(cosineSimilarity, "cosineSimilarity");
__name2(cosineSimilarity, "cosineSimilarity");
async function preloadEmbeddings() {
  await getEmbeddingPipeline();
}
__name(preloadEmbeddings, "preloadEmbeddings");
__name2(preloadEmbeddings, "preloadEmbeddings");
init_query_classifier();
init_query_classifier();
var DEFAULT_CONFIG = {
  semanticWeight: 0.6,
  keywordWeight: 0.4,
  k: 60,
  limit: 10,
  minConfidence: 0.1,
  candidateMultiplier: 3
};
var HybridRetriever = class {
  static {
    __name(this, "HybridRetriever");
  }
  static {
    __name2(this, "HybridRetriever");
  }
  store;
  config;
  constructor(store, config = {}) {
    this.store = store;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
    const totalWeight = this.config.semanticWeight + this.config.keywordWeight;
    if (Math.abs(totalWeight - 1) > 0.01) {
      console.warn(`Weights should sum to 1.0, got ${totalWeight}. Normalizing.`);
      this.config.semanticWeight /= totalWeight;
      this.config.keywordWeight /= totalWeight;
    }
  }
  /**
  * Main retrieval method (uses static weights from config)
  */
  async retrieve(query) {
    const startTime = performance.now();
    const candidateLimit = this.config.limit * this.config.candidateMultiplier;
    const [semanticResults, keywordResults] = await Promise.all([
      this.semanticSearch(query, candidateLimit),
      this.keywordSearch(query, candidateLimit)
    ]);
    const fused = this.reciprocalRankFusion(semanticResults, keywordResults);
    const withConfidence = this.calculateConfidence(fused, semanticResults, keywordResults);
    const filtered = withConfidence.filter((r) => r.confidence >= this.config.minConfidence).slice(0, this.config.limit);
    const elapsed = performance.now() - startTime;
    console.log(`Hybrid retrieval: ${filtered.length} results in ${elapsed.toFixed(2)}ms`);
    return filtered;
  }
  /**
  * Adaptive retrieval with automatic query classification
  *
  * This is the recommended method for production use. It:
  * 1. Classifies the query type (factual, conceptual, exploratory)
  * 2. Applies optimal weights based on query type
  * 3. Returns results with classification metadata
  *
  * @example
  * ```typescript
  * const { results, classification } = await retriever.retrieveAdaptive(
  *   "What is the import path for RuntimeRouter?"
  * );
  * // classification.type === "factual"
  * // classification.weights === { semantic: 0.3, keyword: 0.7 }
  * ```
  */
  async retrieveAdaptive(query) {
    const startTime = performance.now();
    const classification = classifyQuery(query);
    const originalWeights = {
      semantic: this.config.semanticWeight,
      keyword: this.config.keywordWeight
    };
    this.config.semanticWeight = classification.weights.semantic;
    this.config.keywordWeight = classification.weights.keyword;
    const candidateLimit = this.config.limit * this.config.candidateMultiplier;
    try {
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(query, candidateLimit),
        this.keywordSearch(query, candidateLimit)
      ]);
      const fused = this.reciprocalRankFusion(semanticResults, keywordResults);
      const withConfidence = this.calculateConfidence(fused, semanticResults, keywordResults);
      const filtered = withConfidence.filter((r) => r.confidence >= this.config.minConfidence).slice(0, this.config.limit);
      const elapsed = performance.now() - startTime;
      console.log(`Adaptive retrieval [${classification.type}]: ${filtered.length} results in ${elapsed.toFixed(2)}ms (weights: sem=${classification.weights.semantic}, kw=${classification.weights.keyword})`);
      return {
        results: filtered,
        classification,
        stats: {
          semanticCandidates: semanticResults.length,
          keywordCandidates: keywordResults.length,
          fusedCount: fused.length,
          latencyMs: elapsed
        }
      };
    } finally {
      this.config.semanticWeight = originalWeights.semantic;
      this.config.keywordWeight = originalWeights.keyword;
    }
  }
  /**
  * Retrieve with explicit query type (skip classification)
  *
  * Use this when you already know the query type or want to
  * override the automatic classification.
  */
  async retrieveWithType(query, queryType) {
    const startTime = performance.now();
    const { getWeightsForType: getWeightsForType2 } = await Promise.resolve().then(() => (init_query_classifier(), query_classifier_exports));
    const weights = getWeightsForType2(queryType);
    const { calculateComplexity: calculateComplexity2 } = await Promise.resolve().then(() => (init_query_classifier(), query_classifier_exports));
    const classification = {
      type: queryType,
      complexity: calculateComplexity2(query),
      confidence: 1,
      weights,
      reason: `Explicit type: ${queryType}`
    };
    const originalWeights = {
      semantic: this.config.semanticWeight,
      keyword: this.config.keywordWeight
    };
    this.config.semanticWeight = weights.semantic;
    this.config.keywordWeight = weights.keyword;
    const candidateLimit = this.config.limit * this.config.candidateMultiplier;
    try {
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(query, candidateLimit),
        this.keywordSearch(query, candidateLimit)
      ]);
      const fused = this.reciprocalRankFusion(semanticResults, keywordResults);
      const withConfidence = this.calculateConfidence(fused, semanticResults, keywordResults);
      const filtered = withConfidence.filter((r) => r.confidence >= this.config.minConfidence).slice(0, this.config.limit);
      const elapsed = performance.now() - startTime;
      return {
        results: filtered,
        classification,
        stats: {
          semanticCandidates: semanticResults.length,
          keywordCandidates: keywordResults.length,
          fusedCount: fused.length,
          latencyMs: elapsed
        }
      };
    } finally {
      this.config.semanticWeight = originalWeights.semantic;
      this.config.keywordWeight = originalWeights.keyword;
    }
  }
  /**
  * Semantic search using embeddings
  */
  async semanticSearch(query, limit) {
    const results = await this.store.searchSemantic(query, limit);
    return results.map((r, index) => ({
      chunkId: r.chunk.id,
      similarity: r.similarity,
      rank: index + 1
    }));
  }
  /**
  * Keyword search using FTS5
  */
  keywordSearch(query, limit) {
    const results = this.store.searchKeyword(query, limit);
    return results.map((chunk, index) => ({
      chunkId: chunk.id,
      rank: index + 1
    }));
  }
  /**
  * Reciprocal Rank Fusion
  * Combines rankings from multiple sources into a unified score
  */
  reciprocalRankFusion(semantic, keyword) {
    const scores = /* @__PURE__ */ new Map();
    const sources = /* @__PURE__ */ new Map();
    const { k, semanticWeight, keywordWeight } = this.config;
    for (const { chunkId, similarity, rank } of semantic) {
      const rrfScore = semanticWeight * (1 / (k + rank));
      scores.set(chunkId, (scores.get(chunkId) || 0) + rrfScore);
      const existing = sources.get(chunkId) || {};
      existing.semantic = {
        rank,
        similarity
      };
      sources.set(chunkId, existing);
    }
    for (const { chunkId, rank } of keyword) {
      const rrfScore = keywordWeight * (1 / (k + rank));
      scores.set(chunkId, (scores.get(chunkId) || 0) + rrfScore);
      const existing = sources.get(chunkId) || {};
      existing.keyword = {
        rank
      };
      sources.set(chunkId, existing);
    }
    return Array.from(scores.entries()).map(([chunkId, score]) => ({
      chunkId,
      score,
      sources: sources.get(chunkId) ?? {}
    })).sort((a, b) => b.score - a.score);
  }
  /**
  * Calculate confidence scores using 3-layer model
  */
  calculateConfidence(fused, semantic, keyword) {
    const results = [];
    for (const { chunkId, score, sources } of fused) {
      const chunk = this.store.getChunk(chunkId);
      if (!chunk) {
        continue;
      }
      const retrievalConfidence = this.calculateRetrievalConfidence(sources, semantic, keyword);
      const historicalConfidence = chunk.authority;
      const actionConfidence = chunk.status === "active" ? 1 : 0.5;
      const confidence = retrievalConfidence * 0.5 + historicalConfidence * 0.3 + actionConfidence * 0.2;
      results.push({
        chunk,
        score,
        confidence,
        sources
      });
    }
    return results;
  }
  /**
  * Layer 1: Retrieval Confidence
  * Based on: cross-agreement, score margin, semantic similarity
  */
  calculateRetrievalConfidence(sources, _semantic, _keyword) {
    let confidence = 0.5;
    const inBoth = sources.semantic && sources.keyword;
    if (inBoth) {
      confidence += 0.2;
    }
    if (sources.semantic) {
      const sim = sources.semantic.similarity;
      if (sim > 0.8) {
        confidence += 0.2;
      } else if (sim > 0.6) {
        confidence += 0.1;
      }
    }
    const bestRank = Math.min(sources.semantic?.rank || Number.POSITIVE_INFINITY, sources.keyword?.rank || Number.POSITIVE_INFINITY);
    if (bestRank === 1) {
      confidence += 0.1;
    } else if (bestRank <= 3) {
      confidence += 0.05;
    }
    return Math.min(1, confidence);
  }
  /**
  * Get retriever configuration
  */
  getConfig() {
    return {
      ...this.config
    };
  }
  /**
  * Update retriever configuration
  */
  updateConfig(config) {
    this.config = {
      ...this.config,
      ...config
    };
    const totalWeight = this.config.semanticWeight + this.config.keywordWeight;
    if (Math.abs(totalWeight - 1) > 0.01) {
      console.warn(`Weights should sum to 1.0, got ${totalWeight}. Normalizing.`);
      this.config.semanticWeight /= totalWeight;
      this.config.keywordWeight /= totalWeight;
    }
  }
};
var KNOWLEDGE_SCHEMA = `
-- Core chunks table (learnings, ADRs, patterns)
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('learning', 'adr', 'pattern', 'violation')),
  source_id TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  context_text TEXT,
  authority REAL DEFAULT 1.0 CHECK (authority >= 0 AND authority <= 1),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'superseded')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  metadata TEXT  -- JSON blob for extensibility
);

-- FTS5 for keyword search
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  chunk_text,
  context_text,
  content='chunks',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(rowid, chunk_text, context_text)
  VALUES (new.rowid, new.chunk_text, new.context_text);
END;

CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, chunk_text, context_text)
  VALUES('delete', old.rowid, old.chunk_text, old.context_text);
END;

CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, chunk_text, context_text)
  VALUES('delete', old.rowid, old.chunk_text, old.context_text);
  INSERT INTO chunks_fts(rowid, chunk_text, context_text)
  VALUES (new.rowid, new.chunk_text, new.context_text);
END;

-- Knowledge relationships
CREATE TABLE IF NOT EXISTS knowledge_edges (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES chunks(id),
  target_id TEXT NOT NULL REFERENCES chunks(id),
  edge_type TEXT NOT NULL CHECK (edge_type IN ('supersedes', 'prevents', 'requires', 'related')),
  confidence REAL DEFAULT 1.0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Outcome tracking for confidence
CREATE TABLE IF NOT EXISTS outcomes (
  id TEXT PRIMARY KEY,
  chunk_id TEXT NOT NULL REFERENCES chunks(id),
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('accepted', 'ignored', 'test_pass', 'test_fail', 'violation_prevented')),
  context TEXT,  -- JSON: task, files, etc.
  created_at TEXT DEFAULT (datetime('now'))
);

-- Embedding storage (fallback without sqlite-vec native extension)
CREATE TABLE IF NOT EXISTS chunk_embeddings (
  chunk_id TEXT PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
  embedding BLOB NOT NULL,
  model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  dimension INTEGER NOT NULL DEFAULT 384,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_chunks_status ON chunks(status);
CREATE INDEX IF NOT EXISTS idx_edges_source ON knowledge_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON knowledge_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_chunk ON outcomes(chunk_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk ON chunk_embeddings(chunk_id);
`;
var KnowledgeStore = class {
  static {
    __name(this, "KnowledgeStore");
  }
  static {
    __name2(this, "KnowledgeStore");
  }
  db;
  dbPath;
  constructor(config = {}) {
    this.dbPath = config.dbPath ?? path3__default.join(homedir(), ".snapback", "knowledge.db");
    if (config.inMemory) {
      this.db = new Database(":memory:");
    } else {
      const dir = path3__default.dirname(this.dbPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, {
          recursive: true
        });
      }
      this.db = new Database(this.dbPath);
    }
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("foreign_keys = ON");
    this.initSchema();
  }
  initSchema() {
    this.db.exec(KNOWLEDGE_SCHEMA);
  }
  // CRUD operations
  insertChunk(chunk) {
    const stmt = this.db.prepare(`
      INSERT INTO chunks (id, source_type, source_id, chunk_text, context_text, authority, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(chunk.id, chunk.source_type, chunk.source_id, chunk.chunk_text, chunk.context_text ?? null, chunk.authority, chunk.status, chunk.metadata ? JSON.stringify(chunk.metadata) : null);
  }
  getChunk(id) {
    const stmt = this.db.prepare("SELECT * FROM chunks WHERE id = ?");
    const row = stmt.get(id);
    if (!row) {
      return null;
    }
    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : void 0
    };
  }
  /**
  * Search chunks using FTS5 keyword matching
  * @param query - Search query (special characters will be escaped)
  * @param limit - Maximum results to return
  */
  searchKeyword(query, limit = 10) {
    const keywords = query.toLowerCase().replace(/["\-*():@?!.,;'`~#$%^&+=[\]{}|\\<>]/g, " ").split(/\s+/).filter((word) => {
      if (word.length < 3) {
        return false;
      }
      const stopWords = /* @__PURE__ */ new Set([
        "the",
        "and",
        "for",
        "how",
        "what",
        "why",
        "when",
        "where",
        "which",
        "does",
        "should",
        "would",
        "could",
        "can",
        "will",
        "has",
        "have",
        "been",
        "being",
        "was",
        "were",
        "are",
        "this",
        "that",
        "these",
        "those",
        "with",
        "from",
        "into",
        "about",
        "than",
        "then",
        "they"
      ]);
      return !stopWords.has(word);
    });
    if (keywords.length === 0) {
      return [];
    }
    const ftsQuery = keywords.join(" OR ");
    try {
      const stmt = this.db.prepare(`
        SELECT c.* FROM chunks c
        JOIN chunks_fts fts ON c.rowid = fts.rowid
        WHERE chunks_fts MATCH ?
        ORDER BY bm25(chunks_fts)
        LIMIT ?
      `);
      const rows = stmt.all(ftsQuery, limit);
      return rows.map((row) => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : void 0
      }));
    } catch (error) {
      console.warn(`FTS5 search failed for query "${ftsQuery}":`, error);
      return [];
    }
  }
  /**
  * Store embedding for a chunk
  */
  storeEmbedding(chunkId, embedding) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO chunk_embeddings (chunk_id, embedding, dimension)
      VALUES (?, ?, ?)
    `);
    const buffer = Buffer.from(embedding.buffer);
    stmt.run(chunkId, buffer, embedding.length);
  }
  /**
  * Get embedding for a chunk
  */
  getEmbedding(chunkId) {
    const stmt = this.db.prepare(`
      SELECT embedding, dimension FROM chunk_embeddings WHERE chunk_id = ?
    `);
    const row = stmt.get(chunkId);
    if (!row) {
      return null;
    }
    return new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.dimension);
  }
  /**
  * Get all embeddings (for brute-force search)
  */
  getAllEmbeddings() {
    const stmt = this.db.prepare(`
      SELECT chunk_id, embedding, dimension FROM chunk_embeddings
    `);
    const rows = stmt.all();
    return rows.map((row) => ({
      chunkId: row.chunk_id,
      embedding: new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.dimension)
    }));
  }
  /**
  * Check if chunk has an embedding
  */
  hasEmbedding(chunkId) {
    const stmt = this.db.prepare(`
      SELECT 1 FROM chunk_embeddings WHERE chunk_id = ? LIMIT 1
    `);
    return stmt.get(chunkId) !== void 0;
  }
  /**
  * Get embedding statistics
  */
  getEmbeddingStats() {
    const totalStmt = this.db.prepare("SELECT COUNT(*) as count FROM chunks");
    const embeddedStmt = this.db.prepare("SELECT COUNT(*) as count FROM chunk_embeddings");
    const total = totalStmt.get().count;
    const withEmbedding = embeddedStmt.get().count;
    return {
      total,
      withEmbedding,
      missing: total - withEmbedding
    };
  }
  /**
  * Semantic search using embeddings (brute-force for now)
  * For <1000 chunks, brute-force is acceptable (~10-20ms)
  */
  async searchSemantic(query, limit = 10) {
    const queryEmbedding = await getEmbedding(query);
    const allEmbeddings = this.getAllEmbeddings();
    if (allEmbeddings.length === 0) {
      return [];
    }
    const scored = allEmbeddings.map(({ chunkId, embedding }) => ({
      chunkId,
      similarity: cosineSimilarity(queryEmbedding, embedding)
    }));
    scored.sort((a, b) => b.similarity - a.similarity);
    const topIds = scored.slice(0, limit);
    const results = [];
    for (const { chunkId, similarity } of topIds) {
      const chunk = this.getChunk(chunkId);
      if (chunk) {
        results.push({
          chunk,
          similarity
        });
      }
    }
    return results;
  }
  // Vector search (deprecated - use searchSemantic instead)
  searchVector(_embedding, _limit = 10) {
    return [];
  }
  // Stats
  getStats() {
    const total = this.db.prepare("SELECT COUNT(*) as count FROM chunks").get();
    const byType = this.db.prepare(`
      SELECT source_type, COUNT(*) as count FROM chunks GROUP BY source_type
    `).all();
    return {
      totalChunks: total.count,
      byType: Object.fromEntries(byType.map((r) => [
        r.source_type,
        r.count
      ]))
    };
  }
  // ============================================================
  // OUTCOME TRACKING (Three-Layer Confidence Feedback Loop)
  // ============================================================
  /**
  * Record an outcome for a chunk (accepted, ignored, test_pass, etc.)
  * Per ADR: outcomes table feeds into confidence calculations
  */
  recordOutcome(chunkId, outcomeType, context) {
    const id = `outcome_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const stmt = this.db.prepare(`
			INSERT INTO outcomes (id, chunk_id, outcome_type, context)
			VALUES (?, ?, ?, ?)
		`);
    stmt.run(id, chunkId, outcomeType, context ? JSON.stringify(context) : null);
    return id;
  }
  /**
  * Get all outcomes for a chunk
  */
  getChunkOutcomes(chunkId, limit = 100) {
    const stmt = this.db.prepare(`
			SELECT * FROM outcomes
			WHERE chunk_id = ?
			ORDER BY created_at DESC
			LIMIT ?
		`);
    const rows = stmt.all(chunkId, limit);
    return rows.map((row) => ({
      id: row.id,
      chunk_id: row.chunk_id,
      outcome_type: row.outcome_type,
      context: row.context ? JSON.parse(row.context) : void 0,
      created_at: row.created_at
    }));
  }
  /**
  * Get historical signals for a chunk (for three-layer confidence model)
  * Per ADR: HistoricalSignals includes success_rate, violation_count, access_count
  */
  getHistoricalSignals(chunkId) {
    const countStmt = this.db.prepare(`
			SELECT outcome_type, COUNT(*) as count
			FROM outcomes
			WHERE chunk_id = ?
			GROUP BY outcome_type
		`);
    const counts = countStmt.all(chunkId);
    const countMap = {};
    let totalCount = 0;
    for (const row of counts) {
      countMap[row.outcome_type] = row.count;
      totalCount += row.count;
    }
    const successCount = (countMap.accepted ?? 0) + (countMap.test_pass ?? 0) + (countMap.violation_prevented ?? 0);
    const successRate = totalCount > 0 ? successCount / totalCount : 0.5;
    const recentStmt = this.db.prepare(`
			SELECT outcome_type FROM outcomes
			WHERE chunk_id = ?
			ORDER BY created_at DESC
			LIMIT 5
		`);
    const recentRows = recentStmt.all(chunkId);
    const recentOutcomes = recentRows.map((r) => r.outcome_type);
    return {
      successRate,
      violationCount: countMap.violation_prevented ?? 0,
      accessCount: totalCount,
      recentOutcomes
    };
  }
  /**
  * Get chunks with their historical signals (batch operation for efficiency)
  */
  getChunksWithSignals(chunkIds) {
    const result = /* @__PURE__ */ new Map();
    if (chunkIds.length <= 10) {
      for (const id of chunkIds) {
        result.set(id, this.getHistoricalSignals(id));
      }
    } else {
      const placeholders = chunkIds.map(() => "?").join(",");
      const countStmt = this.db.prepare(`
				SELECT chunk_id, outcome_type, COUNT(*) as count
				FROM outcomes
				WHERE chunk_id IN (${placeholders})
				GROUP BY chunk_id, outcome_type
			`);
      const counts = countStmt.all(...chunkIds);
      const chunkCounts = /* @__PURE__ */ new Map();
      for (const row of counts) {
        let chunkMap = chunkCounts.get(row.chunk_id);
        if (!chunkMap) {
          chunkMap = /* @__PURE__ */ new Map();
          chunkCounts.set(row.chunk_id, chunkMap);
        }
        chunkMap.set(row.outcome_type, row.count);
      }
      for (const id of chunkIds) {
        const countMap = chunkCounts.get(id) ?? /* @__PURE__ */ new Map();
        const totalCount = Array.from(countMap.values()).reduce((a, b) => a + b, 0);
        const successCount = (countMap.get("accepted") ?? 0) + (countMap.get("test_pass") ?? 0) + (countMap.get("violation_prevented") ?? 0);
        const successRate = totalCount > 0 ? successCount / totalCount : 0.5;
        result.set(id, {
          successRate,
          violationCount: countMap.get("violation_prevented") ?? 0,
          accessCount: totalCount,
          recentOutcomes: []
        });
      }
    }
    return result;
  }
  /**
  * Update chunk authority based on outcome history
  * Per ADR: Confidence should evolve based on historical signals
  */
  updateChunkAuthority(chunkId) {
    const signals = this.getHistoricalSignals(chunkId);
    const chunk = this.getChunk(chunkId);
    if (!chunk) {
      return;
    }
    const baseAuthority = chunk.authority;
    let recencyFactor = 1;
    const weights = [
      0.3,
      0.25,
      0.2,
      0.15,
      0.1
    ];
    for (let i = 0; i < signals.recentOutcomes.length; i++) {
      const outcome = signals.recentOutcomes[i];
      const isSuccess = outcome === "accepted" || outcome === "test_pass" || outcome === "violation_prevented";
      recencyFactor += weights[i] * (isSuccess ? 0.1 : -0.15);
    }
    recencyFactor = Math.max(0.5, Math.min(1.5, recencyFactor));
    const newAuthority = Math.max(0.1, Math.min(1, baseAuthority * 0.5 + signals.successRate * 0.3 + (recencyFactor - 1) * 0.2 + 0.5));
    const stmt = this.db.prepare(`
			UPDATE chunks SET authority = ?, updated_at = datetime('now')
			WHERE id = ?
		`);
    stmt.run(newAuthority, chunkId);
  }
  close() {
    this.db.close();
  }
};
var TEST_IMPORTS = [
  "vitest",
  "jest",
  "@testing-library/react",
  "@testing-library/dom",
  "@testing-library/user-event",
  "@jest/globals",
  "mocha",
  "chai",
  "sinon",
  "@vitest/spy"
];
var MOCK_PATTERNS = [
  /\b(mock|mocked)\w+/gi,
  /\bfake\w+/gi,
  /\bdummy\w+/gi,
  /\b(stub|stubbed)\w+/gi,
  /\btest(?:Data|User|Response|Api)/gi
];
var MockDetector = class {
  static {
    __name(this, "MockDetector");
  }
  static {
    __name2(this, "MockDetector");
  }
  /**
  * Detect mock/test code leakage in production files
  */
  detect(content, filePath) {
    const findings = [];
    if (this.isTestOrConfigFile(filePath)) {
      return {
        findings: [],
        riskScore: 0
      };
    }
    const lines = content.split("\n");
    this.detectTestImports(lines, findings);
    this.detectMockPatterns(lines, findings);
    const riskScore = this.calculateRiskScore(findings);
    return {
      findings,
      riskScore
    };
  }
  /**
  * Detect test library imports
  */
  detectTestImports(lines, findings) {
    const importPattern = /(?:import|require)\s*.*?["']([^"']+)["']/g;
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const matches2 = line.matchAll(importPattern);
      for (const match of matches2) {
        const importPath = match[1];
        for (const testLib of TEST_IMPORTS) {
          if (importPath === testLib || importPath.startsWith(`${testLib}/`)) {
            findings.push({
              type: "Test Library Import",
              line: lineNum + 1,
              snippet: line.trim().substring(0, 80),
              severity: "high",
              ruleId: "mock-detection/test-import"
            });
          }
        }
      }
    }
  }
  /**
  * Detect mock data patterns
  */
  detectMockPatterns(lines, findings) {
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
        continue;
      }
      for (const pattern of MOCK_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          const isLargeStructure = line.includes("[") || line.includes("{");
          findings.push({
            type: "Mock Data Pattern",
            line: lineNum + 1,
            snippet: line.trim().substring(0, 80),
            severity: isLargeStructure ? "medium" : "low",
            ruleId: "mock-detection/mock-pattern"
          });
          break;
        }
      }
    }
  }
  /**
  * Check if file is a test or config file
  */
  isTestOrConfigFile(filePath) {
    const allowedPatterns = [
      /\.test\.[jt]sx?$/,
      /\.spec\.[jt]sx?$/,
      /__tests__\//,
      /\/test\//,
      /\/tests\//,
      /\.fixture\.[jt]sx?$/,
      /\.seed\.[jt]sx?$/,
      /vitest\.config\.[jt]s$/,
      /jest\.config\.[jt]s$/,
      /playwright\.config\.[jt]s$/,
      /setupTests\.[jt]s$/,
      /test-utils\.[jt]sx?$/
    ];
    return allowedPatterns.some((pattern) => pattern.test(filePath));
  }
  /**
  * Calculate risk score (0-10)
  */
  calculateRiskScore(findings) {
    if (findings.length === 0) {
      return 0;
    }
    const severityWeights = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 2
    };
    let totalScore = 0;
    for (const finding of findings) {
      totalScore += severityWeights[finding.severity];
    }
    return Math.min(10, totalScore / findings.length);
  }
};
var FRAMEWORK_EXCEPTIONS = {
  next: [
    "react",
    "react-dom",
    "next"
  ],
  vite: [
    "vite"
  ],
  "@vitejs/plugin-react": [
    "react",
    "react-dom"
  ],
  nuxt: [
    "vue",
    "nuxt"
  ],
  "@angular/core": [
    "@angular/common",
    "@angular/platform-browser"
  ]
};
var BUILD_TOOL_EXCEPTIONS = [
  "typescript",
  "tsup",
  "vite",
  "esbuild",
  "webpack",
  "rollup",
  "biome",
  "eslint",
  "prettier",
  "@biomejs/biome",
  "vitest",
  "jest",
  "playwright",
  "@playwright/test",
  "turbo",
  "tsx",
  "node-gyp",
  "@types/node",
  "@changesets/cli",
  "lefthook",
  "@evilmartians/lefthook",
  "commitlint",
  "lint-staged"
];
var PhantomDependencyDetector = class {
  static {
    __name(this, "PhantomDependencyDetector");
  }
  static {
    __name2(this, "PhantomDependencyDetector");
  }
  /**
  * Detect unused dependencies by analyzing imports
  */
  async detect(packageJsonContent, codebaseFiles) {
    const findings = [];
    const usageReport = {};
    let packageJson;
    try {
      packageJson = JSON.parse(packageJsonContent);
    } catch {
      return {
        findings: [],
        phantomDeps: [],
        totalDeps: 0,
        usageReport: {},
        riskScore: 0
      };
    }
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    const allDeps = {
      ...dependencies,
      ...devDependencies
    };
    const totalDeps = Object.keys(allDeps).length;
    for (const dep of Object.keys(allDeps)) {
      usageReport[dep] = 0;
    }
    for (const file of codebaseFiles) {
      if (file.path.includes("node_modules") || file.path.includes("dist/") || file.path.includes("build/")) {
        continue;
      }
      this.scanFileForImports(file.content, usageReport);
    }
    const frameworkExceptions = this.getFrameworkExceptions(allDeps);
    const phantomDeps = [];
    for (const [dep, usage] of Object.entries(usageReport)) {
      if (usage > 0) {
        continue;
      }
      if (BUILD_TOOL_EXCEPTIONS.includes(dep)) {
        continue;
      }
      if (frameworkExceptions.includes(dep)) {
        continue;
      }
      if (dep.startsWith("@types/")) {
        continue;
      }
      if (dep.startsWith("@") && !dep.includes("/")) {
        continue;
      }
      phantomDeps.push(dep);
      const declaredIn = dep in dependencies ? "dependencies" : "devDependencies";
      findings.push({
        packageName: dep,
        declaredIn,
        severity: declaredIn === "dependencies" ? "medium" : "low",
        ruleId: "phantom-deps/unused-dependency"
      });
    }
    const riskScore = this.calculateRiskScore(phantomDeps.length, totalDeps);
    return {
      findings,
      phantomDeps,
      totalDeps,
      usageReport,
      riskScore
    };
  }
  /**
  * Scan file content for import/require statements
  */
  scanFileForImports(content, usageReport) {
    const patterns3 = [
      /import\s+.*?from\s+["']([^"']+)["']/g,
      /require\s*\(\s*["']([^"']+)["']\s*\)/g,
      /import\s*\(\s*["']([^"']+)["']\s*\)/g
    ];
    for (const pattern of patterns3) {
      const matches2 = content.matchAll(pattern);
      for (const match of matches2) {
        const importPath = match[1];
        const packageName = this.extractPackageName(importPath);
        if (packageName && packageName in usageReport) {
          usageReport[packageName]++;
        }
      }
    }
  }
  /**
  * Extract package name from import path
  */
  extractPackageName(importPath) {
    if (importPath.startsWith(".")) {
      return "";
    }
    if (importPath.startsWith("@")) {
      const parts2 = importPath.split("/");
      if (parts2.length >= 2) {
        return `${parts2[0]}/${parts2[1]}`;
      }
      return parts2[0];
    }
    const parts = importPath.split("/");
    return parts[0];
  }
  /**
  * Get framework-specific exceptions
  */
  getFrameworkExceptions(allDeps) {
    const exceptions = [];
    for (const [framework, deps] of Object.entries(FRAMEWORK_EXCEPTIONS)) {
      if (framework in allDeps) {
        exceptions.push(...deps);
      }
    }
    return exceptions;
  }
  /**
  * Calculate risk score (0-10)
  */
  calculateRiskScore(phantomCount, totalCount) {
    if (totalCount === 0) {
      return 0;
    }
    const ratio = phantomCount / totalCount;
    if (ratio <= 0.1) {
      return ratio * 30;
    }
    if (ratio <= 0.25) {
      return 3 + (ratio - 0.1) * 20;
    }
    return Math.min(10, 6 + (ratio - 0.25) * 13.3);
  }
};
var DEFAULT_RULES = [
  {
    id: "secret-detection-critical",
    name: "Critical Secret Detection",
    detector: "secret",
    action: "block",
    severity: "critical",
    enabled: true
  },
  {
    id: "secret-detection-high",
    name: "High Severity Secret Detection",
    detector: "secret",
    action: "warn",
    severity: "high",
    enabled: true
  },
  {
    id: "mock-detection",
    name: "Mock/Test Leakage Detection",
    detector: "mock",
    action: "warn",
    enabled: true
  },
  {
    id: "phantom-dependency",
    name: "Phantom Dependency Detection",
    detector: "phantom-dependency",
    action: "watch",
    enabled: true
  }
];
var PolicyEngine = class {
  static {
    __name(this, "PolicyEngine");
  }
  static {
    __name2(this, "PolicyEngine");
  }
  secretDetector;
  mockDetector;
  phantomDependencyDetector;
  config;
  constructor(config) {
    this.secretDetector = new SecretDetector();
    this.mockDetector = new MockDetector();
    this.phantomDependencyDetector = new PhantomDependencyDetector();
    this.config = {
      // Deep copy DEFAULT_RULES to avoid mutation across instances
      rules: config?.rules || DEFAULT_RULES.map((rule) => ({
        ...rule
      })),
      defaultAction: config?.defaultAction || "watch"
    };
  }
  /**
  * Run all enabled detectors on a file
  */
  async analyzeFile(filePath, content) {
    const events = [];
    let totalFindings = 0;
    const byDetector = {};
    if (this.isDetectorEnabled("secret")) {
      const result = this.secretDetector.detect(content, filePath);
      const action = this.determineAction("secret", result);
      if (result.findings.length > 0) {
        events.push({
          ruleId: "secret-detection",
          detector: "secret",
          action,
          findings: result.findings,
          riskScore: result.riskScore,
          timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
        });
        totalFindings += result.findings.length;
        byDetector.secret = result.findings.length;
      }
    }
    if (this.isDetectorEnabled("mock")) {
      const result = this.mockDetector.detect(content, filePath);
      const action = this.determineAction("mock", result);
      if (result.findings.length > 0) {
        events.push({
          ruleId: "mock-detection",
          detector: "mock",
          action,
          findings: result.findings,
          riskScore: result.riskScore,
          timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
        });
        totalFindings += result.findings.length;
        byDetector.mock = result.findings.length;
      }
    }
    const highestAction = this.getHighestAction(events.map((e) => e.action));
    return {
      action: highestAction,
      events,
      summary: {
        totalFindings,
        byDetector,
        highestAction
      }
    };
  }
  /**
  * Analyze package.json for phantom dependencies
  */
  async analyzePackageJson(packageJsonContent, codebaseFiles) {
    const events = [];
    if (this.isDetectorEnabled("phantom-dependency")) {
      const result = await this.phantomDependencyDetector.detect(packageJsonContent, codebaseFiles);
      const action = this.determineAction("phantom-dependency", result);
      if (result.findings.length > 0) {
        events.push({
          ruleId: "phantom-dependency",
          detector: "phantom-dependency",
          action,
          findings: result.findings,
          riskScore: result.riskScore,
          timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    const highestAction = this.getHighestAction(events.map((e) => e.action));
    const byDetector = {};
    for (const e of events) {
      byDetector[e.detector] = e.findings.length;
    }
    return {
      action: highestAction,
      events,
      summary: {
        totalFindings: events.reduce((sum, e) => sum + e.findings.length, 0),
        byDetector,
        highestAction
      }
    };
  }
  /**
  * Check if a detector is enabled in the policy
  */
  isDetectorEnabled(detector) {
    return this.config.rules.some((rule) => rule.detector === detector && rule.enabled);
  }
  /**
  * Determine action based on detection results and configured rules
  */
  determineAction(detector, result) {
    let highestAction = this.config.defaultAction || "watch";
    for (const rule of this.config.rules) {
      if (rule.detector !== detector || !rule.enabled) {
        continue;
      }
      if (detector === "secret" && rule.severity) {
        const secretResult = result;
        const hasSeverity = secretResult.findings.some((f) => f.severity === rule.severity);
        if (hasSeverity) {
          highestAction = this.getHigherAction(highestAction, rule.action);
        }
      } else {
        if (result.findings.length > 0) {
          highestAction = this.getHigherAction(highestAction, rule.action);
        }
      }
    }
    return highestAction;
  }
  /**
  * Get the higher priority action
  */
  getHigherAction(current, candidate) {
    const priority = {
      watch: 1,
      warn: 2,
      block: 3
    };
    return priority[candidate] > priority[current] ? candidate : current;
  }
  /**
  * Get the highest action from a list
  */
  getHighestAction(actions) {
    if (actions.length === 0) {
      return this.config.defaultAction || "watch";
    }
    return actions.reduce((highest, current) => this.getHigherAction(highest, current), "watch");
  }
  /**
  * Update policy configuration
  */
  updateConfig(config) {
    if (config.rules) {
      this.config.rules = config.rules;
    }
    if (config.defaultAction) {
      this.config.defaultAction = config.defaultAction;
    }
  }
  /**
  * Get current policy configuration
  */
  getConfig() {
    return {
      ...this.config
    };
  }
  /**
  * Enable a specific rule
  */
  enableRule(ruleId) {
    const rule = this.config.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }
  /**
  * Disable a specific rule
  */
  disableRule(ruleId) {
    const rule = this.config.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }
};
var SarifFormatter = class _SarifFormatter {
  static {
    __name(this, "_SarifFormatter");
  }
  static {
    __name2(this, "SarifFormatter");
  }
  toolName = "SnapBack Guardian";
  toolVersion = "1.0.0";
  toolUri = "https://snapback.dev";
  /**
  * Convert PolicyEngineResult to SARIF format
  */
  toSarif(result, analysisSource) {
    const rules = [];
    const results = [];
    for (const event of result.events) {
      this.addRulesForEvent(event.detector, rules);
      for (const finding of event.findings) {
        const sarifResult = this.convertFindingToResult(finding, event.detector, analysisSource);
        if (sarifResult) {
          results.push(sarifResult);
        }
      }
    }
    return {
      version: "2.1.0",
      $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      runs: [
        {
          tool: {
            driver: {
              name: this.toolName,
              version: this.toolVersion,
              informationUri: this.toolUri,
              rules: this.deduplicateRules(rules)
            }
          },
          results
        }
      ]
    };
  }
  /**
  * Add rule definitions based on detector type
  */
  addRulesForEvent(detector, rules) {
    switch (detector) {
      case "secret":
        rules.push({
          id: "secret-detection/aws-key",
          name: "AWS Access Key Detection",
          shortDescription: {
            text: "Detects AWS access keys in code"
          },
          defaultConfiguration: {
            level: "error"
          },
          helpUri: "https://snapback.dev/docs/detectors/secret-detection"
        });
        rules.push({
          id: "secret-detection/github-token",
          name: "GitHub Token Detection",
          shortDescription: {
            text: "Detects GitHub personal access tokens"
          },
          defaultConfiguration: {
            level: "error"
          },
          helpUri: "https://snapback.dev/docs/detectors/secret-detection"
        });
        rules.push({
          id: "secret-detection/high-entropy-string",
          name: "High Entropy String Detection",
          shortDescription: {
            text: "Detects high-entropy strings that may be secrets"
          },
          defaultConfiguration: {
            level: "warning"
          },
          helpUri: "https://snapback.dev/docs/detectors/secret-detection"
        });
        break;
      case "mock":
        rules.push({
          id: "mock-detection/test-import",
          name: "Test Library Import Detection",
          shortDescription: {
            text: "Detects test library imports in production code"
          },
          defaultConfiguration: {
            level: "warning"
          },
          helpUri: "https://snapback.dev/docs/detectors/mock-detection"
        });
        rules.push({
          id: "mock-detection/mock-pattern",
          name: "Mock Pattern Detection",
          shortDescription: {
            text: "Detects mock/test patterns in production code"
          },
          defaultConfiguration: {
            level: "warning"
          },
          helpUri: "https://snapback.dev/docs/detectors/mock-detection"
        });
        break;
      case "phantom-dependency":
        rules.push({
          id: "phantom-deps/unused-dependency",
          name: "Unused Dependency Detection",
          shortDescription: {
            text: "Detects declared dependencies that are not imported"
          },
          defaultConfiguration: {
            level: "note"
          },
          helpUri: "https://snapback.dev/docs/detectors/phantom-dependency"
        });
        break;
    }
  }
  /**
  * Convert a finding to SARIF result format
  */
  convertFindingToResult(finding, detector, source) {
    if (detector === "secret") {
      return this.convertSecretFinding(finding, source);
    }
    if (detector === "mock") {
      return this.convertMockFinding(finding, source);
    }
    if (detector === "phantom-dependency") {
      return this.convertPhantomDependencyFinding(finding);
    }
    return null;
  }
  /**
  * Convert secret finding to SARIF result
  */
  convertSecretFinding(finding, source) {
    return {
      ruleId: finding.ruleId,
      level: this.mapSeverityToLevel(finding.severity),
      message: {
        text: `${finding.type} detected: ${finding.snippet.substring(0, 50)}...`
      },
      locations: source ? [
        {
          physicalLocation: {
            artifactLocation: {
              uri: source
            },
            region: {
              startLine: finding.line,
              startColumn: finding.column
            }
          }
        }
      ] : void 0,
      properties: {
        severity: finding.severity,
        entropy: finding.entropy
      }
    };
  }
  /**
  * Convert mock finding to SARIF result
  */
  convertMockFinding(finding, source) {
    return {
      ruleId: finding.ruleId,
      level: this.mapSeverityToLevel(finding.severity),
      message: {
        text: `${finding.type} detected: ${finding.snippet}`
      },
      locations: source ? [
        {
          physicalLocation: {
            artifactLocation: {
              uri: source
            },
            region: {
              startLine: finding.line
            }
          }
        }
      ] : void 0,
      properties: {
        severity: finding.severity
      }
    };
  }
  /**
  * Convert phantom dependency finding to SARIF result
  */
  convertPhantomDependencyFinding(finding) {
    return {
      ruleId: finding.ruleId,
      level: this.mapSeverityToLevel(finding.severity),
      message: {
        text: `Unused dependency '${finding.packageName}' in ${finding.declaredIn}`
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: "package.json"
            }
          }
        }
      ],
      properties: {
        severity: finding.severity,
        packageName: finding.packageName,
        declaredIn: finding.declaredIn
      }
    };
  }
  /**
  * Map internal severity to SARIF level
  */
  mapSeverityToLevel(severity) {
    switch (severity) {
      case "critical":
      case "high":
        return "error";
      case "medium":
        return "warning";
      default:
        return "note";
    }
  }
  /**
  * Deduplicate rules by ID
  */
  deduplicateRules(rules) {
    const seen = /* @__PURE__ */ new Set();
    const deduplicated = [];
    for (const rule of rules) {
      if (!seen.has(rule.id)) {
        seen.add(rule.id);
        deduplicated.push(rule);
      }
    }
    return deduplicated;
  }
  /**
  * Export to SARIF JSON string
  */
  toJson(result, analysisSource) {
    const sarif = this.toSarif(result, analysisSource);
    return JSON.stringify(sarif, null, 2);
  }
  /**
  * Static method to format PolicyEngineResult to SARIF (matches export API)
  */
  static format(result, options) {
    const formatter = new _SarifFormatter();
    formatter.toolVersion = options.toolVersion;
    return formatter.toSarif(result);
  }
  /**
  * Static method to convert SARIF log to JSON string (matches export API)
  */
  static toJSON(log) {
    return JSON.stringify(log, null, 2);
  }
  /**
  * Static method to write SARIF log to file (matches export API)
  */
  static toFile(log, filePath) {
    const fs5 = __require2("fs");
    fs5.writeFileSync(filePath, _SarifFormatter.toJSON(log), "utf-8");
  }
};
var DEFAULT_POLICY = {
  thresholds: {
    critical: 0,
    high: 0,
    medium: 100,
    low: 100
  },
  blockOn: {
    critical: true,
    high: true,
    medium: false,
    low: false
  },
  pathRules: []
};
var POLICY_VERSION = "1.0.0";
var POLICY_ETAG = "abc123def456";
function evaluate(sarif, config = DEFAULT_POLICY, filePath) {
  const effectiveConfig = {
    thresholds: {
      ...DEFAULT_POLICY.thresholds,
      ...config.thresholds
    },
    blockOn: {
      ...DEFAULT_POLICY.blockOn,
      ...config.blockOn
    },
    pathRules: config.pathRules || DEFAULT_POLICY.pathRules
  };
  let effectiveThresholds = effectiveConfig.thresholds;
  let effectiveBlockOn = effectiveConfig.blockOn;
  if (filePath) {
    for (const rule of effectiveConfig.pathRules) {
      if (matchesGlob(filePath, rule.glob)) {
        effectiveThresholds = {
          ...effectiveThresholds,
          ...rule.thresholds
        };
        if (rule.blockOn) {
          effectiveBlockOn = {
            ...effectiveBlockOn,
            ...rule.blockOn
          };
        } else {
          const implicitBlockOn = {};
          if (rule.thresholds.critical !== void 0) {
            implicitBlockOn.critical = true;
          }
          if (rule.thresholds.high !== void 0) {
            implicitBlockOn.high = true;
          }
          if (rule.thresholds.medium !== void 0) {
            implicitBlockOn.medium = true;
          }
          if (rule.thresholds.low !== void 0) {
            implicitBlockOn.low = true;
          }
          effectiveBlockOn = {
            ...effectiveBlockOn,
            ...implicitBlockOn
          };
        }
        break;
      }
    }
  }
  const rulesHit = [];
  const issueCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  if (sarif.runs && sarif.runs.length > 0) {
    const results = sarif.runs[0].results || [];
    for (const result of results) {
      const severity = getSeverity(result);
      if (severity in issueCounts) {
        issueCounts[severity]++;
        if (result.ruleId) {
          if (!rulesHit.includes(result.ruleId)) {
            rulesHit.push(result.ruleId);
          }
        }
      }
    }
  }
  const confidence = calculateConfidence(issueCounts, effectiveThresholds);
  if (effectiveBlockOn.critical && issueCounts.critical > effectiveThresholds.critical) {
    return {
      action: "block",
      reason: `Critical issues (${issueCounts.critical}) exceed threshold (${effectiveThresholds.critical})`,
      rules_hit: rulesHit,
      confidence,
      policyVersion: POLICY_VERSION,
      etag: POLICY_ETAG,
      details: {
        issueCounts
      }
    };
  }
  if (effectiveBlockOn.high && issueCounts.high > effectiveThresholds.high) {
    return {
      action: "block",
      reason: `High issues (${issueCounts.high}) exceed threshold (${effectiveThresholds.high})`,
      rules_hit: rulesHit,
      confidence,
      policyVersion: POLICY_VERSION,
      etag: POLICY_ETAG,
      details: {
        issueCounts
      }
    };
  }
  if (effectiveBlockOn.medium && issueCounts.medium > effectiveThresholds.medium) {
    return {
      action: "block",
      reason: `Medium issues (${issueCounts.medium}) exceed threshold (${effectiveThresholds.medium})`,
      rules_hit: rulesHit,
      confidence,
      policyVersion: POLICY_VERSION,
      etag: POLICY_ETAG,
      details: {
        issueCounts
      }
    };
  }
  if (effectiveBlockOn.low && issueCounts.low > effectiveThresholds.low) {
    return {
      action: "block",
      reason: `Low issues (${issueCounts.low}) exceed threshold (${effectiveThresholds.low})`,
      rules_hit: rulesHit,
      confidence,
      policyVersion: POLICY_VERSION,
      etag: POLICY_ETAG,
      details: {
        issueCounts
      }
    };
  }
  if (issueCounts.critical > 0 && !effectiveBlockOn.critical || issueCounts.high > 0 && !effectiveBlockOn.high) {
    return {
      action: "review",
      reason: "Critical or high severity issues found",
      rules_hit: rulesHit,
      confidence,
      policyVersion: POLICY_VERSION,
      etag: POLICY_ETAG,
      details: {
        issueCounts
      }
    };
  }
  return {
    action: "apply",
    reason: "No blocking issues found",
    rules_hit: rulesHit,
    confidence,
    policyVersion: POLICY_VERSION,
    etag: POLICY_ETAG,
    details: {
      issueCounts
    }
  };
}
__name(evaluate, "evaluate");
__name2(evaluate, "evaluate");
function calculateConfidence(issueCounts, thresholds) {
  let confidence = 0.9;
  const criticalRatio = thresholds.critical > 0 ? issueCounts.critical / thresholds.critical : 0;
  const highRatio = thresholds.high > 0 ? issueCounts.high / thresholds.high : 0;
  const mediumRatio = thresholds.medium > 0 ? issueCounts.medium / thresholds.medium : 0;
  const lowRatio = thresholds.low > 0 ? issueCounts.low / thresholds.low : 0;
  const thresholdProximity = Math.max(criticalRatio, highRatio, mediumRatio, lowRatio);
  confidence = Math.max(0.1, confidence - thresholdProximity * 0.5);
  return confidence;
}
__name(calculateConfidence, "calculateConfidence");
__name2(calculateConfidence, "calculateConfidence");
function getSeverity(result) {
  if (result.level) {
    const level = result.level.toLowerCase();
    switch (level) {
      case "error":
        return "critical";
      case "warning":
        return "high";
      case "note":
        return "medium";
      case "critical":
        return "critical";
      case "high":
        return "high";
      case "medium":
        return "medium";
      case "low":
        return "low";
      default:
        return "medium";
    }
  }
  return "medium";
}
__name(getSeverity, "getSeverity");
__name2(getSeverity, "getSeverity");
function matchesGlob(filePath, glob) {
  if (glob === "src/**") {
    return filePath.startsWith("src/");
  }
  const regexPattern = glob.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".").replace(/\//g, "[/\\\\]");
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}
__name(matchesGlob, "matchesGlob");
__name2(matchesGlob, "matchesGlob");
function loadPolicyConfig(cwd = process.cwd()) {
  const configPath = path3.join(cwd, ".snapbackrc");
  if (!fs.existsSync(configPath)) {
    return DEFAULT_POLICY;
  }
  try {
    const configContent = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configContent);
    return {
      thresholds: {
        ...DEFAULT_POLICY.thresholds,
        ...config.thresholds
      },
      blockOn: {
        ...DEFAULT_POLICY.blockOn,
        ...config.blockOn
      },
      pathRules: config.pathRules || DEFAULT_POLICY.pathRules
    };
  } catch (error) {
    console.warn("Failed to load .snapbackrc, using default policy", error);
    return DEFAULT_POLICY;
  }
}
__name(loadPolicyConfig, "loadPolicyConfig");
__name2(loadPolicyConfig, "loadPolicyConfig");
var DEFAULT_FRAGILITY_CONFIG = {
  enabled: true,
  rollbackWindowDays: 7,
  minRollbacksForFragile: 2,
  coChangeThreshold: 0.3,
  quickRollbackThresholdMs: 36e5,
  scoreDecayRate: 0.05
};

export { AdvisoryEngine, ArchitectureLayer, CALIBRATION_THRESHOLDS, CODE_SYNONYMS, CONFIDENCE_THRESHOLDS, Composer, ConfidenceCalculator, ConfidenceCalculator2, ConfigStore, ConsecutiveModificationRule, ContextEngine, CriticalValidationError, DEFAULT_ADVISORY_CONFIG, DEFAULT_BUDGET_CONFIG, DEFAULT_FRAGILITY_CONFIG, DEFAULT_SESSION_LIMITS, DEFAULT_THRESHOLD_ADJUSTMENTS, DependencyLayer, FragileFileRule, GapAnalyzer, GenericSuggestionsRule, HybridRetriever, ISSUE_THRESHOLDS, Intelligence, IntelligenceConfigSchema, KnowledgeStore, LearningEngine, LoopDetectionRule, LoopDetector, MockDetector, PROMOTION_THRESHOLDS, PatternDetector, PerformanceLayer, PhantomDependencyDetector, PolicyEngine, QUERY_TYPE_KEYWORDS, RECENCY_HALF_LIFE_DAYS, SOURCE_TYPE_WEIGHTS, STATUS_PENALTIES, SarifFormatter, SecretDetector, SecurityLayer, SemanticRetriever, SessionManager, SkippedTestRule, SyntaxLayer, TestLayer, TypeLayer, ValidationError, ValidationPipeline, ViolationHistoryRule, ViolationTracker, WorkspaceProfiler, apiPatterns, appendJsonl, appendJsonlAsync, astroConfig, authPatterns, batchRerankingScores, calculateComplexity, calculateHistoricalBoost, calculateMetadataBoost, calculateRerankingScore, classifyQuery, cosineSimilarity, createBuiltInMatchers, createComposer, createDefaultWorkspace, createSnapshotStorage, daemonPatterns, detectFrameworks, detectPrimaryFramework, errorHandlingMatchers, evaluate, expandQuery, expressConfig, generateCacheKey, generateId2 as generateId, getAllFrameworks, getConfidenceLevel, getEmbedding, getFramework, getFrameworksByCategory, getRetrievalStrategy, getWeightsForType, isValidFramework, loadJsonl, loadPolicyConfig, nestjsConfig, nextjsConfig, performanceMatchers, preloadEmbeddings, reactViteConfig, securityMatchers, testingMatchers, validateWeights, writeJsonl };
//# sourceMappingURL=chunk-MTQ6ESQR.js.map
//# sourceMappingURL=chunk-MTQ6ESQR.js.map