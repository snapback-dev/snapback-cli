# @snapback/cli

## 0.2.0

### Minor Changes

- 884ce9e: refactor: Major repository reorganization

  - Consolidated 10 packages into 4 new packages:
    - @snapback/infrastructure (logging, metrics, tracing)
    - @snapback/integrations (email, payments)
    - @snapback/platform (database schemas, Supabase client)
    - @snapback/config (utility functions, feature flags)
  - Removed deprecated packages: @snapback/database, @snapback/storage, @snapback/telemetry, @snapback/logs, @snapback/observability, @snapback/payments, @snapback/mail, @snapback/feature-flags, @snapback/utils, @snapback/supabase
  - Updated dependencies across all packages to use new consolidated packages
  - Moved utility functions from @snapback/utils to @snapback/config/src/utils
  - Moved feature flag management to @snapback/contracts/src/feature-manager.ts
  - Updated VS Code extension to use new package structure
  - Updated SDK to use @snapback/infrastructure instead of @snapback/logs
  - Updated all import paths to reflect new package structure

### Patch Changes

- Updated dependencies [884ce9e]
  - @snapback/sdk@0.2.0
  - @snapback/contracts@0.2.0
  - @snapback/core@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [1ad4518]
  - @snapback/core@0.1.1
  - @snapback/storage@0.0.1

## 0.1.1-beta-beta.20251006185958

### Patch Changes

- Updated dependencies
  - @snapback/core@0.1.1-beta-beta.20251006185958
  - @snapback/storage@0.0.1-beta-beta.20251006185958
