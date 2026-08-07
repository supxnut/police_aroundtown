import pg from 'pg';
import mysql from 'mysql2/promise';
import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

let dbDriver: 'postgres' | 'mysql' | 'sqlite' = 'sqlite';
let pgPool: pg.Pool | null = null;
let mysqlPool: mysql.Pool | null = null;
let sqliteDb: Database | null = null;

const dbPath = path.join(process.cwd(), 'police_mdt.sqlite');

function saveSqliteDb() {
  if (sqliteDb && dbDriver === 'sqlite') {
    try {
      const data = sqliteDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (e) {
      console.error('[Database] Error saving SQLite database file:', e);
    }
  }
}

// Convert ? placeholders to $1, $2... for PostgreSQL
function convertSqlToPg(sql: string): { formattedSql: string; isInsert: boolean } {
  let paramCount = 0;
  let formattedSql = sql.replace(/\?/g, () => {
    paramCount++;
    return `$${paramCount}`;
  });

  formattedSql = formattedSql
    .replace(/AUTOINCREMENT/gi, 'SERIAL')
    .replace(/AUTO_INCREMENT/gi, 'SERIAL')
    .replace(/strftime\('%H:%M',\s*([^)]+)\)/gi, "to_char($1, 'HH24:MI')");

  const trimmed = formattedSql.trim().toLowerCase();
  const isInsert = trimmed.startsWith('insert');

  if (isInsert && !/returning/i.test(formattedSql)) {
    formattedSql += ' RETURNING id';
  }

  return { formattedSql, isInsert };
}

// Universal query runner supporting PostgreSQL, MySQL, and SQLite
export const query = async (sql: string, params: any[] = []): Promise<any> => {
  const sanitizedParams = params.map((p) => (p === undefined ? null : p));

  if (dbDriver === 'postgres' && pgPool) {
    try {
      const { formattedSql, isInsert } = convertSqlToPg(sql);
      const trimmed = sql.trim().toLowerCase();
      const isSelect =
        trimmed.startsWith('select') ||
        trimmed.startsWith('pragma') ||
        trimmed.startsWith('show') ||
        trimmed.startsWith('with');

      const res = await pgPool.query(formattedSql, sanitizedParams);

      if (isSelect) {
        return res.rows;
      } else {
        let insertId = 0;
        if (isInsert && res.rows && res.rows.length > 0 && res.rows[0].id) {
          insertId = Number(res.rows[0].id);
        }
        return { insertId, affectedRows: res.rowCount || 0 };
      }
    } catch (err) {
      console.error('[Database] PostgreSQL Query Error:', err, 'SQL:', sql);
      throw err;
    }
  }

  if (dbDriver === 'mysql' && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query(sql, sanitizedParams);
      if (Array.isArray(rows)) {
        return rows;
      } else {
        const result = rows as any;
        return {
          insertId: result.insertId || 0,
          affectedRows: result.affectedRows || 0,
        };
      }
    } catch (err) {
      console.error('[Database] MySQL Query Error:', err, 'SQL:', sql);
      throw err;
    }
  }

  // Fallback: SQLite via sql.js
  return new Promise((resolve, reject) => {
    if (!sqliteDb) {
      return reject(new Error('SQLite Database not initialized'));
    }

    try {
      const trimmed = sql.trim().toLowerCase();
      let adjustedSql = sql
        .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
        .replace(/TINYINT\(1\)/gi, 'INTEGER')
        .replace(/ENUM\([^)]+\)/gi, 'TEXT')
        .replace(/ENGINE=InnoDB/gi, '')
        .replace(/DEFAULT CHARSET=utf8mb4/gi, '')
        .replace(/COLLATE=utf8mb4_unicode_ci/gi, '')
        .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP');

      if (trimmed.startsWith('select') || trimmed.startsWith('pragma') || trimmed.startsWith('show')) {
        const stmt = sqliteDb.prepare(adjustedSql);
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
        const stmt = sqliteDb.prepare(adjustedSql);
        if (sanitizedParams.length > 0) {
          stmt.bind(sanitizedParams);
        }
        stmt.step();
        stmt.free();

        const changes = sqliteDb.getRowsModified();
        let insertId = 0;
        try {
          const res = sqliteDb.exec('SELECT last_insert_rowid() as id');
          if (res.length > 0 && res[0].values.length > 0) {
            insertId = res[0].values[0][0] as number;
          }
        } catch (_) {}

        saveSqliteDb();
        resolve({ insertId, affectedRows: changes });
      }
    } catch (err) {
      console.error('[Database] SQLite Query Error:', err, 'SQL:', sql);
      reject(err);
    }
  });
};

