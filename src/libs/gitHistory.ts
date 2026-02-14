import path from 'path';
import fs from 'fs';

const simpleGit = require('simple-git');

interface CommitInfo {
  hash: string;
  date: string;
  message: string;
  author_name: string;
  author_email: string;
}

// Get commit history for a specific file
export async function getFileHistory(
  filePath: string,
  repoPath: string,
  limit: number = 50
): Promise<CommitInfo[]> {
  const git = simpleGit(repoPath);
  const relativePath = path.relative(repoPath, filePath).replace(/\\/g, '/');

  console.log('Getting history for file:', relativePath, 'in repo:', repoPath);

  try {
    // Use raw git command to ensure correct behavior
    // git log -- <file> only returns commits that modified that file
    // Note: We don't use --follow to avoid false positives from renamed files
    const gitCommand = [
      'log',
      `--max-count=${limit}`,
      '--pretty=format:%H|%ai|%an|%ae|%s',
      '--',
      relativePath
    ];

    console.log('Running git command:', 'git', gitCommand.join(' '));

    const result = await git.raw(gitCommand);

    if (!result || result.trim().length === 0) {
      console.log('No commits found for file');
      return [];
    }

    // Parse the output
    const lines = result.trim().split('\n');
    console.log('Parsed', lines.length, 'lines from git log');

    const allCommits: CommitInfo[] = lines.map(line => {
      const [hash, date, author_name, author_email, ...messageParts] = line.split('|');
      return {
        hash,
        date,
        author_name,
        author_email,
        message: messageParts.join('|') // In case message contains |
      };
    });

    // Verify each commit actually contains the file
    const validCommits: CommitInfo[] = [];

    for (const commit of allCommits) {
      try {
        await git.show([`${commit.hash}:${relativePath}`]);
        validCommits.push(commit);
        console.log('✓ Commit', commit.hash.substring(0, 7), 'contains file:', commit.message);
      } catch (error) {
        console.log('✗ Commit', commit.hash.substring(0, 7), 'does NOT contain file:', commit.message);
      }
    }

    console.log('Returning', validCommits.length, 'valid commits out of', allCommits.length);
    return validCommits;
  } catch (error) {
    console.error('Failed to get file history:', error);
    return [];
  }
}

// Get file content at a specific commit
export async function getFileContentAtCommit(
  filePath: string,
  repoPath: string,
  commitHash: string
): Promise<string | null> {
  const git = simpleGit(repoPath);
  const relativePath = path.relative(repoPath, filePath).replace(/\\/g, '/');

  console.log('Getting content for commit:', commitHash.substring(0, 7), 'file:', relativePath);

  try {
    const content = await git.show([`${commitHash}:${relativePath}`]);
    console.log('✅ Got content, length:', content.length);
    return content;
  } catch (error: any) {
    console.error('❌ Failed to get file content:', error.message);
    return null;
  }
}

// Restore file to a specific commit version
export async function restoreFileToCommit(
  filePath: string,
  repoPath: string,
  commitHash: string
): Promise<boolean> {
  const git = simpleGit(repoPath);
  const relativePath = path.relative(repoPath, filePath).replace(/\\/g, '/');

  console.log('Restoring file:', relativePath, 'to commit:', commitHash);

  try {
    await git.checkout([commitHash, '--', relativePath]);
    console.log('File restored successfully');
    return true;
  } catch (error) {
    console.error('Failed to restore file:', error);
    return false;
  }
}

// Check if file is in a git repository
export function isFileInGitRepo(filePath: string): boolean {
  let currentPath = path.dirname(filePath);

  // Walk up directory tree looking for .git
  while (currentPath !== path.dirname(currentPath)) {
    if (fs.existsSync(path.join(currentPath, '.git'))) {
      return true;
    }
    currentPath = path.dirname(currentPath);
  }

  return false;
}

// Get repository root path
export function getRepoPath(filePath: string): string | null {
  // First check if the path itself is a repo
  if (fs.existsSync(path.join(filePath, '.git'))) {
    return filePath;
  }

  // Then check parent directories
  let currentPath = path.dirname(filePath);

  while (currentPath !== path.dirname(currentPath)) {
    if (fs.existsSync(path.join(currentPath, '.git'))) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

// Check if there are unpushed commits
export async function hasUnpushedCommits(repoPath: string): Promise<boolean> {
  const git = simpleGit(repoPath);

  try {
    // Get the current branch
    const status = await git.status();
    const currentBranch = status.current;

    if (!currentBranch) {
      return false;
    }

    // Check if there are commits ahead of remote
    return status.ahead > 0;
  } catch (error) {
    console.error('Failed to check unpushed commits:', error);
    return false;
  }
}

// Check if there are uncommitted changes
export async function hasUncommittedChanges(repoPath: string): Promise<boolean> {
  const git = simpleGit(repoPath);

  try {
    const status = await git.status();
    // Check if there are modified, added, or deleted files
    return status.files.length > 0;
  } catch (error) {
    console.error('Failed to check uncommitted changes:', error);
    return false;
  }
}

// Get Git status summary
export async function getGitStatus(repoPath: string): Promise<{
  hasUncommitted: boolean;
  hasUnpushed: boolean;
  ahead: number;
  behind: number;
  filesChanged: number;
}> {
  const git = simpleGit(repoPath);

  try {
    const status = await git.status();

    return {
      hasUncommitted: status.files.length > 0,
      hasUnpushed: status.ahead > 0,
      ahead: status.ahead,
      behind: status.behind,
      filesChanged: status.files.length,
    };
  } catch (error) {
    console.error('Failed to get git status:', error);
    return {
      hasUncommitted: false,
      hasUnpushed: false,
      ahead: 0,
      behind: 0,
      filesChanged: 0,
    };
  }
}
