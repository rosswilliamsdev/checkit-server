// const sqlite3 = require("sqlite3").verbose();

/*
// Connect to the database, called checkit.db
const db = new sqlite3.Database("./checkit.db", (err) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }

  // Create tables
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        passwordHash TEXT
      )`);

    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        title TEXT,
        description TEXT,
        dateCreated TEXT,
        dateCompleted TEXT
      )`);

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        projectId INTEGER,
        title TEXT,
        description TEXT,
        status TEXT,
        priority TEXT,
        category TEXT,
        dueDate TEXT,
        reminderDate TEXT,
        repeat TEXT,
        dateCreated TEXT,
        dateCompleted TEXT
      )`);

    db.run(`CREATE TABLE IF NOT EXISTS checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER,
        content TEXT,
        isDone INTEGER
      )`);
  });
});
*/

// PostgreSQL connection setup
const { Pool } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

// Load the correct .env file based on NODE_ENV
const env = process.env.NODE_ENV || "development";
dotenv.config({ path: path.resolve(__dirname, `.env.${env}`) });

let pool;

if (process.env.DATABASE_URL) {
  // For production: use single connection string (Render)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  // For development: use individual PG_* vars
  pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
}

module.exports = pool;
