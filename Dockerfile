FROM node:20-bullseye

WORKDIR /app

# Install PostgreSQL client tools
RUN apt-get update && apt-get install -y postgresql-client-15 && rm -rf /var/lib/apt/lists/*

# Install dependencies first (layer caching)
COPY package*.json ./
COPY server/package*.json ./server/

RUN npm install
RUN cd server && npm install

# Copy application code
COPY . .

# Pre-create persistent data directories so they exist inside the image
RUN mkdir -p \
  /app/data/crm/uploads \
  /app/data/crm/imports/raw \
  /app/data/crm/imports/processed \
  /app/data/crm/imports/logs \
  /app/data/crm/exports \
  /app/data/crm/backups/db \
  /app/data/crm/backups/files

EXPOSE 3000

# Use node directly — avoids npm signal-handling issues
CMD ["node", "server/server.js"]
