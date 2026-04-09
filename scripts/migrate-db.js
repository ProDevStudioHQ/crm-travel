const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbAdapter = require('../server/lib/db-adapter');
const { migrateSqliteToPostgres } = require('../server/lib/migrate-sqlite-to-pg');

(async () => {
  try {
    console.log('[Migration CLI] Starting SQLite → PostgreSQL migration\n');

    // Initialize adapters
    await dbAdapter.init();

    // Initialize PostgreSQL schema
    console.log('[Migration CLI] Initializing PostgreSQL schema...');
    const { initPostgresSchema } = require('../server/lib/db-schema-pg');
    await initPostgresSchema(dbAdapter);

    // Run migration
    const sqliteDbPath = path.join(__dirname, '../data/database.sqlite');
    if (!fs.existsSync(sqliteDbPath)) {
      throw new Error(`SQLite database not found at ${sqliteDbPath}`);
    }

    console.log('[Migration CLI] Starting data migration...\n');
    const report = await migrateSqliteToPostgres(sqliteDbPath, dbAdapter);

    // Print report
    console.log('\n========== MIGRATION REPORT ==========');
    console.log(`Status: ${report.success ? '✓ SUCCESS' : '✗ FAILED'}`);
    console.log(`Duration: ${report.duration_ms}ms\n`);

    console.log('Table Summary:');
    for (const [table, stats] of Object.entries(report.tables)) {
      const match = stats.sourceCount === stats.targetCount ? '✓' : '✗';
      console.log(`  ${match} ${table}: ${stats.sourceCount} → ${stats.targetCount} rows`);
      if (stats.errors.length > 0) {
        stats.errors.forEach(err => console.log(`      Error: ${err}`));
      }
    }

    console.log('\n=======================================');
    process.exit(report.success ? 0 : 1);
  } catch (err) {
    console.error('[Migration CLI] Error:', err.message);
    process.exit(1);
  }
})();
