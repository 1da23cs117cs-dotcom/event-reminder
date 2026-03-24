const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const cron = require("node-cron");
require("dotenv").config();

const app = express();
const SECRET = process.env.JWT_SECRET || "supersecret";

// ✅ Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ✅ Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ✅ Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ✅ Create tables
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title TEXT,
        email TEXT,
        event_time TIMESTAMP,
        reminder_time TIMESTAMP,
        sent BOOLEAN DEFAULT false
      );
    `);
    console.log("✅ Tables ready");
  } catch (err) {
    console.error("❌ DB Error:", err);
  }
})();

// 🔐 AUTH MIDDLEWARE
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// =========================
// 🚀 AUTH ROUTES
// =========================

// SIGNUP
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "All fields required" });

  try {
    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hashed]
    );

    res.json({ message: "User created" });
  } catch {
    res.status(400).json({ error: "User already exists" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ error: "User not found" });

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password);

    if (!valid)
      return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign({ id: user.id }, SECRET, {
      expiresIn: "7d"
    });

    res.json({ token });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// 📦 EVENT ROUTES
// =========================

// GET EVENTS
app.get("/events", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM events WHERE user_id=$1 ORDER BY id DESC",
      [req.user.id]
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// ADD EVENT
app.post("/events", auth, async (req, res) => {
  const { title, email, event_time, reminder_time } = req.body;

  if (!title || !email || !event_time || !reminder_time)
    return res.status(400).json({ error: "All fields required" });

  try {
    const result = await pool.query(
      `INSERT INTO events (user_id, title, email, event_time, reminder_time)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title, email, event_time, reminder_time]
    );

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to add event" });
  }
});

// UPDATE EVENT
app.put("/events/:id", auth, async (req, res) => {
  const { title, email, event_time, reminder_time } = req.body;

  try {
    await pool.query(
      `UPDATE events 
       SET title=$1, email=$2, event_time=$3, reminder_time=$4
       WHERE id=$5 AND user_id=$6`,
      [title, email, event_time, reminder_time, req.params.id, req.user.id]
    );

    res.json({ message: "Updated" });
  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE EVENT
app.delete("/events/:id", auth, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM events WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );

    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

// =========================
// 📧 EMAIL REMINDER SYSTEM
// =========================

// Runs every minute
cron.schedule("* * * * *", async () => {
  console.log("⏰ Checking reminders...");

  try {
    const now = new Date();

    const result = await pool.query(
      "SELECT * FROM events WHERE reminder_time <= $1 AND sent = false",
      [now]
    );

    for (let event of result.rows) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: event.email,
        subject: "⏰ Event Reminder",
        html: `
          <h2>Reminder</h2>
          <p><b>${event.title}</b></p>
          <p>Event Time: ${event.event_time}</p>
        `
      });

      await pool.query(
        "UPDATE events SET sent = true WHERE id=$1",
        [event.id]
      );

      console.log("📧 Email sent:", event.title);
    }
  } catch (err) {
    console.log("❌ Email error:", err.message);
  }
});

// =========================
// 🚀 START SERVER
// =========================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});