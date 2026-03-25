import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const mockValidateMetadata = jest.fn();

const mockGetAuthState = jest.fn();
const mockSetAuthState = jest.fn();
const mockGetDefaultRepository = jest.fn();
const mockSetRepository = jest.fn();
const mockGetConfig = jest.fn();

const mockCloneRepository = jest.fn();
const mockUpdateRepository = jest.fn();
const mockCreateBranch = jest.fn();
const mockCopySkill = jest.fn();
const mockCommitAndPush = jest.fn();

const mockCreateGitHubPR = jest.fn();
const mockParseGitHubRepo = jest.fn();

const mockCreateOAuthDeviceAuth = jest.fn();

const mockGetAuthenticated = jest.fn();
const mockListForAuthenticatedUser = jest.fn();
const mockCreateForAuthenticatedUser = jest.fn();
const mockGetRepo = jest.fn();

jest.mock('../../validators/SkillValidator', () => ({
  SkillValidator: jest.fn().mockImplementation(() => ({
    validateMetadata: mockValidateMetadata,
  })),
}));

jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({
    getAuthState: mockGetAuthState,
    setAuthState: mockSetAuthState,
    getDefaultRepository: mockGetDefaultRepository,
    setRepository: mockSetRepository,
    get: mockGetConfig,
  })),
}));

jest.mock('../../git/GitManager', () => ({
  GitManager: jest.fn().mockImplementation(() => ({
    cloneRepository: mockCloneRepository,
    updateRepository: mockUpdateRepository,
    createBranch: mockCreateBranch,
    copySkill: mockCopySkill,
    commitAndPush: mockCommitAndPush,
  })),
}));

jest.mock('../../git/PullRequestCreator', () => {
  const PullRequestCreator = jest.fn().mockImplementation(() => ({
    createGitHubPR: mockCreateGitHubPR,
  }));

  (PullRequestCreator as unknown as { parseGitHubRepo: jest.Mock }).parseGitHubRepo =
    mockParseGitHubRepo;

  return { PullRequestCreator };
});

jest.mock('@octokit/auth-oauth-device', () => ({
  createOAuthDeviceAuth: mockCreateOAuthDeviceAuth,
}));

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      users: {
        getAuthenticated: mockGetAuthenticated,
      },
      repos: {
        listForAuthenticatedUser: mockListForAuthenticatedUser,
        createForAuthenticatedUser: mockCreateForAuthenticatedUser,
        get: mockGetRepo,
      },
    },
  })),
}));

import { handler as publishHandler } from '../../commands/publish';
import type { PublishArguments } from '../../commands/publish';

