const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

class QueryTranslator {
  static sqliteToPostgres(sql) {
    let paramIndex = 1;
    return sql.replace(/\?/g, () => `$${paramIndex++}`);
  }
}

class DatabaseAdapter {
  constructor() {
    this.db = null;
    this.pool = null;
    this.dbType = process.env.DB_TYPE || 'sqlite';
  }

  // Parse DATABASE_URL format: postgresql://user:password@host:port/database
  parseDbUrl(url) {
    try {
      const dbUrl = new URL(url);
      return {
        user: dbUrl.username || 'crm_user',
        password: dbUrl.password || 'crm_password',
        host: dbUrl.hostname || 'localhost',
        port: parseInt(dbUrl.port) || 5432,
        database: dbUrl.pathname.slice(1) || 'crm_db' // Remove leading /
      };
    } catch (err) {
      console.error('[DB] Invalid DATABASE_URL format:', err.message);
      return null;
    }
  }

  async init() {
    if (this.dbType === 'postgres') {
      let pgConfig;

      // Priority 1: Use DATABASE_URL if provided
      if (process.env.DATABASE_URL) {
        console.log('[DB] Using DATABASE_URL for PostgreSQL connection');
        pgConfig = this.parseDbUrl(process.env.DATABASE_URL);
        if (!pgConfig) {
          throw new Error('DATABASE_URL is malformed. Expected format: postgresql://user:password@host:port/database');
        }
      } else {
        // Priority 2: Fall back to individual PG_* variables
        console.log('[DB] Using individual PG_* environment variables for PostgreSQL connection');
        pgConfig = {
          host: process.env.PG_HOST || 'db',
          port: parseInt(process.env.PG_PORT) || 5432,
          database: process.env.PG_DATABASE || 'crm_db',
          user: process.env.PG_USER || 'crm_user',
          password: process.env.PG_PASSWORD || 'crm_password'
        };
      }

      // Configure SSL based on environment
      const sslMode = process.env.PG_SSL_MODE || 'disable';
      const ssl = sslMode === 'require' ? { rejectUnauthorized: false } : false;

      this.pool = new Pool({
        ...pgConfig,
        ssl
      });

      // Test connection
      try {
        await this.pool.query('SELECT NOW()');
        console.log(`✓ PostgreSQL connected to ${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);
      } catch (err) {
        console.error('[DB] PostgreSQL connection failed:', err.message);
        throw err;
      }
    } else {
      // SQLite initialization handled by caller
      console.log('✓ SQLite ready');
    }
  }

  async run(sql, params = []) {
    if (this.dbType === 'postgres') {
      const pgSql = QueryTranslator.sqliteToPostgres(sql);
      const result = await this.pool.query(pgSql, params);
      return { lastID: result.rows[0]?.id, changes: result.rowCount };
    } else {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }
  }

  async all(sql, params = []) {
    if (this.dbType === 'postgres') {
      const pgSql = QueryTranslator.sqliteToPostgres(sql);
      const result = await this.pool.query(pgSql, params);
      return result.rows;
    } else {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
  }

  async get(sql, params = []) {
    if (this.dbType === 'postgres') {
      const pgSql = QueryTranslator.sqliteToPostgres(sql);
      const result = await this.pool.query(pgSql, params);
      return result.rows[0] || null;
    } else {
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  }

  async transaction(callback) {
    if (this.dbType === 'postgres') {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.serialize(() => {
          this.db.run('BEGIN TRANSACTION', (err) => {
            if (err) return reject(err);
            callback(this.db)
              .then(() => {
                this.db.run('COMMIT', (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              })
              .catch((err) => {
                this.db.run('ROLLBACK', () => reject(err));
              });
          });
        });
      });
    }
  }

  setSqliteDb(db) {
    this.db = db;
  }

  async health() {
    try {
      if (this.dbType === 'postgres') {
        await this.pool.query('SELECT NOW()');
      } else if (this.db) {
        await this.get('SELECT 1');
      }
      return { healthy: true };
    } catch (err) {
      return { healthy: false, error: err.message };
    }
  }
}

module.exports = new DatabaseAdapter();
