async function initPostgresSchema(adapter) {
  const schema = `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_queue (
      id SERIAL PRIMARY KEY,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT,
      status TEXT DEFAULT 'pending',
      tries INTEGER DEFAULT 0,
      campaign_id INTEGER,
      scheduled_at TIMESTAMP WITH TIME ZONE,
      sent_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
    CREATE INDEX IF NOT EXISTS idx_email_queue_campaign_id ON email_queue(campaign_id);

    CREATE TABLE IF NOT EXISTS enrichment_jobs (
      id SERIAL PRIMARY KEY,
      status TEXT DEFAULT 'pending',
      total INTEGER DEFAULT 0,
      processed INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      mode TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS enrichment_results (
      id SERIAL PRIMARY KEY,
      job_id INTEGER,
      lead_id INTEGER,
      status TEXT,
      changes_json JSONB,
      error TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_enrichment_results_job_id ON enrichment_results(job_id);
    CREATE INDEX IF NOT EXISTS idx_enrichment_results_lead_id ON enrichment_results(lead_id);

    CREATE TABLE IF NOT EXISTS lead_duplicates (
      id SERIAL PRIMARY KEY,
      lead_id_a INTEGER NOT NULL,
      lead_id_b INTEGER NOT NULL,
      rule TEXT,
      score NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_lead_duplicates_leads ON lead_duplicates(lead_id_a, lead_id_b);

    CREATE TABLE IF NOT EXISTS email_verifications (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER,
      email TEXT NOT NULL,
      status TEXT,
      reason TEXT,
      checked_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      ip TEXT,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

    CREATE TABLE IF NOT EXISTS import_jobs (
      id SERIAL PRIMARY KEY,
      module TEXT NOT NULL,
      uploaded_by INTEGER,
      status TEXT DEFAULT 'pending',
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      channel TEXT,
      target TEXT,
      status TEXT DEFAULT 'draft',
      sent_at TIMESTAMP WITH TIME ZONE,
      subject TEXT,
      from_name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

    CREATE TABLE IF NOT EXISTS campaign_recipients (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      contact_id INTEGER,
      message_id TEXT,
      delivered_at TIMESTAMP WITH TIME ZONE,
      bounced_at TIMESTAMP WITH TIME ZONE,
      bounce_type TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON campaign_recipients(email);

    CREATE TABLE IF NOT EXISTS campaign_events (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL,
      recipient_id INTEGER,
      type TEXT NOT NULL,
      event_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      meta JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_id ON campaign_events(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_campaign_events_type ON campaign_events(type);

    CREATE TABLE IF NOT EXISTS campaign_aggregates (
      campaign_id INTEGER NOT NULL,
      date DATE NOT NULL,
      sent INTEGER DEFAULT 0,
      delivered INTEGER DEFAULT 0,
      bounces INTEGER DEFAULT 0,
      opens INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      unsubs INTEGER DEFAULT 0,
      complaints INTEGER DEFAULT 0,
      leads INTEGER DEFAULT 0,
      bookings INTEGER DEFAULT 0,
      revenue NUMERIC DEFAULT 0,
      PRIMARY KEY (campaign_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_campaign_aggregates_date ON campaign_aggregates(date);

    CREATE TABLE IF NOT EXISTS unsubscribes (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS n8n_leads (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT,
      company TEXT,
      phone TEXT,
      country TEXT,
      website TEXT,
      source TEXT,
      score INTEGER,
      status TEXT,
      notes TEXT,
      raw_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_n8n_leads_email ON n8n_leads(email);
    CREATE INDEX IF NOT EXISTS idx_n8n_leads_status ON n8n_leads(status);

    CREATE TABLE IF NOT EXISTS n8n_events (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER,
      event_type TEXT NOT NULL,
      campaign_id INTEGER,
      meta JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_n8n_events_lead_id ON n8n_events(lead_id);
  `;

  const statements = schema.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    if (stmt.trim()) {
      try {
        await adapter.run(stmt);
      } catch (err) {
        console.log('Schema init:', err.message);
      }
    }
  }

  console.log('✓ PostgreSQL schema initialized');
}

module.exports = { initPostgresSchema };
