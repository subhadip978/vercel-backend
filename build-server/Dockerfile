# Stage 1: Build the runner script
FROM node:20-bullseye-slim AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY script.ts ./

# Compile script.ts to dist/script.js
RUN npm run build


# Stage 2: Final Runner Environment
FROM node:20-bullseye-slim AS runner

# Install git (required to clone the user repositories)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Set up directory for the app and the output
WORKDIR /home/app

# Copy the built script and package files from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy entrypoint script
COPY main.sh ./main.sh
RUN chmod +x ./main.sh

# Ensure the 'node' user owns the working directory so it can clone and build inside it
RUN chown -R node:node /home/app

# Drop to non-root user for security
USER node

# We don't expose ports because this is an ephemeral worker task, not a web server

# Set entrypoint
ENTRYPOINT ["/home/app/main.sh"]
