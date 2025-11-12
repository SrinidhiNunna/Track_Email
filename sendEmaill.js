import 'dotenv/config'; // 👈 ADD THIS: Reads your .env file
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

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

// Create tracking link for recipient
async function createTrackingLink(email, name) {
  const [recipientRows] = await pool.query('SELECT id FROM recipients WHERE email = ?', [email]);
  let emailId;

  if (recipientRows.length === 0) {
    const [result] = await pool.query('INSERT INTO recipients (name, email) VALUES (?, ?)', [name, email]);
    emailId = result.insertId;
  } else {
    emailId = recipientRows[0].id;
  }

  const token = uuidv4();
  const targetUrl = 'https://www.youtube.com/'; // Destination link

  await pool.query('INSERT INTO click_links (emailId, token, targetUrl) VALUES (?, ?, ?)', [emailId, token, targetUrl]);
  return { emailId, token };
}

// Generate professional email HTML
async function generateEmailHtml(email, name) {
  const { emailId, token } = await createTrackingLink(email, name);
  const trackedUrl = `${BASE_URL}/click/${token}`;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Exclusive Content</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        background: #f5f6f8;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 650px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      }
      .header {
        background: #000000; /* black background */
        color: #ffffff;
        padding: 30px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-weight: 600;
        font-size: 24px;
      }
      .content {
        padding: 30px;
        color: #333333;
        line-height: 1.6;
      }
      .highlight {
        background: #f0f4ff;
        padding: 20px;
        border-left: 4px solid #4b6cb7;
        border-radius: 5px;
        margin: 20px 0;
      }
      a.link {
        display: inline-block;
        margin-top: 15px;
        padding: 12px 25px;
        background: #4b6cb7;
        color: #fff !important;
        text-decoration: none;
        border-radius: 5px;
        font-weight: 500;
      }
      .footer {
        font-size: 12px;
        color: #999999;
        padding: 25px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Hello ${name}</h1>
      </div>
      <div class="content">
        <p>We thought you might enjoy this curated content:</p>

        <div class="highlight">
          <p><strong>Exclusive Feature:</strong> Watch an inspiring video we hand-picked just for you.</p>
          <a href="${trackedUrl}" class="link">Watch Now</a>
        </div>

        <p>We hope this brings you some value and inspiration!</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Your Company. All rights reserved.
      </div>
    </div>

    <img src="${BASE_URL}/tracker/${emailId}.png" style="display:none;" />
  </body>
  </html>
  `;
}


// 👇 UPDATED: Reads Gmail credentials from .env
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Send single email
export async function sendEmail(toEmail, name) {
  const html = await generateEmailHtml(toEmail, name);
  await transporter.sendMail({
    from: `"Your Company" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Special Content Awaits',
    html
  });
  console.log(`✅ Sent email to ${toEmail}`);
}

// Send all emails in DB
export async function sendAllEmails() {
  const [rows] = await pool.query('SELECT name, email FROM recipients');

  for (const r of rows) {
    try {
      await sendEmail(r.email, r.name);
    } catch (err) {
      console.error(`❌ Failed for ${r.email}:`, err.message);
    }
  }

  console.log('✅ All emails processed');
}