const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateToken = require("../middleware/auth");

router.use(authenticateToken);

//GET
// SQLite version
// router.get("/", (req, res) => {
//   const sql = `
//   SELECT
//     tasks.*,
//     projects.title AS projectTitle,
//     (SELECT COUNT(*) FROM checklist_items WHERE taskId = tasks.id AND isDone = 1) AS completedSubtasks,
//     (SELECT COUNT(*) FROM checklist_items WHERE taskId = tasks.id) AS totalSubtasks
//   FROM tasks
//   LEFT JOIN projects ON tasks.projectId = projects.id
//   WHERE tasks.userId = ?
//   ORDER BY dateCreated DESC
// `;
//
//   db.all(sql, [req.user.userId], (err, rows) => {
//     if (err) {
//       console.error("Error fetching tasks:", err.message);
//       res.status(500).json({ error: "Failed to fetch tasks" });
//     } else {
//       res.json(rows);
//     }
//   });
// });

// Postgres version
router.get("/", async (req, res) => {
  const sql = `
    SELECT 
      tasks.*, 
      projects.title AS projectTitle,
      (SELECT COUNT(*) FROM checklist_items WHERE taskId = tasks.id AND isDone = 1) AS completedSubtasks,
      (SELECT COUNT(*) FROM checklist_items WHERE taskId = tasks.id) AS totalSubtasks
    FROM tasks
    LEFT JOIN projects ON tasks.projectId = projects.id
    WHERE tasks.userId = $1
    ORDER BY dateCreated DESC
  `;

  try {
    const result = await db.query(sql, [req.user.userId]);
    res.json(
      result.rows.map((row) => ({
        ...row,
        dueDate: row.duedate,
        reminderDate: row.reminderdate,
        dateCreated: row.datecreated,
        dateCompleted: row.datecompleted,
        projectTitle: row.projecttitle,
        completedSubtasks: row.completedsubtasks,
        totalSubtasks: row.totalsubtasks,
      }))
    );
  } catch (err) {
    console.error("Error fetching tasks:", err.message);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// router.post("/", (req, res) => {
//   // SQLite version (commented out)
// });

// Postgres version
router.post("/", async (req, res) => {
  const {
    projectId,
    title,
    description,
    status,
    priority,
    category,
    dueDate,
    reminderDate,
    repeat,
    dateCreated,
  } = req.body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "Task title is required." });
  }
  if (title.length > 100) {
    return res
      .status(400)
      .json({ error: "Task title must be under 100 characters." });
  }
  if (description && description.length > 300) {
    return res
      .status(400)
      .json({ error: "Description must be under 300 characters." });
  }
  if (dateCreated && isNaN(Date.parse(dateCreated))) {
    return res.status(400).json({ error: "Invalid dateCreated format." });
  }

  const userId = req.user.userId;

  const validStatuses = ["pending", "in progress", "completed"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid task status." });
  }

  const validPriorities = ["low", "medium", "high"];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: "Invalid task priority." });
  }

  const sql = `
    INSERT INTO tasks (
      userId, projectId, title, description, status, priority,
      category, dueDate, reminderDate, repeat, dateCreated
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `;

  const params = [
    userId,
    projectId,
    title,
    description,
    status,
    priority,
    category ?? null,
    dueDate ?? null,
    reminderDate ?? null,
    repeat ?? null,
    dateCreated,
  ];

  try {
    console.log("Inserting task with params:", params);
    const result = await db.query(sql, params);
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// PUT /:id - Update task (PostgreSQL version)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    projectId,
    title,
    description,
    status,
    priority,
    category,
    dueDate,
    reminderDate,
    repeat,
    dateCreated,
    dateCompleted,
  } = req.body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "Task title is required." });
  }
  if (title.length > 100) {
    return res
      .status(400)
      .json({ error: "Task title must be under 100 characters." });
  }
  if (description && description.length > 300) {
    return res
      .status(400)
      .json({ error: "Description must be under 300 characters." });
  }
  if (dateCreated && isNaN(Date.parse(dateCreated))) {
    return res.status(400).json({ error: "Invalid dateCreated format." });
  }
  const isValidDate = (d) =>
    typeof d === "string" && d.trim() !== "" && !isNaN(Date.parse(d));

  if (dateCompleted && !isValidDate(dateCompleted)) {
    return res.status(400).json({ error: "Invalid dateCompleted format." });
  }
  if (
    dateCreated &&
    dateCompleted &&
    Date.parse(dateCompleted) < Date.parse(dateCreated)
  ) {
    return res
      .status(400)
      .json({ error: "dateCompleted cannot be earlier than dateCreated." });
  }

  const userId = req.user.userId;
  const validStatuses = ["pending", "in progress", "completed"];
  const validPriorities = ["low", "medium", "high"];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid task status." });
  }
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: "Invalid task priority." });
  }

  const sql = `
    UPDATE tasks SET
      projectId = $1, title = $2, description = $3, status = $4, priority = $5,
      category = $6, dueDate = $7, reminderDate = $8, repeat = $9, dateCreated = $10, dateCompleted = $11
    WHERE id = $12 AND userId = $13
  `;

  const params = [
    projectId,
    title,
    description,
    status,
    priority,
    category ?? null,
    dueDate ?? null,
    reminderDate ?? null,
    repeat ?? null,
    dateCreated ?? null,
    dateCompleted ?? null,
    id,
    userId,
  ];

  try {
    const result = await db.query(sql, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Task not found or unauthorized" });
    }
    res.status(200).json({ message: "Task updated", changes: result.rowCount });
  } catch (err) {
    console.error("Error updating task:", err.message);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// router.put("/tasks/:taskId/status", (req, res) => {
//   // SQLite version (commented out)
// });

//Postgres version
router.put("/tasks/:taskId/status", async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;
  const userId = req.user.userId;

  const validStatuses = ["pending", "in progress", "completed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid task status." });
  }

  try {
    const checkSql = "SELECT userId FROM tasks WHERE id = $1";
    const checkResult = await db.query(checkSql, [taskId]);

    if (
      checkResult.rows.length === 0 ||
      checkResult.rows[0].userid !== userId
    ) {
      return res.status(403).json({ error: "Unauthorized or task not found." });
    }

    const updateSql = "UPDATE tasks SET status = $1 WHERE id = $2";
    await db.query(updateSql, [status, taskId]);

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating task status:", err.message);
    res.status(500).json({ error: "Failed to update task status." });
  }
});

// DELETE (PostgreSQL version)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  console.log("Attempting to delete task", id, "for user", userId);

  const sql = "DELETE FROM tasks WHERE id = $1 AND userId = $2";

  try {
    const result = await db.query(sql, [id, userId]);

    console.log("DELETE rowCount:", result.rowCount);

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Task not found" });
    } else {
      res.status(200).json({ message: "Task deleted" });
    }
  } catch (err) {
    console.error("Error deleting task:", err.message);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = router;
