# Stage 1: Build the client
FROM node:18-bullseye as client-build
WORKDIR /app/client
# Copy package files first to leverage cache for dependencies
COPY client/package*.json ./
RUN npm install
# Only then copy source which changes more frequently
COPY client/ ./
RUN npm run build

# Stage 2: Build the server code
FROM node:18-bullseye as server-build 
WORKDIR /app
# Copy package files first
COPY server/package*.json ./
RUN npm install 
# Only then copy source which changes more frequently
COPY server/ ./
RUN npm run build

# Stage 3: Final runtime image
FROM node:18-bullseye-slim
WORKDIR /app

# Install only what's needed for runtime
RUN apt-get update && apt-get install -y \
    sqlite3 --no-install-recommends \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy package files and install ONLY production dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy built artifacts from previous stages
COPY --from=server-build /app/dist ./dist
COPY --from=client-build /app/client/build ./public

# Create database directory and set permissions
RUN mkdir -p /app/database && chown -R node:node /app/database

# Expose the port
EXPOSE 3001

# Switch to the non-root user 'node'
USER node

# Set the runtime command
CMD ["node", "dist/index.js"] 