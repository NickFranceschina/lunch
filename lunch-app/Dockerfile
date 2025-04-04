# Stage 1: Build the client
FROM node:18-bullseye as client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the server code
FROM node:18-bullseye as server-build 
WORKDIR /app
# Copy server package files 
COPY server/package*.json ./
# Install ALL dependencies (including dev) for the build step
RUN npm install 
# Copy server source code
COPY server/ ./
# Build the server (TypeScript compilation)
RUN npm run build

# Stage 3: Final runtime image
FROM node:18-bullseye 
WORKDIR /app

# Install build tools and sqlite3 system library for runtime install
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    sqlite3 --no-install-recommends \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy synchronized package files FROM THE SOURCE CONTEXT
COPY server/package*.json ./

# Install ONLY production dependencies using npm install --production
# This avoids strict lockfile checking for devDependencies which we omit
# Build sqlite3 from source during this install
RUN npm install --production --build-from-source=sqlite3

# Copy built server code from the server-build stage
COPY --from=server-build /app/dist ./dist

# Copy the built client application from the client-build stage
COPY --from=client-build /app/client/build ./public

# Create database directory and set permissions
RUN mkdir -p /app/database && chown -R node:node /app/database

# Expose the port
EXPOSE 3001

# Switch to the non-root user 'node'
USER node

# Set the runtime command using the built JS directly
CMD ["node", "dist/index.js"] 