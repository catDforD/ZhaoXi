import { Router } from 'express';
import { getDb } from '../db/database';

const router = Router();

// Get all personal tasks
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const tasks = await db.all('SELECT * FROM personal_tasks ORDER BY date');
    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch personal tasks' });
  }
});

// Create personal task
router.post('/', async (req, res) => {
  try {
    const { title, budget, date, location, note } = req.body;
    const id = Date.now().toString();
    const db = await getDb();
    await db.run(
      'INSERT INTO personal_tasks (id, title, budget, date, location, note) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title, budget, date, location, note]
    );
    const task = await db.get('SELECT * FROM personal_tasks WHERE id = ?', id);
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to create personal task' });
  }
});

// Update personal task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, budget, date, location, note } = req.body;
    const db = await getDb();
    
    const updates: string[] = [];
    const values: unknown[] = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (budget !== undefined) {
      updates.push('budget = ?');
      values.push(budget);
    }
    if (date !== undefined) {
      updates.push('date = ?');
      values.push(date);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location);
    }
    if (note !== undefined) {
      updates.push('note = ?');
      values.push(note);
    }
    
    values.push(id);
    
    await db.run(
      `UPDATE personal_tasks SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const task = await db.get('SELECT * FROM personal_tasks WHERE id = ?', id);
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to update personal task' });
  }
});

// Delete personal task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM personal_tasks WHERE id = ?', id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete personal task' });
  }
});

export default router;
