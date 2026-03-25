import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { PublishSkillsConfig, RepositoryConfig } from '../models/Config';

const CONFIG_DIR = path.join(os.homedir(), '.publish-skills');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: PublishSkillsConfig = {
  author: { name: '', email: '' },
  repositories: {},
  defaultRepository: '',
  ui: { verbosity: 'normal' },
};

/** Persisted auth state stored alongside the main config */
interface AuthState {
  token: string;
  login: string;
}

export class ConfigManager {
  private config: PublishSkillsConfig;

  constructor() {
    this.config = this.load();
  }

  private load(): PublishSkillsConfig {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG };
    }
    try {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(raw) as PublishSkillsConfig;
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  public save(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  // ── Auth state ──────────────────────────────────────────
  public getAuthState(): AuthState | undefined {
    const raw = this.config as unknown as Record<string, unknown>;
    return raw['_auth'] as AuthState | undefined;
  }

  public setAuthState(state: AuthState): void {
    (this.config as unknown as Record<string, unknown>)['_auth'] = state;
    this.save();
  }

  public clearAuthState(): void {
    const raw = this.config as unknown as Record<string, unknown>;
    delete raw['_auth'];
    this.save();
  }

  // ── Repository config ───────────────────────────────────
  public getDefaultRepository(): RepositoryConfig | undefined {
    return this.config.repositories[this.config.defaultRepository];
  }

  public getRepository(name: string): RepositoryConfig | undefined {
    return this.config.repositories[name];
  }

  public setRepository(name: string, repo: RepositoryConfig): void {
    this.config.repositories[name] = repo;
    this.config.defaultRepository = name;
    this.save();
  }

  public get(): PublishSkillsConfig {
    return this.config;
  }
}
