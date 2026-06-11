FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# Copy source
COPY src/ ./src/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Non-root user for security
RUN addgroup -S botgroup && adduser -S botuser -G botgroup
RUN chown -R botuser:botgroup /app
USER botuser

EXPOSE 3000

CMD ["node", "src/index.js"]
