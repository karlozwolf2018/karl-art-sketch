import express from 'express';
import pg from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Transforma una fila de Postgres (snake_case) al formato que espera el frontend
function toArtwork(row) {
  const l10n = row.l10n && typeof row.l10n === 'object' ? row.l10n : {};
  const es = l10n.es || {};
  const en = l10n.en || {};
  return {
    id: row.id,
    imageUrl: row.image_url || '',
    materialsImageUrl: row.materials_image_url || '',
    gallery: row.gallery || '',
    holographic: !!row.holographic,
    index: row.index,
    code: row.code || '',
    category: row.category || '',
    color: row.color || '',
    accent: row.accent || '',
    icon: row.icon || '',
    year: row.year,
    size: row.size || '',
    paper: row.paper || '',
    grammage: row.grammage || '',
    brand: row.brand || '',
    minutes: row.minutes || 0,
    hours: row.hours || 0,
    status: row.status || '',
    available: !!row.available,
    seed: row.seed,
    render: row.render || '',
    featured: !!row.featured,
    palette: Array.isArray(row.palette) ? row.palette : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    l10n: l10n,
    title: es.title || '',
    technique: es.technique || '',
    materials: es.materials || '',
    description: es.description || '',
    story: es.story || '',
    en: en
  };
}

// Rutas API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'karl-sketch-api',
    endpoints: ['/api/artworks', '/api/artworks/:id', '/api/categories', '/api/tags']
  });
});

app.get('/api/artworks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM artworks ORDER BY "index" ASC');
    res.json({ artworks: result.rows.map(toArtwork) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/artworks/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM artworks WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] ? toArtwork(result.rows[0]) : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json({ categories: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY id');
    const tags = {};
    result.rows.forEach(function (t) {
      tags[t.id] = { es: t.es, en: t.en };
    });
    res.json({ tags: tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servir archivos estáticos del frontend (HTML, CSS, JS)
app.use(express.static(__dirname));

// Fallback para SPA o cualquier otra ruta
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));