describe('publish command', () => {
  let tempSkillDir: string;

  beforeEach(() => {
    jest.clearAllMocks();

    tempSkillDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-skills-publish-test-'));
    fs.writeFileSync(
      path.join(tempSkillDir, 'manifest.json'),
      JSON.stringify(
        {
          id: 'test-skill',
          name: 'test-skill',
          version: '1.2.3',
          description: 'A test skill',
        },
        null,
        2
      )
    );

    mockCloneRepository.mockResolvedValue(undefined);
    mockUpdateRepository.mockResolvedValue(undefined);
    mockCreateBranch.mockResolvedValue(undefined);
    mockCopySkill.mockResolvedValue('/tmp/repo/skills/test-skill');
    mockCommitAndPush.mockResolvedValue(undefined);
    mockCreateGitHubPR.mockResolvedValue({
      url: 'https://github.com/acme/skills/pull/1',
      number: 1,
      platform: 'github',
    });
    mockParseGitHubRepo.mockReturnValue({ owner: 'acme', repo: 'skills' });
    mockGetRepo.mockResolvedValue({ data: { id: 1 } });

    mockGetConfig.mockReturnValue({ defaultRepository: 'skills-repo' });
  });

  afterEach(() => {
    if (fs.existsSync(tempSkillDir)) {
      fs.rmSync(tempSkillDir, { recursive: true });
    }
  });

  it('should publish successfully using cached auth and repository config', async () => {
    mockGetAuthState.mockReturnValue({ token: 'cached-token', login: 'alice' });
    mockGetDefaultRepository.mockReturnValue({
      platform: 'github',
      url: 'https://github.com/acme/skills.git',
      localPath: '/tmp/repo',
      targetBranch: 'main',
      skillsPath: 'skills',
    });

    const argv: PublishArguments = {
      path: tempSkillDir,
      reset: false,
      _: [],
      $0: '',
    };

    await publishHandler(argv);

    expect(mockValidateMetadata).toHaveBeenCalled();
    expect(mockCreateOAuthDeviceAuth).not.toHaveBeenCalled();
    expect(mockGetRepo).toHaveBeenCalledWith({ owner: 'acme', repo: 'skills' });

    expect(mockCloneRepository).toHaveBeenCalledWith(
      'https://github.com/acme/skills.git',
      '/tmp/repo',
      'cached-token'
    );
    expect(mockCreateBranch).toHaveBeenCalledWith('/tmp/repo', 'feature/test-skill-v1.2.3', 'main');
    expect(mockCopySkill).toHaveBeenCalledWith(tempSkillDir, '/tmp/repo', 'skills', 'test-skill');
    expect(mockCommitAndPush).toHaveBeenCalledWith(
      '/tmp/repo',
      'feature/test-skill-v1.2.3',
      'Add skill: test-skill v1.2.3',
      'cached-token',
      'https://github.com/acme/skills.git'
    );

    expect(mockCreateGitHubPR).toHaveBeenCalledWith(
      'acme',
      'skills',
      expect.objectContaining({
        head: 'feature/test-skill-v1.2.3',
        base: 'main',
        title: 'Add skill: test-skill v1.2.3',
      }),
      'cached-token'
    );

    expect(mockSetAuthState).not.toHaveBeenCalled();
    expect(mockSetRepository).not.toHaveBeenCalled();
  });

  it('should authenticate via device flow and create a repository when no cache exists', async () => {
    mockGetAuthState.mockReturnValue(undefined);
    mockGetDefaultRepository.mockReturnValue(undefined);

    const mockAuth = jest.fn().mockResolvedValue({ token: 'oauth-token' });
    mockCreateOAuthDeviceAuth.mockReturnValue(mockAuth);
    mockGetAuthenticated.mockResolvedValue({ data: { login: 'new-user' } });

    mockListForAuthenticatedUser.mockResolvedValue({ data: [] });
    mockCreateForAuthenticatedUser.mockResolvedValue({
      data: {
        owner: { login: 'new-user' },
        name: 'my-skills-repo',
        clone_url: 'https://github.com/new-user/my-skills-repo.git',
        default_branch: 'main',
        full_name: 'new-user/my-skills-repo',
      },
    });

    const argv: PublishArguments = {
      path: tempSkillDir,
      reset: false,
      _: [],
      $0: '',
    };

    await publishHandler(argv);

    expect(mockCreateOAuthDeviceAuth).toHaveBeenCalled();
    expect(mockAuth).toHaveBeenCalledWith({ type: 'oauth' });
    expect(mockSetAuthState).toHaveBeenCalledWith({ token: 'oauth-token', login: 'new-user' });

    expect(mockSetRepository).toHaveBeenCalledWith(
      'my-skills-repo',
      expect.objectContaining({
        platform: 'github',
        url: 'https://github.com/new-user/my-skills-repo.git',
        targetBranch: 'main',
        skillsPath: 'skills',
      })
    );

    expect(mockCloneRepository).toHaveBeenCalledWith(
      'https://github.com/new-user/my-skills-repo.git',
      expect.stringContaining(path.join('.publish-skills', 'repos', 'my-skills-repo')),
      'oauth-token'
    );
  });

  it('should fail and exit when validation throws an error', async () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    mockValidateMetadata.mockImplementation(() => {
      throw new Error('invalid skill metadata');
    });

    mockGetAuthState.mockReturnValue({ token: 'cached-token', login: 'alice' });
    mockGetDefaultRepository.mockReturnValue({
      platform: 'github',
      url: 'https://github.com/acme/skills.git',
      localPath: '/tmp/repo',
      targetBranch: 'main',
      skillsPath: 'skills',
    });

    const argv: PublishArguments = {
      path: tempSkillDir,
      reset: false,
      _: [],
      $0: '',
    };

    await expect(publishHandler(argv)).rejects.toThrow('process.exit called with "1"');
    expect(mockConsoleError).toHaveBeenCalled();
    expect(mockCloneRepository).not.toHaveBeenCalled();
    mockConsoleError.mockRestore();
  });

  it('should reprompt and replace cached repository when cached URL is invalid', async () => {
    mockGetAuthState.mockReturnValue({ token: 'cached-token', login: 'alice' });
    mockGetDefaultRepository.mockReturnValue({
      platform: 'github',
      url: 'https://github.com/test/repo/',
      localPath: '/tmp/repo',
      targetBranch: 'main',
      skillsPath: 'skills',
    });

    mockGetRepo.mockRejectedValue(new Error('Not found'));
    mockListForAuthenticatedUser.mockResolvedValue({ data: [] });
    mockCreateForAuthenticatedUser.mockResolvedValue({
      data: {
        owner: { login: 'alice' },
        name: 'new-skills-repo',
        clone_url: 'https://github.com/alice/new-skills-repo.git',
        default_branch: 'main',
        full_name: 'alice/new-skills-repo',
      },
    });

    const argv: PublishArguments = {
      path: tempSkillDir,
      reset: false,
      _: [],
      $0: '',
    };

    await publishHandler(argv);

    expect(mockSetRepository).toHaveBeenCalledWith(
      'new-skills-repo',
      expect.objectContaining({
        url: 'https://github.com/alice/new-skills-repo.git',
        targetBranch: 'main',
      })
    );

    expect(mockCloneRepository).toHaveBeenCalledWith(
      'https://github.com/alice/new-skills-repo.git',
      expect.stringContaining(path.join('.publish-skills', 'repos', 'new-skills-repo')),
      'cached-token'
    );
  });
});
