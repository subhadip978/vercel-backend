import express, { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';

const prismaClient = new PrismaClient();
const app = express();
app.use(express.json());
const PORT = 9000;

app.post('/project', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string(),
    gitURL: z.string()
  });

  const safeParseResult = schema.safeParse(req.body);
  if (safeParseResult.error) {
    return res.status(400).json({ error: safeParseResult.error });
  }

  const { name, gitURL } = safeParseResult.data;
  const generateSlug = () => Math.random().toString(36).substring(2, 7);
  
  const project = await prismaClient.project.create({
    data: {
      name,
      gitURL,
      subDomain: generateSlug()
    }
  });

  return res.json({ status: 'success', data: { project } });
});

app.post('/deploy', async (req: Request, res: Response) => {
  const { projectId } = req.body;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'projectId is required and must be a string' });
  }

  const project = await prismaClient.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return res.status(404).json({ error: 'project not found' });
  }

  const deployment = await prismaClient.deployment.create({
    data: {
      project: { connect: { id: projectId } }
    }
  });

  // Spin the container locally using raw Docker daemon
  // Pass necessary env variables to the container. The network is passed to allow connection to Redis.
  // The network name typically defaults to <folder>_default in docker-compose.
  const dockerNetwork = process.env.DOCKER_NETWORK || 'vercelserver_default';
  
  const dockerCommand = `docker run -d \\
    --network ${dockerNetwork} \\
    -e PROJECT_NAME="${project.name}" \\
    -e GIT_URL="${project.gitURL}" \\
    -e PROJECT_ID="${projectId}" \\
    -e DEPLOYMENT="${deployment.id}" \\
    -e ACCESSKEY_ID="${process.env.ACCESSKEY || ''}" \\
    -e SECRET_ACCESSKEY="${process.env.SECRETKEY || ''}" \\
    -e REDIS_URL="${process.env.REDIS_URL || ''}" \\
    vercel-clone-builder`;

  try {
    exec(dockerCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Failed to start Docker container:", error, stderr);
      } else {
        console.log(`Successfully started build container. Container ID: ${stdout.trim()}`);
      }
    });

    return res.json({ status: 'queued', data: { url: `http://${project.subDomain}.localhost:8000` } });
  } catch (err: unknown) {
    console.error("Failed to execute docker command:", err);
    return res.status(500).json({ error: "Failed to deploy project" });
  }
});

app.listen(PORT, () => {
  console.log(`server is running at http://localhost:${PORT}`);
});