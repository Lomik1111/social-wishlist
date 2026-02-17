# Railway Auth Incident Runbook

## 1) Connect to Railway Postgres
```bash
railway run psql "$DATABASE_URL"
```

## 2) Users checks

### Find user by email (case-insensitive)
```sql
SELECT id, email, oauth_provider, oauth_id, created_at, updated_at
FROM users
WHERE LOWER(email) = LOWER('<user_email>');
```

### Check duplicate emails (case-insensitive)
```sql
SELECT LOWER(email) AS email_normalized, COUNT(*) AS duplicate_count, ARRAY_AGG(id) AS user_ids
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, email_normalized;
```

## 3) OAuth mapping checks

### Validate if oauth identity is linked to multiple users
```sql
SELECT oauth_provider, oauth_id, COUNT(*) AS duplicate_count, ARRAY_AGG(id) AS user_ids, ARRAY_AGG(email) AS emails
FROM users
WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL
GROUP BY oauth_provider, oauth_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

### Check records with partially-filled oauth fields
```sql
SELECT id, email, oauth_provider, oauth_id, created_at
FROM users
WHERE (oauth_provider IS NULL AND oauth_id IS NOT NULL)
   OR (oauth_provider IS NOT NULL AND oauth_id IS NULL)
ORDER BY created_at DESC;
```

## 4) Refresh token checks

### List active refresh tokens for one user
```sql
SELECT id, user_id, expires_at, revoked, created_at
FROM refresh_tokens
WHERE user_id = '<user_uuid>'
ORDER BY created_at DESC;
```

### Find broken refresh tokens (orphans + invalid structure)
```sql
SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked, rt.created_at
FROM refresh_tokens rt
LEFT JOIN users u ON u.id = rt.user_id
WHERE u.id IS NULL;

SELECT id, user_id, token_hash, expires_at, revoked, created_at
FROM refresh_tokens
WHERE token_hash IS NULL
   OR LENGTH(TRIM(token_hash)) = 0
   OR expires_at IS NULL
   OR expires_at < created_at;
```

## 5) Index / uniqueness checks

### Inspect users indexes and constraints
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'users';

SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'users';
```

### Inspect refresh_tokens indexes
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'refresh_tokens';
```

## 6) Run full audit script
```bash
psql "$DATABASE_URL" -f backend/scripts/auth_data_audit.sql
```
