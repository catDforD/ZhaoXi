import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await open({
      filename: path.join(process.cwd(), 'workbench.db'),
      driver: sqlite3.Database,
    });
    await initDb();
  }
  return db;
}

async function initDb() {
  if (!db) return;

  // Todos table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'normal',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Projects table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      deadline TEXT,
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active'
    )
  `);

  // Events table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      color TEXT DEFAULT 'blue',
      note TEXT
    )
  `);

  // Personal tasks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS personal_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      budget REAL,
      date TEXT,
      location TEXT,
      note TEXT
    )
  `);

  // Insert default data if empty
  const todoCount = await db.get('SELECT COUNT(*) as count FROM todos');
  if (todoCount.count === 0) {
    await db.run(`
      INSERT INTO todos (id, title, completed, priority) VALUES
      ('1', '活动室ps出售', 0, 'normal'),
      ('2', '伙食费整理', 1, 'urgent')
    `);
  }

  const projectCount = await db.get('SELECT COUNT(*) as count FROM projects');
  if (projectCount.count === 0) {
    await db.run(`
      INSERT INTO projects (id, title, deadline, progress, status) VALUES
      ('1', '资料整理', '2025-12-31', 20, 'active')
    `);
  }
}
