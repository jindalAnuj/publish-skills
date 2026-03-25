export interface PromptTemplate {
  name: string;
  template: string;
  description?: string;
  variables?: string[];
}

export interface Workflow {
  name: string;
  steps: unknown[];
  description?: string;
}

export interface Template {
  name: string;
  path: string;
}

export interface Resource {
  name: string;
  path: string;
}

export interface AgentConfig {
  supported: boolean;
  minVersion?: string;
  installPath?: string;
  setupScript?: string;
}

export interface Skill {
  id: string; // UUID
  name: string; // kebab-case package name
  version: string; // semver
  description: string; // ≤160 chars
  longDescription?: string;
  author: { name: string; email?: string; url?: string };
  license: string;
  keywords?: string[];
  tags: string[];
  schemaVersion: string;
  agentSupport: Record<string, AgentConfig>;
  dependencies?: Record<string, string>;
  content: {
    prompts?: PromptTemplate[];
    workflows?: Workflow[];
    templates?: Template[];
    resources?: Resource[];
  };
  repository?: string;
  publishedAt?: Date;
  updatedAt?: Date;
}
