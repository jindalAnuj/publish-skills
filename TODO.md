# publish-skills — MVP TODO

> Goal: ship a working `npx publish-skills` that can `create`, `validate`, and `publish` a skill — tested locally and published to NPM via GitHub Actions.

---

## 🔴 Priority 1 — Test Publish Command (Current Focus)

- [ ] Manual end-to-end: `node dist/cli/index.js publish ./my-skill`
  - [ ] Happy path: valid skill + cached auth + cached repo → clones, branches, copies, pushes, opens PR
  - [ ] No auth: runs device flow
  - [ ] No repo config: prompts repo selection / creation
  - [ ] `--reset` flag: ignores cache, re-authenticates
  - [ ] Invalid skill (fails validate): exits 1 before git ops
  - [ ] Network failure on push: exits 1 with descriptive error

## 🔴 Priority 2 — Publish Package to NPM

- [ ] Add `LICENSE` file (MIT)
- [ ] Verify `package.json` `repository.url` is correct
- [ ] Resolve 2FA / use Automation token for `NPM_TOKEN` secret
- [ ] Add `NPM_TOKEN` secret to repo settings
- [ ] Confirm `publish.yml` works: push a `v*` tag → NPM publish + GitHub Release
- [ ] Publish: `git tag v0.1.0 && git push origin v0.1.0`

---

## 🟠 Phase 1 — MVP Remaining

### Commands
- [ ] `src/commands/create.ts` — scaffold a new skill directory from template
- [ ] `src/commands/validate.ts` — validate skill structure & metadata
- [ ] `src/commands/auth.ts` — login / logout (re-export device flow from publish)

### CLI Wiring
- [ ] Register `create`, `validate`, `auth` commands in `src/cli/index.ts`
- [ ] Add `--verbose` and `--config` global flags

### Local Validation
- [ ] `npm run build` passes with 0 TS errors
- [ ] `npm run lint` passes clean
- [ ] Manual smoke-test: `node dist/cli/index.js --help`
- [ ] Manual smoke-test: `node dist/cli/index.js create ./my-skill`
- [ ] Manual smoke-test: `node dist/cli/index.js validate ./my-skill`

### CI/CD
- [ ] Add `.github/workflows/ci.yml` — runs lint + build on every push/PR

---

## 🟡 Phase 2 — Post-MVP

- [ ] Terminal UI (`src/ui/TUI.ts`) — reusable spinners, menus, masked input
- [ ] GitLab MR support
- [ ] Bitbucket PR support
- [ ] `src/agents/` adapters (Claude, Gemini, Cline)
- [ ] `install` / `search` / `list` commands
- [ ] Commitlint + Husky
- [ ] JSON Schema file for skill validation
- [ ] 3+ example skills in `examples/`
- [ ] README — final command reference
- [ ] NPM download badges, GitHub stars
