# Companion Sync — Project System Prompt

## What we're building

A desktop companion tool for **Bitfocus Companion** that:
1. Periodically syncs config to a Git repository (versioning)
2. Supports multiple config profiles via Git branches
3. Provides a local React/Vite web UI for switching profiles and viewing history

---

## Stack

| Layer | Choice |
|---|---|
| UI framework | React + Vite (prototype = `vite dev`, Electron-compatible structure) |
| Git backend | `isomorphic-git` (pure JS, no system Git required) |
| Git remote | Any remote via HTTPS — GitHub, GitLab, Gitea, etc. |
| Node backend | Node.js script (runs alongside Vite dev server) |
| IPC | REST API over localhost (UI talks to Node backend via `fetch`) |
| Platform target | Windows primary, Linux optional |

---

## Companion process management

- **Windows:** use `taskkill /IM companion-module-...exe /F` to stop, `start "" "path\to\companion.exe"` to restart
- **Linux (optional):** use `pkill -f companion` / re-exec
- Process name and executable path are **configurable** in a config file
- Before any branch switch: stop Companion → switch branch → restore files → restart Companion
- After restart, wait for Companion to be ready (poll its HTTP port, configurable timeout)

---

## Companion config directory

- Default path (Windows): `%APPDATA%\companion-nodejs\v4.1\`
- Default path (Linux): `~/.config/companion-nodejs/v4.1/`
- Configurable via `config.json`

---

## What gets synced to Git

For each sync commit, the tool:

1. **Exports SQL dumps** of both SQLite databases using `better-sqlite3`:
   - `db.sqlite` → `db.sql` (full `.dump` equivalent)
   - `cache.sqlite` → `cache.sql`
2. **Copies the full config directory** (all files except `*.sqlite-shm`, `*.sqlite-wal` temp files)
3. Commits everything with message: `sync: YYYY-MM-DD HH:MM:SS`
4. Pushes to the configured remote + branch

Files excluded from git (`.gitignore`):
```
*.sqlite-shm
*.sqlite-wal
```

---

## Sync schedule

- Auto-sync runs **every 5 minutes** (hardcoded for prototype, `SYNC_INTERVAL_MS = 5 * 60 * 1000`)
- Also triggerable manually from the UI ("Sync now" button)
- Sync is skipped if there are no changes (check git status before committing)

---

## Git / profile model

- Each **profile = one Git branch**
- `main` branch = default/production profile
- Creating a new profile = create a new branch from current HEAD
- Switching profile = checkout that branch (after stopping Companion)
- Version history = git log on current branch
- Remote auth: HTTPS with username + token (stored in `config.json`, never committed)

---

## Config file (`config.json`)

Located next to the app. Structure:

```json
{
  "companionConfigDir": "C:\\Users\\user\\AppData\\Roaming\\companion-nodejs\\v4.1",
  "companionExe": "C:\\Program Files\\Bitfocus\\Companion\\companion.exe",
  "companionPort": 8000,
  "gitRepoDir": "C:\\Users\\user\\companion-sync-repo",
  "remote": {
    "url": "https://github.com/user/companion-config",
    "username": "user",
    "token": "ghp_..."
  },
  "syncIntervalMs": 300000
}
```

---

## Web UI (React + Vite)

Runs on `localhost` only. Single-page app with these views:

### Dashboard / Status
- Current branch (active profile)
- Last sync time + commit hash
- Sync status indicator (idle / syncing / error)
- "Sync now" button
- Auto-sync toggle

### Profiles
- List of all branches with last commit date
- "Switch" button per branch (triggers stop → checkout → restart flow)
- "New profile" button (name input → creates branch from current HEAD)
- Delete branch (with confirmation, cannot delete current)

### History
- Git log for current branch (last 50 commits)
- Each entry: timestamp, short hash, changed files count
- "Restore this version" button (checkout specific commit → restart Companion)

### Settings
- Edit all fields from `config.json`
- Test connection (verify remote is reachable with provided credentials)
- Test Companion path (verify exe exists)

---

## Project structure

```
companion-sync/
├── config.json               # user config (gitignored in this repo)
├── config.example.json       # template
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx              # React entry
│   ├── App.tsx
│   ├── api.ts                # typed fetch wrappers for backend
│   ├── views/
│   │   ├── Dashboard.tsx
│   │   ├── Profiles.tsx
│   │   ├── History.tsx
│   │   └── Settings.tsx
│   └── components/
│       └── ...
└── server/
    ├── index.ts              # Express backend (localhost only)
    ├── git.ts                # isomorphic-git operations
    ├── companion.ts          # process stop/start/poll
    ├── sqlite.ts             # better-sqlite3 dump logic
    └── sync.ts               # scheduler + sync orchestration
```

---

## Key dependencies

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "express": "^4",
    "isomorphic-git": "^1",
    "better-sqlite3": "^9",
    "@isomorphic-git/http": "^1"
  },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "typescript": "^5",
    "concurrently": "^8"
  }
}
```

Start command (dev): `concurrently "node server/index.ts" "vite"`

---

## Implementation notes

- `isomorphic-git` requires an `http` plugin for push/fetch — use `@isomorphic-git/http/node`
- `better-sqlite3` is a native module — on Windows requires build tools or prebuilt binaries
- The backend Express server binds strictly to `127.0.0.1` (never `0.0.0.0`)
- SQLite dump: iterate all tables with `SELECT * FROM sqlite_master WHERE type='table'`, then use `better-sqlite3` to export `CREATE TABLE` + `INSERT` statements row by row
- Before committing, run `git status` equivalent via `isomorphic-git` — skip commit if working tree is clean
- Branch switch must be atomic: if Companion restart fails, surface error clearly in UI (don't leave user with stopped Companion silently)

---

## Out of scope for prototype

- Electron packaging (structure should be compatible, but no `electron` dependency yet)
- Conflict resolution (assume single-machine, no concurrent edits)
- Encrypted token storage (plain `config.json` is fine for prototype)
- Diff viewer per commit