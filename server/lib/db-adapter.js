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

  async init() {
    if (this.dbType === 'postgres') {
      this.pool = new Pool({
        host: process.env.PG_HOST || 'db',
        port: process.env.PG_PORT || 5432,
        database: process.env.PG_DATABASE || 'crm_db',
        user: process.env.PG_USER || 'crm_user',
        password: process.env.PG_PASSWORD || 'crm_password',
        ssl: process.env.PG_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false
      });

      await this.pool.query('SELECT NOW()'); // Test connection
      console.log('✓ PostgreSQL connected');
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
