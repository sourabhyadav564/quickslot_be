const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../quickslot.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS venues (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      sport      TEXT NOT NULL,
      location   TEXT NOT NULL,
      image_url  TEXT
    );

    CREATE TABLE IF NOT EXISTS slots (
      id         TEXT PRIMARY KEY,
      venue_id   TEXT NOT NULL REFERENCES venues(id),
      date       TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id         TEXT PRIMARY KEY,
      slot_id    TEXT NOT NULL REFERENCES slots(id),
      user_id    TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'active'
    );
  `);

  seedData();
}

function seedData() {
  // --- Users ---
  const users = [
    { id: 'user_1', name: 'Arjun Mehta' },
    { id: 'user_2', name: 'Priya Sharma' },
    { id: 'user_3', name: 'Rohan Das' },
  ];
  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)'
  );
  for (const u of users) insertUser.run(u.id, u.name);

  // --- Venues ---
  const venues = [
    {
      id: 'venue_1',
      name: 'Smash Arena',
      sport: 'Badminton',
      location: 'Koramangala, Bengaluru',
      image_url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600',
    },
    {
      id: 'venue_2',
      name: 'Green Turf FC',
      sport: 'Football',
      location: 'Indiranagar, Bengaluru',
      image_url: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=600',
    },
    {
      id: 'venue_3',
      name: 'Rally Point',
      sport: 'Badminton',
      location: 'HSR Layout, Bengaluru',
      image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600',
    },
    {
      id: 'venue_4',
      name: 'GoalZone Turf',
      sport: 'Football',
      location: 'Whitefield, Bengaluru',
      image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600',
    },
    {
      id: 'venue_5',
      name: 'Ace Court',
      sport: 'Badminton',
      location: 'JP Nagar, Bengaluru',
      image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600',
    },
  ];
  const insertVenue = db.prepare(
    'INSERT OR IGNORE INTO venues (id, name, sport, location, image_url) VALUES (?, ?, ?, ?, ?)'
  );
  for (const v of venues) insertVenue.run(v.id, v.name, v.sport, v.location, v.image_url);

  // --- Slots: seed for the next 7 days for each venue ---
  const insertSlot = db.prepare(
    'INSERT OR IGNORE INTO slots (id, venue_id, date, start_time, end_time) VALUES (?, ?, ?, ?, ?)'
  );

  const today = new Date();
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD

    for (const venue of venues) {
      // 6 AM to 10 PM → 16 hourly slots
      for (let hour = 6; hour < 22; hour++) {
        const startTime = `${String(hour).padStart(2, '0')}:00`;
        const endTime   = `${String(hour + 1).padStart(2, '0')}:00`;
        const slotId    = `${venue.id}_${dateStr}_${startTime}`;
        insertSlot.run(slotId, venue.id, dateStr, startTime, endTime);
      }
    }
  }
}

initDb();

module.exports = db;
