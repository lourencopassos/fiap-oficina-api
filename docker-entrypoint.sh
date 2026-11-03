#!/bin/sh
set -e

echo "[entrypoint] Aplicando migrations..."
./node_modules/.bin/prisma migrate deploy

if [ "${SEED_ON_START:-true}" = "true" ]; then
  echo "[entrypoint] Executando seed (idempotente)..."
  node prisma/seed.js
fi

echo "[entrypoint] Iniciando API..."
exec node dist/main.js
