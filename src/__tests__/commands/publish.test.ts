import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock chalk to handle ESM compatibility issues in tests
const mockChalkFn = (str: string): string => str;
const createChalkProxy = (): typeof mockChalkFn & Record<string, unknown> => {
  const handler: ProxyHandler<typeof mockChalkFn> = {
    get: () => createChalkProxy(),
    apply: (_target, _thisArg, args: string[]) => args[0] || '',
  };
  return new Proxy(mockChalkFn, handler) as typeof mockChalkFn & Record<string, unknown>;
};

jest.mock('chalk', () => ({
  __esModule: true,
  default: createChalkProxy(),
}));

const mockValidateMetadata = jest.fn();

const mockGetAuthState = jest.fn();
const mockSetAuthState = jest.fn();
const mockGetDefaultRepository = jest.fn();
const mockSetRepository = jest.fn();
const mockGetConfig = jest.fn();
const mockGetStorageDir = jest.fn();

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

// Inquirer prompts mocks
const mockInput = jest.fn();
const mockSelect = jest.fn();
const mockCheckbox = jest.fn();
const mockConfirm = jest.fn();
const mockPassword = jest.fn();
const mockCustomType = jest.fn();

jest.mock('@inquirer/prompts', () => ({
  input: mockInput,
  select: mockSelect,
  checkbox: mockCheckbox,
  confirm: mockConfirm,
  password: mockPassword,
  customType: mockCustomType,
}));

// Set default implementations matching the original mock behavior
mockInput.mockImplementation((options) => options.default || 'test-input');
mockSelect.mockImplementation((options) => options.choices[0].value);
mockConfirm.mockImplementation((options) => options.default || false);
mockCheckbox.mockReturnValue([]);
mockPassword.mockReturnValue('password');
mockCustomType.mockReturnValue(null);

const mockDiscoverSkills = jest.fn();
const mockIsSingleSkillDirectory = jest.fn();
const mockDiscoverSkillsFromKnownLocations = jest.fn();
const mockGetExistingKnownLocations = jest.fn();

jest.mock('../../utils/skillDiscovery', () => ({
  discoverSkills: mockDiscoverSkills,
  isSingleSkillDirectory: mockIsSingleSkillDirectory,
  discoverSkillsFromKnownLocations: mockDiscoverSkillsFromKnownLocations,
  discoverSkillsFromCwd: jest.fn().mockReturnValue([]),
  getExistingKnownLocations: mockGetExistingKnownLocations,
}));

jest.mock('../../ui/terminal', () => ({
  printBanner: jest.fn(),
  printSection: jest.fn(),
  printSkillSummary: jest.fn(),
  printSuccess: jest.fn(),
  printStep: jest.fn(),
  printInfo: jest.fn(),
  printWarning: jest.fn(),
  printError: jest.fn(),
  printDivider: jest.fn(),
  countdownConfirmation: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../validators/SkillValidator', () => ({
  SkillValidator: jest.fn().mockImplementation(() => ({
    validateMetadata: mockValidateMetadata,
  })),
}));

const mockGetCentralRepository = jest.fn();

const mockResolveGitHubSession = jest.fn();
const mockPersistGitHubSession = jest.fn();
const mockClearGitHubSession = jest.fn();

jest.mock('../../auth/githubSession', () => ({
  resolveGitHubSession: (...args: unknown[]): Promise<unknown> => mockResolveGitHubSession(...args),
  persistGitHubSession: (...args: unknown[]): Promise<unknown> => mockPersistGitHubSession(...args),
  clearGitHubSession: (...args: unknown[]): Promise<unknown> => mockClearGitHubSession(...args),
}));

jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({
    getAuthState: mockGetAuthState,
    setAuthState: mockSetAuthState,
    getDefaultRepository: mockGetDefaultRepository,
    setRepository: mockSetRepository,
    get: mockGetConfig,
    getStorageDir: mockGetStorageDir,
    getCentralRepository: mockGetCentralRepository,
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

    mockResolveGitHubSession.mockImplementation(async () => {
      const auth = mockGetAuthState();
      if (auth?.token && auth?.login) {
        return { token: auth.token, login: auth.login };
      }
      return undefined;
    });
    mockPersistGitHubSession.mockImplementation(
      async (_cm: unknown, token: string, login: string) => {
        mockSetAuthState({ token, login });
      }
    );
    mockClearGitHubSession.mockResolvedValue(undefined);

    // Reset inquirer mocks to defaults
    mockInput.mockImplementation((options) => options.default || 'test-input');
    mockSelect.mockImplementation((options) => options.choices[0].value);
    mockConfirm.mockImplementation((options) => options.default || false);
    mockCheckbox.mockReturnValue([]);
    mockPassword.mockReturnValue('password');
    mockCustomType.mockReturnValue(null);

    // Reset mock implementations to defaults
    mockValidateMetadata.mockImplementation(() => {});
    mockGetAuthState.mockReturnValue(undefined);
    mockGetDefaultRepository.mockReturnValue(undefined);
    mockGetStorageDir.mockReturnValue(path.join(os.homedir(), '.publish-skills'));
    mockGetCentralRepository.mockReturnValue({
      owner: 'skill-hub-community',
      repo: 'skills',
      skillsPath: 'skills',
      branch: 'main',
    });
    mockGetExistingKnownLocations.mockReturnValue([]);
    mockDiscoverSkillsFromKnownLocations.mockReturnValue([]);

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

    mockIsSingleSkillDirectory.mockReturnValue(true);
    mockDiscoverSkills.mockReturnValue([]);

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

    await expect(publishHandler(argv)).rejects.toThrow('invalid skill metadata');
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

  describe('multi-skill publishing', () => {
    let multiSkillDir: string;
    let skill1Dir: string;
    let skill2Dir: string;

    beforeEach(() => {
      multiSkillDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-skills-multi-test-'));
      skill1Dir = path.join(multiSkillDir, 'skill-one');
      skill2Dir = path.join(multiSkillDir, 'skill-two');

      fs.mkdirSync(skill1Dir);
      fs.mkdirSync(skill2Dir);

      fs.writeFileSync(
        path.join(skill1Dir, 'manifest.json'),
        JSON.stringify({
          id: 'skill-one',
          name: 'skill-one',
          version: '1.0.0',
          description: 'First test skill',
        })
      );

      fs.writeFileSync(
        path.join(skill2Dir, 'manifest.json'),
        JSON.stringify({
          id: 'skill-two',
          name: 'skill-two',
          version: '2.0.0',
          description: 'Second test skill',
        })
      );

      mockCloneRepository.mockResolvedValue(undefined);
      mockUpdateRepository.mockResolvedValue(undefined);
      mockCreateBranch.mockResolvedValue(undefined);
      mockCopySkill.mockResolvedValue('/tmp/repo/skills/skill');
      mockCommitAndPush.mockResolvedValue(undefined);
      mockCreateGitHubPR.mockResolvedValue({
        url: 'https://github.com/acme/skills/pull/2',
        number: 2,
        platform: 'github',
      });
      mockParseGitHubRepo.mockReturnValue({ owner: 'acme', repo: 'skills' });
      mockGetRepo.mockResolvedValue({ data: { id: 1 } });
      mockGetConfig.mockReturnValue({ defaultRepository: 'skills-repo' });
    });

    afterEach(() => {
      if (fs.existsSync(multiSkillDir)) {
        fs.rmSync(multiSkillDir, { recursive: true });
      }
    });

    it('should publish multiple skills with --all flag', async () => {
      mockGetAuthState.mockReturnValue({ token: 'cached-token', login: 'alice' });
      mockGetDefaultRepository.mockReturnValue({
        platform: 'github',
        url: 'https://github.com/acme/skills.git',
        localPath: '/tmp/repo',
        targetBranch: 'main',
        skillsPath: 'skills',
      });

      mockIsSingleSkillDirectory.mockReturnValue(false);
      mockDiscoverSkills.mockReturnValue([
        { path: skill1Dir, name: 'skill-one', version: '1.0.0', description: 'First test skill' },
        { path: skill2Dir, name: 'skill-two', version: '2.0.0', description: 'Second test skill' },
      ]);

      const argv: PublishArguments = {
        path: multiSkillDir,
        reset: false,
        all: true,
        _: [],
        $0: '',
      };

      await publishHandler(argv);

      expect(mockDiscoverSkills).toHaveBeenCalledWith(multiSkillDir);
      expect(mockValidateMetadata).toHaveBeenCalledTimes(2);

      // Should copy both skills
      expect(mockCopySkill).toHaveBeenCalledTimes(2);
      expect(mockCopySkill).toHaveBeenCalledWith(skill1Dir, '/tmp/repo', 'skills', 'skill-one');
      expect(mockCopySkill).toHaveBeenCalledWith(skill2Dir, '/tmp/repo', 'skills', 'skill-two');

      // Multi-skill branch name (timestamp based)
      expect(mockCreateBranch).toHaveBeenCalledWith(
        '/tmp/repo',
        expect.stringMatching(/^feature\/multi-skill-\d+$/),
        'main'
      );

      // Multi-skill commit message
      expect(mockCommitAndPush).toHaveBeenCalledWith(
        '/tmp/repo',
        expect.stringMatching(/^feature\/multi-skill-\d+$/),
        expect.stringMatching(/Add 2 skill\(s\): skill-one v1.0.0, skill-two v2.0.0/),
        'cached-token',
        'https://github.com/acme/skills.git'
      );

      // Multi-skill PR title and body
      expect(mockCreateGitHubPR).toHaveBeenCalledWith(
        'acme',
        'skills',
        expect.objectContaining({
          head: expect.stringMatching(/^feature\/multi-skill-\d+$/),
          base: 'main',
          title: expect.stringMatching(/Add 2 skill\(s\): skill-one, skill-two/),
          body: expect.stringContaining('## 🧠 skill-one'),
        }),
        'cached-token'
      );
    });

    it('should publish multiple skills with interactive selection', async () => {
      mockGetAuthState.mockReturnValue({ token: 'cached-token', login: 'alice' });
      mockGetDefaultRepository.mockReturnValue({
        platform: 'github',
        url: 'https://github.com/acme/skills.git',
        localPath: '/tmp/repo',
        targetBranch: 'main',
        skillsPath: 'skills',
      });

      mockIsSingleSkillDirectory.mockReturnValue(false);
      mockDiscoverSkills.mockReturnValue([
        { path: skill1Dir, name: 'skill-one', version: '1.0.0', description: 'First test skill' },
        { path: skill2Dir, name: 'skill-two', version: '2.0.0', description: 'Second test skill' },
      ]);

      // Mock the checkbox to select only the first skill
      mockCheckbox.mockReturnValue([skill1Dir]);

      const argv: PublishArguments = {
        path: multiSkillDir,
        reset: false,
        all: false,
        _: [],
        $0: '',
      };

      await publishHandler(argv);

      expect(mockDiscoverSkills).toHaveBeenCalledWith(multiSkillDir);
      expect(mockCheckbox).toHaveBeenCalled();
      expect(mockValidateMetadata).toHaveBeenCalledTimes(1);
      expect(mockCopySkill).toHaveBeenCalledTimes(1);
      expect(mockCopySkill).toHaveBeenCalledWith(skill1Dir, '/tmp/repo', 'skills', 'skill-one');

      // Single skill branch name (since only one selected)
      expect(mockCreateBranch).toHaveBeenCalledWith(
        '/tmp/repo',
        'feature/skill-one-v1.0.0',
        'main'
      );
      expect(mockCommitAndPush).toHaveBeenCalledWith(
        '/tmp/repo',
        'feature/skill-one-v1.0.0',
        'Add skill: skill-one v1.0.0',
        'cached-token',
        'https://github.com/acme/skills.git'
      );
    });

    it('should publish multiple skills when multiple selected interactively', async () => {
      mockGetAuthState.mockReturnValue({ token: 'cached-token', login: 'alice' });
      mockGetDefaultRepository.mockReturnValue({
        platform: 'github',
        url: 'https://github.com/acme/skills.git',
        localPath: '/tmp/repo',
        targetBranch: 'main',
        skillsPath: 'skills',
      });

      mockIsSingleSkillDirectory.mockReturnValue(false);
      mockDiscoverSkills.mockReturnValue([
        { path: skill1Dir, name: 'skill-one', version: '1.0.0', description: 'First test skill' },
        { path: skill2Dir, name: 'skill-two', version: '2.0.0', description: 'Second test skill' },
      ]);

      // Mock the checkbox to select both skills
      mockCheckbox.mockReturnValue([skill1Dir, skill2Dir]);

      const argv: PublishArguments = {
        path: multiSkillDir,
        reset: false,
        all: false,
        _: [],
        $0: '',
      };

      await publishHandler(argv);

      expect(mockDiscoverSkills).toHaveBeenCalledWith(multiSkillDir);
      expect(mockCheckbox).toHaveBeenCalled();
      expect(mockValidateMetadata).toHaveBeenCalledTimes(2);
      expect(mockCopySkill).toHaveBeenCalledTimes(2);
      expect(mockCopySkill).toHaveBeenCalledWith(skill1Dir, '/tmp/repo', 'skills', 'skill-one');
      expect(mockCopySkill).toHaveBeenCalledWith(skill2Dir, '/tmp/repo', 'skills', 'skill-two');

      // Multi-skill branch name
      expect(mockCreateBranch).toHaveBeenCalledWith(
        '/tmp/repo',
        expect.stringMatching(/^feature\/multi-skill-\d+$/),
        'main'
      );

      expect(mockCommitAndPush).toHaveBeenCalledWith(
        '/tmp/repo',
        expect.stringMatching(/^feature\/multi-skill-\d+$/),
        expect.stringMatching(/Add 2 skill\(s\): skill-one v1.0.0, skill-two v2.0.0/),
        'cached-token',
        'https://github.com/acme/skills.git'
      );

      expect(mockCreateGitHubPR).toHaveBeenCalledWith(
        'acme',
        'skills',
        expect.objectContaining({
          head: expect.stringMatching(/^feature\/multi-skill-\d+$/),
          base: 'main',
          title: expect.stringMatching(/Add 2 skill\(s\): skill-one, skill-two/),
          body: expect.stringContaining('## 🧠 skill-one'),
        }),
        'cached-token'
      );
    });

    it('should handle directory with no skills', async () => {
      mockGetAuthState.mockReturnValue({ token: 'cached-token', login: 'alice' });
      mockGetDefaultRepository.mockReturnValue(undefined);

      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-skills-empty-test-'));

      mockIsSingleSkillDirectory.mockReturnValue(false);
      mockDiscoverSkills.mockReturnValue([]);

      const argv: PublishArguments = {
        path: emptyDir,
        reset: false,
        all: false,
        _: [],
        $0: '',
      };

      await expect(publishHandler(argv)).rejects.toThrow('No skills found');

      if (fs.existsSync(emptyDir)) {
        fs.rmSync(emptyDir, { recursive: true });
      }
    });

    it('should abort when any skill fails validation in multi-skill publish', async () => {
      mockGetAuthState.mockReturnValue({ token: 'cached-token', login: 'alice' });
      mockGetDefaultRepository.mockReturnValue({
        platform: 'github',
        url: 'https://github.com/acme/skills.git',
        localPath: '/tmp/repo',
        targetBranch: 'main',
        skillsPath: 'skills',
      });

      mockIsSingleSkillDirectory.mockReturnValue(false);
      mockDiscoverSkills.mockReturnValue([
        { path: skill1Dir, name: 'skill-one', version: '1.0.0', description: 'First test skill' },
        { path: skill2Dir, name: 'skill-two', version: '2.0.0', description: 'Second test skill' },
      ]);

      // First skill fails validation, second passes
      mockValidateMetadata.mockImplementation((skill: unknown) => {
        const s = skill as Record<string, unknown>;
        if (s.name === 'skill-two') {
          // valid
          return;
        }
        throw new Error('missing required field');
      });

      const argv: PublishArguments = {
        path: multiSkillDir,
        reset: false,
        all: true,
        _: [],
        $0: '',
      };

      await expect(publishHandler(argv)).rejects.toThrow('Validation failed for 1 skill(s)');
      expect(mockCloneRepository).not.toHaveBeenCalled();
    });

    it('should exit cleanly when no skills selected interactively', async () => {
      mockGetAuthState.mockReturnValue({ token: 'cached-token', login: 'alice' });
      mockGetDefaultRepository.mockReturnValue(undefined);

      mockIsSingleSkillDirectory.mockReturnValue(false);
      mockDiscoverSkills.mockReturnValue([
        { path: skill1Dir, name: 'skill-one', version: '1.0.0', description: 'First test skill' },
      ]);

      // Mock the checkbox to select nothing
      mockCheckbox.mockReturnValue([]);

      const argv: PublishArguments = {
        path: multiSkillDir,
        reset: false,
        all: false,
        _: [],
        $0: '',
      };

      // Should resolve successfully without error
      await expect(publishHandler(argv)).resolves.toBeUndefined();
    });
  });
});
