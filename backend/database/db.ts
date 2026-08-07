import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

// Database storage setup using WASM-based SQLite engine (sql.js) for cross-platform compatibility
const dbPath = path.join(process.cwd(), 'police_mdt.sqlite');
let db: Database | null = null;

function saveDb() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (e) {
      console.error("Error saving SQLite database file:", e);
    }
  }
}

// Helper function to execute query returning promise
export const query = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject(new Error("Database not initialized"));
    }

    try {
      const trimmed = sql.trim().toLowerCase();
      
      // Replace MySQL specific syntax for SQLite compatibility
      let adjustedSql = sql
        .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
        .replace(/TINYINT\(1\)/gi, 'INTEGER')
        .replace(/ENUM\([^)]+\)/gi, 'TEXT')
        .replace(/ENGINE=InnoDB/gi, '')
        .replace(/DEFAULT CHARSET=utf8mb4/gi, '')
        .replace(/COLLATE=utf8mb4_unicode_ci/gi, '')
        .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP');

      const sanitizedParams = params.map(p => p === undefined ? null : p);

      if (trimmed.startsWith('select') || trimmed.startsWith('pragma') || trimmed.startsWith('show')) {
        const stmt = db.prepare(adjustedSql);
        if (sanitizedParams.length > 0) {
          stmt.bind(sanitizedParams);
        }
        const rows: any[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        resolve(rows);
      } else {
        const stmt = db.prepare(adjustedSql);
        if (sanitizedParams.length > 0) {
          stmt.bind(sanitizedParams);
        }
        stmt.step();
        stmt.free();

        const changes = db.getRowsModified();
        let insertId = 0;
        try {
          const res = db.exec("SELECT last_insert_rowid() as id");
          if (res.length > 0 && res[0].values.length > 0) {
            insertId = res[0].values[0][0] as number;
          }
        } catch (_) {}

        saveDb();
        resolve({ insertId, affectedRows: changes });
      }
    } catch (err) {
      console.error("SQL Execution Error:", err, "SQL:", sql);
      reject(err);
    }
  });
};

export const queryOne = async (sql: string, params: any[] = []): Promise<any> => {
  const rows = await query(sql, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

// Initialize database schema and seeds on startup
export const initDB = async (): Promise<void> => {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.error("Failed to load existing SQLite DB file, creating new instance:", e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL UNIQUE,
      fullname TEXT NOT NULL,
      rank TEXT NOT NULL DEFAULT 'Cadet',
      start_date TEXT NOT NULL,
      avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      active INTEGER NOT NULL DEFAULT 1,
      total_hours REAL DEFAULT 0.0,
      total_cases INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try { db.run("ALTER TABLE users ADD COLUMN total_hours REAL DEFAULT 0.0"); } catch (_) {}
  try { db.run("ALTER TABLE users ADD COLUMN total_cases INTEGER DEFAULT 0"); } catch (_) {}

  // Create duty_logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS duty_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      hours REAL NOT NULL DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create cases table
  db.run(`
    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      suspect_name TEXT DEFAULT 'Unknown',
      officer_in_charge TEXT DEFAULT 'Unassigned',
      status TEXT NOT NULL DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try { db.run("ALTER TABLE cases ADD COLUMN reporter_name TEXT DEFAULT 'ไม่ระบุ'"); } catch (_) {}
  try { db.run("ALTER TABLE cases ADD COLUMN officer_discord_id TEXT DEFAULT ''"); } catch (_) {}
  try { db.run("ALTER TABLE cases ADD COLUMN officer_rank TEXT DEFAULT ''"); } catch (_) {}
  try { db.run("ALTER TABLE cases ADD COLUMN received_time TEXT DEFAULT ''"); } catch (_) {}
  try { db.run("ALTER TABLE cases ADD COLUMN closed_time TEXT DEFAULT ''"); } catch (_) {}
  try { db.run("ALTER TABLE cases ADD COLUMN duration TEXT DEFAULT ''"); } catch (_) {}
  try { db.run("ALTER TABLE cases ADD COLUMN assistant_officer TEXT DEFAULT 'ไม่มี'"); } catch (_) {}

  // Create activities table
  db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reward TEXT NOT NULL,
      image TEXT DEFAULT 'https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=600',
      question TEXT DEFAULT 'โปรดโหวตหรือตอบคำถามสำหรับกิจกรรมนี้',
      options TEXT DEFAULT '["เห็นด้วย / เข้าร่วม", "ไม่เห็นด้วย / ไม่สะดวก", "ข้อเสนอแนะเพิ่มเติม"]',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try { db.run("ALTER TABLE activities ADD COLUMN question TEXT DEFAULT 'โปรดโหวตหรือตอบคำถามสำหรับกิจกรรมนี้'"); } catch (_) {}
  try { db.run("ALTER TABLE activities ADD COLUMN options TEXT DEFAULT '[\"เห็นด้วย / เข้าร่วม\", \"ไม่เห็นด้วย / ไม่สะดวก\", \"ข้อเสนอแนะเพิ่มเติม\"]'"); } catch (_) {}

  // Create activity_join table
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_join (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      answer TEXT DEFAULT '',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(activity_id, user_id),
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  try { db.run("ALTER TABLE activity_join ADD COLUMN answer TEXT DEFAULT ''"); } catch (_) {}

  // Create activity_history table
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reward TEXT NOT NULL,
      image TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'finished',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create shop_items table
  db.run(`
    CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0.00,
      image TEXT DEFAULT 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600',
      status TEXT NOT NULL DEFAULT 'available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_discord_id TEXT NOT NULL,
      action TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      affected_user TEXT DEFAULT 'N/A',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create discord_logs table for Discord Sync Bot
  db.run(`
    CREATE TABLE IF NOT EXISTS discord_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL UNIQUE,
      channel_id TEXT NOT NULL,
      discord_id TEXT NOT NULL,
      type TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      reference_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create announcements table
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'announcement',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create case_alerts table for Duty & Case Verification
  db.run(`
    CREATE TABLE IF NOT EXISTS case_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      officer_id INTEGER,
      case_id INTEGER NOT NULL UNIQUE,
      case_number TEXT,
      alert_type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'HIGH',
      status TEXT NOT NULL DEFAULT 'PENDING',
      duty_start_time TEXT DEFAULT 'N/A',
      duty_end_time TEXT DEFAULT 'N/A',
      case_time TEXT DEFAULT 'N/A',
      reviewed_at DATETIME,
      reviewed_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    )
  `);

  // Create evidence table
  db.run(`
    CREATE TABLE IF NOT EXISTS evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number TEXT,
      title TEXT NOT NULL,
      description TEXT,
      items TEXT,
      image TEXT,
      officer_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create wanted table
  db.run(`
    CREATE TABLE IF NOT EXISTS wanted (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suspect_name TEXT NOT NULL,
      charges TEXT NOT NULL,
      reward REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      officer_in_charge TEXT,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try { db.run("CREATE INDEX IF NOT EXISTS idx_case_alerts_status ON case_alerts(status)"); } catch (_) {}
  try { db.run("CREATE INDEX IF NOT EXISTS idx_case_alerts_case_id ON case_alerts(case_id)"); } catch (_) {}
  try { db.run("CREATE INDEX IF NOT EXISTS idx_case_alerts_officer_id ON case_alerts(officer_id)"); } catch (_) {}

  saveDb();
};

export default db;
