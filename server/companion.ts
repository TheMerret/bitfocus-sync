import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execAsync = promisify(exec)

export interface CompanionConfig {
  companionExe: string
  companionPort: number
}

export async function stopCompanion(config: CompanionConfig): Promise<void> {
  const platform = process.platform
  if (platform === 'win32') {
    const exeName = config.companionExe.split('\\').pop() ?? 'companion.exe'
    await execAsync(`taskkill /IM "${exeName}" /F`).catch(() => {
      // process may already be stopped
    })
  } else {
    await execAsync('pkill -f companion').catch(() => {
      // process may already be stopped
    })
  }
  await sleep(1000)
}

export async function startCompanion(config: CompanionConfig): Promise<void> {
  if (!fs.existsSync(config.companionExe)) {
    throw new Error(`Companion executable not found: ${config.companionExe}`)
  }
  const platform = process.platform
  if (platform === 'win32') {
    exec(`start "" "${config.companionExe}"`)
  } else {
    exec(`"${config.companionExe}" &`)
  }
}

export async function waitForCompanion(config: CompanionConfig, timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${config.companionPort}/`, { signal: AbortSignal.timeout(1000) })
      if (response.ok || response.status < 500) return
    } catch {
      // not ready yet
    }
    await sleep(1000)
  }
  throw new Error(`Companion did not become ready within ${timeoutMs}ms`)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
