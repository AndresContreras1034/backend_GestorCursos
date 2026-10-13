const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'database.sqlite');
const db = new Database(dbPath);

// Los PRAGMA deben ir ANTES de cualquier transacción
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    aplicada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

function migrar() {
  const dir = path.join(__dirname, 'migrations');
  const archivos = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const aplicadas = new Set(
    db.prepare('SELECT nombre FROM schema_migrations').all().map((r) => r.nombre)
  );

  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) continue;

    const sql = fs.readFileSync(path.join(dir, archivo), 'utf8').replace(/^\uFEFF/, '');
    const aplicar = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (nombre) VALUES (?)').run(archivo);
    });
    aplicar();
    console.log(`[DB] Migración aplicada: ${archivo}`);
  }
}

migrar();

module.exports = db;