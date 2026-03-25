# Plan

## Problem Statement

Developers using multiple AI coding agents face fragmentation: skills created for one
agent cannot be easily reused in another, there is no standard way to version or share
them, and they are scattered across disparate repos and configurations.

**Solution**: A focused CLI that standardises skill structure and automates publishing
to Git repositories via PR/MR, with discovery and installation delegated to external
package managers.

---

## Requirements

### Functional

| ID  | Requirement |
|-----|-------------|
| FR1 | Standardised skill file structure uniform across all agents |
| FR2 | Interactive `create` command scaffolds a new skill from template |
| FR3 | `validate` checks structure and metadata against a versioned JSON Schema |
| FR4 | `publish` clones a configured Git repo, creates a branch, and opens a PR/MR |
| FR5 | Support GitHub, GitLab, and Bitbucket as publish targets |
| FR6 | Credentials stored securely via platform-native credential managers |
| FR7 | User can target a central marketplace repo or their own personal repo |
| FR8 | All raised PRs include an attribution marker for marketing attribution |
| FR9 | Installation and discovery are out of scope — delegated to `npx skills` |

### Non-Functional

- **Performance**: Publish flow completes in <30 s on a normal connection
- **Security**: Tokens never stored in plaintext; platform credential managers only
- **Reliability**: Publish command is resumable (`--resume`) after partial failure
- **Maintainability**: TypeScript strict mode, >80% test coverage, semantic versioning
- **UX**: TUI quality comparable to top-tier OSS CLIs (spinners, colours, masked input)

### Target Audience

- Primary: developers using multiple AI coding agents (intermediate to advanced)
- Secondary: teams sharing internal skills across an organisation

---

## Architecture

### Two-Layer Design

```
┌─────────────────────────────────────────────┐
│  publish-skills CLI                         │
│  ├─ create    Generate skill from template  │
│  ├─ validate  Check skill structure         │
│  ├─ publish   Raise PR/MR to Git repo       │
│  ├─ login     Store platform token          │
│  └─ config    Manage user preferences       │
└──────────────────────┬──────────────────────┘
                       │ clone · branch · push · PR/MR API
                       v
           ┌───────────────────────┐
           │  Git Repository       │
           │  skills/              │
           │  ├─ skill-abc/        │
           │  └─ skill-xyz/        │
           └───────────────────────┘
                       │
                       v
┌─────────────────────────────────────────────┐
│  External Package Managers (out of scope)   │
│  Discover · download · install skills       │
│  e.g. npx skills (vercel-labs/agent-skills) │
└─────────────────────────────────────────────┘
```

### Source Directory Layout

```
src/
├── cli/index.ts               CLI entry point (Yargs)
├── commands/
│   ├── create.ts
│   ├── validate.ts
│   ├── publish.ts
│   ├── auth.ts                login / logout
│   ├── install.ts             (Phase 2)
│   ├── search.ts              (Phase 2)
│   └── list.ts                (Phase 2)
├── git/
│   ├── GitManager.ts
│   └── PullRequestCreator.ts
├── config/
│   ├── ConfigManager.ts
│   └── CredentialManager.ts
├── agents/
│   ├── AgentManager.ts
│   └── adapters/              ClaudeAdapter.ts · GeminiAdapter.ts · ClineAdapter.ts
├── models/
│   ├── Skill.ts
│   └── Config.ts
├── validators/
│   └── SkillValidator.ts
├── registry/
│   ├── SkillRegistry.ts
│   └── Ratings.ts
├── ui/
│   └── TUI.ts
├── utils/
│   ├── download.ts
│   └── extract.ts
└── types/index.ts             Shared interfaces and error classes
```

---

## Data Models

### `Skill` (`src/models/Skill.ts`)

```typescript
interface Skill {
  id: string;                          // UUID
  name: string;                        // kebab-case package name
  version: string;                     // semver
  description: string;                 // ≤160 chars
  longDescription?: string;
  author: { name: string; email?: string; url?: string };
  license: string;
  keywords: string[];
  tags: string[];
  agentSupport: Record<string, AgentConfig>;
  dependencies?: Record<string, string>;
  content: {
    prompts: PromptTemplate[];
    workflows: Workflow[];
    templates: Template[];
    resources: Resource[];
  };
  repository?: string;
  publishedAt: Date;
  updatedAt: Date;
}

interface AgentConfig {
  supported: boolean;
  minVersion?: string;
  installPath: string;
  setupScript?: string;
}
```

