import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Well-known directories where AI agent skills are typically stored.
 * These paths are relative to the user's home directory (~).
 * Comprehensive list covering all major AI coding agents.
 */
export const GLOBAL_SKILL_LOCATIONS = [
  // Standard locations
  '.claude/skills',
  '.cursor/skills',
  '.agents/skills',
  '.codex/skills',

  // Agent-specific global paths
  '.config/agents/skills',        // Amp, Kimi Code CLI, Replit, Universal
  '.gemini/antigravity/skills',   // Antigravity
  '.augment/skills',              // Augment
  '.bob/skills',                  // IBM Bob
  '.openclaw/skills',             // OpenClaw
  '.codebuddy/skills',            // CodeBuddy
  '.commandcode/skills',          // Command Code
  '.continue/skills',             // Continue
  '.snowflake/cortex/skills',     // Cortex Code
  '.config/crush/skills',         // Crush
  '.deepagents/agent/skills',     // Deep Agents
  '.factory/skills',              // Droid
  '.firebender/skills',           // Firebender
  '.gemini/skills',               // Gemini CLI
  '.copilot/skills',              // GitHub Copilot
  '.config/goose/skills',         // Goose
  '.junie/skills',                // Junie
  '.iflow/skills',                // iFlow CLI
  '.kilocode/skills',             // Kilo Code
  '.kiro/skills',                 // Kiro CLI
  '.kode/skills',                 // Kode
  '.mcpjam/skills',               // MCPJam
  '.vibe/skills',                 // Mistral Vibe
  '.mux/skills',                  // Mux
  '.config/opencode/skills',      // OpenCode
  '.openhands/skills',            // OpenHands
  '.pi/agent/skills',             // Pi
  '.qoder/skills',                // Qoder
  '.qwen/skills',                 // Qwen Code
  '.roo/skills',                  // Roo Code
  '.trae/skills',                 // Trae
  '.trae-cn/skills',              // Trae CN
  '.codeium/windsurf/skills',     // Windsurf
  '.zencoder/skills',             // Zencoder
  '.neovate/skills',              // Neovate
  '.pochi/skills',                // Pochi
  '.adal/skills',                 // AdaL
];

/**
 * Project-level skill directories to look for in the current working directory.
 * These mirror the agent-specific paths used in projects.
 */
export const PROJECT_SKILL_LOCATIONS = [
  // Standard project locations
  '.claude/skills',
  '.agents/skills',
  'skills',

  // Agent-specific project paths
  '.augment/skills',              // Augment
  '.bob/skills',                  // IBM Bob
  '.codebuddy/skills',            // CodeBuddy
  '.commandcode/skills',          // Command Code
  '.continue/skills',             // Continue
  '.cortex/skills',               // Cortex Code
  '.crush/skills',                // Crush
  '.factory/skills',              // Droid
  '.goose/skills',                // Goose
  '.junie/skills',                // Junie
  '.iflow/skills',                // iFlow CLI
  '.kilocode/skills',             // Kilo Code
  '.kiro/skills',                 // Kiro CLI
  '.kode/skills',                 // Kode
  '.mcpjam/skills',               // MCPJam
  '.vibe/skills',                 // Mistral Vibe
  '.mux/skills',                  // Mux
  '.openhands/skills',            // OpenHands
  '.pi/skills',                   // Pi
  '.qoder/skills',                // Qoder
  '.qwen/skills',                 // Qwen Code
  '.roo/skills',                  // Roo Code
  '.trae/skills',                 // Trae
  '.windsurf/skills',             // Windsurf
  '.zencoder/skills',             // Zencoder
  '.neovate/skills',              // Neovate
  '.pochi/skills',                // Pochi
  '.adal/skills',                 // AdaL
];

// Keep backward compatibility alias
export const KNOWN_SKILL_LOCATIONS = GLOBAL_SKILL_LOCATIONS;

/**
 * Represents a discovered skill with its path and basic metadata
 */
export interface DiscoveredSkill {
  path: string;
  name: string;
  version: string;
  description: string;
  sourceLocation?: string;
}

/**
 * Check if a directory contains a valid skill structure
 * A skill is valid if it contains either manifest.json or SKILL.md
 */
function isSkillDirectory(dirPath: string): boolean {
  const manifestPath = path.join(dirPath, 'manifest.json');
  const skillMdPath = path.join(dirPath, 'SKILL.md');

  return fs.existsSync(manifestPath) || fs.existsSync(skillMdPath);
}

/**
 * Extract basic skill metadata from a skill directory
 */
function extractSkillMetadata(skillPath: string): {
  name: string;
  version: string;
  description: string;
} {
  const manifestPath = path.join(skillPath, 'manifest.json');
  const skillMdPath = path.join(skillPath, 'SKILL.md');

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      return {
        name: manifest.name || path.basename(skillPath),
        version: manifest.version || '1.0.0',
        description: manifest.description || 'No description provided.',
      };
    } catch {
      // Fall back to defaults if manifest is invalid
    }
  }

  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const nameMatch = content.match(/name:\s*(.+)/);
    const descMatch = content.match(/description:\s*(.+)/);
    return {
      name: nameMatch ? nameMatch[1].trim() : path.basename(skillPath),
      version: '1.0.0',
      description: descMatch ? descMatch[1].trim() : 'No description provided.',
    };
  }

  return {
    name: path.basename(skillPath),
    version: '1.0.0',
    description: 'No description provided.',
  };
}

