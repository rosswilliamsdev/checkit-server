const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateToken = require("../middleware/auth");

router.use(authenticateToken);

//GET
router.get("/", (req, res) => {
  const sql = `
  SELECT 
    tasks.*, 
    projects.title AS projectTitle,
    (SELECT COUNT(*) FROM checklist_items WHERE taskId = tasks.id AND isDone = 1) AS completedSubtasks,
    (SELECT COUNT(*) FROM checklist_items WHERE taskId = tasks.id) AS totalSubtasks
  FROM tasks
  LEFT JOIN projects ON tasks.projectId = projects.id
  WHERE tasks.userId = ?
  ORDER BY dateCreated DESC
`;

  db.all(sql, [req.user.userId], (err, rows) => {
    if (err) {
      console.error("Error fetching tasks:", err.message);
      res.status(500).json({ error: "Failed to fetch tasks" });
    } else {
      res.json(rows);
    }
  });
});
//POST
router.post("/", (req, res) => {
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    userId,
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
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("Error creating task:", err.message);
      res.status(500).json({ error: "Failed to create task" });
    } else {
      res.status(201).json({ id: this.lastID });
    }
  });
});
//PUT
router.put("/:id", (req, res) => {
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
  console.log("Attempting to update task", req.body);
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
  if (dateCompleted && isNaN(Date.parse(dateCompleted))) {
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
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid task status." });
  }

  const validPriorities = ["low", "medium", "high"];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: "Invalid task priority." });
  }

  const sql = `
    UPDATE tasks SET
      projectId = ?, title = ?, description = ?, status = ?, priority = ?,
      category = ?, dueDate = ?, reminderDate = ?, repeat = ?, dateCreated = ?, dateCompleted = ?
    WHERE id = ? AND userId = ?
  `;

  const params = [
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
    id,
    userId,
  ];
  db.run(sql, params, function (err) {
    console.log("db running");

    if (err) {
      console.error("Error updating task:", err.message);
      res.status(500).json({ error: "Failed to update task" });
    } else if (this.changes === 0) {
      return res.status(404).json({ error: "Task not found or unauthorized" });
    } else {
      res.status(200).json({ message: "Task updated", changes: this.changes });
    }
  });
});

router.put("/tasks/:taskId/status", (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;
  const userId = req.user.userId;

  const validStatuses = ["pending", "in progress", "completed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid task status." });
  }

  const checkSql = "SELECT userId FROM tasks WHERE id = ?";
  db.get(checkSql, [taskId], (err, task) => {
    if (err) {
      return res.status(500).json({ error: "Database error." });
    }
    if (!task || task.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized or task not found." });
    }

    db.run(
      "UPDATE tasks SET status = ? WHERE id = ?",
      [status, taskId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  });
});

//DELETE
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  console.log("Attempting to delete task", id, "for user", req.user.userId);
  const sql = `DELETE FROM tasks WHERE id = ? AND userId = ?`;

  db.run(sql, [id, req.user.userId], function (err) {
    console.log("DELETE changes:", this.changes);

    if (err) {
      console.error("Error deleting task:", err.message);
      res.status(500).json({ error: "Failed to delete task" });
    } else if (this.changes === 0) {
      res.status(404).json({ error: "Task not found" });
    } else {
      res.status(200).json({ message: "Task deleted" });
    }
  });
});

module.exports = router;
