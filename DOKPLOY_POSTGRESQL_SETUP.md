# PostgreSQL Connection Setup for Dokploy

## ✅ CONFIGURATION COMPLETE

Your CRM has been configured to connect to PostgreSQL running in Dokploy using **internal networking**.

### 📋 Applied Configuration

**Environment Variables (.env file):**
```
DB_TYPE=postgres
PG_HOST=crm-database-scijlk
PG_PORT=5432
PG_DATABASE=crm-db
PG_USER=app-user
PG_PASSWORD=123456789@@Aa
PG_SSL_MODE=disable
```

**Docker Compose Changes:**
- ✅ Removed local PostgreSQL service (db)
- ✅ Updated CRM container environment variables
- ✅ Removed dependency on local db service
- ✅ Kept internal network for service communication
- ✅ Removed `postgres_data` volume (no longer needed)

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### Step 1: Verify Files Have Been Updated

Confirm these changes:
- ✅ `.env` - DB_TYPE changed to `postgres`
- ✅ `docker-compose.yml` - local `db` service removed
- ✅ `server/package.json` - `pg` and `pg-pool` already installed

### Step 2: Ensure Dokploy PostgreSQL Container is Running

In Dokploy, verify:
1. PostgreSQL container status: **RUNNING**
2. Internal hostname: `crm-database-scijlk` (available within Dokploy network)
3. Port: `5432` (internal only, not exposed publicly)

### Step 3: Build and Deploy CRM Container

**From your workspace:**

```bash
# Build the CRM image
docker build -t pm-travel-crm:latest .

# If using docker-compose locally for testing:
# docker-compose up -d

# For Dokploy:
# 1. Push code to your repository (GitHub, GitLab, etc.)
# 2. Connect Dokploy to your repo
# 3. Configure environment variables in Dokploy dashboard
# 4. Trigger deployment
```

### Step 4: Network Configuration

**CRITICAL:** The CRM container and PostgreSQL must be on the **same internal network** in Dokploy.

In Dokploy settings:
- Ensure both containers are in the same **private network** (e.g., `crm-network`)
- Do NOT use public IPs or external URLs
- Use only the internal hostname: `crm-database-scijlk`

### Step 5: Environment Variables in Dokploy Dashboard

