# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies required for Prisma and Docker CLI (to spawn siblings)
RUN apk add --no-cache openssl docker-cli

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Install dependencies required for Prisma runtime and Docker CLI
RUN apk add --no-cache openssl curl docker-cli

# Set environment variable to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built assets and Prisma client from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/prisma ./prisma

# Use non-root user for security (note: docker socket might need root, but usually mapping group works if GID matches, or we run as root if necessary. For now we will keep node user but they might encounter docker sock permission issues. We'll add the node user to the docker group if possible, or run as root if absolutely required.)
# We will use root for now to ensure docker.sock works effortlessly in this clone.
USER root

# Expose port
EXPOSE 9000

# Add a healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:9000/ || exit 1

# Start the application
CMD ["npm", "start"]
