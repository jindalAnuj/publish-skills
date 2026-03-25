import * as path from 'path';
import * as fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { PublishError } from '../types';

export class GitManager {
  /**
   * Clone a repository to localPath. Skips if directory already exists.
   */
  public async cloneRepository(url: string, localPath: string, token: string): Promise<void> {
    if (fs.existsSync(localPath)) {
      return;
    }

    // Embed token into URL for HTTPS auth
    const authedUrl = this.injectToken(url, token);
    const git: SimpleGit = simpleGit();
    await git.clone(authedUrl, localPath);
  }

  /**
   * Pull latest changes on the target branch.
   */
  public async updateRepository(localPath: string, targetBranch: string): Promise<void> {
    const git: SimpleGit = simpleGit(localPath);
    await git.checkout(targetBranch);
    await git.pull('origin', targetBranch);
  }

  /**
   * Create a new branch from targetBranch.
   */
  public async createBranch(
    localPath: string,
    branchName: string,
    targetBranch: string
  ): Promise<void> {
    const git: SimpleGit = simpleGit(localPath);
    await git.checkout(targetBranch);
    await git.checkoutLocalBranch(branchName);
  }

  /**
   * Copy skill directory contents into the repo's skills/ folder.
   * Returns the destination path.
   */
  public async copySkill(
    skillPath: string,
    repoLocalPath: string,
    skillsPath: string,
    skillName: string
  ): Promise<string> {
    const dest = path.join(repoLocalPath, skillsPath, skillName);
    this.copyDirSync(skillPath, dest);
    return dest;
  }

  /**
   * Stage all changes, commit and push.
   */
  public async commitAndPush(
    localPath: string,
    branchName: string,
    message: string,
    token: string,
    repoUrl: string
  ): Promise<void> {
    const git: SimpleGit = simpleGit(localPath);
    await git.add('.');
    await git.commit(message);

    const authedUrl = this.injectToken(repoUrl, token);
    await git.addRemote('authed', authedUrl).catch(() => {
      // remote may already exist
    });
    try {
      await git.push('authed', branchName, ['--set-upstream']);
    } catch {
      // fall back to origin if authed remote fails
      await git.push('origin', branchName, ['--set-upstream']);
    }
  }

  // ────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────

  private injectToken(url: string, token: string): string {
    try {
      const parsed = new URL(url);
      parsed.password = token;
      parsed.username = 'x-token';
      return parsed.toString();
    } catch {
      throw new PublishError(`Invalid repository URL: ${url}`);
    }
  }

  private copyDirSync(src: string, dest: string): void {
    if (!fs.existsSync(src)) {
      throw new PublishError(`Skill directory not found: ${src}`);
    }
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcEntry = path.join(src, entry.name);
      const destEntry = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDirSync(srcEntry, destEntry);
      } else {
        fs.copyFileSync(srcEntry, destEntry);
      }
    }
  }
}
