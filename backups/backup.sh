#!/bin/bash

# Obter a data atual para organizar os backups
DATE=$(date +%Y-%m-%d)
BASE_DIR="/backups_data/$DATE"
# Criar a diretoria base E a diretoria específica para as imagens
mkdir -p "$BASE_DIR/minio_images"

echo "[$(date)] Iniciação do Backup Diário..."

# --- 1. Backup das Bases de Dados MongoDB ---

echo "A fazer backup do Users DB..."
mongodump --host users_mongoDB --port 27019 --out "$BASE_DIR/mongo/users"

echo "A fazer backup do Projects DB..."
mongodump --host projects_mongoDB --port 27018 --out "$BASE_DIR/mongo/projects"

echo "A fazer backup do Subscriptions DB..."
mongodump --host subscriptions_mongoDB --port 27017 --out "$BASE_DIR/mongo/subscriptions"

# --- 2. Backup das Imagens (MinIO) ---

echo "A configurar cliente MinIO..."
# Configurar alias local (garante que não falha se já existir)
mc alias set local_minio http://minio:9000 admin admin123

echo "A espelhar buckets do MinIO..."
# A pasta de destino já foi criada no início do script
mc mirror --overwrite local_minio "$BASE_DIR/minio_images"

echo "[$(date)] Backup concluído com sucesso em: $BASE_DIR"