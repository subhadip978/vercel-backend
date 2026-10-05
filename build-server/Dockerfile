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

# Install git and docker (required to clone the user repositories and build images)
RUN apt-get update && apt-get install -y git docker.io && rm -rf /var/lib/apt/lists/*

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

# We don't expose ports because this is an ephemeral worker task, not a web server

# Set entrypoint
ENTRYPOINT ["/home/app/main.sh"]
