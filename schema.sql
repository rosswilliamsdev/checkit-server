CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT,
  passwordHash TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  dateCreated TEXT,
  dateCompleted TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
  projectId INTEGER REFERENCES projects(id) ON DELETE CASCADE,
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
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id SERIAL PRIMARY KEY,
  taskId INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT,
  isDone INTEGER
);