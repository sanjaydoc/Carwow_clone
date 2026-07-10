import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(join(dataDir, 'carwow.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cars (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      make          TEXT NOT NULL,
      model         TEXT NOT NULL,
      trim          TEXT,
      year          INTEGER NOT NULL,
      price         INTEGER NOT NULL,
      monthly_price INTEGER NOT NULL,
      body_type     TEXT NOT NULL,
      fuel_type     TEXT NOT NULL,
      transmission  TEXT NOT NULL,
      mileage       INTEGER NOT NULL DEFAULT 0,
      color         TEXT,
      condition     TEXT NOT NULL DEFAULT 'new',
      seats         INTEGER,
      doors         INTEGER,
      engine        TEXT,
      power_bhp     INTEGER,
      zero_to_sixty REAL,
      top_speed     INTEGER,
      economy_mpg   REAL,
      rating        REAL DEFAULT 0,
      review_count  INTEGER DEFAULT 0,
      accent        TEXT DEFAULT '#0b8a6b',
      description   TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_cars (
      user_id    INTEGER NOT NULL,
      car_id     INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, car_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sell_submissions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER,
      reg             TEXT,
      make            TEXT NOT NULL,
      model           TEXT NOT NULL,
      year            INTEGER NOT NULL,
      mileage         INTEGER NOT NULL,
      condition       TEXT NOT NULL DEFAULT 'good',
      seller_name     TEXT NOT NULL,
      seller_email    TEXT NOT NULL,
      estimated_value INTEGER NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS dealer_offers (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      dealer_name   TEXT NOT NULL,
      dealer_rating REAL NOT NULL,
      distance_mi   INTEGER NOT NULL,
      offer_amount  INTEGER NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (submission_id) REFERENCES sell_submissions(id) ON DELETE CASCADE
    );
  `);
}

export default db;
