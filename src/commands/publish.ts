import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import chalk from 'chalk';
import ora from 'ora';
import { input, select, confirm } from '@inquirer/prompts';
import { Octokit } from '@octokit/rest';
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { SkillValidator } from '../validators/SkillValidator';
import { GitManager } from '../git/GitManager';
import { PullRequestCreator } from '../git/PullRequestCreator';
import { ConfigManager } from '../config/ConfigManager';

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

export interface PublishArguments extends yargs.Arguments {
  path: string;
  reset?: boolean;
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
// Main handler
// ────────────────────────────────────────────────────────────
export const handler = async (argv: PublishArguments): Promise<void> => {
  const spinner = ora();

  try {
    const skillPath = path.resolve(argv.path);
    const configManager = new ConfigManager();

    // ── 1. Validate skill ──────────────────────────────────
    spinner.start(`Validating skill at ${skillPath}...`);
    const skillMeta = readSkillManifest(skillPath);
    const validator: SkillValidator = new SkillValidator();
    validator.validateMetadata(skillMeta);
    spinner.succeed(`Skill "${skillMeta.name}" v${skillMeta.version} validated.`);

    // ── 2. Auth — reuse saved token or run device flow ─────
    let token: string;
    const savedAuth = argv.reset ? undefined : configManager.getAuthState();

    if (savedAuth) {
      token = savedAuth.token;
      console.log(chalk.gray(`✔ Signed in as ${chalk.bold(savedAuth.login)} (cached)\n`));
    } else {
      const auth = await deviceFlowAuth();
      token = auth.token;
      configManager.setAuthState({ token: auth.token, login: auth.login });
    }

    // ── 3. Repo config — reuse or let user pick ────────────
    let repoConfig = argv.reset ? undefined : configManager.getDefaultRepository();

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

    const skillName = skillMeta.name as string;
    const branchName = `feature/${skillName}-v${skillMeta.version}`;

    // ── 4. Clone / update repository ──────────────────────
    spinner.start('Cloning / updating repository...');
    const gitManager = new GitManager();
    await gitManager.cloneRepository(repoConfig.url, repoConfig.localPath, token);
    await gitManager.updateRepository(repoConfig.localPath, repoConfig.targetBranch);
    spinner.succeed('Repository up to date.');

    // ── 5. Create feature branch ───────────────────────────
    spinner.start(`Creating branch ${branchName}...`);
    await gitManager.createBranch(repoConfig.localPath, branchName, repoConfig.targetBranch);
    spinner.succeed(`Branch "${branchName}" created.`);

    // ── 6. Copy skill files ────────────────────────────────
    spinner.start('Copying skill files...');
    await gitManager.copySkill(skillPath, repoConfig.localPath, repoConfig.skillsPath, skillName);
    spinner.succeed(`Skill files → ${repoConfig.skillsPath}/${skillName}/`);

    // ── 7. Commit and push ─────────────────────────────────
    spinner.start('Committing and pushing...');
    await gitManager.commitAndPush(
      repoConfig.localPath,
      branchName,
      `Add skill: ${skillName} v${skillMeta.version}`,
      token,
      repoConfig.url
    );
    spinner.succeed('Changes pushed.');

    // ── 8. Open Pull Request ───────────────────────────────
    spinner.start('Creating pull request...');
    const prCreator = new PullRequestCreator();
    const { owner, repo } = PullRequestCreator.parseGitHubRepo(repoConfig.url);
    const pr = await prCreator.createGitHubPR(
      owner,
      repo,
      {
        title: `Add skill: ${skillName} v${skillMeta.version}`,
        body: `## 🧠 ${skillName}\n\nVersion: \`${skillMeta.version}\`\n\n> Published via [publish-skills](https://github.com/publish-skills/publish-skills)`,
        head: branchName,
        base: repoConfig.targetBranch,
      },
      token
    );

    spinner.succeed(chalk.green('Pull request created!'));
    console.log(`\n  ${chalk.bold('PR URL:')} ${chalk.cyan(pr.url)}\n`);
    console.log(chalk.gray('  Run with --reset to change the repository or re-authenticate.\n'));
  } catch (error) {
    spinner.fail(chalk.red('Publish failed.'));
    console.error(chalk.red('\nError:'), (error as Error).message);
    process.exit(1);
  }
};
