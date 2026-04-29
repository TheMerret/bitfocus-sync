import { clone, commit, push, checkout, branch, log, statusMatrix, add } from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import fs from 'fs'

interface GitConfig {
  url: string
  username: string
  token: string
}

interface SyncConfig {
  gitRepoDir: string
  remote: GitConfig
}

interface CommitInfo {
  oid: string
  message: string
  author: { name: string; email: string }
  timestamp: string
}

interface BranchInfo {
  name: string
  lastCommit?: CommitInfo
}

export async function initGitRepo(config: SyncConfig): Promise<void> {
  const gitDir = `${config.gitRepoDir}/.git`
  let exists = false
  try {
    await fs.promises.access(gitDir)
    exists = true
  } catch {
    // not cloned yet
  }
  if (!exists) {
    console.log('Cloning git repository...')
    await clone({
      fs,
      http,
      dir: config.gitRepoDir,
      url: config.remote.url,
      depth: 1,
      singleBranch: true,
      onAuth: () => ({
        username: config.remote.username,
        password: config.remote.token,
      }),
    })
  }
}

export async function hasChanges(config: SyncConfig): Promise<boolean> {
  const matrix = await statusMatrix({ fs, dir: config.gitRepoDir })
  return matrix.some(([, head, workdir, stage]) => head !== 1 || workdir !== 1 || stage !== 1)
}

export async function stageAll(config: SyncConfig): Promise<void> {
  const matrix = await statusMatrix({ fs, dir: config.gitRepoDir })
  for (const [filepath] of matrix) {
    await add({ fs, dir: config.gitRepoDir, filepath: filepath as string })
  }
}

export async function commitChanges(config: SyncConfig, message: string): Promise<string> {
  await stageAll(config)
  const oid = await commit({
    fs,
    dir: config.gitRepoDir,
    message,
    author: {
      name: 'Companion Sync',
      email: 'sync@companion.local',
    },
  })
  return oid
}

export async function pushChanges(config: SyncConfig): Promise<void> {
  await push({
    fs,
    http,
    dir: config.gitRepoDir,
    remote: 'origin',
    ref: 'HEAD',
    onAuth: () => ({
      username: config.remote.username,
      password: config.remote.token,
    }),
  })
}

export async function switchBranch(config: SyncConfig, branchName: string): Promise<void> {
  await checkout({
    fs,
    dir: config.gitRepoDir,
    ref: branchName,
  })
}

export async function createBranch(config: SyncConfig, branchName: string): Promise<void> {
  await checkout({
    fs,
    dir: config.gitRepoDir,
    ref: branchName,
    startPoint: 'HEAD',
  })
}

export async function listBranches(config: SyncConfig): Promise<BranchInfo[]> {
  const branchResult = await branch({
    fs,
    dir: config.gitRepoDir,
    remote: true,
  })
  
  const branchInfos: BranchInfo[] = []
  if (branchResult && Array.isArray(branchResult)) {
    for (const branch of branchResult) {
      if (branch.startsWith('remotes/origin/')) {
        const localName = branch.replace('remotes/origin/', '')
        const commitInfo = await getBranchLatestCommit(config, localName)
        branchInfos.push({ name: localName, lastCommit: commitInfo })
      }
    }
  }
  
  return branchInfos
}

export async function getBranchLatestCommit(config: SyncConfig, branchName: string): Promise<CommitInfo | undefined> {
  try {
    const logResult = await log({
      fs,
      dir: config.gitRepoDir,
      ref: branchName,
      depth: 1,
    })
    
    if (!logResult || !Array.isArray(logResult) || logResult.length === 0) return undefined
    
    const commit = logResult[0]
    return {
      oid: commit.oid,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
      },
      timestamp: new Date(commit.commit.author.timestamp * 1000).toISOString(),
    }
  } catch {
    return undefined
  }
}

export async function getCommitHistory(config: SyncConfig, branchName: string, limit = 50): Promise<CommitInfo[]> {
  const logResult = await log({
    fs,
    dir: config.gitRepoDir,
    ref: branchName,
    depth: limit,
  })
  
  if (!logResult || !Array.isArray(logResult)) return []
  
  return logResult.map(commit => ({
    oid: commit.oid,
    message: commit.commit.message,
    author: {
      name: commit.commit.author.name,
      email: commit.commit.author.email,
    },
    timestamp: new Date(commit.commit.author.timestamp * 1000).toISOString(),
  }))
}

export async function checkoutCommit(config: SyncConfig, commitHash: string): Promise<void> {
  await checkout({
    fs,
    dir: config.gitRepoDir,
    ref: commitHash,
  })
}
