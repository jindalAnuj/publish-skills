import { Octokit } from '@octokit/rest';
import { PublishError } from '../types';

export interface PROptions {
  title: string;
  body: string;
  head: string; // source branch
  base: string; // target branch
}

export interface PullRequest {
  url: string;
  number: number;
  platform: 'github' | 'gitlab' | 'bitbucket';
}

export class PullRequestCreator {
  /**
   * Create a GitHub Pull Request.
   */
  public async createGitHubPR(
    owner: string,
    repo: string,
    options: PROptions,
    token: string
  ): Promise<PullRequest> {
    const octokit = new Octokit({ auth: token });

    try {
      const { data } = await octokit.rest.pulls.create({
        owner,
        repo,
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base,
      });

      return {
        url: data.html_url,
        number: data.number,
        platform: 'github',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new PublishError(`Failed to create GitHub PR: ${msg}`, { owner, repo });
    }
  }

  /**
   * Create a GitLab Merge Request.
   */
  public async createGitLabMR(
    projectId: string,
    options: PROptions,
    token: string
  ): Promise<PullRequest> {
    // Dynamic import to avoid loading the heavy SDK unless needed
    const { Gitlab } = await import('@gitbeaker/rest');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gl = new (Gitlab as any)({ token });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mr: any = await gl.MergeRequests.create(projectId, options.head, options.base, options.title, { description: options.body });
      return {
        url: mr.web_url as string,
        number: mr.iid as number,
        platform: 'gitlab',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new PublishError(`Failed to create GitLab MR: ${msg}`, { projectId });
    }
  }

  /**
   * Parse "owner/repo" from a GitHub HTTPS URL.
   */
  public static parseGitHubRepo(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!match) {
      throw new PublishError(`Cannot parse GitHub owner/repo from URL: ${url}`);
    }
    return { owner: match[1], repo: match[2] };
  }
}