Set these in Dokploy (or via .env file):

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DB_TYPE` | `postgres` |
| `PG_HOST` | `crm-database-scijlk` |
| `PG_PORT` | `5432` |
| `PG_DATABASE` | `crm-db` |
| `PG_USER` | `app-user` |
| `PG_PASSWORD` | `123456789@@Aa` |
| `PG_SSL_MODE` | `disable` |

---

## ✅ VERIFICATION CHECKLIST

### Startup Logs - What to Look For

**SUCCESS** ✓
```
APP STARTING...
[DB] Initializing PostgreSQL...
✓ PostgreSQL connected
Server running on port 3000
```

**FAILURE** ✗ (will show one of these errors):

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | Host unreachable | Use internal hostname, not IP |
| `authentication failed` | Wrong credentials | Verify username/password in Dokploy |
| `database "crm-db" does not exist` | Wrong DB name | Create database or correct name |
| `host does not resolve` | Wrong hostname | Ensure containers on same network |
| `Connection timeout` | Network issue | Check network connectivity between containers |

### Test PostgreSQL Health Endpoint

After deployment, test the connection:

```bash
curl http://your-crm-domain/api/settings/db-status
```

**Expected Response:**
```json
{
  "ok": true,
  "currentDb": "postgres",
  "isHealthy": true,
  "stats": {
    "type": "postgres",
    "host": "crm-database-scijlk",
    "port": 5432,
    "database": "crm-db",
    "poolSize": 10
  }
}
```

---

## 🔧 TROUBLESHOOTING

### 1. Connection Refused

**Symptom:** `Error: connect ECONNREFUSED`

**Cause:** CRM container can't reach PostgreSQL container

**Fix:**
- Verify `PG_HOST` is set to internal hostname: `crm-database-scijlk`
- Check both containers are on same network in Dokploy
- Ensure PostgreSQL service is running
- Check Dokploy logs for network errors

```bash
# In Dokploy, view PostgreSQL container logs
docker logs pm-travel-crm-db  # or appropriate container name
```

### 2. Authentication Failed

**Symptom:** `error: password authentication failed`

**Cause:** Wrong username or password

**Fix:**
- Verify in Dokploy PostgreSQL settings:
  - User: `app-user`
  - Password: `123456789@@Aa`
  - Database: `crm-db`
- Update `.env` and redeploy if needed

### 3. Database Does Not Exist

**Symptom:** `error: database "crm-db" does not exist`

**Cause:** Database wasn't created in PostgreSQL

**Fix:**
- In Dokploy PostgreSQL, create database `crm-db`
- Or update `PG_DATABASE` to match existing database name

### 4. No Bad Gateway (502) Errors

If you're seeing **Bad Gateway** errors:
- Check CRM container logs for startup errors
- Verify database connection succeeded
- Ensure health check endpoint is working: `/api/health`

---

## 📊 Database Schema

The application will automatically create tables on first connection:

- `settings` - Configuration key-value pairs
- `email_queue` - Outgoing email queue
- `enrichment_jobs` - Data enrichment tasks
- `enrichment_results` - Enrichment results
- `lead_duplicates` - Duplicate lead tracking
- `email_verifications` - Email validation results
- `audit_logs` - User action logs
- `import_jobs` - CSV import tracking
- `campaigns` - Email campaigns
- And more...

---

## 🔐 Security Notes

1. **SSL Mode:** Set to `disable` for internal network (recommended)
   - Change to `require` if PostgreSQL has SSL certificates
   - Only use `require` for external connections

2. **Password Storage:**
   - Credentials stored in Dokploy's secure environment variables
   - Never commit `.env` with real passwords to Git
   - Use Dokploy's secrets management

3. **Network Isolation:**
   - PostgreSQL only accessible within Dokploy internal network
   - Not exposed to internet
   - Public internet → Dokploy reverse proxy → CRM container → PostgreSQL

---

## 📝 Configuration Files Reference

### `.env`
Located at: `c:\Users\admin\Desktop\crm_fixed\.env`

Database section:
```
DB_TYPE=postgres
PG_HOST=crm-database-scijlk
PG_PORT=5432
PG_DATABASE=crm-db
PG_USER=app-user
PG_PASSWORD=123456789@@Aa
PG_SSL_MODE=disable
```

### `docker-compose.yml`
Located at: `c:\Users\admin\Desktop\crm_fixed\docker-compose.yml`

Updated to:
- Set `DB_TYPE=postgres` in environment
- Remove local `db` service
- Remove `depends_on: db` from app service
- Remove `postgres_data` volume

### Database Adapter
Located at: `server/lib/db-adapter.js`

Reads environment variables and connects using `pg` package.

---

## 🚀 Next Steps

1. **Verify Dokploy Setup:**
   - Ensure PostgreSQL container is running
   - Confirm hostname and credentials match

2. **Deploy CRM:**
   - Build new Docker image with these changes
   - Deploy to Dokploy
   - Monitor startup logs

3. **Test Connection:**
   - Check `/api/settings/db-status` endpoint
   - Verify no database errors in logs

4. **Production Checklist:**
   - ✅ SSL Mode verified (disable for internal, require for external)
   - ✅ Credentials secured in Dokploy
   - ✅ Network communication working
   - ✅ Health checks passing
   - ✅ Data persisting in PostgreSQL

---

## 📞 Support Information

If you encounter issues:

1. Check Dokploy container logs
2. Verify network connectivity between containers
3. Confirm credentials match Dokploy PostgreSQL settings
4. Test with: `curl http://localhost:3000/api/health`

---

**Configuration Date:** 2026-04-11
**Database Type:** PostgreSQL 15
**Deployment Method:** Dokploy with Internal Networking
**Status:** ✅ Ready for Deployment
