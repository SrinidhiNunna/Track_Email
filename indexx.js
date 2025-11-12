import express from 'express';
import 'dotenv/config'; // 👈 ADD THIS: Reads your .env file
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { sendAllEmails } from './sendEmaill.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 👇 UPDATED: Connects to Aiven using .env variables
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false } // 👈 IMPORTANT: Aiven requires SSL
});

// 👇 UPDATED: Reads BASE_URL from .env
const BASE_URL = process.env.BASE_URL;

// Serve static files for dashboard CSS/JS
app.use('/static', express.static(path.join(__dirname, 'public')));

// Dashboard route
app.get('/dashboard', async (req, res) => {
  try {
    const [recipients] = await pool.query('SELECT * FROM recipients ORDER BY id DESC');
    const [opens] = await pool.query(`
      SELECT o.*, r.name, r.email
      FROM opens o
      LEFT JOIN recipients r ON o.emailId = r.id
      ORDER BY o.timestamp DESC
    `);
    const [clicks] = await pool.query(`
      SELECT cl.*, r.name, r.email, l.targetUrl
      FROM click_logs cl
      LEFT JOIN recipients r ON cl.emailId = r.id
      LEFT JOIN click_links l ON cl.token = l.token
      ORDER BY cl.timestamp DESC
    `);

    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Dashboard</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="bg-light">
        <div class="container mt-4">
          <h1 class="mb-4">📧 Email Dashboard</h1>
          <button id="sendEmails" class="btn btn-primary mb-4">Send All Emails</button>

          <h3>Recipients</h3>
          <table class="table table-striped table-bordered">
            <thead class="table-dark">
              <tr><th>ID</th><th>Name</th><th>Email</th></tr>
            </thead>
            <tbody>
              ${recipients.map(r => `<tr><td>${r.id}</td><td>${r.name}</td><td>${r.email}</td></tr>`).join('')}
            </tbody>
          </table>

          <h3>Opened Emails</h3>
          <table class="table table-striped table-bordered">
            <thead class="table-dark">
              <tr><th>Recipient</th><th>Email</th><th>Opened At</th><th>IP</th><th>User Agent</th></tr>
            </thead>
            <tbody>
              ${opens.map(o => `<tr><td>${o.name}</td><td>${o.email}</td><td>${o.timestamp}</td><td>${o.ip}</td><td>${o.userAgent}</td></tr>`).join('')}
            </tbody>
          </table>

          <h3>Clicked Links</h3>
          <table class="table table-striped table-bordered">
            <thead class="table-dark">
              <tr><th>Recipient</th><th>Email</th><th>Link</th><th>Clicked At</th><th>IP</th><th>User Agent</th></tr>
            </thead>
            <tbody>
              ${clicks.map(c => `<tr><td>${c.name}</td><td>${c.email}</td><td><a href="${c.targetUrl}" target="_blank">${c.targetUrl}</a></td><td>${c.timestamp}</td><td>${c.ip}</td><td>${c.userAgent}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

        <script>
          document.getElementById('sendEmails').addEventListener('click', async () => {
            const btn = document.getElementById('sendEmails');
            btn.disabled = true;
            btn.textContent = 'Sending...';
            try {
              const response = await fetch('/api/send-all-emails', { method: 'POST' });
              if (!response.ok) throw new Error('Failed to send');
              alert('All emails sent! Check console for logs.');
            } catch(e) {
              console.error(e);
              alert('Failed to send emails.');
            }
            btn.disabled = false;
            btn.textContent = 'Send All Emails';
          });
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading dashboard');
  }
});

// API endpoint for sending all emails
app.post('/api/send-all-emails', async (req, res) => {
  try {
    await sendAllEmails();
    res.json({ status: 'success' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Pixel tracking
app.get('/tracker/:emailId.png', async (req, res) => {
  const emailId = req.params.emailId;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const userAgent = req.headers['user-agent'] || '';

  try {
    const [rows] = await pool.query('SELECT id FROM recipients WHERE id = ?', [emailId]);
    if (rows.length > 0) {
      await pool.query('INSERT INTO opens (emailId, ip, userAgent) VALUES (?, ?, ?)', [emailId, ip, userAgent]);
    }
  } catch (err) { console.error(err); }

  res.sendFile(path.join(__dirname, 'public/images/transparent_pixel.png'));
});

// Click tracking
app.get('/click/:token', async (req, res) => {
  const token = req.params.token;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const userAgent = req.headers['user-agent'] || '';

  try {
    const [rows] = await pool.query('SELECT emailId, targetUrl FROM click_links WHERE token = ?', [token]);
    if (rows.length === 0) return res.status(404).send('Invalid link');

    const { emailId, targetUrl } = rows[0];
    await pool.query('INSERT INTO click_logs (emailId, token, ip, userAgent) VALUES (?, ?, ?, ?)', [emailId, token, ip, userAgent]);
    res.redirect(targetUrl);
  } catch (err) { console.error(err); res.status(500).send('Error'); }
});

const PORT = process.env.PORT || 4000; // 👈 UPDATED: Good for deployment
const HOST = '0.0.0.0'; // 👈 UPDATED: Good for deployment

app.listen(PORT, HOST, () => console.log(`✅ Server running at http://localhost:${PORT}/dashboard`));