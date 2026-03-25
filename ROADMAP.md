# Roadmap

## Phase 1: MVP (Weeks 1–4)

**Goal**: `npx publish-skills publish` creates a PR/MR in a Git repository.

---

### Week 1 — Project Setup & Core Models

**Task 1.1: Repository scaffold**
- [ ] Initialize Node.js/TypeScript project (`npm init`, `tsconfig.json`)
- [ ] Create directory structure (`src/`, `src/__tests__/`)
- [ ] Configure ESLint, Prettier, ts-jest
- [ ] Set up Commitlint + Husky for semantic versioning
- [ ] Create GitHub Actions CI/CD (test + publish workflows)

**Deliverable**: Runnable TypeScript project with passing CI.

**Task 1.2: Skill model & validator**

File: `src/models/Skill.ts`
```typescript
interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  tags: string[];
  agents: string[];
  schemaVersion: string;
  content: {
    prompts: PromptTemplate[];
    workflows: Workflow[];
    resources: string[];
  };
}
```

File: `src/validators/SkillValidator.ts`
- Validate structure against versioned JSON Schema (`schemaVersion`)
- Check required fields and semantic versioning
- Ensure correct file/folder layout

**Deliverable**: Skill model types and `SkillValidator` with >80% test coverage.

---

### Week 2 — CLI Core & Commands

**Task 2.1: CLI framework** (`src/cli/index.ts`)
- Yargs + Inquirer.js + Ora spinners + Chalk
- Global options: `--verbose`, `--config`
- Help system and strict command routing

**Task 2.2: `create` command** (`src/commands/create.ts`)
- Interactive prompts for name, description, author, target agents
- Generate skill folder with `SKILL.md`, `manifest.json`, `README.md`, `content/`

**Task 2.3: `validate` command** (`src/commands/validate.ts`)
- Check required files present
- Validate `manifest.json` and `SKILL.md` contents
- Schema version backward compatibility

**Task 2.4: `login` / `logout`** (`src/commands/auth.ts`)
- Prompt for platform token
- Save/delete via `CredentialManager`

**Deliverable**: `create`, `validate`, `login`, `logout` all working.

---

### Week 3 — Git Publishing Core

**Task 3.1: Git infrastructure**

`src/git/GitManager.ts`
- Clone / update repositories (`simple-git`)
- Create feature branches (`feature/<skill-name>`)
- Copy files, stage, commit, push
- Handle GitHub / GitLab / Bitbucket authentication

`src/config/ConfigManager.ts`
- Load/save `~/.publish-skills/config.json`
- Multiple repository configurations

`src/config/CredentialManager.ts`
- Secure token storage via `keytar`
  (macOS Keychain · Linux Pass · Windows Credential Manager)

**Task 3.2: `publish` command** (`src/commands/publish.ts`)
```
1. Validate skill
2. Load/prompt for repository config
3. Clone or update repository
4. Create feature branch
5. Copy skill → skills/<skill-name>/
6. Inject attribution marker
7. Commit: "Add skill: <name> v<version>"
8. Push branch
9. Create PR/MR
10. Display PR/MR URL
```

**Task 3.3: PR/MR creator** (`src/git/PullRequestCreator.ts`)
- GitHub via `@octokit/rest`
- GitLab via `@gitbeaker/rest`
- Bitbucket via `bitbucket`
- Auto-generate description from `SKILL.md`

**Deliverable**: `publish` creates a real PR/MR on all three platforms.

---

### Week 4 — TUI, Tests & Documentation

**Task 4.1: Terminal UI** (`src/ui/TUI.ts`)
- Interactive menus for repository selection
- Ora progress indicators for Git operations
- Masked credential input
- Colour-coded success/error/info messages

**Task 4.2: Tests**
- Unit tests for every class/command (`src/__tests__/`)
- Integration test: full publish flow against a mock/temp repository
- Coverage target: >80%

**Task 4.3: Example skills**
- `skill-nodejs-best-practices`
- `skill-typescript-strict-mode`
- `skill-testing-patterns`

**Task 4.4: Documentation**
- Update `README.md` with final command reference
- Publish to NPM

### Phase 1 Checklist

- [ ] Project scaffold + CI/CD
- [ ] Skill model and validator
- [ ] `create`, `validate`, `login`, `logout` commands
- [ ] `GitManager`, `CredentialManager`, `ConfigManager`
- [ ] `PullRequestCreator` (GitHub, GitLab, Bitbucket)
- [ ] `publish` command end-to-end
- [ ] Terminal UI with progress indicators
- [ ] Unit tests >80% coverage
- [ ] 3 example skills
- [ ] Published to NPM

**Success criteria**:
- `npx publish-skills --version` works
- `npx publish-skills create` launches interactive wizard
- `npx publish-skills validate` correctly validates/rejects skills
- `npx publish-skills publish` creates a PR/MR on GitHub, GitLab, and Bitbucket
- GitHub Actions tests pass on Node 18 and 20

---

## Phase 2: Registry & Community (Weeks 5–8)

> `publish-skills` stays focused on publishing only. Installation and discovery remain
> delegated to external package managers (e.g. `npx skills`).

- [ ] Template GitHub repository structure for skill registries
- [ ] Default central marketplace repository
- [ ] CLI option to publish directly to the marketplace repo
- [ ] Agent directory scanning (detect locally installed skills)
- [ ] GitHub Discussions community setup
- [ ] Optional privacy-first telemetry
- [ ] Plugin system for custom Git platforms

---

## Phase 3: Enterprise (Weeks 9+)

- [ ] Enhanced GitLab / Bitbucket / self-hosted Git support
- [ ] Package signing (GPG) and integrity verification
- [ ] Audit logs and access controls
- [ ] Malware scanning for submitted skills
- [ ] Team management and approval workflows
- [ ] Bulk publishing and dependency management
- [ ] CI/CD pipeline integration templates

---

## Risk Register

| Risk                   | Phase | Mitigation                                          |
|------------------------|-------|-----------------------------------------------------|
| Agent API changes      | 1–2   | Extensible adapter pattern from day one             |
| Low adoption           | 2     | Strong docs, example skills, community outreach     |
| Security vulnerabilities | 3   | Third-party audit, responsible disclosure policy    |
| Scaling issues         | 3     | Database migration, CDN for large skill archives    |
