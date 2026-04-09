PM Travel CRM (CRM v1.011) - Quick Run Guide

✅ Recommended: Node.js 20 LTS (Windows)

1) Unzip the project
2) Open terminal in the project root (where package.json exists)

3) Install backend dependencies (server only):
   npm run install:server

   If you get sqlite3 errors, run inside server/:
   cd server
   npm install
   npm rebuild sqlite3 --build-from-source

4) Start CRM:
   npm start

5) Open in browser:
   http://localhost:3000

Login demo accounts:
- admin@travel.com / admin123
- manager@travel.com / manager123
- agent@travel.com / agent123

SMTP notes:
- Configure SMTP in Settings → Email (SMTP)
- Then test connection (sends a test email)

Security notes (for production):
- Set CRM_ALLOWED_ORIGINS and CRM_API_KEY environment variables.
