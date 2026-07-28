CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  sub TEXT,
  email TEXT,
  name TEXT,
  picture TEXT,
  password_hash TEXT,
  created_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  score INTEGER,
  raw_resume TEXT,
  raw_jd TEXT,
  analysis TEXT,
  paid_rewrite TEXT,
  paid_premium TEXT,
  purged INTEGER DEFAULT 0,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  report_id TEXT,
  amount REAL,
  currency TEXT,
  paypal_order_id TEXT,
  status TEXT,
  tier TEXT,
  demo INTEGER DEFAULT 0,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  paypal_subscription_id TEXT,
  plan_id TEXT,
  status TEXT,
  created_at INTEGER,
  updated_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS usage (
  identity TEXT,
  day TEXT,
  count INTEGER,
  PRIMARY KEY (identity, day)
);
