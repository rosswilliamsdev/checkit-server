const db = require("./db");

db.query("SELECT NOW()")
  .then((res) => console.log("PostgreSQL time:", res.rows[0]))
  .catch((err) => console.error("Query failed:", err));
