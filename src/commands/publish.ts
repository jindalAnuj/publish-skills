import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import chalk from 'chalk';
import ora from 'ora';
import { input, select, checkbox, confirm } from '@inquirer/prompts';
import { Octokit } from '@octokit/rest';
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { SkillValidator } from '../validators/SkillValidator';
import { GitManager } from '../git/GitManager';
import { PullRequestCreator } from '../git/PullRequestCreator';
import { ConfigManager } from '../config/ConfigManager';
import {
  discoverSkills,
  discoverSkillsFromKnownLocations,
  discoverSkillsFromCwd,
  isSingleSkillDirectory,
  getExistingKnownLocations,
  type DiscoveredSkill,
} from '../utils/skillDiscovery';
import {
  printBanner,
  printSection,
  printSkillSummary,
  printSuccess,
  printStep,
  printInfo,
  printWarning,
  countdownConfirmation,
  printDivider,
} from '../ui/terminal';
import { isUserCancellation } from '../types';

// ─────────────────────────────────────────────────────────────
// GitHub OAuth App client ID.
//
// Register a free OAuth App at:
//   https://github.com/settings/developers → "New OAuth App"
//   Authorization callback URL: http://localhost (not used for device flow)
//   Then paste the Client ID below (or set env GITHUB_CLIENT_ID).
//
// Device flow does NOT require a client secret.
// ─────────────────────────────────────────────────────────────
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? 'Ov23lixD9DnoetVafjJv';

export type PublishDestination = 'personal' | 'central';

export interface PublishArguments extends yargs.Arguments {
  path?: string;
  reset?: boolean;
  all?: boolean;
  central?: boolean;
  personal?: boolean;
}

// ────────────────────────────────────────────────────────────
// Read skill manifest from disk
// ────────────────────────────────────────────────────────────
function readSkillManifest(skillPath: string): Record<string, unknown> {
  const manifestPath = path.join(skillPath, 'manifest.json');
  const skillMdPath = path.join(skillPath, 'SKILL.md');

  if (fs.existsSync(manifestPath)) {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
  }

  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const nameMatch = content.match(/name:\s*(.+)/);
    const descMatch = content.match(/description:\s*(.+)/);
    return {
      id: path.basename(skillPath),
      name: nameMatch ? nameMatch[1].trim() : path.basename(skillPath),
      version: '1.0.0',
      description: descMatch ? descMatch[1].trim() : 'No description provided.',
    };
  }

  return {
    id: path.basename(skillPath),
    name: path.basename(skillPath),
    version: '1.0.0',
    description: 'No description provided.',
  };
}

// ────────────────────────────────────────────────────────────
// GitHub Device Flow — opens browser, no PAT copy-paste
// ────────────────────────────────────────────────────────────
async function deviceFlowAuth(): Promise<{ token: string; login: string }> {
  console.log(chalk.cyan('\n🔑 GitHub Login\n'));

  let token = '';

  const auth = createOAuthDeviceAuth({
    clientType: 'oauth-app',
    clientId: GITHUB_CLIENT_ID,
    scopes: ['repo'],
    onVerification: (verification) => {
      console.log(chalk.bold('  Open this URL in your browser:'));
      console.log(`  ${chalk.cyan(verification.verification_uri)}\n`);
      console.log(chalk.bold('  Enter code:'), chalk.yellow.bold(verification.user_code));
      console.log(chalk.gray(`\n  (Polling every ${verification.interval}s…)\n`));
    },
  });

  const spinner = ora('Waiting for browser authentication...').start();

  try {
    const result = await auth({ type: 'oauth' });
    token = result.token;
    spinner.stop();
  } catch (err) {
    spinner.fail('Authentication timed out or was cancelled.');
    throw err;
  }

  // Verify and get login
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.users.getAuthenticated();

  console.log(chalk.green(`✔ Logged in as ${chalk.bold(data.login)}\n`));
  return { token, login: data.login };
}

// ────────────────────────────────────────────────────────────
// List repos and let user pick or create one
// ────────────────────────────────────────────────────────────
interface SelectedRepo {
  owner: string;
  repo: string;
  url: string;
  defaultBranch: string;
}

