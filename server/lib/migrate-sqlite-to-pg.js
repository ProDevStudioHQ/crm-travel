const sqlite3 = require('sqlite3').verbose();

async function migrateSqliteToPostgres(sqliteDbPath, pgAdapter) {
  const tables = [
    'settings', 'email_queue', 'enrichment_jobs', 'enrichment_results',
    'lead_duplicates', 'email_verifications', 'audit_logs', 'import_jobs',
    'campaigns', 'campaign_recipients', 'campaign_events', 'campaign_aggregates',
    'unsubscribes', 'n8n_leads', 'n8n_events'
  ];

  const sqliteDb = new sqlite3.Database(sqliteDbPath);
  const report = { success: true, tables: {}, startTime: Date.now(), errors: [] };

  for (const table of tables) {
    console.log(`\n[Migration] Processing table: ${table}`);
    try {
      const rows = await new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${table}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      report.tables[table] = { sourceCount: rows.length, targetCount: 0, errors: [] };

      if (rows.length === 0) {
        console.log(`  → Table empty, skipping`);
        report.tables[table].targetCount = 0;
        continue;
      }

      // Get column names
      const firstRow = rows[0];
      const columns = Object.keys(firstRow);

      // Batch insert (1000 rows per batch)
      const batchSize = 1000;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const placeholders = batch.map((_, idx) => {
          const vals = columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`).join(', ');
          return `(${vals})`;
        }).join(', ');

        const values = [];
        batch.forEach(row => {
          columns.forEach(col => {
            let val = row[col];
            // Transform SQLite-specific types
            if (typeof val === 'string') {
              try {
                // Try to parse JSON
                if ((col.includes('_json') || col.includes('meta') || col.includes('data')) && val.startsWith('{')) {
                  val = JSON.parse(val);
                }
              } catch (e) {
                // Keep as is
              }
            }
            values.push(val);
          });
        });

        const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
        try {
          await pgAdapter.run(insertSql, values);
          report.tables[table].targetCount += batch.length;
        } catch (err) {
          report.tables[table].errors.push(`Batch ${i / batchSize + 1}: ${err.message}`);
          report.success = false;
        }

        console.log(`  → Batch ${Math.ceil((i + batchSize) / batchSize)}: Inserted ${Math.min(batchSize, rows.length - i)} rows`);
      }

      // Verify counts match
      if (report.tables[table].sourceCount !== report.tables[table].targetCount) {
        report.tables[table].errors.push(`Count mismatch: source=${report.tables[table].sourceCount}, target=${report.tables[table].targetCount}`);
        report.success = false;
      }
    } catch (err) {
      report.tables[table] = { sourceCount: 0, targetCount: 0, errors: [err.message] };
      report.success = false;
      console.error(`  ✗ Error: ${err.message}`);
    }
  }

  sqliteDb.close();

  report.duration_ms = Date.now() - report.startTime;
  console.log(`\n[Migration] Complete in ${report.duration_ms}ms`);

  return report;
}

module.exports = { migrateSqliteToPostgres };