### `PublishSkillsConfig` (`src/models/Config.ts`)

```typescript
interface PublishSkillsConfig {
  author: { name: string; email?: string };
  repositories: Record<string, RepositoryConfig>;
  defaultRepository: string;
  ui: { verbosity: 'quiet' | 'normal' | 'verbose' };
}

interface RepositoryConfig {
  platform: 'github' | 'gitlab' | 'bitbucket' | 'git';
  url: string;
  localPath: string;
  targetBranch: string;
  skillsPath: string;
}
```

### Error hierarchy (`src/types/index.ts`)

```typescript
class SkillError extends Error {
  constructor(
    public code: string,
    message: string,
    public context: Record<string, unknown> = {}
  ) { super(message); this.name = 'SkillError'; }
}

class ValidationError     extends SkillError {}
class PublishError        extends SkillError {}
class InstallError        extends SkillError {}
class AuthenticationError extends SkillError {}
class NetworkError        extends SkillError {}
```

---

## Key Module APIs

### `GitManager`

```typescript
cloneRepository(url: string, localPath: string): Promise<void>
updateRepository(localPath: string): Promise<void>
createBranch(localPath: string, branchName: string, base: string): Promise<void>
copyFiles(source: string, destination: string): Promise<string[]>
stageFiles(localPath: string, pattern: string): Promise<void>
commit(localPath: string, message: string): Promise<string>
push(localPath: string, branchName: string): Promise<void>
```

### `PullRequestCreator`

```typescript
createGitHubPR(owner: string, repo: string, options: PROptions, token: string): Promise<PullRequest>
createGitLabMR(projectId: string, options: PROptions, token: string): Promise<PullRequest>
createBitbucketPR(workspace: string, repo: string, options: PROptions, token: string): Promise<PullRequest>
```

### `SkillValidator`

```typescript
validateStructure(skillPath: string): ValidationResult
validateMetadata(skill: Skill): ValidationResult
validateContent(skill: Skill): ValidationResult
```

---

## Technology Stack

| Layer            | Library                          | Reason                         |
|------------------|----------------------------------|--------------------------------|
| CLI framework    | `yargs` + `inquirer`             | TUI support, widely adopted    |
| Terminal UI      | `chalk`, `cli-table3`, `ora`     | Colours, tables, spinners      |
| Git operations   | `simple-git`                     | Pure JS, cross-platform        |
| GitHub API       | `@octokit/rest`                  | Official SDK                   |
| GitLab API       | `@gitbeaker/rest`                | Official SDK                   |
| Bitbucket API    | `bitbucket`                      | Official SDK                   |
| Credentials      | `keytar`                         | Platform-native secure storage |
| HTTP             | `axios`                          | General HTTP requests          |
| Validation       | `json-schema`                    | Schema-based structure checks  |
| Archiving        | `tar`                            | Skill packaging                |
| Language         | TypeScript 5 (strict)            | Type safety                    |
| Testing          | `jest` + `ts-jest`               | Standard Node.js stack         |
| Linting          | `eslint` + `@typescript-eslint`  | TypeScript-aware linting       |
| Formatting       | `prettier`                       | Consistent style               |
| CI/CD            | GitHub Actions                   | Free for public repos          |
| Distribution     | NPM registry                     | `npx publish-skills`           |

---

## Success Metrics

| Metric                    | Phase 1 Target | Phase 2 Target |
|---------------------------|----------------|----------------|
| NPM downloads             | 50+ / month    | 500+ / month   |
| Skills published to demo registry | 10+   | 200+           |
| GitHub stars              | 100+           | —              |
| Test coverage             | >80%           | >80%           |
| PR creation success rate  | >95%           | >95%           |

---

## Open Questions

1. **Agent path detection**: auto-detect known agent directories or require explicit config?
2. **Skill dependencies**: should skills declare dependencies on other skills?
3. **Revenue model**: open-source only, or freemium with private registry features?
4. **Launch skills**: which 5–10 example skills should ship with v1.0?
