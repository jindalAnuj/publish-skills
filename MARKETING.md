# Marketing Guide for publish-skills

This document outlines strategies and directories for promoting `publish-skills` and increasing visibility.

---

## Ecosystem Positioning

`publish-skills` is a **companion tool** to the Vercel Labs `skills` package:

| Package | Purpose | Command |
|---------|---------|---------|
| **skills** (Vercel Labs) | Install, discover, and manage skills | `npx skills add/find/list` |
| **publish-skills** | Create and publish skills via PR | `npx publish-skills publish` |

**Key message**: "The easiest way to contribute skills to the `npx skills` ecosystem"

---

## Skill Directories and Registries

Submit `publish-skills` to these directories for visibility:

### Primary Directories (Submit First)

| Directory | URL | How to Submit | Priority |
|-----------|-----|---------------|----------|
| **ClawHub** | [clawhub.ai](https://clawhub.ai) | `clawhub publish` CLI | High |
| **Agent Skill Hub** | [agentskillhub.dev](https://doc.agentskillhub.dev) | GitHub import | High |
| **Awesome Agent Skills** | [awesomeagentskills.dev](https://awesomeagentskills.dev) | Web submission | High |
| **AgenticSkills** | [agenticskills.io/submit](https://agenticskills.io/submit) | Web form | High |
| **Local Skills** | [localskills.sh](https://localskills.sh) | `localskills publish` CLI | Medium |
| **SkillReg** | [skillreg.dev](https://skillreg.dev) | Via dashboard | Medium |
| **ARegistry** | [aregistry.ai](https://aregistry.ai/docs/skills/publish/) | Documentation-based | Medium |
| **Tank** | [tankpkg.dev](https://www.tankpkg.dev/docs/publishing) | Via Tank CLI | Medium |

### GitHub Awesome Lists

| Repository | Stars | How to Submit |
|------------|-------|---------------|
| [philipbankier/awesome-agent-skills](https://github.com/philipbankier/awesome-agent-skills) | - | Pull Request |
| [seb1n/awesome-ai-agent-skills](https://github.com/seb1n/awesome-ai-agent-skills) | - | Pull Request (see CONTRIBUTING.md) |
| [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | 48k+ | Pull Request |
| [agent-skills-hub/agent-skills-hub](https://github.com/agent-skills-hub/agent-skills-hub) | - | Pull Request |

### MCP Directories (Future - when MCP publishing is added)

| Directory | URL | How to Submit |
|-----------|-----|---------------|
| **MCP Servers** | [mcpservers.org/submit](https://mcpservers.org/submit) | Web form |
| **best-of-mcp-servers** | [GitHub](https://github.com/tolkonepiu/best-of-mcp-servers) | PR or Issue |
| **TensorBlock awesome-mcp** | [GitHub](https://github.com/TensorBlock/awesome-mcp-servers) | Pull Request |

---

## GitHub Repository Marketing

### 1. Optimize GitHub Topics

Add these topics to the repository settings:

```
ai, agent, skills, cli, typescript, github, gitlab, bitbucket, 
claude, cursor, gemini, copilot, devtools, automation, 
agent-skills, agentic-skills, vercel, openclaw
```

### 2. README Optimization Checklist

- [ ] Clear one-line value proposition at top
- [ ] Badges: npm version, downloads, license, build status
- [ ] "Works With" section showing compatible agents
- [ ] Quick start (3 steps or less)
- [ ] Feature comparison table
- [ ] Star history chart (increases conversions ~15%)
- [ ] GIF/video demo of the tool in action

### 3. Get First 100 Stars

1. **Personal network** - Message colleagues, friends, Twitter followers
2. **Relevant Discord/Slack communities** - AI, developer tools, open source
3. **Reddit** - r/programming, r/node, r/typescript, r/MachineLearning
4. **Chinese awesome lists** - Higher acceptance rates for backlinks

### 4. GitHub Trending Strategy

Coordinate launches across multiple platforms on the same day:
- Post to Hacker News (Show HN)
- Post to relevant subreddits
- Tweet thread with demo
- Dev.to article

This creates a spike that can trigger GitHub Trending.

---

## NPM Package Marketing

### Keywords (30 total - current)

```json
"keywords": [
  "cli", "git", "publish", "skills", "ai", "agent",
  "github", "gitlab", "bitbucket", "claude", "claude-code",
  "cursor", "gemini", "gemini-cli", "copilot", "codex",
  "windsurf", "mcp", "llm", "ai-coding", "ai-skills",
  "agent-skills", "agentic", "devtools", "vercel-labs",
  "openclaw", "clawhub", "skill-publishing", "pull-request",
  "npx-skills"
]
```

### NPM Visibility Tactics

1. **Publish with provenance**: `npm publish --provenance`
2. **Regular releases**: Activity signals freshness
3. **npm badge in README**: Shows download counts
4. **Cross-link from skills repos**: Ask for links back

---

## Content Marketing

### Blog Posts to Write

| Title | Platform | Target Keywords |
|-------|----------|-----------------|
| "How to Publish AI Agent Skills in One Command" | Dev.to | publish skills, agent skills, Claude |
| "The Complete Guide to Sharing Cursor Skills" | Hashnode | Cursor skills, share skills |
| "Building a Skills Publishing Workflow with GitHub" | Medium | GitHub, skills, automation |
| "publish-skills vs Manual PR: Why Automation Wins" | Dev.to | publish-skills, automation |

### Video Content

- **2-3 minute demo**: Show create → validate → publish workflow
- **YouTube Shorts/TikTok**: Quick tips for AI agent users

### Social Media

**Twitter/X Strategy:**
- 1-3 posts daily about AI agents, skills, and development
- Thread format for launches
- Engage with #AIAgents, #ClaudeCode, #CursorAI hashtags

**Reddit Strategy:**
- Join r/ClaudeAI, r/CursorAI, r/LocalLLaMA, r/programming 2 weeks before promoting
- Help answer questions (70% helpful, 30% promotional)
- Post tutorials, not just announcements

---

## Launch Platforms

| Platform | When to Use | Tips |
|----------|-------------|------|
| **Product Hunt** | Major version releases | Schedule for Tuesday-Thursday, prepare assets |
| **Hacker News** | Feature launches | "Show HN" format, be ready to answer questions |
| **Indie Hackers** | Building journey | Share the story, not just the tool |
| **Dev.to** | Tutorials | Problem-solution format with code examples |

---

## Problems Users Search For (Target These)

Based on research, users commonly search for solutions to:

1. "How to publish Claude skills"
2. "How to share Cursor rules"
3. "Distribute AI agent skills to team"
4. "Publish skills to GitHub"
5. "Create PR for agent skills"
6. "Agent skill version management"
7. "Share skills across projects"

Create content that directly addresses these pain points.

---

## Metrics to Track

| Metric | Tool | Target |
|--------|------|--------|
| GitHub Stars | GitHub | 100 in first month |
| NPM Downloads | npm stats | 500/week |
| README Views | GitHub Insights | Track growth |
| Referral Sources | GitHub Traffic | Identify top channels |
| Directory Listings | Manual | Listed in 5+ directories |

---

## 30-Day Marketing Checklist

### Week 1: Foundation
- [ ] Optimize README with all checklist items
- [ ] Add GitHub topics (15+)
- [ ] Submit to 3 primary directories
- [ ] Write first Dev.to article
- [ ] Share with personal network (target: 50 stars)

### Week 2: Content
- [ ] Create 2-minute demo video
- [ ] Post to Reddit (2-3 relevant subreddits)
- [ ] Tweet thread about the tool
- [ ] Submit to 2 more directories

### Week 3: Community
- [ ] Engage in Discord/Slack communities
- [ ] Answer questions on Stack Overflow
- [ ] Submit PRs to awesome lists
- [ ] Write second blog post

### Week 4: Launch
- [ ] Coordinate multi-platform launch
- [ ] Product Hunt submission
- [ ] Hacker News "Show HN"
- [ ] Track and respond to feedback

---

*Last updated: April 2026*
