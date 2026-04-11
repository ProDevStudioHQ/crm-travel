# Dokploy CRM - Bad Gateway (502) Troubleshooting

## 🔴 Problem: Bad Gateway Error (502)

When accessing `http://crm-60g3ez-67a458-72-62-187-237.traefik.me/` you get a 502 Bad Gateway error.

**This means:** The CRM container is running but the Node.js server inside it crashed on startup.

---

## 🔍 STEP 1: Check Dokploy Container Logs

This is the ONLY way to diagnose the problem.

### In Dokploy Dashboard:

1. Go to your **CRM project**
2. Click **"Logs"** or **"Container Logs"**
3. Look for error messages that mention:
   - ❌ `PostgreSQL connection failed`
   - ❌ `ECONNREFUSED`
   - ❌ `authentication failed`
   - ❌ `database does not exist`
   - ❌ `Cannot find module`
   - ❌ Any other error in red

### Copy the error message you see in logs and provide it.

**The error in the logs will tell us exactly what's wrong.**

---

## 🛠️ COMMON FIXES Based on Error Type

### Error: "connect ECONNREFUSED" or "host does not resolve"

**Cause:** CRM can't reach PostgreSQL (wrong host)

**Fix:**
1. In Dokploy, go to CRM environment variables
2. Check `DB_HOST` - should it be `crm-database-scijlk`?
3. Or are you using `DATABASE_URL`? Make sure it says:
   ```
   postgresql://app-user:123456789@@Aa@crm-database-scijlk:5432/crm-db
   ```

### Error: "password authentication failed" or "role app-user does not exist"

**Cause:** Wrong PostgreSQL credentials

**Fix:**
1. In Dokploy, check PostgreSQL container logs
2. Verify these match **exactly**:
   - User: `app-user`
   - Password: `123456789@@Aa`
   - Database: `crm-db`
3. Go to PostgreSQL settings and confirm credentials

### Error: "database "crm-db" does not exist"

**Cause:** Database wasn't created

**Fix:**
1. SSH into Dokploy PostgreSQL container
2. Create the database:
   ```bash
   psql -U app-user -c "CREATE DATABASE \"crm-db\";"
   ```
3. Restart CRM container

### Error: "Cannot find module 'pg'" or other module not found

**Cause:** Dependencies not installed (old Docker image)

**Fix:**
1. In Dokploy, go to CRM
2. Click **"Force Rebuild"** or **"Redeploy"**
3. Wait for build to complete
4. Check logs for success

---

## ✅ STEP 2: Verify Configuration in Dokploy

### Check CRM Environment Variables

In Dokploy CRM settings, verify these are set:

```
DB_TYPE=postgres
DATABASE_URL=postgresql://app-user:123456789@@Aa@crm-database-scijlk:5432/crm-db
PG_SSL_MODE=disable
NODE_ENV=production
PORT=3000
```

If any are missing or wrong, update them and redeploy.

### Check PostgreSQL Status

1. Go to your PostgreSQL service in Dokploy
2. Verify status: **RUNNING**
3. Check container is healthy

### Verify Network Connection

Both CRM and PostgreSQL containers must be on the **same internal network**.

In Dokploy:
- CRM Network: check what network it's on
- PostgreSQL Network: must be the **same network**

---

## 🔧 STEP 3: Port & Health Check

### Verify Port Mapping

The CRM container exposes port **3000** internally.

Dokploy should route `http://crm-60g3ez-67a458-72-62-187-237.traefik.me` → `localhost:3000` inside container.

### Check Health Endpoint

Once running, this should work:
```bash
curl http://crm-60g3ez-67a458-72-62-187-237.traefik.me/api/health
```

Should return:
```json
{"ok":true}
```

---

## 🚀 STEP 4: Full Redeploy Procedure

If still broken, do a clean redeploy:

1. **Pull latest code:**
   - Go to GitHub repository
   - Confirm latest commit is for PostgreSQL setup
   
2. **In Dokploy:**
   - Go to CRM project
   - Click **"Force Redeploy"** (not just restart)
   - Wait for build to complete (usually 5-10 minutes)
   - Monitor the **Build Log** tab
   
3. **Check logs after build:**
   - Go to **Logs** tab
   - Should see:
     ```
     ============================================================
     ENVIRONMENT CONFIGURATION:
       DB_TYPE: postgres
       DATABASE_URL: ✓ SET
     ============================================================
     
     [DB] Database type detected: postgres
     [DB] Initializing PostgreSQL...
     ✓ PostgreSQL connected
     ✓ Server running on port 3000
     ✓ Database: POSTGRES
     ```

4. **Test the URL:**
   - `http://crm-60g3ez-67a458-72-62-187-237.traefik.me`
   - Should load the CRM (not 502 error)

---

## 📊 Quick Diagnosis Checklist

- [ ] CRM container is running (check Dokploy)
- [ ] PostgreSQL container is running
- [ ] PostgreSQL credentials are correct
- [ ] Database `crm-db` exists
- [ ] CRM has `DB_TYPE=postgres` environment variable
- [ ] CRM has valid `DATABASE_URL`
- [ ] Both containers on same network
- [ ] Container logs don't show errors
- [ ] `/api/health` endpoint returns 200

---

## ❓ Still Getting 502?

**Please provide:**

1. **Error from CRM container logs** (copy the exact error message)
2. **PostgreSQL status** (running? logs?)
3. **Dokploy deployment log** (did build succeed?)
4. **Environment variables** (what's in DATABASE_URL?)

With the error message, I can give you the exact fix.

---

**Last Updated:** April 11, 2026
**Dokploy CRM URL:** http://crm-60g3ez-67a458-72-62-187-237.traefik.me/
