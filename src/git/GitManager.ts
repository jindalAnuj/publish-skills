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
    // #region agent log
    const abbrevBefore = await git.revparse(['--abbrev-ref', 'HEAD']).catch(() => 'error');
    const st = await git.status();
    fetch('http://127.0.0.1:7755/ingest/01a22d84-716b-4044-864b-cf522087267f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '103d3e' },
      body: JSON.stringify({
        sessionId: '103d3e',
        runId: 'pre-fix',
        hypothesisId: 'A',
        location: 'GitManager.ts:commitAndPush:preAdd',
        message: 'status before git add',
        data: {
          branchName,
          abbrevBefore,
          isClean: st.isClean(),
          stagedCount: st.staged.length,
          notAddedCount: st.not_added.length,
          conflictedCount: st.conflicted.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    await git.add('.');
    // #region agent log
    const stAfterAdd = await git.status();
    fetch('http://127.0.0.1:7755/ingest/01a22d84-716b-4044-864b-cf522087267f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '103d3e' },
      body: JSON.stringify({
        sessionId: '103d3e',
        runId: 'pre-fix',
        hypothesisId: 'A',
        location: 'GitManager.ts:commitAndPush:postAdd',
        message: 'status after git add',
        data: {
          stagedCount: stAfterAdd.staged.length,
          stagedSample: stAfterAdd.staged.slice(0, 8),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    await git.commit(message);
    // #region agent log
    const abbrevAfterCommit = await git.revparse(['--abbrev-ref', 'HEAD']).catch(() => 'error');
    const headSha = await git.revparse(['HEAD']).catch(() => 'error');
    const log1 = await git.log({ maxCount: 1 });
    fetch('http://127.0.0.1:7755/ingest/01a22d84-716b-4044-864b-cf522087267f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '103d3e' },
      body: JSON.stringify({
        sessionId: '103d3e',
        runId: 'pre-fix',
        hypothesisId: 'B',
        location: 'GitManager.ts:commitAndPush:postCommit',
        message: 'after commit',
        data: {
          abbrevAfterCommit,
          headSha,
          latestMsg: log1.latest?.message?.slice(0, 80),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const authedUrl = this.injectToken(repoUrl, token);
    await git.addRemote('authed', authedUrl).catch(() => {
      // remote may already exist
    });
    try {
      const pushRes = await git.push('authed', branchName, ['--set-upstream']);
      // #region agent log
      fetch('http://127.0.0.1:7755/ingest/01a22d84-716b-4044-864b-cf522087267f', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '103d3e' },
        body: JSON.stringify({
          sessionId: '103d3e',
          runId: 'pre-fix',
          hypothesisId: 'C',
          location: 'GitManager.ts:commitAndPush:pushAuthed',
          message: 'push authed result',
          data: { remote: 'authed', branchName, pushSummary: String(pushRes) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } catch (pushErr: unknown) {
      // #region agent log
      fetch('http://127.0.0.1:7755/ingest/01a22d84-716b-4044-864b-cf522087267f', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '103d3e' },
        body: JSON.stringify({
          sessionId: '103d3e',
          runId: 'pre-fix',
          hypothesisId: 'C',
          location: 'GitManager.ts:commitAndPush:pushAuthedFailed',
          message: 'push authed failed; will try origin',
          data: {
            errName: pushErr instanceof Error ? pushErr.name : 'unknown',
            errMsg: pushErr instanceof Error ? pushErr.message.slice(0, 200) : String(pushErr).slice(0, 200),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      // fall back to origin if authed remote fails
      const pushRes2 = await git.push('origin', branchName, ['--set-upstream']);
      // #region agent log
      fetch('http://127.0.0.1:7755/ingest/01a22d84-716b-4044-864b-cf522087267f', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '103d3e' },
        body: JSON.stringify({
          sessionId: '103d3e',
          runId: 'pre-fix',
          hypothesisId: 'C',
          location: 'GitManager.ts:commitAndPush:pushOrigin',
          message: 'push origin result',
          data: { remote: 'origin', branchName, pushSummary: String(pushRes2) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
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
