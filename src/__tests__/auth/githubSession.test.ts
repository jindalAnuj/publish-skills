import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockGetAuthenticated = jest.fn();

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      users: {
        getAuthenticated: mockGetAuthenticated,
      },
    },
  })),
}));

jest.mock('keytar', () => ({
  getPassword: jest.fn().mockResolvedValue(null),
  setPassword: jest.fn().mockResolvedValue(undefined),
  deletePassword: jest.fn().mockResolvedValue(true),
}));

import keytar from 'keytar';
import { ConfigManager } from '../../config/ConfigManager';
import { clearGitHubSession, persistGitHubSession, resolveGitHubSession } from '../../auth/githubSession';
import { CredentialManager } from '../../config/CredentialManager';

describe('githubSession', () => {
  let tempDir: string;
  let originalHome: string | undefined;
  let originalPublishToken: string | undefined;
  let originalGithubToken: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-skills-session-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
    originalPublishToken = process.env.PUBLISH_SKILLS_TOKEN;
    originalGithubToken = process.env.GITHUB_TOKEN;
    delete process.env.PUBLISH_SKILLS_TOKEN;
    delete process.env.GITHUB_TOKEN;
    jest.clearAllMocks();
    mockGetAuthenticated.mockResolvedValue({ data: { login: 'octocat' } });
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    if (originalPublishToken !== undefined) {
      process.env.PUBLISH_SKILLS_TOKEN = originalPublishToken;
    } else {
      delete process.env.PUBLISH_SKILLS_TOKEN;
    }
    if (originalGithubToken !== undefined) {
      process.env.GITHUB_TOKEN = originalGithubToken;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('resolveGitHubSession reads token from config when keychain is empty', async () => {
    const manager = new ConfigManager();
    manager.setAuthState({ token: 'file-token', login: 'legacy' });

    const result = await resolveGitHubSession(manager);

    expect(result).toEqual({ token: 'file-token', login: 'octocat' });
    expect(mockGetAuthenticated).toHaveBeenCalled();
  });

  it('resolveGitHubSession prefers PUBLISH_SKILLS_TOKEN over file', async () => {
    process.env.PUBLISH_SKILLS_TOKEN = 'env-pat';
    const manager = new ConfigManager();
    manager.setAuthState({ token: 'file-token', login: 'legacy' });

    const result = await resolveGitHubSession(manager);

    expect(result).toEqual({ token: 'env-pat', login: 'octocat' });
  });

  it('resolveGitHubSession uses keychain token when file is empty', async () => {
    (keytar.getPassword as jest.Mock).mockResolvedValueOnce('keychain-token');

    const manager = new ConfigManager();
    const result = await resolveGitHubSession(manager);

    expect(result).toEqual({ token: 'keychain-token', login: 'octocat' });
    expect(keytar.getPassword).toHaveBeenCalledWith(
      CredentialManager.serviceName,
      CredentialManager.githubAccount
    );
  });

  it('persistGitHubSession writes config and attempts keychain', async () => {
    const manager = new ConfigManager();
    await persistGitHubSession(manager, 'new-token', 'dev');

    expect(manager.getAuthState()).toEqual({ token: 'new-token', login: 'dev' });
    expect(keytar.setPassword).toHaveBeenCalledWith(
      CredentialManager.serviceName,
      CredentialManager.githubAccount,
      'new-token'
    );
  });

  it('clearGitHubSession removes file auth and keychain entry', async () => {
    const manager = new ConfigManager();
    manager.setAuthState({ token: 'x', login: 'y' });

    await clearGitHubSession(manager);

    expect(manager.getAuthState()).toBeUndefined();
    expect(keytar.deletePassword).toHaveBeenCalledWith(
      CredentialManager.serviceName,
      CredentialManager.githubAccount
    );
  });
});
