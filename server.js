const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const SECRET = process.env.JWT_SECRET || "supersecret";

// ✅ Middlewares
app.use(cors());
app.use(express.json());

// ✅ ROOT (Backend test)
app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🚀" });
});

// ✅ PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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
    reminder_time TIMESTAMP
  );

  ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id INTEGER;
`);
    console.log("✅ Tables ready");
  } catch (err) {
    console.error("DB ERROR:", err.message);
  }
})();

// 🔐 AUTH MIDDLEWARE (FIXED)
function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: "No token" });
    }

    const token = header.startsWith("Bearer ")
      ? header.split(" ")[1]
      : header;

    const decoded = jwt.verify(token, SECRET);

    if (!decoded.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.log("AUTH ERROR:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
}

// ================= AUTH =================

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hashed]
    );

    res.json({ message: "User created" });
  } catch (err) {
    res.status(400).json({ error: "User already exists" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

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
  } catch (err) {
    console.log("LOGIN ERROR:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// ================= EVENTS =================

// GET EVENTS
app.get("/events", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM events WHERE user_id=$1 ORDER BY id DESC",
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.log("EVENT ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ADD EVENT
app.post("/events", auth, async (req, res) => {
  try {
    const { title, email, event_time, reminder_time } = req.body;

    if (!title || !email || !event_time || !reminder_time) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await pool.query(
      `INSERT INTO events (user_id, title, email, event_time, reminder_time)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        req.user.id,
        title,
        email,
        new Date(event_time),
        new Date(reminder_time)
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.log("INSERT ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE EVENT
app.put("/events/:id", auth, async (req, res) => {
  try {
    const { title, email, event_time, reminder_time } = req.body;

    await pool.query(
      `UPDATE events 
       SET title=$1, email=$2, event_time=$3, reminder_time=$4
       WHERE id=$5 AND user_id=$6`,
      [title, email, event_time, reminder_time, req.params.id, req.user.id]
    );

    res.json({ message: "Updated" });
  } catch (err) {
    console.log("UPDATE ERROR:", err.message);
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
  } catch (err) {
    console.log("DELETE ERROR:", err.message);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ================= EMAIL REMINDER =================

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Check reminders every minute
setInterval(async () => {
  try {
    const now = new Date();

    const result = await pool.query(
      "SELECT * FROM events WHERE reminder_time <= $1",
      [now]
    );

    for (let event of result.rows) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: event.email,
        subject: "⏰ Event Reminder",
        text: `Reminder: ${event.title} at ${event.event_time}`
      });

      await pool.query("DELETE FROM events WHERE id=$1", [event.id]);
    }
  } catch (err) {
    console.log("EMAIL ERROR:", err.message);
  }
}, 60000);

// ================= START SERVER =================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});