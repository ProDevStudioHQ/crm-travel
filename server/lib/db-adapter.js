const sqlite3 = require('sqlite3').verbose();

class DatabaseAdapter {
  constructor() {
    this.db = null;
    this.dbType = 'sqlite'; // SQLite only
  }

  async init() {
    // SQLite is handled by the caller in db.js
    console.log('✓ SQLite ready');
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  async transaction(callback) {
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

  setSqliteDb(db) {
    this.db = db;
  }

  async health() {
    try {
      if (this.db) {
        await this.get('SELECT 1');
      }
      return { healthy: true };
    } catch (err) {
      return { healthy: false, error: err.message };
    }
  }
}

module.exports = new DatabaseAdapter();
