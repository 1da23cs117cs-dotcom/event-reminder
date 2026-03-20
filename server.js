require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create table
(async () => {
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
})();

// Add event
app.post('/events', async (req, res) => {
  const { title, email, event_time, reminder_time } = req.body;

  const result = await pool.query(
    `INSERT INTO events (title, email, event_time, reminder_time)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [title, email, event_time, reminder_time]
  );

  res.json(result.rows[0]);
});

// Get events
app.get('/events', async (req, res) => {
  const result = await pool.query('SELECT * FROM events');
  res.json(result.rows);
});

// Cron job (every minute)
cron.schedule('* * * * *', async () => {
  const now = new Date();

  const result = await pool.query(
    `SELECT * FROM events WHERE reminder_time <= $1 AND notified=false`,
    [now]
  );

  for (let event of result.rows) {
    console.log(`Reminder: ${event.title}`);

    await pool.query(
      'UPDATE events SET notified=true WHERE id=$1',
      [event.id]
    );
  }
});

app.listen(process.env.PORT, () =>
  console.log('Server running...')
);
app.delete('/events/:id', async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query('DELETE FROM events WHERE id=$1', [id]);
    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).send(err);
  }
});
app.put('/events/:id', async (req, res) => {
  const id = req.params.id;
  const { title, email, event_time, reminder_time } = req.body;

  try {
    await pool.query(
      `UPDATE events 
       SET title=$1, email=$2, event_time=$3, reminder_time=$4 
       WHERE id=$5`,
      [title, email, event_time, reminder_time, id]
    );

    res.json({ message: "Event updated" });
  } catch (err) {
    res.status(500).send(err);
  }
});
app.get('/', (req, res) => {
  res.send('🚀 Event Reminder Backend is running!');
});