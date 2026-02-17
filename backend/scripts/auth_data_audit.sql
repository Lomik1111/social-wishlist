-- Auth data audit queries
-- Usage: psql "$DATABASE_URL" -f backend/scripts/auth_data_audit.sql

-- 1) Duplicate emails (case-insensitive)
SELECT LOWER(email) AS email_normalized, COUNT(*) AS duplicate_count, ARRAY_AGG(id) AS user_ids
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, email_normalized;

-- 2) Conflicting oauth_provider/oauth_id mappings
SELECT oauth_provider, oauth_id, COUNT(*) AS duplicate_count, ARRAY_AGG(id) AS user_ids, ARRAY_AGG(email) AS emails
FROM users
WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL
GROUP BY oauth_provider, oauth_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, oauth_provider, oauth_id;

-- 3) Broken refresh tokens: missing user reference
SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked, rt.created_at
FROM refresh_tokens rt
LEFT JOIN users u ON u.id = rt.user_id
WHERE u.id IS NULL
ORDER BY rt.created_at DESC;

-- 4) Broken refresh tokens: invalid token hash / expiry anomalies
SELECT id, user_id, token_hash, expires_at, revoked, created_at
FROM refresh_tokens
WHERE token_hash IS NULL
   OR LENGTH(TRIM(token_hash)) = 0
   OR expires_at IS NULL
   OR expires_at < created_at
ORDER BY created_at DESC;

-- 5) Optional: duplicate token hashes (should normally be unique per issued token)
SELECT token_hash, COUNT(*) AS duplicate_count, ARRAY_AGG(id) AS token_ids
FROM refresh_tokens
GROUP BY token_hash
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
