import { CredentialManager } from '../../config/CredentialManager';

describe('CredentialManager', () => {
  let credentialManager: CredentialManager;

  beforeEach(() => {
    credentialManager = new CredentialManager();
  });

  it('should handle credential storage', async () => {
    // Test that credential manager can be instantiated
    expect(credentialManager).toBeDefined();
  });

  it('should use env var for token when available', async () => {
    // Set environment variable
    process.env.PUBLISH_SKILLS_TOKEN = 'test-token-from-env';

    // Mock keytar to throw error
    jest.mock('keytar', () => {
      throw new Error('Keytar not available in test');
    });

    const token = await credentialManager.getToken('test-account');

    // Should return env var value
    expect(token).toBe('test-token-from-env');

    // Clean up
    delete process.env.PUBLISH_SKILLS_TOKEN;
  });

  it('should return null when no credentials and no env var', async () => {
    // Remove env var
    delete process.env.PUBLISH_SKILLS_TOKEN;

    const token = await credentialManager.getToken('non-existent-account');

    // Should return null when keytar is unavailable and no env var
    expect(token).toBeNull();
  });
});