export const queryOne = async (sql: string, params: any[] = []): Promise<any> => {
  const rows = await query(sql, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

// Initialize database connection & schemas
export const initDB = async (): Promise<void> => {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PGDATABASE_URL ||
    process.env.MYSQL_URL ||
    '';

  const isPgEnv = Boolean(dbUrl.startsWith('postgres') || process.env.PGHOST || process.env.POSTGRES_HOST);
  const isMysqlEnv = Boolean(dbUrl.startsWith('mysql') || process.env.MYSQLHOST || process.env.MYSQL_HOST);

  if (isPgEnv) {
    try {
      console.log('[Database] Connecting to Persistent PostgreSQL database...');
      pgPool = new pg.Pool({
        connectionString: dbUrl || undefined,
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
        max: 20,
        connectionTimeoutMillis: 5000,
      });

      // Test connectivity
      await pgPool.query('SELECT 1');
      dbDriver = 'postgres';

      console.log('\n==========================');
      console.log('Database Driver : postgres');
      console.log('Database URL    : Connected');
      console.log('==========================\n');
    } catch (err: any) {
      if (pgPool) {
        try { await pgPool.end(); } catch (_) {}
        pgPool = null;
      }
      console.error(`[Database] PostgreSQL connection failed: ${err.message || err}`);
      throw new Error(`DATABASE_URL is configured but PostgreSQL connection failed: ${err.message || err}. PostgreSQL is required and fallback to SQLite is disabled when DATABASE_URL is set.`);
    }
  } else if (isMysqlEnv) {
    try {
      console.log('[Database] Connecting to Persistent MySQL database...');
      if (dbUrl) {
        mysqlPool = mysql.createPool(dbUrl);
      } else {
        mysqlPool = mysql.createPool({
          host: process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost',
          port: Number(process.env.MYSQLPORT || process.env.MYSQL_PORT || 3306),
          user: process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
          password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '',
          database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'police_mdt',
          waitForConnections: true,
          connectionLimit: 10,
        });
      }

      await mysqlPool.query('SELECT 1');
      dbDriver = 'mysql';

      console.log('\n==========================');
      console.log('Database Driver : mysql');
      console.log('Database URL    : Connected');
      console.log('==========================\n');
    } catch (err: any) {
      mysqlPool = null;
      console.error(`[Database] MySQL connection failed: ${err.message || err}`);
      throw new Error(`DATABASE_URL is configured but MySQL connection failed: ${err.message || err}. MySQL is required and fallback to SQLite is disabled when DATABASE_URL is set.`);
    }
  } else {
    dbDriver = 'sqlite';
    console.log('[Database] Using Local SQLite engine fallback...');
    const SQL = await initSqlJs();
    if (fs.existsSync(dbPath)) {
      try {
        const fileBuffer = fs.readFileSync(dbPath);
        sqliteDb = new SQL.Database(fileBuffer);
        // Quick verification check on SQLite db
        sqliteDb.exec('PRAGMA user_version;');
      } catch (err: any) {
        console.error('[Database] Failed to open SQLite database file:', err.message || err);
        throw new Error('SQLite database is corrupted. Please configure PostgreSQL or replace the damaged database.');
      }
    } else {
      sqliteDb = new SQL.Database();
    }

    console.log('\n==========================');
    console.log('Database Driver : sqlite');
    console.log('Database File   : police_mdt.sqlite');
    console.log('==========================\n');
  }

  await setupTables();
  console.log(`[Database] Engine initialized successfully [Driver: ${dbDriver}]. Existing data preserved.`);
};

// Create tables safely if they do not exist (Migration / Auto Schema Init)
async function setupTables() {
  const isPg = dbDriver === 'postgres';
  const autoInc = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTO_INCREMENT';
  const textType = 'TEXT';
  const datetimeType = isPg ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP';

  // 1. Users / Officers table
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id ${autoInc},
      discord_id VARCHAR(255) NOT NULL UNIQUE,
      fullname VARCHAR(255) NOT NULL,
      rank VARCHAR(255) NOT NULL DEFAULT 'Cadet',
      start_date VARCHAR(255) NOT NULL,
      avatar ${textType} DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      active INT NOT NULL DEFAULT 1,
      total_hours NUMERIC DEFAULT 0.0,
      total_cases INT DEFAULT 0,
      created_at ${datetimeType}
    )
  `);

  // 2. Duty logs / Attendance logs
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS duty_logs (
      id ${autoInc},
      user_id INT NOT NULL,
      date VARCHAR(255) NOT NULL,
      start_time VARCHAR(255) NOT NULL,
      end_time VARCHAR(255) NOT NULL,
      hours NUMERIC NOT NULL DEFAULT 0.00,
      created_at ${datetimeType}
    )
  `);

  // 3. Cases / Case logs
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS cases (
      id ${autoInc},
      case_number VARCHAR(255) NOT NULL UNIQUE,
      title ${textType} NOT NULL,
      description ${textType},
      suspect_name VARCHAR(255) DEFAULT 'Unknown',
      officer_in_charge VARCHAR(255) DEFAULT 'Unassigned',
      status VARCHAR(255) NOT NULL DEFAULT 'open',
      reporter_name VARCHAR(255) DEFAULT 'ไม่ระบุ',
      officer_discord_id VARCHAR(255) DEFAULT '',
      officer_rank VARCHAR(255) DEFAULT '',
      received_time VARCHAR(255) DEFAULT '',
      closed_time VARCHAR(255) DEFAULT '',
      duration VARCHAR(255) DEFAULT '',
      assistant_officer VARCHAR(255) DEFAULT 'ไม่มี',
      case_type VARCHAR(255) DEFAULT 'คดีปกติ',
      officer_avatar ${textType} DEFAULT '',
      helpers ${textType} DEFAULT '[]',
      image ${textType} DEFAULT '',
      discord_message_id VARCHAR(255) DEFAULT '',
      guild_id VARCHAR(255) DEFAULT '',
      created_at ${datetimeType},
      updated_at ${datetimeType}
    )
  `);

  // 4. Activities
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS activities (
      id ${autoInc},
      title ${textType} NOT NULL,
      description ${textType} NOT NULL,
      reward VARCHAR(255) NOT NULL,
      image ${textType} DEFAULT 'https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=600',
      question ${textType} DEFAULT 'โปรดโหวตหรือตอบคำถามสำหรับกิจกรรมนี้',
      options ${textType} DEFAULT '["เห็นด้วย / เข้าร่วม", "ไม่เห็นด้วย / ไม่สะดวก", "ข้อเสนอแนะเพิ่มเติม"]',
      start_date VARCHAR(255) NOT NULL,
      end_date VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'active',
      created_at ${datetimeType}
    )
  `);

  // 5. Activity Join
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS activity_join (
      id ${autoInc},
      activity_id INT NOT NULL,
      user_id INT NOT NULL,
      answer ${textType} DEFAULT '',
      joined_at ${datetimeType},
      UNIQUE(activity_id, user_id)
    )
  `);

  // 6. Activity History
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS activity_history (
      id ${autoInc},
      activity_id INT NOT NULL,
      title ${textType} NOT NULL,
      description ${textType} NOT NULL,
      reward VARCHAR(255) NOT NULL,
      image ${textType},
      start_date VARCHAR(255) NOT NULL,
      end_date VARCHAR(255) NOT NULL,
      status VARCHAR(255) DEFAULT 'finished',
      created_at ${datetimeType}
    )
  `);

  // 7. Shop Items
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS shop_items (
      id ${autoInc},
      name VARCHAR(255) NOT NULL,
      description ${textType} NOT NULL,
      price NUMERIC NOT NULL DEFAULT 0.00,
      image ${textType} DEFAULT 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600',
      status VARCHAR(255) NOT NULL DEFAULT 'available',
      created_at ${datetimeType}
    )
  `);

  // 8. Logs / Audit Logs
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS logs (
      id ${autoInc},
      admin_discord_id VARCHAR(255) NOT NULL,
      action ${textType} NOT NULL,
      date VARCHAR(255) NOT NULL,
      time VARCHAR(255) NOT NULL,
      affected_user VARCHAR(255) DEFAULT 'N/A',
      created_at ${datetimeType}
    )
  `);

  // 9. Discord Logs
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS discord_logs (
      id ${autoInc},
      message_id VARCHAR(255) UNIQUE NOT NULL,
      channel_id VARCHAR(255) NOT NULL,
      discord_id VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      raw_json ${textType} NOT NULL,
      reference_id VARCHAR(255),
      created_at ${datetimeType}
    )
  `);

  // 10. Announcements
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS announcements (
      id ${autoInc},
      title VARCHAR(255) NOT NULL,
      message ${textType} NOT NULL,
      type VARCHAR(255) DEFAULT 'announcement',
      created_at ${datetimeType}
    )
  `);

  // 11. Case Alerts
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS case_alerts (
      id ${autoInc},
      officer_id INT,
      case_id INT NOT NULL UNIQUE,
      case_number VARCHAR(255),
      alert_type VARCHAR(255) NOT NULL,
      message ${textType} NOT NULL,
      severity VARCHAR(255) NOT NULL DEFAULT 'HIGH',
      status VARCHAR(255) NOT NULL DEFAULT 'PENDING',
      duty_start_time VARCHAR(255) DEFAULT 'N/A',
      duty_end_time VARCHAR(255) DEFAULT 'N/A',
      case_time VARCHAR(255) DEFAULT 'N/A',
      reviewed_at ${datetimeType},
      reviewed_by VARCHAR(255),
      created_at ${datetimeType}
    )
  `);

  // 12. Evidence
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS evidence (
      id ${autoInc},
      case_number VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      description ${textType},
      items ${textType},
      image ${textType},
      officer_name VARCHAR(255),
      created_at ${datetimeType}
    )
  `);

  // 13. Wanted
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS wanted (
      id ${autoInc},
      suspect_name VARCHAR(255) NOT NULL,
      charges ${textType} NOT NULL,
      reward NUMERIC DEFAULT 0,
      status VARCHAR(255) DEFAULT 'active',
      officer_in_charge VARCHAR(255),
      image ${textType},
      created_at ${datetimeType}
    )
  `);

  // 14. Settings
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(255) PRIMARY KEY,
      value ${textType},
      updated_at ${datetimeType}
    )
  `);

  // 15. Roles
  await executeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS roles (
      id ${autoInc},
      name VARCHAR(255) UNIQUE NOT NULL,
      permissions ${textType},
      created_at ${datetimeType}
    )
  `);

  // 16. Alias Views / Tables for compatibility (officers, attendance_logs, case_logs, audit_logs, discord_users)
  const viewPrefix = isPg ? 'CREATE OR REPLACE VIEW' : 'CREATE VIEW IF NOT EXISTS';
  try { await executeSchemaQuery(`${viewPrefix} officers AS SELECT * FROM users;`); } catch (_) {}
  try { await executeSchemaQuery(`${viewPrefix} attendance_logs AS SELECT * FROM duty_logs;`); } catch (_) {}
  try { await executeSchemaQuery(`${viewPrefix} case_logs AS SELECT * FROM cases;`); } catch (_) {}
  try { await executeSchemaQuery(`${viewPrefix} audit_logs AS SELECT * FROM logs;`); } catch (_) {}
  try { await executeSchemaQuery(`${viewPrefix} discord_users AS SELECT * FROM users;`); } catch (_) {}
}

async function executeSchemaQuery(sql: string) {
  try {
    await query(sql);
  } catch (err: any) {
    // Ignore harmless 'already exists' or view creation errors
  }
}

export default { query, queryOne, initDB };
