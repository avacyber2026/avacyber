-- Approve all unapproved users (e.g. newly registered)
UPDATE users SET approved = true WHERE approved = false;
