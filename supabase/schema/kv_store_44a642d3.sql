-- Schema for key-value store used by server functions
CREATE TABLE IF NOT EXISTS kv_store_44a642d3 (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Seed demo profile for demo-123
INSERT INTO kv_store_44a642d3 (key, value)
VALUES
  ('user:demo-123', '{"id":"demo-123","email":"demo@tanknewmedia.com","name":"Demo User","vipTier":"Silver","createdAt":"2026-02-22T00:00:00.000Z"}')
ON CONFLICT (key) DO NOTHING;

-- Seed demo metrics
INSERT INTO kv_store_44a642d3 (key, value)
VALUES
  ('metrics:demo-123', '{"alertCompressionRatio":85,"ticketReductionRate":62,"mttrImprovement":45,"automationCoverage":78}')
ON CONFLICT (key) DO NOTHING;
