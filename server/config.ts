import fs from 'fs'
import path from 'path'

export interface AppConfig {
  companionConfigDir: string
  companionExe: string
  companionPort: number
  gitRepoDir: string
  remote: {
    url: string
    username: string
    token: string
  }
  syncIntervalMs: number
}

const CONFIG_PATH = path.resolve('config.json')

export function loadConfig(): AppConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`config.json not found at ${CONFIG_PATH}. Copy config.example.json and fill in your values.`)
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as AppConfig
}

export function saveConfig(config: AppConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
}