async function buildAndSaveRepositoryConfig(
  selected: SelectedRepo,
  configManager: ConfigManager
): Promise<{
  platform: 'github';
  url: string;
  localPath: string;
  targetBranch: string;
  skillsPath: string;
}> {
  const skillsPath = await input({
    message: 'Path inside the repo where skills live:',
    default: 'skills',
  });

  const repoConfig = {
    platform: 'github' as const,
    url: selected.url,
    localPath: path.join(configManager.getStorageDir(), 'repos', selected.repo),
    targetBranch: selected.defaultBranch,
    skillsPath,
  };

  configManager.setRepository(selected.repo, repoConfig);
  return repoConfig;
}

async function isCachedRepositoryReachable(token: string, repoUrl: string): Promise<boolean> {
  try {
    const { owner, repo } = PullRequestCreator.parseGitHubRepo(repoUrl);
    const octokit = new Octokit({ auth: token });
    await octokit.rest.repos.get({ owner, repo });
    return true;
  } catch {
    return false;
  }
}

async function selectOrCreateRepo(token: string): Promise<SelectedRepo> {
  const octokit = new Octokit({ auth: token });

  const listSpinner = ora('Fetching your repositories...').start();
  const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: 'updated',
    affiliation: 'owner',
  });
  listSpinner.stop();

  const CREATE_NEW = '__CREATE_NEW__';

  const choices = [
    { value: CREATE_NEW, name: chalk.green('＋ Create a new repository') },
    ...repos.map((r) => ({
      value: r.full_name,
      name: `${chalk.bold(r.name)}  ${chalk.gray(r.private ? '🔒 private' : '🌐 public')}  ${r.description ? chalk.gray('— ' + r.description) : ''}`,
    })),
  ];

  const chosen = await select<string>({
    message: 'Select a repository to publish your skill into:',
    choices,
    pageSize: 15,
  });

  if (chosen === CREATE_NEW) {
    return createNewRepo(octokit);
  }

  const selected = repos.find((r) => r.full_name === chosen)!;
  return {
    owner: selected.owner.login,
    repo: selected.name,
    url: selected.clone_url,
    defaultBranch: selected.default_branch,
  };
}

async function createNewRepo(octokit: Octokit): Promise<SelectedRepo> {
  console.log(chalk.cyan('\n🆕 New Repository\n'));

  const repoName = await input({
    message: 'Repository name:',
    default: 'my-skills-repo',
    validate: (v) =>
      /^[a-zA-Z0-9_.-]+$/.test(v) || 'Only letters, numbers, hyphens, dots and underscores',
  });

  const description = await input({
    message: 'Description (optional):',
    default: 'AI agent skills repository',
  });

  const isPrivate = await confirm({ message: 'Make it private?', default: false });

  const spinner = ora(`Creating ${repoName}...`).start();
  const { data } = await octokit.rest.repos.createForAuthenticatedUser({
    name: repoName,
    description,
    private: isPrivate,
    auto_init: true,
  });
  spinner.succeed(`Repository ${chalk.bold(data.full_name)} created!`);

  return {
    owner: data.owner.login,
    repo: data.name,
    url: data.clone_url,
    defaultBranch: data.default_branch,
  };
}

// ────────────────────────────────────────────────────────────
// Multi-skill selection and validation
// ────────────────────────────────────────────────────────────
async function selectSkillsInteractively(
  availableSkills: DiscoveredSkill[]
): Promise<DiscoveredSkill[]> {
  const choices = availableSkills.map((skill) => ({
    name: `${chalk.bold(skill.name)} v${skill.version}`,
    value: skill.path,
    description: skill.description,
  }));

  const selectedPaths = await checkbox({
    message: 'Select skills to publish (use space to select, enter to confirm):',
    choices,
    pageSize: 20,
  });

  return availableSkills.filter((skill) => selectedPaths.includes(skill.path));
}

