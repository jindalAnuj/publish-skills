export interface RepositoryConfig {
  platform: 'github' | 'gitlab' | 'bitbucket' | 'git';
  url: string;
  localPath: string;
  targetBranch: string;
  skillsPath: string;
}

export interface PublishSkillsConfig {
  author: { name: string; email?: string };
  repositories: Record<string, RepositoryConfig>;
  defaultRepository: string;
  ui: { verbosity: 'quiet' | 'normal' | 'verbose' };
}
