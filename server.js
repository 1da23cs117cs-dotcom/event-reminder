require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const app = express();

// ✅ CORS (your frontend URL)
app.use(cors({
  origin: "https://event-reminder-frontend-dwng.onrender.com"
}));

app.use(express.json());

// ✅ PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ✅ Email transporter (FIXED)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
console.log("SMTP FIX APPLIED");

// ✅ Create table (auto)
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title TEXT,
        email TEXT,
        event_time TIMESTAMP,
        reminder_time TIMESTAMP,
        notified BOOLEAN DEFAULT FALSE
      );
    `);
    console.log("✅ Table ready");
  } catch (err) {
    console.log("❌ Table error:", err.message);
  }
})();

// ✅ Add event
app.post('/events', async (req, res) => {
  try {
    const { title, email, event_time, reminder_time } = req.body;

    const result = await pool.query(
      `INSERT INTO events (title, email, event_time, reminder_time)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [title, email, event_time, reminder_time]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get events
app.get('/events', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update event
app.put('/events/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { title, email, event_time, reminder_time } = req.body;

    await pool.query(
      `UPDATE events 
       SET title=$1, email=$2, event_time=$3, reminder_time=$4 
       WHERE id=$5`,
      [title, email, event_time, reminder_time, id]
    );

    res.json({ message: "Event updated" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete event
app.delete('/events/:id', async (req, res) => {
  try {
    const id = req.params.id;

    await pool.query('DELETE FROM events WHERE id=$1', [id]);

    res.json({ message: "Event deleted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Cron job (every minute)
cron.schedule('* * * * *', async () => {
  const now = new Date();

  try {
    const result = await pool.query(
      `SELECT * FROM events WHERE reminder_time <= $1 AND notified=false`,
      [now]
    );

    for (let event of result.rows) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: event.email,
          subject: "⏰ Event Reminder",
          text: `Reminder: ${event.title} is scheduled soon!`
        });

        console.log(`📧 Email sent to ${event.email}`);

        await pool.query(
          'UPDATE events SET notified=true WHERE id=$1',
          [event.id]
        );

      } catch (err) {
        console.log("❌ Email error:", err.message);
      }
    }

  } catch (err) {
    console.log("❌ Cron error:", err.message);
  }
});

// ✅ Root
app.get('/', (req, res) => {
  res.send('🚀 Event Reminder Backend is running!');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});