/**
 * Discover all skills in a given directory.
 * Skills are identified as subdirectories containing manifest.json or SKILL.md.
 *
 * @param directoryPath - The directory to scan for skills
 * @returns Array of discovered skills with their paths and metadata
 */
export function discoverSkills(directoryPath: string): DiscoveredSkill[] {
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
    return [];
  }

  const skills: DiscoveredSkill[] = [];

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(directoryPath, entry.name);

      // Check if this subdirectory is a skill
      if (isSkillDirectory(fullPath)) {
        const metadata = extractSkillMetadata(fullPath);
        skills.push({
          path: fullPath,
          name: metadata.name,
          version: metadata.version,
          description: metadata.description,
        });
      }
    }
  }

  return skills;
}

/**
 * Check if a given path is a single skill directory (has manifest.json or SKILL.md directly)
 */
export function isSingleSkillDirectory(directoryPath: string): boolean {
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
    return false;
  }
  return isSkillDirectory(directoryPath);
}

/**
 * Recursively discover skills in a directory, including nested subdirectories.
 * Useful for skill directories that have category folders.
 */
function discoverSkillsRecursive(
  directoryPath: string,
  sourceLocation: string,
  maxDepth: number = 3,
  currentDepth: number = 0
): DiscoveredSkill[] {
  if (currentDepth > maxDepth) {
    return [];
  }

  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
    return [];
  }

  const skills: DiscoveredSkill[] = [];
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(directoryPath, entry.name);

      if (isSkillDirectory(fullPath)) {
        const metadata = extractSkillMetadata(fullPath);
        skills.push({
          path: fullPath,
          name: metadata.name,
          version: metadata.version,
          description: metadata.description,
          sourceLocation,
        });
      } else {
        const nestedSkills = discoverSkillsRecursive(
          fullPath,
          sourceLocation,
          maxDepth,
          currentDepth + 1
        );
        skills.push(...nestedSkills);
      }
    }
  }

  return skills;
}

/**
 * Discover skills from all known skill locations on the system.
 * Scans well-known directories like ~/.claude/skills, ~/.cursor/skills, etc.
 *
 * @returns Array of discovered skills with their source locations
 */
export function discoverSkillsFromKnownLocations(): DiscoveredSkill[] {
  const homeDir = os.homedir();
  const allSkills: DiscoveredSkill[] = [];

  for (const location of KNOWN_SKILL_LOCATIONS) {
    const fullPath = path.join(homeDir, location);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      const skills = discoverSkillsRecursive(fullPath, location);
      allSkills.push(...skills);
    }
  }

  return allSkills;
}

/**
 * Get list of known skill locations that exist on the system.
 *
 * @returns Array of existing skill directory paths
 */
export function getExistingKnownLocations(): string[] {
  const homeDir = os.homedir();
  const existing: string[] = [];

  for (const location of KNOWN_SKILL_LOCATIONS) {
    const fullPath = path.join(homeDir, location);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      existing.push(location);
    }
  }

  return existing;
}

/**
 * Discover skills from the current working directory.
 * Checks for:
 * 1. If cwd itself is a skill directory
 * 2. All agent-specific project skill directories (e.g., .claude/skills, .cursor/skills, etc.)
 * 3. Direct subdirectories that are skills
 *
 * @param cwd - The current working directory to scan
 * @returns Array of discovered skills with source location
 */
export function discoverSkillsFromCwd(cwd: string = process.cwd()): DiscoveredSkill[] {
  const skills: DiscoveredSkill[] = [];
  const seenPaths = new Set<string>();

  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
    return skills;
  }

  // Check if cwd itself is a skill
  if (isSkillDirectory(cwd)) {
    const metadata = extractSkillMetadata(cwd);
    skills.push({
      path: cwd,
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      sourceLocation: 'Current Directory (skill)',
    });
    return skills;
  }

  // Check all project-level skill locations
  for (const location of PROJECT_SKILL_LOCATIONS) {
    const skillsFolder = path.join(cwd, location);
    if (fs.existsSync(skillsFolder) && fs.statSync(skillsFolder).isDirectory()) {
      const foundSkills = discoverSkillsRecursive(skillsFolder, `Project: ${location}`);
      for (const skill of foundSkills) {
        if (!seenPaths.has(skill.path)) {
          seenPaths.add(skill.path);
          skills.push(skill);
        }
      }
    }
  }

  // Also check direct subdirectories of cwd for skills (fallback)
  if (skills.length === 0) {
    const entries = fs.readdirSync(cwd, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const fullPath = path.join(cwd, entry.name);
        if (isSkillDirectory(fullPath) && !seenPaths.has(fullPath)) {
          const metadata = extractSkillMetadata(fullPath);
          seenPaths.add(fullPath);
          skills.push({
            path: fullPath,
            name: metadata.name,
            version: metadata.version,
            description: metadata.description,
            sourceLocation: 'Current Directory',
          });
        }
      }
    }
  }

  return skills;
}

/**
 * Check if a directory is a skill directory (exported for use in discoverSkillsFromCwd)
 */
export { isSkillDirectory };
