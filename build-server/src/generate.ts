import fs from 'fs';
import path from 'path';

export function generateDockerfile(framework: string, outdir: string): number {
  let dockerfileContent = '';
  let port = 3000;

  if (framework === 'NEXTJS') {
    port = 3000;
    dockerfileContent = `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
`;
  } else if (framework === 'EXPRESS') {
    port = 3000;
    dockerfileContent = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`;
  } else if (framework === 'DJANGO') {
    port = 8000;
    dockerfileContent = `FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
`;
  }

  fs.writeFileSync(path.join(outdir, 'Dockerfile'), dockerfileContent);
  return port;
}
