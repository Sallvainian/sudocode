# Development Guide

> Generated: 2026-03-22

sudocode is a git-native context management system for AI-assisted software development. This guide covers everything needed to build, test, and contribute to the project.

- **Version:** 0.2.0
- **License:** Apache-2.0
- **Runtime:** TypeScript on Node.js, ESM modules

---

## Prerequisites

| Tool | Minimum Version |
|------|-----------------|
| Node.js | >= 18.0.0 |
| npm | >= 7.0.0 (workspace support required) |
| Git | Latest stable |

---

## Monorepo Structure

The project uses npm workspaces to manage multiple packages with shared dependencies.

```
sudocode/
├── types/              # Shared TypeScript definitions (no deps, build first)
├── cli/                # CLI (@sudocode-ai/cli) - core operations, depends on types
├── mcp/                # MCP server (@sudocode-ai/mcp) - wraps CLI via child_process
├── server/             # Local backend (@sudocode-ai/local-server) - depends on cli
├── frontend/           # React UI (@sudocode-ai/local-ui) - talks to server via REST/WS
├── sudocode/           # Meta-package (bundles all)
├── plugins/            # Integration plugins (loaded dynamically via plugin-loader.ts)
└── .sudocode/          # Example project data (self-hosting)
```

**Dependency graph:** `types` -> `cli` -> `mcp` (wraps via child_process, no direct DB access)
**Independent:** `frontend` communicates with `server` over REST/WebSocket
**Embedding:** Server embeds frontend dist via `scripts/copy-frontend.js`

---

## Setup

```bash
# Clone the repository
git clone https://github.com/sudocode-ai/sudocode.git
cd sudocode

# Install all dependencies (workspace-aware)
npm install

# Build all packages in dependency order
npm run build  # types -> cli -> mcp -> frontend -> server
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SUDOCODE_DIR` | Path to .sudocode directory | Auto-detected |
| `NODE_ENV` | Environment mode | `development` |

Secrets are managed with **fnox** (installed via mise). See each project's `fnox.toml` for provider configuration. Never hardcode keys in `.env` or source files.

---

## Build

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build all packages (ordered: types -> cli -> mcp -> frontend -> server) |
| `npm run build:cli` | Build CLI only |
| `npm run build:mcp` | Build MCP only |
| `npm run build:server` | Build frontend + server |
| `npm run build:frontend` | Build frontend only |
| `npm run build:plugins` | Build all integration plugins |
| `npm run build:sea` | Build SEA bundles (esbuild) |
| `npm run package:sea` | Package SEA binaries (6 platforms) |

Build order matters. The `types` package must be built before anything else, since every other package depends on its type definitions.

### SEA (Single Executable Application) Binaries

sudocode can be distributed as standalone binaries built with Node 22's SEA support.

1. `npm run build:sea` bundles each package with esbuild into single-file entry points
2. `npm run package:sea` wraps them as platform-specific Node.js SEA binaries

Six platforms are supported: linux-x64, linux-x64-musl, linux-arm64, darwin-x64, darwin-arm64, win-x64.

**Install via script:**

```bash
curl -fsSL https://raw.github.com/sudocode-ai/sudocode/main/install.sh | sh
```

The installer is XDG-compliant: it installs to `~/.local/share/sudocode` with symlinks in `~/.local/bin`.

---

## Development

### Local Development Servers

| Command | Description |
|---------|-------------|
| `npm run dev:server` | Start server with hot reload (tsx watch, port 3000) |
| `npm run dev:frontend` | Start Vite dev server with HMR |

### Global Linking

```bash
npm run link      # Link packages globally for local testing
npm run unlink    # Unlink global packages
```

### Other Scripts

| Command | Description |
|---------|-------------|
| `npm run version` | Bump version across all packages (`./scripts/version.sh`) |
| `npm run publish` | Publish to npm (`./scripts/publish.sh`) |
| `npm run publish:dry-run` | Dry-run publish |
| `npm run sync-deps` | Sync dependency versions across packages |
| `npm run clean` | Clean build artifacts |

---

## Testing

### Frameworks

- **Vitest 3.2** for unit and integration tests across all packages
- **Playwright 1.57** for frontend end-to-end tests

### Run Tests

| Command | Scope |
|---------|-------|
| `npm test` / `npm run test` | Run all tests |
| `npm run test:cli` | CLI tests |
| `npm run test:mcp` | MCP tests |
| `npm run test:server` | Server tests |
| `npm run test:frontend` | Frontend tests (Vitest + Testing Library) |
| `npm run test:types` | Types tests |
| `npm run test:summary` | Compact output across all packages |
| `npm run test:e2e` | Frontend E2E (Playwright) |
| `npm run test:ui` | Frontend Vitest UI |

