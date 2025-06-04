const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateToken = require("../middleware/auth");

router.use(authenticateToken);

// !!!
// The backend assumes the frontend sends 0 or 1 for the isDone property of checklist items.
// !!!

router.get("/tasks/:id/checklist", (req, res) => {
  const { id } = req.params;

  // Check if task exists and belongs to user
  db.get(
    `SELECT id FROM tasks WHERE id = ? AND userId = ?`,
    [id, req.user.userId],
    (err, task) => {
      if (err) {
        console.error("Error checking task existence:", err.message);
        return res.status(500).json({ error: "Database error" });
      }
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // If task exists, fetch checklist
      const sql = `SELECT * FROM checklist_items WHERE taskId = ?`;
      db.all(sql, [id], (err, rows) => {
        if (err) {
          console.error("Error fetching checklist:", err.message);
          res.status(500).json({ error: "Failed to fetch checklist" });
        } else {
          res.json(rows);
        }
      });
    }
  );
});

// Add a checklist item to a task
router.post("/tasks/:id/checklist", (req, res) => {
  const { id } = req.params;
  const { content, isDone } = req.body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return res.status(400).json({ error: "Checklist content is required." });
  }
  if (content.length > 100) {
    return res
      .status(400)
      .json({ error: "Checklist content must be under 100 characters." });
  }

  // Check if task exists and belongs to user
  db.get(
    `SELECT id FROM tasks WHERE id = ? AND userId = ?`,
    [id, req.user.userId],
    (err, task) => {
      if (err) {
        console.error("Error checking task existence:", err.message);
        return res.status(500).json({ error: "Database error" });
      }
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const sql = `INSERT INTO checklist_items (taskId, content, isDone) VALUES (?, ?, ?)`;
      db.run(sql, [id, content, isDone ? 1 : 0], function (err) {
        if (err) {
          console.error("Error adding checklist item:", err.message);
          res.status(500).json({ error: "Failed to add checklist item" });
        } else {
          res.status(201).json({ id: this.lastID, content, isDone });
        }
      });
    }
  );
});

// Update a checklist item
router.put("/checklist/:id", (req, res) => {
  const { id } = req.params;
  const { content, isDone } = req.body;

  if (content !== undefined) {
    if (typeof content !== "string" || content.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Checklist content must be a non-empty string." });
    }
    if (content.length > 100) {
      return res
        .status(400)
        .json({ error: "Checklist content must be under 100 characters." });
    }
  }

  const checkSql = `SELECT t.userId FROM tasks t JOIN checklist_items c ON c.taskId = t.id WHERE c.id = ?`;
  db.get(checkSql, [id], (err, result) => {
    if (err || !result || result.userId !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (content === undefined) {
      // Only update isDone
      const sql = `UPDATE checklist_items SET isDone = ? WHERE id = ?`;
      db.run(sql, [isDone ? 1 : 0, id], function (err) {
        if (err) {
          console.error("Error updating checklist item:", err.message);
          res.status(500).json({ error: "Failed to update checklist item" });
        } else {
          res.status(200).json({ id, isDone });
        }
      });
    } else {
      // Update both fields
      const sql = `UPDATE checklist_items SET content = ?, isDone = ? WHERE id = ?`;
      db.run(sql, [content, isDone ? 1 : 0, id], function (err) {
        if (err) {
          console.error("Error updating checklist item:", err.message);
          res.status(500).json({ error: "Failed to update checklist item" });
        } else {
          res.status(200).json({ id, isDone, content });
        }
      });
    }
  });
});

// Delete a checklist item
router.delete("/checklist/:id", (req, res) => {
  const { id } = req.params;

  const checkSql = `SELECT t.userId FROM tasks t JOIN checklist_items c ON c.taskId = t.id WHERE c.id = ?`;
  db.get(checkSql, [id], (err, result) => {
    if (err || !result || result.userId !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const sql = `DELETE FROM checklist_items WHERE id = ?`;
    db.run(sql, [id], function (err) {
      if (err) {
        console.error("Error deleting checklist item:", err.message);
        res.status(500).json({ error: "Failed to delete checklist item" });
      } else if (this.changes === 0) {
        res.status(404).json({ error: "Checklist item not found" });
      } else {
        res.status(200).json({ message: "Checklist item deleted" });
      }
    });
  });
});

module.exports = router;
