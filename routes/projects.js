const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateToken = require("../middleware/auth");

router.use(authenticateToken);

//helper
/*
const getProjectById = (id, userId) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM projects WHERE id = ? AND userId = ?",
      [id, userId],
      (err, project) => {
        if (err) return reject(err);
        if (!project) return resolve(null);

        // Fetch tasks for the project
        db.all(
          "SELECT * FROM tasks WHERE projectId = ?",
          [project.id],
          (err, tasks) => {
            if (err) return reject(err);

            let remaining = tasks.length;
            if (remaining === 0) {
              project.tasks = [];
              return resolve(project);
            }

            tasks.forEach((task, index) => {
              db.all(
                "SELECT * FROM checklist_items WHERE taskId = ?",
                [task.id],
                (err, checklistItems) => {
                  if (err) {
                    console.error(
                      "Error fetching checklist items for task",
                      task.id,
                      ":",
                      err.message
                    );
                    return reject(err);
                  }
                  tasks[index].checklistItems = checklistItems || [];

                  remaining -= 1;
                  if (remaining === 0) {
                    project.tasks = tasks;
                    resolve(project);
                  }
                }
              );
            });
          }
        );
      }
    );
  });
};
*/

const getProjectById = async (id, userId) => {
  try {
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE id = $1 AND userId = $2",
      [id, userId]
    );

    if (projectResult.rows.length === 0) return null;
    const project = projectResult.rows[0];

    const tasksResult = await db.query(
      "SELECT * FROM tasks WHERE projectId = $1",
      [project.id]
    );
    const tasks = tasksResult.rows;

    for (let i = 0; i < tasks.length; i++) {
      const checklistResult = await db.query(
        "SELECT * FROM checklist_items WHERE taskId = $1",
        [tasks[i].id]
      );
      tasks[i].checklistItems = checklistResult.rows.map((item) => ({
        id: item.id,
        taskId: item.taskid,
        content: item.content,
        isDone: item.isdone,
      }));
    }

    project.tasks = tasks;
    return project;
  } catch (err) {
    console.error("Error in getProjectById:", err.message);
    throw err;
  }
};

// // GET (SQLite version)
// router.get("/", (req, res) => {
//   const userId = req.user.userId;
//   const sql = `SELECT id, title FROM projects WHERE userId = ? ORDER BY dateCreated DESC`;
//
//   db.all(sql, [userId], (err, rows) => {
//     if (err) {
//       console.error("Error fetching projects:", err.message);
//       res.status(500).json({ error: "Failed to fetch projects" });
//     } else {
//       res.json(rows);
//     }
//   });
// });
//