### Run a Specific Test File

```bash
npm --prefix <package> test -- --run tests/path/to/file.test.ts
```

Examples:

```bash
npm --prefix cli test -- --run tests/operations/specs.test.ts
npm --prefix server test -- --run tests/unit/execution-service.test.ts
```

### Test Organization

| Package | Test Location | Framework |
|---------|--------------|-----------|
| types | `types/tests/` | Vitest |
| cli | `cli/tests/` | Vitest |
| mcp | `mcp/tests/unit/`, `mcp/tests/integration/` | Vitest |
| server | `server/tests/unit/`, `server/tests/integration/` | Vitest + Supertest |
| frontend | `frontend/tests/components/`, `tests/pages/`, `tests/hooks/`, `tests/contexts/` | Vitest + Testing Library |
| frontend (E2E) | `frontend/tests/e2e/` | Playwright |

**Naming conventions:** `*.test.ts` for unit tests, `*.test.tsx` for React component tests.

---

## Code Style

- TypeScript strict mode across all packages
- ESM modules (`"type": "module"` in all package.json files)
- Path aliases in frontend: `@/*` maps to `./src/*`

### Frontend Formatting and Linting

The frontend package uses Prettier (with prettier-plugin-tailwindcss) and ESLint.

```bash
npm run format --prefix frontend   # Format frontend code with Prettier
npm run lint --prefix frontend     # Lint frontend code with ESLint
```

Run formatting on modified files before committing.

---

## Database

- **Engine:** SQLite via better-sqlite3, WAL mode enabled
- **Schema:** Defined in `types/src/schema.ts`
- **Migrations:** Managed in `types/src/migrations.ts`
- **Cache DB:** `.sudocode/cache.db` is gitignored and rebuilt from JSONL files on sync

The SQLite database serves as a query cache. The authoritative data lives in JSONL files (or markdown files, depending on `sourceOfTruth` config). After a `git pull`, the cache is rebuilt automatically during sync.

---

## CI/CD

Three GitHub Actions workflows handle continuous integration and delivery.

### test.yml

- **Trigger:** Pull requests to main
- **Environment:** Node 22
- **Steps:** `npm ci` -> `npm run build` -> `npm test`

### publish.yml

- **Trigger:** Manual dispatch
- **Publishes to NPM** in dependency order: types -> cli -> mcp -> server -> sudocode
- **Supports dist-tags:** latest, beta, alpha, next
- **NPM provenance** enabled for supply chain security

### build-binaries.yml

- **Trigger:** Manual dispatch
- **Builds SEA binaries** for 6 platforms: linux-x64, linux-x64-musl, linux-arm64, darwin-x64, darwin-arm64, win-x64
- **Integration tests** run on native hardware for each platform
- **Creates a GitHub release** with the built binaries

---

## NPM Packages

The following packages are published to npm:

| Order | Package | npm Name |
|-------|---------|----------|
| 1 | types | `@sudocode-ai/types` |
| 2 | cli | `@sudocode-ai/cli` |
| 3 | mcp | `@sudocode-ai/mcp` |
| 4 | server | `@sudocode-ai/local-server` |
| 5 | sudocode | `sudocode` (meta-package) |

Packages must be published in this order due to their dependency chain.

---

## Distribution & Packaging

### NPM Publishing

Packages are published to npm in dependency order via GitHub Actions (`publish.yml`) or the `scripts/publish.sh` script.

**Publish order (must follow dependency chain):**

```
1. @sudocode-ai/types      ← standalone, no deps
2. @sudocode-ai/cli         ← depends on types
3. @sudocode-ai/mcp         ← depends on cli + types
4. @sudocode-ai/local-server ← depends on cli + types + plugins
5. sudocode                  ← meta-package, bundles 1-4
```

**Manual publish:**
```bash
./scripts/publish.sh               # Publish all (runs tests, builds, publishes)
./scripts/publish.sh --dry-run     # Preview without publishing
./scripts/publish.sh --tag beta    # Publish with dist-tag
./scripts/publish.sh --skip-tests  # Skip test step
```

The publish script:
- Validates npm authentication
- Checks for already-published versions (skips if already on registry)
- Builds all packages including plugins
- Publishes each package with `--provenance` (npm provenance attestation)
- Cleans `node_modules` in the meta-package before packing to avoid bundling workspace deps

**CI publish (`publish.yml`):**
- Trigger: Manual workflow dispatch
- Inputs: dist-tag (latest/beta/alpha/next), skip-tests toggle
- Uses Node 20 with npm provenance via OIDC

### SEA Binary Distribution

sudocode produces standalone binaries via Node.js Single Executable Applications (SEA). These require no Node.js installation on the target machine.

**Build pipeline:**

