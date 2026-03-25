<div align="center">

# 🚀 publish-skills

[![NPM Version](https://img.shields.io/npm/v/publish-skills?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/publish-skills)
[![License](https://img.shields.io/npm/l/publish-skills?style=for-the-badge)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/your-username/publish-skills/publish.yml?style=for-the-badge&logo=github)](https://github.com/your-username/publish-skills/actions)
[![GitHub Pages](https://img.shields.io/badge/docs-github%20pages-667eea?style=for-the-badge&logo=github)](https://jindalanuj.github.io/publish-skills/)
[![Code Style](https://img.shields.io/badge/code%20style-prettier-ff69b4?style=for-the-badge&logo=prettier)](https://prettier.io)

**Publish AI agent skills to Git repositories in one command.**

</div>

---

## ⚡ Quick Start

```bash
npx publish-skills publish
```

That's it! Your skill is now a Pull Request away from being shared with the world.

---

## 🎯 What Does It Do?

`publish-skills` bridges the gap between **creating** AI agent skills and **sharing** them with the community.

### The Magic Combo: `publish-skills` + `skills`

| Step | Tool               | What It Does                                             |
| ---- | ------------------ | -------------------------------------------------------- |
| 1️⃣   | **publish-skills** | 📤 Publish your skill to a Git repository via PR/MR      |
| 2️⃣   | **skills** (npx)   | 🔍 Discover, download & install skills from the registry |

```mermaid
graph LR
    A[You create a skill] --> B[npx publish-skills publish]
    B --> C[PR to skills repo]
    C --> D[Skills package manager]
    D --> E[Everyone can install!]
```

**Together, they create a complete ecosystem:**

- **Publish** your skills once with `publish-skills`
- **Share** them via a central Git repository
- **Discover** them with `npx skills find <topic>`
- **Install** them with `npx skills add <repo-or-skill>`

---

## 📦 What's a Skill?

A **skill** is a reusable package of instructions that supercharge AI agents like Claude, Gemini, Cursor, and 40+ others.

```
my-awesome-skill/
├── SKILL.md           # 📋 Required: YAML frontmatter + instructions
├── README.md          # 📖 Optional: Usage documentation
└── content/           # 📁 Optional: Prompts, templates, resources
    ├── prompts/
    ├── templates/
    └── resources/
```

### SKILL.md Format

```markdown
---
name: my-skill
description: What this skill does and when to use it
---

# My Skill

Detailed instructions for the agent to follow when this skill is activated.

## When to Use

Describe the scenarios where this skill should be used.

## Steps

1. First, do this
2. Then, do that
```

**Required fields:**

- `name`: Unique identifier (lowercase, hyphens allowed)
- `description`: Brief explanation (1-2 sentences)

**Optional fields:**

- `metadata.internal`: Set to `true` to hide from normal discovery (WIP/internal skills)

That's it! No separate `manifest.json` needed. The `SKILL.md` file contains everything.

---

## 🎨 Commands at a Glance

```bash
# 🏗️  Create a new skill from template
npx publish-skills create

# ✅ Validate your skill before publishing
npx publish-skills validate [path]

# 🚀 Publish your skill (creates PR/MR)
npx publish-skills publish [skill-path]

# 🔐 Login/Logout to Git platforms
npx publish-skills login
npx publish-skills logout

# ⚙️  Manage configuration
npx publish-skills config list
npx publish-skills config set <key> <value>
```

---

## 🔧 How It Works

### 1. **Create** Your Skill

```bash
npx publish-skills create
```

Interactive wizard guides you through:

- Skill name & description
- Target AI agents (Claude, Gemini, Cursor, etc.)
- License selection

### 2. **Build** Your Skill

Add content to the generated structure. Edit `SKILL.md` with your instructions. Optionally add `content/` with prompts, templates, and resources.

### 3. **Publish** Your Skill

```bash
npx publish-skills publish
```

The tool:

1. ✅ Validates your skill structure
2. 🔐 Loads your Git credentials
3. 📥 Clones the target repository
4. 🌿 Creates a feature branch
5. 📁 Copies your skill to `skills/<your-skill>/`
6. 💾 Commits with a clear message
7. 🚀 Pushes the branch
8. 🔀 Opens a Pull/Merge Request
9. 🎉 Displays the PR URL

### 4. **Share** with the World

Once your PR is merged to the skills repository, anyone can install your skill:

```bash
# List available skills in a repo
npx skills add vercel-labs/agent-skills --list

# Install a specific skill
npx skills add vercel-labs/agent-skills --skill my-awesome-skill

# Install all skills from a repo
npx skills add vercel-labs/agent-skills --all

# Install to specific agents
npx skills add vercel-labs/agent-skills -a claude-code -a cursor

# Install globally (available in all projects)
npx skills add vercel-labs/agent-skills -g --skill my-awesome-skill
```

---

## 🛠️ Setup & Configuration

### First-Time Setup

```bash
# 1. Login to your Git platform (GitHub/GitLab/Bitbucket)
npx publish-skills login

# 2. Configure the target repository
# Example for GitHub:
npx publish-skills config set repositories.default.url https://github.com/your-org/skills-repo
# Example for GitLab:
npx publish-skills config set repositories.default.url https://gitlab.com/your-group/skills-repo
# Example for Bitbucket:
npx publish-skills config set repositories.default.url https://bitbucket.org/your-team/skills-repo

# 3. Publish your first skill!
npx publish-skills publish ./my-skill
```

### Configuration File

Settings stored at `~/.publish-skills/config.json`:

```json
{
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "repositories": {
    "default": {
      "platform": "github",
      "url": "https://github.com/your-org/skills-repo",
      "targetBranch": "main",
      "skillsPath": "skills/"
    }
  },
  "defaultRepository": "default"
}
```

---

## 🌟 Why Use publish-skills?

| ✅ Feature                 | Benefit                              |
| -------------------------- | ------------------------------------ |
| **One-command publishing** | No manual Git operations             |
| **Multi-platform**         | GitHub, GitLab, Bitbucket            |
| **Secure credentials**     | Stored in platform-native keychains  |
| **PR-based workflow**      | Review process, attribution, history |
| **Agent-agnostic**         | Works with 40+ AI coding agents      |
| **Open ecosystem**         | Anyone can create and share skills   |

---

## 🔒 Supported Git Platforms

| Platform        | Status     | API Library       |
| --------------- | ---------- | ----------------- |
| GitHub          | ✅ Phase 1 | `@octokit/rest`   |
| GitLab          | ✅ Phase 1 | `@gitbeaker/rest` |
| Bitbucket       | ✅ Phase 1 | `bitbucket`       |
| Self-hosted Git | 🚧 Phase 2 | Git CLI           |

---

## 🤖 Supported AI Agents

The `skills` package manager supports **40+ agents**, including:

| Agent           | `--agent` flag   |
| --------------- | ---------------- |
| Claude Code     | `claude-code`    |
| Cursor          | `cursor`         |
| GitHub Copilot  | `github-copilot` |
| Cline           | `cline`          |
| OpenCode        | `opencode`       |
| Codex           | `codex`          |
| Windsurf        | `windsurf`       |
| OpenHands       | `openhands`      |
| And 30+ more... |                  |

See the [full list](https://github.com/vercel-labs/skills#supported-agents) in the skills documentation.

---

## 🚀 For Developers

### Local Development

```bash
# Clone and setup
git clone https://github.com/your-username/publish-skills
cd publish-skills
npm install

# Build
npm run build

# Link for testing
npm link

# Try it out
publish-skills --version
publish-skills create
```

### Tech Stack

- **Language**: TypeScript 5 (strict mode)
- **CLI**: yargs + inquirer
- **Git**: simple-git
- **APIs**: @octokit/rest, @gitbeaker/rest, bitbucket
- **Security**: keytar (platform-native credential storage)
- **UI**: chalk, ora, cli-table3

---

## 📄 License

MIT © [Anuj Jindal](https://www.linkedin.com/in/anuj-jindal-profile/)

---

## 🙋 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/publish-skills/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/publish-skills/discussions)
- **LinkedIn**: [Anuj Jindal](https://www.linkedin.com/in/anuj-jindal-profile/)

---

## 🔗 Related

- **[skills](https://www.npmjs.com/package/skills)** - The companion package manager for discovering and installing skills
- **[skills GitHub repo](https://github.com/vercel-labs/skills)** - Skills package source and documentation
- **[skills.sh](https://skills.sh)** - Skills directory and discovery
- **[ROADMAP.md](./ROADMAP.md)** - Implementation plan and future features
- **[PLAN.md](./PLAN.md)** - Requirements, architecture, and data models

---

<div align="center">

**Made with ❤️ for the AI agent community**

[⭐ Star this repo](https://github.com/your-username/publish-skills) • [🐦 Follow on Twitter](https://twitter.com/your-handle) • [💼 Connect on LinkedIn](https://www.linkedin.com/in/anuj-jindal-profile/)

</div>
