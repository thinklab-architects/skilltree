import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { defaultData } from './scripts/seed-data.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4173;
const DATA_PATH = path.join(__dirname, 'data', 'trails.json');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

async function loadData() {
  if (!existsSync(DATA_PATH)) {
    await writeFile(DATA_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }

  try {
    const raw = await readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Could not read data file, resetting to default.', err);
    await writeFile(DATA_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
}

async function saveData(data) {
  await writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/api/trails', async (_req, res) => {
  const data = await loadData();
  res.json(data);
});

app.post('/api/tracks', requireAdmin, async (req, res) => {
  const { title, description, color, focus, lead } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const data = await loadData();
  const track = {
    id: `track-${uuidv4()}`,
    title,
    description: description || '',
    color: color || '#111',
    focus: focus || '',
    lead: lead || ''
  };
  data.tracks.push(track);
  await saveData(data);
  res.status(201).json(track);
});

app.put('/api/tracks/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const data = await loadData();
  const track = data.tracks.find(t => t.id === id);
  if (!track) {
    return res.status(404).json({ error: 'Track not found' });
  }

  const { title, description, color, focus, lead } = req.body;
  if (title) track.title = title;
  if (description) track.description = description;
  if (color) track.color = color;
  if (focus) track.focus = focus;
  if (lead) track.lead = lead;

  await saveData(data);
  res.json(track);
});

app.post('/api/tutorials', requireAdmin, async (req, res) => {
  const { title, trackId, summary, status, level, duration, tags, links, owner, highlight } = req.body;
  if (!title || !trackId) {
    return res.status(400).json({ error: 'title and trackId are required' });
  }

  const data = await loadData();
  const trackExists = data.tracks.some(track => track.id === trackId);
  if (!trackExists) {
    return res.status(400).json({ error: 'trackId does not exist' });
  }

  const tutorial = {
    id: `module-${uuidv4()}`,
    title,
    trackId,
    summary: summary || '',
    status: status || 'draft',
    level: level || 'Core',
    duration: duration || '',
    tags: Array.isArray(tags) ? tags : [],
    links: Array.isArray(links) ? links : [],
    owner: owner || '',
    highlight: highlight || ''
  };

  data.tutorials.push(tutorial);
  await saveData(data);
  res.status(201).json(tutorial);
});

app.put('/api/tutorials/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const data = await loadData();
  const tutorial = data.tutorials.find(t => t.id === id);
  if (!tutorial) {
    return res.status(404).json({ error: 'Tutorial not found' });
  }

  const { title, trackId, summary, status, level, duration, tags, links, owner, highlight } = req.body;
  if (title !== undefined) tutorial.title = title;
  if (trackId !== undefined) tutorial.trackId = trackId;
  if (summary !== undefined) tutorial.summary = summary;
  if (status !== undefined) tutorial.status = status;
  if (level !== undefined) tutorial.level = level;
  if (duration !== undefined) tutorial.duration = duration;
  if (tags !== undefined) tutorial.tags = Array.isArray(tags) ? tags : [];
  if (links !== undefined) tutorial.links = Array.isArray(links) ? links : [];
  if (owner !== undefined) tutorial.owner = owner;
  if (highlight !== undefined) tutorial.highlight = highlight;

  await saveData(data);
  res.json(tutorial);
});

app.delete('/api/tutorials/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const data = await loadData();
  const before = data.tutorials.length;
  data.tutorials = data.tutorials.filter(t => t.id !== id);
  if (data.tutorials.length === before) {
    return res.status(404).json({ error: 'Tutorial not found' });
  }
  await saveData(data);
  res.status(204).send();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Architect Skill Trails running at http://localhost:${PORT}`);
});
