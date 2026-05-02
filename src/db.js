const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'arbnb.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      totp_secret VARCHAR(64),
      totp_enabled INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_name      VARCHAR(255),
      nationality     VARCHAR(100),
      listing_title   TEXT,
      reservation_code VARCHAR(50) UNIQUE,
      amount_original VARCHAR(50),
      amount_value    NUMERIC(12,2),
      stay_start      DATE,
      stay_end        DATE,
      nights          INTEGER,
      amount_per_night NUMERIC(12,2),
      payout_date     TIMESTAMP,
      email_id        VARCHAR(100),
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payouts_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_name      VARCHAR(255),
      nationality     VARCHAR(100),
      listing_title   TEXT,
      reservation_code VARCHAR(50) UNIQUE,
      amount_original VARCHAR(50),
      amount_value    NUMERIC(12,2),
      stay_start      DATE,
      stay_end        DATE,
      nights          INTEGER,
      amount_per_night NUMERIC(12,2),
      payout_date     TIMESTAMP,
      email_id        VARCHAR(100),
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// User functions
function getUser(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// Payout functions
function getPayouts({ search = '', sort = 'payout_date', order = 'desc', limit = 500 } = {}) {
  const allowedSorts = ['payout_date','amount_value','guest_name','nationality','nights','amount_per_night','created_at'];
  const s = allowedSorts.includes(sort) ? sort : 'payout_date';
  const o = order === 'asc' ? 'ASC' : 'DESC';
  const l = Math.min(parseInt(limit) || 500, 1000);

  let query = 'SELECT * FROM payouts';
  const params = [];
  if (search && search.trim()) {
    query += ' WHERE guest_name LIKE ? OR nationality LIKE ? OR listing_title LIKE ? OR reservation_code LIKE ?';
    const sw = '%' + search.trim() + '%';
    params.push(sw, sw, sw, sw);
  }
  // Numeric columns need CAST for correct ordering
  const numericCols = ['amount_value','nights','amount_per_night','guests_total','guests_adult','guests_child','guests_infant'];
  // payout_date is 'YYYY-MM-DD' — use julianday() for correct date sort
  const isDateCol = (s === 'payout_date');
  const orderExpr = isDateCol
    ? 'julianday(' + s + ') ' + o
    : numericCols.includes(s)
    ? 'CAST(' + s + ' AS REAL) ' + o
    : s + ' ' + o;
  query += ' ORDER BY ' + orderExpr + ' LIMIT ' + l;
  return getDb().prepare(query).all(...params);
}

function addPayout(data) {
  const {
    guestName, nationality, listingTitle, reservationCode,
    amountOriginal, amountValue, stayStart, stayEnd,
    nights, amountPerNight, payoutDate, emailId
  } = data;
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO payouts
    (guest_name, nationality, listing_title, reservation_code,
     amount_original, amount_value, stay_start, stay_end,
     nights, amount_per_night, payout_date, email_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    guestName || 'Unknown',
    nationality || '',
    listingTitle || '',
    reservationCode || '',
    amountOriginal || '',
    amountValue || 0,
    stayStart || null,
    stayEnd || null,
    nights || 0,
    amountPerNight || 0,
    payoutDate || new Date().toISOString(),
    emailId || ''
  );
  return result.lastInsertRowid;
}

function getPayoutByResCode(code) {
  return getDb().prepare('SELECT * FROM payouts WHERE reservation_code = ?').get(code);
}

module.exports = { getDb, getUser, getUserById, getPayouts, addPayout, getPayoutByResCode };
