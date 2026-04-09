# PM Travel CRM

A full-featured CRM for PM Travel Agency with integrated email marketing, campaign analytics, and lead management.

## Features

- **B2B / B2C Client Management**
- **Email Marketing** — Campaign creation, batch sending, queue system
- **SMTP Integration** — Hostinger SMTP (SSL/465) with anti-spam best practices
- **Email Queue** — Background worker with retry logic (max 3 attempts)
- **Campaign Analytics** — Open tracking, click tracking, bounce detection
- **Email Templates** — Reusable HTML templates with variables
- **Lead Tools** — Enrichment, deduplication, email verification
- **Invoices & Quotes**
- **Travel Bookings**

---

## Quick Start (Local)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_ORG/pm-travel-crm.git
cd pm-travel-crm

# 2. Create your .env from template
cp .env.example .env
# → Edit .env and set SMTP_PASS to your Hostinger password

# 3. Install dependencies
npm install

# 4. Start the server
npm start
# → Open http://localhost:3000
```

---

## SMTP Configuration (Hostinger)

| Setting      | Value                         |
|-------------|-------------------------------|
| Host        | `smtp.hostinger.com`          |
| Port        | `465`                         |
| Secure      | `true` (SSL)                  |
| Username    | `b2b@pm-travelagency.cloud`  |
| From Name   | `PM Travel Agency`           |

> **Important:** Use port **465 with SSL** (not 587/TLS). Configure these in **Settings → Email** inside the CRM.

---

## Anti-Spam DNS Records

Set these DNS records in the Hostinger control panel for `pm-travelagency.cloud`:

### SPF
```
v=spf1 include:_spf.mail.hostinger.com ~all
```

### DKIM
Enable DKIM in Hostinger email panel (hPanel → Emails → Manage → DKIM).

### DMARC
```
v=DMARC1; p=none; rua=mailto:b2b@pm-travelagency.cloud
```

---

## Email Queue System

The background worker processes queued emails automatically:

| Status    | Description                          |
|-----------|--------------------------------------|
| `pending` | Waiting to be sent                   |
| `sending` | Currently being processed            |
| `sent`    | Successfully delivered               |
| `failed`  | Failed after 3 retry attempts        |

**Anti-spam features:**
- 2–5 second random delay between sends
- Max 3 retry attempts with exponential backoff
- Unsubscribe link in every email
- Plain text version auto-generated
- `List-Unsubscribe` header included
- Open/click tracking with transparent pixel

---

## Environment Variables

```env
PORT=3000
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=b2b@pm-travelagency.cloud
SMTP_PASS=your_password
FROM_EMAIL=b2b@pm-travelagency.cloud
FROM_NAME=PM Travel Agency
CRM_API_KEY=optional_api_key
TRACKING_DOMAIN=https://www.pm-travelagency.com
```

---

## Deployment (Dokploy / VPS)

### Using Docker Compose

```bash
# 1. Copy env file
cp .env.example .env
# → Fill in your SMTP_PASS

# 2. Build and run
docker-compose up -d --build

# 3. Check health
curl http://localhost:3000/api/health
```

### Using Docker directly

```bash
docker build -t pm-crm .
docker run -d -p 3000:3000 --env-file .env --name pm-crm pm-crm
```

### Using PM2 (without Docker)

```bash
npm install -g pm2
cd server
pm2 start server.js --name pm-crm
pm2 save
pm2 startup
```

---

## API Endpoints

| Method | Endpoint                    | Description                    |
|--------|-----------------------------|--------------------------------|
| GET    | `/api/health`               | Health check                   |
| GET    | `/api/settings/email`       | Get SMTP/IMAP config           |
| POST   | `/api/settings/email`       | Save SMTP/IMAP config          |
| POST   | `/api/smtp/test`            | Test SMTP connection           |
| POST   | `/api/smtp/send-batch`      | Send batch emails directly     |
| POST   | `/api/campaigns/send`       | Queue campaign emails           |
| POST   | `/api/worker/process`       | Manually trigger queue process |
| GET    | `/api/queue/status`         | Queue statistics               |
| GET    | `/api/campaigns/analytics`  | All campaign analytics         |
| GET    | `/unsubscribe?email=...`    | Unsubscribe page               |

---

## Project Structure

```
/pm-travel-crm
├── index.html              # Main CRM UI
├── login.html              # Login page
├── style.css               # Global styles
├── login.css               # Login styles
├── app.js                  # Frontend app logic
├── store.js                # Client-side state
├── modules/                # Frontend modules (campaigns, mail, etc.)
├── utils/                  # Frontend utilities
├── server/
│   ├── server.js           # Express API server
│   ├── worker.js           # Background email queue worker
│   ├── db.js               # SQLite database layer
│   ├── lib/
│   │   └── mailer.js       # Centralized SMTP mailer module
│   └── routes/             # API route modules
├── data/crm/               # Runtime data (uploads, imports)
├── .env.example            # Environment template
├── .gitignore
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## License

Private — PM Travel Agency
