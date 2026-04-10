import { Octokit } from '@octokit/rest';
import { CredentialManager } from '../config/CredentialManager';
import { ConfigManager } from '../config/ConfigManager';

const credentialManager = new CredentialManager();

function isUnauthorized(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const status = (err as { status?: number }).status;
  return status === 401;
}

/**
 * Returns the GitHub username for a valid token, or null if the token is rejected (401).
 */
async function loginForToken(token: string): Promise<string | null> {
  const octokit = new Octokit({ auth: token });
  try {
    const { data } = await octokit.rest.users.getAuthenticated();
    return data.login;
  } catch (err: unknown) {
    if (isUnauthorized(err)) return null;
    throw err;
  }
}

function envGitHubToken(): string | undefined {
  const a = process.env.PUBLISH_SKILLS_TOKEN?.trim();
  const b = process.env.GITHUB_TOKEN?.trim();
  return a || b || undefined;
}

/**
 * Resolves a usable GitHub token and login in this order:
 * 1. PUBLISH_SKILLS_TOKEN or GITHUB_TOKEN (CI, `gh auth token`, etc.)
 * 2. Token stored in the OS keychain (keytar)
 * 3. Legacy token in ~/.publish-skills/config.json under _auth
 *
 * Each stored token is verified with the GitHub API. Stale tokens are removed
 * from that store before trying the next source.
 */
export async function resolveGitHubSession(
  configManager: ConfigManager
): Promise<{ token: string; login: string } | undefined> {
  const envToken = envGitHubToken();
  if (envToken) {
    const login = await loginForToken(envToken);
    if (login) return { token: envToken, login };
    // Env var set but rejected by GitHub — try keychain / config before device flow
  }

  let keyToken: string | null = null;
  try {
    const keytar = await import('keytar');
    keyToken = await keytar.getPassword(CredentialManager.serviceName, CredentialManager.githubAccount);
  } catch {
    keyToken = null;
  }

  if (keyToken) {
    const login = await loginForToken(keyToken);
    if (login) return { token: keyToken, login };
    try {
      const keytar = await import('keytar');
      await keytar.deletePassword(
        CredentialManager.serviceName,
        CredentialManager.githubAccount
      );
    } catch {
      // ignore
    }
  }

  const fileAuth = configManager.getAuthState();
  if (fileAuth?.token) {
    const login = await loginForToken(fileAuth.token);
    if (login) {
      if (login !== fileAuth.login) {
        configManager.setAuthState({ token: fileAuth.token, login });
      }
      return { token: fileAuth.token, login };
    }
    configManager.clearAuthState();
  }

  return undefined;
}

/**
 * Saves the GitHub token to the OS keychain when possible, and always updates
 * config so login is remembered (legacy file also holds the token if keychain fails).
 */
export async function persistGitHubSession(
  configManager: ConfigManager,
  token: string,
  login: string
): Promise<void> {
  try {
    await credentialManager.setToken(CredentialManager.githubAccount, token);
  } catch {
    // keytar unavailable — config still stores the session
  }
  configManager.setAuthState({ token, login });
}

export async function clearGitHubSession(configManager: ConfigManager): Promise<void> {
  configManager.clearAuthState();
  await credentialManager.deleteToken(CredentialManager.githubAccount);
}
