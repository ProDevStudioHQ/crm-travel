FROM node:20-bullseye

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
COPY server/package*.json ./server/

# Install root dependencies
RUN npm install

# Install server dependencies
RUN cd server && npm install

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
