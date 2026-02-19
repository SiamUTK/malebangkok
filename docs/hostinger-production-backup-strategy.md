# MaleBangkok Production Backup Strategy (Hostinger)

## 1) Recommended Backup Frequency

1. **Database logical dump (MySQL):** every 6 hours.
2. **Daily full backup snapshot:** once per day at off-peak time.
3. **Before every production deployment:** run an on-demand backup.
4. **Before destructive operations:** create immediate pre-change backup (schema migration, bulk updates, data cleanup).

## 2) Retention Policy

1. Keep **6-hourly backups** for 7 days.
2. Keep **daily backups** for 30 days.
3. Keep **weekly backups** for 12 weeks.
4. Keep **monthly backups** for 12 months.
5. Store at least one copy outside the application server (separate storage bucket or secure external storage).

## 3) Hostinger MySQL Backup Steps

1. Open Hostinger hPanel.
2. Go to **Websites** → select project → **Manage**.
3. Open **Databases** / **Backups** section for the active MySQL instance.
4. Trigger manual backup export for the production database.
5. Download backup artifact and store with date-time stamp in secure storage.
6. Record backup metadata:
   - backup filename
   - database name
   - created timestamp (UTC)
   - operator name
   - reason (scheduled, pre-deploy, emergency)

## 4) Manual SQL Dump Command

Run from a secure shell with least-privileged DB credentials:

```bash
mysqldump \
  --host="$DB_HOST" \
  --port="${DB_PORT:-3306}" \
  --user="$DB_USER" \
  --password="$DB_PASSWORD" \
  --single-transaction \
  --quick \
  --set-gtid-purged=OFF \
  "$DB_NAME" > "malebangkok_${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"
```

Optional compression:

```bash
gzip "malebangkok_${DB_NAME}_YYYYMMDD_HHMMSS.sql"
```

## 5) Disaster Recovery Steps

1. **Declare incident:** freeze writes and announce maintenance mode.
2. **Identify restore point:** choose latest valid backup before incident timestamp.
3. **Provision clean target DB:** do not restore into unknown-corrupted instance.
4. **Restore backup:**

```bash
mysql \
  --host="$DB_HOST" \
  --port="${DB_PORT:-3306}" \
  --user="$DB_USER" \
  --password="$DB_PASSWORD" \
  "$DB_NAME" < "backup_file.sql"
```

5. **Run smoke checks:**
   - `SELECT COUNT(*)` on key tables (`users`, `bookings`, `payments`).
   - verify latest expected records around incident window.
6. **Start backend and validate API:** call `/api/health`, auth login, booking creation, payment status read.
7. **Re-enable traffic** only after verification passes.
8. **Post-incident report:** include root cause, data-loss window, and prevention actions.

## 6) Verification Checklist

- [ ] Backup job executed on schedule (6-hourly + daily).
- [ ] Backup file is non-empty and readable.
- [ ] Backup restore tested at least monthly in staging.
- [ ] `/api/health` reports `database: connected` after restore.
- [ ] Critical tables contain expected row counts.
- [ ] Application smoke tests pass (auth, guides, bookings, payments).
- [ ] Backup artifacts are encrypted at rest and access-controlled.
- [ ] Backup retention pruning is confirmed (no uncontrolled storage growth).
