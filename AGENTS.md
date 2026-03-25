# AGENTS.md

This file documents conventions and commands for agentic coding agents working in this repository.

> **Status**: This project is in pre-development (documentation/planning phase). Source code has not yet been written. All commands below reflect the _intended_ setup per the design documents. Once `npm install` is run and source files exist, all commands will apply directly.

---

## Project Overview

`publish-skills` is a Node.js CLI tool (distributed via npm as `npx publish-skills`) that allows AI agent skill authors to publish, validate, and manage skills using a Git-based workflow. It targets multiple platforms (GitHub, GitLab, Bitbucket) and multiple AI agent runtimes (Claude, Gemini, Cline).

**Runtime**: Node.js 18.x / 20.x  
**Language**: TypeScript (strict mode)  
**Module format**: CommonJS  
**Package manager**: npm

---

## Build, Lint, Test, and Format Commands

```bash
# Install dependencies
npm install

# Compile TypeScript → dist/
npm run build

# Watch mode (development)
npm run dev

# Run the compiled CLI
npm start

# Lint TypeScript source
npm run lint

# Format all source files
npm run format

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Running a Single Test

```bash
# Run a single test file
npx jest src/__tests__/validators/SkillValidator.test.ts

# Run tests matching a name pattern (substring match)
npx jest -t "should validate skill before publishing"

# Run all tests in a specific directory
npx jest src/__tests__/commands/

# Run a single file + show coverage for it
npx jest --coverage src/__tests__/commands/publish.test.ts
```

> `ts-jest` is used as the TypeScript transformer — no manual compile step is needed before running tests.

---

## Directory Structure

```
publish-skills/
├── src/
│   ├── cli/index.ts             # CLI entry point (Yargs)
│   ├── commands/                # One file per CLI command
│   │   ├── create.ts
│   │   ├── validate.ts
│   │   ├── publish.ts
│   │   ├── auth.ts
│   │   ├── install.ts
│   │   ├── search.ts
│   │   └── list.ts
│   ├── git/
│   │   ├── GitManager.ts
│   │   └── PullRequestCreator.ts
│   ├── config/
│   │   ├── ConfigManager.ts
│   │   └── CredentialManager.ts
│   ├── agents/
│   │   ├── AgentManager.ts
│   │   └── adapters/            # ClaudeAdapter.ts, GeminiAdapter.ts, etc.
│   ├── models/                  # Data model interfaces
│   ├── validators/
│   ├── registry/
│   ├── ui/                      # Terminal UI components
│   ├── utils/                   # Stateless utility functions
│   └── types/index.ts           # Shared TypeScript types
├── src/__tests__/               # Mirror of src/ structure
├── dist/                        # Compiled output (do not edit)
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc.json
└── jest.config.js
```

---

## TypeScript Configuration

Target: `ES2020`, module: `commonjs`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`, `resolveJsonModule: true`. Source root is `src/`, output is `dist/`. Source maps and declaration files are emitted.

---

## Code Style

### Formatting (Prettier)

- **Semicolons**: required
- **Quotes**: single (`'`)
- **Trailing commas**: ES5 style
- **Print width**: 100 characters
- **Indentation**: 2 spaces

Always run `npm run format` before committing.

### Linting (ESLint + @typescript-eslint)

- Extends `eslint:recommended` + `plugin:@typescript-eslint/recommended`
- `@typescript-eslint/explicit-function-return-types`: warn — add return types to all functions
- `@typescript-eslint/no-explicit-any`: warn — avoid `any`; use proper types or `unknown`

### Imports

Order imports in this sequence (separated by blank lines):

```typescript
// 1. Node built-ins
import * as fs from 'fs';
import * as path from 'path';

// 2. Third-party packages
import yargs from 'yargs';
import chalk from 'chalk';

// 3. Internal modules (relative paths)
import { SkillValidator } from '../validators/SkillValidator';
import type { Skill } from '../types';
```

---

## Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| Class files | `PascalCase.ts` | `GitManager.ts`, `SkillValidator.ts` |
| Command files | `camelCase.ts` | `publish.ts`, `create.ts` |
| Utility files | `camelCase.ts` | `download.ts`, `extract.ts` |
| Classes | `PascalCase` | `GitManager`, `PullRequestCreator` |
| Interfaces | `PascalCase` | `Skill`, `PublishConfig`, `PROptions` |
| Functions | `camelCase` | `createBranch`, `validateSkill` |
| Variables | `camelCase` | `skillPath`, `branchName` |
| CLI command names | `kebab-case` strings | `"publish-skills"`, `"validate"` |
| Skill identifiers | `kebab-case` | `my-awesome-skill` |
| Git branch names | `feature/<skill-name>` | `feature/my-awesome-skill` |

---

## Error Handling

Use the custom typed error hierarchy. Do not throw raw `Error` objects for expected failure modes.

```typescript
// Custom error classes (src/types/index.ts or similar)
class SkillError extends Error {
  constructor(
    public code: string,
    message: string,
    public context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'SkillError';
  }
}

class ValidationError extends SkillError {}
class PublishError extends SkillError {}
class InstallError extends SkillError {}
class AuthenticationError extends SkillError {}
class NetworkError extends SkillError {}
```

All command handlers must wrap their logic in a top-level `try/catch`:

```typescript
export const handler = async (argv: Arguments): Promise<void> => {
  try {
    // command logic
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
};
```

Check `error.code` for specific recovery paths (e.g., `'ENOTFOUND'` for network failures). User-facing error messages should include: a clear description, possible causes, and suggested remediation.

---

## Testing Conventions

- **Framework**: Jest + ts-jest
- **Test files**: `src/__tests__/<module>/<ClassName>.test.ts` — mirror the `src/` structure
- **Coverage target**: >80% across the codebase
- **Test structure**: use `describe()` / `it()` blocks

```typescript
describe('SkillValidator', () => {
  it('should accept a valid skill structure', () => { ... });
  it('should reject a skill missing required fields', () => { ... });
  it('should return structured errors with error codes', () => { ... });
});
```

Three levels of tests are planned:
1. **Unit** — isolated class/function tests with mocked dependencies
2. **Integration** — full command workflows against a mock/temp Git repository
3. **E2E** — real scenarios against mock API endpoints

---

## Key Libraries

| Purpose | Library |
|---|---|
| CLI framework | `yargs` + `inquirer` |
| Terminal colors/UI | `chalk`, `cli-table3`, `ora` |
| Git operations | `simple-git` |
| GitHub API | `@octokit/rest` |
| GitLab API | `@gitbeaker/rest` |
| Secure credentials | `keytar` |
| HTTP client | `axios` |
| Validation | `json-schema` |
| Archiving | `tar` |

---

## CI/CD

GitHub Actions runs on every push and pull request:
- Matrix: Node 18.x and 20.x
- Steps: `npm ci` → `npm run lint` → `npm run build` → `npm test`

A separate publish workflow triggers on GitHub release creation and runs `npm publish` using `NPM_TOKEN` from repository secrets.

---

## Important Notes for Agents

- Never edit files in `dist/` — they are compiled output.
- Prefer `interfaces` over `type` aliases for data models; use `type` for unions/intersections.
- Avoid `any`; use `unknown` and narrow with type guards.
- All async functions should have explicit `Promise<T>` return types.
- The `src/types/index.ts` file is the canonical location for shared interfaces and error classes.
- Skill metadata must conform to the `Skill` interface defined in `src/models/Skill.ts`.
- Branch names for publishing follow the `feature/<skill-name>` pattern.