```
1. npm run build:sea     ← esbuild bundles (CJS for SEA compatibility)
   ├── dist/sea/cli-bundle.js
   ├── dist/sea/mcp-bundle.js
   └── dist/sea/server-bundle.js

2. npm run package:sea   ← platform-specific packaging
   ├── Download Node 22.12.0 binaries for each target
   ├── Generate SEA blobs from bundles
   ├── Inject blobs into Node binaries (via postject)
   ├── Download better-sqlite3 prebuilts (native addon)
   ├── Copy frontend dist → package/public/
   ├── Code-sign on macOS (ad-hoc)
   └── Create archives + SHA256 checksums
```

**Supported platforms (6):**

| Platform | Binary | Archive |
|----------|--------|---------|
| `linux-x64` | ELF | `.tar.gz` |
| `linux-x64-musl` | ELF (Alpine/musl) | `.tar.gz` |
| `linux-arm64` | ELF (aarch64) | `.tar.gz` |
| `darwin-x64` | Mach-O (Intel Mac) | `.tar.gz` |
| `darwin-arm64` | Mach-O (Apple Silicon) | `.tar.gz` |
| `win-x64` | PE (.exe) | `.zip` |

**CI binary builds (`build-binaries.yml`):**
- 5-step pipeline: build → package (parallel per platform) → test (native hardware) → test-windows → release
- Integration tests on each platform: version, init, spec CRUD, issue CRUD, link, server health, sync, MCP, XDG install simulation
- Windows tests run under PowerShell
- Alpine (musl) tests run in Docker

**Package structure:**
```
sudocode-0.2.0-darwin-arm64/
├── bin/
│   ├── sudocode          # CLI binary
│   ├── sdc               # CLI symlink alias
│   ├── sudocode-server   # Server binary
│   └── sudocode-mcp      # MCP server binary
├── lib/
│   └── better-sqlite3.node  # Native addon (platform-specific prebuild)
└── public/               # Frontend static files (served by sudocode-server)
```

**User installation:**
```bash
# One-line install (XDG-compliant)
curl -fsSL https://raw.github.com/sudocode-ai/sudocode/main/install.sh | sh

# Options
curl ... | sh -s -- --dev          # Install latest dev build
curl ... | sh -s -- --version 0.2.0  # Install specific version
```

The installer:
- Detects platform (linux/darwin, x64/arm64, glibc/musl)
- Downloads manifest.json from the latest GitHub release
- Downloads platform archive and verifies SHA256 checksum
- Installs to `~/.local/share/sudocode/`
- Creates symlinks in `~/.local/bin/` (sudocode, sdc, sudocode-server, sudocode-mcp)
- Adds `~/.local/bin` to PATH (shell-aware: bash/zsh/fish)

### Version Management

```bash
./scripts/version.sh 0.3.0    # Set version across all packages
```

This updates `version` in all `package.json` files (root, types, cli, mcp, server, sudocode, plugins) and the `VERSION` constant in `cli/src/version.ts`.

---

## Architecture Notes

### Build Order

Types must build first. Every other package depends on the shared type definitions. The root `npm run build` script handles ordering automatically.

### Server Embeds Frontend

The production server serves the frontend as static files. The `scripts/copy-frontend.js` script copies the Vite build output into the server's dist directory during `build:server`.

### MCP Wraps CLI

The MCP server does not access the database directly. It spawns the CLI as a child process, keeping a clean separation between the MCP protocol layer and the data operations.

### Plugin System

Integration plugins under `plugins/` are loaded dynamically at runtime via `plugin-loader.ts`. Each plugin implements the `IntegrationPlugin` interface and exports a default from its `src/index.ts`.

---

## Common Development Tasks

### Adding a New CLI Command

1. Create the command handler in `cli/src/cli/my-commands.ts`
2. Register the command in `cli/src/cli.ts`
3. Implement the operation logic in `cli/src/operations/`
4. Add tests in `cli/tests/`

### Adding a New API Endpoint

1. Create the route in `server/src/routes/my-route.ts`
2. Add service logic in `server/src/services/`
3. Register the route in `server/src/index.ts`
4. Add tests in `server/tests/`

### Adding a New Frontend Page

1. Create the page component in `frontend/src/pages/MyPage.tsx`
2. Add a route in `frontend/src/App.tsx`
3. Add navigation in `frontend/src/components/layout/Sidebar.tsx`
4. Create hooks in `frontend/src/hooks/`
5. Add tests in `frontend/tests/pages/`

### Adding a New Integration Plugin

1. Create a package in `plugins/integration-myservice/`
2. Implement the `IntegrationPlugin` interface
3. Export as default from `src/index.ts`
4. Add to root `package.json` workspaces
5. Register in CLI plugin loader
