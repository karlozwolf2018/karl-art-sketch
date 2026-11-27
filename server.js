import express from 'express';
import pg from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.disable('x-powered-by');

app.use(function (req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : null;

function readJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', filename), 'utf8'));
}

async function queryOrFallback(query, params, fallback) {
  if (!pool) return fallback();
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    console.error('[api] error de base de datos, usando datos locales:', err.message);
    return fallback();
  }
}

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

// Añadir esta ruta debajo de los otros app.get
app.post('/api/artworks', async (req, res) => {
  const art = req.body;
  try {
    const query = `
      INSERT INTO artworks (
        id, image_url, materials_image_url, gallery, holographic, 
        title, category, technique, materials, paper, 
        grammage, brand, year, size, status, 
        seed, render, featured, palette, tags, l10n
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (id) DO UPDATE SET
      image_url = $2, materials_image_url = $3, gallery = $4, holographic = $5,
      title = $6, category = $7, technique = $8, materials = $9, paper = $10,
      grammage = $11, brand = $12, year = $13, size = $14, status = $15,
      seed = $16, render = $17, featured = $18, palette = $19, tags = $20, l10n = $21
    `;
    const params = [
      art.id, art.imageUrl, art.materialsImageUrl || art.materialsImage || '', art.gallery, !!art.holographic,
      art.title, art.category, art.technique, art.materials, art.paper,
      art.grammage, art.brand, art.year, art.size, art.status,
      art.seed, art.render, !!art.featured, JSON.stringify(art.palette || []), JSON.stringify(art.tags || []), JSON.stringify(art.l10n || {})
    ];
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al guardar obra:', err);
    res.status(500).json({ error: 'No se pudo guardar la obra en la base de datos', detail: err.message });
  }
});

app.get('/api/artworks', async (req, res) => {
  try {
    const rows = await queryOrFallback(
      'SELECT * FROM artworks ORDER BY "index" ASC',
      [],
      () => readJSON('artworks.json').artworks
    );
    res.json({ artworks: rows.map(function (row) {
      return row.image_url !== undefined ? toArtwork(row) : row;
    })});
  } catch (err) {
    res.status(500).json({ error: 'No se pudo cargar el catálogo' });
  }
});

app.get('/api/artworks/:id', async (req, res) => {
  try {
    const rows = await queryOrFallback(
      'SELECT * FROM artworks WHERE id = $1',
      [req.params.id],
      () => readJSON('artworks.json').artworks.filter(function (artwork) {
        return artwork.id === req.params.id;
      })
    );
    const row = rows[0];
    res.json(row ? (row.image_url !== undefined ? toArtwork(row) : row) : null);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo cargar la obra' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const rows = await queryOrFallback(
      'SELECT * FROM categories ORDER BY id',
      [],
      () => readJSON('categories.json').categories
    );
    res.json({ categories: rows });
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron cargar las categorías' });
  }
});

app.get('/api/tags', async (req, res) => {
  try {
    const rows = await queryOrFallback(
      'SELECT * FROM tags ORDER BY id',
      [],
      () => Object.entries(readJSON('tags.json').tags).map(function ([id, langs]) {
        return { id: id, es: langs.es, en: langs.en };
      })
    );
    const tags = {};
    rows.forEach(function (t) {
      tags[t.id] = { es: t.es, en: t.en };
    });
    res.json({ tags: tags });
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron cargar las etiquetas' });
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