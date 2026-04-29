import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export function dumpDatabase(dbPath: string, outPath: string): void {
  const db = new Database(dbPath, { readonly: true })
  const lines: string[] = []

  const tables = db
    .prepare(`SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
    .all() as Array<{ name: string; sql: string }>

  for (const table of tables) {
    lines.push(`-- Table: ${table.name}`)
    lines.push(`DROP TABLE IF EXISTS "${table.name}";`)
    lines.push(`${table.sql};`)

    const rows = db.prepare(`SELECT * FROM "${table.name}"`).all() as Record<string, unknown>[]
    for (const row of rows) {
      const cols = Object.keys(row)
        .map(c => `"${c}"`)
        .join(', ')
      const vals = Object.values(row)
        .map(v => {
          if (v === null) return 'NULL'
          if (typeof v === 'number') return String(v)
          return `'${String(v).replace(/'/g, "''")}'`
        })
        .join(', ')
      lines.push(`INSERT INTO "${table.name}" (${cols}) VALUES (${vals});`)
    }
    lines.push('')
  }

  db.close()
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
}

export function dumpDatabasesFromDir(companionConfigDir: string, repoDir: string): void {
  const dbSqlitePath = path.join(companionConfigDir, 'db.sqlite')
  const cacheSqlitePath = path.join(companionConfigDir, 'cache.sqlite')

  if (fs.existsSync(dbSqlitePath)) {
    dumpDatabase(dbSqlitePath, path.join(repoDir, 'db.sql'))
  }
  if (fs.existsSync(cacheSqlitePath)) {
    dumpDatabase(cacheSqlitePath, path.join(repoDir, 'cache.sql'))
  }
}
