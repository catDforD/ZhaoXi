import { Router } from 'express';
import { getDb } from '../db/database';

const router = Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const projects = await db.all('SELECT * FROM projects ORDER BY deadline');
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const { title, deadline } = req.body;
    const id = Date.now().toString();
    const db = await getDb();
    await db.run(
      'INSERT INTO projects (id, title, deadline, progress, status) VALUES (?, ?, ?, 0, "active")',
      [id, title, deadline]
    );
    const project = await db.get('SELECT * FROM projects WHERE id = ?', id);
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, deadline, progress, status } = req.body;
    const db = await getDb();
    
    const updates: string[] = [];
    const values: unknown[] = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (deadline !== undefined) {
      updates.push('deadline = ?');
      values.push(deadline);
    }
    if (progress !== undefined) {
      updates.push('progress = ?');
      values.push(progress);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    
    values.push(id);
    
    await db.run(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const project = await db.get('SELECT * FROM projects WHERE id = ?', id);
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM projects WHERE id = ?', id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
