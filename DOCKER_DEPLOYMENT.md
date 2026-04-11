# Docker Deployment Instructions - PostgreSQL Setup

## Why You're Seeing "SQLITE" Instead of "PostgreSQL"?

**Cause:** Docker containers use a snapshot of the code at build time. If you changed configuration but haven't rebuilt the image, the old code is still running.

**Solution:** Follow the deployment steps below based on your environment.

---

## 1️⃣ FOR LOCAL DEVELOPMENT (Docker Compose)

### Clean Rebuild

```bash
cd c:\Users\admin\Desktop\crm_fixed

# Stop all containers
docker-compose down

# Remove old images (optional)
docker rmi pm-travel-crm:latest

# Rebuild the image with latest code
docker build -t pm-travel-crm:latest .

# Start with fresh containers
docker-compose up -d

# Check logs for database detection
docker-compose logs -f app
```

### Expected Output in Logs

You should see:
```
============================================================
ENVIRONMENT CONFIGURATION:
  NODE_ENV: production
  DB_TYPE: postgres
  DATABASE_URL: ✓ SET
  PG_HOST: crm-database-scijlk
  PG_PORT: 5432
  PG_DATABASE: crm-db
============================================================

[DB] Database type detected: postgres
[DB] Initializing PostgreSQL...
✓ PostgreSQL connected to crm-database-scijlk:5432/crm-db

════════════════════════════════════════════════════════════
✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓
✓ Server running on port 3000
✓ Database: POSTGRES
✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓
```

---

## 2️⃣ FOR DOKPLOY DEPLOYMENT

### In Dokploy Dashboard

1. **Go to your CRM project**
2. **Click "Restart" or "Redeploy"** to rebuild from the latest GitHub code
3. **Monitor the deployment logs** for database detection

### Check the Logs

After deployment, check container logs:
```
✓ Database: POSTGRES
```

### If Still Showing SQLite

1. **Force Rebuild:** Click "Force Rebuild" in Dokploy
2. **Clear Cache:** Clear Docker cache and rebuild
3. **Check Environment Variables:** Verify these are set in Dokploy:
   - `DB_TYPE=postgres`
   - `DATABASE_URL=postgresql://app-user:123456789@@Aa@crm-database-scijlk:5432/crm-db`
   - `PG_SSL_MODE=disable`

---

## 3️⃣ VERIFY DATABASE TYPE IS DETECTED

### Check Endpoint

```bash
curl http://localhost:3000/api/settings/db-status
```

Should return:
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

## 4️⃣ TROUBLESHOOTING

### Still Showing SQLite?

**Check what environment variables Docker has:**
```bash
docker exec pm-travel-crm env | grep DB_TYPE
```

Should output:
```
DB_TYPE=postgres
```

**If you see no output or a different value:**
1. Rebuild the image: `docker build -t pm-travel-crm:latest .`
2. Stop containers: `docker-compose down`
3. Start again: `docker-compose up -d`

### Check docker-compose.yml Has DB_TYPE

```bash
grep "DB_TYPE" docker-compose.yml
```

Should show:
```
- DB_TYPE=postgres
```

If not found, update your docker-compose.yml with the latest version from GitHub.

---

## 📋 Complete Deployment Checklist

- [ ] Code is committed to GitHub
- [ ] Latest code includes `DB_TYPE=postgres` in docker-compose.yml
- [ ] Latest changes to server.js are included
- [ ] Docker image has been rebuilt
- [ ] Old containers have been removed
- [ ] New containers are started
- [ ] CRM logs show "Database: POSTGRES"
- [ ] API endpoint `/api/settings/db-status` returns `"currentDb": "postgres"`
- [ ] Settings show "PostgreSQL" as the active database

---

## 🔧 Quick Reference: Environment Variables

| Variable | Value | Where Set |
|----------|-------|-----------|
| `DB_TYPE` | `postgres` | docker-compose.yml (line 13) |
| `DATABASE_URL` | `postgresql://app-user:123456789@@Aa@crm-database-scijlk:5432/crm-db` | docker-compose.yml (line 14) |
| `PG_SSL_MODE` | `disable` | docker-compose.yml (line 15) |

All these should be passed to the container at startup. If not, rebuild the image.

---

## ❓ Why Is .env Not Used in Docker?

Docker containers **do NOT automatically load .env files**. The `.env` file is only for:
- Local development with `node server/server.js`
- Docker Compose locally when doing manual testing

For production deployment (Dokploy), environment variables come from:
1. Dokploy's environment configuration UI
2. docker-compose.yml in the repository
3. Shell environment variables passed at runtime

The `.env` file should **NEVER** be committed to GitHub (it's already in `.gitignore`).

---

## 📞 Still Having Issues?

1. **Clear Docker completely:**
   ```bash
   docker system prune -a
   ```

2. **Verify all code is up-to-date on GitHub:**
   ```bash
   git log --oneline -3
   ```

3. **Check server.js startup logging shows DB_TYPE:**
   ```bash
   docker-compose logs -f app | grep "DB_TYPE"
   ```

---

**Last Updated:** April 11, 2026
**PostgreSQL Connection:** Ready for Production ✓
