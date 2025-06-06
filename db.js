const sqlite3 = require("sqlite3").verbose();

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

module.exports = db;