async function validateSkills(skills: DiscoveredSkill[]): Promise<void> {
  const validator: SkillValidator = new SkillValidator();
  const errors: string[] = [];

  for (const skill of skills) {
    try {
      const skillMeta: unknown = readSkillManifest(skill.path);
      validator.validateMetadata(skillMeta);
    } catch (error) {
      errors.push(`- ${skill.name}: ${(error as Error).message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed for ${errors.length} skill(s):\n${errors.join('\n')}`);
  }
}

function generateMultiSkillBranchName(): string {
  const timestamp = Date.now();
  return `feature/multi-skill-${timestamp}`;
}

function formatMultiSkillCommitMessage(skills: DiscoveredSkill[]): string {
  const skillList = skills.map((s) => `${s.name} v${s.version}`).join(', ');
  return `Add ${skills.length} skill(s): ${skillList}`;
}

function formatMultiSkillPRBody(skills: DiscoveredSkill[]): string {
  const skillsMarkdown = skills
    .map(
      (s) => `## 🧠 ${s.name}\n\n**Version:** \`${s.version}\`\n**Description:** ${s.description}\n`
    )
    .join('\n---\n\n');

  return `${skillsMarkdown}\n> Published via [publish-skills](https://github.com/publish-skills/publish-skills)`;
}

// ────────────────────────────────────────────────────────────
// Destination selection (personal vs central)
// ────────────────────────────────────────────────────────────
async function selectDestination(argv: PublishArguments): Promise<PublishDestination> {
  if (argv.central) return 'central';
  if (argv.personal) return 'personal';

  const destination = await select<PublishDestination>({
    message: 'Where would you like to publish your skill(s)?',
    choices: [
      {
        name: '📁 Personal Repository (your own GitHub repo)',
        value: 'personal',
      },
      {
        name: '🌐 Central Skill Hub (community shared repository)',
        value: 'central',
      },
    ],
  });

  return destination;
}

// ────────────────────────────────────────────────────────────
// Display discovered skills grouped by location
// ────────────────────────────────────────────────────────────
function displayDiscoveredSkills(skills: DiscoveredSkill[]): void {
  const grouped = new Map<string, DiscoveredSkill[]>();

  for (const skill of skills) {
    const location = skill.sourceLocation || 'Current Directory';
    if (!grouped.has(location)) {
      grouped.set(location, []);
    }
    grouped.get(location)!.push(skill);
  }

  printSection('Discovered Skills', '📦');

  let totalIndex = 0;
  for (const [location, locationSkills] of grouped) {
    console.log(chalk.bold.cyan(`  📁 ${location}`));
    console.log(chalk.gray(`  ${'─'.repeat(40)}`));
    for (const skill of locationSkills) {
      totalIndex++;
      const emoji = skill.sourceLocation?.includes('Current') ? '📄' : '🔮';
      console.log(
        `  ${emoji} ${chalk.yellow(totalIndex.toString().padStart(2, ' '))}. ${chalk.bold.white(skill.name)} ${chalk.cyan(`v${skill.version}`)}`
      );
      if (skill.description && skill.description !== 'No description provided.') {
        console.log(`      ${chalk.gray(skill.description.substring(0, 50))}${skill.description.length > 50 ? '...' : ''}`);
      }
    }
    console.log();
  }
}

// ────────────────────────────────────────────────────────────
// Interactive skill selection with "add more" loop
// ────────────────────────────────────────────────────────────
async function interactiveSkillSelection(
  initialSkills: DiscoveredSkill[]
): Promise<DiscoveredSkill[]> {
  let allAvailableSkills = [...initialSkills];
  let selectedSkills: DiscoveredSkill[] = [];
  let continueAdding = true;

  while (continueAdding) {
    if (allAvailableSkills.length === 0) {
      printWarning('No more skills available to add.');
      break;
    }

    // Filter out already selected skills
    const remainingSkills = allAvailableSkills.filter(
      (s) => !selectedSkills.some((sel) => sel.path === s.path)
    );

    if (remainingSkills.length === 0) {
      printInfo('All available skills have been selected!');
      break;
    }

    // Show selection prompt
    const choices = remainingSkills.map((skill) => ({
      name: `${chalk.bold(skill.name)} ${chalk.cyan('v' + skill.version)} ${chalk.gray('(' + (skill.sourceLocation || 'Local') + ')')}`,
      value: skill.path,
      description: skill.description,
    }));

    const selectedPaths = await checkbox({
      message: `${chalk.yellow('⚡')} Select skills to publish (space to select, enter to confirm):`,
      choices,
      pageSize: 15,
    });

    // Add newly selected skills
    const newlySelected = remainingSkills.filter((s) => selectedPaths.includes(s.path));
    selectedSkills.push(...newlySelected);

    if (selectedSkills.length === 0) {
      printWarning('No skills selected yet.');
    } else {
      // Show current selection summary
      printSkillSummary(selectedSkills);
    }

    // Check if more skills available and ask to continue
    const stillRemaining = allAvailableSkills.filter(
      (s) => !selectedSkills.some((sel) => sel.path === s.path)
    );

    if (stillRemaining.length > 0 && selectedSkills.length > 0) {
      const addMore = await confirm({
        message: `${chalk.yellow('➕')} Would you like to add more skills? (${stillRemaining.length} more available)`,
        default: false,
      });
      continueAdding = addMore;
    } else {
      continueAdding = false;
    }

    // If no skills selected, ask if they want to try again
    if (selectedSkills.length === 0) {
      const tryAgain = await confirm({
        message: 'No skills selected. Would you like to select skills?',
        default: true,
      });
      continueAdding = tryAgain;
    }
  }

  return selectedSkills;
}

// ────────────────────────────────────────────────────────────
// Main handler
// ────────────────────────────────────────────────────────────
export const handler = async (argv: PublishArguments): Promise<void> => {
  const spinner = ora();

  try {
    // Show banner
    printBanner();

    const configManager = new ConfigManager();
    let skillsToPublish: DiscoveredSkill[];

    // ── 1. Discover skills ──────────────────────────────────
    printStep(1, 5, 'Discovering Skills');

    if (!argv.path) {
      // First, check current working directory
      spinner.start('Scanning current directory...');
      const cwdSkills = discoverSkillsFromCwd();
      spinner.stop();

      // Then check known locations
      spinner.start('Scanning known skill locations...');
      const knownSkills = discoverSkillsFromKnownLocations();
      spinner.stop();

      // Combine all discovered skills (avoid duplicates by path)
      const allSkillPaths = new Set<string>();
      const allDiscoveredSkills: DiscoveredSkill[] = [];

      for (const skill of [...cwdSkills, ...knownSkills]) {
        if (!allSkillPaths.has(skill.path)) {
          allSkillPaths.add(skill.path);
          allDiscoveredSkills.push(skill);
        }
      }

      if (allDiscoveredSkills.length === 0) {
        const existingLocations = getExistingKnownLocations();
        printWarning('No skills found!');
        console.log(chalk.gray('\n  Searched:'));
        console.log(chalk.gray('    • Current directory'));
        if (existingLocations.length > 0) {
          console.log(chalk.gray('    • ' + existingLocations.join('\n    • ')));
        }
        console.log(chalk.gray('\n  Make sure your skill directories contain manifest.json or SKILL.md\n'));
        console.log(chalk.gray('  Or specify a path: publish-skills <path>\n'));
        return;
      }

      printInfo(`Found ${chalk.bold(allDiscoveredSkills.length)} skill(s)`);
      displayDiscoveredSkills(allDiscoveredSkills);

      if (argv.all) {
        skillsToPublish = allDiscoveredSkills;
        printInfo(`Publishing all ${allDiscoveredSkills.length} skill(s)...`);
      } else {
        skillsToPublish = await interactiveSkillSelection(allDiscoveredSkills);

        if (skillsToPublish.length === 0) {
          printWarning('No skills selected. Exiting.');
          return;
        }
      }
    } else {
      const inputPath = path.resolve(argv.path);

      if (isSingleSkillDirectory(inputPath)) {
        // Single skill mode (backward compatible)
        const skillMeta = readSkillManifest(inputPath);
        skillsToPublish = [
          {
            path: inputPath,
            name: (skillMeta.name as string) || path.basename(inputPath),
            version: (skillMeta.version as string) || '1.0.0',
            description: (skillMeta.description as string) || 'No description provided.',
          },
        ];
      } else {
        // Directory mode - discover skills
        spinner.start(`Scanning ${inputPath} for skills...`);
        const discoveredSkills = discoverSkills(inputPath);
        spinner.stop();

        if (discoveredSkills.length === 0) {
          throw new Error(
            `No skills found in ${inputPath}. Ensure each skill directory contains a manifest.json or SKILL.md file.`
          );
        }

        console.log(chalk.green(`✔ Found ${discoveredSkills.length} skill(s) in ${inputPath}\n`));

        // Select skills to publish
        if (argv.all) {
          skillsToPublish = discoveredSkills;
          console.log(chalk.gray(`Publishing all ${discoveredSkills.length} skill(s)...\n`));
        } else {
          skillsToPublish = await selectSkillsInteractively(discoveredSkills);

          if (skillsToPublish.length === 0) {
            console.log(chalk.yellow('No skills selected. Exiting.'));
            return;
          }

          console.log(chalk.gray(`Selected ${skillsToPublish.length} skill(s) for publishing.\n`));
        }
      }
    }

    // ── 2. Validate all selected skills ─────────────────────
    printStep(2, 5, 'Validating Skills');
    spinner.start(`Checking ${skillsToPublish.length} skill(s)...`);
    await validateSkills(skillsToPublish);
    spinner.succeed(`${chalk.green('✓')} All ${skillsToPublish.length} skill(s) validated`);

    // ── 3. Select destination (personal vs central) ────────
    printStep(3, 5, 'Select Destination');
    const destination = await selectDestination(argv);
    const destEmoji = destination === 'central' ? '🌐' : '📁';
    const destName = destination === 'central' ? 'Central Skill Hub' : 'Personal Repository';
    printInfo(`Publishing to ${destEmoji} ${chalk.bold(destName)}`);

    // ── 4. Auth — reuse saved token or run device flow ─────
    printStep(4, 5, 'Authentication');
    let token: string;
    const savedAuth = argv.reset ? undefined : configManager.getAuthState();

    if (savedAuth) {
      token = savedAuth.token;
      printInfo(`Signed in as ${chalk.bold.cyan(savedAuth.login)} ${chalk.gray('(cached)')}`);
    } else {
      const auth = await deviceFlowAuth();
      token = auth.token;
      configManager.setAuthState({ token: auth.token, login: auth.login });
    }

    // ── 5. Repo config — based on destination ──────────────
    let repoConfig:
      | {
          platform: 'github';
          url: string;
          localPath: string;
          targetBranch: string;
          skillsPath: string;
        }
      | undefined;

    if (destination === 'central') {
      // Use central repository configuration
      const centralConfig = configManager.getCentralRepository();
      const repoUrl = `https://github.com/${centralConfig.owner}/${centralConfig.repo}.git`;

      console.log(chalk.cyan(`\n🌐 Central Skill Hub: ${centralConfig.owner}/${centralConfig.repo}`));
      console.log(chalk.gray(`   Skills will be added to: ${centralConfig.skillsPath}/\n`));

      repoConfig = {
        platform: 'github',
        url: repoUrl,
        localPath: path.join(configManager.getStorageDir(), 'repos', `central-${centralConfig.repo}`),
        targetBranch: centralConfig.branch,
        skillsPath: centralConfig.skillsPath,
      };
    } else {
      // Personal repository flow
      const savedRepo = argv.reset ? undefined : configManager.getDefaultRepository();
      if (savedRepo && savedRepo.platform === 'github') {
        repoConfig = {
          platform: 'github' as const,
          url: savedRepo.url,
          localPath: savedRepo.localPath,
          targetBranch: savedRepo.targetBranch,
          skillsPath: savedRepo.skillsPath,
        };
      }

      if (repoConfig) {
        const repoName = configManager.get().defaultRepository;
        console.log(chalk.gray(`✔ Publishing to ${chalk.bold(repoName)} (cached)`));
        console.log(chalk.gray(`  ${repoConfig.url}\n`));

        const useCached = await confirm({
          message: `Use this cached repository?`,
          default: true,
        });

        if (!useCached) {
          repoConfig = undefined;
        }
      }

      if (repoConfig) {
        spinner.start('Validating cached repository...');
        const reachable = await isCachedRepositoryReachable(token, repoConfig.url);
        if (reachable) {
          spinner.succeed('Cached repository is valid.');
        } else {
          spinner.warn('Cached repository is invalid or inaccessible. Please choose a repository.');
          repoConfig = undefined;
        }
      }

      if (!repoConfig) {
        const selected = await selectOrCreateRepo(token);
        repoConfig = await buildAndSaveRepositoryConfig(selected, configManager);
        console.log(
          chalk.gray(`✔ Publishing to ${chalk.bold(selected.owner + '/' + selected.repo)}\n`)
        );
      }
    }

    // ── 5. Final Confirmation ─────────────────────────────────
    printStep(5, 5, 'Ready to Publish');

    // Show summary before publishing
    printDivider();
    console.log(chalk.bold.white('\n📋 Publish Summary:\n'));
    console.log(`   ${chalk.gray('Skills:')}     ${chalk.bold.cyan(skillsToPublish.length)} skill(s)`);
    for (const skill of skillsToPublish) {
      console.log(`              ${chalk.yellow('•')} ${skill.name} ${chalk.gray('v' + skill.version)}`);
    }
    console.log(`   ${chalk.gray('Target:')}     ${destination === 'central' ? '🌐 Central Hub' : '📁 Personal Repo'}`);
    const { owner: targetOwner, repo: targetRepo } = PullRequestCreator.parseGitHubRepo(repoConfig.url);
    console.log(`   ${chalk.gray('Repository:')} ${chalk.cyan(targetOwner + '/' + targetRepo)}`);
    console.log();
    printDivider();

    // Countdown confirmation
    const confirmed = await countdownConfirmation(
      `Publishing ${skillsToPublish.length} skill(s) to ${targetOwner}/${targetRepo}`,
      20
    );

    if (!confirmed) {
      printWarning('Publish cancelled.');
      return;
    }

    // ── 6. Determine branch name ────────────────────────────
    const isMulti = skillsToPublish.length > 1;
    const branchName = isMulti
      ? generateMultiSkillBranchName()
      : `feature/${skillsToPublish[0].name}-v${skillsToPublish[0].version}`;

    // ── 7. Clone / update repository ──────────────────────
    spinner.start('📥 Cloning / updating repository...');
    const gitManager = new GitManager();
    await gitManager.cloneRepository(repoConfig.url, repoConfig.localPath, token);
    await gitManager.updateRepository(repoConfig.localPath, repoConfig.targetBranch);
    spinner.succeed('Repository up to date');

    // ── 8. Create feature branch ───────────────────────────
    spinner.start(`🌿 Creating branch ${chalk.cyan(branchName)}...`);
    await gitManager.createBranch(repoConfig.localPath, branchName, repoConfig.targetBranch);
    spinner.succeed(`Branch "${branchName}" created`);

    // ── 9. Copy all skill files ─────────────────────────────
    spinner.start('📦 Copying skill files...');
    for (const skill of skillsToPublish) {
      const skillName = skill.name;
      await gitManager.copySkill(
        skill.path,
        repoConfig.localPath,
        repoConfig.skillsPath,
        skillName
      );
    }
    spinner.succeed(`Copied ${skillsToPublish.length} skill(s) to ${repoConfig.skillsPath}/`);

    // ── 10. Commit and push ─────────────────────────────────
    const commitMessage = isMulti
      ? formatMultiSkillCommitMessage(skillsToPublish)
      : `Add skill: ${skillsToPublish[0].name} v${skillsToPublish[0].version}`;

    spinner.start('🚀 Committing and pushing...');
    await gitManager.commitAndPush(
      repoConfig.localPath,
      branchName,
      commitMessage,
      token,
      repoConfig.url
    );
    spinner.succeed('Changes pushed');

    // ── 11. Open Pull Request ───────────────────────────────
    spinner.start('📝 Creating pull request...');
    const prCreator = new PullRequestCreator();
    const { owner, repo } = PullRequestCreator.parseGitHubRepo(repoConfig.url);

    const prTitle = isMulti
      ? `Add ${skillsToPublish.length} skill(s): ${skillsToPublish.map((s) => s.name).join(', ')}`
      : `Add skill: ${skillsToPublish[0].name} v${skillsToPublish[0].version}`;

    const prBody = isMulti
      ? formatMultiSkillPRBody(skillsToPublish)
      : `## 🧠 ${skillsToPublish[0].name}\n\nVersion: \`${skillsToPublish[0].version}\`\n\n> Published via [publish-skills](https://github.com/publish-skills/publish-skills)`;

    const pr = await prCreator.createGitHubPR(
      owner,
      repo,
      {
        title: prTitle,
        body: prBody,
        head: branchName,
        base: repoConfig.targetBranch,
      },
      token
    );
    spinner.succeed('Pull request created');

    // Show success message
    printSuccess(pr.url, skillsToPublish.length);
  } catch (error) {
    // Handle user cancellation gracefully (Ctrl+C, Escape, etc.)
    if (isUserCancellation(error)) {
      spinner.stop();
      console.log(chalk.yellow('\n\n👋 Cancelled. See you next time!\n'));
      process.exit(0);
    }

    spinner.fail(chalk.red('Publish failed.'));
    console.error(chalk.red('\nError:'), (error as Error).message);
    throw error;
  }
};
