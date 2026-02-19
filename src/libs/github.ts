import {showMessage} from './globalLib'
import { useTtsStore } from "@/store/store";
import { store } from '@/global/initLocalStore';
import { ErrorType } from '@/libs/errorHandler';
import path from 'path';
import fs from 'fs';

const GitHub = require('github-api');
const encode = require('encoding');
const simpleGit = require('simple-git');

/**
 * Clone a GitHub repository to local storage
 * @param t - i18n translation function
 * @returns Promise<boolean> - true if clone succeeded, false otherwise
 */
export async function gitHubClone(t: (key: string) => string): Promise<boolean> {
  const ttsStore = useTtsStore();

  // Validate configuration
  if (!ttsStore.config.githubUsername || !ttsStore.config.githubRepoName) {
    ttsStore.setPushStatus(t('github.configMissing'), 'error');
    return false;
  }

  const name = ttsStore.config.githubUsername;
  const repo = ttsStore.config.githubRepoName;
  const notePath = ttsStore.config.savePath;
  const gitUrl = `https://github.com/${name}/${repo}.git`;
  const localPath = path.join(notePath, "repos", repo);

  console.log('Cloning to:', localPath);
  ttsStore.setPushStatus(t('github.cloning'), 'loading');

  const git = simpleGit();
  try {
    await git.clone(gitUrl, localPath);
    ttsStore.setPushStatus(t('github.cloneSuccess'), 'success');
    console.log('Clone finished');
    return true;
  } catch(error: any) {
    ttsStore.setPushStatus(t('github.cloneFailed') + ': ' + error.message, 'error');
    console.error('Clone failed:', error);
    return false;
  }
}


/**
 * Pull updates from remote GitHub repository
 * @param t - i18n translation function
 * @param loclRepo Optional local repository path
 */
export async function gitPull(t: (key: string) => string, loclRepo: string = ''): Promise<boolean> {
  const ttsStore = useTtsStore();

  // Validate configuration
  if (!ttsStore.config.githubRepoName) {
    ttsStore.setPushStatus(t('github.configMissing'), 'error');
    return false;
  }

  let repo = ttsStore.config.githubRepoName;
  if (loclRepo === '') {
    loclRepo = path.join(store.get("savePath"), "repos", repo);
  }

  // Check if directory exists
  if (!fs.existsSync(loclRepo)) {
    console.error('Repository directory does not exist:', loclRepo);
    ttsStore.setPushStatus(t('github.repoNotCloned'), 'error');
    return false;
  }

  console.log('Pulling from:', loclRepo);
  ttsStore.setPushStatus(t('github.pulling'), 'loading');

  const git = simpleGit(loclRepo);
  try {
    const update = await git.pull();
    console.log('Repo updated:', update);
    ttsStore.setPushStatus(t('github.pullSuccess'), 'success');
    return true;
  } catch (err: any) {
    console.error('Pull failed:', err);
    // Extract short error message
    let errorMsg = err.message || 'Unknown error';

    // Extract key error info (first line or first 50 chars)
    if (errorMsg.includes('\n')) {
      errorMsg = errorMsg.split('\n')[0];
    }
    if (errorMsg.length > 60) {
      errorMsg = errorMsg.substring(0, 60) + '...';
    }

    // Check for common error patterns
    if (errorMsg.includes('Authentication failed') || errorMsg.includes('auth')) {
      errorMsg = t('github.authFailed');
    } else if (errorMsg.includes('Network') || errorMsg.includes('network')) {
      errorMsg = t('github.networkError');
    } else if (errorMsg.includes('conflict') || errorMsg.includes('CONFLICT')) {
      errorMsg = t('github.conflictError');
    }

    ttsStore.setPushStatus(t('github.pullFailed') + ': ' + errorMsg, 'error');
    return false;
  }
}

/**
 * Push local changes to remote GitHub repository
 * @param t - i18n translation function
 */
export async function gitHubPush(t: (key: string) => string): Promise<boolean> {
  const ttsStore = useTtsStore();

  // Use current notebook path for consistency with checkGitStatus
  const repoDir = ttsStore.notebook.currentPath;

  if (!repoDir) {
    ttsStore.setPushStatus(t('github.configMissing'), 'error');
    return false;
  }

  // Check if directory exists
  if (!fs.existsSync(repoDir)) {
    console.error('Repository directory does not exist:', repoDir);
    ttsStore.setPushStatus(t('github.repoNotCloned'), 'error');
    return false;
  }

  console.log('Pushing from:', repoDir);
  ttsStore.setPushStatus(t('github.pushing'), 'loading');

  const git = simpleGit(repoDir);

  try {
    // Check if there are any changes to commit
    const status = await git.status();

    if (status.files.length > 0) {
      // There are changes, commit them
      await git.add('.');
      await git.commit('[notelite] add file');
    }

    // Check if there are commits to push
    if (status.ahead > 0 || status.files.length > 0) {
      await git.push(['-u', 'origin', 'main']);
      console.log('Push succeeded');
      ttsStore.setPushStatus(t('github.pushSuccess'), 'success');

      // Schedule git status check after successful push
      ttsStore.scheduleGitStatusCheck();
      return true;
    } else {
      console.log('Nothing to push');
      ttsStore.setPushStatus(t('git.upToDate'), 'success');

      // Still check status to make sure indicator is updated
      ttsStore.scheduleGitStatusCheck();
      return true;
    }
  } catch (err: any) {
    console.error('Push failed:', err);
    // Extract short error message
    let errorMsg = err.message || 'Unknown error';

    // Extract key error info (first line or first 50 chars)
    if (errorMsg.includes('\n')) {
      errorMsg = errorMsg.split('\n')[0];
    }
    if (errorMsg.length > 60) {
      errorMsg = errorMsg.substring(0, 60) + '...';
    }

    // Check for common error patterns
    if (errorMsg.includes('Authentication failed') || errorMsg.includes('auth')) {
      errorMsg = t('github.authFailed');
    } else if (errorMsg.includes('Network') || errorMsg.includes('network')) {
      errorMsg = t('github.networkError');
    } else if (errorMsg.includes('rejected') || errorMsg.includes('non-fast-forward')) {
      errorMsg = t('github.pushRejected');
    }

    ttsStore.setPushStatus(t('github.pushFailed') + ': ' + errorMsg, 'error');
    return false;
  }
}
