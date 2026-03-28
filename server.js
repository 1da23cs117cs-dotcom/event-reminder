const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// ================= DB =================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SECRET = "mysecret";

// ================= AUTO CREATE TABLES =================

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      title TEXT,
      email TEXT,
      event_time TIMESTAMP,
      reminder_time TIMESTAMP,
      category TEXT DEFAULT 'General'
    );
  `);

  console.log("✅ Tables ready");
}

// Run on server start
createTables();

// ================= AUTH MIDDLEWARE =================

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

// ================= AUTH =================

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hash]
    );

    res.json({ message: "User created" });
  } catch {
    res.json({ error: "User already exists" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0)
    return res.json({ error: "User not found" });

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) return res.json({ error: "Wrong password" });

  const token = jwt.sign({ id: user.id }, SECRET);

  res.json({ token });
});

// ================= EVENTS =================

// GET
app.get("/events", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM events WHERE user_id = $1 ORDER BY event_time",
    [req.user.id]
  );

  res.json(result.rows);
});

// ADD
app.post("/events", auth, async (req, res) => {
  const { title, email, event_time, reminder_time, category } = req.body;

  const result = await pool.query(
    `INSERT INTO events 
     (user_id, title, email, event_time, reminder_time, category)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      req.user.id,
      title,
      email,
      event_time,
      reminder_time,
      category || "General"
    ]
  );

  res.json(result.rows[0]);
});

// UPDATE
app.put("/events/:id", auth, async (req, res) => {
  const { title, email, event_time, reminder_time, category } = req.body;

  await pool.query(
    `UPDATE events 
     SET title=$1, email=$2, event_time=$3, reminder_time=$4, category=$5
     WHERE id=$6 AND user_id=$7`,
    [
      title,
      email,
      event_time,
      reminder_time,
      category || "General",
      req.params.id,
      req.user.id
    ]
  );

  res.json({ message: "Updated" });
});

// DELETE
app.delete("/events/:id", auth, async (req, res) => {
  await pool.query(
    "DELETE FROM events WHERE id=$1 AND user_id=$2",
    [req.params.id, req.user.id]
  );

  res.json({ message: "Deleted" });
});

// ================= SERVER =================

app.get("/", (req, res) => {
  res.send("API running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log("🚀 Server running on port", PORT);
  await createTables(); // ensure tables exist
});