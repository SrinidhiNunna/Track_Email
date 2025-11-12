# Email Tracker

An email tracking system that tracks email opens and link clicks using MySQL database.

## Setup Instructions

### 1. Database Setup (MySQL Workbench)

1. Open MySQL Workbench
2. Connect to your MySQL server (localhost, user: root, password: your password)
3. Open the `schema.sql` file in MySQL Workbench
4. Execute the entire script to create the database and tables
5. Verify the database `email_tracker` was created with the following tables:
   - `recipients`
   - `click_links`
   - `opens`
   - `click_logs`

### 2. Configure Environment Variables

1. Copy `config.example.env` to `.env`
2. Update the values in `.env`:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`
   - `BASE_URL` (set to the URL devices will use, e.g. `http://192.168.1.5:4000`)
3. Keep `.env` out of version control (already ignored)

**Email reminder:** For Gmail, you must enable 2FA and generate an App Password. Use the App Password for `EMAIL_PASSWORD`, not your normal Gmail password.

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Application

```bash
npm start
```

The server binds to `HOST`/`PORT` from your `.env`.

### 6. Access the Dashboard

- On the same machine: `http://localhost:4000/dashboard`
- On another device (same Wi-Fi): `http://<your-computer-ip>:4000/dashboard`

### 7. Find Your Local IP (macOS)

```bash
ipconfig getifaddr en0   # Wi-Fi
ipconfig getifaddr en1   # Ethernet (if applicable)
```

Use the IP from this command in `BASE_URL` and when visiting the dashboard from your phone.

### 6. Access the Dashboard

Open your browser and navigate to:
```
http://localhost:4000/dashboard
```

## Features

- **Email Tracking**: Tracks when emails are opened using a transparent pixel
- **Click Tracking**: Tracks when recipients click on links in emails
- **Dashboard**: View all recipients, email opens, and link clicks
- **Send Emails**: Send emails to all recipients from the dashboard

## Database Schema

- `recipients`: Stores recipient information (name, email)
- `click_links`: Stores tracking tokens and target URLs
- `opens`: Tracks email opens with IP and user agent
- `click_logs`: Tracks link clicks with IP and user agent

## API Endpoints

- `GET /dashboard` - View the email tracking dashboard
- `POST /api/send-all-emails` - Send emails to all recipients
- `GET /tracker/:emailId.png` - Tracking pixel endpoint
- `GET /click/:token` - Click tracking redirect endpoint

