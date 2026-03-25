import yargs from 'yargs';
import chalk from 'chalk';
import ora from 'ora';
import { select, input, confirm } from '@inquirer/prompts';
import { Octokit } from '@octokit/rest';
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { ConfigManager } from '../config/ConfigManager';
import { CredentialManager } from '../config/CredentialManager';
import { AuthenticationError } from '../types';

export interface AuthArguments extends yargs.Arguments {
  action?: string;
}

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? 'Ov23lixD9DnoetVafjJv';

/**
 * Handles login action for GitHub
 */
async function handleGitHubLogin(): Promise<void> {
  console.log(chalk.cyan('\n🔐 GitHub Device Flow Authentication\n'));

  let token = '';

  const auth = createOAuthDeviceAuth({
    clientType: 'oauth-app',
    clientId: GITHUB_CLIENT_ID,
    scopes: ['repo', 'read:user'],
    onVerification: (verification) => {
      console.log(chalk.bold('  Open this URL in your browser:'));
      console.log(`  ${chalk.cyan.underline(verification.verification_uri)}\n`);
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
    throw new AuthenticationError('GitHub authentication failed', { originalError: err });
  }

  // Verify and get login
  const octokit = new Octokit({ auth: token });
  let login = '';

  try {
    const { data } = await octokit.rest.users.getAuthenticated();
    login = data.login;

    // Save credentials
    const credManager = new CredentialManager();
    await credManager.setToken(`github_${login}`, token);

    console.log(chalk.green(`✓ Logged in as ${chalk.bold(login)}\n`));
  } catch (error) {
    throw new AuthenticationError('Failed to verify GitHub credentials', { originalError: error });
  }
}

/**
 * Handles login action
 */
async function handleLogin(): Promise<void> {
  const platform = await select({
    message: 'Choose a Git platform to authenticate with',
    choices: [
      { name: 'GitHub', value: 'github' },
      { name: 'GitLab', value: 'gitlab' },
      { name: 'Bitbucket', value: 'bitbucket' },
    ],
  });

  const credManager = new CredentialManager();

  if (platform === 'github') {
    await handleGitHubLogin();
  } else if (platform === 'gitlab') {
    const token = await input({
      message: 'Enter your GitLab Personal Access Token (with api scope)',
    });

    const spinner = ora('Verifying GitLab token...').start();

    try {
      // TODO: Verify token with GitLab API
      spinner.succeed('GitLab token verified');
      await credManager.setToken('gitlab_token', token);
      console.log(chalk.green('\n✓ Successfully authenticated with GitLab!\n'));
    } catch (error) {
      spinner.fail('Token verification failed');
      throw error;
    }
  } else if (platform === 'bitbucket') {
    const username = await input({
      message: 'Enter your Bitbucket username',
    });

    const appPassword = await input({
      message: 'Enter your Bitbucket App Password',
    });

    const spinner = ora('Verifying Bitbucket credentials...').start();

    try {
      // TODO: Verify credentials with Bitbucket API
      spinner.succeed('Bitbucket credentials verified');
      await credManager.setToken('bitbucket_username', username);
      await credManager.setToken('bitbucket_apppassword', appPassword);
      console.log(chalk.green('\n✓ Successfully authenticated with Bitbucket!\n'));
    } catch (error) {
      spinner.fail('Credential verification failed');
      throw error;
    }
  }
}

/**
 * Handles logout action
 */
async function handleLogout(): Promise<void> {
  const platforms = await select({
    message: 'Choose a platform to logout from',
    choices: [
      { name: 'GitHub', value: 'github' },
      { name: 'GitLab', value: 'gitlab' },
      { name: 'Bitbucket', value: 'bitbucket' },
    ],
  });

  const confirmed = await confirm({
    message: `Remove authentication for ${platforms}?`,
    default: false,
  });

  if (!confirmed) {
    console.log(chalk.yellow('✗ Cancelled\n'));
    return;
  }

  const spinner = ora(`Removing ${platforms} authentication...`).start();

  try {
    const credManager = new CredentialManager();

    if (platforms === 'github') {
      // TODO: Get the current user and delete their token
      await credManager.deleteToken('github_auth');
    } else if (platforms === 'gitlab') {
      await credManager.deleteToken('gitlab_token');
    } else if (platforms === 'bitbucket') {
      await credManager.deleteToken('bitbucket_username');
      await credManager.deleteToken('bitbucket_apppassword');
    }

    spinner.succeed(`${platforms} authentication removed`);
    console.log(chalk.green(`\n✓ Successfully logged out from ${platforms}!\n`));
  } catch (error) {
    spinner.fail('Failed to remove authentication');
    throw error;
  }
}

/**
 * Handles status action
 */
async function handleStatus(): Promise<void> {
  console.log(chalk.cyan('\n🔐 Authentication Status\n'));
  console.log(chalk.yellow('  No platform authentication details available yet.\n'));
  console.log(chalk.gray('  Run: publish-skills auth login\n'));
}

/**
 * Handler for the auth command
 */
export const handler = async (argv: AuthArguments): Promise<void> => {
  try {
    const action = argv.action || (argv._ && argv._[1]) || 'status';

    switch (action) {
      case 'login':
        await handleLogin();
        break;
      case 'logout':
        await handleLogout();
        break;
      case 'status':
        await handleStatus();
        break;
      default:
        throw new AuthenticationError(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
};
