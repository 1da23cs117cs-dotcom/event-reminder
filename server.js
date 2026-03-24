const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const SECRET = "mysecretkey";

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

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
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


// ✅ Create tables
(async () => {
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
})();


// 🔐 AUTH MIDDLEWARE
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}


// 🚀 SIGNUP
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hashed]
    );

    res.json({ message: "User created" });
  } catch {
    res.status(400).json({ error: "User already exists" });
  }
});


// 🚀 LOGIN
app.post("/login", async (req, res) => {
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

  const token = jwt.sign({ id: user.id }, SECRET);

  res.json({ token });
});


// 📦 GET EVENTS (protected)
app.get("/events", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM events WHERE user_id=$1 ORDER BY id DESC",
    [req.user.id]
  );

  res.json(result.rows);
});


// ➕ ADD EVENT
app.post("/events", auth, async (req, res) => {
  const { title, email, event_time, reminder_time } = req.body;

  const result = await pool.query(
    `INSERT INTO events (user_id, title, email, event_time, reminder_time)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user.id, title, email, event_time, reminder_time]
  );

  res.json(result.rows[0]);
});


// ❌ DELETE EVENT
app.delete("/events/:id", auth, async (req, res) => {
  await pool.query(
    "DELETE FROM events WHERE id=$1 AND user_id=$2",
    [req.params.id, req.user.id]
  );

  res.json({ message: "Deleted" });
});


// ✏️ UPDATE EVENT
app.put("/events/:id", auth, async (req, res) => {
  const { title, email, event_time, reminder_time } = req.body;

  await pool.query(
    `UPDATE events 
     SET title=$1, email=$2, event_time=$3, reminder_time=$4
     WHERE id=$5 AND user_id=$6`,
    [title, email, event_time, reminder_time, req.params.id, req.user.id]
  );

  res.json({ message: "Updated" });
});


// 🚀 START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port", PORT));