// GET (PostgreSQL version)
router.get("/", async (req, res) => {
  const userId = req.user.userId;
  const sql = `SELECT id, title FROM projects WHERE userId = $1 ORDER BY dateCreated DESC`;

  try {
    const result = await db.query(sql, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching projects:", err.message);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  try {
    const project = await getProjectById(id, userId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// // POST (SQLite version)
// router.post("/", (req, res) => {
//   const { title, description, dateCreated, dateCompleted } = req.body;
//
//   if (!title || typeof title !== "string" || title.trim().length === 0) {
//     return res.status(400).json({ error: "Project title is required." });
//   }
//   if (title.length > 100) {
//     return res
//       .status(400)
//       .json({ error: "Project title must be under 100 characters." });
//   }
//   if (description && description.length > 300) {
//     return res
//       .status(400)
//       .json({ error: "Description must be under 300 characters." });
//   }
//   if (dateCreated && isNaN(Date.parse(dateCreated))) {
//     return res.status(400).json({ error: "Invalid dateCreated format." });
//   }
//   if (dateCompleted && isNaN(Date.parse(dateCompleted))) {
//     return res.status(400).json({ error: "Invalid dateCompleted format." });
//   }
//   if (
//     dateCreated &&
//     dateCompleted &&
//     Date.parse(dateCompleted) < Date.parse(dateCreated)
//   ) {
//     return res
//       .status(400)
//       .json({ error: "dateCompleted cannot be earlier than dateCreated." });
//   }
//
//   const userId = req.user.userId;
//
//   const sql = `
//     INSERT INTO projects (
//       userId, title, description,
//       dateCreated, dateCompleted
//     ) VALUES (?, ?, ?, ?, ?)
//   `;
//
//   const params = [userId, title, description, dateCreated, dateCompleted];
//
//   db.run(sql, params, function (err) {
//     if (err) {
//       console.error("Error creating project:", err.message);
//       res.status(500).json({ error: "Failed to create project" });
//     } else {
//       res.status(201).json({ id: this.lastID });
//     }
//   });
// });

// POST (PostgreSQL version)
router.post("/", async (req, res) => {
  const { title, description, dateCreated, dateCompleted } = req.body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "Project title is required." });
  }
  if (title.length > 100) {
    return res
      .status(400)
      .json({ error: "Project title must be under 100 characters." });
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

  const sql = `
    INSERT INTO projects (
      userId, title, description,
      dateCreated, dateCompleted
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;

  const params = [userId, title, description, dateCreated, dateCompleted];

  try {
    const result = await db.query(sql, params);
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error("Error creating project:", err.message);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// // PUT (SQLite version)
// router.put("/:id", (req, res) => {
//   const { id } = req.params;
//   const { title, description, dateCreated, dateCompleted } = req.body;
//
//   if (!title || typeof title !== "string" || title.trim().length === 0) {
//     return res.status(400).json({ error: "Project title is required." });
//   }
//   if (title.length > 100) {
//     return res
//       .status(400)
//       .json({ error: "Project title must be under 100 characters." });
//   }
//   if (description && description.length > 300) {
//     return res
//       .status(400)
//       .json({ error: "Description must be under 300 characters." });
//   }
//   if (dateCreated && isNaN(Date.parse(dateCreated))) {
//     return res.status(400).json({ error: "Invalid dateCreated format." });
//   }
//   if (dateCompleted && isNaN(Date.parse(dateCompleted))) {
//     return res.status(400).json({ error: "Invalid dateCompleted format." });
//   }
//   if (
//     dateCreated &&
//     dateCompleted &&
//     Date.parse(dateCompleted) < Date.parse(dateCreated)
//   ) {
//     return res
//       .status(400)
//       .json({ error: "dateCompleted cannot be earlier than dateCreated." });
//   }
//
//   const userId = req.user.userId;
//
//   const sql = `
//     UPDATE projects SET
//       userId = ?, title = ?, description = ?,
//       dateCreated = ?, dateCompleted = ?
//     WHERE id = ?
//   `;
//
//   const params = [userId, title, description, dateCreated, dateCompleted, id];
//
//   db.run(sql, params, function (err) {
//     if (err) {
//       console.error("Error updating project:", err.message);
//       res.status(500).json({ error: "Failed to update project" });
//     } else {
//       res
//         .status(200)
//         .json({ message: "Project updated", changes: this.changes });
//     }
//   });
// });

// PUT (PostgreSQL version)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, dateCreated, dateCompleted } = req.body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "Project title is required." });
  }
  if (title.length > 100) {
    return res
      .status(400)
      .json({ error: "Project title must be under 100 characters." });
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

  const sql = `
    UPDATE projects SET
      userId = $1, title = $2, description = $3,
      dateCreated = $4, dateCompleted = $5
    WHERE id = $6
  `;

  const params = [userId, title, description, dateCreated, dateCompleted, id];

  try {
    const result = await db.query(sql, params);
    res
      .status(200)
      .json({ message: "Project updated", changes: result.rowCount });
  } catch (err) {
    console.error("Error updating project:", err.message);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// DELETE (PostgreSQL version)
router.delete("/:id", async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.userId;

  try {
    const taskResult = await db.query(
      "SELECT id FROM tasks WHERE projectId = $1",
      [projectId]
    );
    const taskIds = taskResult.rows.map((task) => task.id);

    if (taskIds.length > 0) {
      const placeholders = taskIds.map((_, i) => `$${i + 1}`).join(", ");
      await db.query(
        `DELETE FROM checklist_items WHERE taskId IN (${placeholders})`,
        taskIds
      );
    }

    await db.query("DELETE FROM tasks WHERE projectId = $1", [projectId]);

    await db.query("DELETE FROM projects WHERE id = $1 AND userId = $2", [
      projectId,
      userId,
    ]);

    return res.sendStatus(204);
  } catch (err) {
    console.error("Error deleting project and related data:", err.message);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

module.exports = router;
