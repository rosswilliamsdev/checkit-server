const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (password.trim().length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    const existingUser = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      "INSERT INTO users (email, name, passwordHash) VALUES (?, ?, ?)",
      [email, "", hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed: users.email")) {
            return res.status(409).json({ error: "Email already in use" });
          }
          console.error(err);
          return res.status(500).json({ error: "Signup failed" });
        }

        const token = jwt.sign(
          { userId: this.lastID },
          process.env.JWT_SECRET,
          {
            expiresIn: "1d",
          }
        );

        res.status(201).json({ message: "User created", token });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (password.trim().length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!user || !user.passwordHash) {
      console.error("User not found or missing passwordHash:", user);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.get(
    "SELECT id, email, name FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) {
        console.error("Error fetching user:", err.message);
        return res.status(500).json({ error: "Failed to fetch user info" });
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    }
  );
});

module.exports = router;
