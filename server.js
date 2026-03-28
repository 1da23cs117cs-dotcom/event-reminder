const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const SECRET = process.env.JWT_SECRET || "supersecret";

// Middlewares
app.use(cors());
app.use(express.json());

// Root test
app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🚀" });
});

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create tables
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
    `);
    console.log("✅ Tables ready");
  } catch (err) {
    console.error("DB ERROR:", err.message);
  }
})();

// AUTH middleware
function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "No token" });

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ================= AUTH =================

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

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

// Login
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
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// ================= EVENTS =================

// ✅ UPDATED EVENTS ROUTE (works in browser)
app.get("/events", async (req, res) => {
  try {
    const header = req.headers.authorization;

    // If token → user-specific events
    if (header) {
      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, SECRET);

      const result = await pool.query(
        "SELECT * FROM events WHERE user_id=$1 ORDER BY id DESC",
        [decoded.id]
      );

      return res.json(result.rows);
    }

    // If no token → show all events
    const result = await pool.query(
      "SELECT * FROM events ORDER BY id DESC"
    );

    res.json(result.rows);

  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ PUBLIC ROUTE (safe for browser)
app.get("/events-public", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM events ORDER BY id DESC"
  );
  res.json(result.rows);
});

// Add event
app.post("/events", auth, async (req, res) => {
  try {
    const { title, email, event_time, reminder_time } = req.body;

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
    res.status(500).json({ error: err.message });
  }
});

// Update event
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
  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});

// Delete event
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

// ================= EMAIL =================

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Reminder system
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

// Start server
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});