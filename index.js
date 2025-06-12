const express = require("express");
// const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const authRoutes = require("./routes/auth");
const checklistRoutes = require("./routes/checklist");
const projectsRoutes = require("./routes/projects");
const tasksRoutes = require("./routes/tasks");
const db = require("./db");
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/projects", projectsRoutes);
app.use("/", checklistRoutes);
app.use("/tasks", tasksRoutes);

// db.serialize(() => {
//   // Create tables if they don't exist
//   db.run(`CREATE TABLE IF NOT EXISTS users (
//     id INTEGER PRIMARY KEY,
//     email TEXT,
//     name TEXT
//   )`);

//   db.run(`CREATE TABLE IF NOT EXISTS projects (
//     id INTEGER PRIMARY KEY,
//     userId INTEGER,
//     title TEXT,
//     description TEXT,
//     dateCreated TEXT,
//     dateCompleted TEXT,
//     FOREIGN KEY(userId) REFERENCES users(id)
//   )`);

//   db.run(`CREATE TABLE IF NOT EXISTS tasks (
//     id INTEGER PRIMARY KEY,
//     userId INTEGER,
//     projectId INTEGER,
//     title TEXT,
//     description TEXT,
//     status TEXT,
//     priority TEXT,
//     category TEXT,
//     dueDate TEXT,
//     reminderDate TEXT,
//     repeat TEXT,
//     dateCreated TEXT,
//     dateCompleted TEXT,
//     FOREIGN KEY(userId) REFERENCES users(id),
//     FOREIGN KEY(projectId) REFERENCES projects(id)
//   )`);

//   db.run(`CREATE TABLE IF NOT EXISTS checklist_items (
//     id INTEGER PRIMARY KEY,
//     taskId INTEGER,
//     content TEXT,
//     isDone INTEGER,
//     FOREIGN KEY(taskId) REFERENCES tasks(id)
//   )`);
// });

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// app.patch("/tasks/:id/status", (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   const sql = `UPDATE tasks SET status = ? WHERE id = ?`;

//   db.run(sql, [status, id], function (err) {
//     if (err) {
//       console.error("Error updating task status:", err.message);
//       res.status(500).json({ error: "Failed to update task status" });
//     } else {
//       res.status(200).json({ message: "Task status updated", id, status });
//     }
//   });
// });
//

// PATCH endpoint to update only the status of a task
app.patch("/tasks/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const sql = `UPDATE tasks SET status = $1 WHERE id = $2`;

  try {
    await db.query(sql, [status, id]);
    res.status(200).json({ message: "Task status updated", id, status });
  } catch (err) {
    console.error("Error updating task status:", err.message);
    res.status(500).json({ error: "Failed to update task status" });
  }
});
