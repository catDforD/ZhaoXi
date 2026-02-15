import { Router } from 'express';
import { getDb } from '../db/database';

const router = Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const events = await db.all('SELECT * FROM events ORDER BY date');
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get events by date
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const db = await getDb();
    const events = await db.all('SELECT * FROM events WHERE date = ?', date);
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create event
router.post('/', async (req, res) => {
  try {
    const { title, date, color = 'blue', note } = req.body;
    const id = Date.now().toString();
    const db = await getDb();
    await db.run(
      'INSERT INTO events (id, title, date, color, note) VALUES (?, ?, ?, ?, ?)',
      [id, title, date, color, note]
    );
    const event = await db.get('SELECT * FROM events WHERE id = ?', id);
    res.json(event);
  } catch {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, color, note } = req.body;
    const db = await getDb();
    
    const updates: string[] = [];
    const values: unknown[] = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (date !== undefined) {
      updates.push('date = ?');
      values.push(date);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }
    if (note !== undefined) {
      updates.push('note = ?');
      values.push(note);
    }
    
    values.push(id);
    
    await db.run(
      `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const event = await db.get('SELECT * FROM events WHERE id = ?', id);
    res.json(event);
  } catch {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM events WHERE id = ?', id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
