import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM artwork_tags');
    await client.query('DELETE FROM artworks');
    await client.query('DELETE FROM categories');
    await client.query('DELETE FROM tags');

    const categoriesData = JSON.parse(fs.readFileSync('./data/categories.json', 'utf8'));
    for (const c of categoriesData.categories) {
      await client.query(
        `INSERT INTO categories(id, label, short, label_en, short_en, color, accent, icon, description, description_en)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT(id) DO UPDATE SET label=$2, short=$3, label_en=$4, short_en=$5, color=$6, accent=$7, icon=$8, description=$9, description_en=$10`,
        [c.id, c.label, c.short, c.label_en, c.short_en, c.color, c.accent, c.icon, c.description, c.description_en]
      );
    }

    const tagsData = JSON.parse(fs.readFileSync('./data/tags.json', 'utf8'));
    for (const [id, langs] of Object.entries(tagsData.tags)) {
      await client.query(
        `INSERT INTO tags(id, es, en) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET es=$2, en=$3`,
        [id, langs.es, langs.en]
      );
    }

    const artworksData = JSON.parse(fs.readFileSync('./data/artworks.json', 'utf8'));
    for (const a of artworksData.artworks) {
      await client.query(
        `INSERT INTO artworks(
          id, image_url, materials_image_url, gallery, holographic, "index", "code",
          category, color, accent, icon, year, size, paper, grammage, brand,
          minutes, hours, status, available, seed, render, featured, palette, tags, l10n
        ) VALUES(
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
        ) ON CONFLICT(id) DO UPDATE SET
          image_url=$2, materials_image_url=$3, gallery=$4, holographic=$5, "index"=$6, "code"=$7,
          category=$8, color=$9, accent=$10, icon=$11, year=$12, size=$13, paper=$14, grammage=$15,
          brand=$16, minutes=$17, hours=$18, status=$19, available=$20, seed=$21, render=$22,
          featured=$23, palette=$24, tags=$25, l10n=$26`,
        [
          a.id, a.imageUrl, a.materialsImageUrl, a.gallery, a.holographic, a.index, a.code,
          a.category, a.color, a.accent, a.icon, a.year, a.size, a.paper, a.grammage, a.brand,
          a.minutes, a.hours, a.status, a.available, a.seed, a.render, a.featured,
          JSON.stringify(a.palette), JSON.stringify(a.tags), JSON.stringify(a.l10n)
        ]
      );

      if (a.tags && a.tags.length > 0) {
        for (const tagId of a.tags) {
          await client.query(
            `INSERT INTO artwork_tags(artwork_id, tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
            [a.id, tagId]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log(`Migración completada: ${artworksData.artworks.length} artworks, ${categoriesData.categories.length} categorías, ${Object.keys(tagsData.tags).length} tags`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en migración:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();