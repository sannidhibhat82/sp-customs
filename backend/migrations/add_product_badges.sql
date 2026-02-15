-- Add per-product badges (warranty text, fast_delivery, expert_installation, quality_assured)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS badges JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN products.badges IS 'Per-product badges: warranty (string e.g. "1 Year"), fast_delivery, expert_installation, quality_assured (booleans)';
