CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  short text,
  label_en text,
  short_en text,
  color text,
  accent text,
  icon text,
  description text,
  description_en text
);

CREATE TABLE IF NOT EXISTS tags (
  id text PRIMARY KEY,
  es text,
  en text
);

CREATE TABLE IF NOT EXISTS artworks (
  id text PRIMARY KEY,
  image_url text,
  materials_image_url text,
  gallery text,
  holographic boolean,
  "index" integer,
  "code" text,
  category text,
  color text,
  accent text,
  icon text,
  year integer,
  size text,
  paper text,
  grammage text,
  brand text,
  minutes integer,
  hours integer,
  status text,
  available boolean,
  seed bigint,
  render text,
  featured boolean,
  palette jsonb,
  tags jsonb,
  l10n jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artwork_tags (
  artwork_id text REFERENCES artworks(id) ON DELETE CASCADE,
  tag_id text REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (artwork_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_artworks_category ON artworks(category);
CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks(status);