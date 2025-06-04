const sqlite3 = require("sqlite3").verbose();

// Connect to the database, called checkit.db
const db = new sqlite3.Database("./checkit.db", (err) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

module.exports = db;
