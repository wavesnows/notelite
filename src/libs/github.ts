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
    ttsStore.setPushStatus(t('github.pullFailed') + ': ' + err.message, 'error');
    return false;
  }
}

/**
 * Push local changes to remote GitHub repository
 * @param t - i18n translation function
 */
export async function gitHubPush(t: (key: string) => string): Promise<boolean> {
  const ttsStore = useTtsStore();

  // Validate configuration
  if (!ttsStore.config.githubUsername || !ttsStore.config.githubRepoName) {
    ttsStore.setPushStatus(t('github.configMissing'), 'error');
    return false;
  }

  const repo = ttsStore.config.githubRepoName;
  const loclRepo = path.join(store.get("savePath"), "repos", repo);
  const repoDir = loclRepo;
  const repoName = repo;
  const username = ttsStore.config.githubUsername;
  const token = ttsStore.config.githubToken;

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
    // Commit and push files
    await git.add('.');
    await git.commit('[notelite] add file');
    await git.push(['-u', 'origin', 'main']);

    console.log('Push succeeded');
    ttsStore.setPushStatus(t('github.pushSuccess'), 'success');
    return true;
  } catch (err: any) {
    console.error('Push failed:', err);
    ttsStore.setPushStatus(t('github.pushFailed') + ': ' + err.message, 'error');
    return false;
  }
}
