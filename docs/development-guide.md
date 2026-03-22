# Development Guide

> Generated: 2026-03-21

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** (comes with Node.js)
- **Git** (for worktree features)

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/sudocode-ai/sudocode.git
cd sudocode

# Install all dependencies (workspace-aware)
npm install

# Build all packages (in dependency order)
npm run build
```

### Local Development

```bash
# Link CLI globally for local testing
npm run link

# Start the development server (with hot reload)
npm run dev:server

# Start the frontend dev server (Vite HMR)
npm run dev:frontend

# Watch mode for CLI
npm run dev --workspace=cli
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SUDOCODE_DIR` | Path to .sudocode directory | Auto-detected |
| `NODE_ENV` | Environment mode | `development` |

Secrets are managed with **fnox** (installed via mise). See each project's `fnox.toml` for provider configuration. Never hardcode keys in `.env` or source files.

## Build

### Build All Packages

```bash
npm run build    # Build in dependency order: types → cli → mcp → frontend → server
```

### Build Individual Packages

```bash
npm run build --workspace=types
npm run build --workspace=cli
npm run build --workspace=mcp
npm run build --workspace=frontend
npm run build --workspace=server
npm run build:plugins    # Build all integration plugins
```

### Build SEA Binaries

Single Executable Application binaries for distribution:

```bash
npm run build:sea       # Bundle with esbuild
npm run package:sea     # Package as Node.js SEA
```

## Testing

### Run All Tests

```bash
npm run test           # Run tests in root workspace
npm run test:all       # Run tests across all workspaces
npm run test:summary   # Compact output
```

### Package-Specific Tests

```bash
npm run test:cli       # CLI tests
npm run test:mcp       # MCP tests
npm run test:server    # Server tests
npm run test:frontend  # Frontend tests (Vitest + Testing Library)
npm run test:types     # Types tests
```

### Run Specific Test Files

```bash
npm --prefix cli test -- --run tests/path/to/file.test.ts
npm --prefix server test -- --run tests/unit/specific.test.ts
```

### E2E Tests

```bash
# Frontend E2E with Playwright
npm --prefix frontend run test:e2e

# Server integration tests
RUN_E2E_TESTS=true npm --prefix server run test:e2e
```

### Test Organization

| Package | Test Location | Framework |
|---------|--------------|-----------|
| cli | `cli/tests/` | Vitest |
| mcp | `mcp/tests/unit/`, `mcp/tests/integration/` | Vitest |
| server | `server/tests/unit/`, `server/tests/integration/` | Vitest + Supertest |
| frontend | `frontend/tests/components/`, `tests/pages/`, `tests/hooks/` | Vitest + Testing Library |
| frontend | `frontend/tests/e2e/` | Playwright |
| types | `types/tests/` | Vitest |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build all packages in dependency order |
| `npm run test` | Run all tests |
| `npm run dev:server` | Start server with hot reload |
| `npm run dev:frontend` | Start frontend with Vite HMR |
| `npm run link` | Link CLI globally (`./scripts/link.sh`) |
| `npm run unlink` | Unlink global CLI packages |
| `npm run version` | Bump version across all packages (`./scripts/version.sh`) |
| `npm run publish` | Publish to npm (`./scripts/publish.sh`) |
| `npm run publish:dry-run` | Dry-run publish |
| `npm run sync-deps` | Sync dependency versions across packages |
| `npm run clean` | Clean build artifacts |
| `npm run build:sea` | Build Single Executable Application bundles |
| `npm run package:sea` | Package SEA binaries |

## Code Style

- **TypeScript** strict mode enabled across all packages
- **ESM modules** (`"type": "module"` in all package.json)
- **Prettier** for formatting (frontend)
- **ESLint** for linting (frontend)
- Path aliases in frontend: `@/*` → `./src/*`

## Common Development Tasks

### Adding a New CLI Command

1. Create `cli/src/cli/my-commands.ts`
2. Register command in `cli/src/cli.ts`
3. Implement operation in `cli/src/operations/`
4. Add tests in `cli/tests/`

### Adding a New API Endpoint

1. Create route in `server/src/routes/my-route.ts`
2. Add service logic in `server/src/services/`
3. Register route in `server/src/index.ts`
4. Add tests in `server/tests/`

### Adding a New Frontend Page

1. Create page in `frontend/src/pages/MyPage.tsx`
2. Add route in `frontend/src/App.tsx`
3. Add navigation in `frontend/src/components/layout/Sidebar.tsx`
4. Create hooks in `frontend/src/hooks/`
5. Add tests in `frontend/tests/pages/`

### Adding a New Integration Plugin

1. Create package in `plugins/integration-myservice/`
2. Implement `IntegrationPlugin` interface
3. Export as default from `src/index.ts`
4. Add to root `package.json` workspaces
5. Register in CLI plugin loader

## CI/CD

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `test.yml` | Push, PR | Run tests across all packages |
| `publish.yml` | Release tag | Publish to npm |
| `build-binaries.yml` | Release | Build SEA binaries for distribution |
| `version_test.yml` | PR | Verify version consistency |
