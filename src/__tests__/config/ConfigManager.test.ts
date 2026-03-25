import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../../config/ConfigManager';
import type { RepositoryConfig } from '../../models/Config';

describe('ConfigManager', () => {
  let tempDir: string;
  let originalConfigFile: string;

  beforeEach(() => {
    // Create a temporary directory for config files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-skills-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should initialize with default config if no file exists', () => {
    const manager = new ConfigManager();
    const config = manager.get();

    expect(config.author).toBeDefined();
    expect(config.repositories).toBeDefined();
    expect(config.ui).toBeDefined();
  });

  it('should save and load config', () => {
    const manager = new ConfigManager();
    const config = manager.get();
    config.author.name = 'Test User';
    config.author.email = 'test@example.com';

    manager.save();

    const manager2 = new ConfigManager();
    const loadedConfig = manager2.get();

    expect(loadedConfig.author.name).toBe('Test User');
    expect(loadedConfig.author.email).toBe('test@example.com');
  });

  it('should store and retrieve repository config', () => {
    const manager = new ConfigManager();
    const testRepo: RepositoryConfig = {
      platform: 'github',
      url: 'https://github.com/test/repo',
      localPath: '/tmp/test',
      targetBranch: 'main',
      skillsPath: '/skills',
    };

    manager.setRepository('test-repo', testRepo);
    const retrieved = manager.getRepository('test-repo');

    expect(retrieved).toEqual(testRepo);
  });

  it('should handle auth state', () => {
    const manager = new ConfigManager();
    const authState = {
      token: 'test-token-123',
      login: 'testuser',
    };

    manager.setAuthState(authState);
    const retrieved = manager.getAuthState();

    expect(retrieved).toEqual(authState);
  });

  it('should clear auth state', () => {
    const manager = new ConfigManager();
    manager.setAuthState({ token: 'test', login: 'user' });
    manager.clearAuthState();

    expect(manager.getAuthState()).toBeUndefined();
  });

  it('should handle defaultRepository', () => {
    const manager = new ConfigManager();
    const testRepo: RepositoryConfig = {
      platform: 'github',
      url: 'https://github.com/test/repo',
      localPath: '/tmp/test',
      targetBranch: 'main',
      skillsPath: '/skills',
    };

    manager.setRepository('test-repo', testRepo);
    expect(manager.getDefaultRepository()).toEqual(testRepo);
  });
});
