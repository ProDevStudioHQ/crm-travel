
# PM CRM - SMTP Email Sending

## Run (Windows / Mac / Linux)

1) Install Node.js (LTS)
2) Open terminal in `server/`
3) Install deps:
   - `npm install`
4) Start server:
   - `npm start`
5) Open:
   - http://localhost:3000

## How to Send
- Go to **Settings → Email SMTP** and fill:
  host, port, encryption (TLS/SSL), username, password, fromName, fromEmail.
- Go to **Templates** and create/select an email template.
- Go to **Campaigns**
  - Edit a campaign and choose **Email Template**
  - Click the **paper plane** icon to send (Launch)

## Notes
- SMTP sending cannot work directly in the browser. It requires the Node server.
- For high volume, use a dedicated email provider (SES, SendGrid, Brevo).
