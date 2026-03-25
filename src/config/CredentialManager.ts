import { execSync } from 'child_process';
import * as os from 'os';

const SERVICE = 'publish-skills';

/**
 * Cross-platform secure credential storage.
 * Falls back to reading the token from the PUBLISH_SKILLS_TOKEN env var
 * so CI pipelines work without a keyring.
 */
export class CredentialManager {
  private platform: string;

  constructor() {
    this.platform = os.platform();
  }

  public async setToken(account: string, token: string): Promise<void> {
    try {
      const keytar = await import('keytar');
      await keytar.setPassword(SERVICE, account, token);
    } catch {
      throw new Error(
        'Could not store credentials. Ensure keytar native build is available or set PUBLISH_SKILLS_TOKEN.'
      );
    }
  }

  public async getToken(account: string): Promise<string | null> {
    // Allow override via env var (useful for CI)
    const envToken = process.env.PUBLISH_SKILLS_TOKEN;
    if (envToken) return envToken;

    try {
      const keytar = await import('keytar');
      return await keytar.getPassword(SERVICE, account);
    } catch {
      return null;
    }
  }

  public async deleteToken(account: string): Promise<void> {
    try {
      const keytar = await import('keytar');
      await keytar.deletePassword(SERVICE, account);
    } catch {
      // ignore
    }
  }
}
