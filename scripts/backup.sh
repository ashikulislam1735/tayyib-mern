#!/usr/bin/env bash
# ডাটাবেজের ব্যাকআপ: ./scripts/backup.sh   (cron-এ রোজ চালান)
# ⚠️ ব্যাকআপ একই সার্ভারে রাখলে সার্ভার গেলে ব্যাকআপও যায় — backups/ ফোল্ডার অন্য জায়গায় কপি করুন।
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
FILE="backups/tayyib-$(date +%Y%m%d-%H%M%S).archive.gz"
docker compose exec -T mongo mongodump --db tayyib_shop --archive --gzip > "$FILE"
echo "ব্যাকআপ হয়েছে: $FILE ($(du -h "$FILE" | cut -f1))"
# ১৪ দিনের পুরোনো ব্যাকআপ মুছে ফেলা
find backups -name 'tayyib-*.archive.gz' -mtime +14 -delete
# ফেরত আনতে:  docker compose exec -T mongo mongorestore --archive --gzip --drop < backups/ফাইল.archive.gz
