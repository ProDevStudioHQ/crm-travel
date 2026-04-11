FROM node:20-bullseye

WORKDIR /app

# Install PostgreSQL client tools
RUN apt-get update && apt-get install -y postgresql-client-15 && rm -rf /var/lib/apt/lists/*

# Clean npm cache before installing
RUN npm cache clean --force 2>/dev/null || true

# Install dependencies first (layer caching)
COPY package*.json ./
COPY server/package*.json ./server/

# Install root dependencies with legacy peer deps and audit disabled
RUN npm install --legacy-peer-deps --no-audit

# Install server dependencies with aggressive undici override
RUN cd server && npm install --legacy-peer-deps --no-audit

# CRITICAL: Remove cheerio's bundled undici and use global version
RUN rm -rf /app/server/node_modules/cheerio/node_modules/undici 2>/dev/null || true
RUN rm -rf /app/node_modules/cheerio/node_modules/undici 2>/dev/null || true

# Install undici globally to all node_modules
RUN npm install --save undici@^6.13.0 --legacy-peer-deps --no-audit
RUN cd server && npm install --save undici@^6.13.0 --legacy-peer-deps --no-audit

# Verify undici is installed and correct
RUN node -e "console.log('✓ Undici version:', require('undici/package.json').version)"

# Copy application code
COPY . .

# Pre-create persistent data directories
RUN mkdir -p \
  /app/data/crm/uploads \
  /app/data/crm/imports/raw \
  /app/data/crm/imports/processed \
  /app/data/crm/imports/logs \
  /app/data/crm/exports \
  /app/data/crm/backups/db \
  /app/data/crm/backups/files

EXPOSE 3000

# Run the application
CMD ["node", "server/server.js"]
