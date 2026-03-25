# publish-skills

A CLI tool that publishes AI agent skills to Git repositories via Pull/Merge Requests.

```
npx publish-skills publish
```

Skills are contributed as PRs to a Git repo (GitHub, GitLab, Bitbucket). Discovery and
installation are handled by external tools like [npx skills](https://github.com/vercel-labs/agent-skills).

---

## Architecture

```
┌─────────────────────────────────────┐
│  Layer 1: publish-skills (this)     │
│  create · validate · publish        │
└──────────────────┬──────────────────┘
                   │  PR/MR via API
                   v
        ┌─────────────────────┐
        │  Git Repository     │
        │  skills/            │
        │  ├─ skill-abc/      │
        │  └─ skill-xyz/      │
        └─────────────────────┘
                   │
                   v
┌─────────────────────────────────────┐
│  Layer 2: External Package Managers │
│  (discovery · download · install)   │
│  e.g. npx skills  — NOT this tool   │
└─────────────────────────────────────┘
```

---

## Commands

```bash
# Create a new skill from template
npx publish-skills create

# Validate a skill's structure and metadata
npx publish-skills validate [path]

# Publish skill — clones repo, creates branch, opens PR/MR
npx publish-skills publish [skill-path]
npx publish-skills publish --repository production
npx publish-skills publish --branch feature/my-branch
npx publish-skills publish --dry-run

# Authenticate with a Git platform
npx publish-skills login
npx publish-skills logout

# Manage configuration
npx publish-skills config set repositories.default.url <url>
npx publish-skills config get author
npx publish-skills config list
```

---

## Publish Flow

```
npx publish-skills publish
  1. Validate skill structure
  2. Load or prompt for repository config  → ~/.publish-skills/config.json
  3. Clone / update repository locally
  4. Create branch: feature/<skill-name>
  5. Copy skill to skills/<skill-name>/
  6. Commit: "Add skill: <name> v<version>"
  7. Push branch to origin
  8. Create Pull/Merge Request via platform API
  9. Display PR/MR URL
```

---

## Skill Folder Structure

```
my-skill/
├── SKILL.md           # Metadata (name, version, author, agent support)
├── manifest.json      # Agent compatibility config
├── README.md          # Usage guide
└── content/
    ├── prompts/       # Prompt templates (.md)
    ├── templates/     # Code/config templates
    └── resources/     # Images, diagrams, etc.
```

**`SKILL.md` frontmatter:**

```yaml
---
name: my-skill
version: 1.0.0
author: Jane Doe
license: MIT
description: Reusable React patterns
keywords: [react, patterns]
tags: [frontend, javascript]
agents:
  claude:
    supported: true
  gemini:
    supported: true
---
```

---

## Configuration

Stored at `~/.publish-skills/config.json`:

```json
{
  "author": { "name": "Jane Doe", "email": "jane@example.com" },
  "repositories": {
    "default": {
      "platform": "github",
      "url": "https://github.com/org/skills-registry",
      "targetBranch": "main",
      "skillsPath": "skills/"
    }
  },
  "defaultRepository": "default",
  "ui": { "verbosity": "normal" }
}
```

Authentication tokens are stored securely via platform credential managers
(macOS Keychain · Linux Pass · Windows Credential Manager).

---

## Supported Platforms

| Platform        | Phase   | API                   |
|-----------------|---------|-----------------------|
| GitHub          | Phase 1 | `@octokit/rest`       |
| GitLab          | Phase 1 | `@gitbeaker/rest`     |
| Bitbucket       | Phase 1 | `bitbucket`           |
| Self-hosted Git | Phase 2 | Git CLI               |

---

## Quick Start (Development)

```bash
npm install
npm run build
npm link

publish-skills --version
publish-skills create
```

See [ROADMAP.md](ROADMAP.md) for the week-by-week implementation plan and
[PLAN.md](PLAN.md) for requirements, architecture, and data models.
