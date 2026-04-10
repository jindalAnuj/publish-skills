# Smart Git Commit with Changesets

A skill for creating intelligent git commits with automatic changeset management for npm packages.

## When to Use

Use this skill when:
- Committing changes to this repository
- Deciding if a changeset is needed
- Determining the right version bump type (patch/minor/major)
- Creating conventional commits

## Version Bump Guidelines

### MAJOR (Breaking Changes) - `major`
Increment when you make incompatible API changes:
- Removing or renaming exported functions/classes
- Changing function signatures (parameters, return types)
- Removing CLI commands or flags
- Changing default behavior that users depend on

### MINOR (New Features) - `minor`
Increment when you add functionality in a backward-compatible manner:
- Adding new CLI commands or flags
- Adding new exported functions/classes
- Adding new optional parameters
- Expanding functionality without breaking existing usage

### PATCH (Bug Fixes) - `patch`
Increment when you make backward-compatible bug fixes:
- Fixing bugs without changing API
- Performance improvements
- Documentation updates
- Internal refactoring (no API changes)
- Dependency updates (non-breaking)

## When Changesets Are NOT Needed

Skip changesets for:
- Changes only to test files (`__tests__/`, `*.test.ts`)
- Documentation only (README.md, AGENTS.md, etc.)
- CI/CD configuration (`.github/workflows/`)
- Development tooling (eslintrc, prettier, jest.config)
- Comments or code formatting only

## Workflow

### Step 1: Analyze Changes

Run these commands to understand what changed:
```bash
git status
git diff --staged --stat
git diff --staged
```

### Step 2: Determine if Changeset is Needed

Ask yourself:
1. Does this change affect the published npm package?
2. Does this change what users of the package will experience?
3. Is this a bug fix, new feature, or breaking change?

If YES to #1 or #2, a changeset is needed.

### Step 3: Create Changeset (if needed)

Create a changeset file with a random name in `.changeset/`:

```bash
# Generate a random name like "funny-birds-dance.md"
npx changeset add
```

Or create manually:
```markdown
---
'publish-skills': patch
---

Brief description of the change (1-2 sentences)
```

**Changeset naming convention:** Use format `adjective-noun-verb.md` with random words.

### Step 4: Create Conventional Commit

Use this format:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature (triggers MINOR if no changeset specifies otherwise)
- `fix`: Bug fix (triggers PATCH)
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes bug nor adds feature
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

**Examples:**
```bash
# Feature with changeset
git commit -m "feat(cli): add --central flag for skill hub publishing"

# Bug fix
git commit -m "fix(auth): persist credentials across restarts"

# No changeset needed
git commit -m "docs: update README with new examples"
git commit -m "test: add tests for skill discovery"
git commit -m "chore: update dependencies"
```

## Quick Reference Table

| Change Type | Changeset? | Bump Type | Commit Type |
|-------------|------------|-----------|-------------|
| New CLI flag | Yes | minor | feat |
| New command | Yes | minor | feat |
| Bug fix | Yes | patch | fix |
| Breaking change | Yes | major | feat! or fix! |
| Performance fix | Yes | patch | perf |
| Refactor (internal) | Optional | patch | refactor |
| Tests only | No | - | test |
| Docs only | No | - | docs |
| CI/CD only | No | - | ci |
| Dev tooling | No | - | chore |

## Example: Full Commit Flow

```bash
# 1. Check what's staged
git diff --staged --stat

# 2. Determine: This adds a new feature (--central flag)
#    → Needs changeset with "minor" bump

# 3. Create changeset
cat > .changeset/cool-feature-add.md << 'EOF'
---
'publish-skills': minor
---

Add central skill hub publishing with --central flag
EOF

# 4. Stage the changeset
git add .changeset/cool-feature-add.md

# 5. Commit with conventional format
git commit -m "feat(cli): add --central flag for skill hub publishing

- Users can now publish to a central community repository
- Added destination selection prompt
- Skills can be shared across the community"
```

## Automation Script

For quick changeset creation:
```bash
# Create a patch changeset
echo "---
'publish-skills': patch
---

$1" > .changeset/$(openssl rand -hex 4).md
```

## CI/CD Flow

1. **On PR:** `changeset-check.yml` validates a changeset exists (for package changes)
2. **On merge to main:** `publish.yml` runs:
   - If changesets exist → Creates "Version Packages" PR
   - If Version PR merged → Publishes to npm with version bump

## Important Notes

- Always create changeset BEFORE committing the code changes
- Stage both the changeset AND code changes in the same commit
- The changeset description appears in CHANGELOG.md
- Multiple changesets can exist; they're combined on release
