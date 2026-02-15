import { Router } from 'express';
import { getDb } from '../db/database';

const router = Router();

// Get all todos
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const todos = await db.all('SELECT * FROM todos ORDER BY created_at DESC');
    res.json(todos.map(t => ({
      ...t,
      completed: !!t.completed
    })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// Create todo
router.post('/', async (req, res) => {
  try {
    const { title, priority = 'normal' } = req.body;
    const id = Date.now().toString();
    const db = await getDb();
    await db.run(
      'INSERT INTO todos (id, title, priority) VALUES (?, ?, ?)',
      [id, title, priority]
    );
    const todo = await db.get('SELECT * FROM todos WHERE id = ?', id);
    res.json({ ...todo, completed: !!todo.completed });
  } catch {
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// Update todo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed, priority } = req.body;
    const db = await getDb();
    
    const updates: string[] = [];
    const values: unknown[] = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (completed !== undefined) {
      updates.push('completed = ?');
      values.push(completed ? 1 : 0);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }
    
    values.push(id);
    
    await db.run(
      `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const todo = await db.get('SELECT * FROM todos WHERE id = ?', id);
    res.json({ ...todo, completed: !!todo.completed });
  } catch {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// Delete todo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM todos WHERE id = ?', id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

export default router;
