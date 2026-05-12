-- Articles for User guide (blog-style), managed from admin panel
CREATE TABLE IF NOT EXISTS guide_articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guide_articles_published_updated
  ON guide_articles (published, updated_at DESC);
