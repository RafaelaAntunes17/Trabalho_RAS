
DATE=$(date +%Y-%m-%d)
BASE_DIR="/backups_data/$DATE"

mkdir -p "$BASE_DIR/minio_images"

echo "[$(date)] Iniciação do Backup Diário..."



echo "A fazer backup do Users DB..."
mongodump --host users_mongoDB --port 27019 --out "$BASE_DIR/mongo/users"

echo "A fazer backup do Projects DB..."
mongodump --host projects_mongoDB --port 27018 --out "$BASE_DIR/mongo/projects"

echo "A fazer backup do Subscriptions DB..."
mongodump --host subscriptions_mongoDB --port 27017 --out "$BASE_DIR/mongo/subscriptions"



echo "A configurar cliente MinIO..."

mc alias set local_minio http://minio:9000 admin admin123

echo "A espelhar buckets do MinIO..."

mc mirror --overwrite local_minio "$BASE_DIR/minio_images"

echo "[$(date)] Backup concluído com sucesso em: $BASE_DIR"