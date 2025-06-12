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
    // const existingUser = await new Promise((resolve, reject) => {
    //   db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
    //     if (err) return reject(err);
    //     resolve(row);
    //   });
    // });

    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const existingUser = checkResult.rows[0];

    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertResult = await db.query(
      "INSERT INTO users (email, name, passwordHash) VALUES ($1, $2, $3) RETURNING id",
      [email, "", hashedPassword]
    );

    const newUserId = insertResult.rows[0].id;

    const token = jwt.sign({ userId: newUserId }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(201).json({ message: "User created", token });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already in use" });
    }
    res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const emailTrimmed = email.trim().toLowerCase();
  const passwordTrimmed = password.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!emailRegex.test(emailTrimmed)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (passwordTrimmed.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    // const user = await new Promise((resolve, reject) => {
    //   db.get(
    //     "SELECT * FROM users WHERE email = ?",
    //     [emailTrimmed],
    //     (err, row) => {
    //       if (err) return reject(err);
    //       resolve(row);
    //     }
    //   );
    // });

    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      emailTrimmed,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { id, email, name, passwordhash } = result.rows[0];
    const user = { id, email, name, passwordHash: passwordhash };

    if (!user.passwordHash) {
      console.error("User found but missing passwordHash:", user);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(passwordTrimmed, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });
    console.log("Password match:", isMatch);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // const user = await new Promise((resolve, reject) => {
    //   db.get(
    //     "SELECT id, email, name FROM users WHERE id = ?",
    //     [userId],
    //     (err, user) => {
    //       if (err) {
    //         console.error("Error fetching user:", err.message);
    //         return reject(err);
    //       }
    //       resolve(user);
    //     }
    //   );
    // });

    const result = await db.query(
      "SELECT id, email, name FROM users WHERE id = $1",
      [userId]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err.message);
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

module.exports = router;
