import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  PublishSkillsConfig,
  RepositoryConfig,
  CentralRepositoryConfig,
} from '../models/Config';

const CONFIG_DIR_NAME = '.publish-skills';

const DEFAULT_CENTRAL_REPO: CentralRepositoryConfig = {
  owner: 'skill-hub-community',
  repo: 'skills',
  skillsPath: 'skills',
  branch: 'main',
};

const DEFAULT_CONFIG: PublishSkillsConfig = {
  author: { name: '', email: '' },
  repositories: {},
  defaultRepository: '',
  centralRepository: DEFAULT_CENTRAL_REPO,
  ui: { verbosity: 'normal' },
};

/** Persisted auth state stored alongside the main config */
interface AuthState {
  token: string;
  login: string;
}

export class ConfigManager {
  private config: PublishSkillsConfig;
  private configDir: string;
  private configFile: string;

  constructor() {
    this.configDir = path.join(os.homedir(), CONFIG_DIR_NAME);
    this.configFile = path.join(this.configDir, 'config.json');
    this.config = this.load();
  }

  private load(): PublishSkillsConfig {
    if (!fs.existsSync(this.configFile)) {
      return { ...DEFAULT_CONFIG };
    }

    try {
      const raw = fs.readFileSync(this.configFile, 'utf-8');
      return JSON.parse(raw) as PublishSkillsConfig;
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  public save(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  public getStorageDir(): string {
    return this.configDir;
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

  // ── Central repository config ──────────────────────────
  public getCentralRepository(): CentralRepositoryConfig {
    return this.config.centralRepository || DEFAULT_CENTRAL_REPO;
  }

  public setCentralRepository(config: CentralRepositoryConfig): void {
    this.config.centralRepository = config;
    this.save();
  }

  // ── Auth helpers ─────────────────────────────────────────
  public isAuthenticated(): boolean {
    const auth = this.getAuthState();
    return !!(auth?.token && auth?.login);
  }
}
