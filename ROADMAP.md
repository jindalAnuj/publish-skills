# Roadmap

This document outlines the current features and future plans for `publish-skills`.

---

## Current Features (v1.x)

These features are available now in the current release.

### Skill Management

- **Create skills from templates** - Interactive wizard to scaffold new skills with proper structure
- **Validate skill structure** - Check `SKILL.md` format, required fields, and file organization
- **Multi-skill publishing** - Publish multiple skills in a single Pull Request

### Git Platform Support

- **GitHub integration** - Full support for creating Pull Requests via `@octokit/rest`
- **Authentication** - Secure login/logout with platform tokens stored in native keychains (macOS Keychain, Windows Credential Manager, Linux Secret Service)

### Publishing Workflow

- **One-command publishing** - `npx publish-skills publish` handles the entire workflow
- **Automatic branch creation** - Creates `feature/<skill-name>` branches
- **PR generation** - Auto-generates Pull Request with skill details and description
- **Configuration management** - Store repository settings in `~/.publish-skills/config.json`

---

## Coming Soon (v2.x)

Features planned for the next major release.

### Extended Git Platform Support

- [ ] **GitLab integration** - Full Merge Request support via `@gitbeaker/rest`
- [ ] **Bitbucket integration** - Full Pull Request support via `bitbucket` API
- [ ] **Self-hosted Git servers** - Support for GitHub Enterprise, GitLab self-managed, and Bitbucket Server

### Enhanced Publishing

- [ ] **Skill versioning** - Track and publish skill version updates
- [ ] **Skill dependencies** - Define dependencies between skills
- [ ] **Batch operations** - Bulk validate and publish from CI/CD pipelines

### Developer Experience

- [ ] **Improved terminal UI** - Better progress indicators and interactive menus
- [ ] **Dry-run mode** - Preview changes without creating actual PRs
- [ ] **Verbose logging** - Debug mode for troubleshooting

---

## Future (v3.x)

Long-term vision and planned expansions.

### Publish AI Agents

- [ ] **Agent publishing** - Publish complete AI agent configurations (not just skills)
- [ ] **Agent templates** - Create agents from templates with pre-configured skills
- [ ] **Agent registries** - Dedicated repositories for agent distribution

### Publish MCP Servers

- [ ] **MCP server publishing** - Publish Model Context Protocol servers to registries
- [ ] **MCP templates** - Scaffold new MCP servers with best practices
- [ ] **MCP validation** - Validate MCP server manifests and configurations

### Workflow Automation

- [ ] **Custom workflows** - Define and publish reusable automation workflows
- [ ] **Workflow templates** - Pre-built workflows for common use cases
- [ ] **Workflow composition** - Combine multiple workflows into pipelines

### Enterprise Features

- [ ] **Team management** - Organization-level permissions and access control
- [ ] **Approval workflows** - Required reviews before publishing
- [ ] **Audit logging** - Track all publishing activity
- [ ] **Private registries** - Support for private skill/agent registries
- [ ] **SSO integration** - Enterprise single sign-on support

---

## How to Contribute

We welcome contributions! If you'd like to help with any roadmap item:

1. Check [GitHub Issues](https://github.com/jindalAnuj/publish-skills/issues) for existing discussions
2. Open an issue to discuss your approach before starting work
3. Submit a Pull Request with your changes

---

## Feature Requests

Have an idea not on the roadmap? [Open an issue](https://github.com/jindalAnuj/publish-skills/issues/new) with the `enhancement` label.

---

*Last updated: April 2026*
